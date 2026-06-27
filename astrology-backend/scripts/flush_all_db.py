import asyncio
import os
import asyncpg
import redis
from dotenv import load_dotenv

# Load environment variables
load_dotenv(override=True)

async def flush_postgres(db_url: str, db_name: str):
    if not db_url:
        print(f"[{db_name}] Connection URL not set. Skipping.")
        return

    # Add sslmode parameter if it's not local
    if "sslmode=" not in db_url and "localhost" not in db_url:
        if "?" in db_url:
            db_url += "&sslmode=require"
        else:
            db_url += "?sslmode=require"

    print(f"[{db_name}] Connecting to PostgreSQL database...")
    try:
        conn = await asyncpg.connect(db_url)
        print(f"[{db_name}] Flushing all tables (users, charts, interpretations, chat_messages, api_usage)...")
        # Truncate all tables and cascade to clear dependencies
        await conn.execute("TRUNCATE TABLE interpretations, chat_messages, charts, users, api_usage CASCADE;")
        await conn.close()
        print(f"[{db_name}] Database successfully flushed!")
    except Exception as e:
        print(f"[{db_name}] Error flushing database: {e}")

def flush_redis(redis_url: str):
    if not redis_url:
        print("[Redis] Connection URL not set. Skipping.")
        return

    print("[Redis] Connecting to Redis...")
    try:
        r = redis.Redis.from_url(redis_url, decode_responses=True, protocol=2)
        r.flushdb()
        print("[Redis] Redis cache successfully flushed!")
    except Exception as e:
        print(f"[Redis] Error flushing Redis: {e}")

async def main():
    database_url = os.getenv("DATABASE_URL")
    local_database_url = os.getenv("LOCAL_DATABASE_URL")
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")

    # Flush primary PostgreSQL database
    await flush_postgres(database_url, "Primary DB")

    # Flush secondary PostgreSQL database if configured and different
    if local_database_url and local_database_url != database_url:
        await flush_postgres(local_database_url, "Secondary DB")

    # Flush Redis cache
    flush_redis(redis_url)

    print("\nAll databases and caches successfully flushed!")

if __name__ == "__main__":
    asyncio.run(main())
