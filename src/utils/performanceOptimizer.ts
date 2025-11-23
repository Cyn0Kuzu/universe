/**
 * Performance Optimization Utilities
 * Reduces React Native warnings and improves app performance
 */

import React from 'react';
import { InteractionManager, Platform } from 'react-native';

export class PerformanceOptimizer {
  /**
   * Optimize FlatList performance with enhanced settings
   */
  static getFlatListOptimizationProps() {
    return {
      removeClippedSubviews: true,
      maxToRenderPerBatch: Platform.OS === 'ios' ? 8 : 4, // Reduced for better performance
      updateCellsBatchingPeriod: Platform.OS === 'ios' ? 30 : 50, // Faster updates
      initialNumToRender: Platform.OS === 'ios' ? 8 : 4, // Reduced initial render
      windowSize: Platform.OS === 'ios' ? 8 : 4, // Smaller window size
      getItemLayout: undefined, // Let FlatList calculate
      keyExtractor: (item: any, index: number) => item.id || index.toString(),
      // Additional optimizations
      disableVirtualization: false,
      legacyImplementation: false,
      maintainVisibleContentPosition: undefined,
      // Performance improvements
      onEndReachedThreshold: 0.5,
      scrollEventThrottle: 16, // 60fps
      decelerationRate: 'normal',
    };
  }

  /**
   * Optimize ScrollView performance with enhanced settings
   */
  static getScrollViewOptimizationProps() {
    return {
      removeClippedSubviews: true,
      scrollEventThrottle: 16,
      decelerationRate: Platform.OS === 'ios' ? 0.998 : 0.985,
      showsVerticalScrollIndicator: false,
      showsHorizontalScrollIndicator: false,
      // Additional optimizations
      keyboardShouldPersistTaps: 'handled',
      nestedScrollEnabled: true,
    };
  }

  /**
   * Run heavy operations after interactions complete
   */
  static runAfterInteractions(callback: () => void) {
    InteractionManager.runAfterInteractions(() => {
      callback();
    });
  }

  /**
   * Prevent main thread blocking by deferring heavy operations
   */
  static deferHeavyOperation<T>(operation: () => T): Promise<T> {
    return new Promise((resolve) => {
      InteractionManager.runAfterInteractions(() => {
        // Use requestIdleCallback if available, otherwise setTimeout
        if (typeof requestIdleCallback !== 'undefined') {
          requestIdleCallback(() => {
            resolve(operation());
          });
        } else {
          setTimeout(() => {
            resolve(operation());
          }, 0);
        }
      });
    });
  }

  /**
   * Batch multiple operations to prevent main thread blocking
   */
  static batchOperations<T>(operations: (() => T)[]): Promise<T[]> {
    return new Promise((resolve) => {
      InteractionManager.runAfterInteractions(() => {
        const results: T[] = [];
        let index = 0;

        const processNext = () => {
          if (index < operations.length) {
            results.push(operations[index]());
            index++;
            // Use setTimeout to yield control back to main thread
            setTimeout(processNext, 0);
          } else {
            resolve(results);
          }
        };

        processNext();
      });
    });
  }

  /**
   * Debounce function calls
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  /**
   * Throttle function calls
   */
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  /**
   * Optimize image loading with caching
   */
  static getImageOptimizationProps() {
    return {
      resizeMode: 'cover' as const,
      loadingIndicatorSource: undefined,
      progressiveRenderingEnabled: true,
      cachePolicy: 'memory-disk' as const,
    };
  }

  /**
   * Execute async operations with performance monitoring
   */
  static async executeAsync<T>(
    operation: () => Promise<T>,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      
      if (duration > 1000) {
        console.warn(`⚠️ Slow operation detected: ${duration}ms`);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Operation failed after ${duration}ms:`, error);
      throw error;
    }
  }

  /**
   * Memory usage monitoring
   */
  static getMemoryInfo() {
    if (Platform.OS === 'android' && (global as any).performance?.memory) {
      const memory = (global as any).performance.memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
      };
    }
    return null;
  }

  /**
   * Batched state updates hook
   */
  static useBatchedState<T>(initialState: T) {
    const [state, setState] = React.useState(initialState);
    const batchRef = React.useRef<(() => void)[]>([]);
    
    const batchedSetState = React.useCallback((updater: (prev: T) => T) => {
      batchRef.current.push(() => setState(updater));
      
      if (batchRef.current.length === 1) {
        setTimeout(() => {
          batchRef.current.forEach(fn => fn());
          batchRef.current = [];
        }, 0);
      }
    }, []);
    
    return [state, batchedSetState] as const;
  }

  /**
   * Debounce hook
   */
  static useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = React.useState<T>(value);
    
    React.useEffect(() => {
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);
      
      return () => {
        clearTimeout(handler);
      };
    }, [value, delay]);
    
    return debouncedValue;
  }

  /**
   * Mounted state hook
   */
  static useMountedState(): React.MutableRefObject<boolean> {
    const mountedRef = React.useRef<boolean>(true);
    
    React.useEffect(() => {
      return () => {
        mountedRef.current = false;
      };
    }, []);
    
    return mountedRef;
  }

  /**
   * Throttle hook
   */
  static useThrottle<T extends (...args: any[]) => any>(
    callback: T,
    delay: number
  ): T {
    const lastRun = React.useRef(Date.now());
    
    return React.useCallback(
      ((...args) => {
        if (Date.now() - lastRun.current >= delay) {
          callback(...args);
          lastRun.current = Date.now();
        }
      }) as T,
      [callback, delay]
    );
  }

  /**
   * Firestore cache utility
   */
  static firestoreCache = {
    cache: new Map<string, { data: any; timestamp: number }>(),
    ttl: 5 * 60 * 1000, // 5 minutes
    
    get(key: string) {
      const item = this.cache.get(key);
      if (item && Date.now() - item.timestamp < this.ttl) {
        return item.data;
      }
      this.cache.delete(key);
      return null;
    },
    
    set(key: string, data: any) {
      this.cache.set(key, { data, timestamp: Date.now() });
    },
    
    clear() {
      this.cache.clear();
    }
  };
}

// Export individual utilities for easier imports
export const useBatchedState = PerformanceOptimizer.useBatchedState;
export const useDebounce = PerformanceOptimizer.useDebounce;
export const useMountedState = PerformanceOptimizer.useMountedState;
export const useThrottle = PerformanceOptimizer.useThrottle;
export const firestoreCache = PerformanceOptimizer.firestoreCache;
export const performanceOptimizer = PerformanceOptimizer;

export default PerformanceOptimizer;