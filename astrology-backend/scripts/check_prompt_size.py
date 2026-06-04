import asyncio
import asyncpg
import json
from rag.retriever import get_context_for_tab
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
    rag_context = get_context_for_tab(tab_number, chart_data)
    tab_prompt = build_tab_prompt(chart_data, tab_number, row["full_name"])
    
    rag_block = f"REFERENCE TEXTS FROM CLASSICAL SHASTRA:\n{rag_context}"
    user_prompt = f"{rag_block}\n\n━━━━━━━━━━━━━━━━━━━━━━\n\n{tab_prompt}"
    
    print("User prompt length (chars):", len(user_prompt))
    print("User prompt length (est. tokens):", len(user_prompt) / 4)
    
    await conn.close()

if __name__ == '__main__':
    asyncio.run(main())
