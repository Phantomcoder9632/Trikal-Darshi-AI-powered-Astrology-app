# 🌌 Vedic Astrology Backend API

A high-performance personal Vedic astrology and numerology calculation engine built using **FastAPI**, **PostgreSQL**, and **Redis**. It features a hybrid orchestration model that coordinates between the **AstrologyAPI.com** service and a local **pysweph (Swiss Ephemeris)** fallback calculator, paired with real-time AI-powered interpretations via **Groq** and a multi-stage **OpenRouter fallback cascade** with automatic fallback.

---

## 🛠️ Tech Stack
*   **Core Framework**: Python 3.11+ & FastAPI
*   **Calculations**: `pysweph` (Local Swiss Ephemeris) & `AstrologyAPI` (External Primary) using Vedic Whole-Sign house mapping
*   **Databases**: PostgreSQL (via `asyncpg` async pool) & Redis (via `redis-py` async client)
*   **AI Interpretation**: Groq (primary) + OpenRouter Cascade (meta-llama/llama-3.3-70b-instruct:free, google/gemma-3-27b-it:free, meta-llama/llama-3-8b-instruct:free, openrouter/free) via OpenAI SDK
*   **Geocoding**: OpenStreetMap Nominatim API

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
