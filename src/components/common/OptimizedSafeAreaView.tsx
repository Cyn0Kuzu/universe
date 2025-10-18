/**
 * Optimized SafeAreaView Component
 * Enhanced SafeAreaView with comprehensive device support
 */

import React, { useEffect, useState, useCallback } from 'react';
import { SafeAreaView, Platform, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOptimizedSafeArea } from '../utils/reanimatedOptimizer';
import { getDeviceLayoutConfig, getContentPadding } from '../../utils/deviceLayoutUtils';

interface OptimizedSafeAreaViewProps {
  children: React.ReactNode;
  style?: any;
  backgroundColor?: string;
  fallbackPadding?: boolean;
  layoutId?: string;
  avoidNavigationBar?: boolean;
  avoidStatusBar?: boolean;
}

export const OptimizedSafeAreaView: React.FC<OptimizedSafeAreaViewProps> = ({
  children,
  style,
  backgroundColor = '#ffffff',
  fallbackPadding = true,
  layoutId = 'safe-area',
  avoidNavigationBar = false,
  avoidStatusBar = false,
}) => {
  const insets = useSafeAreaInsets();
  const safeAreaInsets = useOptimizedSafeArea();
  const [layoutReady, setLayoutReady] = useState(false);
  const [timeoutReached, setTimeoutReached] = useState(false);
  
  // Get device layout configuration
  const deviceLayout = getDeviceLayoutConfig(insets);

  // Layout timeout prevention - optimized timeout handling
  useEffect(() => {
    // Set a shorter timeout to prevent infinite waiting
    const timeout = setTimeout(() => {
      if (!layoutReady) {
        console.warn(`SafeAreaView layout timeout for ${layoutId}, using fallback`);
        setTimeoutReached(true);
        setLayoutReady(true);
      }
    }, 200); // Reduced to 200ms for faster fallback

    // Auto-set layout ready after a very short delay to prevent timeout
    const autoReadyTimeout = setTimeout(() => {
      if (!layoutReady) {
        setLayoutReady(true);
      }
    }, 100);

    return () => {
      clearTimeout(timeout);
      clearTimeout(autoReadyTimeout);
    };
  }, [layoutId, layoutReady]);

  // Handle layout completion
  const onLayout = useCallback(() => {
    if (!layoutReady) {
      setLayoutReady(true);
      // handleLayoutComplete(layoutId);
    }
  }, [layoutReady, layoutId]);

  // Fallback styles for when SafeAreaView fails
  const fallbackStyles = fallbackPadding ? {
    paddingTop: avoidStatusBar ? 0 : deviceLayout.safeAreaInsets.top,
    paddingBottom: avoidNavigationBar ? 0 : deviceLayout.safeAreaInsets.bottom,
    paddingLeft: deviceLayout.safeAreaInsets.left,
    paddingRight: deviceLayout.safeAreaInsets.right,
  } : {};

  const containerStyle = [
    styles.container,
    { backgroundColor },
    fallbackStyles,
    style
  ];

  // If timeout reached or layout is not active, use fallback
  if (timeoutReached) {
    return (
      <View style={containerStyle} onLayout={onLayout}>
        {children}
      </View>
    );
  }

  return (
    <SafeAreaView 
      style={containerStyle} 
      onLayout={onLayout}
    >
      {children}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default OptimizedSafeAreaView;

