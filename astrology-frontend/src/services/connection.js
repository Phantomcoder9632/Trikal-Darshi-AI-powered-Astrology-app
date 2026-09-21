/**
 * Connection status broadcast.
 *
 * api.js calls `notifyConnectionLost(error)` whenever a backend request fails,
 * and `notifyConnectionRestored()` when a later request succeeds. Any component
 * (see components/StatusBanners.jsx) can subscribe to render an honest
 * "Unable to connect" banner with a Retry button instead of silently
 * substituting fake data.
 */

let hasLostConnection = false;
const listeners = new Set();

export function notifyConnectionLost(error) {
  hasLostConnection = true;
  listeners.forEach((fn) => {
    try {
      fn({ connected: false, error });
    } catch (e) {
      // listener errors must never break the caller
    }
  });
}

export function notifyConnectionRestored() {
  if (!hasLostConnection) return;
  hasLostConnection = false;
  listeners.forEach((fn) => {
    try {
      fn({ connected: true });
    } catch (e) {
      // listener errors must never break the caller
    }
  });
}

export function isConnectionLost() {
  return hasLostConnection;
}

export function subscribeConnection(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Human-friendly message for a failed request. Used so pages can show one
 * consistent, real error instead of inventing fake success data.
 */
export function describeConnectionError(error) {
  if (!error) return 'Unable to reach the astrological calculation server.';
  if (error.response) {
    const detail = error.response.data?.detail;
    if (detail) {
      return typeof detail === 'string' ? detail : 'The astrological server rejected this request.';
    }
    return `The astrological server returned an error (HTTP ${error.response.status}).`;
  }
  if (error.request) {
    return 'Unable to connect to the astrological calculation server. Check your internet connection and try again.';
  }
  return error.message || 'An unexpected error occurred.';
}
