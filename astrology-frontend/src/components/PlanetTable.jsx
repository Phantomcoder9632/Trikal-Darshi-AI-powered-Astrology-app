import React from 'react';

const SANSKRIT_NAMES = {
  "Sun": "Surya",
  "Moon": "Chandra",
  "Mars": "Mangal",
  "Mercury": "Budha",
  "Jupiter": "Guru",
  "Venus": "Shukra",
  "Saturn": "Shani",
  "Rahu": "Rahu",
  "Ketu": "Ketu"
};

const EXALTED_SIGNS = {
  "Sun": "Aries",
  "Moon": "Taurus",
  "Mars": "Capricorn",
  "Mercury": "Virgo",
  "Jupiter": "Cancer",
  "Venus": "Pisces",
  "Saturn": "Libra",
  "Rahu": "Taurus",
  "Ketu": "Scorpio"
};

const DEBILITATED_SIGNS = {
  "Sun": "Libra",
  "Moon": "Scorpio",
  "Mars": "Cancer",
  "Mercury": "Pisces",
  "Jupiter": "Capricorn",
  "Venus": "Virgo",
  "Saturn": "Aries",
  "Rahu": "Scorpio",
  "Ketu": "Taurus"
};

const OWN_SIGNS = {
  "Sun": ["Leo"],
  "Moon": ["Cancer"],
  "Mars": ["Aries", "Scorpio"],
  "Mercury": ["Gemini", "Virgo"],
  "Jupiter": ["Sagittarius", "Pisces"],
  "Venus": ["Taurus", "Libra"],
  "Saturn": ["Capricorn", "Aquarius"]
};

/**
 * Determine planetary dignity details.
 */
function getDignityDetails(planetName, signName) {
  if (EXALTED_SIGNS[planetName] === signName) {
    return { text: "UCHA (EXALT)", badgeClass: "bg-primary/10 text-primary border border-primary/20" };
  }
  if (DEBILITATED_SIGNS[planetName] === signName) {
    return { text: "NEECHA (DEB)", badgeClass: "bg-error/10 text-error border border-error/20" };
  }
  if (OWN_SIGNS[planetName] && OWN_SIGNS[planetName].includes(signName)) {
    return { text: "SWAKSHETRA", badgeClass: "bg-[#166534]/10 text-[#166534] border border-[#166534]/20" };
  }
  return { text: "NEUTRAL", badgeClass: "bg-outline-variant/15 text-on-surface-variant" };
}

export default function PlanetTable({ planets }) {
  if (!Array.isArray(planets)) return null;

  return (
    <div className="w-full flex flex-col">
      {/* Table Header Bar */}
      <div className="bg-surface-container-low px-5 py-3 border-b border-outline-variant/20 flex items-center justify-between">
        <span className="font-label-sm text-[11px] font-semibold text-on-surface-variant uppercase tracking-widest">
          Planetary Positions & Strengths
        </span>
        <span className="text-[10px] font-bold text-primary tracking-widest uppercase">
          Grahas
        </span>
      </div>

      {/* Responsive Table Wrapper */}
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse font-body-md text-sm">
          <thead>
            <tr className="bg-surface-container-lowest border-b border-outline-variant/20">
              <th className="px-5 py-3 font-label-sm text-[11px] font-bold text-primary uppercase tracking-wider">
                Planet
              </th>
              <th className="px-5 py-3 font-label-sm text-[11px] font-bold text-primary uppercase tracking-wider">
                Sign / House
              </th>
              <th className="px-5 py-3 font-label-sm text-[11px] font-bold text-primary uppercase tracking-wider">
                Dignity
              </th>
              <th className="px-5 py-3 font-label-sm text-[11px] font-bold text-primary uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {planets.map((p, index) => {
              const isRetro = p.isRetrograde === true || p.isRetrograde === "true" || p.isRetrograde === "YES";
              const dignity = getDignityDetails(p.name, p.sign);
              const displayName = SANSKRIT_NAMES[p.name] 
                ? `${p.name} (${SANSKRIT_NAMES[p.name]})` 
                : p.name;
              
              const rowClass = index % 2 === 0 
                ? 'bg-surface hover:bg-surface-container-low transition-colors duration-150' 
                : 'bg-surface-container-lowest hover:bg-surface-container-low transition-colors duration-150';

              return (
                <tr key={p.name} className={`${rowClass} border-b border-outline-variant/10`}>
                  {/* Planet Name */}
                  <td className="px-5 py-3.5 font-accent-italic italic text-primary text-[15px] font-medium">
                    {displayName}
                  </td>
                  {/* Sign & House */}
                  <td className="px-5 py-3.5 font-medium text-on-surface">
                    {p.sign} <span className="text-outline/70 font-normal">in H{p.house}</span>
                  </td>
                  {/* Dignity */}
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wider ${dignity.badgeClass}`}>
                      {dignity.text}
                    </span>
                  </td>
                  {/* Status */}
                  <td className="px-5 py-3.5 text-xs">
                    {isRetro ? (
                      <span className="text-[#5d5c73] font-bold bg-[#e2e0fb]/30 px-2 py-0.5 rounded border border-[#e2e0fb]/50 text-[10px]">
                        RETROGRADE (R)
                      </span>
                    ) : (
                      <span className="text-outline/65 font-medium text-[10px]">DIRECT</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
