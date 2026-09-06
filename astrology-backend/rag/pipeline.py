"""
rag/pipeline.py

Streaming inference pipeline: RAG context retrieval + Unified LLM Cascade.

Provider Cascade Order (defined in services/llm_providers.py):
    1. gemini-primary       (gemini-2.5-flash)
    2. groq-llama70b        (llama-3.3-70b-versatile)
    3. groq-qwen32b         (qwen/qwen3-32b, reasoning_format: "hidden")
    4. openrouter-safetynet (meta-llama/llama-3.3-70b-instruct:free)
    5. groq-gptoss120b      (openai/gpt-oss-120b, reasoning_format: "hidden")
    6. groq-llama8b         (llama-3.1-8b-instant)

Auto-fallback triggers on:
    - HTTP 429 (rate limit exceeded)
    - groq.RateLimitError / OpenAI RateLimitError
    - Short/truncated response (< 1000 characters for reports)
    - Any tier failure or missing API key
"""

from __future__ import annotations

import os
import json
import logging
from typing import AsyncGenerator, Dict, Any, Optional

import groq as groq_sdk
from openai import OpenAI
from dotenv import load_dotenv

from rag.retriever import get_context_for_tab
from services.llm_providers import (
    LLM_CASCADE,
    effective_max_tokens,
    cascade_for_language,
    is_tier_available,
)

load_dotenv(override=True)

logger = logging.getLogger(__name__)

# Minimum valid character length for full tab report outputs
MIN_CONTENT_LENGTH = 1000

# Module-level cached OpenAI clients (1 instance per tier)
_CLIENT_CACHE: Dict[str, OpenAI] = {}


class AllProvidersExhaustedError(Exception):
    """Raised when every tier in the fallback cascade has failed or rate-limited."""
    pass


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
    return "rate_limit" in msg or "429" in msg or "quota" in msg or "tpd" in msg or "tpm" in msg or "rpm" in msg


# ---------------------------------------------------------------------------
# Cached OpenAI Client Getter
# ---------------------------------------------------------------------------

def get_cached_client(tier: Dict[str, Any], is_chat: bool = False) -> OpenAI:
    """
    Retrieve or instantiate a singleton OpenAI client for a specific tier.
    """
    load_dotenv(override=True)
    tier_name = tier["name"]
    cache_key = f"{tier_name}_chat" if (is_chat and tier_name == "gemini-primary") else tier_name

    if cache_key not in _CLIENT_CACHE:
        api_key_env = tier["api_key_env"]
        api_key = os.environ.get(api_key_env, "")

        if is_chat and tier_name == "gemini-primary":
            chat_key = os.environ.get("GEMINI_CHAT_API_KEY")
            if chat_key and not chat_key.startswith("your_"):
                api_key = chat_key

        headers = {}
        if "openrouter" in tier["base_url"].lower():
            headers = {
                "HTTP-Referer": "https://trikalmdarshi.app",
                "X-Title": "Trikal Darshi",
            }

        _CLIENT_CACHE[cache_key] = OpenAI(
            api_key=api_key,
            base_url=tier["base_url"],
            default_headers=headers if headers else None,
            max_retries=0,
            timeout=60.0,
        )

    return _CLIENT_CACHE[cache_key]


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
        if not chunk.choices or len(chunk.choices) == 0:
            continue
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
# Unified Multi-Provider Streaming Generator
# ---------------------------------------------------------------------------

async def stream_with_cascade(
    messages: list,
    language: str = "english",
    model_info: dict = None,
    is_chat: bool = False,
    validate_min_length: bool = True,
) -> AsyncGenerator[str, None]:
    """
    Unified streaming inference across the multi-provider LLM cascade.
    Iterates cascade_for_language(language), skipping unavailable tiers.
    Falls through on rate-limits or invalid/truncated outputs (< 1000 chars for reports).
    """
    tiers = cascade_for_language(language)
    tier_errors = []

    for tier in tiers:
        tier_name = tier["name"]

        if not is_tier_available(tier, is_chat=is_chat):
            logger.debug(f"[pipeline] Skipping tier {tier_name} (API key not configured).")
            continue

        max_tokens = effective_max_tokens(tier)
        model_name = tier["model"]
        logger.info(f"[pipeline] Attempting tier: {tier_name} (model: {model_name}, max_tokens: {max_tokens})")

        extra_body = {}
        if "reasoning_format" in tier:
            extra_body["reasoning_format"] = tier["reasoning_format"]
        elif "openrouter" in tier["base_url"].lower():
            extra_body["reasoning"] = {"exclude": True}

        try:
            client = get_cached_client(tier, is_chat=is_chat)
            create_kwargs: Dict[str, Any] = {
                "model": model_name,
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": max_tokens,
                "stream": True,
            }
            if extra_body:
                create_kwargs["extra_body"] = extra_body

            stream = client.chat.completions.create(**create_kwargs)

            # If validating minimum length (e.g. tab reports), buffer chunks so we don't
            # stream partial/truncated content to the client before confirming validity.
            if validate_min_length:
                accumulated_tokens = []
                for token in _yield_tokens(stream):
                    accumulated_tokens.append(token)

                total_output = "".join(accumulated_tokens)
                if len(total_output.strip()) < MIN_CONTENT_LENGTH:
                    logger.warning(
                        f"[pipeline] Tier {tier_name} output too short ({len(total_output)} chars < {MIN_CONTENT_LENGTH}). "
                        "Falling through to next tier."
                    )
                    tier_errors.append(f"{tier_name}: Output truncated ({len(total_output)} chars)")
                    continue

                for token in accumulated_tokens:
                    yield token
            else:
                total_output_chars = 0
                for token in _yield_tokens(stream):
                    total_output_chars += len(token)
                    yield token

            # Successfully completed stream
            if model_info is not None:
                model_info["model"] = f"{tier_name}/{model_name}"
            logger.info(f"[pipeline] ✓ Tier {tier_name} succeeded.")
            return

        except Exception as tier_err:
            if _is_rate_limit(tier_err):
                logger.warning(f"[pipeline] Tier {tier_name} rate-limited ({tier_err}). Falling through...")
            else:
                logger.warning(f"[pipeline] Tier {tier_name} failed: {tier_err}. Falling through...")
            tier_errors.append(f"{tier_name}: {tier_err}")
            continue

    logger.critical(f"[pipeline] All providers exhausted in cascade. Errors: {tier_errors}")
    raise AllProvidersExhaustedError(f"All LLM tiers failed: {'; '.join(tier_errors)}")


# ---------------------------------------------------------------------------
# Public streaming functions
# ---------------------------------------------------------------------------

async def stream_with_rag(
    chart_data: dict,
    tab_number: int,
    full_name: str,
    tab_prompt: str,
    language: str = "english",
    model_info: dict = None,
) -> AsyncGenerator[str, None]:
    """
    Main RAG + LLM streaming pipeline for tab reports.
    """
    load_dotenv(override=True)

    # ── Step 1: RAG retrieval ─────────────────────────────────────────────
    logger.info(f"[pipeline] Retrieving RAG context for tab {tab_number}…")
    try:
        rag_context = get_context_for_tab(tab_number, chart_data)
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

    if language and language.lower() not in ("english", "en", ""):
        lang_name = language.strip().capitalize()
        lang_system_suffix = (
            f"\n\n⚡ CRITICAL OUTPUT LANGUAGE: {lang_name.upper()}\n"
            f"Your ENTIRE response must be in {lang_name}. "
            f"All headings, analysis, bullet points, and conclusions must be in {lang_name}. "
            f"Keep only classical astrological terms (Lagna, Mahadasha, Nakshatra, Dasha, "
            f"Rashi, Graha, Kundali, Dosha names, Yoga names, planet abbreviations) "
            f"in their original Sanskrit/English form. "
            f"Every other word must be in {lang_name}."
        )
        active_system_prompt = SYSTEM_PROMPT + lang_system_suffix
    else:
        active_system_prompt = SYSTEM_PROMPT

    messages = [
        {"role": "system", "content": active_system_prompt},
        {"role": "user",   "content": user_prompt},
    ]

    # ── Step 3: Stream with Unified Cascade ───────────────────────────────
    try:
        async for chunk in stream_with_cascade(
            messages=messages,
            language=language,
            model_info=model_info,
            is_chat=False,
            validate_min_length=True,
        ):
            yield chunk
    except AllProvidersExhaustedError as e:
        logger.error(f"[pipeline] Report generation failed: {e}")
        yield f"\n\n⚠️ **AI Generation Failed** — All models in the cascade are unavailable. Details: {e}"


# ---------------------------------------------------------------------------
# Chat Streaming Function
# ---------------------------------------------------------------------------

_STAGE_NO_CHART   = "no_chart"
_STAGE_CHART_ONLY = "chart_only"
_STAGE_FULL       = "full"

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
8. BOUNDARY ENFORCEMENT: You are exclusively an astrology and life guide. If the user asks questions completely unrelated to astrology, numerology, spirituality, their chart, or their life guidance (e.g., coding, math, recipes, general trivia, politics), you MUST politely decline to answer. Gently redirect them back to topics related to their chart or life journey. Do NOT provide answers to irrelevant questions to save tokens.

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
    stage: str = _STAGE_NO_CHART,
    language: str = "english",
    model_info: dict = None,
) -> AsyncGenerator[str, None]:
    """
    Main Chat RAG + LLM streaming pipeline using the unified cascade.
    """
    load_dotenv(override=True)
    interpretations = interpretations or []

    # ── 1. Build context block ──────────────────────────────────────────────
    context_parts = []

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

    # ── 2. RAG retrieval for chat ──────────────────────────────────────────
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

    # ── 3. Assemble prompt ─────────────────────────────────────────────────
    system_prompt = _CHAT_SYSTEM_PROMPT.strip()
    if context_parts:
        system_prompt += "\n\n" + "\n\n".join(context_parts)

    if language and language.lower() != "english":
        lang_name = language.capitalize()
        system_prompt += (
            f"\n\nCRITICAL INSTRUCTION: Always respond in {lang_name}. "
            f"Keep Vedic/astrological terms (Mahadasha, Lagna, Nakshatra, Dasha, "
            f"Sade Sati, Mangal Dosha, Kundali, Graha) in their original Sanskrit/English form. "
            f"All other text MUST be in {lang_name}."
        )

    llm_messages = [{"role": "system", "content": system_prompt}]
    for msg in history:
        role = "user" if msg.get("sender") == "user" else "assistant"
        llm_messages.append({"role": role, "content": msg.get("text", "")})
    llm_messages.append({"role": "user", "content": message})

    # ── 4. Stream via Cascade ──────────────────────────────────────────────
    try:
        async for chunk in stream_with_cascade(
            messages=llm_messages,
            language=language,
            model_info=model_info,
            is_chat=True,
            validate_min_length=False,  # Chat messages don't require 1000+ chars
        ):
            yield chunk
    except AllProvidersExhaustedError as e:
        yield f"\n\n⚠️ **Chat Failed** — Models are unavailable: {e}"
