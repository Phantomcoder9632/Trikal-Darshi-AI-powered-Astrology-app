import os
import sys
import asyncio
import asyncpg
from dotenv import load_dotenv

# Add parent directory to path so we can resolve imports if needed
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load environment variables
load_dotenv(override=True)

# Find the schema.sql file relative to this script
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCHEMA_PATH = os.path.join(BASE_DIR, "db", "schema.sql")

DATABASE_URL = os.getenv("DATABASE_URL")

async def init_database():
    if not DATABASE_URL:
        print("[ERROR] DATABASE_URL is not set in your .env file.")
        print("Please check your astrology-backend/.env file and configure your Aiven connection string.")
        sys.exit(1)

    print("Connecting to database...")
    
    if "sslmode=" not in DATABASE_URL and "localhost" not in DATABASE_URL:
        print("Adding SSL mode parameter to connection string...")
        # Add sslmode parameter if it's not already in the connection string
        conn_str = DATABASE_URL
        if "?" in conn_str:
            conn_str += "&sslmode=require"
        else:
            conn_str += "?sslmode=require"
    else:
        conn_str = DATABASE_URL

    if not os.path.exists(SCHEMA_PATH):
        print(f"[ERROR] schema.sql not found at {SCHEMA_PATH}")
        sys.exit(1)

    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        schema_sql = f.read()

    try:
        # Connect to the remote database
        conn = await asyncpg.connect(conn_str)
        print("Connected successfully!")
        
        print("Applying database schema (creating extensions and tables)...")
        # Run the schema SQL
        await conn.execute(schema_sql)
        print("Database initialized successfully! All tables are ready.")
        
        # Close connection
        await conn.close()
    except Exception as e:
        print(f"[ERROR] Database connection or execution failed: {e}")
        print("\nPossible issues:")
        print("1. Your IP address may not be allowed in Aiven's firewall (IP Allowed List).")
        print("2. Your connection string password might contain special characters (like '@' or '/') that need URL-encoding (e.g. replace '@' with '%40').")
        sys.exit(1)

if __name__ == "__main__":
    # Run the async main loop
    asyncio.run(init_database())
