import asyncio
import asyncpg
import json

async def main():
    conn = await asyncpg.connect('postgresql://postgres:Bikram%40284@localhost:5432/astrology_db')
    row = await conn.fetchrow('SELECT raw_chart_data FROM charts LIMIT 1')
    if not row:
        print("No chart found")
        return
        
    raw_chart_str = row["raw_chart_data"]
    chart_data = json.loads(raw_chart_str) if isinstance(raw_chart_str, str) else raw_chart_str
    
    rows = await conn.fetch('SELECT chart_id, tab_number, content, generated_at FROM interpretations')
    print("Stored Interpretations:")
    for r in rows:
        content = r['content']
        print(f"Chart: {r['chart_id']}, Tab: {r['tab_number']}, Len: {len(content)}, Start: {repr(content[:60])}")
        
    await conn.close()

if __name__ == '__main__':
    asyncio.run(main())
