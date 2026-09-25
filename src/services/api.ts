import axios, { AxiosError } from 'axios';
import { API_BASE_URL } from './config';
import { jsonCache, secureStorage, STORAGE_KEYS } from './storage';
import {
  sanitizeInput,
  sanitizeEmail,
  isTokenExpired,
  checkRateLimit,
  deduplicateRequest,
  withRetry,
  assertPayloadSize,
} from './security';

import { friendlyError } from './errors';

export { API_BASE_URL };

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60_000,
});

let onSessionExpired: (() => void) | null = null;
export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler;
}

// Inject JWT bearer token on every request
client.interceptors.request.use(async (config) => {
  const token = await secureStorage.get(STORAGE_KEYS.token);
  if (token && !isTokenExpired(token)) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Central 401 → forced logout & automatic leak masking interceptor
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
    // Attach sanitized, human-friendly sentence to error instance
    (error as any).friendlyMessage = friendlyError(error);
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
  if (isTokenExpired(token)) {
    await clearSession();
    return null;
  }
  const profile = await jsonCache.get<UserProfile>(STORAGE_KEYS.user);
  return profile ? { token, profile } : null;
}

export async function clearSession() {
  await secureStorage.remove(STORAGE_KEYS.token);
  await secureStorage.remove(STORAGE_KEYS.user);
}

// ── Auth ───────────────────────────────────────────────────────────────────

export async function loginWithEmail(email: string, password: string) {
  if (!checkRateLimit('auth:login', 5, 60_000)) {
    throw new Error('Too many login attempts. Please wait a moment and try again.');
  }
  const sanitizedEmail = sanitizeEmail(email);
  const payload = { email: sanitizedEmail || email.trim(), password };
  assertPayloadSize(payload, 'login payload');
  const { data } = await withRetry(
    () => client.post('/auth/login', payload),
    2, // max 2 retries
    400
  );
  await saveSession(data.access_token, data.user);
  return data as { access_token: string; user: UserProfile };
}

export async function registerWithEmail(
  email: string,
  password: string,
  name: string,
  language = 'english'
) {
  if (!checkRateLimit('auth:register', 3, 120_000)) {
    throw new Error('Too many registration attempts. Please wait a moment and try again.');
  }
  const sanitizedEmail = sanitizeEmail(email);
  const sanitizedName = sanitizeInput(name, 100);
  const payload = {
    email: sanitizedEmail || email.trim(),
    password,
    name: sanitizedName,
    language: sanitizeInput(language, 30),
  };
  assertPayloadSize(payload, 'register payload');
  const { data } = await withRetry(
    () => client.post('/auth/register', payload),
    2,
    400
  );
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

// ── High-performance L1 In-Memory Cache ─────────────────────────────────────
const memoryCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getMemoryCache<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setMemoryCache(key: string, data: any): void {
  memoryCache.set(key, { data, timestamp: Date.now() });
}

export async function updateChart(chartId: string, form: Partial<BirthForm>) {
  const { data } = await client.put(`/chart/${chartId}`, form);
  memoryCache.delete(STORAGE_KEYS.chartCache(chartId));
  memoryCache.delete('trikal-user-charts');
  return data as ChartData & { chart_id?: string };
}

export async function deleteChart(chartId: string) {
  const { data } = await client.delete(`/chart/${chartId}`);
  memoryCache.delete(STORAGE_KEYS.chartCache(chartId));
  memoryCache.delete('trikal-user-charts');
  return data;
}

/**
 * Fetch a chart. On network failure falls back to the user's REAL cached
 * chart (flagged `__offline`) — the same honesty contract as the web app:
 * never fabricated data, always labeled.
 */
export async function getChart(chartId: string): Promise<ChartData & { __offline?: boolean; __offline_since?: string }> {
  const memKey = STORAGE_KEYS.chartCache(chartId);
  const memData = getMemoryCache<ChartData>(memKey);
  if (memData) return memData;

  // Deduplicate: if the same chart is already being fetched, share the promise
  return deduplicateRequest(`getChart:${chartId}`, async () => {
    try {
      const { data } = await withRetry(() => client.get(`/chart/${chartId}`), 2, 500);
      setMemoryCache(memKey, data);
      await jsonCache.set(memKey, data);
      return data as ChartData;
    } catch (error) {
      const cached = await jsonCache.get<ChartData>(memKey);
      if (cached) {
        setMemoryCache(memKey, cached);
        return { ...cached, __offline: true, __offline_since: new Date().toISOString() };
      }
      throw error;
    }
  });
}

export async function getUserCharts(): Promise<ChartSummary[]> {
  const memKey = 'trikal-user-charts';
  const memData = getMemoryCache<ChartSummary[]>(memKey);
  if (memData) return memData;

  // Deduplicate concurrent calls (e.g. two screens mounting simultaneously)
  return deduplicateRequest('getUserCharts', async () => {
    try {
      const { data } = await withRetry(() => client.get('/chart'), 2, 500);
      const result = Array.isArray(data) ? data : [];
      setMemoryCache(memKey, result);
      await jsonCache.set(memKey, result);
      return result as ChartSummary[];
    } catch {
      const cached = await jsonCache.get<ChartSummary[]>(memKey);
      const result = cached ?? [];
      if (result.length > 0) setMemoryCache(memKey, result);
      return result;
    }
  });
}

// ── Interpretations ────────────────────────────────────────────────────────

export async function getAllInterpretations(chartId: string, language = 'english', forceFresh = false) {
  const memKey = STORAGE_KEYS.interpCache(chartId, language);
  if (!forceFresh) {
    const memData = getMemoryCache<Record<string, string>>(memKey);
    if (memData) return memData;
  }

  try {
    const { data } = await client.get(`/interpret/${chartId}`, { params: { language } });
    if (data && Object.keys(data).length > 0) {
      setMemoryCache(memKey, data);
      await jsonCache.set(memKey, data);
    }
    return data as Record<string, string>;
  } catch {
    const cached = await jsonCache.get<Record<string, string>>(memKey);
    const result = cached ?? {};
    if (Object.keys(result).length > 0) setMemoryCache(memKey, result);
    return result;
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
  try {
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
      const all = await getAllInterpretations(chartId, language);
      const text = all?.[tabNumber] || all?.[String(tabNumber)];
      if (text) {
        onChunk(text);
        return text;
      }
      throw new Error(`Stream failed with status ${response.status}`);
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      if (data?.status === 'pending') {
        onChunk('✦ This chapter is queued for synthesis. It will appear automatically — check back shortly.');
        return '';
      }
      if (data?.interpretation || data?.content || data?.text) {
        const text = data.interpretation || data.content || data.text;
        onChunk(text);
        return text;
      }
    }

    return await consumeStream(response, onChunk);
  } catch (err: any) {
    if (signal?.aborted || err?.name === 'AbortError') throw err;
    try {
      const all = await getAllInterpretations(chartId, language);
      const text = all?.[tabNumber] || all?.[String(tabNumber)];
      if (text) {
        onChunk(text);
        return text;
      }
    } catch {
      /* ignore fallback failure */
    }
    throw err;
  }
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
  if (!checkRateLimit('chat:stream', 20, 60_000)) {
    throw new Error('You are sending messages too quickly — please wait a moment.');
  }
  const token = await secureStorage.get(STORAGE_KEYS.token);
  const userMsgId = `user-${Date.now()}`;
  const aiMsgId = `ai-${Date.now()}`;
  const chatPayload = {
    message: sanitizeInput(message, 2000),
    chart_id: chartId || null,
    history: history.slice(-20), // Cap history to last 20 turns to prevent oversized payloads
    user_msg_id: userMsgId,
    ai_msg_id: aiMsgId,
    language,
  };
  assertPayloadSize(chatPayload, 'chat payload');
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(chatPayload),
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
  const reader = typeof response.body?.getReader === 'function' ? response.body.getReader() : null;
  if (!reader) {
    const text = await response.text();
    if (text) {
      onChunk(text);
      return text;
    }
    throw new Error('Response body is empty or not readable');
  }

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
