import os
import logging
import uuid
from typing import AsyncGenerator
import asyncpg
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL")
LOCAL_DATABASE_URL = os.getenv("LOCAL_DATABASE_URL")

class DualConnection:
    def __init__(self, conn1, conn2=None):
        self.conn1 = conn1
        self.conn2 = conn2

    async def execute(self, query, *args, **kwargs):
        res1 = await self.conn1.execute(query, *args, **kwargs)
        if self.conn2:
            try:
                await self.conn2.execute(query, *args, **kwargs)
            except Exception as e:
                logger.error(f"Dual write (execute) failed on secondary DB: {e}")
        return res1

    async def fetch(self, query, *args, **kwargs):
        try:
            return await self.conn1.fetch(query, *args, **kwargs)
        except Exception as e:
            if self.conn2:
                logger.warning(f"Fetch failed on primary DB, trying secondary: {e}")
                return await self.conn2.fetch(query, *args, **kwargs)
            raise

    async def fetchrow(self, query, *args, **kwargs):
        try:
            return await self.conn1.fetchrow(query, *args, **kwargs)
        except Exception as e:
            if self.conn2:
                logger.warning(f"Fetchrow failed on primary DB, trying secondary: {e}")
                return await self.conn2.fetchrow(query, *args, **kwargs)
            raise

    async def fetchval(self, query, *args, **kwargs):
        try:
            return await self.conn1.fetchval(query, *args, **kwargs)
        except Exception as e:
            if self.conn2:
                logger.warning(f"Fetchval failed on primary DB, trying secondary: {e}")
                return await self.conn2.fetchval(query, *args, **kwargs)
            raise

class DualConnectionAcquirer:
    def __init__(self, primary_pool, secondary_pool, *args, **kwargs):
        self.primary_pool = primary_pool
        self.secondary_pool = secondary_pool
        self.args = args
        self.kwargs = kwargs
        self.primary_ctx = None
        self.secondary_ctx = None

    async def __aenter__(self):
        conn1 = None
        conn2 = None
        
        if self.primary_pool:
            try:
                self.primary_ctx = self.primary_pool.acquire(*self.args, **self.kwargs)
                conn1 = await self.primary_ctx.__aenter__()
            except Exception as e:
                logger.error(f"Failed to acquire connection from primary pool: {e}")
                
        if self.secondary_pool:
            try:
                self.secondary_ctx = self.secondary_pool.acquire(*self.args, **self.kwargs)
                conn2 = await self.secondary_ctx.__aenter__()
            except Exception as e:
                logger.error(f"Failed to acquire connection from secondary pool: {e}")
                
        if not conn1 and not conn2:
            raise RuntimeError("Could not acquire connection from either primary or secondary database pool.")
            
        # If primary failed but secondary succeeded, swap them so secondary becomes primary
        if not conn1:
            conn1 = conn2
            conn2 = None
            
        return DualConnection(conn1, conn2)

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.primary_ctx:
            await self.primary_ctx.__aexit__(exc_type, exc_val, exc_tb)
        if self.secondary_ctx:
            await self.secondary_ctx.__aexit__(exc_type, exc_val, exc_tb)

class DualPool:
    def __init__(self, primary_pool, secondary_pool):
        self.primary_pool = primary_pool
        self.secondary_pool = secondary_pool

    def acquire(self, *args, **kwargs):
        return DualConnectionAcquirer(self.primary_pool, self.secondary_pool, *args, **kwargs)

    async def close(self):
        if self.primary_pool:
            await self.primary_pool.close()
        if self.secondary_pool:
            await self.secondary_pool.close()

# Global pool instance
_pool: DualPool | None = None

async def get_db_pool() -> DualPool:
    """
    Get or initialize the global asyncpg connection pool wrapper.
    """
    global _pool
    if _pool is None:
        primary_pool = None
        secondary_pool = None

        # 1. Initialize Primary Pool (e.g. Aiven)
        if DATABASE_URL:
            try:
                logger.info("Initializing primary database pool...")
                primary_pool = await asyncpg.create_pool(
                    dsn=DATABASE_URL,
                    min_size=2,
                    max_size=10,
                    command_timeout=60.0
                )
                # Test connection
                async with primary_pool.acquire() as conn:
                    await conn.execute("SELECT 1")
                logger.info("Successfully connected to primary database.")
            except Exception as e:
                logger.error(f"Could not connect to primary database: {e}")
                primary_pool = None

        # 2. Initialize Secondary Pool (e.g. Local)
        if LOCAL_DATABASE_URL and LOCAL_DATABASE_URL != DATABASE_URL:
            try:
                logger.info("Initializing secondary database pool...")
                secondary_pool = await asyncpg.create_pool(
                    dsn=LOCAL_DATABASE_URL,
                    min_size=2,
                    max_size=10,
                    command_timeout=60.0
                )
                # Test connection
                async with secondary_pool.acquire() as conn:
                    await conn.execute("SELECT 1")
                logger.info("Successfully connected to secondary database.")
            except Exception as e:
                logger.error(f"Could not connect to secondary database: {e}")
                secondary_pool = None

        if not primary_pool and not secondary_pool:
            raise ValueError("Both primary (DATABASE_URL) and secondary (LOCAL_DATABASE_URL) pools failed to initialize.")

        _pool = DualPool(primary_pool, secondary_pool)
    return _pool

async def close_db_pool() -> None:
    """
    Close the global asyncpg connection pool wrapper.
    """
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None

async def initialize_schema(pool: DualPool) -> None:
    """
    Ensures that database tables, columns, and constraints are created and up-to-date.
    Uses db/schema.sql and EXPECTED_SCHEMA mapping for self-healing verification.
    """
    schema_path = os.path.join(os.path.dirname(__file__), "schema.sql")
    if not os.path.exists(schema_path):
        logger.warning(f"Schema file not found at {schema_path}. Skipping schema initialization.")
        return

    try:
        with open(schema_path, "r", encoding="utf-8") as f:
            schema_sql = f.read()
    except Exception as e:
        logger.error(f"Failed to read schema file {schema_path}: {e}")
        return

    # Define schema specifications for automatic migration checks
    EXPECTED_SCHEMA = {
        "users": {
            "id": "UUID PRIMARY KEY DEFAULT uuid_generate_v4()",
            "google_id": "TEXT UNIQUE NOT NULL",
            "email": "TEXT UNIQUE NOT NULL",
            "name": "TEXT",
            "picture": "TEXT",
            "password_hash": "TEXT",
            "created_at": "TIMESTAMP DEFAULT NOW()"
        },
        "charts": {
            "id": "UUID PRIMARY KEY DEFAULT uuid_generate_v4()",
            "user_id": "UUID REFERENCES users(id)",
            "full_name": "TEXT NOT NULL",
            "date_of_birth": "DATE NOT NULL",
            "time_of_birth": "TIME NOT NULL",
            "city_of_birth": "TEXT NOT NULL",
            "current_city": "TEXT NOT NULL",
            "latitude": "FLOAT NOT NULL",
            "longitude": "FLOAT NOT NULL",
            "timezone": "TEXT NOT NULL DEFAULT 'Asia/Kolkata'",
            "birth_time_confidence": "TEXT DEFAULT 'exact'",
            "ayanamsha": "TEXT DEFAULT 'LAHIRI'",
            "data_source": "TEXT DEFAULT 'astrologyapi'",
            "raw_chart_data": "JSONB",
            "created_at": "TIMESTAMP DEFAULT NOW()"
        },
        "interpretations": {
            "id": "UUID PRIMARY KEY DEFAULT uuid_generate_v4()",
            "chart_id": "UUID REFERENCES charts(id)",
            "tab_number": "INTEGER NOT NULL CHECK (tab_number BETWEEN 1 AND 10)",
            "tab_name": "TEXT NOT NULL",
            "content": "TEXT NOT NULL",
            "model_used": "TEXT NOT NULL",
            "language": "TEXT NOT NULL DEFAULT 'english'",
            "generated_at": "TIMESTAMP DEFAULT NOW()"
        },
        "api_usage": {
            "id": "UUID PRIMARY KEY DEFAULT uuid_generate_v4()",
            "service": "TEXT NOT NULL",
            "endpoint": "TEXT NOT NULL",
            "called_at": "TIMESTAMP DEFAULT NOW()",
            "success": "BOOLEAN DEFAULT TRUE"
        }
    }

    async def apply_to_pool(p, name: str):
        if not p:
            return
        try:
            logger.info(f"Checking database schema for {name} database...")
            async with p.acquire() as conn:
                # 1. Ensure uuid-ossp extension exists
                try:
                    await conn.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')
                except Exception as ext_err:
                    logger.warning(f"Could not create 'uuid-ossp' extension on {name} database: {ext_err}. "
                                   f"This can be ignored if the extension is already pre-installed.")

                # 2. Check if tables exist. If any missing, run the whole schema.sql
                for table in EXPECTED_SCHEMA.keys():
                    table_exists = await conn.fetchval(
                        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1);",
                        table
                    )
                    if not table_exists:
                        logger.info(f"Table '{table}' does not exist on {name} database. Creating tables using schema.sql...")
                        # Run schema_sql clean (without duplicate CREATE EXTENSION lines to avoid noise)
                        cleaned_sql = "\n".join(
                            line for line in schema_sql.splitlines() 
                            if "CREATE EXTENSION" not in line
                        )
                        await conn.execute(cleaned_sql)
                        break  # schema.sql creates all tables, so we can stop checking missing tables
                
                # 3. Check for missing columns in existing tables and auto-alter them
                for table, columns in EXPECTED_SCHEMA.items():
                    existing_cols = {row['column_name'] for row in await conn.fetch(
                        "SELECT column_name FROM information_schema.columns WHERE table_name = $1;",
                        table
                    )}
                    
                    for col_name, col_def in columns.items():
                        if col_name not in existing_cols:
                            logger.info(f"Column '{col_name}' is missing in table '{table}' on {name} database. Altering table...")
                            try:
                                await conn.execute(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col_name} {col_def};")
                                logger.info(f"Successfully added column '{col_name}' to '{table}' on {name} database.")
                            except Exception as alter_err:
                                logger.error(f"Failed to add column '{col_name}' to '{table}' on {name} database: {alter_err}")

                # 4. Ensure interpretations unique constraint exists
                has_unique = await conn.fetchval("""
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.table_constraints 
                        WHERE table_name='interpretations' AND constraint_type='UNIQUE'
                    );
                """)
                if not has_unique:
                    try:
                        logger.info(f"Adding unique constraint to interpretations on {name} database...")
                        await conn.execute(
                            "ALTER TABLE interpretations ADD CONSTRAINT interpretations_chart_id_tab_number_language_key UNIQUE(chart_id, tab_number, language);"
                        )
                    except Exception as uniq_err:
                        logger.warning(f"Could not add unique constraint to interpretations on {name} database: {uniq_err}")

            logger.info(f"Successfully verified schema on {name} database.")
        except Exception as e:
            logger.error(f"Failed to verify/apply schema on {name} database: {e}")

    await apply_to_pool(pool.primary_pool, "primary")
    await apply_to_pool(pool.secondary_pool, "secondary")

# FastAPI startup and shutdown event handlers
async def startup_db_event() -> None:
    """
    FastAPI startup event handler to initialize the pool and apply/migrate schema.
    """
    pool = await get_db_pool()
    await initialize_schema(pool)

async def shutdown_db_event() -> None:
    """
    FastAPI shutdown event handler to gracefully close the pool.
    """
    await close_db_pool()

# Dependency injection helper for FastAPI routes
async def get_db() -> AsyncGenerator[DualConnection, None]:
    """
    FastAPI dependency yielding a connection from the global pool wrapper.
    """
    pool = await get_db_pool()
    async with pool.acquire() as connection:
        yield connection
