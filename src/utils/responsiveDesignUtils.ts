/**
 * Responsive Design Utilities
 * Comprehensive responsive design system for all device sizes
 */

import { Dimensions, Platform, PixelRatio } from 'react-native';
import { StyleSheet } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Device type detection
export const isTablet = screenWidth >= 768;
export const isSmallDevice = screenWidth < 375;
export const isMediumDevice = screenWidth >= 375 && screenWidth < 414;
export const isLargeDevice = screenWidth >= 414;
export const isLandscape = screenWidth > screenHeight;

// Responsive scaling functions
export const scaleWidth = (size: number) => (screenWidth / 375) * size;
export const scaleHeight = (size: number) => (screenHeight / 812) * size;
export const scaleFont = (size: number) => {
  const scale = Math.min(screenWidth / 375, screenHeight / 812);
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

// Responsive spacing system
export const responsiveSpacing = {
  xs: scaleWidth(4),
  sm: scaleWidth(8),
  md: scaleWidth(16),
  lg: scaleWidth(24),
  xl: scaleWidth(32),
  xxl: scaleWidth(48),
};

// Responsive font sizes
export const responsiveFontSizes = {
  xs: scaleFont(10),
  sm: scaleFont(12),
  md: scaleFont(14),
  lg: scaleFont(16),
  xl: scaleFont(18),
  xxl: scaleFont(20),
  xxxl: scaleFont(24),
  title: scaleFont(28),
  header: scaleFont(32),
  tab: scaleFont(14),
  // Additional sizes for compatibility
  h1: scaleFont(32),
  h2: scaleFont(24),
  h3: scaleFont(20),
  h4: scaleFont(18),
  h5: scaleFont(16),
  h6: scaleFont(14),
  body: scaleFont(14),
  bodySmall: scaleFont(12),
  caption: scaleFont(10),
  label: scaleFont(12),
  button: scaleFont(14),
};

// Responsive border radius
export const responsiveBorderRadius = {
  xs: scaleWidth(2),
  sm: scaleWidth(4),
  md: scaleWidth(8),
  lg: scaleWidth(12),
  xl: scaleWidth(16),
  round: scaleWidth(50),
};

// Responsive button dimensions
export const responsiveButtonDimensions = {
  height: {
    small: scaleHeight(36),
    medium: scaleHeight(48),
    large: scaleHeight(56),
  },
  borderRadius: responsiveBorderRadius.md,
  paddingHorizontal: responsiveSpacing.md,
};

// Responsive input dimensions
export const responsiveInputDimensions = {
  height: scaleHeight(48),
  borderRadius: responsiveBorderRadius.md,
  fontSize: responsiveFontSizes.md,
};

// Responsive modal dimensions
export const responsiveModalDimensions = {
  width: screenWidth * 0.9,
  maxHeight: screenHeight * 0.8,
  borderRadius: responsiveBorderRadius.lg,
};

// Responsive list configuration
export const responsiveListConfig = {
  itemHeight: scaleHeight(60),
  separatorHeight: 1,
};

// Responsive grid configuration
export const responsiveGridConfig = {
  itemWidth: (screenWidth - responsiveSpacing.md * 3) / 2,
  spacing: responsiveSpacing.md,
};

// Responsive shadows
export const responsiveShadows = {
  none: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
  },
};

/**
 * Responsive layout utilities
 */
export const responsiveLayout = {
  // Container styles
  container: {
    flex: 1,
    paddingHorizontal: responsiveSpacing.md,
  },
  
  // Card styles
  card: {
    backgroundColor: '#ffffff',
    borderRadius: responsiveBorderRadius.md,
    padding: responsiveSpacing.md,
    marginVertical: responsiveSpacing.sm,
    ...responsiveShadows.sm,
  },
  
  // Button styles
  button: {
    height: responsiveButtonDimensions.height.medium,
    borderRadius: responsiveButtonDimensions.borderRadius,
    paddingHorizontal: responsiveButtonDimensions.paddingHorizontal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Input styles
  input: {
    height: responsiveInputDimensions.height,
    borderRadius: responsiveInputDimensions.borderRadius,
    paddingHorizontal: responsiveSpacing.md,
    fontSize: responsiveInputDimensions.fontSize,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  
  // Modal styles
  modal: {
    width: responsiveModalDimensions.width,
    maxHeight: responsiveModalDimensions.maxHeight,
    borderRadius: responsiveModalDimensions.borderRadius,
    backgroundColor: '#ffffff',
    padding: responsiveSpacing.lg,
    ...responsiveShadows.lg,
  },
  
  // List item styles
  listItem: {
    height: responsiveListConfig.itemHeight,
    paddingHorizontal: responsiveSpacing.md,
    paddingVertical: responsiveSpacing.sm,
    borderBottomWidth: responsiveListConfig.separatorHeight,
    borderBottomColor: '#f0f0f0',
  },
  
  // Grid item styles
  gridItem: {
    width: responsiveGridConfig.itemWidth,
    marginBottom: responsiveGridConfig.spacing,
    borderRadius: responsiveBorderRadius.md,
    overflow: 'hidden',
  },
};

/**
 * Responsive text styles
 */
export const responsiveTextStyles = StyleSheet.create({
  h1: {
    fontSize: responsiveFontSizes.header,
    fontWeight: 'bold',
    lineHeight: responsiveFontSizes.header * 1.2,
  },
  h2: {
    fontSize: responsiveFontSizes.title,
    fontWeight: 'bold',
    lineHeight: responsiveFontSizes.title * 1.2,
  },
  h3: {
    fontSize: responsiveFontSizes.xxxl,
    fontWeight: '600',
    lineHeight: responsiveFontSizes.xxxl * 1.2,
  },
  h4: {
    fontSize: responsiveFontSizes.xxl,
    fontWeight: '600',
    lineHeight: responsiveFontSizes.xxl * 1.2,
  },
  body: {
    fontSize: responsiveFontSizes.md,
    lineHeight: responsiveFontSizes.md * 1.4,
  },
  caption: {
    fontSize: responsiveFontSizes.sm,
    lineHeight: responsiveFontSizes.sm * 1.3,
  },
  button: {
    fontSize: responsiveFontSizes.md,
    fontWeight: '600',
  },
  label: {
    fontSize: responsiveFontSizes.sm,
    fontWeight: '500',
  },
  tab: {
    fontSize: responsiveFontSizes.tab,
    fontWeight: '500',
  },
});

/**
 * Responsive component styles
 */
export const responsiveComponentStyles = StyleSheet.create({
  container: responsiveLayout.container,
  card: responsiveLayout.card,
  button: {
    ...responsiveLayout.button,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  input: responsiveLayout.input,
  modal: responsiveLayout.modal,
  listItem: responsiveLayout.listItem,
  gridItem: {
    ...responsiveLayout.gridItem,
    overflow: 'hidden' as const,
  },
});

/**
 * Hook for responsive design
 */
export const useResponsiveDesign = () => {
  // Width percentage helper
  const wp = (percentage: number) => (screenWidth * percentage) / 100;
  
  // Height percentage helper
  const hp = (percentage: number) => (screenHeight * percentage) / 100;
  
  return {
    screenWidth,
    screenHeight,
    isTablet,
    isSmallDevice,
    isMediumDevice,
    isLargeDevice,
    isLandscape,
    wp,
    hp,
    spacing: responsiveSpacing,
    fontSizes: responsiveFontSizes,
    borderRadius: responsiveBorderRadius,
    buttonDimensions: responsiveButtonDimensions,
    inputDimensions: responsiveInputDimensions,
    modalDimensions: responsiveModalDimensions,
    listConfig: responsiveListConfig,
    gridConfig: responsiveGridConfig,
    shadows: responsiveShadows,
    layout: responsiveLayout,
    textStyles: responsiveTextStyles,
    componentStyles: responsiveComponentStyles,
  };
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
  if (isTablet && tablet !== undefined) return tablet;
  if (isLargeDevice && large !== undefined) return large;
  if (isMediumDevice && medium !== undefined) return medium;
  return small;
};

/**
 * Responsive padding/margin helper
 */
export const getResponsivePadding = (
  top: number = 0,
  right: number = 0,
  bottom: number = 0,
  left: number = 0
) => ({
  paddingTop: scaleHeight(top),
  paddingRight: scaleWidth(right),
  paddingBottom: scaleHeight(bottom),
  paddingLeft: scaleWidth(left),
});

/**
 * Responsive margin helper
 */
export const getResponsiveMargin = (
  top: number = 0,
  right: number = 0,
  bottom: number = 0,
  left: number = 0
) => ({
  marginTop: scaleHeight(top),
  marginRight: scaleWidth(right),
  marginBottom: scaleHeight(bottom),
  marginLeft: scaleWidth(left),
});

/**
 * Safe area responsive padding
 */
export const getSafeAreaPadding = (insets: any) => ({
  paddingTop: Math.max(insets?.top || 0, scaleHeight(20)),
  paddingBottom: Math.max(insets?.bottom || 0, scaleHeight(20)),
  paddingLeft: Math.max(insets?.left || 0, scaleWidth(16)),
  paddingRight: Math.max(insets?.right || 0, scaleWidth(16)),
});

/**
 * Responsive flex layout helpers
 */
export const flexLayout = {
  center: {
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  centerHorizontal: {
    alignItems: 'center' as const,
  },
  centerVertical: {
    justifyContent: 'center' as const,
  },
  spaceBetween: {
    justifyContent: 'space-between' as const,
  },
  spaceAround: {
    justifyContent: 'space-around' as const,
  },
  spaceEvenly: {
    justifyContent: 'space-evenly' as const,
  },
  row: {
    flexDirection: 'row' as const,
  },
  column: {
    flexDirection: 'column' as const,
  },
  wrap: {
    flexWrap: 'wrap' as const,
  },
};

/**
 * Responsive scroll view configuration
 */
export const scrollViewConfig = {
  contentContainerStyle: {
    paddingHorizontal: responsiveSpacing.md,
    paddingVertical: responsiveSpacing.sm,
  },
  showsVerticalScrollIndicator: false,
  showsHorizontalScrollIndicator: false,
  bounces: true,
  alwaysBounceVertical: false,
};

/**
 * Responsive flat list configuration
 */
export const flatListConfig = {
  contentContainerStyle: {
    paddingHorizontal: responsiveSpacing.md,
  },
  showsVerticalScrollIndicator: false,
  showsHorizontalScrollIndicator: false,
  bounces: true,
  alwaysBounceVertical: false,
  keyExtractor: (item: any, index: number) => item?.id?.toString() || index.toString(),
};

/**
 * Responsive keyboard avoiding view configuration
 */
export const keyboardAvoidingConfig = {
  behavior: Platform.OS === 'ios' ? 'padding' : 'height',
  keyboardVerticalOffset: Platform.OS === 'ios' ? 0 : 20,
};

/**
 * Responsive animation configuration
 */
export const animationConfig = {
  duration: {
    fast: 200,
    normal: 300,
    slow: 500,
  },
  easing: {
    easeInOut: 'ease-in-out',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
  },
};

/**
 * Responsive color system
 */
export const colorSystem = {
  primary: '#1976D2',
  primaryDark: '#1565C0',
  primaryLight: '#42A5F5',
  secondary: '#FFC107',
  secondaryDark: '#FF8F00',
  secondaryLight: '#FFD54F',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',
  surface: '#FFFFFF',
  background: '#F5F5F5',
  text: '#212121',
  textSecondary: '#757575',
  textDisabled: '#BDBDBD',
  border: '#E0E0E0',
  divider: '#F0F0F0',
  shadow: '#000000',
};

/**
 * Responsive dark mode colors
 */
export const darkColorSystem = {
  primary: '#42A5F5',
  primaryDark: '#1976D2',
  primaryLight: '#64B5F6',
  secondary: '#FFD54F',
  secondaryDark: '#FFC107',
  secondaryLight: '#FFF176',
  success: '#66BB6A',
  warning: '#FFB74D',
  error: '#EF5350',
  info: '#42A5F5',
  surface: '#1E1E1E',
  background: '#121212',
  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textDisabled: '#666666',
  border: '#333333',
  divider: '#2A2A2A',
  shadow: '#000000',
};

/**
 * Get responsive colors based on theme
 */
export const getResponsiveColors = (isDark: boolean = false) => {
  return isDark ? darkColorSystem : colorSystem;
};

/**
 * Responsive icon sizes
 */
export const iconSizes = {
  xs: scaleWidth(12),
  sm: scaleWidth(16),
  md: scaleWidth(20),
  lg: scaleWidth(24),
  xl: scaleWidth(28),
  xxl: scaleWidth(32),
};

/**
 * Responsive image dimensions
 */
export const imageDimensions = {
  avatar: {
    small: scaleWidth(32),
    medium: scaleWidth(48),
    large: scaleWidth(64),
    xlarge: scaleWidth(80),
  },
  thumbnail: {
    width: scaleWidth(100),
    height: scaleHeight(100),
  },
  card: {
    width: screenWidth - responsiveSpacing.md * 2,
    height: scaleHeight(200),
  },
};

/**
 * Responsive loading states
 */
export const loadingStates = {
  overlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    zIndex: 1000,
  },
  spinner: {
    size: 'large' as const,
    color: colorSystem.primary,
  },
};

/**
 * Responsive error states
 */
export const errorStates = {
  container: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: responsiveSpacing.lg,
  },
  text: {
    fontSize: responsiveFontSizes.md,
    color: colorSystem.error,
    textAlign: 'center' as const,
    marginTop: responsiveSpacing.md,
  },
};

/**
 * Responsive empty states
 */
export const emptyStates = {
  container: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: responsiveSpacing.xl,
  },
  icon: {
    fontSize: iconSizes.xxl,
    color: colorSystem.textDisabled,
    marginBottom: responsiveSpacing.md,
  },
  text: {
    fontSize: responsiveFontSizes.lg,
    color: colorSystem.textSecondary,
    textAlign: 'center' as const,
    marginBottom: responsiveSpacing.sm,
  },
  subtitle: {
    fontSize: responsiveFontSizes.md,
    color: colorSystem.textDisabled,
    textAlign: 'center' as const,
  },
};

export default {
  useResponsiveDesign,
  getResponsiveValue,
  getResponsivePadding,
  getResponsiveMargin,
  getSafeAreaPadding,
  getResponsiveColors,
  flexLayout,
  scrollViewConfig,
  flatListConfig,
  keyboardAvoidingConfig,
  animationConfig,
  colorSystem,
  darkColorSystem,
  iconSizes,
  imageDimensions,
  loadingStates,
  errorStates,
  emptyStates,
};