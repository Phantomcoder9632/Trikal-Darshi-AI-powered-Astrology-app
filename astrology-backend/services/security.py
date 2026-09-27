import time
import logging
import os
from fastapi import Request, HTTPException, status
from services.cache import get_redis

logger = logging.getLogger(__name__)


def get_client_ip(request: Request) -> str:
    """
    Resolve the real client IP for rate limiting.

    Behind reverse proxies (Hugging Face Spaces, Nginx, Cloudflare) the TCP
    peer address is the proxy, so every visitor would share one rate-limit
    bucket. When TRUST_PROXY_HEADERS=1 is set in the environment, the
    left-most entry of X-Forwarded-For is used instead (set by the trusted
    proxy). Keep the flag OFF when the app is directly exposed to the
    internet, because clients could then spoof the header to bypass limits.
    """
    if os.environ.get("TRUST_PROXY_HEADERS", "").strip() == "1":
        forwarded = request.headers.get("x-forwarded-for", "")
        if forwarded:
            # Left-most = original client as injected by the trusted proxy
            first_hop = forwarded.split(",")[0].strip()
            if first_hop:
                return first_hop
    return request.client.host if request.client else "unknown"


async def check_rate_limit(request: Request, key_prefix: str, limit: int, window: int):
    """
    Checks rate limit for a client IP using a fixed window algorithm in Redis.
    """
    ip = get_client_ip(request)
    client = await get_redis()
    
    # Bucket based on window boundary
    current_time = int(time.time())
    window_bucket = current_time // window
    key = f"rate_limit:{key_prefix}:{ip}:{window_bucket}"
    
    try:
        pipe = client.pipeline()
        pipe.incr(key)
        pipe.expire(key, window + 5)  # add padding to ensure cleanup
        results = await pipe.execute()
        count = results[0]
        
        if count > limit:
            # Seconds until the fixed-window bucket resets
            retry_after = (window_bucket + 1) * window - current_time
            logger.warning(f"Rate limit exceeded: prefix={key_prefix} ip={ip} count={count}")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=(
                    f"Too many requests. You have used all {limit} allowed in this "
                    f"{window // 60 if window >= 60 else window}-"
                    f"{'hour' if window >= 3600 else 'minute' if window >= 60 else 'second'} window. "
                    f"Please try again in about {max(retry_after, 1) // 60 + (1 if max(retry_after, 1) % 60 else 0)} minutes."
                    if window >= 60 else
                    f"Too many requests. Please try again in {max(retry_after, 1)} seconds."
                ),
                headers={"Retry-After": str(max(retry_after, 1))},
            )
    except HTTPException:
        raise
    except Exception as e:
        # Fail open: if Redis is down, log the error but allow request to go through
        logger.error(f"Rate limiting check failed: {e}")


def RateLimiter(key_prefix: str, limit: int, window: int = 60):
    """
    FastAPI dependency factory for rate limiting.
    """
    async def dependency(request: Request):
        await check_rate_limit(request, key_prefix, limit, window)
    return dependency
