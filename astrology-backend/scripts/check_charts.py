import asyncio
import os
import asyncpg
from dotenv import load_dotenv

load_dotenv(override=True)

async def main():
    db_url = os.getenv("DATABASE_URL")
    print(f"Connecting to database...")
    conn = await asyncpg.connect(db_url)
    try:
        rows = await conn.fetch("SELECT id, full_name, language, created_at FROM charts ORDER BY created_at DESC LIMIT 10")
        print("\n--- LATEST CHARTS ---")
        for r in rows:
            print(f"ID: {r['id']} | Name: {r['full_name']} | Lang: {r['language']} | Created: {r['created_at']}")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
