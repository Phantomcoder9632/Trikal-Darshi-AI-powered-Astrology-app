"""
routes/progress.py

Progress endpoint for background tab pre-generation.

GET /progress/{chart_id}

Returns how many of the 10 tabs have been fully generated and saved
to the interpretations table in PostgreSQL. The frontend polls this
endpoint every few seconds to show a "X of 10 sections ready" badge.
"""

import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any
import asyncpg

from db.database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Progress"])

TOTAL_TABS = 10


@router.get("/progress/{chart_id}", response_model=Dict[str, Any])
async def get_generation_progress(
    chart_id: uuid.UUID,
    conn: asyncpg.Connection = Depends(get_db),
):
    """
    GET /progress/{chart_id}

    Returns the pre-generation status for a chart's 10 interpretation tabs.

    Response:
        {
            "chart_id": "...",
            "total_tabs": 10,
            "completed_tabs": [1, 3, 4],
            "pending_tabs": [2, 5, 6, 7, 8, 9, 10],
            "percent": 30,
            "is_complete": false
        }
    """
    # Verify chart exists
    chart_exists = await conn.fetchval(
        "SELECT 1 FROM charts WHERE id = $1",
        chart_id,
    )
    if not chart_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chart with ID {chart_id} not found.",
        )

    # Fetch all tab numbers that have been fully generated
    rows = await conn.fetch(
        """
        SELECT tab_number
        FROM interpretations
        WHERE chart_id = $1
          AND LENGTH(TRIM(content)) >= 1000
        ORDER BY tab_number ASC
        """,
        chart_id,
    )

    completed_tabs = [row["tab_number"] for row in rows]
    pending_tabs = [t for t in range(1, TOTAL_TABS + 1) if t not in completed_tabs]
    percent = round((len(completed_tabs) / TOTAL_TABS) * 100)

    return {
        "chart_id": str(chart_id),
        "total_tabs": TOTAL_TABS,
        "completed_tabs": completed_tabs,
        "pending_tabs": pending_tabs,
        "percent": percent,
        "is_complete": len(completed_tabs) == TOTAL_TABS,
    }
