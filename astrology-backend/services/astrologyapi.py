"""
services/astrologyapi.py
─────────────────────────
Client for AstrologyAPI.com (https://json.astrologyapi.com/v1).

Authentication : HTTP Basic Auth — User ID + API Key.
All endpoints   : POST with a standard JSON birth-data body.
Usage tracking  : Every call is logged to the api_usage table so we
                  can monitor the 250 free calls/month quota.
"""

from __future__ import annotations

import base64
import os
from datetime import date, time
from typing import Any

import httpx
from dotenv import load_dotenv

from db.database import get_db_pool

load_dotenv()

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

BASE_URL: str = "https://json.astrologyapi.com/v1"

_USER_ID: str = os.getenv("ASTROLOGYAPI_USER_ID", "")
_API_KEY: str = os.getenv("ASTROLOGYAPI_API_KEY", "")

# Standard Indian timezone offset in hours
_DEFAULT_TZONE: float = 5.5

# Pre-compute the Basic Auth header value once at import time
def _make_auth_header() -> str:
    credentials = f"{_USER_ID}:{_API_KEY}"
    encoded = base64.b64encode(credentials.encode()).decode()
    return f"Basic {encoded}"


_AUTH_HEADER: str = _make_auth_header()


# ---------------------------------------------------------------------------
# Custom exception
# ---------------------------------------------------------------------------

class AstrologyAPIException(Exception):
    """Raised when AstrologyAPI.com returns an error response."""

    def __init__(self, endpoint: str, status_code: int, detail: str) -> None:
        self.endpoint = endpoint
        self.status_code = status_code
        self.detail = detail
        super().__init__(f"AstrologyAPI error [{status_code}] on {endpoint}: {detail}")


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _build_body(
    dob: date,
    tob: time,
    lat: float,
    lon: float,
    tzone: float = _DEFAULT_TZONE,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Assemble the standard request body expected by every endpoint."""
    body: dict[str, Any] = {
        "day":   dob.day,
        "month": dob.month,
        "year":  dob.year,
        "hour":  tob.hour,
        "min":   tob.minute,
        "lat":   lat,
        "lon":   lon,
        "tzone": tzone,
    }
    if extra:
        body.update(extra)
    return body


async def _post(endpoint: str, body: dict[str, Any]) -> Any:
    """
    Execute a single authenticated POST request.

    Returns:
        Parsed JSON response (dict or list).

    Raises:
        AstrologyAPIException: On non-2xx responses or JSON error fields.
    """
    if not _USER_ID or not _API_KEY:
        raise AstrologyAPIException(
            endpoint, 0,
            "ASTROLOGYAPI_USER_ID or ASTROLOGYAPI_API_KEY is not configured.",
        )

    url = f"{BASE_URL}/{endpoint.lstrip('/')}"
    headers = {
        "Authorization": _AUTH_HEADER,
        "Content-Type":  "application/json",
        "Accept":        "application/json",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, json=body, headers=headers)

    # Non-2xx → raise immediately
    if response.status_code >= 400:
        try:
            detail = response.json().get("message", response.text)
        except Exception:
            detail = response.text
        raise AstrologyAPIException(endpoint, response.status_code, detail)

    data = response.json()

    # Some endpoints return {"error": "..."} even with HTTP 200
    if isinstance(data, dict) and data.get("error"):
        raise AstrologyAPIException(endpoint, 200, str(data["error"]))

    return data


# ---------------------------------------------------------------------------
# Usage tracker
# ---------------------------------------------------------------------------

async def track_api_call(
    service: str,
    endpoint: str,
    success: bool = True,
) -> None:
    """
    Insert one row into api_usage to track quota consumption.
    Failures are silently swallowed so they never break the caller.
    """
    try:
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO api_usage (service, endpoint, success)
                VALUES ($1, $2, $3)
                """,
                service,
                endpoint,
                success,
            )
    except Exception:
        # Logging failure must never crash the request
        pass


# ---------------------------------------------------------------------------
# Convenience wrapper: calls _post, tracks the result, re-raises on error
# ---------------------------------------------------------------------------

async def _call(
    endpoint: str,
    body: dict[str, Any],
) -> Any:
    """Execute a POST, track it in api_usage, and return the parsed data."""
    success = True
    try:
        data = await _post(endpoint, body)
        return data
    except AstrologyAPIException:
        success = False
        raise
    finally:
        await track_api_call("astrologyapi", endpoint, success)


# ---------------------------------------------------------------------------
# Public API functions
# ---------------------------------------------------------------------------

async def get_planets(
    dob: date,
    tob: time,
    lat: float,
    lon: float,
    tzone: float = _DEFAULT_TZONE,
) -> dict[str, Any]:
    """
    POST /planets
    All planet positions with zodiac signs and house placements.
    """
    body = _build_body(dob, tob, lat, lon, tzone)
    return await _call("/planets", body)


async def get_planet_extended(
    dob: date,
    tob: time,
    lat: float,
    lon: float,
    tzone: float = _DEFAULT_TZONE,
) -> dict[str, Any]:
    """
    POST /planets/extended
    Extended planet data: dignity, retrograde status, combustion.
    """
    body = _build_body(dob, tob, lat, lon, tzone)
    return await _call("/planets/extended", body)


async def get_ascendant(
    dob: date,
    tob: time,
    lat: float,
    lon: float,
    tzone: float = _DEFAULT_TZONE,
) -> dict[str, Any]:
    """
    POST /horo_chart_image/D1
    D1 (Lagna / Rashi) chart — lagna details and house sign mapping.
    """
    body = _build_body(dob, tob, lat, lon, tzone)
    return await _call("/horo_chart_image/D1", body)


async def get_navamsha(
    dob: date,
    tob: time,
    lat: float,
    lon: float,
    tzone: float = _DEFAULT_TZONE,
) -> dict[str, Any]:
    """
    POST /horo_chart_image/D9
    D9 (Navamsha) chart — marriage and dharma divisional chart.
    """
    body = _build_body(dob, tob, lat, lon, tzone)
    return await _call("/horo_chart_image/D9", body)


async def get_dashamsha(
    dob: date,
    tob: time,
    lat: float,
    lon: float,
    tzone: float = _DEFAULT_TZONE,
) -> dict[str, Any]:
    """
    POST /horo_chart_image/D10
    D10 (Dashamsha) chart — career and professional life.
    """
    body = _build_body(dob, tob, lat, lon, tzone)
    return await _call("/horo_chart_image/D10", body)


async def get_dasha(
    dob: date,
    tob: time,
    lat: float,
    lon: float,
    tzone: float = _DEFAULT_TZONE,
) -> dict[str, Any]:
    """
    POST /current_vdasha
    Current Vimshottari Mahadasha and Antardasha periods.
    """
    body = _build_body(dob, tob, lat, lon, tzone)
    return await _call("/current_vdasha", body)


async def get_dasha_periods(
    dob: date,
    tob: time,
    lat: float,
    lon: float,
    tzone: float = _DEFAULT_TZONE,
) -> dict[str, Any]:
    """
    POST /major_vdasha
    All Mahadasha periods with start/end dates for the native's lifetime.
    """
    body = _build_body(dob, tob, lat, lon, tzone)
    return await _call("/major_vdasha", body)


async def get_ashtakavarga(
    dob: date,
    tob: time,
    lat: float,
    lon: float,
    tzone: float = _DEFAULT_TZONE,
) -> dict[str, Any]:
    """
    POST /sarvAshtakvarga
    Sarva Ashtakavarga — bindhu (point) scores for all 12 houses.
    """
    body = _build_body(dob, tob, lat, lon, tzone)
    return await _call("/sarvAshtakvarga", body)


async def get_yogas(
    dob: date,
    tob: time,
    lat: float,
    lon: float,
    tzone: float = _DEFAULT_TZONE,
) -> dict[str, Any]:
    """
    POST /yoga_list
    All active Vedic yogas present in the birth chart.
    """
    body = _build_body(dob, tob, lat, lon, tzone)
    return await _call("/yoga_list", body)


async def get_lalkitab_planets(
    dob: date,
    tob: time,
    lat: float,
    lon: float,
    tzone: float = _DEFAULT_TZONE,
) -> dict[str, Any]:
    """
    POST /lalkitab_planets
    Lal Kitab planetary analysis — house positions and their effects.
    """
    body = _build_body(dob, tob, lat, lon, tzone)
    return await _call("/lalkitab_planets", body)


async def get_lalkitab_remedies(
    dob: date,
    tob: time,
    lat: float,
    lon: float,
    tzone: float = _DEFAULT_TZONE,
) -> dict[str, Any]:
    """
    POST /lalkitab_remedies
    Lal Kitab farmaans (remedies) for the native.
    """
    body = _build_body(dob, tob, lat, lon, tzone)
    return await _call("/lalkitab_remedies", body)


async def get_nakshatra(
    dob: date,
    tob: time,
    lat: float,
    lon: float,
    tzone: float = _DEFAULT_TZONE,
) -> dict[str, Any]:
    """
    POST /nakshatra_result
    Moon nakshatra with pada, nakshatra lord, and interpretive details.
    """
    body = _build_body(dob, tob, lat, lon, tzone)
    return await _call("/nakshatra_result", body)


async def get_kalsarp(
    dob: date,
    tob: time,
    lat: float,
    lon: float,
    tzone: float = _DEFAULT_TZONE,
) -> dict[str, Any]:
    """
    POST /kalsarp_details
    Kaal Sarp Dosha presence, type, and severity analysis.
    """
    body = _build_body(dob, tob, lat, lon, tzone)
    return await _call("/kalsarp_details", body)


async def get_mangal_dosha(
    dob: date,
    tob: time,
    lat: float,
    lon: float,
    tzone: float = _DEFAULT_TZONE,
) -> dict[str, Any]:
    """
    POST /manglik
    Mangal (Manglik) Dosha analysis — presence, percentage, and effects.
    """
    body = _build_body(dob, tob, lat, lon, tzone)
    return await _call("/manglik", body)


async def get_numerology(
    dob: date,
    tob: time,
    lat: float,
    lon: float,
    full_name: str,
    tzone: float = _DEFAULT_TZONE,
) -> dict[str, Any]:
    """
    POST /numero_table
    Numerology table — Moolank (life path), Bhagyank (destiny),
    and Namank (name number).
    """
    body = _build_body(dob, tob, lat, lon, tzone, extra={"name": full_name})
    return await _call("/numero_table", body)
