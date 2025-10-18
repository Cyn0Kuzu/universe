/**
 * Memory Management Utilities
 * Comprehensive memory management and cleanup utilities
 */

import { useEffect, useRef, useCallback } from 'react';

export class MemoryManager {
  private static listeners = new Map<string, (() => void)[]>();
  private static timers = new Map<string, NodeJS.Timeout>();
  private static intervals = new Map<string, NodeJS.Timeout>();

  /**
   * Register cleanup function for component
   */
  static registerCleanup(componentId: string, cleanup: () => void) {
    if (!this.listeners.has(componentId)) {
      this.listeners.set(componentId, []);
    }
    this.listeners.get(componentId)!.push(cleanup);
  }

  /**
   * Register timer for cleanup
   */
  static registerTimer(componentId: string, timerId: NodeJS.Timeout) {
    this.timers.set(`${componentId}_${Date.now()}`, timerId);
  }

  /**
   * Register interval for cleanup
   */
  static registerInterval(componentId: string, intervalId: NodeJS.Timeout) {
    this.intervals.set(`${componentId}_${Date.now()}`, intervalId);
  }

  /**
   * Cleanup all resources for component
   */
  static cleanup(componentId: string) {
    // Cleanup listeners
    const componentListeners = this.listeners.get(componentId);
    if (componentListeners) {
      componentListeners.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          console.warn('Cleanup error:', error);
        }
      });
      this.listeners.delete(componentId);
    }

    // Cleanup timers
    for (const [key, timer] of this.timers.entries()) {
      if (key.startsWith(componentId)) {
        clearTimeout(timer);
        this.timers.delete(key);
      }
    }

    // Cleanup intervals
    for (const [key, interval] of this.intervals.entries()) {
      if (key.startsWith(componentId)) {
        clearInterval(interval);
        this.intervals.delete(key);
      }
    }
  }

  /**
   * Cleanup all resources
   */
  static cleanupAll() {
    // Cleanup all listeners
    for (const [componentId, listeners] of this.listeners.entries()) {
      listeners.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          console.warn('Cleanup error:', error);
        }
      });
    }
    this.listeners.clear();

    // Cleanup all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();

    // Cleanup all intervals
    for (const interval of this.intervals.values()) {
      clearInterval(interval);
    }
    this.intervals.clear();
  }

  /**
   * Get memory usage info
   */
  static getMemoryInfo() {
    return {
      listeners: this.listeners.size,
      timers: this.timers.size,
      intervals: this.intervals.size,
    };
  }
}

/**
 * Hook for automatic memory management
 */
export const useMemoryManagement = (componentId: string) => {
  const cleanupRef = useRef<(() => void)[]>([]);

  const registerCleanup = useCallback((cleanup: () => void) => {
    cleanupRef.current.push(cleanup);
  }, []);

  const registerTimer = useCallback((timerId: NodeJS.Timeout) => {
    MemoryManager.registerTimer(componentId, timerId);
  }, [componentId]);

  const registerInterval = useCallback((intervalId: NodeJS.Timeout) => {
    MemoryManager.registerInterval(componentId, intervalId);
  }, [componentId]);

  useEffect(() => {
    return () => {
      // Cleanup all registered functions
      cleanupRef.current.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          console.warn('Cleanup error:', error);
        }
      });
      
      // Cleanup from memory manager
      MemoryManager.cleanup(componentId);
    };
  }, [componentId]);

  return {
    registerCleanup,
    registerTimer,
    registerInterval,
  };
};

/**
 * Hook for safe timeout
 */
export const useSafeTimeout = () => {
  const timeouts = useRef<NodeJS.Timeout[]>([]);

  const setSafeTimeout = useCallback((callback: () => void, delay: number) => {
    const timeoutId = setTimeout(() => {
      callback();
      // Remove from array after execution
      const index = timeouts.current.indexOf(timeoutId);
      if (index > -1) {
        timeouts.current.splice(index, 1);
      }
    }, delay);
    
    timeouts.current.push(timeoutId);
    return timeoutId;
  }, []);

  const clearAllTimeouts = useCallback(() => {
    timeouts.current.forEach(timeout => clearTimeout(timeout));
    timeouts.current = [];
  }, []);

  useEffect(() => {
    return () => {
      clearAllTimeouts();
    };
  }, [clearAllTimeouts]);

  return {
    setSafeTimeout,
    clearAllTimeouts,
  };
};

/**
 * Hook for safe interval
 */
export const useSafeInterval = () => {
  const intervals = useRef<NodeJS.Timeout[]>([]);

  const setSafeInterval = useCallback((callback: () => void, delay: number) => {
    const intervalId = setInterval(callback, delay);
    intervals.current.push(intervalId);
    return intervalId;
  }, []);

  const clearAllIntervals = useCallback(() => {
    intervals.current.forEach(interval => clearInterval(interval));
    intervals.current = [];
  }, []);

  useEffect(() => {
    return () => {
      clearAllIntervals();
    };
  }, [clearAllIntervals]);

  return {
    setSafeInterval,
    clearAllIntervals,
  };
};

export default MemoryManager;







