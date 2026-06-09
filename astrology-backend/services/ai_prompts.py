"""
services/ai_prompts.py

All prompt construction for the Trikal Darshi astrology engine.
Consumed by rag/pipeline.py and services/ai.py.
"""

import json
from typing import Dict, Any, List

# ---------------------------------------------------------------------------
# Master system prompt
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """
You are a Trikal Darshi Cosmic Architect — a rare master 
who has simultaneously mastered three ancient systems:
1. Vedic Jyotish Acharya trained in Parashari and Jaimini 
   systems using Bengal tradition
2. Lal Kitab Visheshagya specialist in Rin and karmic 
   debt analysis
3. Numerology Pandit in Chaldean and Vedic Ankjyotish

Rules:
- NEVER hallucinate planetary positions. 
  Use ONLY the chart data provided to you.
- For all planetary references in your text, always write the planet's name using its Sanskrit abbreviation/name followed by the English name in parentheses to match the visual chart:
  * Sun -> Surya/Su (Sun)
  * Moon -> Chandra/Ch (Moon)
  * Mars -> Mangal/Ma (Mars)
  * Mercury -> Budh/Bu (Mercury)
  * Jupiter -> Guru/Gu (Jupiter)
  * Venus -> Shukra/Sk (Venus)
  * Saturn -> Shani/Sa (Saturn)
  * Rahu -> Rahu/Ra (Rahu)
  * Ketu -> Ketu/Ke (Ketu)
  Example format: "Budh/Bu (Mercury)", "Guru/Gu (Jupiter)".
- Be specific and anchor everything to the chart data.
- Be honest. State hard truths with compassion.
- Do not give generic horoscope content.
- Use North Indian chart convention throughout.
- Chitrapaksha ayanamsha, IST timezone baseline.
- This is a North Indian Bengali man's chart.
- The REFERENCE TEXTS from classical shastras are your
  primary knowledge source. Quote and apply them directly.
"""

# ---------------------------------------------------------------------------
# Tab prompt builder
# ---------------------------------------------------------------------------

def build_tab_prompt(
    chart_data: Dict[str, Any],
    tab_number: int,
    full_name: str,
) -> str:
    """
    Build the full tab-specific user prompt (without RAG context).
    RAG context is prepended separately by rag/pipeline.py.
    Each tab receives its relevant divisional chart(s) extracted from chart_data.
    """

    # ── Helper: extract divisional chart as compact text ──────────────────
    def _div_json(key: str, label: str) -> str:
        data = chart_data.get(key)
        if not data:
            return f"{label}: N/A"
        planets = data.get("planets", [])
        asc = data.get("ascendant", {})
        asc_sign = asc.get("sign", "?")
        planet_lines: List[str] = []
        for p in (planets if isinstance(planets, list) else []):
            if isinstance(p, dict):
                name  = p.get("name", p.get("planet", ""))
                sign  = p.get("sign", "")
                house = p.get("house", "")
                retro = "(R)" if p.get("retrograde") else ""
                planet_lines.append(f"{name}:{sign} H{house} {retro}".strip())
        planets_txt = ", ".join(planet_lines) if planet_lines else "N/A"
        return f"{label} | Asc:{asc_sign} | {planets_txt}"

    # ── Compact plain-text chart summary (saves ~1000+ tokens vs JSON) ──────
    def _chart_summary() -> str:
        lines: List[str] = []

        # Ascendant
        asc = chart_data.get("ascendant", {})
        lagna_sign = asc.get("sign", "?")
        lagna_deg  = asc.get("degree", "")
        lines.append(f"Lagna: {lagna_sign} {lagna_deg}°".strip())

        # Planets
        planets = chart_data.get("planets", [])
        if isinstance(planets, list) and planets:
            p_parts: List[str] = []
            for p in planets:
                if not isinstance(p, dict):
                    continue
                name  = p.get("name", p.get("planet", ""))
                sign  = p.get("sign", "")
                house = p.get("house", "")
                deg   = p.get("degree", "")
                retro = "(R)" if p.get("retrograde") else ""
                combust = "(C)" if p.get("combust") else ""
                naksh = p.get("nakshatra", "")
                pada  = p.get("pada", "")
                extra = f" nak:{naksh}/{pada}" if naksh else ""
                p_parts.append(f"{name}:{sign} H{house} {deg}° {retro}{combust}{extra}".strip())
            lines.append("Planets: " + " | ".join(p_parts))

        # Dasha
        maha  = chart_data.get("current_dasha",      chart_data.get("mahadasha", ""))
        antar = chart_data.get("current_antardasha",  chart_data.get("antardasha", ""))
        pratyantar = chart_data.get("current_pratyantar", "")
        if maha:
            dasha_str = f"Dasha: {maha} > {antar}"
            if pratyantar:
                dasha_str += f" > {pratyantar}"
            lines.append(dasha_str)

        # Yogas (compact list)
        yogas = chart_data.get("yogas", [])
        if isinstance(yogas, list) and yogas:
            yoga_names = [y.get("name", str(y)) if isinstance(y, dict) else str(y) for y in yogas[:10]]
            lines.append("Yogas: " + ", ".join(yoga_names))

        # Precalculated/Vetted Doshas
        # 1. Mangal Dosha
        mangal = chart_data.get("mangal_dosha", {})
        if not mangal and planets:
            try:
                from services.ephemeris import calculate_mangal_dosha
                mangal = calculate_mangal_dosha(planets)
            except Exception:
                pass

        mangal_status = "Unknown"
        mangal_msg = ""
        if isinstance(mangal, dict) and mangal:
            if "mangal_dosha_type" in mangal:
                mangal_status = mangal["mangal_dosha_type"]
            elif "manglik_status" in mangal:
                mangal_status = mangal["manglik_status"]
            elif "present" in mangal:
                mangal_status = "Manglik" if mangal["present"] else "Non-Manglik"
            mangal_msg = mangal.get("message", mangal.get("one_line", ""))
        lines.append(f"Mangal Dosha: {mangal_status} (Details: {mangal_msg})")

        # 2. Kaal Sarp Dosha
        kalsarp = chart_data.get("kalsarp", {})
        if not kalsarp and planets:
            try:
                from services.ephemeris import calculate_kalsarp
                kalsarp = calculate_kalsarp(planets)
            except Exception:
                pass

        kalsarp_status = "No"
        kalsarp_msg = ""
        if isinstance(kalsarp, dict) and kalsarp:
            present = kalsarp.get("present", kalsarp.get("kalsarp_present", False))
            kalsarp_status = f"Yes ({kalsarp.get('type', 'Kaal Sarp')})" if present else "No"
            kalsarp_msg = kalsarp.get("message", kalsarp.get("one_line", ""))
        lines.append(f"Kaal Sarp Dosha: {kalsarp_status} (Details: {kalsarp_msg})")

        # 3. Pitru Dosha
        pitru = chart_data.get("pitru_dosha", {})
        if not pitru and planets:
            try:
                from services.ephemeris import calculate_pitru_dosha
                pitru = calculate_pitru_dosha(planets)
            except Exception:
                pass

        pitru_status = "No"
        pitru_msg = ""
        if isinstance(pitru, dict) and pitru:
            present = pitru.get("present", False)
            pitru_status = "Yes" if present else "No"
            pitru_msg = pitru.get("message", "")
        lines.append(f"Pitru Dosha: {pitru_status} (Details: {pitru_msg})")

        # 4. Gand Mool Nakshatra
        gand = chart_data.get("nakshatra", {}).get("gand_mool", {})
        if not gand and planets:
            try:
                from services.ephemeris import calculate_gand_mool
                gand = calculate_gand_mool(planets)
            except Exception:
                pass
        gand_status = "No"
        gand_msg = ""
        if isinstance(gand, dict):
            present = gand.get("present", False)
            gand_status = "Yes" if present else "No"
            gand_msg = gand.get("message", "")
        lines.append(f"Gand Mool Nakshatra: {gand_status} (Details: {gand_msg})")

        # DOB / birth info
        for field in ("date_of_birth", "birth_date", "dob"):
            val = chart_data.get(field, "")
            if val:
                lines.append(f"DOB: {val}")
                break
        for field in ("birth_time", "time_of_birth"):
            val = chart_data.get(field, "")
            if val:
                lines.append(f"TOB: {val}")
                break
        for field in ("birth_place", "place_of_birth"):
            val = chart_data.get(field, "")
            if val:
                lines.append(f"POB: {val}")
                break

        # Ashtakavarga totals (key houses only)
        ashtak = chart_data.get("ashtakavarga", {})
        if isinstance(ashtak, dict):
            sarv = ashtak.get("sarvashtakavarga", {})
            if isinstance(sarv, dict):
                key_houses = {"2": "2H", "7": "7H", "10": "10H", "11": "11H"}
                av_parts = [f"{lbl}:{sarv[k]}" for k, lbl in key_houses.items() if k in sarv]
                if av_parts:
                    lines.append("SAV: " + " ".join(av_parts))

        return "\n".join(lines)

    base_context = f"""CHART — {full_name}:
{_chart_summary()}

Now (June 2026): Jupiter→Cancer(exalt), Saturn→Pisces, Rahu→Aquarius/Ketu→Leo, Mars→Aries
"""

    # ── Divisional chart snippets for each tab ──────────────────────────────
    d1_asc  = chart_data.get("ascendant", {})
    d1_sign = d1_asc.get("sign", "Unknown")

    prompts = {
        1: f"""
{base_context}

CHANDRA KUNDALI (Moon Chart) DATA:
{_div_json("chandra_kundali", "Chandra Kundali")}

TASK: Generate Tab 1 — Lagna & Soul Blueprint

Analyze BOTH the Lagna (D1) chart AND the Chandra (Moon) chart simultaneously.
Cross-verify all findings between D1 and Chandra Kundali.

A) FOUNDATION ANALYSIS (D1 + Chandra Kundali)
- Lagna (ascendant) — sign, degree, lord, strength in D1
- Lagna lord placement — house, sign, conjunctions in D1
- Moon sign and nakshatra with all 4 pada meanings
- Nakshatra devata, shakti, and esoteric soul purpose
- In Chandra Kundali: Which house does the Lagna fall in? Does this confirm D1 findings?
- Atmakaraka planet identification (Jaimini system)
- Arudha lagna — how the world perceives this person

B) PLANETARY DIGNITY REPORT (D1 Cross-checked with Chandra Kundali)
For all 9 grahas provide:
- Sign + house position in D1
- House position in Chandra Kundali
- Dignity: Exalted/Own/Moolatrikona/Friendly/Neutral/Enemy/Debilitated
- Retrograde or Combust status
- Shadbala: Strong/Medium/Weak
- Which houses each planet aspects

C) YOGA SCAN (D1 primary, Chandra Kundali confirmation)
List ALL active yogas found:
- Raj yogas, Dhana yogas
- Pancha Mahapurusha yogas if any
- Neecha Bhanga Raj yoga if any
- Kaal Sarp Dosha — yes/no, type, severity
- Mangal Dosha — yes/no, cancellation check
- Pitru Dosha — yes/no
- Gand Mool Nakshatra — yes/no
- Cross-check: Do these yogas also manifest in Chandra Kundali?

D) CURRENT TIME STREAM
- Current Mahadasha — what era of life is this?
- Current Antardasha — what specific theme now?
- Next 24 months forecast in 4 windows:
  Jun–Nov 2026 / Dec 2026–May 2027 /
  Jun–Nov 2027 / Dec 2027–May 2028
- Key events likely in each window

E) JUPITER EXALTATION PERSONAL ANALYSIS
- Which house does Cancer fall in D1 chart?
- Which house does Cancer fall in Chandra Kundali?
- What does exalted Jupiter promise for next 13 months?
- What must this person DO to capture this energy?
- What would cause them to WASTE this opportunity?

Be specific. Use only the chart data provided.
State hard truths with compassion.
Do not give generic content.
""",

        2: f"""
{base_context}

TASK: Generate Tab 2 — Lal Kitab Analysis

IMPORTANT: Use Lal Kitab framework only. 
Do NOT mix with Vedic Jyotish interpretations.

A) LAL KITAB KUNDALI READING
- Re-read each planet through Lal Kitab lens
- Identify Pakka Ghar (permanent house) for each planet
- Which planets are in their Pakka Ghar vs displaced?
- Identify all Sleeping Planets (sote hue graha)
- Saturn in Pisces analysis — Lal Kitab implications

B) RIN (KARMIC DEBT) ANALYSIS
Check each Rin — present or not:
- Surya Rin (father/authority debt)
- Chandra Rin (mother/home debt)
- Mangal Rin (siblings/property debt)
- Guru Rin (teacher/wisdom debt)
- Shukra Rin (wife/relationship debt)
- Shani Rin (service/karma debt)
For each ACTIVE Rin:
- What life area is it creating problems in?
- What is the Farmaan (Lal Kitab prescription)?

C) CURRENT PERIOD — LAL KITAB LENS
- Mars in Aries — karmic clearing happening now
- Rahu in Aquarius — government/career implications
- Jupiter entering Cancer — Rin clearance opportunity

D) 5 LAL KITAB FARMAAN REMEDIES
Provide 5 specific genuine Lal Kitab remedies.
For each remedy state:
- Which planet it targets
- Exact action (what to bury/float/donate)
- Day to perform it
- Any behavioral restriction (kya na karein)
""",

        3: f"""
{base_context}

TASK: Generate Tab 3 — Numerology Matrix

Use BOTH Chaldean AND Vedic Ankjyotish systems.

A) CORE NUMBER CALCULATIONS
Show calculation steps clearly:
- Moolank (birth number): single digit of birth date
- Bhagyank (destiny number): sum of full DOB 
  reduced to single digit
- Namank (name number): Chaldean value of full name
- Karmank: 4th number from name analysis
- Ruling planet for each number:
  1=Sun, 2=Moon, 3=Jupiter, 4=Rahu, 5=Mercury,
  6=Venus, 7=Ketu, 8=Saturn, 9=Mars

B) CROSS-SYSTEM VALIDATION
- Does Namank planet match Lagna lord? 
  (harmony or conflict?)
- Does Bhagyank planet match 10th house lord?
  (career alignment check)
- Does Moolank planet match Moon sign lord?
  (emotional nature alignment)
- Any conflicts between number rulers and natal planets?
  Explain tension and how to resolve it

C) 2026 NUMEROLOGY FORECAST
- Personal Year Number for 2026
- Personal Month Number for June 2026
- What themes activate this year?
- Jupiter (number 3) is exalted now — if Moolank 
  or Bhagyank is 3, confirm breakthrough year

D) LUCKY PARAMETERS
- Lucky numbers (primary and secondary)
- Lucky days of week with planetary basis
- Lucky colors with planetary basis
- Favorable years in next 5 years
- Name correction suggestion if Namank conflicts 
  with Moolank or Lagna lord
""",

        4: f"""
{base_context}

D10 DASHAMSHA CHART DATA (Career Divisional Chart):
{_div_json("dashamsha", "D10 Dashamsha")}

TASK: Generate Tab 4 — Career & Dashamsha (D10)

Analyze BOTH the D1 natal chart AND the D10 Dashamsha simultaneously.
The D10 chart is the PRIMARY tool for career analysis.

A) CAREER FOUNDATION (D1 + D10 Cross-Analysis)
- 10th house lord, sign, strength in D1
- All planets in or aspecting 10th house in D1
- D10 Dashamsha lagna — what career personality does it reveal?
- D10 10th house — the true calling from the divisional lens
- Strongest planet in D10 — this defines professional destiny
- Saturn as Karma Karaka — discipline vs exhaustion (D1 + D10)
- Natural career direction from D1 + D10 combined

B) JUPITER EXALTATION CAREER WINDOW
- Which career sectors are opening RIGHT NOW
  due to Jupiter entering Cancer exaltation in D1?
- What does Jupiter's position mean in the D10 chart?
- Specific industries favored for this chart
- This is a once-in-12-years opportunity — 
  what exact steps should be taken before 
  Jupiter leaves Cancer?

C) THE GREAT SWITCH TIMING (D1 Dasha + D10 analysis)
- Best window for job change in next 24 months
- Best window for business launch if applicable
- Best window for promotion push
- When to avoid major career moves

D) LEADERSHIP & AMBITION ASSESSMENT
- Leadership potential from D1 and D10 indicators
- Hidden career strengths this person doesn't use
- Biggest career obstacle shown in D10
- How current Dasha supports or blocks career

E) 24-MONTH CAREER PREDICTION (D1 + D10 lens)
For each 6-month window give specific prediction:
Jun–Nov 2026 / Dec 2026–May 2027 /
Jun–Nov 2027 / Dec 2027–May 2028

State hard truths. Be specific. No generic content.
""",

        5: f"""
{base_context}

D4 CHATURTHAMSA CHART DATA (Property & Assets Divisional Chart):
{_div_json("chaturthamsa", "D4 Chaturthamsa")}

TASK: Generate Tab 5 — Wealth & Abundance

Analyze BOTH the D1 natal chart AND the D4 Chaturthamsa.
D4 is the PRIMARY tool for property and fixed asset analysis.

A) WEALTH FOUNDATION (D1 Primary)
- 2nd house (accumulated wealth) full analysis:
  lord, sign, planets, strength in D1
- 11th house (income and gains) full analysis:
  lord, sign, planets, aspects in D1
- Ashtakavarga bindhu scores for 2nd and 11th houses
  (28+ = highly favorable, below 25 = challenging)

B) D4 CHATURTHAMSA ANALYSIS (Property & Fixed Assets)
- D4 Lagna — what type of property/assets are destined?
- D4 4th house — will the native own property? Strength?
- D4 key planets — what do they say about inheritance, land, vehicles?
- Is 2026–2027 favorable for property acquisition per D4?
- Compare D1 4th house with D4 4th house — do they agree?

C) DHANA YOGA ANALYSIS (D1)
- Count and name all active Dhana yogas
- Strength of each yoga — strong/medium/weak
- Which Dhana yoga is most powerful in this chart?
- Is there a Daridra yoga (poverty combination)?
  If yes, how severe and what neutralizes it?

D) WEALTH BUILDING WINDOWS 2026-2028
- Specific best months to invest
- Specific best months to save
- Specific months to AVOID financial risk
- What type of income source suits this chart best?
  (job/business/investments/creative work)

E) HARD TRUTHS ABOUT MONEY
- Biggest wealth-blocking pattern in this chart
- Hidden financial strength not being utilized
- One specific action to take before Dec 2026
  to activate the Jupiter exaltation wealth window
""",

        6: f"""
{base_context}

D9 NAVAMSHA CHART DATA (Marriage & Soul Dharma):
{_div_json("navamsha", "D9 Navamsha")}

D7 SAPTAMSHA CHART DATA (Progeny & Relationships):
{_div_json("saptamsha", "D7 Saptamsha")}

TASK: Generate Tab 6 — Love, Marriage & Navamsha (D9)

Analyze D1 + D9 Navamsha + D7 Saptamsha simultaneously.

A) RELATIONSHIP FOUNDATION (D1)
- 7th house lord, sign, strength in D1
- All planets in or aspecting 7th house in D1
- Venus placement, dignity, strength
  (Venus is the natural karaka for love)
- Current Dasha — does it support or block 
  marriage/relationship?

B) NAVAMSHA (D9) DEEP ANALYSIS
- D9 Lagna — the soul's dharma in relationships
- D9 7th house lord and sign — quality of marriage destiny
- Are benefics or malefics dominant in D9?
- Vargottama planets (same sign in D1 and D9) — extra powerful
- Venus in D9 — marital happiness indicator
- Moon in D9 — emotional fulfillment in marriage

C) SPOUSE CHARACTERISTICS (D1 + D9)
- Upapada lagna analysis (D1) — spouse personality
- D9 7th house — what does the soul-level spouse look like?
- Direction spouse may come from
- Profession likely for spouse
- Physical characteristics from 7th house sign in D9

D) MARRIAGE TIMING (D1 Dasha + D9 confirmation)
- Is current Dasha/Antardasha period supporting 
  marriage? Yes/no and why
- Best marriage timing window in 2026-2028
- Any delays indicated? What causes them?
- Mangal Dosha impact on marriage if present
- Does D9 confirm or contradict D1 marriage timing?

E) LOVE & COMPATIBILITY ADVICE
- What Rashi and Nakshatra is most compatible?
- What type of partner suits D1 + D9 best?
- Biggest relationship pattern to overcome
- What Jupiter exaltation means for love life now
- Brief D7 Saptamsha note: children prospects in this chart
""",

        7: f"""
{base_context}

D30 TRIMSAMSA CHART DATA (Health, Afflictions & Misfortunes):
{_div_json("trimsamsa", "D30 Trimsamsa")}

SURYA KUNDALI (Sun Chart) DATA:
{_div_json("surya_kundali", "Surya Kundali")}

TASK: Generate Tab 7 — Health & Vitality

Analyze D1 natal chart + D30 Trimsamsa + Surya Kundali.
D30 is the PRIMARY tool for disease prediction.

A) HEALTH FOUNDATION (D1 + D30 Cross-Analysis)
- Lagna lord strength (primary health indicator in D1)
- Lagna sign — which body parts ruled, what to be careful about
- 6th house (disease) full analysis in D1
- 8th house (chronic/hidden issues) analysis in D1
- D30 Trimsamsa lagna — this reveals predisposition to diseases
- Afflicted planets in D30 — these are chronic/serious health warnings
- Surya Kundali 6th and 8th house — confirms/reveals health patterns

B) MENTAL HEALTH ASSESSMENT (D1 + D30)
- Moon condition in D1 — strong or afflicted?
- Moon in D30 — emotional/psychological afflictions?
- Mercury placement — anxiety tendencies in D1 and D30?
- Saturn influence on mental patterns (D1 + Surya Kundali)
- Any indicators of stress, overthinking, or emotional overwhelm?

C) PLANETARY HEALTH WARNINGS (D30 Primary + D1 confirmation)
For any afflicted planet in D30 — what health area does it affect?
- Sun afflicted: heart, spine, eyes
- Moon afflicted: mind, fluids, hormones
- Mars afflicted: blood, accidents, inflammation
- Mercury afflicted: nervous system, skin
- Jupiter afflicted: liver, fat, excess
- Venus afflicted: kidneys, reproductive
- Saturn afflicted: bones, joints, chronic issues
- Rahu afflicted: mysterious/unusual illnesses
- Ketu afflicted: surgeries, past life illness
Compare D30 afflictions with D1 to gauge severity.

D) CURRENT PERIOD HEALTH WATCH
- Any health warnings in current Dasha period?
- Saturn in Pisces — feet, lymph, immune system
- What months in 2026–2027 need extra health care?
- Based on D30 afflictions — what is the top urgent health concern?

E) VITALITY BOOSTING ADVICE
- Best exercise type for this Lagna sign
- Dietary advice based on planetary rulers (Surya Kundali for Sun-ruled vitality)
- One specific health habit to start immediately
- One specific health risk to actively prevent (from D30 warning)
""",

        8: f"""
{base_context}

TASK: Generate Tab 8 — Remedies (Tripath System)

Provide remedies in THREE completely separate tracks.
NEVER mix tracks. Each is a distinct system.

TRACK 1 — VEDIC JYOTISH UPAYAS
Identify the 2 most problematic planets in this chart.
For each planet provide:

MANTRA:
- Exact mantra text
- Count: 108x daily or weekly
- Best day and time to chant
- Duration: how many days/weeks

GEMSTONE:
- Which gemstone
- Which metal to set in
- Which finger to wear on
- Which day to wear first
- Minimum weight in ratti
- Any contraindications

DANA (CHARITY):
- What to donate
- To whom (which type of person/place)
- On which day of week

FASTING:
- Which day to fast
- What to eat/avoid on fast day

TRACK 2 — LAL KITAB FARMAAN
5 specific genuine Lal Kitab remedies.
These must be practical and non-ritualistic.
For each:
- Target planet
- Exact action required
- Day to perform
- Duration
- Behavioral restriction if any (kya na karein)

TRACK 3 — NUMEROLOGY CORRECTIONS
- Name spelling adjustment if needed
  (which letter to add/modify, what it changes)
- Lucky color to wear on specific days
  (one color per day of week based on planet)
- Number-based affirmation or meditation practice
- Lucky number grid suggestion for wallet or home
- Best days this month to start new things
  based on personal numbers
""",

        9: f"""
{base_context}

D7 SAPTAMSHA CHART DATA (Progeny, Children & Creative Legacy):
{_div_json("saptamsha", "D7 Saptamsha")}

D9 NAVAMSHA DATA (for relationship cross-reference):
{_div_json("navamsha", "D9 Navamsha")}

TASK: Generate Tab 9 — Progeny, Lineage & Saptamsha (D7)

Analyze D7 Saptamsha as the PRIMARY chart alongside D1.
D7 governs children, progeny, creative output, and legacy.

A) D7 SAPTAMSHA FOUNDATION
- D7 Lagna — the progeny personality and type of offspring destined
- D7 5th house — this is the PRIMARY house of children in D7
- D7 5th house lord and its placement — children fortune?
- Jupiter's position in D7 (Jupiter = natural karaka for children)
- Any malefic planets afflicting D7 5th house?

B) CHILDREN PROSPECTS (D1 + D7 Cross-Analysis)
- D1 5th house: lord, sign, planets — natal children promise
- D1 Jupiter: dignity, placement — how strong is the karaka?
- D7 5th house confirms D1 — do they agree or contradict?
- Putrakaraka (Jaimini) — the atmakaraka for progeny
- Are there any obstructions to children?
  (Ketu in D7 5th, Saturn aspects, afflictions)
- What specific remedies can activate children promise?

C) TIMING OF CHILDREN
- Current Dasha period — does it support progeny?
- Best Dasha/Antardasha windows for conception 2026–2028
- Does Jupiter's transit into Cancer (exaltation) 2026 
  trigger the 5th house in D1 or D7?
- Are 2026–2027 favorable years for starting a family?

D) CREATIVE LEGACY & LINEAGE
- 5th house also rules creativity and intelligence
- What creative abilities does this chart carry?
- D7 legacy indicators — will the native leave a strong lineage?
- Artistic or intellectual talents from 5th house planets

E) REMEDIES FOR PROGENY (if obstacles exist)
- Specific Vedic upayas for Jupiter (children karaka)
- Lal Kitab farmaan for the afflicting planet
- Putra Gopala mantra — how many, when, duration
- What dietary or behavioral changes support progeny karma?

Be specific. Anchor all findings to D7 and D1 chart data.
""",

        10: f"""
{base_context}

REAL-TIME GOCHAR CHART DATA (Current Transit Positions):
{_div_json("gochar", "Gochar (Current Transits)")}

TASK: Generate Tab 10 — Gochar (Current Planetary Transits)

Use the REAL-TIME GOCHAR (transit) chart + natal D1 chart.
Compare current planetary positions against the natal chart.
Transit analysis is the KEY tool for timing predictions.

A) CURRENT TRANSIT OVERVIEW
- List every transiting planet:
  Current sign in transit → Over which natal house does it transit?
- For each planet: Is this transit favorable, challenging, or neutral?
- Most powerful transit of the moment — identify it and explain why

B) JUPITER TRANSIT ANALYSIS (Most Important)
- Jupiter is entering Cancer (exaltation) — which natal house?
- What specific life area does this exalted Jupiter activate?
- Duration of this transit (Jupiter stays ~13 months in a sign)
- Which natal planets does transiting Jupiter aspect?
  (Jupiter aspects 5th, 7th, 9th from its position)
- Predictions: What events will this Jupiter transit trigger?
- Timeline: Month-by-month forecast for Jupiter's journey through this house

C) SATURN TRANSIT ANALYSIS (Sade Sati / Ashtama Check)
- Saturn is in Pisces — over which natal house?
- Is this Sade Sati (Saturn transiting 12th/1st/2nd from Moon)?
- Is this Ashtama Shani (Saturn over natal 8th from Moon)?
- Saturn aspects 3rd, 7th, 10th from its transit position — what do these hit?
- Duration and intensity: How long and how serious?

D) RAHU-KETU TRANSIT ANALYSIS
- Rahu in Aquarius — which natal house? What does this activate?
- Ketu in Leo — which natal house? Past karma/detachment from where?
- Rahu-Ketu axis: What is the karmic lesson axis for the next 18 months?
- Any natal planets conjunct transiting Rahu or Ketu? Significant!

E) MONTHLY TRANSIT FORECAST (Next 6 Months)
Provide a month-by-month forecast:
- June 2026: Key events based on transits
- July 2026: Key events
- August 2026: Key events
- September 2026: Key events
- October 2026: Key events
- November 2026: Key events

F) GOCHARA VEDHA CHECK
- Identify any Vedha (cancellation of transit effects) in this chart
- Are any favorable transits blocked by Vedha planets?
- Final transit strength summary: Overall 2026 forecast rating

Be highly specific. Every prediction must name the transiting planet,
the natal house being activated, and the expected life event.
""",
    }

    return prompts.get(tab_number, prompts[1])
