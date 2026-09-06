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


class TestLLMProvidersAndCascade(unittest.IsolatedAsyncioTestCase):

    def setUp(self):
        # Reset environment mocks for clean state
        self.env_patcher = patch.dict(os.environ, {
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
        """Test Hindi and Bengali re-order groq-qwen32b to the top."""
        en_cascade = cascade_for_language("english")
        self.assertEqual(en_cascade[0]["name"], "gemini-primary")
        self.assertEqual(en_cascade[1]["name"], "groq-llama70b")
        self.assertEqual(en_cascade[2]["name"], "groq-qwen32b")

        hi_cascade = cascade_for_language("hi")
        self.assertEqual(hi_cascade[0]["name"], "groq-qwen32b")
        self.assertEqual(len(hi_cascade), len(LLM_CASCADE))

        bn_cascade = cascade_for_language("bengali")
        self.assertEqual(bn_cascade[0]["name"], "groq-qwen32b")

    def test_is_tier_available(self):
        """Test missing or placeholder API keys are correctly flagged as unavailable."""
        tier = {"api_key_env": "TEST_KEY_ENV"}
        with patch.dict(os.environ, {"TEST_KEY_ENV": ""}):
            self.assertFalse(is_tier_available(tier))
        with patch.dict(os.environ, {"TEST_KEY_ENV": "your_test_key_here"}):
            self.assertFalse(is_tier_available(tier))
        with patch.dict(os.environ, {"TEST_KEY_ENV": "sk-valid-key"}):
            self.assertTrue(is_tier_available(tier))

    def _mock_chunk(self, text):
        chunk = MagicMock()
        choice = MagicMock()
        choice.delta.content = text
        chunk.choices = [choice]
        return chunk

    async def test_rate_limit_fallthrough_to_tier3(self):
        """Mock tiers 1 and 2 raising rate-limit 429 exceptions; assert tier 3 succeeds."""
        # Tier 1: gemini-primary (fails 429)
        # Tier 2: groq-llama70b (fails 429)
        # Tier 3: groq-qwen32b (succeeds)
        tier3_content = "X" * 1200  # >= 1000 chars

        def mock_create(*args, **kwargs):
            model = kwargs.get("model")
            if model == "gemini-2.5-flash":
                raise Exception("429 ResourceExhausted: rate limit exceeded")
            elif model == "llama-3.3-70b-versatile":
                raise Exception("rate_limit_exceeded (TPM limit)")
            elif model == "qwen/qwen3-32b":
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
            self.assertEqual(model_info.get("model"), "groq-qwen32b/qwen/qwen3-32b")

    async def test_short_output_rejection_falls_through(self):
        """Test that a response under 1000 characters from tier 1 is rejected and falls through to tier 2."""
        short_output = "This is a short answer under 1000 chars."
        valid_output = "Valid deep analysis... " + ("A" * 1100)

        def mock_create(*args, **kwargs):
            model = kwargs.get("model")
            if model == "gemini-2.5-flash":
                return [self._mock_chunk(short_output)]
            elif model == "llama-3.3-70b-versatile":
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
            self.assertEqual(model_info.get("model"), "groq-llama70b/llama-3.3-70b-versatile")

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
        # Unset GEMINI and GROQ, leaving only OPENROUTER
        with patch.dict(os.environ, {
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
                self.assertEqual(model_info.get("model"), "openrouter-safetynet/meta-llama/llama-3.3-70b-instruct:free")


if __name__ == "__main__":
    unittest.main()
