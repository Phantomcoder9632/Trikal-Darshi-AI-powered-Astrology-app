import os
import logging
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv(override=True)

logger = logging.getLogger(__name__)

# Config
MODEL = "gemini-2.5-flash"

async def translate_content(english_text: str, language: str) -> str:
    """
    Translates English Vedic astrology content into either "hindi" or "bengali"
    using a provider cascade (Gemini Translation Key -> Gemini Primary Key -> OpenRouter Key)
    to avoid rate limits or TPM caps.

    Args:
        english_text: Full text of the interpretation in English.
        language: Target language string, "hindi" or "bengali".

    Returns:
        Translated content string.
    """
    if not english_text or not english_text.strip():
        return ""

    language = language.lower().strip()
    if language not in ("hindi", "bengali"):
        logger.error(f"[translator] Unsupported language: {language}")
        return english_text

    # Resolve API Keys
    gemini_trans_key = os.getenv("GEMINI_TRANSLATION_KEY")
    gemini_key = os.getenv("GEMINI_API_KEY")
    openrouter_key = os.getenv("OPENROUTER_API_KEY")

    # Build provider cascade list
    providers = []
    
    # 1. Gemini Translation Key (Primary Translator)
    if gemini_trans_key and not gemini_trans_key.startswith("your_"):
        providers.append({
            "name": "Gemini Translation Key",
            "client": AsyncOpenAI(
                api_key=gemini_trans_key,
                base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
                max_retries=0,
                timeout=10.0
            ),
            "model": MODEL
        })
        
    # 2. Gemini API Key (First Fallback)
    if gemini_key and not gemini_key.startswith("your_"):
        providers.append({
            "name": "Gemini Primary Key",
            "client": AsyncOpenAI(
                api_key=gemini_key,
                base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
                max_retries=0,
                timeout=10.0
            ),
            "model": os.getenv("GEMINI_MODEL", MODEL)
        })
        
    # 3. OpenRouter (Second Fallback)
    if openrouter_key and not openrouter_key.startswith("your_"):
        env_model = os.getenv("OPENROUTER_MODEL")
        fallback_models = []
        if env_model and env_model.strip():
            fallback_models.append(env_model.strip())
        for default_m in [
            "meta-llama/llama-3.3-70b-instruct:free",
            "google/gemma-3-27b-it:free",
            "meta-llama/llama-3-8b-instruct:free",
            "openrouter/free",
        ]:
            if default_m not in fallback_models:
                fallback_models.append(default_m)
        
        for fb_model in fallback_models:
            providers.append({
                "name": f"OpenRouter ({fb_model})",
                "client": AsyncOpenAI(
                    api_key=openrouter_key,
                    base_url="https://openrouter.ai/api/v1",
                    default_headers={
                        "HTTP-Referer": "https://trikalmdarshi.app",
                        "X-Title": "Trikal Darshi",
                    },
                    max_retries=0,
                    timeout=10.0
                ),
                "model": fb_model
            })

    if not providers:
        raise ValueError("No valid API keys (GEMINI_TRANSLATION_KEY, GEMINI_API_KEY, or OPENROUTER_API_KEY) configured in .env for translation.")

    target_lang = "Hindi (in Devanagari script)" if language == "hindi" else "Bengali (in Bengali script)"

    system_prompt = (
        "You are a professional translator specializing in Vedic astrology (Jyotish Shastra).\n"
        f"Translate the astrological content exactly into {target_lang}.\n\n"
        "CRITICAL RULES:\n"
        "1. Output ONLY the translated content. Do NOT add any notes, headers, explanations, introductory text, or conversational text.\n"
        "2. Keep all planet names (e.g., Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, Ketu), Sanskrit terms "
        "(e.g., Lagna, Navamsha, Dashamsha, Karaka, Nakshatra, Pada, Vimshottari, Dasha, Antardasha, Gochar, Sade Sati, Yogas), "
        "and technical astrological terminology unchanged in their original English/Sanskrit transliterated forms.\n"
        "3. Do not add, omit, or modify any information. Maintain the exact original markdown formatting, headers, paragraphs, and list structures.\n"
        "4. You MUST translate the ENTIRE document from start to finish. Do NOT summarize, truncate, condense, or omit any section, paragraph, header, or bullet point. Translate every single sentence of the input text without exception."
    )

    errors = []
    for provider in providers:
        client_name = provider["name"]
        client_instance = provider["client"]
        model_name = provider["model"]
        
        logger.info(f"[translator] Attempting translation to {language} using {client_name} ({model_name})...")
        try:
            response = await client_instance.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": english_text}
                ],
                model=model_name,
                temperature=0.3,
                max_tokens=8192,
            )

            translated_text = response.choices[0].message.content
            if not translated_text or not translated_text.strip():
                raise ValueError(f"{client_name} returned empty completion text")

            logger.info(f"[translator] Successfully translated tab content ({len(english_text)} chars) to {language} using {client_name}")
            return translated_text.strip()
            
        except Exception as e:
            logger.warning(f"[translator] Translation failed using {client_name}: {e}")
            errors.append(f"{client_name}: {str(e)}")

    # If all providers fail:
    raise RuntimeError(f"All translation providers failed. Details: {'; '.join(errors)}")
