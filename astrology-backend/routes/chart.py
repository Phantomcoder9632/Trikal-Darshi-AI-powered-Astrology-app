import uuid
import logging
import asyncio
import json
from datetime import date, time, datetime
from typing import Dict, Any
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
import asyncpg

from db.database import get_db
from services.hybrid import get_complete_chart
from services.numerology import get_numerology
from services.cache import cache_chart, get_cached_chart, generate_chart_cache_key

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Charts"])

class ChartGenerateRequest(BaseModel):
    full_name: str
    date_of_birth: str  # YYYY-MM-DD
    time_of_birth: str  # HH:MM
    city_of_birth: str
    current_city: str
    birth_time_confidence: str  # exact | approximate | unknown

@router.post("/generate", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def generate_chart(
    payload: ChartGenerateRequest,
    conn: asyncpg.Connection = Depends(get_db)
):
    """
    POST /chart/generate
    Executes geocoding, coordinate cache checks, hybrid calculations, numerology additions,
    PostgreSQL saves, and Redis caches, returning the completed birth chart.
    """
    logger.info(f"Generating complete chart for {payload.full_name}")

    # ── a. Geocode city_of_birth ────────────────────────────────────────────
    # Wait 1s according to Nominatim rules
    await asyncio.sleep(1.0)
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                "https://nominatim.openstreetmap.org/search",
                params={"q": payload.city_of_birth, "format": "json", "limit": 1},
                headers={"User-Agent": "astrology-app/1.0"}
            )
            response.raise_for_status()
            geo_data = response.json()
    except Exception as e:
        logger.error(f"Failed to geocode city of birth: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Geocoding service failed during chart birth place lookup."
        )

    if not geo_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Could not resolve birth city coordinates: {payload.city_of_birth}"
        )

    lat = float(geo_data[0]["lat"])
    lng = float(geo_data[0]["lon"])

    # ── b. Build cache key: "chart:{dob}:{tob}:{lat}:{lng}" ──────────────────
    dob_str = payload.date_of_birth.strip()
    tob_str = payload.time_of_birth.strip()
    
    # We round lat/lng to 4 decimal places for key consistency
    cache_key = generate_chart_cache_key(dob_str, tob_str, round(lat, 4), round(lng, 4))

    # ── c. Check Redis Cache for hit ────────────────────────────────────────
    cached_chart = await get_cached_chart(cache_key)
    if cached_chart:
        logger.info(f"Redis cache hit under coordinate key: {cache_key}")
        # Directly return cached complete chart
        return cached_chart

    # ── d. Call hybrid.get_complete_chart() ────────────────────────────────
    user_input = {
        "full_name": payload.full_name,
        "date_of_birth": dob_str,
        "time_of_birth": tob_str,
        "city_of_birth": payload.city_of_birth,
        "lat": lat,
        "lng": lng,
        "birth_time_confidence": payload.birth_time_confidence,
        "timezone_offset": 5.5  # Standard default timezone offset
    }

    try:
        chart_data = await get_complete_chart(user_input)
    except Exception as e:
        logger.exception("Hybrid calculation engine failed.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Astrological calculation failed: {str(e)}"
        )

    # ── e. Calculate numerology locally ─────────────────────────────────────
    parsed_dob = date.fromisoformat(dob_str)
    numerology_data = get_numerology(parsed_dob, payload.full_name)

    # ── f. Merge everything into final chart object ────────────────────────
    # Assign and overwrite local numerology to guarantee complete Vedic matrix
    chart_data["numerology"] = numerology_data
    
    # Add key metadata properties
    new_id = uuid.uuid4()
    chart_data["chart_id"] = str(new_id)
    chart_data["full_name"] = payload.full_name
    chart_data["date_of_birth"] = payload.date_of_birth
    chart_data["time_of_birth"] = payload.time_of_birth
    chart_data["city_of_birth"] = payload.city_of_birth
    chart_data["current_city"] = payload.current_city

    # ── g. Save to PostgreSQL charts table ────────────────────────────────────
    parsed_tob = time.fromisoformat(tob_str)
    created_at = datetime.now()

    try:
        await conn.execute(
            """
            INSERT INTO charts (
                id, full_name, date_of_birth, time_of_birth, city_of_birth, current_city,
                latitude, longitude, timezone, birth_time_confidence, ayanamsha,
                data_source, raw_chart_data, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            """,
            new_id,
            payload.full_name,
            parsed_dob,
            parsed_tob,
            payload.city_of_birth,
            payload.current_city,
            lat,
            lng,
            "Asia/Kolkata",  # Default timezone
            payload.birth_time_confidence,
            "LAHIRI",
            chart_data.get("source", "astrologyapi"),
            json.dumps(chart_data, default=str),
            created_at
        )
    except Exception as e:
        logger.error(f"Failed to persist chart to PostgreSQL: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to persist calculations to PostgreSQL."
        )

    # ── h. Cache in Redis for 30 days (2592000s) ─────────────────────────────
    await cache_chart(cache_key, chart_data)

    # ── i. Return complete chart JSON with chart_id ──────────────────────────
    return chart_data

@router.get("/{chart_id}", response_model=Dict[str, Any])
async def get_chart(
    chart_id: uuid.UUID,
    conn: asyncpg.Connection = Depends(get_db)
):
    """
    GET /chart/{chart_id}
    Retrieves full birth chart JSON by ID from PostgreSQL.
    """
    logger.info(f"Retrieving chart by ID: {chart_id}")
    
    row = await conn.fetchrow(
        """
        SELECT full_name, date_of_birth, time_of_birth, city_of_birth, current_city, raw_chart_data 
        FROM charts 
        WHERE id = $1
        """,
        chart_id
    )
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chart with ID {chart_id} not found."
        )

    raw_data = row["raw_chart_data"]
    if isinstance(raw_data, str):
        chart_data = json.loads(raw_data)
    else:
        chart_data = dict(raw_data) if raw_data else {}

    # Inject database fields if missing from raw_chart_data
    chart_data["chart_id"] = str(chart_id)
    chart_data["full_name"] = chart_data.get("full_name") or row["full_name"]
    chart_data["date_of_birth"] = chart_data.get("date_of_birth") or (str(row["date_of_birth"]) if row["date_of_birth"] else None)
    chart_data["time_of_birth"] = chart_data.get("time_of_birth") or (str(row["time_of_birth"]) if row["time_of_birth"] else None)
    chart_data["city_of_birth"] = chart_data.get("city_of_birth") or row["city_of_birth"]
    chart_data["current_city"] = chart_data.get("current_city") or row["current_city"]

    return chart_data
