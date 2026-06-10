import React from 'react';

const SANSKRIT_NAMES = {
  Sun: 'Surya', Moon: 'Chandra', Mars: 'Mangal',
  Mercury: 'Budha', Jupiter: 'Guru', Venus: 'Shukra',
  Saturn: 'Shani', Rahu: 'Rahu', Ketu: 'Ketu',
};

const EXALTED_SIGNS = {
  Sun: 'Aries', Moon: 'Taurus', Mars: 'Capricorn',
  Mercury: 'Virgo', Jupiter: 'Cancer', Venus: 'Pisces',
  Saturn: 'Libra', Rahu: 'Taurus', Ketu: 'Scorpio',
};

const DEBILITATED_SIGNS = {
  Sun: 'Libra', Moon: 'Scorpio', Mars: 'Cancer',
  Mercury: 'Pisces', Jupiter: 'Capricorn', Venus: 'Virgo',
  Saturn: 'Aries', Rahu: 'Scorpio', Ketu: 'Taurus',
};

const OWN_SIGNS = {
  Sun: ['Leo'], Moon: ['Cancer'], Mars: ['Aries', 'Scorpio'],
  Mercury: ['Gemini', 'Virgo'], Jupiter: ['Sagittarius', 'Pisces'],
  Venus: ['Taurus', 'Libra'], Saturn: ['Capricorn', 'Aquarius'],
};

function getDignity(planetName, signName) {
  if (EXALTED_SIGNS[planetName] === signName)
    return { text: 'Exalted', dot: '#7c5800', bg: 'rgba(124,88,0,0.08)', border: 'rgba(124,88,0,0.25)', color: '#7c5800' };
  if (DEBILITATED_SIGNS[planetName] === signName)
    return { text: 'Debil.',  dot: '#ba1a1a', bg: 'rgba(186,26,26,0.08)', border: 'rgba(186,26,26,0.25)', color: '#ba1a1a' };
  if (OWN_SIGNS[planetName]?.includes(signName))
    return { text: 'Own',     dot: '#166534', bg: 'rgba(22,101,52,0.08)',  border: 'rgba(22,101,52,0.25)',  color: '#166534' };
  return   { text: 'Neutral', dot: '#817563', bg: 'rgba(129,117,99,0.08)', border: 'rgba(211,196,176,0.4)', color: '#817563' };
}

export default React.memo(function PlanetTable({ planets }) {
  if (!Array.isArray(planets) || planets.length === 0) return null;

  return (
    <div className="planet-table-wrapper">

      {/* Header bar */}
      <div className="planet-table-header">
        <span className="planet-table-header-label">Planetary Positions</span>
        <span className="planet-table-header-label planet-table-header-label-gold">Grahas</span>
      </div>

      {/* Table */}
      <div className="planet-table-scroll">
        <table className="planet-table">
          <colgroup>
            <col className="col-planet" />
            <col className="col-sign" />
            <col className="col-dignity" />
            <col className="col-motion" />
          </colgroup>
          <thead>
            <tr>
              {['Planet', 'Sign / H.', 'Dignity', 'Dir.'].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {planets.map((p) => {
              const isRetro  = p.isRetrograde === true || p.isRetrograde === 'true' || p.isRetrograde === 'YES';
              const dignity  = getDignity(p.name, p.sign);
              const sanskrit = SANSKRIT_NAMES[p.name];

              return (
                <tr key={p.name}>
                  {/* Planet name */}
                  <td>
                    <div className="planet-name">{p.name}</div>
                    {sanskrit && sanskrit !== p.name && (
                      <div className="planet-sanskrit">{sanskrit}</div>
                    )}
                  </td>

                  {/* Sign / House */}
                  <td className="td-middle">
                    <span className="planet-sign-text">{p.sign}</span>
                    <span className="planet-house-text">H{p.house}</span>
                  </td>

                  {/* Dignity badge */}
                  <td className="td-middle">
                    <span
                      className="dignity-badge"
                      style={{
                        background: dignity.bg,
                        border: `1px solid ${dignity.border}`,
                        color: dignity.color,
                      }}
                    >
                      <span className="dignity-dot" style={{ background: dignity.dot }} />
                      {dignity.text}
                    </span>
                  </td>

                  {/* Motion */}
                  <td className="td-center">
                    {isRetro ? (
                      <span className="planet-retro" title="Retrograde">℞</span>
                    ) : (
                      <span className="planet-direct">D</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend footer */}
      <div className="planet-table-legend">
        {[
          { color: '#7c5800', label: 'Exalt' },
          { color: '#166534', label: 'Own'   },
          { color: '#ba1a1a', label: 'Debil' },
          { color: '#5d5c73', label: '℞ Retro' },
        ].map(({ color, label }) => (
          <span key={label} className="planet-table-legend-item" style={{ color }}>
            <span className="planet-table-legend-dot" style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
});
