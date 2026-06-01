import logging
import asyncio
from datetime import date, time
from typing import Dict, Any

from db.database import get_db_pool
from services import astrologyapi as external
from services import ephemeris as local_eph
from services import numerology as local_num

logger = logging.getLogger(__name__)

async def count_monthly_api_calls() -> int:
    """
    Count the total number of AstrologyAPI calls made this calendar month
    from the PostgreSQL api_usage table.
    """
    try:
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            # Counts calls to external astrologyapi service this month
            count = await conn.fetchval(
                """
                SELECT COUNT(*) FROM api_usage 
                WHERE called_at >= date_trunc('month', NOW()) 
                  AND service = 'astrologyapi'
                """
            )
            return count if count is not None else 0
    except Exception as e:
        logger.error(f"Error querying monthly api usage count: {e}")
        # Default to 0 to attempt API call on db error (fail-safe)
        return 0

async def get_complete_chart(user_input: Any) -> Dict[str, Any]:
    """
    Decision engine: Chooses between AstrologyAPI.com and local Swiss Ephemeris.
    
    1. Counts monthly API usage.
    2. If count < 200: Use AstrologyAPI in parallel (using asyncio.gather). Fall back on error.
    3. If count >= 200: Direct Swiss Ephemeris fallback, logging limit reason.
    """
    # Normalize user input (supports Pydantic model or dict)
    if hasattr(user_input, "model_dump"):
        data = user_input.model_dump()
    elif isinstance(user_input, dict):
        data = user_input
    else:
        data = dict(user_input)

    full_name = data.get("full_name", "")
    dob = data.get("date_of_birth")
    tob = data.get("time_of_birth")
    city_of_birth = data.get("city_of_birth", "")
    lat = float(data.get("latitude") if data.get("latitude") is not None else data.get("lat"))
    lng = float(data.get("longitude") if data.get("longitude") is not None else data.get("lng"))
    birth_time_confidence = data.get("birth_time_confidence", "exact")
    ayanamsha = data.get("ayanamsha", "LAHIRI")
    tzone = float(data.get("timezone_offset", 5.5))  # Default to Indian standard offset

    # Ensure dob and tob are date and time objects
    if isinstance(dob, str):
        dob = date.fromisoformat(dob)
    if isinstance(tob, str):
        tob = time.fromisoformat(tob)

    # ── 1. Check current month's usage ──────────────────────────────────────
    monthly_calls = await count_monthly_api_calls()
    logger.info(f"AstrologyAPI monthly calls counted: {monthly_calls}/250 (Threshold: 200)")

    # ── 2. Route request based on quota threshold ───────────────────────────
    if monthly_calls < 200:
        try:
            logger.info("Under quota threshold. Invoking AstrologyAPI.com in parallel...")
            
            # Fire all 14 AstrologyAPI REST requests in parallel concurrently
            planets_task = external.get_planets(dob, tob, lat, lng, tzone)
            ascendant_task = external.get_ascendant(dob, tob, lat, lng, tzone)
            navamsha_task = external.get_navamsha(dob, tob, lat, lng, tzone)
            dashamsha_task = external.get_dashamsha(dob, tob, lat, lng, tzone)
            dasha_task = external.get_dasha(dob, tob, lat, lng, tzone)
            dasha_periods_task = external.get_dasha_periods(dob, tob, lat, lng, tzone)
            ashtakavarga_task = external.get_ashtakavarga(dob, tob, lat, lng, tzone)
            yogas_task = external.get_yogas(dob, tob, lat, lng, tzone)
            lalkitab_task = external.get_lalkitab_planets(dob, tob, lat, lng, tzone)
            remedies_task = external.get_lalkitab_remedies(dob, tob, lat, lng, tzone)
            nakshatra_task = external.get_nakshatra(dob, tob, lat, lng, tzone)
            kalsarp_task = external.get_kalsarp(dob, tob, lat, lng, tzone)
            mangal_task = external.get_mangal_dosha(dob, tob, lat, lng, tzone)
            numerology_task = external.get_numerology(dob, tob, lat, lng, full_name, tzone)

            # Concurrent execution
            (
                planets, ascendant, navamsha, dashamsha, dasha,
                dasha_periods, ashtakavarga, yogas, lalkitab,
                remedies, nakshatra, kalsarp, mangal, numerology
            ) = await asyncio.gather(
                planets_task, ascendant_task, navamsha_task, dashamsha_task, dasha_task,
                dasha_periods_task, ashtakavarga_task, yogas_task, lalkitab_task,
                remedies_task, nakshatra_task, kalsarp_task, mangal_task, numerology_task
            )

            logger.info("Successfully calculated chart using external AstrologyAPI.")
            
            # Combine into a single comprehensive dictionary response
            return {
                "source": "astrologyapi",
                "planets": planets,
                "ascendant": ascendant,
                "houses": ascendant.get("houses") or {},
                "nakshatra": nakshatra,
                "dasha": dasha,
                "dasha_periods": dasha_periods,
                "ashtakavarga": ashtakavarga,
                "yogas": yogas,
                "lalkitab": lalkitab,
                "lalkitab_remedies": remedies,
                "kalsarp": kalsarp,
                "mangal_dosha": mangal,
                "navamsha": navamsha,
                "dashamsha": dashamsha,
                "numerology": numerology
            }

        except Exception as e:
            logger.error(f"External API failed with error: {e}. Falling back to local Swiss Ephemeris...")
            # Graceful fall through to local fallback calculations below

    else:
        logger.warning("Monthly call limit threshold (200) reached. Launching local Swiss Ephemeris directly.")
        # Log that limit was reached inside api_usage
        await external.track_api_call(
            service="ephemeris",
            endpoint="fallback_due_to_limit",
            success=True
        )

    # ── 3. Execute Local Fallback Calculations (Swiss Ephemeris + Numerology) ──
    try:
        # High precision local calculation
        local_chart = local_eph.calculate_chart_fallback(dob, tob, lat, lng)
        local_numerology = local_num.get_numerology(dob, full_name)
        
        # Populate Moon nakshatra parameters from local planets list
        moon_planet = next((p for p in local_chart["planets"] if p["name"] == "Moon"), None)
        moon_nakshatra = {}
        if moon_planet:
            moon_nakshatra = {
                "nakshatra": moon_planet.get("nakshatra"),
                "nakshatra_lord": moon_planet.get("nakshatra_lord"),
                "nakshatra_pada": moon_planet.get("nakshatra_pada"),
                "sign": moon_planet.get("sign"),
                "sign_lord": moon_planet.get("sign_lord"),
                "normDegree": moon_planet.get("normDegree")
            }

        # Calculate Doshas locally
        kalsarp_res = local_eph.calculate_kalsarp(local_chart["planets"])
        mangal_res = local_eph.calculate_mangal_dosha(local_chart["planets"])
        pitru_res = local_eph.calculate_pitru_dosha(local_chart["planets"])
        gand_res = local_eph.calculate_gand_mool(local_chart["planets"])

        # Append Gand Mool info directly to nakshatra payload
        moon_nakshatra["gand_mool"] = gand_res

        logger.info("Successfully calculated chart & doshas using local Swiss Ephemeris fallback engine.")

        return {
            "source": "ephemeris",
            "planets": local_chart["planets"],
            "ascendant": local_chart["ascendant"],
            "houses": local_chart["houses"],
            "nakshatra": moon_nakshatra,
            "dasha": local_chart["dasha"],
            "dasha_periods": local_chart["dasha"].get("periods", []),
            "ashtakavarga": {"bindus": {}, "message": "Ashtakavarga calculations are unavailable in local fallback mode."},
            "yogas": [],
            "lalkitab": {},
            "lalkitab_remedies": {},
            "kalsarp": kalsarp_res,
            "mangal_dosha": mangal_res,
            "pitru_dosha": pitru_res,
            "navamsha": {},
            "dashamsha": {},
            "numerology": local_numerology
        }

    except Exception as local_err:
        logger.critical(f"Critical System Failure: Local fallback engine also crashed: {local_err}")
        raise RuntimeError(f"All chart calculation attempts failed. Details: {local_err}")
