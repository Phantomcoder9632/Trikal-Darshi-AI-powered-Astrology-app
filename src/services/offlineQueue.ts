/**
 * Offline Sync Queue — Trikal Darshi Mobile
 *
 * Automatically queues network mutations performed while the device is offline
 * and flushes them in sequence when internet connectivity is restored.
 */
import NetInfo from '@react-native-community/netinfo';
import { jsonCache, STORAGE_KEYS } from './storage';

export interface QueuedAction {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  timestamp: number;
}

type SyncHandler = (action: QueuedAction) => Promise<boolean>;

class OfflineQueueManager {
  private handlers = new Map<string, SyncHandler>();
  private isProcessing = false;

  constructor() {
    // Listen for connection restoration to automatically flush queue
    NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable !== false) {
        this.flushQueue();
      }
    });
  }

  /** Register an execution handler for a specific action type */
  registerHandler(actionType: string, handler: SyncHandler): void {
    this.handlers.set(actionType, handler);
  }

  /** Queue an action for later execution when offline */
  async enqueue(type: string, payload: Record<string, unknown>): Promise<void> {
    const queue = (await jsonCache.get<QueuedAction[]>(STORAGE_KEYS.offlineQueue)) || [];
    const newAction: QueuedAction = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type,
      payload,
      timestamp: Date.now(),
    };
    queue.push(newAction);
    await jsonCache.set(STORAGE_KEYS.offlineQueue, queue);
  }

  /** Get all pending queued actions */
  async getQueue(): Promise<QueuedAction[]> {
    return (await jsonCache.get<QueuedAction[]>(STORAGE_KEYS.offlineQueue)) || [];
  }

  /** Flush and process all queued offline actions */
  async flushQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const queue = await this.getQueue();
      if (queue.length === 0) {
        this.isProcessing = false;
        return;
      }

      const remaining: QueuedAction[] = [];
      for (const action of queue) {
        const handler = this.handlers.get(action.type);
        if (handler) {
          try {
            const success = await handler(action);
            if (!success) {
              remaining.push(action); // Retain failed actions for next flush
            }
          } catch {
            remaining.push(action);
          }
        } else {
          // If no handler registered yet, preserve action
          remaining.push(action);
        }
      }

      await jsonCache.set(STORAGE_KEYS.offlineQueue, remaining);
    } finally {
      this.isProcessing = false;
    }
  }

  /** Clear all pending actions */
  async clearQueue(): Promise<void> {
    await jsonCache.remove(STORAGE_KEYS.offlineQueue);
  }
}

export const offlineQueue = new OfflineQueueManager();
