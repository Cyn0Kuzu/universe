/**
 * 📱 Edge-to-Edge Display Hook
 * Android 15+ uyumluluğu için edge-to-edge ekran desteği
 */

import { useEffect, useState } from 'react';
import { Platform, StatusBar, Dimensions, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface EdgeToEdgeMetrics {
  statusBarHeight: number;
  navigationBarHeight: number;
  safeAreaInsets: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  screenDimensions: {
    width: number;
    height: number;
  };
  isEdgeToEdgeEnabled: boolean;
  isLargeScreen: boolean;
  isFoldable: boolean;
}

export const useEdgeToEdge = (): EdgeToEdgeMetrics => {
  const insets = useSafeAreaInsets();
  const [screenData, setScreenData] = useState(() => Dimensions.get('screen'));
  
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ screen }) => {
      setScreenData(screen);
    });

    return () => subscription?.remove();
  }, []);

  const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight || 0 : insets.top;
  
  // Large screen detection (tablets, foldables)
  const isLargeScreen = screenData.width >= 600 || screenData.height >= 960;
  
  // Foldable detection (approximate)
  const aspectRatio = Math.max(screenData.width, screenData.height) / Math.min(screenData.width, screenData.height);
  const isFoldable = aspectRatio > 2.1 || (screenData.width > 900 && screenData.height > 600);
  
  // Edge-to-edge enabled on Android API 30+ (Android 11+)
  const isEdgeToEdgeEnabled = Platform.OS === 'android' && Platform.Version >= 30;

  return {
    statusBarHeight,
    navigationBarHeight: insets.bottom,
    safeAreaInsets: insets,
    screenDimensions: screenData,
    isEdgeToEdgeEnabled,
    isLargeScreen,
    isFoldable,
  };
};

/**
 * 📐 Responsive Layout Hook
 * Büyük ekranlar için responsive layout desteği
 */
export const useResponsiveLayout = () => {
  const { screenDimensions, isLargeScreen, isFoldable } = useEdgeToEdge();
  
  const getLayoutStyle = (): ViewStyle => {
    if (isFoldable) {
      return {
        flexDirection: 'row' as const,
        maxWidth: '100%' as const,
        paddingHorizontal: 24,
      };
    }
    
    if (isLargeScreen) {
      return {
        maxWidth: 768,
        alignSelf: 'center' as const,
        paddingHorizontal: 32,
      };
    }
    
    return {
      paddingHorizontal: 16,
    };
  };

  const getColumnCount = () => {
    if (isFoldable) return 2;
    if (isLargeScreen) return 2;
    return 1;
  };

  const getCardWidth = () => {
    const { width } = screenDimensions;
    const padding = isLargeScreen ? 64 : 32;
    const columnCount = getColumnCount();
    const gap = 16;
    
    return (width - padding - (gap * (columnCount - 1))) / columnCount;
  };

  return {
    layoutStyle: getLayoutStyle(),
    columnCount: getColumnCount(),
    cardWidth: getCardWidth(),
    isLargeScreen,
    isFoldable,
    screenWidth: screenDimensions.width,
    screenHeight: screenDimensions.height,
  };
};

export default useEdgeToEdge;
