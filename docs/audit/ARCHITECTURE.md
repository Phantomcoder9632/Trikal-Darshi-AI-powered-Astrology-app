# ARCHITECTURE — Trikal Darshi

## Big Picture

```
┌─────────────────────────── Browser (React 19 SPA) ───────────────────────────┐
│  HomePage (form)   DashboardPage (11 tabs + SVG charts)   ChatPage   SavedCharts
│         │  axios/fetch + JWT header        ▲ streaming ReadableStream             │
└─────────┼──────────────────────────────────┼────────────────────────────────────┘
          ▼                                  │
┌─────────────────────────── FastAPI (uvicorn :8000/:7860) ────────────────────┐
│ routes/: auth, geocode, chart, interpret, progress, chat                     │
│ services/: hybrid→(astrologyapi | ephemeris), numerology, ai_prompts,        │
│            background_generator, cache(Redis), security(JWT/RBAC/ratelimit)  │
│ rag/: retriever(ChromaDB) → pipeline(LLM cascade)                            │
│ db/: DualPool(asyncpg) self-healing schema                                    │
└──────┬──────────────┬───────────────┬──────────────┬────────────────────────┘
       ▼              ▼               ▼              ▼
  PostgreSQL     Redis 7        ChromaDB      External: Gemini/Groq/OpenRouter,
  (primary +     (caches,       (local        AstrologyAPI.com, OSM Nominatim,
   optional      locks)         54 MB)        Google OAuth
   secondary)
```

Two deployable units, one process each: the SPA (static files served by Vite dev server or any CDN) and a **modular monolith** FastAPI backend. No message queue; background work runs in-process (FastAPI `BackgroundTasks` + `asyncio.to_thread`).

## Repository Layout (actual, with roles)

```
D:\AstrologyApp\
├── docker-compose.yml            # pg15 + redis7 + backend container (no frontend service)
├── README.md / PROJECT_DOCUMENTATION.md / changes_made.txt / frontend_redesign_prompt.md
├── animated_logo.svg / animated_banner.svg / *.png   # branding assets (also in README)
├── astrology-backend/            # FastAPI app (entry: main.py)
│   ├── main.py                   # app factory, CORS, lifespan(DB+Redis+RAG init), / and /health
│   ├── requirements.txt / Dockerfile / .env(.example)
│   ├── backfill_translations.py  # one-off: regenerate HI/BN interpretations
│   ├── migrate_language.py       # one-off migration script
│   ├── routes/                   # 6 API routers (see DATA_AND_API.md)
│   │   ├── auth.py      (442 L)  # Google OAuth + email register/login + JWT deps
│   │   ├── chart.py    (1019 L)  # generate/get/update/list/delete/gochar + bg-gen trigger
│   │   ├── interpret.py (262 L)  # POST stream one tab; GET all tabs
│   │   ├── chat.py             # POST /chat stream; GET /chat/history/{chart_id}
│   │   ├── progress.py         # GET /progress/{chart_id} bg-generation % 
│   │   └── geocode.py          # POST /geocode (Nominatim + Redis cache)
│   ├── services/
│   │   ├── hybrid.py            # quota check → AstrologyAPI (15 parallel calls) or Swiss Ephe
│   │   ├── astrologyapi.py      # AstrologyAPI.com REST client + api_usage tracking
│   │   ├── ephemeris.py (982 L) # pyswisseph engine: natal, vargas D1-D30, dasha, doshas, panchang
│   │   ├── numerology.py        # Chaldean Moolank/Bhagyank/Namank
│   │   ├── ai_prompts.py (905 L)# build_tab_prompt() — 11 tab master prompts
│   │   ├── ai.py                # thin bridge routes→rag.pipeline
│   │   ├── llm_providers.py     # LLM_CASCADE definition + language reorder + key availability
│   │   ├── background_generator.py  # pregenerate_all_tabs(): Redis lock + Semaphore(2)
│   │   ├── translator.py        # Gemini translation for HI/BN backfill
│   │   ├── cache.py             # redis.asyncio singleton, 30-day TTL helpers, key builder
│   │   └── security.py          # PBKDF2 hashing, JWT issue/verify, RateLimiter, password rules
│   ├── rag/
│   │   ├── loader.py            # PyMuPDF + RecursiveCharacterTextSplitter
│   │   ├── embeddings.py        # all-MiniLM-L6-v2 singleton (HF download)
│   │   ├── vectorstore.py       # Chroma singleton; build at startup if missing
│   │   ├── build_index.py       # CLI: books/*.pdf → chroma_db/
│   │   ├── retriever.py         # TAB_QUERIES per tab + personalized queries → top-k chunks
│   │   └── pipeline.py (608 L)  # stream_with_cascade(): RAG ctx + LLM tiers + <think> filter
│   ├── db/
│   │   ├── schema.sql           # 5 tables (see DATA_AND_API.md)
│   │   └── database.py          # DualPool/DualConnection + initialize_schema() self-healing
│   ├── models/chart.py          # Pydantic request/response schemas
│   ├── books/                   # 4 PDFs: BPHS, Lal Kitab, Phaladeepika, Brihat Jataka
│   ├── ephe/                    # Swiss Ephemeris files: sepl/semo/seas_18.se1
│   ├── chroma_db/               # persisted vector index (54 MB, 6,129 chunks) [gitignored]
│   ├── scripts/                 # 18 ops/debug scripts (check_db, flush_*, clear_*, init_db…)
│   ├── tests/                   # 5 scripts — only test_pipeline.py is a real unittest suite
│   └── astrology_finetuning/    # dormant QLoRA→GGUF experiment (see TECH_STACK.md §6)
│
├── astrology-frontend/          # React 19 + Vite 8 SPA (entry: index.html → src/main.jsx)
│   ├── vite.config.js           # port 5173, tailwindcss() + react() plugins
│   ├── eslint.config.js
│   ├── .env / .env.local        # VITE_GOOGLE_CLIENT_ID, VITE_API_URL, VITE_MOCK_MODE
│   └── src/
│       ├── main.jsx             # GoogleOAuthProvider + AuthProvider
│       ├── App.jsx              # Routes + ProtectedRoute + first-visit language modal
│       ├── i18n.js              # i18next init, lang-code converters
│       ├── index.css   (5,097 L)# main design system
│       ├── styles/theme.css     # 4 cosmic themes via body.theme-*
│       ├── context/AuthContext.jsx  # JWT in localStorage, login/register/google/logout
│       ├── services/api.js (418 L)  # axios client + all endpoint wrappers + stream helpers
│       ├── services/mockData.js     # VITE_MOCK_MODE demo data
│       ├── locales/{en,hi,bn}.json
│       ├── pages/  HomePage (1,254 L) · DashboardPage (1,034 L) · ChatPage · SavedChartsPage
│       └── components/  AskAI · AuthModal · ChartSidebar · CosmicSummary · DivisionalChart ·
│               KundaliChart · PlanetTable · TabNavigation · TransitBanner · RemedyCards ·
│               ProfileCard · LanguageSelect · LanguageWelcomeModal · LoadingSpinner · formatters
│
├── stitch_trikal_darshi_editorial_redesign/   # 8 static HTML/CSS design mockups (not shipped)
├── temp_hf_deploy/                            # gitignored HF Spaces deploy copy of backend
├── .venv/ venv/                               # two Python 3.13.5 venvs (deps installed)
└── package-lock.json                          # orphaned (no root package.json)
```

## Entry Points

| Unit | Entry | Command |
|---|---|---|
| Backend | `astrology-backend/main.py` — module-level `app`; `__main__` block runs uvicorn with `reload=True` on `$HOST:$PORT` (default 0.0.0.0:8000) | `python main.py` or `uvicorn main:app --reload --port 8000` |
| Frontend dev | `astrology-frontend/src/main.jsx` (Vite serves `index.html`) | `npm run dev` (:5173) |
| Frontend prod | same bundle → `dist/` | `npm run build` / `npm run preview` |
| Docker | `astrology-backend/Dockerfile` CMD `uvicorn main:app --host 0.0.0.0 --port 7860` | `docker compose up --build` |

Backend lifespan (`main.py:26-49`): init DualPool + self-heal schema → init Redis → `build_vectorstore(force_rebuild=False)` (RAG failure is non-fatal, logged warning) → ready.

## Request Lifecycles

### 1. Chart generation (`POST /chart/generate`, routes/chart.py:267)
1. Optional JWT → attach `user_id`.
2. Geocode `city_of_birth` via `geocode_city_cached()` (Redis 30-day cache → Nominatim w/ 1 s delay) — `routes/geocode.py:28`.
3. Dedup: Redis key `chart:{dob}:{tob}:{lat}:{lng}:{lang}` (`services/cache.py:96`) → hit? return. Else Postgres lookup by birth params → "heal" missing divisional charts if partially stored.
4. Miss → `services/hybrid.get_complete_chart()`:
   - `count_monthly_api_calls()` from `api_usage` table; if **< 200** → 15 parallel AstrologyAPI.com calls via `asyncio.gather` (`hybrid.py:64-95`); compute D9/D10/D4/D7/D30 locally from returned longitudes (external API returns images only).
   - else / on any error → `ephemeris.calculate_chart_fallback()` (pure pyswisseph, Lahiri, Whole-Sign houses).
   - Merge numerology (`services/numerology.get_numerology`).
5. Insert row in `charts` (raw JSONB), cache in Redis 30 days, then fire-and-forget `BackgroundTasks`: `prefetch_rag_contexts()` + `pregenerate_all_tabs()` under Redis lock `bg_gen_lock:{chart_id}` with `asyncio.Semaphore(2)`; results saved to `interpretations` + Redis.
6. Return 201 with full chart JSON; frontend navigates to `/dashboard/{chartId}` and polls `GET /progress/{chart_id}`.

### 2. Interpretation streaming (`POST /interpret/{chart_id}/{tab}`, routes/interpret.py:34)
- DB (interpretations) → Redis (`interpretation:{chart_id}:{tab}:{lang}`) → if miss, release the DB connection **before** streaming (pool-exhaustion fix, commit 7858c60) and stream from `rag.pipeline.stream_with_cascade()`:
  1. `get_context_for_tab(tab, chart_data)` — ChromaDB top-k (k=3 live / k=5 bg) passages, Lal-Kitab boosted for tab 2, 4,000-char cap.
  2. Build messages: `SYSTEM_PROMPT` (cosmic architect persona, bilingual planet naming, no-hallucination rules) + RAG block + `build_tab_prompt()` (`services/ai_prompts.py`).
  3. Try `LLM_CASCADE` tiers in order (skips tiers whose env key is missing/`your_*`); fallback on 429/timeout/output <1,000 chars; strip `<think>…</think>`; yield tokens as `text/plain` `StreamingResponse`.
  4. On success persist to DB + Redis (only if ≥1,000 chars).

### 3. AskAI chat (`POST /chat`, routes/chat.py:35)
- Rate-limited (10/min), astrology-topic guard to save tokens, synthesizes chart data + existing tab interpretations + RAG, streams via same cascade, persists both turns to `chat_messages` (client-generated UUIDs for dedup).

## Cross-Cutting Design Patterns

- **Hybrid provider pattern with quota governor** — external API first, local engine as failover, monthly budget from a DB audit table (`hybrid.py`).
- **N-tier fallback cascade** for LLMs (`services/llm_providers.py:8-51`): ordered tiers, per-tier key-availability gating, language-aware reordering (Qwen first for HI/BN).
- **Failover wrappers** — `DualPool`/`DualConnection` (`db/database.py`): write to primary + best-effort secondary; reads cascade primary→secondary; if primary dead, secondary is promoted transparently.
- **Self-healing schema** (`db/database.py:initialize_schema`): on startup, verifies tables/columns/unique-constraints against an `EXPECTED_SCHEMA` dict and issues `CREATE TABLE`/`ALTER TABLE ADD COLUMN IF NOT EXISTS` — no Alembic.
- **Cache-aside everywhere** — Redis in front of Postgres for charts, interpretations, geocoding, RAG contexts (1 h) with 30-day TTLs; deterministic key builders.
- **Decorator-free rate limiting** — `RateLimiter("chat", limit=10)` FastAPI dependency (`services/security.py`) backed by Redis counters.
- **Singletons per process** — Redis client, DB pool, Chroma store, embedding model.
- **Graceful degradation** — RAG init failure → server runs "without RAG"; geocode failure → frontend falls back to hardcoded Varanasi coords; backend unreachable → frontend mock data (`src/services/api.js` catch blocks).
- **Layering** — routes (HTTP) → services (domain) → db/rag (infra); Pydantic models validate edges; `Depends(get_db)`/`get_current_user` DI.

## Frontend Architecture

- React Router 7 SPA. Routes (`src/App.jsx:36-56`): `/` Home, `/dashboard/:chartId` (ProtectedRoute), `/chat` + `/chat/:chartId`, `/charts|/saved-charts|/account|/profile` → SavedChartsPage, `/dashboard` → mock-chart redirect.
- `AuthContext` holds JWT in `localStorage.token`, exposes login/register/googleLogin/logout; axios interceptor attaches `Authorization` (`services/api.js:14-24`).
- `api.js` wraps every endpoint and doubles as a **mock-mode shim**: if `VITE_MOCK_MODE=true` or a call fails, returns data from `mockData.js` — the UI is fully demoable without the backend.
- DashboardPage orchestrates: chart sidebar + SVG Kundali/DivisionalChart switcher, PlanetTable, 11 TabNavigation tabs (streamed text + ✓ cached badges + background-progress polling), AskAI drawer, print-report builder, theme/profile drawer.
- State is local (useState/useEffect); no Redux/Zustand/React-Query.

## Data Flow Diagram (interpretation)

```
Tab click → GET cached? ── hit ─→ render markdown
              │ miss (stream)
              ▼
   ChromaDB.similarity_search(TAB_QUERIES[tab] + chart keywords)
              │ top-k passages (≤4,000 chars)
              ▼
   SYSTEM_PROMPT + RAG + tab prompt + full chart JSON
              │
              ▼
   gemini-2.5-flash ──429/fail──▶ llama-3.3-70b ─▶ qwen3-32b ─▶ openrouter ─▶ gpt-oss-120b ─▶ llama-3.1-8b
              │ tokens (strip <think>)
              ▼
   StreamingResponse ──▶ UI ──▶ save Postgres + Redis (if ≥1,000 chars)
```
