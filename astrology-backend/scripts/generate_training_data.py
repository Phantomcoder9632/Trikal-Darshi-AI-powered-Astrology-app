"""
scripts/generate_training_data.py

Generates fine-tuning training data for Qwen3-4B-Thinking-2507.

Usage (run from astrology-backend/):
    python scripts/generate_training_data.py

Output:
    astrology_finetuning/data/train.jsonl   (~90% of examples)
    astrology_finetuning/data/eval.jsonl    (~10% of examples)
    astrology_finetuning/data/generation_log.txt
    astrology_finetuning/stats/dataset_report.md

MULTI-PROVIDER ARCHITECTURE (Free-Tier Optimised):
    ┌─────────────────────────────────────────────────────────────┐
    │  TABS (heavy, 4–5K tokens)                                  │
    │   → Gemini Key 1 (GEMINI_API_KEY) + Key 2 (GEMINI_CHAT_API_KEY)│
    │     Round-robin → doubles quota to 3,000 RPD, 30 RPM       │
    │     Fallback: Groq Qwen-32B → OpenRouter Llama-70b          │
    ├─────────────────────────────────────────────────────────────┤
    │  CHAT (lightweight, ~300 tokens)                            │
    │   → Groq Llama-3.3-70b (30 RPM, ~300 chat calls within TPD)│
    │     Fallback: Gemini Key 1/2 → OpenRouter                   │
    └─────────────────────────────────────────────────────────────┘

Rate limits used (verified from docs, September 2026):
    Gemini 2.5 Flash (each key):  15 RPM, 1,500 RPD
    Groq llama-3.3-70b-versatile: 30 RPM, 1,000 RPD, 100k TPD
    Groq qwen/qwen3-32b:          30 RPM, 1,000 RPD, 100k TPD
    OpenRouter :free models:      20 RPM,    50 RPD

IMPORTANT:
    - The elicitation protocol is ONLY sent to providers at generation time.
    - It is STRIPPED before the example is saved to JSONL.
    - The stored user turn is the EXACT production prompt (no protocol).
    - <think> blocks ARE preserved in the assistant turn (key training signal).
    - Set GEMINI_API_KEY and GEMINI_CHAT_API_KEY (+ optionally GROQ_API_KEY) in .env
"""

import os
import sys
import json
import time
import random
import asyncio
import logging
import re
from datetime import date, time as time_type, datetime, timedelta
from pathlib import Path
from typing import Any, AsyncGenerator, Dict, List, Optional, Tuple

# ── Path setup (run from astrology-backend/) ─────────────────────────────────
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv(override=True)

from openai import OpenAI

from services.ephemeris import (
    calculate_chart_fallback,
    calculate_kalsarp,
    calculate_mangal_dosha,
    calculate_pitru_dosha,
    calculate_gand_mool,
    compute_divisional_chart,
    compute_gochar_chart,
)
from services.numerology import get_numerology
from services.ai_prompts import build_tab_prompt, SYSTEM_PROMPT
from rag.retriever import get_context_for_tab

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler()],
)
logger = logging.getLogger(__name__)

# ── Output paths ──────────────────────────────────────────────────────────────
BASE_OUT  = Path(__file__).parent.parent / "astrology_finetuning"
DATA_DIR  = BASE_OUT / "data"
STATS_DIR = BASE_OUT / "stats"
DATA_DIR.mkdir(parents=True, exist_ok=True)
STATS_DIR.mkdir(parents=True, exist_ok=True)

# ── Configuration ─────────────────────────────────────────────────────────────
TRAIN_FILE         = DATA_DIR / "train.jsonl"
EVAL_FILE          = DATA_DIR / "eval.jsonl"
LOG_FILE           = DATA_DIR / "generation_log.txt"
EVAL_RATIO         = 0.10    # 10% goes to eval set
MIN_RESPONSE_CHARS = 1000    # Reject tab responses shorter than this
MIN_CHAT_CHARS     = 80      # Minimum chars for chat responses

# ── Tab distribution targets (tab_number, en_count, hi_count, bn_count) ───────
TAB_TARGETS: List[Tuple[int, int, int, int]] = [
    (1,  80, 30, 20),   # Lagna & Soul Blueprint
    (2,  60, 25, 15),   # Lal Kitab Analysis
    (3,  50, 20, 15),   # Numerology Matrix
    (4,  80, 30, 20),   # Career & Dashamsha
    (5,  60, 25, 15),   # Wealth & Abundance
    (6,  70, 25, 15),   # Love, Marriage & D9
    (7,  60, 20, 15),   # Health & Vitality
    (8,  70, 25, 15),   # Remedies Tripath
    (9,  50, 20, 10),   # Progeny & D7
    (10, 70, 25, 15),   # Gochar Transits
    (11, 50, 20, 10),   # Education & Intelligence
]

# Chat targets: stage -> (en, hi, bn)
CHAT_TARGETS = {
    "no_chart":     (40, 15, 10),
    "chart_only":   (60, 20, 15),
    "full_context": (80, 30, 20),
}

# ── Rare-condition quotas (rejection-sampling fills these first) ───────────────
RARE_QUOTAS: Dict[str, int] = {
    "kalsarp":   40,
    "mangal":    40,
    "pitru":     30,
    "gand_mool": 30,
}
_rare_counts: Dict[str, int] = {k: 0 for k in RARE_QUOTAS}


# ═══════════════════════════════════════════════════════════════════════════════
# MULTI-PROVIDER RATE-LIMITED CLIENT POOL
# ═══════════════════════════════════════════════════════════════════════════════

class TokenBucketLimiter:
    """
    Async token-bucket rate limiter.
    `rate` = max calls per minute. Enforces minimum inter-call gap.
    """
    def __init__(self, rate_per_minute: int):
        self._min_gap = 60.0 / rate_per_minute  # seconds between calls
        self._last_call: float = 0.0
        self._lock = asyncio.Lock()

    async def acquire(self):
        async with self._lock:
            now = asyncio.get_event_loop().time()
            wait = self._min_gap - (now - self._last_call)
            if wait > 0:
                await asyncio.sleep(wait)
            self._last_call = asyncio.get_event_loop().time()


# ── Provider definitions ──────────────────────────────────────────────────────
# Verified free-tier limits (September 2026):
#   Gemini 2.5 Flash: 15 RPM, 1,500 RPD per key
#   Groq llama-3.3-70b-versatile: 30 RPM, 1,000 RPD, 100k TPD
#   Groq llama-3.1-8b-instant: 30 RPM, 1,000 RPD
#   OpenRouter :free: 20 RPM, 50 RPD

_PROVIDERS: Dict[str, Dict[str, Any]] = {
    "gemini_key1": {
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai/",
        "api_key":  os.environ.get("GEMINI_API_KEY", ""),
        "model":    "gemini-2.5-flash",
        "max_tokens": 16384,
        "limiter":  TokenBucketLimiter(rate_per_minute=13),  # 13/15 RPM: safe margin
        "rpd_remaining": 1500,
    },
    "gemini_key2": {
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai/",
        "api_key":  os.environ.get("GEMINI_CHAT_API_KEY", ""),
        "model":    "gemini-2.5-flash",
        "max_tokens": 16384,
        "limiter":  TokenBucketLimiter(rate_per_minute=13),  # 13/15 RPM: safe margin
        "rpd_remaining": 1500,
    },
    "groq_llama70b": {
        "base_url": "https://api.groq.com/openai/v1",
        "api_key":  os.environ.get("GROQ_API_KEY", ""),
        "model":    "llama-3.3-70b-versatile",
        "max_tokens": 8192,
        "limiter":  TokenBucketLimiter(rate_per_minute=25),  # 25/30 RPM: safe margin
        "rpd_remaining": 1000,
        "tpd_remaining": 100000,   # tokens per day — critical for Groq
    },
    "groq_llama8b": {
        "base_url": "https://api.groq.com/openai/v1",
        "api_key":  os.environ.get("GROQ_API_KEY", ""),
        "model":    "llama-3.1-8b-instant",
        "max_tokens": 8192,
        "limiter":  TokenBucketLimiter(rate_per_minute=28),
        "rpd_remaining": 1000,
        "tpd_remaining": 500000,
    },
    "openrouter": {
        "base_url": "https://openrouter.ai/api/v1",
        "api_key":  os.environ.get("OPENROUTER_API_KEY", ""),
        "model":    "meta-llama/llama-3.3-70b-instruct:free",
        "max_tokens": 4096,
        "limiter":  TokenBucketLimiter(rate_per_minute=15),  # 15/20 RPM: safe margin
        "rpd_remaining": 50,
        "headers":  {"HTTP-Referer": "https://trikalmdarshi.app", "X-Title": "Trikal Darshi"},
    },
}

_CLIENT_CACHE: Dict[str, OpenAI] = {}

# ── Early-stop flag — set when ALL providers are exhausted ────────────────────
_all_providers_exhausted: bool = False


class AllProvidersExhaustedError(Exception):
    """Raised when every provider in every cascade is rate-limited or quota-dead."""
    pass


def append_example_to_disk(example: Dict[str, Any], is_eval: bool = False) -> None:
    """Immediately write and flush a generated example to disk."""
    target_file = EVAL_FILE if is_eval else TRAIN_FILE
    with open(target_file, "a", encoding="utf-8") as f:
        f.write(json.dumps(example, ensure_ascii=False) + "\n")
        f.flush()


def count_existing_saved_examples() -> Tuple[int, int]:
    """Return count of existing train and eval examples."""
    train_c = 0
    eval_c  = 0
    if TRAIN_FILE.exists():
        with open(TRAIN_FILE, "r", encoding="utf-8") as f:
            train_c = sum(1 for line in f if line.strip())
    if EVAL_FILE.exists():
        with open(EVAL_FILE, "r", encoding="utf-8") as f:
            eval_c = sum(1 for line in f if line.strip())
    return train_c, eval_c


def save_progress(
    all_examples: List[Dict],
    log_lines: List[str],
    stats: Dict,
    reason: str = "quota_exhausted",
) -> None:
    """
    Saves whatever training data log/stats has been collected and writes a report.
    """
    train_count, eval_count = count_existing_saved_examples()
    total = train_count + eval_count

    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write("\n".join(log_lines) + "\n")

    tab_lines  = "\n".join(
        f"  Tab {k}: {v}" for k, v in sorted(stats.get("by_tab", {}).items())
    )
    lang_lines = "\n".join(
        f"  {k}: {v}" for k, v in stats.get("by_language", {}).items()
    )
    rare_lines = "\n".join(
        f"  {k}: {v}/{RARE_QUOTAS[k]}" for k, v in _rare_counts.items()
    )

    report = (
        f"# Partial Dataset Report (Stopped: {reason})\n"
        f"Generated: {datetime.now().isoformat()}\n\n"
        f"> ⚠️ Generation stopped early: {reason}\n"
        f"> Re-run tomorrow when API quotas reset to continue.\n\n"
        f"## Totals Saved\n"
        f"- Training: {train_count}\n"
        f"- Eval:     {eval_count}\n"
        f"- Total:    {total}\n\n"
        f"## By Tab\n{tab_lines}\n\n"
        f"## By Language\n{lang_lines}\n\n"
        f"## Rare Condition Coverage\n{rare_lines}\n\n"
        f"## Files\n"
        f"- Train: {TRAIN_FILE}\n"
        f"- Eval:  {EVAL_FILE}\n"
        f"- Log:   {LOG_FILE}\n"
    )
    report_path = STATS_DIR / "dataset_report.md"
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(report)

    logger.info("\n" + "=" * 60)
    logger.info(f"🛑 EARLY STOP: {reason}")
    logger.info(f"✅ Saved {train_count} training + {eval_count} eval examples.")
    logger.info(f"📁 Train: {TRAIN_FILE}")
    logger.info(f"📁 Eval:  {EVAL_FILE}")
    logger.info(f"📊 Report: {report_path}")
    logger.info("💡 Re-run tomorrow when API quotas reset to generate more examples.")
    logger.info("=" * 60)

def _get_client(provider_name: str) -> Optional[OpenAI]:
    """Return a cached OpenAI-compatible client for the given provider."""
    prov = _PROVIDERS[provider_name]
    if not prov.get("api_key"):
        return None
    if provider_name not in _CLIENT_CACHE:
        _CLIENT_CACHE[provider_name] = OpenAI(
            api_key=prov["api_key"],
            base_url=prov["base_url"],
            default_headers=prov.get("headers"),
            max_retries=0,
            timeout=120.0,
        )
    return _CLIENT_CACHE[provider_name]


def _is_rate_limit_error(e: Exception) -> bool:
    msg = str(e).lower()
    return "429" in msg or "rate limit" in msg or "quota" in msg or "resource_exhausted" in msg


def _is_quota_exhausted(provider_name: str) -> bool:
    prov = _PROVIDERS[provider_name]
    if prov.get("rpd_remaining", 1) <= 0:
        return True
    if prov.get("tpd_remaining", 1) <= 0:  # Groq daily token cap
        return True
    return False


def _deduct_request(provider_name: str, approx_tokens: int = 0):
    """Decrement the tracked remaining quota for a provider."""
    prov = _PROVIDERS[provider_name]
    if "rpd_remaining" in prov:
        prov["rpd_remaining"] = max(0, prov["rpd_remaining"] - 1)
    if "tpd_remaining" in prov:
        prov["tpd_remaining"] = max(0, prov["tpd_remaining"] - approx_tokens)


# ── Gemini round-robin state ──────────────────────────────────────────────────
_gemini_rr_index = 0

def _next_gemini_key() -> str:
    """Returns 'gemini_key1' or 'gemini_key2' in round-robin, skipping exhausted keys."""
    global _gemini_rr_index
    keys = ["gemini_key1", "gemini_key2"]
    for _ in range(len(keys)):
        key = keys[_gemini_rr_index % len(keys)]
        _gemini_rr_index += 1
        if not _is_quota_exhausted(key) and _PROVIDERS[key].get("api_key"):
            return key
    return "gemini_key1"  # last resort


# ═══════════════════════════════════════════════════════════════════════════════
# CORE LLM CALL — WITH PROVIDER SELECTION AND FULL-THINK PRESERVATION
# ═══════════════════════════════════════════════════════════════════════════════

async def _call_provider(
    provider_name: str,
    messages: List[Dict[str, str]],
    temperature: float = 0.7,
) -> Optional[str]:
    """
    Makes a streaming call to the specified provider.
    IMPORTANT: For training data, we DO NOT strip <think> blocks.
    The full <think>...</think> + visible response is stored as the assistant turn.
    Returns the full text or None on failure.
    """
    if _is_quota_exhausted(provider_name):
        logger.warning(f"  [{provider_name}] RPD/TPD quota exhausted — skipping.")
        return None

    client = _get_client(provider_name)
    if not client:
        logger.warning(f"  [{provider_name}] No API key configured — skipping.")
        return None

    prov = _PROVIDERS[provider_name]

    # Acquire rate limiter slot (waits if needed to stay within RPM)
    await prov["limiter"].acquire()

    try:
        logger.info(f"  [{provider_name}] → {prov['model']}")
        create_kwargs: Dict[str, Any] = {
            "model":       prov["model"],
            "messages":    messages,
            "temperature": temperature,
            "max_tokens":  prov["max_tokens"],
            "stream":      True,
        }
        if "extra_body" in prov:
            create_kwargs["extra_body"] = prov["extra_body"]

        stream = client.chat.completions.create(**create_kwargs)

        chunks = []
        for chunk in stream:
            if not chunk.choices:
                continue
            token = chunk.choices[0].delta.content
            if token:
                chunks.append(token)

        response = "".join(chunks).strip()
        _deduct_request(provider_name, approx_tokens=len(response) // 4)  # ~4 chars per token
        return response or None

    except Exception as e:
        err_str = str(e).lower()
        if _is_rate_limit_error(e):
            logger.warning(f"  [{provider_name}] Rate limited (429): {e}")
            _PROVIDERS[provider_name]["rpd_remaining"] = 0
        elif "404" in err_str or "model_not_found" in err_str or "401" in err_str or "invalid_api_key" in err_str:
            logger.error(f"  [{provider_name}] Fatal API Error ({e}) — disabling provider for this session.")
            _PROVIDERS[provider_name]["rpd_remaining"] = 0
        else:
            logger.error(f"  [{provider_name}] Error: {e}")
        return None


async def _call_tab_provider_cascade(
    messages: List[Dict[str, str]],
    language: str,
) -> Optional[str]:
    """
    Tab report cascade (heavy, 4–5K token prompts):
      1. Gemini Key1/Key2 round-robin (15 RPM × 2 keys = 30 effective RPM, 3,000 RPD)
      2. Groq Llama-3.3-70B fallback
      3. Groq Llama-3.1-8B fallback
      4. OpenRouter Llama-70b safety net
    Raises AllProvidersExhaustedError when every provider is quota-dead.
    """
    global _all_providers_exhausted

    # 1. Try dual-Gemini round-robin
    primary = _next_gemini_key()
    response = await _call_provider(primary, messages, temperature=0.7)
    if response and len(response) >= MIN_RESPONSE_CHARS:
        return response

    # Try the other Gemini key if primary failed
    other = "gemini_key2" if primary == "gemini_key1" else "gemini_key1"
    if not _is_quota_exhausted(other) and _PROVIDERS[other].get("api_key"):
        response = await _call_provider(other, messages, temperature=0.7)
        if response and len(response) >= MIN_RESPONSE_CHARS:
            return response

    # 2. Groq Llama-3.3-70B fallback
    if not _is_quota_exhausted("groq_llama70b") and _PROVIDERS["groq_llama70b"].get("api_key"):
        logger.info("  [tab_cascade] Gemini failed/exhausted → trying Groq Llama-70B")
        response = await _call_provider("groq_llama70b", messages, temperature=0.6)
        if response and len(response) >= MIN_RESPONSE_CHARS:
            return response

    # 3. Groq Llama-3.1-8B fallback
    if not _is_quota_exhausted("groq_llama8b") and _PROVIDERS["groq_llama8b"].get("api_key"):
        logger.info("  [tab_cascade] Groq 70B failed/exhausted → trying Groq Llama-8B")
        response = await _call_provider("groq_llama8b", messages, temperature=0.6)
        if response and len(response) >= MIN_RESPONSE_CHARS:
            return response

    # 4. OpenRouter safety net
    if not _is_quota_exhausted("openrouter") and _PROVIDERS["openrouter"].get("api_key"):
        logger.info("  [tab_cascade] Groq also failed → trying OpenRouter safety net")
        response = await _call_provider("openrouter", messages, temperature=0.6)
        if response and len(response) >= MIN_RESPONSE_CHARS:
            return response

    # ── All providers exhausted — check and raise immediately ────────────────
    active_providers = [
        p for p in ["gemini_key1", "gemini_key2", "groq_llama70b", "groq_llama8b", "openrouter"]
        if _PROVIDERS[p].get("api_key") and not _is_quota_exhausted(p)
    ]
    if not active_providers:
        logger.critical(
            "🛑 ALL PROVIDERS EXHAUSTED — Every configured free-tier quota is used up."
        )
        _all_providers_exhausted = True
        raise AllProvidersExhaustedError("All provider quotas are exhausted.")

    return None


async def _call_chat_provider_cascade(
    messages: List[Dict[str, str]],
) -> Optional[str]:
    """
    Chat example cascade (lightweight, ~300 tokens):
      1. Groq Llama-3.3-70b (30 RPM, fast, reserves Groq TPD for chat not tabs)
      2. Groq Llama-3.1-8b
      3. Gemini Key1/Key2 round-robin fallback
      4. OpenRouter safety net
    Raises AllProvidersExhaustedError when every provider is quota-dead.
    """
    global _all_providers_exhausted

    # 1. Groq Llama-70b (primary for chat)
    if not _is_quota_exhausted("groq_llama70b") and _PROVIDERS["groq_llama70b"].get("api_key"):
        response = await _call_provider("groq_llama70b", messages, temperature=0.8)
        if response and len(response) >= MIN_CHAT_CHARS:
            return response

    # 2. Groq Llama-8b
    if not _is_quota_exhausted("groq_llama8b") and _PROVIDERS["groq_llama8b"].get("api_key"):
        response = await _call_provider("groq_llama8b", messages, temperature=0.8)
        if response and len(response) >= MIN_CHAT_CHARS:
            return response

    # 3. Gemini Key1/Key2 round-robin fallback
    primary = _next_gemini_key()
    response = await _call_provider(primary, messages, temperature=0.8)
    if response and len(response) >= MIN_CHAT_CHARS:
        return response

    other = "gemini_key2" if primary == "gemini_key1" else "gemini_key1"
    if not _is_quota_exhausted(other) and _PROVIDERS[other].get("api_key"):
        response = await _call_provider(other, messages, temperature=0.8)
        if response and len(response) >= MIN_CHAT_CHARS:
            return response

    # 4. OpenRouter last resort
    if not _is_quota_exhausted("openrouter") and _PROVIDERS["openrouter"].get("api_key"):
        response = await _call_provider("openrouter", messages, temperature=0.8)
        if response and len(response) >= MIN_CHAT_CHARS:
            return response

    active_providers = [
        p for p in ["gemini_key1", "gemini_key2", "groq_llama70b", "groq_llama8b", "openrouter"]
        if _PROVIDERS[p].get("api_key") and not _is_quota_exhausted(p)
    ]
    if not active_providers:
        logger.critical(
            "🛑 ALL PROVIDERS EXHAUSTED — Every configured free-tier quota is used up."
        )
        _all_providers_exhausted = True
        raise AllProvidersExhaustedError("All provider quotas are exhausted.")

    return None


# ── Provider quota summary ────────────────────────────────────────────────────
def log_quota_summary():
    logger.info("┌─ Provider Quota Summary ──────────────────────────────────")
    for name, prov in _PROVIDERS.items():
        key_ok = "✓" if prov.get("api_key") else "✗ (no key)"
        rpd = prov.get("rpd_remaining", "N/A")
        tpd = f", TPD={prov.get('tpd_remaining', 'N/A')}" if "tpd_remaining" in prov else ""
        logger.info(f"│  {name:<18} key={key_ok}  RPD={rpd}{tpd}")
    logger.info("└───────────────────────────────────────────────────────────")


# ── Shared concurrency gate (prevents thundering-herd across providers) ───────
# Each provider has its OWN rate limiter; this semaphore caps total parallel calls
TOTAL_CONCURRENT_CALLS = 3  # 2 Gemini + 1 Groq simultaneously
_global_semaphore: Optional[asyncio.Semaphore] = None


# ── Indian birth data corpus ──────────────────────────────────────────────────
INDIAN_FIRST_NAMES = [
    "Arjun","Priya","Rahul","Deepika","Vikram","Ananya","Siddharth","Kavya",
    "Rohan","Meera","Aditya","Shreya","Karan","Pooja","Amit","Neha","Suresh",
    "Lakshmi","Rajesh","Sunita","Nikhil","Divya","Manish","Swati","Ravi","Geeta",
    "Ajay","Rekha","Sanjay","Usha","Dinesh","Parvati","Vinod","Savitri","Mohan",
    "Radha","Prasad","Kamla","Harish","Sarla","Ashok","Vimla","Vijay","Shanti",
    "Arun","Pushpa","Sunil","Lata","Mahesh","Sushila","Abhishek","Nandini",
    "Gaurav","Pallavi","Kunal","Richa","Tushar","Payal","Sachin","Smita","Vivek",
    "Jyoti","Kapil","Asha","Ramesh","Indu","Girish","Hema","Yogesh","Seema",
    "Prakash","Manju","Tarun","Sangeeta","Chirag","Rashmi","Dev","Varsha",
    "Aman","Shilpa","Tanmay","Ritu","Shyam","Nisha","Govind","Rani","Balram",
    "Poonam","Saurabh","Komal","Himanshu","Archana","Naveen","Mona","Alok",
]

INDIAN_LAST_NAMES = [
    "Sharma","Verma","Singh","Kumar","Gupta","Yadav","Patel","Mehta","Joshi",
    "Chauhan","Mishra","Tiwari","Pandey","Shukla","Banerjee","Chatterjee",
    "Mukherjee","Bose","Ghosh","Das","Reddy","Rao","Nair","Pillai","Menon",
    "Iyer","Krishnan","Agarwal","Jain","Malhotra","Kapoor","Khanna","Bhatia",
    "Sethi","Desai","Shah","Trivedi","Bhatt","Modi","Thakur","Chaudhary",
    "Pal","Dey","Roy","Basu","Mitra","Biswas","Chakraborty","Sen","Dubey",
    "Tripathi","Pathak","Srivastava","Saxena","Dixit","Awasthi","Chandra",
]

INDIAN_CITIES = [
    ("Kolkata, West Bengal",      22.5726, 88.3639),
    ("Mumbai, Maharashtra",       19.0760, 72.8777),
    ("Delhi, Delhi",              28.6139, 77.2090),
    ("Chennai, Tamil Nadu",       13.0827, 80.2707),
    ("Bangalore, Karnataka",      12.9716, 77.5946),
    ("Hyderabad, Telangana",      17.3850, 78.4867),
    ("Pune, Maharashtra",         18.5204, 73.8567),
    ("Ahmedabad, Gujarat",        23.0225, 72.5714),
    ("Jaipur, Rajasthan",         26.9124, 75.7873),
    ("Lucknow, Uttar Pradesh",    26.8467, 80.9462),
    ("Patna, Bihar",              25.5941, 85.1376),
    ("Bhopal, Madhya Pradesh",    23.2599, 77.4126),
    ("Indore, Madhya Pradesh",    22.7196, 75.8577),
    ("Nagpur, Maharashtra",       21.1458, 79.0882),
    ("Surat, Gujarat",            21.1702, 72.8311),
    ("Varanasi, Uttar Pradesh",   25.3176, 82.9739),
    ("Agra, Uttar Pradesh",       27.1767, 78.0081),
    ("Amritsar, Punjab",          31.6340, 74.8723),
    ("Chandigarh, Punjab",        30.7333, 76.7794),
    ("Guwahati, Assam",           26.1445, 91.7362),
    ("Bhubaneswar, Odisha",       20.2961, 85.8245),
    ("Kochi, Kerala",              9.9312, 76.2673),
    ("Mysore, Karnataka",         12.2958, 76.6394),
    ("Coimbatore, Tamil Nadu",    11.0168, 76.9558),
    ("Visakhapatnam, Andhra",     17.6868, 83.2185),
    ("Ranchi, Jharkhand",         23.3441, 85.3096),
    ("Raipur, Chhattisgarh",      21.2514, 81.6296),
    ("Jammu, J&K",                32.7266, 74.8570),
    ("Shimla, Himachal Pradesh",  31.1048, 77.1734),
    ("Dehradun, Uttarakhand",     30.3165, 78.0322),
]

DOB_MIN = date(1950, 1, 1)
DOB_MAX = date(2005, 12, 31)
DOB_RANGE_DAYS = (DOB_MAX - DOB_MIN).days


# ═══════════════════════════════════════════════════════════════════════════════
# ELICITATION PROTOCOLS
# Appended to provider call ONLY during data generation. Never stored in JSONL.
# ═══════════════════════════════════════════════════════════════════════════════

_PROTOCOL_DEFAULT = """
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REASONING PROTOCOL (for your internal <think> block ONLY):
Before writing your visible answer, work through the following 7 steps INSIDE
<think> tags. Label each step exactly as shown. Every claim from Step 2 onward
must trace back to either the CHART data or the REFERENCE TEXTS provided.

<think>
### 1. Domain Framing
State which houses, planets, and divisional chart(s) are the primary
significators for this tab's subject, and why.

### 2. Fact Extraction
List, as bullet points, ONLY the specific facts from the CHART data relevant
to this domain — house occupants, dignities, aspects, retrograde/combust
status, active Dasha-Antardasha. Raw facts only, no interpretation yet.
Each fact must reference its exact source value from the chart.

### 3. Evidence Binding
For each REFERENCE TEXT passage provided, state explicitly which fact from
Step 2 it applies to. If a passage doesn't clearly apply, set it aside.
Do not force an unrelated quote into use.

### 4. Rule Application
For each fact-evidence pair from Step 3, work through what the classical
principle means for this specific placement. Reason it through, don't just
assert the conclusion. Show the logic.

### 5. Conflict Resolution
Identify facts or conclusions from Step 4 pulling in different directions
(benefic yoga alongside a dosha, exalted planet that is also combust, strong
7th lord but Venus debilitated). State which effect dominates and why.

### 6. Timing Overlay
Cross-reference resolved conclusions against the active Mahadasha/Antardasha
dates and transit positions to determine WHEN effects manifest. Name specific
date windows.

### 7. Synthesis Plan
Briefly map Steps 1-6 onto the required output sections (A/B/C/D/E) before
writing them. State what goes where and what the main thread is.
</think>

Now write your visible answer using ONLY what you established above,
following the standard tab formatting (sections A/B/C/D/E as instructed).
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

_PROTOCOL_TAB2 = """
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REASONING PROTOCOL (for your internal <think> block ONLY - Lal Kitab specialised):
CRITICAL: Lal Kitab and Vedic Jyotish are completely separate systems.
Never mix their principles in this analysis.

<think>
### 1. Domain Framing
Confirm you are working in Lal Kitab framework ONLY. State which Pakka Ghar
placements are the primary lens.

### 2. Fact Extraction
List every planet's D1 house position from the CHART data. No interpretation
yet - raw placements only.

### 3. Pakka Ghar Mapping
For each planet, state its Pakka Ghar (permanent house in Lal Kitab) and
whether the natal placement matches, is friendly, or is displaced.
Note any sleeping planets (sote hue graha).

### 4. Evidence Binding
For each REFERENCE TEXT passage from Lal Kitab, state which planet/house
placement it applies to. Discard Vedic Jyotish passages - they do not apply.

### 5. Rin (Karmic Debt) Scan
For each of the 6 possible Rins (Surya, Chandra, Mangal, Guru, Shukra,
Shani): state whether it is active and if active, what the classical
Farmaan prescription is.

### 6. Rule Application
Work through Lal Kitab implications for each displaced/sleeping planet.
Reason through the life area affected.

### 7. Conflict Resolution
If two Rins compete for the same life area or a Farmaan remedy conflicts,
resolve and state which takes priority.

### 8. Synthesis Plan
Map Steps 3-7 onto sections A/B/C/D before writing.
</think>

Now write your visible Lal Kitab analysis using ONLY what you established above.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

_PROTOCOL_TAB3 = """
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REASONING PROTOCOL (for your internal <think> block ONLY - Numerology, dual-system):

<think>
### 1. Domain Framing
State which two systems you are reconciling (Chaldean + Vedic Ankjyotish)
and which natal chart points you will cross-validate against.

### 2. Fact Extraction
Extract from CHART data: DOB digits, full name spelling, Moolank, Bhagyank,
Namank, Life Path, and their ruling planets.
Extract: Lagna sign and lord, 10th house lord, Moon sign lord.

### 3. System Reconciliation
For Moolank, Bhagyank, and Namank: compute the ruling planet from the
numerology table (1=Sun, 2=Moon, 3=Jupiter, 4=Rahu, 5=Mercury, 6=Venus,
7=Ketu, 8=Saturn, 9=Mars). State whether each ruling planet agrees with
or conflicts against the corresponding natal chart lord.
Be explicit: "Moolank 8 = Saturn; Lagna lord = Moon -> CONFLICT" or
"Bhagyank 3 = Jupiter; 10th lord = Jupiter -> HARMONY".

### 4. Evidence Binding
Match REFERENCE TEXT passages to specific number-planet-sign combinations
from Step 3 only. Discard passages that do not directly apply.

### 5. Rule Application
For each harmony/conflict found in Step 3, work through what it means
for the person's life. Reason it explicitly.

### 6. Conflict Resolution
If Moolank and Bhagyank ruling planets contradict, state which takes
precedence (Bhagyank = karmic trajectory, Moolank = personality expression).

### 7. 2026 Forecast Calculation
Compute Personal Year Number for 2026: (DOB day + DOB month + 2+0+2+6).
Reduce to single digit. State ruling planet and theme.

### 8. Synthesis Plan
Map Steps 3-7 onto sections A/B/C/D before writing.
</think>

Now write your visible Numerology Matrix using ONLY what you established above.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

_PROTOCOL_TAB8 = """
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REASONING PROTOCOL (for your internal <think> block ONLY - Remedies, 3-track):
The three tracks (Vedic, Lal Kitab, Numerology) must NEVER be mixed.

<think>
### 1. Domain Framing
List every active dosha from the DOSHA REPORT data.
List the 2 most afflicted planets from the DIGNITY SUMMARY.
These are your primary remedy targets.

### 2. Fact Extraction
For each dosha: which planets are involved, which houses, what severity.
For each afflicted planet: sign, house, dignity condition, aspects received.

### 3. Evidence Binding
Match REFERENCE TEXT passages to specific dosha or planet conditions.
For Lal Kitab track: match only Lal Kitab passages, not Vedic ones.

### 4. Rule Application
For each dosha: derive classical puja/remedy. For each afflicted planet:
derive mantra, gemstone, dana, and fasting from classical principles.
Reason through each, do not just assert.

### 5. Remedy Prioritization
Rank all remedies by urgency:
(1) Active dosha remedies first - they override individual planet remedies.
(2) Debilitated/enemy planet remedies.
(3) Neutral/supportive remedies.
State the ranking explicitly with justification.

### 6. Lal Kitab Farmaan Derivation (Track 2)
From the house placements, identify 5 genuine Lal Kitab Farmaan
prescriptions. Each must reference a specific house/planet from the chart.
Do NOT use generic Farmaans not grounded in this chart's placements.

### 7. Numerology Track Derivation (Track 3)
From the Name Number and Life Path: derive name correction, lucky colors
by day, and affirmation practice. Does Name Number conflict with Lagna lord?
If so, what spelling change resolves it?

### 8. Synthesis Plan
Map Steps 5-7 onto TRACK 1 / TRACK 2 / TRACK 3 in priority order.
</think>

Now write your visible Remedies analysis using ONLY what you established above.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

ELICITATION_PROTOCOLS: Dict[int, str] = {
    1: _PROTOCOL_DEFAULT,
    2: _PROTOCOL_TAB2,
    3: _PROTOCOL_TAB3,
    4: _PROTOCOL_DEFAULT,
    5: _PROTOCOL_DEFAULT,
    6: _PROTOCOL_DEFAULT,
    7: _PROTOCOL_DEFAULT,
    8: _PROTOCOL_TAB8,
    9: _PROTOCOL_DEFAULT,
    10: _PROTOCOL_DEFAULT,
    11: _PROTOCOL_DEFAULT,
}


# ═══════════════════════════════════════════════════════════════════════════════
# BIRTH DATA GENERATOR
# ═══════════════════════════════════════════════════════════════════════════════

def generate_random_birth_params() -> Dict[str, Any]:
    """Generate one synthetic Indian birth profile."""
    first = random.choice(INDIAN_FIRST_NAMES)
    last  = random.choice(INDIAN_LAST_NAMES)
    city_name, lat, lng = random.choice(INDIAN_CITIES)
    dob = DOB_MIN + timedelta(days=random.randint(0, DOB_RANGE_DAYS))
    tob = time_type(random.randint(0, 23), random.randint(0, 59), random.randint(0, 59))
    return {
        "full_name":      f"{first} {last}",
        "date_of_birth":  dob,
        "time_of_birth":  tob,
        "city_of_birth":  city_name,
        "lat": lat,
        "lng": lng,
        "language": "english",   # caller overrides this
    }


def compute_chart_local(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Build a complete chart dict using local Swiss Ephemeris only.
    No external API calls, no database required.
    """
    dob       = params["date_of_birth"]
    tob       = params["time_of_birth"]
    lat       = params["lat"]
    lng       = params["lng"]
    full_name = params["full_name"]

    local_chart  = calculate_chart_fallback(dob, tob, lat, lng)
    numerology   = get_numerology(dob, full_name)
    natal_planets = local_chart["planets"]
    natal_asc     = local_chart["ascendant"]

    d9      = compute_divisional_chart(natal_planets, natal_asc, "D9")
    d10     = compute_divisional_chart(natal_planets, natal_asc, "D10")
    d4      = compute_divisional_chart(natal_planets, natal_asc, "D4")
    d7      = compute_divisional_chart(natal_planets, natal_asc, "D7")
    d30     = compute_divisional_chart(natal_planets, natal_asc, "D30")
    chandra = compute_divisional_chart(natal_planets, natal_asc, "chandra")
    surya   = compute_divisional_chart(natal_planets, natal_asc, "surya")
    gochar  = compute_gochar_chart(lat, lng)

    kalsarp   = calculate_kalsarp(natal_planets)
    mangal    = calculate_mangal_dosha(natal_planets)
    pitru     = calculate_pitru_dosha(natal_planets)
    gand_mool = calculate_gand_mool(natal_planets)

    moon_p   = next((p for p in natal_planets if p["name"] == "Moon"), None)
    moon_nak = {}
    if moon_p:
        moon_nak = {
            "nakshatra":      moon_p.get("nakshatra"),
            "nakshatra_lord": moon_p.get("nakshatra_lord"),
            "nakshatra_pada": moon_p.get("nakshatra_pada"),
            "sign":           moon_p.get("sign"),
            "gand_mool":      gand_mool,
        }

    dasha = local_chart.get("dasha", {})
    return {
        "source":              "ephemeris",
        "full_name":           full_name,
        "date_of_birth":       str(dob),
        "birth_time":          str(tob),
        "birth_place":         params["city_of_birth"],
        "city_of_birth":       params["city_of_birth"],
        "current_city":        params["city_of_birth"],
        "planets":             natal_planets,
        "ascendant":           natal_asc,
        "houses":              local_chart.get("houses", {}),
        "nakshatra":           moon_nak,
        "dasha":               dasha,
        "current_dasha":       dasha.get("mahadasha", ""),
        "current_antardasha":  dasha.get("antardasha", ""),
        "dasha_periods":       dasha.get("periods", []),
        "ashtakavarga":        {},
        "yogas":               [],
        "lalkitab":            {},
        "kalsarp":             kalsarp,
        "mangal_dosha":        mangal,
        "pitru_dosha":         pitru,
        "navamsha":            d9,
        "dashamsha":           d10,
        "chaturthamsa":        d4,
        "saptamsha":           d7,
        "trimsamsa":           d30,
        "chandra_kundali":     chandra,
        "surya_kundali":       surya,
        "gochar":              gochar,
        "numerology":          numerology,
    }


def chart_rare_conditions(chart: Dict[str, Any]) -> Dict[str, bool]:
    return {
        "kalsarp":   bool(chart.get("kalsarp", {}).get("present")),
        "mangal":    bool(chart.get("mangal_dosha", {}).get("present")),
        "pitru":     bool(chart.get("pitru_dosha", {}).get("present")),
        "gand_mool": bool(
            chart.get("nakshatra", {}).get("gand_mool", {}).get("present")
        ),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# QUALITY GATE
# ═══════════════════════════════════════════════════════════════════════════════

_SELF_CORRECTION_RE = re.compile(
    r"(wait[,\s]+let me recalculate|actually[,\s]+let me redo|"
    r"i made an error|let me correct that|"
    r"correction:|re-thinking:|sorry[,\s]+i need to)",
    re.IGNORECASE,
)


def passes_quality_gate(
    response: str, is_chat: bool = False
) -> Tuple[bool, str]:
    stripped = response.strip()
    min_len  = MIN_CHAT_CHARS if is_chat else MIN_RESPONSE_CHARS

    if len(stripped) < min_len:
        return False, f"Too short: {len(stripped)} chars (min {min_len})"
    if _SELF_CORRECTION_RE.search(stripped):
        return False, "Contains self-correction artifact"
    if not is_chat and "##" not in stripped and "###" not in stripped:
        return False, "Missing markdown structure (no ## headers found)"
    return True, "ok"


# ═══════════════════════════════════════════════════════════════════════════════
# TAB REPORT GENERATOR — MULTI-PROVIDER CALL
# ═══════════════════════════════════════════════════════════════════════════════

async def call_provider_for_tab(
    chart_data: Dict[str, Any],
    tab_number: int,
    full_name: str,
    language: str,
) -> Optional[str]:
    """
    Builds the generation-time prompt (production prompt + reasoning protocol)
    and routes to the tab provider cascade (dual Gemini → Groq Qwen → OpenRouter).
    Returns the raw response with <think> blocks PRESERVED for training.
    """
    production_tab_prompt = build_tab_prompt(
        chart_data, tab_number, full_name, language=language
    )

    rag_context = ""
    try:
        rag_context = get_context_for_tab(tab_number, chart_data)
        if len(rag_context) > 4000:
            rag_context = rag_context[:4000] + "\n[...truncated for token limit]"
    except Exception as rag_err:
        logger.warning(f"RAG retrieval failed: {rag_err}")

    rag_block = (
        f"REFERENCE TEXTS FROM CLASSICAL SHASTRA:\n{rag_context}"
        if rag_context.strip()
        else "REFERENCE TEXTS: (vector store not initialised — use internal knowledge)"
    )

    protocol = ELICITATION_PROTOCOLS.get(tab_number, _PROTOCOL_DEFAULT)

    # Generation-time prompt: RAG + production tab prompt + reasoning protocol
    # NOTE: The protocol is NOT stored in the JSONL — only the assistant response is.
    generation_user_prompt = (
        f"{rag_block}\n\n"
        f"━━━━━━━━━━━━━━━━━━━━━━\n\n"
        f"{production_tab_prompt}"
        f"\n\n{protocol}"
    )

    if language and language.lower() not in ("english", "en", ""):
        lang_name = language.strip().capitalize()
        active_system = SYSTEM_PROMPT + (
            f"\n\n⚡ CRITICAL OUTPUT LANGUAGE: {lang_name.upper()}\n"
            f"Your ENTIRE response must be in {lang_name}. "
            f"Keep only classical astrological terms in Sanskrit/English form."
        )
    else:
        active_system = SYSTEM_PROMPT

    messages = [
        {"role": "system", "content": active_system},
        {"role": "user",   "content": generation_user_prompt},
    ]

    async with _global_semaphore:
        return await _call_tab_provider_cascade(messages, language)


# ═══════════════════════════════════════════════════════════════════════════════
# BUILD ChatML TRAINING EXAMPLE
# ═══════════════════════════════════════════════════════════════════════════════

def build_training_example(
    chart_data: Dict[str, Any],
    tab_number: int,
    full_name: str,
    language: str,
    assistant_response: str,
) -> Dict[str, str]:
    """
    Stored user turn  = production prompt (NO protocol — clean, same as inference).
    Stored assistant  = Full response WITH <think> block (key training signal for reasoning).
    """
    rag_context = ""
    try:
        rag_context = get_context_for_tab(tab_number, chart_data)
        if len(rag_context) > 4000:
            rag_context = rag_context[:4000] + "\n[...truncated for token limit]"
    except Exception:
        pass

    rag_block = (
        f"REFERENCE TEXTS FROM CLASSICAL SHASTRA:\n{rag_context}"
        if rag_context.strip()
        else "REFERENCE TEXTS: (vector store not initialised — use internal knowledge)"
    )

    production_tab_prompt = build_tab_prompt(
        chart_data, tab_number, full_name, language=language
    )

    if language and language.lower() not in ("english", "en", ""):
        lang_name = language.strip().capitalize()
        active_system = SYSTEM_PROMPT + (
            f"\n\n⚡ CRITICAL OUTPUT LANGUAGE: {lang_name.upper()}\n"
            f"Your ENTIRE response must be in {lang_name}. "
            f"Keep only classical astrological terms in Sanskrit/English form. "
            f"Every other word must be in {lang_name}."
        )
    else:
        active_system = SYSTEM_PROMPT

    user_content = (
        f"{rag_block}\n\n"
        f"━━━━━━━━━━━━━━━━━━━━━━\n\n"
        f"{production_tab_prompt}"
    )

    text = (
        f"<|im_start|>system\n{active_system}<|im_end|>\n"
        f"<|im_start|>user\n{user_content}<|im_end|>\n"
        f"<|im_start|>assistant\n{assistant_response}<|im_end|>"
    )
    return {"text": text}


# ═══════════════════════════════════════════════════════════════════════════════
# CHAT EXAMPLE GENERATOR
# ═══════════════════════════════════════════════════════════════════════════════

CHAT_QUESTIONS = [
    "Will I get a promotion this year?",
    "When will I get married?",
    "Is this year good for starting a business?",
    "Why do I keep having financial problems?",
    "What career suits me best?",
    "Will I have children soon?",
    "Is 2026 a good year for me overall?",
    "How is my health going to be this year?",
    "Why do my relationships keep failing?",
    "Should I move to a new city for work?",
    "When will my financial situation improve?",
    "What are my lucky colors and numbers?",
    "Is this a good time to buy property?",
    "Why do I feel stuck and not making progress?",
    "What remedies can help me in my current situation?",
    "Tell me about my current dasha period.",
    "What does Saturn transit mean for me?",
    "Will I find love this year?",
    "What is my biggest strength in my chart?",
    "What should I focus on in the next 6 months?",
    "Am I in a good dasha for career growth?",
    "What is causing delays in my marriage?",
    "Should I invest in property this year?",
    "How will Jupiter exaltation affect me?",
    "I feel very anxious lately — what does my chart say?",
]

_CHAT_SYSTEM_PROMPT = """\
You are a warm, empathetic, and supportive life guide inside the Trikal Darshi astrology app.
Your name is "Trikal AI Guide". Think of yourself as a caring, wise older friend — not a professor,
not a formal astrologer, just someone who genuinely wants to help the user understand their life.

YOUR LANGUAGE RULES (VERY IMPORTANT):
1. ALWAYS use simple, everyday words that anyone can understand. Never use jargon without explaining it.
2. If you MUST use an astrological term (like "Mahadasha", "Lagna", "Saturn"), explain it immediately
   in plain words right after using it — like this: "Your Mahadasha (think of it as the big life chapter
   you're currently in) is ruled by Jupiter, which means..."
3. Talk about real-life things: career, love, family, money, health, stress, happiness — not planets
   and houses in isolation.
4. Be warm and encouraging. Even when sharing a difficult prediction, frame it with hope.
5. Keep answers concise and conversational. No long walls of text. Use short paragraphs.
6. End EVERY response with one simple, friendly tip or action the user can take right now.
7. BOUNDARY ENFORCEMENT: You are exclusively an astrology and life guide. Decline non-astrology questions.
"""


async def generate_chat_example(
    chart_data: Optional[Dict[str, Any]],
    stage: str,
    language: str,
) -> Optional[Dict[str, str]]:
    """
    Generates one conversational chat training example.
    Routes through Groq-first cascade (lightweight, cheap on tokens).
    """
    question = random.choice(CHAT_QUESTIONS)

    context_block = ""
    if chart_data:
        lagna = chart_data.get("ascendant", {}).get("sign", "Unknown")
        md    = chart_data.get("current_dasha", "Unknown")
        ad    = chart_data.get("current_antardasha", "Unknown")
        context_block = (
            f"\n\nUSER'S BASIC INFO:\n"
            f"  Name: {chart_data.get('full_name', 'Seeker')}\n"
            f"  Born: {chart_data.get('date_of_birth', 'Unknown')} "
            f"in {chart_data.get('city_of_birth', 'Unknown')}\n"
            f"  Their Lagna: {lagna}\n"
            f"  Current Mahadasha: {md}\n"
            f"  Current Antardasha: {ad}"
        )

    system = _CHAT_SYSTEM_PROMPT.strip() + context_block
    if language and language.lower() != "english":
        lang_name = language.capitalize()
        system += f"\n\nCRITICAL INSTRUCTION: Always respond in {lang_name}."

    messages = [
        {"role": "system", "content": system},
        {"role": "user",   "content": question},
    ]

    async with _global_semaphore:
        response = await _call_chat_provider_cascade(messages)

    if not response:
        return None

    passed, reason = passes_quality_gate(response, is_chat=True)
    if not passed:
        logger.warning(f"Chat rejected: {reason}")
        return None

    text = (
        f"<|im_start|>system\n{system}<|im_end|>\n"
        f"<|im_start|>user\n{question}<|im_end|>\n"
        f"<|im_start|>assistant\n{response}<|im_end|>"
    )
    return {"text": text}


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN GENERATION LOOPS
# ═══════════════════════════════════════════════════════════════════════════════

async def generate_tab_examples(
    tab_number: int,
    target_en: int,
    target_hi: int,
    target_bn: int,
    all_examples: List[Dict],
    log_lines: List[str],
    stats: Dict,
) -> None:
    for language, target in [
        ("english", target_en),
        ("hindi",   target_hi),
        ("bengali", target_bn),
    ]:
        generated = 0
        attempts  = 0
        max_attempts = target * 5

        logger.info(
            f"Tab {tab_number} [{language}]: targeting {target} examples..."
        )

        while generated < target and attempts < max_attempts:
            attempts += 1

            # Check if all providers already exhausted from a previous call
            if _all_providers_exhausted:
                raise AllProvidersExhaustedError("All provider quotas exhausted (propagated).")

            params = generate_random_birth_params()
            params["language"] = language

            try:
                chart_data = compute_chart_local(params)
            except Exception as e:
                logger.warning(f"  Chart compute error: {e}")
                continue

            # Rejection-sampling: track rare conditions
            conditions = chart_rare_conditions(chart_data)
            for cond, present in conditions.items():
                if present and _rare_counts[cond] < RARE_QUOTAS[cond]:
                    _rare_counts[cond] += 1
                    logger.info(
                        f"  [Rare] '{cond}' captured "
                        f"({_rare_counts[cond]}/{RARE_QUOTAS[cond]})"
                    )

            # AllProvidersExhaustedError propagates up from cascade
            response = await call_provider_for_tab(
                chart_data, tab_number,
                params["full_name"], language,
            )
            if not response:
                log_lines.append(
                    f"FAILED | tab={tab_number} lang={language} "
                    f"name={params['full_name']} reason=provider_returned_none"
                )
                continue

            passed, reason = passes_quality_gate(response, is_chat=False)
            if not passed:
                logger.warning(f"  Rejected [{tab_number}][{language}]: {reason}")
                log_lines.append(
                    f"REJECTED | tab={tab_number} lang={language} reason={reason}"
                )
                continue

            example = build_training_example(
                chart_data, tab_number,
                params["full_name"], language, response,
            )
            all_examples.append(example)
            is_eval = (random.random() < EVAL_RATIO)
            append_example_to_disk(example, is_eval=is_eval)
            generated += 1

            stats["by_tab"][tab_number] = stats["by_tab"].get(tab_number, 0) + 1
            stats["by_language"][language] = (
                stats["by_language"].get(language, 0) + 1
            )
            log_lines.append(
                f"OK | tab={tab_number} lang={language} "
                f"name={params['full_name']} "
                f"dob={params['date_of_birth']} "
                f"chars={len(response)} set={'eval' if is_eval else 'train'}"
            )
            logger.info(
                f"  [{generated}/{target}] tab={tab_number} "
                f"lang={language} chars={len(response)} (saved to {'eval' if is_eval else 'train'})"
            )

            # Log quota status every 50 examples
            total_ok = sum(stats["by_tab"].values())
            if total_ok % 50 == 0:
                log_quota_summary()

        if generated < target:
            logger.warning(
                f"Tab {tab_number} [{language}]: "
                f"only {generated}/{target} generated after {attempts} attempts."
            )


async def main():
    global _global_semaphore
    _global_semaphore = asyncio.Semaphore(TOTAL_CONCURRENT_CALLS)

    logger.info("=" * 60)
    logger.info("Trikal Darshi — Training Data Generator")
    logger.info("Qwen3-4B-Thinking-2507 Fine-Tuning Dataset")
    logger.info("Multi-Provider Free-Tier Architecture (Auto-Save Enabled)")
    logger.info("=" * 60)
    logger.info(f"Output: {BASE_OUT}")

    existing_train, existing_eval = count_existing_saved_examples()
    if existing_train + existing_eval > 0:
        logger.info(f"Resuming with existing dataset: {existing_train} train, {existing_eval} eval")

    log_quota_summary()

    all_examples: List[Dict] = []
    log_lines:   List[str]   = []
    stats = {"by_tab": {}, "by_language": {}}

    # ── Phase 1: Tab reports ──
    logger.info("\n── Phase 1: Tab reports ──")
    try:
        for tab_number, en, hi, bn in TAB_TARGETS:
            await generate_tab_examples(
                tab_number, en, hi, bn,
                all_examples, log_lines, stats,
            )
            logger.info(
                f"Tab {tab_number} complete. "
                f"Total in session: {len(all_examples)} examples."
            )
            log_quota_summary()
    except AllProvidersExhaustedError:
        save_progress(all_examples, log_lines, stats, reason="all_providers_exhausted_during_tabs")
        return

    # ── Phase 2: Chat examples ─
    logger.info("\n── Phase 2: Chat examples ──")
    try:
        for stage, (en, hi, bn) in CHAT_TARGETS.items():
            for language, target in [
                ("english", en), ("hindi", hi), ("bengali", bn)
            ]:
                if _all_providers_exhausted:
                    raise AllProvidersExhaustedError("Exhausted before chat phase.")

                logger.info(
                    f"Chat [{stage}][{language}]: targeting {target} examples..."
                )
                generated = 0
                attempts  = 0
                while generated < target and attempts < target * 3:
                    attempts += 1

                    if _all_providers_exhausted:
                        raise AllProvidersExhaustedError("Exhausted during chat phase.")

                    chart = None
                    if stage != "no_chart":
                        p = generate_random_birth_params()
                        p["language"] = language
                        try:
                            chart = compute_chart_local(p)
                        except Exception:
                            continue

                    example = await generate_chat_example(chart, stage, language)
                    if example:
                        all_examples.append(example)
                        is_eval = (random.random() < EVAL_RATIO)
                        append_example_to_disk(example, is_eval=is_eval)
                        generated += 1
                        stats["by_language"][language] = (
                            stats["by_language"].get(language, 0) + 1
                        )
                        log_lines.append(
                            f"OK | chat stage={stage} lang={language}"
                        )
                        logger.info(f"  [{generated}/{target}] chat {stage} {language} (saved)")

                if generated < target:
                    logger.warning(
                        f"Chat [{stage}][{language}]: "
                        f"only {generated}/{target} after {attempts} attempts."
                    )
    except AllProvidersExhaustedError:
        save_progress(all_examples, log_lines, stats, reason="all_providers_exhausted_during_chat")
        return

    save_progress(all_examples, log_lines, stats, reason="completed")

    train_c, eval_c = count_existing_saved_examples()
    logger.info("\n" + "=" * 60)
    logger.info("Generation complete!")
    logger.info(f"  Train: {train_c} examples -> {TRAIN_FILE}")
    logger.info(f"  Eval:  {eval_c} examples  -> {EVAL_FILE}")
    logger.info("=" * 60)
    log_quota_summary()


if __name__ == "__main__":
    asyncio.run(main())
