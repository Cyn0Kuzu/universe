/**
 * 📱 Professional Safe Area Container
 * Android 15+ edge-to-edge ve büyük ekran desteği
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEdgeToEdge, useResponsiveLayout } from '../../hooks/useEdgeToEdge';

interface SafeAreaContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  enableEdgeToEdge?: boolean;
  enableResponsive?: boolean;
}

export const SafeAreaContainer: React.FC<SafeAreaContainerProps> = ({
  children,
  style,
  edges = ['top', 'bottom', 'left', 'right'],
  enableEdgeToEdge = true,
  enableResponsive = true,
}) => {
  const { isEdgeToEdgeEnabled, safeAreaInsets } = useEdgeToEdge();
  const { layoutStyle, isLargeScreen } = useResponsiveLayout();

  // Edge-to-edge desteği varsa ve etkinse SafeAreaView kullan
  if (enableEdgeToEdge && isEdgeToEdgeEnabled) {
    return (
      <SafeAreaView 
        style={[
          styles.container,
          enableResponsive && layoutStyle,
          style
        ]}
        edges={edges}
      >
        {children}
      </SafeAreaView>
    );
  }

  // Fallback: Manual padding ile eski cihaz desteği
  const manualPadding = {
    paddingTop: edges.includes('top') ? safeAreaInsets.top : 0,
    paddingBottom: edges.includes('bottom') ? safeAreaInsets.bottom : 0,
    paddingLeft: edges.includes('left') ? safeAreaInsets.left : 0,
    paddingRight: edges.includes('right') ? safeAreaInsets.right : 0,
  };

  return (
    <View 
      style={[
        styles.container,
        manualPadding,
        enableResponsive && layoutStyle,
        style
      ]}
    >
      {children}
    </View>
  );
};

/**
 * 📐 Responsive Content Container
 * Büyük ekranlar için içerik container'ı
 */
interface ResponsiveContentProps {
  children: React.ReactNode;
  style?: ViewStyle;
  maxWidth?: number;
  centerContent?: boolean;
}

export const ResponsiveContent: React.FC<ResponsiveContentProps> = ({
  children,
  style,
  maxWidth = 768,
  centerContent = true,
}) => {
  const { screenWidth, isLargeScreen } = useResponsiveLayout();

  const contentStyle: ViewStyle = {
    width: '100%',
    ...(isLargeScreen && {
      maxWidth: Math.min(maxWidth, screenWidth * 0.9),
      alignSelf: centerContent ? 'center' : 'flex-start',
    }),
  };

  return (
    <View style={[contentStyle, style]}>
      {children}
    </View>
  );
};

/**
 * 📱 Edge-to-Edge Status Bar
 * Android 15+ için status bar yönetimi
 */
interface EdgeStatusBarProps {
  backgroundColor?: string;
  barStyle?: 'light-content' | 'dark-content';
  translucent?: boolean;
}

export const EdgeStatusBar: React.FC<EdgeStatusBarProps> = ({
  backgroundColor = 'transparent',
  barStyle = 'dark-content',
  translucent = true,
}) => {
  const { isEdgeToEdgeEnabled } = useEdgeToEdge();

  if (!isEdgeToEdgeEnabled) {
    return null;
  }

  // React Native'de StatusBar component'i kullanılacak
  // Bu component sadece Android 15+ için gerekli stilleri sağlar
  return null;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default SafeAreaContainer;
