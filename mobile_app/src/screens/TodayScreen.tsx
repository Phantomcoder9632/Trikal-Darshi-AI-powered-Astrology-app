import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import SriYantraVideo from '../components/SriYantraVideo';
import { colors } from '../theme/colors';
import { type as typeScale, radii, spacing } from '../theme/typography';
import { Card, SectionTitle, PrimaryButton } from '../components/ui';
import { getGochar, getChart, GocharPayload, ChartData, Planet } from '../services/api';
import { tapLight, tapMedium, successTick, warningBuzz } from '../services/haptics';
import { friendlyError } from '../services/errors';

/**
 * TODAY — the daily cosmic almanac.
 *
 * Fetches the public /chart/gochar endpoint (live Swiss-Ephemeris transits)
 * and derives the day's Panchanga client-side from the Sun/Moon longitudes:
 *   Tithi  = 12° steps of Moon−Sun separation (30 total)
 *   Nakshatra = 13°20′ steps of the Moon
 *   Yoga   = 13°20′ steps of Sun+Moon
 *   Karana = 6° steps of Moon−Sun (11 named, repeating)
 * When reached with a chartId (via the Dashboard ✦), a "For Your Chart"
 * section overlays each transit onto the natal whole-sign houses, and the
 * AI Jyotishi can be asked for a one-line daily reading.
 */

const ZODIAC = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

const TITHIS = [
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashthi',
  'Saptami', 'Ashtami', 'Navami', 'Dashami', 'Ekadashi', 'Dwadashi',
  'Trayodashi', 'Chaturdashi', 'Purnima', 'Pratipada', 'Dwitiya', 'Tritiya',
  'Chaturthi', 'Panchami', 'Shashthi', 'Saptami', 'Ashtami', 'Navami',
  'Dashami', 'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Amavasya',
];

const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
];

const YOGAS = [
  'Vishkambha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana', 'Atiganda',
  'Sukarman', 'Dhriti', 'Shula', 'Ganda', 'Vriddhi', 'Dhruva',
  'Vyaghata', 'Harshana', 'Vajra', 'Siddhi', 'Vyatipata', 'Variyana',
  'Parigha', 'Shiva', 'Siddha', 'Sadhya', 'Shubha', 'Shukla', 'Brahma', 'Indra', 'Vaidhriti',
];

const KARANAS = ['Bava', 'Balava', 'Kaulava', 'Taitila', 'Gara', 'Vanija', 'Vishti'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEK_LORDS = ['Surya', 'Chandra', 'Mangal', 'Budha', 'Guru', 'Shukra', 'Shani'];

const MOON_PHASE_ICONS = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'];

const GRAHA_EMOJI: Record<string, string> = {
  Sun: '☀️', Moon: '🌙', Mars: '🔥', Mercury: '💬', Jupiter: '🪐',
  Venus: '💠', Saturn: '⏳', Rahu: '☊', Ketu: '☋',
};

interface Panchanga {
  tithi: string;
  tithiNum: number;
  paksha: string;
  nakshatra: string;
  nakPada: number;
  yoga: string;
  karana: string;
  moonPhaseIcon: string;
  moonSign: string;
  sunSign: string;
}

function computePanchanga(planets: Planet[]): Panchanga | null {
  const sun = planets.find((p) => p.name === 'Sun');
  const moon = planets.find((p) => p.name === 'Moon');
  if (!sun?.fullDegree && !sun?.normDegree && sun?.sign == null) return null;
  if (!moon) return null;

  const sunLon = typeof sun.fullDegree === 'number' ? sun.fullDegree : (ZODIAC.indexOf(sun.sign ?? '') * 30 + (sun.normDegree ?? 0));
  const moonLon = typeof moon.fullDegree === 'number' ? moon.fullDegree : (ZODIAC.indexOf(moon.sign ?? '') * 30 + (moon.normDegree ?? 0));
  if (Number.isNaN(sunLon) || Number.isNaN(moonLon)) return null;

  const diff = (moonLon - sunLon + 360) % 360;
  const tithiIdx = Math.floor(diff / 12); // 0..29
  const paksha = tithiIdx < 15 ? 'Shukla' : 'Krishna';

  const nakIdx = Math.floor(moonLon / (360 / 27));
  const nakFrac = (moonLon % (360 / 27)) / (360 / 27);
  const pada = Math.floor(nakFrac * 4) + 1;

  const yogaIdx = Math.floor(((moonLon + sunLon) % 360) / (360 / 27));
  const karanaIdx = Math.floor(diff / 6); // 0..59
  const karanaName =
    karanaIdx === 0 ? 'Kimstughna' : karanaIdx >= 57 ? ['Shakuni', 'Chatushpada', 'Naga'][karanaIdx - 57] : KARANAS[(karanaIdx - 1) % 7];

  const phaseFrac = diff / 360;
  const phaseIcon = MOON_PHASE_ICONS[Math.min(7, Math.floor(phaseFrac * 8))];

  return {
    tithi: TITHIS[tithiIdx] ?? '—',
    tithiNum: (tithiIdx % 15) + 1,
    paksha,
    nakshatra: NAKSHATRAS[nakIdx] ?? '—',
    nakPada: pada,
    yoga: YOGAS[yogaIdx] ?? '—',
    karana: karanaName ?? '—',
    moonPhaseIcon: phaseIcon,
    moonSign: moon.sign ?? '—',
    sunSign: sun.sign ?? '—',
  };
}

export default function TodayScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const chartId: string | undefined = route.params?.chartId;

  const [gochar, setGochar] = useState<GocharPayload | null>(null);
  const [chart, setChart] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [dailyReading, setDailyReading] = useState('');
  const [readingLoading, setReadingLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setError('');
      setLoading(true);
      const g = await getGochar();
      setGochar(g);
      if (chartId) {
        try {
          const c = await getChart(chartId);
          setChart(c);
        } catch {
          /* chart overlay is optional — panchanga still works */
        }
      }
    } catch (err: any) {
      warningBuzz();
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, [chartId]);

  useEffect(() => {
    load();
  }, [load]);

  const askDailyReading = async () => {
    if (!chartId || !gochar) return;
    tapMedium();
    setReadingLoading(true);
    setDailyReading('');
    try {
      const { streamChatResponse } = await import('../services/api');
      const prompt =
        'In 3 sentences maximum, give my daily reading: today\'s Moon sign and nakshatra, how today\'s Moon transit falls in my natal chart (which house from my Lagna), and one practical suggestion for the day. Be warm, classical, and concise.';
      let acc = '';
      await streamChatResponse(
        prompt,
        chartId,
        [],
        (chart as any)?.language || 'english',
        (chunk) => {
          acc += chunk;
          setDailyReading(acc);
        }
      );
      successTick();
    } catch {
      setDailyReading('The stream was interrupted. Please tap again.');
      warningBuzz();
    } finally {
      setReadingLoading(false);
    }
  };

  const panchanga = gochar?.planets ? computePanchanga(gochar.planets) : null;
  const now = new Date();

  // Natal Moon sign for transit comparison
  const natalMoon = chart?.planets?.find((p) => p.name === 'Moon');
  const natalAscSign = chart?.ascendant?.sign;
  const natalAscIdx = natalAscSign ? ZODIAC.indexOf(natalAscSign) : -1;

  // Personal overlay: transit Moon's house from natal Lagna
  const transitMoon = gochar?.planets?.find((p) => p.name === 'Moon');
  const transitMoonHouse =
    natalAscIdx >= 0 && transitMoon?.sign
      ? ((ZODIAC.indexOf(transitMoon.sign) - natalAscIdx + 12) % 12) + 1
      : null;

  // Jupiter & Saturn transits — the slow karmic weather
  const transitJupiter = gochar?.planets?.find((p) => p.name === 'Jupiter');
  const transitSaturn = gochar?.planets?.find((p) => p.name === 'Saturn');
  const jupHouse =
    natalAscIdx >= 0 && transitJupiter?.sign
      ? ((ZODIAC.indexOf(transitJupiter.sign) - natalAscIdx + 12) % 12) + 1
      : null;
  const satHouse =
    natalAscIdx >= 0 && transitSaturn?.sign
      ? ((ZODIAC.indexOf(transitSaturn.sign) - natalAscIdx + 12) % 12) + 1
      : null;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper }}>
        <HeaderBar title="TODAY" onBack={() => navigation.goBack()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%' }}>
          <SriYantraVideo height={300} />
        </View>
      </View>
    );
  }

  if (error && !gochar) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper }}>
        <HeaderBar title="TODAY" onBack={() => navigation.goBack()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 }}>
          <Text style={{ color: colors.error, fontSize: 30 }}>⚠</Text>
          <Text style={[typeScale.headlineSm, { color: colors.indigo, marginTop: 10, textAlign: 'center' }]}>✦ Sky Unavailable ✦</Text>
          <Text style={[typeScale.bodySm, { color: colors.textMuted, textAlign: 'center', marginTop: 6 }]}>{error}</Text>
          <PrimaryButton title="RETRY" onPress={load} style={{ marginTop: 20, minWidth: 160 }} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <HeaderBar title="TODAY" subtitle={now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 48 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            tintColor={colors.gold}
          />
        }
      >
        {/* ── Panchanga card ── */}
        <Card style={{ padding: 16 }} withAccents>
          <SectionTitle
            right={
              <Text style={{ fontSize: 20 }}>{panchanga?.moonPhaseIcon ?? '🌙'}</Text>
            }
          >
            TODAY'S PANCHANGA • LIVE
          </SectionTitle>
          {panchanga ? (
            <>
              <Text style={[typeScale.headline, { color: colors.indigo, fontSize: 22 }]}>
                {panchanga.paksha} {panchanga.tithi}
              </Text>
              <Text style={[typeScale.bodySm, { color: colors.ochre, marginTop: 2 }]}>
                Moon in {panchanga.moonSign} · {panchanga.nakshatra} pada {panchanga.nakPada}
              </Text>
              <View style={[styles.panchGrid, { marginTop: 12 }]}>
                <PanchCell label="TITHI" value={`${panchanga.tithiNum} · ${panchanga.tithi}`} />
                <PanchCell label="NAKSHATRA" value={panchanga.nakshatra} />
                <PanchCell label="YOGA" value={panchanga.yoga} />
                <PanchCell label="KARANA" value={panchanga.karana} />
                <PanchCell label="SURYA" value={panchanga.sunSign} />
                <PanchCell label="CHANDRA" value={panchanga.moonSign} />
              </View>
              <Text style={[typeScale.caption, { color: colors.textFaint, marginTop: 12 }]}>
                {WEEKDAYS[now.getDay()]} — day of {WEEK_LORDS[now.getDay()]}
              </Text>
            </>
          ) : (
            <Text style={[typeScale.bodySm, { color: colors.textMuted }]}>Panchanga needs live Sun & Moon positions — pull down to refresh.</Text>
          )}
        </Card>

        {/* ── Graha positions ── */}
        <View style={{ marginTop: spacing.lg }}>
          <Card style={{ padding: 16 }}>
            <SectionTitle>THE NINE TODAY • SIDEREAL POSITIONS</SectionTitle>
            <View style={{ gap: 6 }}>
              {(gochar?.planets ?? []).map((p) => {
                const retro = p.isRetrograde === true || p.isRetrograde === 'true';
                return (
                  <View key={p.name} style={styles.grahaRow}>
                    <Text style={{ fontSize: 15, width: 24 }}>{GRAHA_EMOJI[p.name] ?? '✦'}</Text>
                    <Text style={[typeScale.bodySm, { color: colors.ink, flex: 1, fontWeight: '700' }]}>{p.name}</Text>
                    <Text style={[typeScale.bodySm, { color: colors.indigoContainer }]}>
                      {p.sign ?? '—'}
                      {p.normDegree != null ? ` ${Math.floor(p.normDegree)}°` : ''}
                    </Text>
                    {retro && <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '800' }}> ℞</Text>}
                  </View>
                );
              })}
            </View>
            {gochar?.computed_at && (
              <Text style={[typeScale.caption, { color: colors.textFaint, marginTop: 10 }]}>
                Computed {new Date(gochar.computed_at).toLocaleTimeString()} · Lahiri ayanamsa
              </Text>
            )}
          </Card>
        </View>

        {/* ── For your chart (only when chartId passed) ── */}
        {chartId && chart && (
          <View style={{ marginTop: spacing.lg }}>
            <Card style={{ padding: 16 }} withAccents>
              <SectionTitle>FOR YOUR CHART • {chart.full_name}</SectionTitle>
              <View style={styles.panchGrid}>
                <PanchCell
                  label="MOON TRANSIT"
                  value={transitMoonHouse ? `House ${transitMoonHouse} from Lagna` : '—'}
                  highlight
                />
                <PanchCell
                  label="JUPITER GOCHAR"
                  value={jupHouse ? `House ${jupHouse}` : '—'}
                  highlight
                />
                <PanchCell
                  label="SATURN GOCHAR"
                  value={satHouse ? `House ${satHouse}` : '—'}
                  highlight
                />
                <PanchCell
                  label="NATAL MOON"
                  value={natalMoon?.sign ? `${natalMoon.sign}` : '—'}
                />
              </View>

              <View style={{ marginTop: 14 }}>
                <PrimaryButton
                  title={readingLoading ? 'CHANNELING…' : '✦ ASK MY DAILY READING'}
                  onPress={askDailyReading}
                  loading={readingLoading}
                  disabled={!gochar}
                />
              </View>
              {dailyReading ? (
                <View style={[styles.readingBox, { marginTop: 12 }]}>
                  <Text style={[typeScale.bodySm, { color: colors.ink, lineHeight: 20 }]}>{dailyReading}</Text>
                </View>
              ) : null}
            </Card>
          </View>
        )}

        {!chartId && (
          <Text style={[typeScale.caption, { color: colors.textFaint, textAlign: 'center', marginTop: spacing.lg }]}>
            Open a reading from your Vault to overlay today's transits on your chart.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

/** Minimal shared header so Today matches the Dashboard chrome. */
function HeaderBar({ title, subtitle, onBack }: { title: string; subtitle?: string; onBack: () => void }) {
  return (
    <>
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.surface }} />
      <View style={[styles.headerBar]}>
        <Pressable onPress={() => { tapLight(); onBack(); }} hitSlop={10} style={styles.iconBtn}>
          <Text style={{ color: colors.indigo, fontSize: 18 }}>←</Text>
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[typeScale.headlineSm, { color: colors.indigo }]}>✦ {title} ✦</Text>
          {subtitle ? (
            <Text style={[typeScale.label, { color: colors.ochre, fontSize: 8.5 }]}>{subtitle.toUpperCase()}</Text>
          ) : null}
        </View>
        <View style={styles.iconBtn} />
      </View>
    </>
  );
}

function PanchCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={[styles.panchCell, highlight && { backgroundColor: 'rgba(217,166,60,0.12)', borderColor: 'rgba(217,166,60,0.5)' }]}>
      <Text style={{ color: colors.textFaint, fontSize: 8.5, fontWeight: '700', letterSpacing: 1 }}>{label}</Text>
      <Text style={{ color: highlight ? colors.goldDark : colors.indigo, fontSize: 12.5, fontWeight: '700', marginTop: 2 }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = {
  headerBar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 12,
    height: 54,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(232,213,167,0.7)',
  },
  iconBtn: { width: 36, height: 36, alignItems: 'center' as const, justifyContent: 'center' as const, borderRadius: 10 },
  panchGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
  panchCell: {
    width: '31.5%' as any,
    flexGrow: 1,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: 'rgba(220,213,192,0.9)',
    borderRadius: radii.sm,
    padding: 8,
  },
  grahaRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(232,213,167,0.45)',
    gap: 6,
  },
  readingBox: {
    backgroundColor: colors.blueWash,
    borderRadius: radii.md,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(195,214,239,0.9)',
  },
};

export { computePanchanga };
