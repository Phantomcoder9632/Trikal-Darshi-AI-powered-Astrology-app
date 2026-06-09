import uuid
import logging
import asyncio
import json
from datetime import date, time, datetime
from typing import Dict, Any
import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel
import asyncpg

from db.database import get_db
from services.hybrid import get_complete_chart
from services.numerology import get_numerology
from services.cache import cache_chart, get_cached_chart, generate_chart_cache_key, get_redis
from services.ephemeris import compute_divisional_chart, compute_gochar_chart, ZODIAC_SIGNS
from services.background_generator import pregenerate_all_tabs, prefetch_rag_contexts

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Charts"])

@router.get("/gochar", response_model=Dict[str, Any])
async def get_gochar_chart(lat: float = 28.6139, lng: float = 77.2090):
    """
    GET /chart/gochar?lat=...&lng=...
    Returns live real-time transit (Gochar) chart computed via Swiss Ephemeris.
    """
    try:
        gochar = compute_gochar_chart(lat=lat, lng=lng)
        return gochar
    except Exception as e:
        logger.error(f"Gochar endpoint failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to compute Gochar chart: {str(e)}"
        )


async def ensure_chart_complete(
    chart_data: dict,
    conn: asyncpg.Connection,
    chart_uuid: uuid.UUID
) -> dict:
    """
    Checks if a chart has all required divisional charts.
    If any are missing (legacy charts), computes them on the fly,
    saves the updated chart to the database, and returns the complete chart.
    """
    required_keys = ["navamsha", "dashamsha", "chaturthamsa", "saptamsha", "trimsamsa", "chandra_kundali", "surya_kundali", "gochar"]
    
    # Check if any required keys are missing
    missing = [k for k in required_keys if k not in chart_data]
    
    # Check if planets contains "Ascendant" to clean it up
    natal_planets = chart_data.get("planets", [])
    has_asc_in_planets = any(p.get("name") == "Ascendant" for p in natal_planets)
    
    if not missing and not has_asc_in_planets:
        return chart_data

    logger.info(f"Chart {chart_uuid} needs update. Missing keys: {missing}, Has Ascendant in planets: {has_asc_in_planets}")
    
    # Reconstruct/Heal natal_asc if needed
    natal_asc = chart_data.get("ascendant", {})
    asc_planet = next((p for p in natal_planets if p.get("name") == "Ascendant"), None)
    if asc_planet and not (natal_asc.get("full_degree") or natal_asc.get("fullDegree")):
        natal_asc = {
            "sign": asc_planet.get("sign"),
            "degree": asc_planet.get("normDegree"),
            "full_degree": asc_planet.get("fullDegree"),
            "fullDegree": asc_planet.get("fullDegree"),
            "nakshatra": asc_planet.get("nakshatra"),
            "nakshatra_lord": asc_planet.get("nakshatraLord"),
            "nakshatra_pada": asc_planet.get("nakshatra_pad"),
        }
        chart_data["ascendant"] = natal_asc

    # Filter out Ascendant from planets and compute Whole-Sign houses
    clean_planets = []
    asc_sign = natal_asc.get("sign")
    if asc_sign in ZODIAC_SIGNS:
        asc_sign_idx = ZODIAC_SIGNS.index(asc_sign)
        asc_sign_num = asc_sign_idx + 1
        for p in natal_planets:
            if p.get("name") == "Ascendant":
                continue
            p_sign = p.get("sign")
            if p_sign in ZODIAC_SIGNS:
                p_sign_idx = ZODIAC_SIGNS.index(p_sign)
                p_sign_num = p_sign_idx + 1
                whole_sign_house = ((p_sign_num - asc_sign_num + 12) % 12) + 1
                p["house"] = whole_sign_house
            clean_planets.append(p)
    else:
        clean_planets = [p for p in natal_planets if p.get("name") != "Ascendant"]
    
    # Extract coordinates
    lat = chart_data.get("lat") or chart_data.get("latitude") or 28.6139
    lng = chart_data.get("lng") or chart_data.get("longitude") or 77.2090
    lat, lng = float(lat), float(lng)

    # Compute missing charts
    if "navamsha" in missing or not chart_data.get("navamsha"):
        chart_data["navamsha"] = compute_divisional_chart(clean_planets, natal_asc, "D9")
    if "dashamsha" in missing or not chart_data.get("dashamsha"):
        chart_data["dashamsha"] = compute_divisional_chart(clean_planets, natal_asc, "D10")
    if "chaturthamsa" in missing or not chart_data.get("chaturthamsa"):
        chart_data["chaturthamsa"] = compute_divisional_chart(clean_planets, natal_asc, "D4")
    if "saptamsha" in missing or not chart_data.get("saptamsha"):
        chart_data["saptamsha"] = compute_divisional_chart(clean_planets, natal_asc, "D7")
    if "trimsamsa" in missing or not chart_data.get("trimsamsa"):
        chart_data["trimsamsa"] = compute_divisional_chart(clean_planets, natal_asc, "D30")
    if "chandra_kundali" in missing or not chart_data.get("chandra_kundali"):
        chart_data["chandra_kundali"] = compute_divisional_chart(clean_planets, natal_asc, "chandra")
    if "surya_kundali" in missing or not chart_data.get("surya_kundali"):
        chart_data["surya_kundali"] = compute_divisional_chart(clean_planets, natal_asc, "surya")
    if "gochar" in missing or not chart_data.get("gochar"):
        chart_data["gochar"] = compute_gochar_chart(lat, lng)

    # Clean up planets array in chart_data
    chart_data["planets"] = clean_planets

    # Update PostgreSQL with the complete chart data
    try:
        await conn.execute(
            "UPDATE charts SET raw_chart_data = $1 WHERE id = $2",
            json.dumps(chart_data, default=str),
            chart_uuid
        )
        logger.info(f"Updated PostgreSQL chart record {chart_uuid} with missing divisional charts.")
    except Exception as db_err:
        logger.error(f"Failed to update PostgreSQL chart {chart_uuid}: {db_err}")

    # Invalidate stale interpretations that were generated without divisional chart data.
    # These need to be regenerated so the AI can reference the now-complete charts.
    try:
        deleted_count = await conn.execute(
            "DELETE FROM interpretations WHERE chart_id = $1",
            chart_uuid
        )
        logger.info(f"Invalidated stale interpretations for chart {chart_uuid}: {deleted_count}")
        
        # Also clear Redis interpretation cache for all tabs
        try:
            redis_client = await get_redis()
            chart_id_str = str(chart_uuid)
            for tab_num in range(1, 11):
                for lang in ("english", "hindi", "bengali"):
                    await redis_client.delete(f"interpretation:{chart_id_str}:{tab_num}:{lang}")
            logger.info(f"Cleared Redis interpretation cache for chart {chart_uuid} (all languages)")
        except Exception as redis_err:
            logger.error(f"Failed to clear Redis interpretation cache: {redis_err}")
    except Exception as interp_err:
        logger.error(f"Failed to invalidate stale interpretations for chart {chart_uuid}: {interp_err}")

    return chart_data


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
    background_tasks: BackgroundTasks,
    conn: asyncpg.Connection = Depends(get_db)
):
    """
    POST /chart/generate
    Executes geocoding, coordinate cache checks, hybrid calculations, numerology additions,
    PostgreSQL saves, and Redis caches, returning the completed birth chart.
    """
    logger.info(f"Generating complete chart for {payload.full_name}")

    # ── a. Geocode city_of_birth (using cached helper) ──────────────────────
    try:
        from routes.geocode import geocode_city_cached
        geo_res = await geocode_city_cached(payload.city_of_birth)
        lat = geo_res["lat"]
        lng = geo_res["lng"]
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Could not resolve birth city coordinates: {payload.city_of_birth}"
        )
    except Exception as e:
        logger.error(f"Failed to geocode city of birth: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Geocoding service failed during chart birth place lookup."
        )

    # ── b. Build cache key: "chart:{dob}:{tob}:{lat}:{lng}" ──────────────────
    dob_str = payload.date_of_birth.strip()
    tob_str = payload.time_of_birth.strip()
    
    # We round lat/lng to 4 decimal places for key consistency
    cache_key = generate_chart_cache_key(dob_str, tob_str, round(lat, 4), round(lng, 4))

    # ── c. Check Redis Cache for hit ────────────────────────────────────────
    cached_chart = await get_cached_chart(cache_key)
    if cached_chart:
        # Verify that the cached chart is complete (has all divisional charts)
        required_keys = ["navamsha", "dashamsha", "chaturthamsa", "saptamsha", "trimsamsa", "chandra_kundali", "surya_kundali"]
        is_complete = all(k in cached_chart for k in required_keys)
        if is_complete:
            logger.info(f"Redis cache hit under coordinate key: {cache_key}")
            # Fire background pre-generation for any missing tabs.
            # The generator skips tabs already in DB, so this is always safe.
            cached_chart_id = cached_chart.get("chart_id")
            if cached_chart_id:
                try:
                    chart_uuid = uuid.UUID(cached_chart_id)
                    background_tasks.add_task(
                        prefetch_rag_contexts,
                        chart_id=chart_uuid,
                        chart_data=cached_chart,
                    )
                    background_tasks.add_task(
                        pregenerate_all_tabs,
                        chart_id=chart_uuid,
                        chart_data=cached_chart,
                        full_name=cached_chart.get("full_name", payload.full_name),
                    )
                    logger.info(f"[chart] Background pre-generation & RAG prefetch triggered for Redis-cached chart {cached_chart_id}")
                except Exception as bg_err:
                    logger.warning(f"[chart] Could not trigger background gen for Redis-cached chart: {bg_err}")
            return cached_chart
        else:
            logger.info(f"Redis cache hit but chart incomplete (missing divisional charts), falling through to PostgreSQL: {cache_key}")

    # ── c2. Check PostgreSQL Database for hit ─────────────────────────────────
    parsed_dob = date.fromisoformat(dob_str)
    parsed_tob = time.fromisoformat(tob_str)
    try:
        row = await conn.fetchrow(
            """
            SELECT id, raw_chart_data FROM charts 
            WHERE LOWER(full_name) = LOWER($1)
              AND date_of_birth = $2 
              AND time_of_birth = $3 
              AND birth_time_confidence = $4
              AND ABS(latitude - $5) < 0.0001 
              AND ABS(longitude - $6) < 0.0001
            ORDER BY created_at DESC LIMIT 1
            """,
            payload.full_name,
            parsed_dob,
            parsed_tob,
            payload.birth_time_confidence,
            lat,
            lng
        )
        if row:
            logger.info(f"PostgreSQL chart hit under matching inputs: id={row['id']}")
            raw_data = row["raw_chart_data"]
            if isinstance(raw_data, str):
                chart_data = json.loads(raw_data)
            else:
                chart_data = dict(raw_data) if raw_data else {}
            
            # Ensure correct chart_id matching the database UUID is present in chart_id field
            chart_data["chart_id"] = str(row["id"])
            
            # Heal legacy chart if incomplete
            chart_data = await ensure_chart_complete(chart_data, conn, row["id"])

            # Cache in Redis so subsequent requests hit Redis instantly
            await cache_chart(cache_key, chart_data)

            # Fire background pre-generation for any missing tabs
            # Use FastAPI BackgroundTasks (not asyncio.create_task) to prevent
            # silent GC-cancellation of the background coroutine.
            background_tasks.add_task(
                prefetch_rag_contexts,
                chart_id=row["id"],
                chart_data=chart_data,
            )
            background_tasks.add_task(
                pregenerate_all_tabs,
                chart_id=row["id"],
                chart_data=chart_data,
                full_name=chart_data.get("full_name", payload.full_name),
            )
            logger.info(f"[chart] Background pre-generation & RAG prefetch triggered for existing chart {row['id']}")
            
            return chart_data
    except Exception as e:
        logger.error(f"Failed to query existing chart from PostgreSQL: {e}")

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

    # ── i. Fire background pre-generation for all 10 tabs ────────────────────
    # Use FastAPI BackgroundTasks (not asyncio.create_task) to prevent
    # silent GC-cancellation of the background coroutine.
    background_tasks.add_task(
        prefetch_rag_contexts,
        chart_id=new_id,
        chart_data=chart_data,
    )
    background_tasks.add_task(
        pregenerate_all_tabs,
        chart_id=new_id,
        chart_data=chart_data,
        full_name=payload.full_name,
    )
    logger.info(f"[chart] Background pre-generation & RAG prefetch triggered for new chart {new_id}")

    # ── j. Return complete chart JSON with chart_id ──────────────────────────
    return chart_data

@router.get("/{chart_id}", response_model=Dict[str, Any])
async def get_chart(
    chart_id: uuid.UUID,
    background_tasks: BackgroundTasks,
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

    # Heal legacy chart if incomplete
    chart_data = await ensure_chart_complete(chart_data, conn, chart_id)

    # Fire background pre-generation for any missing tabs
    background_tasks.add_task(
        prefetch_rag_contexts,
        chart_id=chart_id,
        chart_data=chart_data,
    )
    background_tasks.add_task(
        pregenerate_all_tabs,
        chart_id=chart_id,
        chart_data=chart_data,
        full_name=chart_data.get("full_name"),
    )
    logger.info(f"[chart] Background pre-generation & RAG prefetch triggered for GET chart {chart_id}")

    return chart_data
