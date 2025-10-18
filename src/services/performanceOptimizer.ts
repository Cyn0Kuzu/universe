/**
 * Performance optimizer for Firebase operations
 * Provides optimized methods for better app performance
 */
export const performanceOptimizer = {
  /**
   * Debounce function to limit function calls
   */
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): ((...args: Parameters<T>) => void) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  },

  /**
   * Throttle function to limit function calls
   */
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },

  /**
   * Batch operations for better performance
   */
  batch: <T>(operations: (() => Promise<T>)[]): Promise<T[]> => {
    return Promise.all(operations.map(op => op()));
  },

  /**
   * Cache with TTL (Time To Live)
   */
  createCache: <T>(ttl: number = 300000) => {
    const cache = new Map<string, { data: T; timestamp: number }>();
    
    return {
      get: (key: string): T | null => {
        const item = cache.get(key);
        if (!item) return null;
        
        if (Date.now() - item.timestamp > ttl) {
          cache.delete(key);
          return null;
        }
        
        return item.data;
      },
      
      set: (key: string, data: T): void => {
        cache.set(key, { data, timestamp: Date.now() });
      },
      
      clear: (): void => {
        cache.clear();
      }
    };
  }
};

