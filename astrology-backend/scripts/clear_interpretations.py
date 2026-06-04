"""Clear ALL cached interpretations for the active chart so they regenerate fresh."""
import asyncio
import asyncpg
import redis

CHART_ID = '9d2266d8-d417-4ec5-88ea-69159394f77b'

async def main():
    conn = await asyncpg.connect('postgresql://postgres:Bikram%40284@localhost:5432/astrology_db')
    
    # Delete from PostgreSQL
    deleted = await conn.execute(
        "DELETE FROM interpretations WHERE chart_id = $1::uuid",
        CHART_ID
    )
    print(f"PostgreSQL: {deleted}")
    
    # Also delete the older chart interpretations
    deleted2 = await conn.execute(
        "DELETE FROM interpretations WHERE chart_id = '01b33d3d-1dba-440b-a861-876a04465970'::uuid"
    )
    print(f"PostgreSQL (old chart): {deleted2}")
    
    await conn.close()
    
    # Clear Redis
    try:
        r = redis.Redis(host='localhost', port=6379, protocol=2)
        for tab in range(1, 11):
            for cid in [CHART_ID, '01b33d3d-1dba-440b-a861-876a04465970']:
                key = f"interpretation:{cid}:{tab}"
                r.delete(key)
        print("Redis: All interpretation keys cleared")
    except Exception as e:
        print(f"Redis: {e}")
    
    print("\nDone! All cached interpretations cleared. Refresh your browser to regenerate.")

if __name__ == '__main__':
    asyncio.run(main())
