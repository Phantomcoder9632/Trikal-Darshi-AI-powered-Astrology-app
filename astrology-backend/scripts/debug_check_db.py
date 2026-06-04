"""Quick diagnostic: check what's stored in the interpretations table + Redis cache."""
import asyncio
import asyncpg
import json
import os
import redis

async def main():
    # 1. Check PostgreSQL interpretations
    conn = await asyncpg.connect('postgresql://postgres:Bikram%40284@localhost:5432/astrology_db')
    
    print("=" * 60)
    print("POSTGRESQL INTERPRETATIONS TABLE")
    print("=" * 60)
    
    rows = await conn.fetch(
        "SELECT chart_id, tab_number, tab_name, length(content) as content_len, "
        "LEFT(content, 200) as preview, model_used, generated_at "
        "FROM interpretations ORDER BY tab_number"
    )
    
    if not rows:
        print("  (empty - no cached interpretations)")
    else:
        for r in rows:
            print(f"\n  Tab {r['tab_number']} ({r['tab_name']}):")
            print(f"    Chart ID:  {r['chart_id']}")
            print(f"    Length:    {r['content_len']} chars")
            print(f"    Model:     {r['model_used']}")
            print(f"    Generated: {r['generated_at']}")
            print(f"    Preview:   {r['preview'][:150]}...")
    
    # Also get chart IDs
    print("\n" + "=" * 60)
    print("CHARTS TABLE")
    print("=" * 60)
    chart_rows = await conn.fetch(
        "SELECT id, full_name, date_of_birth FROM charts ORDER BY created_at DESC LIMIT 5"
    )
    for cr in chart_rows:
        print(f"  ID: {cr['id']}  Name: {cr['full_name']}  DOB: {cr['date_of_birth']}")
    
    await conn.close()
    
    # 2. Check Redis
    print("\n" + "=" * 60)
    print("REDIS CACHE")
    print("=" * 60)
    try:
        r = redis.Redis(host='localhost', port=6379, decode_responses=True, protocol=2)
        keys = r.keys("interpretation:*")
        if not keys:
            print("  (no interpretation keys in Redis)")
        else:
            for k in keys:
                val = r.get(k)
                print(f"  {k}: {len(val) if val else 0} chars")
                if val:
                    print(f"    Preview: {val[:150]}...")
    except Exception as e:
        print(f"  Redis error: {e}")

if __name__ == '__main__':
    asyncio.run(main())
