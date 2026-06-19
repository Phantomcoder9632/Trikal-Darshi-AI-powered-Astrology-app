from typing import List, Optional
import json
import logging
from fastapi import APIRouter, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import uuid

from db.database import get_db_pool
from rag.pipeline import stream_chat_response

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Chatbot"])

# Stage constants
STAGE_NO_CHART = "no_chart"          # New user — nothing in DB
STAGE_CHART_ONLY = "chart_only"      # Chart submitted, predictions not yet generated
STAGE_FULL = "full"                  # Full interpretations available

class ChatMessage(BaseModel):
    sender: str
    text: str

class ChatRequest(BaseModel):
    message: str
    chart_id: Optional[str] = None
    history: List[ChatMessage] = []
    user_msg_id: Optional[str] = None
    ai_msg_id: Optional[str] = None

@router.post("/chat")
async def chat_endpoint(request: ChatRequest):
    chart_data = None
    interpretations = []
    stage = STAGE_NO_CHART

    if request.chart_id:
        try:
            chart_uuid = uuid.UUID(request.chart_id)
            pool = await get_db_pool()
            async with pool.acquire() as conn:
                # ── 1. Fetch chart row ────────────────────────────────────────
                chart_row = await conn.fetchrow(
                    """SELECT full_name, date_of_birth, time_of_birth,
                              city_of_birth, current_city, raw_chart_data
                       FROM charts WHERE id = $1""",
                    chart_uuid
                )

                if chart_row:
                    stage = STAGE_CHART_ONLY  # we at least have a chart

                    # Build chart_data dict from raw JSONB + basic fields
                    raw_str = chart_row["raw_chart_data"]
                    if raw_str:
                        chart_data = json.loads(raw_str) if isinstance(raw_str, str) else dict(raw_str)
                    else:
                        chart_data = {}

                    # Always ensure the basics are present
                    chart_data["full_name"] = (
                        chart_data.get("full_name") or chart_row["full_name"]
                    )
                    chart_data["date_of_birth"] = (
                        chart_data.get("date_of_birth")
                        or (str(chart_row["date_of_birth"]) if chart_row["date_of_birth"] else None)
                    )
                    chart_data["city_of_birth"] = (
                        chart_data.get("city_of_birth") or chart_row["city_of_birth"]
                    )
                    chart_data["current_city"] = (
                        chart_data.get("current_city") or chart_row["current_city"]
                    )

                # ── 2. Fetch all saved interpretations ───────────────────────
                interp_rows = await conn.fetch(
                    """SELECT tab_number, tab_name, content
                       FROM interpretations
                       WHERE chart_id = $1
                       ORDER BY tab_number ASC""",
                    chart_uuid
                )

                if interp_rows:
                    stage = STAGE_FULL
                    interpretations = [
                        {
                            "tab_number": r["tab_number"],
                            "tab_name": r["tab_name"],
                            "content": r["content"]
                        }
                        for r in interp_rows
                    ]
                    logger.info(
                        f"[chat] Loaded {len(interpretations)} interpretation(s) for chart {chart_uuid}"
                    )
                else:
                    logger.info(
                        f"[chat] No interpretations yet for chart {chart_uuid} — using chart_only stage"
                    )

        except Exception as e:
            logger.warning(f"[chat] Failed to load data for chat: {e}")

    history_dicts = [{"sender": msg.sender, "text": msg.text} for msg in request.history]

    async def stream_generator():
        full_response = ""
        try:
            async for chunk in stream_chat_response(
                message=request.message,
                history=history_dicts,
                chart_data=chart_data,
                interpretations=interpretations,
                stage=stage
            ):
                full_response += chunk
                yield chunk
            
            # Save to DB after streaming completes
            if request.chart_id and request.user_msg_id and request.ai_msg_id:
                try:
                    c_id = uuid.UUID(request.chart_id)
                    pool = await get_db_pool()
                    async with pool.acquire() as conn:
                        await conn.execute(
                            "INSERT INTO chat_messages (id, chart_id, sender, text) VALUES ($1, $2, $3, $4)",
                            request.user_msg_id, c_id, "user", request.message
                        )
                        await conn.execute(
                            "INSERT INTO chat_messages (id, chart_id, sender, text) VALUES ($1, $2, $3, $4)",
                            request.ai_msg_id, c_id, "ai", full_response
                        )
                except Exception as e:
                    logger.error(f"[chat] Failed to save chat messages to db: {e}")

        except Exception as e:
            logger.error(f"[chat] Stream error: {e}")
            yield f"\n[AI Streaming Error: {str(e)}]"

    return StreamingResponse(stream_generator(), media_type="text/plain")

@router.get("/chat/history/{chart_id}")
async def get_chat_history(chart_id: str):
    try:
        c_id = uuid.UUID(chart_id)
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT id, sender, text, created_at FROM chat_messages WHERE chart_id = $1 ORDER BY created_at ASC",
                c_id
            )
            return [
                {
                    "id": r["id"],
                    "sender": r["sender"],
                    "text": r["text"],
                    "time": r["created_at"].strftime("%I:%M %p")
                } for r in rows
            ]
    except Exception as e:
        logger.error(f"[chat] Failed to fetch history: {e}")
        return []
