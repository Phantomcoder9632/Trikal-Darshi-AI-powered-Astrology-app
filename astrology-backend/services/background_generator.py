"""
services/background_generator.py

Background pre-generation engine for all 10 interpretation tabs.

When a new chart is created (or fetched for the first time), this service
silently generates ALL 10 tab interpretations in the background using the
full RAG + LLM pipeline — without the user having to click each tab.

Key design decisions:
  - asyncio.Semaphore(2): at most 2 concurrent LLM calls at a time to avoid
    API rate limits while still being significantly faster than sequential.
  - Each tab is generated using the same stream_with_rag() path used by the
    live /interpret endpoint — RAG context is fully included.
  - Uses a HIGHER RAG context limit (4000 chars) and MORE chunks (k=5)
    compared to the live-stream path (1500 chars, k=3), since background
    jobs have no streaming timeout pressure.
  - ON CONFLICT DO UPDATE: safe to run multiple times; newer content replaces
    old. Duplicate submissions (same chart ID) are handled gracefully.
  - Each tab checks the DB first — if already generated, skips silently.
"""

from __future__ import annotations

import asyncio
import logging
import uuid
import json
import os
from typing import Optional

from services.ai_prompts import build_tab_prompt
from rag.retriever import get_context_for_tab
from rag.pipeline import stream_with_rag
from db.database import get_db_pool
from services.cache import cache_interpretation
from services.translator import translate_content

logger = logging.getLogger(__name__)

# Tab number → display name (mirrors interpret.py TAB_MAP)
TAB_MAP = {
    1: "Lagna & Soul Blueprint",
    2: "Lal Kitab Analysis",
    3: "Numerology Matrix",
    4: "Career & Dashamsha D10",
    5: "Wealth & Abundance",
    6: "Love Marriage & Navamsha D9",
    7: "Health & Vitality",
    8: "Remedies Tripath System",
    9: "Progeny Lineage & Saptamsha D7",
    10: "Gochar Current Transits",
}

# Max concurrency: 2 tabs at a time to avoid LLM rate-limit hammering
_SEMAPHORE_LIMIT = 2

# RAG context character cap for background mode (more than live-stream's 1500)
_BG_RAG_CONTEXT_LIMIT = 4000

# Number of RAG chunks to fetch per tab in background mode (more than live's 3)
_BG_RAG_K = 5

# Minimum valid content length — anything shorter is a failed/truncated generation
_MIN_CONTENT_LENGTH = 1000


async def _generate_single_tab(
    semaphore: asyncio.Semaphore,
    chart_id: uuid.UUID,
    chart_data: dict,
    full_name: str,
    tab_number: int,
) -> bool:
    """
    Generate the interpretation for a single tab, save to DB + Redis.

    Returns True on success, False on failure or skip.
    """
    chart_id_str = str(chart_id)
    tab_name = TAB_MAP.get(tab_number, f"Tab {tab_number}")

    async with semaphore:
        logger.info(
            f"[bg_gen] Starting Tab {tab_number} ({tab_name}) for chart {chart_id_str}"
        )

        # ── a. Skip if already in DB (or Translate if English exists but translations are missing) ──
        try:
            pool = await get_db_pool()
            async with pool.acquire() as check_conn:
                existing_records = await check_conn.fetch(
                    "SELECT language, content FROM interpretations "
                    "WHERE chart_id = $1 AND tab_number = $2",
                    chart_id,
                    tab_number,
                )
                
                existing_langs = {r["language"]: r["content"] for r in existing_records}
                english_text = existing_langs.get("english")
                
                has_english = english_text and len(english_text.strip()) >= _MIN_CONTENT_LENGTH
                has_hindi = "hindi" in existing_langs and len((existing_langs["hindi"] or "").strip()) >= _MIN_CONTENT_LENGTH
                has_bengali = "bengali" in existing_langs and len((existing_langs["bengali"] or "").strip()) >= _MIN_CONTENT_LENGTH
                
                if has_english and has_hindi and has_bengali:
                    logger.info(
                        f"[bg_gen] Tab {tab_number} (all languages) already in DB for chart "
                        f"{chart_id_str} — skipping."
                    )
                    return True
                
                if has_english:
                    logger.info(
                        f"[bg_gen] English exists for Tab {tab_number} but missing translations. Translating..."
                    )
                    # Translate missing ones
                    for lang in ["hindi", "bengali"]:
                        is_missing = lang not in existing_langs or len((existing_langs[lang] or "").strip()) < _MIN_CONTENT_LENGTH
                        if is_missing:
                            try:
                                logger.info(f"[bg_gen] Translating Tab {tab_number} to {lang} from existing English...")
                                translated_text = await translate_content(english_text, lang)
                                
                                new_id = uuid.uuid4()
                                await check_conn.execute(
                                    """
                                    INSERT INTO interpretations
                                        (id, chart_id, tab_number, tab_name, content, model_used, language)
                                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                                    ON CONFLICT (chart_id, tab_number, language)
                                    DO UPDATE SET
                                        content      = EXCLUDED.content,
                                        generated_at = NOW()
                                    """,
                                    new_id,
                                    chart_id,
                                    tab_number,
                                    tab_name,
                                    translated_text,
                                    "translation/gemini-2.5-flash",
                                    lang
                                )
                                await cache_interpretation(chart_id_str, tab_number, translated_text, language=lang)
                                logger.info(f"[bg_gen] ✓ {lang.capitalize()} translation saved for chart {chart_id_str} Tab {tab_number}")
                            except Exception as trans_err:
                                logger.error(f"[bg_gen] Failed to translate/save {lang} for Tab {tab_number}: {trans_err}")
                    return True
        except Exception as check_err:
            logger.warning(
                f"[bg_gen] DB check/translation failed for Tab {tab_number}: {check_err}. Proceeding with fresh generation."
            )

        # ── b. Build tab prompt ──────────────────────────────────────────────
        try:
            tab_prompt = build_tab_prompt(chart_data, tab_number, full_name)
        except Exception as prompt_err:
            logger.error(
                f"[bg_gen] Failed to build prompt for Tab {tab_number}: {prompt_err}"
            )
            return False

        # ── c. Run RAG + LLM — in a thread so we never block the event loop ──
        # asyncio.to_thread() offloads the entire synchronous LLM call to the
        # thread pool, keeping the event loop free for progress polling, other
        # requests, and concurrent tab generations.
        accumulated_text = ""
        try:
            accumulated_text = await asyncio.to_thread(
                _sync_collect_tab_text,
                tab_number,
                tab_prompt,
            )
        except Exception as stream_err:
            logger.error(
                f"[bg_gen] Thread error for Tab {tab_number}: {stream_err}"
            )
            return False

        # ── d. Validate content ──────────────────────────────────────────────
        is_error = (
            "⚠️" in accumulated_text
            or "[System Error:" in accumulated_text
            or "[AI Streaming Error" in accumulated_text
            or not accumulated_text.strip()
            or len(accumulated_text.strip()) < _MIN_CONTENT_LENGTH
        )

        if is_error:
            logger.warning(
                f"[bg_gen] Tab {tab_number} produced error/empty content "
                f"({len(accumulated_text)} chars) — NOT saving."
            )
            return False

        # ── e. Save to PostgreSQL ────────────────────────────────────────────
        try:
            pool = await get_db_pool()
            async with pool.acquire() as save_conn:
                new_id = uuid.uuid4()
                await save_conn.execute(
                    """
                    INSERT INTO interpretations
                        (id, chart_id, tab_number, tab_name, content, model_used)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    ON CONFLICT (chart_id, tab_number)
                    DO UPDATE SET
                        content      = EXCLUDED.content,
                        generated_at = NOW()
                    """,
                    new_id,
                    chart_id,
                    tab_number,
                    tab_name,
                    accumulated_text,
                    "background/gemini-2.5-flash",
                )
            logger.info(
                f"[bg_gen] Tab {tab_number} saved to PostgreSQL "
                f"({len(accumulated_text)} chars) for chart {chart_id_str}"
            )
        except Exception as db_err:
            logger.error(
                f"[bg_gen] DB save failed for Tab {tab_number}: {db_err}"
            )
            return False

        # ── f. Cache in Redis ────────────────────────────────────────────────
        try:
            await cache_interpretation(chart_id_str, tab_number, accumulated_text)
            logger.info(
                f"[bg_gen] Tab {tab_number} cached in Redis for chart {chart_id_str}"
            )
        except Exception as cache_err:
            # Redis failure is non-fatal — DB already has the content
            logger.warning(
                f"[bg_gen] Redis cache failed for Tab {tab_number}: {cache_err}"
            )

        # ── g. Translate and Save (Hindi & Bengali) ──────────────────────────
        await translate_and_save(chart_id, tab_number, accumulated_text)

        logger.info(
            f"[bg_gen] ✓ Tab {tab_number} ({tab_name}) complete for chart {chart_id_str}"
        )
        return True


def _sync_collect_tab_text(tab_number: int, tab_prompt: str) -> str:
    """
    Fully synchronous function that:
      1. Retrieves enhanced RAG context (k=5 chunks, 4000 char cap)
      2. Calls the LLM (Gemini primary → OpenRouter fallback cascade)
      3. Accumulates and returns all tokens as a single string

    Designed to run inside asyncio.to_thread() so it never blocks
    the FastAPI event loop. Multiple tabs can run in the thread pool
    concurrently while the event loop stays free for HTTP requests.
    """
    from rag.retriever import search_for_tab, format_rag_context
    from rag.pipeline import (
        SYSTEM_PROMPT, _stream_primary, _stream_fallback,
        _yield_tokens, FALLBACK_MODELS,
    )
    from dotenv import load_dotenv
    load_dotenv(override=True)

    # ── RAG context (enhanced: k=5, cap=4000 chars) ──────────────────────────
    rag_context = ""
    try:
        chunks = search_for_tab(tab_number, k=_BG_RAG_K)
        rag_context = format_rag_context(chunks)
        if len(rag_context) > _BG_RAG_CONTEXT_LIMIT:
            rag_context = rag_context[:_BG_RAG_CONTEXT_LIMIT] + "\n[...truncated for token limit]"
        logger.info(
            f"[bg_gen] Tab {tab_number} RAG context: {len(rag_context)} chars "
            f"from {len(chunks)} chunks"
        )
    except Exception as rag_err:
        logger.warning(f"[bg_gen] RAG retrieval failed for Tab {tab_number}: {rag_err}. Proceeding without context.")

    rag_block = (
        f"REFERENCE TEXTS FROM CLASSICAL SHASTRA:\n{rag_context}"
        if rag_context.strip()
        else "REFERENCE TEXTS: (vector store not yet initialised — use internal knowledge)"
    )
    enriched_prompt = f"{rag_block}\n\n━━━━━━━━━━━━━━━━━━━━━━\n\n{tab_prompt}"

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user",   "content": enriched_prompt},
    ]

    # ── Try primary (Gemini) ──────────────────────────────────────────────────
    try:
        stream = _stream_primary(messages)
        text = ""
        for token in _yield_tokens(stream):
            text += token
        if text:
            logger.info(f"[bg_gen] Tab {tab_number} primary model succeeded ({len(text)} chars)")
            return text
    except Exception as primary_err:
        logger.warning(
            f"[bg_gen] Primary model failed for Tab {tab_number}: {primary_err}. Trying fallbacks..."
        )

    # ── Fallback cascade (OpenRouter) ─────────────────────────────────────────
    env_model = os.getenv("OPENROUTER_MODEL", "").strip()
    fallback_models = []
    if env_model:
        fallback_models.append(env_model)
    for m in FALLBACK_MODELS:
        if m not in fallback_models:
            fallback_models.append(m)

    for fb_model in fallback_models:
        try:
            stream = _stream_fallback(messages, fb_model)
            text = ""
            for token in _yield_tokens(stream):
                text += token
            if text:
                logger.info(f"[bg_gen] Tab {tab_number} fallback {fb_model} succeeded ({len(text)} chars)")
                return text
        except Exception as fb_err:
            logger.warning(f"[bg_gen] Fallback {fb_model} failed for Tab {tab_number}: {fb_err}")

    logger.error(f"[bg_gen] All models failed for Tab {tab_number} — returning empty string.")
    return ""


async def translate_and_save(chart_id: uuid.UUID, tab_number: int, english_text: str) -> None:
    """
    Translates the generated english text into hindi and bengali,
    then saves to PostgreSQL and caches to Redis.
    """
    chart_id_str = str(chart_id)
    tab_name = TAB_MAP.get(tab_number, f"Tab {tab_number}")
    
    for lang in ["hindi", "bengali"]:
        try:
            logger.info(f"[bg_gen] Starting {lang} translation for chart {chart_id_str} Tab {tab_number}")
            translated_text = await translate_content(english_text, lang)
            
            # Save to PostgreSQL
            pool = await get_db_pool()
            async with pool.acquire() as save_conn:
                new_id = uuid.uuid4()
                await save_conn.execute(
                    """
                    INSERT INTO interpretations
                        (id, chart_id, tab_number, tab_name, content, model_used, language)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT (chart_id, tab_number, language)
                    DO UPDATE SET
                        content      = EXCLUDED.content,
                        generated_at = NOW()
                    """,
                    new_id,
                    chart_id,
                    tab_number,
                    tab_name,
                    translated_text,
                    "translation/gemini-2.5-flash",
                    lang
                )
            
            # Cache to Redis
            await cache_interpretation(chart_id_str, tab_number, translated_text, language=lang)
            logger.info(f"[bg_gen] ✓ {lang.capitalize()} translation saved for chart {chart_id_str} Tab {tab_number}")
            
        except Exception as e:
            logger.error(f"[bg_gen] Failed to translate/save {lang} for Tab {tab_number}: {e}")


async def pregenerate_all_tabs(
    chart_id: uuid.UUID,
    chart_data: dict,
    full_name: str,
) -> None:
    """
    Fire-and-forget background task: generates all 10 tab interpretations
    for a given chart using the RAG + LLM pipeline.

    Runs at most _SEMAPHORE_LIMIT (2) tabs concurrently to avoid API rate limits.
    Already-generated tabs (found in DB) are silently skipped.

    This function is designed to be called via asyncio.create_task() so it
    runs independently without blocking the chart generation response.

    Args:
        chart_id:   UUID of the chart in PostgreSQL.
        chart_data: Full chart dict (same as passed to stream_interpretation).
        full_name:  Subject's full name for prompt personalisation.
    """
    chart_id_str = str(chart_id)
    logger.info(
        f"[bg_gen] Starting pre-generation for all 10 tabs — chart {chart_id_str}"
    )

    semaphore = asyncio.Semaphore(_SEMAPHORE_LIMIT)

    tasks = [
        _generate_single_tab(
            semaphore=semaphore,
            chart_id=chart_id,
            chart_data=chart_data,
            full_name=full_name,
            tab_number=tab_num,
        )
        for tab_num in range(1, 11)
    ]

    results = await asyncio.gather(*tasks, return_exceptions=True)

    success_count = sum(
        1 for r in results if r is True
    )
    fail_count = len(results) - success_count

    logger.info(
        f"[bg_gen] Pre-generation complete for chart {chart_id_str}: "
        f"{success_count}/10 tabs succeeded, {fail_count} failed/skipped."
    )
