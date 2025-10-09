import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar, Platform, StyleSheet, ViewStyle } from 'react-native';

interface ScreenProps {
  children: React.ReactNode;
  style?: ViewStyle;
  backgroundColor?: string;
  statusBarStyle?: 'light-content' | 'dark-content' | 'default';
  statusBarBackgroundColor?: string;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

const Screen: React.FC<ScreenProps> = ({
  children,
  style,
  backgroundColor = '#ffffff',
  statusBarStyle = 'dark-content',
  statusBarBackgroundColor,
  edges = ['top', 'bottom'],
}) => {
  return (
    <>
      <StatusBar
        barStyle={statusBarStyle}
        backgroundColor={statusBarBackgroundColor || backgroundColor}
      />
      <SafeAreaView
        style={[styles.container, { backgroundColor }, style]}
        edges={edges}
      >
        {children}
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 0 : 0, // SafeAreaView handles this
  },
});

export default Screen;


