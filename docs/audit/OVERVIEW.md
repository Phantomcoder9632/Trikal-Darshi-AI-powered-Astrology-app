# OVERVIEW — Trikal Darshi

> **Trikal Darshi** ("The One Who Sees Across All Time" — *trikal* = past/present/future, *darshi* = seer) is a full-stack AI-powered **Vedic astrology platform**. Users enter birth details and get a sidereal birth chart (Kundali) plus 11 AI-generated life readings grounded in classical texts via RAG.

## Purpose

Fuse three traditional Indian knowledge systems with generative AI to produce chart-grounded, personalized readings:

1. **Vedic Jyotish** (Parashari + Jaimini) — planetary positions, divisional charts, dashas, yogas, doshas
2. **Lal Kitab** — karmic debts ("Rin") and practical remedies ("Farmaan")
3. **Numerology** (Chaldean + Vedic Ankjyotish) — Moolank, Bhagyank, Namank, personal-year numbers

Every AI reading is anchored to the user's *exact computed planetary positions* (Swiss Ephemeris, Lahiri ayanamsha), not generic sun-sign horoscopes. The system prompt explicitly forbids the LLM from inventing planetary data (`astrology-backend/rag/pipeline.py:73-74` — "NEVER hallucinate planetary positions. Use ONLY the chart data provided").

## Intended Users (inferred from README, `PROJECT_DOCUMENTATION.md`, UI strings)

- **Individuals** seeking personalized Vedic horoscopes, transits, and remedies — the primary consumer. The landing page (`astrology-frontend/src/pages/HomePage.jsx`) targets a consumer with a marketing hero, features list, testimonials, and a simple birth-details form.
- **Practicing astrologers / students** who want fast, precise divisional-chart (D1/D4/D7/D9/D10/D30) computation, Ashtakavarga points, and Vimshottari dasha timelines — the `PlanetTable` and chart-sidebar UI expose raw planetary degrees, nakshatras and dignities.
- **Multilingual audience** — full UI + generated-content localization for **English, Hindi (Devanagari), Bengali** (`astrology-frontend/src/locales/{en,hi,bn}.json`, `src/i18n.js`, backend `services/translator.py`). The persona in the system prompt even states "This is a North Indian Bengali man's chart" (`rag/pipeline.py:97`), indicating a Bengali-market origin.
- **One paying-ish user**: the chart request flow assumes one shared guest mode; charts can be generated without an account, but login (Google OAuth or email/password) is required to *view the dashboard* (`src/App.jsx:15-29` `ProtectedRoute`).

## Core Features (verified in code)

| Feature | Where |
|---|---|
| Birth-details form → geocoded chart generation | `astrology-frontend/src/pages/HomePage.jsx`, `POST /chart/generate` (`astrology-backend/routes/chart.py:267`) |
| Sidereal natal chart — 9 grahas, Lagna, nakshatras, dashas, doshas | `astrology-backend/services/ephemeris.py` (982 lines) |
| 8 computed divisional/special charts: D1, D4, D7, D9, D10, D30, Chandra (Moon), Surya (Sun) + live Gochar transits | `services/ephemeris.py` (`compute_divisional_chart` :656, `compute_gochar_chart` :754) |
| Hybrid calculation: AstrologyAPI.com (≤200 calls/month) → local Swiss Ephemeris fallback | `services/hybrid.py:37-97` |
| **11 interpretation tabs**, streamed token-by-token from an LLM | `routes/interpret.py:34`, `services/ai_prompts.py` (905 lines of tab prompts) |
| RAG over 4 classical texts (BPHS, Lal Kitab, Phaladeepika, Brihat Jataka) in ChromaDB (6,129 chunks, 54 MB) | `rag/` package, `books/*.pdf` |
| 6-tier LLM fallback cascade (Gemini → Groq ×4 → OpenRouter) | `services/llm_providers.py:8-51` |
| Background pre-generation of all 11 tabs with progress polling | `services/background_generator.py`, `routes/progress.py:29` |
| "AskAI" streaming chatbot, per-chart persisted history | `routes/chat.py:35,166`, `src/components/AskAI.jsx` |
| Auth: Google OAuth + email/password (PBKDF2), 30-day HS256 JWTs, rate limiting | `routes/auth.py:189,336,400`, `services/security.py` |
| Multi-layer caching: Redis (30-day TTL charts/interpretations/geocode) + Postgres interpretations table | `services/cache.py`, `routes/chart.py` |
| North-Indian diamond Kundali SVG renderer + divisional chart switcher | `src/components/KundaliChart.jsx`, `src/components/DivisionalChart.jsx` |
| Print/PDF report builder (all 11 tabs, print-only container) | `src/pages/DashboardPage.jsx` (print styles in `src/index.css`) |
| 3 UI language themes + first-visit language modal | `src/styles/theme.css`, `src/components/LanguageWelcomeModal.jsx` |
| Multiplayer of interfaces: Home, Dashboard, Saved Charts, Chat pages | `src/pages/{HomePage,DashboardPage,SavedChartsPage,ChatPage}.jsx` |
| Offline demo mode (`VITE_MOCK_MODE=true`) with mock data | `src/services/api.js:6-7`, `src/services/mockData.js` |
| LLM fine-tuning pipeline (separate subsystem, QLoRA → GGUF) | `astrology-backend/astrology_finetuning/` — see TECH_STACK.md §Fine-tuning |

## The 11 Interpretation Tabs

Defined in `astrology-backend/routes/interpret.py:19-33` (TAB_MAPPING) and detailed in `rag/retriever.py:18-29` + `services/ai_prompts.py`:

| # | Tab | Domain |
|---|---|---|
| 1 | Lagna & Soul Blueprint | D1 + Chandra Kundali, yogas, dasha forecast |
| 2 | Lal Kitab Analysis | Rin (debts), Pakka Ghar, Farmaan remedies |
| 3 | Numerology Matrix | Moolank/Bhagyank/Namank, personal year |
| 4 | Career & Dashamsha (D10) | Career forecast, Saturn karma analysis |
| 5 | Wealth & Abundance (D4) | Dhana yogas, property windows |
| 6 | Love, Marriage & Navamsha (D9) | Spouse characteristics, marriage timing |
| 7 | Health & Vitality (D30) | Body-system map, mental health |
| 8 | Remedies (Tripath System) | Vedic upayas + Lal Kitab + numerology corrections |
| 9 | Progeny & Saptamsha (D7) | Children, creative legacy |
| 10 | Gochar (Live Transits) | Real-time transits, Sade Sati, Vedha |
| 11 | Education & Intelligence | 5th house, Budha-Aditya yoga, academic timing |

## Project Status

**Production / active development.** v2.0.0 (per `main.py:51`). Deployed to Hugging Face Spaces (`BrocoAI/trikal-darshi-api` per README badge). Last commit 2026-09-06. See `STATUS_AUDIT.md` for the verified working/broken state on this machine.

## Key Doc Files Already In Repo

- `README.md` — polished marketing + quickstart (some drift from code, e.g. says Groq primary; code uses Gemini primary — see TECH_STACK.md)
- `PROJECT_DOCUMENTATION.md` (685 lines) — deep technical doc; mostly accurate
- `changes_made.txt` — chronological dev changelog
- `frontend_redesign_prompt.md` — a design-brief prompt used for the UI redesign (not runtime code)
- `stitch_trikal_darshi_editorial_redesign/` — static HTML/CSS design mockups (not wired into the app)
