import React from 'react';
import DivisionalChart from './DivisionalChart';

/**
 * Tab-to-chart configuration.
 * Each tab shows specific charts, with optional toggle between them.
 * purpose: shown as a badge below the chart.
 */
export const TAB_CHART_CONFIG = {
  1:  {
    charts:  ['D1', 'chandra'],
    labels:  ['Lagna (D1)', 'Chandra'],
    keys:    [null, 'chandra_kundali'],
    purpose: [
      'Best for: Core personality, physical body, life path & overall life predictions',
      'Best for: Mind, emotions, mental tendencies & mother-related matters',
    ],
  },
  2:  {
    charts:  ['D1'],
    labels:  ['Lagna (D1)'],
    keys:    [null],
    purpose: ['Best for: Lal Kitab remedies & karmic debt analysis'],
  },
  3:  { charts: [], labels: [], keys: [], purpose: [] }, // Numerology — no chart
  4:  {
    charts:  ['D10', 'D1'],
    labels:  ['Dashamsha (D10)', 'Lagna (D1)'],
    keys:    ['dashamsha', null],
    purpose: [
      'Best for: Career, profession, public image & ambitions — use D10 for detailed career predictions',
      'Best for: General life direction & first-house career overview',
    ],
  },
  5:  {
    charts:  ['D4', 'D1'],
    labels:  ['Chaturthamsa (D4)', 'Lagna (D1)'],
    keys:    ['chaturthamsa', null],
    purpose: [
      'Best for: Fixed assets, property, vehicles & immovable wealth — use D4 for wealth specifics',
      'Best for: Overall financial potential from the natal chart perspective',
    ],
  },
  6:  {
    charts:  ['D9', 'D7'],
    labels:  ['Navamsha (D9)', 'Saptamsha (D7)'],
    keys:    ['navamsha', 'saptamsha'],
    purpose: [
      'Best for: Marriage, spouse qualities, relationship destiny & spiritual evolution',
      'Best for: Children, progeny potential & relationship with offspring',
    ],
  },
  7:  {
    charts:  ['D30', 'surya'],
    labels:  ['Trimsamsa (D30)', 'Surya Kundali'],
    keys:    ['trimsamsa', 'surya_kundali'],
    purpose: [
      'Best for: Chronic diseases, misfortunes, accidents & hidden vulnerabilities',
      'Best for: Overall vitality, father, government relationships & authority figures',
    ],
  },
  8:  {
    charts:  ['D1'],
    labels:  ['Lagna (D1)'],
    keys:    [null],
    purpose: ['Best for: Holistic remedies, planetary pacification & karmic balance'],
  },
  9:  {
    charts:  ['D7', 'D9'],
    labels:  ['Saptamsha (D7)', 'Navamsha (D9)'],
    keys:    ['saptamsha', 'navamsha'],
    purpose: [
      'Best for: Children, progeny timing & parental bonds — D7 is the primary progeny chart',
      'Best for: Spiritual growth, dharma & marriage context for progeny',
    ],
  },
  10: {
    charts:  ['gochar', 'D1'],
    labels:  ['Gochar (Live)', 'Lagna (D1)'],
    keys:    ['gochar', null],
    purpose: [
      'Best for: Current planetary transits, timing of events & live predictions',
      'Best for: How transits interact with your natal chart placements',
    ],
  },
};

export default function ChartSidebar({ activeTab, chartData, activeChartIdx, setActiveChartIdx }) {
  const config = TAB_CHART_CONFIG[activeTab] || TAB_CHART_CONFIG[1];
  const { charts, labels, keys } = config;

  if (!charts || charts.length === 0) return null;

  const currentChartType = charts[activeChartIdx] || 'D1';
  const currentKey       = keys[activeChartIdx];
  const hasToggle        = charts.length > 1;

  const resolvedChartData = currentKey ? chartData?.[currentKey] : null;

  return (
    <div className="sidebar-card animate-up delay-1">

      {/* Chart toggle buttons */}
      {hasToggle && (
        <div
          role="group"
          aria-label="Chart selector"
          className="chart-toggle-group"
        >
          {labels.map((label, idx) => {
            const isSelected = activeChartIdx === idx;
            return (
              <button
                key={idx}
                id={`chart-toggle-${activeTab}-${idx}`}
                type="button"
                onClick={() => setActiveChartIdx(idx)}
                aria-pressed={isSelected}
                className={`chart-toggle-btn${isSelected ? ' chart-toggle-btn-active' : ''}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* Chart + legend + purpose */}
      <DivisionalChart
        chartType={currentChartType}
        chartData={resolvedChartData}
        natalData={chartData}
      />
    </div>
  );
}

