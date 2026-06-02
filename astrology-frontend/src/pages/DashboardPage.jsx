import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getChart, getInterpretation } from '../services/api';

// Child Components
import ChartSidebar from '../components/ChartSidebar';
import PlanetTable from '../components/PlanetTable';
import TransitBanner from '../components/TransitBanner';
import CosmicSummary from '../components/CosmicSummary';
import TabNavigation from '../components/TabNavigation';
import RemedyCards from '../components/RemedyCards';

export default function DashboardPage() {
  const { chartId } = useParams();
  const navigate = useNavigate();

  const [chartData, setChartData] = useState(null);
  const [loadingChart, setLoadingChart] = useState(true);
  const [chartError, setChartError] = useState('');

  // Tab Interpretation States (Tabs 1 to 8)
  const [activeTab, setActiveTab] = useState(1);
  const [interpretations, setInterpretations] = useState({});
  const [tabLoading, setTabLoading] = useState({});
  const [tabError, setTabError] = useState({});

  // ── 1. Fetch Chart Data on Load ──────────────────────────────────────────
  useEffect(() => {
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

    if (chartId) {
      fetchChart();
    }
  }, [chartId]);

  // ── 2. Lazy Stream Interpretations on Active Tab Changes ─────────────────
  useEffect(() => {
    if (!chartId || loadingChart || chartError) return;
    if (interpretations[activeTab]) return;

    const streamTab = async () => {
      setTabLoading((prev) => ({ ...prev, [activeTab]: true }));
      setTabError((prev) => ({ ...prev, [activeTab]: '' }));
      setInterpretations((prev) => ({ ...prev, [activeTab]: '' }));

      try {
        await getInterpretation(chartId, activeTab, (chunk) => {
          setInterpretations((prev) => ({
            ...prev,
            [activeTab]: (prev[activeTab] || '') + chunk
          }));
        });
      } catch (err) {
        console.error(err);
        setTabError((prev) => ({
          ...prev,
          [activeTab]: 'Planetary alignment stream interrupted. Click below to retry.'
        }));
      } finally {
        setTabLoading((prev) => ({ ...prev, [activeTab]: false }));
      }
    };

    streamTab();
  }, [chartId, activeTab, loadingChart, chartError]);

  // ── Loading State ────────────────────────────────────────────────────────
  if (loadingChart) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
        <div className="relative w-16 h-16 flex items-center justify-center text-primary-container">
          <span className="material-symbols-outlined text-[48px] animate-spin">
            progress_activity
          </span>
          <div className="absolute inset-0 border border-primary/20 rounded-full animate-ping"></div>
        </div>
        <p className="mt-6 font-headline-md text-primary text-xl uppercase tracking-widest animate-pulse">
          Channeling Celestial Blueprints...
        </p>
      </div>
    );
  }

  // ── Error State ──────────────────────────────────────────────────────────
  if (chartError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
        <div className="glass-card max-w-[450px] p-10 rounded-xl border border-error/30 shadow-2xl space-y-6">
          <span className="material-symbols-outlined text-error text-[48px]">warning</span>
          <h2 className="font-headline-md text-error text-xl uppercase tracking-wider">
            ✦ System Warning ✦
          </h2>
          <p className="text-on-surface-variant text-sm leading-relaxed">{chartError}</p>
          <button
            onClick={() => navigate('/')}
            className="shimmer-button bg-primary-container text-on-primary px-6 py-3 rounded-lg font-bold text-sm tracking-wide shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            Return to Birth Chamber
          </button>
        </div>
      </div>
    );
  }

  // Parse Dasha Info
  const dasha = chartData?.dasha || {};
  const currentDashaText =
    dasha.mahadasha && dasha.antardasha
      ? `${dasha.mahadasha} MD • ${dasha.antardasha} AD`
      : 'Calculations Active';

  return (
    <div className="w-full min-h-screen bg-background text-on-background font-body-md yantra-bg flex flex-col items-center selection:bg-primary-container selection:text-on-primary-container">
      
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="w-full bg-surface/80 backdrop-blur-xl border-b border-outline-variant/30 sticky top-0 z-50 flex justify-center">
        <div className="flex justify-between items-center px-5 md:px-10 py-4 w-full max-w-[1280px]">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <span className="font-wordmark text-[20px] md:text-[22px] tracking-[0.15em] text-primary">
              TRIKAL DARSHI
            </span>
          </div>

          <div className="flex items-center gap-5">
            <div className="flex flex-col items-end">
              <span className="font-label-sm text-xs font-semibold text-on-surface uppercase tracking-widest">
                {chartData?.full_name || 'Seeker'}
              </span>
              <div className="flex items-center gap-1 bg-primary-container/15 px-2.5 py-0.5 rounded-full border border-primary/20 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                <span className="font-label-sm text-[10px] text-primary font-bold uppercase tracking-wider">
                  {currentDashaText}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-primary transition-colors">
                notifications
              </span>
              <span
                className="material-symbols-outlined text-primary cursor-pointer text-[28px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                account_circle
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Content ────────────────────────────────────────────────── */}
      <main className="w-full max-w-[1280px] mx-auto px-5 md:px-10 py-6 flex-1 flex flex-col">
        {/* Jupiter Transit Alert */}
        <TransitBanner />

        {/* Main Grid: Sidebar + Content */}
        <div className="dashboard-grid">
          {/* Left Column: Astro-Technical Data */}
          <aside className="dashboard-sidebar flex flex-col gap-5">
            {/* Tab-aware Chart Sidebar — switches chart based on active tab */}
            <ChartSidebar activeTab={activeTab} chartData={chartData} />

            {/* Planet Positions Table Card — shown on all tabs */}
            <div className="dashboard-card overflow-hidden animate-up delay-2" style={{ padding: 0 }}>
              <PlanetTable planets={chartData?.planets} />
            </div>
          </aside>

          {/* Right Column: Insights, Tabs & Remedies */}
          <div className="dashboard-content flex flex-col gap-5">
            {/* Cosmic Blueprint Summary */}
            <div className="animate-up delay-3">
              <CosmicSummary chartData={chartData} />
            </div>

            {/* 8-Tab interpretation deck */}
            <div className="animate-up delay-4 flex flex-col gap-5">
              <TabNavigation
                chartId={chartId}
                activeTab={activeTab}
                onTabChange={(tabId) => setActiveTab(tabId)}
                interpretations={interpretations}
                tabLoadingState={tabLoading}
              />

              {tabError[activeTab] && (
                <div className="flex flex-col items-center gap-3 text-error bg-error/5 p-5 rounded-xl border border-error/20 text-center">
                  <p className="text-sm font-medium">{tabError[activeTab]}</p>
                  <button
                    onClick={() => {
                      setInterpretations((prev) => {
                        const copy = { ...prev };
                        delete copy[activeTab];
                        return copy;
                      });
                    }}
                    className="bg-error/15 border border-error/35 rounded-lg text-error hover:bg-error/25 px-4 py-2 text-xs font-bold transition-all cursor-pointer"
                  >
                    Retry Stream
                  </button>
                </div>
              )}
            </div>

            {/* Remedy prescriptions (only on Tab 8) */}
            {activeTab === 8 && !tabLoading[8] && interpretations[8] && (
              <div className="animate-up">
                <RemedyCards remedyText={interpretations[8]} />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="w-full border-t border-outline-variant/20 bg-surface-container-lowest flex justify-center mt-12">
        <div className="w-full max-w-[1280px] mx-auto px-5 md:px-10 py-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col items-center md:items-start gap-2">
            <span className="font-wordmark text-primary text-[16px] tracking-wider font-semibold">
              TRIKAL DARSHI
            </span>
            <p className="font-body-md text-xs text-on-surface-variant font-medium">
              © 2024 Ancient Wisdom, Modern Precision
            </p>
          </div>
          <div className="flex gap-6 mt-4 md:mt-0 text-xs font-medium text-on-surface-variant">
            <a href="#" className="hover:text-primary transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              Terms of Service
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              Consultation Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
