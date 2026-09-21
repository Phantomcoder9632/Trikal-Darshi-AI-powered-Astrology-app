# 🌌 Trikal Darshi — Local Fine-Tuning & Deployment Pipeline

This package contains the complete pipeline to synthesize high-quality training datasets, fine-tune an open-source LLM (Qwen2.5/Qwen3) using 4-bit QLoRA on a 16GB VRAM GPU, convert it to GGUF `q4_k_m`, and run CPU inference or deploy on Hugging Face Spaces free tier.

---

## 📁 Pipeline Architecture & Files

| File | Purpose |
|------|---------|
| [`scripts/generate_training_data.py`](file:///d:/AstrologyApp/astrology-backend/scripts/generate_training_data.py) | Generates ~1,420 high-fidelity ChatML examples with classical RAG & 7-step thinking traces across English, Hindi, and Bengali. |
| [`requirements_training.txt`](file:///d:/AstrologyApp/astrology-backend/astrology_finetuning/requirements_training.txt) | Python dependencies (Unsloth, PyTorch, TRL, PEFT, llama-cpp-python). |
| [`train_unsloth.py`](file:///d:/AstrologyApp/astrology-backend/astrology_finetuning/train_unsloth.py) | Unsloth 4-bit QLoRA trainer script (4096 context window, gradient accumulation, automatic GGUF export). |
| [`test_gguf_inference.py`](file:///d:/AstrologyApp/astrology-backend/astrology_finetuning/test_gguf_inference.py) | Benchmark & validation script to test CPU streaming inference and token/second speed. |

---

## 🚀 Step-by-Step Workflow

### Step 1: Synthetic Dataset Generation
Generate 1,420 synthetic examples (Tabs 1–11 + Chat in EN, HI, BN) using the live backend ephemeris engine, RAG Chroma vector store, and Gemini 2.5 Flash:

```bash
# In astrology-backend/ directory:
python scripts/generate_training_data.py
```

Outputs created in `astrology_finetuning/data/`:
- `train.jsonl` (~1,280 training samples in ChatML format)
- `eval.jsonl` (~140 evaluation samples)
- `generation_log.txt` (Live logs)
- `stats/dataset_report.md` (Coverage and distribution stats)

---

### Step 2: Environment Setup for Fine-Tuning
Install CUDA PyTorch and Unsloth:

```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
pip install -r astrology_finetuning/requirements_training.txt
```

---

### Step 3: Local Fine-Tuning (16GB VRAM GPU)
Run the Unsloth training script:

```bash
python astrology_finetuning/train_unsloth.py
```
- Fits within **8–12 GB VRAM** with Unsloth 4-bit QLoRA + gradient checkpointing.
- Automatically exports the fine-tuned model to `astrology_finetuning/gguf_model/` quantized as `q4_k_m` (~2.5 GB).

---

### Step 4: CPU Inference Testing & Validation
Verify the quantized GGUF on local CPU:

```bash
python astrology_finetuning/test_gguf_inference.py
```

---

### Step 5: Deployment to Hugging Face Free CPU Space
1. Place the resulting `model.q4_k_m.gguf` file inside your Hugging Face space repository.
2. In the FastAPI backend `pipeline.py`, initialize `llama_cpp.Llama(model_path="model.q4_k_m.gguf", n_threads=2, n_ctx=4096)`.
3. The model runs locally on HF's 16GB RAM / 2 vCPU environment with 0 external API costs.
