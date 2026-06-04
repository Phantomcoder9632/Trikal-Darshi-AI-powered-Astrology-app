import uuid
import logging
import json
from typing import AsyncGenerator
from fastapi import APIRouter, Depends, HTTPException, status, Body, BackgroundTasks
from fastapi.responses import StreamingResponse, JSONResponse
import asyncpg

from db.database import get_db
from services.ai import stream_interpretation
from services.cache import cache_interpretation, get_cached_interpretation

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Interpretations"])

# Exact Tab Mapping as specified
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

@router.post("/interpret/{chart_id}/{tab_number}")
async def generate_interpretation_stream(
    chart_id: uuid.UUID,
    tab_number: int,
    background_tasks: BackgroundTasks,
    language: str = Body("english", embed=True),
    conn: asyncpg.Connection = Depends(get_db)
):
    """
    POST /interpret/{chart_id}/{tab_number}
    Real-time streaming interpretation for Vedic astrology tabs (1-8).
    Checks DB and cache first (yielding immediately), falls back to streaming
    Groq/Qwen3-32b (primary) or OpenRouter/Gemma-4-31b (fallback),
    and automatically saves + caches the result on stream completion.
    """
    if tab_number not in TAB_MAP:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid tab number {tab_number}. Must be between 1 and 10."
        )

    tab_name = TAB_MAP[tab_number]
    chart_id_str = str(chart_id)

    # ── a. Check interpretations table (Already generated?) ────────────────
    row = await conn.fetchrow(
        "SELECT content FROM interpretations WHERE chart_id = $1 AND tab_number = $2 AND language = $3",
        chart_id,
        tab_number,
        language
    )
    if row:
        logger.info(f"Interpretation found in PostgreSQL: chart={chart_id_str} Tab={tab_number} Language={language}")
        content = row["content"]
        
        async def yield_stored():
            yield content
            
        return StreamingResponse(yield_stored(), media_type="text/plain")

    # ── b. Check Redis cache ────────────────────────────────────────────────
    cached_text = await get_cached_interpretation(chart_id_str, tab_number, language)
    if cached_text:
        logger.info(f"Interpretation cache hit: chart={chart_id_str} Tab={tab_number} Language={language}")
        
        async def yield_cached():
            yield cached_text
            
        return StreamingResponse(yield_cached(), media_type="text/plain")

    # ── Check if translation is pending ─────────────────────────────────────
    if language in ["hindi", "bengali"]:
        # If we reach here, it means cache miss and DB miss for translation.
        # Check if we have the English interpretation to translate from.
        english_row = await conn.fetchrow(
            "SELECT content FROM interpretations WHERE chart_id = $1 AND tab_number = $2 AND language = 'english'",
            chart_id,
            tab_number
        )
        if english_row and english_row["content"]:
            # Trigger background translation
            from services.background_generator import translate_and_save
            background_tasks.add_task(
                translate_and_save,
                chart_id=chart_id,
                tab_number=tab_number,
                english_text=english_row["content"]
            )
            logger.info(f"Triggered background translation to {language} for chart={chart_id_str} Tab={tab_number}")
        else:
            logger.info(f"Translation pending but English not found yet for chart={chart_id_str} Tab={tab_number} Language={language}")
        
        return JSONResponse(content={"status": "pending"})

    # ── c. Fetch complete chart from PostgreSQL ─────────────────────────────
    chart_row = await conn.fetchrow(
        """
        SELECT full_name, date_of_birth, time_of_birth, city_of_birth, current_city, raw_chart_data 
        FROM charts 
        WHERE id = $1
        """,
        chart_id
    )
    if not chart_row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Parent birth chart with ID {chart_id} not found."
        )

    raw_chart_str = chart_row["raw_chart_data"]
    if not raw_chart_str:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Birth chart calculated data is empty."
        )

    chart_data = json.loads(raw_chart_str) if isinstance(raw_chart_str, str) else raw_chart_str
    full_name = chart_row["full_name"]

    # Inject database fields if missing from raw_chart_data to guarantee the AI gets full birth parameters
    chart_data["chart_id"] = str(chart_id)
    chart_data["full_name"] = chart_data.get("full_name") or full_name
    chart_data["date_of_birth"] = chart_data.get("date_of_birth") or (str(chart_row["date_of_birth"]) if chart_row["date_of_birth"] else None)
    chart_data["time_of_birth"] = chart_data.get("time_of_birth") or (str(chart_row["time_of_birth"]) if chart_row["time_of_birth"] else None)
    chart_data["city_of_birth"] = chart_data.get("city_of_birth") or chart_row["city_of_birth"]
    chart_data["current_city"] = chart_data.get("current_city") or chart_row["current_city"]

    # ── d & e. Call LLM stream & yield chunks ─────────────────────────────────
    async def ai_stream_generator() -> AsyncGenerator[str, None]:
        logger.info(f"Starting AI interpretation stream: chart={chart_id_str} Tab={tab_number}")
        accumulated_text = ""
        
        try:
            async for token in stream_interpretation(
                chart_data=chart_data,
                tab_number=tab_number,
                full_name=full_name
            ):
                accumulated_text += token
                yield token
        except Exception as e:
            logger.error(f"Error during AI interpretation stream: {e}")
            yield f"\n[AI Streaming Error: {str(e)}]"
            return

        # ── f & g. Save and cache on completion (ONLY if not an error message) ──
        # Check if the generated content looks like an error/fallback warning
        # Also reject suspiciously short content — a proper tab analysis is 2000+ chars.
        # If the model hit a token limit or the stream broke, we must NOT cache the
        # truncated output, otherwise it will be served forever on subsequent requests.
        MIN_CONTENT_LENGTH = 1000  # chars — anything under this is clearly truncated

        is_error = (
            "⚠️" in accumulated_text 
            or "[System Error:" in accumulated_text 
            or "[AI Streaming Error" in accumulated_text
            or not accumulated_text.strip()
            or len(accumulated_text.strip()) < MIN_CONTENT_LENGTH
        )
        
        if is_error:
            logger.warning(
                f"Stream finished with error/empty content. NOT saving to DB/cache: chart={chart_id_str} Tab={tab_number}"
            )
            return

        logger.info(f"Stream complete. Saving to PostgreSQL and Redis: chart={chart_id_str} Tab={tab_number}")
        
        try:
            # Save to PostgreSQL
            new_id = uuid.uuid4()
            # We use an independent database connection pool acquire for saving on-completion
            from db.database import get_db_pool
            pool = await get_db_pool()
            async with pool.acquire() as save_conn:
                await save_conn.execute(
                    """
                    INSERT INTO interpretations (id, chart_id, tab_number, tab_name, content, model_used, language)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT (chart_id, tab_number, language)
                    DO UPDATE SET
                        content = EXCLUDED.content,
                        generated_at = NOW()
                    """,
                    new_id,
                    chart_id,
                    tab_number,
                    tab_name,
                    accumulated_text,
                    "google/gemma-4-31b-it:free",
                    language
                )
            
            # Cache in Redis
            await cache_interpretation(chart_id_str, tab_number, accumulated_text, language=language)
            
        except Exception as save_err:
            logger.error(f"Failed to save final stream output: {save_err}")

    return StreamingResponse(ai_stream_generator(), media_type="text/plain")
