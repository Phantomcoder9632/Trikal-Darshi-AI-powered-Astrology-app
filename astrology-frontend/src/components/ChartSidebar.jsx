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
    <div className="flex flex-col gap-4 w-full h-full">
      {/* ── Divisional Chart Viewer Card ── */}
      <div className="bg-[#FFFDF6] border border-[#E8D5A7]/80 rounded-2xl p-3.5 sm:p-4 shadow-xs flex flex-col gap-2.5 flex-1">

        {/* Card Header */}
        <div className="flex items-center justify-between pb-1.5 border-b border-[#E8D5A7]/40">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-[#FAF3E3] border border-[#E8D5A7] flex items-center justify-center text-[#D9A63C]">
              <span className="material-symbols-outlined text-[17px]">filter_vintage</span>
            </div>
            <div>
              <h2 className="font-['Fraunces',serif] text-[#022454] text-[15px] sm:text-[16px] font-bold tracking-tight">
                {activeVargaConfig.name} Varga
              </h2>
              <p className="text-[10px] text-[#535E73]">
                Microscopic Vedic Harmonic &amp; Karmic Dimension
              </p>
            </div>
          </div>
          <span className="text-[9.5px] font-bold bg-[#EBF1FA] border border-[#C3D6EF] text-[#1F3A6B] px-2 py-0.5 rounded-full uppercase tracking-wider">
            Mahat Phalam
          </span>
        </div>

        {/* 9-Button Varga Toggle Grid */}
        <div className="grid grid-cols-5 gap-1 bg-[#FAF5E8] p-1 rounded-lg border border-[#E8D5A7]/60">
          {VARGA_LIST.map((v) => {
            const isSelected = selectedVarga === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedVarga(v.id)}
                className={`py-1 px-1.5 rounded-md text-[10.5px] font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 ${
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

        {/* North Indian Chart Framed Container — scaled down for comfortable viewport fit */}
        <div className="w-full max-w-[340px] sm:max-w-[360px] mx-auto bg-[#FAF5E8]/80 rounded-xl p-2.5 sm:p-3 border-2 border-[#E8D5A7] relative shadow-inner flex items-center justify-center flex-1">
          <DivisionalChart
            chartType={selectedVarga}
            chartData={resolvedChartData}
            natalData={chartData}
            largeText
          />
        </div>

        {/* Chart Metadata Footer */}
        <div className="flex items-center justify-between text-[10.5px] bg-[#FAF3E3]/80 px-2.5 py-1.5 rounded-lg border border-[#E8D5A7]/70">
          <span className="flex items-center gap-1.5 text-[#535E73]">
            <span className="material-symbols-outlined text-[#7b5800] text-[15px]">verified</span>
            <span>Ayanamsha: <strong className="text-[#022454] font-semibold">Lahiri 24°11'42"</strong></span>
          </span>
          <span className="px-2 py-0.5 rounded bg-[#FFFDF6] text-[#1F3A6B] font-semibold border border-[#E8D5A7]/80 text-[10px]">
            Sthira Lagna (Fixed)
          </span>
        </div>
      </div>
    </div>
  );
});
