import asyncio
import httpx

async def main():
    # Delete the truncated database entry first to force generation
    import asyncpg
    conn = await asyncpg.connect('postgresql://postgres:Bikram%40284@localhost:5432/astrology_db')
    await conn.execute("DELETE FROM interpretations WHERE tab_number = 1")
    await conn.close()

    url = "http://localhost:8000/interpret/01b33d3d-1dba-440b-a861-876a04465970/1"
    print("Sending POST request to:", url)
    
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream("POST", url) as response:
                print("Status code:", response.status_code)
                print("Streaming response:")
                async for chunk in response.aiter_text():
                    print(chunk, end="", flush=True)
                print("\nStream finished successfully.")
    except Exception as e:
        print("\nHTTP Error:", e)

if __name__ == '__main__':
    asyncio.run(main())
