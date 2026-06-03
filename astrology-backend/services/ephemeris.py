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

            # Whole-Sign house placement
            p_sign_idx = ZODIAC_SIGNS.index(details["sign"])
            p_sign_num = p_sign_idx + 1
            asc_sign_idx = ZODIAC_SIGNS.index(asc_details["sign"])
            asc_sign_num = asc_sign_idx + 1
            house_placement = ((p_sign_num - asc_sign_num + 12) % 12) + 1

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
        
        # Whole-Sign house placement for Ketu
        ketu_sign_idx = ZODIAC_SIGNS.index(ketu_details["sign"])
        ketu_sign_num = ketu_sign_idx + 1
        asc_sign_idx = ZODIAC_SIGNS.index(asc_details["sign"])
        asc_sign_num = asc_sign_idx + 1
        ketu_house = ((ketu_sign_num - asc_sign_num + 12) % 12) + 1

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


# ─────────────────────────────────────────────────────────────────────────────
# DIVISIONAL CHART COMPUTATION (Shodashvarga)
# All formulas follow classical Parashari Vedic Astrology rules.
# ─────────────────────────────────────────────────────────────────────────────

def _get_divisional_sign(full_degree: float, divisor: int, chart_type: str) -> int:
    """
    Compute the sign number (1–12) for a planet in a divisional chart.
    Uses Parashari Varga formulas.
    
    Args:
        full_degree: Sidereal longitude (0–360°)
        divisor: Number of divisions (4, 7, 9, 10, 30, etc.)
        chart_type: e.g. "D4", "D7", "D9", "D10", "D30"
    
    Returns:
        Sign number 1–12 in the divisional chart.
    """
    sign_idx = int(full_degree // 30)   # 0–11 (which natal sign, 0=Aries)
    deg_in_sign = full_degree % 30       # 0–30° within the sign

    if chart_type == "D9":
        # Each sign divided into 9 parts of 3°20' each
        # Navamsha: mapping by triplicity — Fire/Earth/Air/Water sign groups
        pada = int(deg_in_sign // (30.0 / 9))  # 0–8
        fire_signs   = [0, 4, 8]   # Aries, Leo, Sagittarius
        earth_signs  = [1, 5, 9]   # Taurus, Virgo, Capricorn
        air_signs    = [2, 6, 10]  # Gemini, Libra, Aquarius
        water_signs  = [3, 7, 11]  # Cancer, Scorpio, Pisces
        if sign_idx in fire_signs:
            start_sign = 0  # Aries
        elif sign_idx in earth_signs:
            start_sign = 9  # Capricorn
        elif sign_idx in air_signs:
            start_sign = 6  # Libra
        else:
            start_sign = 3  # Cancer
        return ((start_sign + pada) % 12) + 1

    elif chart_type == "D10":
        # Each sign divided into 10 parts of 3° each
        part = int(deg_in_sign // 3)  # 0–9
        # Odd signs start from own sign, even signs start from 9th sign from it
        if sign_idx % 2 == 0:  # Odd signs (1,3,5,7,9,11 → index 0,2,4,6,8,10)
            start_sign = sign_idx
        else:                   # Even signs (2,4,6,8,10,12 → index 1,3,5,7,9,11)
            start_sign = (sign_idx + 8) % 12  # 9th sign from it
        return ((start_sign + part) % 12) + 1

    elif chart_type == "D4":
        # Each sign divided into 4 parts of 7°30' each
        part = int(deg_in_sign // 7.5)  # 0–3
        # Fixed (Sthira) signs: start from own sign
        # Movable (Chara) signs: start from own sign
        # Common (Dwisvabhava) signs: start from 9th from own sign
        movable  = [0, 3, 6, 9]    # Aries, Cancer, Libra, Capricorn
        fixed    = [1, 4, 7, 10]   # Taurus, Leo, Scorpio, Aquarius
        # For D4: Movable → Aries cycle, Fixed → Cancer cycle, Common → Libra cycle
        if sign_idx in movable:
            start_sign = 0   # Aries
        elif sign_idx in fixed:
            start_sign = 3   # Cancer
        else:
            start_sign = 6   # Libra
        return ((start_sign + part) % 12) + 1

    elif chart_type == "D7":
        # Each sign divided into 7 parts of 4°17'8.6" each (~4.2857°)
        part = int(deg_in_sign // (30.0 / 7))  # 0–6
        # Odd signs: start from own sign; Even signs: start from 7th sign
        if sign_idx % 2 == 0:  # Odd signs (index 0,2,4,6,8,10)
            start_sign = sign_idx
        else:                   # Even signs (index 1,3,5,7,9,11)
            start_sign = (sign_idx + 6) % 12  # 7th sign from it
        return ((start_sign + part) % 12) + 1

    elif chart_type == "D30":
        # Each sign divided into 5 unequal parts (Trimsamsa)
        # Odd signs: 5°,5°,8°,7°,5° → rulers: Mars,Saturn,Jupiter,Mercury,Venus
        # Even signs: 5°,7°,8°,5°,5° → rulers: Venus,Mercury,Jupiter,Saturn,Mars
        # The D30 sign is determined by the ruling planet's sign(s)
        ODD_BOUNDARIES  = [5, 10, 18, 25, 30]   # Mars, Saturn, Jupiter, Mercury, Venus
        EVEN_BOUNDARIES = [5, 12, 20, 25, 30]   # Venus, Mercury, Jupiter, Saturn, Mars
        ODD_PLANET_SIGNS  = [1, 10, 9, 3, 2]    # Mars=Aries/Scorpio→1, Saturn=Capricorn→10...
        EVEN_PLANET_SIGNS = [2, 6, 12, 11, 8]   # Venus=Taurus→2, Mercury=Virgo→6...
        
        if sign_idx % 2 == 0:  # Odd signs
            bounds   = ODD_BOUNDARIES
            p_signs  = ODD_PLANET_SIGNS
        else:                   # Even signs
            bounds   = EVEN_BOUNDARIES
            p_signs  = EVEN_PLANET_SIGNS
        
        for i, boundary in enumerate(bounds):
            if deg_in_sign < boundary:
                return p_signs[i]
        return p_signs[-1]

    else:
        # Generic formula: divide sign into N equal parts, count from own sign
        part = int(deg_in_sign // (30.0 / divisor))
        return ((sign_idx * divisor + part) % 12) + 1


def compute_divisional_chart(
    planets: List[Dict[str, Any]],
    ascendant: Dict[str, Any],
    chart_type: str,
) -> Dict[str, Any]:
    """
    Compute a complete Varga (divisional) chart from natal planet longitudes.
    
    Supported chart_types: "D4", "D7", "D9", "D10", "D30"
    Also supports:
        "chandra" — Moon as Ascendant (Moon chart)
        "surya"   — Sun as Ascendant (Sun chart)
    
    Returns a dict with:
        - "ascendant": {"sign": str, "sign_num": int}
        - "planets": list of {"name", "sign", "sign_num", "house", "fullDegree", "isRetrograde"}
        - "chart_type": the input chart_type
    """
    divisor_map = {"D4": 4, "D7": 7, "D9": 9, "D10": 10, "D30": 30}

    # ── Special cases: Chandra / Surya Kundali ───────────────────────────────
    if chart_type in ("chandra", "surya"):
        # Find the reference planet (Moon or Sun)
        ref_name = "Moon" if chart_type == "chandra" else "Sun"
        ref_planet = next((p for p in planets if p["name"] == ref_name), None)
        if not ref_planet:
            return {"chart_type": chart_type, "ascendant": {}, "planets": []}

        ref_sign_idx = ZODIAC_SIGNS.index(ref_planet["sign"])  # 0–11
        ref_sign_num = ref_sign_idx + 1                          # 1–12

        chart_planets = []
        for p in planets:
            p_sign_idx = ZODIAC_SIGNS.index(p["sign"])
            p_sign_num = p_sign_idx + 1
            # House = how many signs forward from reference sign
            house_num = ((p_sign_num - ref_sign_num + 12) % 12) + 1
            chart_planets.append({
                "name": p["name"],
                "sign": p["sign"],
                "sign_num": p_sign_num,
                "house": house_num,
                "fullDegree": p.get("fullDegree", 0.0),
                "normDegree": p.get("normDegree", 0.0),
                "isRetrograde": p.get("isRetrograde", "false"),
            })

        return {
            "chart_type": chart_type,
            "ascendant": {
                "sign": ref_planet["sign"],
                "sign_num": ref_sign_num,
            },
            "planets": chart_planets,
        }

    # ── Standard divisional chart ────────────────────────────────────────────
    divisor = divisor_map.get(chart_type, 9)

    # Compute Ascendant in divisional chart
    asc_full_degree = ascendant.get("full_degree") or ascendant.get("fullDegree", 0.0)
    # Reconstruct full degree from sign + normDegree if full_degree missing
    if not asc_full_degree and ascendant.get("sign"):
        sign_idx = ZODIAC_SIGNS.index(ascendant["sign"])
        asc_full_degree = sign_idx * 30 + ascendant.get("degree", ascendant.get("normDegree", 0))
    
    asc_sign_num = _get_divisional_sign(float(asc_full_degree), divisor, chart_type)
    asc_sign     = ZODIAC_SIGNS[asc_sign_num - 1]

    # Compute each planet's divisional sign and house
    chart_planets = []
    for p in planets:
        full_deg = p.get("fullDegree", 0.0)
        div_sign_num = _get_divisional_sign(float(full_deg), divisor, chart_type)
        div_sign     = ZODIAC_SIGNS[div_sign_num - 1]
        # House in divisional chart (whole-sign from divisional ascendant)
        house_num = ((div_sign_num - asc_sign_num + 12) % 12) + 1

        chart_planets.append({
            "name": p["name"],
            "sign": div_sign,
            "sign_num": div_sign_num,
            "house": house_num,
            "fullDegree": full_deg,
            "normDegree": p.get("normDegree", 0.0),
            "isRetrograde": p.get("isRetrograde", "false"),
        })

    return {
        "chart_type": chart_type,
        "ascendant": {
            "sign": asc_sign,
            "sign_num": asc_sign_num,
        },
        "planets": chart_planets,
    }


def compute_gochar_chart(lat: float = 28.6139, lng: float = 77.2090) -> Dict[str, Any]:
    """
    Compute the current Gochar (Transit) chart — real-time planetary positions
    for the current date/time using Swiss Ephemeris.
    
    Returns same format as natal chart (ascendant + planets) but for today's sky.
    """
    try:
        from datetime import timezone as tz
        now_utc = datetime.now(tz.utc)

        jd_now = swe.julday(
            now_utc.year, now_utc.month, now_utc.day,
            now_utc.hour + now_utc.minute / 60.0
        )

        swe.set_sid_mode(swe.SIDM_LAHIRI)
        ayan_val = swe.get_ayanamsa_ut(jd_now)

        # Current ascendant based on a default reference location (Delhi)
        # since we don't have the user's current location here
        try:
            cusps, ascmc = swe.houses(jd_now, lat, lng, b'P')
        except Exception:
            cusps, ascmc = swe.houses(jd_now, lat, lng, b'E')
        
        sidereal_cusps = [0.0] + [(c - ayan_val) % 360.0 for c in cusps]
        sid_asc        = (ascmc[0] - ayan_val) % 360.0
        asc_details    = get_zodiac_details(sid_asc)

        calc_flags = swe.FLG_SWIEPH | swe.FLG_SPEED
        planets    = []

        for name, p_id in PLANET_IDS.items():
            calc_result  = swe.calc_ut(jd_now, p_id, calc_flags)
            position     = calc_result[0]
            tropical_lon = position[0]
            speed        = position[3]
            sidereal_lon = (tropical_lon - ayan_val) % 360.0
            details      = get_zodiac_details(sidereal_lon)
            is_retro     = "true" if speed < 0 else "false"
            house_num    = find_placidus_house(sidereal_lon, sidereal_cusps)

            planets.append({
                "name":         name,
                "fullDegree":   round(sidereal_lon, 4),
                "normDegree":   details["normDegree"],
                "speed":        round(speed, 4),
                "isRetrograde": is_retro,
                "sign":         details["sign"],
                "sign_lord":    details["sign_lord"],
                "house":        house_num,
                "nakshatra":    details["nakshatra"],
                "nakshatra_lord": details["nakshatra_lord"],
                "nakshatra_pada": details["nakshatra_pada"],
            })

        # Ketu = opposite Rahu
        rahu = next(p for p in planets if p["name"] == "Rahu")
        ketu_lon     = (rahu["fullDegree"] + 180.0) % 360.0
        ketu_details = get_zodiac_details(ketu_lon)
        ketu_house   = find_placidus_house(ketu_lon, sidereal_cusps)
        planets.append({
            "name":         "Ketu",
            "fullDegree":   round(ketu_lon, 4),
            "normDegree":   ketu_details["normDegree"],
            "speed":        rahu["speed"],
            "isRetrograde": "true",
            "sign":         ketu_details["sign"],
            "sign_lord":    ketu_details["sign_lord"],
            "house":        ketu_house,
            "nakshatra":    ketu_details["nakshatra"],
            "nakshatra_lord": ketu_details["nakshatra_lord"],
            "nakshatra_pada": ketu_details["nakshatra_pada"],
        })

        logger.info(f"Gochar chart computed: {now_utc.strftime('%Y-%m-%d %H:%M UTC')}")

        return {
            "chart_type": "gochar",
            "computed_at": now_utc.isoformat(),
            "ascendant": {
                "sign":     asc_details["sign"],
                "sign_num": int(sid_asc // 30) + 1,
                "degree":   asc_details["normDegree"],
                "full_degree": round(sid_asc, 4),
            },
            "planets": planets,
        }

    except Exception as e:
        logger.error(f"compute_gochar_chart failed: {e}", exc_info=True)
        return {"chart_type": "gochar", "error": str(e), "ascendant": {}, "planets": []}
    finally:
        swe.close()