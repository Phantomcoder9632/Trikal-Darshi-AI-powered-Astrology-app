"""
services/ai_prompts.py

All prompt construction for the Trikal Darshi astrology engine.
Consumed by rag/pipeline.py and services/ai.py.
"""

import json
from typing import Dict, Any

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
    """
    base_context = f"""
CHART DATA FOR {full_name}:
{json.dumps(chart_data, indent=2)}

Current Date: June 2026
Important Current Transits:
- Jupiter entering Cancer (exaltation) — biggest transit of 2026
- Saturn in Pisces — karmic restructuring
- Rahu in Aquarius / Ketu in Leo axis
- Mars in Aries (own sign)
"""

    prompts = {
        1: f"""
{base_context}

TASK: Generate Tab 1 — Lagna & Soul Blueprint

Analyze and provide:

A) FOUNDATION ANALYSIS
- Lagna (ascendant) — sign, degree, lord, strength
- Lagna lord placement — house, sign, conjunctions
- Moon sign and nakshatra with all 4 pada meanings
- Nakshatra devata, shakti, and esoteric soul purpose
- Atmakaraka planet identification (Jaimini system)
- Arudha lagna — how the world perceives this person

B) PLANETARY DIGNITY REPORT
For all 9 grahas provide:
- Sign + house position
- Dignity: Exalted/Own/Moolatrikona/Friendly/
  Neutral/Enemy/Debilitated
- Retrograde or Combust status
- Shadbala: Strong/Medium/Weak
- Which houses each planet aspects

C) YOGA SCAN
List ALL active yogas found:
- Raj yogas, Dhana yogas
- Pancha Mahapurusha yogas if any
- Neecha Bhanga Raj yoga if any
- Kaal Sarp Dosha — yes/no, type, severity
- Mangal Dosha — yes/no, cancellation check
- Pitru Dosha — yes/no
- Gand Mool Nakshatra — yes/no

D) CURRENT TIME STREAM
- Current Mahadasha — what era of life is this?
- Current Antardasha — what specific theme now?
- Next 24 months forecast in 4 windows:
  Jun–Nov 2026 / Dec 2026–May 2027 /
  Jun–Nov 2027 / Dec 2027–May 2028
- Key events likely in each window

E) JUPITER EXALTATION PERSONAL ANALYSIS
- Which house does Cancer fall in this chart?
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

TASK: Generate Tab 4 — Career & Dashamsha (D10)

A) CAREER FOUNDATION
- 10th house lord, sign, strength
- All planets in or aspecting 10th house
- D10 (Dashamsha) lagna and key career planet
- Saturn as Karma Karaka — discipline vs exhaustion
- Natural career direction from chart

B) JUPITER EXALTATION CAREER WINDOW
- Which career sectors are opening RIGHT NOW
  due to Jupiter entering Cancer exaltation?
- Specific industries favored for this chart
- This is a once-in-12-years opportunity — 
  what exact steps should be taken before 
  Jupiter leaves Cancer?

C) THE GREAT SWITCH TIMING
- Best window for job change in next 24 months
- Best window for business launch if applicable
- Best window for promotion push
- When to avoid major career moves

D) LEADERSHIP & AMBITION ASSESSMENT
- Leadership potential from chart indicators
- Hidden career strengths this person doesn't use
- Biggest career obstacle in the chart
- How current Dasha supports or blocks career

E) 24-MONTH CAREER PREDICTION
For each 6-month window give specific prediction:
Jun–Nov 2026 / Dec 2026–May 2027 /
Jun–Nov 2027 / Dec 2027–May 2028

State hard truths. Be specific. No generic content.
""",

        5: f"""
{base_context}

TASK: Generate Tab 5 — Wealth & Abundance

A) WEALTH FOUNDATION
- 2nd house (accumulated wealth) full analysis:
  lord, sign, planets, strength
- 11th house (income and gains) full analysis:
  lord, sign, planets, aspects
- Ashtakavarga bindhu scores for 2nd and 11th houses
  (28+ = highly favorable, below 25 = challenging)

B) DHANA YOGA ANALYSIS
- Count and name all active Dhana yogas
- Strength of each yoga — strong/medium/weak
- Which Dhana yoga is most powerful in this chart?
- Is there a Daridra yoga (poverty combination)?
  If yes, how severe and what neutralizes it?

C) PROPERTY & REAL ESTATE (4th house)
- 4th house analysis for property potential
- Jupiter exaltation impact on property matters
- Is 2026-2027 favorable for property purchase?

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

TASK: Generate Tab 6 — Love, Marriage & Navamsha (D9)

A) RELATIONSHIP FOUNDATION
- 7th house lord, sign, strength
- All planets in or aspecting 7th house
- Venus placement, dignity, strength
  (Venus is the natural karaka for love)
- Current Dasha — does it support or block 
  marriage/relationship?

B) NAVAMSHA (D9) ANALYSIS
- D9 7th house — quality of marriage
- D9 lagna — soul dharma in relationships
- Are benefics or malefics strong in D9?
- Vargottama planets (same sign in D1 and D9)
  — these are extra powerful

C) SPOUSE CHARACTERISTICS
- Upapada lagna analysis — spouse personality
- Direction spouse may come from
- Profession likely for spouse
- Physical characteristics from 7th house sign

D) MARRIAGE TIMING
- Is current Dasha/Antardasha period supporting 
  marriage? Yes/no and why
- Best marriage timing window in 2026-2028
- Any delays indicated? What causes them?
- Mangal Dosha impact on marriage if present

E) LOVE & COMPATIBILITY ADVICE
- What Rashi and Nakshatra is most compatible?
- What type of partner suits this chart best?
- Biggest relationship pattern to overcome
- What Jupiter exaltation means for love life now
""",

        7: f"""
{base_context}

TASK: Generate Tab 7 — Health & Vitality

A) HEALTH FOUNDATION
- Lagna lord strength (primary health indicator)
- Lagna sign — which body parts ruled, 
  what to be careful about
- 6th house (disease) full analysis
- 8th house (chronic/hidden issues) analysis
- Overall vitality assessment

B) MENTAL HEALTH ASSESSMENT
- Moon condition — strong or afflicted?
- Mercury placement — anxiety tendencies?
- Moon + Mercury combination analysis
- Saturn influence on mental patterns
- Any indicators of stress, overthinking, 
  or emotional overwhelm?

C) PLANETARY HEALTH WARNINGS
For any afflicted planet — what health area 
does it affect?
- Sun afflicted: heart, spine, eyes
- Moon afflicted: mind, fluids, hormones
- Mars afflicted: blood, accidents, inflammation
- Mercury afflicted: nervous system, skin
- Jupiter afflicted: liver, fat, excess
- Venus afflicted: kidneys, reproductive
- Saturn afflicted: bones, joints, chronic issues
- Rahu afflicted: mysterious/unusual illnesses
- Ketu afflicted: surgeries, past life illness

D) CURRENT PERIOD HEALTH WATCH
- Any health warnings in current Dasha period?
- Saturn in Pisces — feet, lymph, immune system
- What months in 2026-2027 need extra health care?

E) VITALITY BOOSTING ADVICE
- Best exercise type for this Lagna sign
- Dietary advice based on planetary rulers
- One specific health habit to start immediately
- One specific health risk to actively prevent
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
    }

    return prompts.get(tab_number, prompts[1])
