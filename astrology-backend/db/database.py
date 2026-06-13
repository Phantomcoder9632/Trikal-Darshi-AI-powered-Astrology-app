import os
import logging
import uuid
from typing import AsyncGenerator
import asyncpg
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL")
LOCAL_DATABASE_URL = os.getenv("LOCAL_DATABASE_URL")

class DualConnection:
    def __init__(self, conn1, conn2=None):
        self.conn1 = conn1
        self.conn2 = conn2

    async def execute(self, query, *args, **kwargs):
        res1 = await self.conn1.execute(query, *args, **kwargs)
        if self.conn2:
            try:
                await self.conn2.execute(query, *args, **kwargs)
            except Exception as e:
                logger.error(f"Dual write (execute) failed on secondary DB: {e}")
        return res1

    async def fetch(self, query, *args, **kwargs):
        try:
            return await self.conn1.fetch(query, *args, **kwargs)
        except Exception as e:
            if self.conn2:
                logger.warning(f"Fetch failed on primary DB, trying secondary: {e}")
                return await self.conn2.fetch(query, *args, **kwargs)
            raise

    async def fetchrow(self, query, *args, **kwargs):
        try:
            return await self.conn1.fetchrow(query, *args, **kwargs)
        except Exception as e:
            if self.conn2:
                logger.warning(f"Fetchrow failed on primary DB, trying secondary: {e}")
                return await self.conn2.fetchrow(query, *args, **kwargs)
            raise

    async def fetchval(self, query, *args, **kwargs):
        try:
            return await self.conn1.fetchval(query, *args, **kwargs)
        except Exception as e:
            if self.conn2:
                logger.warning(f"Fetchval failed on primary DB, trying secondary: {e}")
                return await self.conn2.fetchval(query, *args, **kwargs)
            raise

class DualConnectionAcquirer:
    def __init__(self, primary_pool, secondary_pool, *args, **kwargs):
        self.primary_pool = primary_pool
        self.secondary_pool = secondary_pool
        self.args = args
        self.kwargs = kwargs
        self.primary_ctx = None
        self.secondary_ctx = None

    async def __aenter__(self):
        conn1 = None
        conn2 = None
        
        if self.primary_pool:
            try:
                self.primary_ctx = self.primary_pool.acquire(*self.args, **self.kwargs)
                conn1 = await self.primary_ctx.__aenter__()
            except Exception as e:
                logger.error(f"Failed to acquire connection from primary pool: {e}")
                
        if self.secondary_pool:
            try:
                self.secondary_ctx = self.secondary_pool.acquire(*self.args, **self.kwargs)
                conn2 = await self.secondary_ctx.__aenter__()
            except Exception as e:
                logger.error(f"Failed to acquire connection from secondary pool: {e}")
                
        if not conn1 and not conn2:
            raise RuntimeError("Could not acquire connection from either primary or secondary database pool.")
            
        # If primary failed but secondary succeeded, swap them so secondary becomes primary
        if not conn1:
            conn1 = conn2
            conn2 = None
            
        return DualConnection(conn1, conn2)

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.primary_ctx:
            await self.primary_ctx.__aexit__(exc_type, exc_val, exc_tb)
        if self.secondary_ctx:
            await self.secondary_ctx.__aexit__(exc_type, exc_val, exc_tb)

class DualPool:
    def __init__(self, primary_pool, secondary_pool):
        self.primary_pool = primary_pool
        self.secondary_pool = secondary_pool

    def acquire(self, *args, **kwargs):
        return DualConnectionAcquirer(self.primary_pool, self.secondary_pool, *args, **kwargs)

    async def close(self):
        if self.primary_pool:
            await self.primary_pool.close()
        if self.secondary_pool:
            await self.secondary_pool.close()

# Global pool instance
_pool: DualPool | None = None

async def get_db_pool() -> DualPool:
    """
    Get or initialize the global asyncpg connection pool wrapper.
    """
    global _pool
    if _pool is None:
        primary_pool = None
        secondary_pool = None

        # 1. Initialize Primary Pool (e.g. Aiven)
        if DATABASE_URL:
            try:
                logger.info("Initializing primary database pool...")
                primary_pool = await asyncpg.create_pool(
                    dsn=DATABASE_URL,
                    min_size=2,
                    max_size=10,
                    command_timeout=60.0
                )
                # Test connection
                async with primary_pool.acquire() as conn:
                    await conn.execute("SELECT 1")
                logger.info("Successfully connected to primary database.")
            except Exception as e:
                logger.error(f"Could not connect to primary database: {e}")
                primary_pool = None

        # 2. Initialize Secondary Pool (e.g. Local)
        if LOCAL_DATABASE_URL and LOCAL_DATABASE_URL != DATABASE_URL:
            try:
                logger.info("Initializing secondary database pool...")
                secondary_pool = await asyncpg.create_pool(
                    dsn=LOCAL_DATABASE_URL,
                    min_size=2,
                    max_size=10,
                    command_timeout=60.0
                )
                # Test connection
                async with secondary_pool.acquire() as conn:
                    await conn.execute("SELECT 1")
                logger.info("Successfully connected to secondary database.")
            except Exception as e:
                logger.error(f"Could not connect to secondary database: {e}")
                secondary_pool = None

        if not primary_pool and not secondary_pool:
            raise ValueError("Both primary (DATABASE_URL) and secondary (LOCAL_DATABASE_URL) pools failed to initialize.")

        _pool = DualPool(primary_pool, secondary_pool)
    return _pool

async def close_db_pool() -> None:
    """
    Close the global asyncpg connection pool wrapper.
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
async def get_db() -> AsyncGenerator[DualConnection, None]:
    """
    FastAPI dependency yielding a connection from the global pool wrapper.
    """
    pool = await get_db_pool()
    async with pool.acquire() as connection:
        yield connection
