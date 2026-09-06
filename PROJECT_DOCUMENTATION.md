# Trikal Darshi (Cosmic Architect) — Technical Documentation

## 1. Project Overview
**Trikal Darshi** is a full-stack, AI-powered Vedic astrology and numerology platform designed to deliver professional-grade astrological calculations, divisional chart visualisations, classical shastra-grounded interpretations, and real-time conversational life guidance.

### What the Project Does
- **Astrological Calculations**: Computes high-precision sidereal birth charts (Kundali) using the Chitrapaksha / Lahiri ayanamsha and Vedic Whole-Sign house mapping. It calculates all 9 classical grahas (Sun through Ketu), Ascendant (Lagna), Vimshottari Mahadasha/Antardasha timelines, planetary dignities, Panchang/Astro-details, and key doshas (Mangal Dosha, Kaal Sarp Dosha, Pitru Dosha, Gand Mool).
- **Divisional Charts (Vargas)**: Computes and visualises classical divisional charts including **D1** (Lagna), **D9** (Navamsha), **D10** (Dashamsha), **D4** (Chaturthamsa), **D7** (Saptamsha), **D30** (Trimsamsa), **Chandra Kundali** (Moon chart), **Surya Kundali** (Sun chart), and live **Gochar** (transits).
- **Hybrid Calculation Orchestration**: Dynamically routes ephemeris calculations between an external REST provider (AstrologyAPI.com) with monthly quota tracking and a local, deterministic C-based **Swiss Ephemeris (`pyswisseph`)** engine.
- **RAG-Grounded AI Analysis**: Embeds and indexes classical Jyotish shastras (*Brihat Parashara Hora Shastra*, *Lal Kitab 1952*, *Phaladeepika*, *Brihat Jataka*) into a ChromaDB vector store. When generating interpretations for 11 distinct life domains (Lagna Blueprint, Lal Kitab, Numerology, Career/D10, Wealth/D4, Love/D9, Health/D30, Remedies Tripath System, Progeny/D7, Gochar Transits, Education), it injects retrieved shastra sutras into the LLM prompt.
- **Background Pre-generation**: Automatically pre-computes and caches all 11 interpretation sections asynchronously using a bounded worker pool (`asyncio.Semaphore(2)`) and Redis distributed locks when a chart is saved or viewed.
- **Multilingual Support**: Supports full localization and content generation across English, Hindi (Devanagari), and Bengali (Bangla) with client-side i18n and automated translation/generation pipelines.
- **Interactive AI Assistant (AskAI)**: A streaming conversational chatbot persona ("Trikal AI Guide") that synthesises the user's birth positions, pre-generated tab interpretations, and shastra knowledge to answer life questions empathetically.

### Target Users & Use Cases
- Individuals seeking personalized, classical Vedic horoscope interpretations, transits, and remedial actions.
- Practicing astrologers and astrology students requiring rapid calculation of divisional charts, Ashtakavarga, and Vimshottari dasha timelines.
- Users looking for non-deterministic, warm, and actionable advice across career, relationships, wealth, and health.

### Current Status
- **Production / Active Development**: Core calculation engine, RAG pipeline, background worker, multilingual UI, Google/Email authentication, and streaming features are fully implemented and deployable via Docker, Docker Compose, and Hugging Face Spaces.

---

## 2. Tech Stack

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React | `^19.2.6` | Single Page Application (SPA) reactive UI library |
| **Frontend Routing** | React Router DOM | `^7.16.0` | Client-side routing (`/`, `/dashboard/:chartId`) and navigation |
| **Frontend Build Tool** | Vite | `^8.0.12` | Next-generation frontend bundler and dev server |
| **Frontend Styling** | Tailwind CSS | `^4.3.0` (with `@tailwindcss/vite`) | Utility-first CSS engine with custom Vedic theme variables |
| **Frontend Internationalization**| i18next & react-i18next | `^26.3.1` / `^17.0.8` | Client-side UI translation for English, Hindi, and Bengali |
| **Frontend Authentication** | `@react-oauth/google` | `^0.13.5` | Google Identity Services OAuth 2.0 client |
| **Frontend HTTP Client** | Axios | `^1.16.1` | REST API communication and JWT authorization interceptors |
| **Frontend Icons & Typography** | Google Fonts / Material Symbols | CDN-loaded | Outfits & Material Symbols Outlined icons |
| **Backend Runtime / Framework** | Python / FastAPI | Python `3.11+` / FastAPI `latest` | High-performance asynchronous REST API server |
| **Backend ASGI Server** | Uvicorn (`uvicorn[standard]`) | `latest` | Production ASGI web server running async event loops |
| **Primary Database** | PostgreSQL | `15-alpine` | Relational persistence for users, charts, interpretations, chat, and API usage |
| **DB Client & Connection Pool** | `asyncpg` | `latest` | Non-blocking, high-performance PostgreSQL async connection pool |
| **In-Memory Cache & Locking** | Redis (`redis` / `redis.asyncio`) | `7-alpine` / `latest` | 30-day chart & interpretation cache, RAG context cache, distributed locks |
| **Astrology Ephemeris Engine** | `pyswisseph` (Swiss Ephemeris) | `latest` | High-precision astronomical planetary & house calculations |
| **External Astrology Service** | AstrologyAPI.com REST API | v1 | Primary calculation service with fallback tracking |
| **Geocoding Service** | OpenStreetMap Nominatim | REST | City-to-latitude/longitude geocoding with 30-day cache |
| **Vector Store / Embeddings** | ChromaDB / `sentence-transformers` | `all-MiniLM-L6-v2` | Dense vector indexing and similarity search for classical shastras |
| **RAG Orchestration** | LangChain (`langchain-core`, `langchain-community`, `langchain-chroma`) | `latest` | Document loading, chunking, and retrieval pipelines |
| **PDF Extraction Engine** | PyMuPDF (`fitz`) | `latest` | Extracting raw text from shastra PDFs (`books/*.pdf`) |
| **Primary LLM Provider** | Google AI Studio (Gemini 2.5 Flash) | `gemini-2.5-flash` | Ultra-fast, high-context reasoning model for reports and chat |
| **Fallback LLM Cascade** | OpenRouter (OpenAI-compatible SDK) | `google/gemma-4-31b-it:free`, `meta-llama/llama-3.3-70b-instruct:free`, etc. | Multi-model fallback cascade on primary quota exhaustion |
| **Authentication & Hashing** | PyJWT, Google Auth, `hashlib.pbkdf2_hmac` | `latest` / Python stdlib | Signed HS256 JWT tokens and PBKDF2-SHA256 password security |
| **Validation / Serialization** | Pydantic v2 & `email-validator` | `latest` | Request payload validation and structured response schemas |
| **Containerization** | Docker & Docker Compose | Compose `3.8` | Container orchestration for DB, Redis, and FastAPI Backend |
| **Frontend Linting** | ESLint | `^10.3.0` | Code quality and React hooks linting |

---

## 3. Architecture

### High-Level System Architecture Description
Trikal Darshi is structured as a decoupled client-server architecture:
1. **Frontend Client**: A React 19 Single-Page Application (SPA) built with Vite and Tailwind CSS. It communicates with the backend via standard REST calls and Server-Sent Event / Fetch ReadableStreams for real-time token streaming.
2. **FastAPI Application Server**: The core async gateway hosting REST endpoints, authentication middleware, geocoding resolvers, background execution triggers, and streaming LLM pipelines.
3. **Hybrid Ephemeris Core**: When a birth chart is requested, the server checks whether the monthly AstrologyAPI.com threshold (200 calls) has been reached. If under quota, it executes 15 API requests concurrently via `asyncio.gather`. If the quota is exceeded or the external API fails, it falls back seamlessly to `pyswisseph` (Swiss Ephemeris C-bindings) to calculate sidereal coordinates, Whole-Sign houses, Vimshottari dasha, and divisional vargas locally.
4. **Data & Cache Layer**:
   - **PostgreSQL**: Stores persistent user accounts, birth parameters, full raw chart JSON blobs (`JSONB`), generated markdown interpretations, chat message history, and API usage audit trails. Features a resilient `DualPool` / `DualConnection` architecture allowing simultaneous writes to primary and backup instances.
   - **Redis**: Acts as a high-speed L1 cache for complete chart objects (30-day TTL), geocoding lookups, generated interpretation tabs, pre-fetched RAG contexts, and distributed locking (`SET NX`) for background workers.
5. **RAG Knowledge & LLM Pipeline**:
   - Classical Jyotish texts (*Brihat Parashara Hora Shastra*, *Lal Kitab*, *Phaladeepika*, *Brihat Jataka*) are chunked and embedded in a local ChromaDB instance using `all-MiniLM-L6-v2`.
   - The LLM generation stream queries ChromaDB for relevant shastra sutras, merges them with structured planetary placements, and streams responses using Gemini 2.5 Flash (primary) or OpenRouter (fallback cascade).

```mermaid
flowchart TB
    subgraph Client["Frontend Client (React 19 + Vite)"]
        UI[User Interface & Dashboard]
        Charts[Kundali SVG Renderer]
        AskAI[AskAI Chat Drawer]
        AuthContext[Auth & i18n Context]
    end

    subgraph Gateway["FastAPI Backend Server (:8000 / :7860)"]
        Router[API Routers: /auth, /chart, /interpret, /chat, /geocode, /progress]
        BGWorker[Background Pre-generation Engine]
        RAGPipeline[RAG Pipeline & Prompt Builder]
    end

    subgraph CalculationLayer["Hybrid Ephemeris Engine"]
        Decider{Monthly API Calls < 200?}
        AstroAPI[AstrologyAPI.com REST API]
        SwissEph[Local Swiss Ephemeris / pyswisseph]
        Numerology[Chaldean & Vedic Numerology Engine]
    end

    subgraph StorageLayer["Data & Persistence Layer"]
        PG[(PostgreSQL 15 Database)]
        Redis[(Redis 7 Cache & Locks)]
        Chroma[(ChromaDB Vector Store)]
    end

    subgraph ExternalAI["External AI & Service Providers"]
        Nominatim[OSM Nominatim Geocoding]
        Gemini[Google AI Studio - Gemini 2.5 Flash]
        OpenRouter[OpenRouter Fallback Cascade]
    end

    %% Client Interactions
    UI -->|REST / Geocode / Chart Generation| Router
    AskAI -->|Streaming Chat POST /chat| Router
    UI -->|Streaming Fetch POST /interpret| Router

    %% Backend Routing & Processing
    Router -->|Check / Write Cache| Redis
    Router -->|Read / Write Persistent Data| PG
    Router -->|Geocode City Query| Nominatim
    Router -->|Calculate Chart| Decider

    %% Hybrid Logic
    Decider -->|Yes| AstroAPI
    Decider -->|No or On Error| SwissEph
    AstroAPI -->|Local Divisional Augmentation| SwissEph
    SwissEph --> Numerology
    Numerology -->|Merged Birth Chart Data| Router

    %% Background & RAG
    Router -.->|Trigger Background Task| BGWorker
    BGWorker -->|Distributed Lock| Redis
    BGWorker -->|Fetch Shastra Sutras| Chroma
    BGWorker -->|Generate Tab Content| Gemini
    
    RAGPipeline -->|Similarity Search| Chroma
    RAGPipeline -->|Primary Stream| Gemini
    RAGPipeline -.->|Fallback on 429/Error| OpenRouter
    
    Gemini -->|Stream Tokens| Router
    OpenRouter -->|Stream Tokens| Router
```

### Request / Data Lifecycle for Typical User Action
**Example Scenario: User Submits Birth Form to Generate Kundali**
1. **Frontend Validation**: User enters Name, Date of Birth, Time of Birth, City of Birth, Current City, Birth Time Confidence, and preferred Language on `HomePage.jsx`. Client verifies non-empty fields.
2. **API Call**: Frontend triggers `POST /chart/generate` with JWT header (if logged in).
3. **Geocoding & Coordinate Resolution**:
   - Backend checks Redis for `geocode_cache:{city}`.
   - On miss, queries OpenStreetMap Nominatim with a 1.0s polite rate-limit delay, caches coordinates in Redis for 30 days, and extracts `lat` and `lng`.
4. **Cache & Deduplication Check**:
   - Backend generates deterministic cache key `chart:{dob}:{tob}:{lat}:{lng}:{lang}`.
   - If found in Redis or PostgreSQL, returns existing chart payload instantly.
5. **Hybrid Ephemeris Computation**:
   - If not cached, backend queries `api_usage` table to inspect AstrologyAPI call count for the current calendar month.
   - If count < 200, fires 15 parallel AstrologyAPI requests; if count ≥ 200 or API errors, computes planetary longitudes, Bhavas, Dashas, and Doshas via local `pyswisseph`.
   - Augments chart with local Chaldean/Vedic Numerology and computes all divisional charts (D9, D10, D4, D7, D30, Chandra, Surya, Gochar).
6. **Persistence & Cache**:
   - Saves raw chart JSONB record into PostgreSQL `charts` table.
   - Caches chart object in Redis under the coordinate key for 30 days.
7. **Background Pre-generation Trigger**:
   - Spawns background tasks via FastAPI `BackgroundTasks`: `prefetch_rag_contexts()` and `pregenerate_all_tabs()`.
   - Acquires Redis lock `bg_gen_lock:{chart_id}` (10 min TTL).
   - Generates all 11 interpretation sections concurrently (max 2 at a time via `asyncio.Semaphore(2)`), saves results to PostgreSQL `interpretations` table, and caches them in Redis.
8. **Response Delivery & Navigation**:
   - Returns full chart JSON to frontend with `HTTP 201 Created`.
   - Frontend navigates to `/dashboard/{chartId}`, renders the interactive Kundali diamond chart, and displays live progress via polling `GET /progress/{chartId}`.

### Architecture Classification
- **Modular Monolithic Backend + Decoupled SPA Frontend**:
  - The backend runs as a unified FastAPI service containing API routing, caching, ephemeris logic, RAG vector retrieval, and background pre-generation workers within a single process or container.
  - The frontend is a static single-page application hosted independently (e.g., Vercel, Netlify, or containerized).
  - Persistence and caching are decoupled into separate PostgreSQL and Redis services.

---

## 4. Code Structure

### Annotated Folder / File Tree (2–3 Levels)

```
d:\AstrologyApp\
├── docker-compose.yml               # Multi-container orchestration (PostgreSQL, Redis, Backend)
├── PROJECT_DOCUMENTATION.md         # Full project technical architecture & onboarding guide
├── README.md                        # High-level repository documentation & quickstart
├── astrology-backend/               # Core FastAPI Python Backend
│   ├── Dockerfile                   # Python 3.11-slim container definition with C build tools
│   ├── requirements.txt             # Python package dependencies
│   ├── .env.example                 # Environment variables specification
│   ├── main.py                      # FastAPI app initialization, lifespan, CORS, health checks
│   ├── books/                       # Classical Jyotish Shastra PDFs for RAG
│   │   ├── Brihat-Parāśara-Horā-Śhāstra.pdf
│   │   ├── Jyotish_Lal-Kitab.pdf
│   │   ├── Phaladeepika.pdf
│   │   └── The-Brihat-Jataka.pdf
│   ├── chroma_db/                   # Persisted ChromaDB vector store directory
│   ├── ephe/                        # Swiss Ephemeris data files (.se1) for local astronomical math
│   ├── db/                          # Database connection & schema management
│   │   ├── database.py              # DualPool / DualConnection asyncpg pool management & self-healing migrations
│   │   └── schema.sql               # PostgreSQL tables (users, charts, interpretations, chat_messages, api_usage)
│   ├── models/                      # Pydantic schema models
│   │   └── chart.py                 # Request/response validation schemas for chart operations
│   ├── rag/                         # Retrieval-Augmented Generation subsystem
│   │   ├── build_index.py           # CLI script to chunk PDFs and build ChromaDB embeddings index
│   │   ├── embeddings.py            # HuggingFace all-MiniLM-L6-v2 singleton embeddings loader
│   │   ├── loader.py                # PyMuPDF PDF page parser and RecursiveCharacterTextSplitter
│   │   ├── pipeline.py              # LLM streaming pipeline, RAG prompt injection, fallback cascade
│   │   ├── retriever.py             # Tab-specific query generator, similarity search, and RAG formatting
│   │   └── vectorstore.py           # ChromaDB singleton access & auto-rebuild handler
│   ├── routes/                      # FastAPI endpoint routers
│   │   ├── auth.py                  # Google OAuth verification, email register/login, JWT dependencies
│   │   ├── chart.py                 # /chart endpoints (generate, get, update, list, gochar)
│   │   ├── chat.py                  # /chat endpoint with streaming AskAI assistant & chat history
│   │   ├── geocode.py               # /geocode Nominatim OpenStreetMap coordinate resolver
│   │   ├── interpret.py             # /interpret streaming tab interpretations & batch retrieval
│   │   └── progress.py              # /progress polling endpoint for background pre-generation status
│   ├── services/                    # Core business logic & external integrations
│   │   ├── ai.py                    # Thin bridge for tab interpretation streaming
│   │   ├── ai_prompts.py            # Comprehensive prompt engineering & Vedic domain prompts for all 11 tabs
│   │   ├── astrologyapi.py          # AstrologyAPI.com REST client & usage tracking
│   │   ├── background_generator.py  # Semaphore-bounded background pre-generation worker & distributed lock
│   │   ├── cache.py                 # Redis async client, 30-day cache helpers, key formatting
│   │   ├── ephemeris.py             # Local Swiss Ephemeris engine (Lahiri ayanamsha, Bhavas, Vargas D1-D30, Doshas)
│   │   ├── hybrid.py                # Hybrid orchestrator deciding between AstrologyAPI and Swiss Ephemeris
│   │   ├── numerology.py            # Chaldean & Vedic numerology (Moolank, Bhagyank, Namank)
│   │   └── translator.py            # Dedicated LLM translation engine for Hindi and Bengali backfill
│   ├── scripts/                     # Operational maintenance & cache flushing utilities
│   │   ├── clear_cache.py           # Redis cache clearing utility
│   │   ├── flush_all_db.py          # Database wipe & reset utility
│   │   ├── flush_cache.py           # Redis flushing script
│   │   └── init_db.py               # Standalone database initialization script
│   └── tests/                       # Test suite
│       ├── test_astrology_raw.py    # Raw calculation tests
│       ├── test_live_stream.py      # Real-time streaming validation
│       └── test_pipeline.py         # End-to-end RAG + LLM streaming pipeline test
│
└── astrology-frontend/              # React 19 Frontend (Vite + Tailwind CSS)
    ├── package.json                 # Node dependencies & npm scripts
    ├── vite.config.js               # Vite bundler configuration with Tailwind plugin
    ├── index.html                   # HTML entry point with Google Fonts & Material Symbols
    ├── src/
    │   ├── main.jsx                 # React root mount & GoogleOAuthProvider configuration
    │   ├── App.jsx                  # Top-level Router, Theme initialization, ProtectedRoute
    │   ├── i18n.js                  # i18next setup and language code converters
    │   ├── index.css                # Global CSS styles & Tailwind directives
    │   ├── context/
    │   │   └── AuthContext.jsx      # Authentication context provider (Google/Email auth, JWT storage)
    │   ├── locales/                 # JSON translation bundles
    │   │   ├── en.json              # English UI copy
    │   │   ├── hi.json              # Hindi UI copy
    │   │   └── bn.json              # Bengali UI copy
    │   ├── pages/
    │   │   ├── HomePage.jsx         # Landing page, birth details input form, quick horoscope preview
    │   │   └── DashboardPage.jsx    # Full Kundali dashboard, tab navigation, divisional chart switcher, AskAI
    │   ├── components/              # Modular UI components
    │   │   ├── AskAI.jsx            # Sliding drawer conversational AI assistant with streaming support
    │   │   ├── ChartSidebar.jsx     # Saved charts history sidebar
    │   │   ├── CosmicSummary.jsx    # Hero stats grid (Lagna, Moon sign, Nakshatra, Dasha, Doshas)
    │   │   ├── DivisionalChart.jsx  # Divisional chart renderer (D9, D10, D4, D7, D30, Chandra, Surya)
    │   │   ├── KundaliChart.jsx     # North Indian diamond Kundali SVG renderer with retro & dignities
    │   │   ├── LanguageSelect.jsx   # Top-bar language switcher dropdown
    │   │   ├── LanguageWelcomeModal.jsx # First-visit modal for selecting UI language
    │   │   ├── LoadingSpinner.jsx   # Cosmic themed animated spinner
    │   │   ├── PlanetTable.jsx      # Tabular breakdown of planetary degrees, houses, nakshatras, lords
    │   │   ├── ProfileCard.jsx      # User profile banner with chart edit capabilities
    │   │   ├── RemedyCards.jsx      # Structured display of Vedic, Lal Kitab, and Numerology remedies
    │   │   ├── TabNavigation.jsx    # 11 interpretation tabs with markdown rendering & streaming controls
    │   │   ├── TransitBanner.jsx    # Live Gochar transit marquee/banner
    │   │   └── formatters.jsx       # String formatting helpers & zodiac glyph mappers
    │   ├── services/
    │   │   └── api.js               # Axios client, streaming fetch wrappers, backend API bindings
    │   └── styles/
    │       └── theme.css            # Vedic color palettes (Vedic Gold, Cosmic Violet, Ruby Surya, Emerald Budh)
```

### Architectural Patterns & Code Separation
- **Layered Architecture**: Clear separation of concerns across API Routers (`routes/`), Domain Business Services (`services/`), Data Access / Storage (`db/`, `chroma_db/`), and Machine Learning / RAG pipelines (`rag/`).
- **Dependency Injection**: FastAPI `Depends(get_db)`, `Depends(get_current_user)`, and `Depends(get_optional_current_user)` provide scoped database connections and authentication context across routes.
- **Fail-Safe Fallback Strategy**:
  - Ephemeris calculations seamlessly switch between external REST APIs and local C-based Swiss Ephemeris.
  - LLM generations cascade from Gemini 2.5 Flash to multiple OpenRouter models on 429/quota errors.
  - PostgreSQL connectivity implements a `DualPool` pattern to maintain operations across primary and secondary database instances.
- **Naming Conventions**:
  - Backend: Python `snake_case` for module names, functions, variables; `PascalCase` for Pydantic models and classes.
  - Frontend: React `PascalCase.jsx` for UI components; `camelCase.js` for utility functions and services.

---

## 5. AI Models & Fallback Logic

### AI Providers & Model Configuration

| Role | Provider / Engine | Configured Model | Base URL | Max Tokens | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Tier 1: Primary LLM** | Google AI Studio (Gemini) | `gemini-2.5-flash` | `https://generativelanguage.googleapis.com/v1beta/openai/` | 16,384 | Primary tab interpretation generation and AskAI chat responses |
| **Tier 2: Fast Versatile** | Groq (Llama 3.3) | `llama-3.3-70b-versatile` | `https://api.groq.com/openai/v1` | 32,768 | High-speed, high-reasoning primary fallback |
| **Tier 3: Multilingual Lead** | Groq (Qwen 3) | `qwen/qwen3-32b` | `https://api.groq.com/openai/v1` | 32,768 | Multilingual excellence (#1 priority for Hindi & Bengali) |
| **Tier 4: Safety Net** | OpenRouter | `meta-llama/llama-3.3-70b-instruct:free` | `https://openrouter.ai/api/v1` | 4,096 | External provider safety net fallback |
| **Tier 5: Deep Open-Weights** | Groq (GPT-OSS) | `openai/gpt-oss-120b` | `https://api.groq.com/openai/v1` | 65,536 | Heavyweight deep reasoning fallback (`reasoning_format: hidden`) |
| **Tier 6: Instant Fallback** | Groq (Llama 3.1) | `llama-3.1-8b-instant` | `https://api.groq.com/openai/v1` | 8,192 | Ultra-fast lightweight final fallback |

### File & Function References
- **Provider & Cascade Configuration**: [`astrology-backend/services/llm_providers.py`](file:///d:/AstrologyApp/astrology-backend/services/llm_providers.py) → `LLM_CASCADE`, `cascade_for_language()`, `effective_max_tokens()`, `is_tier_available()`.
- **Streaming Pipeline**: [`astrology-backend/rag/pipeline.py`](file:///d:/AstrologyApp/astrology-backend/rag/pipeline.py) → `stream_with_cascade()`, `stream_with_rag()`, `stream_chat_response()`, `get_cached_client()`.
- **Background Worker**: [`astrology-backend/services/background_generator.py`](file:///d:/AstrologyApp/astrology-backend/services/background_generator.py) → `_sync_collect_tab_text()`, `pregenerate_all_tabs()`.
- **RAG Retrieval Engine**: [`astrology-backend/rag/retriever.py`](file:///d:/AstrologyApp/astrology-backend/rag/retriever.py) → `get_context_for_tab()`, `search_for_tab()`.
- **Prompt Engineering**: [`astrology-backend/services/ai_prompts.py`](file:///d:/AstrologyApp/astrology-backend/services/ai_prompts.py) → `build_tab_prompt()`.

### Prompt Construction & RAG Architecture
1. **System Prompt**: Defines the persona of a **Trikal Darshi Cosmic Architect** mastering Parashari/Jaimini Vedic Jyotish, Lal Kitab karmic debts (Rin), and Chaldean/Vedic Numerology. Mandates Sanskrit/English dual planet naming (e.g. `Budh/Bu (Mercury)`), North Indian chart conventions, and zero hallucination of planetary positions.
2. **Context Injection**:
   - Tab-specific queries (e.g., Tab 4: *"tenth house career dashamsha d10 profession"*) are augmented with user chart keywords (e.g., *"Aries lagna Saturn tenth house"*).
   - ChromaDB retrieves top-$k$ relevant passages ($k=3$ for live stream, $k=5$ for background worker) from the 4 classical shastras.
   - Passages are capped at 4,000 characters and prepended as `REFERENCE TEXTS FROM CLASSICAL SHASTRA`.
3. **Structured User Prompt**: Formats exact planetary coordinates, Ascendant degree, Nakshatras, Navamsha/Dashamsha placements, Ashtakavarga points, active Vimshottari Mahadasha/Antardasha, and Numerology matrix into a structured analytical task.
4. **Multilingual Directive**: For Hindi or Bengali requests, an explicit language constraint is appended requiring complete output in the target language while preserving classical Sanskrit terminology.

### Fallback & Rate-Limit Handling Strategy
- **Automatic Fallback Trigger**: The pipeline inspects errors using `_is_rate_limit()`. If an HTTP 429, `RateLimitError`, quota exhaustion, or connection timeout occurs on Gemini, the pipeline automatically intercepts the exception and switches to the OpenRouter fallback cascade without crashing the user's connection.
- **Reasoning Block Stripping**: The `_yield_tokens()` generator buffers and filters out raw `<think>...</think>` internal reasoning tags from deep-thinking models, ensuring clean markdown delivery to the client.
- **Truncation & Error Prevention**: If generation fails or yields fewer than 1,000 characters, the result is rejected and not saved to PostgreSQL/Redis, preventing corrupted interpretations from being cached.

### Streaming vs Non-Streaming
- **Live User Interactions (`/interpret/...` & `/chat`)**: Fully streamed token-by-token using FastAPI `StreamingResponse` and browser `ReadableStream`.
- **Background Worker (`pregenerate_all_tabs`)**: Executes synchronously inside worker threads (`asyncio.to_thread(_sync_collect_tab_text)`) to avoid event-loop blocking, accumulating the full string before persisting to PostgreSQL and Redis.

---

## 6. API / Routes Documentation

| Method | Route | Purpose | Auth Required | Request Body | Response |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/` | Hugging Face Spaces health check & root info | No | None | `{"status": "ok", "app": "Trikal Darshi", "version": "2.0.0"}` |
| `GET` | `/health` | Live DB (PostgreSQL) & Redis connectivity ping | No | None | `{"status": "ok", "db": "connected", "redis": "connected"}` |
| `POST` | `/auth/google` | Google OAuth ID/Access token verification & user login | No | `{"token": "string", "language": "string"}` | `{"access_token": "string", "token_type": "bearer", "user": {...}}` |
| `POST` | `/auth/register` | Register new user via Email and Password | No | `{"email": "string", "password": "string", "name": "string", "language": "string"}` | `{"access_token": "string", "token_type": "bearer", "user": {...}}` |
| `POST` | `/auth/login` | Log in existing user via Email and Password | No | `{"email": "string", "password": "string"}` | `{"access_token": "string", "token_type": "bearer", "user": {...}}` |
| `POST` | `/geocode` | Resolve city name to coordinates via OSM Nominatim | No | `{"city": "string"}` | `{"lat": float, "lng": float, "display_name": "string"}` |
| `POST` | `/chart/generate` | Compute full birth chart, save to DB, cache in Redis, trigger bg gen | Optional (Associates if token present) | `{"full_name": "string", "date_of_birth": "YYYY-MM-DD", "time_of_birth": "HH:MM", "city_of_birth": "string", "current_city": "string", "birth_time_confidence": "exact", "language": "english"}` | `HTTP 201 Created` with full chart JSON object |
| `GET` | `/chart/gochar` | Compute real-time live transit chart via Swiss Ephemeris | No | Query params: `lat`, `lng` | Full transit chart object (planets, signs, houses) |
| `GET` | `/chart/{chart_id}` | Retrieve saved chart JSON by UUID | Optional (Checks owner if user_id set) | None | Full chart JSON object |
| `PUT` | `/chart/{chart_id}` | Update birth details, re-calculate, invalidate stale cache | Yes (Bearer Token) | Same as `/chart/generate` | Updated chart JSON object |
| `GET` | `/chart` | List all charts created by the authenticated user | Yes (Bearer Token) | None | `[{"chart_id": "uuid", "full_name": "string", "date_of_birth": "...", ...}]` |
| `POST` | `/interpret/{chart_id}/{tab_number}` | Stream AI interpretation for tab (1–11) in real-time | No | `{"language": "english"}` (JSON body) | `text/plain` streaming token chunks |
| `GET` | `/interpret/{chart_id}` | Retrieve all completed interpretations for a chart | No | Query param: `language=english` | `{"1": "markdown content", "2": "...", ...}` |
| `GET` | `/progress/{chart_id}` | Poll background pre-generation status for 11 tabs | No | None | `{"chart_id": "uuid", "total_tabs": 11, "completed_tabs": [1, 2], "percent": 18, "is_complete": false}` |
| `POST` | `/chat` | Conversational AskAI streaming query endpoint | No | `{"message": "string", "chart_id": "uuid", "history": [...], "user_msg_id": "string", "ai_msg_id": "string", "language": "english"}` | `text/plain` streaming token chunks |
| `GET` | `/chat/history/{chart_id}` | Retrieve persisted chat conversation for a chart | No | None | `[{"id": "string", "sender": "user"\|"ai", "text": "string", "time": "hh:mm AM/PM"}]` |

---

## 7. Database

### Database Type & Engine Selection
- **Type**: Relational PostgreSQL 15 (`postgres:15-alpine`).
- **Rationale**: Relational integrity is essential for user-chart-interpretation hierarchies, while PostgreSQL's native `JSONB` support allows flexible storage of complex, deeply nested astrological datasets (divisional vargas, planetary degrees, Ashtakavarga grids) without requiring rigid relational decomposition for calculation results.
- **Client & Pooling**: Driven asynchronously by `asyncpg` via custom `DualPool` wrapper with connection timeout bounds and statement-level error isolation.

### Schema & Models Overview

```mermaid
erDiagram
    users ||--o{ charts : "creates / owns"
    charts ||--o{ interpretations : "has generated"
    charts ||--o{ chat_messages : "contains history"
    
    users {
        UUID id PK "DEFAULT uuid_generate_v4()"
        TEXT google_id UK "Unique Google ID or email prefix"
        TEXT email UK "User email address"
        TEXT name "Full display name"
        TEXT picture "Avatar URL"
        TEXT password_hash "PBKDF2-SHA256 hashed password"
        TEXT preferred_language "Default: 'english'"
        TIMESTAMP created_at "DEFAULT NOW()"
    }

    charts {
        UUID id PK "DEFAULT uuid_generate_v4()"
        UUID user_id FK "REFERENCES users(id) ON DELETE SET NULL"
        TEXT full_name "Subject's full name"
        DATE date_of_birth "Birth Date (YYYY-MM-DD)"
        TIME time_of_birth "Birth Time (HH:MM)"
        TEXT city_of_birth "Birth city"
        TEXT current_city "Current city of residence"
        FLOAT latitude "Geocoded latitude"
        FLOAT longitude "Geocoded longitude"
        TEXT timezone "DEFAULT 'Asia/Kolkata'"
        TEXT birth_time_confidence "'exact' | 'approximate' | 'unknown'"
        TEXT ayanamsha "DEFAULT 'LAHIRI'"
        TEXT data_source "'astrologyapi' | 'ephemeris'"
        TEXT language "DEFAULT 'english'"
        JSONB raw_chart_data "Complete calculated planetary & varga JSON"
        TIMESTAMP created_at "DEFAULT NOW()"
    }

    interpretations {
        UUID id PK "DEFAULT uuid_generate_v4()"
        UUID chart_id FK "REFERENCES charts(id) ON DELETE CASCADE"
        INTEGER tab_number "CHECK (tab_number BETWEEN 1 AND 11)"
        TEXT tab_name "Display tab title"
        TEXT content "AI-generated Markdown analysis"
        TEXT model_used "Model identifier (e.g. primary/gemini-2.5-flash)"
        TEXT language "DEFAULT 'english'"
        TIMESTAMP generated_at "DEFAULT NOW()"
    }

    chat_messages {
        TEXT id PK "Client-generated message UUID"
        UUID chart_id FK "REFERENCES charts(id) ON DELETE CASCADE"
        TEXT sender "'user' | 'ai'"
        TEXT text "Message content"
        TIMESTAMP created_at "DEFAULT NOW()"
    }

    api_usage {
        UUID id PK "DEFAULT uuid_generate_v4()"
        TEXT service "Service name (e.g. 'astrologyapi')"
        TEXT endpoint "Endpoint called"
        TIMESTAMP called_at "DEFAULT NOW()"
        BOOLEAN success "DEFAULT TRUE"
    }
```

### Constraints & Migration Strategy
- **Unique Compound Constraints**: `UNIQUE(chart_id, tab_number, language)` on `interpretations` guarantees idempotent upserts via `ON CONFLICT DO UPDATE`.
- **Self-Healing Schema Migrations**: [`astrology-backend/db/database.py`](file:///d:/AstrologyApp/astrology-backend/db/database.py) executes `initialize_schema()` on FastAPI startup. It parses `schema.sql`, verifies `uuid-ossp` extensions, dynamically queries `information_schema.columns`, and automatically executes `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` if columns are missing.

---

## 8. Authentication & Security

### Authentication Mechanisms
1. **Google OAuth 2.0**:
   - Client utilizes `@react-oauth/google`.
   - Supports both Google ID Tokens (verified via `google.oauth2.id_token.verify_oauth2_token`) and OAuth2 Access Tokens (verified via Google userinfo endpoint `https://www.googleapis.com/oauth2/v3/userinfo` to avoid mobile redirect freezes).
2. **Email & Password Authentication**:
   - Users can register and log in directly using email and password (`/auth/register`, `/auth/login`).
   - Passwords hashed using Python `hashlib.pbkdf2_hmac` with 100,000 iterations of SHA-256 and cryptographic salts (`secrets.token_hex(16)`).
   - Password verification uses constant-time string comparison (`secrets.compare_digest`).
3. **Session Management**:
   - Backend issues signed **HS256 JSON Web Tokens (JWT)** with a 30-day expiration window.
   - JWT tokens are validated via FastAPI `HTTPBearer` dependencies (`get_current_user` and `get_optional_current_user`).

### Input Validation & Sanitization
- **Strict Pydantic Typing**: Pydantic v2 schemas validate all incoming JSON request bodies (`EmailStr`, ISO date/time parsing, coordinate floats).
- **SQL Injection Prevention**: All database interactions use parameterized SQL queries (`$1, $2, ...`) via `asyncpg`. No string concatenation is used in queries.

### CORS Policy
- Configured via FastAPI `CORSMiddleware`.
- Origin whitelist parsed from `CORS_ORIGINS` environment variable (comma-separated list). Defaults to `["*"]` in local development.

### Rate Limiting & Abuse Prevention
- **Nominatim Geocoding**: Enforces an explicit 1.0-second delay per uncached request to comply with OpenStreetMap terms of service.
- **External API Protection**: Hybrid orchestrator enforces a 200 monthly call ceiling to prevent AstrologyAPI overage charges.
- **Background Worker Throttling**: Pre-generation utilizes an `asyncio.Semaphore(2)` and Redis distributed locks (`SET NX`) to prevent concurrent model hammering.

### Secrets Management
- All API keys, database credentials, and JWT secrets are injected via `.env` and loaded securely through `python-dotenv`.
- Secret values are never exposed in client bundles or logged in plaintext.

### Known Security Observations
- **Guest / Unauthenticated Charts**: Users can generate charts as guests without logging in. While convenient for conversion, unauthenticated charts are queryable by anyone possessing the UUID (`/chart/{chart_id}`). (inferred)
- **CORS Allow Credentials**: In `main.py`, `allow_credentials` is set to `False` while origins default to `["*"]`. For strict production deployments, explicit domain whitelisting with credentials enabled is recommended.

---

## 9. Environment Variables

| Variable | Layer | Purpose | Required | Example / Default Value |
| :--- | :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Backend | Primary PostgreSQL connection string | **Yes** | `postgresql://postgres:password@localhost:5432/astrology_db` |
| `LOCAL_DATABASE_URL`| Backend | Secondary PostgreSQL connection string for DualPool redundancy | No | `postgresql://postgres:password@localhost:5432/astrology_db` |
| `REDIS_URL` | Backend | Redis connection string for caching and locking | **Yes** | `redis://localhost:6379/0` |
| `GEMINI_API_KEY` | Backend | Primary Google AI Studio API Key for LLM interpretations | **Yes** | `AIzaSy...` |
| `GEMINI_MODEL` | Backend | Model identifier for primary LLM | No | `gemini-2.5-flash` |
| `GEMINI_CHAT_API_KEY`| Backend | Dedicated Google AI Studio key for AskAI chat stream | No | `AIzaSy...` |
| `GEMINI_TRANSLATION_KEY`| Backend | Dedicated Google AI Studio key for Hindi/Bengali translations | No | `AIzaSy...` |
| `OPENROUTER_API_KEY` | Backend | OpenRouter API Key for fallback cascade | No (Recommended)| `sk-or-v1-...` |
| `OPENROUTER_MODEL` | Backend | Preferred model on OpenRouter | No | `google/gemma-4-31b-it:free` |
| `ASTROLOGYAPI_USER_ID`| Backend | AstrologyAPI.com Account User ID | No | `63xxxx` |
| `ASTROLOGYAPI_API_KEY`| Backend | AstrologyAPI.com API Key | No | `your_astrologyapi_key` |
| `GOOGLE_CLIENT_ID` | Backend | Google OAuth 2.0 Web Client ID for token verification | **Yes** | `7643...apps.googleusercontent.com` |
| `JWT_SECRET` | Backend | Secret key for signing HS256 JWT session tokens | **Yes** | `your_super_secret_jwt_key_here` |
| `CORS_ORIGINS` | Backend | Allowed CORS origins (comma-separated) | No | `http://localhost:5173,http://localhost:3000` |
| `HOST` | Backend | Host interface to bind Uvicorn server | No | `0.0.0.0` |
| `PORT` | Backend | Port to bind Uvicorn server | No | `8000` (Local) / `7860` (Hugging Face) |
| `APP_ENV` | Backend | Application environment mode | No | `development` / `production` |
| `VITE_API_URL` | Frontend | Backend API base URL consumed by Axios and fetch | No | `http://localhost:8000` |
| `VITE_GOOGLE_CLIENT_ID`| Frontend | Google OAuth Client ID consumed by `@react-oauth/google` | **Yes** | `7643...apps.googleusercontent.com` |

---

## 10. Deployment

### Hosting Platforms & Environments
1. **Self-Hosted / Cloud VPS via Docker Compose**:
   - Multi-container orchestration managing PostgreSQL 15, Redis 7, and FastAPI.
2. **Hugging Face Spaces (`temp_hf_deploy/`)**:
   - Containerized deployment configured with Docker SDK targeting port `7860`.
3. **Frontend Static Hosting (Vercel / Netlify / Cloudflare Pages)**:
   - Vite builds static SPA bundles into `dist/` deployable to any edge CDN.

### Build & Deploy Commands

#### 1. Full Stack Local / Docker Compose Deployment
```bash
# Start PostgreSQL, Redis, and Backend
docker-compose up --build -d

# Build Frontend for Production
cd astrology-frontend
npm install
npm run build
```

#### 2. Hugging Face Spaces Deployment
```bash
# In the temp_hf_deploy directory
git init
git remote add origin https://huggingface.co/spaces/BrocoAI/trikal-darshi-api
git add .
git commit -m "Deploy Trikal Darshi API"
git push -u origin main --force
```

### CI / CD Pipeline
- **Status**: No GitHub Actions or external CI/CD workflows are currently configured in the repository (`.github/workflows` not found in codebase). Deployment is currently performed manually via Docker Compose or Git push to Hugging Face Spaces. *(inferred)*

---

## 11. Testing

### Testing Frameworks & Coverage
- **Backend Test Runner**: Python `unittest` / direct execution scripts inside `astrology-backend/tests/`.
- **Covered Tests**:
  - [`test_pipeline.py`](file:///d:/AstrologyApp/astrology-backend/tests/test_pipeline.py): End-to-end test verifying RAG retrieval from ChromaDB and live LLM streaming.
  - [`test_live_stream.py`](file:///d:/AstrologyApp/astrology-backend/tests/test_live_stream.py): HTTP streaming test validating SSE/token streaming via Uvicorn.
  - [`test_raw_stream.py`](file:///d:/AstrologyApp/astrology-backend/tests/test_raw_stream.py): Direct LLM client streaming validation.
  - [`test_astrology_raw.py`](file:///d:/AstrologyApp/astrology-backend/tests/test_astrology_raw.py): Verifies raw ephemeris output and planetary positions.
- **Frontend Testing**: ESLint is configured (`npm run lint`). Unit tests (Jest/Vitest) and End-to-End tests (Cypress/Playwright) are not currently present in the codebase.

### How to Run Tests Locally
```bash
# Run backend pipeline integration test
cd astrology-backend
python -m tests.test_pipeline

# Run frontend linting
cd ../astrology-frontend
npm run lint
```

---

## 12. Error Handling & Logging

### Global Error Handling Approach
- **FastAPI HTTP Exceptions**: Endpoints raise structured `HTTPException` with semantic status codes (`400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `422 Unprocessable Entity`, `502 Bad Gateway`).
- **Resilient Background Execution**: Background workers execute tasks using `asyncio.gather(..., return_exceptions=True)`, preventing a single tab failure from crashing the remaining tab generation jobs.
- **Database Self-Healing**: Connection errors during dual-pool acquisition fall back to secondary pools before surfacing errors.

### Logging Strategy
- Configured in `main.py` using Python's standard `logging` library:
  ```python
  logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
  ```
- Subsystems tag logs with clear context prefixes: `[pipeline]`, `[bg_gen]`, `[prefetch]`, `[geocoding]`, `[chat]`, `[translator]`.

---

## 13. Performance & Scaling Notes

### Caching Strategy
- **Layer 1: Redis In-Memory Cache**:
  - Complete birth chart JSON cached for 30 days (`chart:{dob}:{tob}:{lat}:{lng}:{lang}`).
  - AI-generated interpretations cached for 30 days (`interpretation:{chart_id}:{tab_number}:{language}`).
  - Pre-fetched RAG context chunks cached for 1 hour (`rag_context:{chart_id}:{tab_number}:{k}`).
  - Geocoding results cached for 30 days (`geocode_cache:{city}`).
- **Layer 2: ChromaDB Persistent Embeddings**:
  - Book chunk embeddings are persisted to disk in `chroma_db/`, avoiding re-embedding overhead on server restarts.

### Bottlenecks & Scaling Considerations
- **LLM Rate Limits & Latency**: LLM generation is the highest-latency operation (3–10s per tab). Bounded background workers (`asyncio.Semaphore(2)`) and Redis distributed locks prevent rate-limit flooding.
- **Single-Host ChromaDB**: ChromaDB runs embedded in-process. For horizontal multi-instance scaling, migrating to a standalone Chroma or Qdrant vector cluster is recommended.
- **Database Connection Pool**: `asyncpg` pools are sized with `min_size=1, max_size=5`. For high-traffic loads, connection pool limits should be tuned according to PostgreSQL server capacity.

---

## 14. Known Limitations / Technical Debt

1. **Standalone ChromaDB / Horizontal Scaling**: The vector store is persisted locally on disk (`chroma_db/`). In multi-container or serverless deployments, each container must mount the directory or rebuild the index.
2. **Automated Test Suite**: Integration tests exist as standalone runnable scripts rather than structured `pytest` fixtures with continuous test automation.
3. **CI/CD Automation**: Deployment pipelines rely on manual container builds or Git pushes to Hugging Face Spaces rather than automated GitHub Actions CI/CD workflows.
4. **Ephemeris Data Files**: If Swiss Ephemeris `.se1` files are missing from `ephe/`, the engine falls back to Moshier mode, which has slightly lower astronomical precision for dates before 1800 AD.

---

## 15. Local Development Setup

### Prerequisites
- **Node.js**: v18.x or v20.x+
- **Python**: v3.11+
- **PostgreSQL**: v14+ or v15+
- **Redis**: v6+ or v7+
- **C/C++ Build Tools**: Required for compiling `pyswisseph` (e.g. Visual Studio Build Tools on Windows, `build-essential` on Linux).

### Step-by-Step Installation

#### 1. Clone & Set Up Backend
```bash
cd astrology-backend

# Create and activate virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env and supply DATABASE_URL, REDIS_URL, GEMINI_API_KEY, GOOGLE_CLIENT_ID, JWT_SECRET

# (Optional) Build RAG Vector Index if chroma_db does not exist
python rag/build_index.py

# Start Backend Dev Server (Runs on port 8000)
uvicorn main:app --reload --port 8000
```

#### 2. Set Up Frontend
```bash
cd ../astrology-frontend

# Install node dependencies
npm install

# Configure environment variables
cp .env.example .env
# Ensure VITE_GOOGLE_CLIENT_ID matches your Google OAuth credentials

# Start Frontend Dev Server (Runs on http://localhost:5173)
npm run dev
```

#### 3. Verify Local Setup
- Backend Health Check: `GET http://localhost:8000/health` → `{"status": "ok", "db": "connected", "redis": "connected"}`
- Interactive API Docs: `http://localhost:8000/docs`
- Frontend Web App: `http://localhost:5173`

---

## 16. Glossary

- **Lagna (Ascendant)**: The zodiac sign rising on the eastern horizon at the exact time and location of birth; represents the physical self, vitality, and life blueprint.
- **Kundali**: The traditional Vedic horoscope chart mapping planetary placements across 12 Bhavas (houses).
- **Vargas (Divisional Charts)**: Harmonic subdivisions of the 360° zodiac used to analyze specific life domains:
  - **D1 (Rashi)**: General life foundation and physical existence.
  - **D4 (Chaturthamsa)**: Fixed assets, home, real estate, and mother's lineage.
  - **D7 (Saptamsha)**: Children, progeny, and creative legacy.
  - **D9 (Navamsha)**: Marriage, spouse destiny, dharma, and soul strength.
  - **D10 (Dashamsha)**: Career, profession, status, and leadership destiny.
  - **D30 (Trimsamsa)**: Afflictions, chronic health, misfortunes, and vitality.
- **Chandra Kundali**: Moon chart where the sign occupied by the Moon is treated as the 1st house (Ascendant).
- **Surya Kundali**: Sun chart where the sign occupied by the Sun is treated as the 1st house.
- **Gochar**: Real-time planetary transits moving across natal houses.
- **Lahiri / Chitrapaksha Ayanamsha**: The astronomical precession correction value used to convert tropical (Sayana) longitudes into sidereal (Nirayana) Vedic zodiac coordinates.
- **Vimshottari Dasha**: A 120-year planetary cycle ruling specific time chapters (Mahadashas and Antardashas) of an individual's life.
- **Lal Kitab**: An ancient branch of North Indian astro-palmistry specializing in ancestral/karmic debts (*Rin*), permanent houses (*Pakka Ghar*), and non-ritualistic practical remedies (*Farmaan*).
- **Ashtakavarga**: A quantitative 8-fold scoring system evaluating the inherent strength of houses and planetary transits.
- **Moolank / Bhagyank / Namank**: Core Vedic and Chaldean numerological numbers representing the Psychic number (Day of birth), Destiny number (Full DOB sum), and Name number (Chaldean letter sum).

---

## 17. Learning Notes (for Project Maintainers)

1. **Vedic Astrological Coordinate Systems & Swiss Ephemeris (`services/ephemeris.py`)**:
   - Review how `swe.houses_ex()` and `swe.calc_ut()` apply the Lahiri ayanamsha (`swe.SIDM_LAHIRI`).
   - Understand the conversion from tropical Julian Day to sidereal longitudes and Whole-Sign house mapping (`((planet_sign - asc_sign + 12) % 12) + 1`).
2. **RAG Vector Search with LangChain & ChromaDB (`rag/pipeline.py`, `rag/retriever.py`)**:
   - Study how shastra domain queries in `TAB_QUERIES` are dynamically combined with personal chart keywords to fetch hyper-targeted shastra passages without blowing the LLM token budget.
3. **Resilient Background Pre-generation (`services/background_generator.py`)**:
   - Understand how `asyncio.Semaphore(2)` prevents API rate limits while `asyncio.to_thread` prevents CPU/blocking network calls from starving the main FastAPI event loop.
   - Review Redis distributed locking (`SET key value NX EX 600`) to avoid duplicate concurrent runs.
4. **Dual Database Pool Redundancy (`db/database.py`)**:
   - Review the `DualPool` and `DualConnection` pattern that executes dual writes and automatic failover reads across primary and secondary PostgreSQL connections.
5. **Modern React 19 Streaming & Internationalization (`TabNavigation.jsx`, `AskAI.jsx`, `i18n.js`)**:
   - Study how browser `fetch()` and `ReadableStreamDefaultReader` consume raw text chunks from FastAPI `StreamingResponse` for smooth real-time Markdown rendering.
