/**
 * Enhanced Button Component
 * Comprehensive button component with all states and accessibility
 */

import React from 'react';
import { TouchableOpacity, StyleSheet, ActivityIndicator, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useResponsiveDesign } from '../../utils/responsiveDesignUtils';

interface EnhancedButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'text' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: any;
  textStyle?: any;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const EnhancedButton: React.FC<EnhancedButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const theme = useTheme();
  const { fontSizes, spacing, buttonDimensions } = useResponsiveDesign();

  const getButtonStyle = () => {
    const baseStyle = {
      borderRadius: buttonDimensions.borderRadius,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      minHeight: buttonDimensions.height,
    };

    // Size variations
    const sizeStyles = {
      small: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        minHeight: 36,
      },
      medium: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        minHeight: 48,
      },
      large: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        minHeight: 56,
      },
    };

    // Variant styles
    const variantStyles = {
      primary: {
        backgroundColor: disabled ? theme.colors.disabled : theme.colors.primary,
        borderWidth: 0,
      },
      secondary: {
        backgroundColor: disabled ? theme.colors.disabled : theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.disabled,
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: disabled ? theme.colors.disabled : theme.colors.primary,
      },
      text: {
        backgroundColor: 'transparent',
        borderWidth: 0,
      },
      danger: {
        backgroundColor: disabled ? theme.colors.disabled : '#E74C3C',
        borderWidth: 0,
      },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...(fullWidth && { width: '100%' }),
    };
  };

  const getTextStyle = () => {
    const baseTextStyle = {
      fontSize: fontSizes.button,
      fontWeight: '600' as const,
      textAlign: 'center' as const,
    };

    const variantTextStyles = {
      primary: {
        color: disabled ? theme.colors.disabled : '#FFFFFF',
      },
      secondary: {
        color: disabled ? theme.colors.disabled : theme.colors.onSurface,
      },
      outline: {
        color: disabled ? theme.colors.disabled : theme.colors.primary,
      },
      text: {
        color: disabled ? theme.colors.disabled : theme.colors.primary,
      },
      danger: {
        color: disabled ? theme.colors.disabled : '#FFFFFF',
      },
    };

    return {
      ...baseTextStyle,
      ...variantTextStyles[variant],
    };
  };

  const getIconSize = () => {
    const sizeMap = {
      small: 16,
      medium: 20,
      large: 24,
    };
    return sizeMap[size];
  };

  const renderIcon = () => {
    if (!icon) return null;

    const iconSize = getIconSize();
    const iconColor = getTextStyle().color;

    return (
      <MaterialCommunityIcons
        name={icon as any}
        size={iconSize}
        color={iconColor}
        style={{
          marginRight: iconPosition === 'left' ? spacing.xs : 0,
          marginLeft: iconPosition === 'right' ? spacing.xs : 0,
        }}
      />
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="small"
            color={getTextStyle().color}
            style={styles.loadingIndicator}
          />
          <Text style={[getTextStyle(), textStyle]}>Yükleniyor...</Text>
        </View>
      );
    }

    return (
      <View style={styles.contentContainer}>
        {iconPosition === 'left' && renderIcon()}
        <Text style={[getTextStyle(), textStyle]}>{title}</Text>
        {iconPosition === 'right' && renderIcon()}
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{
        disabled: disabled || loading,
      }}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingIndicator: {
    marginRight: 8,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default EnhancedButton;
