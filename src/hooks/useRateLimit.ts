import { useState, useEffect, useRef, useCallback } from "react";

interface UseRateLimitOptions {
  maxAttempts?: number;
  maxBlockSeconds?: number;
}

interface UseRateLimitReturn {
  /** Current failed attempt count */
  attempts: number;
  /** Remaining block countdown in seconds (0 = not blocked) */
  blockTimer: number;
  /** Whether login is currently blocked */
  isBlocked: boolean;
  /**
   * Increments failed attempts and starts block timer if threshold exceeded.
   * Returns the block duration in seconds (0 = no block).
   */
  recordAttempt: () => number;
  /** Resets attempt counter (e.g. on successful login) */
  resetAttempts: () => void;
}

/**
 * Exponential backoff rate limiter for login attempts.
 *
 * Block duration grows exponentially: 2s, 4s, 8s, 16s, 32s, max 60s
 * after the configured `maxAttempts` threshold is exceeded.
 */
export function useRateLimit(
  options: UseRateLimitOptions = {},
): UseRateLimitReturn {
  const { maxAttempts = 3, maxBlockSeconds = 60 } = options;

  const [attempts, setAttempts] = useState(0);
  const [blockTimer, setBlockTimer] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attemptsRef = useRef(0);

  const getBlockDuration = useCallback(
    (count: number): number => {
      if (count <= maxAttempts) return 0;
      return Math.min(
        Math.pow(2, count - maxAttempts),
        maxBlockSeconds,
      );
    },
    [maxAttempts, maxBlockSeconds],
  );

  const clearBlockTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startBlockTimer = useCallback(
    (seconds: number) => {
      clearBlockTimer();
      setBlockTimer(seconds);
      intervalRef.current = setInterval(() => {
        setBlockTimer((prev) => {
          if (prev <= 1) {
            clearBlockTimer();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    [clearBlockTimer],
  );

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const recordAttempt = useCallback((): number => {
    attemptsRef.current += 1;
    setAttempts(attemptsRef.current);
    const blockSec = getBlockDuration(attemptsRef.current);
    if (blockSec > 0) {
      startBlockTimer(blockSec);
    }
    return blockSec;
  }, [getBlockDuration, startBlockTimer]);

  const resetAttempts = useCallback(() => {
    attemptsRef.current = 0;
    setAttempts(0);
  }, []);

  return {
    attempts,
    blockTimer,
    isBlocked: blockTimer > 0,
    recordAttempt,
    resetAttempts,
  };
}
