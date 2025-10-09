/**
 * Performance Optimization Utilities
 * Reduces React Native warnings and improves app performance
 */

import { InteractionManager, Platform } from 'react-native';

export class PerformanceOptimizer {
  /**
   * Optimize FlatList performance with enhanced settings
   */
  static getFlatListOptimizationProps() {
    return {
      removeClippedSubviews: true,
      maxToRenderPerBatch: Platform.OS === 'ios' ? 10 : 5,
      updateCellsBatchingPeriod: Platform.OS === 'ios' ? 50 : 100,
      initialNumToRender: Platform.OS === 'ios' ? 10 : 5,
      windowSize: Platform.OS === 'ios' ? 10 : 5,
      getItemLayout: undefined, // Let FlatList calculate
      keyExtractor: (item: any, index: number) => item.id || index.toString(),
      // Additional optimizations
      disableVirtualization: false,
      legacyImplementation: false,
      maintainVisibleContentPosition: undefined,
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
   * Optimize image loading
   */
  static getImageOptimizationProps() {
    return {
      resizeMode: 'cover' as const,
      loadingIndicatorSource: undefined,
      progressiveRenderingEnabled: true,
    };
  }

  /**
   * Memory management utilities
   */
  static clearMemoryCache() {
    if (global.gc) {
      global.gc();
    }
  }

  /**
   * Batch state updates for better performance
   */
  static batchUpdates(updates: (() => void)[]) {
    // React Native doesn't have react-dom, so just run updates normally
    updates.forEach(update => update());
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
    if (Platform.OS === 'android' && global.performance?.memory) {
      return {
        used: global.performance.memory.usedJSHeapSize,
        total: global.performance.memory.totalJSHeapSize,
        limit: global.performance.memory.jsHeapSizeLimit,
      };
    }
    return null;
  }
}

export default PerformanceOptimizer;