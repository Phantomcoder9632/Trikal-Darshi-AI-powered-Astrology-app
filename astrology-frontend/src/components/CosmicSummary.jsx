import React from 'react';

export default function CosmicSummary({ summaryText, chartData }) {
  let textLines = [];

  if (summaryText && typeof summaryText === 'string') {
    textLines = summaryText.split('\n').filter((l) => l.trim()).slice(0, 5);
  } else if (chartData) {
    const asc        = chartData.ascendant || {};
    const dasha      = chartData.dasha     || {};
    const numerology = chartData.numerology || {};
    const moon       = Array.isArray(chartData.planets)
      ? chartData.planets.find((p) => p.name === 'Moon')
      : null;

    let atmakarakaName = chartData.atmakaraka || chartData.jaimini?.atmakaraka;
    if (!atmakarakaName && Array.isArray(chartData.planets)) {
      const sorted = [...chartData.planets]
        .filter((p) => p.name !== 'Rahu' && p.name !== 'Ketu')
        .sort((a, b) => (b.degree || 0) - (a.degree || 0));
      if (sorted.length > 0) atmakarakaName = sorted[0].name;
    }

    const ascDeg  = asc.degree !== undefined ? `at ${Math.floor(asc.degree)}°` : '';
    const ascSign = asc.sign || 'N/A';

    textLines = [
      `Lagna & Core Persona: Physical baseline anchored in ${ascSign} Ascendant ${ascDeg}.`,
      `Moon & Emotional Nature: Mind resides in the Nakshatra of ${moon?.nakshatra || moon?.nakshatra_name || 'N/A'} (${moon?.sign || 'N/A'}).`,
      `Soul Purpose (Atmakaraka): Jaimini Atmakaraka is ${atmakarakaName || 'Soul Planet'}, directing your primary spiritual growth.`,
      `Current Life Era (Dasha): Navigating ${dasha.mahadasha || 'N/A'} Mahadasha · ${dasha.antardasha || 'N/A'} Antardasha.`,
      `Destiny Vibration: Governed by Bhagyank ${numerology.bhagyank || 'N/A'} — ruled by ${numerology.bhagyank_lord || numerology.destiny_ruler || 'N/A'}.`,
    ];
  } else {
    textLines = [
      'Lagna & Core Persona: Calculating ascendant blueprint...',
      'Moon & Emotional Nature: Nakshatra parameters mapping...',
      'Soul Purpose (Atmakaraka): Soul indicators translating...',
      'Current Life Era (Dasha): Mahadasha calculations aligning...',
      'Destiny Vibration: Bhagyank vibrations balancing...',
    ];
  }

  return (
    <section className="cosmic-summary">
      {/* Subtle background watermark */}
      <div
        className="absolute -right-16 -bottom-16 w-64 h-64 opacity-[0.03] pointer-events-none select-none"
        aria-hidden="true"
        style={{
          background: 'radial-gradient(circle, #7c5800 0%, transparent 70%)',
        }}
      />

      {/* Header */}
      <h3 className="font-headline-md text-primary text-sm md:text-base font-bold uppercase tracking-widest mb-5 flex items-center gap-2">
        <span className="w-4 h-px bg-primary/30 shrink-0" />
        Current Manifestation Blueprint
        <span className="w-4 h-px bg-primary/30 shrink-0" />
      </h3>

      {/* Lines */}
      <ul className="flex flex-col gap-3 relative z-10 list-none p-0 m-0">
        {textLines.map((line, idx) => {
          const colonIdx = line.indexOf(':');
          const label = colonIdx !== -1 ? line.substring(0, colonIdx + 1) : '';
          const rest  = colonIdx !== -1 ? line.substring(colonIdx + 1).trim() : line;

          return (
            <li key={idx} className="flex items-start gap-3">
              <span className="text-primary-container text-[10px] mt-1 shrink-0 select-none">✦</span>
              <span className="font-body-md text-sm text-on-surface leading-relaxed">
                {label && (
                  <strong className="font-bold text-primary uppercase text-[10px] tracking-wide mr-1.5">
                    {label}
                  </strong>
                )}
                <span className="font-accent-italic italic text-on-surface-variant">{rest}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
