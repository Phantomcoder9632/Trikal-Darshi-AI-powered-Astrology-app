import os
from typing import AsyncGenerator
import asyncpg
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Global pool instance
_pool: asyncpg.Pool | None = None

async def get_db_pool() -> asyncpg.Pool:
    """
    Get or initialize the global asyncpg connection pool.
    """
    global _pool
    if _pool is None:
        if not DATABASE_URL:
            raise ValueError("DATABASE_URL environment variable is not set.")
        _pool = await asyncpg.create_pool(
            dsn=DATABASE_URL,
            min_size=5,
            max_size=20,
            command_timeout=60.0
        )
    return _pool

async def close_db_pool() -> None:
    """
    Close the global asyncpg connection pool.
    """
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None

# FastAPI startup and shutdown event handlers
async def startup_db_event() -> None:
    """
    FastAPI startup event handler to initialize the pool.
    """
    await get_db_pool()

async def shutdown_db_event() -> None:
    """
    FastAPI shutdown event handler to gracefully close the pool.
    """
    await close_db_pool()

# Dependency injection helper for FastAPI routes
async def get_db() -> AsyncGenerator[asyncpg.Connection, None]:
    """
    FastAPI dependency yielding a connection from the global pool.
    Usage:
        @app.get("/example")
        async def example(conn = Depends(get_db)):
            ...
    """
    pool = await get_db_pool()
    async with pool.acquire() as connection:
        yield connection
