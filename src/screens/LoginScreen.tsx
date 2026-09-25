import React, { useEffect, useRef, useState } from 'react';
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
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import Svg, { Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { colors, gradients } from '../theme/colors';
import { type as typeScale } from '../theme/typography';
import YantraBackground from '../components/YantraBackground';
import Starfield from '../components/Starfield';
import AnimatedLogo from '../components/AnimatedLogo';
import GradientWordmark from '../components/GradientWordmark';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL, saveSession } from '../services/api';
import { tapMedium, successTick, warningBuzz, selectionTick } from '../services/haptics';

// Complete the browser redirect flow (expo-web-browser session)
WebBrowser.maybeCompleteAuthSession();

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

// Google OAuth Client ID used by website and mobile app (accepted by FastAPI backend /auth/google)
const GOOGLE_CLIENT_ID = '2126001520-61p5dqr243dg1jjj9obrahhcifod1prv.apps.googleusercontent.com';

export default function LoginScreen() {
  const { login, register, adoptSession } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [language, setLanguage] = useState('english');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState('');
  const [welcome, setWelcome] = useState('');

  const passwordInputRef = useRef<TextInput>(null);

  // ── Google auth (expo-auth-session) ──────────────────────────────────────
  const redirectUri = AuthSession.makeRedirectUri();
  console.log('🔗 [Google Auth] Expo Redirect URI:', redirectUri);

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_CLIENT_ID,
    webClientId: GOOGLE_CLIENT_ID,
    androidClientId: GOOGLE_CLIENT_ID,
    iosClientId: GOOGLE_CLIENT_ID,
    redirectUri,
  });

  const handleGoogleToken = async (token: string) => {
    try {
      setGoogleBusy(true);
      const { data } = await axios.post(`${API_BASE_URL}/auth/google`, {
        token,
        language,
      });
      await saveSession(data.access_token, data.user);
      adoptSession(data.user);
      setWelcome(`Welcome, ${(data.user?.name || 'seeker').split(' ')[0]} ✦ Entering the vault…`);
    } catch (err: any) {
      console.error('Google backend auth error:', err?.response?.data || err);
      const rawDetail = err?.response?.data?.detail;
      let msg = '';
      if (typeof rawDetail === 'string') {
        msg = rawDetail;
      } else if (Array.isArray(rawDetail)) {
        msg = rawDetail.map((d: any) => d.msg || JSON.stringify(d)).join('; ');
      } else if (rawDetail) {
        msg = JSON.stringify(rawDetail);
      } else if (err?.message) {
        msg = err.message;
      }
      setError(msg || 'Google sign-in server verification failed. Please try again.');
    } finally {
      setGoogleBusy(false);
    }
  };

  useEffect(() => {
    if (!response) return;
    if (response.type === 'error') {
      setGoogleBusy(false);
      const errDetail = (response as any)?.error?.message || (response as any)?.params?.error_description || '';
      setError(errDetail ? `Google sign-in error: ${errDetail}` : 'Google sign-in was cancelled or failed. Please try again.');
      return;
    }
    if (response.type === 'success') {
      const token =
        (response as any)?.authentication?.accessToken ??
        (response as any)?.params?.access_token ??
        (response as any)?.authentication?.idToken ??
        (response as any)?.params?.id_token ??
        null;
      if (!token) {
        setGoogleBusy(false);
        setError('Google sign-in did not return a valid token. Please try again.');
        return;
      }
      handleGoogleToken(token);
    }
  }, [response]);

  const onGooglePress = async () => {
    setError('');
    setGoogleBusy(true);
    try {
      if (!request) {
        setError('Google sign-in service is initializing. Please try again in a moment.');
        setGoogleBusy(false);
        return;
      }
      const res = await promptAsync();
      if (res.type === 'success') {
        const token =
          (res as any)?.authentication?.accessToken ??
          (res as any)?.params?.access_token ??
          (res as any)?.authentication?.idToken ??
          (res as any)?.params?.id_token ??
          null;
        if (token) {
          await handleGoogleToken(token);
          return;
        }
      } else if (res.type === 'cancel' || res.type === 'dismiss') {
        setError('Google sign-in was cancelled.');
        setGoogleBusy(false);
      }
    } catch (err: any) {
      console.error('onGooglePress error:', err);
      setError(err?.message || 'Failed to open Google sign-in window.');
      setGoogleBusy(false);
    }
  };

  // ── Email auth ───────────────────────────────────────────────────────────
  const submit = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }
    if (mode === 'register') {
      if (!name.trim()) {
        setError('Please enter your full name.');
        return;
      }
      if (!PASSWORD_REGEX.test(password)) {
        setError('Password must be 8+ characters with an uppercase letter, a lowercase letter, and a number.');
        return;
      }
    }
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), password, name.trim(), language);
      }
      setWelcome('Session synchronized ✦ Entering the vault…');
      successTick();
    } catch (err: any) {
      warningBuzz();
      setError(err?.response?.data?.detail || err?.message || 'Authentication error.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <YantraBackground />
      <Starfield count={40} variant="light" />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Hero brand block */}
            <View style={styles.brand}>
              <AnimatedLogo size={64} />
              <View style={{ marginTop: 6 }}>
                <GradientWordmark scale={0.62} />
              </View>
              <Text style={[typeScale.label, { color: colors.ochre, marginTop: 10, fontSize: 9.5 }]}>
                {mode === 'login' ? 'UNLOCK YOUR CELESTIAL VAULT' : 'CREATE YOUR SCHOLAR PROFILE'}
              </Text>
            </View>

            {/* Glass card (lp-login-card) */}
            <View style={styles.cardShadowWrap}>
              <View style={styles.card}>
                {/* Gold top line (lp-login-card::before) */}
                <LinearGradient
                  colors={gradients.cardTopLine}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.cardTopLine}
                />

                {/* Card header (lp-card-header) */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardEmblem}>
                    <Text style={{ color: colors.gold, fontSize: 20 }}>✦</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[typeScale.label, { color: colors.gold, fontSize: 9.5, marginBottom: 3 }]}>
                      {mode === 'login' ? 'VEDIC SCHOLAR ACCESS' : 'JOIN THE OBSERVATORY'}
                    </Text>
                    <Text style={[styles.cardTitle, { fontFamily: typeScale.serif?.fontFamily }]}>
                      {mode === 'login' ? 'Sign In to Vault' : 'Create Scholar Profile'}
                    </Text>
                  </View>
                </View>

                {/* Tabs (lp-auth-tabs) */}
                <View style={styles.tabsRow}>
                  {(['login', 'register'] as const).map((m) => (
                    <Pressable
                      key={m}
                      onPress={() => { selectionTick(); setMode(m); setError(''); }}
                      style={[styles.tab, mode === m && styles.tabActive]}
                    >
                      <Text style={[styles.tabText, mode === m && styles.tabTextActive]}>
                        {m === 'login' ? 'Sign In' : 'Create Profile'}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {error ? <Banner text={error} kind="error" /> : null}
                {welcome ? <Banner text={welcome} kind="success" /> : null}

                {/* Google button (lp-google-btn) — placed first, like the website */}
                <Pressable
                  onPress={onGooglePress}
                  disabled={googleBusy || busy || !request}
                  style={({ pressed }) => [styles.googleBtn, pressed && { transform: [{ scale: 0.98 }] }]}
                >
                  {googleBusy ? (
                    <ActivityIndicator size="small" color={colors.goldDeep} />
                  ) : (
                    <>
                      <GoogleG />
                      <Text style={styles.googleText}>Continue with Google</Text>
                    </>
                  )}
                </Pressable>

                {/* Divider ornament (lp-form-divider with diamond) */}
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <View style={styles.dividerDiamond} />
                  <Text style={styles.dividerText}>or continue with email</Text>
                  <View style={styles.dividerDiamond} />
                  <View style={styles.dividerLine} />
                </View>

                {/* Form fields — underline style (lp-input) */}
                {mode === 'register' && (
                  <UnderlineField label="FULL NATIVE NAME">
                    <TextInput
                      value={name}
                      onChangeText={setName}
                      placeholder="e.g. Aaryavart Sharma"
                      placeholderTextColor={colors.textGhost}
                      style={styles.input}
                      autoCapitalize="words"
                    />
                  </UnderlineField>
                )}

                <UnderlineField label="EMAIL ADDRESS">
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="scholar@astrology.com"
                    placeholderTextColor={colors.textGhost}
                    style={styles.input}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                  />
                </UnderlineField>

                <UnderlineField label="PASSWORD">
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TextInput
                      ref={passwordInputRef}
                      value={password}
                      onChangeText={setPassword}
                      placeholder="••••••••"
                      placeholderTextColor={colors.textGhost}
                      style={[styles.input, { flex: 1 }]}
                      secureTextEntry={!showPassword}
                      autoComplete={mode === 'login' ? 'password' : 'new-password'}
                    />
                    <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8} style={{ paddingHorizontal: 6 }}>
                      <Text style={{ color: colors.goldDeep, fontSize: 10.5, fontWeight: '700' }}>
                        {showPassword ? 'HIDE' : 'SHOW'}
                      </Text>
                    </Pressable>
                  </View>
                </UnderlineField>

                {mode === 'register' && (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={styles.fieldLabel}>PREFERRED LANGUAGE</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {[
                        { id: 'english', label: 'English' },
                        { id: 'hindi', label: 'हिन्दी' },
                        { id: 'bengali', label: 'বাংলা' },
                      ].map((l) => (
                        <Pressable
                          key={l.id}
                          onPress={() => { selectionTick(); setLanguage(l.id); }}
                          style={[styles.langPill, language === l.id && styles.langPillActive]}
                        >
                          <Text style={[styles.langPillText, language === l.id && { color: '#fff' }]}>
                            {l.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}

                {/* Gold gradient CTA (lp-cta-primary) */}
                <Pressable
                  onPress={() => { tapMedium(); submit(); }}
                  disabled={busy}
                  style={({ pressed }) => [styles.ctaWrap, pressed && { transform: [{ scale: 0.985 }] }]}
                >
                  <LinearGradient
                    colors={gradients.ctaGold}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.cta}
                  >
                    {busy ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.ctaText}>
                        {mode === 'login' ? 'Authenticate & Unlock Vault' : 'Complete Registration'}
                      </Text>
                    )}
                  </LinearGradient>
                </Pressable>

                <Text style={[typeScale.caption, { color: colors.textFaint, textAlign: 'center', marginTop: 14, fontSize: 10.5, lineHeight: 16 }]}>
                  {mode === 'login'
                    ? 'Your saved natal charts, dashas and reading archive — sealed and private.'
                    : 'Save D1–D60 vargas, planetary notes & chat transcripts to your private vault.'}
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function UnderlineField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Banner({ text, kind }: { text: string; kind: 'error' | 'success' }) {
  return (
    <View style={[styles.banner, kind === 'error' ? styles.bannerError : styles.bannerSuccess]}>
      <Text style={{ color: kind === 'error' ? colors.error : colors.success, fontSize: 12, flex: 1, lineHeight: 17 }}>
        {text}
      </Text>
    </View>
  );
}

function GoogleG() {
  return (
    <Svg width={18} height={18} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </Svg>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingTop: 36,
    paddingBottom: 44,
  },
  brand: { alignItems: 'center', marginBottom: 20 },
  cardShadowWrap: {
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#7C5800',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  card: {
    backgroundColor: 'rgba(255,253,247,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(201,149,42,0.28)',
    borderRadius: 28,
    paddingVertical: 26,
    paddingHorizontal: 22,
    overflow: 'hidden',
  },
  cardTopLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    opacity: 0.9,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  cardEmblem: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(201,149,42,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(201,149,42,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: 0.8,
  },
  tabsRow: {
    flexDirection: 'row',
    borderRadius: 10,
    backgroundColor: 'rgba(124,88,0,0.06)',
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 7,
  },
  tabActive: {
    backgroundColor: '#fff',
    shadowColor: '#7C5800',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  tabText: {
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.7,
    color: colors.textFaint,
    textTransform: 'uppercase',
  },
  tabTextActive: { color: colors.ochre },
  banner: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  bannerError: {
    backgroundColor: 'rgba(186,26,26,0.08)',
    borderColor: 'rgba(186,26,26,0.2)',
  },
  bannerSuccess: {
    backgroundColor: 'rgba(30,110,62,0.08)',
    borderColor: 'rgba(30,110,62,0.2)',
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(124,88,0,0.2)',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  googleText: {
    color: '#3C4043',
    fontSize: 13,
    fontWeight: '600',
  },
  gQuadrant: { position: 'absolute' },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(201,149,42,0.15)',
  },
  dividerDiamond: {
    width: 7,
    height: 7,
    backgroundColor: 'rgba(201,149,42,0.3)',
    borderRadius: 1,
    transform: [{ rotate: '45deg' }],
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: colors.textGhost,
    textTransform: 'uppercase',
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.goldDark,
    marginBottom: 2,
  },
  input: {
    color: colors.ink,
    fontSize: 14,
    paddingVertical: 10,
    paddingHorizontal: 0,
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(124,88,0,0.2)',
  },
  langPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(124,88,0,0.2)',
    backgroundColor: '#fff',
  },
  langPillActive: {
    backgroundColor: colors.goldDeep,
    borderColor: colors.goldDeep,
  },
  langPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textFaint,
  },
  ctaWrap: {
    borderRadius: 999,
    marginTop: 6,
    elevation: 4,
    shadowColor: '#A67820',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  cta: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  ctaText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    fontFamily: typeScale.serif?.fontFamily,
  },
});
