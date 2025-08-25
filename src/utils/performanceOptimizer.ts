/**
 * 🚀 Performance Optimization Utilities
 * Akıcı ekran deneyimi için optimizasyon araçları
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import * as firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

// 🎯 Debounce hook - Çok sık tetiklenen fonksiyonları yavaşlatır
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// 🎯 Throttle hook - Belirli aralıklarla çalışan fonksiyonlar için
export function useThrottle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): T {
  const lastRun = useRef<number>(Date.now());
  
  return useCallback(
    ((...args: any[]) => {
      if (Date.now() - lastRun.current >= delay) {
        fn(...args);
        lastRun.current = Date.now();
      }
    }) as T,
    [fn, delay]
  );
}

// 🎯 Memoized state - Gereksiz re-render'ları önler
export function useMemoizedState<T>(
  initialValue: T,
  compareFn?: (prev: T, next: T) => boolean
) {
  const [state, setState] = useState<T>(initialValue);
  
  const memoizedSetState = useCallback((newValue: T | ((prev: T) => T)) => {
    setState(prevValue => {
      const nextValue = typeof newValue === 'function' 
        ? (newValue as (prev: T) => T)(prevValue)
        : newValue;
        
      if (compareFn) {
        return compareFn(prevValue, nextValue) ? prevValue : nextValue;
      }
      
      return Object.is(prevValue, nextValue) ? prevValue : nextValue;
    });
  }, [compareFn]);
  
  return [state, memoizedSetState] as const;
}

// 🎯 Firestore listener optimization - Tek listener, çoklu callback
export class OptimizedFirestoreListener {
  private listeners: Map<string, {
    unsubscribe: () => void;
    callbacks: Set<(data: any) => void>;
  }> = new Map();

  addListener(
    path: string,
    callback: (data: any) => void,
    query: () => any // Firestore Query type - avoid compat issues
  ) {
    if (this.listeners.has(path)) {
      // Var olan listener'a callback ekle
      this.listeners.get(path)!.callbacks.add(callback);
    } else {
      // Yeni listener oluştur
      const unsubscribe = query().onSnapshot((snapshot: any) => {
        const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
        const listener = this.listeners.get(path);
        if (listener) {
          listener.callbacks.forEach(cb => cb(data));
        }
      });

      this.listeners.set(path, {
        unsubscribe,
        callbacks: new Set([callback])
      });
    }
  }

  removeListener(path: string, callback: (data: any) => void) {
    const listener = this.listeners.get(path);
    if (listener) {
      listener.callbacks.delete(callback);
      
      // Eğer hiç callback kalmadıysa listener'ı kapat
      if (listener.callbacks.size === 0) {
        listener.unsubscribe();
        this.listeners.delete(path);
      }
    }
  }

  cleanup() {
    this.listeners.forEach(listener => listener.unsubscribe());
    this.listeners.clear();
  }
}

// Global listener manager
export const globalFirestoreListener = new OptimizedFirestoreListener();

// 🎯 Component state batching - Çoklu state update'lerini batch'ler
export function useBatchedState<T extends Record<string, any>>(initialState: T) {
  const [state, setState] = useState<T>(initialState);
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdatesRef = useRef<Partial<T>>({});

  const batchedSetState = useCallback((updates: Partial<T> | ((prev: T) => Partial<T>)) => {
    const updatesToApply = typeof updates === 'function' ? updates(state) : updates;
    
    // Pending updates'e ekle
    Object.assign(pendingUpdatesRef.current, updatesToApply);
    
    // Önceki timeout'u iptal et
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
    }
    
    // Yeni timeout başlat - 16ms (1 frame) sonra batch apply et
    batchTimeoutRef.current = setTimeout(() => {
      setState(prev => ({ ...prev, ...pendingUpdatesRef.current }));
      pendingUpdatesRef.current = {};
      batchTimeoutRef.current = null;
    }, 16);
  }, [state]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
    };
  }, []);

  return [state, batchedSetState] as const;
}

// 🎯 Lazy component loading - Sadece görünür olduğunda yükle
export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  { threshold = 0, rootMargin = '0px' }: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsIntersecting(entry.isIntersecting),
      { threshold, rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [elementRef, threshold, rootMargin]);

  return isIntersecting;
}

// 🎯 Memory leak prevention - Component unmount kontrolü
export function useMountedState() {
  const mountedRef = useRef(true);
  
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);
  
  return useCallback(() => mountedRef.current, []);
}

// 🎯 Performance metrics - Render sürelerini ölç (optimized)
export function useRenderTime(componentName: string) {
  const startTime = useRef<number>(0);
  const renderCount = useRef<number>(0);
  
  // Only measure every 10th render to avoid performance impact
  const shouldMeasure = useMemo(() => {
    renderCount.current++;
    return renderCount.current % 10 === 1; // Only measure 1 in 10 renders
  }, []);
  
  if (shouldMeasure) {
    startTime.current = performance.now();
  }
  
  // Component render bitişi
  useEffect(() => {
    if (shouldMeasure && startTime.current > 0) {
      const endTime = performance.now();
      const renderTime = endTime - startTime.current;
      
      if (renderTime > 200) { // Only warn for very seriously slow renders (increased threshold further)
        console.warn(`🐌 ${componentName} render took ${renderTime.toFixed(2)}ms (sample measurement)`);
      }
    }
  });
}

// 🎯 Firestore data caching - Aynı veriyi tekrar çekmeyi önle
class FirestoreCache {
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  
  set(key: string, data: any, ttlMs: number = 300000) { // 5 dk default TTL
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }
  
  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    const isExpired = Date.now() - cached.timestamp > cached.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  clear() {
    this.cache.clear();
  }
  
  size() {
    return this.cache.size;
  }
}

export const firestoreCache = new FirestoreCache();
