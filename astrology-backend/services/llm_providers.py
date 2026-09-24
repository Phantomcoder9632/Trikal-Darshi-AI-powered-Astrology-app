import os
from typing import List, Dict, Any

from dotenv import load_dotenv

# Load .env before the module-level CLOUDFLARE_MODEL read below — this module
# is sometimes imported directly (tests, scripts) without main.py having run.
load_dotenv(override=True)

TARGET_MAX_OUTPUT_TOKENS = 16000  # project-wide target; never exceed a tier's real ceiling

# Extra Cloudflare model for Indic languages (registered as its own tier so
# language routing can promote it without mutating the shared dicts).
# Defined BEFORE the cascade list so the append below can reference it.
_CLOUDFLARE_INDIC_TIER: Dict[str, Any] = {
    "name": "cloudflare-deepseek32b",
    "base_url": "https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/ai/v1",
    "api_key_env": "CLOUDFLARE_API_TOKEN",
    "model": "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b",
    "max_completion_tokens": 8192,
}

LLM_CASCADE: List[Dict[str, Any]] = [
    {
        # Tier 1 — Cloudflare Workers AI: OpenAI-compatible edge inference,
        # zero cold starts. base_url contains a {CLOUDFLARE_ACCOUNT_ID}
        # placeholder resolved at client-build time via resolve_tier_base_url().
        "name": "cloudflare-primary",
        "base_url": "https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/ai/v1",
        "api_key_env": "CLOUDFLARE_API_TOKEN",
        "model": os.environ.get("CLOUDFLARE_MODEL", "@cf/meta/llama-3.3-70b-instruct-fp8-fast"),
        "max_completion_tokens": 8192,
    },
    {
        # Tier 2 — Google Gemini 2.5 Flash
        "name": "gemini-primary",
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai/",
        "api_key_env": "GEMINI_API_KEY",
        "model": "gemini-2.5-flash",
        "max_completion_tokens": 16384,
    },
    {
        # Tier 3 — Groq Qwen3 27B (reasoning hidden, multilingual)
        "name": "groq-qwen27b",
        "base_url": "https://api.groq.com/openai/v1",
        "api_key_env": "GROQ_API_KEY",
        "model": "qwen/qwen3.8-27b",
        "max_completion_tokens": 32768,
        "reasoning_format": "hidden",
    },
    {
        # Tier 4 — Groq GPT-OSS 120B (best available reasoning model, hidden chain-of-thought)
        "name": "groq-gptoss120b",
        "base_url": "https://api.groq.com/openai/v1",
        "api_key_env": "GROQ_API_KEY",
        "model": "openai/gpt-oss-120b",
        "max_completion_tokens": 65536,
        "reasoning_format": "hidden",
    },
    {
        # Tier 5 — OpenRouter free safety net (Qwen3 27B free endpoint)
        "name": "openrouter-safetynet",
        "base_url": "https://openrouter.ai/api/v1",
        "api_key_env": "OPENROUTER_API_KEY",
        "model": "qwen/qwen3.8-27b:free",
        "max_completion_tokens": 8192,
    },
    {
        # Tier 6 — Groq GPT-OSS 20B (lighter reasoning fallback)
        "name": "groq-gptoss20b",
        "base_url": "https://api.groq.com/openai/v1",
        "api_key_env": "GROQ_API_KEY",
        "model": "openai/gpt-oss-20b",
        "max_completion_tokens": 32768,
        "reasoning_format": "hidden",
    },
]

# Cloudflare Indic-language variant participates in language-based reordering
# (cascade_for_language) but sits after the English tiers for English requests.
LLM_CASCADE.append(_CLOUDFLARE_INDIC_TIER)


def effective_max_tokens(tier: Dict[str, Any]) -> int:
    """Never exceed the tier's real ceiling, never exceed our own target."""
    return min(tier.get("max_completion_tokens", TARGET_MAX_OUTPUT_TOKENS), TARGET_MAX_OUTPUT_TOKENS)


def resolve_tier_base_url(tier: Dict[str, Any]) -> str:
    """Interpolate {ENV_VAR} placeholders in a tier's base_url from the environment.

    Cloudflare's endpoint embeds the account ID:
        https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/ai/v1
    Tiers without placeholders are returned unchanged.
    """
    url = tier.get("base_url", "")
    if "{" not in url:
        return url
    import re

    def _sub(match):
        return os.environ.get(match.group(1), match.group(0))

    return re.sub(r"\{([A-Z_][A-Z0-9_]*)\}", _sub, url)


def cascade_for_language(lang: str) -> List[Dict[str, Any]]:
    """Hindi/Bengali requests try the strongest multilingual model first,
    without duplicating the list. Cloudflare's DeepSeek-R1 distill handles
    Indic scripts well, so it leads the non-English cascade (with Groq's
    Qwen27B right behind); English keeps cloudflare-primary (Llama 70B) on top."""
    norm_lang = (lang or "en").lower().strip()
    if norm_lang in ("hi", "bn", "hindi", "bengali"):
        priority_name = "cloudflare-deepseek32b"
        if not any(t["name"] == priority_name for t in LLM_CASCADE):
            priority_name = "groq-qwen27b"
        names_in_order = [priority_name] + [t["name"] for t in LLM_CASCADE if t["name"] != priority_name]
        return sorted(LLM_CASCADE, key=lambda t: names_in_order.index(t["name"]))
    return list(LLM_CASCADE)


def is_tier_available(tier: Dict[str, Any], is_chat: bool = False) -> bool:
    """Skip a tier cleanly if its API key isn't configured, instead of crashing.
    Cloudflare additionally requires CLOUDFLARE_ACCOUNT_ID (embedded in the URL)."""
    if is_chat and tier.get("name") == "gemini-primary":
        chat_key = os.environ.get("GEMINI_CHAT_API_KEY")
        if chat_key and not chat_key.startswith("your_"):
            return True
    key = os.environ.get(tier.get("api_key_env", ""))
    if not (key and not key.startswith("your_")):
        return False
    # Any tier whose base_url needs env interpolation must have all its
    # placeholders resolvable (Cloudflare: both token AND account id).
    if "{CLOUDFLARE_ACCOUNT_ID}" in tier.get("base_url", ""):
        account_id = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "")
        if not account_id or account_id.startswith("your_"):
            return False
    return True
