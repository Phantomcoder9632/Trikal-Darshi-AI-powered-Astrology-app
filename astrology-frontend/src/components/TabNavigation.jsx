import React from 'react';
import RemedyCards from './RemedyCards';
import { formatInterpretationText, parseInlineMarkdown } from './formatters';
import DivisionalChart from './DivisionalChart';
import { useTranslation } from 'react-i18next';


const CHART_TYPES = [
  { id: 'D1', label: 'D1 — Lagna (Rashi)', key: null },
  { id: 'D9', label: 'D9 — Navamsha', key: 'navamsha' },
  { id: 'D10', label: 'D10 — Dashamsha', key: 'dashamsha' },
  { id: 'D4', label: 'D4 — Chaturthamsa', key: 'chaturthamsa' },
  { id: 'D7', label: 'D7 — Saptamsha', key: 'saptamsha' },
  { id: 'D30', label: 'D30 — Trimsamsa', key: 'trimsamsa' },
  { id: 'chandra', label: 'Chandra Kundali', key: 'chandra_kundali' },
  { id: 'surya', label: 'Surya Kundali', key: 'surya_kundali' },
  { id: 'gochar', label: 'Gochar (Transits)', key: 'gochar' }
];

function BasicsChartCard({ chartData }) {
  const [leftChart, setLeftChart] = React.useState('D1');
  const [rightChart, setRightChart] = React.useState('chandra');
  const { t } = useTranslation();

  const getResolvedData = (chartId) => {
    const config = CHART_TYPES.find(c => c.id === chartId);
    return config?.key ? chartData?.[config.key] : null;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-[1000px] justify-items-center mx-auto">
      {/* Left Slot: Customizable Chart */}
      <div className="w-full max-w-[460px] flex flex-col items-center gap-4">
        <div className="relative w-full max-w-[280px]">
          <select
            value={leftChart}
            onChange={(e) => setLeftChart(e.target.value)}
            className="w-full appearance-none bg-surface-container-lowest border border-outline-variant/35 hover:border-primary/50 text-on-surface hover:text-primary rounded-xl pl-4 pr-10 py-2.5 text-xs font-bold uppercase tracking-wider focus:outline-none focus:border-primary transition-all shadow-xs cursor-pointer"
          >
            {CHART_TYPES.map(c => (
              <option key={c.id} value={c.id} className="bg-surface text-on-surface py-2">
                {t(`dashboard.charts.${c.id}`)}
              </option>
            ))}
          </select>
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-primary pointer-events-none text-[16px] font-bold">
            unfold_more
          </span>
        </div>

        <DivisionalChart
          chartType={leftChart}
          chartData={getResolvedData(leftChart)}
          natalData={chartData}
        />
      </div>

      {/* Right Slot: Customizable Chart */}
      <div className="w-full max-w-[460px] flex flex-col items-center gap-4">
        <div className="relative w-full max-w-[280px]">
          <select
            value={rightChart}
            onChange={(e) => setRightChart(e.target.value)}
            className="w-full appearance-none bg-surface-container-lowest border border-outline-variant/35 hover:border-primary/50 text-on-surface hover:text-primary rounded-xl pl-4 pr-10 py-2.5 text-xs font-bold uppercase tracking-wider focus:outline-none focus:border-primary transition-all shadow-xs cursor-pointer"
          >
            {CHART_TYPES.map(c => (
              <option key={c.id} value={c.id} className="bg-surface text-on-surface py-2">
                {t(`dashboard.charts.${c.id}`)}
              </option>
            ))}
          </select>
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-primary pointer-events-none text-[16px] font-bold">
            unfold_more
          </span>
        </div>

        <DivisionalChart
          chartType={rightChart}
          chartData={getResolvedData(rightChart)}
          natalData={chartData}
        />
      </div>
    </div>
  );
}

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
  const { t } = useTranslation();

  const getTabLabel = (tab) => {
    if (tab.id === 'basics') return t('dashboard.tabs.basics');
    if (tab.id === 'vedic_report') return t('dashboard.tabs.vedic_report');
    const targetKey = tab.id === 'education' ? 11 : tab.id;
    const key = `dashboard.tabs.${targetKey}`;
    const translated = t(key);
    return translated === key ? tab.label : translated;
  };

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
          { id: 'basics', label: t('dashboard.categories.basics'), icon: 'grid_view' },
          { id: 'chart_description', label: t('dashboard.categories.chart_description'), icon: 'bar_chart' },
          { id: 'report_analysis', label: t('dashboard.categories.report_analysis'), icon: 'insights' }
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
                  <span>{getTabLabel(tab)}</span>
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
              title={t('dashboard.download_report_title') || 'Download print-friendly report of all cosmic tabs'}
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              {t('dashboard.download_report') || 'Download Report'}
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
  const { t } = useTranslation();

  const getTabLabel = (tab) => {
    if (tab.id === 'basics') return t('dashboard.tabs.basics');
    if (tab.id === 'vedic_report') return t('dashboard.tabs.vedic_report');
    const targetKey = tab.id === 'education' ? 11 : tab.id;
    const key = `dashboard.tabs.${targetKey}`;
    const translated = t(key);
    return translated === key ? tab.label : translated;
  };

  const translateValue = (val) => {
    if (!val || val === 'N/A') return t('dashboard.values.n_a');
    const normKey = `dashboard.values.${String(val).toLowerCase().trim().replace(/[^a-z0-9]/g, '_')}`;
    const translated = t(normKey);
    return translated === normKey ? val : translated;
  };

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
            {getTabLabel(currentTab)}
          </h4>
          {tabLoadingState[activeTab] && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary/60 animate-pulse">
              {t('dashboard.streaming')}
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
              <div className="flex flex-col gap-6">
                {/* Top Section: Large Kundali Chart */}
                <div className="w-full bg-surface-container-low border border-outline-variant/35 rounded-2xl p-5 shadow-sm flex flex-col gap-4 items-center">
                  <div className="flex items-center gap-3 border-b border-outline-variant/15 pb-3 w-full">
                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
                    </div>
                    <h5 className="font-headline-md text-primary text-xs font-bold uppercase tracking-wider flex-1">
                      {t('dashboard.charts.D1')} &amp; {t('dashboard.charts.chandra')}
                    </h5>
                  </div>
                  <BasicsChartCard chartData={chartData} />
                </div>

                {/* Bottom Section: 6 Birth Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Card 1: Birth Identity */}
                  <div className="bg-surface-container-low border border-outline-variant/35 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center gap-3 border-b border-outline-variant/15 pb-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                        <span className="material-symbols-outlined text-[20px]">badge</span>
                      </div>
                      <h5 className="font-headline-md text-primary text-xs font-bold uppercase tracking-wider">{t('dashboard.basics.cards.birth_identity.title')}</h5>
                    </div>
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-outline font-medium">{t('dashboard.basics.cards.birth_identity.full_name')}</span>
                        <span className="text-on-surface font-semibold">{chartData.full_name || translateValue('N/A')}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-outline font-medium">{t('dashboard.basics.cards.birth_identity.date_of_birth')}</span>
                        <span className="text-on-surface font-semibold">{chartData.date_of_birth || translateValue('N/A')}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-outline font-medium">{t('dashboard.basics.cards.birth_identity.time_of_birth')}</span>
                        <span className="text-on-surface font-semibold">{chartData.time_of_birth ? chartData.time_of_birth.slice(0, 5) : translateValue('N/A')}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-outline font-medium">{t('dashboard.basics.cards.birth_identity.place_of_birth')}</span>
                        <span className="text-on-surface font-semibold">{chartData.city_of_birth || translateValue('N/A')}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-outline font-medium">{t('dashboard.basics.cards.birth_identity.current_city')}</span>
                        <span className="text-on-surface font-semibold">{chartData.current_city || translateValue('N/A')}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-outline font-medium">{t('dashboard.basics.cards.birth_identity.time_confidence')}</span>
                        <span className="text-on-surface font-semibold capitalize">{translateValue(chartData.birth_time_confidence) || translateValue('N/A')}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-outline font-medium">{t('dashboard.basics.cards.birth_identity.ayanamsha')}</span>
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
                      <h5 className="font-headline-md text-primary text-xs font-bold uppercase tracking-wider">{t('dashboard.basics.cards.lagna_moon.title')}</h5>
                    </div>
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-outline font-medium">{t('dashboard.basics.cards.lagna_moon.ascendant')}</span>
                        <span className="text-on-surface font-semibold">
                          {translateValue(chartData.ascendant?.sign) || translateValue('N/A')} ({chartData.ascendant?.degree ? `${Number(chartData.ascendant.degree).toFixed(2)}°` : translateValue('N/A')})
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-outline font-medium">{t('dashboard.basics.cards.lagna_moon.lagna_nakshatra')}</span>
                        <span className="text-on-surface font-semibold">{translateValue(chartData.ascendant?.nakshatra) || translateValue('N/A')}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-outline font-medium">{t('dashboard.basics.cards.lagna_moon.moon_sign')}</span>
                        <span className="text-on-surface font-semibold">
                          {translateValue(chartData.planets?.find(p => p.name === 'Moon')?.sign || chartData.nakshatra?.sign) || translateValue('N/A')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-outline font-medium">{t('dashboard.basics.cards.lagna_moon.moon_nakshatra')}</span>
                        <span className="text-on-surface font-semibold">{translateValue(chartData.nakshatra?.nakshatra) || translateValue('N/A')}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-outline font-medium">{t('dashboard.basics.cards.lagna_moon.nakshatra_pada')}</span>
                        <span className="text-on-surface font-semibold">
                          {chartData.nakshatra?.nakshatra_pada || chartData.nakshatra?.nakshatra_pad || translateValue('N/A')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-outline font-medium">{t('dashboard.basics.cards.lagna_moon.nakshatra_lord')}</span>
                        <span className="text-on-surface font-semibold">
                          {translateValue(chartData.nakshatra?.nakshatra_lord || chartData.nakshatra?.nakshatraLord) || translateValue('N/A')}
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
                      <h5 className="font-headline-md text-primary text-xs font-bold uppercase tracking-wider">{t('dashboard.basics.cards.vedic_panchang.title')}</h5>
                    </div>
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-outline font-medium">{t('dashboard.basics.cards.vedic_panchang.tithi')}</span>
                        <span className="text-on-surface font-semibold">{translateValue(chartData.astro_details?.tithi) || translateValue('N/A')}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-outline font-medium">{t('dashboard.basics.cards.vedic_panchang.karana')}</span>
                        <span className="text-on-surface font-semibold">{translateValue(chartData.astro_details?.karan) || translateValue('N/A')}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-outline font-medium">{t('dashboard.basics.cards.vedic_panchang.yoga')}</span>
                        <span className="text-on-surface font-semibold">{translateValue(chartData.astro_details?.yog) || translateValue('N/A')}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-outline font-medium">{t('dashboard.basics.cards.vedic_panchang.nakshatra')}</span>
                        <span className="text-on-surface font-semibold">{translateValue(chartData.astro_details?.nakshatra || chartData.nakshatra?.nakshatra) || translateValue('N/A')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 4: Avakhada Chakra */}
                  <div className="bg-surface-container-low border border-outline-variant/35 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center gap-3 border-b border-outline-variant/15 pb-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                        <span className="material-symbols-outlined text-[20px]">grain</span>
                      </div>
                      <h5 className="font-headline-md text-primary text-xs font-bold uppercase tracking-wider">{t('dashboard.basics.cards.avakhada_chakra.title')}</h5>
                    </div>
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-outline font-medium">{t('dashboard.basics.cards.avakhada_chakra.varna')}</span>
                        <span className="text-on-surface font-semibold">{translateValue(chartData.astro_details?.varna) || translateValue('N/A')}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-outline font-medium">{t('dashboard.basics.cards.avakhada_chakra.vashya')}</span>
                        <span className="text-on-surface font-semibold">{translateValue(chartData.astro_details?.vashya) || translateValue('N/A')}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-outline font-medium">{t('dashboard.basics.cards.avakhada_chakra.yoni')}</span>
                        <span className="text-on-surface font-semibold">{translateValue(chartData.astro_details?.yoni) || translateValue('N/A')}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-outline font-medium">{t('dashboard.basics.cards.avakhada_chakra.gana')}</span>
                        <span className="text-on-surface font-semibold">{translateValue(chartData.astro_details?.gan) || translateValue('N/A')}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-outline font-medium">{t('dashboard.basics.cards.avakhada_chakra.nadi')}</span>
                        <span className="text-on-surface font-semibold">{translateValue(chartData.astro_details?.nadi) || translateValue('N/A')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 5: Current Dasha */}
                  <div className="bg-surface-container-low border border-outline-variant/35 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center gap-3 border-b border-outline-variant/15 pb-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                        <span className="material-symbols-outlined text-[20px]">hourglass_empty</span>
                      </div>
                      <h5 className="font-headline-md text-primary text-xs font-bold uppercase tracking-wider">{t('dashboard.basics.cards.current_dasha.title')}</h5>
                    </div>
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-outline font-medium">{t('dashboard.basics.cards.current_dasha.mahadasha_lord')}</span>
                        <span className="text-on-surface font-semibold text-primary">{translateValue(chartData.dasha?.mahadasha) || translateValue('N/A')}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-outline font-medium">{t('dashboard.basics.cards.current_dasha.antardasha_lord')}</span>
                        <span className="text-on-surface font-semibold text-primary">{translateValue(chartData.dasha?.antardasha) || translateValue('N/A')}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-outline font-medium">{t('dashboard.basics.cards.current_dasha.dasha_start')}</span>
                        <span className="text-on-surface font-semibold">{chartData.dasha?.mahadasha_start || chartData.dasha?.start_date || translateValue('N/A')}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-outline font-medium">{t('dashboard.basics.cards.current_dasha.dasha_end')}</span>
                        <span className="text-on-surface font-semibold">{chartData.dasha?.mahadasha_end || chartData.dasha?.end_date || translateValue('N/A')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 6: Dosha Summary */}
                  <div className="bg-surface-container-low border border-outline-variant/35 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center gap-3 border-b border-outline-variant/15 pb-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                        <span className="material-symbols-outlined text-[20px]">warning</span>
                      </div>
                      <h5 className="font-headline-md text-primary text-xs font-bold uppercase tracking-wider">{t('dashboard.basics.cards.dosha_summary.title')}</h5>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-outline font-medium">{t('dashboard.basics.cards.dosha_summary.kalsarp')}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${chartData.kalsarp?.present ? 'bg-error/10 text-error border border-error/25' : 'bg-green-500/10 text-green-600 border border-green-500/25'}`}>
                          {translateValue(chartData.kalsarp?.present ? 'Active' : 'Absent')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-outline font-medium">{t('dashboard.basics.cards.dosha_summary.mangal')}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${chartData.mangal_dosha?.present ? 'bg-error/10 text-error border border-error/25' : 'bg-green-500/10 text-green-600 border border-green-500/25'}`}>
                          {translateValue(chartData.mangal_dosha?.present ? 'Active' : 'Absent')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-outline font-medium">{t('dashboard.basics.cards.dosha_summary.pitru')}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${chartData.pitru_dosha?.present ? 'bg-error/10 text-error border border-error/25' : 'bg-green-500/10 text-green-600 border border-green-500/25'}`}>
                          {translateValue(chartData.pitru_dosha?.present ? 'Active' : 'Absent')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-outline font-medium">{t('dashboard.basics.cards.dosha_summary.gand_mool')}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${chartData.nakshatra?.gand_mool?.present ? 'bg-error/10 text-error border border-error/25' : 'bg-green-500/10 text-green-600 border border-green-500/25'}`}>
                          {translateValue(chartData.nakshatra?.gand_mool?.present ? 'Active' : 'Absent')}
                        </span>
                      </div>
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
                {t('dashboard.education_blank')}
              </p>
            </div>
          ) : activeTab === 'vedic_report' ? (
            <div className="w-full flex flex-col gap-6">
              {/* Report Header */}
              <div className="bg-surface-container-low border border-outline-variant/35 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-primary tracking-widest uppercase">{t('dashboard.vedic_report.title')}</span>
                  <h3 className="font-headline-md text-primary text-lg md:text-xl font-bold uppercase tracking-wider">
                    {t('dashboard.vedic_report.blueprint')}
                  </h3>
                  {chartData && (
                    <p className="text-xs text-outline mt-1 font-medium">
                      {t('dashboard.vedic_report.name')}: <span className="text-on-surface font-semibold">{chartData.full_name}</span> · 
                      {t('dashboard.vedic_report.dob')}: <span className="text-on-surface font-semibold">{chartData.date_of_birth}</span> · 
                      {t('dashboard.vedic_report.tob')}: <span className="text-on-surface font-semibold">{chartData.time_of_birth?.slice(0, 5)}</span> · 
                      {t('dashboard.vedic_report.place')}: <span className="text-on-surface font-semibold">{chartData.city_of_birth}</span>
                    </p>
                  )}
                </div>
                {chartData && (
                  <div className="flex flex-col items-start md:items-end text-xs text-outline font-medium">
                    <span>{t('dashboard.vedic_report.ayanamsha')}: <span className="text-on-surface font-semibold">LAHIRI</span></span>
                    <span>{t('dashboard.vedic_report.generated')}: <span className="text-on-surface font-semibold">{new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span></span>
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
                          <h5 className="font-semibold text-xs text-yellow-600 uppercase tracking-wider">{t('dashboard.vedic_report.incomplete_title')}</h5>
                          <p className="text-xs text-outline/90 mt-1">
                            {t('dashboard.vedic_report.incomplete_desc', { count: missingTabs.length })}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={onGenerateMissingTabs}
                        disabled={isCompleting}
                        className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border-none shrink-0 disabled:opacity-50"
                      >
                        {isCompleting ? t('dashboard.vedic_report.generating_chapters') : t('dashboard.vedic_report.generate_full')}
                      </button>
                    </div>
                  );
                }
                return (
                  <div className="bg-green-500/10 border border-green-500/35 rounded-xl p-4 flex items-center gap-3 text-left">
                    <span className="material-symbols-outlined text-green-500 text-[20px]">check_circle</span>
                    <div>
                      <h5 className="font-semibold text-xs text-green-600 uppercase tracking-wider">{t('dashboard.vedic_report.complete_title')}</h5>
                      <p className="text-xs text-outline/90 mt-1">
                        {t('dashboard.vedic_report.complete_desc')}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Chapters */}
              <div className="space-y-8 mt-4">
                {[
                  { id: 1, labelKey: 'dashboard.vedic_report.chapter_1' },
                  { id: 4, labelKey: 'dashboard.vedic_report.chapter_2' },
                  { id: 'education', labelKey: 'dashboard.vedic_report.chapter_3' },
                  { id: 5, labelKey: 'dashboard.vedic_report.chapter_4' },
                  { id: 6, labelKey: 'dashboard.vedic_report.chapter_5' },
                  { id: 7, labelKey: 'dashboard.vedic_report.chapter_6' },
                  { id: 9, labelKey: 'dashboard.vedic_report.chapter_7' },
                  { id: 10, labelKey: 'dashboard.vedic_report.chapter_8' },
                  { id: 2, labelKey: 'dashboard.vedic_report.chapter_9' },
                  { id: 3, labelKey: 'dashboard.vedic_report.chapter_10' },
                  { id: 8, labelKey: 'dashboard.vedic_report.chapter_11', isRemedies: true }
                ].map((chap) => {
                  const content = interpretations[chap.id];
                  const isLoading = !!tabLoadingState[chap.id];
                  const chapLabel = t(chap.labelKey);
                  
                  if (content) {
                    return (
                      <div key={chap.id} className="border border-outline-variant/20 rounded-2xl p-6 bg-surface-container-lowest">
                        <h3 className="font-headline-md text-primary text-sm font-bold uppercase tracking-wider border-b border-outline-variant/15 pb-2 mb-4">
                          {chapLabel}
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
                        <span className="text-xs font-bold text-primary/70 uppercase tracking-wider">{chapLabel}</span>
                        <span className="text-[10px] uppercase font-bold text-primary/70 tracking-widest animate-pulse">{t('dashboard.channeling_content')}</span>
                      </div>
                    );
                  }
                  
                  return (
                    <div key={chap.id} className="border border-outline-variant/10 border-dashed rounded-2xl p-6 bg-surface-container-low/10 flex items-center justify-between">
                      <span className="text-xs font-medium text-outline/70">{chapLabel}</span>
                      <span className="text-[10px] uppercase font-bold text-outline/50 tracking-wider">{t('dashboard.not_yet_generated')}</span>
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
                {t('dashboard.channeling')}
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
            <span className="text-[10px] font-bold text-primary tracking-widest uppercase">{t('dashboard.vedic_report.title')}</span>
            <h3 className="font-headline-md text-primary text-lg md:text-xl font-bold uppercase tracking-wider">
              {t('dashboard.vedic_report.blueprint')}
            </h3>
            {chartData && (
              <p className="text-xs text-outline mt-1 font-medium">
                {t('dashboard.vedic_report.name')}: <span className="text-on-surface font-semibold">{chartData.full_name}</span> · 
                {t('dashboard.vedic_report.dob')}: <span className="text-on-surface font-semibold">{chartData.date_of_birth}</span> · 
                {t('dashboard.vedic_report.tob')}: <span className="text-on-surface font-semibold">{chartData.time_of_birth?.slice(0, 5)}</span> · 
                {t('dashboard.vedic_report.place')}: <span className="text-on-surface font-semibold">{chartData.city_of_birth}</span>
              </p>
            )}
          </div>
          {chartData && (
            <div className="flex flex-col items-start md:items-end text-xs text-outline font-medium">
              <span>{t('dashboard.vedic_report.ayanamsha')}: <span className="text-on-surface font-semibold">LAHIRI</span></span>
              <span>{t('dashboard.vedic_report.generated')}: <span className="text-on-surface font-semibold">{new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span></span>
            </div>
          )}
        </div>

        {[
          { id: 1, tabKey: '1' },
          { id: 4, tabKey: '4' },
          { id: 'education', tabKey: '11' },
          { id: 5, tabKey: '5' },
          { id: 6, tabKey: '6' },
          { id: 7, tabKey: '7' },
          { id: 9, tabKey: '9' },
          { id: 10, tabKey: '10' },
          { id: 2, tabKey: '2' },
          { id: 3, tabKey: '3' },
          { id: 8, tabKey: '8', isRemedies: true }
        ].map((tab) => {
          const content = interpretations[tab.id];
          if (!content) return null;
          return (
            <div key={tab.id} className="space-y-4 py-4 border-b border-outline-variant/15 page-break-inside-avoid">
              <h3 className="text-sm font-headline-md text-primary uppercase tracking-widest border-b border-outline-variant/25 pb-1">
                {t(`dashboard.tabs.${tab.tabKey}`)}
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
