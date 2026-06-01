import axios from 'axios';

export const BASE_URL = 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
 * @param {Function} onChunk - Callback function called with each received text chunk
 */
export async function getInterpretation(chartId, tabNumber, onChunk) {
  try {
    // Standard fetch is more reliable for real-time text chunk streaming in browsers
    const response = await fetch(`${BASE_URL}/interpret/${chartId}/${tabNumber}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
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
