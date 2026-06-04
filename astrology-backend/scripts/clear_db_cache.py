import asyncio
import asyncpg

async def main():
    conn = await asyncpg.connect('postgresql://postgres:Bikram%40284@localhost:5432/astrology_db')
    await conn.execute("DELETE FROM interpretations WHERE content LIKE '%AI Generation Failed%';")
    print('Deleted bad cached interpretations')
    await conn.close()

if __name__ == '__main__':
    asyncio.run(main())
