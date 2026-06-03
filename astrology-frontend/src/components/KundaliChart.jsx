import React from 'react';

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
                  <text
                    key={p.name}
                    x={coord.cx}
                    y={py}
                    fill={p.color}
                    fontSize="12"
                    fontWeight="700"
                    fontFamily="Inter"
                    textAnchor="middle"
                    filter={p.glow ? "url(#gold-glow)" : undefined}
                    style={{
                      transition: 'all 0.3s ease'
                    }}
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
  );
}
