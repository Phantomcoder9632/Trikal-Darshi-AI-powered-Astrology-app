import React, { useState } from 'react';
import { View, Text, Modal, Pressable, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import Svg, { Rect, Line, Path, Circle, Text as SvgText } from 'react-native-svg';
import { colors } from '../theme/colors';
import { fontFamilies } from '../theme/typography';
import { tapLight } from '../services/haptics';

const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

const SANSKRIT_ABBRS: Record<string, string> = {
  Sun: 'Su', Moon: 'Ch', Mars: 'Ma', Mercury: 'Bu',
  Jupiter: 'Gu', Venus: 'Sk', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke',
};

const SANSKRIT_NAMES: Record<string, string> = {
  Sun: 'Surya', Moon: 'Chandra', Mars: 'Mangal', Mercury: 'Budha',
  Jupiter: 'Guru', Venus: 'Shukra', Saturn: 'Shani', Rahu: 'Rahu', Ketu: 'Ketu',
};

// North-Indian house centers on a 400×400 grid (same as the web renderer)
const HOUSE_COORDS: Record<number, { cx: number; cy: number; labelY: number }> = {
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
  12: { cx: 300, cy: 52, labelY: 38 },
};

const EXALTED: Record<string, number> = { Sun: 1, Moon: 2, Mars: 10, Mercury: 6, Jupiter: 4, Venus: 12, Saturn: 7, Rahu: 2, Ketu: 8 };
const DEBILITATED: Record<string, number> = { Sun: 7, Moon: 8, Mars: 4, Mercury: 12, Jupiter: 10, Venus: 6, Saturn: 1, Rahu: 8, Ketu: 2 };
const OWN_SIGNS: Record<string, number[]> = {
  Sun: [5], Moon: [4], Mars: [1, 8], Mercury: [3, 6],
  Jupiter: [9, 12], Venus: [2, 7], Saturn: [10, 11],
};

/** One-line classical flavor text per planet for the detail popup. */
const PLANET_LORE: Record<string, string> = {
  Sun: 'The soul, vitality, father, and royal authority.',
  Moon: 'Mind, emotions, mother, and the tides of memory.',
  Mars: 'Courage, siblings, energy, and the warrior instinct.',
  Mercury: 'Intellect, speech, commerce, and wit.',
  Jupiter: 'Wisdom, dharma, children, and divine grace.',
  Venus: 'Love, art, comfort, and the partner of the flesh.',
  Saturn: 'Discipline, longevity, karma, and patient labor.',
  Rahu: 'Insatiable desire, foreign things, and worldly illusion.',
  Ketu: 'Detachment, moksha, and past-life mastery.',
};

function dignityStyle(planetName: string, signNum: number, isRetro: boolean) {
  if (isRetro) return { color: colors.textMuted, suffix: '(R)' };
  if (EXALTED[planetName] === signNum) return { color: colors.ochre, suffix: '(Ex)' };
  if (DEBILITATED[planetName] === signNum) return { color: colors.error, suffix: '(Deb)' };
  if (OWN_SIGNS[planetName]?.includes(signNum)) return { color: colors.indigoContainer, suffix: '(Own)' };
  return { color: colors.ink, suffix: '' };
}

export interface PlanetRef {
  name: string;
  sign?: string;
  sign_num?: number;
  house?: number;
  isRetrograde?: boolean | string;
  normDegree?: number;
  nakshatra?: string;
  nakshatra_lord?: string;
  speed?: number;
}

export interface KundaliChartProps {
  ascendantSignNum: number;
  planets: PlanetRef[];
  size?: number;
}

/**
 * North-Indian diamond chart. Houses are whole-sign relative to the Lagna;
 * a planet with an explicit `house` (divisional/Gochar payloads) is honored
 * directly, otherwise the house is computed from its sign.
 * Every planet glyph is tappable and opens a detail popup.
 */
function KundaliChart({ ascendantSignNum, planets, size = 320 }: KundaliChartProps) {
  const [selected, setSelected] = useState<{ planet: PlanetRef; house: number } | null>(null);

  const asc = ((Math.round(ascendantSignNum) - 1) % 12 + 12) % 12 + 1;

  const { houseSigns, planetsByHouse } = React.useMemo(() => {
    const hSigns: Record<number, number> = {};
    for (let h = 1; h <= 12; h++) {
      hSigns[h] = ((asc - 1 + (h - 1)) % 12) + 1;
    }

    const pByHouse: Record<number, Array<{ planet: PlanetRef; glyph: PlanetGlyph; y: number }>> = {};
    for (let h = 1; h <= 12; h++) pByHouse[h] = [];

    planets.forEach((p) => {
      let houseNum: number;
      const signIdx = p.sign ? ZODIAC_SIGNS.indexOf(p.sign) : -1;
      if (p.house && signIdx === -1) {
        houseNum = p.house;
      } else if (signIdx !== -1) {
        const signNum = signIdx + 1;
        houseNum = ((signNum - asc + 12) % 12) + 1;
      } else {
        return;
      }
      if (houseNum < 1 || houseNum > 12) return;

      const sNum = signIdx !== -1 ? signIdx + 1 : ((asc - 1 + (houseNum - 1)) % 12) + 1;
      const isRetro = p.isRetrograde === true || p.isRetrograde === 'true' || p.isRetrograde === 'YES';
      const style = dignityStyle(p.name, sNum, isRetro);
      pByHouse[houseNum].push({
        planet: p,
        glyph: { name: p.name, abbr: SANSKRIT_ABBRS[p.name] ?? p.name.slice(0, 2), ...style },
        y: 0,
      });
    });

    return { houseSigns: hSigns, planetsByHouse: pByHouse };
  }, [asc, planets]);

  return (
    <View style={{ width: '100%', alignItems: 'center' }}>
      <Svg viewBox="0 0 400 400" width={size} height={size}>
        <Rect x={2} y={2} width={396} height={396} fill={colors.surface} stroke={colors.sandDeep} strokeWidth={1.2} />
        <Line x1={2} y1={2} x2={398} y2={398} stroke={colors.sandDeep} strokeWidth={0.9} />
        <Line x1={398} y1={2} x2={2} y2={398} stroke={colors.sandDeep} strokeWidth={0.9} />
        <Path d="M200 2 L398 200 L200 398 L2 200 Z" fill="#FDFBF3" stroke={colors.sandDeep} strokeWidth={0.9} />
        <Circle cx={200} cy={200} r={3} fill={colors.ochre} opacity={0.85} />
        <Circle cx={200} cy={200} r={8} fill="none" stroke={colors.ochre} strokeWidth={0.6} opacity={0.4} />

        {Object.entries(HOUSE_COORDS).map(([houseStr, coord]) => {
          const houseNum = Number(houseStr);
          const rashiNum = houseSigns[houseNum];
          const glyphs = planetsByHouse[houseNum] ?? [];
          const step = 15;
          const total = (glyphs.length - 1) * step;
          // Remember each glyph's y so the tap targets match the visuals.
          glyphs.forEach((g, idx) => {
            g.y = coord.cy - total / 2 + idx * step;
          });
          return (
            <React.Fragment key={houseStr}>
              <SvgText x={coord.cx} y={coord.labelY} fill={colors.ochre} fontSize={13} fontWeight="700" textAnchor="middle">
                {rashiNum}
              </SvgText>
              {glyphs.map((g) => (
                <SvgGroup
                  key={`${houseStr}-${g.glyph.name}`}
                  x={coord.cx}
                  y={g.y}
                  glyph={g.glyph}
                  onPress={() => {
                    tapLight();
                    setSelected({ planet: g.planet, house: houseNum });
                  }}
                />
              ))}
            </React.Fragment>
          );
        })}
      </Svg>
      <Legend />

      {/* Planet detail popup */}
      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <TouchableWithoutFeedback onPress={() => setSelected(null)}>
          <View style={styles.backdrop}>
            <View style={styles.sheet}>
              {selected && (
                <>
                  <View style={styles.sheetHead}>
                    <View style={[styles.sigilDot, { backgroundColor: dignityStyle(selected.planet.name, signNumberOf(selected.planet, asc), isRetro(selected.planet)).color }]} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.sheetTitle}>
                        {SANSKRIT_ABBRS[selected.planet.name] ?? selected.planet.name.slice(0, 2)} · {selected.planet.name}
                      </Text>
                      <Text style={styles.sheetSans}>{SANSKRIT_NAMES[selected.planet.name] ?? ''}</Text>
                    </View>
                    <Text style={styles.houseBadge}>H{selected.house}</Text>
                  </View>

                  <View style={styles.rowGrid}>
                    <DetailCell label="SIGN" value={selected.planet.sign ?? '—'} />
                    <DetailCell label="DEGREE" value={fmtDeg(selected.planet.normDegree)} />
                    <DetailCell label="NAKSHATRA" value={selected.planet.nakshatra ?? '—'} />
                    <DetailCell label="NAK LORD" value={selected.planet.nakshatra_lord ?? '—'} />
                    <DetailCell
                      label="MOTION"
                      value={isRetro(selected.planet) ? 'Retrograde' : selected.planet.speed != null ? 'Direct' : '—'}
                    />
                    <DetailCell label="DIGNITY" value={dignityWord(selected.planet, asc)} />
                  </View>

                  {PLANET_LORE[selected.planet.name] && (
                    <Text style={styles.lore}>{PLANET_LORE[selected.planet.name]}</Text>
                  )}

                   <Pressable style={styles.closeBtn} onPress={() => setSelected(null)}>
                    <Text style={styles.closeTxt}>CLOSE ✦</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

export default React.memo(KundaliChart);

// ── helpers ────────────────────────────────────────────────────────────────

function isRetro(p: PlanetRef) {
  return p.isRetrograde === true || p.isRetrograde === 'true' || p.isRetrograde === 'YES';
}

function signNumberOf(p: PlanetRef, asc: number): number {
  const idx = p.sign ? ZODIAC_SIGNS.indexOf(p.sign) : -1;
  if (idx !== -1) return idx + 1;
  return asc; // fallback
}

function fmtDeg(d?: number) {
  if (d == null || Number.isNaN(Number(d))) return '—';
  const deg = Math.floor(d);
  const min = Math.floor((d - deg) * 60);
  const sec = Math.round(((d - deg) * 60 - min) * 60);
  return `${deg}°${String(min).padStart(2, '0')}′${String(sec).padStart(2, '0')}″`;
}

function dignityWord(p: PlanetRef, asc: number): string {
  const sNum = signNumberOf(p, asc);
  if (isRetro(p)) return 'Retrograde';
  if (EXALTED[p.name] === sNum) return 'Exalted ✦';
  if (DEBILITATED[p.name] === sNum) return 'Debilitated';
  if (OWN_SIGNS[p.name]?.includes(sNum)) return 'Own Sign';
  return 'Neutral';
}

/** Tappable planet glyph: expanded touch target hit-area over visible text. */
const SvgGroup = React.memo(
  function SvgGroup({ x, y, glyph, onPress }: { x: number; y: number; glyph: PlanetGlyph; onPress: () => void }) {
    return (
      <>
        <Rect
          x={x - 19}
          y={y - 13}
          width={38}
          height={26}
          fill="transparent"
          onPress={onPress}
        />
        <SvgText x={x} y={y} fill={glyph.color} fontSize={13} fontWeight="700" textAnchor="middle" pointerEvents="none">
          {glyph.abbr}
        </SvgText>
      </>
    );
  },
  (prev, next) =>
    prev.x === next.x &&
    prev.y === next.y &&
    prev.glyph.name === next.glyph.name &&
    prev.glyph.color === next.glyph.color
);

interface PlanetGlyph {
  name: string;
  abbr: string;
  color: string;
  suffix: string;
}

const DetailCell = React.memo(function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexBasis: '47%', flexGrow: 1, minWidth: 120, gap: 1 }}>
      <Text style={{ color: colors.textFaint, fontSize: 8.5, fontWeight: '700', letterSpacing: 1 }}>{label}</Text>
      <Text style={{ color: colors.indigo, fontSize: 12, fontWeight: '600' }} numberOfLines={1}>{value}</Text>
    </View>
  );
});

const Legend = React.memo(function Legend() {
  const items = [
    { color: colors.ochre, label: 'Exalted' },
    { color: colors.indigoContainer, label: 'Own' },
    { color: colors.error, label: 'Debilitated' },
    { color: colors.textMuted, label: 'Retrograde' },
  ];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 6 }}>
      {items.map((it) => (
        <View key={it.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: it.color }} />
          <Text style={{ fontSize: 9.5, color: it.color, fontWeight: '600' }}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(14,26,55,0.55)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  sheet: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(217,166,60,0.55)',
    padding: 18,
  },
  sheetHead: { flexDirection: 'row', alignItems: 'center' },
  sigilDot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  sheetTitle: { color: colors.indigo, fontWeight: '800', fontSize: 16, fontFamily: fontFamilies.serif },
  sheetSans: { color: colors.ochre, fontSize: 11.5, marginTop: 1, fontStyle: 'italic' },
  houseBadge: {
    backgroundColor: colors.blueWash,
    color: colors.indigoContainer,
    fontWeight: '800',
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  rowGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  lore: { marginTop: 12, color: colors.textMuted, fontSize: 12, lineHeight: 18, fontStyle: 'italic' },
  closeBtn: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.indigoContainer,
  },
  closeTxt: { color: colors.goldLight, fontWeight: '800', fontSize: 12, letterSpacing: 1 },
  closeStar: { color: colors.goldLight, fontWeight: '800', fontSize: 12 },
});
