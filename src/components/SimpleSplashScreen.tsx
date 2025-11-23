import React from 'react';
import { View, StyleSheet, Image, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';

const SimpleSplashScreen: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <View style={styles.container}>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />
      <View style={styles.logoWrapper}>
        <Image
          source={require('../../assets/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerText}>© {currentYear} Universe</Text>
        <Text style={styles.poweredText}>Powered by MeMoDe</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrapper: {
    width: '60%',
    maxWidth: 220,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  footer: {
    position: 'absolute',
    bottom: 48,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  poweredText: {
    marginTop: 4,
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});

export default SimpleSplashScreen;


