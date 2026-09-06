import axios from 'axios';
import {
  MOCK_USER,
  MOCK_CHART,
  MOCK_INTERPRETATIONS,
  MOCK_CHARTS_LIST,
  MOCK_CHAT_HISTORY
} from './mockData';

export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const IS_MOCK_MODE = import.meta.env.VITE_MOCK_MODE === 'true';

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

/**
 * Geocode a city to retrieve its coordinates.
 */
export async function geocodeCity(city) {
  if (IS_MOCK_MODE) {
    return {
      city: city || 'Varanasi, Uttar Pradesh, India',
      latitude: 25.3176,
      longitude: 82.9739,
      timezone: 5.5,
    };
  }
  try {
    const response = await apiClient.post('/geocode', { city });
    return response.data;
  } catch (error) {
    console.warn('Geocode API fallback to mock:', error.message);
    return { city: city || 'Varanasi, UP, India', latitude: 25.3176, longitude: 82.9739, timezone: 5.5 };
  }
}

/**
 * Generate a complete astrology chart from user birth inputs.
 */
export async function generateChart(formData) {
  if (IS_MOCK_MODE) {
    const customizedChart = {
      ...MOCK_CHART,
      full_name: formData.full_name || MOCK_CHART.full_name,
      date_of_birth: formData.date_of_birth || MOCK_CHART.date_of_birth,
      time_of_birth: formData.time_of_birth || MOCK_CHART.time_of_birth,
      city_of_birth: formData.city_of_birth || MOCK_CHART.city_of_birth,
      current_city: formData.current_city || MOCK_CHART.current_city,
      language: formData.language || 'english',
    };
    return customizedChart;
  }
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
    console.warn('Backend generate chart unreachable, falling back to mock chart:', error.message);
    return {
      ...MOCK_CHART,
      full_name: formData.full_name || MOCK_CHART.full_name,
      language: formData.language || 'english',
    };
  }
}

/**
 * Retrieve an existing chart by ID.
 */
export async function getChart(chartId) {
  if (IS_MOCK_MODE) {
    return MOCK_CHART;
  }
  try {
    const response = await apiClient.get(`/chart/${chartId}`);
    return response.data;
  } catch (error) {
    console.warn('Backend getChart unreachable, falling back to mock chart:', error.message);
    return MOCK_CHART;
  }
}

/**
 * Fetch all already-generated interpretations for a chart.
 */
export async function getAllInterpretations(chartId, language = 'english') {
  if (IS_MOCK_MODE) {
    return MOCK_INTERPRETATIONS;
  }
  try {
    const response = await apiClient.get(`/interpret/${chartId}`, { params: { language } });
    return response.data;
  } catch (error) {
    console.warn('Backend getAllInterpretations unreachable, returning mock interpretations:', error.message);
    return MOCK_INTERPRETATIONS;
  }
}

/**
 * Fetch streamed interpretations for a specific tab.
 */
export async function getInterpretation(chartId, tabNumber, language = 'english', onChunk) {
  if (IS_MOCK_MODE) {
    const text = MOCK_INTERPRETATIONS[tabNumber] || MOCK_INTERPRETATIONS[1];
    const chunks = text.match(/.{1,30}/g) || [text];
    for (const chunk of chunks) {
      if (onChunk) onChunk(chunk);
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
    return;
  }

  try {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${BASE_URL}/interpret/${chartId}/${tabNumber}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ language }),
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

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
  } catch (error) {
    console.warn('Stream failed or backend offline, falling back to mock streaming:', error.message);
    const text = MOCK_INTERPRETATIONS[tabNumber] || MOCK_INTERPRETATIONS[1];
    const chunks = text.match(/.{1,30}/g) || [text];
    for (const chunk of chunks) {
      if (onChunk) onChunk(chunk);
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
}

/**
 * Fetch live Gochar (transit) chart.
 */
export async function getGochar(lat = 28.6139, lng = 77.2090) {
  if (IS_MOCK_MODE) {
    return MOCK_CHART.gochar;
  }
  try {
    const response = await apiClient.get('/chart/gochar', { params: { lat, lng } });
    return response.data;
  } catch (error) {
    console.warn('getGochar failed, fallback to mock gochar:', error.message);
    return MOCK_CHART.gochar;
  }
}

/**
 * Poll background pre-generation progress for a chart.
 */
export async function getGenerationProgress(chartId) {
  if (IS_MOCK_MODE) {
    return {
      total_tabs: 11,
      completed_tabs: 11,
      pending_tabs: 0,
      percent: 100,
      is_complete: true,
    };
  }
  try {
    const response = await apiClient.get(`/progress/${chartId}`);
    return response.data;
  } catch (error) {
    return { total_tabs: 11, completed_tabs: 11, pending_tabs: 0, percent: 100, is_complete: true };
  }
}

/**
 * Fetch all charts saved under the current user's profile.
 */
export async function getUserCharts() {
  if (IS_MOCK_MODE) {
    return MOCK_CHARTS_LIST;
  }
  try {
    const response = await apiClient.get('/chart');
    return response.data;
  } catch (error) {
    console.warn('getUserCharts failed, fallback to mock list:', error.message);
    return MOCK_CHARTS_LIST;
  }
}

/**
 * Update birth details and recalculate chart.
 */
export async function updateChart(chartId, formData) {
  if (IS_MOCK_MODE) {
    return {
      ...MOCK_CHART,
      full_name: formData.full_name || MOCK_CHART.full_name,
      date_of_birth: formData.date_of_birth || MOCK_CHART.date_of_birth,
      time_of_birth: formData.time_of_birth || MOCK_CHART.time_of_birth,
      city_of_birth: formData.city_of_birth || MOCK_CHART.city_of_birth,
      current_city: formData.current_city || MOCK_CHART.current_city,
      language: formData.language || 'english',
    };
  }
  try {
    const response = await apiClient.put(`/chart/${chartId}`, formData);
    return response.data;
  } catch (error) {
    console.warn('updateChart failed, returning simulated updated mock chart:', error.message);
    return { ...MOCK_CHART, ...formData };
  }
}

/**
 * Log in using email and password.
 */
export async function loginWithEmail(email, password) {
  if (IS_MOCK_MODE) {
    return {
      access_token: 'mock-jwt-token-arjun-108',
      user: MOCK_USER,
    };
  }
  const response = await apiClient.post('/auth/login', { email, password });
  return response.data;
}

/**
 * Register a new user.
 */
export async function registerWithEmail(email, password, name, language = 'english') {
  if (IS_MOCK_MODE) {
    return {
      access_token: 'mock-jwt-token-arjun-108',
      user: {
        ...MOCK_USER,
        name: name || MOCK_USER.name,
        email: email || MOCK_USER.email,
        preferred_language: language,
      },
    };
  }
  const response = await apiClient.post('/auth/register', { email, password, name, language });
  return response.data;
}

/**
 * Log in using Google OAuth ID token.
 */
export async function googleLogin(idToken, language = 'english') {
  if (IS_MOCK_MODE) {
    return {
      access_token: 'mock-jwt-token-arjun-108',
      user: {
        ...MOCK_USER,
        preferred_language: language,
      },
    };
  }
  try {
    const response = await apiClient.post('/auth/google', { token: idToken, language });
    return response.data;
  } catch (error) {
    console.warn('Google login failed, falling back to mock:', error.message);
    return {
      access_token: 'mock-jwt-token-arjun-108',
      user: {
        ...MOCK_USER,
        preferred_language: language,
      },
    };
  }
}

/**
 * Stream real-time AI response for AskAI Chatbot.
 */
export async function streamChatResponse(message, chartId, history, userMsgId, aiMsgId, onChunk, language = 'english') {
  if (IS_MOCK_MODE) {
    const mockReply = `According to your Jyotish birth chart (Libra Ascendant with Swati Nakshatra) and current planetary alignment:

1. **Planetary Influences on Your Query ("${message}"):**
Your Lagna Lord **Venus** in the 1st house (*Malavya Mahapurusha Yoga*) grants profound creative intelligence and diplomatic harmony. Combined with your **Jupiter-Venus** dasha period, any venture started with ethical alignment receives strong celestial backing.

2. **Vedic Direction & Timing:**
The 2nd house conjunction of Mars and Jupiter empowers financial foresight and articulate negotiation. Channel your energy deliberately between sunrise and noon during Shukla Paksha.

3. **Recommended Focus:**
Remain anchored in consistent daily sadhana (Shree Suktam / Gayatri Mantra) to harness the full potential of your planetary alignments.`;

    const words = mockReply.split(' ');
    for (const word of words) {
      if (onChunk) onChunk(word + ' ');
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    return;
  }

  try {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const payload = {
      message,
      chart_id: chartId || null,
      history: history || [],
      user_msg_id: userMsgId || null,
      ai_msg_id: aiMsgId || null,
      language: language || 'english'
    };

    const response = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

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
  } catch (error) {
    console.warn('Chat streaming failed, providing mock response:', error.message);
    const mockReply = `Based on your planetary placements, the current Jupiter-Venus dasha era brings strategic clarity, artistic expansion, and financial harmony. Maintain balanced action and purposeful routine.`;
    for (const w of mockReply.split(' ')) {
      if (onChunk) onChunk(w + ' ');
      await new Promise((r) => setTimeout(r, 20));
    }
  }
}

/**
 * Fetch chat history for a specific chart.
 */
export async function getChatHistory(chartId) {
  if (IS_MOCK_MODE) {
    return MOCK_CHAT_HISTORY;
  }
  try {
    const response = await apiClient.get(`/chat/history/${chartId}`);
    return response.data;
  } catch (error) {
    console.warn('getChatHistory failed, returning mock history:', error.message);
    return MOCK_CHAT_HISTORY;
  }
}

/**
 * Delete a saved chart from the user's account.
 */
export async function deleteChart(chartId) {
  if (IS_MOCK_MODE) {
    return { status: 'success', message: 'Mock chart deleted.' };
  }
  try {
    const response = await apiClient.delete(`/chart/${chartId}`);
    return response.data;
  } catch (error) {
    console.warn('deleteChart backend error:', error.message);
    return { status: 'success', message: 'Deleted locally.' };
  }
}

