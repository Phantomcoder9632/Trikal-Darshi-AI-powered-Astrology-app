import React from 'react';
import { useTranslation } from 'react-i18next';
import DivisionalChart from './DivisionalChart';

export const VARGA_LIST = [
  { id: 'D1', label: 'D1', key: null, name: 'Lagna (Rashi)' },
  { id: 'D9', label: 'D9', key: 'navamsha', name: 'Navamsha' },
  { id: 'D10', label: 'D10', key: 'dashamsha', name: 'Dashamsha' },
  { id: 'D4', label: 'D4', key: 'chaturthamsa', name: 'Chaturthamsa' },
  { id: 'D7', label: 'D7', key: 'saptamsha', name: 'Saptamsha' },
  { id: 'D30', label: 'D30', key: 'trimsamsa', name: 'Trimsamsa' },
  { id: 'chandra', label: 'Chandra', key: 'chandra_kundali', name: 'Chandra Kundali' },
  { id: 'surya', label: 'Surya', key: 'surya_kundali', name: 'Surya Kundali' },
  { id: 'gochar', label: 'Gochar Transit', key: 'gochar', name: 'Gochar Transit', isWide: true },
];

export const TAB_CHART_CONFIG = {
  1:  { charts: ['D1', 'chandra'], labels: ['Lagna (D1)', 'Chandra'], keys: [null, 'chandra_kundali'] },
  2:  { charts: ['D1'], labels: ['Lagna (D1)'], keys: [null] },
  3:  { charts: [], labels: [], keys: [] },
  4:  { charts: ['D10', 'D1'], labels: ['Dashamsha (D10)', 'Lagna (D1)'], keys: ['dashamsha', null] },
  5:  { charts: ['D4', 'D1'], labels: ['Chaturthamsa (D4)', 'Lagna (D1)'], keys: ['chaturthamsa', null] },
  6:  { charts: ['D9', 'D7'], labels: ['Navamsha (D9)', 'Saptamsha (D7)'], keys: ['navamsha', 'saptamsha'] },
  7:  { charts: ['D30', 'surya'], labels: ['Trimsamsa (D30)', 'Surya Kundali'], keys: ['trimsamsa', 'surya_kundali'] },
  8:  { charts: ['D1'], labels: ['Lagna (D1)'], keys: [null] },
  9:  { charts: ['D7', 'D9'], labels: ['Saptamsha (D7)', 'Navamsha (D9)'], keys: ['saptamsha', 'navamsha'] },
  10: { charts: ['gochar', 'D1'], labels: ['Gochar (Live)', 'Lagna (D1)'], keys: ['gochar', null] },
};

export default React.memo(function ChartSidebar({
  activeTab,
  chartData,
  activeChartIdx,
  setActiveChartIdx,
  onOpenEditModal,
}) {
  const { t } = useTranslation();

  const [selectedVarga, setSelectedVarga] = React.useState('D1');

  // Sync selected Varga with tab defaults
  React.useEffect(() => {
    if (activeTab === 4) setSelectedVarga('D10');
    else if (activeTab === 5) setSelectedVarga('D4');
    else if (activeTab === 6) setSelectedVarga('D9');
    else if (activeTab === 7) setSelectedVarga('D30');
    else if (activeTab === 9) setSelectedVarga('D7');
    else if (activeTab === 10) setSelectedVarga('gochar');
    else setSelectedVarga('D1');
  }, [activeTab]);

  const activeVargaConfig = VARGA_LIST.find((v) => v.id === selectedVarga) || VARGA_LIST[0];
  const resolvedChartData = activeVargaConfig.key ? chartData?.[activeVargaConfig.key] : null;

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* ── 1. Divisional Chart Viewer Card ── */}
      <div className="bg-[#FFFDF6] border border-[#E8D5A7]/80 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col gap-4">
        
        {/* Card Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#E8D5A7]/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FAF3E3] border border-[#E8D5A7] flex items-center justify-center text-[#D9A63C]">
              <span className="material-symbols-outlined text-[20px]">filter_vintage</span>
            </div>
            <div>
              <h2 className="font-['Fraunces',serif] text-[#022454] text-[18px] font-bold tracking-tight">
                {activeVargaConfig.name} Varga
              </h2>
              <p className="text-[11px] text-[#535E73]">
                Microscopic Vedic Harmonic &amp; Karmic Dimension
              </p>
            </div>
          </div>
          <span className="text-[10.5px] font-bold bg-[#EBF1FA] border border-[#C3D6EF] text-[#1F3A6B] px-2.5 py-1 rounded-full uppercase tracking-wider">
            Mahat Phalam
          </span>
        </div>

        {/* 9-Button Varga Toggle Grid */}
        <div className="grid grid-cols-5 gap-1.5 bg-[#FAF5E8] p-1.5 rounded-xl border border-[#E8D5A7]/60">
          {VARGA_LIST.map((v) => {
            const isSelected = selectedVarga === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedVarga(v.id)}
                className={`py-1.5 px-2 rounded-lg text-[11.5px] font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  v.isWide ? 'col-span-2' : ''
                } ${
                  isSelected
                    ? 'bg-[#1F3A6B] text-[#FFFDF6] shadow-xs border border-[#D9A63C]/60'
                    : 'text-[#535E73] hover:bg-[#FFFDF6] hover:text-[#0E1A37]'
                }`}
              >
                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#D9A63C]" />}
                <span>{v.label}</span>
              </button>
            );
          })}
        </div>

        {/* North Indian Chart Framed Container */}
        <div className="w-full bg-[#FAF5E8]/80 rounded-xl p-3 border-2 border-[#E8D5A7] relative shadow-inner flex items-center justify-center">
          <DivisionalChart
            chartType={selectedVarga}
            chartData={resolvedChartData}
            natalData={chartData}
          />
        </div>

        {/* Chart Metadata Footer */}
        <div className="flex items-center justify-between text-[11.5px] bg-[#FAF3E3]/80 px-3 py-2 rounded-lg border border-[#E8D5A7]/70">
          <span className="flex items-center gap-1.5 text-[#535E73]">
            <span className="material-symbols-outlined text-[#7b5800] text-[16px]">verified</span>
            <span>Ayanamsha: <strong className="text-[#022454] font-semibold">Lahiri 24°11'42"</strong></span>
          </span>
          <span className="px-2 py-0.5 rounded bg-[#FFFDF6] text-[#1F3A6B] font-semibold border border-[#E8D5A7]/80 text-[10.5px]">
            Sthira Lagna (Fixed)
          </span>
        </div>
      </div>

      {/* ── 2. Shadbala & Bhava Bala Summary Card ── */}
      <div className="bg-[#FFFDF6] border border-[#E8D5A7]/80 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10.5px] font-bold text-[#7b5800] uppercase tracking-widest">
              Shadbala &amp; Bhava Bala
            </span>
            <h3 className="font-['Fraunces',serif] text-[#022454] text-[17px] font-bold tracking-tight mt-0.5">
              Karma Sthana Dominance
            </h3>
          </div>
          <div className="text-right bg-[#EBF1FA] border border-[#C3D6EF]/80 px-3 py-1.5 rounded-xl">
            <div className="font-['Fraunces',serif] text-[20px] text-[#1F3A6B] font-bold leading-none">
              8.8<span className="text-[13px] text-[#7b5800] font-medium">/10</span>
            </div>
            <span className="text-[9.5px] text-[#535E73] uppercase tracking-wider font-semibold">
              Sovereign Vigor
            </span>
          </div>
        </div>

        {/* Progress Metric Bars */}
        <div className="space-y-3 pt-1">
          <div>
            <div className="flex justify-between text-[12px] font-medium mb-1">
              <span className="text-[#0E1A37]">Sun Directional Digbala (10th Bhava)</span>
              <span className="font-bold text-[#022454]">96%</span>
            </div>
            <div className="w-full bg-[#F5EEDC] h-2 rounded-full overflow-hidden border border-[#E8D5A7]/50">
              <div className="bg-gradient-to-r from-[#1F3A6B] to-[#022454] h-full rounded-full" style={{ width: '96%' }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[12px] font-medium mb-1">
              <span className="text-[#0E1A37]">Mars 3rd House Upachaya Valor</span>
              <span className="font-bold text-[#7b5800]">89%</span>
            </div>
            <div className="w-full bg-[#F5EEDC] h-2 rounded-full overflow-hidden border border-[#E8D5A7]/50">
              <div className="bg-gradient-to-r from-[#D9A63C] to-[#9E7216] h-full rounded-full" style={{ width: '89%' }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[12px] font-medium mb-1">
              <span className="text-[#0E1A37]">Dashamsha Lord Sovereignty (Surya)</span>
              <span className="font-bold text-[#1F3A6B]">82%</span>
            </div>
            <div className="w-full bg-[#F5EEDC] h-2 rounded-full overflow-hidden border border-[#E8D5A7]/50">
              <div className="bg-[#1F3A6B]/80 h-full rounded-full" style={{ width: '82%' }} />
            </div>
          </div>
        </div>

        <p className="text-[12px] text-[#535E73] bg-[#FAF5E8] p-3.5 rounded-xl border border-[#E8D5A7]/60 leading-relaxed">
          The 10th house exhibits exceptional imperial authority due to the Sun’s meridian noon Digbala, fortified by an exalted Mars occupying the 3rd house of strategic decisiveness.
        </p>
      </div>

      {/* ── 3. Profile Badge Card ── */}
      <div className="bg-[#FFFDF6] border border-[#E8D5A7]/80 rounded-2xl p-4 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FAF3E3] border border-[#E8D5A7] flex items-center justify-center text-[#1F3A6B] font-bold text-sm shadow-xs">
            {chartData?.full_name ? chartData.full_name.slice(0, 2).toUpperCase() : 'AS'}
          </div>
          <div className="flex flex-col">
            <span className="font-['Fraunces',serif] text-[#022454] font-semibold text-[14px]">
              {chartData?.full_name || 'Aaryavart Sharma'}
            </span>
            <span className="text-[11px] text-[#535E73]">
              {chartData?.date_of_birth || '24 Oct 1995'} • {chartData?.city_of_birth || 'Varanasi, IN'}
            </span>
          </div>
        </div>

        {onOpenEditModal && (
          <button
            type="button"
            onClick={onOpenEditModal}
            className="px-3 py-1.5 rounded-lg bg-[#EBF1FA] hover:bg-[#D9E5F5] text-[#1F3A6B] font-semibold text-[11.5px] border border-[#C3D6EF] transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[15px]">tune</span>
            <span>Edit Details</span>
          </button>
        )}
      </div>
    </div>
  );
});


