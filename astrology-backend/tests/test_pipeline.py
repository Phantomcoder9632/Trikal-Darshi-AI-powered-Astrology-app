import os
import unittest
import asyncio
from unittest.mock import patch, MagicMock
from types import SimpleNamespace

from services.llm_providers import (
    LLM_CASCADE,
    effective_max_tokens,
    cascade_for_language,
    is_tier_available,
    TARGET_MAX_OUTPUT_TOKENS,
)
from rag.pipeline import (
    stream_with_cascade,
    AllProvidersExhaustedError,
    _is_rate_limit,
    _yield_tokens,
)

# Model names come from the cascade itself so tests survive env-driven model changes
CF_MODEL = next(t["model"] for t in LLM_CASCADE if t["name"] == "cloudflare-primary")
GEMINI_MODEL = next(t["model"] for t in LLM_CASCADE if t["name"] == "gemini-primary")
GROQ70B_MODEL = next(t["model"] for t in LLM_CASCADE if t["name"] == "groq-llama70b")
QWEN_MODEL = next(t["model"] for t in LLM_CASCADE if t["name"] == "groq-qwen32b")
OPENROUTER_MODEL = next(t["model"] for t in LLM_CASCADE if t["name"] == "openrouter-safetynet")


class TestLLMProvidersAndCascade(unittest.IsolatedAsyncioTestCase):

    def setUp(self):
        # Reset environment mocks for clean state.
        # Cloudflare keys are set fake so Tier 1 (cloudflare-primary) participates
        # in fall-through tests without any real network call (client is mocked).
        self.env_patcher = patch.dict(os.environ, {
            "CLOUDFLARE_API_TOKEN": "fake_cf_token",
            "CLOUDFLARE_ACCOUNT_ID": "fake_cf_account",
            "GEMINI_API_KEY": "fake_gemini_key",
            "GROQ_API_KEY": "fake_groq_key",
            "OPENROUTER_API_KEY": "fake_openrouter_key",
        }, clear=False)
        self.env_patcher.start()

    def tearDown(self):
        self.env_patcher.stop()

    def test_effective_max_tokens(self):
        """Test effective_max_tokens caps appropriately at TARGET_MAX_OUTPUT_TOKENS."""
        small_tier = {"max_completion_tokens": 4096}
        large_tier = {"max_completion_tokens": 65536}
        self.assertEqual(effective_max_tokens(small_tier), 4096)
        self.assertEqual(effective_max_tokens(large_tier), TARGET_MAX_OUTPUT_TOKENS)

    def test_cascade_for_language_hindi_bengali(self):
        """Test English keeps Cloudflare Llama-70B on top; Hindi/Bengali promote
        the Cloudflare DeepSeek-R1 distill to the front."""
        en_cascade = cascade_for_language("english")
        self.assertEqual(en_cascade[0]["name"], "cloudflare-primary")
        self.assertEqual(en_cascade[1]["name"], "gemini-primary")
        self.assertEqual(en_cascade[2]["name"], "groq-llama70b")
        self.assertEqual(en_cascade[3]["name"], "groq-qwen32b")
        self.assertEqual(len(en_cascade), len(LLM_CASCADE))

        hi_cascade = cascade_for_language("hi")
        self.assertEqual(hi_cascade[0]["name"], "cloudflare-deepseek32b")
        self.assertEqual(hi_cascade[1]["name"], "cloudflare-primary")
        self.assertEqual(len(hi_cascade), len(LLM_CASCADE))

        bn_cascade = cascade_for_language("bengali")
        self.assertEqual(bn_cascade[0]["name"], "cloudflare-deepseek32b")

    def test_is_tier_available(self):
        """Test missing or placeholder API keys are correctly flagged as unavailable,
        and that Cloudflare tiers additionally require CLOUDFLARE_ACCOUNT_ID."""
        tier = {"api_key_env": "TEST_KEY_ENV"}
        with patch.dict(os.environ, {"TEST_KEY_ENV": ""}):
            self.assertFalse(is_tier_available(tier))
        with patch.dict(os.environ, {"TEST_KEY_ENV": "your_test_key_here"}):
            self.assertFalse(is_tier_available(tier))
        with patch.dict(os.environ, {"TEST_KEY_ENV": "sk-valid-key"}):
            self.assertTrue(is_tier_available(tier))

        # Cloudflare tier with a valid token but NO account id -> unavailable
        cf_tier = {
            "name": "cloudflare-primary",
            "api_key_env": "CLOUDFLARE_API_TOKEN",
            "base_url": "https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/ai/v1",
        }
        with patch.dict(os.environ, {"CLOUDFLARE_API_TOKEN": "tok", "CLOUDFLARE_ACCOUNT_ID": ""}):
            self.assertFalse(is_tier_available(cf_tier))
        with patch.dict(os.environ, {"CLOUDFLARE_API_TOKEN": "", "CLOUDFLARE_ACCOUNT_ID": "acct"}):
            self.assertFalse(is_tier_available(cf_tier))
        with patch.dict(os.environ, {"CLOUDFLARE_API_TOKEN": "tok", "CLOUDFLARE_ACCOUNT_ID": "acct"}):
            self.assertTrue(is_tier_available(cf_tier))

    def test_is_rate_limit_cloudflare_signals(self):
        """Cloudflare neuron-quota / 429 signals classify as rate limits."""
        self.assertTrue(_is_rate_limit(Exception("429 Too Many Requests")))
        self.assertTrue(_is_rate_limit(Exception("rate_limit_exceeded (TPM limit)")))
        self.assertTrue(_is_rate_limit(Exception("exceeded neuron quota for this month")))
        # Status-code based detection (OpenAI SDK APIStatusError shape)
        err = SimpleNamespace(status_code=429, __str__=lambda self: "cf error")
        self.assertTrue(_is_rate_limit(err))
        self.assertFalse(_is_rate_limit(Exception("connection reset by peer")))

    def _mock_chunk(self, text):
        chunk = MagicMock()
        choice = MagicMock()
        choice.delta.content = text
        chunk.choices = [choice]
        return chunk

    async def test_rate_limit_fallthrough_to_tier3(self):
        """Tiers 1 (Cloudflare, neuron quota) and 2 (Gemini, 429) fail; tier 3 (Groq 70B) succeeds."""
        tier3_content = "X" * 1200  # >= 1000 chars

        def mock_create(*args, **kwargs):
            model = kwargs.get("model")
            if model == CF_MODEL:
                raise Exception("429: exceeded neuron quota for this account")
            elif model == GEMINI_MODEL:
                raise Exception("429 ResourceExhausted: rate limit exceeded")
            elif model == GROQ70B_MODEL:
                return [self._mock_chunk(tier3_content[:600]), self._mock_chunk(tier3_content[600:])]
            raise Exception("Unexpected model")

        mock_client = MagicMock()
        mock_client.chat.completions.create.side_effect = mock_create

        with patch("rag.pipeline.get_cached_client", return_value=mock_client):
            model_info = {}
            chunks = []
            async for chunk in stream_with_cascade([{"role": "user", "content": "hi"}], model_info=model_info):
                chunks.append(chunk)

            full_text = "".join(chunks)
            self.assertEqual(full_text, tier3_content)
            self.assertEqual(model_info.get("model"), f"groq-llama70b/{GROQ70B_MODEL}")

    async def test_short_output_rejection_falls_through(self):
        """A < 1000-char response from Tier 1 (Cloudflare) is rejected and falls through to Tier 2 (Gemini)."""
        short_output = "This is a short answer under 1000 chars."
        valid_output = "Valid deep analysis... " + ("A" * 1100)

        def mock_create(*args, **kwargs):
            model = kwargs.get("model")
            if model == CF_MODEL:
                return [self._mock_chunk(short_output)]
            elif model == GEMINI_MODEL:
                return [self._mock_chunk(valid_output)]
            raise Exception("Unexpected model")

        mock_client = MagicMock()
        mock_client.chat.completions.create.side_effect = mock_create

        with patch("rag.pipeline.get_cached_client", return_value=mock_client):
            model_info = {}
            chunks = []
            async for chunk in stream_with_cascade([{"role": "user", "content": "hi"}], model_info=model_info, validate_min_length=True):
                chunks.append(chunk)

            full_text = "".join(chunks)
            self.assertEqual(full_text, valid_output)
            self.assertEqual(model_info.get("model"), f"gemini-primary/{GEMINI_MODEL}")

    async def test_all_providers_exhausted_raises_error(self):
        """Test AllProvidersExhaustedError is raised when every tier in the cascade fails."""
        mock_client = MagicMock()
        mock_client.chat.completions.create.side_effect = Exception("General upstream failure")

        with patch("rag.pipeline.get_cached_client", return_value=mock_client):
            with self.assertRaises(AllProvidersExhaustedError):
                async for _ in stream_with_cascade([{"role": "user", "content": "hi"}]):
                    pass

    async def test_missing_api_keys_skipped_cleanly(self):
        """Test tiers with missing env vars are skipped without raising errors."""
        # Unset Cloudflare, GEMINI and GROQ, leaving only OPENROUTER
        with patch.dict(os.environ, {
            "CLOUDFLARE_API_TOKEN": "",
            "CLOUDFLARE_ACCOUNT_ID": "",
            "GEMINI_API_KEY": "",
            "GROQ_API_KEY": "",
            "OPENROUTER_API_KEY": "sk-valid-openrouter",
        }):
            valid_output = "B" * 1200
            mock_client = MagicMock()
            mock_client.chat.completions.create.return_value = [self._mock_chunk(valid_output)]

            with patch("rag.pipeline.get_cached_client", return_value=mock_client):
                model_info = {}
                chunks = []
                async for chunk in stream_with_cascade([{"role": "user", "content": "hi"}], model_info=model_info):
                    chunks.append(chunk)

                full_text = "".join(chunks)
                self.assertEqual(full_text, valid_output)
                self.assertEqual(model_info.get("model"), f"openrouter-safetynet/{OPENROUTER_MODEL}")


if __name__ == "__main__":
    unittest.main()
