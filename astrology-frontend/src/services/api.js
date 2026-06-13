import axios from 'axios';

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

/**
 * Geocode a city to retrieve its coordinates.
 * POST /geocode
 * @param {string} city 
 */
export async function geocodeCity(city) {
  try {
    const response = await apiClient.post('/geocode', { city });
    return response.data;
  } catch (error) {
    console.error('Error geocoding city:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Generate a complete astrology chart from user birth inputs.
 * POST /chart/generate
 * @param {Object} formData 
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
    });
    return response.data;
  } catch (error) {
    console.error('Error generating chart:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Retrieve an existing chart by ID.
 * GET /chart/{chartId}
 * @param {string} chartId 
 */
export async function getChart(chartId) {
  try {
    const response = await apiClient.get(`/chart/${chartId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching chart:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Fetch streamed interpretations for a specific tab.
 * POST /interpret/{chartId}/{tabNumber}
 * Supports standard browser streaming.
 * @param {string} chartId 
 * @param {number} tabNumber 
 * @param {string} language - Target language (english, hindi, bengali)
 * @param {Function} onChunk - Callback function called with each received text chunk
 */
export async function getInterpretation(chartId, tabNumber, language = 'english', onChunk) {
  try {
    // Standard fetch is more reliable for real-time text chunk streaming in browsers
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE_URL}/interpret/${chartId}/${tabNumber}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ language }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

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
        if (onChunk) {
          onChunk(chunk);
        }
      }
    }
  } catch (error) {
    console.error('Error streaming interpretation:', error.message);
    throw error;
  }
}

/**
 * Fetch live Gochar (transit) chart — real-time planetary positions.
 * GET /chart/gochar
 */
export async function getGochar(lat = 28.6139, lng = 77.2090) {
  try {
    const response = await apiClient.get('/chart/gochar', { params: { lat, lng } });
    return response.data;
  } catch (error) {
    console.error('Error fetching Gochar chart:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Poll background pre-generation progress for a chart.
 * GET /progress/{chartId}
 * Returns: { total_tabs, completed_tabs, pending_tabs, percent, is_complete }
 * @param {string} chartId 
 */
export async function getGenerationProgress(chartId) {
  try {
    const response = await apiClient.get(`/progress/${chartId}`);
    return response.data;
  } catch (error) {
    // Non-fatal — polling errors should not break the UI
    console.warn('Progress poll failed:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Fetch all charts saved under the current user's profile.
 * GET /chart
 */
export async function getUserCharts() {
  try {
    const response = await apiClient.get('/chart');
    return response.data;
  } catch (error) {
    console.error('Error fetching user charts:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Update birth details and recalculate chart.
 * PUT /chart/{chartId}
 * @param {string} chartId 
 * @param {Object} formData 
 */
export async function updateChart(chartId, formData) {
  try {
    const response = await apiClient.put(`/chart/${chartId}`, {
      full_name: formData.full_name,
      date_of_birth: formData.date_of_birth,
      time_of_birth: formData.time_of_birth,
      city_of_birth: formData.city_of_birth,
      current_city: formData.current_city,
      birth_time_confidence: formData.birth_time_confidence,
    });
    return response.data;
  } catch (error) {
    console.error('Error updating chart:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Log in using email and password.
 * POST /auth/login
 * @param {string} email
 * @param {string} password
 */
export async function loginWithEmail(email, password) {
  const response = await apiClient.post('/auth/login', { email, password });
  return response.data;
}

/**
 * Register a new user using email and password.
 * POST /auth/register
 * @param {string} email
 * @param {string} password
 * @param {string} name
 */
export async function registerWithEmail(email, password, name) {
  const response = await apiClient.post('/auth/register', { email, password, name });
  return response.data;
}

