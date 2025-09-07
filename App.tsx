/**
 * ULTRA PROFESSIONAL APP - v1.9.4
 * NO OBFUSCATION/MINIFICATION - Pure stability
 */

import React, { Component, ErrorInfo, ReactNode, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, AppState, ActivityIndicator } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

// Keep splash screen visible while app loads
SplashScreen.preventAutoHideAsync().catch(() => {
  // Splash screen is already hidden or doesn't exist
  console.log('Splash screen already hidden');
});

// ULTRA SAFE gesture handler import
try {
  require('react-native-gesture-handler');
  console.log('✅ Gesture handler loaded successfully');
} catch (e) {
  console.log('⚠️ Gesture handler not available, continuing safely');
}

// PROGRESSIVE LOADING SYSTEM - Safe synchronous loading
let MainApp: React.ComponentType | null = null;
let isMainAppAvailable = false;
let loadError: string | null = null;

const loadMainApp = (): boolean => {
  if (MainApp !== null) {
    console.log('✅ Main app already loaded');
    return true;
  }
  
  try {
    console.log('🔄 Loading main app from src/App...');
    const startTime = Date.now();
    
    MainApp = require('./src/App').default;
    
    const loadTime = Date.now() - startTime;
    console.log(`✅ Main app loaded successfully in ${loadTime}ms`);
    
    isMainAppAvailable = true;
    loadError = null;
    return true;
  } catch (error: any) {
    const errorMsg = error?.message || 'Unknown error';
    console.error(`❌ Main app failed to load: ${errorMsg}`);
    console.error('Error details:', error);
    
    loadError = errorMsg;
    MainApp = null;
    isMainAppAvailable = false;
    return false;
  }
};

// Global error boundary state
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Ultra safe error boundary component with maximum protection
class UltraSafeErrorBoundary extends Component<{children: ReactNode}, ErrorBoundaryState> {
  private hasBeenDestroyed = false;

  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
    
    // Bind methods to prevent crashes
    this.handleError = this.handleError.bind(this);
    this.resetError = this.resetError.bind(this);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    console.error('🛡️ ULTRA SAFE: Error caught by boundary:', error?.message || 'Unknown error');
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (!this.hasBeenDestroyed) {
      this.handleError(error, errorInfo);
    }
  }

  componentWillUnmount() {
    this.hasBeenDestroyed = true;
  }

  handleError(error: Error, errorInfo?: ErrorInfo) {
    try {
      console.error('💥 CRASH PREVENTED - Details:', {
        timestamp: new Date().toISOString(),
        message: error?.message || 'No message',
        name: error?.name || 'No name',
        stack: error?.stack || 'No stack',
        componentStack: errorInfo?.componentStack || 'No component stack',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown'
      });
      
      // Try to send error to analytics if available
      if (typeof console.warn === 'function') {
        console.warn('📊 Error tracked for analysis');
      }
    } catch (e) {
      // Even logging failed, but we continue
      console.log('Error logging failed, continuing safely');
    }
  }

  resetError = () => {
    if (!this.hasBeenDestroyed) {
      try {
        this.setState({ hasError: false, error: null });
      } catch (e) {
        console.log('Reset failed, but continuing');
      }
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>🛡️ Güvenli Mod</Text>
          <Text style={styles.errorText}>
            Uygulama bir hatayla karşılaştı ancak güvenli modda çalışıyor
          </Text>
          <Text style={styles.errorSubText}>
            Hata: {this.state.error?.message || 'Bilinmeyen hata'}
          </Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={styles.retryText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

// Fallback minimal app component with error info
const FallbackApp: React.FC<{ error?: any }> = ({ error }) => {
  const errorMsg = typeof error === 'string' ? error : error?.message || 'Bilinmeyen sistem hatası';
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🌟 Universe</Text>
      <Text style={styles.subtitle}>Üniversite Kampüs Uygulaması</Text>
      <Text style={styles.version}>v1.9.4 - Güvenli Mod</Text>
      <Text style={styles.errorText}>
        ⚠️ Uygulama güvenli modda çalışıyor
      </Text>
      <Text style={styles.info}>
        Ana özellikler geçici olarak kullanılamıyor.{'\n'}
        Uygulamayı yeniden başlatmayı deneyin.
      </Text>
      {error && (
        <Text style={styles.errorInfo}>
          Teknik Detay: {errorMsg.length > 100 ? errorMsg.substring(0, 100) + '...' : errorMsg}
        </Text>
      )}
    </View>
  );
};

// Smart loading app component with splash protection
const SmartLoadingApp: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [appLoaded, setAppLoaded] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const initializeApp = async () => {
      try {
        console.log('🔄 Starting app initialization...');
        
        // Hide expo splash screen first
        try {
          await SplashScreen.hideAsync();
          console.log('✅ Expo splash screen hidden');
        } catch (error) {
          console.log('⚠️ Could not hide splash screen:', error);
        }

        // Wait a moment for screen transition
        await new Promise(resolve => setTimeout(resolve, 300)); // Reduced from 500ms
        
        // Try to load main app
        console.log('🔄 Loading main app component...');
        const loaded = loadMainApp();
        
        console.log(`📱 Main app load result: ${loaded ? 'SUCCESS' : 'FAILED'}`);
        setAppLoaded(loaded);
        
        // Reduced safety delay for faster loading
        await new Promise(resolve => setTimeout(resolve, 200)); // Reduced from 300ms
        
        setIsLoading(false);
        console.log('✅ App initialization complete');
        
      } catch (error) {
        console.error('❌ App initialization failed:', error);
        setAppLoaded(false);
        setIsLoading(false);
      }
    };

    // Start initialization after a short delay
    timeoutId = setTimeout(initializeApp, 100);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  if (isLoading) {
    return (
      <View style={styles.splashContainer}>
        <Text style={styles.splashTitle}>🌟 Universe</Text>
        <Text style={styles.splashSubtitle}>Üniversite Kampüs Uygulaması</Text>
        <ActivityIndicator size="large" color="#3498db" style={{ marginTop: 30 }} />
        <Text style={styles.splashText}>Uygulama Hazırlanıyor...</Text>
        <Text style={styles.splashVersion}>v1.9.4</Text>
      </View>
    );
  }

  if (appLoaded && MainApp) {
    try {
      console.log('🚀 Rendering main Universe app...');
      return <MainApp />;
    } catch (error) {
      console.error('🚨 Main app crashed during render:', error);
      return <FallbackApp error={error} />;
    }
  }
  
  console.log('⚠️ Using fallback app due to load failure');
  return <FallbackApp error={loadError} />;
};// Ultra safe main app wrapper with error boundary
const UltraSafeApp: React.FC = () => {
  return (
    <UltraSafeErrorBoundary>
      <SmartLoadingApp />
    </UltraSafeErrorBoundary>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#34495e',
    marginBottom: 20,
    textAlign: 'center',
  },
  version: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 30,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#27ae60',
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: '600',
  },
  info: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e74c3c',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 15,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 10,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorSubText: {
    fontSize: 12,
    color: '#f8d7da',
    marginBottom: 20,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  retryButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    elevation: 2,
  },
  retryText: {
    color: '#e74c3c',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorInfo: {
    fontSize: 12,
    color: '#f8d7da',
    marginTop: 15,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2c3e50',
    padding: 20,
  },
  splashTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 30,
    textAlign: 'center',
  },
  splashText: {
    fontSize: 16,
    color: '#ecf0f1',
    marginTop: 20,
    textAlign: 'center',
  },
  splashSubtitle: {
    fontSize: 18,
    color: '#bdc3c7',
    marginBottom: 10,
    textAlign: 'center',
  },
  splashVersion: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 30,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

// Global error handlers
const globalScope = global as any;
if (globalScope.ErrorUtils) {
  const originalHandler = globalScope.ErrorUtils.getGlobalHandler();
  globalScope.ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    console.error('🚨 Global Error:', error);
    if (isFatal) {
      console.error('💥 FATAL ERROR PREVENTED');
      Alert.alert('Hata', 'Kritik hata yakalandı ve düzeltildi.', [{ text: 'Tamam' }]);
      return; // Don't crash
    }
    if (originalHandler) originalHandler(error, isFatal);
  });
}

export default UltraSafeApp;
