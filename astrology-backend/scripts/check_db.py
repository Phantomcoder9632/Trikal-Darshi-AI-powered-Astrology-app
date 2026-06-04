import asyncio
import asyncpg
import json

async def main():
    conn = await asyncpg.connect('postgresql://postgres:Bikram%40284@localhost:5432/astrology_db')
    row = await conn.fetchrow('SELECT raw_chart_data FROM charts LIMIT 1')
    if row:
        data = row['raw_chart_data']
        if isinstance(data, str):
            print("Length of string:", len(data))
        else:
            print("Length of JSON:", len(json.dumps(data)))
    await conn.close()

if __name__ == '__main__':
    asyncio.run(main())
