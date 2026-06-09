import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load all environment variables
load_dotenv(override=True)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

from contextlib import asynccontextmanager

# CORS origins configuration
cors_origins_str = os.getenv("CORS_ORIGINS", "")
cors_origins = [o.strip() for o in cors_origins_str.split(",") if o.strip()] if cors_origins_str else ["*"]

@asynccontextmanager
async def app_lifespan(app: FastAPI):
    logger.info("Initializing PostgreSQL pool and Redis connection...")
    await startup_db_event()
    await init_redis()
    logger.info("PostgreSQL and Redis ready.")

    # Initialize RAG vector store
    logger.info("Initializing RAG vector store...")
    try:
        from rag.vectorstore import build_vectorstore
        build_vectorstore(force_rebuild=False)
        logger.info("RAG vector store ready.")
    except Exception as e:
        logger.error(f"RAG vector store initialization failed: {e}")
        logger.warning("Server will start without RAG — AI responses will use base knowledge only.")

    logger.info("Application startup completed successfully.")
    yield
    logger.info("Closing PostgreSQL pool and Redis connection...")
    await shutdown_db_event()
    await close_redis()
    logger.info("Application shutdown completed successfully.")

app = FastAPI(
    title="Vedic Astrology Backend API",
    description="Trikal Darshi Cosmic Architect Vedic Astrology Engine powered by FastAPI, Swiss Ephemeris, Groq LLM, and RAG over classical Jyotish shastras.",
    version="2.0.0",
    lifespan=app_lifespan
)

# ── CORS Middleware Configuration (added BEFORE any route includes) ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

from db.database import startup_db_event, shutdown_db_event
from services.cache import init_redis, close_redis

# Import API Routers
from routes.chart import router as chart_router
from routes.interpret import router as interpret_router
from routes.geocode import router as geocode_router
from routes.progress import router as progress_router

# ── API Router Registration ────────────────────────────────────────────────
app.include_router(geocode_router)
app.include_router(chart_router, prefix="/chart")
app.include_router(interpret_router)
app.include_router(progress_router)




# ── Health Check Endpoint ──────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health_check():
    """
    GET /health
    Tests active connections to both PostgreSQL and Redis, returning status.
    """
    db_status = "disconnected"
    redis_status = "disconnected"

    # 1. Ping PostgreSQL
    try:
        from db.database import get_db_pool
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
            db_status = "connected"
    except Exception as e:
        logger.error(f"Health check PostgreSQL ping failed: {e}")

    # 2. Ping Redis
    try:
        from services.cache import get_redis
        redis_client = await get_redis()
        await redis_client.ping()
        redis_status = "connected"
    except Exception as e:
        logger.error(f"Health check Redis ping failed: {e}")

    return {
        "status": "ok",
        "db": db_status,
        "redis": redis_status
    }

if __name__ == "__main__":
    import uvicorn
    # Load host/port configurations (runs on port 8000 by default)
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    
    logger.info(f"Starting server on {host}:{port}")
    uvicorn.run("main:app", host=host, port=port, reload=True)
