import React, { useState, useEffect } from 'react';
import DivisionalChart from './DivisionalChart';

/**
 * Tab-to-chart configuration.
 * Each tab shows specific charts, with optional toggle between them.
 */
const TAB_CHART_CONFIG = {
  1:  { charts: ['D1', 'chandra'],  labels: ['Lagna (D1)', 'Chandra'],  keys: [null, 'chandra_kundali']  },
  2:  { charts: ['D1'],             labels: ['Lagna (D1)'],             keys: [null]                      },
  3:  { charts: [],                 labels: [],                         keys: []                          }, // Numerology — no chart
  4:  { charts: ['D10', 'D1'],      labels: ['Dashamsha (D10)', 'Lagna (D1)'],  keys: ['dashamsha', null] },
  5:  { charts: ['D4', 'D1'],       labels: ['Chaturthamsa (D4)', 'Lagna (D1)'], keys: ['chaturthamsa', null] },
  6:  { charts: ['D9', 'D7'],       labels: ['Navamsha (D9)', 'Saptamsha (D7)'], keys: ['navamsha', 'saptamsha'] },
  7:  { charts: ['D30', 'surya'],   labels: ['Trimsamsa (D30)', 'Surya Kundali'], keys: ['trimsamsa', 'surya_kundali'] },
  8:  { charts: ['D1'],             labels: ['Lagna (D1)'],             keys: [null]                      },
  9:  { charts: ['D7', 'D9'],       labels: ['Saptamsha (D7)', 'Navamsha (D9)'], keys: ['saptamsha', 'navamsha'] },
  10: { charts: ['gochar', 'D1'],   labels: ['Gochar (Live)', 'Lagna (D1)'],  keys: ['gochar', null]       },
};

export default function ChartSidebar({ activeTab, chartData }) {
  const [activeChartIdx, setActiveChartIdx] = useState(0);

  // Reset to first chart whenever tab changes
  useEffect(() => {
    setActiveChartIdx(0);
  }, [activeTab]);

  const config = TAB_CHART_CONFIG[activeTab] || TAB_CHART_CONFIG[1];
  const { charts, labels, keys } = config;

  // If no charts for this tab (Numerology), render nothing
  if (!charts || charts.length === 0) {
    return null;
  }

  const currentChartType = charts[activeChartIdx] || 'D1';
  const currentKey       = keys[activeChartIdx];
  const hasToggle        = charts.length > 1;

  // Resolve the chart data for the current selection
  const resolvedChartData = currentKey
    ? chartData?.[currentKey]
    : null; // null means D1 (use natalData)

  return (
    <div className="dashboard-card animate-up delay-1 flex flex-col gap-3">
      {/* Toggle buttons — shown when multiple charts available */}
      {hasToggle && (
        <div className="flex gap-2 flex-wrap">
          {labels.map((label, idx) => (
            <button
              key={idx}
              onClick={() => setActiveChartIdx(idx)}
              className={`flex-1 min-w-0 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border transition-all duration-200 cursor-pointer whitespace-nowrap ${
                activeChartIdx === idx
                  ? 'bg-primary text-on-primary border-primary shadow-md'
                  : 'bg-surface text-on-surface-variant border-outline-variant/40 hover:bg-primary/10 hover:border-primary/40'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Chart SVG renderer */}
      <div className="kundali-svg-container">
        <DivisionalChart
          chartType={currentChartType}
          chartData={resolvedChartData}
          natalData={chartData}
        />
      </div>
    </div>
  );
}
