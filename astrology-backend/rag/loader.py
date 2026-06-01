"""
rag/loader.py

Loads astrology PDFs, splits them into chunks, and tags
each chunk with source metadata (book, system, page, etc.).

Dependencies:
    - PyMuPDF  (import fitz)
    - langchain_text_splitters
"""

import os
import uuid
from typing import List, Dict, Any

import fitz  # PyMuPDF
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

# ---------------------------------------------------------------------------
# Book catalogue
# ---------------------------------------------------------------------------

BOOKS: List[Dict[str, Any]] = [
    {
        "path": "books/Brihat-Parāśara-Horā-Śhāstra.pdf",
        "name": "Brihat Parashara Hora Shastra",
        "system": "vedic",
        "topics": ["lagna", "planets", "yogas", "dasha",
                   "divisional charts", "ashtakavarga"],
    },
    {
        "path": "books/Jyotish_Lal-Kitab.pdf",
        "name": "Lal Kitab",
        "system": "lalkitab",
        "topics": ["pakka ghar", "rin", "farmaan",
                   "sleeping planets", "remedies"],
    },
    {
        "path": "books/Phaladeepika.pdf",
        "name": "Phaladeepika",
        "system": "vedic",
        "topics": ["planetary results", "house results",
                   "yogas", "longevity"],
    },
    {
        "path": "books/The-Brihat-Jataka.pdf",
        "name": "Brihat Jataka",
        "system": "vedic",
        "topics": ["planetary nature", "house significations",
                   "yogas", "timing"],
    },
]

# ---------------------------------------------------------------------------
# Chunking configuration
# ---------------------------------------------------------------------------

SPLITTER = RecursiveCharacterTextSplitter(
    chunk_size=800,
    chunk_overlap=150,
    separators=["\n\n", "\n", ". ", " "],
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _resolve_path(relative_path: str) -> str:
    """
    Resolves a book path relative to the astrology-backend root.
    Works whether the script is run from the repo root or elsewhere.
    """
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base_dir, relative_path)


def _extract_text_by_page(pdf_path: str) -> List[Dict[str, Any]]:
    """
    Opens a PDF with PyMuPDF and returns a list of
    {'page': int, 'text': str} dicts — one per page.
    """
    pages = []
    with fitz.open(pdf_path) as doc:
        for page_num, page in enumerate(doc, start=1):
            text = page.get_text("text")
            if text.strip():          # skip blank pages
                pages.append({"page": page_num, "text": text})
    return pages


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def load_single_book(book_config: Dict[str, Any]) -> List[Document]:
    """
    Load one PDF, split into chunks, and attach metadata to each chunk.

    Args:
        book_config: One entry from the BOOKS list.

    Returns:
        List of LangChain Document objects, each carrying:
            - page_content : the chunk text
            - metadata     : source, system, file, page, chunk_id
    """
    abs_path = _resolve_path(book_config["path"])
    filename = os.path.basename(abs_path)

    if not os.path.exists(abs_path):
        raise FileNotFoundError(
            f"[loader] PDF not found: {abs_path}\n"
            f"  -> Make sure '{filename}' is inside the books/ folder."
        )

    # 1. Extract text page-by-page
    pages = _extract_text_by_page(abs_path)

    # 2. Build per-page Documents so we can track page numbers after splitting
    documents: List[Document] = []

    for page_data in pages:
        page_text = page_data["text"]
        page_num  = page_data["page"]

        # Split this page's text into chunks
        chunks = SPLITTER.split_text(page_text)

        for chunk_text in chunks:
            if not chunk_text.strip():
                continue

            doc = Document(
                page_content=chunk_text,
                metadata={
                    "source":   book_config["name"],
                    "system":   book_config["system"],
                    "file":     filename,
                    "page":     page_num,
                    "topics":   book_config["topics"],
                    "chunk_id": str(uuid.uuid4()),
                },
            )
            documents.append(doc)

    return documents


def load_all_books() -> List[Document]:
    """
    Loads all 4 astrology books and returns a combined list of chunks.

    Prints progress for each book:
        Loading Brihat Parashara Hora Shastra... 847 chunks created.

    Returns:
        Combined list of Document objects from all books.
    """
    all_docs: List[Document] = []

    for book in BOOKS:
        print(f"Loading {book['name']}...", end=" ", flush=True)
        try:
            docs = load_single_book(book)
            print(f"{len(docs)} chunks created.")
            all_docs.extend(docs)
        except FileNotFoundError as e:
            print(f"SKIPPED — {e}")

    print(f"\nTotal chunks loaded: {len(all_docs)}")
    return all_docs


def get_book_stats(documents: List[Document] = None) -> Dict[str, int]:
    """
    Returns a dict with chunk counts per book.

    Args:
        documents: Optional pre-loaded list. If None, load_all_books()
                   is called automatically.

    Returns:
        e.g. {'Brihat Parashara Hora Shastra': 847, 'Lal Kitab 1952': 312, ...}
    """
    if documents is None:
        documents = load_all_books()

    stats: Dict[str, int] = {}
    for doc in documents:
        book_name = doc.metadata.get("source", "Unknown")
        stats[book_name] = stats.get(book_name, 0) + 1

    return stats
