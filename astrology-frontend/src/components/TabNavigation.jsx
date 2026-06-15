import React from 'react';
import RemedyCards from './RemedyCards';
import { formatInterpretationText, parseInlineMarkdown } from './formatters';

const TABS = [
  { id: 1,  label: 'Lagna & Soul Blueprint',        icon: 'wb_sunny'      },
  { id: 2,  label: 'Lal Kitab Analysis',            icon: 'diamond'       },
  { id: 3,  label: 'Numerology Matrix',             icon: 'all_inclusive' },
  { id: 4,  label: 'Career & Dashamsha D10',        icon: 'work'          },
  { id: 'education', label: 'Education',            icon: 'school', tabNumber: 11 },
  { id: 5,  label: 'Wealth & Abundance D4',         icon: 'payments'      },
  { id: 6,  label: 'Love Marriage & Navamsha D9',   icon: 'favorite'      },
  { id: 7,  label: 'Health & Vitality D30',         icon: 'healing'       },
  { id: 8,  label: 'Remedies Tripath System',       icon: 'auto_awesome'  },
  { id: 9,  label: 'Progeny Lineage & Saptamsha D7',icon: 'child_care'    },
  { id: 10, label: 'Gochar Current Transits',       icon: 'track_changes' },
  { id: 'vedic_report', label: 'Vedic Report',      icon: 'menu_book'     }
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

export default function TabNavigation({
  chartId, activeTab, onTabChange,
  interpretations, tabLoadingState = {},
  chartData, onGenerateMissingTabs
}) {
  const [activeCategory, setActiveCategory] = React.useState(() => {
    if ([1, 4, 5, 6, 7, 9, 10, 'education'].includes(activeTab)) {
      return 'chart_description';
    }
    if ([2, 3, 8, 'vedic_report'].includes(activeTab)) {
      return 'report_analysis';
    }
    return 'basics';
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
          
          {activeTab === 'vedic_report' && (
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
  const currentTab = [
    ...CHART_DESCRIPTION_SUBTABS,
    ...REPORT_ANALYSIS_SUBTABS,
    { id: 'basics', label: 'Basics', icon: 'grid_view' }
  ].find((t) => t.id === activeTab) || CHART_DESCRIPTION_SUBTABS[0];

  return (
    <>
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
            chartData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Card 1: Birth Identity */}
                <div className="bg-surface-container-low border border-outline-variant/35 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-3 border-b border-outline-variant/15 pb-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px]">badge</span>
                    </div>
                    <h5 className="font-headline-md text-primary text-xs font-bold uppercase tracking-wider">Birth Identity</h5>
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-outline font-medium">Full Name</span>
                      <span className="text-on-surface font-semibold">{chartData.full_name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-outline font-medium">Date of Birth</span>
                      <span className="text-on-surface font-semibold">{chartData.date_of_birth || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-outline font-medium">Time of Birth</span>
                      <span className="text-on-surface font-semibold">{chartData.time_of_birth ? chartData.time_of_birth.slice(0, 5) : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-outline font-medium">Place of Birth</span>
                      <span className="text-on-surface font-semibold">{chartData.city_of_birth || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-outline font-medium">Current City</span>
                      <span className="text-on-surface font-semibold">{chartData.current_city || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-outline font-medium">Time Confidence</span>
                      <span className="text-on-surface font-semibold capitalize">{chartData.birth_time_confidence || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-outline font-medium">Ayanamsha</span>
                      <span className="text-on-surface font-semibold">LAHIRI</span>
                    </div>
                  </div>
                </div>

                {/* Card 2: Lagna & Moon */}
                <div className="bg-surface-container-low border border-outline-variant/35 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-3 border-b border-outline-variant/15 pb-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px]">brightness_3</span>
                    </div>
                    <h5 className="font-headline-md text-primary text-xs font-bold uppercase tracking-wider">Lagna & Moon</h5>
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-outline font-medium">Lagna (Ascendant)</span>
                      <span className="text-on-surface font-semibold">
                        {chartData.ascendant?.sign || 'N/A'} ({chartData.ascendant?.degree ? `${Number(chartData.ascendant.degree).toFixed(2)}°` : 'N/A'})
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-outline font-medium">Lagna Nakshatra</span>
                      <span className="text-on-surface font-semibold">{chartData.ascendant?.nakshatra || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-outline font-medium">Moon Sign (Rashi)</span>
                      <span className="text-on-surface font-semibold">
                        {chartData.planets?.find(p => p.name === 'Moon')?.sign || chartData.nakshatra?.sign || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-outline font-medium">Moon Nakshatra</span>
                      <span className="text-on-surface font-semibold">{chartData.nakshatra?.nakshatra || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-outline font-medium">Nakshatra Pada</span>
                      <span className="text-on-surface font-semibold">
                        {chartData.nakshatra?.nakshatra_pada || chartData.nakshatra?.nakshatra_pad || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-outline font-medium">Nakshatra Lord</span>
                      <span className="text-on-surface font-semibold">
                        {chartData.nakshatra?.nakshatra_lord || chartData.nakshatra?.nakshatraLord || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card 3: Vedic Panchang */}
                <div className="bg-surface-container-low border border-outline-variant/35 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-3 border-b border-outline-variant/15 pb-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px]">calendar_today</span>
                    </div>
                    <h5 className="font-headline-md text-primary text-xs font-bold uppercase tracking-wider">Vedic Panchang</h5>
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-outline font-medium">Tithi (Lunar Day)</span>
                      <span className="text-on-surface font-semibold">{chartData.astro_details?.tithi || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-outline font-medium">Karana (Half Tithi)</span>
                      <span className="text-on-surface font-semibold">{chartData.astro_details?.karan || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-outline font-medium">Yoga (Sun/Moon angle)</span>
                      <span className="text-on-surface font-semibold">{chartData.astro_details?.yog || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-outline font-medium">Nakshatra (Moon Mansion)</span>
                      <span className="text-on-surface font-semibold">{chartData.astro_details?.nakshatra || chartData.nakshatra?.nakshatra || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Card 4: Avakhada Chakra */}
                <div className="bg-surface-container-low border border-outline-variant/35 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-3 border-b border-outline-variant/15 pb-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px]">grain</span>
                    </div>
                    <h5 className="font-headline-md text-primary text-xs font-bold uppercase tracking-wider">Avakhada Chakra</h5>
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-outline font-medium">Varna (Temperament)</span>
                      <span className="text-on-surface font-semibold">{chartData.astro_details?.varna || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-outline font-medium">Vashya (Dominance)</span>
                      <span className="text-on-surface font-semibold">{chartData.astro_details?.vashya || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-outline font-medium">Yoni (Animal Symbol)</span>
                      <span className="text-on-surface font-semibold">{chartData.astro_details?.yoni || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-outline font-medium">Gana (Disposition)</span>
                      <span className="text-on-surface font-semibold">{chartData.astro_details?.gan || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-outline font-medium">Nadi (Health Type)</span>
                      <span className="text-on-surface font-semibold">{chartData.astro_details?.nadi || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Card 5: Current Dasha */}
                <div className="bg-surface-container-low border border-outline-variant/35 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-3 border-b border-outline-variant/15 pb-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px]">hourglass_empty</span>
                    </div>
                    <h5 className="font-headline-md text-primary text-xs font-bold uppercase tracking-wider">Current Dasha</h5>
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-outline font-medium">Mahadasha Lord</span>
                      <span className="text-on-surface font-semibold text-primary">{chartData.dasha?.mahadasha || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-outline font-medium">Antardasha Lord</span>
                      <span className="text-on-surface font-semibold text-primary">{chartData.dasha?.antardasha || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-outline font-medium">Dasha Start Date</span>
                      <span className="text-on-surface font-semibold">{chartData.dasha?.mahadasha_start || chartData.dasha?.start_date || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-outline font-medium">Dasha End Date</span>
                      <span className="text-on-surface font-semibold">{chartData.dasha?.mahadasha_end || chartData.dasha?.end_date || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Card 6: Dosha Summary */}
                <div className="bg-surface-container-low border border-outline-variant/35 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-3 border-b border-outline-variant/15 pb-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px]">warning</span>
                    </div>
                    <h5 className="font-headline-md text-primary text-xs font-bold uppercase tracking-wider">Dosha Summary</h5>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-outline font-medium">Kalsarp Dosha</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${chartData.kalsarp?.present ? 'bg-error/10 text-error border border-error/25' : 'bg-green-500/10 text-green-600 border border-green-500/25'}`}>
                        {chartData.kalsarp?.present ? 'Active' : 'Absent'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-outline font-medium">Mangal Dosha</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${chartData.mangal_dosha?.present ? 'bg-error/10 text-error border border-error/25' : 'bg-green-500/10 text-green-600 border border-green-500/25'}`}>
                        {chartData.mangal_dosha?.present ? 'Active' : 'Absent'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-outline font-medium">Pitru Dosha</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${chartData.pitru_dosha?.present ? 'bg-error/10 text-error border border-error/25' : 'bg-green-500/10 text-green-600 border border-green-500/25'}`}>
                        {chartData.pitru_dosha?.present ? 'Active' : 'Absent'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-outline font-medium">Gand Mool</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${chartData.nakshatra?.gand_mool?.present ? 'bg-error/10 text-error border border-error/25' : 'bg-green-500/10 text-green-600 border border-green-500/25'}`}>
                        {chartData.nakshatra?.gand_mool?.present ? 'Active' : 'Absent'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 gap-5">
                <span className="material-symbols-outlined text-primary-container text-[40px] animate-spin">
                  hourglass_empty
                </span>
                <p className="font-label-sm text-xs font-bold text-primary uppercase tracking-widest animate-pulse">
                  Loading birth metrics...
                </p>
              </div>
            )
          ) : activeTab === 'education' && !interpretations['education'] && !tabLoadingState['education'] ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
              <span className="material-symbols-outlined text-outline/40 text-[48px]">
                school
              </span>
              <p className="text-sm text-outline/70 italic font-medium">
                Education report is blank for now.
              </p>
            </div>
          ) : activeTab === 'vedic_report' ? (
            <div className="w-full flex flex-col gap-6">
              {/* Report Header */}
              <div className="bg-surface-container-low border border-outline-variant/35 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-primary tracking-widest uppercase">✦ VEDIC COSMIC REPORT ✦</span>
                  <h3 className="font-headline-md text-primary text-lg md:text-xl font-bold uppercase tracking-wider">
                    Trikal Darshi Blueprint
                  </h3>
                  {chartData && (
                    <p className="text-xs text-outline mt-1 font-medium">
                      Name: <span className="text-on-surface font-semibold">{chartData.full_name}</span> · 
                      DOB: <span className="text-on-surface font-semibold">{chartData.date_of_birth}</span> · 
                      TOB: <span className="text-on-surface font-semibold">{chartData.time_of_birth?.slice(0, 5)}</span> · 
                      Place: <span className="text-on-surface font-semibold">{chartData.city_of_birth}</span>
                    </p>
                  )}
                </div>
                {chartData && (
                  <div className="flex flex-col items-start md:items-end text-xs text-outline font-medium">
                    <span>Ayanamsha: <span className="text-on-surface font-semibold">LAHIRI</span></span>
                    <span>Generated: <span className="text-on-surface font-semibold">{new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span></span>
                  </div>
                )}
              </div>

              {/* Completeness check */}
              {(() => {
                const allTabsToCheck = [1, 4, 'education', 5, 6, 7, 9, 10, 2, 3, 8];
                const missingTabs = allTabsToCheck.filter(tabId => !interpretations[tabId]);
                const isCompleting = allTabsToCheck.some(tabId => !!tabLoadingState[tabId]);
                
                if (missingTabs.length > 0) {
                  return (
                    <div className="bg-yellow-500/10 border border-yellow-500/35 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
                      <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-yellow-500 text-[20px] shrink-0 mt-0.5">warning</span>
                        <div>
                          <h5 className="font-semibold text-xs text-yellow-600 uppercase tracking-wider">Incomplete Cosmic Report</h5>
                          <p className="text-xs text-outline/90 mt-1">
                            {missingTabs.length} of 11 chapters are missing from this report. Generate them to compile your complete cosmic blueprint.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={onGenerateMissingTabs}
                        disabled={isCompleting}
                        className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border-none shrink-0 disabled:opacity-50"
                      >
                        {isCompleting ? 'Generating Chapters...' : 'Generate Full Report'}
                      </button>
                    </div>
                  );
                }
                return (
                  <div className="bg-green-500/10 border border-green-500/35 rounded-xl p-4 flex items-center gap-3 text-left">
                    <span className="material-symbols-outlined text-green-500 text-[20px]">check_circle</span>
                    <div>
                      <h5 className="font-semibold text-xs text-green-600 uppercase tracking-wider">Complete Cosmic Report</h5>
                      <p className="text-xs text-outline/90 mt-1">
                        All 11 chapters have been successfully compiled. You can read, print, or download the full document.
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Chapters */}
              <div className="space-y-8 mt-4">
                {[
                  { id: 1, label: 'Chapter 1: Lagna & Soul Blueprint' },
                  { id: 4, label: 'Chapter 2: Career & Dashamsha D10' },
                  { id: 'education', label: 'Chapter 3: Education & Intelligence' },
                  { id: 5, label: 'Chapter 4: Wealth & Abundance D4' },
                  { id: 6, label: 'Chapter 5: Love Marriage & Navamsha D9' },
                  { id: 7, label: 'Chapter 6: Health & Vitality D30' },
                  { id: 9, label: 'Chapter 7: Progeny Lineage & Saptamsha D7' },
                  { id: 10, label: 'Chapter 8: Gochar Current Transits' },
                  { id: 2, label: 'Chapter 9: Lal Kitab Analysis' },
                  { id: 3, label: 'Chapter 10: Numerology Matrix' },
                  { id: 8, label: 'Chapter 11: Remedies Tripath System', isRemedies: true }
                ].map((chap) => {
                  const content = interpretations[chap.id];
                  const isLoading = !!tabLoadingState[chap.id];
                  
                  if (content) {
                    return (
                      <div key={chap.id} className="border border-outline-variant/20 rounded-2xl p-6 bg-surface-container-lowest">
                        <h3 className="font-headline-md text-primary text-sm font-bold uppercase tracking-wider border-b border-outline-variant/15 pb-2 mb-4">
                          {chap.label}
                        </h3>
                        {chap.isRemedies ? (
                          <div className="prose-interpretation">
                            <RemedyCards remedyText={content} />
                          </div>
                        ) : (
                          <div className="prose-interpretation">
                            {formatInterpretationText(content)}
                          </div>
                        )}
                      </div>
                    );
                  }
                  
                  if (isLoading) {
                    return (
                      <div key={chap.id} className="border border-outline-variant/15 rounded-2xl p-6 bg-surface-container-low/40 animate-pulse flex items-center justify-between">
                        <span className="text-xs font-bold text-primary/70 uppercase tracking-wider">{chap.label}</span>
                        <span className="text-[10px] uppercase font-bold text-primary/70 tracking-widest animate-pulse">Channeling content...</span>
                      </div>
                    );
                  }
                  
                  return (
                    <div key={chap.id} className="border border-outline-variant/10 border-dashed rounded-2xl p-6 bg-surface-container-low/10 flex items-center justify-between">
                      <span className="text-xs font-medium text-outline/70">{chap.label}</span>
                      <span className="text-[10px] uppercase font-bold text-outline/50 tracking-wider">Not yet generated</span>
                    </div>
                  );
                })}
              </div>
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
        <div className="border border-outline-variant/35 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-primary tracking-widest uppercase">✦ VEDIC COSMIC REPORT ✦</span>
            <h3 className="font-headline-md text-primary text-lg md:text-xl font-bold uppercase tracking-wider">
              Trikal Darshi Blueprint
            </h3>
            {chartData && (
              <p className="text-xs text-outline mt-1 font-medium">
                Name: <span className="text-on-surface font-semibold">{chartData.full_name}</span> · 
                DOB: <span className="text-on-surface font-semibold">{chartData.date_of_birth}</span> · 
                TOB: <span className="text-on-surface font-semibold">{chartData.time_of_birth?.slice(0, 5)}</span> · 
                Place: <span className="text-on-surface font-semibold">{chartData.city_of_birth}</span>
              </p>
            )}
          </div>
          {chartData && (
            <div className="flex flex-col items-start md:items-end text-xs text-outline font-medium">
              <span>Ayanamsha: <span className="text-on-surface font-semibold">LAHIRI</span></span>
              <span>Generated: <span className="text-on-surface font-semibold">{new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span></span>
            </div>
          )}
        </div>

        {[
          { id: 1, label: 'Lagna & Soul Blueprint' },
          { id: 4, label: 'Career & Dashamsha D10' },
          { id: 'education', label: 'Education & Intelligence' },
          { id: 5, label: 'Wealth & Abundance D4' },
          { id: 6, label: 'Love Marriage & Navamsha D9' },
          { id: 7, label: 'Health & Vitality D30' },
          { id: 9, label: 'Progeny Lineage & Saptamsha D7' },
          { id: 10, label: 'Gochar Current Transits' },
          { id: 2, label: 'Lal Kitab Analysis' },
          { id: 3, label: 'Numerology Matrix' },
          { id: 8, label: 'Remedies Tripath System', isRemedies: true }
        ].map((tab) => {
          const content = interpretations[tab.id];
          if (!content) return null;
          return (
            <div key={tab.id} className="space-y-4 py-4 border-b border-outline-variant/15 page-break-inside-avoid">
              <h3 className="text-sm font-headline-md text-primary uppercase tracking-widest border-b border-outline-variant/25 pb-1">
                {tab.label}
              </h3>
              <div className="prose-interpretation text-xs leading-relaxed">
                {tab.isRemedies ? (
                  <RemedyCards remedyText={content} />
                ) : (
                  formatInterpretationText(content)
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
