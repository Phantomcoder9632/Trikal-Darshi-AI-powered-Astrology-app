# TECH_STACK — Trikal Darshi

Two applications + auxiliary subsystems. Versions marked ✅ were verified from the **installed** environments on this machine (`.venv` Python 3.13.5 / `astrology-frontend/node_modules`); `requirements.txt` pins nothing (all ranges-free), so installed versions are what actually matter.

## 1. Backend — Python / FastAPI (`astrology-backend/`)

Runtime: **Python 3.11+** declared (`Dockerfile:1` uses `python:3.11-slim`; backend README says 3.11+). System Python here is 3.14.6, working venv is **3.13.5**.

From `astrology-backend/requirements.txt` (20 direct deps, unpinned) — installed versions ✅:

| Package | Purpose | Installed |
|---|---|---|
| `fastapi` | REST API framework | 0.136.3 |
| `uvicorn[standard]` | ASGI server (+ websockets, watchfiles) | 0.48.0 |
| `asyncpg` | Async PostgreSQL driver | 0.31.0 |
| `redis` | Async Redis client (`redis.asyncio`) | 8.0.0 |
| `httpx` | Async HTTP (Nominatim, tests) | 0.28.1 |
| `python-dotenv` | `.env` loading | 1.2.2 |
| `openai` | OpenAI-compatible SDK (Gemini/Groq/OpenRouter tiers) | 2.38.0 |
| `groq` | Groq SDK (pipeline imports it for rate-limit detection) | 0.37.1 |
| `pyswisseph` | Swiss Ephemeris C bindings (imported as `swisseph`) | 2.10.3.2 |
| `python-multipart` | Form parsing | 0.0.30 |
| `langchain` | RAG framework | 1.3.2 |
| `langchain-community` | Legacy Chroma fallback import | 0.4.2 |
| `langchain-groq` | (available; pipeline uses raw SDKs) | 1.1.2 |
| `langchain-huggingface` | HF embeddings wrapper | 1.2.2 |
| `langchain-chroma` | Chroma vector store wrapper | 1.1.0 |
| `chromadb` | Embedded vector DB | 1.5.9 |
| `sentence-transformers` | `all-MiniLM-L6-v2` embeddings | 5.5.1 |
| `pymupdf` | PDF text extraction (`fitz`) | 1.27.2.3 |
| `tqdm` | Progress bars | 4.67.3 |
| `google-auth` | Google OAuth token verification | 2.57.1 |
| `pyjwt` | HS256 JWT issue/verify | 2.13.0 |
| `email-validator` | Pydantic `EmailStr` | 2.3.0 |

Transitive heavyweights pulled in: `torch 2.12.0`, `transformers 5.9.0`, `scikit-learn 1.8.0`, `SQLAlchemy 2.0.50`, `grpcio 1.81.0` (via chromadb).

Standard library used for crypto: `hashlib.pbkdf2_hmac` (100k iterations) + `secrets` (`services/security.py`) — no passlib/bcrypt dependency.

## 2. Frontend — React SPA (`astrology-frontend/`)

Node 20.20.2 / npm 10.8.2 on this machine. From `astrology-frontend/package.json`:

**Dependencies (runtime):**

| Package | Version (spec) | Purpose |
|---|---|---|
| `react` / `react-dom` | `^19.2.6` | UI (React 19) |
| `react-router-dom` | `^7.16.0` | Client routing (`/`, `/dashboard/:chartId`, `/chat`, `/charts`) |
| `axios` | `^1.16.1` | REST client + JWT interceptor (`src/services/api.js:14`) |
| `@react-oauth/google` | `^0.13.5` | Google Identity Services (`src/main.jsx`) |
| `i18next` / `react-i18next` | `^26.3.1` / `^17.0.8` | EN/HI/BN UI localization |
| `tailwindcss` + `@tailwindcss/vite` | `^4.3.0` | Tailwind 4 via Vite plugin (v4 = CSS-first config, no `tailwind.config.js`) |

**DevDependencies (build/lint):**

| Package | Version (spec) |
|---|---|
| `vite` | `^8.0.12` (installed ✅ 8.0.14, Rolldown-powered) |
| `@vitejs/plugin-react` | `^6.0.1` |
| `eslint` | `^10.3.0` |
| `@eslint/js` | `^10.0.1` |
| `eslint-plugin-react-hooks` | `^7.1.1` |
| `eslint-plugin-react-refresh` | `^0.5.2` |
| `globals` | `^17.6.0` |
| `@types/react` / `@types/react-dom` | `^19.2.14` / `^19.2.3` |

No test framework (Jest/Vitest/Playwright) is installed. TypeScript is not used — plain JSX.

**Runtime-in-browser assets (CDN, `index.html`):** Google Fonts (Outfits, Cinzel Decorative per README), Material Symbols Outlined icons.

**Styling reality-check:** Tailwind 4 classes are used, but the bulk of the design system is ~5,100 lines of hand-written CSS in `src/index.css` + `src/styles/theme.css` (cosmic themes via `body.theme-*` classes). README's claim of "no Tailwind dependency" is outdated.

## 3. Data Stores

| Store | Version | Role |
|---|---|---|
| PostgreSQL | 15-alpine (docker-compose.yml:6); local install present | users, charts (JSONB), interpretations, chat_messages, api_usage |
| Redis | 7-alpine (docker-compose.yml:16); local service running | 30-day caches, rate limiting, distributed locks |
| ChromaDB | 1.5.9 (embedded, on-disk `chroma_db/`, 54 MB, 6,129 chunks) | RAG vector index of classical texts |

## 4. External Services & APIs

| Service | Used for | Client |
|---|---|---|
| **Google AI Studio (Gemini)** `gemini-2.5-flash` | Primary LLM for interpretations, chat, translations | OpenAI-compatible endpoint `generativelanguage.googleapis.com/v1beta/openai/` (`services/llm_providers.py:11-17`) |
| **Groq** | LLM fallback tiers ×4: `llama-3.3-70b-versatile`, `qwen/qwen3-32b`, `openai/gpt-oss-120b`, `llama-3.1-8b-instant` | OpenAI-compatible `api.groq.com/openai/v1` |
| **OpenRouter** | Safety-net tier `meta-llama/llama-3.3-70b-instruct:free` | OpenAI-compatible `openrouter.ai/api/v1` |
| **AstrologyAPI.com** | Primary ephemeris provider (≤200 calls/month quota guard) | REST `services/astrologyapi.py` (15 parallel calls per chart) |
| **OSM Nominatim** | City → lat/lng geocoding (1 s rate limit, 30-day cache) | `routes/geocode.py:36` |
| **Google Identity Services** | OAuth login | `@react-oauth/google` + `google-auth` verification |
| **Hugging Face Hub** | Downloads `all-MiniLM-L6-v2` embedding model | `sentence-transformers` |

## 5. Infrastructure

- **Docker** + **Docker Compose** (`docker-compose.yml`, version `3.8`): postgres:15-alpine, redis:7-alpine, backend image from `astrology-backend/Dockerfile` (python:3.11-slim + build-essential).
- **Hugging Face Spaces** (Docker SDK, port 7860) — see DEPLOYMENT.md.
- **No CI/CD** — no `.github/workflows/` exists.

## 6. Fine-tuning subsystem (`astrology-backend/astrology_finetuning/`)

A separate, **not-installed** pipeline (its own `requirements_training.txt`) for distilling the app's prompt+RAG behavior into a local GGUF model:

- Unsloth QLoRA trainer (`train_unsloth.py`): `torch>=2.3.0`, `unsloth>=2024.8`, `transformers>=4.45`, `datasets`, `peft`, `trl`, `accelerate`, `bitsandbytes`, `llama-cpp-python`.
- Dataset generator `scripts/generate_training_data.py` (uses the live backend engines + Gemini to synthesize ~1,420 ChatML examples in EN/HI/BN).
- Status: **effectively abandoned / incomplete** — `stats/dataset_report.md` shows generation stopped after 1 sample on 2026-09-07 with `all_providers_exhausted_during_tabs` (API quota exhaustion). The 1,420-example corpus described in its README does not exist.
- Not imported by the app; safe to ignore for running the product.

## 7. Stray/legacy copies

- `temp_hf_deploy/` — full duplicate of the backend used for HF Spaces pushes (gitignored, files unreadable by tooling). Treat as a deployment artifact, not source of truth.
- `venv/` and `.venv/` (root) — two Python virtualenvs, both Python 3.13.5 with the backend deps installed (142 and ~120 packages). Project docs reference `astrology-backend/venv`, which doesn't exist.
- Root `package-lock.json` — orphaned Node lockfile with no `package.json`; frontend deps live in `astrology-frontend/package-lock.json`.
