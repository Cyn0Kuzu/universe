/**
 * Layout Performance Optimizer
 * Layout hesaplamalarını optimize eden utility
 */

import { Platform, Dimensions } from 'react-native';
import { performanceOptimizer } from '../utils/performanceOptimizer';

export interface LayoutConfig {
  screenWidth: number;
  screenHeight: number;
  isTablet: boolean;
  isLandscape: boolean;
  safeAreaInsets: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

export class LayoutOptimizer {
  private static instance: LayoutOptimizer;
  private layoutCache = new Map<string, any>();
  private lastLayoutUpdate = 0;
  private readonly CACHE_DURATION = 5000; // 5 saniye

  static getInstance(): LayoutOptimizer {
    if (!LayoutOptimizer.instance) {
      LayoutOptimizer.instance = new LayoutOptimizer();
    }
    return LayoutOptimizer.instance;
  }

  /**
   * Optimized layout calculation
   */
  async calculateLayout(
    layoutId: string,
    calculation: () => any,
    useCache: boolean = true
  ): Promise<any> {
    return performanceOptimizer.executeAsync(async () => {
      // Check cache first
      if (useCache && this.isCacheValid(layoutId)) {
        const cached = this.layoutCache.get(layoutId);
        if (cached) {
          return cached;
        }
      }

      // Calculate layout
      const result = calculation();
      
      // Cache result
      this.layoutCache.set(layoutId, result);
      this.lastLayoutUpdate = Date.now();
      
      return result;
    }, 'normal');
  }

  /**
   * Get optimized screen dimensions
   */
  getScreenDimensions(): LayoutConfig {
    const { width, height } = Dimensions.get('window');
    const { width: screenWidth, height: screenHeight } = Dimensions.get('screen');
    
    return {
      screenWidth: width,
      screenHeight: height,
      isTablet: width >= 768 || height >= 768,
      isLandscape: width > height,
      safeAreaInsets: {
        top: Platform.OS === 'ios' ? 44 : 24,
        bottom: Platform.OS === 'ios' ? 34 : 0,
        left: 0,
        right: 0,
      }
    };
  }

  /**
   * Optimized FlatList layout calculation
   */
  calculateFlatListLayout(
    itemCount: number,
    itemHeight: number,
    containerHeight: number,
    headerHeight: number = 0,
    footerHeight: number = 0
  ): {
    totalHeight: number;
    visibleItems: number;
    estimatedItemSize: number;
    getItemLayout: (index: number) => { length: number; offset: number; index: number };
  } {
    const totalHeight = itemCount * itemHeight + headerHeight + footerHeight;
    const visibleItems = Math.ceil(containerHeight / itemHeight);
    const estimatedItemSize = itemHeight;

    const getItemLayout = (index: number) => ({
      length: itemHeight,
      offset: headerHeight + (index * itemHeight),
      index,
    });

    return {
      totalHeight,
      visibleItems,
      estimatedItemSize,
      getItemLayout,
    };
  }

  /**
   * Optimized grid layout calculation
   */
  calculateGridLayout(
    itemCount: number,
    containerWidth: number,
    itemWidth: number,
    spacing: number = 0
  ): {
    columns: number;
    rows: number;
    itemWidth: number;
    itemHeight: number;
    totalHeight: number;
  } {
    const availableWidth = containerWidth - spacing;
    const columns = Math.floor(availableWidth / (itemWidth + spacing));
    const rows = Math.ceil(itemCount / columns);
    const adjustedItemWidth = (availableWidth - (columns - 1) * spacing) / columns;
    const totalHeight = rows * itemWidth + (rows - 1) * spacing;

    return {
      columns,
      rows,
      itemWidth: adjustedItemWidth,
      itemHeight: itemWidth,
      totalHeight,
    };
  }

  /**
   * Optimized responsive font size calculation
   */
  calculateResponsiveFontSize(
    baseFontSize: number,
    screenWidth: number,
    minFontSize: number = 12,
    maxFontSize: number = 24
  ): number {
    const scaleFactor = screenWidth / 375; // iPhone X base width
    const scaledFontSize = baseFontSize * scaleFactor;
    
    return Math.max(minFontSize, Math.min(maxFontSize, scaledFontSize));
  }

  /**
   * Optimized spacing calculation
   */
  calculateSpacing(
    baseSpacing: number,
    screenWidth: number,
    screenHeight: number
  ): {
    horizontal: number;
    vertical: number;
    small: number;
    medium: number;
    large: number;
  } {
    const scaleFactor = Math.min(screenWidth / 375, screenHeight / 667);
    
    return {
      horizontal: baseSpacing * scaleFactor,
      vertical: baseSpacing * scaleFactor,
      small: (baseSpacing * 0.5) * scaleFactor,
      medium: baseSpacing * scaleFactor,
      large: (baseSpacing * 1.5) * scaleFactor,
    };
  }

  /**
   * Batch layout calculations
   */
  async batchLayoutCalculations(
    calculations: Array<{ id: string; calculation: () => any }>
  ): Promise<Map<string, any>> {
    return performanceOptimizer.executeAsync(async () => {
      const results = new Map<string, any>();
      
      // Process calculations in batches
      const batchSize = 5;
      for (let i = 0; i < calculations.length; i += batchSize) {
        const batch = calculations.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async ({ id, calculation }) => {
          const result = await this.calculateLayout(id, calculation, true);
          results.set(id, result);
        });
        
        await Promise.all(batchPromises);
        
        // Small delay to prevent main thread blocking
        if (i + batchSize < calculations.length) {
          await new Promise(resolve => setTimeout(resolve, 5));
        }
      }
      
      return results;
    }, 'low');
  }

  /**
   * Cache management
   */
  private isCacheValid(layoutId: string): boolean {
    const cached = this.layoutCache.get(layoutId);
    if (!cached) return false;
    
    return Date.now() - this.lastLayoutUpdate < this.CACHE_DURATION;
  }

  /**
   * Clear layout cache
   */
  clearCache(): void {
    this.layoutCache.clear();
    this.lastLayoutUpdate = 0;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.layoutCache.size,
      keys: Array.from(this.layoutCache.keys())
    };
  }
}

export const layoutOptimizer = LayoutOptimizer.getInstance();

/**
 * React Hook for layout optimization
 */
export const useLayoutOptimizer = () => {
  return {
    calculateLayout: layoutOptimizer.calculateLayout.bind(layoutOptimizer),
    getScreenDimensions: layoutOptimizer.getScreenDimensions.bind(layoutOptimizer),
    calculateFlatListLayout: layoutOptimizer.calculateFlatListLayout.bind(layoutOptimizer),
    calculateGridLayout: layoutOptimizer.calculateGridLayout.bind(layoutOptimizer),
    calculateResponsiveFontSize: layoutOptimizer.calculateResponsiveFontSize.bind(layoutOptimizer),
    calculateSpacing: layoutOptimizer.calculateSpacing.bind(layoutOptimizer),
    batchLayoutCalculations: layoutOptimizer.batchLayoutCalculations.bind(layoutOptimizer),
    clearCache: layoutOptimizer.clearCache.bind(layoutOptimizer),
    getCacheStats: layoutOptimizer.getCacheStats.bind(layoutOptimizer),
  };
};

