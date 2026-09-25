import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import SriYantraVideo from '../components/SriYantraVideo';
import { colors } from '../theme/colors';
import { type as typeScale, radii, spacing } from '../theme/typography';
import { Card, PrimaryButton, GhostButton } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { friendlyError } from '../services/errors';
import { warningBuzz } from '../services/haptics';
import {
  BirthForm,
  ChartSummary,
  deleteChart,
  generateChart,
  getUserCharts,
} from '../services/api';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, logout, isAuthenticated } = useAuth();

  const [charts, setCharts] = useState<ChartSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'family' | 'prashna'>('all');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // New-kundali modal state
  const [showGenerator, setShowGenerator] = useState(false);
  const [form, setForm] = useState<BirthForm>({
    full_name: '',
    date_of_birth: '2000-01-01',
    time_of_birth: '12:00',
    city_of_birth: '',
    current_city: '',
    birth_time_confidence: 'exact',
    language: 'english',
  });
  const [generating, setGenerating] = useState(false);
  const [formError, setFormError] = useState('');

  const loadCharts = useCallback(async () => {
    if (!isAuthenticated) {
      setCharts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getUserCharts();
      setCharts(data);
      setLoadError('');
    } catch (err: any) {
      setLoadError(err?.message || 'Could not reach the astrological calculation server.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      loadCharts();
      return () => {};
    }, [loadCharts])
  );

  const flashNotice = (type: 'success' | 'error', msg: string) => {
    setNotice({ type, msg });
    setTimeout(() => setNotice(null), 3500);
  };

  const performDelete = async (chart: ChartSummary) => {
    const targetId = chart.chart_id || chart.id || (chart as any)._id;
    if (!targetId) {
      flashNotice('error', 'Cannot locate chart ID.');
      return;
    }
    try {
      await deleteChart(targetId);
      setCharts((prev) => prev.filter((c) => (c.chart_id || c.id || (c as any)._id) !== targetId));
      flashNotice('success', `Ephemeris chart for ${chart.full_name || 'Native'} deleted from vault.`);
    } catch (err: any) {
      console.error('Delete chart error:', err);
      if (err?.response?.status === 404) {
        setCharts((prev) => prev.filter((c) => (c.chart_id || c.id || (c as any)._id) !== targetId));
        flashNotice('success', 'Chart removed from vault.');
      } else {
        flashNotice('error', err?.response?.data?.detail || 'Could not delete chart. Please try again.');
      }
    }
  };

  const handleDelete = (chart: ChartSummary) => {
    warningBuzz();
    const name = chart.full_name || 'Native';
    const msg = `Are you sure you want to delete ${name}'s chart?\n\nThis permanently removes the chart, its cached vargas, and all AI interpretations.`;

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(msg)) {
        performDelete(chart);
      }
    } else {
      Alert.alert(
        `Delete ${name}'s chart?`,
        'This permanently removes the chart, its cached vargas, and all AI interpretations.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => performDelete(chart),
          },
        ]
      );
    }
  };

  const handleCast = async () => {
    if (!form.full_name.trim() || !form.date_of_birth || !form.time_of_birth || !form.city_of_birth.trim()) {
      setFormError('Please fill in all required birth parameters marked with *');
      return;
    }
    setGenerating(true);
    setFormError('');
    try {
      const result = await generateChart(form);
      if (!result?.chart_id) throw new Error('Calculations completed but no Chart ID was returned.');
      setShowGenerator(false);
      flashNotice('success', `Chart for ${result.full_name || form.full_name} cast — opening the reading…`);
      navigation.navigate('Dashboard', { chartId: result.chart_id });
    } catch (err: any) {
      setFormError(friendlyError(err));
    } finally {
      setGenerating(false);
    }
  };

  const filteredCharts = charts.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      c.full_name?.toLowerCase().includes(q) ||
      c.city_of_birth?.toLowerCase().includes(q) ||
      c.lagna?.toLowerCase().includes(q) ||
      c.moon_nakshatra?.toLowerCase().includes(q);
    if (!matchSearch) return false;
    if (activeFilter === 'family') {
      return c.category === 'family' || !!c.relationship;
    }
    if (activeFilter === 'prashna') {
      return c.category === 'prashna' || c.birth_time_confidence === 'unknown';
    }
    return true;
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.surface }} />
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={styles.brandGlyph}>
            <Text style={{ color: colors.goldLight, fontSize: 15, fontWeight: '700' }}>✦</Text>
          </View>
          <View>
            <Text style={[typeScale.headlineSm, { color: colors.indigo }]}>TRIKAL DARSHI</Text>
            <Text style={[typeScale.label, { color: colors.ochre, fontSize: 8.5 }]}>11 SOUL DIMENSIONS</Text>
          </View>
        </View>
        <Pressable onPress={logout} style={styles.logoutBtn} hitSlop={6}>
          <Text style={{ color: colors.error, fontSize: 11, fontWeight: '700' }}>Sign Out</Text>
        </Pressable>
      </View>

      {notice && (
        <View style={[styles.notice, notice.type === 'success' ? styles.noticeSuccess : styles.noticeError]}>
          <Text style={{ color: notice.type === 'success' ? colors.success : colors.error, fontSize: 12, fontWeight: '600', flex: 1 }}>
            {notice.type === 'success' ? '✓ ' : '⚠ '}{notice.msg}
          </Text>
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }}>
        {/* ── Identity card ── */}
        <Card withAccents style={{ padding: 18, marginBottom: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={styles.avatar}>
              <Text style={{ color: colors.goldLight, fontFamily: typeScale.headline.fontFamily, fontSize: 24, fontWeight: '700' }}>
                {(user?.name || user?.email || 'N').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Text style={[typeScale.headline, { color: colors.indigo }]} numberOfLines={1}>
                  {user?.name || 'Vedic Native'}
                </Text>
                <View style={styles.authBadge}>
                  <Text style={{ color: colors.success, fontSize: 9, fontWeight: '800' }}>AUTHENTICATED</Text>
                </View>
              </View>
              <Text style={[typeScale.mono, { color: colors.textFaint, marginTop: 2 }]} numberOfLines={1}>
                {user?.email}
              </Text>
              <Text style={[typeScale.caption, { color: colors.ochre, marginTop: 4 }]}>
                ✦ {user?.preferred_language ? String(user.preferred_language).replace(/^./, (ch) => ch.toUpperCase()) : 'English'} · Lahiri Ayanamsa · D1–D60 Vargas
              </Text>
            </View>
          </View>
        </Card>

        {/* ── Actions ── */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 22 }}>
          <PrimaryButton title="✦ Calculate New Kundali" onPress={() => { setFormError(''); setShowGenerator(true); }} style={{ flex: 1 }} />
          <GhostButton
            title="Today's Sky"
            onPress={() => navigation.navigate('Today')}
            style={{ paddingHorizontal: 14 }}
          />
        </View>

        {/* ── Vault ── */}
        <View style={{ marginBottom: 10 }}>
          <Text style={[typeScale.mono, { color: colors.goldDeep, fontSize: 10, letterSpacing: 2 }]}>
            ✦ JANMA KUNDALI VAULT • SECURE EPHEMERIS ARCHIVE
          </Text>
          <Text style={[typeScale.headline, { color: colors.ink, marginTop: 4 }]}>My Charts</Text>
        </View>

        {/* Search + filters */}
        <Card style={{ padding: 12, marginBottom: 16 }}>
          <View style={styles.searchRow}>
            <Text style={{ color: colors.textGhost, marginRight: 8 }}>⌕</Text>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Filter by native name, city, lagna…"
              placeholderTextColor={colors.textGhost}
              style={styles.searchInput}
            />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            {([
              { key: 'all', label: `All (${charts.length})` },
              { key: 'family', label: 'Family' },
              { key: 'prashna', label: 'Prashna' },
            ] as const).map((f) => (
              <Pressable
                key={f.key}
                onPress={() => setActiveFilter(f.key)}
                style={[styles.filterPill, activeFilter === f.key && styles.filterPillActive]}
              >
                <Text style={{ color: activeFilter === f.key ? colors.goldLight : colors.textFaint, fontSize: 11.5, fontWeight: '700' }}>
                  {f.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>

        {/* Loading / error / empty states */}
        {loading ? (
          <Card style={{ padding: 24, alignItems: 'center' }}>
            <SriYantraVideo height={220} style={{ width: '100%' }} />
            <Text style={[typeScale.bodySm, { color: colors.textMuted, marginTop: 10 }]}>Loading your saved natal ephemeris vault…</Text>
          </Card>
        ) : loadError ? (
          <Card style={{ padding: 28, alignItems: 'center' }}>
            <Text style={{ color: colors.error, fontSize: 30 }}>☁</Text>
            <Text style={[typeScale.headlineSm, { color: colors.error, marginTop: 8 }]}>Connection Issue</Text>
            <Text style={[typeScale.bodySm, { color: colors.textMuted, textAlign: 'center', marginTop: 4 }]}>{loadError}</Text>
            <PrimaryButton title="RETRY CONNECTION" onPress={loadCharts} style={{ marginTop: 16, minWidth: 180 }} />
          </Card>
        ) : filteredCharts.length === 0 ? (
          <Card style={{ padding: 36, alignItems: 'center' }}>
            <Text style={{ color: colors.gold, fontSize: 34 }}>✦</Text>
            <Text style={[typeScale.headlineSm, { color: colors.ink, marginTop: 8 }]}>
              {charts.length === 0 ? 'No Saved Charts Yet' : 'No Charts Found'}
            </Text>
            <Text style={[typeScale.bodySm, { color: colors.textFaint, textAlign: 'center', marginTop: 4 }]}>
              {charts.length === 0
                ? 'Cast your first Janma Kundali to archive it in your vault.'
                : 'No charts match your current filter.'}
            </Text>
          </Card>
        ) : (
          filteredCharts.map((chart, idx) => {
            const chartId = chart.chart_id || chart.id || `chart-${idx}`;
            const isPrimary = idx === 0 || chart.relationship === 'Self (Primary)';
            return (
              <Card key={chartId} style={{ padding: 14, marginBottom: 12, borderLeftWidth: isPrimary ? 4 : 1.5, borderLeftColor: isPrimary ? colors.gold : 'rgba(217,166,60,0.45)' }}>
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                  {/* Mini chart thumbnail */}
                  <View style={styles.thumbFrame}>
                    <SvgThumb />
                    <View style={styles.thumbBadge}>
                      <Text style={{ color: colors.goldDeep, fontSize: 8, fontWeight: '800' }}>D1</Text>
                    </View>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                      <Text style={[typeScale.headlineSm, { color: colors.ink, flexShrink: 1 }]} numberOfLines={1}>
                        {chart.full_name || 'Vedic Native'}
                      </Text>
                      <View style={[styles.relBadge, isPrimary && styles.relBadgePrimary]}>
                        <Text style={{ color: isPrimary ? colors.indigo : colors.indigoContainer, fontSize: 9, fontWeight: '800' }}>
                          {chart.relationship || (isPrimary ? 'SELF' : 'SAVED')}
                        </Text>
                      </View>
                    </View>
                    <Text style={[typeScale.mono, { color: colors.textFaint, marginTop: 1, fontSize: 10.5 }]} numberOfLines={1}>
                      {[chart.date_of_birth, chart.time_of_birth, chart.city_of_birth].filter(Boolean).join(' · ')}
                    </Text>
                    <View style={[styles.vectors, { marginTop: 8 }]}>
                      <VectorCell label="Lagna" value={chart.lagna || '—'} sub={chart.lagna_degree || ''} />
                      <VectorCell label="Nakshatra" value={chart.moon_nakshatra || '—'} sub={chart.moon_degree || ''} />
                      <VectorCell label="Atmakaraka" value={chart.atmakaraka || '—'} sub="Jaimini" />
                      <VectorCell label="Mahadasha" value={chart.active_mahadasha || '—'} sub="Vimshottari" />
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, alignItems: 'center' }}>
                      <PrimaryButton
                        title="Open Reading →"
                        onPress={() => navigation.navigate('Dashboard', { chartId })}
                        style={{ flex: 1, paddingVertical: 10 }}
                      />
                      <Pressable onPress={() => handleDelete(chart)} style={styles.deleteBtn} hitSlop={6}>
                        <Text style={{ color: colors.error, fontSize: 15 }}>🗑</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* ── Floating Kundali Generator modal ── */}
      <Modal visible={showGenerator} animationType="slide" transparent onRequestClose={() => !generating && setShowGenerator(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <Text style={{ color: colors.gold, fontSize: 16 }}>✦</Text>
              <Text style={[typeScale.headline, { color: colors.indigo, flex: 1, marginLeft: 8 }]}>Calculate New Kundali</Text>
              <Pressable onPress={() => setShowGenerator(false)} disabled={generating} hitSlop={8}>
                <Text style={{ color: colors.textFaint, fontSize: 18, lineHeight: 22 }}>✕</Text>
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
              {formError ? (
                <View style={styles.formErrorBox}>
                  <Text style={{ color: colors.error, fontSize: 12, flex: 1 }}>{formError}</Text>
                </View>
              ) : null}

              <ModalField label="FULL NAME *" value={form.full_name} onChangeText={(v) => setForm((p) => ({ ...p, full_name: v }))} placeholder={user?.name || 'e.g. Rahul Sharma'} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <ModalField label="DATE OF BIRTH *" value={form.date_of_birth} onChangeText={(v) => setForm((p) => ({ ...p, date_of_birth: v }))} placeholder="YYYY-MM-DD" />
                </View>
                <View style={{ flex: 1 }}>
                  <ModalField label="TIME OF BIRTH *" value={form.time_of_birth} onChangeText={(v) => setForm((p) => ({ ...p, time_of_birth: v }))} placeholder="HH:MM" />
                </View>
              </View>

              <Text style={[typeScale.label, { color: colors.textFaint, marginBottom: 6 }]}>BIRTH TIME CONFIDENCE</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                {(['exact', 'approximate', 'unknown'] as const).map((conf) => (
                  <Pressable
                    key={conf}
                    onPress={() => setForm((p) => ({ ...p, birth_time_confidence: conf }))}
                    style={[styles.confPill, form.birth_time_confidence === conf && styles.confPillActive]}
                  >
                    <Text style={{ color: form.birth_time_confidence === conf ? colors.goldLight : colors.textFaint, fontSize: 11.5, fontWeight: '700', textTransform: 'capitalize' }}>
                      {conf}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <ModalField label="PLACE OF BIRTH *" value={form.city_of_birth} onChangeText={(v) => setForm((p) => ({ ...p, city_of_birth: v }))} placeholder="e.g. Varanasi, India" />
              <ModalField label="CURRENT CITY" value={form.current_city || ''} onChangeText={(v) => setForm((p) => ({ ...p, current_city: v }))} placeholder="e.g. Bengaluru, India" />

              <Text style={[typeScale.label, { color: colors.textFaint, marginBottom: 6 }]}>INTERPRETATION LANGUAGE</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {[
                  { id: 'english', label: 'English' },
                  { id: 'hindi', label: 'हिन्दी' },
                  { id: 'bengali', label: 'বাংলা' },
                ].map((l) => (
                  <Pressable
                    key={l.id}
                    onPress={() => setForm((p) => ({ ...p, language: l.id }))}
                    style={[styles.confPill, form.language === l.id && styles.confPillActive]}
                  >
                    <Text style={{ color: form.language === l.id ? colors.goldLight : colors.textFaint, fontSize: 12, fontWeight: '700' }}>
                      {l.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <PrimaryButton
                title={generating ? 'Computing Precision Sidereal Chart…' : 'Cast Kundali & Begin Reading'}
                onPress={handleCast}
                loading={generating}
              />
              <SafeAreaView edges={['bottom']} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function VectorCell({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={styles.vectorCell}>
      <Text style={{ fontSize: 8.5, letterSpacing: 1, color: colors.textGhost, fontWeight: '700', textTransform: 'uppercase' }}>
        {label}
      </Text>
      <Text style={[typeScale.bodySm, { color: colors.ink, fontWeight: '600', fontSize: 12 }]} numberOfLines={1}>
        {value}
      </Text>
      {sub ? <Text style={{ fontSize: 10, color: colors.goldDeep }}>{sub}</Text> : null}
    </View>
  );
}

function SvgThumb() {
  return (
    <View style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: 40, height: 40, borderWidth: 1.2, borderColor: colors.indigoContainer, borderRadius: 2 }} />
      <View style={{ position: 'absolute', width: 28, height: 28, borderWidth: 1.2, borderColor: colors.indigoContainer, transform: [{ rotate: '45deg' }] }} />
    </View>
  );
}

function ModalField({ label, value, onChangeText, placeholder }: { label: string; value: string; onChangeText: (v: string) => void; placeholder?: string }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={[typeScale.label, { color: colors.textFaint, marginBottom: 6 }]}>{label}</Text>
      <View style={styles.modalInput}>
        <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.textGhost} style={{ color: colors.ink, fontSize: 14, flex: 1, paddingVertical: 10 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    height: 56,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(232,213,167,0.7)',
  },
  brandGlyph: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.indigoContainer,
    borderWidth: 1,
    borderColor: 'rgba(217,166,60,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutBtn: {
    borderWidth: 1,
    borderColor: 'rgba(186,26,26,0.35)',
    backgroundColor: 'rgba(186,26,26,0.06)',
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  notice: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  noticeSuccess: { backgroundColor: colors.successContainer, borderBottomColor: 'rgba(30,110,62,0.3)' },
  noticeError: { backgroundColor: colors.errorContainer, borderBottomColor: 'rgba(186,26,26,0.3)' },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 18,
    backgroundColor: colors.indigoContainer,
    borderWidth: 1.5,
    borderColor: 'rgba(217,166,60,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authBadge: {
    backgroundColor: colors.successContainer,
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(30,110,62,0.35)',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: 'rgba(217,166,60,0.35)',
    borderRadius: radii.md,
    paddingHorizontal: 12,
    minHeight: 42,
  },
  searchInput: { flex: 1, color: colors.ink, fontSize: 13.5 },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(217,166,60,0.4)',
    backgroundColor: colors.paper,
  },
  filterPillActive: { backgroundColor: colors.indigoContainer, borderColor: 'rgba(217,166,60,0.6)' },
  thumbFrame: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.paper,
    borderWidth: 1.2,
    borderColor: 'rgba(217,166,60,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(217,166,60,0.5)',
    borderRadius: 4,
    paddingHorizontal: 3,
  },
  relBadge: {
    backgroundColor: colors.blueWash,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(31,58,107,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  relBadgePrimary: { backgroundColor: colors.goldLight, borderColor: 'rgba(217,166,60,0.5)' },
  vectors: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: 'rgba(251,246,234,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(217,166,60,0.25)',
    borderRadius: radii.md,
    padding: 10,
  },
  vectorCell: { width: '47%', flexGrow: 1, flexShrink: 0, gap: 2 },
  deleteBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(186,26,26,0.3)',
    backgroundColor: 'rgba(186,26,26,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(14,26,55,0.65)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(217,166,60,0.55)',
    borderBottomWidth: 0,
    padding: 18,
  },
  modalHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  modalInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: 'rgba(220,213,192,0.9)',
    borderRadius: radii.md,
    paddingHorizontal: 12,
    minHeight: 46,
  },
  confPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'rgba(217,166,60,0.4)',
    backgroundColor: colors.paper,
  },
  confPillActive: { backgroundColor: colors.indigoContainer, borderColor: 'rgba(217,166,60,0.6)' },
  formErrorBox: {
    backgroundColor: colors.errorContainer,
    borderWidth: 1,
    borderColor: 'rgba(186,26,26,0.3)',
    borderRadius: radii.sm,
    padding: 10,
    marginBottom: 12,
    flexDirection: 'row',
    gap: 6,
  },
});
