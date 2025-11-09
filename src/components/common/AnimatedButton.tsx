/**
 * Animated Button Component
 * Professional button with scale animation on press
 */

import React, { useRef } from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  Animated,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useResponsiveDesign } from '../../utils/responsiveDesignUtils';

interface AnimatedButtonProps extends TouchableOpacityProps {
  title?: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  iconSize?: number;
  iconColor?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  fullWidth?: boolean;
  buttonStyle?: ViewStyle;
  textStyle?: TextStyle;
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  title,
  icon,
  iconSize,
  iconColor,
  variant = 'primary',
  size = 'medium',
  loading = false,
  fullWidth = false,
  buttonStyle,
  textStyle,
  children,
  onPress,
  disabled,
  ...props
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const { spacing, fontSizes, borderRadius } = useResponsiveDesign();

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: '#1976D2',
          borderWidth: 0,
        };
      case 'secondary':
        return {
          backgroundColor: '#FFC107',
          borderWidth: 0,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderColor: '#1976D2',
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderWidth: 0,
        };
      default:
        return {};
    }
  };

  const getSizeStyle = (): ViewStyle => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          borderRadius: borderRadius.sm,
        };
      case 'large':
        return {
          paddingVertical: spacing.lg,
          paddingHorizontal: spacing.xl,
          borderRadius: borderRadius.lg,
        };
      case 'medium':
      default:
        return {
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          borderRadius: borderRadius.md,
        };
    }
  };

  const getTextColor = (): string => {
    if (variant === 'outline' || variant === 'ghost') {
      return '#1976D2';
    }
    return '#FFFFFF';
  };

  return (
    <TouchableOpacity
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...props}
    >
      <Animated.View
        style={[
          styles.button,
          getVariantStyle(),
          getSizeStyle(),
          fullWidth && styles.fullWidth,
          disabled && styles.disabled,
          buttonStyle,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        {icon && (
          <MaterialCommunityIcons
            name={icon}
            size={iconSize || fontSizes.lg}
            color={iconColor || getTextColor()}
            style={title ? { marginRight: spacing.sm } : undefined}
          />
        )}
        {title && (
          <Animated.Text
            style={[
              styles.text,
              { color: getTextColor(), fontSize: fontSizes.md },
              textStyle,
            ]}
          >
            {title}
          </Animated.Text>
        )}
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: '600',
  },
});

export default AnimatedButton;


































