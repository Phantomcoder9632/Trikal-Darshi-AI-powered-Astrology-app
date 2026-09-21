"""
Trikal Darshi — Local GGUF CPU/GPU Inference Benchmark & Validation
Tests the quantized GGUF model with streaming output and speed metrics.
"""

import sys
import time
from pathlib import Path

try:
    from llama_cpp import Llama
except ImportError:
    print("[ERROR] llama-cpp-python is not installed. Install via: pip install llama-cpp-python")
    sys.exit(1)

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent
GGUF_DIR = BASE_DIR / "gguf_model"

# Find .gguf file
gguf_files = list(GGUF_DIR.glob("*.gguf")) if GGUF_DIR.exists() else []


def main():
    if not gguf_files:
        print(f"[ERROR] No .gguf file found in: {GGUF_DIR}")
        print("Please complete fine-tuning and GGUF export first.")
        sys.exit(1)

    model_path = str(gguf_files[0])
    print(f"Loading GGUF model: {model_path}")

    # n_gpu_layers=0 for pure CPU (like Hugging Face free space), or -1 for all on GPU
    llm = Llama(
        model_path=model_path,
        n_ctx=4096,
        n_threads=4,        # 2 or 4 vCPU threads
        n_gpu_layers=0,     # Test pure CPU speed
        verbose=False,
    )

    system_prompt = (
        "You are a Trikal Darshi Cosmic Architect — a master Vedic Jyotish Acharya, "
        "Lal Kitab Visheshagya, and Numerology Pandit. Answer based ONLY on chart data."
    )

    user_query = (
        "CHART: Lagna: Cancer 14.7° | Sun: Aries H10 15° | Moon: Cancer H1 22° | "
        "Dasha: Rahu-Jupiter (2026-03 to 2027-07)\n\n"
        "TASK: How will my career and promotion prospects unfold over the next 12 months?"
    )

    prompt = (
        f"<|im_start|>system\n{system_prompt}<|im_end|>\n"
        f"<|im_start|>user\n{user_query}<|im_end|>\n"
        f"<|im_start|>assistant\n"
    )

    print("\n" + "=" * 60)
    print("🔮 GENERATING INFERENCE (STREAMING)...")
    print("=" * 60 + "\n")

    start_time = time.time()
    token_count = 0

    response = llm(
        prompt=prompt,
        max_tokens=1024,
        temperature=0.4,
        top_p=0.9,
        stream=True,
        stop=["<|im_end|>", "<|im_start|>"]
    )

    for chunk in response:
        text = chunk["choices"][0]["text"]
        print(text, end="", flush=True)
        token_count += 1

    elapsed = time.time() - start_time
    tps = token_count / elapsed if elapsed > 0 else 0

    print("\n\n" + "=" * 60)
    print(f"⏱️ Tokens Generated: {token_count}")
    print(f"⏱️ Elapsed Time:     {elapsed:.2f} seconds")
    print(f"⚡ Speed:            {tps:.2f} tokens/sec")
    print("=" * 60)


if __name__ == "__main__":
    main()
