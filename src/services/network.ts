/**
 * Network Monitor — Trikal Darshi Mobile
 *
 * Provides:
 *  • Real-time online/offline state via NetInfo
 *  • A React hook (useNetworkStatus) for consuming network state in components
 *  • A utility to check if a retryable network error should be retried
 */
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string;
}

/**
 * Subscribe to real-time network changes. Returns an unsubscribe function.
 */
export function subscribeToNetwork(
  callback: (status: NetworkStatus) => void
): () => void {
  return NetInfo.addEventListener((state: NetInfoState) => {
    callback({
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable ?? null,
      type: state.type,
    });
  });
}

/**
 * React hook that returns the current network status and updates
 * automatically whenever connectivity changes.
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: true,
    type: 'unknown',
  });

  useEffect(() => {
    // Fetch current state immediately on mount
    NetInfo.fetch().then((state) => {
      setStatus({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? null,
        type: state.type,
      });
    });

    const unsubscribe = subscribeToNetwork(setStatus);
    return unsubscribe;
  }, []);

  return status;
}

/**
 * Check if the current error is a retryable network error.
 */
export function isRetryableError(err: unknown): boolean {
  const e = err as any;
  const status: number | undefined = e?.response?.status;
  if (status === 429 || status === 503 || (status !== undefined && status >= 500)) {
    return true;
  }
  const msg = e?.message ?? '';
  return /network error|fetch failed|ECONNREFUSED|ENOTFOUND|timeout|ECONNABORTED/i.test(msg);
}
