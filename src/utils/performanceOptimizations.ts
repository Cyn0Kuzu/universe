/**
 * Performance Optimization Utilities
 * 
 * Collection of utilities to improve app performance and prevent main thread blocking
 */

import { InteractionManager } from 'react-native';

/**
 * Run callback after all interactions (animations, gestures) complete
 * Use this for non-critical operations to prevent blocking the UI
 * 
 * @example
 * runAfterInteractions(() => {
 *   // Heavy computation or data loading
 *   loadHeavyData();
 * });
 */
export const runAfterInteractions = (callback: () => void): void => {
  InteractionManager.runAfterInteractions(() => {
    // Use requestAnimationFrame for additional safety
    requestAnimationFrame(callback);
  });
};

/**
 * Run callback after a delay, ensuring interactions complete first
 * Useful for operations that should happen shortly after navigation or UI updates
 * 
 * @param callback - Function to execute
 * @param delay - Delay in milliseconds (default: 100ms)
 */
export const runAfterDelay = (callback: () => void, delay: number = 100): void => {
  InteractionManager.runAfterInteractions(() => {
    setTimeout(() => {
      requestAnimationFrame(callback);
    }, delay);
  });
};

/**
 * Debounce function - delays execution until after wait time has elapsed
 * since the last time it was invoked
 * 
 * Perfect for: search input, resize handlers, form validation
 * 
 * @example
 * const debouncedSearch = debounce((query) => {
 *   searchAPI(query);
 * }, 300);
 * 
 * // Called rapidly, but only executes once after 300ms of inactivity
 * debouncedSearch('test');
 * debouncedSearch('test query');
 * debouncedSearch('test query final');
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      timeout = null;
      func(...args);
    }, wait);
  };
};

/**
 * Throttle function - ensures function is called at most once per time period
 * 
 * Perfect for: scroll handlers, touch events, frequent API calls
 * 
 * @example
 * const throttledScroll = throttle((event) => {
 *   handleScroll(event);
 * }, 100);
 * 
 * // Called rapidly, but only executes once every 100ms
 * <ScrollView onScroll={throttledScroll} />
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean = false;
  let lastArgs: Parameters<T> | null = null;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      
      setTimeout(() => {
        inThrottle = false;
        // Execute with last args if function was called during throttle
        if (lastArgs) {
          func(...lastArgs);
          lastArgs = null;
        }
      }, limit);
    } else {
      // Store last args to execute after throttle period
      lastArgs = args;
    }
  };
};

/**
 * Batch multiple state updates to reduce renders
 * 
 * @example
 * const [batchUpdate, flush] = createBatchUpdater();
 * 
 * batchUpdate(() => setName('John'));
 * batchUpdate(() => setAge(30));
 * batchUpdate(() => setEmail('john@example.com'));
 * 
 * flush(); // Executes all updates in one render cycle
 */
export const createBatchUpdater = (): [
  (update: () => void) => void,
  () => void
] => {
  const updates: Array<() => void> = [];
  
  const batchUpdate = (update: () => void) => {
    updates.push(update);
  };
  
  const flush = () => {
    requestAnimationFrame(() => {
      updates.forEach(update => update());
      updates.length = 0;
    });
  };
  
  return [batchUpdate, flush];
};

/**
 * Memoize expensive function calls
 * Caches results based on arguments
 * 
 * @example
 * const expensiveCalculation = memoize((a, b) => {
 *   // Heavy computation
 *   return a * b * Math.random();
 * });
 * 
 * expensiveCalculation(5, 10); // Computed
 * expensiveCalculation(5, 10); // Cached result
 */
export const memoize = <T extends (...args: any[]) => any>(
  func: T,
  maxCacheSize: number = 50
): T => {
  const cache = new Map<string, ReturnType<T>>();
  
  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = func(...args);
    
    // Limit cache size to prevent memory leaks
    if (cache.size >= maxCacheSize) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    cache.set(key, result);
    return result;
  }) as T;
};

/**
 * Split large array operations into chunks to prevent blocking
 * 
 * @example
 * const largeArray = new Array(10000).fill(0).map((_, i) => i);
 * 
 * await processInChunks(largeArray, (item) => {
 *   // Process each item
 *   heavyOperation(item);
 * }, 100); // Process 100 items per chunk
 */
export const processInChunks = async <T>(
  items: T[],
  processor: (item: T) => void | Promise<void>,
  chunkSize: number = 100,
  delayBetweenChunks: number = 0
): Promise<void> => {
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    
    await Promise.all(chunk.map(processor));
    
    if (delayBetweenChunks > 0 && i + chunkSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenChunks));
    }
  }
};

/**
 * Idle callback - executes when main thread is idle
 * Falls back to setTimeout if requestIdleCallback is not available
 */
export const runWhenIdle = (callback: () => void, timeout: number = 1000): void => {
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(callback, { timeout });
  } else {
    setTimeout(callback, timeout);
  }
};

/**
 * Create a loading state manager that prevents rapid state changes
 * Useful for preventing loading spinner flicker
 * 
 * @example
 * const [isLoading, setIsLoading] = useState(false);
 * const loadingManager = createLoadingManager(setIsLoading, 300);
 * 
 * loadingManager.start(); // Shows loading after 300ms if not stopped
 * await fetchData();
 * loadingManager.stop(); // Hides loading
 */
export const createLoadingManager = (
  setLoading: (loading: boolean) => void,
  minLoadingTime: number = 300
) => {
  let startTime: number | null = null;
  let timeoutId: NodeJS.Timeout | null = null;
  
  return {
    start: () => {
      startTime = Date.now();
      
      // Don't show loading immediately (prevents flicker for fast operations)
      timeoutId = setTimeout(() => {
        setLoading(true);
        timeoutId = null;
      }, 100);
    },
    
    stop: async () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
        return;
      }
      
      if (startTime) {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, minLoadingTime - elapsed);
        
        if (remaining > 0) {
          await new Promise(resolve => setTimeout(resolve, remaining));
        }
      }
      
      setLoading(false);
      startTime = null;
    },
  };
};

/**
 * Performance monitoring - measure execution time
 * 
 * @example
 * const measure = performanceMeasure('Heavy Operation');
 * heavyFunction();
 * measure.end(); // Logs: "Heavy Operation took 152ms"
 */
export const performanceMeasure = (label: string) => {
  const start = Date.now();
  
  return {
    end: () => {
      const duration = Date.now() - start;
      console.log(`⏱️ ${label} took ${duration}ms`);
      return duration;
    },
    
    endIf: (threshold: number) => {
      const duration = Date.now() - start;
      if (duration > threshold) {
        console.warn(`⚠️ ${label} took ${duration}ms (threshold: ${threshold}ms)`);
      }
      return duration;
    },
  };
};

/**
 * Queue manager for sequential operations
 * Ensures operations execute one at a time
 * 
 * @example
 * const queue = createQueue();
 * 
 * queue.add(async () => await saveData1());
 * queue.add(async () => await saveData2());
 * queue.add(async () => await saveData3());
 * // Executes sequentially, one at a time
 */
export const createQueue = () => {
  const queue: Array<() => Promise<any>> = [];
  let isProcessing = false;
  
  const process = async () => {
    if (isProcessing || queue.length === 0) {
      return;
    }
    
    isProcessing = true;
    
    while (queue.length > 0) {
      const task = queue.shift();
      if (task) {
        try {
          await task();
        } catch (error) {
          console.error('Queue task error:', error);
        }
      }
    }
    
    isProcessing = false;
  };
  
  return {
    add: (task: () => Promise<any>) => {
      queue.push(task);
      process();
    },
    
    size: () => queue.length,
    
    clear: () => {
      queue.length = 0;
    },
  };
};

/**
 * Limit concurrent operations
 * Useful for API calls or resource-intensive tasks
 * 
 * @example
 * const limiter = createConcurrencyLimiter(3); // Max 3 concurrent operations
 * 
 * const results = await Promise.all(
 *   urls.map(url => limiter.run(() => fetch(url)))
 * );
 */
export const createConcurrencyLimiter = (maxConcurrent: number) => {
  let running = 0;
  const queue: Array<{
    fn: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];
  
  const processNext = () => {
    if (running >= maxConcurrent || queue.length === 0) {
      return;
    }
    
    const { fn, resolve, reject } = queue.shift()!;
    running++;
    
    fn()
      .then(resolve)
      .catch(reject)
      .finally(() => {
        running--;
        processNext();
      });
  };
  
  return {
    run: <T>(fn: () => Promise<T>): Promise<T> => {
      return new Promise((resolve, reject) => {
        queue.push({ fn, resolve, reject });
        processNext();
      });
    },
    
    getStats: () => ({
      running,
      queued: queue.length,
    }),
  };
};







