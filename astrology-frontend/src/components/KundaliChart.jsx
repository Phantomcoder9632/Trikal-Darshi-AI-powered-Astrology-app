import React, { useState } from 'react';

const ZODIAC_SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
];

const SANSKRIT_ABBRS = {
  "Sun": "Su",
  "Moon": "Ch",
  "Mars": "Ma",
  "Mercury": "Bu",
  "Jupiter": "Gu",
  "Venus": "Sk",
  "Saturn": "Sa",
  "Rahu": "Ra",
  "Ketu": "Ke"
};

const SANSKRIT_NAMES = {
  Sun: "Surya", Moon: "Chandra", Mars: "Mangal", Mercury: "Budha",
  Jupiter: "Guru", Venus: "Shukra", Saturn: "Shani", Rahu: "Rahu", Ketu: "Ketu",
};

const PLANET_LORE = {
  Sun: "The soul, vitality, father, and royal authority.",
  Moon: "Mind, emotions, mother, and the tides of memory.",
  Mars: "Courage, siblings, energy, and the warrior instinct.",
  Mercury: "Intellect, speech, commerce, and wit.",
  Jupiter: "Wisdom, dharma, children, and divine grace.",
  Venus: "Love, art, comfort, and the partner of the flesh.",
  Saturn: "Discipline, longevity, karma, and patient labor.",
  Rahu: "Insatiable desire, foreign things, and worldly illusion.",
  Ketu: "Detachment, moksha, and past-life mastery.",
};

function fmtDegree(d) {
  if (d == null || Number.isNaN(Number(d))) return "\u2014";
  const deg = Math.floor(d);
  const min = Math.floor((d - deg) * 60);
  const sec = Math.round(((d - deg) * 60 - min) * 60);
  return `${deg}\u00b0${String(min).padStart(2, "0")}\u2032${String(sec).padStart(2, "0")}\u2033`;
}

function dignityWord(planetName, signNum, isRetro) {
  if (isRetro) return "Retrograde";
  const exaltedSigns = { Sun: 1, Moon: 2, Mars: 10, Mercury: 6, Jupiter: 4, Venus: 12, Saturn: 7, Rahu: 2, Ketu: 8 };
  const debilitatedSigns = { Sun: 7, Moon: 8, Mars: 4, Mercury: 12, Jupiter: 10, Venus: 6, Saturn: 1, Rahu: 8, Ketu: 2 };
  const ownSigns = { Sun: [5], Moon: [4], Mars: [1, 8], Mercury: [3, 6], Jupiter: [9, 12], Venus: [2, 7], Saturn: [10, 11] };
  if (exaltedSigns[planetName] === signNum) return "Exalted \u2726";
  if (debilitatedSigns[planetName] === signNum) return "Debilitated";
  if (ownSigns[planetName]?.includes(signNum)) return "Own Sign";
  return "Neutral";
}

/**
 * Determine dignity color and style for a planet in Light mode.
 */
function getPlanetStyle(planetName, signNum, isRetrograde) {
  if (isRetrograde) {
    return { color: "#5d5c73", glow: false, suffix: " (R)" }; // Slate / secondary
  }

  const exaltedSigns = {
    "Sun": 1,
    "Moon": 2,
    "Mars": 10,
    "Mercury": 6,
    "Jupiter": 4,
    "Venus": 12,
    "Saturn": 7,
    "Rahu": 2,
    "Ketu": 8
  };

  const debilitatedSigns = {
    "Sun": 7,
    "Moon": 8,
    "Mars": 4,
    "Mercury": 12,
    "Jupiter": 10,
    "Venus": 6,
    "Saturn": 1,
    "Rahu": 8,
    "Ketu": 2
  };

  const ownSigns = {
    "Sun": [5],
    "Moon": [4],
    "Mars": [1, 8],
    "Mercury": [3, 6],
    "Jupiter": [9, 12],
    "Venus": [2, 7],
    "Saturn": [10, 11]
  };

  if (exaltedSigns[planetName] === signNum) {
    return { color: "#7c5800", glow: true, suffix: " (Ex)" }; // Exalted Primary Gold
  }
  if (debilitatedSigns[planetName] === signNum) {
    return { color: "#ba1a1a", glow: false, suffix: " (Deb)" }; // Debilitated Red
  }
  if (ownSigns[planetName] && ownSigns[planetName].includes(signNum)) {
    return { color: "#166534", glow: false, suffix: " (Own)" }; // Own Sign Green
  }

  return { color: "#1a1c1b", glow: false, suffix: "" }; // Neutral On-Surface
}

export default function KundaliChart({ chartData }) {
  const [selectedPlanet, setSelectedPlanet] = useState(null);
  // Define house display centers in 400x400 SVG
  const houseCoordinates = {
    1: { cx: 200, cy: 105, labelY: 140 },
    2: { cx: 100, cy: 52, labelY: 38 },
    3: { cx: 52, cy: 110, labelY: 78 },
    4: { cx: 112, cy: 200, labelY: 178 },
    5: { cx: 52, cy: 288, labelY: 258 },
    6: { cx: 100, cy: 348, labelY: 368 },
    7: { cx: 200, cy: 292, labelY: 262 },
    8: { cx: 300, cy: 348, labelY: 368 },
    9: { cx: 348, cy: 288, labelY: 258 },
    10: { cx: 288, cy: 200, labelY: 178 },
    11: { cx: 348, cy: 110, labelY: 78 },
    12: { cx: 300, cy: 52, labelY: 38 }
  };

  // Determine Lagna sign and corresponding sign numbers
  let lagnaSignIndex = 1; // Default Aries
  if (chartData && chartData.ascendant && chartData.ascendant.sign) {
    const idx = ZODIAC_SIGNS.indexOf(chartData.ascendant.sign);
    if (idx !== -1) {
      lagnaSignIndex = idx + 1;
    }
  }

  // Pre-calculate house sign mapping
  const houseSigns = {};
  for (let houseIdx = 1; houseIdx <= 12; houseIdx++) {
    houseSigns[houseIdx] = ((lagnaSignIndex - 1 + (houseIdx - 1)) % 12) + 1;
  }

  // Group planets into their respective whole-sign houses
  const planetsByHouse = {
    1: [], 2: [], 3: [], 4: [], 5: [], 6: [],
    7: [], 8: [], 9: [], 10: [], 11: [], 12: []
  };

  if (chartData && Array.isArray(chartData.planets)) {
    chartData.planets.forEach((p) => {
      const pSignIdx = ZODIAC_SIGNS.indexOf(p.sign);
      if (pSignIdx !== -1) {
        const signNum = pSignIdx + 1;
        // Calculate whole-sign house relative to Lagna
        const houseNum = ((signNum - lagnaSignIndex + 12) % 12) + 1;

        const isRetro = p.isRetrograde === true || p.isRetrograde === "true" || p.isRetrograde === "YES";
        const styleInfo = getPlanetStyle(p.name, signNum, isRetro);
        const abbr = SANSKRIT_ABBRS[p.name] || p.name.substring(0, 2);

        planetsByHouse[houseNum].push({
          name: p.name,
          abbr,
          signNum,
          isRetro,
          planet: p,
          houseNum,
          ...styleInfo
        });
      }
    });
  }

  return (
    <div className="w-full flex items-center justify-center p-2">
      <svg
        viewBox="0 0 400 400"
        width="100%"
        height="100%"
        className="opacity-90 overflow-visible transition-all duration-300"
      >
        {/* Glow Filters for Exalted Planets */}
        <defs>
          <filter id="gold-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer Square with soft shadow border */}
        <rect
          x="2"
          y="2"
          width="396"
          height="396"
          fill="#ffffff"
          stroke="#d3c4b0"
          strokeWidth="1"
        />

        {/* Diagonal Cross Lines */}
        <line x1="2" y1="2" x2="398" y2="398" stroke="#d3c4b0" strokeWidth="0.8" />
        <line x1="398" y1="2" x2="2" y2="398" stroke="#d3c4b0" strokeWidth="0.8" />

        {/* Inner Diamond (Houses 1, 4, 7, 10 boundaries) */}
        <path
          d="M200 2 L398 200 L200 398 L2 200 Z"
          fill="#fcfcf9"
          stroke="#d3c4b0"
          strokeWidth="0.8"
        />

        {/* Sacred Geometry Dot Center */}
        <circle cx="200" cy="200" r="3" fill="#7c5800" className="opacity-80" />
        <circle cx="200" cy="200" r="8" fill="none" stroke="#7c5800" strokeWidth="0.5" className="opacity-40 animate-pulse" />

        {/* Render Houses, House Numbers and Planets */}
        {Object.entries(houseCoordinates).map(([houseStr, coord]) => {
          const houseNum = parseInt(houseStr);
          const rashiNum = houseSigns[houseNum];
          const planetsInHouse = planetsByHouse[houseNum] || [];

          return (
            <g key={houseNum}>
              {/* House Number (Rashi/Sign Number) */}
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

              {/* Planets inside the house */}
              {planetsInHouse.map((p, index) => {
                // Stack planets vertically or horizontally near house center
                const offsetStep = 15;
                const totalOffset = (planetsInHouse.length - 1) * offsetStep;
                const py = coord.cy - (totalOffset / 2) + (index * offsetStep);

                return (
                  <g key={p.name}>
                    {/* Invisible generous tap target + hover ring */}
                    <circle
                      cx={coord.cx}
                      cy={py - 4}
                      r={11}
                      fill="transparent"
                      className="cursor-pointer"
                      onClick={() => setSelectedPlanet(p)}
                    />
                    <text
                      x={coord.cx}
                      y={py}
                      fill={p.color}
                      fontSize="12"
                      fontWeight="700"
                      fontFamily="Inter"
                      textAnchor="middle"
                      filter={p.glow ? "url(#gold-glow)" : undefined}
                      className="planet-glyph"
                      style={{ userSelect: 'none' }}
                      onClick={() => setSelectedPlanet(p)}
                    >
                      {p.abbr}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>

      {/* ── Planet detail popup ── */}
      {selectedPlanet && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-6"
          style={{ background: "rgba(14,26,55,0.55)" }}
          onClick={() => setSelectedPlanet(null)}
        >
          <div
            className="glass-card relative w-full max-w-[340px] rounded-2xl border border-[#D9A63C]/55 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedPlanet(null)}
              className="absolute right-3 top-3 text-[#7b5800]/50 hover:text-[#7b5800] transition-colors text-lg leading-none"
              aria-label="Close"
            >
              ×
            </button>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-[#FFFDF6]"
                style={{
                  background: selectedPlanet.color === "#ba1a1a" ? "#ba1a1a" : "#C9952A",
                }}
              >
                {selectedPlanet.abbr}
              </div>
              <div>
                <h3 className="font-['Fraunces',serif] text-lg font-bold text-[#022454] leading-tight">
                  {selectedPlanet.name}
                </h3>
                <p className="text-[11.5px] text-[#7b5800] italic -mt-0.5">
                  {SANSKRIT_NAMES[selectedPlanet.name] ?? ""}
                </p>
              </div>
              <span className="ml-auto bg-[#EBF1FA] text-[#1F3A6B] text-[11px] font-bold px-2.5 py-1 rounded-full">
                H{selectedPlanet.houseNum}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 mt-4">
              <PopupCell label="SIGN" value={ZODIAC_SIGNS[selectedPlanet.signNum - 1] ?? "—"} />
              <PopupCell label="DEGREE" value={fmtDegree(selectedPlanet.planet?.normDegree ?? selectedPlanet.planet?.fullDegree)} />
              <PopupCell label="NAKSHATRA" value={selectedPlanet.planet?.nakshatra ?? "—"} />
              <PopupCell label="NAK LORD" value={selectedPlanet.planet?.nakshatra_lord ?? selectedPlanet.planet?.nakshatraLord ?? "—"} />
              <PopupCell label="MOTION" value={selectedPlanet.isRetro ? "Retrograde" : "Direct"} />
              <PopupCell label="DIGNITY" value={dignityWord(selectedPlanet.name, selectedPlanet.signNum, selectedPlanet.isRetro)} />
            </div>

            {PLANET_LORE[selectedPlanet.name] && (
              <p className="mt-3.5 text-[12px] leading-relaxed text-[#5d5c73] italic">
                {PLANET_LORE[selectedPlanet.name]}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PopupCell({ label, value }) {
  return (
    <div className="bg-[#FBF6EA]/70 rounded-lg px-2.5 py-1.5 border border-[#E8D5A7]/60">
      <p className="text-[8.5px] font-bold tracking-[0.12em] text-[#7b5800]/60">{label}</p>
      <p className="text-[12px] font-semibold text-[#022454] truncate">{value}</p>
    </div>
  );
}
