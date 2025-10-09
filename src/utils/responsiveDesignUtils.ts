/**
 * Responsive Design Utilities
 * Comprehensive responsive design helpers for all devices
 */

import { StyleSheet, Dimensions, Platform } from 'react-native';
import { useDeviceLayout, getResponsiveValue, getResponsiveFontSize, getResponsiveSpacing } from '../utils/deviceLayoutUtils';

// Get screen dimensions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Responsive font sizes with improved scaling
 */
export const responsiveFontSizes = {
  // Headers - Better scaling for all devices
  h1: getResponsiveFontSize(28, 24, 32, 36),
  h2: getResponsiveFontSize(24, 20, 28, 32),
  h3: getResponsiveFontSize(20, 18, 24, 28),
  h4: getResponsiveFontSize(18, 16, 20, 24),
  h5: getResponsiveFontSize(16, 14, 18, 20),
  h6: getResponsiveFontSize(14, 12, 16, 18),
  
  // Body text - Improved readability
  body: getResponsiveFontSize(16, 14, 18, 20),
  bodySmall: getResponsiveFontSize(14, 12, 16, 18),
  caption: getResponsiveFontSize(12, 10, 14, 16),
  
  // UI elements - Better touch targets
  button: getResponsiveFontSize(16, 14, 18, 20),
  label: getResponsiveFontSize(12, 10, 14, 16),
  tab: getResponsiveFontSize(11, 9, 13, 15),
  navigation: getResponsiveFontSize(11, 9, 13, 15),
  
  // Additional sizes for better hierarchy
  display: getResponsiveFontSize(36, 32, 40, 48),
  subheading: getResponsiveFontSize(22, 20, 24, 28),
  overline: getResponsiveFontSize(10, 9, 11, 13),
};

/**
 * Responsive spacing
 */
export const responsiveSpacing = {
  xs: getResponsiveSpacing(4),
  sm: getResponsiveSpacing(8),
  md: getResponsiveSpacing(16),
  lg: getResponsiveSpacing(24),
  xl: getResponsiveSpacing(32),
  xxl: getResponsiveSpacing(48),
};

/**
 * Responsive icon sizes
 */
export const responsiveIconSizes = {
  xs: getResponsiveValue(12, 14, 16),
  sm: getResponsiveValue(16, 18, 20),
  md: getResponsiveValue(20, 22, 24),
  lg: getResponsiveValue(24, 26, 28),
  xl: getResponsiveValue(28, 30, 32),
  xxl: getResponsiveValue(32, 34, 36),
};

/**
 * Responsive border radius
 */
export const responsiveBorderRadius = {
  none: 0,
  sm: getResponsiveValue(4, 6, 8),
  md: getResponsiveValue(8, 10, 12),
  lg: getResponsiveValue(12, 14, 16),
  xl: getResponsiveValue(16, 18, 20),
  full: 9999,
};

/**
 * Responsive card dimensions
 */
export const responsiveCardDimensions = {
  width: SCREEN_WIDTH - (responsiveSpacing.md * 2),
  minHeight: getResponsiveValue(80, 100, 120),
  maxHeight: SCREEN_HEIGHT * 0.6,
};

/**
 * Responsive button dimensions
 */
export const responsiveButtonDimensions = {
  height: getResponsiveValue(40, 44, 48),
  minWidth: getResponsiveValue(80, 100, 120),
  borderRadius: responsiveBorderRadius.md,
};

/**
 * Responsive input dimensions
 */
export const responsiveInputDimensions = {
  height: getResponsiveValue(44, 48, 52),
  borderRadius: responsiveBorderRadius.md,
  fontSize: responsiveFontSizes.body,
};

/**
 * Responsive modal dimensions
 */
export const responsiveModalDimensions = {
  width: SCREEN_WIDTH * 0.9,
  maxHeight: SCREEN_HEIGHT * 0.8,
  borderRadius: responsiveBorderRadius.lg,
};

/**
 * Responsive grid configurations
 */
export const responsiveGridConfig = {
  columns: getResponsiveValue(1, 2, 3),
  spacing: responsiveSpacing.md,
  itemWidth: (SCREEN_WIDTH - (responsiveSpacing.md * 3)) / getResponsiveValue(1, 2, 3),
};

/**
 * Responsive list configurations
 */
export const responsiveListConfig = {
  itemHeight: getResponsiveValue(60, 70, 80),
  separatorHeight: 1,
  headerHeight: getResponsiveValue(40, 50, 60),
  footerHeight: getResponsiveValue(40, 50, 60),
};

/**
 * Responsive image dimensions
 */
export const responsiveImageDimensions = {
  avatar: {
    sm: getResponsiveValue(32, 36, 40),
    md: getResponsiveValue(48, 52, 56),
    lg: getResponsiveValue(64, 72, 80),
    xl: getResponsiveValue(80, 88, 96),
  },
  thumbnail: {
    width: getResponsiveValue(80, 100, 120),
    height: getResponsiveValue(80, 100, 120),
  },
  banner: {
    width: SCREEN_WIDTH,
    height: getResponsiveValue(120, 150, 180),
  },
};

/**
 * Responsive shadow configurations
 */
export const responsiveShadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
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
    height: responsiveButtonDimensions.height,
    borderRadius: responsiveButtonDimensions.borderRadius,
    paddingHorizontal: responsiveSpacing.md,
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
    fontSize: responsiveFontSizes.h1,
    fontWeight: 'bold',
    lineHeight: responsiveFontSizes.h1 * 1.2,
  },
  h2: {
    fontSize: responsiveFontSizes.h2,
    fontWeight: 'bold',
    lineHeight: responsiveFontSizes.h2 * 1.2,
  },
  h3: {
    fontSize: responsiveFontSizes.h3,
    fontWeight: '600',
    lineHeight: responsiveFontSizes.h3 * 1.2,
  },
  h4: {
    fontSize: responsiveFontSizes.h4,
    fontWeight: '600',
    lineHeight: responsiveFontSizes.h4 * 1.2,
  },
  h5: {
    fontSize: responsiveFontSizes.h5,
    fontWeight: '500',
    lineHeight: responsiveFontSizes.h5 * 1.2,
  },
  h6: {
    fontSize: responsiveFontSizes.h6,
    fontWeight: '500',
    lineHeight: responsiveFontSizes.h6 * 1.2,
  },
  body: {
    fontSize: responsiveFontSizes.body,
    lineHeight: responsiveFontSizes.body * 1.4,
  },
  bodySmall: {
    fontSize: responsiveFontSizes.bodySmall,
    lineHeight: responsiveFontSizes.bodySmall * 1.4,
  },
  caption: {
    fontSize: responsiveFontSizes.caption,
    lineHeight: responsiveFontSizes.caption * 1.4,
  },
  button: {
    fontSize: responsiveFontSizes.button,
    fontWeight: '600',
  },
  label: {
    fontSize: responsiveFontSizes.label,
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
  button: responsiveLayout.button,
  input: responsiveLayout.input,
  modal: responsiveLayout.modal,
  listItem: responsiveLayout.listItem,
  gridItem: responsiveLayout.gridItem,
});

/**
 * Hook for responsive design
 */
export const useResponsiveDesign = () => {
  const deviceLayout = useDeviceLayout();
  
  return {
    deviceLayout,
    fontSizes: responsiveFontSizes,
    spacing: responsiveSpacing,
    iconSizes: responsiveIconSizes,
    borderRadius: responsiveBorderRadius,
    cardDimensions: responsiveCardDimensions,
    buttonDimensions: responsiveButtonDimensions,
    inputDimensions: responsiveInputDimensions,
    modalDimensions: responsiveModalDimensions,
    gridConfig: responsiveGridConfig,
    listConfig: responsiveListConfig,
    imageDimensions: responsiveImageDimensions,
    shadows: responsiveShadows,
    layout: responsiveLayout,
    textStyles: responsiveTextStyles,
    componentStyles: responsiveComponentStyles,
  };
};

export default {
  fontSizes: responsiveFontSizes,
  spacing: responsiveSpacing,
  iconSizes: responsiveIconSizes,
  borderRadius: responsiveBorderRadius,
  cardDimensions: responsiveCardDimensions,
  buttonDimensions: responsiveButtonDimensions,
  inputDimensions: responsiveInputDimensions,
  modalDimensions: responsiveModalDimensions,
  gridConfig: responsiveGridConfig,
  listConfig: responsiveListConfig,
  imageDimensions: responsiveImageDimensions,
  shadows: responsiveShadows,
  layout: responsiveLayout,
  textStyles: responsiveTextStyles,
  componentStyles: responsiveComponentStyles,
  useResponsiveDesign,
};
