"""
rag/pipeline.py

Streaming inference pipeline: RAG context retrieval + Groq LLM.

Flow:
    1. get_context_for_tab()  → pull relevant book passages from ChromaDB
    2. build_tab_prompt()     → inject passages + chart data into the prompt
    3. Groq streaming API     → stream tokens back to the caller
"""

from __future__ import annotations

import os
import json
import logging
from typing import AsyncGenerator, Dict, Any

from groq import Groq
from dotenv import load_dotenv

from rag.retriever import get_context_for_tab

load_dotenv(override=True)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Groq client (sync SDK — we stream manually in an async wrapper)
# ---------------------------------------------------------------------------

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL   = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

client = Groq(api_key=GROQ_API_KEY)

# ---------------------------------------------------------------------------
# Master system prompt  (imported from ai.py / kept in sync)
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
# (mirrors the build_tab_prompt structure in ai.py)
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
# Prompt builder
# ---------------------------------------------------------------------------

def _build_prompt(
    chart_data: Dict[str, Any],
    tab_number: int,
    full_name: str,
    rag_context: str,
) -> str:
    """
    Compose the full user message:
      - RAG passages from classical shastras
      - Chart data as JSON
      - Current transits
      - Tab-specific task instruction
    """
    chart_json = json.dumps(chart_data, indent=2)
    task       = TAB_TASKS.get(tab_number, TAB_TASKS[1])

    rag_block = (
        f"REFERENCE TEXTS FROM CLASSICAL SHASTRA:\n{rag_context}"
        if rag_context.strip()
        else "REFERENCE TEXTS: (vector store not yet initialised — use internal knowledge)"
    )

    return f"""{rag_block}

━━━━━━━━━━━━━━━━━━━━━━

CHART DATA FOR {full_name}:
{chart_json}

Current Date: June 2026
Important Current Transits:
- Jupiter entering Cancer (exaltation) — biggest transit of 2026
- Saturn in Pisces — karmic restructuring
- Rahu in Aquarius / Ketu in Leo axis
- Mars in Aries (own sign)

━━━━━━━━━━━━━━━━━━━━━━

TASK: {task}

Be specific. Use only the chart data and reference texts provided.
State hard truths with compassion. No generic content.
"""

# ---------------------------------------------------------------------------
# Public streaming function
# ---------------------------------------------------------------------------

async def stream_with_rag(
    chart_data: dict,
    tab_number: int,
    full_name: str,
    tab_prompt: str
):
    load_dotenv(override=True)
    """
    Main RAG + LLM streaming pipeline.

    Steps:
      1. Retrieve relevant book passages for this tab via ChromaDB.
      2. Build the enriched prompt (shastra context + chart + task).
      3. Stream response tokens from Groq llama-3.3-70b-versatile.

    Args:
        chart_data:  Full chart dict from the ephemeris service.
        tab_number:  Report tab (1–8).
        full_name:   Subject's full name (for prompt personalisation).
        tab_prompt:  Complete user prompt (without RAG context) to wrap.

    Yields:
        str — one streamed token at a time.
    """
    # ── Step 1: RAG retrieval ──────────────────────────────────────────────
    logger.info(f"[pipeline] Retrieving RAG context for tab {tab_number}...")
    try:
        rag_context = get_context_for_tab(tab_number, chart_data)
        logger.info(f"[pipeline] RAG context length: {len(rag_context)} chars")
    except Exception as rag_err:
        # Non-fatal — proceed without RAG context if vector store isn't ready
        logger.warning(f"[pipeline] RAG retrieval failed: {rag_err}. Continuing without context.")
        rag_context = ""

    # ── Step 2: Build prompt ───────────────────────────────────────────────
    rag_block = (
        f"REFERENCE TEXTS FROM CLASSICAL SHASTRA:\n{rag_context}"
        if rag_context.strip()
        else "REFERENCE TEXTS: (vector store not yet initialised — use internal knowledge)"
    )
    user_prompt = f"{rag_block}\n\n━━━━━━━━━━━━━━━━━━━━━━\n\n{tab_prompt}"

    # ── Step 3: Stream from LLM Provider ───────────────────────────────────
    groq_model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    deepseek_api_key = os.getenv("DEEPSEEK_API_KEY", "")
    
    # Determine provider
    is_deepseek_official = groq_model in ["deepseek-chat", "deepseek-reasoner"] or os.getenv("LLM_PROVIDER") == "deepseek"
    
    logger.info(f"[pipeline] Streaming using model: {groq_model} (DeepSeek Official: {is_deepseek_official})")
    try:
        if is_deepseek_official:
            from openai import OpenAI
            ds_client = OpenAI(api_key=deepseek_api_key, base_url="https://api.deepseek.com")
            stream = ds_client.chat.completions.create(
                model=groq_model if groq_model in ["deepseek-chat", "deepseek-reasoner"] else "deepseek-chat",
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user",   "content": user_prompt},
                ],
                temperature=0.3,
                max_tokens=4000,
                stream=True,
            )
        else:
            groq_api_key = os.getenv("GROQ_API_KEY", "")
            groq_client = Groq(api_key=groq_api_key)
            stream = groq_client.chat.completions.create(
                model=groq_model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user",   "content": user_prompt},
                ],
                temperature=0.3,
                max_tokens=5000,
                stream=True,
            )

        buffer = ""
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
                        buffer = parts[1]
                        in_think = True
                    else:
                        if len(buffer) > 7:
                            yield buffer[:-7]
                            buffer = buffer[-7:]
                        break
                else:
                    if "</think>" in buffer:
                        parts = buffer.split("</think>", 1)
                        buffer = parts[1]
                        in_think = False
                    else:
                        if len(buffer) > 8:
                            buffer = buffer[-8:]
                        break

        if not in_think and buffer:
            # avoid printing partial tags if the stream cuts off
            if not buffer.startswith("<thi"):
                yield buffer

    except Exception as e:
        logger.critical(f"[pipeline] Groq stream failed: {e}")
        yield f"\n[System Error: AI generation failed. Details: {e}]"
