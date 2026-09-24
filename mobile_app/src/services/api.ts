import axios, { AxiosError } from 'axios';
import { API_BASE_URL } from './config';
import { jsonCache, secureStorage, STORAGE_KEYS } from './storage';

export { API_BASE_URL };

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 90_000,
});

let onSessionExpired: (() => void) | null = null;
export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler;
}

// Inject JWT bearer token on every request
client.interceptors.request.use(async (config) => {
  const token = await secureStorage.get(STORAGE_KEYS.token);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Central 401 → forced logout (mirrors the web app's session-expiry flow)
client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      const hadSession = await secureStorage.get(STORAGE_KEYS.token);
      if (hadSession && onSessionExpired) {
        await clearSession();
        onSessionExpired();
      }
    }
    return Promise.reject(error);
  }
);

// ── Session helpers ────────────────────────────────────────────────────────

export interface UserProfile {
  id?: string;
  email?: string;
  name?: string;
  preferred_language?: string;
  [key: string]: unknown;
}

export async function saveSession(token: string, profile: UserProfile) {
  await secureStorage.set(STORAGE_KEYS.token, token);
  await secureStorage.set(STORAGE_KEYS.user, JSON.stringify(profile));
}

export async function loadSession(): Promise<{ token: string; profile: UserProfile } | null> {
  const token = await secureStorage.get(STORAGE_KEYS.token);
  if (!token) return null;
  const profile = await jsonCache.get<UserProfile>(STORAGE_KEYS.user);
  return profile ? { token, profile } : null;
}

export async function clearSession() {
  await secureStorage.remove(STORAGE_KEYS.token);
  await secureStorage.remove(STORAGE_KEYS.user);
}

// ── Auth ───────────────────────────────────────────────────────────────────

export async function loginWithEmail(email: string, password: string) {
  const { data } = await client.post('/auth/login', { email, password });
  await saveSession(data.access_token, data.user);
  return data as { access_token: string; user: UserProfile };
}

export async function registerWithEmail(
  email: string,
  password: string,
  name: string,
  language = 'english'
) {
  const { data } = await client.post('/auth/register', { email, password, name, language });
  await saveSession(data.access_token, data.user);
  return data as { access_token: string; user: UserProfile };
}

// ── Charts ─────────────────────────────────────────────────────────────────

export interface ChartSummary {
  chart_id?: string;
  id?: string;
  full_name: string;
  date_of_birth?: string;
  time_of_birth?: string;
  city_of_birth?: string;
  lagna?: string;
  lagna_degree?: string;
  moon_nakshatra?: string;
  moon_degree?: string;
  atmakaraka?: string;
  active_mahadasha?: string;
  relationship?: string;
  category?: string;
  birth_time_confidence?: string;
}

export interface Planet {
  name: string;
  sign?: string;
  sign_num?: number;
  house?: number;
  degree?: number;
  normDegree?: number;
  fullDegree?: number;
  isRetrograde?: boolean | string;
  nakshatra?: string;
  nakshatra_pada?: number;
  nakshatra_lord?: string;
  speed?: number;
}

export interface ChartData {
  chart_id?: string;
  full_name?: string;
  date_of_birth?: string;
  time_of_birth?: string;
  city_of_birth?: string;
  current_city?: string;
  birth_time_confidence?: string;
  language?: string;
  ascendant?: { sign?: string; sign_num?: number; degree?: number; nakshatra?: string };
  planets?: Planet[];
  dasha?: {
    mahadasha?: string;
    antardasha?: string;
    mahadasha_start?: string;
    mahadasha_end?: string;
    antardasha_start?: string;
    antardasha_end?: string;
  };
  numerology?: Record<string, unknown>;
  astro_details?: Record<string, unknown>;
  mangal_dosha?: { present?: boolean; house?: number };
  kalsarp?: { present?: boolean; type?: string };
  pitru_dosha?: { present?: boolean };
  nakshatra?: { nakshatra?: string; nakshatra_pada?: number; nakshatra_lord?: string; gand_mool?: { present?: boolean } };
  atmakaraka?: string;
  navamsha?: DivisionalChartPayload;
  dashamsha?: DivisionalChartPayload;
  chaturthamsa?: DivisionalChartPayload;
  saptamsha?: DivisionalChartPayload;
  trimsamsa?: DivisionalChartPayload;
  chandra_kundali?: DivisionalChartPayload;
  surya_kundali?: DivisionalChartPayload;
  gochar?: DivisionalChartPayload & { computed_at?: string };
  [key: string]: unknown;
}

export interface DivisionalChartPayload {
  ascendant?: { sign?: string; sign_num?: number };
  planets?: Planet[];
  computed_at?: string;
}

export interface BirthForm {
  full_name: string;
  date_of_birth: string; // YYYY-MM-DD
  time_of_birth: string; // HH:MM
  city_of_birth: string;
  current_city?: string;
  birth_time_confidence: 'exact' | 'approximate' | 'unknown';
  language: string;
}

export async function generateChart(form: BirthForm) {
  const { data } = await client.post('/chart/generate', form);
  return data as { chart_id: string; full_name?: string };
}

export async function updateChart(chartId: string, form: Partial<BirthForm>) {
  const { data } = await client.put(`/chart/${chartId}`, form);
  return data as ChartData & { chart_id?: string };
}

export async function deleteChart(chartId: string) {
  const { data } = await client.delete(`/chart/${chartId}`);
  return data;
}

/**
 * Fetch a chart. On network failure falls back to the user's REAL cached
 * chart (flagged `__offline`) — the same honesty contract as the web app:
 * never fabricated data, always labeled.
 */
export async function getChart(chartId: string): Promise<ChartData & { __offline?: boolean; __offline_since?: string }> {
  try {
    const { data } = await client.get(`/chart/${chartId}`);
    await jsonCache.set(STORAGE_KEYS.chartCache(chartId), data);
    return data;
  } catch (error) {
    const cached = await jsonCache.get<ChartData>(STORAGE_KEYS.chartCache(chartId));
    if (cached) {
      return { ...cached, __offline: true, __offline_since: new Date().toISOString() };
    }
    throw error;
  }
}

export async function getUserCharts(): Promise<ChartSummary[]> {
  try {
    const { data } = await client.get('/chart');
    await jsonCache.set('trikal-user-charts', data);
    return Array.isArray(data) ? data : [];
  } catch {
    const cached = await jsonCache.get<ChartSummary[]>('trikal-user-charts');
    return cached ?? [];
  }
}

// ── Interpretations ────────────────────────────────────────────────────────

export async function getAllInterpretations(chartId: string, language = 'english') {
  try {
    const { data } = await client.get(`/interpret/${chartId}`, { params: { language } });
    if (data && Object.keys(data).length > 0) {
      await jsonCache.set(STORAGE_KEYS.interpCache(chartId, language), data);
    }
    return data as Record<string, string>;
  } catch {
    const cached = await jsonCache.get<Record<string, string>>(STORAGE_KEYS.interpCache(chartId, language));
    return cached ?? {};
  }
}

/**
 * Stream one chapter interpretation (tokens arrive incrementally).
 * Returns the full text once the stream ends.
 */
export async function streamInterpretation(
  chartId: string,
  tabNumber: number,
  language: string,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const token = await secureStorage.get(STORAGE_KEYS.token);
  const response = await fetch(`${API_BASE_URL}/interpret/${chartId}/${tabNumber}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ language }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Stream failed with status ${response.status}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const data = await response.json();
    if (data?.status === 'pending') {
      onChunk('✦ This chapter is queued for synthesis. It will appear automatically — check back shortly.');
      return '';
    }
  }

  return consumeStream(response, onChunk);
}

// ── Chat ───────────────────────────────────────────────────────────────────

export interface ChatTurn {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  time?: string;
}

export async function getChatHistory(chartId: string): Promise<ChatTurn[]> {
  try {
    const { data } = await client.get(`/chat/history/${chartId}`);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/**
 * Stream an AI Jyotishi reply. Resolves with the complete response text.
 */
export async function streamChatResponse(
  message: string,
  chartId: string | null,
  history: Array<{ sender: string; text: string }>,
  language: string,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const token = await secureStorage.get(STORAGE_KEYS.token);
  const userMsgId = `user-${Date.now()}`;
  const aiMsgId = `ai-${Date.now()}`;
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      message,
      chart_id: chartId || null,
      history,
      user_msg_id: userMsgId,
      ai_msg_id: aiMsgId,
      language,
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Chat failed with status ${response.status}`);
  }

  return consumeStream(response, onChunk);
}

// ── Streaming plumbing ─────────────────────────────────────────────────────

async function consumeStream(
  response: Response,
  onChunk: (chunk: string) => void
): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Response body is not readable');

  const decoder = new TextDecoder('utf-8');
  let full = '';
  let done = false;

  while (!done) {
    const { value, done: readerDone } = await reader.read();
    done = readerDone;
    if (value && value.length > 0) {
      const chunk = decoder.decode(value, { stream: true });
      full += chunk;
      onChunk(chunk);
    }
  }
  return full;
}

// ── Progress ───────────────────────────────────────────────────────────────

export interface GenerationProgress {
  completed_tabs: number[];
  total_tabs: number;
  percent: number;
  is_complete: boolean;
}

export async function getGenerationProgress(chartId: string): Promise<GenerationProgress | null> {
  try {
    const { data } = await client.get(`/progress/${chartId}`);
    return data as GenerationProgress;
  } catch {
    return null;
  }
}

// ── Live transits (Gochar) — public endpoint, no auth ─────────────────────

export interface GocharPayload {
  chart_type?: string;
  computed_at?: string;
  ascendant?: { sign?: string; sign_num?: number; degree?: number };
  planets?: Planet[];
  error?: string;
}

/** GET /chart/gochar — real-time planetary positions via Swiss Ephemeris. */
export async function getGochar(lat?: number, lng?: number): Promise<GocharPayload> {
  const params: Record<string, number> = {};
  if (lat != null && lng != null) {
    params.lat = lat;
    params.lng = lng;
  }
  const { data } = await client.get('/chart/gochar', { params });
  return data as GocharPayload;
}
