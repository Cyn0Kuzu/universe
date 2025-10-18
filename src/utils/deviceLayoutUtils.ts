/**
 * Device Layout Utilities
 * Comprehensive device-specific layout handling for all Android and iOS devices
 */

import { Platform, Dimensions, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface DeviceLayoutConfig {
  // Screen dimensions
  screenWidth: number;
  screenHeight: number;
  windowWidth: number;
  windowHeight: number;
  
  // Device type detection
  isIOS: boolean;
  isAndroid: boolean;
  isTablet: boolean;
  isSmallDevice: boolean;
  isMediumDevice: boolean;
  isLargeDevice: boolean;
  isLandscape: boolean;
  
  // Safe area insets
  safeAreaInsets: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  
  // Navigation bar configuration
  navigationBar: {
    height: number;
    paddingBottom: number;
    paddingTop: number;
    paddingHorizontal: number;
    fontSize: number;
    iconSize: number;
  };
  
  // Status bar configuration
  statusBar: {
    height: number;
    translucent: boolean;
  };
}

/**
 * Get comprehensive device layout configuration
 */
export const getDeviceLayoutConfig = (insets?: any): DeviceLayoutConfig => {
  const { width: screenWidth, height: screenHeight } = Dimensions.get('screen');
  const { width: windowWidth, height: windowHeight } = Dimensions.get('window');
  
  const isIOS = Platform.OS === 'ios';
  const isAndroid = Platform.OS === 'android';
  const isTablet = screenWidth >= 768 || screenHeight >= 768;
  const isSmallDevice = screenWidth < 375;
  const isMediumDevice = screenWidth >= 375 && screenWidth < 414;
  const isLargeDevice = screenWidth >= 414;
  const isLandscape = screenWidth > screenHeight;
  
  // Get safe area insets
  const safeAreaInsets = {
    top: insets?.top || (isIOS ? 44 : StatusBar.currentHeight || 24),
    bottom: insets?.bottom || (isIOS ? 34 : 0),
    left: insets?.left || 0,
    right: insets?.right || 0,
  };
  
  // Calculate navigation bar configuration
  let baseTabHeight = isIOS ? 49 : 56;
  if (isTablet) {
    baseTabHeight = isIOS ? 60 : 64;
  } else if (isSmallDevice) {
    baseTabHeight = isIOS ? 45 : 52;
  }
  
  const navigationBarHeight = baseTabHeight + safeAreaInsets.bottom;
  
  // Responsive font and icon sizes
  let baseFontSize = isSmallDevice ? 9 : isMediumDevice ? 10 : 11;
  let baseIconSize = isSmallDevice ? 18 : isMediumDevice ? 20 : 24;
  
  if (isTablet) {
    baseFontSize = 12;
    baseIconSize = 28;
  }
  
  // Responsive padding
  let horizontalPadding = isSmallDevice ? 6 : isMediumDevice ? 8 : 12;
  let verticalPadding = isIOS ? 5 : 8;
  
  if (isTablet) {
    horizontalPadding = 16;
    verticalPadding = isIOS ? 8 : 10;
  }
  
  return {
    screenWidth,
    screenHeight,
    windowWidth,
    windowHeight,
    isIOS,
    isAndroid,
    isTablet,
    isSmallDevice,
    isMediumDevice,
    isLargeDevice,
    isLandscape,
    safeAreaInsets,
    navigationBar: {
      height: navigationBarHeight,
      paddingBottom: safeAreaInsets.bottom,
      paddingTop: verticalPadding,
      paddingHorizontal: horizontalPadding,
      fontSize: baseFontSize,
      iconSize: baseIconSize,
    },
    statusBar: {
      height: safeAreaInsets.top,
      translucent: isAndroid,
    },
  };
};

/**
 * React hook for device layout configuration
 */
export const useDeviceLayout = (): DeviceLayoutConfig => {
  const insets = useSafeAreaInsets();
  return getDeviceLayoutConfig(insets);
};

/**
 * Get responsive value based on device size
 */
export const getResponsiveValue = <T>(
  small: T,
  medium?: T,
  large?: T,
  tablet?: T
): T => {
  const config = getDeviceLayoutConfig();
  
  if (config.isTablet && tablet !== undefined) return tablet;
  if (config.isLargeDevice && large !== undefined) return large;
  if (config.isMediumDevice && medium !== undefined) return medium;
  return small;
};

/**
 * Get responsive font size with tablet support
 */
export const getResponsiveFontSize = (
  baseSize: number,
  minSize: number = 10,
  maxSize: number = 20,
  tabletSize?: number
): number => {
  const config = getDeviceLayoutConfig();
  
  // Use tablet size if available and device is tablet
  if (config.isTablet && tabletSize !== undefined) {
    return tabletSize;
  }
  
  const scaleFactor = config.screenWidth / 375; // iPhone X base width
  const scaledSize = baseSize * scaleFactor;
  
  // Apply min/max constraints
  const constrainedSize = Math.max(minSize, Math.min(maxSize, scaledSize));
  
  // Round to nearest 0.5 for better rendering
  return Math.round(constrainedSize * 2) / 2;
};

/**
 * Get responsive spacing
 */
export const getResponsiveSpacing = (
  baseSpacing: number,
  screenWidth?: number
): number => {
  const config = getDeviceLayoutConfig();
  const width = screenWidth || config.screenWidth;
  const scaleFactor = Math.min(width / 375, 1.2); // Cap at 1.2x
  
  return baseSpacing * scaleFactor;
};

/**
 * Get navigation bar style for React Navigation
 */
export const getNavigationBarStyle = (insets?: any) => {
  const config = getDeviceLayoutConfig(insets);
  
  // Calculate safe bottom padding to avoid phone navigation bar overlap
  // On Android devices with gesture navigation, add MUCH MORE extra padding
  const baseBottomPadding = config.safeAreaInsets.bottom;
  
  // CRITICAL FIX: Add aggressive padding for Android gesture navigation
  // Many Android devices have 24-48px gesture bars that overlap
  let extraAndroidPadding = 0;
  if (config.isAndroid) {
    // If device has no safe area insets, assume it has gesture navigation
    if (baseBottomPadding === 0) {
      extraAndroidPadding = 24; // Add significant padding for gesture bar
    } else {
      extraAndroidPadding = 12; // Add some padding even with safe area
    }
  }
  
  const safeBottomPadding = Math.max(
    config.navigationBar.paddingBottom,
    baseBottomPadding + extraAndroidPadding,
    config.isAndroid ? 20 : 0 // Minimum 20px padding on Android
  );
  
  return {
    paddingBottom: safeBottomPadding,
    paddingTop: config.navigationBar.paddingTop,
    paddingHorizontal: config.navigationBar.paddingHorizontal,
    height: config.navigationBar.height + safeBottomPadding,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    elevation: Platform.OS === 'android' ? 8 : 0,
    shadowColor: Platform.OS === 'ios' ? '#000000' : undefined,
    shadowOffset: Platform.OS === 'ios' ? { width: 0, height: -2 } : undefined,
    shadowOpacity: Platform.OS === 'ios' ? 0.1 : undefined,
    shadowRadius: Platform.OS === 'ios' ? 4 : undefined,
    // Keep relative positioning
    position: 'relative' as const,
    // CRITICAL: Add margin bottom for Android to prevent overlap with system navigation
    ...(config.isAndroid && {
      marginBottom: 0, // Don't add margin, rely on padding instead
    }),
    // Landscape mode adjustments
    ...(config.isLandscape && {
      height: Math.max(config.navigationBar.height + safeBottomPadding, 60),
      paddingTop: Math.max(config.navigationBar.paddingTop, 8),
      paddingBottom: Math.max(safeBottomPadding, 16),
    }),
    // Tablet adjustments
    ...(config.isTablet && {
      height: config.navigationBar.height + safeBottomPadding + 8,
      paddingTop: config.navigationBar.paddingTop + 2,
      paddingBottom: safeBottomPadding + 8,
    }),
    // Small device adjustments to prevent overlap
    ...(config.isSmallDevice && {
      paddingBottom: Math.max(safeBottomPadding, 20),
      height: config.navigationBar.height + Math.max(safeBottomPadding, 20),
    }),
  };
};

/**
 * Get navigation label style
 */
export const getNavigationLabelStyle = (insets?: any) => {
  const config = getDeviceLayoutConfig(insets);
  
  return {
    fontSize: config.navigationBar.fontSize,
    fontWeight: '500' as const,
    marginTop: 2,
  };
};

/**
 * Get navigation icon style
 */
export const getNavigationIconStyle = (insets?: any) => {
  const config = getDeviceLayoutConfig(insets);
  
  return {
    marginTop: 2,
  };
};

/**
 * Get navigation item style
 */
export const getNavigationItemStyle = (insets?: any) => {
  return {
    paddingVertical: 2,
  };
};

/**
 * Check if device has notch or dynamic island
 */
export const hasNotch = (insets?: any): boolean => {
  const config = getDeviceLayoutConfig(insets);
  return config.isIOS && config.safeAreaInsets.top > 44;
};

/**
 * Check if device has home indicator
 */
export const hasHomeIndicator = (insets?: any): boolean => {
  const config = getDeviceLayoutConfig(insets);
  return config.isIOS && config.safeAreaInsets.bottom > 0;
};

/**
 * Get content padding to avoid navigation bar overlap
 */
export const getContentPadding = (insets?: any) => {
  const config = getDeviceLayoutConfig(insets);
  
  return {
    paddingBottom: config.navigationBar.height,
    paddingTop: config.safeAreaInsets.top,
    paddingLeft: config.safeAreaInsets.left,
    paddingRight: config.safeAreaInsets.right,
  };
};

/**
 * Device-specific constants
 */
export const DEVICE_CONSTANTS = {
  // iPhone dimensions
  IPHONE_SE_WIDTH: 320,
  IPHONE_8_WIDTH: 375,
  IPHONE_8_PLUS_WIDTH: 414,
  IPHONE_X_WIDTH: 375,
  IPHONE_XR_WIDTH: 414,
  IPHONE_12_MINI_WIDTH: 360,
  IPHONE_12_WIDTH: 390,
  IPHONE_12_PRO_MAX_WIDTH: 428,
  
  // Android dimensions
  ANDROID_SMALL_WIDTH: 360,
  ANDROID_MEDIUM_WIDTH: 411,
  ANDROID_LARGE_WIDTH: 480,
  
  // Tablet dimensions
  TABLET_SMALL_WIDTH: 768,
  TABLET_LARGE_WIDTH: 1024,
  
  // Safe area defaults
  IOS_SAFE_AREA_TOP: 44,
  IOS_SAFE_AREA_BOTTOM: 34,
  ANDROID_STATUS_BAR_HEIGHT: 24,
} as const;
