import React from 'react';

/**
 * CosmicSummary — compact "at a glance" panel for the dashboard.
 *
 * Every value is real, computed by the Swiss-Ephemeris backend:
 * panchang (astro_details), nakshatra/gand_mool, dosha flags,
 * numerology, dasha windows. No hardcoded values anywhere.
 * Chapter Status is a bottom strip, not a padded box.
 */
export default React.memo(function CosmicSummary({
  chartData,
  bgProgress,
  onGenerateFullReport,
  isGeneratingAll
}) {
  const asc        = chartData?.ascendant || {};
  const dasha      = chartData?.dasha     || {};
  const numerology = chartData?.numerology || {};
  const astro      = chartData?.astro_details || {};
  const mangal     = chartData?.mangal_dosha || {};
  const kalsarp    = chartData?.kalsarp || {};
  const pitru      = chartData?.pitru_dosha || {};
  const nak        = chartData?.nakshatra || {};
  const gandMool   = nak?.gand_mool || {};
  const planets    = Array.isArray(chartData?.planets) ? chartData.planets : [];

  const moon = planets.find((p) => p.name === 'Moon') || {};
  const retroPlanets = planets.filter((p) => p.isRetrograde === true || p.isRetrograde === 'true');
  const retroCount = retroPlanets.length;

  let atmakarakaName = chartData?.atmakaraka || chartData?.jaimini?.atmakaraka;
  if (!atmakarakaName) {
    const sorted = [...planets]
      .filter((p) => p.name !== 'Rahu' && p.name !== 'Ketu')
      .sort((a, b) => (b.degree || 0) - (a.degree || 0));
    if (sorted.length > 0) atmakarakaName = sorted[0].name;
  }

  const ascDeg = asc.degree !== undefined && asc.degree !== null
    ? `${Math.floor(asc.degree)}°${String(Math.round((asc.degree % 1) * 60)).padStart(2, '0')}′`
    : '';
  const dashaStr = dasha.mahadasha
    ? `${dasha.mahadasha}${dasha.antardasha ? ` – ${dasha.antardasha}` : ''}`
    : '';

  // ── Compact detail chips (real data only) ──
  const chips = [
    { icon: 'wb_twilight',      label: 'Lagna',        value: asc.sign || '—', sub: `${ascDeg}${ascDeg && asc.nakshatra ? ' · ' : ''}${asc.nakshatra || ''}` },
    { icon: 'nightlight',       label: 'Chandra Rashi', value: moon.sign ? `Moon in ${moon.sign}` : '—', sub: `${moon.nakshatra || nak.nakshatra || ''}${nak.nakshatra_pada ? ` (Pada ${nak.nakshatra_pada})` : ''}`, subCls: 'text-[#1E6E3E]' },
    { icon: 'self_improvement', label: 'Atmakaraka',    value: atmakarakaName || '—', sub: 'Dharmic Soul Anchor' },
    { icon: 'timelapse',        label: 'Active Dasha',  value: dashaStr || '—', sub: dasha.antardasha_end ? `AD ends ${dasha.antardasha_end}` : 'Mahadasha Phase' },
    { icon: 'pin',              label: 'Moolank',       value: numerology?.moolank ?? '—', sub: numerology?.moolank_lord || 'Root Number' },
    { icon: 'pin_drop',         label: 'Bhagyank',      value: numerology?.bhagyank ?? '—', sub: numerology?.bhagyank_lord || 'Destiny Number' },
    { icon: 'badge',            label: 'Namank',        value: numerology?.namank ?? '—', sub: numerology?.namank_lord || 'Name Number' },
    { icon: 'calendar_month',   label: 'Tithi',         value: astro.tithi || '—', sub: 'Lunar Day' },
    { icon: 'join_full',        label: 'Yoga',          value: astro.yog || '—', sub: 'Panchanga Yoga' },
    { icon: 'schedule',         label: 'Karan',         value: astro.karan || '—', sub: 'Half Tithi' },
    { icon: 'home_work',        label: 'Vashya',        value: astro.vashya || '—', sub: 'Vedic Classification' },
    { icon: 'star',             label: 'Nak. Lord',     value: nak.nakshatra_lord || '—', sub: 'Star Ruler' },
    { icon: 'face',             label: 'Gana',          value: astro.gan || '—', sub: 'Temperament' },
    { icon: 'water_drop',       label: 'Nadi',          value: astro.nadi || '—', sub: 'Doshic Channel' },
    { icon: 'diversity_3',      label: 'Varna',         value: astro.varna || '—', sub: 'Classical Varna' },
    { icon: 'pets',             label: 'Yoni',          value: astro.yoni || '—', sub: 'Instinct Symbol' },
    { icon: 'whatshot',         label: 'Mangal Dosha',  value: mangal.present ? `Manglik · H${mangal.house ?? ''}`.trim() : 'Not Present', sub: 'Mars Affliction', alert: !!mangal.present, good: !mangal.present },
    { icon: 'cyclone',          label: 'Kaal Sarp',     value: kalsarp.present ? (kalsarp.type || 'Present') : 'Not Present', sub: 'Rahu–Ketu Axis', alert: !!kalsarp.present, good: !kalsarp.present },
    { icon: 'history_edu',      label: 'Pitru Dosha',   value: pitru.present ? 'Indicated' : 'Not Present', sub: 'Ancestral Karma', alert: !!pitru.present, good: !pitru.present },
    { icon: 'auto_awesome',     label: 'Gand Mool',     value: gandMool.present ? 'Active' : 'Not Active', sub: 'Birth Nakshatra Zone', alert: !!gandMool.present, good: !gandMool.present },
  ];

  // ── Dasha timeline (real windows from the ephemeris) ──
  const dashaTl = dasha.mahadasha_start && dasha.mahadasha_end
    ? buildDashaProgress(dasha)
    : null;

  const completedCount = bgProgress?.completed_tabs?.length ?? 0;
  const totalCount = bgProgress?.total_tabs ?? null;
  const percentComplete = bgProgress && totalCount
    ? Math.round((completedCount / totalCount) * 100)
    : 0;
  const synthesizingCount = bgProgress && totalCount
    ? Math.max(totalCount - completedCount, 0)
    : null;

  const chipCls = 'bg-[#FAF5E8]/80 border border-[#E8D5A7]/70 rounded-xl px-3 py-2.5 flex flex-col justify-center gap-1 min-w-0 hover:border-[#D9A63C]/80 hover:shadow-xs hover:bg-[#FBF7EC] transition-all group';

  return (
    <div className="relative bg-[#FFFDF6] border border-[#E8D5A7]/80 rounded-2xl p-4 sm:p-5 shadow-xs overflow-hidden w-full h-full flex flex-col">
      {/* Decorative golden corner accents + sheen */}
      <div aria-hidden="true" className="absolute top-2.5 left-2.5 w-2.5 h-2.5 border-t-2 border-l-2 border-[#D9A63C]/70 rounded-tl-sm" />
      <div aria-hidden="true" className="absolute top-2.5 right-2.5 w-2.5 h-2.5 border-t-2 border-r-2 border-[#D9A63C]/70 rounded-tr-sm" />
      <div aria-hidden="true" className="absolute bottom-2.5 left-2.5 w-2.5 h-2.5 border-b-2 border-l-2 border-[#D9A63C]/70 rounded-bl-sm" />
      <div aria-hidden="true" className="absolute bottom-2.5 right-2.5 w-2.5 h-2.5 border-b-2 border-r-2 border-[#D9A63C]/70 rounded-br-sm" />
      <div aria-hidden="true" className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-[radial-gradient(circle,#F0DFAF66,transparent_70%)] pointer-events-none" />
      {/* Thin gold top rule */}
      <div aria-hidden="true" className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[#D9A63C]/60 to-transparent" />

      {/* Header row */}
      <div className="flex flex-wrap items-center gap-2 pb-2.5 border-b border-[#E8D5A7]/40 relative z-10">
        <span className="material-symbols-outlined text-[#D9A63C] text-[17px]">explore</span>
        <span className="text-[10.5px] font-bold uppercase tracking-widest text-[#7b5800] font-sans">
          Janma Kundali Ephemeris • Precision Grid
        </span>
        <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-[#EBF1FA] text-[#1F3A6B] font-semibold border border-[#C3D6EF]/70 truncate max-w-[260px]">
          {chartData?.full_name || 'Unknown Native'}{chartData?.city_of_birth ? ` • ${chartData.city_of_birth}` : ''}
        </span>
        {retroCount > 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F4EEDA] text-[#7b5800] font-semibold border border-[#D9A63C]/40" title={retroPlanets.map((p) => p.name).join(', ')}>
            ℞ {retroCount} retrograde
          </span>
        )}
      </div>

      {/* ── Detail chips: 4 per row, rows stretch to fill the panel height ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 relative z-10 auto-rows-fr flex-1 min-h-0">
        {chips.map((c) => (
          <div key={c.label} className={chipCls} title={`${c.label} — ${c.sub}`}>
            <div className="flex items-center gap-1.5 w-full">
              <span className={`material-symbols-outlined text-[15px] ${c.alert ? 'text-[#BA1A1A]' : 'text-[#D9A63C]'} group-hover:scale-110 transition-transform`}>{c.icon}</span>
              <span className="text-[11px] font-semibold text-[#535E73] uppercase tracking-wider truncate">{c.label}</span>
            </div>
            <span className={`font-['Fraunces',serif] text-[16px] font-semibold leading-tight truncate w-full ${c.alert ? 'text-[#93000A]' : c.good ? 'text-[#1E6E3E]' : 'text-[#022454]'}`}>
              {c.value}
            </span>
            <span className={`text-[11px] font-medium truncate w-full ${c.subCls || 'text-[#7b5800]'}`}>{c.sub}</span>
          </div>
        ))}
      </div>

      {/* ── Dasha timeline strip (real windows) ── */}
      {dashaTl && (
        <div className="mt-3 pt-2.5 border-t border-dashed border-[#E8D5A7]/60 flex items-center gap-2.5 relative z-10">
          <span className="text-[11px] font-bold text-[#7b5800] uppercase tracking-wider whitespace-nowrap">
            {dasha.mahadasha} Mahadasha
          </span>
          <div className="flex-1 relative h-1.5 rounded-full bg-[#F0E7D0] overflow-hidden border border-[#E8D5A7]/50">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#D9A63C]/50 to-[#D9A63C] rounded-full"
              style={{ width: `${dashaTl.mahaPct}%` }}
            />
            {dashaTl.antaPct !== null && (
              <div
                className="absolute inset-y-0 bg-[#1F3A6B]/80 rounded-full"
                style={{
                  left: `${dashaTl.antaFrom}%`,
                  width: `${Math.max(dashaTl.antaPct, 1.5)}%`
                }}
                title={`Antardasha: ${dasha.antardasha} (${dasha.antardasha_start} → ${dasha.antardasha_end})`}
              />
            )}
          </div>
          <span className="text-[11px] text-[#535E73] font-medium whitespace-nowrap">
            ends {dasha.mahadasha_end}
          </span>
        </div>
      )}

      {/* ── Chapter Status strip ── */}
      <div className="mt-auto pt-2.5 border-t border-[#E8D5A7]/50 flex flex-col sm:flex-row sm:items-center gap-2.5 relative z-10">
        <div className="flex items-center gap-2 min-w-0">
          <span className="material-symbols-outlined text-[16px] text-[#D9A63C]">collections_bookmark</span>
          <span className="text-[12px] font-bold text-[#022454] uppercase tracking-wider whitespace-nowrap">
            Chapter Status
          </span>
          <span className="text-[10px] bg-[#D9A63C]/20 text-[#7b5800] border border-[#D9A63C]/40 font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">
            {bgProgress ? `${completedCount} / ${totalCount}` : '—'}
          </span>
        </div>

        <div className="flex-1 min-w-[120px]">
          <div className="w-full bg-[#F5EEDC] h-1.5 rounded-full overflow-hidden flex border border-[#E8D5A7]/60">
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
          <div className="text-[11px] text-[#535E73] mt-1 font-medium truncate">
            {bgProgress ? (
              synthesizingCount > 0 ? (
                <span className="text-[#7b5800] font-semibold">
                  {synthesizingCount} chapter{synthesizingCount === 1 ? '' : 's'} synthesizing…
                </span>
              ) : (
                <span className="text-[#1E6E3E] font-semibold">All chapters interpreted ✓</span>
              )
            ) : (
              'Progress appears as chapters generate'
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onGenerateFullReport}
          disabled={isGeneratingAll}
          className="shrink-0 py-1.5 px-3 bg-[#1F3A6B] hover:bg-[#022454] text-[#FFFDF6] text-[11px] font-semibold rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-all border border-[#D9A63C]/40 cursor-pointer disabled:opacity-60"
          id="compileFolioBtn"
        >
          <span className="material-symbols-outlined text-[15px] text-[#D9A63C]">
            {isGeneratingAll ? 'hourglass_top' : 'picture_as_pdf'}
          </span>
          <span>{isGeneratingAll ? 'Synthesizing…' : 'Generate Vedic Report'}</span>
        </button>
      </div>
    </div>
  );
});

// ── Helper: dasha progress against real calendar windows ────────────────────
function buildDashaProgress(dasha) {
  const now = Date.now();
  const mahaStart = new Date(dasha.mahadasha_start).getTime();
  const mahaEnd = new Date(dasha.mahadasha_end).getTime();
  if (Number.isNaN(mahaStart) || Number.isNaN(mahaEnd) || mahaEnd <= mahaStart) return null;
  const clamp = (v) => Math.min(Math.max(v, 0), 100);
  const mahaPct = clamp(((now - mahaStart) / (mahaEnd - mahaStart)) * 100);
  let antaFrom = null;
  let antaPct = null;
  if (dasha.antardasha_start && dasha.antardasha_end) {
    const aStart = new Date(dasha.antardasha_start).getTime();
    const aEnd = new Date(dasha.antardasha_end).getTime();
    if (!Number.isNaN(aStart) && !Number.isNaN(aEnd) && aEnd > aStart) {
      antaFrom = clamp(((aStart - mahaStart) / (mahaEnd - mahaStart)) * 100);
      antaPct = clamp(((aEnd - aStart) / (mahaEnd - mahaStart)) * 100);
    }
  }
  return { mahaPct, antaFrom, antaPct };
}
