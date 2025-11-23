import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

interface NotificationBadgeProps {
  count: number;
  maxCount?: number;
  size?: 'small' | 'medium' | 'large';
  color?: string;
  backgroundColor?: string;
  style?: ViewStyle;
  showZero?: boolean;
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count,
  maxCount = 99,
  size = 'medium',
  color,
  backgroundColor,
  style,
  showZero = false
}) => {
  const theme = useTheme();

  // Don't show badge if count is 0 and showZero is false
  if (count <= 0 && !showZero) {
    return null;
  }

  // Format count text
  const getCountText = () => {
    if (count === 0) return '0';
    if (count > maxCount) return `${maxCount}+`;
    return count.toString();
  };

  // Get size styles
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          minWidth: 16,
          height: 16,
          borderRadius: 8,
          fontSize: 10,
          paddingHorizontal: 4,
        };
      case 'large':
        return {
          minWidth: 28,
          height: 28,
          borderRadius: 14,
          fontSize: 14,
          paddingHorizontal: 8,
        };
      case 'medium':
      default:
        return {
          minWidth: 20,
          height: 20,
          borderRadius: 10,
          fontSize: 11,
          paddingHorizontal: 6,
        };
    }
  };

  const sizeStyles = getSizeStyles();
  const badgeColor = color || '#FFFFFF';
  const badgeBgColor = backgroundColor || '#FF5722';

  return (
    <View
      style={[
        styles.badge,
        {
          minWidth: sizeStyles.minWidth,
          height: sizeStyles.height,
          borderRadius: sizeStyles.borderRadius,
          backgroundColor: badgeBgColor,
          paddingHorizontal: sizeStyles.paddingHorizontal,
        },
        style
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            fontSize: sizeStyles.fontSize,
            color: badgeColor,
          }
        ]}
        numberOfLines={1}
      >
        {getCountText()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  text: {
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: undefined, // Let it calculate automatically
  },
});

export default NotificationBadge;
