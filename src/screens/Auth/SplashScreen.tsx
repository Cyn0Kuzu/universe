import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Image } from 'react-native';
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
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const copyrightOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animationSequence = Animated.sequence([
      // Logo appears and scales up (faster)
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      // Title appears (faster)
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      // Copyright appears (faster)
      Animated.timing(copyrightOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      // Wait 1300ms for total 2.5s experience (500+400+300+1300=2500ms)
      Animated.delay(1300),
    ]);

    animationSequence.start(() => {
      onFinish();
    });
  }, [logoOpacity, logoScale, titleOpacity, copyrightOpacity, onFinish]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar style="auto" />
      
      <View style={styles.content}>
        {/* Logo */}
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
        
        {/* App Title */}
        <Animated.View style={[
          styles.titleContainer,
          { opacity: titleOpacity }
        ]}>
          <Text style={[styles.appTitle, { color: theme.colors.text }]}>
            UNIVERSE
          </Text>
          <Text style={[styles.appSubtitle, { color: theme.colors.text }]}>
            Üniversite Evreni
          </Text>
        </Animated.View>
        
        {/* Copyright */}
        <Animated.View style={[
          styles.copyrightContainer,
          { opacity: copyrightOpacity }
        ]}>
          <Text style={[styles.copyrightText, { color: theme.colors.text }]}>
            © 2025 Universe - Üniversite Evreni
          </Text>
          <Text style={[styles.poweredByText, { color: theme.colors.text }]}>
            Powered by MeMoDe
          </Text>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    marginBottom: 30,
    alignItems: 'center',
  },
  logo: {
    width: 150,
    height: 150,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 80,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 2,
  },
  appSubtitle: {
    fontSize: 18,
    textAlign: 'center',
    opacity: 0.8,
    fontWeight: '500',
  },
  copyrightContainer: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
    width: '100%',
  },
  copyrightText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 6,
    fontWeight: '500',
    opacity: 0.9,
  },
  poweredByText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    fontWeight: '600',
    opacity: 0.8,
  },
});

export default SplashScreen;
