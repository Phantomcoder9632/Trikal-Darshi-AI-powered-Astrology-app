import React from 'react';
import { useTranslation } from 'react-i18next';

export default React.memo(function CosmicSummary({
  summaryText,
  chartData,
  bgProgress,
  onGenerateFullReport,
  isGeneratingAll
}) {
  const { t } = useTranslation();

  const asc        = chartData?.ascendant || {};
  const dasha      = chartData?.dasha     || {};
  const numerology = chartData?.numerology || {};
  const moon       = Array.isArray(chartData?.planets)
    ? chartData.planets.find((p) => p.name === 'Moon')
    : null;

  let atmakarakaName = chartData?.atmakaraka || chartData?.jaimini?.atmakaraka;
  if (!atmakarakaName && Array.isArray(chartData?.planets)) {
    const sorted = [...chartData.planets]
      .filter((p) => p.name !== 'Rahu' && p.name !== 'Ketu')
      .sort((a, b) => (b.degree || 0) - (a.degree || 0));
    if (sorted.length > 0) atmakarakaName = sorted[0].name;
  }

  const ascDeg  = asc.degree !== undefined ? `${Math.floor(asc.degree)}°${Math.round((asc.degree % 1) * 60)}'` : '14°28\'';
  const ascSign = asc.sign || 'Libra (Tula)';
  const moonNak = moon?.nakshatra || moon?.nakshatra_name || 'Vishakha';
  const moonSign = moon?.sign || 'Libra';
  const dashaStr = dasha.mahadasha ? `${dasha.mahadasha} – ${dasha.antardasha || 'Sub'}` : 'Jupiter – Venus';
  const bhagyank = numerology.bhagyank || 7;
  const bhagyankLord = numerology.bhagyank_lord || numerology.destiny_ruler || 'Ketu Governed Ray';

  const completedCount = bgProgress?.completed_tabs?.length || 8;
  const totalCount = bgProgress?.total_tabs || 11;
  const percentComplete = bgProgress ? Math.round((completedCount / totalCount) * 100) : 72;
  const synthesizingCount = totalCount - completedCount;

  return (
    <div className="bg-[#FFFDF6] border border-[#E8D5A7]/80 rounded-2xl p-5 shadow-xs relative overflow-hidden mb-6">
      <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-[#FAF3E3]/60 via-[#EBF1FA]/40 to-transparent pointer-events-none" />
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-5 relative z-10">
        
        {/* 5 Metric Chips Left */}
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-[#D9A63C] text-[18px]">explore</span>
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#7b5800] font-sans">
              Janma Kundali Ephemeris • Precision D-10 Grid
            </span>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#EBF1FA] text-[#1F3A6B] font-semibold border border-[#C3D6EF]/70">
              {chartData?.full_name || 'Aaryavart Sharma'} • {chartData?.city_of_birth || 'Varanasi'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Metric 1: Lagna */}
            <div className="bg-[#FAF5E8]/80 border border-[#E8D5A7]/70 rounded-xl p-3 flex flex-col justify-between hover:border-[#D9A63C] transition-colors shadow-2xs">
              <span className="text-[10.5px] font-semibold text-[#535E73] uppercase tracking-wider">Ascendant (Lagna)</span>
              <span className="font-['Fraunces',serif] text-[15px] font-semibold text-[#022454] mt-1 leading-snug truncate">
                {ascSign}
              </span>
              <span className="text-[11px] font-medium text-[#7b5800] mt-0.5 truncate">
                {ascDeg} • {asc.nakshatra || 'Swati'}
              </span>
            </div>

            {/* Metric 2: Chandra Rashi */}
            <div className="bg-[#FAF5E8]/80 border border-[#E8D5A7]/70 rounded-xl p-3 flex flex-col justify-between hover:border-[#D9A63C] transition-colors shadow-2xs">
              <span className="text-[10.5px] font-semibold text-[#535E73] uppercase tracking-wider">Chandra Rashi</span>
              <span className="font-['Fraunces',serif] text-[15px] font-semibold text-[#022454] mt-1 leading-snug truncate">
                Moon in {moonSign}
              </span>
              <span className="text-[11px] font-semibold text-[#1E6E3E] mt-0.5 flex items-center gap-1 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1E6E3E] inline-block shrink-0" />
                {moonNak} (Pada {moon?.nakshatra_pada || 3})
              </span>
            </div>

            {/* Metric 3: Atmakaraka */}
            <div className="bg-[#FAF5E8]/80 border border-[#E8D5A7]/70 rounded-xl p-3 flex flex-col justify-between hover:border-[#D9A63C] transition-colors shadow-2xs">
              <span className="text-[10.5px] font-semibold text-[#535E73] uppercase tracking-wider">Atmakaraka Graha</span>
              <span className="font-['Fraunces',serif] text-[15px] font-semibold text-[#022454] mt-1 leading-snug truncate">
                {atmakarakaName || 'Sun (Surya)'}
              </span>
              <span className="text-[11px] font-medium text-[#7b5800] mt-0.5 truncate">
                Dharmic Soul Anchor
              </span>
            </div>

            {/* Metric 4: Vimshottari */}
            <div className="bg-[#FAF5E8]/80 border border-[#E8D5A7]/70 rounded-xl p-3 flex flex-col justify-between hover:border-[#D9A63C] transition-colors shadow-2xs">
              <span className="text-[10.5px] font-semibold text-[#535E73] uppercase tracking-wider">Active Dasha</span>
              <span className="font-['Fraunces',serif] text-[15px] font-semibold text-[#022454] mt-1 leading-snug truncate">
                {dashaStr}
              </span>
              <span className="text-[11px] font-medium text-[#1F3A6B] mt-0.5 truncate">
                Mahadasha Phase
              </span>
            </div>

            {/* Metric 5: Bhagyank */}
            <div className="bg-[#FAF5E8]/80 border border-[#E8D5A7]/70 rounded-xl p-3 flex flex-col justify-between hover:border-[#D9A63C] transition-colors shadow-2xs col-span-2 sm:col-span-1">
              <span className="text-[10.5px] font-semibold text-[#535E73] uppercase tracking-wider">Anka Shastra</span>
              <span className="font-['Fraunces',serif] text-[15px] font-semibold text-[#022454] mt-1 leading-snug truncate">
                Bhagyank: {bhagyank}
              </span>
              <span className="text-[11px] font-medium text-[#7b5800] mt-0.5 truncate">
                {bhagyankLord}
              </span>
            </div>
          </div>
        </div>

        {/* Generation Status Card Right */}
        <div className="lg:w-80 bg-gradient-to-br from-[#FAF3E3] to-[#EBF1FA]/60 border border-[#E8D5A7] p-4 rounded-xl flex flex-col justify-between shadow-sm shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold text-[#022454] uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[17px] text-[#D9A63C]">collections_bookmark</span>
              Soul Folio
            </span>
            <span className="text-[11px] bg-[#D9A63C]/20 text-[#7b5800] border border-[#D9A63C]/40 font-bold px-2 py-0.5 rounded-full">
              {completedCount} / {totalCount} Ready
            </span>
          </div>

          <div className="my-2.5">
            <div className="w-full bg-[#FFFDF6] h-2.5 rounded-full overflow-hidden flex border border-[#E8D5A7]/80 shadow-inner">
              <div
                className="bg-[#1F3A6B] h-full transition-all duration-500"
                style={{ width: `${percentComplete}%` }}
              />
              {synthesizingCount > 0 && (
                <div
                  className="bg-[#D9A63C] h-full animate-pulse"
                  style={{ width: `${100 - percentComplete}%` }}
                />
              )}
            </div>
            <div className="flex justify-between items-center text-[11px] text-[#535E73] mt-1.5 font-medium">
              <span>{completedCount} chapters compiled</span>
              {synthesizingCount > 0 ? (
                <span className="text-[#7b5800] font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D9A63C] animate-ping" />
                  {synthesizingCount} synthesizing
                </span>
              ) : (
                <span className="text-[#1E6E3E] font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1E6E3E]" />
                  Fully Synchronized
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onGenerateFullReport}
            disabled={isGeneratingAll}
            className="w-full py-2 px-3 bg-[#1F3A6B] hover:bg-[#022454] text-[#FFFDF6] text-[12.5px] font-semibold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all border border-[#D9A63C]/40 cursor-pointer disabled:opacity-60"
            id="compileFolioBtn"
          >
            <span className="material-symbols-outlined text-[17px] text-[#D9A63C]">
              {isGeneratingAll ? 'hourglass_top' : 'picture_as_pdf'}
            </span>
            <span>{isGeneratingAll ? 'Synthesizing Folio…' : 'Generate Vedic Report'}</span>
          </button>
        </div>

      </div>
    </div>
  );
});

