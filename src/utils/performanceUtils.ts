/**
 * Performance Utilities
 * Performance optimization and monitoring functions
 */

/**
 * Debounce function - delays execution until after delay has passed
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

/**
 * Throttle function - ensures function is called at most once per delay period
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let lastCall = 0;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
};

/**
 * Measure function execution time
 */
export const measurePerformance = async <T>(
  name: string,
  func: () => Promise<T> | T
): Promise<T> => {
  const startTime = performance.now();
  
  try {
    const result = await func();
    const endTime = performance.now();
    const executionTime = endTime - startTime;
    
    console.log(`⏱️ ${name} took ${executionTime.toFixed(2)}ms`);
    
    return result;
  } catch (error) {
    const endTime = performance.now();
    const executionTime = endTime - startTime;
    
    console.error(`❌ ${name} failed after ${executionTime.toFixed(2)}ms:`, error);
    throw error;
  }
};

/**
 * Create a memoized version of a function
 */
export const memoize = <Args extends any[], Return>(
  fn: (...args: Args) => Return,
  getKey?: (...args: Args) => string
): ((...args: Args) => Return) => {
  const cache = new Map<string, Return>();
  
  return (...args: Args): Return => {
    const key = getKey ? getKey(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = fn(...args);
    cache.set(key, result);
    
    return result;
  };
};

/**
 * Batch function calls to reduce frequency
 */
export const batchCalls = <T>(
  func: (items: T[]) => void,
  delay: number = 100
): ((item: T) => void) => {
  let batch: T[] = [];
  let timeoutId: NodeJS.Timeout;
  
  return (item: T) => {
    batch.push(item);
    
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      if (batch.length > 0) {
        func([...batch]);
        batch = [];
      }
    }, delay);
  };
};

/**
 * Retry function with exponential backoff
 */
export const retry = async <T>(
  func: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await func();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts) {
        throw lastError;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`, error);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
};

/**
 * Check if code is running in development mode
 */
export const isDevelopment = (): boolean => {
  return __DEV__ === true;
};

/**
 * Simple performance monitor
 */
export class PerformanceMonitor {
  private static markers = new Map<string, number>();
  
  static mark(name: string): void {
    this.markers.set(name, performance.now());
  }
  
  static measure(name: string, startMark?: string): number {
    const endTime = performance.now();
    const startTime = startMark ? this.markers.get(startMark) : this.markers.get(name);
    
    if (!startTime) {
      console.warn(`Performance mark "${startMark || name}" not found`);
      return 0;
    }
    
    const duration = endTime - startTime;
    console.log(`📊 ${name}: ${duration.toFixed(2)}ms`);
    
    return duration;
  }
  
  static clear(name?: string): void {
    if (name) {
      this.markers.delete(name);
    } else {
      this.markers.clear();
    }
  }
}
