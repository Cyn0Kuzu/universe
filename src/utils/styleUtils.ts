/**
 * 🎨 Style Utilities
 * Modern styling helpers and utilities for consistent UI
 */

import { Platform, StatusBar, Dimensions } from 'react-native';
import { 
  spacing, 
  borderRadius, 
  shadows, 
  typography, 
  neutralColors, 
  brandColors,
  semanticColors 
} from '../theme';

// Get device dimensions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Platform-specific styling
 */
export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';

/**
 * Safe area utilities
 */
export const getStatusBarHeight = (): number => {
  return Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0;
};

export const getBottomSafeAreaHeight = (): number => {
  return Platform.OS === 'ios' ? 34 : 0;
};

/**
 * Responsive utilities
 */
export const isSmallDevice = SCREEN_WIDTH < 375;
export const isMediumDevice = SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414;
export const isLargeDevice = SCREEN_WIDTH >= 414;
export const isTablet = SCREEN_WIDTH >= 768;

/**
 * Get responsive value based on screen size
 */
export const responsive = <T>(small: T, medium?: T, large?: T): T => {
  if (isSmallDevice) return small;
  if (isMediumDevice && medium) return medium;
  if (isLargeDevice && large) return large;
  return medium || small;
};

/**
 * Container styles with consistent spacing
 */
export const containerStyles = {
  screen: {
    flex: 1,
    backgroundColor: neutralColors.gray50,
  },
  safeArea: {
    flex: 1,
    paddingTop: getStatusBarHeight(),
    backgroundColor: neutralColors.white,
  },
  content: {
    flex: 1,
    padding: spacing[4],
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: spacing[4],
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing[8],
  },
} as const;

/**
 * Common card styles
 */
export const cardStyles = {
  base: {
    backgroundColor: neutralColors.white,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[4],
    ...shadows.base,
  },
  elevated: {
    backgroundColor: neutralColors.white,
    borderRadius: borderRadius.xl,
    padding: spacing[6],
    marginBottom: spacing[4],
    ...shadows.lg,
  },
  flat: {
    backgroundColor: neutralColors.white,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
    borderWidth: 1,
    borderColor: neutralColors.gray200,
  },
} as const;

/**
 * Typography presets for consistent text styling
 */
export const textStyles = {
  // Headings
  h1: {
    fontSize: typography.fontSize['4xl'],
    fontWeight: '700' as const,
    lineHeight: typography.fontSize['4xl'] * typography.lineHeight.tight,
    color: neutralColors.gray900,
  },
  h2: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: '600' as const,
    lineHeight: typography.fontSize['3xl'] * typography.lineHeight.tight,
    color: neutralColors.gray900,
  },
  h3: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '600' as const,
    lineHeight: typography.fontSize['2xl'] * typography.lineHeight.snug,
    color: neutralColors.gray800,
  },
  h4: {
    fontSize: typography.fontSize.xl,
    fontWeight: '500' as const,
    lineHeight: typography.fontSize.xl * typography.lineHeight.snug,
    color: neutralColors.gray800,
  },
  
  // Body text
  body: {
    fontSize: typography.fontSize.md,
    fontWeight: '400' as const,
    lineHeight: typography.fontSize.md * typography.lineHeight.normal,
    color: neutralColors.gray700,
  },
  bodySmall: {
    fontSize: typography.fontSize.base,
    fontWeight: '400' as const,
    lineHeight: typography.fontSize.base * typography.lineHeight.normal,
    color: neutralColors.gray600,
  },
  
  // Labels and captions
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500' as const,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
    color: neutralColors.gray700,
  },
  caption: {
    fontSize: typography.fontSize.xs,
    fontWeight: '400' as const,
    lineHeight: typography.fontSize.xs * typography.lineHeight.normal,
    color: neutralColors.gray500,
  },
  
  // Interactive text
  link: {
    fontSize: typography.fontSize.md,
    fontWeight: '500' as const,
    color: brandColors.primary,
    textDecorationLine: 'underline' as const,
  },
  button: {
    fontSize: typography.fontSize.md,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
  },
} as const;

/**
 * Button style presets
 */
export const buttonStyles = {
  primary: {
    backgroundColor: brandColors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    minHeight: 48,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    ...shadows.sm,
  },
  secondary: {
    backgroundColor: neutralColors.white,
    borderWidth: 1,
    borderColor: brandColors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    minHeight: 48,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  accent: {
    backgroundColor: brandColors.accent,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    minHeight: 48,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    ...shadows.sm,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    minHeight: 48,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  destructive: {
    backgroundColor: semanticColors.error,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    minHeight: 48,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    ...shadows.sm,
  },
} as const;

/**
 * Input field styles
 */
export const inputStyles = {
  base: {
    borderWidth: 1,
    borderColor: neutralColors.gray300,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: typography.fontSize.base,
    backgroundColor: neutralColors.white,
    minHeight: 48,
  },
  focused: {
    borderColor: brandColors.primary,
    ...shadows.sm,
  },
  error: {
    borderColor: semanticColors.error,
  },
  disabled: {
    backgroundColor: neutralColors.gray100,
    borderColor: neutralColors.gray200,
    color: neutralColors.gray400,
  },
} as const;

/**
 * Flex utilities
 */
export const flexStyles = {
  row: {
    flexDirection: 'row' as const,
  },
  column: {
    flexDirection: 'column' as const,
  },
  center: {
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
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
  alignStart: {
    alignItems: 'flex-start' as const,
  },
  alignEnd: {
    alignItems: 'flex-end' as const,
  },
  alignCenter: {
    alignItems: 'center' as const,
  },
  justifyStart: {
    justifyContent: 'flex-start' as const,
  },
  justifyEnd: {
    justifyContent: 'flex-end' as const,
  },
  justifyCenter: {
    justifyContent: 'center' as const,
  },
} as const;

/**
 * Create margin/padding utilities
 */
export const createSpacingStyles = (type: 'margin' | 'padding') => {
  const styleKey = type === 'margin' ? 'm' : 'p';
  const propertyPrefix = type === 'margin' ? 'margin' : 'padding';
  
  const styles: Record<string, any> = {};
  
  Object.entries(spacing).forEach(([key, value]) => {
    styles[`${styleKey}${key}`] = { [propertyPrefix]: value };
    styles[`${styleKey}t${key}`] = { [`${propertyPrefix}Top`]: value };
    styles[`${styleKey}r${key}`] = { [`${propertyPrefix}Right`]: value };
    styles[`${styleKey}b${key}`] = { [`${propertyPrefix}Bottom`]: value };
    styles[`${styleKey}l${key}`] = { [`${propertyPrefix}Left`]: value };
    styles[`${styleKey}x${key}`] = { 
      [`${propertyPrefix}Left`]: value,
      [`${propertyPrefix}Right`]: value 
    };
    styles[`${styleKey}y${key}`] = { 
      [`${propertyPrefix}Top`]: value,
      [`${propertyPrefix}Bottom`]: value 
    };
  });
  
  return styles;
};

export const marginStyles = createSpacingStyles('margin');
export const paddingStyles = createSpacingStyles('padding');

/**
 * Color utilities
 */
export const colorStyles = {
  primary: { color: brandColors.primary },
  accent: { color: brandColors.accent },
  success: { color: semanticColors.success },
  warning: { color: semanticColors.warning },
  error: { color: semanticColors.error },
  info: { color: semanticColors.info },
  muted: { color: neutralColors.gray500 },
  white: { color: neutralColors.white },
  black: { color: neutralColors.black },
} as const;

/**
 * Background color utilities
 */
export const backgroundStyles = {
  primary: { backgroundColor: brandColors.primary },
  accent: { backgroundColor: brandColors.accent },
  success: { backgroundColor: semanticColors.success },
  warning: { backgroundColor: semanticColors.warning },
  error: { backgroundColor: semanticColors.error },
  info: { backgroundColor: semanticColors.info },
  white: { backgroundColor: neutralColors.white },
  gray50: { backgroundColor: neutralColors.gray50 },
  gray100: { backgroundColor: neutralColors.gray100 },
  gray200: { backgroundColor: neutralColors.gray200 },
  transparent: { backgroundColor: 'transparent' },
} as const;
