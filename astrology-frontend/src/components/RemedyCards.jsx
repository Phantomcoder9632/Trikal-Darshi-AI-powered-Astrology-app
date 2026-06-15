import React from 'react';
import { formatInterpretationText, parseInlineMarkdown, cleanLaTeX } from './formatters';

/**
 * Robust string slicer to extract TRACK 1, TRACK 2, and TRACK 3 blocks from a text string.
 * Handles both markdown table structures and plaintext formats.
 */
function parseRemedyTracks(remedyText) {
  if (!remedyText || typeof remedyText !== 'string') {
    return { track1: '', track2: '', track3: '', outro: '' };
  }

  const cleaned = cleanLaTeX(remedyText);
  const lines = cleaned.split('\n');
  const tableLines = lines.filter(l => l.trim().startsWith('|'));

  if (tableLines.length >= 3) {
    // ── TABLE-BASED PARSING ──
    let track1Rows = [];
    let track2Rows = [];
    let track3Rows = [];
    let currentTrack = 1;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine.startsWith('|')) {
        continue;
      }

      const cells = trimmedLine.split('|').map(c => c.trim());
      if (trimmedLine.startsWith('|')) cells.shift();
      if (trimmedLine.endsWith('|')) cells.pop();

      // Skip separator
      if (cells.every(cell => /^[-:\s]+$/.test(cell))) {
        continue;
      }

      // Skip header
      if (cells[0] && cells[0].toLowerCase().includes('track') && cells[1] && cells[1].toLowerCase().includes('remedy')) {
        continue;
      }

      // Determine track
      const firstCol = (cells[0] || '').toLowerCase();
      if (firstCol.includes('1') || firstCol.includes('vedic')) {
        currentTrack = 1;
      } else if (firstCol.includes('2') || firstCol.includes('lal')) {
        currentTrack = 2;
      } else if (firstCol.includes('3') || firstCol.includes('numerology')) {
        currentTrack = 3;
      }

      // Format row
      let rowText = '';
      if (cells[1]) rowText += `REMEDY: ${cells[1]}\n`;
      if (cells[2]) rowText += `PLANET: ${cells[2]}\n`;
      if (cells[3]) rowText += `TARGET: ${cells[3]}\n`;
      if (cells[4]) {
        const cleanDetails = cells[4].replace(/<br\s*\/?>/gi, '\n');
        rowText += `${cleanDetails}\n`;
      }
      rowText += `\n`;

      if (currentTrack === 1) track1Rows.push(rowText);
      else if (currentTrack === 2) track2Rows.push(rowText);
      else if (currentTrack === 3) track3Rows.push(rowText);
    }

    // Extract outro
    let lastTableIdx = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].trim().startsWith('|')) {
        lastTableIdx = i;
        break;
      }
    }

    let outroLines = [];
    if (lastTableIdx !== -1 && lastTableIdx < lines.length - 1) {
      outroLines = lines.slice(lastTableIdx + 1);
    }

    return {
      track1: track1Rows.join('\n').trim(),
      track2: track2Rows.join('\n').trim(),
      track3: track3Rows.join('\n').trim(),
      outro: outroLines.join('\n').trim()
    };
  } else {
    // ── TEXT-BASED PARSING (FALLBACK) ──
    const findIndex = (regexes) => {
      for (const r of regexes) {
        const idx = cleaned.search(r);
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const t1Idx = findIndex([/TRACK\s*1/i, /1\.\s*Vedic/i, /Vedic\s*Jyotish\s*Upayas/i]);
    const t2Idx = findIndex([/TRACK\s*2/i, /2\.\s*Lal/i, /Lal\s*Kitab\s*Farman/i, /Lal\s*Kitab\s*Farmaan/i]);
    const t3Idx = findIndex([/TRACK\s*3/i, /3\.\s*Numerology/i, /Numerology\s*Corrections/i]);

    let track1 = '';
    let track2 = '';
    let track3 = '';

    if (t1Idx !== -1) {
      const end = t2Idx !== -1 ? t2Idx : (t3Idx !== -1 ? t3Idx : cleaned.length);
      track1 = cleaned.substring(t1Idx, end).trim();
    } else {
      track1 = cleaned.trim();
    }

    if (t2Idx !== -1) {
      const end = t3Idx !== -1 ? t3Idx : cleaned.length;
      track2 = cleaned.substring(t2Idx, end).trim();
    }

    if (t3Idx !== -1) {
      track3 = cleaned.substring(t3Idx).trim();
    }

    const cleanTrack = (t, prefixRegs) => {
      let cleanedTrackVal = t;
      for (const r of prefixRegs) {
        cleanedTrackVal = cleanedTrackVal.replace(r, '');
      }
      return cleanedTrackVal.trim();
    };

    return {
      track1: cleanTrack(track1, [/^TRACK\s*1\s*—?\s*(VEDIC\s*JYOTISH\s*UPAYAS)?/i, /^1\.\s*Vedic\s*Jyotish\s*Upayas/i]),
      track2: cleanTrack(track2, [/^TRACK\s*2\s*—?\s*(LAL\s*KITAB\s*FARMAAN)?/i, /^2\.\s*Lal\s*Kitab\s*Farman/i]),
      track3: cleanTrack(track3, [/^TRACK\s*3\s*—?\s*(ANKJYOTISH\s*CORRECTIONS)?/i, /^3\.\s*Numerology\s*Corrections/i]),
      outro: ''
    };
  }
}


/**
 * Format remedy text with uniform bullet/label handling.
 * @param {string} text - The raw text for a single track
 * @param {string} accentClass - CSS class for accent-colored labels
 */
function formatRemedyText(text, accentClass = 'remedy-label-gold') {
  if (!text) {
    return <p className="text-outline/60 italic text-xs">Remedy prescriptions calculating...</p>;
  }

  const normalizedText = text.replace(/<br\s*\/?>/gi, '\n');
  return normalizedText.split('\n').map((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return null;

    // Horizontal rules
    if (/^[-*─]{3,}$/.test(trimmed)) {
      return <hr key={i} className="border-none h-px bg-outline-variant/20 my-3" />;
    }

    // Bold action labels like MANTRA:, GEMSTONE:, DANA:, etc.
    const labelMatch = trimmed.match(/^(MANTRA|GEMSTONE|DANA|FASTING|REMEDY|DIRECTION|PLANET|ACTION|DAY|DURATION|RESTRICTION|TARGET|NAME|COLOR|NUMBER|AFFIRMATION|GRID|BEST\s*DAYS?):(.*)$/i);
    if (labelMatch) {
      return (
        <div key={i} className="remedy-para">
          <span className={`remedy-label ${accentClass}`}>{labelMatch[1]}:</span>
          {labelMatch[2] && <span>{parseInlineMarkdown(labelMatch[2])}</span>}
        </div>
      );
    }

    // Bullet lines
    const bulletMatch = trimmed.match(/^[-•*▸►✦◆]\s+(.+)$/);
    if (bulletMatch) {
      return (
        <div key={i} className="remedy-bullet">{parseInlineMarkdown(bulletMatch[1])}</div>
      );
    }

    // Numbered lines
    const numMatch = trimmed.match(/^(\d{1,2})[.)]\s+(.+)$/);
    if (numMatch) {
      return (
        <div key={i} className="remedy-bullet">
          <strong className="text-primary-container font-bold mr-1">{numMatch[1]}.</strong>
          {parseInlineMarkdown(numMatch[2])}
        </div>
      );
    }

    // Standard paragraph
    return (
      <p key={i} className="remedy-para">{parseInlineMarkdown(trimmed)}</p>
    );
  });
}


export default function RemedyCards({ remedyText }) {
  const { track1, track2, track3, outro } = parseRemedyTracks(remedyText);

  const TRACKS = [
    {
      key: 'track1',
      content: track1,
      borderColor: 'border-t-primary',
      icon: 'spa',
      iconColor: 'text-primary',
      title: 'Vedic Jyotish Upayas',
      titleColor: 'text-primary',
      accentClass: 'remedy-label-gold',
    },
    {
      key: 'track2',
      content: track2,
      borderColor: 'border-t-error',
      icon: 'whatshot',
      iconColor: 'text-error',
      title: 'Lal Kitab Farmaan',
      titleColor: 'text-error',
      accentClass: 'remedy-label-red',
    },
    {
      key: 'track3',
      content: track3,
      borderColor: 'border-t-[#5d5c73]',
      icon: 'all_inclusive',
      iconColor: 'text-[#5d5c73]',
      title: 'Ankjyotish Corrections',
      titleColor: 'text-[#5d5c73]',
      accentClass: 'remedy-label-slate',
    }
  ];

  return (
    <div className="w-full mt-6">
      <div className="text-center mb-6">
        <h3 className="font-headline-md text-base md:text-lg font-bold text-primary tracking-widest uppercase flex items-center justify-center gap-3">
          <span className="w-6 h-[1px] bg-primary/30"></span>
          Triple-Alignment Remedies
          <span className="w-6 h-[1px] bg-primary/30"></span>
        </h3>
        <p className="text-on-surface-variant text-xs font-accent-italic italic mt-2">
          Prescriptions parsed from your cosmic blueprint records
        </p>
      </div>

      <div className="flex flex-col gap-6 w-full">
        {TRACKS.map((track) => {
          if (!track.content) return null;
          return (
            <div
              key={track.key}
              className={`bg-surface border-t-4 ${track.borderColor} border-x border-b border-outline-variant/30 rounded-xl p-5 shadow-sm flex flex-col hover:translate-y-[-2px] transition-all duration-300`}
            >
              {/* Track header */}
              <div className="flex items-center gap-2 border-b border-outline-variant/15 pb-3 mb-4">
                <span
                  className={`material-symbols-outlined ${track.iconColor} text-[18px]`}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {track.icon}
                </span>
                <h4 className={`font-label-sm text-xs font-bold ${track.titleColor} uppercase tracking-wider`}>
                  {track.title}
                </h4>
              </div>

              {/* Track body */}
              <div className="prose-remedy flex-1">
                {formatRemedyText(track.content, track.accentClass)}
              </div>
            </div>
          );
        })}
      </div>

      {outro && (
        <div className="mt-8 pt-6 border-t border-outline-variant/15 text-left page-break-inside-avoid">
          {formatInterpretationText(outro)}
        </div>
      )}
    </div>
  );
}
