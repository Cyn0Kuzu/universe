/**
 * Enhanced Input Component
 * Comprehensive input component with validation and accessibility
 */

import React, { useState, useRef } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useResponsiveDesign } from '../../utils/responsiveDesignUtils';

interface EnhancedInputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  secureTextEntry?: boolean;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  required?: boolean;
  style?: any;
  inputStyle?: any;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const EnhancedInput: React.FC<EnhancedInputProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  helperText,
  disabled = false,
  multiline = false,
  numberOfLines = 1,
  maxLength,
  keyboardType = 'default',
  secureTextEntry = false,
  leftIcon,
  rightIcon,
  onRightIconPress,
  required = false,
  style,
  inputStyle,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const theme = useTheme();
  const { fontSizes, spacing, inputDimensions } = useResponsiveDesign();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const hasError = !!error;
  const hasHelperText = !!helperText || !!error;

  const getContainerStyle = () => {
    return {
      marginBottom: hasHelperText ? spacing.md : spacing.sm,
    };
  };

  const getInputContainerStyle = () => {
    const baseStyle = {
      flexDirection: 'row' as const,
      alignItems: multiline ? 'flex-start' : 'center',
      borderWidth: 1,
      borderRadius: inputDimensions.borderRadius,
      paddingHorizontal: spacing.md,
      paddingVertical: multiline ? spacing.sm : spacing.xs,
      minHeight: multiline ? 80 : inputDimensions.height,
      backgroundColor: disabled ? theme.colors.disabled : theme.colors.surface,
    };

    if (hasError) {
      return {
        ...baseStyle,
        borderColor: theme.colors.error,
        borderWidth: 2,
      };
    }

    if (isFocused) {
      return {
        ...baseStyle,
        borderColor: theme.colors.primary,
        borderWidth: 2,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      };
    }

    return {
      ...baseStyle,
      borderColor: theme.colors.outline,
    };
  };

  const getInputStyle = () => {
    return {
      flex: 1,
      fontSize: fontSizes.body,
      color: disabled ? theme.colors.onDisabled : theme.colors.onSurface,
      textAlignVertical: multiline ? 'top' : 'center',
      paddingVertical: 0,
      paddingHorizontal: 0,
    };
  };

  const getLabelStyle = () => {
    return {
      fontSize: fontSizes.label,
      fontWeight: '500' as const,
      color: hasError ? theme.colors.error : theme.colors.onSurface,
      marginBottom: spacing.xs,
    };
  };

  const getHelperTextStyle = () => {
    return {
      fontSize: fontSizes.caption,
      color: hasError ? theme.colors.error : theme.colors.onSurfaceVariant,
      marginTop: spacing.xs,
    };
  };

  const renderLeftIcon = () => {
    if (!leftIcon) return null;

    return (
      <MaterialCommunityIcons
        name={leftIcon as any}
        size={20}
        color={disabled ? theme.colors.onDisabled : theme.colors.onSurfaceVariant}
        style={styles.leftIcon}
      />
    );
  };

  const renderRightIcon = () => {
    if (!rightIcon && !secureTextEntry) return null;

    if (secureTextEntry) {
      return (
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={styles.rightIconContainer}
          accessibilityRole="button"
          accessibilityLabel={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
        >
          <MaterialCommunityIcons
            name={showPassword ? 'eye-off' : 'eye'}
            size={20}
            color={disabled ? theme.colors.onDisabled : theme.colors.onSurfaceVariant}
          />
        </TouchableOpacity>
      );
    }

    if (rightIcon && onRightIconPress) {
      return (
        <TouchableOpacity
          onPress={onRightIconPress}
          style={styles.rightIconContainer}
          accessibilityRole="button"
          accessibilityLabel="Sağ ikon"
        >
          <MaterialCommunityIcons
            name={rightIcon as any}
            size={20}
            color={disabled ? theme.colors.onDisabled : theme.colors.onSurfaceVariant}
          />
        </TouchableOpacity>
      );
    }

    return null;
  };

  const renderCharCount = () => {
    if (!maxLength) return null;

    return (
      <Text style={styles.charCount}>
        {value.length}/{maxLength}
      </Text>
    );
  };

  return (
    <View style={[getContainerStyle(), style]}>
      {label && (
        <Text style={getLabelStyle()}>
          {label}
          {required && <Text style={{ color: theme.colors.error }}> *</Text>}
        </Text>
      )}
      
      <View style={getInputContainerStyle()}>
        {renderLeftIcon()}
        
        <TextInput
          ref={inputRef}
          style={[getInputStyle(), inputStyle]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.onSurfaceVariant}
          editable={!disabled}
          multiline={multiline}
          numberOfLines={numberOfLines}
          maxLength={maxLength}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry && !showPassword}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          accessibilityLabel={accessibilityLabel || label}
          accessibilityHint={accessibilityHint}
          accessibilityState={{
            disabled,
          }}
        />
        
        {renderRightIcon()}
      </View>
      
      {hasHelperText && (
        <View style={styles.helperContainer}>
          <Text style={getHelperTextStyle()}>
            {error || helperText}
          </Text>
          {renderCharCount()}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  leftIcon: {
    marginRight: 8,
  },
  rightIconContainer: {
    marginLeft: 8,
    padding: 4,
  },
  helperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  charCount: {
    fontSize: 12,
    color: '#666',
  },
});

export default EnhancedInput;
