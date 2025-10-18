import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Image, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from 'react-native-paper';
import { CustomTheme } from '../../types/theme';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const baseTheme = useTheme();
  const theme = baseTheme as unknown as CustomTheme;
  
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const backgroundOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fixed splash screen with exactly 2 seconds duration
    const startAnimation = () => {
      console.log('🎬 Starting splash screen animation');
      
      // Background fade in first
      Animated.timing(backgroundOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      // Logo animation sequence - exactly 2 seconds total
      const logoAnimation = Animated.sequence([
        // Logo appears with scale and fade (500ms)
        Animated.parallel([
          Animated.timing(logoOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.spring(logoScale, {
            toValue: 1,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          }),
        ]),
        // Hold for 1 second (total 1.5s so far)
        Animated.delay(1000),
        // Fade out (500ms) - total exactly 2 seconds
        Animated.parallel([
          Animated.timing(logoOpacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(backgroundOpacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ]);

      logoAnimation.start(() => {
        console.log('✅ Splash screen animation completed after exactly 2 seconds, calling onFinish');
        onFinish();
      });
    };

    // Start animation immediately
    const timer = setTimeout(startAnimation, 50);

    // Safety timeout to ensure splash screen never hangs (2.5 seconds max)
    const safetyTimeout = setTimeout(() => {
      console.log('⚠️ Splash screen safety timeout triggered after 2.5s, forcing completion');
      onFinish();
    }, 2500);

    // Cleanup function to prevent memory leaks
    return () => {
      clearTimeout(timer);
      clearTimeout(safetyTimeout);
      logoOpacity.stopAnimation();
      logoScale.stopAnimation();
      backgroundOpacity.stopAnimation();
    };
  }, [logoOpacity, logoScale, backgroundOpacity, onFinish]);

  return (
    <Animated.View style={[
      styles.container, 
      { 
        backgroundColor: theme.colors.background,
        opacity: backgroundOpacity
      }
    ]}>
      <StatusBar style="auto" />
      
      {/* Professional logo container with optimized layout */}
      <Animated.View style={[
        styles.logoContainer,
        {
          opacity: logoOpacity,
          transform: [{ scale: logoScale }]
        }
      ]}>
        <Image 
          source={require('../../../assets/universe_logo2.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // Optimized positioning to prevent layout conflicts
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // Prevent layout thrashing
    width: '100%',
    height: '100%',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    // Optimize for performance
    width: 200,
    height: 200,
  },
  logo: {
    width: 160,
    height: 160,
    // Optimize image rendering
    ...Platform.select({
      android: {
        // Android-specific optimizations
        resizeMode: 'contain',
      },
      ios: {
        resizeMode: 'contain',
      },
    }),
  },
});

export default SplashScreen;
