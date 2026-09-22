import React from 'react';
import RemedyCards from './RemedyCards';
import { formatInterpretationText } from './formatters';
import DivisionalChart from './DivisionalChart';
import { ShimmerSkeleton } from './StatusBanners';
import { useTranslation } from 'react-i18next';

const TABS = [
  { id: 1,  number: '1', label: '1. Lagna Blueprint',       chapter: 'Chapter I • Soul Horizon', folio: '#01', icon: 'wb_sunny', subtitle: 'Parashari fundamental soul architecture' },
  { id: 2,  number: '2', label: '2. Lal Kitab',             chapter: 'Chapter II • Karmic Debts', folio: '#14', icon: 'diamond', subtitle: 'Ancestral Rina and instant planetary remedies' },
  { id: 3,  number: '3', label: '3. Numerology',            chapter: 'Chapter III • Anka Shastra', folio: '#22', icon: 'all_inclusive', subtitle: 'Vibrational destiny number alignments' },
  { id: 4,  number: '4', label: '4. Career & D10',          chapter: 'Chapter IV • Rigorous Exegesis', folio: '#42', icon: 'work', subtitle: 'Vedic vocation doctrine parsed via Parashara Horashastra' },
  { id: 11, number: '11', label: '11. Education & Intellect', chapter: 'Chapter XI • Vidya & Buddhi', folio: '#95', icon: 'school', subtitle: 'Academic trajectory and cognitive inclinations' },
  { id: 5,  number: '5', label: '5. Wealth D4',             chapter: 'Chapter V • Chaturthamsa Dhana', folio: '#51', icon: 'payments', subtitle: 'Fixed assets, real estate, and treasury yogas' },
  { id: 6,  number: '6', label: '6. Marriage D9',           chapter: 'Chapter VI • Navamsha Kalatra', folio: '#63', icon: 'favorite', subtitle: 'Spouse archetype and dharmic union matrix' },
  { id: 7,  number: '7', label: '7. Health D30',            chapter: 'Chapter VII • Trimsamsa Rog', folio: '#74', icon: 'healing', subtitle: 'Vitality reserves and subtle doshic vulnerabilities' },
  { id: 8,  number: '8', label: '8. Remedies',              chapter: 'Chapter VIII • Upaya Vidhana', folio: '#80', icon: 'auto_awesome', subtitle: 'Tripath System Remedial Harmonization' },
  { id: 9,  number: '9', label: '9. Progeny D7',            chapter: 'Chapter IX • Saptamsha Lineage', folio: '#88', icon: 'child_care', subtitle: 'Lineage continuity and creative fruits' },
  { id: 10, number: '10', label: '10. Gochar Transit',      chapter: 'Chapter X • Kala Gochara', folio: '#92', icon: 'track_changes', subtitle: 'Live transit overlays across natal houses' },
  { id: 'vedic_report', number: '✦', label: 'Full Vedic Report', chapter: 'Comprehensive Soul Folio', folio: '#ALL', icon: 'menu_book', subtitle: 'Complete 11-chapter compiled synthesis' }
];

export default function TabNavigation({
  chartId,
  activeTab,
  onTabChange,
  interpretations,
  tabLoadingState = {},
  chartData,
  onGenerateMissingTabs
}) {
  const { t } = useTranslation();

  const currentTabMeta = TABS.find((tab) => tab.id === activeTab) || TABS[0];
  const chapterText = interpretations[activeTab];
  const isReportTab = activeTab === 'vedic_report';
  const reportSections = isReportTab
    ? TABS.filter((tab) => tab.id !== 'vedic_report' && interpretations[tab.id])
        .map((tab) => ({ meta: tab, text: interpretations[tab.id] }))
    : [];
  const exportReady = isReportTab
    ? reportSections.length > 0 && !!chartData
    : !!chapterText && !!chartData;

  const handleExportChapter = () => {
    if (!chartData || !exportReady) return;

    const sections = isReportTab
      ? reportSections
      : [{ meta: currentTabMeta, text: chapterText }];
    if (!sections.length) return;

    // ── Minimal markdown → HTML ──
    const escapeHtml = (s) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const inline = (s) =>
      escapeHtml(s)
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    const mdToHtml = (md) => {
      const lines = String(md).replace(/\r\n/g, '\n').split('\n');
      const out = [];
      let inList = false;
      const closeList = () => { if (inList) { out.push('</ul>'); inList = false; } };
      for (const raw of lines) {
        const line = raw.trimEnd();
        if (/^#{1,6}\s+/.test(line)) {
          closeList();
          out.push(`<h3>${inline(line.replace(/^#{1,6}\s+/, ''))}</h3>`);
        } else if (/^\s*[-*•]\s+/.test(line)) {
          if (!inList) { out.push('<ul>'); inList = true; }
          out.push(`<li>${inline(line.replace(/^\s*[-*•]\s+/, ''))}</li>`);
        } else if (/^\s*(---|___|\*\*\*)\s*$/.test(line)) {
          closeList();
          out.push('<hr/>');
        } else if (line.trim() === '') {
          closeList();
        } else {
          closeList();
          out.push(`<p>${inline(line)}</p>`);
        }
      }
      closeList();
      return out.join('\n');
    };

    const safeName = (chartData.full_name || 'chart').replace(/[^\w-]+/g, '-');
    const safeFile = isReportTab
      ? 'Full-Vedic-Report'
      : (currentTabMeta.label || 'chapter').replace(/[^\w-]+/g, '-');
    const docTitle = isReportTab ? 'Full Vedic Report' : currentTabMeta.label;

    const sectionsHtml = sections
      .map(({ meta, text }) => `
<section class="chapter">
  <div class="chapter-head">
    <h2>${meta.label.replace(/^\d+\.\s*/, '')}</h2>
    <div class="folio">${meta.chapter} &middot; Manuscript Folio ${meta.folio}</div>
  </div>
  ${mdToHtml(text)}
</section>`)
      .join('\n');

    const tocHtml = sections.length > 1
      ? `<nav class="toc"><div class="toc-title">Contents</div><ol>${sections
          .map(({ meta }) => `<li>${meta.label.replace(/^\d+\.\s*/, '')}</li>`)
          .join('')}</ol></nav>`
      : '';

    const doc = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Trikal Darshi — ${docTitle} — ${chartData.full_name || ''}</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; color: #16223F; max-width: 800px; margin: 0 auto; padding: 40px 32px; line-height: 1.8; }
  header { text-align: center; border-bottom: 3px double #D9A63C; padding-bottom: 16px; margin-bottom: 28px; }
  .brand { font-size: 13px; letter-spacing: 4px; color: #7b5800; font-weight: bold; }
  h1 { color: #022454; font-size: 28px; margin: 10px 0 4px; }
  .folio { font-size: 11px; letter-spacing: 2px; color: #7b5800; text-transform: uppercase; }
  .native { background: #FBF6EA; border: 1px solid #E8D5A7; border-radius: 10px; padding: 12px 18px; font-size: 13px; margin: 24px 0 28px; }
  .toc { background: #FBF6EA; border: 1px solid #E8D5A7; border-radius: 10px; padding: 16px 22px; margin: 0 0 28px; }
  .toc-title { font-size: 11px; letter-spacing: 3px; color: #7b5800; font-weight: bold; text-transform: uppercase; margin-bottom: 8px; }
  .toc ol { margin: 0; padding-left: 20px; font-size: 14px; }
  .toc li { margin: 4px 0; }
  .chapter { margin-bottom: 40px; }
  .chapter-head { border-bottom: 1px solid #E8D5A7; padding-bottom: 8px; margin-bottom: 14px; }
  h2 { color: #022454; font-size: 21px; margin: 0; }
  h3 { color: #022454; border-left: 4px solid #D9A63C; padding-left: 10px; margin-top: 24px; }
  p { margin: 10px 0; font-size: 15px; }
  ul { margin: 10px 0 10px 24px; }
  li { margin: 6px 0; }
  hr { border: 0; border-top: 1px solid #E8D5A7; margin: 24px 0; }
  footer { margin-top: 40px; padding-top: 14px; border-top: 1px solid #E8D5A7; font-size: 11px; color: #535E73; text-align: center; }
  .chapter-head, h3 { page-break-after: avoid; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
<header>
  <div class="brand">✦ TRIKAL DARSHI ✦</div>
  <h1>${docTitle}</h1>
  <div class="folio">${isReportTab ? 'Complete 11-Chapter Synthesis' : `${currentTabMeta.chapter} · Manuscript Folio ${currentTabMeta.folio}`}</div>
</header>
<div class="native">
  <strong>${chartData.full_name || 'Native'}</strong><br/>
  Born: ${chartData.date_of_birth || '—'}${chartData.time_of_birth ? ` at ${chartData.time_of_birth}` : ''} · ${chartData.city_of_birth || '—'}<br/>
  Lagna: ${chartData.ascendant?.sign || '—'} · Ayanamsa: Lahiri 24°11'42"
</div>
${tocHtml}
<main>
${sectionsHtml}
</main>
<footer>
  Generated by Trikal Darshi · ${new Date().toLocaleString('en-IN')} · For personal reflection only
</footer>
</body>
</html>`;

    const blob = new Blob([doc], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Trikal-Darshi_${safeFile}_${safeName}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  return (
    <div className="w-full flex flex-col no-print">
      {/* ── 11-Tab Horizontal Scrollable Navigation Bar ── */}
      <div className="bg-[#FFFDF6] border border-[#E8D5A7]/80 rounded-xl p-2 shadow-xs flex items-center justify-between gap-3 overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const isLoading = !!tabLoadingState[tab.id];
            const isLoaded = !!interpretations[tab.id];

            return (
              <button
                key={tab.id}
                role="tab"
                id={`tab-btn-${tab.id}`}
                aria-selected={isActive}
                onClick={() => onTabChange(tab.id)}
                className={`px-3 py-2 rounded-lg text-[12.5px] font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-[#1F3A6B] text-[#FFFDF6] shadow-sm border border-[#D9A63C]/60'
                    : 'text-[#535E73] hover:text-[#1F3A6B] hover:bg-[#FAF3E3]'
                }`}
              >
                {isActive && (
                  <span className="w-2 h-2 rounded-full bg-[#D9A63C] shadow-[0_0_8px_#D9A63C]" />
                )}
                <span>{tab.label}</span>
                {isActive && (
                  <span className="bg-[#D9A63C] text-[#022454] text-[9.5px] font-extrabold px-1.5 py-0.2 rounded uppercase tracking-wider">
                    Active
                  </span>
                )}
                {isLoading && (
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping opacity-80" />
                )}
                {isLoaded && !isActive && !isLoading && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1E6E3E]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Export Action on Tab Bar Right */}
        <button
          type="button"
          onClick={handleExportChapter}
          disabled={!exportReady}
          className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#FAF3E3] hover:bg-[#E8D5A7]/60 disabled:opacity-40 disabled:cursor-not-allowed text-[#022454] text-[12px] font-bold border border-[#E8D5A7] transition-colors cursor-pointer shadow-2xs"          title={!exportReady
            ? (isReportTab
              ? 'No chapters generated yet \u2014 compile or stream chapters first, then export'
              : 'Stream this chapter first, then export')
            : (isReportTab
              ? 'Download the full report (all generated chapters in one document) \u2014 print to PDF from any browser'
              : 'Download this chapter as a document (print to PDF from any browser)')}        >
          <span className="material-symbols-outlined text-[16px] text-[#7b5800]">download</span>
          <span>{isReportTab ? 'Export Full Report' : 'Export Chapter'}</span>
        </button>
      </div>
    </div>
  );
}

export function TabContentCard({
  chartId,
  activeTab,
  interpretations,
  tabLoadingState = {},
  chartData,
  onGenerateMissingTabs
}) {
  const { t } = useTranslation();

  const currentTab = TABS.find((t) => t.id === activeTab) || TABS[0];

  return (
    <div
      key={activeTab}
      className="bg-[#FFFDF6] border border-[#E8D5A7]/80 rounded-2xl p-6 sm:p-7 shadow-xs flex flex-col gap-5"
      role="tabpanel"
      id={`tab-panel-${activeTab}`}
      aria-labelledby={`tab-btn-${activeTab}`}
    >
      {/* Chapter Editorial Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#E8D5A7]/50">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#D9A63C] text-[22px]">history_edu</span>
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#7b5800] font-sans">
            {currentTab.chapter}
          </span>
        </div>
        <span className="text-[11px] font-semibold bg-[#FAF3E3] border border-[#E8D5A7] px-2.5 py-1 rounded-full text-[#535E73]">
          Manuscript Folio {currentTab.folio}
        </span>
      </div>

      {/* Chapter Title & Doctrine Subtitle */}
      <div>
        <h1 className="font-['Fraunces',serif] text-[#022454] text-[24px] sm:text-[27px] font-semibold tracking-tight leading-snug">
          {currentTab.label.replace(/^\d+\.\s*/, '')} Synthesis
        </h1>
        <p className="text-[13px] text-[#7b5800] font-medium mt-0.5">
          {currentTab.subtitle}
        </p>
      </div>

      {/* Reading Prose Body */}
      <div className="prose-interpretation min-h-[220px] text-[14.5px] text-[#0E1A37] leading-[1.75]">
        {activeTab === 'vedic_report' ? (
          <div className="w-full flex flex-col gap-6">
            {/* Report Header */}
            <div className="bg-[#FAF5E8] border border-[#E8D5A7]/60 rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-[#7b5800] tracking-widest uppercase">Comprehensive Soul Folio</span>
                <h3 className="font-['Fraunces',serif] text-[#022454] text-lg font-bold">
                  Complete Astrological Blueprint
                </h3>
                {chartData && (
                  <p className="text-xs text-[#535E73]">
                    {chartData.full_name} • {chartData.date_of_birth} ({chartData.time_of_birth?.slice(0, 5)}) • {chartData.city_of_birth}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onGenerateMissingTabs}
                className="px-4 py-2 bg-[#1F3A6B] hover:bg-[#022454] text-[#FFFDF6] rounded-lg text-xs font-bold uppercase tracking-wider transition-all border border-[#D9A63C]/40 cursor-pointer"
              >
                Compile All Chapters
              </button>
            </div>

            {/* Chapters list */}
            <div className="space-y-6">
              {TABS.filter((t) => t.id !== 'vedic_report').map((chap) => {
                const content = interpretations[chap.id];
                const isLoading = !!tabLoadingState[chap.id];

                return (
                  <div key={chap.id} className="border border-[#E8D5A7]/70 rounded-xl p-5 bg-[#FAF5E8]/40">
                    <h3 className="font-['Fraunces',serif] text-[#022454] text-base font-bold pb-2 mb-3 border-b border-[#E8D5A7]/40 flex items-center justify-between">
                      <span>{chap.label}</span>
                      <span className="text-xs font-normal text-[#7b5800] font-sans">{chap.chapter}</span>
                    </h3>
                    {content ? (
                      chap.id === 8 ? (
                        <RemedyCards remedyText={content} />
                      ) : (
                        <div>{formatInterpretationText(content)}</div>
                      )
                    ) : isLoading ? (
                      <div className="text-xs text-[#7b5800] animate-pulse py-4 font-semibold">
                        ✦ Synthesizing celestial geometry for this chapter…
                      </div>
                    ) : (
                      <div className="text-xs text-[#535E73] italic py-2">
                        Not yet generated. Click on the tab to stream this chapter.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : interpretations[activeTab] ? (
          <div>
            {formatInterpretationText(interpretations[activeTab])}
            {tabLoadingState[activeTab] && (
              <span className="ml-1 text-[#1F3A6B] animate-pulse inline-block font-bold">▉</span>
            )}
          </div>
        ) : tabLoadingState[activeTab] ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[#022454] uppercase tracking-widest">
              <span className="material-symbols-outlined text-[#D9A63C] text-[18px] animate-spin">progress_activity</span>
              Channeling Parashari Shastras…
            </div>
            {/* Shimmer skeletons signal real content is actively arriving */}
            <ShimmerSkeleton lines={7} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <span className="material-symbols-outlined text-[#E8D5A7] text-[40px]">
              auto_stories
            </span>
            <p className="text-xs text-[#535E73]">
              Reading stream ready. Click to synthesize this chapter.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


