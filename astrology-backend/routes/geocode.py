import logging
import asyncio
import httpx
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, status

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

@router.post("/geocode", response_model=GeocodeResponse)
async def geocode_city(payload: GeocodeRequest):
    """
    POST /geocode
    Resolves a city/address string to geographic coordinates using Nominatim OpenStreetMap.
    Enforces a 1-second rate-limit sleep as per Nominatim usage terms.
    """
    logger.info(f"Geocoding city query: {payload.city}")
    
    # ── 1. Enforce Nominatim 1-second rate-limit delay ───────────────────────
    await asyncio.sleep(1.0)
    
    params = {
        "q": payload.city,
        "format": "json",
        "limit": 1
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(NOMINATIM_URL, params=params, headers=HEADERS)
            response.raise_for_status()
    except Exception as e:
        logger.error(f"Nominatim geocoding network/HTTP failure: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Geocoding service returned an upstream network error."
        )

    data = response.json()
    
    if not data or len(data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Coordinates for location '{payload.city}' could not be resolved."
        )

    first_match = data[0]
    
    return GeocodeResponse(
        lat=float(first_match["lat"]),
        lng=float(first_match["lon"]),
        display_name=first_match.get("display_name", "")
    )
