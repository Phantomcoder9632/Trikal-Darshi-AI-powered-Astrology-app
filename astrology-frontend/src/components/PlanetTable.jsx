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

export default function PlanetTable({ planets }) {
  if (!Array.isArray(planets) || planets.length === 0) return null;

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* Header bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', borderBottom: '1px solid rgba(211,196,176,0.25)',
        background: 'rgba(238,238,235,0.6)',
      }}>
        <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4f4536' }}>
          Planetary Positions
        </span>
        <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7c5800' }}>
          Grahas
        </span>
      </div>

      {/* Table — uses explicit layout so columns never overflow */}
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '30%' }} />  {/* Planet */}
            <col style={{ width: '28%' }} />  {/* Sign/House */}
            <col style={{ width: '26%' }} />  {/* Dignity */}
            <col style={{ width: '16%' }} />  {/* Motion */}
          </colgroup>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(211,196,176,0.25)', background: '#ffffff' }}>
              {['Planet', 'Sign / H.', 'Dignity', 'Dir.'].map((h) => (
                <th key={h} style={{
                  padding: '8px 10px', textAlign: 'left',
                  fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: '#7c5800',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {planets.map((p, index) => {
              const isRetro  = p.isRetrograde === true || p.isRetrograde === 'true' || p.isRetrograde === 'YES';
              const dignity  = getDignity(p.name, p.sign);
              const sanskrit = SANSKRIT_NAMES[p.name];
              const rowBg    = index % 2 === 0 ? '#ffffff' : 'rgba(244,244,241,0.6)';

              return (
                <tr key={p.name} style={{
                  background: rowBg,
                  borderBottom: '1px solid rgba(211,196,176,0.12)',
                  transition: 'background 0.15s',
                }}>
                  {/* Planet */}
                  <td style={{ padding: '9px 10px', verticalAlign: 'top' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#1a1c1b', lineHeight: 1.2 }}>
                      {p.name}
                    </div>
                    {sanskrit && sanskrit !== p.name && (
                      <div style={{ fontSize: '10px', fontStyle: 'italic', color: '#817563', lineHeight: 1.2, marginTop: '1px' }}>
                        {sanskrit}
                      </div>
                    )}
                  </td>

                  {/* Sign / House */}
                  <td style={{ padding: '9px 10px', verticalAlign: 'middle' }}>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#1a1c1b' }}>{p.sign}</span>
                    <span style={{ fontSize: '10px', color: '#817563', marginLeft: '3px' }}>H{p.house}</span>
                  </td>

                  {/* Dignity badge */}
                  <td style={{ padding: '9px 8px', verticalAlign: 'middle' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '3px',
                      padding: '2px 7px', borderRadius: '9999px',
                      fontSize: '9px', fontWeight: 700, whiteSpace: 'nowrap',
                      background: dignity.bg, border: `1px solid ${dignity.border}`, color: dignity.color,
                    }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: dignity.dot, flexShrink: 0 }} />
                      {dignity.text}
                    </span>
                  </td>

                  {/* Motion */}
                  <td style={{ padding: '9px 8px', verticalAlign: 'middle', textAlign: 'center' }}>
                    {isRetro ? (
                      <span style={{
                        display: 'inline-block', fontSize: '10px', fontWeight: 700,
                        color: '#5d5c73', lineHeight: 1,
                      }} title="Retrograde">
                        ℞
                      </span>
                    ) : (
                      <span style={{ fontSize: '9px', fontWeight: 600, color: 'rgba(129,117,99,0.5)', letterSpacing: '0.05em' }}>
                        D
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend footer */}
      <div style={{
        padding: '7px 12px', borderTop: '1px solid rgba(211,196,176,0.2)',
        display: 'flex', gap: '10px', flexWrap: 'wrap', background: 'rgba(238,238,235,0.4)',
        fontSize: '9px', fontWeight: 600,
      }}>
        {[
          { color: '#7c5800', label: 'Exalt' },
          { color: '#166534', label: 'Own'   },
          { color: '#ba1a1a', label: 'Debil' },
          { color: '#5d5c73', label: '℞ Retro' },
        ].map(({ color, label }) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px', color }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
