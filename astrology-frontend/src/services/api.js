import axios from 'axios';
import {
  notifyConnectionLost,
  notifyConnectionRestored,
} from './connection';

export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: real 401 = expired/invalid session → log out.
// Guards against loops by checking we are not already on a public page.
apiClient.interceptors.response.use(
  (response) => {
    notifyConnectionRestored();
    return response;
  },
  (error) => {
    const status = error.response?.status;
    if (status === 401) {
      const hadSession = localStorage.getItem('token');
      if (hadSession) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        notifyConnectionRestored();
        window.dispatchEvent(new CustomEvent('auth:logout', { detail: 'session-expired' }));
      }
    }
    return Promise.reject(error);
  }
);

/** Wrap streaming fetch() calls with the same 401 handling as axios calls. */
async function authedFetch(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  } catch (networkErr) {
    notifyConnectionLost(networkErr);
    throw networkErr;
  }

  if (!response.ok) {
    if (response.status === 401 && localStorage.getItem('token')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      notifyConnectionRestored();
      window.dispatchEvent(new CustomEvent('auth:logout', { detail: 'session-expired' }));
    }
    const err = new Error(`HTTP error! status: ${response.status}`);
    err.status = response.status;
    notifyConnectionLost(err);
    throw err;
  }

  notifyConnectionRestored();
  return response;
}

/**
 * Geocode a city to retrieve its coordinates.
 */
export async function geocodeCity(city) {
  try {
    const response = await apiClient.post('/geocode', { city });
    return response.data;
  } catch (error) {
    // Non-critical convenience lookup: fall back to raw city string (NOT fake
    // coordinates — the backend resolves coordinates server-side from the city).
    console.warn('Geocode unavailable, sending raw city string:', error.message);
    return { city, latitude: null, longitude: null, timezone: null };
  }
}

/**
 * Generate a complete astrology chart from user birth inputs.
 */
export async function generateChart(formData) {
  try {
    const response = await apiClient.post('/chart/generate', {
      full_name: formData.full_name,
      date_of_birth: formData.date_of_birth,
      time_of_birth: formData.time_of_birth,
      city_of_birth: formData.city_of_birth,
      current_city: formData.current_city,
      birth_time_confidence: formData.birth_time_confidence,
      language: formData.language || 'english',
    });
    return response.data;
  } catch (error) {
    notifyConnectionLost(error);
    throw error;
  }
}

/**
 * Offline cache of the user's REAL chart data (localStorage).
 *
 * After a successful fetch we persist the chart + interpretations. If the
 * backend is unreachable later, the dashboard can show the user's genuine
 * saved reading (clearly labeled with its calculation date) instead of a
 * blank screen — their real data, never fabricated data.
 */
const CHART_CACHE_PREFIX = 'trikal-chart-cache-';

export function cacheChart(chartId, data) {
  try {
    localStorage.setItem(
      `${CHART_CACHE_PREFIX}${chartId}`,
      JSON.stringify({ saved_at: new Date().toISOString(), chart: data })
    );
  } catch {
    /* storage full/unavailable — cache is best-effort */
  }
}

export function getCachedChart(chartId) {
  try {
    const raw = localStorage.getItem(`${CHART_CACHE_PREFIX}${chartId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.chart ? { savedAt: parsed.saved_at, chart: parsed.chart } : null;
  } catch {
    return null;
  }
}

export function cacheInterpretations(chartId, language, data) {
  try {
    localStorage.setItem(
      `${CHART_CACHE_PREFIX}${chartId}-interp-${language}`,
      JSON.stringify({ saved_at: new Date().toISOString(), interpretations: data })
    );
  } catch {
    /* best-effort */
  }
}

export function getCachedInterpretations(chartId, language) {
  try {
    const raw = localStorage.getItem(`${CHART_CACHE_PREFIX}${chartId}-interp-${language}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.interpretations ? { savedAt: parsed.saved_at, interpretations: parsed.interpretations } : null;
  } catch {
    return null;
  }
}

/**
 * Retrieve an existing chart by ID.
 */
export async function getChart(chartId) {
  try {
    const response = await apiClient.get(`/chart/${chartId}`);
    cacheChart(chartId, response.data);
    return response.data;
  } catch (error) {
    if (error.response?.status === 401) throw error; // handled by interceptor
    // Network/backend failure: fall back to the user's REAL cached chart so
    // they still see their genuine reading (callers label it as offline).
    const cached = getCachedChart(chartId);
    if (cached) {
      notifyConnectionLost(error);
      return { ...cached.chart, __offline: true, __offline_since: cached.savedAt };
    }
    notifyConnectionLost(error);
    throw error;
  }
}

/**
 * Fetch all already-generated interpretations for a chart.
 */
export async function getAllInterpretations(chartId, language = 'english') {
  try {
    const response = await apiClient.get(`/interpret/${chartId}`, { params: { language } });
    if (response.data && Object.keys(response.data).length > 0) {
      cacheInterpretations(chartId, language, response.data);
    }
    return response.data;
  } catch (error) {
    if (error.response?.status === 401) throw error;
    // Offline: serve the user's real cached chapters, clearly labeled by caller.
    const cached = getCachedInterpretations(chartId, language);
    if (cached) {
      notifyConnectionLost(error);
      return { ...cached.interpretations, __offline: true };
    }
    notifyConnectionLost(error);
    throw error;
  }
}

/**
 * Fetch streamed interpretations for a specific tab.
 */
export async function getInterpretation(chartId, tabNumber, language = 'english', onChunk) {
  const response = await authedFetch(`/interpret/${chartId}/${tabNumber}`, {
    method: 'POST',
    body: JSON.stringify({ language }),
  });

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const data = await response.json();
    if (data.status === 'pending') {
      if (onChunk) onChunk('{"status": "pending"}');
      return;
    }
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let done = false;

  while (!done) {
    const { value, done: readerDone } = await reader.read();
    done = readerDone;
    if (value) {
      const chunk = decoder.decode(value, { stream: !done });
      if (onChunk) onChunk(chunk);
    }
  }
}

/**
 * Fetch live Gochar (transit) chart.
 */
export async function getGochar(lat = 28.6139, lng = 77.209) {
  const response = await apiClient.get('/chart/gochar', { params: { lat, lng } });
  return response.data;
}

/**
 * Poll background pre-generation progress for a chart.
 * On failure returns null (NOT fake 100%) — callers must handle null.
 */
export async function getGenerationProgress(chartId) {
  try {
    const response = await apiClient.get(`/progress/${chartId}`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 401) throw error;
    console.warn('Progress poll failed (will retry):', error.message);
    return null;
  }
}

/**
 * Fetch all charts saved under the current user's profile.
 * Returns [] on 401/other errors — never fabricated data.
 */
export async function getUserCharts() {
  try {
    const response = await apiClient.get('/chart');
    return response.data;
  } catch (error) {
    if (error.response?.status === 401) {
      // Expired session while listing charts: the interceptor logs the user
      // out; here we simply report "no charts" so public pages stay clean.
      return [];
    }
    console.warn('getUserCharts failed:', error.message);
    return [];
  }
}

/**
 * Update birth details and recalculate chart.
 */
export async function updateChart(chartId, formData) {
  try {
    const response = await apiClient.put(`/chart/${chartId}`, formData);
    return response.data;
  } catch (error) {
    notifyConnectionLost(error);
    throw error;
  }
}

/**
 * Log in using email and password.
 */
export async function loginWithEmail(email, password) {
  const response = await apiClient.post('/auth/login', { email, password });
  return response.data;
}

/**
 * Register a new user.
 */
export async function registerWithEmail(email, password, name, language = 'english') {
  const response = await apiClient.post('/auth/register', { email, password, name, language });
  return response.data;
}

/**
 * Log in using Google OAuth ID token.
 */
export async function googleLogin(idToken, language = 'english') {
  const response = await apiClient.post('/auth/google', { token: idToken, language });
  return response.data;
}

/**
 * Stream real-time AI response for AskAI Chatbot.
 */
export async function streamChatResponse(message, chartId, history, userMsgId, aiMsgId, onChunk, language = 'english') {
  const payload = {
    message,
    chart_id: chartId || null,
    history: history || [],
    user_msg_id: userMsgId || null,
    ai_msg_id: aiMsgId || null,
    language: language || 'english',
  };

  const response = await authedFetch('/chat', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let done = false;

  while (!done) {
    const { value, done: readerDone } = await reader.read();
    done = readerDone;
    if (value) {
      const chunk = decoder.decode(value, { stream: !done });
      if (onChunk) onChunk(chunk);
    }
  }
}

/**
 * Fetch chat history for a specific chart.
 */
export async function getChatHistory(chartId) {
  try {
    const response = await apiClient.get(`/chat/history/${chartId}`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 401) throw error;
    console.warn('getChatHistory failed:', error.message);
    return []; // empty history is honest; fake history is not
  }
}

/**
 * Delete a saved chart from the user's account.
 */
export async function deleteChart(chartId) {
  const response = await apiClient.delete(`/chart/${chartId}`);
  return response.data;
}
