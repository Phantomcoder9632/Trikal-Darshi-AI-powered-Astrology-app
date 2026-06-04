"""
Quick test: Hit the running backend's /interpret endpoint and measure the response.
This bypasses the frontend to isolate whether the backend is producing full output.
"""
import httpx
import time
import sys

CHART_ID = "9d2266d8-d417-4ec5-88ea-69159394f77b"
TAB = 1
URL = f"http://localhost:8000/interpret/{CHART_ID}/{TAB}"

print(f"POST {URL}")
print("Streaming response...\n")

total_chars = 0
start = time.time()

try:
    with httpx.Client(timeout=120.0) as client:
        with client.stream("POST", URL, json={}) as response:
            response.raise_for_status()
            for chunk in response.iter_text():
                total_chars += len(chunk)
                # Print first 500 chars and last 200 chars
                if total_chars <= 500:
                    print(chunk, end="", flush=True)
                elif total_chars - len(chunk) <= 500:
                    # Transition point
                    remaining = 500 - (total_chars - len(chunk))
                    print(chunk[:remaining], end="", flush=True)
                    print("\n\n... [streaming middle content] ...\n", flush=True)
except Exception as e:
    print(f"\n\nERROR: {e}")

elapsed = time.time() - start
print(f"\n\n{'='*60}")
print(f"TOTAL CHARS: {total_chars}")
print(f"ELAPSED:     {elapsed:.1f}s")
print(f"STATUS:      {'[OK] FULL RESPONSE' if total_chars > 2000 else '[FAIL] TRUNCATED' if total_chars > 0 else '[FAIL] EMPTY'}")
if total_chars < 1000:
    print(f"WARNING: Only {total_chars} chars — this is almost certainly truncated!")
    print(f"   A proper Tab 1 analysis should be 4000-10000+ chars.")
