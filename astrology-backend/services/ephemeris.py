import math
import os
import logging
from datetime import date, time, datetime, timedelta
from typing import Dict, Any, List

import swisseph as swe

logger = logging.getLogger(__name__)

# ── FIX 1: Swiss Ephemeris Data File Path ────────────────────────────────────
# Place sepl_18.se1, semo_18.se1, seas_18.se1 files in the 'ephe' folder
# at your backend root: D:\AstrologyApp\astrology-backend\ephe\
# Download from: https://www.astro.com/ftp/swisseph/ephe/
_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_EPHE_PATH = os.path.join(_BASE_DIR, "ephe")
if os.path.isdir(_EPHE_PATH):
    swe.set_ephe_path(_EPHE_PATH)
    logger.info(f"Swiss Ephemeris path set: {_EPHE_PATH}")
else:
    logger.warning(
        f"Ephemeris folder not found at '{_EPHE_PATH}'. "
        "Using Moshier fallback (less accurate). "
        "Create the folder and add .se1 files from astro.com/ftp/swisseph/ephe/"
    )

# ── Planetary mapping to Swiss Ephemeris IDs ────────────────────────────────
PLANET_IDS = {
    "Sun":     swe.SUN,
    "Moon":    swe.MOON,
    "Mars":    swe.MARS,
    "Mercury": swe.MERCURY,
    "Jupiter": swe.JUPITER,
    "Venus":   swe.VENUS,
    "Saturn":  swe.SATURN,
    "Rahu":    swe.MEAN_NODE,
}

# Zodiac Signs list (0-11)
ZODIAC_SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
]

# Zodiac Sign Lords (classical Vedic rulers)
SIGN_LORDS = {
    "Aries": "Mars",      "Taurus": "Venus",   "Gemini": "Mercury",
    "Cancer": "Moon",     "Leo": "Sun",         "Virgo": "Mercury",
    "Libra": "Venus",     "Scorpio": "Mars",    "Sagittarius": "Jupiter",
    "Capricorn": "Saturn","Aquarius": "Saturn", "Pisces": "Jupiter"
}

# 27 Nakshatras in Vedic astrology
NAKSHATRAS = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
    "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni",
    "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha",
    "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana",
    "Dhanishtha", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
]

# Nakshatra Lords sequence in Vimshottari cycle (repeats 3 times for 27 nakshatras)
NAKSHATRA_LORDS = [
    "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury",
    "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury",
    "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"
]

# Vimshottari Dasha durations in years (total = 120 years)
DASHA_PERIODS = {
    "Ketu": 7, "Venus": 20, "Sun": 6, "Moon": 10, "Mars": 7,
    "Rahu": 18, "Jupiter": 16, "Saturn": 19, "Mercury": 17
}

DASHA_SEQUENCE = [
    "Ketu", "Venus", "Sun", "Moon", "Mars",
    "Rahu", "Jupiter", "Saturn", "Mercury"
]


def get_julian_day_ist(dob: date, tob: time) -> float:
    """
    Convert Local Date and Time in IST (UTC+5:30) to UT and compute Julian Day.
    """
    dt_local = datetime(dob.year, dob.month, dob.day, tob.hour, tob.minute, tob.second)
    dt_utc = dt_local - timedelta(hours=5, minutes=30)  # FIX: IST is UTC+5:30 exactly
    jd = swe.julday(
        dt_utc.year, dt_utc.month, dt_utc.day,
        dt_utc.hour + dt_utc.minute / 60.0 + dt_utc.second / 3600.0
    )
    return jd


def get_zodiac_details(sidereal_longitude: float) -> Dict[str, Any]:
    """
    Get sign name, degree within sign, sign lord, nakshatra, nakshatra lord, and pada.
    """
    sign_idx    = int(sidereal_longitude // 30) % 12
    sign_name   = ZODIAC_SIGNS[sign_idx]
    sign_degree = sidereal_longitude % 30
    sign_lord   = SIGN_LORDS[sign_name]

    nak_size         = 360.0 / 27
    nak_idx          = int(sidereal_longitude // nak_size) % 27
    nak_name         = NAKSHATRAS[nak_idx]
    nak_lord         = NAKSHATRA_LORDS[nak_idx]
    position_in_nak  = sidereal_longitude % nak_size
    pada             = int(position_in_nak // (nak_size / 4)) + 1

    return {
        "sign":            sign_name,
        "sign_lord":       sign_lord,
        "normDegree":      round(sign_degree, 4),
        "nakshatra":       nak_name,
        "nakshatra_lord":  nak_lord,
        "nakshatra_pada":  pada
    }


def find_placidus_house(lon: float, sidereal_cusps: List[float]) -> int:
    """
    Determine which Placidus house a planetary longitude falls into.
    sidereal_cusps is 1-indexed: index 1 = cusp of house 1, ..., index 12 = cusp of house 12.
    """
    for i in range(1, 12):
        c1 = sidereal_cusps[i]
        c2 = sidereal_cusps[i + 1]
        if c1 <= c2:
            if c1 <= lon < c2:
                return i
        else:  # Spans 360°→0° boundary
            if lon >= c1 or lon < c2:
                return i

    # Check House 12 (from cusp 12 back to cusp 1)
    c12 = sidereal_cusps[12]
    c1  = sidereal_cusps[1]
    if c12 <= c1:
        if c12 <= lon < c1:
            return 12
    else:
        if lon >= c12 or lon < c1:
            return 12

    return 1  # Safe fallback


def get_current_dasha_period(moon_sid_lon: float, birth_dt: datetime) -> Dict[str, Any]:
    """
    Calculate the active Vimshottari Mahadasha and Antardasha lords and their dates.
    Reference point: current system datetime (IST).
    """
    # ── 1. Birth dasha starting point ───────────────────────────────────────
    nak_size        = 360.0 / 27
    nak_idx         = int(moon_sid_lon // nak_size) % 27
    starting_lord   = NAKSHATRA_LORDS[nak_idx]

    pos_in_nak      = moon_sid_lon % nak_size
    percent_elapsed = pos_in_nak / nak_size

    starting_duration = DASHA_PERIODS[starting_lord]
    years_remaining   = starting_duration * (1.0 - percent_elapsed)

    dasha_start = birth_dt
    dasha_end   = dasha_start + timedelta(days=int(years_remaining * 365.25))

    target_date     = datetime.now()
    start_seq_idx   = DASHA_SEQUENCE.index(starting_lord)

    active_mahadasha       = starting_lord
    active_mahadasha_start = dasha_start
    active_mahadasha_end   = dasha_end

    # ── 2. Walk forward through Mahadasha sequence ──────────────────────────
    if target_date > dasha_end:
        found = False
        for i in range(1, 9):
            lord     = DASHA_SEQUENCE[(start_seq_idx + i) % 9]
            duration = DASHA_PERIODS[lord]
            dasha_start = dasha_end
            dasha_end   = dasha_start + timedelta(days=int(duration * 365.25))

            if dasha_start <= target_date <= dasha_end:
                active_mahadasha       = lord
                active_mahadasha_start = dasha_start
                active_mahadasha_end   = dasha_end
                found = True
                break  # FIX: was missing — without this, for-else always ran fallback

        if not found:
            # Overflow beyond 120-year cycle — restart from starting lord
            logger.warning("Dasha calculation overflowed 120-year cycle. Using fallback.")
            active_mahadasha       = starting_lord
            active_mahadasha_start = birth_dt
            active_mahadasha_end   = birth_dt + timedelta(days=365.25 * starting_duration)

    # ── 3. Determine active Antardasha ──────────────────────────────────────
    mahadasha_duration_days = (active_mahadasha_end - active_mahadasha_start).days
    antardasha_seq_start    = DASHA_SEQUENCE.index(active_mahadasha)

    a_start            = active_mahadasha_start
    active_antardasha       = active_mahadasha
    active_antardasha_start = a_start
    active_antardasha_end   = active_mahadasha_end

    for j in range(9):
        a_lord       = DASHA_SEQUENCE[(antardasha_seq_start + j) % 9]
        a_lord_years = DASHA_PERIODS[a_lord]
        a_days       = int((a_lord_years / 120.0) * mahadasha_duration_days)
        a_end        = a_start + timedelta(days=a_days)

        if a_start <= target_date <= a_end:
            active_antardasha       = a_lord
            active_antardasha_start = a_start
            active_antardasha_end   = a_end
            break
        a_start = a_end
    else:
        # Antardasha not found within mahadasha window — use mahadasha itself
        active_antardasha       = active_mahadasha
        active_antardasha_start = active_mahadasha_start
        active_antardasha_end   = active_mahadasha_end

    return {
        "mahadasha":        active_mahadasha,
        "antardasha":       active_antardasha,
        "mahadasha_start":  active_mahadasha_start.strftime("%Y-%m-%d"),
        "mahadasha_end":    active_mahadasha_end.strftime("%Y-%m-%d"),
        "antardasha_start": active_antardasha_start.strftime("%Y-%m-%d"),
        "antardasha_end":   active_antardasha_end.strftime("%Y-%m-%d"),
    }


def calculate_chart_fallback(
    dob: date,
    tob: time,
    lat: float,
    lng: float
) -> Dict[str, Any]:
    """
    High-precision local Vedic birth chart calculator using pyswisseph.
    Output shape matches AstrologyAPI.com response format.
    """
    # ── FIX 2: swe.calc_ut() returns 3 values in pyswisseph 2.x ─────────────
    # Old code:  res, _ = swe.calc_ut(jd, p_id, calc_flags)   ← CRASHES
    # New code:  calc_result = swe.calc_ut(...)
    #            res = calc_result[0]                          ← tuple of 6 floats
    #   calc_result[0] = (lon, lat, dist, lon_spd, lat_spd, dist_spd)
    #   calc_result[1] = integer return flag
    #   calc_result[2] = warning/error string (safe to ignore)

    try:
        jd = get_julian_day_ist(dob, tob)

        # Lahiri Ayanamsha (standard for Indian Vedic astrology)
        swe.set_sid_mode(swe.SIDM_LAHIRI)
        ayan_val = swe.get_ayanamsa_ut(jd)

        # ── 1. House Cusps & Ascendant (Placidus) ───────────────────────────
        try:
            cusps, ascmc = swe.houses(jd, lat, lng, b'P')
        except Exception as e:
            logger.error(f"swe.houses() failed: {e}. Retrying with Equal House system.")
            cusps, ascmc = swe.houses(jd, lat, lng, b'E')

        # Convert tropical house cusps → sidereal
        # FIX: In pyswisseph 2.x, swe.houses() returns 12 elements (no 0.0 placeholder)
        # cusps[0] = 1st house cusp, cusps[11] = 12th house cusp
        # We prepend 0.0 so the list is 1-indexed: sidereal_cusps[1..12]
        sidereal_cusps = [0.0] + [(c - ayan_val) % 360.0 for c in cusps]

        sid_asc     = (ascmc[0] - ayan_val) % 360.0
        asc_details = get_zodiac_details(sid_asc)

        # ── 2. Calculate All 9 Classical Planets ────────────────────────────
        planets      = []
        moon_sid_lon = 0.0
        calc_flags   = swe.FLG_SWIEPH | swe.FLG_SPEED

        for name, p_id in PLANET_IDS.items():
            # ── THE KEY FIX ────────────────────────────────────────────────
            # pyswisseph 2.x: swe.calc_ut() returns a 3-tuple:
            #   [0] → (lon, lat, dist, lon_speed, lat_speed, dist_speed)
            #   [1] → integer return flag
            #   [2] → warning string
            calc_result  = swe.calc_ut(jd, p_id, calc_flags)
            position     = calc_result[0]        # 6-element tuple of floats
            tropical_lon = position[0]           # longitude in degrees
            speed        = position[3]           # longitudinal speed (deg/day)

            sidereal_lon = (tropical_lon - ayan_val) % 360.0
            details      = get_zodiac_details(sidereal_lon)
            is_retro     = "true" if speed < 0 else "false"

            if name == "Moon":
                moon_sid_lon = sidereal_lon

            house_placement = find_placidus_house(sidereal_lon, sidereal_cusps)

            planets.append({
                "name":            name,
                "fullDegree":      round(sidereal_lon, 4),
                "normDegree":      details["normDegree"],
                "speed":           round(speed, 4),
                "isRetrograde":    is_retro,
                "sign":            details["sign"],
                "sign_lord":       details["sign_lord"],
                "house":           house_placement,
                "nakshatra":       details["nakshatra"],
                "nakshatra_lord":  details["nakshatra_lord"],
                "nakshatra_pada":  details["nakshatra_pada"],
            })

        # ── 3. Derive Ketu (exactly 180° opposite Rahu) ─────────────────────
        rahu         = next(p for p in planets if p["name"] == "Rahu")
        ketu_sid     = (rahu["fullDegree"] + 180.0) % 360.0
        ketu_details = get_zodiac_details(ketu_sid)
        ketu_house   = find_placidus_house(ketu_sid, sidereal_cusps)

        planets.append({
            "name":            "Ketu",
            "fullDegree":      round(ketu_sid, 4),
            "normDegree":      ketu_details["normDegree"],
            "speed":           rahu["speed"],
            "isRetrograde":    "true",   # Nodes always retrograde
            "sign":            ketu_details["sign"],
            "sign_lord":       ketu_details["sign_lord"],
            "house":           ketu_house,
            "nakshatra":       ketu_details["nakshatra"],
            "nakshatra_lord":  ketu_details["nakshatra_lord"],
            "nakshatra_pada":  ketu_details["nakshatra_pada"],
        })

        # ── 4. Vimshottari Dasha ─────────────────────────────────────────────
        birth_dt   = datetime(dob.year, dob.month, dob.day, tob.hour, tob.minute, tob.second)
        dasha_info = get_current_dasha_period(moon_sid_lon, birth_dt)

        # ── 5. Format House Cusps ────────────────────────────────────────────
        formatted_houses = []
        for h in range(1, 13):
            h_lon     = sidereal_cusps[h]
            h_details = get_zodiac_details(h_lon)
            formatted_houses.append({
                "house":           h,
                "degree":          h_details["normDegree"],
                "sign":            h_details["sign"],
                "sign_lord":       h_details["sign_lord"],
                "nakshatra":       h_details["nakshatra"],
                "nakshatra_lord":  h_details["nakshatra_lord"],
                "nakshatra_pada":  h_details["nakshatra_pada"],
            })

        logger.info(
            f"Chart calculated successfully via local ephemeris. "
            f"Ayanamsha: {round(ayan_val, 4)}° | Ascendant: {asc_details['sign']} {asc_details['normDegree']}°"
        )

        return {
            "data_source":      "ephemeris",
            "julian_day":       round(jd, 6),
            "ayanamsha_value":  round(ayan_val, 4),
            "ascendant": {
                "sign":            asc_details["sign"],
                "degree":          asc_details["normDegree"],
                "full_degree":     round(sid_asc, 4),
                "nakshatra":       asc_details["nakshatra"],
                "nakshatra_lord":  asc_details["nakshatra_lord"],
                "nakshatra_pada":  asc_details["nakshatra_pada"],
            },
            "planets": planets,
            "houses":  formatted_houses,
            "dasha":   dasha_info,
        }

    except Exception as e:
        logger.error(f"calculate_chart_fallback crashed: {e}", exc_info=True)
        raise

    finally:
        # FIX 3: Always release Swiss Ephemeris resources after each calculation
        swe.close()


def calculate_kalsarp(planets: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Calculate Kaal Sarp Dosha presence and type locally.
    All 7 other classical planets hemmed between Rahu and Ketu.
    """
    rahu = next((p for p in planets if p["name"] == "Rahu"), None)
    ketu = next((p for p in planets if p["name"] == "Ketu"), None)
    if not rahu or not ketu:
        return {"present": False, "type": "None", "message": "Rahu/Ketu not found."}
    
    r_lon = rahu["fullDegree"]
    k_lon = ketu["fullDegree"]
    
    other_names = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]
    others = [p for p in planets if p["name"] in other_names]
    
    in_first_half = True
    in_second_half = True
    
    for p in others:
        norm_lon = (p["fullDegree"] - r_lon) % 360
        if not (0 <= norm_lon <= 180):
            in_first_half = False
        if not (180 <= norm_lon <= 360):
            in_second_half = False
            
    present = in_first_half or in_second_half
    
    if present:
        rahu_house = rahu.get("house", 1)
        types = {
            1: "Anant Kaal Sarp Dosha",
            2: "Kulik Kaal Sarp Dosha",
            3: "Vasuki Kaal Sarp Dosha",
            4: "Shankhpal Kaal Sarp Dosha",
            5: "Padam Kaal Sarp Dosha",
            6: "Mahapadam Kaal Sarp Dosha",
            7: "Takshak Kaal Sarp Dosha",
            8: "Karkotak Kaal Sarp Dosha",
            9: "Shankhchood Kaal Sarp Dosha",
            10: "Ghatak Kaal Sarp Dosha",
            11: "Vishdhar Kaal Sarp Dosha",
            12: "Sheshnaag Kaal Sarp Dosha"
        }
        dosha_type = types.get(rahu_house, "Kaal Sarp Dosha")
        return {
            "present": True,
            "type": dosha_type,
            "message": f"Kaal Sarp Dosha ({dosha_type}) is present. All planets are hemmed between Rahu (House {rahu_house}) and Ketu."
        }
    else:
        return {
            "present": False,
            "type": "None",
            "message": "Kaal Sarp Dosha is not present in your chart."
        }


def calculate_mangal_dosha(planets: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Calculate Mangal Dosha (Lagna-based Kuja Dosha) locally.
    Active if Mars is in 1st, 2nd, 4th, 7th, 8th, or 12th house.
    """
    mars = next((p for p in planets if p["name"] == "Mars"), None)
    if not mars:
        return {"present": False, "mangal_dosha_type": "Non-Manglik", "message": "Mars not found."}
    
    house = mars.get("house", 1)
    manglik_houses = [1, 2, 4, 7, 8, 12]
    
    if house in manglik_houses:
        sign = mars.get("sign", "")
        is_debilitated = (sign == "Cancer")
        
        msg = f"Mangal Dosha is present because Mars is placed in your {house} House."
        if is_debilitated:
            msg += " Since Mars is in Cancer (its sign of debilitation), the intensity of the Dosha is modified."
            
        return {
            "present": True,
            "mangal_dosha_type": "Manglik" if house != 2 else "Partial Manglik",
            "house": house,
            "message": msg
        }
    else:
        return {
            "present": False,
            "mangal_dosha_type": "Non-Manglik",
            "message": "Mars is placed in a favorable house. You do not have Mangal Dosha."
        }


def calculate_pitru_dosha(planets: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Calculate Pitru Dosha indicators locally based on conjunctions and 9th house placements.
    """
    sun = next((p for p in planets if p["name"] == "Sun"), None)
    moon = next((p for p in planets if p["name"] == "Moon"), None)
    rahu = next((p for p in planets if p["name"] == "Rahu"), None)
    ketu = next((p for p in planets if p["name"] == "Ketu"), None)
    saturn = next((p for p in planets if p["name"] == "Saturn"), None)
    
    reasons = []
    if sun and rahu and sun.get("house") == rahu.get("house"):
        reasons.append("Sun conjunct Rahu (Solar Eclipse configuration)")
    if sun and ketu and sun.get("house") == ketu.get("house"):
        reasons.append("Sun conjunct Ketu")
    if moon and rahu and moon.get("house") == rahu.get("house"):
        reasons.append("Moon conjunct Rahu (Lunar Eclipse configuration)")
    if moon and ketu and moon.get("house") == ketu.get("house"):
        reasons.append("Moon conjunct Ketu")
        
    for p in [rahu, ketu, saturn]:
        if p and p.get("house") == 9:
            reasons.append(f"{p['name']} placed in the 9th House of lineage")
            
    if len(reasons) > 0:
        return {
            "present": True,
            "reasons": reasons,
            "message": f"Pitru Dosha is indicated in your chart due to: {', '.join(reasons)}."
        }
    else:
        return {
            "present": False,
            "message": "No major Pitru Dosha indicators are found in your chart."
        }


def calculate_gand_mool(planets: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Calculate Gand Mool Nakshatra (ruling by Ketu or Mercury) locally.
    """
    moon = next((p for p in planets if p["name"] == "Moon"), None)
    if not moon:
        return {"present": False, "message": "Moon not found."}
    
    nak = moon.get("nakshatra", "")
    gand_mool_naks = ["Ashwini", "Ashlesha", "Magha", "Jyeshtha", "Mula", "Revati"]
    
    if nak in gand_mool_naks:
        lord = "Ketu" if nak in ["Ashwini", "Magha", "Mula"] else "Mercury"
        pada = moon.get("nakshatra_pada", 1)
        return {
            "present": True,
            "nakshatra": nak,
            "ruler": lord,
            "pada": pada,
            "message": f"Gand Mool Nakshatra is active because your Moon is in {nak} (ruled by {lord}) in Pada {pada}."
        }
    else:
        return {
            "present": False,
            "message": f"Your birth Nakshatra ({nak}) is not a Gand Mool Nakshatra."
        }