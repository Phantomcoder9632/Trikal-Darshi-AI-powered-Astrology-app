import asyncio
import asyncpg
import json
import os
import dotenv
from openai import OpenAI

dotenv.load_dotenv(override=True)

async def main():
    conn = await asyncpg.connect('postgresql://postgres:Bikram%40284@localhost:5432/astrology_db')
    row = await conn.fetchrow('SELECT id, raw_chart_data, full_name FROM charts LIMIT 1')
    if not row:
        print("No chart found")
        await conn.close()
        return

    raw_chart_str = row["raw_chart_data"]
    chart_data = json.loads(raw_chart_str) if isinstance(raw_chart_str, str) else raw_chart_str
    
    from services.ai_prompts import build_tab_prompt
    tab_prompt = build_tab_prompt(chart_data, 1, row["full_name"])
    
    from rag.retriever import get_context_for_tab
    rag_context = get_context_for_tab(1, chart_data)
    
    rag_block = f"REFERENCE TEXTS FROM CLASSICAL SHASTRA:\n{rag_context}"
    user_prompt = f"{rag_block}\n\n━━━━━━━━━━━━━━━━━━━━━━\n\n{tab_prompt}"
    
    from rag.pipeline import SYSTEM_PROMPT, PRIMARY_MODEL, PRIMARY_BASE_URL
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user",   "content": user_prompt},
    ]
    
    print("Messages to Gemini:")
    print(json.dumps(messages, indent=2))
    
    api_key = os.getenv("GEMINI_API_KEY")
    client = OpenAI(api_key=api_key, base_url=PRIMARY_BASE_URL)
    
    print("\nCalling Gemini model:", PRIMARY_MODEL)
    try:
        response = client.chat.completions.create(
            model=PRIMARY_MODEL,
            messages=messages,
            temperature=0.7,
            max_tokens=4096,
            stream=True
        )
        print("Response received, streaming raw output:")
        for chunk in response:
            choice = chunk.choices[0]
            content = choice.delta.content
            finish_reason = choice.finish_reason
            if content:
                print(content, end="", flush=True)
            if finish_reason:
                print(f"\n[Finish Reason: {finish_reason}]")
    except Exception as e:
        print("\nError during stream:", e)
        
    await conn.close()

if __name__ == '__main__':
    asyncio.run(main())
