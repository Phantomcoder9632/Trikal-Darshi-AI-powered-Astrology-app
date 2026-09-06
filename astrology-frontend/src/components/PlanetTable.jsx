import React from 'react';
import { useTranslation } from 'react-i18next';

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

function getDignityKey(planetName, signName) {
  if (EXALTED_SIGNS[planetName] === signName) return 'exalted';
  if (DEBILITATED_SIGNS[planetName] === signName) return 'debil';
  if (OWN_SIGNS[planetName]?.includes(signName)) return 'own';
  return 'neutral';
}

function getDignityStyle(key) {
  switch (key) {
    case 'exalted': return { dot: '#7b5800', bg: 'rgba(217,166,60,0.18)', border: 'rgba(217,166,60,0.4)', color: '#7b5800' };
    case 'debil':   return { dot: '#BA1A1A', bg: 'rgba(186,26,26,0.10)', border: 'rgba(186,26,26,0.3)', color: '#BA1A1A' };
    case 'own':     return { dot: '#1F3A6B', bg: 'rgba(31,58,107,0.10)',  border: 'rgba(31,58,107,0.25)',  color: '#1F3A6B' };
    default:        return { dot: '#4A567A', bg: 'rgba(74,86,122,0.08)', border: 'rgba(74,86,122,0.2)', color: '#4A567A' };
  }
}

export default React.memo(function PlanetTable({ planets }) {
  const { t } = useTranslation();

  // Planet display name — use translation key if available, else fall back to original name
  function getPlanetLabel(name) {
    const key = `dashboard.values.${name.toLowerCase()}`;
    const translated = t(key);
    return translated !== key ? translated : name;
  }

  // Sanskrit sub-label (always show short Sanskrit name for authenticity)
  const SANSKRIT_NAMES = {
    Sun: 'Surya', Moon: 'Chandra', Mars: 'Mangal',
    Mercury: 'Budha', Jupiter: 'Guru', Venus: 'Shukra',
    Saturn: 'Shani', Rahu: 'Rahu', Ketu: 'Ketu',
  };

  if (!Array.isArray(planets) || planets.length === 0) return null;

  return (
    <div className="planet-table-wrapper">

      {/* Header bar */}
      <div className="planet-table-header">
        <span className="planet-table-header-label">{t('dashboard_components.planet_table.title')}</span>
        <span className="planet-table-header-label planet-table-header-label-gold">{t('dashboard_components.planet_table.grahas')}</span>
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
              {[
                t('dashboard_components.planet_table.headers.planet'),
                t('dashboard_components.planet_table.headers.sign'),
                t('dashboard_components.planet_table.headers.dignity'),
                t('dashboard_components.planet_table.headers.dir'),
              ].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {planets.map((p) => {
              const isRetro  = p.isRetrograde === true || p.isRetrograde === 'true' || p.isRetrograde === 'YES';
              const dignityKey = getDignityKey(p.name, p.sign);
              const dignity  = getDignityStyle(dignityKey);
              const dignityLabel = t(`dashboard_components.planet_table.dignity.${dignityKey}`);
              const sanskrit = SANSKRIT_NAMES[p.name];

              return (
                <tr key={p.name}>
                  {/* Planet name */}
                  <td>
                    <div className="planet-name">{getPlanetLabel(p.name)}</div>
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
                      {dignityLabel}
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
          { color: '#7c5800', labelKey: 'exalt' },
          { color: '#166534', labelKey: 'own'   },
          { color: '#ba1a1a', labelKey: 'debil' },
          { color: '#5d5c73', labelKey: 'retro' },
        ].map(({ color, labelKey }) => (
          <span key={labelKey} className="planet-table-legend-item" style={{ color }}>
            <span className="planet-table-legend-dot" style={{ background: color }} />
            {t(`dashboard_components.planet_table.legend.${labelKey}`)}
          </span>
        ))}
      </div>
    </div>
  );
});
