# DEPLOYMENT — Trikal Darshi

## Deployment Targets (actual)

### 1. Hugging Face Spaces (primary, live)
- Space: `https://huggingface.co/spaces/BrocoAI/trikal-darshi-api` (README.md badge link).
- **Docker SDK** deployment — `astrology-backend/Dockerfile`:
  - `python:3.11-slim` + `build-essential` (compiles pyswisseph)
  - `mkdir /.cache && chmod 777` for HF writable cache dirs (Dockerfile:14)
  - `EXPOSE 7860`; `CMD uvicorn main:app --host 0.0.0.0 --port 7860`
- Port 7860 is the HF Spaces convention; the app also defaults to it in compose (`docker-compose.yml:40`) and root `/` exists purely as the HF health check (`main.py:70`).
- Deploy mechanics: **manual `git push`** from the `temp_hf_deploy/` folder (a gitignored mirror of the backend) to the HF remote. `PROJECT_DOCUMENTATION.md` §10 records the exact commands:
  ```bash
  cd temp_hf_deploy
  git init && git remote add origin https://huggingface.co/spaces/BrocoAI/trikal-darshi-api
  git add . && git commit -m "Deploy Trikal Darshi API" && git push -u origin main --force
  ```
- The frontend is **not** in this container; only the API + RAG store. The SPA would be hosted separately (Vercel/Netlify per docs) — no frontend deployment config exists in the repo.

### 2. Docker Compose (self-host stack)
`docker-compose.yml` (schema v3.8) defines three services — **no frontend service**:

| Service | Image | Port | Notes |
|---|---|---|---|
| `db` | postgres:15-alpine | 5432 | volume `postgres_data`; creds from `DB_USER/DB_PASSWORD/DB_NAME` (defaults postgres/securepassword/astrology_db) |
| `redis` | redis:7-alpine | 6379 | volume `redis_data` |
| `backend` | built from `./astrology-backend/Dockerfile` | **7860:7860** | injects DATABASE_URL (pointing at `db` service), REDIS_URL, all LLM keys, `APP_ENV=production` |

Note the port inconsistency: compose maps host 7860, while local dev runs uvicorn on 8000. Frontend would run `npm run build` + static hosting pointed at the backend URL via `VITE_API_URL`.

### 3. Local dev
- Backend: `python main.py` (uvicorn with reload, port `PORT` env or 8000, `main.py:113-125`).
- Frontend: `npm run dev` (Vite, port 5173, `vite.config.js`).
- See SETUP.md for the full verified procedure.

## CI/CD & Automation

- GitHub Actions: `.github/workflows/backend-keepalive.yml` runs every 48 hours to ping the Hugging Face Space health endpoint (`https://brocoai-trikal-darshi-api.hf.space/health`), preventing HF free-tier Spaces from sleeping.
- Deployment to Hugging Face Spaces is performed by pushing the `temp_hf_deploy/` directory to the Space git remote `origin main`.

## Required Environment Variables

Backend (from `.env.example` + code scan; the live `.env` matches this shape):

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | **Yes** (startup aborts without a working DB, `db/database.py:163`) | primary Postgres DSN |
| `LOCAL_DATABASE_URL` | No | secondary Postgres DSN for DualPool failover |
| `REDIS_URL` | Yes (soft-fails per op) | `redis://localhost:6379` |
| `CLOUDFLARE_ACCOUNT_ID` | **Yes** for Tier-1 LLM | Cloudflare Account ID |
| `CLOUDFLARE_API_TOKEN` | **Yes** for Tier-1 LLM | Workers AI permission API token |
| `CLOUDFLARE_MODEL` | No | Default: `@cf/meta/llama-3.3-70b-instruct-fp8-fast` (Indic: `@cf/deepseek-ai/deepseek-r1-distill-qwen-32b`) |
| `GEMINI_API_KEY` | **Yes** for full function (Tier-2 LLM fallback) | Google AI Studio key |
| `GEMINI_MODEL` | No | default `gemini-2.5-flash` |
| `GEMINI_CHAT_API_KEY` | No | dedicated key for AskAI chat stream |
| `GEMINI_TRANSLATION_KEY` | No | dedicated key for HI/BN translation jobs |
| `GROQ_API_KEY` | No (recommended) | Groq fallback tiers (`qwen/qwen3.8-27b`, `openai/gpt-oss-120b`, `openai/gpt-oss-20b`) |
| `OPENROUTER_API_KEY` / `OPENROUTER_MODEL` | No | safety-net tier (`qwen/qwen3.8-27b:free`) |
| `ASTROLOGYAPI_USER_ID` / `ASTROLOGYAPI_API_KEY` | No | external ephemeris; without it the app is pure Swiss Ephemeris |
| `GOOGLE_CLIENT_ID` | For Google login | backend token verification |
| `JWT_SECRET` | For auth | HS256 signing |
| `CORS_ORIGINS` | Yes in production | comma-separated origins; empty + `APP_ENV=development` → `*`; empty + production → **all CORS blocked** (`main.py:15-24`) |
| `APP_ENV` | No | `development` / `production` (default production) |
| `HOST` / `PORT` | No | bind address, default `0.0.0.0:8000` (7860 on HF) |

Frontend (`.env` / `.env.local`):

| Variable | Required | Purpose |
|---|---|---|
| `VITE_API_URL` | No (defaults `http://localhost:8000`) | backend base URL (`src/services/api.js:6`) |
| `VITE_GOOGLE_CLIENT_ID` | For Google login | `src/main.jsx:8`; placeholder falls back gracefully |
| `VITE_MOCK_MODE` | No | `true` = fully offline demo with mock data (`.env.example` actually ships it as `true`) |

Docker-compose-only vars: `DB_USER`, `DB_PASSWORD`, `DB_NAME`.

## Build & Start Commands

```bash
# ── Backend (local) ─────────────────────────────
cd astrology-backend
python -m venv venv && venv\Scripts\activate        # Win; source venv/bin/activate on *nix
pip install -r requirements.txt                     # needs C build tools for pyswisseph
# configure .env (see table above)
python main.py                                      # :8000 with hot reload
# or: uvicorn main:app --reload --port 8000

# ── RAG index (only if chroma_db/ is missing) ───
python rag/build_index.py                           # books/*.pdf → chroma_db/

# ── Frontend ────────────────────────────────────
cd astrology-frontend
npm install
npm run dev                                         # :5173
npm run build                                       # → dist/ (static, host anywhere)
npm run preview                                     # serve the build locally

# ── Docker Compose (pg + redis + backend) ───────
docker compose up --build -d
```

## Operations Scripts (`astrology-backend/scripts/`)

18 utilities — noteworthy ones: `init_db.py` (apply schema standalone), `flush_all_db.py` / `clear_db.py` (**destructive wipes**), `flush_cache.py` / `clear_cache.py` (Redis), `check_db.py` / `check_schema.py` / `check_keys.py` (health/debug), `generate_training_data.py` (fine-tuning corpus, dormant).

## Health & Observability

- `GET /health` → `{status, db, redis}` — pings both stores (`main.py:82`).
- `GET /` → version banner for HF Spaces.
- Logging: stdlib `logging`, INFO level, prefixed subsystems (`[pipeline]`, `[bg_gen]`, `[geocoding]`, `[chat]`). No metrics/APM/tracing.

## Deployment Risks Worth Knowing

1. **Remote DB dependency in the live `.env`** — `DATABASE_URL` points at an Aiven cloud instance; if the instance lapses the backend cannot boot (see STATUS_AUDIT.md — this is exactly what happened on this machine).
2. **No CI** — nothing tests the Docker build or lint before pushes.
3. **Single-process ChromaDB** — the 54 MB vector index must ship with the image or be rebuilt on start (`build_vectorstore(force_rebuild=False)` auto-builds from `books/` if missing — slow first boot on HF).
4. **HF ephemeral filesystem** — Postgres/Redis must stay external; the compose file's local containers are not usable from HF.
5. **CORS trap** — deploying with `APP_ENV=production` and no `CORS_ORIGINS` silently blocks every browser client (`main.py:21-24`).
