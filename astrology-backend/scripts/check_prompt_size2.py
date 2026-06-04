import asyncio
import asyncpg
import json
from services.ai_prompts import build_tab_prompt
from rag.pipeline import SYSTEM_PROMPT

async def main():
    conn = await asyncpg.connect('postgresql://postgres:Bikram%40284@localhost:5432/astrology_db')
    row = await conn.fetchrow('SELECT id, raw_chart_data, full_name FROM charts LIMIT 1')
    if not row:
        print("No chart found")
        return
        
    raw_chart_str = row["raw_chart_data"]
    chart_data = json.loads(raw_chart_str) if isinstance(raw_chart_str, str) else raw_chart_str
    
    # Try tab 1
    tab_number = 1
    tab_prompt = build_tab_prompt(chart_data, tab_number, row["full_name"])
    
    user_prompt = f"REFERENCE TEXTS FROM CLASSICAL SHASTRA:\n\n\n━━━━━━━━━━━━━━━━━━━━━━\n\n{tab_prompt}"
    
    print("User prompt length (chars):", len(user_prompt))
    print("User prompt length (est. tokens):", len(user_prompt) / 4)
    
    # Dump chart_data size
    print("chart_data JSON length (chars):", len(json.dumps(chart_data, indent=2)))
    
    await conn.close()

if __name__ == '__main__':
    asyncio.run(main())
