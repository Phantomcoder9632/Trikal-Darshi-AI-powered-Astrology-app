import asyncio
import os
import uuid
import logging
from dotenv import load_dotenv

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Make sure we're running from the correct directory so imports work
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db.database import get_db_pool
from services.translator import translate_content
from services.cache import cache_interpretation

load_dotenv()

async def backfill_missing_translations():
    pool = await get_db_pool()
    
    async with pool.acquire() as conn:
        logger.info("Fetching English interpretations from the database...")
        english_records = await conn.fetch("""
            SELECT chart_id, tab_number, tab_name, content 
            FROM interpretations 
            WHERE language = 'english'
        """)
        
        logger.info(f"Found {len(english_records)} English interpretations.")
        
        for record in english_records:
            chart_id = record['chart_id']
            tab_number = record['tab_number']
            tab_name = record['tab_name']
            english_text = record['content']
            chart_id_str = str(chart_id)
            
            for lang in ["hindi", "bengali"]:
                # Check if this language already exists
                exists = await conn.fetchval("""
                    SELECT 1 FROM interpretations 
                    WHERE chart_id = $1 AND tab_number = $2 AND language = $3
                """, chart_id, tab_number, lang)
                
                if not exists:
                    logger.info(f"Missing {lang} translation for chart {chart_id_str} Tab {tab_number}. Translating...")
                    try:
                        translated_text = await translate_content(english_text, lang)
                        
                        new_id = uuid.uuid4()
                        await conn.execute("""
                            INSERT INTO interpretations
                                (id, chart_id, tab_number, tab_name, content, model_used, language)
                            VALUES ($1, $2, $3, $4, $5, $6, $7)
                            ON CONFLICT (chart_id, tab_number, language)
                            DO UPDATE SET
                                content      = EXCLUDED.content,
                                generated_at = NOW()
                        """,
                        new_id, chart_id, tab_number, tab_name, translated_text, "translation/gemini-2.5-flash", lang)
                        
                        await cache_interpretation(chart_id_str, tab_number, translated_text, language=lang)
                        logger.info(f"✓ Saved and cached {lang} translation for Tab {tab_number}")
                        
                        # Add a small delay to avoid hitting rate limits
                        await asyncio.sleep(1)
                    except Exception as e:
                        logger.error(f"Failed to translate {lang} for Tab {tab_number}: {e}")
 
    logger.info("Backfill complete!")

if __name__ == "__main__":
    asyncio.run(backfill_missing_translations())
