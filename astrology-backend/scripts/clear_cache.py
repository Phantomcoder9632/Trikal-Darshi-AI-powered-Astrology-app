import asyncio
import os
from dotenv import load_dotenv
import redis.asyncio as aioredis
import asyncpg

load_dotenv()

async def main():
    print("Starting cache and database clear...")

    # 1. Clear Redis Cache
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    print(f"Connecting to Redis at {redis_url}...")
    try:
        redis_client = aioredis.from_url(redis_url, decode_responses=True, protocol=2)
        await redis_client.flushdb()
        print("Successfully flushed Redis database.")
        await redis_client.close()
    except Exception as e:
        print(f"Error clearing Redis: {e}")

    # 2. Clear PostgreSQL Interpretations Table
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL not found in environment. Skipping DB truncate.")
        return

    print(f"Connecting to PostgreSQL...")
    try:
        conn = await asyncpg.connect(dsn=database_url)
        res = await conn.execute("TRUNCATE TABLE interpretations, charts CASCADE;")
        print(f"Successfully truncated 'interpretations' and 'charts' tables. Result: {res}")
        await conn.close()
    except Exception as e:
        print(f"Error truncating PostgreSQL interpretations table: {e}")

if __name__ == "__main__":
    asyncio.run(main())
