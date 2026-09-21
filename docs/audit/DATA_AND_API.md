# DATA_AND_API — Trikal Darshi

## 1. Database Schema (PostgreSQL)

Source of truth: `astrology-backend/db/schema.sql` (mirror-maintained in `db/database.py` `EXPECTED_SCHEMA`, which self-heals drift at startup). Extension: `uuid-ossp`.

```
users ──< charts ──< interpretations
              │──< chat_messages (cascade delete)
api_usage (standalone audit log)
```

### users
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | `uuid_generate_v4()` |
| google_id | TEXT UNIQUE NOT NULL | Google sub, or `email:{email}` prefix for password users (auth.py) |
| email | TEXT UNIQUE NOT NULL | |
| name / picture | TEXT | display name, avatar URL |
| password_hash | TEXT | PBKDF2-SHA256, 100k iters, per-user salt (`services/security.py`) |
| preferred_language | TEXT DEFAULT 'english' | |
| created_at | TIMESTAMP | |

### charts
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | chart_id used everywhere in URLs |
| user_id | UUID FK→users | nullable — guest charts allowed |
| full_name | TEXT NOT NULL | native name |
| date_of_birth / time_of_birth | DATE / TIME NOT NULL | |
| city_of_birth / current_city | TEXT NOT NULL | |
| latitude / longitude | FLOAT NOT NULL | geocoded |
| timezone | TEXT DEFAULT 'Asia/Kolkata' | |
| birth_time_confidence | TEXT DEFAULT 'exact' | exact / approximate / unknown |
| ayanamsha | TEXT DEFAULT 'LAHIRI' | |
| data_source | TEXT DEFAULT 'astrologyapi' | astrologyapi / ephemeris |
| language | TEXT DEFAULT 'english' | content language for this chart |
| raw_chart_data | JSONB | **the whole computed chart**: natal planets, ascendant, D9/D10/D4/D7/D30, Chandra/Surya Kundali, dasha tree, ashtakavarga, yogas, doshas, panchang, numerology |
| created_at | TIMESTAMP | |

### interpretations
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| chart_id | UUID FK→charts | |
| tab_number | INT CHECK 1–11 | |
| tab_name | TEXT NOT NULL | |
| content | TEXT NOT NULL | AI markdown report |
| model_used | TEXT NOT NULL | e.g. `gemini-primary/gemini-2.5-flash` |
| language | TEXT DEFAULT 'english' | |
| generated_at | TIMESTAMP | |
| | | UNIQUE(chart_id, tab_number, language) — enables idempotent upserts |

### chat_messages
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | client-generated UUID (dedup on retry) |
| chart_id | UUID FK→charts ON DELETE CASCADE | |
| sender | TEXT | 'user' or 'ai' |
| text | TEXT NOT NULL | |
| created_at | TIMESTAMP | |

### api_usage
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| service | TEXT | e.g. 'astrologyapi' |
| endpoint | TEXT | |
| called_at | TIMESTAMP | quota math: `date_trunc('month', NOW())` (`hybrid.py:14-28`) |
| success | BOOLEAN | |

Note: `routes/chart.py` delete/get flows and `db/schema.sql` diverge slightly from the mermaid in `PROJECT_DOCUMENTATION.md` (which claims `ON DELETE SET NULL` for charts.user_id; schema.sql has a plain FK). schema.sql wins.

## 2. Redis Keys

| Key pattern | TTL | Contents |
|---|---|---|
| `chart:{dob}:{tob}:{lat}:{lng}:{lang}` | 30 d | full chart JSON (`cache.py:96`) |
| `interpretation:{chart_id}:{tab}:{lang}` | 30 d | one tab's markdown |
| `geocode_cache:{city}` | 30 d | `{lat,lng,display_name}` |
| `rag_context:{chart_id}:{tab}:{k}` | 1 h | pre-fetched RAG passages |
| `bg_gen_lock:{chart_id}` | 10 min | `SET NX` distributed lock for bg generator |
| rate-limit counters (security.py) | — | per-IP/user buckets for `RateLimiter` |

## 3. API Routes (FastAPI, verified via `@router` decorators)

Base: `http://localhost:8000` (dev) / `:7860` (HF). Interactive docs at `/docs` (Swagger) and `/redoc`. Frontend base URL: `VITE_API_URL` (default `http://localhost:8000`, `src/services/api.js:6`).

### Health (`main.py:70-110`)
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/` | – | HF Spaces health check, app info |
| GET | `/health` | – | pings Postgres + Redis → `{status, db, redis}` |

### Auth — `routes/auth.py`
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/auth/google` :189 | – | verifies Google ID token **or** access token (userinfo endpoint); upserts user; returns 30-day JWT |
| POST | `/auth/register` :336 | – | email+password; `RateLimiter("auth", limit=5)`; PBKDF2 hash |
| POST | `/auth/login` :400 | – | email+password; same limiter |

### Geocode — `routes/geocode.py`
| POST | `/geocode` :79 | – | `{city}` → `{lat, lng, display_name}`; 1 s Nominatim delay; 404 if unresolved, 502 on upstream error |

### Charts — `routes/chart.py` (router mounted with prefix `/chart`, `main.py:70`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/chart/gochar` :37 | – | live transit chart for `?lat&lng` (Swiss Ephemeris, computed at request time) |
| POST | `/chart/generate` :267 | optional JWT | 201; full pipeline (geocode→cache→hybrid compute→persist→bg pre-gen trigger) |
| PUT | `/chart/{chart_id}` :531 | required | update birth details, recompute, invalidate caches |
| GET | `/chart/{chart_id}` :802 | optional | owner check if user_id set |
| GET | `/chart` :876 | required | list current user's charts |
| DELETE | `/chart/{chart_id}` :966 | required | delete + cascade |

### Interpretations — `routes/interpret.py`
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/interpret/{chart_id}/{tab_number}` :34 | – (rate 15) | **streams** markdown text; tab 1–11; body `{language}`; cache-first |
| GET | `/interpret/{chart_id}` :217 | – | all cached interpretations `{ "1": "...", ... }` for `?language=` |

### Progress — `routes/progress.py`
| GET | `/progress/{chart_id}` :29 | – | `{completed_tabs[], percent, is_complete}` for bg pre-generation |

### Chat — `routes/chat.py`
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/chat` :35 | – (rate 10) | AskAI streaming reply; body: `{message, chart_id, history, user_msg_id, ai_msg_id, language}`; astrology-topic guard |
| GET | `/chat/history/{chart_id}` :166 | – | persisted per-chart conversation |

Auth style: `Authorization: Bearer <JWT>` (HS256, 30-day expiry, `JWT_SECRET`), enforced by `get_current_user` / `get_optional_current_user` dependencies in `services/security.py`.

## 4. Pydantic Models (`models/chart.py`)

- `ChartRequest` — validates generate/update payloads: name 1–200 chars, ISO date/time, lat ∈ [-90,90], lng ∈ [-180,180], `birth_time_confidence`, `ayanamsha` enum-ish, validator rejects future DOB.
- `ChartResponse`, `ChartSummary` — chart payloads.
- `InterpretationRequest` — note: `tab_number` here is still capped `le=8` (stale vs the 11-tab reality; the route layer ignores this model and uses raw ints).
- `InterpretationResponse`.

## 5. Third-Party Integrations & Required Credentials

| Integration | Env vars | Required? | Where used |
|---|---|---|---|
| **Google AI Studio (Gemini)** — primary LLM | `GEMINI_API_KEY`, `GEMINI_MODEL` (default gemini-2.5-flash), `GEMINI_CHAT_API_KEY` (chat-only key), `GEMINI_TRANSLATION_KEY` (translator) | GEMINI_API_KEY effectively required (tier 1) | `services/llm_providers.py:11-17`, `rag/pipeline.py`, `services/translator.py` |
| **Groq** — fallback tiers | `GROQ_API_KEY` | recommended | `llm_providers.py:19-50` |
| **OpenRouter** — safety net | `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` (default llama-3.3-70b-instruct:free) | optional | `llm_providers.py:41-46` |
| **AstrologyAPI.com** — ephemeris provider | `ASTROLOGYAPI_USER_ID`, `ASTROLOGYAPI_API_KEY` | optional (falls back to local Swiss Ephemeris without it) | `services/astrologyapi.py` |
| **OSM Nominatim** — geocoding | none (public; 1 req/s etiquette) | – | `routes/geocode.py:36` |
| **PostgreSQL** | `DATABASE_URL` (primary), `LOCAL_DATABASE_URL` (secondary DualPool) | at least one **required** — startup aborts otherwise (`db/database.py:163`) | `db/database.py` |
| **Redis** | `REDIS_URL` | required for caching/limits (fails soft per-op) | `services/cache.py:11` |
| **Google OAuth** | backend `GOOGLE_CLIENT_ID` (token verification), frontend `VITE_GOOGLE_CLIENT_ID` | required for Google login only | `routes/auth.py:23`, `src/main.jsx:8` |
| **JWT** | `JWT_SECRET` | required for auth routes | `services/security.py` |
| **Swiss Ephemeris files** | none — reads `ephe/*.se1`; falls back to Moshier (lower precision) if missing | – | `services/ephemeris.py:10-24` |
| **Hugging Face Hub** | none (anonymous download of `all-MiniLM-L6-v2` at first run) | – | `rag/embeddings.py` |

Full `.env` template: `astrology-backend/.env.example`. Frontend: `astrology-frontend/.env.example` (`VITE_GOOGLE_CLIENT_ID`, `VITE_MOCK_MODE`, plus `VITE_API_URL` read in code).

## 6. Internal Data Contracts (chart JSON, shape highlights)

`charts.raw_chart_data` (produced by `hybrid.get_complete_chart`) contains roughly:
- `planets[]`: name, sign, house, degrees (`fullDegree`, `normDegree`), retrograde, nakshatra(+pada), dignities, combust
- `ascendant`: sign, degrees, lord
- divisional charts: `D9`, `D10`, `D4`, `D7`, `D30`, `chandra_kundali`, `surya_kundali` — each `{ascendant, planets[]}` in same planet schema
- `dasha`: current mahadasha/antardasha + periods tree
- `ashtakavarga`: bindhu tables
- `doshas`: mangal/kaal_sarp/pitru/gand_mool with computed status
- `numerology`: moolank/bhagyank/namank + meanings
- `panchang`/astro-details: tithi, yoga, karana, sunrise/sunset

Frontend consumes this via `formatters.jsx` helpers; the SVG renderers expect the North-Indian diamond house ordering (fixed counter-clockwise sequence in `KundaliChart.jsx`/`DivisionalChart.jsx`).

## 7. Streaming Protocol

- Endpoints return `text/plain` chunk streams (FastAPI `StreamingResponse`), **not** SSE — the frontend reads `response.body.getReader()` (`src/services/api.js` stream helpers) and appends deltas.
- Pipeline filters `<think>…</think>` reasoning blocks for reasoning models (qwen3, gpt-oss) before yielding (`rag/pipeline.py:_yield_tokens`).
