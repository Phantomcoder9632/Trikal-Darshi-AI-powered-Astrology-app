import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getChart, getInterpretation, getGenerationProgress, updateChart, getUserCharts, getAllInterpretations } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import i18n, { backendLangToI18n } from '../i18n';


// Child Components
import ChartSidebar, { TAB_CHART_CONFIG } from '../components/ChartSidebar';
import CosmicSummary from '../components/CosmicSummary';
import TabNavigation, { TabContentCard } from '../components/TabNavigation';
import RemedyCards from '../components/RemedyCards';
import LanguageSelect from '../components/LanguageSelect';

// Helper: get 1-2 capital initials from a full name
function getInitials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

export default function DashboardPage() {
  const { chartId } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  const [chartData, setChartData] = useState(null);
  const [loadingChart, setLoadingChart] = useState(true);
  const [chartError, setChartError] = useState('');

  // Tab state
  const [activeTab, setActiveTab] = useState('basics');
  const [interpretations, setInterpretations] = useState({});
  const [tabLoading, setTabLoading] = useState({});
  const [tabError, setTabError] = useState({});

  // Background pre-generation progress
  const [bgProgress, setBgProgress] = useState(null);
  const pollIntervalRef = useRef(null);

  // Edit details modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    full_name: '',
    date_of_birth: '',
    time_of_birth: '',
    birth_time_confidence: 'exact',
    city_of_birth: '',
    current_city: '',
    language: 'english',
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Drawer / Theme State
  const [showDrawer, setShowDrawer] = useState(false);
  const [savedCharts, setSavedCharts] = useState([]);
  const [currentTheme, setCurrentTheme] = useState(
    localStorage.getItem('app-theme') || 'theme-vedic-gold'
  );

  // Reset mobile sidebar toggle on tab change
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  useEffect(() => {
    setShowMobileSidebar(false);
  }, [activeTab]);

  const handleThemeChange = (newTheme) => {
    setCurrentTheme(newTheme);
    localStorage.setItem('app-theme', newTheme);
    document.body.className = newTheme;
  };

  const handleLanguageChange = async (e) => {
    const newLang = e.target.value; // 'english' / 'hindi' / 'bengali'
    if (!chartData) return;

    setShowDrawer(false); // Close drawer to show transitions/loader
    const i18nCode = backendLangToI18n(newLang);
    i18n.changeLanguage(i18nCode);
    localStorage.setItem('trikal_lang_chosen', newLang);

    const updatePayload = {
      full_name: chartData.full_name,
      date_of_birth: chartData.date_of_birth,
      time_of_birth: chartData.time_of_birth ? chartData.time_of_birth.slice(0, 5) : '',
      birth_time_confidence: chartData.birth_time_confidence || 'exact',
      city_of_birth: chartData.city_of_birth,
      current_city: chartData.current_city || '',
      language: newLang,
    };

    try {
      setLoadingChart(true);
      const updatedData = await updateChart(chartId, updatePayload);

      if (updatedData.chart_id && updatedData.chart_id !== chartId) {
        navigate(`/dashboard/${updatedData.chart_id}`);
      } else {
        setChartData(updatedData);
        setInterpretations({});
        setTabLoading({});
        setTabError({});
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Failed to change language:', err);
    } finally {
      setLoadingChart(false);
    }
  };

  const handleOpenEdit = () => {
    if (!chartData) return;
    setEditFormData({
      full_name: chartData.full_name || '',
      date_of_birth: chartData.date_of_birth || '',
      time_of_birth: chartData.time_of_birth ? chartData.time_of_birth.slice(0, 5) : '',
      birth_time_confidence: chartData.birth_time_confidence || 'exact',
      city_of_birth: chartData.city_of_birth || '',
      current_city: chartData.current_city || '',
      language: chartData.language || 'english',
    });
    setEditError('');
    setShowEditModal(true);
  };

  const handleEditCancel = () => {
    setShowEditModal(false);
    if (chartData?.language) {
      i18n.changeLanguage(backendLangToI18n(chartData.language));
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
    if (name === 'language') {
      i18n.changeLanguage(backendLangToI18n(value));
      localStorage.setItem('trikal_lang_chosen', value);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editFormData.full_name || !editFormData.date_of_birth || !editFormData.time_of_birth || !editFormData.city_of_birth) {
      setEditError('Please fill in all required birth parameters marked with *');
      return;
    }

    setEditLoading(true);
    setEditError('');

    try {
      const updatedData = await updateChart(chartId, editFormData);

      // Close modal first
      setShowEditModal(false);

      // If the chart ID changed (due to language update creating a separate profile card), navigate to it
      if (updatedData.chart_id && updatedData.chart_id !== chartId) {
        navigate(`/dashboard/${updatedData.chart_id}`);
      } else {
        // Update local state in place
        setChartData(updatedData);
        if (updatedData.language) {
          i18n.changeLanguage(backendLangToI18n(updatedData.language));
        }

        // Invalidate existing interpretations so they regenerate for new placements
        setInterpretations({});
        setTabError({});
      }

      // Scroll back up to reset view
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      setEditError(err.response?.data?.detail || err.message || 'Failed to update chart details. Please try again.');
    } finally {
      setEditLoading(false);
    }
  };

  // Chart toggle within a tab
  const [activeChartIdx, setActiveChartIdx] = useState(0);

  // Reset chart toggle when tab changes
  useEffect(() => { setActiveChartIdx(0); }, [activeTab]);

  // Fetch saved charts list
  useEffect(() => {
    async function loadSavedCharts() {
      try {
        const data = await getUserCharts();
        setSavedCharts(data || []);
      } catch (err) {
        console.error('Failed to load user charts in dashboard:', err);
      }
    }
    if (user) {
      loadSavedCharts();
    }
  }, [user, chartId]);

  // ── 1. Fetch chart ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!chartId) return;
    const fetchChart = async () => {
      try {
        setLoadingChart(true);
        setChartError('');
        setInterpretations({});
        setTabLoading({});
        setTabError({});
        const data = await getChart(chartId);
        setChartData(data);
        
        try {
          const chartLang = data?.language || 'english';
          i18n.changeLanguage(backendLangToI18n(chartLang));
          const interpretationsData = await getAllInterpretations(chartId, chartLang);
          setInterpretations(interpretationsData || {});
        } catch (interpErr) {
          console.warn('Failed to load interpretations on mount:', interpErr);
        }
      } catch (err) {
        console.error(err);
        if (err.response?.status === 401) {
          logout();
          navigate('/', { replace: true });
          return;
        }
        setChartError(err.response?.data?.detail || err.message || 'Could not retrieve your planetary chart. Please return and try again.');
      } finally {
        setLoadingChart(false);
      }
    };
    fetchChart();
  }, [chartId]);

  // ── 2. Stream interpretation for active tab ─────────────────────────────
  useEffect(() => {
    if (!chartId || loadingChart || chartError) return;
    if (typeof activeTab !== 'number' && activeTab !== 'education') return;
    if (interpretations[activeTab]) return; // already loaded

    const streamTab = async () => {
      setTabLoading((prev) => ({ ...prev, [activeTab]: true }));
      setTabError((prev) => ({ ...prev, [activeTab]: '' }));
      setInterpretations((prev) => ({ ...prev, [activeTab]: '' }));

      const targetTabNumber = activeTab === 'education' ? 11 : activeTab;

      try {
        const chartLang = chartData?.language || 'english';
        await getInterpretation(chartId, targetTabNumber, chartLang, (chunk) => {
          setInterpretations((prev) => ({
            ...prev,
            [activeTab]: (prev[activeTab] || '') + chunk,
          }));
        });
      } catch (err) {
        console.error(err);
        setTabError((prev) => ({
          ...prev,
          [activeTab]: 'Planetary alignment stream interrupted. Click Retry below.',
        }));
      } finally {
        setTabLoading((prev) => ({ ...prev, [activeTab]: false }));
      }
    };

    streamTab();
  }, [chartId, activeTab, loadingChart, chartError]);

  // ── 3. Poll background pre-generation progress ──────────────────────────
  useEffect(() => {
    if (!chartId || loadingChart || chartError) return;

    const poll = async () => {
      const data = await getGenerationProgress(chartId);
      if (!data) return;
      setBgProgress(data);
      // Stop polling once all tabs are generated
      if (data.is_complete) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
        // Auto-hide the badge after 4 seconds
        setTimeout(() => setBgProgress(null), 4000);
      }
    };

    // Initial poll immediately, then every 4 seconds
    poll();
    pollIntervalRef.current = setInterval(poll, 4000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [chartId, loadingChart, chartError]);

  const generateMissingTabs = async () => {
    const allTabsToCheck = [1, 4, 'education', 5, 6, 7, 9, 10, 2, 3, 8];
    const missingTabs = allTabsToCheck.filter(
      (tabId) => !interpretations[tabId] && !tabLoading[tabId]
    );
    
    for (const tabId of missingTabs) {
      setTabLoading((prev) => ({ ...prev, [tabId]: true }));
      setTabError((prev) => ({ ...prev, [tabId]: '' }));
      setInterpretations((prev) => ({ ...prev, [tabId]: '' }));

      const targetTabNumber = tabId === 'education' ? 11 : tabId;

      try {
        const chartLang = chartData?.language || 'english';
        await getInterpretation(chartId, targetTabNumber, chartLang, (chunk) => {
          setInterpretations((prev) => ({
            ...prev,
            [tabId]: (prev[tabId] || '') + chunk,
          }));
        });
      } catch (err) {
        console.error(`Error generating tab ${tabId}:`, err);
        setTabError((prev) => ({
          ...prev,
          [tabId]: 'Generation failed. Click retry or try again.',
        }));
      } finally {
        setTabLoading((prev) => ({ ...prev, [tabId]: false }));
      }
    }
  };

  // ── Loading state ────────────────────────────────────────────────────────
  if (loadingChart) {
    return (
      <div className="page-loading">
        <div className="relative w-14 h-14 flex items-center justify-center">
          <span className="material-symbols-outlined text-primary-container text-[44px] animate-spin">
            progress_activity
          </span>
          <span className="absolute inset-0 rounded-full border border-primary/20 animate-ping opacity-50" />
        </div>
        <p className="font-headline-md text-primary text-lg uppercase tracking-widest animate-pulse">
          {t('dashboard.channeling_blueprints')}
        </p>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (chartError) {
    return (
      <div className="page-error">
        <div className="glass-card max-w-[440px] w-full p-10 rounded-2xl border border-error/25 shadow-xl flex flex-col items-center gap-5">
          <span
            className="material-symbols-outlined text-error text-[48px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            warning
          </span>
          <h2 className="font-headline-md text-error text-xl uppercase tracking-wider">
            ✦ {t('dashboard.system_warning')} ✦
          </h2>
          <p className="text-on-surface-variant text-sm leading-relaxed">{chartError}</p>
          <button
            id="returnHomeBtn"
            onClick={() => navigate('/')}
            className="blueprint-button shimmer-button max-w-xs w-full"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            {t('dashboard.return_to_birth_chamber')}
          </button>
        </div>
      </div>
    );
  }

  // ── Dasha display ────────────────────────────────────────────────────────
  const dasha = chartData?.dasha || {};
  const currentDashaText =
    dasha.mahadasha && dasha.antardasha
      ? `${t(`dashboard.values.${dasha.mahadasha.toLowerCase()}`, { defaultValue: dasha.mahadasha })} MD · ${t(`dashboard.values.${dasha.antardasha.toLowerCase()}`, { defaultValue: dasha.antardasha })} AD`
      : t('dashboard.values.active');

  // ── Planet table data: follows active chart idx ──────────────────────────
  const tabConfig = TAB_CHART_CONFIG[activeTab] || TAB_CHART_CONFIG[1];
  const currentKey = tabConfig?.keys?.[activeChartIdx];
  const tablePlanets = currentKey && chartData?.[currentKey]?.planets
    ? chartData[currentKey].planets
    : chartData?.planets;

  return (
    <div className="w-full min-h-screen bg-[#FBF6EA] text-[#0E1A37] font-body-md flex flex-col selection:bg-[#F0DFAF]">

      {/* ── Sticky Header ────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full bg-[#FFFDF6]/95 backdrop-blur-md border-b border-[#E8D5A7]/70 shadow-xs">
        <div className="max-w-[1580px] mx-auto px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between">

          {/* Logo */}
          <button
            id="logoHomeBtn"
            onClick={() => navigate('/')}
            className="flex items-center gap-3 bg-transparent border-none p-0 cursor-pointer hover:opacity-90 transition-opacity"
            aria-label="Go to home page"
          >
            <div className="w-9 h-9 rounded-lg bg-[#1F3A6B] text-[#FFFDF6] flex items-center justify-center font-['Fraunces',serif] text-lg font-bold shadow-xs border border-[#D9A63C]/40">
              ✦
            </div>
            <div className="text-left">
              <span className="font-['Fraunces',serif] text-base sm:text-lg font-bold tracking-tight text-[#022454] block">
                TRIKAL DARSHI
              </span>
              <span className="text-[9.5px] text-[#7b5800] uppercase tracking-widest font-semibold block">
                11 Soul Dimensions
              </span>
            </div>
          </button>

          {/* Right side */}
          <div className="flex items-center gap-3 sm:gap-4">

            {/* ── Background pre-gen progress pill ── */}
            {bgProgress && !bgProgress.is_complete && (
              <div
                id="bgProgressPill"
                className="hidden sm:flex items-center gap-2 bg-[#FAF3E3] border border-[#D9A63C]/40 px-3 py-1.5 rounded-full"
                title={`${bgProgress.completed_tabs.length} of ${bgProgress.total_tabs} sections pre-generated`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#D9A63C] animate-ping" />
                <span className="text-[10px] text-[#7b5800] font-bold uppercase tracking-wider whitespace-nowrap">
                  ✦ {t('dashboard.progress_badge', { count: bgProgress.completed_tabs.length })}
                </span>
                <div className="w-14 h-1 rounded-full bg-[#1F3A6B]/15 overflow-hidden">
                  <div
                    className="h-full bg-[#1F3A6B] rounded-full transition-all duration-700"
                    style={{ width: `${bgProgress.percent}%` }}
                  />
                </div>
              </div>
            )}

            {/* All done badge */}
            {bgProgress && bgProgress.is_complete && (
              <div
                id="bgCompletePill"
                className="hidden sm:flex items-center gap-1.5 bg-[#FFFDF6] border border-[#1F3A6B]/15 px-3 py-1 rounded-full text-[#1F3A6B]"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#D9A63C]" />
                <span className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                  All 11 Chapters Ready
                </span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => navigate(`/chat/${chartId}`)}
                aria-label="Ask AI Astrologer"
                title="Consult AI Astrologer"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1F3A6B] hover:bg-[#022454] text-[#FFFDF6] border border-[#D9A63C] transition-all cursor-pointer text-xs font-semibold shadow-xs"
              >
                <span className="material-symbols-outlined text-[16px] text-[#D9A63C]">
                  auto_awesome
                </span>
                <span className="hidden sm:inline">Ask AI Jyotishi</span>
              </button>

              <button
                onClick={logout}
                aria-label="Log Out"
                title="Log Out"
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#BA1A1A]/10 hover:text-[#BA1A1A] text-[#4A567A] transition-colors cursor-pointer bg-transparent border border-transparent hover:border-[#BA1A1A]/20"
              >
                <span className="material-symbols-outlined text-[18px]">
                  logout
                </span>
              </button>
            </div>

            {/* Profile Drawer Avatar Trigger */}
            <button
              type="button"
              className="flex items-center gap-2 bg-[#FFFDF6] hover:bg-[#F5EEDD] border border-[#E8D5A7] rounded-lg p-1.5 transition-all cursor-pointer text-left"
              onClick={() => setShowDrawer(true)}
              title="Open Profile Drawer"
            >
              <div className="w-6 h-6 rounded bg-[#1F3A6B] text-[#FFFDF6] text-[10px] font-bold flex items-center justify-center">
                {getInitials(chartData?.full_name || 'Arjun Sharma')}
              </div>
              <span className="hidden md:inline-block text-xs font-semibold text-[#0E1A37] max-w-[100px] truncate">
                {chartData?.full_name || 'Profile'}
              </span>
              <span className="material-symbols-outlined text-[16px] text-[#4A567A]">
                menu
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <main className="flex-1 w-full max-w-[1580px] mx-auto px-4 sm:px-6 lg:px-10 py-6 flex flex-col">

        {/* ── Cosmic Summary (5 Metric Chips + Soul Folio Progress Card) ── */}
        <CosmicSummary
          chartData={chartData}
          bgProgress={bgProgress}
          onGenerateFullReport={generateMissingTabs}
          isGeneratingAll={Object.values(tabLoading).some(Boolean)}
        />

        {/* ── Tab Navigation Headers (11 Numbered Tabs Bar) ── */}
        <div className="w-full">
          <TabNavigation
            chartId={chartId}
            activeTab={activeTab}
            onTabChange={(tabId) => setActiveTab(tabId)}
            interpretations={interpretations}
            tabLoadingState={tabLoading}
            chartData={chartData}
            onGenerateMissingTabs={generateMissingTabs}
          />
        </div>

        {/* 2-Column Grid Layout: 5 Cols (Left Sidebar & Chart) : 7 Cols (Right Reading Exegesis) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start mt-2">

          {/* ── Left Column: Chart, Varga Selector & Diagnostics (~5 cols) ── */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <ChartSidebar
              activeTab={activeTab}
              chartData={chartData}
              activeChartIdx={activeChartIdx}
              setActiveChartIdx={setActiveChartIdx}
              onOpenEditModal={handleOpenEdit}
            />
          </div>

          {/* ── Right Column: Calm Reading Layer & Dignities (~7 cols) ── */}
          <div className="lg:col-span-7 flex flex-col gap-6">

            {/* Tab Content Card (Editorial Chapter Layout) */}
            <TabContentCard
              chartId={chartId}
              activeTab={activeTab}
              interpretations={interpretations}
              tabLoadingState={tabLoading}
              chartData={chartData}
              onGenerateMissingTabs={generateMissingTabs}
            />

            {/* Tab error banner */}
            {tabError[activeTab] && (
              <div className="flex flex-col items-center gap-3 bg-error/5 border border-error/20 rounded-2xl p-5 text-center">
                <span
                  className="material-symbols-outlined text-error text-[28px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  error
                </span>
                <p className="text-error text-sm font-medium">{tabError[activeTab]}</p>
                <button
                  id={`retryTabBtn-${activeTab}`}
                  onClick={() => {
                    setInterpretations((prev) => {
                      const copy = { ...prev };
                      delete copy[activeTab];
                      return copy;
                    });
                  }}
                  className="bg-error/10 border border-error/30 rounded-xl text-error hover:bg-error/20 px-5 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  Retry Stream
                </button>
              </div>
            )}

            {/* Remedy cards — shown additionally on Tab 8 */}
            {activeTab === 8 && !tabLoading[8] && interpretations[8] && (
              <RemedyCards remedyText={interpretations[8]} />
            )}
          </div>
        </div>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="w-full border-t border-outline-variant/20 bg-white/70 mt-12">
        <div className="max-w-[1650px] mx-auto px-4 sm:px-8 md:px-10 py-7 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex flex-col items-center sm:items-start gap-1">
            <span className="font-wordmark text-primary text-[15px] tracking-wider">
              TRIKAL DARSHI
            </span>
            <p className="text-xs text-on-surface-variant">
              © 2024 · Ancient Wisdom, Modern Precision
            </p>
          </div>
          <nav className="flex gap-5 text-xs font-medium text-on-surface-variant">
            {['Privacy Policy', 'Terms of Service', 'Consultation Support'].map((item) => (
              <a key={item} href="#" className="hover:text-primary transition-colors">
                {item}
              </a>
            ))}
          </nav>
        </div>
      </footer>

      {/* ── Slide-over Profile Drawer ── */}
      {showDrawer && (
        <div
          className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
          onClick={() => setShowDrawer(false)}
        />
      )}
      <div
        className={`fixed top-0 right-0 bottom-0 h-full w-[85%] sm:w-[33%] md:w-[30%] lg:w-[26%] xl:w-[22%] bg-surface border-l border-outline-variant/30 shadow-2xl z-[101] flex flex-col transition-transform duration-300 ease-in-out ${showDrawer ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-5 border-b border-outline-variant/20">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-[24px]">
              settings_accessibility
            </span>
            <h3 className="text-sm font-headline-md font-bold tracking-wide text-on-surface">
              {t('dashboard.drawer.title')}
            </h3>
          </div>
          <button
            onClick={() => setShowDrawer(false)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-outline-variant/15 text-on-surface-variant transition-colors cursor-pointer bg-transparent border-none"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">

          {/* Section 1: Personal Details */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs uppercase font-bold tracking-widest text-primary">
                {t('dashboard.drawer.personal_details')}
              </h4>
              <button
                onClick={() => {
                  setShowDrawer(false);
                  handleOpenEdit();
                }}
                className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold cursor-pointer bg-transparent border-none"
              >
                <span className="material-symbols-outlined text-[12px]">edit</span>
                {t('dashboard.drawer.edit_birth_details')}
              </button>
            </div>
            {chartData && (
              <div className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/20 space-y-3">
                <div className="grid grid-cols-2 gap-y-3 text-xs">
                  <div>
                    <span className="text-outline/80 block uppercase tracking-wider text-[10px]">{t('dashboard.drawer.name')}</span>
                    <span className="font-semibold text-on-surface text-sm">{chartData.full_name}</span>
                  </div>
                  <div>
                    <span className="text-outline/80 block uppercase tracking-wider text-[10px]">{t('dashboard.drawer.confidence')}</span>
                    <span className="font-semibold text-on-surface capitalize text-sm">
                      {t(`home.form.confidence.${chartData.birth_time_confidence}`, { defaultValue: chartData.birth_time_confidence })}
                    </span>
                  </div>
                  <div>
                    <span className="text-outline/80 block uppercase tracking-wider text-[10px]">{t('dashboard.drawer.dob')}</span>
                    <span className="font-semibold text-on-surface text-sm">{chartData.date_of_birth}</span>
                  </div>
                  <div>
                    <span className="text-outline/80 block uppercase tracking-wider text-[10px]">{t('dashboard.drawer.tob')}</span>
                    <span className="font-semibold text-on-surface text-sm">{chartData.time_of_birth ? chartData.time_of_birth.slice(0, 5) : ''}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-outline/80 block uppercase tracking-wider text-[10px]">{t('dashboard.drawer.pob')}</span>
                    <span className="font-semibold text-on-surface text-sm">{chartData.city_of_birth}</span>
                  </div>
                  {chartData.current_city && (
                    <div className="col-span-2">
                      <span className="text-outline/80 block uppercase tracking-wider text-[10px]">{t('dashboard.drawer.current_city')}</span>
                      <span className="font-semibold text-on-surface text-sm">{chartData.current_city}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Saved Charts */}
          <div className="space-y-4">
            <h4 className="text-xs uppercase font-bold tracking-widest text-primary">
              {t('dashboard.drawer.saved_blueprints')}
            </h4>
            <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
              {savedCharts.length > 0 ? (
                savedCharts.map((chart) => (
                  <button
                    key={chart.chart_id}
                    onClick={() => {
                      setShowDrawer(false);
                      navigate(`/dashboard/${chart.chart_id}`);
                    }}
                    className={`w-full text-left p-3 rounded-lg border text-xs flex items-center justify-between transition-all cursor-pointer ${chart.chart_id === chartId
                        ? 'bg-primary/10 border-primary/30 text-primary font-bold'
                        : 'bg-surface-container-lowest border-outline-variant/15 hover:bg-outline-variant/10 text-on-surface'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-primary/70">
                        account_circle
                      </span>
                      <span>{chart.full_name}</span>
                    </div>
                    <span className="text-[10px] text-outline/70 font-normal">
                      {chart.date_of_birth}
                    </span>
                  </button>
                ))
              ) : (
                <div className="text-center py-4 text-xs text-outline/60 italic">
                  {t('dashboard.drawer.no_blueprints')}
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Read Another Chart */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase font-bold tracking-widest text-primary">
              {t('dashboard.drawer.cosmic_journey')}
            </h4>
            <button
              onClick={() => {
                setShowDrawer(false);
                navigate('/');
              }}
              className="w-full py-3 px-4 bg-primary text-on-primary rounded-xl font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer border-none"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              {t('dashboard.drawer.read_another')}
            </button>
          </div>

          {/* Section 3.5: Language Selection */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase font-bold tracking-widest text-primary flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>translate</span>
              {t('language.label')}
            </h4>
            <div className="bg-surface-container-low rounded-xl p-3 border border-outline-variant/20">
              <LanguageSelect
                id="drawer_language"
                name="drawer_language"
                value={chartData?.language || 'english'}
                onChange={handleLanguageChange}
              />
            </div>
          </div>

          {/* Section 4: Themes */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase font-bold tracking-widest text-primary">
              {t('dashboard.drawer.themes')}
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'theme-vedic-gold', label: 'Vedic Gold', bg: 'bg-[#f9f9f6]', text: 'text-[#1a1c1b]', border: 'border-[#d3c4b0]' },
                { id: 'theme-midnight', label: 'Midnight Cosmic', bg: 'bg-[#090a0f]', text: 'text-[#f1f1ee]', border: 'border-[#48443b]' },
                { id: 'theme-nebula', label: 'Nebula Indigo', bg: 'bg-[#0c0714]', text: 'text-[#f1edf7]', border: 'border-[#3f3154]' },
                { id: 'theme-solar', label: 'Solar Flare', bg: 'bg-[#120907]', text: 'text-[#f5eeee]', border: 'border-[#5c2d1c]' }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleThemeChange(t.id)}
                  className={`p-3 rounded-lg border text-xs flex flex-col gap-1 transition-all cursor-pointer bg-transparent text-left ${currentTheme === t.id
                      ? 'border-primary ring-2 ring-primary/30 font-bold'
                      : 'border-outline-variant/20 hover:bg-outline-variant/10'
                    }`}
                >
                  <span className="font-semibold text-on-surface">{t.label}</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`w-3.5 h-3.5 rounded-full ${t.bg} ${t.border} border`} />
                    <span className="text-[10px] text-outline/80">Preview</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Section 4.5: Ephemeris Standard */}
          <div className="space-y-2 p-3 bg-[#FFFDF6] border border-[#1F3A6B]/15 rounded-lg text-xs">
            <div className="flex items-center gap-1.5 text-[#7b5800] font-bold uppercase tracking-wider text-[10px]">
              <span className="material-symbols-outlined text-[14px]">science</span>
              <span>Ephemeris Standard</span>
            </div>
            <p className="text-[11px] text-[#4A567A] leading-relaxed">
              NASA JPL Swiss Ephemeris calculations locked to <strong>Lahiri True Chitrapaksha Ayanamsa (24° 11' 42")</strong>.
            </p>
          </div>

          {/* Section 5: Logout */}
          <div className="pt-4 border-t border-outline-variant/20">
            <button
              onClick={() => {
                setShowDrawer(false);
                logout();
              }}
              className="w-full py-3 px-4 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 border border-red-500/20 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              {t('dashboard.drawer.logout')}
            </button>
          </div>

        </div>
      </div>

      {/* ── Edit Birth Details Modal ── */}
      {showEditModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-background/60 backdrop-filter backdrop-blur-md"
            onClick={() => !editLoading && handleEditCancel()}
          />

          {/* Modal Container */}
          <div className="relative z-10 w-full max-w-[480px] bg-surface/90 border border-outline-variant/50 rounded-2xl shadow-2xl p-6 md:p-8 animate-up max-h-[90vh] overflow-y-auto">

            {/* Header */}
            <header className="flex items-center justify-between mb-6">
              <div>
                <span className="text-[10px] font-bold text-primary tracking-widest uppercase">{t('dashboard.modal.alignment')}</span>
                <h3 className="font-headline-md text-primary text-xl mt-1">{t('dashboard.modal.title')}</h3>
              </div>
              <button
                disabled={editLoading}
                onClick={handleEditCancel}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-outline-variant/20 text-on-surface-variant transition-colors cursor-pointer bg-transparent border-none"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </header>

            {/* Error Banner */}
            {editError && (
              <div className="mb-6 flex items-start gap-3 bg-error/8 border border-error/25 rounded-xl p-4 text-xs text-error font-medium">
                <span
                  className="material-symbols-outlined text-[16px] shrink-0 mt-0.5"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  error
                </span>
                <span>{editError}</span>
              </div>
            )}

            {editLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-center gap-6">
                <div className="relative w-12 h-12 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary-container text-[36px] animate-spin">
                    progress_activity
                  </span>
                  <span className="absolute inset-0 rounded-full border border-primary/20 animate-ping opacity-50" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-headline-md text-primary text-md tracking-wide">
                    {t('dashboard.modal.recalculating')}
                  </h4>
                  <p className="text-on-surface-variant text-xs font-accent-italic italic">
                    {t('dashboard.modal.realigning')}
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleEditSubmit} className="blueprint-form">

                {/* Full Name */}
                <div className="blueprint-form-group">
                  <label htmlFor="edit_full_name" className="blueprint-label">{t('home.form.fullName')} *</label>
                  <input
                    id="edit_full_name"
                    type="text"
                    name="full_name"
                    value={editFormData.full_name}
                    onChange={handleEditChange}
                    placeholder={t('home.form.fullName')}
                    autoComplete="name"
                    className="blueprint-input"
                  />
                </div>

                {/* Date of Birth */}
                <div className="blueprint-form-group">
                  <label htmlFor="edit_date_of_birth" className="blueprint-label">{t('home.form.dateOfBirth')} *</label>
                  <input
                    id="edit_date_of_birth"
                    type="date"
                    name="date_of_birth"
                    value={editFormData.date_of_birth}
                    onChange={handleEditChange}
                    max={new Date().toISOString().split('T')[0]}
                    className="blueprint-input"
                  />
                </div>

                {/* Time of Birth + Confidence */}
                <div className="blueprint-form-group">
                  <label htmlFor="edit_time_of_birth" className="blueprint-label">{t('home.form.timeOfBirth')} *</label>
                  <input
                    id="edit_time_of_birth"
                    type="time"
                    name="time_of_birth"
                    value={editFormData.time_of_birth}
                    onChange={handleEditChange}
                    className="blueprint-input"
                  />
                  <div className="blueprint-pill-container">
                    {[
                      { value: 'exact', label: t('home.form.confidence.exact') },
                      { value: 'approximate', label: t('home.form.confidence.approximate') },
                      { value: 'unknown', label: t('home.form.confidence.unknown') },
                    ].map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setEditFormData((prev) => ({ ...prev, birth_time_confidence: value }))}
                        className={`blueprint-pill${editFormData.birth_time_confidence === value ? ' active' : ''}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* City of Birth */}
                <div className="blueprint-form-group">
                  <label htmlFor="edit_city_of_birth" className="blueprint-label">{t('home.form.cityOfBirth')} *</label>
                  <div className="blueprint-input-row">
                    <span className="material-symbols-outlined text-outline text-[18px] shrink-0">
                      location_on
                    </span>
                    <input
                      id="edit_city_of_birth"
                      type="text"
                      name="city_of_birth"
                      value={editFormData.city_of_birth}
                      onChange={handleEditChange}
                      placeholder="e.g. Kolkata, West Bengal"
                      autoComplete="off"
                      className="blueprint-input"
                    />
                  </div>
                </div>

                {/* Current City */}
                <div className="blueprint-form-group">
                  <label htmlFor="edit_current_city" className="blueprint-label">
                    {t('home.form.currentCity')}{' '}
                    <span className="font-normal normal-case opacity-60">{t('home.form.optional')}</span>
                  </label>
                  <div className="blueprint-input-row">
                    <span className="material-symbols-outlined text-outline text-[18px] shrink-0">
                      my_location
                    </span>
                    <input
                      id="edit_current_city"
                      type="text"
                      name="current_city"
                      value={editFormData.current_city}
                      onChange={handleEditChange}
                      placeholder="e.g. Mumbai, Maharashtra"
                      autoComplete="off"
                      className="blueprint-input"
                    />
                  </div>
                </div>

                {/* Chart Language */}
                <div className="blueprint-form-group">
                  <label htmlFor="edit_language" className="blueprint-label">
                    <span className="material-symbols-outlined" style={{ fontSize: 15, verticalAlign: 'middle', marginRight: 4 }}>translate</span>
                    {t('home.form.language')}
                  </label>
                  <LanguageSelect
                    id="edit_language"
                    name="language"
                    value={editFormData.language || 'english'}
                    onChange={handleEditChange}
                  />
                  <p style={{ fontSize: 11, opacity: 0.6, marginTop: 4, marginBottom: 0 }}>
                    {t('dashboard.modal.lang_warning')}
                  </p>
                </div>

                {/* Actions row */}
                <div className="flex items-center gap-3 mt-4">
                  <button
                    type="button"
                    onClick={handleEditCancel}
                    className="flex-1 py-3 border border-outline-variant/60 hover:border-outline text-outline hover:bg-outline-variant/10 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer bg-transparent"
                  >
                    {t('dashboard.modal.cancel')}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 blueprint-button shimmer-button mt-0"
                  >
                    <span className="material-symbols-outlined text-[16px]">refresh</span>
                    {t('dashboard.modal.recalculate')}
                  </button>
                </div>

              </form>
            )}
          </div>
        </div>
      )}

      {/* Slide-over Profile Drawer is handled above */}
    </div>
  );
}
