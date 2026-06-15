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
        
    row = await conn.fetchrow(
        "SELECT content FROM interpretations WHERE tab_number = 8 ORDER BY generated_at DESC LIMIT 1"
    )
    if row:
        content = row['content']
        with open("scripts/remedy_content.txt", "w", encoding="utf-8") as f:
            f.write(content)
        print("Successfully wrote remedy content to scripts/remedy_content.txt")
    else:
        print("No remedies found.")
        
    await conn.close()

if __name__ == '__main__':
    asyncio.run(main())
