import { useEffect, useRef } from 'react';

/**
 * Custom hook to prevent memory leaks and handle component cleanup
 * @param cleanup - Optional cleanup function to run on unmount
 * @returns isMounted ref to check if component is still mounted
 */
export function useComponentWillUnmount(cleanup?: () => void) {
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      cleanup?.();
    };
  }, []);

  return isMountedRef;
}

/**
 * Hook for handling async operations safely to prevent state updates on unmounted components
 * @param cleanup - Optional cleanup function
 * @returns Object with isMounted ref and safe async utilities
 */
export function useSafeAsync(cleanup?: () => void) {
  const isMountedRef = useComponentWillUnmount(cleanup);

  const safeAsync = async <T>(
    asyncFunction: () => Promise<T>,
    onSuccess?: (result: T) => void,
    onError?: (error: Error) => void
  ): Promise<T | null> => {
    try {
      const result = await asyncFunction();

      // Only update state if component is still mounted
      if (isMountedRef.current) {
        onSuccess?.(result);
      }

      return result;
    } catch (error) {
      if (isMountedRef.current) {
        onError?.(error as Error);
      }
      return null;
    }
  };

  return {
    isMounted: isMountedRef.current,
    safeAsync,
  };
}

/**
 * Hook for managing subscriptions and preventing memory leaks
 * @param subscription - Subscription object with unsubscribe method
 * @returns cleanup function
 */
export function useSubscription(subscription?: { unsubscribe?: () => void }) {
  useEffect(() => {
    return () => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  }, [subscription]);
}

/**
 * Hook for managing timers and preventing memory leaks
 * @param callback - Timer callback
 * @param delay - Delay in milliseconds
 * @param dependencies - Dependencies array
 * @returns cleanup function
 */
export function useSafeTimer(
  callback: () => void,
  delay: number | null,
  dependencies: React.DependencyList = []
) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const isMountedRef = useComponentWillUnmount();

  useEffect(() => {
    if (delay !== null && isMountedRef.current) {
      timeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          callback();
        }
      }, delay);

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }
  }, [delay, ...dependencies]);

  return {
    cancel: () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    }
  };
}

/**
 * Hook for managing intervals and preventing memory leaks
 * @param callback - Interval callback
 * @param delay - Delay in milliseconds
 * @param dependencies - Dependencies array
 * @returns cleanup function
 */
export function useSafeInterval(
  callback: () => void,
  delay: number | null,
  dependencies: React.DependencyList = []
) {
  const intervalRef = useRef<NodeJS.Timeout>();
  const isMountedRef = useComponentWillUnmount();

  useEffect(() => {
    if (delay !== null && isMountedRef.current) {
      intervalRef.current = setInterval(() => {
        if (isMountedRef.current) {
          callback();
        }
      }, delay);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [delay, ...dependencies]);

  return {
    cancel: () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  };
}










