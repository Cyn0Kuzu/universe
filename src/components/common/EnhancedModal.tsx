/**
 * Enhanced Modal Component
 * Comprehensive modal component with all states and accessibility
 */

import React, { useEffect } from 'react';
import { Modal, StyleSheet, View, TouchableOpacity, Dimensions } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useResponsiveDesign } from '../../utils/responsiveDesignUtils';
import { BlurView } from 'expo-blur';

interface EnhancedModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  variant?: 'default' | 'fullscreen' | 'bottomSheet' | 'center';
  size?: 'small' | 'medium' | 'large' | 'full';
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  animationType?: 'slide' | 'fade' | 'none';
  style?: any;
  contentStyle?: any;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const EnhancedModal: React.FC<EnhancedModalProps> = ({
  visible,
  onClose,
  title,
  children,
  variant = 'default',
  size = 'medium',
  showCloseButton = true,
  closeOnBackdrop = true,
  animationType = 'slide',
  style,
  contentStyle,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const theme = useTheme();
  const { fontSizes, spacing, shadows, borderRadius } = useResponsiveDesign();
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  useEffect(() => {
    if (visible) {
      // Prevent body scroll when modal is open
      // This is handled by React Native Modal component
    }
  }, [visible]);

  const getModalStyle = () => {
    const baseStyle = {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    };

    const variantStyles = {
      default: baseStyle,
      fullscreen: {
        flex: 1,
        backgroundColor: theme.colors.background,
      },
      bottomSheet: {
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      },
      center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      },
    };

    return variantStyles[variant];
  };

  const getContentStyle = () => {
    const baseStyle = {
      backgroundColor: theme.colors.surface,
      borderRadius: borderRadius.lg,
      ...shadows.lg,
    };

    const sizeStyles = {
      small: {
        width: screenWidth * 0.8,
        maxHeight: screenHeight * 0.4,
      },
      medium: {
        width: screenWidth * 0.9,
        maxHeight: screenHeight * 0.7,
      },
      large: {
        width: screenWidth * 0.95,
        maxHeight: screenHeight * 0.85,
      },
      full: {
        width: screenWidth,
        height: screenHeight,
        borderRadius: 0,
      },
    };

    const variantStyles = {
      default: sizeStyles[size],
      fullscreen: {
        width: screenWidth,
        height: screenHeight,
        borderRadius: 0,
      },
      bottomSheet: {
        width: screenWidth,
        maxHeight: screenHeight * 0.8,
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
      },
      center: sizeStyles[size],
    };

    return {
      ...baseStyle,
      ...variantStyles[variant],
    };
  };

  const getHeaderStyle = () => {
    return {
      flexDirection: 'row' as const,
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline,
    };
  };

  const getTitleStyle = () => {
    return {
      fontSize: fontSizes.h5,
      fontWeight: '600' as const,
      color: theme.colors.onSurface,
      flex: 1,
    };
  };

  const renderHeader = () => {
    if (!title && !showCloseButton) return null;

    return (
      <View style={getHeaderStyle()}>
        {title && <Text style={getTitleStyle()}>{title}</Text>}
        {showCloseButton && (
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel="Modalı kapat"
          >
            <MaterialCommunityIcons
              name="close"
              size={24}
              color={theme.colors.onSurface}
            />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderContent = () => {
    return (
      <View style={[getContentStyle(), contentStyle]}>
        {renderHeader()}
        <View style={styles.body}>
          {children}
        </View>
      </View>
    );
  };

  const renderBackdrop = () => {
    if (!closeOnBackdrop) return null;

    return (
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Modalı kapat"
      />
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={variant !== 'fullscreen'}
      animationType={animationType}
      onRequestClose={onClose}
      statusBarTranslucent={variant === 'fullscreen'}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
    >
      <View style={[getModalStyle(), style]}>
        {renderBackdrop()}
        {renderContent()}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
  },
  body: {
    flex: 1,
    padding: 16,
  },
});

export default EnhancedModal;
