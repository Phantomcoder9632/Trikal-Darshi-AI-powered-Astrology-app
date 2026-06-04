import asyncio
import asyncpg

async def main():
    conn = await asyncpg.connect('postgresql://postgres:Bikram%40284@localhost:5432/astrology_db')
    
    # Delete any interpretation that is under 1500 characters (truncated errors)
    res = await conn.execute("DELETE FROM interpretations WHERE LENGTH(content) < 1500")
    print("Database Cleanup Result:", res)
    
    await conn.close()

if __name__ == '__main__':
    asyncio.run(main())
