import React, { useState, useEffect, useRef, useCallback } from 'react';

/**
 * ReadingExtras — reading-UX enhancements for the dashboard exegesis panel.
 *
 * All scroll math is viewport-rect based (getBoundingClientRect + window
 * scroll events in capture phase) so it works no matter which element is the
 * app's real scroll container (html/body/#root ambiguity in this app).
 */

// ── ReadingProgressBar ──────────────────────────────────────────────────────
// 2px gold hairline pinned under the sticky tab nav. Article-scoped: progress
// measures how far the chapter card has travelled through the viewport, not
// the whole page (footer/sidebar never inflate it to 100% early).
export function ReadingProgressBar({ targetRef, activeTab }) {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef(0);

  const measure = useCallback(() => {
    const el = targetRef?.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const navH = 120; // sticky header (64) + tab bar (~56) offset
    const vh = window.innerHeight || 1;
    const total = rect.height - (vh - navH);
    if (total <= 0) {
      setProgress(rect.top < navH ? 1 : 0);
      return;
    }
    const scrolled = Math.min(Math.max(-(rect.top) + navH, 0), total);
    setProgress(scrolled / total);
  }, [targetRef]);

  useEffect(() => {
    let cancelled = false;
    const onScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        if (!cancelled) measure();
      });
    };
    // Capture phase: catches scroll events from ANY scrolling ancestor
    // (window, #root, body) — robust to this app's container ambiguity.
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    // Initial + settle after layout/fonts/images shift the height
    measure();
    const t1 = setTimeout(measure, 300);
    const t2 = setTimeout(measure, 1200);
    return () => {
      cancelled = true;
      document.removeEventListener('scroll', onScroll, { capture: true });
      window.removeEventListener('resize', onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [measure, activeTab]);

  return (
    <div
      className="absolute left-0 right-0 bottom-0 h-[2px] pointer-events-none z-10"
      aria-hidden="true"
    >
      <div
        className="h-full bg-[#D9A63C] origin-left"
        style={{
          transform: `scaleX(${progress})`,
          transition: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
            ? 'none'
            : 'transform 120ms linear',
        }}
      />
    </div>
  );
}

// ── ChapterTOC ──────────────────────────────────────────────────────────────
// Within-chapter scrollspy: lists the rendered .prose-section-header blocks,
// highlights the one currently in view (IntersectionObserver), and
// smooth-scrolls to a section on click. Desktop rail only (hidden < 1024px).
export function ChapterTOC({ contentRef, activeTab, streaming }) {
  const [headings, setHeadings] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const observerRef = useRef(null);

  // Collect headings from the rendered chapter whenever its content/tab changes
  useEffect(() => {
    const root = contentRef?.current;
    if (!root) return;
    const collect = () => {
      const els = Array.from(root.querySelectorAll('.prose-section-header'));
      const items = els.map((el, i) => {
        if (!el.id) el.id = `toc-sec-${activeTab}-${i}`;
        return { id: el.id, text: el.textContent.trim() };
      });
      setHeadings(items);
    };
    collect();
    // Headings stream in progressively — re-collect while streaming
    const iv = streaming ? setInterval(collect, 800) : null;
    return () => { if (iv) clearInterval(iv); };
  }, [contentRef, activeTab, streaming]);

  // Watch which heading is in view
  useEffect(() => {
    observerRef.current?.disconnect();
    if (!headings.length) { setActiveId(null); return; }
    const obs = new IntersectionObserver(
      (entries) => {
        // Pick the topmost entry currently intersecting the upper viewport band
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-110px 0px -55% 0px', threshold: 0 }
    );
    headings.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) obs.observe(el);
    });
    observerRef.current = obs;
    return () => obs.disconnect();
  }, [headings]);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (headings.length < 3) return null; // spec: only when ≥3 sections

  return (
    <nav
      aria-label="Section navigation"
      className="hidden xl:block sticky self-start shrink-0 w-[210px] max-h-[calc(100vh-190px)] overflow-y-auto no-scrollbar pt-1"
      style={{ top: 130 }}
    >
      <div className="text-[10px] font-extrabold uppercase tracking-widest text-[#7b5800] mb-2 pl-3">
        In this chapter
      </div>
      <ul className="space-y-0.5 border-l border-[#E8D5A7]/70">
        {headings.map((h) => (
          <li key={h.id}>
            <button
              type="button"
              onClick={() => scrollTo(h.id)}
              className={`block w-full text-left pl-3 pr-2 py-1.5 text-[11.5px] leading-snug border-l-2 -ml-px transition-colors cursor-pointer bg-transparent border-none ${
                activeId === h.id
                  ? 'border-[#D9A63C] text-[#022454] font-bold'
                  : 'border-transparent text-[#4A567A] hover:text-[#022454] hover:border-[#E8D5A7]'
              }`}
              title={h.text}
            >
              <span className="block truncate">{h.text}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// ── JumpToLatest ────────────────────────────────────────────────────────────
// While a chapter streams, auto-scroll keeps the newest content in view.
// The moment the user scrolls up to re-read, auto-scroll stops and this
// "Jump to latest ↓" pill appears instead of fighting their scroll input.
export function JumpToLatest({ contentRef, streaming }) {
  const [showPill, setShowPill] = useState(false);
  const pinnedRef = useRef(true);
  const rafRef = useRef(0);

  // Track whether the user has scrolled away from the bottom
  useEffect(() => {
    if (!streaming) { pinnedRef.current = true; setShowPill(false); return; }
    const check = () => {
      const root = contentRef?.current;
      if (!root) return;
      const rect = root.getBoundingClientRect();
      const nearBottom = rect.bottom <= (window.innerHeight || 0) + 140;
      pinnedRef.current = nearBottom;
      setShowPill(!nearBottom);
    };
    const onScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        check();
      });
    };
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener('scroll', onScroll, { capture: true });
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [streaming, contentRef]);

  // Auto-scroll while pinned and streaming
  useEffect(() => {
    if (!streaming || !pinnedRef.current) return;
    const root = contentRef?.current;
    if (!root) return;
    root.scrollIntoView({ behavior: 'auto', block: 'end' });
  });

  if (!streaming || !showPill) return null;

  return (
    <button
      type="button"
      onClick={() => {
        pinnedRef.current = true;
        contentRef?.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1F3A6B] hover:bg-[#022454] text-[#FFFDF6] text-[11px] font-bold uppercase tracking-wider shadow-xl border border-[#D9A63C]/50 cursor-pointer transition-all animate-fade-in"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-[#D9A63C] animate-ping" />
      Jump to latest
      <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
    </button>
  );
}
