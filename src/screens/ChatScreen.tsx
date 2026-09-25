import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { type as typeScale, radii, spacing } from '../theme/typography';
import { getChatHistory, getChart, streamChatResponse, ChatTurn } from '../services/api';

const QUICK_PROMPTS = [
  { text: 'What does my career path look like this year?' },
  { text: 'When will I find love?' },
  { text: 'Which remedies suit my chart best?' },
  { text: 'How is my health outlook?' },
];

export default function ChatScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const chartId: string | undefined = route.params?.chartId;

  const [chartName, setChartName] = useState('');
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Load chart display name + prior history
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (chartId) {
        try {
          const chart = await getChart(chartId);
          if (!cancelled) setChartName(chart.full_name || '');
        } catch {
          /* non-fatal */
        }
        try {
          const history = await getChatHistory(chartId);
          if (!cancelled && history.length > 0) {
            setMessages(
              history.map((m, i) => ({
                id: m.id || `hist-${i}`,
                sender: m.sender,
                text: m.text,
                time: m.time,
              }))
            );
          }
        } catch {
          /* history is optional */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chartId]);

  // Auto-scroll to the newest turn
  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(t);
  }, [messages, typing]);

  const send = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      if (!text || busy) return;

      const userMsg: ChatTurn = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      const aiId = `ai-${Date.now()}`;
      const history = messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ sender: m.sender, text: m.text }));

      setMessages((prev) => [
        ...prev,
        userMsg,
        { id: aiId, sender: 'ai', text: '', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
      ]);
      setInput('');
      setBusy(true);
      setTyping(true);

      try {
        await streamChatResponse(text, chartId ?? null, history, 'english', (chunk) => {
          setTyping(false);
          setMessages((prev) => prev.map((m) => (m.id === aiId ? { ...m, text: m.text + chunk } : m)));
        });
      } catch (err) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiId && !m.text ? { ...m, text: '⚠ The celestial connection was interrupted. Please try again.' } : m
          )
        );
      } finally {
        setBusy(false);
        setTyping(false);
      }
    },
    [busy, chartId, messages]
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.indigoDeep }} />
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.backBtn}>
          <Text style={{ color: colors.goldLight, fontSize: 18 }}>←</Text>
        </Pressable>
        <View style={styles.headerAvatar}>
          <Text style={{ fontSize: 14 }}>✦</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[typeScale.headlineSm, { color: colors.goldLight, fontSize: 15 }]}>Ask AI Jyotishi</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={styles.liveDot} />
            <Text style={{ color: 'rgba(240,223,175,0.8)', fontSize: 9.5, fontWeight: '700', letterSpacing: 0.8 }}>
              {chartName ? `READING · ${chartName.toUpperCase()}` : 'COSMIC GUIDE · GENERAL'}
            </Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView ref={scrollRef} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 20 }}>
          {messages.length === 0 && (
            <View style={styles.welcomeCard}>
              <Text style={{ color: colors.gold, fontSize: 22, marginBottom: 6 }}>✦</Text>
              <Text style={[typeScale.headlineSm, { color: colors.indigo }]}>Namaste, seeker</Text>
              <Text style={[typeScale.bodySm, { color: colors.textMuted, textAlign: 'center', marginTop: 4 }]}>
                Ask anything about your chart — career, marriage, health, remedies. The Jyotishi answers from your
                actual planetary placements, never generic horoscopes.
              </Text>
            </View>
          )}

          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <View key={msg.id} style={[styles.turnRow, { justifyContent: isUser ? 'flex-end' : 'flex-start' }]}>
                <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAi]}>
                  <Text style={[isUser ? styles.msgTextUser : styles.msgTextAi, { marginTop: 0 }]}>
                    {msg.text || ''}
                  </Text>
                  {msg.time ? (
                    <Text style={[styles.timeStamp, { color: isUser ? 'rgba(240,223,175,0.7)' : colors.textGhost }]}>
                      {msg.time}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}

          {typing && (
            <View style={[styles.turnRow, { justifyContent: 'flex-start' }]}>
              <View style={[styles.bubble, styles.bubbleAi, { flexDirection: 'row', alignItems: 'center', gap: 5 }]}>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={[styles.typingDot, { opacity: 0.4 + i * 0.2 }]} />
                ))}
                <Text style={[typeScale.caption, { color: colors.textGhost, marginLeft: 4, fontStyle: 'italic' }]}>
                  consulting the ephemeris…
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Quick prompts */}
        {messages.length === 0 && (
          <View style={{ paddingHorizontal: spacing.lg, paddingBottom: 8 }}>
            <Text style={[typeScale.label, { color: colors.ochre, marginBottom: 6, fontSize: 9 }]}>SUGGESTED INQUIRIES</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {QUICK_PROMPTS.map((p) => (
                <Pressable key={p.text} onPress={() => send(p.text)} style={styles.quickPill}>
                  <Text style={{ color: colors.indigoContainer, fontSize: 11.5, fontWeight: '600' }}>{p.text}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Input bar */}
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: colors.surface }}>
          <View style={styles.inputBar}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Ask the Jyotishi…"
              placeholderTextColor={colors.textGhost}
              style={styles.input}
              multiline
              maxLength={500}
            />
            <Pressable onPress={() => send(input)} disabled={!input.trim() || busy} style={[styles.sendBtn, (!input.trim() || busy) && { opacity: 0.4 }]}>
              {busy ? <ActivityIndicator size="small" color={colors.goldLight} /> : <Text style={{ color: colors.goldLight, fontSize: 14 }}>➤</Text>}
            </Pressable>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.indigoDeep,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(217,166,60,0.5)',
  },
  backBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.indigoContainer,
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ADE80' },
  welcomeCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(217,166,60,0.45)',
    padding: 20,
    alignItems: 'center',
    marginBottom: 14,
  },
  turnRow: { flexDirection: 'row', marginBottom: 10 },
  bubble: {
    maxWidth: '85%',
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: colors.indigoContainer,
    borderWidth: 1,
    borderColor: 'rgba(217,166,60,0.4)',
    borderBottomRightRadius: 4,
  },
  bubbleAi: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(232,213,167,0.9)',
    borderBottomLeftRadius: 4,
  },
  msgTextUser: { color: colors.goldLight, fontSize: 13.5, lineHeight: 20 },
  msgTextAi: { color: colors.ink, fontSize: 13.5, lineHeight: 20 },
  timeStamp: { fontSize: 9, marginTop: 5, alignSelf: 'flex-end' },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.indigoContainer },
  quickPill: {
    backgroundColor: colors.goldLight,
    borderWidth: 1,
    borderColor: 'rgba(217,166,60,0.5)',
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 2,
    marginBottom: 2,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: 'rgba(232,213,167,0.8)',
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 110,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: 'rgba(217,166,60,0.4)',
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    color: colors.ink,
    fontSize: 13.5,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.indigoContainer,
    borderWidth: 1,
    borderColor: 'rgba(217,166,60,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
