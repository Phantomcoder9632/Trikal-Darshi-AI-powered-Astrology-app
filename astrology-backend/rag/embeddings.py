"""
rag/embeddings.py

Centralised embedding model setup.
Uses sentence-transformers/all-MiniLM-L6-v2 (~80 MB, downloads on first use).
"""

from __future__ import annotations

import os
os.environ["USE_TORCH"] = "1"
os.environ["USE_TF"] = "0"

from langchain_community.embeddings import HuggingFaceEmbeddings

# Model used for all embedding operations
EMBED_MODEL_NAME = "all-MiniLM-L6-v2"

# Module-level singleton — loaded once per process
_embeddings = None


def get_embeddings() -> HuggingFaceEmbeddings:
    """
    Return the shared HuggingFaceEmbeddings instance.
    Downloads the model on first call (~80 MB, cached locally after that).
    """
    global _embeddings
    if _embeddings is None:
        print(f"[embeddings] Loading model: {EMBED_MODEL_NAME}")
        _embeddings = HuggingFaceEmbeddings(
            model_name=EMBED_MODEL_NAME,
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True},
        )
        print("[embeddings] Model ready.")
    return _embeddings
