import os
import json
import logging
from typing import Any, Optional
import redis.asyncio as aioredis
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

# Global Redis Client
_redis_client: Optional[aioredis.Redis] = None

async def get_redis() -> aioredis.Redis:
    """
    Acquire or initialize the global Redis connection.
    """
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(
            REDIS_URL, 
            decode_responses=True,
            socket_timeout=5.0,
            socket_connect_timeout=5.0,
            protocol=2
        )
    return _redis_client

async def init_redis() -> aioredis.Redis:
    """
    Initialize the global Redis connection (backward-compatibility alias).
    """
    return await get_redis()

async def close_redis() -> None:
    """
    Gracefully tear down the Redis client.
    """
    global _redis_client
    if _redis_client is not None:
        await _redis_client.close()
        _redis_client = None

# ── Required Cache Interfaces ──────────────────────────────────────────────

async def cache_chart(key: str, data: Any, ttl: int = 2592000) -> None:
    """
    Cache a complete birth chart for 30 days (default: 2,592,000 seconds).
    """
    client = await get_redis()
    try:
        serialized = json.dumps(data, default=str)
        await client.setex(key, ttl, serialized)
        logger.info(f"Cached chart successfully under key: {key}")
    except Exception as e:
        logger.error(f"Failed to write chart to Redis cache: {e}")

async def get_cached_chart(key: str) -> Optional[Any]:
    """
    Retrieve and parse a cached birth chart.
    """
    client = await get_redis()
    try:
        val = await client.get(key)
        if val:
            logger.info(f"Cache hit for key: {key}")
            return json.loads(val)
    except Exception as e:
        logger.error(f"Failed to read chart from Redis cache: {e}")
    return None

async def cache_interpretation(chart_id: str, tab_number: int, text: str) -> None:
    """
    Cache an AI generated interpretation tab for 30 days.
    """
    client = await get_redis()
    key = f"interpretation:{chart_id}:{tab_number}"
    try:
        await client.setex(key, 2592000, text)
        logger.info(f"Cached interpretation successfully for {chart_id} Tab {tab_number}")
    except Exception as e:
        logger.error(f"Failed to write interpretation to Redis cache: {e}")

async def get_cached_interpretation(chart_id: str, tab_number: int) -> Optional[str]:
    """
    Retrieve a cached AI generated interpretation.
    """
    client = await get_redis()
    key = f"interpretation:{chart_id}:{tab_number}"
    try:
        val = await client.get(key)
        if val:
            logger.info(f"Cache hit for interpretation: {key}")
            return val
    except Exception as e:
        logger.error(f"Failed to read interpretation from Redis cache: {e}")
    return None

# Helper to generate the exact required key format: "chart:{dob}:{tob}:{lat}:{lng}"
def generate_chart_cache_key(dob: str, tob: str, lat: float, lng: float) -> str:
    return f"chart:{dob}:{tob}:{lat}:{lng}"
