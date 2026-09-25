import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import SriYantraVideo from '../components/SriYantraVideo';
import { colors } from '../theme/colors';
import { type as typeScale, radii, spacing } from '../theme/typography';
import { Card, SectionTitle, InfoChip, Divider, PrimaryButton } from '../components/ui';
import KundaliChart from '../components/KundaliChart';
import { MarkdownText } from '../components/MarkdownText';
import { tapLight, successTick } from '../services/haptics';
import { friendlyError } from '../services/errors';
import {
  ChartData,
  DivisionalChartPayload,
  GenerationProgress,
  getAllInterpretations,
  getChart,
  getGenerationProgress,
  streamInterpretation,
} from '../services/api';

const ZODIAC = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

const TABS: Array<{ id: number; label: string; short: string; chapter: string; folio: string; subtitle: string }> = [
  { id: 1, label: 'Lagna Blueprint', short: '1 · Lagna', chapter: 'Chapter I • Soul Horizon', folio: '#01', subtitle: 'Parashari fundamental soul architecture' },
  { id: 2, label: 'Lal Kitab', short: '2 · Lal Kitab', chapter: 'Chapter II • Karmic Debts', folio: '#14', subtitle: 'Ancestral Rina and instant planetary remedies' },
  { id: 3, label: 'Numerology', short: '3 · Numerology', chapter: 'Chapter III • Anka Shastra', folio: '#22', subtitle: 'Vibrational destiny number alignments' },
  { id: 4, label: 'Career & D10', short: '4 · Career', chapter: 'Chapter IV • Rigorous Exegesis', folio: '#42', subtitle: 'Vedic vocation doctrine via Parashara Horashastra' },
  { id: 11, label: 'Education & Intellect', short: '11 · Vidya', chapter: 'Chapter XI • Vidya & Buddhi', folio: '#95', subtitle: 'Academic trajectory and cognitive inclinations' },
  { id: 5, label: 'Wealth D4', short: '5 · Wealth', chapter: 'Chapter V • Chaturthamsa Dhana', folio: '#51', subtitle: 'Fixed assets, real estate, and treasury yogas' },
  { id: 6, label: 'Marriage D9', short: '6 · Marriage', chapter: 'Chapter VI • Navamsha Kalatra', folio: '#63', subtitle: 'Spouse archetype and dharmic union matrix' },
  { id: 7, label: 'Health D30', short: '7 · Health', chapter: 'Chapter VII • Trimsamsa Rog', folio: '#74', subtitle: 'Vitality reserves and subtle doshic vulnerabilities' },
  { id: 8, label: 'Remedies', short: '8 · Remedies', chapter: 'Chapter VIII • Upaya Vidhana', folio: '#80', subtitle: 'Tripath System Remedial Harmonization' },
  { id: 9, label: 'Progeny D7', short: '9 · Progeny', chapter: 'Chapter IX • Saptamsha Lineage', folio: '#88', subtitle: 'Lineage continuity and creative fruits' },
  { id: 10, label: 'Gochar Transit', short: '10 · Gochar', chapter: 'Chapter X • Kala Gochara', folio: '#92', subtitle: 'Live transit overlays across natal houses' },
];

const VARGAS: Array<{ id: string; label: string; key?: keyof ChartData }> = [
  { id: 'D1', label: 'D1' },
  { id: 'D9', label: 'D9', key: 'navamsha' },
  { id: 'D10', label: 'D10', key: 'dashamsha' },
  { id: 'D4', label: 'D4', key: 'chaturthamsa' },
  { id: 'D7', label: 'D7', key: 'saptamsha' },
  { id: 'D30', label: 'D30', key: 'trimsamsa' },
  { id: 'chandra', label: 'Chandra', key: 'chandra_kundali' },
  { id: 'surya', label: 'Surya', key: 'surya_kundali' },
  { id: 'gochar', label: 'Gochar', key: 'gochar' },
];

const VARGA_PURPOSE: Record<string, string> = {
  D1: 'Core natal chart — overall life',
  D9: 'Marriage, soul dharma, hidden strength',
  D10: 'Career, profession, public achievement',
  D4: 'Property, fixed assets, wealth',
  D7: 'Children, progeny, creative legacy',
  D30: 'Health, disease, misfortunes',
  chandra: 'Moon-ascendant chart, emotional reality',
  surya: 'Sun-ascendant chart, vitality & authority',
  gochar: 'Real-time planetary transits (live)',
};

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const chartId: string = route.params?.chartId;

  const [chart, setChart] = useState<(ChartData & { __offline?: boolean; __offline_since?: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const [activeTab, setActiveTab] = useState(1);
  const [interpretations, setInterpretations] = useState<Record<number, string>>({});
  const [tabLoading, setTabLoading] = useState<Record<number, boolean>>({});
  const [tabError, setTabError] = useState<Record<number, string>>({});
  const [varga, setVarga] = useState('D1');
  const [progress, setProgress] = useState<GenerationProgress | null>(null);

  // Track which tabs already started streaming so chunk re-renders never
  // re-trigger or abort the active stream.
  const streamedTabsRef = useRef<Set<number>>(new Set());
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Data loading ─────────────────────────────────────────────────────────
  const loadChart = useCallback(async () => {
    try {
      setError('');
      setLoading(true);
      const data = await getChart(chartId);
      setChart(data);
      const lang = data.language || 'english';
      try {
        const interps = await getAllInterpretations(chartId, lang);
        const normalized: Record<number, string> = {};
        Object.entries(interps).forEach(([k, v]) => {
          const num = Number(k);
          if (!Number.isNaN(num) && typeof v === 'string' && v.trim()) {
            normalized[num] = v;
            streamedTabsRef.current.add(num);
          }
        });
        setInterpretations(normalized);
      } catch {
        /* offline interpretations simply stay empty */
      }
    } catch (err: any) {
      setError(friendlyError(err) || 'Could not retrieve your planetary chart.');
    } finally {
      setLoading(false);
    }
  }, [chartId]);

  useFocusEffect(
    useCallback(() => {
      streamedTabsRef.current = new Set();
      if (chartId) loadChart();
      return () => {};
    }, [chartId, loadChart])
  );

  // ── Background pre-generation progress polling & instant chapter sync ────
  useEffect(() => {
    if (!chartId || loading || error) return;
    let cancelled = false;
    const lang = chart?.language || 'english';

    const syncInterpretations = async (forceFresh = false) => {
      try {
        const interps = await getAllInterpretations(chartId, lang, forceFresh);
        if (cancelled || !interps) return;
        const normalized: Record<number, string> = {};
        Object.entries(interps).forEach(([k, v]) => {
          const num = Number(k);
          if (!Number.isNaN(num) && typeof v === 'string' && v.trim()) {
            normalized[num] = v;
            streamedTabsRef.current.add(num);
          }
        });
        if (Object.keys(normalized).length > 0) {
          setInterpretations((prev) => ({ ...prev, ...normalized }));
        }
      } catch {
        /* best-effort auto sync */
      }
    };

    const poll = async () => {
      const data = await getGenerationProgress(chartId);
      if (cancelled || !data) return;
      setProgress(data);

      // Auto-fetch newly pre-generated chapter texts as they complete
      await syncInterpretations(!data.is_complete);

      if (data.is_complete && progressTimer.current) {
        clearInterval(progressTimer.current);
        progressTimer.current = null;
        // Final sync once generation is 100% complete
        await syncInterpretations(true);
      }
    };

    poll();
    progressTimer.current = setInterval(poll, 3500);
    return () => {
      cancelled = true;
      if (progressTimer.current) {
        clearInterval(progressTimer.current);
        progressTimer.current = null;
      }
    };
  }, [chartId, loading, error, chart?.language]);

  // ── Stream the active tab's interpretation ───────────────────────────────
  const chartLanguage = chart?.language || 'english';
  const activeStreamRef = useRef<AbortController | null>(null);

  // Abort any in-flight chapter stream when the dashboard unmounts entirely.
  useEffect(() => {
    return () => activeStreamRef.current?.abort();
  }, []);

  useEffect(() => {
    if (!chartId || loading || error || !chart) return;
    if (interpretations[activeTab] || streamedTabsRef.current.has(activeTab)) return;

    streamedTabsRef.current.add(activeTab);
    const controller = new AbortController();
    activeStreamRef.current = controller;
    setTabLoading((prev) => ({ ...prev, [activeTab]: true }));
    setTabError((prev) => ({ ...prev, [activeTab]: '' }));

    // (haptic handled on completion below)

    (async () => {
      try {
        await streamInterpretation(chartId, activeTab, chartLanguage, (chunk) => {
          setInterpretations((prev) => ({ ...prev, [activeTab]: (prev[activeTab] ?? '') + chunk }));
        }, controller.signal);
      } catch (err: any) {
        if (!controller.signal.aborted && err?.name !== 'AbortError') {
          // Allow a manual retry after a failure
          streamedTabsRef.current.delete(activeTab);
          setTabError((prev) => ({ ...prev, [activeTab]: 'Planetary alignment stream interrupted.' }));
        }
      } finally {
        setTabLoading((prev) => ({ ...prev, [activeTab]: false }));
        // A completed chapter deserves a little celebration in the hand.
        if (!controller.signal.aborted && !tabError[activeTab]) successTick();
      }
    })();
    // Deliberately no cleanup: switching tabs must NOT abort the stream — the
    // chapter keeps loading in the background so revisiting the tab shows the
    // completed text (same behavior as the web app).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartId, activeTab, loading, error, chartLanguage]);

  // ── Varga selection sync with tab (mirrors the web behavior) ─────────────
  useEffect(() => {
    const map: Record<number, string> = { 4: 'D10', 5: 'D4', 6: 'D9', 7: 'D30', 9: 'D7', 10: 'gochar' };
    setVarga(map[activeTab] ?? 'D1');
  }, [activeTab]);

  const activeVarga = VARGAS.find((v) => v.id === varga) ?? VARGAS[0];
  const vargaData = (activeVarga.key ? (chart as any)?.[activeVarga.key] : null) as DivisionalChartPayload | null;

  const ascSignNum = useMemo(() => {
    const asc = chart?.ascendant;
    if (!asc) return 1;
    if (asc.sign_num) return asc.sign_num;
    const idx = asc.sign ? ZODIAC.indexOf(asc.sign) : -1;
    return idx !== -1 ? idx + 1 : 1;
  }, [chart]);

  const completedCount = progress?.completed_tabs?.length ?? 0;
  const totalCount = progress?.total_tabs ?? null;

  // ── Loading / error states ───────────────────────────────────────────────
  if (loading && !chart) {
    return (
      <View style={[styles.center, { backgroundColor: colors.paper, width: '100%' }]}>
        <SriYantraVideo height={300} />
      </View>
    );
  }
  if (error && !chart) {
    return (
      <View style={[styles.center, { backgroundColor: colors.paper, padding: 28 }]}>
        <Text style={{ color: colors.error, fontSize: 30 }}>⚠</Text>
        <Text style={[typeScale.headlineSm, { color: colors.indigo, marginTop: 10, textAlign: 'center' }]}>✦ System Warning ✦</Text>
        <Text style={[typeScale.bodySm, { color: colors.textMuted, textAlign: 'center', marginTop: 6 }]}>{error}</Text>
        <PrimaryButton title="Return to Vault" onPress={() => navigation.goBack()} style={{ marginTop: 20, alignSelf: 'stretch' }} />
      </View>
    );
  }
  if (!chart) return null;

  const currentTabMeta = TABS.find((t) => t.id === activeTab)!;
  const interpText = interpretations[activeTab];

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.surface }} />
      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.iconBtn}>
          <Text style={{ color: colors.indigo, fontSize: 18 }}>←</Text>
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[typeScale.headlineSm, { color: colors.indigo }]}>TRIKAL DARSHI</Text>
          <Text style={[typeScale.label, { color: colors.ochre, fontSize: 8.5 }]}>11 SOUL DIMENSIONS</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Pressable
            onPress={() => navigation.navigate('Today', { chartId })}
            style={[styles.aiBtn, { backgroundColor: colors.surfaceLow, borderColor: 'rgba(217,166,60,0.45)' }]}
            hitSlop={6}
          >
            <Text style={{ color: colors.ochre, fontSize: 11, fontWeight: '800' }}>Today</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('Chat', { chartId })} style={styles.aiBtn} hitSlop={6}>
            <Text style={{ color: colors.goldLight, fontSize: 11, fontWeight: '800' }}>✦ Ask AI</Text>
          </Pressable>
        </View>
      </View>

      {/* Offline banner */}
      {chart.__offline && (
        <View style={styles.offlineBanner}>
          <Text style={{ color: colors.ochre, fontSize: 10.5, fontWeight: '600' }}>
            ⚡ Showing your saved offline reading. Connect to generate new AI chapters.
          </Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={{ paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await loadChart();
              setRefreshing(false);
            }}
            tintColor={colors.gold}
          />
        }
      >
        {/* Native identity strip */}
        <View style={styles.identityStrip}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[typeScale.headline, { color: colors.indigo }]} numberOfLines={1}>
              {chart.full_name}
            </Text>
            <Text style={[typeScale.mono, { color: colors.textFaint, marginTop: 2 }]} numberOfLines={1}>
              {[chart.date_of_birth, chart.time_of_birth?.slice(0, 5), chart.city_of_birth].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <View style={styles.ayanamsaPill}>
            <Text style={{ color: colors.indigoContainer, fontSize: 9.5, fontWeight: '700' }}>Lahiri 24°11'42"</Text>
          </View>
        </View>

        {/* Cosmic summary chips */}
        <View style={{ paddingHorizontal: spacing.lg }}>
          <Card style={{ padding: 12 }}>
            <SectionTitle
              right={
                progress && !progress.is_complete ? (
                  <View style={styles.progressPill}>
                    <View style={styles.progressDot} />
                    <Text style={{ color: colors.ochre, fontSize: 9, fontWeight: '800' }}>
                      {completedCount}/{totalCount} ✦
                    </Text>
                  </View>
                ) : progress?.is_complete ? (
                  <Text style={{ color: colors.success, fontSize: 9.5, fontWeight: '800' }}>ALL CHAPTERS READY ✓</Text>
                ) : undefined
              }
            >
              JANMA KUNDALI EPHEMERIS • PRECISION GRID
            </SectionTitle>
            <View style={styles.chipGrid}>
              {buildChips(chart).map((chip) => (
                <View key={chip.label} style={styles.chipCell}>
                  <InfoChip {...chip} />
                </View>
              ))}
            </View>
          </Card>
        </View>

        {/* Chart viewer + varga selector */}
        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg }}>
          <Card style={{ padding: 12 }}>
            <SectionTitle>{activeVarga.id === 'D1' ? 'Lagna (Rashi) Varga' : `${activeVarga.id} Varga`}</SectionTitle>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 10 }}
              contentContainerStyle={{ gap: 6, paddingVertical: 4, paddingHorizontal: 1 }}
            >
              {VARGAS.map((v) => (
                <Pressable key={v.id} onPress={() => { tapLight(); setVarga(v.id); }} style={[styles.vargaPill, varga === v.id && styles.vargaPillActive]}>
                  <Text style={{ color: varga === v.id ? colors.goldLight : colors.textFaint, fontSize: 11, fontWeight: '700' }}>{v.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.chartFrame}>
              <KundaliChart
                ascendantSignNum={
                  vargaData?.ascendant?.sign_num ??
                  (vargaData?.ascendant?.sign ? ZODIAC.indexOf(vargaData.ascendant.sign) + 1 : ascSignNum)
                }
                planets={vargaData?.planets ?? chart.planets ?? []}
                size={300}
              />
            </View>
            <Divider />
            <Text style={[typeScale.caption, { color: colors.textFaint, textAlign: 'center', marginTop: 8 }]}>
              {VARGA_PURPOSE[activeVarga.id]}
            </Text>
          </Card>
        </View>

        {/* 11-tab chapter bar */}
        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg }}>
          <Card style={{ padding: 8 }}>
            <View style={styles.tabWrap}>
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                const isLoading = !!tabLoading[tab.id];
                const isLoaded = !!interpretations[tab.id];
                return (
                  <Pressable
                    key={tab.id}
                    onPress={() => {
                      tapLight();
                      setActiveTab(tab.id);
                    }}
                    style={[styles.tabPill, isActive && styles.tabPillActive]}
                  >
                    <Text
                      style={{ color: isActive ? colors.goldLight : colors.textFaint, fontSize: 11.5, fontWeight: '700' }}
                      numberOfLines={1}
                    >
                      {tab.short}
                    </Text>
                    {isActive && <View style={styles.tabActiveDot} />}
                    {isLoading && <View style={styles.tabLoadingDot} />}
                    {isLoaded && !isActive && !isLoading && <View style={styles.tabLoadedDot} />}
                  </Pressable>
                );
              })}
            </View>
          </Card>
        </View>

        {/* Chapter reader */}
        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg }}>
          <Card style={{ padding: 16 }}>
            <View style={styles.chapterHead}>
              <View style={{ flex: 1 }}>
                <Text style={[typeScale.label, { color: colors.ochre }]}>{currentTabMeta.chapter}</Text>
                <Text style={[typeScale.headline, { color: colors.indigo, marginTop: 4 }]}>
                  {currentTabMeta.label} Synthesis
                </Text>
                <Text style={[typeScale.caption, { color: colors.ochre, marginTop: 2 }]}>{currentTabMeta.subtitle}</Text>
              </View>
              <View style={styles.folioPill}>
                <Text style={{ color: colors.textFaint, fontSize: 9.5, fontWeight: '700' }}>Folio {currentTabMeta.folio}</Text>
              </View>
            </View>

            <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(232,213,167,0.7)', paddingTop: 12 }}>
              {interpText ? (
                <>
                  <MarkdownText text={interpText} />
                  {tabLoading[activeTab] && <Text style={{ color: colors.indigoContainer, fontWeight: '800', fontSize: 14 }}> ▉</Text>}
                </>
              ) : tabLoading[activeTab] ? (
                <View style={{ gap: 10, paddingTop: 4 }}>
                  <Text style={[typeScale.label, { color: colors.indigo, marginBottom: 4 }]}>CHANNELING PARASHARI SHASTRAS…</Text>
                  <View style={[styles.shimmerLine, { width: '95%' }]} />
                  <View style={[styles.shimmerLine, { width: '88%' }]} />
                  <View style={[styles.shimmerLine, { width: '100%' }]} />
                  <View style={[styles.shimmerLine, { width: '75%' }]} />
                  <View style={[styles.shimmerLine, { width: '92%' }]} />
                </View>
              ) : tabError[activeTab] ? (
                <View style={{ alignItems: 'center', gap: 10, paddingVertical: 20 }}>
                  <Text style={{ color: colors.error, fontSize: 22 }}>⚠</Text>
                  <Text style={[typeScale.bodySm, { color: colors.error, textAlign: 'center' }]}>{tabError[activeTab]}</Text>
                  <PrimaryButton
                    title="RETRY STREAM"
                    onPress={() => {
                      streamedTabsRef.current.delete(activeTab);
                      setTabError((prev) => ({ ...prev, [activeTab]: '' }));
                      setInterpretations((prev) => {
                        const c = { ...prev };
                        delete c[activeTab];
                        return c;
                      });
                    }}
                    style={{ minWidth: 160 }}
                  />
                </View>
              ) : (
                <Text style={[typeScale.bodySm, { color: colors.textFaint, textAlign: 'center', paddingVertical: 24 }]}>
                  Reading stream ready. Reopen this chapter to synthesize.
                </Text>
              )}
            </View>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function buildChips(chart: ChartData) {
  const asc = (chart.ascendant ?? {}) as ChartData['ascendant'] & Record<string, any>;
  const dasha = (chart.dasha ?? {}) as Record<string, any>;
  const astro = (chart.astro_details ?? {}) as Record<string, any>;
  const nak = (chart.nakshatra ?? {}) as Record<string, any>;
  const mangal = (chart.mangal_dosha ?? {}) as Record<string, any>;
  const kalsarp = (chart.kalsarp ?? {}) as Record<string, any>;
  const pitru = (chart.pitru_dosha ?? {}) as Record<string, any>;
  const numerology = (chart.numerology ?? {}) as Record<string, any>;
  const planets = Array.isArray(chart.planets) ? chart.planets : [];
  const moon = planets.find((p) => p.name === 'Moon');

  return [
    { label: 'Lagna', value: asc.sign ?? '—', sub: asc.nakshatra ?? '' },
    { label: 'Chandra Rashi', value: moon?.sign ? `Moon in ${moon.sign}` : '—', sub: nak.nakshatra ?? '', good: true },
    {
      label: 'Active Dasha',
      value: dasha.mahadasha ? `${dasha.mahadasha}${dasha.antardasha ? ` – ${dasha.antardasha}` : ''}` : '—',
      sub: dasha.antardasha_end ? `AD ends ${dasha.antardasha_end}` : 'Mahadasha Phase',
    },
    { label: 'Moolank', value: String(numerology.moolank ?? '—'), sub: 'Root Number' },
    { label: 'Bhagyank', value: String(numerology.bhagyank ?? '—'), sub: 'Destiny Number' },
    { label: 'Tithi', value: String(astro.tithi ?? '—'), sub: 'Lunar Day' },
    { label: 'Yoga', value: String(astro.yog ?? '—'), sub: 'Panchanga Yoga' },
    { label: 'Karan', value: String(astro.karan ?? '—'), sub: 'Half Tithi' },
    { label: 'Gana', value: String(astro.gan ?? '—'), sub: 'Temperament' },
    { label: 'Nadi', value: String(astro.nadi ?? '—'), sub: 'Doshic Channel' },
    {
      label: 'Mangal Dosha',
      value: mangal.present ? `Manglik · H${mangal.house ?? ''}` : 'Not Present',
      sub: 'Mars Affliction',
      alert: !!mangal.present,
      good: !mangal.present,
    },
    {
      label: 'Kaal Sarp',
      value: kalsarp.present ? kalsarp.type || 'Present' : 'Not Present',
      sub: 'Rahu–Ketu Axis',
      alert: !!kalsarp.present,
      good: !kalsarp.present,
    },
    {
      label: 'Pitru Dosha',
      value: pitru.present ? 'Indicated' : 'Not Present',
      sub: 'Ancestral Karma',
      alert: !!pitru.present,
      good: !pitru.present,
    },
  ];
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 54,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(232,213,167,0.7)',
  },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  aiBtn: {
    backgroundColor: colors.indigoContainer,
    borderWidth: 1,
    borderColor: 'rgba(217,166,60,0.6)',
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  offlineBanner: {
    backgroundColor: '#F4EEDA',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(217,166,60,0.4)',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  identityStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    gap: 10,
  },
  ayanamsaPill: {
    backgroundColor: colors.blueWash,
    borderWidth: 1,
    borderColor: 'rgba(195,214,239,0.9)',
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipCell: { width: '48%', flexGrow: 1, flexShrink: 0 },
  progressPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(217,166,60,0.14)',
    borderColor: 'rgba(217,166,60,0.45)',
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  progressDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.gold },
  vargaPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(232,213,167,0.9)',
    backgroundColor: colors.surfaceLow,
  },
  vargaPillActive: {
    backgroundColor: colors.indigoContainer,
    borderColor: 'rgba(217,166,60,0.6)',
  },
  chartFrame: {
    backgroundColor: 'rgba(250,245,232,0.8)',
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.sand,
    padding: 10,
    alignItems: 'center',
  },
  tabWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'rgba(232,213,167,0.9)',
    backgroundColor: colors.surfaceLow,
  },
  tabPillActive: { backgroundColor: colors.indigoContainer, borderColor: 'rgba(217,166,60,0.6)' },
  tabActiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.gold },
  tabLoadingDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.gold, opacity: 0.7 },
  tabLoadedDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.success },
  chapterHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  folioPill: {
    backgroundColor: colors.surfaceLow,
    borderWidth: 1,
    borderColor: colors.sand,
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  shimmerLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(232,213,167,0.5)',
  },
});
