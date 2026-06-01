import React from 'react';

/**
 * Robust string slicer to extract TRACK 1, TRACK 2, and TRACK 3 blocks from a text string.
 */
function parseRemedyTracks(remedyText) {
  if (!remedyText || typeof remedyText !== 'string') {
    return { track1: '', track2: '', track3: '' };
  }

  const t1Idx = remedyText.search(/TRACK\s*1/i);
  const t2Idx = remedyText.search(/TRACK\s*2/i);
  const t3Idx = remedyText.search(/TRACK\s*3/i);

  let track1 = '';
  let track2 = '';
  let track3 = '';

  if (t1Idx !== -1) {
    const end = t2Idx !== -1 ? t2Idx : (t3Idx !== -1 ? t3Idx : remedyText.length);
    track1 = remedyText.substring(t1Idx, end).trim();
  } else {
    track1 = remedyText.trim();
  }

  if (t2Idx !== -1) {
    const end = t3Idx !== -1 ? t3Idx : remedyText.length;
    track2 = remedyText.substring(t2Idx, end).trim();
  }

  if (t3Idx !== -1) {
    track3 = remedyText.substring(t3Idx).trim();
  }

  const cleanTrack = (t, prefixReg) => t.replace(prefixReg, '').trim();

  return {
    track1: cleanTrack(track1, /^TRACK\s*1\s*—?\s*(VEDIC\s*JYOTISH\s*UPAYAS)?/i),
    track2: cleanTrack(track2, /^TRACK\s*2\s*—?\s*(LAL\s*KITAB\s*FARMAAN)?/i),
    track3: cleanTrack(track3, /^TRACK\s*3\s*—?\s*(ANKJYOTISH\s*CORRECTIONS)?/i)
  };
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

  return text.split('\n').map((line, i) => {
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
          {labelMatch[2] && <span>{labelMatch[2]}</span>}
        </div>
      );
    }

    // Bullet lines
    const bulletMatch = trimmed.match(/^[-•*▸►✦◆]\s+(.+)$/);
    if (bulletMatch) {
      return (
        <div key={i} className="remedy-bullet">{bulletMatch[1]}</div>
      );
    }

    // Numbered lines
    const numMatch = trimmed.match(/^(\d{1,2})[.)]\s+(.+)$/);
    if (numMatch) {
      return (
        <div key={i} className="remedy-bullet">
          <strong className="text-primary-container font-bold mr-1">{numMatch[1]}.</strong>
          {numMatch[2]}
        </div>
      );
    }

    // Standard paragraph
    return (
      <p key={i} className="remedy-para">{trimmed}</p>
    );
  });
}


export default function RemedyCards({ remedyText }) {
  const { track1, track2, track3 } = parseRemedyTracks(remedyText);

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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
    </div>
  );
}
