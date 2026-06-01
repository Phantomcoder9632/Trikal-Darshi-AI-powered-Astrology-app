import React from 'react';

export default function CosmicSummary({ summaryText, chartData }) {
  let textLines = [];

  // Parse lines from raw string or generate fallback from chartData
  if (summaryText && typeof summaryText === 'string') {
    textLines = summaryText
      .split('\n')
      .filter((line) => line.trim() !== '')
      .slice(0, 5);
  } else if (chartData) {
    const asc = chartData.ascendant || {};
    const dasha = chartData.dasha || {};
    const numerology = chartData.numerology || {};
    const moon = Array.isArray(chartData.planets) ? chartData.planets.find((p) => p.name === 'Moon') : null;

    // Atmakaraka finder
    let atmakarakaName = chartData.atmakaraka || chartData.jaimini?.atmakaraka;
    if (!atmakarakaName && Array.isArray(chartData.planets)) {
      const sorted = [...chartData.planets]
        .filter(p => p.name !== 'Rahu' && p.name !== 'Ketu')
        .sort((a, b) => (b.degree || 0) - (a.degree || 0));
      if (sorted.length > 0) atmakarakaName = sorted[0].name;
    }

    const ascDeg = asc.degree !== undefined ? `${Math.floor(asc.degree)}°` : '';
    const ascSign = asc.sign || 'N/A';
    const akText = atmakarakaName || 'Soul Planet';

    textLines = [
      `Lagna & Core Persona: Your physical baseline is anchored in a majestic ${ascSign} Ascendant ${ascDeg ? `at ${ascDeg}` : ''}.`,
      `Moon & Emotional Nature: Your mind resides in the mystical Nakshatra of ${moon?.nakshatra || moon?.nakshatra_name || 'N/A'} (in ${moon?.sign || 'N/A'}).`,
      `Soul Purpose (Atmakaraka): Your Jaimini Atmakaraka resides in ${akText}, directing your primary spiritual growth.`,
      `Current Life Era (Dasha): You are navigating the powerful cycles of ${dasha.mahadasha || 'N/A'} Mahadasha and ${dasha.antardasha || 'N/A'} Antardasha.`,
      `Destiny Vibration: Governed by Bhagyank ${numerology.bhagyank || 'N/A'}, tuned to the cosmic energy of ${numerology.bhagyank_lord || numerology.destiny_ruler || 'N/A'}.`
    ];
  } else {
    textLines = [
      "Core Lagna blueprint details loading...",
      "Emotional Nakshatra parameters mapping...",
      "Jaimini Soul indicators translating...",
      "Mahadasha/Antardasha era calculations aligning...",
      "Destiny Bhagyank vibrations balancing..."
    ];
  }

  return (
    <section className="relative bg-surface border border-outline-variant/30 rounded-xl p-6 md:p-8 overflow-hidden shadow-sm">
      {/* Lotus Watermark Background */}
      <div className="absolute -right-20 -bottom-20 opacity-5 pointer-events-none select-none">
        <img
          alt=""
          aria-hidden="true"
          className="w-[300px]"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCWLcprUlKS8gZwUgZWs3RM3EWpoI-iIKioBc7IJLaLCKduzxxx7b4WXwwWYiKjm2fkOGfQ5CauXEj6FhPJoXZMs1JmlXVUPbi_lUESD0yc5hVmzbNJLKWSIv1iB24HlPxV7B9CbvNr_vf4y85IzIKNv9RcroxNO7dKdajLYtPJekd-7to9P_esV1Z--jVm7iGkrP4TadgjiIssPiqjttBObWbZZLsF4heENWIQGH-_EQ5D0Hjx-RNF_4XpWYrjqcAwWlfEznyXcSnS"
        />
      </div>

      <h3 className="font-headline-md text-primary text-sm md:text-base mb-5 flex items-center gap-3 tracking-wider font-bold uppercase">
        <span className="w-6 h-[1px] bg-primary/30"></span>
        Current Manifestation Blueprint
        <span className="w-6 h-[1px] bg-primary/30"></span>
      </h3>

      <ul className="space-y-3 relative z-10 list-none p-0 m-0">
        {textLines.map((line, idx) => {
          const colonIdx = line.indexOf(':');
          let label = '';
          let rest = line;
          
          if (colonIdx !== -1) {
            label = line.substring(0, colonIdx + 1);
            rest = line.substring(colonIdx + 1);
          }

          return (
            <li key={idx} className="relative pl-5 leading-relaxed">
              <span className="absolute left-0 top-[3px] text-primary-container text-[10px]">✦</span>
              <span className="font-body-lg text-sm text-on-surface">
                {label && (
                  <strong className="font-bold text-primary not-italic tracking-wide uppercase text-[11px] mr-1">
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
