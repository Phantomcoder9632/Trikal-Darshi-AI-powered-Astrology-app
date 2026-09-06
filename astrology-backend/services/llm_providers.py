import os
from typing import List, Dict, Any

TARGET_MAX_OUTPUT_TOKENS = 16000  # project-wide target; never exceed a tier's real ceiling

LLM_CASCADE: List[Dict[str, Any]] = [
    {
        "name": "gemini-primary",
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai/",
        "api_key_env": "GEMINI_API_KEY",
        "model": "gemini-2.5-flash",
        "max_completion_tokens": 16384,
    },
    {
        "name": "groq-llama70b",
        "base_url": "https://api.groq.com/openai/v1",
        "api_key_env": "GROQ_API_KEY",
        "model": "llama-3.3-70b-versatile",
        "max_completion_tokens": 32768,
    },
    {
        "name": "groq-qwen32b",
        "base_url": "https://api.groq.com/openai/v1",
        "api_key_env": "GROQ_API_KEY",
        "model": "qwen/qwen3-32b",
        "max_completion_tokens": 32768,
        "reasoning_format": "hidden",
    },
    {
        "name": "openrouter-safetynet",
        "base_url": "https://openrouter.ai/api/v1",
        "api_key_env": "OPENROUTER_API_KEY",
        "model": "meta-llama/llama-3.3-70b-instruct:free",
        "max_completion_tokens": 4096,
    },
    {
        "name": "groq-gptoss120b",
        "base_url": "https://api.groq.com/openai/v1",
        "api_key_env": "GROQ_API_KEY",
        "model": "openai/gpt-oss-120b",
        "max_completion_tokens": 65536,
        "reasoning_format": "hidden",
    },
    {
        "name": "groq-llama8b",
        "base_url": "https://api.groq.com/openai/v1",
        "api_key_env": "GROQ_API_KEY",
        "model": "llama-3.1-8b-instant",
        "max_completion_tokens": 8192,
    },
]

def effective_max_tokens(tier: Dict[str, Any]) -> int:
    """Never exceed the tier's real ceiling, never exceed our own target."""
    return min(tier.get("max_completion_tokens", TARGET_MAX_OUTPUT_TOKENS), TARGET_MAX_OUTPUT_TOKENS)

def cascade_for_language(lang: str) -> List[Dict[str, Any]]:
    """Hindi/Bengali requests try the strongest multilingual model first,
    without duplicating the list."""
    norm_lang = (lang or "en").lower().strip()
    if norm_lang in ("hi", "bn", "hindi", "bengali"):
        priority_name = "groq-qwen32b"
        names_in_order = [priority_name] + [t["name"] for t in LLM_CASCADE if t["name"] != priority_name]
        return sorted(LLM_CASCADE, key=lambda t: names_in_order.index(t["name"]))
    return list(LLM_CASCADE)

def is_tier_available(tier: Dict[str, Any], is_chat: bool = False) -> bool:
    """Skip a tier cleanly if its API key isn't configured, instead of crashing."""
    if is_chat and tier.get("name") == "gemini-primary":
        chat_key = os.environ.get("GEMINI_CHAT_API_KEY")
        if chat_key and not chat_key.startswith("your_"):
            return True
    key = os.environ.get(tier.get("api_key_env", ""))
    return bool(key and not key.startswith("your_"))
