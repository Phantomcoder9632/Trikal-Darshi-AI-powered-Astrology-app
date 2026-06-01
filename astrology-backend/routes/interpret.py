import uuid
import logging
import json
from typing import AsyncGenerator
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
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
    8: "Remedies Tripath System"
}

@router.post("/interpret/{chart_id}/{tab_number}")
async def generate_interpretation_stream(
    chart_id: uuid.UUID,
    tab_number: int,
    conn: asyncpg.Connection = Depends(get_db)
):
    """
    POST /interpret/{chart_id}/{tab_number}
    Real-time streaming interpretation for Vedic astrology tabs (1-8).
    Checks DB and cache first (yielding immediately), falls back to streaming DeepSeek R1,
    and automatically saves + caches the result on stream completion.
    """
    if tab_number not in TAB_MAP:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid tab number {tab_number}. Must be between 1 and 8."
        )

    tab_name = TAB_MAP[tab_number]
    chart_id_str = str(chart_id)

    # ── a. Check interpretations table (Already generated?) ────────────────
    row = await conn.fetchrow(
        "SELECT content FROM interpretations WHERE chart_id = $1 AND tab_number = $2",
        chart_id,
        tab_number
    )
    if row:
        logger.info(f"Interpretation found in PostgreSQL: chart={chart_id_str} Tab={tab_number}")
        content = row["content"]
        
        async def yield_stored():
            yield content
            
        return StreamingResponse(yield_stored(), media_type="text/plain")

    # ── b. Check Redis cache ────────────────────────────────────────────────
    cached_text = await get_cached_interpretation(chart_id_str, tab_number)
    if cached_text:
        logger.info(f"Interpretation cache hit: chart={chart_id_str} Tab={tab_number}")
        
        async def yield_cached():
            yield cached_text
            
        return StreamingResponse(yield_cached(), media_type="text/plain")

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

    # ── d & e. Call DeepSeek R1 stream & yield chunks ────────────────────────
    async def ai_stream_generator() -> AsyncGenerator[str, None]:
        logger.info(f"Starting DeepSeek R1 interpretation stream: chart={chart_id_str} Tab={tab_number}")
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

        # ── f & g. Save and cache on completion ─────────────────────────────
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
                    INSERT INTO interpretations (id, chart_id, tab_number, tab_name, content, model_used)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    ON CONFLICT (chart_id, tab_number)
                    DO UPDATE SET
                        content = EXCLUDED.content,
                        generated_at = NOW()
                    """,
                    new_id,
                    chart_id,
                    tab_number,
                    tab_name,
                    accumulated_text,
                    "deepseek-reasoner"
                )
            
            # Cache in Redis
            await cache_interpretation(chart_id_str, tab_number, accumulated_text)
            
        except Exception as save_err:
            logger.error(f"Failed to save final stream output: {save_err}")

    return StreamingResponse(ai_stream_generator(), media_type="text/plain")
