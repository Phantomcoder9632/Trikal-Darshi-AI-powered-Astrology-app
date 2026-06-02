import React from 'react';

const ZODIAC_SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
];

const SANSKRIT_ABBRS = {
  "Sun": "Su", "Moon": "Ch", "Mars": "Ma", "Mercury": "Bu",
  "Jupiter": "Gu", "Venus": "Sk", "Saturn": "Sa", "Rahu": "Ra", "Ketu": "Ke"
};

const CHART_TYPE_LABELS = {
  D1: "D1 — Lagna (Rashi)",
  D9: "D9 — Navamsha",
  D10: "D10 — Dashamsha",
  D4: "D4 — Chaturthamsa",
  D7: "D7 — Saptamsha",
  D30: "D30 — Trimsamsa",
  chandra: "Chandra Kundali",
  surya: "Surya Kundali",
  gochar: "Gochar (Transits)",
};

// North Indian house layout centers (400×400 SVG)
const HOUSE_COORDS = {
  1:  { cx: 200, cy: 105, labelY: 140 },
  2:  { cx: 300, cy: 52,  labelY: 38  },
  3:  { cx: 348, cy: 110, labelY: 78  },
  4:  { cx: 288, cy: 200, labelY: 178 },
  5:  { cx: 348, cy: 288, labelY: 258 },
  6:  { cx: 300, cy: 348, labelY: 368 },
  7:  { cx: 200, cy: 292, labelY: 262 },
  8:  { cx: 100, cy: 348, labelY: 368 },
  9:  { cx: 52,  cy: 288, labelY: 258 },
  10: { cx: 112, cy: 200, labelY: 178 },
  11: { cx: 52,  cy: 110, labelY: 78  },
  12: { cx: 100, cy: 52,  labelY: 38  },
};

function getPlanetStyle(planetName, signNum, isRetrograde) {
  if (isRetrograde) return { color: "#5d5c73", glow: false, suffix: "(R)" };

  const exaltedSigns = {
    Sun: 1, Moon: 2, Mars: 10, Mercury: 6, Jupiter: 4,
    Venus: 12, Saturn: 7, Rahu: 2, Ketu: 8
  };
  const debilitatedSigns = {
    Sun: 7, Moon: 8, Mars: 4, Mercury: 12, Jupiter: 10,
    Venus: 6, Saturn: 1, Rahu: 8, Ketu: 2
  };
  const ownSigns = {
    Sun: [5], Moon: [4], Mars: [1, 8], Mercury: [3, 6],
    Jupiter: [9, 12], Venus: [2, 7], Saturn: [10, 11]
  };

  if (exaltedSigns[planetName] === signNum)
    return { color: "#7c5800", glow: true, suffix: "(Ex)" };
  if (debilitatedSigns[planetName] === signNum)
    return { color: "#ba1a1a", glow: false, suffix: "(Deb)" };
  if (ownSigns[planetName]?.includes(signNum))
    return { color: "#166534", glow: false, suffix: "(Own)" };

  return { color: "#1a1c1b", glow: false, suffix: "" };
}

/**
 * DivisionalChart — renders any Vedic chart type using the North Indian SVG grid.
 *
 * Props:
 *   chartData  {object}  — { ascendant: { sign, sign_num }, planets: [...] }
 *   chartType  {string}  — "D1" | "D9" | "D10" | "D4" | "D7" | "D30" | "chandra" | "surya" | "gochar"
 *   natalData  {object}  — For D1 rendering mode (uses ascendant + planets directly)
 *   compact    {boolean} — If true, renders at reduced size (for sidebyside layout)
 */
export default function DivisionalChart({ chartData, chartType = "D1", natalData = null, compact = false }) {
  // ── Determine ascendant sign and planets ──────────────────────────────────
  let ascSignNum = 1;
  let planets = [];
  let chartLabel = CHART_TYPE_LABELS[chartType] || chartType;

  if (chartType === "D1" && natalData) {
    // Direct natal chart rendering
    const ascSign = natalData?.ascendant?.sign;
    if (ascSign) {
      const idx = ZODIAC_SIGNS.indexOf(ascSign);
      ascSignNum = idx !== -1 ? idx + 1 : 1;
    }
    planets = Array.isArray(natalData?.planets) ? natalData.planets : [];
  } else if (chartData) {
    // Divisional chart data (from compute_divisional_chart or compute_gochar_chart)
    const asc = chartData?.ascendant;
    if (asc?.sign_num) {
      ascSignNum = asc.sign_num;
    } else if (asc?.sign) {
      const idx = ZODIAC_SIGNS.indexOf(asc.sign);
      ascSignNum = idx !== -1 ? idx + 1 : 1;
    }
    planets = Array.isArray(chartData?.planets) ? chartData.planets : [];
  }

  // ── Build house sign mapping ───────────────────────────────────────────────
  const houseSigns = {};
  for (let h = 1; h <= 12; h++) {
    houseSigns[h] = ((ascSignNum - 1 + (h - 1)) % 12) + 1;
  }

  // ── Group planets by house ────────────────────────────────────────────────
  const planetsByHouse = { 1:{}, 2:{}, 3:{}, 4:{}, 5:{}, 6:{},
                            7:{}, 8:{}, 9:{}, 10:{}, 11:{}, 12:{} };
  // Initialize as arrays
  for (let h = 1; h <= 12; h++) planetsByHouse[h] = [];

  planets.forEach((p) => {
    let houseNum;
    // Divisional chart: planet already has house computed
    if (p.house && chartType !== "D1") {
      houseNum = p.house;
    } else {
      // Compute from sign
      const pSign = p.sign || p.sign_name;
      if (!pSign) return;
      const idx = ZODIAC_SIGNS.indexOf(pSign);
      if (idx === -1) return;
      const signNum = idx + 1;
      houseNum = ((signNum - ascSignNum + 12) % 12) + 1;
    }

    if (houseNum < 1 || houseNum > 12) return;

    const pSign = p.sign || p.sign_name || "";
    const signIdx = ZODIAC_SIGNS.indexOf(pSign);
    const signNum = signIdx !== -1 ? signIdx + 1 : 1;
    const isRetro = p.isRetrograde === true || p.isRetrograde === "true" || p.isRetrograde === "YES";
    const styleInfo = getPlanetStyle(p.name, signNum, isRetro);
    const abbr = SANSKRIT_ABBRS[p.name] || p.name.substring(0, 2);

    planetsByHouse[houseNum].push({ name: p.name, abbr, signNum, isRetro, ...styleInfo });
  });

  // ── Gochar: show both natal and transit together ──────────────────────────
  // For gochar we use the ascendant from gochar chart but show natal position labels
  const isGochar = chartType === "gochar";
  const computedAt = chartData?.computed_at
    ? new Date(chartData.computed_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })
    : null;

  return (
    <div className="flex flex-col items-center w-full">
      {/* Chart type label */}
      <div className="flex items-center gap-2 mb-2">
        <span className="font-headline-md text-[11px] text-primary font-bold tracking-widest uppercase">
          ✦ {chartLabel} ✦
        </span>
        {isGochar && computedAt && (
          <span className="text-[9px] text-primary/60 font-semibold bg-primary/8 px-1.5 py-0.5 rounded-full border border-primary/20">
            Live · {computedAt} IST
          </span>
        )}
      </div>

      {/* SVG Chart */}
      <div className="w-full flex items-center justify-center p-1">
        <svg
          viewBox="0 0 400 400"
          width="100%"
          height="100%"
          className="opacity-90 overflow-visible transition-all duration-300"
        >
          <defs>
            <filter id={`gold-glow-${chartType}`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background */}
          <rect x="2" y="2" width="396" height="396" fill="#ffffff" stroke="#d3c4b0" strokeWidth="1" />

          {/* Diagonal lines */}
          <line x1="2" y1="2" x2="398" y2="398" stroke="#d3c4b0" strokeWidth="0.8" />
          <line x1="398" y1="2" x2="2" y2="398" stroke="#d3c4b0" strokeWidth="0.8" />

          {/* Inner diamond */}
          <path d="M200 2 L398 200 L200 398 L2 200 Z" fill="#fcfcf9" stroke="#d3c4b0" strokeWidth="0.8" />

          {/* Center sacred dot */}
          <circle cx="200" cy="200" r="3" fill="#7c5800" className="opacity-80" />
          <circle cx="200" cy="200" r="8" fill="none" stroke="#7c5800" strokeWidth="0.5" className="opacity-40" />

          {/* Render houses */}
          {Object.entries(HOUSE_COORDS).map(([houseStr, coord]) => {
            const houseNum = parseInt(houseStr);
            const rashiNum = houseSigns[houseNum];
            const planetsInHouse = planetsByHouse[houseNum] || [];

            return (
              <g key={houseNum}>
                {/* Rashi sign number */}
                <text
                  x={coord.cx}
                  y={coord.labelY}
                  fill="#7c5800"
                  fontSize="11"
                  textAnchor="middle"
                  fontWeight="700"
                  fontFamily="Cinzel"
                  style={{ userSelect: 'none' }}
                >
                  {rashiNum}
                </text>

                {/* Planets */}
                {planetsInHouse.map((p, index) => {
                  const offsetStep = 14;
                  const totalOffset = (planetsInHouse.length - 1) * offsetStep;
                  const py = coord.cy - (totalOffset / 2) + (index * offsetStep);

                  return (
                    <text
                      key={p.name}
                      x={coord.cx}
                      y={py}
                      fill={p.color}
                      fontSize="11"
                      fontWeight="700"
                      fontFamily="Inter"
                      textAnchor="middle"
                      filter={p.glow ? `url(#gold-glow-${chartType})` : undefined}
                      style={{ transition: 'all 0.3s ease', userSelect: 'none' }}
                    >
                      {p.abbr}
                    </text>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend: color coding */}
      <div className="flex gap-3 mt-1 flex-wrap justify-center">
        <span className="flex items-center gap-1 text-[9px] text-[#7c5800] font-semibold">
          <span className="w-2 h-2 rounded-full bg-[#7c5800] inline-block" /> Exalted
        </span>
        <span className="flex items-center gap-1 text-[9px] text-[#166534] font-semibold">
          <span className="w-2 h-2 rounded-full bg-[#166534] inline-block" /> Own Sign
        </span>
        <span className="flex items-center gap-1 text-[9px] text-[#ba1a1a] font-semibold">
          <span className="w-2 h-2 rounded-full bg-[#ba1a1a] inline-block" /> Debilitated
        </span>
        <span className="flex items-center gap-1 text-[9px] text-[#5d5c73] font-semibold">
          <span className="w-2 h-2 rounded-full bg-[#5d5c73] inline-block" /> Retrograde
        </span>
      </div>
    </div>
  );
}
