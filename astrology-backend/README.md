# 🌌 Vedic Astrology Backend API

A high-performance personal Vedic astrology and numerology calculation engine built using **FastAPI**, **PostgreSQL**, and **Redis**. It features a hybrid orchestration model that coordinates between the **AstrologyAPI.com** service and a local **pysweph (Swiss Ephemeris)** fallback calculator, paired with real-time AI-powered interpretations via a multi-provider LLM cascade — all written in **plain, beginner-friendly language** (see *The Simple Language Contract* below).

---

## 🛠️ Tech Stack
*   **Core Framework**: Python 3.11+ & FastAPI
*   **Calculations**: `pysweph` (Local Swiss Ephemeris) & `AstrologyAPI` (External Primary) using Vedic Whole-Sign house mapping
*   **Databases**: PostgreSQL (via `asyncpg` async pool) & Redis (via `redis-py` async client)
*   **AI Interpretation**: Multi-provider cascade (Cloudflare Workers AI → Gemini → Groq → OpenRouter fallbacks) via OpenAI SDK
*   **Geocoding**: OpenStreetMap Nominatim API

---

## 🔐 Security Model

| Layer | Protection |
|---|---|
| **Passwords** | PBKDF2-HMAC-SHA256, **600,000 iterations** (OWASP 2024), per-user salt. Legacy 100k hashes still verify and are **transparently re-hashed** on next successful login. |
| **JWT sessions** | HS256 with `iat` + `jti` claims, 24h expiry. Production (**`APP_ENV != development`**) **refuses to boot** if `JWT_SECRET` is missing or shorter than 32 chars. |
| **Login timing safety** | Unknown accounts trigger a dummy PBKDF2 verification, so response timing never leaks whether an email is registered. |
| **Rate limiting** | Redis fixed-window per IP (fails open if Redis is down): `auth` 5/min · `chat` 10/min · `interpret` 15/min · `chart_gen` **6/hour** · `gochar` 30/min · `geocode` 20/min. |
| **Input caps** | Chat message ≤ 2000 chars (history ≤ 20 turns × 4000 chars) via Pydantic validators; geocode query ≤ 120 chars; all SQL is parameterized (`$1`, `$2`…). |
| **Ownership checks** | Charts, interpretations, chat history and generation progress all verify `user_id` ownership — 403 on mismatch; guest charts remain isolated. |
| **Security headers** | `X-Frame-Options: DENY` · `X-Content-Type-Options: nosniff` · `Referrer-Policy: no-referrer` · `Permissions-Policy` · conservative CSP on every response. |
| **Secrets hygiene** | `.env` is git-ignored and never committed; `.env.example` shows safe generation (`python -c "import secrets; print(secrets.token_hex(32))"`). |

### CORS policy

* `APP_ENV=development` + no `CORS_ORIGINS` → wildcard `*` (local convenience only).
* Production with no `CORS_ORIGINS` → **all cross-origin requests blocked** (fail-closed).
* Recommended: set `CORS_ORIGINS` to your exact frontend origins, comma-separated.
* Native mobile apps are unaffected by CORS (they are not browsers).

---

## 🗣️ The Simple Language Contract

All AI output — the 11 interpretation chapters **and** the chat guide — is governed by a plain-language style contract (`services/ai_prompts.py → PLAIN_LANGUAGE_STYLE`, `rag/pipeline.py`):

1. **Reading level:** a curious 7th-standard (13-year-old) reader; short sentences, one idea each.
2. **Translate-on-use:** every technical term (Shadbala, Arudha, Pakka Ghar, dignity, house numbers) is immediately explained in everyday words.
3. **Real life first:** lead with the human meaning ("You will likely…"), then show the astrology behind it.
4. **👉 In plain words:** every technical section ends with this one-line summary.
5. **Planet personalities:** Guru = kind wise teacher · Shani = strict but fair headmaster · Mangal = brave soldier · Shukra = artist · Budh = clever student · Rahu = hungry adventurer · Ketu = calm sage.
6. **No doom:** difficulties are framed as (a) what, (b) why, (c) the way through — ending on agency.
7. **Live grounding:** transit context comes from each chart's embedded Swiss-Ephemeris gochar (computed-at stamped) — never hard-coded dates.
8. **Language support:** the same contract is applied inside the Hindi and Bengali mandates, so simple language holds across all three languages.

> Changing tone or depth? Edit `PLAIN_LANGUAGE_STYLE` in `services/ai_prompts.py` and the style block in `rag/pipeline.py`'s `SYSTEM_PROMPT` — both feed every generation.

---

## 🚀 Setup & Installation Instructions

Follow these steps to set up the backend server locally:

### 1. Install Dependencies
Ensure you have Python 3.11+ installed. Install all required packages using pip:
```bash
pip install -r requirements.txt
```

### 2. Configure Environment Variables
Copy the `.env.example` template to a `.env` file:
```bash
cp .env.example .env
```
Open `.env` and fill in the required keys, credentials, and endpoints:
*   `DATABASE_URL`: Your PostgreSQL connection string. 
    > [!IMPORTANT]
    > If your password contains special characters (like `@`), they **must** be URL-encoded (e.g., replace `@` with `%40`).
*   `REDIS_URL`: Your local Redis DSN.
*   `ASTROLOGYAPI_USER_ID` & `ASTROLOGYAPI_API_KEY`: Credentials for AstrologyAPI.com.
*   `GROQ_API_KEY`: API token for Groq.
*   `OPENROUTER_API_KEY`: API token for OpenRouter (for fallback LLM cascade).
*   `JWT_SECRET`: Session-signing secret — generate a strong one:
    ```bash
    python -c "import secrets; print(secrets.token_hex(32))"
    ```
    > [!WARNING]
    > In production (`APP_ENV != development`) the server **refuses to start** if `JWT_SECRET` is missing or under 32 characters.
*   `CORS_ORIGINS`: Comma-separated list of allowed frontend origins (e.g. `https://your-app.example.com`). Wildcard is development-only.
*   `.env` is git-ignored — **never commit real keys**.

### 3. Initialize PostgreSQL Database
Make sure PostgreSQL is running locally. Create your target database (e.g., `astrology_db`) and execute the SQL schema script once to initialize all required tables (`charts`, `interpretations`, `api_usage`):
```bash
# Log in to your psql and run:
CREATE DATABASE astrology_db;

# Apply the tables schema:
psql -U postgres -d astrology_db -f db/schema.sql
```

### 4. Start Redis Locally
Ensure Redis is running locally on port `6379`. 
*   **Windows**: Start your Redis service or executable:
    ```powershell
    & "C:\Program Files\Redis\redis-server.exe"
    ```
*   **Linux/macOS**:
    ```bash
    redis-server
    ```

### 5. Launch the FastAPI Server
Run the FastAPI development server with hot-reloading on port `8000`:
```bash
uvicorn main:app --reload --port 8000
```

### 6. Verify System Health
Open your browser or run a GET request to verify that the server is up and successfully connected to both databases:
*   **URL**: `GET http://localhost:8000/health`
*   **Expected Response**:
    ```json
    {
      "status": "ok",
      "db": "connected",
      "redis": "connected"
    }
    ```

---

## 🧭 Interactive API Documentation
Once the server is running, navigate to:
*   **Swagger UI Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
*   **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
