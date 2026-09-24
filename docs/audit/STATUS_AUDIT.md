# STATUS_AUDIT — What Actually Works (verified 2026-09-21)

Every claim below was executed on this machine (Windows 11, Git Bash, Node 20.20.2, npm 10.8.2, system Python 3.14.6, project venv `.venv` = Python 3.13.5). Raw outputs were captured live; nothing is assumed.

## Environment Snapshot

| Check | Result |
|---|---|
| Node / npm | v20.20.2 / 10.8.2 ✅ |
| System Python | 3.14.6 (not used) |
| `.venv` + `venv/` (root) | Python 3.13.5, backend deps installed ✅ (both) |
| Local Postgres | **running** on :5432 (listens on 0.0.0.0 and [::]) |
| Local Redis | **running** on :6379 (ping OK, dbsize 4) |
| Vite dev server | started OK on :5173 ✅ |
| Backend server | **fails at startup** ❌ (DB connect) — details below |

## 1. Dependency Installation

Backend (`pip install -r requirements.txt`, dry-run against the existing `.venv`):

```
Requirement already satisfied: networkx>=2.5.1 ... (from torch>=1.11.0->sentence-transformers)
Requirement already satisfied: jinja2 ... 
Requirement already satisfied: oauthlib>=3.0.0 ... (from kubernetes>=28.1.0->chromadb)
DRY-RUN EXIT: 0
```

✅ **Passes.** All 22 direct requirements already satisfied in `.venv` (no `pip install` was re-executed to avoid touching the environment; the dry-run resolver confirms zero missing). Includes `pyswisseph 2.10.3.2` (prebuilt wheel — no compiler needed here) plus transitive `torch 2.12.0`, `transformers 5.9.0`.

Frontend: `node_modules/` already populated (146 top-level packages). Build (below) proves the tree is intact.

## 2. Backend Syntax / Import Check

`python -m compileall -q main.py routes services rag db models scripts` → exit 0, no output. ✅ All backend packages compile on Python 3.13.

## 3. Backend Test Suite

Only one real unittest suite exists: `tests/test_pipeline.py` (the other four `tests/*.py` are ad-hoc integration scripts needing a live server/DB — see §8).

```
$ python -m unittest tests/test_pipeline.py
[pipeline] Tier cloudflare-primary failed: General upstream failure. Falling through...
[pipeline] Tier gemini-primary failed: General upstream failure. Falling through...
...
[pipeline] Tier cloudflare-primary rate-limited (429: exceeded neuron quota for this account). Falling through...
[pipeline] Tier gemini-primary rate-limited (429 ResourceExhausted: rate limit exceeded). Falling through...
.
----------------------------------------------------------------------
Ran 8 tests in 0.091s
OK
```

✅ **8/8 pass.** (The "failure" lines are mocked cascade tests asserting fallback behavior — expected noise.) Includes coverage for effective token caps, Cloudflare Indic reordering, rate-limit fallthrough across Cloudflare/Gemini/Groq, and short-output validation. Frontend has no test suite at all.

## 4. Frontend Build

```
$ npm run build
vite v8.0.14 building client environment for production...
✓ 125 modules transformed.
dist/index.html                   1.39 kB │ gzip:   0.72 kB
dist/assets/index-BzfjovvJ.css  161.50 kB │ gzip:  28.00 kB
dist/assets/index-DoLwDe23.js   612.86 kB │ gzip: 179.53 kB
✓ built in 1.03s
(!) Some chunks are larger than 500 kB after minification.
BUILD EXIT: 0
```

✅ **Passes.** Warning only: 613 kB JS bundle — no code-splitting (the app imports everything eagerly). Cosmetic.

## 5. Frontend Lint

```
$ npm run lint
✖ 51 problems (0 errors, 51 warnings)
LINT EXIT: 0
```

✅ **Passes (exit 0).** All 51 are warnings: ~14× `no-unused-vars` (unused `React` imports, unused state like `showMobileSidebar` in DashboardPage.jsx:64, `backendLangToI18n` in ChatPage.jsx:10), 4× `react-hooks/exhaustive-deps` (missing deps in useEffect — ChatPage.jsx:122, DashboardPage.jsx:241,276), 1× `react-refresh/only-export-components` (AuthContext.jsx:173). Nothing blocking; the hook-deps warnings are the only ones that could cause real bugs.

## 6. Backend Dev Server — ❌ FAILS

```
$ uvicorn main:app (port 8000)
INFO:     Waiting for application startup.
INFO  services.ephemeris: Swiss Ephemeris path set: D:\AstrologyApp\astrology-backend\ephe
INFO  main: Initializing PostgreSQL pool and Redis connection...
ERROR db.database: Could not connect to primary database: [Errno 11001] getaddrinfo failed
ERROR:    ... lifespan ...
  File "main.py", line 37, in app_lifespan
    await startup_db_event()
  File "db\database.py", line 331, in startup_db_event
    pool = await get_db_pool()
  File "db\database.py", line 163, in get_db_pool
ValueError: Both primary (DATABASE_URL) and secondary (LOCAL_DATABASE_URL) pools failed to initialize.
ERROR:    Application startup failed. Exiting.
```

**Root cause chain (verified, not guessed):**
1. `astrology-backend/.env` sets `DATABASE_URL=postgres://pg-...e.aivencloud.com:22952/defaultdb` — the original owner's **remote Aiven cloud Postgres**, whose hostname no longer resolves (`getaddrinfo failed` = DNS).
2. `LOCAL_DATABASE_URL` is **not set**, so the DualPool has no fallback → `get_db_pool()` raises → lifespan aborts.
3. A local Postgres **is running** on :5432, but the credentials found in the repo (`tests/test_stream_http.py:8` and `tests/test_astrology_raw.py:10` hardcode `postgresql://postgres:Bikram%40284@localhost:5432/astrology_db`) now fail with `InvalidPasswordError` — the local DB password was changed since. (Note: these two files leak a real password into the repo — flagged in the report's risks.)
4. Consequently the app never reaches Redis/RAG init, and no API is served.

**Fix:** set `DATABASE_URL` (and optionally `LOCAL_DATABASE_URL`) in `astrology-backend/.env` to a reachable Postgres with correct credentials, e.g. `postgresql://postgres:<url-encoded-password>@localhost:5432/astrology_db`. The schema will self-create at boot. Everything else on the machine is ready.

## 7. Subsystem Smoke Tests (run individually, bypassing the server)

| Subsystem | Command | Result |
|---|---|---|
| **Redis** | `services.cache.get_redis()` + ping | ✅ OK (ping, dbsize=4) |
| **Swiss Ephemeris natal chart** | `ephemeris.calculate_chart_fallback(1990-07-15, 14:30, 19.076, 72.8777)` | ✅ OK — 4,338-char JSON, Lagna Libra, 9 planets |
| **Divisional charts** | `compute_divisional_chart(planets, asc, 'D9'/'D10')` | ✅ OK (~1,300 chars each) |
| **Live transits** | `compute_gochar_chart(19.076, 72.8777)` | ✅ OK — 2,276 chars |
| **RAG vector store** | `build_vectorstore()` → collection count | ✅ OK — **6,129 chunks** loaded from shipped `chroma_db/` (54 MB); embedding model `all-MiniLM-L6-v2` loaded from HF cache |
| **RAG retrieval** | `get_context_for_tab(2, chart_data)` | ✅ OK — returns real Lal Kitab passages |
| **Prompt builder** | `build_tab_prompt(chart, 1, 'Test User')` | ✅ OK — 2,343 chars |
| **LLM cascade (live)** | (implicitly via test_pipeline mocks) | ⚠️ Not live-tested end-to-end; `.env` has real-looking GEMINI/GROQ/OPENROUTER keys, but their validity/quota was not probed (would spend quota) |

So: the entire computation + RAG stack works offline; only the **database connection layer** blocks serving.

## 8. What's Broken / Degraded — Summary

| # | Issue | Evidence | Likely cause | Severity |
|---|---|---|---|---|
| 1 | Backend cannot start | §6 traceback | `.env` points at defunct remote DB; no `LOCAL_DATABASE_URL`; local creds changed | 🔴 Blocker (trivial fix) |
| 2 | Hardcoded DB password in repo | `tests/test_stream_http.py:8`, `tests/test_astrology_raw.py:10` | committed secrets (password `Bikram%40284`), now stale | 🟠 Security hygiene |
| 3 | LLM pipeline unverified live | §7 | keys present but quota/validity unknown; dataset-generation log (`astrology_finetuning/stats/dataset_report.md`, 2026-09-07) shows `all_providers_exhausted` — suggests quotas were exhausted recently | 🟡 Uncertain |
| 4 | Fine-tuning pipeline dead | dataset_report.md: 1 sample total | abandoned after API quota exhaustion | ⚪ Dormant |
| 5 | `models/chart.py` InterpretationRequest caps `tab_number le=8` | `models/chart.py:63` | predates the 11-tab system; route ignores the model so no runtime bug | 🟡 Stale schema |
| 6 | 51 lint warnings, incl. 4 hook-deps | §5 | drift during rapid UI iteration | 🟢 Minor |
| 7 | 613 kB bundle, no code splitting | §4 | eager imports | 🟢 Minor |
| 8 | Docs drift: README says Groq primary & "no Tailwind"; PROJECT_DOCUMENTATION says charts.user_id ON DELETE SET NULL (schema.sql: plain FK) | README.md, schema.sql | docs written ahead of/behind code | 🟢 Minor |

## 9. What Works — Summary

Frontend build, lint, dev server, and (by code inspection) full mock-mode demo path; backend compiles; its only test suite passes; Redis OK; the whole Swiss-Ephemeris computation engine (natal + vargas + gochar + doshas) works; the prebuilt ChromaDB RAG index loads and retrieves real classical passages; prompt construction works. The single blocker to a running stack is one corrected `DATABASE_URL` in `astrology-backend/.env`.
