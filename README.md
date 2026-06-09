<div align="center">

<!-- Animated Banner -->
<img src="https://capsule-render.vercel.app/api?type=venom&color=0:0d0221,50:1a0533,100:2d1b69&height=300&section=header&text=TRIKAL%20DARSHI&fontSize=72&fontAlignY=45&fontColor=d4af37&stroke=c9952a&strokeWidth=2&animation=fadeIn&desc=ॐ%20%20AI-Powered%20Vedic%20Astrology%20%20ॐ&descSize=22&descAlignY=65&descColor=c9b4e8" width="100%" />

<!-- Typing animation -->
<img src="https://readme-typing-svg.demolab.com?font=Cinzel+Decorative&weight=700&size=20&pause=1200&color=D4AF37&background=00000000&center=true&vCenter=true&multiline=false&repeat=true&width=700&height=50&lines=🔮+Your+Cosmic+Blueprint+Awaits...;🪐+10+Divisional+Charts+%7C+AI+Interpreted;⭐+Ancient+Vedic+%2B+Lal+Kitab+%2B+Numerology;🌌+See+Your+Past%2C+Present+%26+Future" alt="Typing Animation" />

<br/><br/>

<!-- Tech Badges -->
<a href="https://reactjs.org/"><img src="https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB"/></a>
<a href="https://fastapi.tiangolo.com/"><img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white"/></a>
<a href="https://www.python.org/"><img src="https://img.shields.io/badge/Python_3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white"/></a>
<a href="https://redis.io/"><img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white"/></a>
<a href="https://www.postgresql.org/"><img src="https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white"/></a>
<img src="https://img.shields.io/badge/AI-Groq%20LLM-6B21A8?style=for-the-badge&logo=openai&logoColor=white"/>
<img src="https://img.shields.io/badge/Swiss_Ephemeris-Precision_Astro-c9952a?style=for-the-badge"/>
<img src="https://img.shields.io/badge/RAG-ChromaDB_+_LangChain-0f4c81?style=for-the-badge&logo=chainlink&logoColor=white"/>

<br/><br/>

<!-- Stats Row -->
<img src="https://img.shields.io/badge/10_Interpretation_Tabs-Active-gold?style=flat-square"/>
<img src="https://img.shields.io/badge/8_Divisional_Charts-Computed-blueviolet?style=flat-square"/>
<img src="https://img.shields.io/badge/27_Nakshatras-Analyzed-darkgreen?style=flat-square"/>
<img src="https://img.shields.io/badge/3_Ancient_Systems-Unified-crimson?style=flat-square"/>

</div>

---

<div align="center">
<img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Travel%20and%20places/Milky%20Way.png" width="50"/>
&nbsp;&nbsp;
<img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Crystal%20Ball.png" width="50"/>
&nbsp;&nbsp;
<img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Sky/Ringed%20Planet.png" width="50"/>
&nbsp;&nbsp;
<img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Sky/Star.png" width="50"/>
&nbsp;&nbsp;
<img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Sky/Full%20Moon.png" width="50"/>
</div>

---

## 🌌 What Is Trikal Darshi?

> *"Trikal" means the three dimensions of time — Past, Present, and Future. "Darshi" means one who sees. Together: **The One Who Sees Across All Time.***

**Trikal Darshi** is not just another horoscope generator. It is a **full-stack cosmic intelligence platform** that fuses **three ancient Indian knowledge systems** with **modern Generative AI** to deliver deeply personalized, chart-grounded life interpretations.

Enter your exact birth details. Watch as the cosmos reveals itself — from your Lagna blueprint to your Gochar transits, from Lal Kitab karma debts to Numerology soul numbers. Every reading is anchored to **your exact planetary positions**, not generic sun-sign content.

<div align="center">

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│   🕉️  VEDIC JYOTISH  +  📖 LAL KITAB  +  🔢 NUMEROLOGY   │
│                            │                               │
│                            ▼                               │
│           ┌──────────────────────────────┐                 │
│           │    Swiss Ephemeris Engine    │                 │
│           │  (Precision to arc-seconds)  │                  │
│           └──────────────┬───────────────┘                 │
│                          │                                 │
│              ┌───────────▼──────────┐                      │
│              │   RAG + Groq LLM     │                      │
│              │  (Classical Shastras │                      │
│              │   as knowledge base) │                      │
│              └───────────┬──────────┘                      │
│                          │                                 │
│         ┌────────────────▼───────────────┐                 │
│         │   10-Tab Personalized Reading  │                 │
│         └────────────────────────────────┘                 │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

</div>

---

## 🚀 Recent Key Enhancements

Here are the latest architectural and visual updates implemented for maximum reliability and Vedic consistency:

* **AI Hallucination & RAG Personalization Fix**: Corrected the background RAG generation pipeline to properly pass the user's specific `chart_data` to the vector store instead of generic queries, eliminating AI hallucinations related to planetary placements.
* **Enhanced AI API Fallback Durability**: Increased connection timeouts from 10s to 60s for both primary and fallback APIs to prevent premature termination, and improved the system's resilience when navigating rate limits across free-tier models (Gemini, OpenRouter).
* **Explicit Dosha Fallback Calculations**: Enforced explicit local calculations for Mangal Dosha, Kaal Sarp Dosha, and Pitru Dosha prior to RAG generation to ensure the AI never receives an "Unknown" status that could trigger hallucinated interpretations.
* **Robust Multi-Stage Fallback Cascade**: Upgraded the fallback RAG pipeline to try multiple OpenRouter free models sequentially (`meta-llama/llama-3.3-70b-instruct:free`, `google/gemma-3-27b-it:free`, `meta-llama/llama-3-8b-instruct:free`, and `openrouter/free`) in case of upstream rate-limiting or service unavailability.
* **Unified Vedic Whole-Sign House System**: Replaced the Western Placidus house placement calculations for planets in both local Swiss Ephemeris (`ephemeris.py`) and API reconciliation engine (`hybrid.py`) with the standard Vedic Whole-Sign house mapping relative to the Lagna, eliminating data contradictions (such as Rahu in Aries H12 instead of H1).
* **Corrected North Indian SVG Layouts**: Fixed a clockwise visual rendering bug in both [`DivisionalChart.jsx`](file:///d:/AstrologyApp/astrology-frontend/src/components/DivisionalChart.jsx) and [`KundaliChart.jsx`](file:///d:/AstrologyApp/astrology-frontend/src/components/KundaliChart.jsx) by swapping the SVG coordinates of houses 2–12 back to the traditional counter-clockwise North Indian sequence.
* **Bilingual Planet Naming in AI Reports**: Updated `SYSTEM_PROMPT` rules to enforce bilingual planetary references in generated AI interpretations (e.g. `Budh/Bu (Mercury)`, `Guru/Gu (Jupiter)`) to match the visual Sanskrit abbreviations shown in the SVG chart nodes.

---

## ✨ Feature Showcase

<details open>
<summary><b>🔮 Tab 1 — Lagna & Soul Blueprint</b></summary>

The **foundational reading** — your cosmic identity card. This tab simultaneously analyzes your **Lagna (D1) chart** and the **Chandra Kundali (Moon Chart)** to cross-verify every finding.

| Section | What You Get |
|---|---|
| **Foundation Analysis** | Lagna sign, degree, lord strength, Moon nakshatra with all 4 pada meanings, Atmakaraka (Jaimini), Arudha Lagna |
| **Planetary Dignity Report** | All 9 grahas — sign, house, exalted/debilitated/retrograde/combust status, Shadbala rating, aspect map |
| **Yoga Scan** | Raj Yogas, Dhana Yogas, Pancha Mahapurusha, Kaal Sarp Dosha, Mangal Dosha, Pitru Dosha, Gand Mool |
| **Current Time Stream** | Mahadasha + Antardasha analysis, 24-month forecast in 4 windows |
| **Jupiter Exaltation Analysis** | Personal impact of the biggest transit of 2026 on your specific chart |

</details>

<details>
<summary><b>📖 Tab 2 — Lal Kitab Analysis</b></summary>

The **karmic debt reader** — using Lal Kitab exclusively (never mixed with Vedic). Identifies which of the six **Rin (debts)** are active in your life and exactly how to clear them.

| Section | What You Get |
|---|---|
| **Lal Kitab Kundali** | Pakka Ghar (permanent house) for each planet, Sleeping Planets identification |
| **Rin Analysis** | Surya Rin, Chandra Rin, Mangal Rin, Guru Rin, Shukra Rin, Shani Rin — active or not + life impact |
| **Farmaan Remedies** | 5 specific Lal Kitab prescriptions — what to bury/float/donate, which day, behavioral restrictions |
| **Current Transit Lens** | Mars in Aries, Rahu in Aquarius, Jupiter in Cancer — Lal Kitab implications specifically |

</details>

<details>
<summary><b>🔢 Tab 3 — Numerology Matrix</b></summary>

**Dual-system numerology** using both Chaldean and Vedic Ankjyotish. Not just lucky numbers — a full cross-validation with your natal chart.

| Number | What It Reveals |
|---|---|
| **Moolank** (Birth Number) | Core personality, ruling planet |
| **Bhagyank** (Destiny Number) | Life path, career alignment check |
| **Namank** (Name Number) | Does your name support your Lagna lord? |
| **Karmank** | The hidden driver from name analysis |
| **2026 Personal Year** | Your themes, breakthroughs, and power months this year |

</details>

<details>
<summary><b>💼 Tab 4 — Career & Dashamsha (D10)</b></summary>

**D10 Dashamsha** is the gold-standard divisional chart for career. This tab uses both D1 and D10 simultaneously for maximum accuracy.

- **D10 Lagna** — the career personality hidden in the divisional chart
- **Saturn as Karma Karaka** — discipline vs exhaustion analysis
- **Leadership Assessment** — hidden strengths not currently being used
- **24-Month Career Forecast** in 6-month windows with specific predictions
- **Best timing** for job change, business launch, promotion — and months to avoid

</details>

<details>
<summary><b>💰 Tab 5 — Wealth & Abundance (D4 Chaturthamsa)</b></summary>

**D4 Chaturthamsa** is the primary divisional chart for property and fixed assets. Paired with D1 for complete wealth analysis.

- **2nd House** (accumulated wealth) + **11th House** (income & gains) deep analysis
- **Dhana Yoga count** — how many are active, their strength rating
- **Daridra Yoga check** — is there a poverty combination? What neutralizes it?
- **D4 Property Analysis** — will you own property? Best windows 2026–2027
- **Hard Truths** — the one specific action to take before Dec 2026

</details>

<details>
<summary><b>💕 Tab 6 — Love, Marriage & Navamsha (D9)</b></summary>

**D9 Navamsha** — the soul-level relationship chart. Paired with D1 and D7 Saptamsha.

- **Spouse Characteristics** from Upapada Lagna + D9 7th house (soul-level vs worldly)
- **Vargottama planets** — same sign in D1 and D9 = exceptionally powerful
- **Marriage timing windows** 2026–2028 with Dasha confirmation
- **Compatibility analysis** — which Rashi and Nakshatra is most harmonious
- **D7 Note** — children prospects as a bonus section

</details>

<details>
<summary><b>🏥 Tab 7 — Health & Vitality (D30 Trimsamsa)</b></summary>

**D30 Trimsamsa** is the classical chart for disease prediction, paired with D1 and Surya Kundali.

- **Body System Map** — which body parts each planet rules for your Lagna sign
- **Mental Health Assessment** — Moon and Mercury conditions, anxiety/overthinking indicators
- **Planetary Health Warnings** — each afflicted planet in D30 maps to a specific body system
- **2026–2027 Health Watch** — specific months needing extra care
- **Vitality Protocol** — exercise type, dietary guidance, one habit to start immediately

</details>

<details>
<summary><b>🙏 Tab 8 — Remedies (Tripath System)</b></summary>

**Three completely separate remedy tracks** — never mixed:

**Track 1: Vedic Jyotish Upayas**
- Mantras with exact count, best day/time, duration
- Gemstone prescription — metal, finger, day, minimum weight in ratti, contraindications
- Dana (charity) — what to donate, to whom, which day
- Fasting protocol

**Track 2: Lal Kitab Farmaan**
- 5 practical, non-ritualistic remedies targeting specific planets
- Exact actions, days, durations, behavioral restrictions (kya na karein)

**Track 3: Numerology Corrections**
- Name spelling adjustment if Namank conflicts with Lagna lord
- Lucky color schedule by day of week
- Number-based affirmation practice, lucky grid for wallet/home

</details>

<details>
<summary><b>👶 Tab 9 — Progeny & Saptamsha (D7)</b></summary>

**D7 Saptamsha** — the divisional chart governing children, creative legacy, and lineage.

- **D7 5th House** analysis — the primary house of children
- **Putrakaraka (Jaimini)** — the soul-level significator for progeny
- **Jupiter in D7** — natural karaka for children, how strong is it?
- **Timing Windows** — best Dasha/Antardasha for conception 2026–2028
- **Creative Legacy** — artistic, intellectual talents shown in 5th house

</details>

<details>
<summary><b>🌍 Tab 10 — Gochar (Live Planetary Transits)</b></summary>

**Real-time transit analysis** using live Swiss Ephemeris data. Every chart is computed at the moment of request.

- **Transit-to-Natal Mapping** — every planet's current sign vs your natal houses
- **Jupiter Exaltation Deep Dive** — month-by-month forecast for 13 months
- **Sade Sati / Ashtama Shani Check** — Saturn in Pisces impact on your specific Moon sign
- **Rahu-Ketu Karmic Axis** — what lessons the next 18 months hold
- **6-Month Monthly Forecast** — June through November 2026 specific predictions
- **Gochara Vedha Check** — which favorable transits are blocked, and how

</details>

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    A[👤 User Input\nName · DOB · TOB · City] --> B[React Frontend\nHomePage Form]
    B --> C{FastAPI Backend}
    
    C --> D[🗺️ Geocoding\nNominatim / OpenStreetMap]
    D --> E[Generate Cache Key\nDOB · TOB · Lat · Lng]
    
    E --> F{Redis Cache\nHit?}
    F -- ✅ Hit --> Z[Return Cached Chart]
    F -- ❌ Miss --> G{PostgreSQL DB\nLookup}
    
    G -- ✅ Found --> H[Heal Missing\nDivisional Charts]
    G -- ❌ Not Found --> I[🌟 Swiss Ephemeris\nFresh Calculation]
    
    I --> J[Hybrid Engine\nSwiss Ephe + AstrologyAPI]
    J --> K[Compute All Divisional Charts\nD1 · D4 · D7 · D9 · D10 · D30\nChandra · Surya · Gochar]
    K --> L[Numerology Engine\nMoolank · Bhagyank · Namank]
    L --> M[Save to PostgreSQL]
    
    H --> N[Cache in Redis\n30-day TTL]
    M --> N
    N --> O[📊 Dashboard\n10-Tab Layout]
    
    O --> P{Tab Selected}
    P --> Q{Interpretation\nCached?}
    Q -- ✅ DB Hit --> R[Serve Saved\nPrediction]
    Q -- ❌ Miss --> S[🤖 RAG Pipeline\nChromaDB Vector Search]
    S --> T[Classical Shastras\nRetrieved as Context]
    T --> U[Groq LLM\nTab-Specific Prompt]
    U --> V[AI Interpretation\nGenerated]
    V --> W[Save to DB\nfor Future Cache]
    W --> R
    
    style A fill:#1a0533,color:#d4af37,stroke:#c9952a
    style O fill:#0d0221,color:#c9b4e8,stroke:#6B21A8
    style U fill:#1e3a5f,color:#61DAFB,stroke:#0f4c81
    style I fill:#2d1b69,color:#d4af37,stroke:#c9952a
    style M fill:#1a3a1a,color:#90EE90,stroke:#336791
    style N fill:#3a0000,color:#FF6B6B,stroke:#DC382D
```

---

## ⚙️ Technology Stack

<div align="center">

| Layer | Technology | Purpose |
|:---:|:---:|:---|
| **Frontend** | React 18 + Vite | SPA with glassmorphism UI, animated components |
| **Styling** | Vanilla CSS + CSS Variables | Full design system — no Tailwind dependency |
| **Backend** | FastAPI (Python 3.10+) | Async API with full Pydantic validation |
| **Astro Engine** | Swiss Ephemeris (`pyswisseph`) | Arc-second precision planetary calculations |
| **AI/LLM** | Groq API (LLaMA / Mixtral) | Ultra-fast inference for 10 specialized prompts |
| **RAG** | LangChain + ChromaDB | Classical shastra text retrieval as AI context |
| **Embeddings** | Sentence Transformers | Semantic search over classical Vedic texts |
| **Primary DB** | PostgreSQL + asyncpg | Persistent chart & interpretation storage |
| **Cache** | Redis | 30-day chart cache + per-tab interpretation cache |
| **Geocoding** | Nominatim / OpenStreetMap | Birth city → precise lat/lng |
| **PDF Loader** | PyMuPDF | Classical astrology text ingestion for RAG |

</div>

---

## 🌠 Divisional Charts Computed

<div align="center">

| Chart | Name | Primary Use |
|:---:|:---:|:---|
| **D1** | Rashi / Lagna | Core natal chart — overall life |
| **D4** | Chaturthamsa | Property, fixed assets, wealth |
| **D7** | Saptamsha | Children, progeny, creative legacy |
| **D9** | Navamsha | Marriage, soul dharma, hidden strength |
| **D10** | Dashamsha | Career, profession, public achievement |
| **D30** | Trimsamsa | Health, disease, misfortunes |
| **☾** | Chandra Kundali | Moon-ascendant chart, emotional reality |
| **☀** | Surya Kundali | Sun-ascendant chart, vitality & authority |
| **↗** | Gochar | Real-time planetary transits (live) |

</div>

---

## 🚀 Quick Start

### Prerequisites

```bash
Node.js v18+      # Frontend
Python v3.10+     # Backend
PostgreSQL v14+   # Database
Redis v7+         # Caching layer
```

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/Phantomcoder9632/Trikal-Darshi-AI-powered-Astrology-app.git
cd Trikal-Darshi-AI-powered-Astrology-app
```

### 2️⃣ Backend Setup

```bash
cd astrology-backend

# Create virtual environment
python -m venv venv
source venv/Scripts/activate     # Windows
# source venv/bin/activate        # Mac/Linux

# Install all dependencies
pip install -r requirements.txt

# Configure environment (copy and fill in your keys)
cp .env.example .env
```

**`.env` configuration:**

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/trikal_darshi

# Redis
REDIS_URL=redis://localhost:6379

# AI Provider (Groq)
GROQ_API_KEY=your_groq_api_key_here

# Optional: AstrologyAPI.com (fallback)
ASTROLOGY_API_KEY=your_key_here
ASTROLOGY_API_URL=https://json.astrologyapi.com/v1
```

```bash
# Run the backend server
python main.py
# Server starts at http://localhost:8000
# API docs at http://localhost:8000/docs
```

### 3️⃣ Frontend Setup

```bash
cd astrology-frontend

# Install dependencies
npm install

# Start development server
npm run dev
# Opens at http://localhost:5173
```

### 4️⃣ (Optional) Build RAG Index

If you have classical astrology texts (PDFs) to ingest:

```bash
cd astrology-backend
python rag/build_index.py
# Indexes books/ folder into ChromaDB vector store
```

---

## 📊 How Prediction Caching Works

One of the smartest engineering decisions in this project — **zero repeated AI calls for the same chart**:

```
User requests Tab 5 (Wealth) for a chart
           │
           ▼
   Check PostgreSQL interpretations table
   WHERE chart_id = ? AND tab_number = 5
           │
    ┌──────┴──────┐
    │   HIT ✅    │   MISS ❌
    │             │
    ▼             ▼
  Serve      Check Redis
  saved      interpretation
  result     cache
    ▲         │
    │    ┌────┴────┐
    │    │  HIT ✅ │  MISS ❌
    │    │         │
    │    ▼         ▼
    │  Serve    Run RAG → Groq
    │  cached   Generate new
    │  result   interpretation
    │            │
    └────────────┘
         │
    Save to both
    Redis + PostgreSQL
```

**Result**: A user who requests the same reading twice (or on a different device) gets **instant results** — no AI API call, no compute cost.

---

## 📁 Project Structure

```
Trikal-Darshi-AI-powered-Astrology-app/
│
├── astrology-backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── requirements.txt
│   ├── .env.example
│   │
│   ├── routes/
│   │   ├── chart.py             # /chart/generate, /chart/{id}, /chart/gochar
│   │   ├── interpret.py         # /interpret/{chart_id}/{tab_number}
│   │   └── geocode.py           # City → coordinates
│   │
│   ├── services/
│   │   ├── ephemeris.py         # Swiss Ephemeris calculations (837 lines)
│   │   ├── hybrid.py            # AstrologyAPI + Swiss Ephe hybrid engine
│   │   ├── ai.py                # Groq LLM client
│   │   ├── ai_prompts.py        # 10 tab-specific master prompts (599 lines)
│   │   ├── cache.py             # Redis chart + interpretation caching
│   │   └── numerology.py        # Moolank, Bhagyank, Namank engine
│   │
│   ├── rag/
│   │   ├── pipeline.py          # Full RAG pipeline (13k+ lines)
│   │   ├── retriever.py         # ChromaDB semantic retriever
│   │   ├── build_index.py       # Index builder for classical texts
│   │   ├── loader.py            # PyMuPDF PDF loader
│   │   ├── embeddings.py        # Sentence Transformers setup
│   │   └── vectorstore.py       # ChromaDB vector store manager
│   │
│   ├── db/
│   │   └── schema.sql           # PostgreSQL schema (charts + interpretations)
│   │
│   ├── books/                   # Classical shastra PDFs for RAG
│   └── ephe/                    # Swiss Ephemeris data files (.se1)
│
└── astrology-frontend/
    ├── index.html
    ├── vite.config.js
    │
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css             # Full design system (18k+ CSS)
        │
        ├── pages/
        │   ├── HomePage.jsx      # Birth details form + validation
        │   └── DashboardPage.jsx # 10-tab dashboard with chart sidebar
        │
        ├── components/
        │   ├── ChartSidebar.jsx  # Kundali chart + divisional chart toggler
        │   ├── DivisionalChart.jsx # SVG chart renderer + "best used for" badge
        │   ├── KundaliChart.jsx  # North Indian Kundali SVG renderer
        │   ├── PlanetTable.jsx   # Planetary positions table (synced to active chart)
        │   ├── TabNavigation.jsx # 10-tab navigator with load states
        │   ├── CosmicSummary.jsx # Birth details summary card
        │   ├── TransitBanner.jsx # Live transit countdown + planetary positions
        │   ├── RemedyCards.jsx   # Formatted remedy display cards
        │   └── LoadingSpinner.jsx
        │
        └── services/
            └── api.js            # Axios API client
```

---

## 🎨 UI Highlights

<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=Cinzel&weight=600&size=18&pause=1200&color=C9952A&center=true&vCenter=true&width=600&lines=✦+Glassmorphism+Design+System;✦+Dark+Cosmic+Theme+with+Gold+Accents;✦+Live+Chart+Toggle+(D1+→+D4+→+D7+→+D9+→+D10);✦+Animated+Transit+Countdown+Banner;✦+Responsive+Planetary+Positions+Table;✦+Skeleton+Loading+States+for+All+Tabs" alt="UI Highlights" />

</div>

| Feature | Description |
|---|---|
| **Glassmorphism Cards** | Frosted glass effect with backdrop-filter blur, cosmic gradients |
| **Live Chart Switcher** | Toggle between D1, D4, D7, D9, D10, D30, Chandra, Surya charts inline |
| **Planet Table Sync** | Planetary positions table dynamically updates to match the active chart |
| **Transit Countdown** | Real-time D/H/M/S countdown to next major planetary event |
| **Best Used For Badge** | Every divisional chart shows its primary interpretation domain |
| **Lazy Tab Loading** | Tabs load interpretations on-demand, show ✓ when cached |
| **Confidence Pills** | Birth time confidence indicator (Exact/Approximate/Unknown) |
| **Cosmic Typography** | Cinzel Decorative + Inter — premium font pairing throughout |

---

## 🔬 The AI Engine — How It Works

```
User selects Tab → Frontend calls GET /interpret/{chart_id}/{tab}
                                        │
                              ┌─────────▼──────────┐
                              │  Check DB cache    │
                              │  (interpretations  │
                              │   table)           │
                              └─────────┬──────────┘
                                        │ MISS
                              ┌─────────▼──────────┐
                              │  RAG Retriever     │
                              │  Query ChromaDB    │
                              │  with tab topic    │
                              └─────────┬──────────┘
                                        │
                              ┌─────────▼──────────┐
                              │  Top-K Classical   │
                              │  Shastra Passages  │
                              │  retrieved         │
                              └─────────┬──────────┘
                                        │
                              ┌─────────▼──────────┐
                              │  Build Tab Prompt  │
                              │  (ai_prompts.py)   │
                              │  + Inject:         │
                              │    • Chart JSON    │
                              │    • Div charts    │
                              │    • RAG context   │
                              │    • Transits      │
                              └─────────┬──────────┘
                                        │
                              ┌─────────▼──────────┐
                              │   GROQ LLM Call    │
                              │  System: Trikal    │
                              │  Darshi Cosmic     │
                              │  Architect persona │
                              └─────────┬──────────┘
                                        │
                              ┌─────────▼──────────┐
                              │  Save to DB +      │
                              │  Return to UI      │
                              └────────────────────┘
```

**The AI persona is a "Trikal Darshi Cosmic Architect"** — simultaneously trained as:
1. **Vedic Jyotish Acharya** (Parashari + Jaimini, Bengal tradition)
2. **Lal Kitab Visheshagya** (Rin and karmic debt specialist)
3. **Numerology Pandit** (Chaldean + Vedic Ankjyotish)

*The AI is strictly instructed: never hallucinate planetary positions. Use ONLY the chart data provided.*

---

## 🗄️ Database Schema

```sql
-- Birth charts with full divisional chart JSON
CREATE TABLE charts (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name            VARCHAR(255) NOT NULL,
    date_of_birth        DATE NOT NULL,
    time_of_birth        TIME NOT NULL,
    city_of_birth        VARCHAR(255),
    current_city         VARCHAR(255),
    latitude             NUMERIC(9,6),
    longitude            NUMERIC(9,6),
    timezone             VARCHAR(64),
    birth_time_confidence VARCHAR(16),     -- exact | approximate | unknown
    ayanamsha            VARCHAR(32),      -- LAHIRI (Chitrapaksha)
    data_source          VARCHAR(64),      -- astrologyapi | swiss_ephe
    raw_chart_data       JSONB,           -- Complete chart with all 9 divisional charts
    created_at           TIMESTAMP DEFAULT NOW()
);

-- Cached AI interpretations (never recalculate same tab twice)
CREATE TABLE interpretations (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chart_id     UUID REFERENCES charts(id) ON DELETE CASCADE,
    tab_number   INTEGER NOT NULL,        -- 1-10
    content      TEXT NOT NULL,           -- Full AI interpretation
    created_at   TIMESTAMP DEFAULT NOW(),
    UNIQUE(chart_id, tab_number)          -- One per chart per tab
);
```

---

## 🪐 Current Astrological Context (2026)

The AI engine is pre-loaded with awareness of these major transits:

| Transit | Effect |
|---|---|
| **Jupiter entering Cancer** ♋ | Exaltation — biggest benefic transit of 2026 (once in 12 years) |
| **Saturn in Pisces** ♓ | Karmic restructuring, spiritual discipline |
| **Rahu in Aquarius** ♒ | Innovation, technology, unconventional paths |
| **Ketu in Leo** ♌ | Past karma, detachment from ego/fame |
| **Mars in Aries** ♈ | Own sign — karmic clearing, decisive energy |

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'feat: add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## ⚖️ License

This project is for educational and personal use. Classical astrological traditions referenced are part of public domain knowledge.

---

## 🙏 Acknowledgements

- **Maharshi Parashara** — *Brihat Parashara Hora Shastra* (foundational Vedic astrology text)
- **Pt. Roop Chand Joshi** — *Lal Kitab* tradition
- **Swiss Ephemeris** by Astrodienst AG — precision astronomical calculations
- **Groq** — ultra-fast LLM inference platform
- **LangChain** + **ChromaDB** — RAG pipeline framework

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:2d1b69,50:1a0533,100:0d0221&height=120&section=footer&text=ॐ%20Tat%20Sat%20ॐ&fontSize=28&fontColor=d4af37&fontAlignY=65&animation=fadeIn" width="100%"/>

<br/>

<img src="https://readme-typing-svg.demolab.com?font=Cinzel&size=16&pause=2000&color=C9952A&center=true&vCenter=true&width=500&lines=%22The+stars+impel%2C+they+do+not+compel.%22;%22Awareness+is+the+true+remedy.%22;%22%E0%A4%9C%E0%A5%8D%E0%A4%9E%E0%A4%BE%E0%A4%A8%E0%A4%82+%E0%A4%AA%E0%A4%B0%E0%A4%AE%E0%A4%82+%E0%A4%AC%E0%A4%B2%E0%A4%AE%E0%A5%8D%22;Knowledge+is+the+supreme+power." alt="Footer Quotes" />

<br/><br/>

**Made with ❤️ and cosmic intent**

[![GitHub](https://img.shields.io/badge/GitHub-Phantomcoder9632-181717?style=for-the-badge&logo=github)](https://github.com/Phantomcoder9632)

</div>
