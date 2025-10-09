/**
 * Universal Screen Component
 * Comprehensive screen wrapper for all devices and orientations
 */

import React from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useDeviceLayout, getContentPadding } from '../utils/deviceLayoutUtils';
import { OptimizedSafeAreaView } from './OptimizedSafeAreaView';

interface UniversalScreenProps {
  children: React.ReactNode;
  style?: any;
  backgroundColor?: string;
  scrollable?: boolean;
  keyboardAvoiding?: boolean;
  avoidNavigationBar?: boolean;
  avoidStatusBar?: boolean;
  contentPadding?: boolean;
  horizontalPadding?: number;
  verticalPadding?: number;
}

export const UniversalScreen: React.FC<UniversalScreenProps> = ({
  children,
  style,
  backgroundColor = '#ffffff',
  scrollable = false,
  keyboardAvoiding = false,
  avoidNavigationBar = true,
  avoidStatusBar = false,
  contentPadding = true,
  horizontalPadding,
  verticalPadding,
}) => {
  const deviceLayout = useDeviceLayout();
  
  // Calculate padding
  const padding = contentPadding ? getContentPadding() : {};
  const customPadding = {
    paddingHorizontal: horizontalPadding !== undefined ? horizontalPadding : padding.paddingLeft,
    paddingVertical: verticalPadding !== undefined ? verticalPadding : 0,
  };
  
  const containerStyle = [
    styles.container,
    { backgroundColor },
    padding,
    customPadding,
    style,
  ];
  
  const content = (
    <OptimizedSafeAreaView
      backgroundColor={backgroundColor}
      avoidNavigationBar={avoidNavigationBar}
      avoidStatusBar={avoidStatusBar}
      style={containerStyle}
    >
      {scrollable ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        children
      )}
    </OptimizedSafeAreaView>
  );
  
  if (keyboardAvoiding) {
    return (
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {content}
      </KeyboardAvoidingView>
    );
  }
  
  return content;
};

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
  keyboardAvoidingView: {
    flex: 1,
  },
});

export default UniversalScreen;
