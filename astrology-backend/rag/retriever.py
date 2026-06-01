"""
rag/retriever.py

Smart search engine that finds the most relevant passages from the
astrology book corpus for each report tab.

Depends on:
    rag/vectorstore.py  → must expose  get_vectorstore() -> Chroma
"""

from __future__ import annotations

from typing import List, Dict, Any, Optional

# ---------------------------------------------------------------------------
# Tab → search queries mapping
# ---------------------------------------------------------------------------

TAB_QUERIES: Dict[int, List[str]] = {
    1: [  # Lagna & Soul Blueprint
        "lagna ascendant analysis first house lord",
        "moon nakshatra pada soul purpose",
        "atmakaraka jaimini system",
        "planetary dignity exalted debilitated own sign",
        "raj yoga dhana yoga identification",
        "kaal sarp dosha mangal dosha",
        "mahadasha antardasha vimshottari prediction",
    ],
    2: [  # Lal Kitab
        "pakka ghar permanent house planet",
        "rin karmic debt surya chandra mangal",
        "sleeping planet sote hue graha",
        "lal kitab farmaan remedy prescription",
        "lal kitab saturn pisces rahu aquarius",
    ],
    3: [  # Numerology
        "moolank bhagyank namank ruling planet",
        "chaldean numerology name number",
        "personal year number forecast",
        "lucky number color day planet",
    ],
    4: [  # Career
        "tenth house lord career profession dashamsha",
        "saturn karma karaka profession",
        "jupiter exalted cancer career opportunity",
        "d10 dashamsha lagna career planet",
    ],
    5: [  # Wealth
        "second house wealth accumulated money",
        "eleventh house income gains profit",
        "dhana yoga wealth combination",
        "ashtakavarga bindhu score second eleventh",
    ],
    6: [  # Love & Marriage
        "seventh house marriage spouse partner",
        "venus placement dignity love relationship",
        "navamsha d9 marriage quality dharma",
        "upapada lagna spouse characteristics",
    ],
    7: [  # Health
        "sixth house disease illness health",
        "lagna lord health vitality body",
        "eighth house chronic hidden illness",
        "moon mercury mental health anxiety",
    ],
    8: [  # Remedies
        "mantra gemstone remedy planet",
        "dana charity donation remedy",
        "lal kitab farmaan practical remedy",
        "yantra gemstone metal finger wearing",
    ],
}

# Tab 2 (Lal Kitab) should prefer chunks from the lalkitab system
_LAL_KITAB_TAB = 2

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _get_vs():
    """
    Lazy import of get_vectorstore() so retriever.py can be imported
    even while vectorstore.py is still being built.
    """
    from rag.vectorstore import get_vectorstore  # noqa: WPS433
    return get_vectorstore()


def _deduplicate(docs: List[Any]) -> List[Any]:
    """
    Remove duplicate chunks by their chunk_id metadata field.
    Preserves first-seen order (highest-score first if results
    are returned ranked).
    """
    seen: set = set()
    unique: List[Any] = []
    for doc in docs:
        chunk_id = doc.metadata.get("chunk_id", id(doc))
        if chunk_id not in seen:
            seen.add(chunk_id)
            unique.append(doc)
    return unique


def _boost_lalkitab(docs: List[Any]) -> List[Any]:
    """
    Reorder results so that chunks where system='lalkitab' come first.
    Used when tab_number == 2.
    """
    lk = [d for d in docs if d.metadata.get("system") == "lalkitab"]
    rest = [d for d in docs if d.metadata.get("system") != "lalkitab"]
    return lk + rest


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def search_for_tab(
    tab_number: int,
    chart_context: str = "",
    k: int = 8,
) -> List[Any]:
    """
    Search ChromaDB for the most relevant passages for a given tab.

    Strategy:
      1. Pull all queries defined for this tab in TAB_QUERIES.
      2. Optionally prepend chart_context to each query to personalise results.
      3. Run similarity_search for each query (fetching k candidates each time).
      4. Deduplicate by chunk_id.
      5. For tab 2 (Lal Kitab) boost lalkitab-system chunks to the top.
      6. Return the top-k unique chunks.

    Args:
        tab_number:    Report tab number (1-8).
        chart_context: Optional extra terms derived from the chart
                       (e.g. "Aries lagna Saturn tenth house").
        k:             Number of unique chunks to return.

    Returns:
        List of LangChain Document objects (up to k items).
    """
    queries = TAB_QUERIES.get(tab_number, [])
    if not queries:
        return []

    vs = _get_vs()
    all_docs: List[Any] = []

    for query in queries:
        # Personalise the query with chart context when available
        full_query = f"{chart_context} {query}".strip() if chart_context else query

        # Fetch extra candidates per query so deduplication doesn't shrink
        # the pool below k
        candidates = vs.similarity_search(full_query, k=k)
        all_docs.extend(candidates)

    unique_docs = _deduplicate(all_docs)

    # Boost Lal Kitab sources to the top for tab 2
    if tab_number == _LAL_KITAB_TAB:
        unique_docs = _boost_lalkitab(unique_docs)

    return unique_docs[:k]


def format_rag_context(chunks: List[Any]) -> str:
    """
    Format a list of Document chunks into a clean text block
    suitable for injection into an LLM prompt.

    Output format per chunk:
        From [Book Name] (Page X):
        [chunk text]
        ---

    Args:
        chunks: List of LangChain Document objects.

    Returns:
        A single formatted string.
    """
    if not chunks:
        return ""

    parts: List[str] = []
    for doc in chunks:
        source = doc.metadata.get("source", "Unknown Source")
        page   = doc.metadata.get("page", "?")
        text   = doc.page_content.strip()

        parts.append(
            f"From {source} (Page {page}):\n{text}\n---"
        )

    return "\n\n".join(parts)


def get_context_for_tab(
    tab_number: int,
    chart_data: Optional[Dict[str, Any]] = None,
) -> str:
    """
    High-level entry point: builds a chart-aware search context,
    retrieves relevant chunks, and returns a prompt-ready string.

    Chart personalisation:
      Extracts lagna sign, key planets (Sun, Moon, Saturn, Jupiter, etc.)
      from chart_data and prepends them to each search query so results
      are grounded in this specific chart.

    Args:
        tab_number: Report tab (1-8).
        chart_data: Dict from the chart calculation service, e.g.:
            {
                "lagna": "Aries",
                "planets": {
                    "Sun":     {"sign": "Leo",   "house": 5},
                    "Moon":    {"sign": "Taurus", "house": 2},
                    "Saturn":  {"sign": "Aquarius","house": 11},
                    ...
                },
                "mahadasha": "Saturn",
            }

    Returns:
        Formatted RAG context string ready to inject into a prompt.
        Returns empty string if no relevant chunks found.
    """
    chart_context = _build_chart_context(tab_number, chart_data or {})
    chunks = search_for_tab(tab_number, chart_context=chart_context)
    return format_rag_context(chunks)


# ---------------------------------------------------------------------------
# Chart context builder (internal)
# ---------------------------------------------------------------------------

# Which planets are most relevant for each tab
_TAB_KEY_PLANETS: Dict[int, List[str]] = {
    1: ["Sun", "Moon", "Lagna Lord", "Atmakaraka"],
    2: ["Sun", "Moon", "Mars", "Saturn", "Rahu", "Ketu"],
    3: ["Sun", "Moon"],
    4: ["Saturn", "Sun", "Jupiter", "Mercury", "Mars"],
    5: ["Jupiter", "Venus", "Mercury", "Moon"],
    6: ["Venus", "Jupiter", "Moon", "Mars"],
    7: ["Moon", "Mercury", "Saturn", "Mars", "Sun"],
    8: ["Saturn", "Rahu", "Ketu", "Mars"],
}


def _build_chart_context(
    tab_number: int,
    chart_data: Dict[str, Any],
) -> str:
    """
    Extract a compact keyword string from chart_data to personalise queries.

    Example output:
        "Aries lagna Saturn mahadasha Saturn Aquarius Moon Taurus"
    """
    terms: List[str] = []

    # Lagna sign
    lagna = chart_data.get("lagna", "")
    if lagna:
        terms.append(f"{lagna} lagna")

    # Active mahadasha
    maha = chart_data.get("mahadasha", "")
    if maha:
        terms.append(f"{maha} mahadasha")

    # Key planetary positions relevant to this tab
    planets: Dict[str, Any] = chart_data.get("planets", {})
    relevant = _TAB_KEY_PLANETS.get(tab_number, [])

    for planet_name in relevant:
        info = planets.get(planet_name, {})
        if isinstance(info, dict):
            sign  = info.get("sign", "")
            house = info.get("house", "")
            if sign:
                terms.append(f"{planet_name} {sign}")
            if house:
                terms.append(f"{planet_name} {house} house")

    return " ".join(terms)
