import React from 'react';

const TABS = [
  { id: 1,  label: 'Lagna & Soul',  icon: 'wb_sunny'      },
  { id: 2,  label: 'Lal Kitab',     icon: 'diamond'       },
  { id: 3,  label: 'Numerology',    icon: 'all_inclusive' },
  { id: 4,  label: 'Career & D10',  icon: 'work'          },
  { id: 5,  label: 'Wealth & D4',   icon: 'payments'      },
  { id: 6,  label: 'Love & D9',     icon: 'favorite'      },
  { id: 7,  label: 'Health & D30',  icon: 'healing'       },
  { id: 8,  label: 'Remedies',      icon: 'auto_awesome'  },
  { id: 9,  label: 'Progeny & D7',  icon: 'child_care'    },
  { id: 10, label: 'Gochar',        icon: 'track_changes' },
];

function parseInlineBold(str) {
  if (!str) return '';
  const parts = str.split('**');
  if (parts.length <= 1) return str;
  return parts.map((part, i) =>
    i % 2 !== 0
      ? <strong key={i} className="prose-bold">{part}</strong>
      : part
  );
}

function formatInterpretationText(text) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) continue;

    // Horizontal rules
    if (/^[-*─━]{3,}$/.test(trimmed)) {
      elements.push(<hr key={i} className="prose-divider" />);
      continue;
    }

    // Markdown headers ## / ###
    const mdHeaderMatch = trimmed.match(/^(#{2,4})\s+(.+)$/);
    if (mdHeaderMatch) {
      elements.push(
        <span key={i} className="prose-section-header">
          {parseInlineBold(mdHeaderMatch[2])}
        </span>
      );
      continue;
    }

    // Section-letter headers: "A) TITLE"
    const sectionLetterMatch = trimmed.match(/^([A-Z])\)\s+(.+)$/);
    if (sectionLetterMatch) {
      elements.push(
        <span key={i} className="prose-section-header">
          {sectionLetterMatch[1]}) {parseInlineBold(sectionLetterMatch[2])}
        </span>
      );
      continue;
    }

    // ALL-CAPS header ending with colon
    const allCapsHeaderMatch = trimmed.match(/^([A-Z][A-Z0-9\s&()\-–—]+):\s*$/);
    if (allCapsHeaderMatch) {
      elements.push(
        <span key={i} className="prose-section-header">
          {allCapsHeaderMatch[1]}
        </span>
      );
      continue;
    }

    // Blockquotes: curly/smart quotes or > prefix
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

    // Sub-bullet: indented with bullet
    const subBulletMatch = rawLine.match(/^\s{2,}[-•*▸►]\s+(.+)$/);
    if (subBulletMatch) {
      elements.push(
        <div key={i} className="prose-sub-bullet">
          {parseInlineBold(subBulletMatch[1])}
        </div>
      );
      continue;
    }

    // Top-level bullet
    const bulletMatch = trimmed.match(/^[-•*▸►✦◆]\s+(.+)$/);
    if (bulletMatch) {
      elements.push(
        <div key={i} className="prose-bullet-item">
          {parseInlineBold(bulletMatch[1])}
        </div>
      );
      continue;
    }

    // Numbered list
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

    // KEY: Value lines
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

    // Standard paragraph
    elements.push(
      <p key={i} className="prose-para">
        {parseInlineBold(rawLine)}
      </p>
    );
  }

  return elements;
}

export default function TabNavigation({
  chartId, activeTab, onTabChange,
  interpretations, tabLoadingState = {}
}) {
  const currentTab = TABS.find((t) => t.id === activeTab) || TABS[0];

  return (
    <div className="w-full flex flex-col gap-4">

      {/* ── Scrollable Tab Bar ──────────────────────────────── */}
      <nav className="tab-scroll-nav" role="tablist" aria-label="Astrology sections">
        {TABS.map((tab) => {
          const isActive  = activeTab === tab.id;
          const isLoading = !!tabLoadingState[tab.id];
          const isLoaded  = !!interpretations[tab.id];

          let cls = 'tab-btn ';
          if (isActive)       cls += 'tab-btn-active';
          else if (isLoading) cls += 'tab-btn-loading';
          else if (isLoaded)  cls += 'tab-btn-loaded';
          else                cls += 'tab-btn-idle';

          return (
            <button
              key={tab.id}
              role="tab"
              id={`tab-btn-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`tab-panel-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              className={cls}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: '15px',
                  fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                }}
              >
                {tab.icon}
              </span>
              <span>{tab.label}</span>
              {isLoading && (
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping opacity-70 ml-0.5" />
              )}
              {isLoaded && !isActive && !isLoading && (
                <span
                  className="material-symbols-outlined text-primary"
                  style={{ fontSize: '12px', fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Content Card ────────────────────────────────────── */}
      <div
        key={activeTab}
        className="dashboard-tab-content relative tab-panel-enter"
        role="tabpanel"
        id={`tab-panel-${activeTab}`}
        aria-labelledby={`tab-btn-${activeTab}`}
      >
        {/* Card header */}
        <div className="mb-6 flex items-center gap-3 border-b border-outline-variant/20 pb-4">
          <span
            className="material-symbols-outlined text-primary-container text-[22px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {currentTab.icon}
          </span>
          <h4 className="font-headline-md text-primary text-sm md:text-base font-bold uppercase tracking-widest flex-1">
            {currentTab.label}
          </h4>
          {tabLoadingState[activeTab] && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary/60 animate-pulse">
              Streaming…
            </span>
          )}
          {interpretations[activeTab] && !tabLoadingState[activeTab] && (
            <span
              className="material-symbols-outlined text-[14px] text-primary/40"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
          )}
        </div>

        {/* Content */}
        <div className="prose-interpretation min-h-[200px]">
          {interpretations[activeTab] ? (
            <div>
              {formatInterpretationText(interpretations[activeTab])}
              {tabLoadingState[activeTab] && (
                <span className="ml-1 text-primary animate-pulse inline-block font-bold">▉</span>
              )}
            </div>
          ) : tabLoadingState[activeTab] ? (
            <div className="flex flex-col items-center justify-center py-20 gap-5">
              <span className="material-symbols-outlined text-primary-container text-[40px] animate-spin">
                hourglass_empty
              </span>
              <p className="font-label-sm text-xs font-bold text-primary uppercase tracking-widest animate-pulse">
                Channeling cosmic blueprints…
              </p>
            </div>
          ) : null}
        </div>

        {/* Bottom ornament */}
        {interpretations[activeTab] && !tabLoadingState[activeTab] && (
          <div className="flex items-center gap-3 mt-8 opacity-20">
            <div className="h-px bg-outline flex-1" />
            <div className="w-1.5 h-1.5 rotate-45 bg-primary" />
            <div className="h-px bg-outline flex-1" />
          </div>
        )}
      </div>
    </div>
  );
}
