/**
 * SafeContainer Component
 * 
 * A wrapper component that prevents SafeAreaView layout timeout issues
 * by providing a proper View hierarchy and timeout handling
 */

import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';

interface SafeContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  edges?: readonly Edge[];
  backgroundColor?: string;
}

/**
 * SafeContainer - Use this instead of direct SafeAreaView to prevent timeout warnings
 * 
 * @example
 * <SafeContainer style={{ flex: 1 }}>
 *   <Text>Your content here</Text>
 * </SafeContainer>
 * 
 * @example
 * // With custom edges
 * <SafeContainer edges={['top', 'bottom']}>
 *   <Text>Content with top and bottom safe areas</Text>
 * </SafeContainer>
 */
export const SafeContainer: React.FC<SafeContainerProps> = ({
  children,
  style,
  edges = ['top', 'bottom'],
  backgroundColor,
}) => {
  return (
    <View 
      style={[
        styles.container, 
        backgroundColor ? { backgroundColor } : null,
        style
      ]}
    >
      <SafeAreaView 
        style={styles.safeArea}
        edges={edges}
      >
        {children}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
});

/**
 * SafeScrollContainer - For scrollable content with safe area insets
 */
interface SafeScrollContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  edges?: readonly Edge[];
}

export const SafeScrollContainer: React.FC<SafeScrollContainerProps> = ({
  children,
  style,
  contentContainerStyle,
  edges = ['top', 'bottom'],
}) => {
  return (
    <View style={[styles.container, style]}>
      <SafeAreaView 
        style={styles.safeArea}
        edges={edges}
      >
        <View style={contentContainerStyle}>
          {children}
        </View>
      </SafeAreaView>
    </View>
  );
};

export default SafeContainer;







