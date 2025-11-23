/**
 * Optimized Reanimated Configuration
 * Layout sorunlarını çözen Reanimated optimizasyonları
 */

import { Platform } from 'react-native';

// Reanimated optimizasyonları
export const REANIMATED_CONFIG = {
  // Layout animasyonlarını optimize et
  layoutAnimation: {
    duration: 200,
    easing: 'easeInOut',
  },
  
  // Performans için layout animasyonlarını sınırla
  maxConcurrentAnimations: Platform.OS === 'ios' ? 3 : 2,
  
  // Layout hesaplamalarını optimize et
  layoutCalculation: {
    enableLayoutAnimations: true,
    skipLayoutAnimations: false,
    reduceMotion: false,
  },
};

/**
 * Layout animasyonlarını optimize eden hook
 */
export const useOptimizedLayoutAnimation = () => {
  const runLayoutAnimation = (callback: () => void) => {
    // Ana thread'i bloke etmemek için layout animasyonunu optimize et
    requestAnimationFrame(() => {
      callback();
    });
  };

  const runLayoutAnimationWithDelay = (callback: () => void, delay: number = 16) => {
    setTimeout(() => {
      runLayoutAnimation(callback);
    }, delay);
  };

  return {
    runLayoutAnimation,
    runLayoutAnimationWithDelay,
  };
};

/**
 * Layout timeout'larını önleyen utility
 */
export class LayoutTimeoutPreventer {
  private static instance: LayoutTimeoutPreventer;
  private activeLayouts = new Set<string>();
  private layoutTimeouts = new Map<string, NodeJS.Timeout>();

  static getInstance(): LayoutTimeoutPreventer {
    if (!LayoutTimeoutPreventer.instance) {
      LayoutTimeoutPreventer.instance = new LayoutTimeoutPreventer();
    }
    return LayoutTimeoutPreventer.instance;
  }

  /**
   * Layout işlemini başlat
   */
  startLayout(layoutId: string, timeoutMs: number = 5000): void {
    this.activeLayouts.add(layoutId);
    
    // Timeout'u temizle
    const existingTimeout = this.layoutTimeouts.get(layoutId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Yeni timeout ayarla
    const timeout = setTimeout(() => {
      console.warn(`Layout timeout for ${layoutId}`);
      this.activeLayouts.delete(layoutId);
      this.layoutTimeouts.delete(layoutId);
    }, timeoutMs);

    this.layoutTimeouts.set(layoutId, timeout);
  }

  /**
   * Layout işlemini tamamla
   */
  completeLayout(layoutId: string): void {
    this.activeLayouts.delete(layoutId);
    
    const timeout = this.layoutTimeouts.get(layoutId);
    if (timeout) {
      clearTimeout(timeout);
      this.layoutTimeouts.delete(layoutId);
    }
  }

  /**
   * Layout durumunu kontrol et
   */
  isLayoutActive(layoutId: string): boolean {
    return this.activeLayouts.has(layoutId);
  }

  /**
   * Tüm layout'ları temizle
   */
  clearAllLayouts(): void {
    this.activeLayouts.clear();
    this.layoutTimeouts.forEach(timeout => clearTimeout(timeout));
    this.layoutTimeouts.clear();
  }
}

export const layoutTimeoutPreventer = LayoutTimeoutPreventer.getInstance();

/**
 * SafeAreaView optimizasyonları
 */
export const SAFE_AREA_CONFIG = {
  // SafeAreaView timeout'unu önle
  preventTimeout: true,
  
  // Layout timeout süresi (ms) - reduced to prevent hanging
  layoutTimeout: 1000,
  
  // Fallback layout
  fallbackLayout: {
    paddingTop: Platform.OS === 'ios' ? 44 : 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 0,
  },
};

/**
 * Optimized SafeAreaView hook
 */
export const useOptimizedSafeArea = () => {
  const handleLayout = (layoutId: string) => {
    layoutTimeoutPreventer.startLayout(layoutId, SAFE_AREA_CONFIG.layoutTimeout);
  };

  const handleLayoutComplete = (layoutId: string) => {
    layoutTimeoutPreventer.completeLayout(layoutId);
  };

  return {
    handleLayout,
    handleLayoutComplete,
    isLayoutActive: layoutTimeoutPreventer.isLayoutActive.bind(layoutTimeoutPreventer),
  };
};

