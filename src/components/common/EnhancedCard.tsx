/**
 * Enhanced Card Component
 * Comprehensive card component with all states and accessibility
 */

import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useResponsiveDesign } from '../../utils/responsiveDesignUtils';

interface EnhancedCardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  onPress?: () => void;
  variant?: 'default' | 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'small' | 'medium' | 'large';
  margin?: 'none' | 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: any;
  contentStyle?: any;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const EnhancedCard: React.FC<EnhancedCardProps> = ({
  children,
  title,
  subtitle,
  onPress,
  variant = 'default',
  padding = 'medium',
  margin = 'small',
  disabled = false,
  loading = false,
  style,
  contentStyle,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const theme = useTheme();
  const { fontSizes, spacing, shadows, borderRadius } = useResponsiveDesign();

  const getCardStyle = () => {
    const baseStyle = {
      borderRadius: borderRadius.lg,
      backgroundColor: theme.colors.surface,
      overflow: 'hidden' as const,
    };

    const variantStyles = {
      default: {
        ...shadows.sm,
        borderWidth: 0,
      },
      elevated: {
        ...shadows.md,
        borderWidth: 0,
      },
      outlined: {
        borderWidth: 1,
        borderColor: theme.colors.disabled,
        ...shadows.none,
      },
      filled: {
        backgroundColor: theme.colors.surface,
        borderWidth: 0,
        ...shadows.none,
      },
    };

    const paddingStyles = {
      none: { padding: 0 },
      small: { padding: spacing.sm },
      medium: { padding: spacing.md },
      large: { padding: spacing.lg },
    };

    const marginStyles = {
      none: { margin: 0 },
      small: { marginVertical: spacing.sm },
      medium: { marginVertical: spacing.md },
      large: { marginVertical: spacing.lg },
    };

    return {
      ...baseStyle,
      ...variantStyles[variant],
      ...paddingStyles[padding],
      ...marginStyles[margin],
      ...(disabled && { opacity: 0.6 }),
    };
  };

  const getTitleStyle = () => {
    return {
      fontSize: fontSizes.h6,
      fontWeight: '600' as const,
      color: theme.colors.onSurface,
      marginBottom: subtitle ? spacing.xs : spacing.sm,
    };
  };

  const getSubtitleStyle = () => {
    return {
      fontSize: fontSizes.bodySmall,
      color: theme.colors.onSurface,
      marginBottom: spacing.sm,
    };
  };

  const renderHeader = () => {
    if (!title && !subtitle) return null;

    return (
      <View style={styles.header}>
        {title && <Text style={getTitleStyle()}>{title}</Text>}
        {subtitle && <Text style={getSubtitleStyle()}>{subtitle}</Text>}
      </View>
    );
  };

  const renderContent = () => {
    return (
      <View style={[styles.content, contentStyle]}>
        {renderHeader()}
        {children}
      </View>
    );
  };

  if (onPress && !disabled && !loading) {
    return (
      <TouchableOpacity
        style={[getCardStyle(), style]}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={{
          disabled,
        }}
      >
        {renderContent()}
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={[getCardStyle(), style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{
        disabled,
      }}
    >
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    marginBottom: 8,
  },
  content: {
    flex: 1,
  },
});

export default EnhancedCard;
