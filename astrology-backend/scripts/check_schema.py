import asyncio
import asyncpg
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv(override=True)

async def check():
    conn = await asyncpg.connect(os.getenv("DATABASE_URL"))
    for table in ["users", "charts", "interpretations"]:
        cols = await conn.fetch(
            "SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position;",
            table
        )
        print(f"{table}: {[c['column_name'] for c in cols]}")
    await conn.close()

asyncio.run(check())
