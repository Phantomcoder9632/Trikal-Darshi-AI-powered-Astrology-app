"""
rag/vectorstore.py

ChromaDB vector store setup and singleton access.

Exposes:
    get_vectorstore()                      -> Chroma  (used by retriever.py)
    build_vectorstore(force_rebuild=False) -> Chroma  (used by main.py startup)
"""

from __future__ import annotations

import os
from langchain_community.vectorstores import Chroma
from rag.embeddings import get_embeddings

# Folder where ChromaDB persists its data (relative to backend root)
CHROMA_DIR   = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "chroma_db"
)
COLLECTION_NAME = "astrology_books"

# Module-level singleton — one Chroma instance per process
_vectorstore: Chroma | None = None


def get_vectorstore() -> Chroma:
    """
    Return the shared ChromaDB vector store instance.

    On first call:
      - Loads the embedding model (downloads if not cached).
      - Connects to the persisted chroma_db on disk.

    Raises FileNotFoundError if chroma_db doesn't exist yet
    (run build_index.py first).
    """
    global _vectorstore

    if _vectorstore is None:
        if not os.path.exists(CHROMA_DIR):
            raise FileNotFoundError(
                f"[vectorstore] chroma_db not found at: {CHROMA_DIR}\n"
                "  -> Run:  python rag/build_index.py"
            )

        embeddings = get_embeddings()

        _vectorstore = Chroma(
            collection_name=COLLECTION_NAME,
            embedding_function=embeddings,
            persist_directory=CHROMA_DIR,
        )

    return _vectorstore


def reset_vectorstore() -> None:
    """Force the singleton to reload on next call (used by build_index.py)."""
    global _vectorstore
    _vectorstore = None


def build_vectorstore(force_rebuild: bool = False) -> Chroma:
    """
    Called at app startup to ensure the vector store is ready.

    Behaviour:
      - force_rebuild=False (default):
          If chroma_db/ already exists on disk -> loads it instantly.
          If chroma_db/ does NOT exist         -> runs the full build pipeline.
      - force_rebuild=True:
          Always rebuilds from scratch (wipes existing index).

    Returns:
        The initialised Chroma vector store singleton.
    """
    global _vectorstore

    index_exists = (
        os.path.exists(CHROMA_DIR)
        and any(True for _ in os.scandir(CHROMA_DIR))  # non-empty dir
    )

    if force_rebuild or not index_exists:
        import logging
        log = logging.getLogger(__name__)
        log.info("[vectorstore] Building index from scratch...")

        # Import here to avoid circular imports at module load time
        from rag.build_index import build_index
        build_index()

        # Reset singleton so next get_vectorstore() reloads fresh
        reset_vectorstore()
        log.info("[vectorstore] Index build complete.")

    # Load (or return cached) vector store
    return get_vectorstore()
