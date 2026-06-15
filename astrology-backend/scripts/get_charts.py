import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def main():
    db_url = os.getenv("DATABASE_URL")
    local_db_url = os.getenv("LOCAL_DATABASE_URL")
    
    conn = None
    if db_url:
        try:
            conn = await asyncpg.connect(db_url)
        except Exception:
            pass
            
    if not conn and local_db_url:
        try:
            conn = await asyncpg.connect(local_db_url)
        except Exception:
            pass
            
    if not conn:
        print("Could not connect to database.")
        return
        
    rows = await conn.fetch(
        "SELECT id, full_name, date_of_birth FROM charts ORDER BY created_at DESC"
    )
    with open("scripts/charts_list.txt", "w", encoding="utf-8") as f:
        for r in rows:
            f.write(f"ID: {r['id']} | Name: {r['full_name']} | DOB: {r['date_of_birth']}\n")
    print(f"Successfully wrote {len(rows)} charts to scripts/charts_list.txt")
    await conn.close()

if __name__ == '__main__':
    asyncio.run(main())
