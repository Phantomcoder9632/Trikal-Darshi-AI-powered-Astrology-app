import asyncio
import asyncpg
from rag.pipeline import stream_with_rag

async def main():
    conn = await asyncpg.connect('postgresql://postgres:Bikram%40284@localhost:5432/astrology_db')
    row = await conn.fetchrow('SELECT id, raw_chart_data, full_name FROM charts LIMIT 1')
    if not row:
        print("No chart found")
        return
        
    import json
    raw_chart_str = row["raw_chart_data"]
    chart_data = json.loads(raw_chart_str) if isinstance(raw_chart_str, str) else raw_chart_str
    
    tab_number = 1
    
    from services.ai_prompts import build_tab_prompt
    tab_prompt = build_tab_prompt(chart_data, tab_number, row["full_name"])
    
    print("Testing stream_with_rag...")
    try:
        async for chunk in stream_with_rag(chart_data, tab_number, row["full_name"], tab_prompt):
            print(chunk, end="", flush=True)
    except Exception as e:
        print("\n\nException:", e)
        
    await conn.close()

if __name__ == '__main__':
    asyncio.run(main())
