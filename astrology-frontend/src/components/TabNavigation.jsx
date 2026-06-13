import React from 'react';

const TABS = [
  { id: 1,  label: 'Lagna & Soul Blueprint',        icon: 'wb_sunny'      },
  { id: 2,  label: 'Lal Kitab Analysis',            icon: 'diamond'       },
  { id: 3,  label: 'Numerology Matrix',             icon: 'all_inclusive' },
  { id: 4,  label: 'Career & Dashamsha D10',        icon: 'work'          },
  { id: 'education', label: 'Education',            icon: 'school', isVirtual: true },
  { id: 5,  label: 'Wealth & Abundance D4',         icon: 'payments'      },
  { id: 6,  label: 'Love Marriage & Navamsha D9',   icon: 'favorite'      },
  { id: 7,  label: 'Health & Vitality D30',         icon: 'healing'       },
  { id: 8,  label: 'Remedies Tripath System',       icon: 'auto_awesome'  },
  { id: 9,  label: 'Progeny Lineage & Saptamsha D7',icon: 'child_care'    },
  { id: 10, label: 'Gochar Current Transits',       icon: 'track_changes' },
  { id: 'vedic_report', label: 'Vedic Report', icon: 'menu_book', isVirtual: true }
];

const CHART_DESCRIPTION_SUBTABS = [
  TABS.find(t => t.id === 1),
  TABS.find(t => t.id === 4),
  TABS.find(t => t.id === 'education'),
  TABS.find(t => t.id === 5),
  TABS.find(t => t.id === 6),
  TABS.find(t => t.id === 7),
  TABS.find(t => t.id === 9),
  TABS.find(t => t.id === 10)
];

const REPORT_ANALYSIS_SUBTABS = [
  TABS.find(t => t.id === 2),
  TABS.find(t => t.id === 3),
  TABS.find(t => t.id === 8),
  TABS.find(t => t.id === 'vedic_report')
];

function parseInlineMarkdown(str) {
  if (!str) return '';
  // Match bold (**text**) and italics (*text*)
  const tokens = str.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  return tokens.map((token, i) => {
    if (token.startsWith('**') && token.endsWith('**')) {
      const content = token.slice(2, -2);
      return <strong key={i} className="prose-bold">{content}</strong>;
    }
    if (token.startsWith('*') && token.endsWith('*')) {
      const content = token.slice(1, -1);
      return <em key={i} className="prose-italic italic">{content}</em>;
    }
    return token;
  });
}

function formatInterpretationText(text) {
  if (!text) return null;

  const normalizedText = text.replace(/<br\s*\/?>/gi, '\n');
  const lines = normalizedText.split('\n');
  const elements = [];
  
  let i = 0;
  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // 1. Detect if it's a table row (starts with |)
    if (trimmed.startsWith('|')) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length > 0) {
        // Parse the table rows
        const rows = tableLines.map(line => {
          const cells = line.split('|').map(c => c.trim());
          if (cells[0] === '') cells.shift();
          if (cells[cells.length - 1] === '') cells.pop();
          return cells;
        });

        // Filter out the separator row (starts with dashes like |---|)
        const hasSeparator = rows[1] && rows[1].every(cell => /^[-:\s]+$/.test(cell));
        const headerRow = rows[0];
        const dataRows = hasSeparator ? rows.slice(2) : rows.slice(1);

        elements.push(
          <div key={`table-${i}`} className="prose-table-wrapper">
            <table className="prose-table">
              <thead>
                <tr>
                  {headerRow.map((cell, idx) => (
                    <th key={idx}>{parseInlineMarkdown(cell)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataRows.map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    {row.map((cell, cellIdx) => (
                      <td key={cellIdx}>{parseInlineMarkdown(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // 2. Otherwise parse as standard line types
    i++;
    if (!trimmed) continue;

    // Horizontal rules
    if (/^[-*─━]{3,}$/.test(trimmed)) {
      elements.push(<hr key={i} className="prose-divider" />);
      continue;
    }

    // Markdown headers ## / ### / ####
    const mdHeaderMatch = trimmed.match(/^(#{2,4})\s+(.+)$/);
    if (mdHeaderMatch) {
      elements.push(
        <span key={i} className="prose-section-header">
          {parseInlineMarkdown(mdHeaderMatch[2])}
        </span>
      );
      continue;
    }

    // Section-letter headers: "A) TITLE"
    const sectionLetterMatch = trimmed.match(/^([A-Z])\)\s+(.+)$/);
    if (sectionLetterMatch) {
      elements.push(
        <span key={i} className="prose-section-header">
          {sectionLetterMatch[1]}) {parseInlineMarkdown(sectionLetterMatch[2])}
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
          {parseInlineMarkdown(quoteText)}
        </blockquote>
      );
      continue;
    }

    // Sub-bullet: indented with bullet
    const subBulletMatch = rawLine.match(/^\s{2,}[-•*▸►]\s+(.+)$/);
    if (subBulletMatch) {
      elements.push(
        <div key={i} className="prose-sub-bullet">
          <span>{parseInlineMarkdown(subBulletMatch[1])}</span>
        </div>
      );
      continue;
    }

    // Top-level bullet
    const bulletMatch = trimmed.match(/^[-•*▸►✦◆]\s+(.+)$/);
    if (bulletMatch) {
      elements.push(
        <div key={i} className="prose-bullet-item">
          <span>{parseInlineMarkdown(bulletMatch[1])}</span>
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
          <span>{parseInlineMarkdown(numberedMatch[2])}</span>
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
          {parseInlineMarkdown(keyValueMatch[2])}
        </p>
      );
      continue;
    }

    // Standard paragraph
    elements.push(
      <p key={i} className="prose-para">
        {parseInlineMarkdown(rawLine)}
      </p>
    );
  }

  return elements;
}

export default function TabNavigation({
  chartId, activeTab, onTabChange,
  interpretations, tabLoadingState = {}
}) {
  const [activeCategory, setActiveCategory] = React.useState(() => {
    if ([1, 4, 5, 6, 7, 9, 10, 'education'].includes(activeTab)) {
      return 'chart_description';
    }
    if ([2, 3, 8, 'vedic_report'].includes(activeTab)) {
      return 'report_analysis';
    }
    return 'chart_description';
  });

  React.useEffect(() => {
    if ([1, 4, 5, 6, 7, 9, 10, 'education'].includes(activeTab)) {
      setActiveCategory('chart_description');
    } else if ([2, 3, 8, 'vedic_report'].includes(activeTab)) {
      setActiveCategory('report_analysis');
    } else if (activeTab === 'basics') {
      setActiveCategory('basics');
    }
  }, [activeTab]);

  const handleCategorySelect = (category) => {
    setActiveCategory(category);
    if (category === 'basics') {
      onTabChange('basics');
    } else if (category === 'chart_description') {
      onTabChange(1); // Default to Lagna & Soul Blueprint
    } else if (category === 'report_analysis') {
      onTabChange(2); // Default to Lal Kitab Analysis
    }
  };

  const handleDownloadReport = () => {
    window.print();
  };

  const currentTab = [
    ...CHART_DESCRIPTION_SUBTABS,
    ...REPORT_ANALYSIS_SUBTABS,
    { id: 'basics', label: 'Basics', icon: 'grid_view' }
  ].find((t) => t.id === activeTab) || CHART_DESCRIPTION_SUBTABS[0];

  return (
    <div className="w-full flex flex-col gap-4">

      {/* ── Primary Category Toggles (Segmented Control) ── */}
      <div className="flex border border-outline-variant/35 rounded-xl p-1 bg-surface-container-low mb-2 no-print">
        {[
          { id: 'basics', label: 'Basics', icon: 'grid_view' },
          { id: 'chart_description', label: 'Chart Description', icon: 'bar_chart' },
          { id: 'report_analysis', label: 'Report & Analysis', icon: 'insights' }
        ].map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => handleCategorySelect(cat.id)}
              className={`flex-1 py-3 px-2 sm:px-4 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer border-none ${
                isActive
                  ? 'bg-primary text-on-primary shadow-sm font-semibold'
                  : 'text-outline hover:text-on-surface hover:bg-outline-variant/10 bg-transparent'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Secondary Sub-Tabs Nav ── */}
      {activeCategory !== 'basics' && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/15 pb-3 mb-2 no-print">
          <nav className="tab-scroll-nav flex-1" role="tablist">
            {(activeCategory === 'chart_description' ? CHART_DESCRIPTION_SUBTABS : REPORT_ANALYSIS_SUBTABS).map((tab) => {
              const isActive  = activeTab === tab.id;
              const isLoading = !tab.isVirtual && !!tabLoadingState[tab.id];
              const isLoaded  = !tab.isVirtual && !!interpretations[tab.id];

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
          
          {activeCategory === 'report_analysis' && (
            <button
              onClick={handleDownloadReport}
              className="px-4 py-2 bg-primary/10 hover:bg-primary text-primary hover:text-on-primary border border-primary/20 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer self-start md:self-auto shrink-0"
              title="Download print-friendly report of all cosmic tabs"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              Download Report
            </button>
          )}
        </div>
      )}

      {/* ── Content Card (Dashboard Panel View) ── */}
      <div
        key={activeTab}
        className="dashboard-tab-content relative tab-panel-enter no-print"
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
          {activeTab === 'basics' ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
              <span className="material-symbols-outlined text-outline/40 text-[48px]">
                info
              </span>
              <p className="text-sm text-outline/70 italic font-medium">
                Basics section is empty for now.
              </p>
            </div>
          ) : activeTab === 'education' ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
              <span className="material-symbols-outlined text-outline/40 text-[48px]">
                school
              </span>
              <p className="text-sm text-outline/70 italic font-medium">
                Education report is blank for now.
              </p>
            </div>
          ) : activeTab === 'vedic_report' ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
              <span className="material-symbols-outlined text-outline/40 text-[48px]">
                menu_book
              </span>
              <p className="text-sm text-outline/70 italic font-medium">
                Vedic report is blank for now.
              </p>
            </div>
          ) : interpretations[activeTab] ? (
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

      {/* ── Print-only Container ── */}
      <div className="hidden print:block space-y-8 p-4">
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-2xl font-headline-md text-primary uppercase tracking-wider">Trikal Darshi</h1>
          <h2 className="text-sm font-semibold text-outline uppercase tracking-widest">Cosmic Blueprint Analysis</h2>
          <div className="h-px bg-outline-variant/35 my-4" />
        </div>

        {[
          { id: 1, label: 'Lagna & Soul Blueprint' },
          { id: 4, label: 'Career & Dashamsha D10' },
          { id: 5, label: 'Wealth & Abundance D4' },
          { id: 6, label: 'Love Marriage & Navamsha D9' },
          { id: 7, label: 'Health & Vitality D30' },
          { id: 9, label: 'Progeny Lineage & Saptamsha D7' },
          { id: 10, label: 'Gochar Current Transits' },
          { id: 2, label: 'Lal Kitab Analysis' },
          { id: 3, label: 'Numerology Matrix' },
          { id: 8, label: 'Remedies Tripath System' }
        ].map((tab) => {
          const content = interpretations[tab.id];
          if (!content) return null;
          return (
            <div key={tab.id} className="space-y-4 py-4 border-b border-outline-variant/15 page-break-inside-avoid">
              <h3 className="text-sm font-headline-md text-primary uppercase tracking-widest border-b border-outline-variant/25 pb-1">
                {tab.label}
              </h3>
              <div className="prose-interpretation text-xs leading-relaxed">
                {formatInterpretationText(content)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
