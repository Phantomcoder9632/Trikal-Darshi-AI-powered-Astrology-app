"""
Trikal Darshi — Fine-tuning Script with Unsloth (QLoRA 4-bit)
Model: Qwen/Qwen2.5-3B-Instruct or Qwen/Qwen2.5-7B-Instruct / Qwen3-4B-Thinking
Optimized for 16GB VRAM GPU (e.g. RTX 4080 / RTX 3080 / T4)
"""

import os
import sys
import torch
from pathlib import Path
from datasets import load_dataset
from trl import SFTTrainer
from transformers import TrainingArguments

# Ensure Unsloth is imported before transformers/peft for kernel acceleration
try:
    from unsloth import FastLanguageModel, is_bfloat16_supported
except ImportError:
    print("[ERROR] Unsloth not installed. Please install via:")
    print("pip install unsloth")
    sys.exit(1)

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
TRAIN_FILE = DATA_DIR / "train.jsonl"
EVAL_FILE = DATA_DIR / "eval.jsonl"
OUTPUT_DIR = BASE_DIR / "output"
LORA_OUTPUT = BASE_DIR / "lora_model"
GGUF_OUTPUT = BASE_DIR / "gguf_model"

# ── Hyperparameters ───────────────────────────────────────────────────────────
MODEL_NAME = os.getenv("BASE_MODEL", "Qwen/Qwen2.5-3B-Instruct") # or Qwen3-4B-Thinking
MAX_SEQ_LENGTH = 4096
DTYPE = None  # Auto detect: Float16 for older GPUs, Bfloat16 for Ampere+
LOAD_IN_4BIT = True  # 4-bit QLoRA to fit comfortably in 16GB VRAM

# LoRA Config
LORA_R = 16
LORA_ALPHA = 32
LORA_DROPOUT = 0.05
TARGET_MODULES = [
    "q_proj", "k_proj", "v_proj", "o_proj",
    "gate_proj", "up_proj", "down_proj"
]

# Training Config
BATCH_SIZE = 2
GRAD_ACCUMULATION = 4  # Effective batch size = 2 * 4 = 8
NUM_EPOCHS = 3
LEARNING_RATE = 2e-4
WEIGHT_DECAY = 0.01
WARMUP_RATIO = 0.05
LOGGING_STEPS = 10
SAVE_STEPS = 100


def main():
    if not TRAIN_FILE.exists():
        print(f"[ERROR] Training data not found at: {TRAIN_FILE}")
        print("Please run scripts/generate_training_data.py first!")
        sys.exit(1)

    print("=" * 60)
    print("🌟 TRIKAL DARSHI — ASTROLOGY MODEL FINE-TUNING")
    print("=" * 60)
    print(f"Base Model:     {MODEL_NAME}")
    print(f"Max Seq Length: {MAX_SEQ_LENGTH}")
    print(f"Train File:     {TRAIN_FILE}")
    print(f"Eval File:      {EVAL_FILE if EVAL_FILE.exists() else 'None'}")
    print(f"CUDA Available: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"GPU Device:     {torch.cuda.get_device_name(0)}")
        print(f"VRAM:           {torch.cuda.get_device_properties(0).total_memory / (1024**3):.2f} GB")
    print("=" * 60)

    # 1. Load Model & Tokenizer with Unsloth
    print("\n[1/5] Loading base model in 4-bit...")
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=MODEL_NAME,
        max_seq_length=MAX_SEQ_LENGTH,
        dtype=DTYPE,
        load_in_4bit=LOAD_IN_4BIT,
    )

    # 2. Add LoRA Adapters
    print("\n[2/5] Adding LoRA adapters...")
    model = FastLanguageModel.get_peft_model(
        model,
        r=LORA_R,
        target_modules=TARGET_MODULES,
        lora_alpha=LORA_ALPHA,
        lora_dropout=LORA_DROPOUT,
        bias="none",
        use_gradient_checkpointing="unsloth", # 30% less VRAM
        random_state=42,
    )

    # 3. Load Datasets
    print("\n[3/5] Loading datasets...")
    train_dataset = load_dataset("json", data_files=str(TRAIN_FILE), split="train")
    eval_dataset = load_dataset("json", data_files=str(EVAL_FILE), split="train") if EVAL_FILE.exists() else None
    print(f"Train samples: {len(train_dataset)}")
    if eval_dataset:
        print(f"Eval samples:  {len(eval_dataset)}")

    # 4. Initialize SFTTrainer
    print("\n[4/5] Initializing Trainer...")
    training_args = TrainingArguments(
        output_dir=str(OUTPUT_DIR),
        per_device_train_batch_size=BATCH_SIZE,
        gradient_accumulation_steps=GRAD_ACCUMULATION,
        learning_rate=LEARNING_RATE,
        num_train_epochs=NUM_EPOCHS,
        warmup_ratio=WARMUP_RATIO,
        logging_steps=LOGGING_STEPS,
        save_strategy="steps",
        save_steps=SAVE_STEPS,
        save_total_limit=2,
        fp16=not is_bfloat16_supported(),
        bf16=is_bfloat16_supported(),
        optim="adamw_8bit",
        weight_decay=WEIGHT_DECAY,
        lr_scheduler_type="cosine",
        seed=42,
        report_to="tensorboard",
    )

    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        dataset_text_field="text",
        max_seq_length=MAX_SEQ_LENGTH,
        dataset_num_proc=2,
        packing=False,
        args=training_args,
    )

    # 5. Train
    print("\n[5/5] Starting training run...")
    trainer.train()

    # Save LoRA model
    print("\n Saving LoRA adapter weights...")
    model.save_pretrained(str(LORA_OUTPUT))
    tokenizer.save_pretrained(str(LORA_OUTPUT))
    print(f"LoRA saved to: {LORA_OUTPUT}")

    # Export to GGUF for free CPU inference (Q4_K_M)
    print("\n Exporting to GGUF (q4_k_m) for Hugging Face Free CPU...")
    try:
        model.save_pretrained_gguf(
            str(GGUF_OUTPUT),
            tokenizer,
            quantization_method="q4_k_m"
        )
        print(f"✨ GGUF model exported to: {GGUF_OUTPUT}")
    except Exception as e:
        print(f"⚠️ GGUF export encountered error: {e}")
        print("You can manually convert using llama.cpp or merge_and_unload.")

    print("\n🎉 Fine-tuning completed successfully!")


if __name__ == "__main__":
    main()
