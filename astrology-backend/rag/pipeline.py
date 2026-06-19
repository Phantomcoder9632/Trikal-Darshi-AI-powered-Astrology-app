"""
rag/pipeline.py

Streaming inference pipeline: RAG context retrieval + LLM.

Provider Priority:
    1. PRIMARY  — OpenRouter: google/gemma-4-31b-it:free  (reasoning param)
    2. FALLBACK — Groq  : qwen/qwen3-32b  (reasoning_effort="default")

Auto-fallback triggers on:
    - HTTP 429 (rate limit exceeded)
    - groq.RateLimitError
    - Any exception containing "rate_limit" or "429" in its message

Flow:
    1. get_context_for_tab()  → pull relevant book passages from ChromaDB
    2. Build enriched prompt  → inject passages + chart data
    3. Stream tokens back     → from primary; fall back to Groq on 429
"""

from __future__ import annotations

import os
import json
import logging
from typing import AsyncGenerator, Dict, Any

import groq as groq_sdk
from groq import Groq
from openai import OpenAI
from dotenv import load_dotenv

from rag.retriever import get_context_for_tab

load_dotenv(override=True)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Primary: Google AI Studio — gemini-2.5-flash
# ---------------------------------------------------------------------------
PRIMARY_MODEL      = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
PRIMARY_BASE_URL   = "https://generativelanguage.googleapis.com/v1beta/openai/"
PRIMARY_API_KEY    = os.getenv("GEMINI_API_KEY", "")

# ---------------------------------------------------------------------------
# Fallback Cascade: OpenRouter
# ---------------------------------------------------------------------------
FALLBACK_BASE_URL  = "https://openrouter.ai/api/v1"
FALLBACK_API_KEY   = os.getenv("OPENROUTER_API_KEY", "")
FALLBACK_MODELS    = [
    "google/gemma-4-31b-it:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "openrouter/free",
]

# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = """
You are a Trikal Darshi Cosmic Architect — a rare master 
who has simultaneously mastered three ancient systems:
1. Vedic Jyotish Acharya trained in Parashari and Jaimini 
   systems using Bengal tradition
2. Lal Kitab Visheshagya specialist in Rin and karmic 
   debt analysis
3. Numerology Pandit in Chaldean and Vedic Ankjyotish

Rules:
- NEVER hallucinate planetary positions. 
  Use ONLY the chart data provided to you.
- For all planetary references in your text, always write the planet's name using its Sanskrit abbreviation/name followed by the English name in parentheses to match the visual chart:
  * Sun -> Surya/Su (Sun)
  * Moon -> Chandra/Ch (Moon)
  * Mars -> Mangal/Ma (Mars)
  * Mercury -> Budh/Bu (Mercury)
  * Jupiter -> Guru/Gu (Jupiter)
  * Venus -> Shukra/Sk (Venus)
  * Saturn -> Shani/Sa (Saturn)
  * Rahu -> Rahu/Ra (Rahu)
  * Ketu -> Ketu/Ke (Ketu)
  Example format: "Budh/Bu (Mercury)", "Guru/Gu (Jupiter)".
- Be specific and anchor everything to the chart data.
- Be honest. State hard truths with compassion.
- Do not give generic horoscope content.
- Use North Indian chart convention throughout.
- Chitrapaksha ayanamsha, IST timezone baseline.
- This is a North Indian Bengali man's chart.
- The REFERENCE TEXTS from classical shastras are your
  primary knowledge source. Quote and apply them directly.
"""

# ---------------------------------------------------------------------------
# Tab-specific task instructions
# ---------------------------------------------------------------------------
TAB_TASKS: Dict[int, str] = {
    1: (
        "Generate Tab 1 — Lagna & Soul Blueprint\n\n"
        "Analyze D1 (Lagna) chart AND Chandra Kundali (Moon chart) simultaneously. "
        "Cover: (A) Foundation Analysis — lagna, lagna lord, moon nakshatra, "
        "atmakaraka, arudha lagna — cross-verified between D1 and Chandra Kundali. "
        "(B) Planetary Dignity Report for all 9 grahas in D1 and Chandra Kundali. "
        "(C) Yoga Scan — all active yogas, doshas, confirmed across both charts. "
        "(D) Current Time Stream — mahadasha/antardasha + 24-month forecast. "
        "(E) Jupiter Exaltation Personal Analysis in D1 and Chandra Kundali."
    ),
    2: (
        "Generate Tab 2 — Lal Kitab Analysis\n\n"
        "Use Lal Kitab framework ONLY. Cover: (A) Pakka Ghar mapping for each planet. "
        "(B) Rin (karmic debt) analysis — which Rins are active and their Farmaan. "
        "(C) Current transits through Lal Kitab lens. "
        "(D) 5 specific Lal Kitab Farmaan remedies with day, action, restriction."
    ),
    3: (
        "Generate Tab 3 — Numerology Matrix\n\n"
        "Use Chaldean + Vedic Ankjyotish. Cover: (A) Moolank, Bhagyank, Namank, Karmank "
        "with calculation steps. (B) Cross-system validation with natal chart. "
        "(C) 2026 numerology forecast. (D) Lucky numbers, days, colors, years."
    ),
    4: (
        "Generate Tab 4 — Career & Dashamsha (D10)\n\n"
        "Analyze D1 + D10 Dashamsha simultaneously. "
        "Cover: (A) D1 career foundation — 10th house, Saturn as Karma Karaka. "
        "(B) D10 Lagna and 10th house — true career destiny from divisional chart. "
        "(C) Jupiter exaltation career window in D1 and D10. "
        "(D) Best timing for job change/business from D1 Dasha + D10 analysis. "
        "(E) Leadership assessment. (F) 24-month career prediction in 4 windows."
    ),
    5: (
        "Generate Tab 5 — Wealth & Abundance\n\n"
        "Analyze D1 + D4 Chaturthamsa simultaneously. "
        "Cover: (A) 2nd and 11th house analysis with Ashtakavarga scores. "
        "(B) D4 Chaturthamsa — property, fixed assets, inheritance destiny. "
        "(C) All active Dhana yogas — name, strength, most powerful. "
        "(D) Wealth windows 2026–2028 — best months to invest/save/avoid risk. "
        "(E) Hard truths: biggest wealth-blocking pattern."
    ),
    6: (
        "Generate Tab 6 — Love, Marriage & Navamsha (D9)\n\n"
        "Analyze D1 + D9 Navamsha + D7 Saptamsha simultaneously. "
        "Cover: (A) 7th house and Venus analysis in D1. "
        "(B) D9 Navamsha — marriage quality, vargottama planets, Venus in D9. "
        "(C) Spouse characteristics from Upapada lagna and D9 7th house. "
        "(D) Marriage timing 2026–2028 confirmed across D1 and D9. "
        "(E) Compatibility advice and brief D7 children note."
    ),
    7: (
        "Generate Tab 7 — Health & Vitality\n\n"
        "Analyze D1 + D30 Trimsamsa + Surya Kundali simultaneously. "
        "Cover: (A) D1 health foundation — lagna lord strength, 6th/8th house. "
        "(B) D30 Trimsamsa — chronic disease indicators, afflicted planets. "
        "(C) Surya Kundali — vitality and Sun-ruled health areas. "
        "(D) Mental health — Moon, Mercury, Saturn across D1 and D30. "
        "(E) Current period health watch. (F) Vitality boosting advice."
    ),
    8: (
        "Generate Tab 8 — Remedies (Tripath System)\n\n"
        "Three separate tracks — NEVER mix them:\n"
        "TRACK 1 (Vedic): Mantra + Gemstone + Dana + Fasting for 2 afflicted planets.\n"
        "TRACK 2 (Lal Kitab): 5 Farmaan remedies with day/action/restriction.\n"
        "TRACK 3 (Numerology): Name correction, lucky colors by day, "
        "affirmation practice, lucky number grid, best days this month."
    ),
    9: (
        "Generate Tab 9 — Progeny, Lineage & Saptamsha (D7)\n\n"
        "Analyze D7 Saptamsha (PRIMARY) + D1 simultaneously. "
        "Cover: (A) D7 Lagna and 5th house — progeny type and potential. "
        "(B) Jupiter in D7 — children karaka strength. "
        "(C) D1 5th house cross-reference — does it confirm D7 findings? "
        "(D) Timing of children in 2026–2028 using Dasha and Jupiter transit. "
        "(E) Creative legacy and lineage indicators. "
        "(F) Remedies if obstructions to progeny are found."
    ),
    10: (
        "Generate Tab 10 — Gochar (Current Planetary Transits)\n\n"
        "Use REAL-TIME Gochar transit positions + natal D1 chart for transit analysis. "
        "Cover: (A) Overview of all current transits over natal houses. "
        "(B) Jupiter transit into Cancer (exaltation) — month-by-month activation. "
        "(C) Saturn in Pisces — Sade Sati / Ashtama Shani analysis. "
        "(D) Rahu-Ketu axis analysis across natal houses. "
        "(E) Monthly transit forecast for June–November 2026. "
        "(F) Gochara Vedha check — which favorable transits are blocked."
    ),
}

# ---------------------------------------------------------------------------
# Helper: is this a rate-limit / quota error?
# ---------------------------------------------------------------------------

def _is_rate_limit(exc: Exception) -> bool:
    """Return True if the exception looks like a 429 / rate-limit error."""
    if isinstance(exc, groq_sdk.RateLimitError):
        return True
    msg = str(exc).lower()
    return "rate_limit" in msg or "429" in msg or "quota" in msg or "tpd" in msg


# ---------------------------------------------------------------------------
# Inner streaming helpers
# ---------------------------------------------------------------------------

def _stream_primary(messages: list, chat_mode: bool = False) -> Any:
    """
    Open a streaming chat completion directly on Gemini (AI Studio).
    """
    load_dotenv(override=True)
    api_key = os.getenv("GEMINI_API_KEY", PRIMARY_API_KEY)
    if chat_mode:
        chat_api_key = os.getenv("GEMINI_CHAT_API_KEY")
        if chat_api_key and not chat_api_key.startswith("your_"):
            api_key = chat_api_key
            logger.info("[pipeline] Using dedicated GEMINI_CHAT_API_KEY")
            
    model   = os.getenv("GEMINI_MODEL", PRIMARY_MODEL)

    if not api_key or api_key.startswith("your_"):
        raise ValueError(
            "GEMINI_API_KEY is not configured. "
            "Set a valid key in .env to enable Gemini."
        )

    primary_client = OpenAI(
        api_key=api_key,
        base_url=PRIMARY_BASE_URL,
        max_retries=0,
        timeout=60.0,
    )
    logger.info(f"[pipeline] PRIMARY → Gemini model: {model}")
    return primary_client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=0.7,
        max_tokens=16384,  # Gemini 2.5 Flash supports up to 65k output tokens
        stream=True,
    )


def _stream_fallback(messages: list, model: str) -> Any:
    """
    Open a streaming chat completion on OpenRouter using the specified model.
    """
    load_dotenv(override=True)
    api_key = os.getenv("OPENROUTER_API_KEY", FALLBACK_API_KEY)

    if not api_key or api_key.startswith("your_"):
        raise ValueError(
            "OPENROUTER_API_KEY fallback is not configured. "
            "Set a valid key in .env to enable OpenRouter fallback."
        )

    fallback_client = OpenAI(
        api_key=api_key,
        base_url=FALLBACK_BASE_URL,
        default_headers={
            "HTTP-Referer": "https://trikalmdarshi.app",
            "X-Title": "Trikal Darshi",
        },
        max_retries=0,
        timeout=60.0,
    )
    logger.info(f"[pipeline] FALLBACK → OpenRouter model: {model}")
    return fallback_client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=0.7,
        max_tokens=4096,
        stream=True,
    )


# ---------------------------------------------------------------------------
# Token-stream processor: strips <think>…</think> blocks
# ---------------------------------------------------------------------------

def _yield_tokens(stream):
    """
    Consume an OpenAI-compatible stream and yield only the visible content,
    suppressing any <think>…</think> reasoning blocks.
    """
    buffer   = ""
    in_think = False

    for chunk in stream:
        token = chunk.choices[0].delta.content
        if not token:
            continue

        buffer += token

        while True:
            if not in_think:
                if "<think>" in buffer:
                    parts = buffer.split("<think>", 1)
                    if parts[0]:
                        yield parts[0]
                    buffer   = parts[1]
                    in_think = True
                else:
                    if len(buffer) > 7:
                        yield buffer[:-7]
                        buffer = buffer[-7:]
                    break
            else:
                if "</think>" in buffer:
                    parts    = buffer.split("</think>", 1)
                    buffer   = parts[1]
                    in_think = False
                else:
                    if len(buffer) > 8:
                        buffer = buffer[-8:]
                    break

    if not in_think and buffer:
        if not buffer.startswith("<thi"):
            yield buffer


# ---------------------------------------------------------------------------
# Public streaming function
# ---------------------------------------------------------------------------

async def stream_with_rag(
    chart_data: dict,
    tab_number: int,
    full_name: str,
    tab_prompt: str,
):
    """
    Main RAG + LLM streaming pipeline.

    Steps:
      1. Retrieve relevant book passages for this tab via ChromaDB.
      2. Build the enriched prompt (shastra context + chart + task).
      3. Stream response tokens — PRIMARY (OpenRouter) first,
         auto-fallback to FALLBACK (Groq) on 429.

    Args:
        chart_data:  Full chart dict from the ephemeris service.
        tab_number:  Report tab (1–10).
        full_name:   Subject's full name (for prompt personalisation).
        tab_prompt:  Complete user prompt (without RAG context) to wrap.

    Yields:
        str — one streamed token at a time.
    """
    load_dotenv(override=True)

    # ── Step 1: RAG retrieval ─────────────────────────────────────────────
    logger.info(f"[pipeline] Retrieving RAG context for tab {tab_number}…")
    try:
        rag_context = get_context_for_tab(tab_number, chart_data)
        # Hard cap on RAG context to prevent token overflow
        # 4000 chars gives the LLM 3-5 full book passages without overwhelming context
        if len(rag_context) > 4000:
            rag_context = rag_context[:4000] + "\n[...truncated for token limit]"
        logger.info(f"[pipeline] RAG context length: {len(rag_context)} chars")
    except Exception as rag_err:
        logger.warning(f"[pipeline] RAG retrieval failed: {rag_err}. Continuing without context.")
        rag_context = ""

    # ── Step 2: Build prompt ──────────────────────────────────────────────
    rag_block = (
        f"REFERENCE TEXTS FROM CLASSICAL SHASTRA:\n{rag_context}"
        if rag_context.strip()
        else "REFERENCE TEXTS: (vector store not yet initialised — use internal knowledge)"
    )
    user_prompt = f"{rag_block}\n\n━━━━━━━━━━━━━━━━━━━━━━\n\n{tab_prompt}"

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user",   "content": user_prompt},
    ]

    # ── Step 3: Stream from PRIMARY (OpenRouter) ───────────────────
    primary_err_msg = ""
    try:
        stream = _stream_primary(messages)
        yielded_any = False
        for token in _yield_tokens(stream):
            yielded_any = True
            yield token
        if yielded_any:
            return  # primary succeeded — done
    except Exception as primary_err:
        primary_err_msg = str(primary_err)
        if _is_rate_limit(primary_err):
            logger.warning(
                f"[pipeline] PRIMARY rate-limited ({primary_err}). "
                "Switching to FALLBACK (OpenRouter Cascade)…"
            )
        else:
            logger.error(f"[pipeline] PRIMARY stream failed: {primary_err}. Trying FALLBACK (OpenRouter Cascade)…")

    # ── Step 3b: Fallback Cascade (OpenRouter) ─────────────
    load_dotenv(override=True)
    env_model = os.getenv("OPENROUTER_MODEL")
    
    fallback_models = []
    if env_model and env_model.strip():
        fallback_models.append(env_model.strip())
    for default_m in FALLBACK_MODELS:
        if default_m not in fallback_models:
            fallback_models.append(default_m)

    fallback_errs = []
    for fb_model in fallback_models:
        logger.info(f"[pipeline] Trying fallback model: {fb_model}")
        try:
            stream = _stream_fallback(messages, fb_model)
            yielded_any = False
            for token in _yield_tokens(stream):
                yielded_any = True
                yield token
            if yielded_any:
                logger.info(f"[pipeline] Fallback model {fb_model} succeeded.")
                return  # Success!
        except Exception as fallback_err:
            logger.warning(f"[pipeline] Fallback model {fb_model} failed: {fallback_err}")
            fallback_errs.append(f"{fb_model}: {fallback_err}")

    # If all models in the cascade failed:
    logger.critical("[pipeline] All primary and fallback models failed.")
    if fallback_errs and any("not configured" in err for err in fallback_errs):
        yield (
            "\n\n⚠️ **AI Configuration Error** — The fallback model (OpenRouter) is not configured.\n\n"
            "**To fix this:**\n"
            "1. Add your OpenRouter API key to the `.env` file as `OPENROUTER_API_KEY=sk-or-...`\n"
            "2. Restart the server"
        )
    else:
        err_details = "; ".join(fallback_errs)
        yield f"\n\n⚠️ **AI Generation Failed** — All models are unavailable. Details: {err_details}"

# ---------------------------------------------------------------------------
# Chat Streaming Function
# ---------------------------------------------------------------------------

# Stage constants (must match routes/chat.py)
_STAGE_NO_CHART   = "no_chart"
_STAGE_CHART_ONLY = "chart_only"
_STAGE_FULL       = "full"

# ---------------------------------------------------------------------------
# System prompt — warm, plain-language "caring friend" persona
# ---------------------------------------------------------------------------
_CHAT_SYSTEM_PROMPT = """\
You are a warm, empathetic, and supportive life guide inside the Trikal Darshi astrology app.
Your name is "Trikal AI Guide". Think of yourself as a caring, wise older friend — not a professor,
not a formal astrologer, just someone who genuinely wants to help the user understand their life.

YOUR LANGUAGE RULES (VERY IMPORTANT):
1. ALWAYS use simple, everyday words that anyone can understand. Never use jargon without explaining it.
2. If you MUST use an astrological term (like "Mahadasha", "Lagna", "Saturn"), explain it immediately
   in plain words right after using it — like this: "Your Mahadasha (think of it as the big life chapter
   you're currently in) is ruled by Jupiter, which means..."
3. Talk about real-life things: career, love, family, money, health, stress, happiness — not planets
   and houses in isolation.
4. Be warm and encouraging. Even when sharing a difficult prediction, frame it with hope.
5. Keep answers concise and conversational. No long walls of text. Use short paragraphs.
6. End EVERY response with one simple, friendly tip or action the user can take right now.
7. Never say "According to your chart, the 7th Lord Venus is in the 11th house conjunct Mercury."
   Instead say "When it comes to love and finding a partner, your stars suggest you're most likely to
   meet someone special through your social circle or friends — so staying connected and social is
   really good for your love life!"

TONE EXAMPLES:
- Instead of: "Rahu in 10th causes delays due to karmic debt" → say: "Your career might feel like
  it's moving slower than you'd like — like you're working twice as hard for the same results others
  get easily. But here's the beautiful part: the stars say that struggle is building something
  incredibly solid for you. You're on the scenic route to success, and the view at the top will
  be worth it."
- Instead of: "Moon debilitated in Scorpio" → say: "You might feel emotions quite deeply and
  sometimes feel overwhelmed by your own feelings. That's not a weakness — it's what makes you
  so empathetic and understanding towards others."

IMPORTANT: You are NOT making up readings. You are explaining the official readings already
generated for this user (provided below). Your job is to translate them into human language
and help the user apply the insights to their real life.
"""

async def stream_chat_response(
    message: str,
    history: list,
    chart_data: dict | None = None,
    interpretations: list | None = None,
    stage: str = _STAGE_NO_CHART
) -> AsyncGenerator[str, None]:
    """
    Main Chat RAG + LLM streaming pipeline.
    Handles three stages:
      - no_chart:   new user, nothing in DB — general welcoming mode
      - chart_only: chart submitted but no interpretations generated yet
      - full:       pre-generated interpretations available — use them as primary context
    """
    load_dotenv(override=True)
    interpretations = interpretations or []

    # ── 1. Build the context block ──────────────────────────────────────────

    context_parts = []

    # Basic personal info header
    if chart_data:
        full_name = chart_data.get("full_name") or "Seeker"
        dob       = chart_data.get("date_of_birth") or "Unknown"
        city      = chart_data.get("city_of_birth") or "Unknown"
        cur_city  = chart_data.get("current_city") or city
        dasha     = chart_data.get("dasha") or {}
        md        = dasha.get("mahadasha") or "Unknown"
        ad        = dasha.get("antardasha") or "Unknown"
        lagna     = (chart_data.get("ascendant") or {}).get("sign") or "Unknown"

        context_parts.append(
            f"USER'S BASIC INFO:\n"
            f"  Name: {full_name}\n"
            f"  Born: {dob} in {city}\n"
            f"  Currently lives in: {cur_city}\n"
            f"  Their Lagna (rising sign / overall personality sign): {lagna}\n"
            f"  Current life chapter (Mahadasha): {md}\n"
            f"  Current sub-chapter (Antardasha): {ad}"
        )
    else:
        full_name = "Seeker"
        lagna     = "Unknown"
        md        = "Unknown"

    # ── 2. Inject pre-generated interpretations (Stage FULL) ───────────────
    if stage == _STAGE_FULL and interpretations:
        interp_block = "OFFICIAL READINGS ALREADY GENERATED FOR THIS USER:\n"
        interp_block += "(These are the full AI-generated readings. Use them as your primary source.)\n\n"
        for interp in interpretations:
            tab_name = interp.get("tab_name", f"Section {interp.get('tab_number', '?')}")
            content  = interp.get("content", "").strip()
            if content:
                interp_block += f"[{tab_name.upper()}]\n{content}\n\n"
        context_parts.append(interp_block.strip())
        logger.info(f"[pipeline] Injected {len(interpretations)} interpretation(s) into chat prompt")

    elif stage == _STAGE_CHART_ONLY and chart_data:
        context_parts.append(
            "NOTE: The user's detailed readings are still being generated. "
            "You have access to their basic birth chart positions below, but NOT the full predictions yet. "
            "Be helpful based on what you have, and let them know their detailed readings will be ready soon."
        )

    elif stage == _STAGE_NO_CHART:
        context_parts.append(
            "NOTE: This user has not submitted their birth details yet. "
            "Be warm and welcoming. Guide them to enter their birth date, time, and city so you can "
            "give them a personalized reading. Answer general astrology questions kindly in the meantime."
        )

    # ── 3. RAG — fetch relevant dos/don'ts and remedies from vector store ──
    rag_context = ""
    try:
        from rag.retriever import _get_vs, format_rag_context
        vs = _get_vs()
        search_query = f"{lagna} lagna {md} mahadasha {message}"
        docs = vs.similarity_search(search_query, k=3)
        if docs:
            rag_context = format_rag_context(docs)
            logger.info(f"[pipeline] RAG returned {len(docs)} doc(s) for chat")
    except Exception as e:
        logger.warning(f"[pipeline] RAG for chat failed: {e}")

    if rag_context:
        context_parts.append(
            f"RELEVANT ASTROLOGICAL KNOWLEDGE (dos, don'ts, remedies from our books):\n{rag_context}"
        )

    # ── 4. Assemble full system prompt ─────────────────────────────────────
    system_prompt = _CHAT_SYSTEM_PROMPT.strip()

    if context_parts:
        system_prompt += "\n\n" + "\n\n".join(context_parts)

    # ── 5. Build message list with conversation history ────────────────────
    llm_messages = [{"role": "system", "content": system_prompt}]
    for msg in history:
        role = "user" if msg.get("sender") == "user" else "assistant"
        llm_messages.append({"role": role, "content": msg.get("text", "")})
    llm_messages.append({"role": "user", "content": message})

    # ── 6. Try primary (dedicated chat key) then fallbacks ────────────────
    try:
        stream = _stream_primary(llm_messages, chat_mode=True)
        yielded_any = False
        for token in _yield_tokens(stream):
            yielded_any = True
            yield token
        if yielded_any:
            return
    except Exception as primary_err:
        if _is_rate_limit(primary_err):
            logger.warning(f"[pipeline] PRIMARY chat rate-limited ({primary_err}). Switching to FALLBACK…")
        else:
            logger.error(f"[pipeline] PRIMARY chat stream failed: {primary_err}. Trying FALLBACK…")

    env_model = os.getenv("OPENROUTER_MODEL")
    fallback_models = []
    if env_model and env_model.strip():
        fallback_models.append(env_model.strip())
    for default_m in FALLBACK_MODELS:
        if default_m not in fallback_models:
            fallback_models.append(default_m)

    fallback_errs = []
    for fb_model in fallback_models:
        try:
            stream = _stream_fallback(llm_messages, fb_model)
            yielded_any = False
            for token in _yield_tokens(stream):
                yielded_any = True
                yield token
            if yielded_any:
                return
        except Exception as fallback_err:
            fallback_errs.append(f"{fb_model}: {fallback_err}")

    yield f"\n\n⚠️ **Chat Failed** — Models are unavailable: {'; '.join(fallback_errs)}"
