import os
import logging
from rag.pipeline import stream_with_rag
from services.ai_prompts import build_tab_prompt

logger = logging.getLogger(__name__)

async def stream_interpretation(
    chart_data: dict,
    tab_number: int,
    full_name: str,
    language: str = "english",
    model_info: dict = None
):
    logger.info(
        f"Tab {tab_number} — Gemini + RAG for {full_name} (language: {language})"
    )
    tab_prompt = build_tab_prompt(
        chart_data, tab_number, full_name, language=language
    )
    async for chunk in stream_with_rag(
        chart_data=chart_data,
        tab_number=tab_number,
        full_name=full_name,
        tab_prompt=tab_prompt,
        language=language,
        model_info=model_info
    ):
        yield chunk
