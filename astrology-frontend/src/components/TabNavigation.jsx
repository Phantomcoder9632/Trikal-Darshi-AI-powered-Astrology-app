import React from 'react';

const TABS = [
  { id: 1, label: 'Lagna & Soul', icon: 'wb_sunny' },
  { id: 2, label: 'Lal Kitab', icon: 'diamond' },
  { id: 3, label: 'Numerology', icon: 'all_inclusive' },
  { id: 4, label: 'Career & D10', icon: 'work' },
  { id: 5, label: 'Wealth', icon: 'payments' },
  { id: 6, label: 'Love & D9', icon: 'favorite' },
  { id: 7, label: 'Health', icon: 'healing' },
  { id: 8, label: 'Remedies', icon: 'auto_awesome' }
];

/**
 * Parse **bold** markdown to JSX <strong> tags.
 */
function parseInlineBold(str) {
  if (!str) return '';
  const parts = str.split('**');
  if (parts.length <= 1) return str;
  return parts.map((part, i) => {
    if (i % 2 !== 0) {
      return <strong key={i} className="prose-bold">{part}</strong>;
    }
    return part;
  });
}

/**
 * Comprehensive formatter for AI-streamed interpretation text.
 * Handles:
 *  - Markdown ## and ### headers
 *  - Section-style headers: "A) TITLE", "B) TITLE", or "SECTION HEADER:"
 *  - Bullet lines: starts with -, •, *, ▸, ►, ✦, ◆
 *  - Sub-bullet lines: starts with 2+ spaces then -, •, *
 *  - Numbered lists: "1.", "2.", etc.
 *  - Blockquotes: lines wrapped in "" or "" or starting with >
 *  - Horizontal rules: --- or ***
 *  - Standard paragraphs
 */
function formatInterpretationText(text) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Skip empty lines
    if (!trimmed) continue;

    // 1. Horizontal rules: ---, ***, ───
    if (/^[-*─━]{3,}$/.test(trimmed)) {
      elements.push(<hr key={i} className="prose-divider" />);
      continue;
    }

    // 2. Markdown headers: ## Header or ### Header
    const mdHeaderMatch = trimmed.match(/^(#{2,4})\s+(.+)$/);
    if (mdHeaderMatch) {
      elements.push(
        <span key={i} className="prose-section-header">
          {parseInlineBold(mdHeaderMatch[2])}
        </span>
      );
      continue;
    }

    // 3. Section-letter headers: "A) TITLE", "B) SOME TEXT", etc.
    const sectionLetterMatch = trimmed.match(/^([A-Z])\)\s+(.+)$/);
    if (sectionLetterMatch) {
      elements.push(
        <span key={i} className="prose-section-header">
          {sectionLetterMatch[1]}) {parseInlineBold(sectionLetterMatch[2])}
        </span>
      );
      continue;
    }

    // 4. ALL-CAPS HEADER followed by colon (e.g., "PLANETARY DIGNITY REPORT:")
    const allCapsHeaderMatch = trimmed.match(/^([A-Z][A-Z0-9\s&()\-–—]+):\s*$/);
    if (allCapsHeaderMatch) {
      elements.push(
        <span key={i} className="prose-section-header">
          {allCapsHeaderMatch[1]}
        </span>
      );
      continue;
    }

    // 5. Blockquotes: lines in curly/smart quotes, or starting with >
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith('\u201c') && trimmed.endsWith('\u201d')) ||
      trimmed.startsWith('>')
    ) {
      const quoteText = trimmed.startsWith('>') ? trimmed.slice(1).trim() : trimmed;
      elements.push(
        <blockquote key={i} className="prose-blockquote">
          {parseInlineBold(quoteText)}
        </blockquote>
      );
      continue;
    }

    // 6. Sub-bullet: line starts with whitespace + bullet marker
    const subBulletMatch = rawLine.match(/^\s{2,}[-•*▸►]\s+(.+)$/);
    if (subBulletMatch) {
      elements.push(
        <div key={i} className="prose-sub-bullet">
          {parseInlineBold(subBulletMatch[1])}
        </div>
      );
      continue;
    }

    // 7. Top-level bullet: starts with -, •, *, ▸, ►, ✦, ◆
    const bulletMatch = trimmed.match(/^[-•*▸►✦◆]\s+(.+)$/);
    if (bulletMatch) {
      elements.push(
        <div key={i} className="prose-bullet-item">
          {parseInlineBold(bulletMatch[1])}
        </div>
      );
      continue;
    }

    // 8. Numbered list: "1.", "2.", "10.", etc.
    const numberedMatch = trimmed.match(/^(\d{1,3})[.)]\s+(.+)$/);
    if (numberedMatch) {
      elements.push(
        <div key={i} className="prose-numbered-item">
          <span className="prose-num">{numberedMatch[1]}.</span>
          {parseInlineBold(numberedMatch[2])}
        </div>
      );
      continue;
    }

    // 9. KEY: Value lines (e.g., "SIGN + HOUSE POSITION: Aries in H1")
    const keyValueMatch = trimmed.match(/^([A-Z][A-Z0-9\s&()\-–—/,]+):\s*(.+)$/);
    if (keyValueMatch && keyValueMatch[1].length <= 50) {
      elements.push(
        <p key={i} className="prose-para">
          <span className="prose-key">{keyValueMatch[1]}:</span>
          {parseInlineBold(keyValueMatch[2])}
        </p>
      );
      continue;
    }

    // 10. Standard paragraph (fallback)
    elements.push(
      <p key={i} className="prose-para">
        {parseInlineBold(rawLine)}
      </p>
    );
  }

  return elements;
}


export default function TabNavigation({ chartId, activeTab, onTabChange, interpretations, tabLoadingState = {} }) {
  const currentTab = TABS.find(t => t.id === activeTab) || TABS[0];

  return (
    <div className="w-full flex flex-col gap-4">
      {/* 1. Pill Navigation Tabs */}
      <nav className="flex overflow-x-auto no-scrollbar gap-2 py-3 w-full border-b border-outline-variant/20">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const isLoaded = !!interpretations[tab.id];
          const isLoading = !!tabLoadingState[tab.id];

          let btnClass = "whitespace-nowrap flex items-center gap-2 border rounded-full px-5 py-2 transition-all duration-200 cursor-pointer text-xs font-semibold uppercase tracking-wider ";
          let iconStyle = "text-[16px] ";

          if (isActive) {
            btnClass += "bg-primary text-on-primary border-primary shadow-md scale-105 font-bold";
            iconStyle += "text-on-primary";
          } else if (isLoading) {
            btnClass += "bg-primary-container/15 text-primary border-primary animate-pulse";
            iconStyle += "text-primary";
          } else if (isLoaded) {
            btnClass += "bg-surface-container text-on-surface border-outline-variant/50 hover:bg-surface-container-high";
            iconStyle += "text-primary";
          } else {
            btnClass += "bg-surface text-on-surface-variant hover:bg-primary/10 border-outline-variant/30";
            iconStyle += "text-outline";
          }

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={btnClass}
            >
              <span className={`material-symbols-outlined ${iconStyle}`}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* 2. Content Card */}
      <div className="dashboard-tab-content relative min-h-[300px] flex flex-col justify-between">
        <div>
          {/* Card Header */}
          <div className="mb-6">
            <h4 className="font-headline-md text-base md:text-lg font-bold text-primary uppercase tracking-widest flex items-center gap-3">
              <span className="w-6 h-[1px] bg-primary/30"></span>
              {currentTab.label} Deep-Dive
              <span className="w-6 h-[1px] bg-primary/30"></span>
            </h4>
            <div className="w-16 h-0.5 bg-primary-container mt-2"></div>
          </div>

          {/* Interpretation content */}
          <div className="prose-interpretation">
            {interpretations[activeTab] ? (
              <div className="transition-all duration-300">
                {formatInterpretationText(interpretations[activeTab])}
                {tabLoadingState[activeTab] && (
                  <span className="ml-1 text-primary animate-pulse inline-block font-bold">▉</span>
                )}
              </div>
            ) : (
              tabLoadingState[activeTab] && (
                <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                  <div className="relative w-12 h-12 flex items-center justify-center text-primary-container">
                    <span className="material-symbols-outlined text-[36px] animate-spin">
                      hourglass_empty
                    </span>
                  </div>
                  <p className="font-label-sm text-xs font-semibold text-primary uppercase tracking-widest animate-pulse">
                    Channeling cosmic blueprints...
                  </p>
                </div>
              )
            )}
          </div>
        </div>

        {/* Bottom divider */}
        {interpretations[activeTab] && (
          <div className="flex items-center gap-4 mt-8 opacity-25">
            <div className="h-[1px] bg-outline flex-1"></div>
            <div className="w-1.5 h-1.5 rotate-45 bg-primary"></div>
            <div className="h-[1px] bg-outline flex-1"></div>
          </div>
        )}
      </div>
    </div>
  );
}
