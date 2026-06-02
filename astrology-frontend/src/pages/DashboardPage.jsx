import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getChart, getInterpretation } from '../services/api';

// Child Components
import ChartSidebar, { TAB_CHART_CONFIG } from '../components/ChartSidebar';
import PlanetTable   from '../components/PlanetTable';
import TransitBanner from '../components/TransitBanner';
import CosmicSummary from '../components/CosmicSummary';
import TabNavigation from '../components/TabNavigation';
import RemedyCards   from '../components/RemedyCards';

export default function DashboardPage() {
  const { chartId } = useParams();
  const navigate    = useNavigate();

  const [chartData,    setChartData]    = useState(null);
  const [loadingChart, setLoadingChart] = useState(true);
  const [chartError,   setChartError]   = useState('');

  // Tab state
  const [activeTab,        setActiveTab]        = useState(1);
  const [interpretations,  setInterpretations]  = useState({});
  const [tabLoading,       setTabLoading]       = useState({});
  const [tabError,         setTabError]         = useState({});

  // Chart toggle within a tab
  const [activeChartIdx, setActiveChartIdx] = useState(0);

  // Reset chart toggle when tab changes
  useEffect(() => { setActiveChartIdx(0); }, [activeTab]);

  // ── 1. Fetch chart ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!chartId) return;
    const fetchChart = async () => {
      try {
        setLoadingChart(true);
        setChartError('');
        const data = await getChart(chartId);
        setChartData(data);
      } catch (err) {
        console.error(err);
        setChartError('Could not retrieve your planetary chart. Please return and try again.');
      } finally {
        setLoadingChart(false);
      }
    };
    fetchChart();
  }, [chartId]);

  // ── 2. Stream interpretation for active tab ─────────────────────────────
  useEffect(() => {
    if (!chartId || loadingChart || chartError) return;
    if (interpretations[activeTab]) return; // already loaded

    const streamTab = async () => {
      setTabLoading((prev)  => ({ ...prev, [activeTab]: true  }));
      setTabError((prev)    => ({ ...prev, [activeTab]: ''    }));
      setInterpretations((prev) => ({ ...prev, [activeTab]: '' }));

      try {
        await getInterpretation(chartId, activeTab, (chunk) => {
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

  // ── Loading state ────────────────────────────────────────────────────────
  if (loadingChart) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-6 gap-6">
        <div className="relative w-14 h-14 flex items-center justify-center">
          <span className="material-symbols-outlined text-primary-container text-[44px] animate-spin">
            progress_activity
          </span>
          <span className="absolute inset-0 rounded-full border border-primary/20 animate-ping opacity-50" />
        </div>
        <p className="font-headline-md text-primary text-lg uppercase tracking-widest animate-pulse">
          Channeling Celestial Blueprints…
        </p>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (chartError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
        <div className="glass-card max-w-[440px] w-full p-10 rounded-2xl border border-error/25 shadow-xl flex flex-col items-center gap-5">
          <span
            className="material-symbols-outlined text-error text-[48px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            warning
          </span>
          <h2 className="font-headline-md text-error text-xl uppercase tracking-wider">
            ✦ System Warning ✦
          </h2>
          <p className="text-on-surface-variant text-sm leading-relaxed">{chartError}</p>
          <button
            id="returnHomeBtn"
            onClick={() => navigate('/')}
            className="blueprint-button shimmer-button max-w-xs w-full"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Return to Birth Chamber
          </button>
        </div>
      </div>
    );
  }

  // ── Dasha display ────────────────────────────────────────────────────────
  const dasha = chartData?.dasha || {};
  const currentDashaText =
    dasha.mahadasha && dasha.antardasha
      ? `${dasha.mahadasha} MD · ${dasha.antardasha} AD`
      : 'Calculations Active';

  // ── Planet table data: follows active chart idx ──────────────────────────
  const tabConfig    = TAB_CHART_CONFIG[activeTab] || TAB_CHART_CONFIG[1];
  const currentKey   = tabConfig?.keys?.[activeChartIdx];
  const tablePlanets = currentKey && chartData?.[currentKey]?.planets
    ? chartData[currentKey].planets
    : chartData?.planets;

  return (
    <div className="w-full min-h-screen bg-background text-on-background font-body-md yantra-bg flex flex-col selection:bg-primary-container/30">

      {/* ── Sticky Header ────────────────────────────────────────────────── */}
      <header className="w-full bg-white/85 backdrop-blur-xl border-b border-outline-variant/25 sticky top-0 z-50">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-8 md:px-10 py-3.5 flex items-center justify-between gap-4">

          {/* Logo */}
          <button
            id="logoHomeBtn"
            onClick={() => navigate('/')}
            className="font-wordmark text-[18px] sm:text-[20px] tracking-[0.15em] text-primary hover:opacity-80 transition-opacity cursor-pointer bg-transparent border-none p-0"
            aria-label="Go to home page"
          >
            TRIKAL DARSHI
          </button>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* Name + Dasha */}
            <div className="hidden sm:flex flex-col items-end">
              <span className="font-label-sm text-[11px] font-bold text-on-surface uppercase tracking-widest leading-tight">
                {chartData?.full_name || 'Seeker'}
              </span>
              <div className="flex items-center gap-1.5 bg-primary/8 px-2.5 py-0.5 rounded-full border border-primary/15 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="font-label-sm text-[9px] text-primary font-bold uppercase tracking-wider">
                  {currentDashaText}
                </span>
              </div>
            </div>

            {/* Action icons */}
            <div className="flex items-center gap-2">
              <button
                id="notifBtn"
                aria-label="Notifications"
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors cursor-pointer bg-transparent border-none"
              >
                <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
                  notifications
                </span>
              </button>
              <button
                id="accountBtn"
                aria-label="Account"
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors cursor-pointer bg-transparent border-none"
              >
                <span
                  className="material-symbols-outlined text-primary text-[28px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  account_circle
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <main className="flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-8 md:px-10 py-5 flex flex-col">

        {/* Jupiter Transit Banner */}
        <TransitBanner />

        {/* Two-column grid */}
        <div className="dashboard-grid">

          {/* ── Left sidebar ────────────────────────────────────────────── */}
          <aside className="dashboard-sidebar flex flex-col gap-4">
            {/* Chart viewer */}
            <ChartSidebar
              activeTab={activeTab}
              chartData={chartData}
              activeChartIdx={activeChartIdx}
              setActiveChartIdx={setActiveChartIdx}
            />

            {/* Planet positions table */}
            <div className="dashboard-card overflow-hidden animate-up delay-2" style={{ padding: 0 }}>
              <PlanetTable planets={tablePlanets} />
            </div>
          </aside>

          {/* ── Right content ────────────────────────────────────────────── */}
          <div className="dashboard-content flex flex-col gap-4">

            {/* Cosmic Blueprint Summary */}
            <div className="animate-up delay-3">
              <CosmicSummary chartData={chartData} />
            </div>

            {/* Tab navigation + interpretation */}
            <div className="animate-up delay-4 flex flex-col gap-4">
              <TabNavigation
                chartId={chartId}
                activeTab={activeTab}
                onTabChange={(tabId) => setActiveTab(tabId)}
                interpretations={interpretations}
                tabLoadingState={tabLoading}
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
            </div>

            {/* Remedy cards — shown only on Tab 8 */}
            {activeTab === 8 && !tabLoading[8] && interpretations[8] && (
              <div className="animate-up">
                <RemedyCards remedyText={interpretations[8]} />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="w-full border-t border-outline-variant/20 bg-white/70 mt-12">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-8 md:px-10 py-7 flex flex-col sm:flex-row justify-between items-center gap-4">
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

    </div>
  );
}
