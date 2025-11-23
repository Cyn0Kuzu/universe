// @ts-ignore - DefaultTheme may not be exported in some versions
import { MD3LightTheme, DefaultTheme as PaperDefaultTheme } from 'react-native-paper';
import { Dimensions, Platform } from 'react-native';

// 🎨 Modern Design System - Universe App
// Professional color palette with accessibility in mind

// Primary Brand Colors
const brandColors = {
  primary: '#0066B3',      // University Blue - Main brand color
  primaryLight: '#3498db', // Lighter shade for hover/active states  
  primaryDark: '#003366',  // Darker shade for emphasis
  accent: '#FFA500',       // Orange accent for CTAs and highlights
  accentLight: '#FFB84D',  // Light orange for subtle accents
  accentDark: '#E6940A',   // Dark orange for pressed states
} as const;

// Semantic Colors
const semanticColors = {
  success: '#27AE60',      // Green for success states
  warning: '#F39C12',      // Amber for warnings
  error: '#E74C3C',        // Red for errors and destructive actions
  info: '#3498DB',         // Blue for informational messages
} as const;

// Neutral Colors - Modern grayscale palette
const neutralColors = {
  white: '#FFFFFF',
  gray50: '#F8F9FA',       // Lightest gray - backgrounds
  gray100: '#F1F3F4',      // Very light gray - subtle borders
  gray200: '#E1E4E8',      // Light gray - dividers
  gray300: '#D0D7DE',      // Medium-light gray - disabled text
  gray400: '#9CA3AF',      // Medium gray - placeholders
  gray500: '#6B7280',      // True gray - secondary text
  gray600: '#4B5563',      // Dark gray - primary text
  gray700: '#374151',      // Darker gray - headings
  gray800: '#1F2937',      // Very dark gray - emphasis
  gray900: '#111827',      // Almost black - high contrast text
  black: '#000000',
} as const;

// Screen Dimensions
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Typography Scale - Modern type system
const typography = {
  // Font Families
  fontFamily: {
    regular: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    medium: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto-Medium',
    semiBold: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto-Medium',
    bold: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto-Bold',
  },
  
  // Font Sizes
  fontSize: {
    xs: 10,    // 10px - Captions, labels
    sm: 12,    // 12px - Small text, metadata
    base: 14,  // 14px - Body text
    md: 16,    // 16px - Primary body text
    lg: 18,    // 18px - Large body text
    xl: 20,    // 20px - H4 headings
    '2xl': 24, // 24px - H3 headings
    '3xl': 30, // 30px - H2 headings
    '4xl': 36, // 36px - H1 headings
    '5xl': 48, // 48px - Display text
  },
  
  // Line Heights
  lineHeight: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },
  
  // Letter Spacing
  letterSpacing: {
    tighter: -0.05,
    tight: -0.025,
    normal: 0,
    wide: 0.025,
    wider: 0.05,
    widest: 0.1,
  },
} as const;

// Spacing Scale - Consistent spacing system
const spacing = {
  0: 0,
  1: 4,     // 4px
  2: 8,     // 8px
  3: 12,    // 12px
  4: 16,    // 16px
  5: 20,    // 20px
  6: 24,    // 24px
  8: 32,    // 32px
  10: 40,   // 40px
  12: 48,   // 48px
  16: 64,   // 64px
  20: 80,   // 80px
  24: 96,   // 96px
  32: 128,  // 128px
  40: 160,  // 160px
  48: 192,  // 192px
  56: 224,  // 224px
  64: 256,  // 256px
} as const;

// Border Radius Scale
const borderRadius = {
  none: 0,
  sm: 2,
  base: 4,
  md: 6,
  lg: 8,
  xl: 12,
  '2xl': 16,
  '3xl': 24,
  full: 999,
} as const;

// Shadow System - Elevation-based shadows
const shadows = {
  none: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  base: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
  xl: {
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 12,
  },
} as const;

// Layout constants
const layout = {
  screenWidth,
  screenHeight,
  isSmallDevice: screenWidth < 375,
  isTablet: screenWidth >= 768,
  headerHeight: Platform.OS === 'ios' ? 88 : 64,
  tabBarHeight: Platform.OS === 'ios' ? 83 : 56,
  containerPadding: spacing[4],
  cardPadding: spacing[4],
  sectionSpacing: spacing[6],
} as const;

// Component-specific styles
const componentStyles = {
  button: {
    height: 48,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[6],
  },
  input: {
    height: 48,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[4],
    fontSize: typography.fontSize.base,
  },
  card: {
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[4],
    ...shadows.base,
  },
  modal: {
    borderRadius: borderRadius['2xl'],
    padding: spacing[6],
    margin: spacing[4],
    ...shadows.lg,
  },
} as const;

// Helper to ensure we always have a base Paper theme object with colors/fonts defined
const fallbackPaperTheme = {
  colors: {
    primary: '#6200ee',
    background: '#ffffff',
    surface: '#ffffff',
    text: '#000000',
    onSurface: '#000000',
    disabled: '#f0f0f0',
    placeholder: '#aaaaaa',
    backdrop: 'rgba(0, 0, 0, 0.5)',
    notification: '#f50057',
  },
  fonts: {
    regular: { fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto', fontWeight: '400' as const },
    medium: { fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto-Medium', fontWeight: '500' as const },
    light: { fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto-Light', fontWeight: '300' as const },
    thin: { fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto-Thin', fontWeight: '100' as const },
  },
  animation: { scale: 1 },
};

const basePaperTheme =
  (MD3LightTheme as any) ??
  (PaperDefaultTheme as any) ??
  fallbackPaperTheme;

// Modern Theme Configuration with enhanced accessibility
const theme = {
  ...basePaperTheme,
  colors: {
    ...(basePaperTheme?.colors ?? fallbackPaperTheme.colors),
    // Brand Colors
    primary: brandColors.primary,
    primaryContainer: brandColors.primaryLight,
    accent: brandColors.accent,
    
    // Semantic Colors
    success: semanticColors.success,
    warning: semanticColors.warning,
    error: semanticColors.error,
    info: semanticColors.info,
    
    // Neutral Colors with improved contrast
    background: neutralColors.gray50,
    surface: neutralColors.white,
    surfaceVariant: neutralColors.gray100,
    text: neutralColors.gray800, // Improved contrast
    onSurface: neutralColors.gray700, // Improved contrast
    onSurfaceVariant: neutralColors.gray600, // Improved contrast
    placeholder: neutralColors.gray500,
    disabled: neutralColors.gray300,
    backdrop: 'rgba(0, 0, 0, 0.5)',
    notification: brandColors.accent,
    
    // Custom Theme Colors
    brand: brandColors,
    semantic: semanticColors,
    neutral: neutralColors,
    
    // Additional accessibility colors
    onDisabled: neutralColors.gray500,
    onBackground: neutralColors.gray800,
    onPrimary: neutralColors.white,
    outline: neutralColors.gray300,
    outlineVariant: neutralColors.gray200,
  },
  
  // Typography
  fonts: {
    ...(basePaperTheme?.fonts ?? fallbackPaperTheme.fonts),
    regular: {
      fontFamily: typography.fontFamily.regular,
      fontWeight: '400' as const,
    },
    medium: {
      fontFamily: typography.fontFamily.medium,
      fontWeight: '500' as const,
    },
    bold: {
      fontFamily: typography.fontFamily.bold,
      fontWeight: '700' as const,
    },
    light: {
      fontFamily: typography.fontFamily.regular,
      fontWeight: '300' as const,
    },
  },
  
  // Font sizes for compatibility
  fontSizes: {
    xs: typography.fontSize.xs,
    sm: typography.fontSize.sm,
    md: typography.fontSize.md,
    lg: typography.fontSize.lg,
    xl: typography.fontSize.xl,
    xxl: typography.fontSize['2xl'],
    xxxl: typography.fontSize['3xl'],
    title: typography.fontSize['3xl'],
    header: typography.fontSize['4xl'],
    tab: typography.fontSize.md,
    // Additional sizes for compatibility
    h1: typography.fontSize['4xl'],
    h2: typography.fontSize['3xl'],
    h3: typography.fontSize['2xl'],
    h4: typography.fontSize.xl,
    h5: typography.fontSize.lg,
    h6: typography.fontSize.md,
    body: typography.fontSize.md,
    bodySmall: typography.fontSize.sm,
    caption: typography.fontSize.xs,
    label: typography.fontSize.sm,
    button: typography.fontSize.md,
  },
  
  // Shadows for compatibility
  shadows: shadows,
  
  // Modern rounded corners
  roundness: borderRadius.lg,
  
  // Animation timing
  animation: basePaperTheme?.animation ?? fallbackPaperTheme.animation,
} as const;

// Utility functions for theme usage
export const getSpacing = (multiplier: keyof typeof spacing) => spacing[multiplier];
export const getFontSize = (size: keyof typeof typography.fontSize) => typography.fontSize[size];
export const getBorderRadius = (size: keyof typeof borderRadius) => borderRadius[size];
export const getShadow = (elevation: keyof typeof shadows) => shadows[elevation];

// Export all design system parts
export {
  brandColors,
  semanticColors,
  neutralColors,
  typography,
  spacing,
  borderRadius,
  shadows,
  layout,
  componentStyles,
};

// Default export
export default theme;
