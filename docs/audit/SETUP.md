# SETUP — Running Trikal Darshi from a Fresh Clone

Verified on this machine (Windows, Git Bash, Node 20.20.2, Python 3.13.5). Where behavior differs by OS, both variants are given.

## Prerequisites

| Tool | Version | Why |
|---|---|---|
| Node.js | 18+ (tested 20.x) | frontend |
| Python | 3.11+ (tested 3.13) | backend; needs a C compiler for `pyswisseph` (MSVC Build Tools on Windows, `build-essential` on Linux) |
| PostgreSQL | 14+ | data |
| Redis | 6+ | cache/locks |

## 1. Clone

```bash
git clone https://github.com/Phantomcoder9632/Trikal-Darshi-AI-powered-Astrology-app.git
cd Trikal-Darshi-AI-powered-Astrology-app
```

## 2. Infrastructure — Postgres + Redis

Easiest (from repo root):

```bash
docker compose up -d db redis
# creates astrology_db with user postgres / securepassword (docker-compose.yml defaults)
```

Or use installed services. Create the database (schema is auto-created by the app at startup):

```bash
createdb astrology_db          # or: CREATE DATABASE astrology_db;
```

The backend self-heals its schema on every boot (`db/database.py:initialize_schema`) — manually running `db/schema.sql` is optional. Redis needs no setup.

## 3. Backend

```bash
cd astrology-backend
python -m venv venv
venv\Scripts\activate                # Windows
# source venv/bin/activate           # macOS/Linux

pip install -r requirements.txt
cp .env.example .env
```

Edit `.env` — minimal for a local run:

```env
DATABASE_URL=postgresql://postgres:securepassword@localhost:5432/astrology_db
REDIS_URL=redis://localhost:6379
GEMINI_API_KEY=<google-ai-studio-key>      # primary LLM
GROQ_API_KEY=<groq-key>                    # optional but recommended (fallbacks)
OPENROUTER_API_KEY=<openrouter-key>        # optional
JWT_SECRET=<any-long-random-string>
GOOGLE_CLIENT_ID=<your-google-oauth-client-id>   # only needed for Google sign-in
CORS_ORIGINS=http://localhost:5173
APP_ENV=development
```

> ⚠️ If your DB password contains `@`, URL-encode it (`@` → `%40`) — backend README warns about this, and the repo's own history contains such a password.

Optional integrations: `ASTROLOGYAPI_USER_ID` + `ASTROLOGYAPI_API_KEY` (paid ephemeris; without them the app runs entirely on local Swiss Ephemeris). The `ephe/*.se1` ephemeris files and `books/*.pdf` corpus are already in the repo — no downloads needed (except the embedding model, fetched from HF Hub on first start).

Run:

```bash
python main.py                 # http://localhost:8000 — hot reload enabled
# first boot builds the RAG index if chroma_db/ is absent (slow; the repo ships a prebuilt 54 MB chroma_db)
```

Verify: `curl http://localhost:8000/health` → `{"status":"ok","db":"connected","redis":"connected"}` and Swagger UI at http://localhost:8000/docs.

## 4. Frontend

```bash
cd astrology-frontend
npm install
cp .env.example .env
```

Edit `astrology-frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=<same-google-client-id>
VITE_MOCK_MODE=false        # set 'true' to demo the UI with zero backend
```

Run:

```bash
npm run dev        # http://localhost:5173
```

## 5. First Use Flow

1. Open http://localhost:5173 — pick UI language (EN/HI/BN) on first visit.
2. Register with email+password (Google sign-in requires a configured OAuth client).
3. Enter birth details → chart is computed (AstrologyAPI if key present and under monthly quota, else Swiss Ephemeris) and you land on `/dashboard/{chartId}`.
4. All 11 tab readings generate in the background (watch the progress bar); individual tabs can be re-streamed on demand; AskAI chat persists per chart.

## Quick Verification Checklist

| Check | Command / URL | Expected |
|---|---|---|
| Backend up | `curl http://localhost:8000/health` | `db: connected`, `redis: connected` |
| Frontend up | open :5173 | landing page renders |
| Geocoding | POST `/geocode` `{"city":"Kolkata"}` | lat/lng returned |
| Chart | POST `/chart/generate` (body per `models/chart.py:ChartRequest`) | 201 + chart JSON |
| LLM tier | any interpretation tab streams text | ≥1,000 chars, saves to DB |

## Troubleshooting

- **`ValueError: Both primary (DATABASE_URL) and secondary (LOCAL_DATABASE_URL) pools failed to initialize.`** — Postgres unreachable or wrong credentials in `.env`. This exact error occurs when the shipped `.env` points at the original owner's remote Aiven DB (`pg-...e.aivencloud.com:22952`), which no longer resolves. Point `DATABASE_URL` at your own local Postgres.
- **`password authentication failed for user "postgres"`** — fix the password in `DATABASE_URL` (URL-encode special chars).
- **pyswisseph install fails** — install a C toolchain first (Windows: VS Build Tools "Desktop development with C++").
- **`chroma_db not found ... Run: python rag/build_index.py`** — the shipped vector index was deleted; rebuild from `books/` (needs internet for the embedding model).
- **RAG init warning at boot** — non-fatal; server runs, AI answers lose classical-text grounding.
- **CORS errors in browser** — set `CORS_ORIGINS=http://localhost:5173` and `APP_ENV=development`, restart backend.
- **Stale-port mismatch** — backend dev is 8000; Docker/backend-container deployments use 7860. Align `VITE_API_URL` accordingly.
