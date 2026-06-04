import asyncio
import os
import asyncpg
from dotenv import load_dotenv

load_dotenv()

async def run_migration():
    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        print("DATABASE_URL not set in .env")
        return
    
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        print("Adding language column...")
        await conn.execute("ALTER TABLE interpretations ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'english';")
        
        print("Finding existing unique constraint...")
        # Get the constraint name dynamically
        constraint_name = await conn.fetchval("""
            SELECT conname
            FROM pg_constraint
            WHERE conrelid = 'interpretations'::regclass
            AND contype = 'u'
        """)
        
        if constraint_name:
            print(f"Dropping old constraint: {constraint_name}")
            await conn.execute(f"ALTER TABLE interpretations DROP CONSTRAINT {constraint_name};")
        
        print("Adding new unique constraint (chart_id, tab_number, language)...")
        await conn.execute("ALTER TABLE interpretations ADD CONSTRAINT interpretations_chart_id_tab_number_language_key UNIQUE (chart_id, tab_number, language);")
        
        print("Migration complete!")
    except Exception as e:
        print(f"Migration error: {e}")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(run_migration())
