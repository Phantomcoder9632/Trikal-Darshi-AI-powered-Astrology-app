"""
rag/build_index.py

One-time script: loads all astrology PDFs, embeds them, and stores
the vectors in chroma_db/.

Run once from the backend root (with venv active):
    python rag/build_index.py

After that, the index is persisted on disk and this script never
needs to run again (unless you add new books or want to rebuild).
"""

import sys
import os
import time

# Ensure backend root is on sys.path when run as a script
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tqdm import tqdm
from langchain_community.vectorstores import Chroma

from rag.loader    import load_all_books, get_book_stats
from rag.embeddings import get_embeddings

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

CHROMA_DIR      = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "chroma_db"
)
COLLECTION_NAME = "astrology_books"
BATCH_SIZE      = 256   # ChromaDB safe batch limit

# ---------------------------------------------------------------------------
# Main build function
# ---------------------------------------------------------------------------

def build_index() -> None:
    start = time.time()

    print("=" * 60)
    print("  ASTROLOGY RAG — VECTOR STORE BUILDER")
    print("=" * 60)
    print()

    # ── Step 1: Load & chunk all PDFs ─────────────────────────────────────
    print("STEP 1/3  Loading and chunking PDF books...")
    print("-" * 60)
    all_docs = load_all_books()

    if not all_docs:
        print("\n[ERROR] No documents loaded. Check that PDF files exist in books/")
        sys.exit(1)

    # Per-book breakdown
    stats = get_book_stats(all_docs)
    print("\nChunks per book:")
    for book_name, count in stats.items():
        print(f"  {book_name:45s}  {count:>5} chunks")
    print(f"  {'TOTAL':45s}  {len(all_docs):>5} chunks")

    # ── Step 2: Load embedding model ──────────────────────────────────────
    print()
    print("STEP 2/3  Loading embedding model (downloads ~80 MB on first run)...")
    print("-" * 60)
    embeddings = get_embeddings()

    # ── Step 3: Build ChromaDB index ──────────────────────────────────────
    print()
    print(f"STEP 3/3  Indexing into ChromaDB at: {CHROMA_DIR}")
    print("-" * 60)

    # Wipe existing collection so we start clean
    if os.path.exists(CHROMA_DIR):
        print("[info] Existing chroma_db found — rebuilding from scratch.")
        import shutil
        shutil.rmtree(CHROMA_DIR)

    os.makedirs(CHROMA_DIR, exist_ok=True)

    # Extract fields for direct ChromaDB insertion
    texts     = [doc.page_content for doc in all_docs]
    metadatas = [doc.metadata      for doc in all_docs]
    ids       = [doc.metadata["chunk_id"] for doc in all_docs]

    # Insert in batches with tqdm progress bar
    vectorstore = None
    batches = range(0, len(texts), BATCH_SIZE)

    for i in tqdm(batches, desc="Embedding batches", unit="batch"):
        batch_texts     = texts    [i : i + BATCH_SIZE]
        batch_metas     = metadatas[i : i + BATCH_SIZE]
        batch_ids       = ids      [i : i + BATCH_SIZE]

        if vectorstore is None:
            # Create collection on the first batch
            vectorstore = Chroma.from_texts(
                texts=batch_texts,
                embedding=embeddings,
                metadatas=batch_metas,
                ids=batch_ids,
                collection_name=COLLECTION_NAME,
                persist_directory=CHROMA_DIR,
            )
        else:
            # Add subsequent batches to the same collection
            vectorstore.add_texts(
                texts=batch_texts,
                metadatas=batch_metas,
                ids=batch_ids,
            )

    # ── Done ──────────────────────────────────────────────────────────────
    elapsed = time.time() - start
    print()
    print("=" * 60)
    print("  INDEX BUILD COMPLETE")
    print("=" * 60)
    print(f"  Total chunks indexed : {len(all_docs)}")
    print(f"  Time taken           : {elapsed:.1f} seconds")
    print(f"  Index stored at      : {CHROMA_DIR}")
    print()
    print("The vector store is ready. Start the backend server normally.")
    print("=" * 60)


if __name__ == "__main__":
    build_index()
