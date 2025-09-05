/**
 * 🎯 Professional Screen Adapter
 * Android 15+ için tüm ekranların adaptasyonu
 */

import React from 'react';
import { View, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaContainer, ResponsiveContent } from './SafeAreaContainer';
import { useResponsiveLayout } from '../../hooks/useEdgeToEdge';

interface ScreenAdapterProps {
  children: React.ReactNode;
  scrollable?: boolean;
  safeArea?: boolean;
  responsive?: boolean;
  maxWidth?: number;
  backgroundColor?: string;
  padding?: number;
}

export const ScreenAdapter: React.FC<ScreenAdapterProps> = ({
  children,
  scrollable = false,
  safeArea = true,
  responsive = true,
  maxWidth = 768,
  backgroundColor = '#ffffff',
  padding,
}) => {
  const { isLargeScreen, isFoldable, screenWidth } = useResponsiveLayout();

  // Dinamik padding hesaplama
  const dynamicPadding = padding ?? (isLargeScreen ? 24 : 16);

  const containerStyle = {
    backgroundColor,
    minHeight: Dimensions.get('window').height,
  };

  const contentStyle = {
    padding: dynamicPadding,
    ...(isFoldable && {
      paddingHorizontal: 32,
    }),
  };

  const ContentWrapper = ({ children: content }: { children: React.ReactNode }) => {
    if (responsive) {
      return (
        <ResponsiveContent maxWidth={maxWidth} style={contentStyle}>
          {content}
        </ResponsiveContent>
      );
    }
    
    return <View style={contentStyle}>{content}</View>;
  };

  const MainContainer = ({ children: content }: { children: React.ReactNode }) => {
    if (safeArea) {
      return (
        <SafeAreaContainer 
          style={containerStyle}
          enableEdgeToEdge={true}
          enableResponsive={false} // ResponsiveContent handles this
        >
          {content}
        </SafeAreaContainer>
      );
    }
    
    return <View style={[styles.container, containerStyle]}>{content}</View>;
  };

  if (scrollable) {
    return (
      <MainContainer>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <ContentWrapper>
            {children}
          </ContentWrapper>
        </ScrollView>
      </MainContainer>
    );
  }

  return (
    <MainContainer>
      <ContentWrapper>
        {children}
      </ContentWrapper>
    </MainContainer>
  );
};

/**
 * 📱 Quick Screen Presets
 */
export const MobileScreen: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ScreenAdapter
    scrollable={true}
    safeArea={true}
    responsive={true}
    backgroundColor="#f8f9fa"
  >
    {children}
  </ScreenAdapter>
);

export const TabletScreen: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ScreenAdapter
    scrollable={true}
    safeArea={true}
    responsive={true}
    maxWidth={1024}
    backgroundColor="#ffffff"
    padding={32}
  >
    {children}
  </ScreenAdapter>
);

export const FoldableScreen: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ScreenAdapter
    scrollable={false}
    safeArea={true}
    responsive={true}
    maxWidth={1200}
    backgroundColor="#ffffff"
  >
    {children}
  </ScreenAdapter>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});

export default ScreenAdapter;
