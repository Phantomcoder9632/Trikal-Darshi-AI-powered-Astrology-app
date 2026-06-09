import logging
import asyncio
import json
import httpx
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, status
from services.cache import get_redis

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Geocoding"])

class GeocodeRequest(BaseModel):
    city: str = Field(..., examples=["Kolkata, West Bengal"])

class GeocodeResponse(BaseModel):
    lat: float
    lng: float
    display_name: str

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
HEADERS = {
    "User-Agent": "astrology-app/1.0"
}

async def geocode_city_cached(city: str) -> dict:
    """
    Resolves city name to coordinates, checking Redis cache first.
    Returns:
        dict: {"lat": float, "lng": float, "display_name": str}
    """
    city_key = city.strip().lower()
    redis_key = f"geocode_cache:{city_key}"
    
    try:
        redis_client = await get_redis()
        cached_data = await redis_client.get(redis_key)
        if cached_data:
            logger.info(f"[geocoding] Cache hit for city: {city_key}")
            return json.loads(cached_data)
    except Exception as cache_err:
        logger.warning(f"[geocoding] Redis cache read error: {cache_err}")
        redis_client = None

    # Enforce Nominatim 1-second rate-limit delay (comply with OSM terms)
    await asyncio.sleep(1.0)
    
    params = {
        "q": city,
        "format": "json",
        "limit": 1
    }
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(NOMINATIM_URL, params=params, headers=HEADERS)
        response.raise_for_status()

    data = response.json()
    if not data or len(data) == 0:
        raise ValueError(f"Coordinates for location '{city}' could not be resolved.")

    first_match = data[0]
    result = {
        "lat": float(first_match["lat"]),
        "lng": float(first_match["lon"]),
        "display_name": first_match.get("display_name", "")
    }

    try:
        if redis_client:
            # Cache for 30 days
            await redis_client.setex(redis_key, 2592000, json.dumps(result))
            logger.info(f"[geocoding] Cached city coordinate data for key: {redis_key}")
    except Exception as cache_err:
        logger.warning(f"[geocoding] Redis cache write error: {cache_err}")

    return result

@router.post("/geocode", response_model=GeocodeResponse)
async def geocode_city(payload: GeocodeRequest):
    """
    POST /geocode
    Resolves a city/address string to geographic coordinates using Nominatim OpenStreetMap.
    Enforces a 1-second rate-limit sleep as per Nominatim usage terms.
    """
    logger.info(f"Geocoding city query: {payload.city}")
    try:
        res = await geocode_city_cached(payload.city)
        return GeocodeResponse(**res)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Geocoding failure: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Geocoding service returned an upstream network error."
        )
