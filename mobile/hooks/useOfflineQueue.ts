import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";
import { requestJson } from "../api";

const STORAGE_KEY = "offline_queue";
const PROCESS_INTERVAL = 30_000;

interface QueuedAction {
  id: string;
  path: string;
  method: string;
  body?: string;
  description: string;
  invalidateKeys: string[][];
  timestamp: number;
}

let actionCounter = 0;

export function useOfflineQueue(token: string | null) {
  const queryClient = useQueryClient();
  const [queue, setQueue] = useState<QueuedAction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const queueRef = useRef<QueuedAction[]>([]);
  const tokenRef = useRef(token);

  // Keep refs in sync
  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { tokenRef.current = token; }, [token]);

  // Load queue from storage on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored) {
        try {
          const parsed: QueuedAction[] = JSON.parse(stored);
          setQueue(parsed);
          queueRef.current = parsed;
        } catch {
          AsyncStorage.removeItem(STORAGE_KEY);
        }
      }
    });
  }, []);

  const persist = useCallback(async (updated: QueuedAction[]) => {
    setQueue(updated);
    queueRef.current = updated;
    if (updated.length === 0) {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } else {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  }, []);

  const enqueue = useCallback(
    (action: Omit<QueuedAction, "id" | "timestamp">) => {
      const item: QueuedAction = {
        ...action,
        id: `q_${Date.now()}_${++actionCounter}`,
        timestamp: Date.now(),
      };
      const updated = [...queueRef.current, item];
      persist(updated);
    },
    [persist],
  );

  const processQueue = useCallback(async () => {
    const currentToken = tokenRef.current;
    const currentQueue = queueRef.current;
    if (!currentToken || currentQueue.length === 0 || isProcessing) return;

    setIsProcessing(true);
    const remaining: QueuedAction[] = [];
    let hasNetworkFailure = false;

    for (const item of currentQueue) {
      if (hasNetworkFailure) {
        remaining.push(item);
        continue;
      }

      try {
        await requestJson(currentToken, item.path, {
          method: item.method as RequestInit["method"],
          body: item.body,
        });
        for (const key of item.invalidateKeys) {
          queryClient.invalidateQueries({ queryKey: key });
        }
      } catch (error) {
        const isNetworkError =
          error instanceof TypeError || (error instanceof Error && /network|fetch/i.test(error.message));
        if (isNetworkError) {
          hasNetworkFailure = true;
          remaining.push(item);
        }
        // API errors (4xx/5xx) — discard, can't replay
      }
    }

    await persist(remaining);
    setIsProcessing(false);
  }, [isProcessing, queryClient, persist]);

  // Periodic processing
  useEffect(() => {
    const intervalId = setInterval(() => {
      processQueue();
    }, PROCESS_INTERVAL);
    return () => clearInterval(intervalId);
  }, [processQueue]);

  // Process when app comes to foreground
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") processQueue();
    });
    return () => sub.remove();
  }, [processQueue]);

  const clearQueue = useCallback(async () => {
    await persist([]);
  }, [persist]);

  return { queueLength: queue.length, isProcessing, enqueue, processQueue, clearQueue };
}
