import time
import logging
from fastapi import Request, HTTPException, status
from services.cache import get_redis

logger = logging.getLogger(__name__)

async def check_rate_limit(request: Request, key_prefix: str, limit: int, window: int):
    """
    Checks rate limit for a client IP using a fixed window algorithm in Redis.
    """
    ip = request.client.host if request.client else "unknown"
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
            logger.warning(f"Rate limit exceeded: prefix={key_prefix} ip={ip} count={count}")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later."
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
