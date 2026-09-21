"""Live probe: verify Cloudflare Workers AI Tier 1 end-to-end.

1. Real streaming completion through the Cloudflare OpenAI-compatible endpoint.
2. Check that stream_with_cascade() routes through cloudflare-primary first.
3. Hindi/Bengali requests front the Cloudflare DeepSeek-R1 distill.
4. Fallback behavior: bogus token -> clean fall-through to Gemini.
"""
import asyncio
import sys
import time

sys.path.insert(0, ".")
import os

from dotenv import load_dotenv

load_dotenv(override=True)

from services.llm_providers import LLM_CASCADE, is_tier_available, cascade_for_language
from rag.pipeline import stream_with_cascade

CF_TIER = LLM_CASCADE[0]
CF_MODEL = CF_TIER["model"]
GEMINI_MODEL = next(t["model"] for t in LLM_CASCADE if t["name"] == "gemini-primary")


async def main():
    print("Tier 1 available:", is_tier_available(CF_TIER))

    # ── Probe 1: raw Cloudflare streaming call ────────────────────────────
    print("\n=== Probe 1: raw Cloudflare stream (first 5 chunks + latency) ===")
    from rag.pipeline import get_cached_client

    client = get_cached_client(CF_TIER)
    t0 = time.time()
    first_chunk_at = None
    chars = 0
    preview = ""
    try:
        stream = client.chat.completions.create(
            model=CF_MODEL,
            messages=[
                {"role": "system", "content": "You are a Vedic astrologer. Be concise."},
                {"role": "user", "content": "In 3 sentences, what does Mars in the 10th house indicate for career?"},
            ],
            temperature=0.7,
            max_tokens=300,
            stream=True,
        )
        for token in stream:
            if first_chunk_at is None:
                first_chunk_at = time.time() - t0
            chars += len(token)
            if len(preview) < 220:
                preview += token
        print(f"  model:            {CF_MODEL}")
        print(f"  first chunk:      {first_chunk_at:.2f}s")
        print(f"  total:            {time.time() - t0:.2f}s")
        print(f"  chars received:   {chars}")
        print(f"  preview: {preview.strip()[:220]!r}")
    except Exception as e:
        print(f"  FAILED: {type(e).__name__}: {e}")
        print("  (check CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID / model access)")

    # ── Probe 2: cascade routing (report path) ────────────────────────────
    print("\n=== Probe 2: stream_with_cascade routing (report path) ===")
    model_info = {}
    t0 = time.time()
    chunks = []
    async for chunk in stream_with_cascade(
        messages=[
            {"role": "system", "content": "You are a Vedic astrologer."},
            {"role": "user", "content": "One short paragraph on Sun in Aries (Sun in Aries)."},
        ],
        language="english",
        model_info=model_info,
        is_chat=False,
        validate_min_length=False,
    ):
        chunks.append(chunk)
    print(f"  routed model: {model_info.get('model')}")
    print(f"  total: {time.time() - t0:.2f}s, chars: {len(''.join(chunks))}")

    # ── Probe 3: Hindi routing front → cloudflare-deepseek32b ────────────
    print("\n=== Probe 3: Hindi request fronts cloudflare-deepseek32b ===")
    hi_cascade = cascade_for_language("hi")
    print(f"  first tier for 'hi': {hi_cascade[0]['name']} ({hi_cascade[0]['model']})")

    # ── Probe 4: fallback — bogus Cloudflare token falls to Gemini ───────
    print("\n=== Probe 4: bogus Cloudflare token -> fall-through to Gemini ===")
    os.environ["CLOUDFLARE_API_TOKEN"] = "cfat_invalid_token_for_fallback_test"
    model_info = {}
    chunks = []
    try:
        async for chunk in stream_with_cascade(
            messages=[{"role": "user", "content": "Say OK in one word."}],
            language="english",
            model_info=model_info,
            is_chat=False,
            validate_min_length=False,
        ):
            chunks.append(chunk)
        print(f"  routed model: {model_info.get('model')}  (expected gemini-primary/{GEMINI_MODEL})")
        print(f"  chars: {len(''.join(chunks))}")
    except Exception as e:
        print(f"  FAILED: {type(e).__name__}: {e}")


if __name__ == "__main__":
    asyncio.run(main())
