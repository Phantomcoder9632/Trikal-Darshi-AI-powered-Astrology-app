import asyncio
import asyncpg
import redis
import os
from dotenv import load_dotenv

load_dotenv()

async def main():
    database_url = os.getenv("DATABASE_URL", "postgresql://postgres:Bikram%40284@localhost:5432/astrology_db")
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")

    # Clear PostgreSQL Cache (only interpretations, keeping charts safe)
    try:
        conn = await asyncpg.connect(database_url)
        await conn.execute('TRUNCATE TABLE interpretations;')
        await conn.close()
        print("Cleared AI interpretations from PostgreSQL.")
    except Exception as e:
        print(f"Error clearing PostgreSQL: {e}")

    # Clear Redis
    try:
        r = redis.Redis.from_url(redis_url, decode_responses=True, protocol=2)
        r.flushdb()
        print("Cleared Redis cache.")
    except Exception as e:
        print(f"Error clearing Redis: {e}")

    print("Cache successfully cleared!")

if __name__ == '__main__':
    asyncio.run(main())
