/**
 * Main App Entry Point - CRASH PROTECTED VERSION
 * This file serves as a bootstrap file that imports and re-exports the main App component
 * Added comprehensive error handling and crash prevention
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, Alert, AppState } from 'react-native';

// Import gesture handler first (required for React Navigation)
import 'react-native-gesture-handler';

// Safe app import with error boundary
let AppComponent: React.ComponentType;
try {
  AppComponent = require('./src/App').default;
} catch (error) {
  console.error('❌ CRITICAL: Failed to load main App component:', error);
  // Fallback component
  AppComponent = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>Uygulama yüklenirken hata oluştu</Text>
      <Text style={styles.errorSubText}>Lütfen uygulamayı yeniden başlatın</Text>
    </View>
  );
}

// Global error boundary for the entire app
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class AppErrorBoundary extends Component<{children: ReactNode}, ErrorBoundaryState> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    console.error('🛡️ App Error Boundary caught error:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🛡️ Component stack trace:', errorInfo.componentStack);
    
    // Log crash to console for debugging
    console.error('💥 APP CRASH PREVENTED:', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });

    // Show user-friendly error message
    setTimeout(() => {
      Alert.alert(
        'Uygulama Hatası',
        'Bir hata oluştu. Uygulama güvenli modda çalışıyor.',
        [
          {
            text: 'Tamam',
            onPress: () => {
              // Try to recover by resetting error state
              this.setState({ hasError: false, error: null });
            }
          }
        ]
      );
    }, 100);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>⚠️ Güvenli Mod</Text>
          <Text style={styles.errorText}>
            Uygulama bir hatayla karşılaştı
          </Text>
          <Text style={styles.errorSubText}>
            Hata: {this.state.error?.message || 'Bilinmeyen hata'}
          </Text>
          <Text style={styles.recoveryText}>
            Uygulama güvenli modda çalışmaya devam ediyor
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

// Global unhandled promise rejection handler
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  // Filter out known React Native warnings that cause unnecessary noise
  const message = args[0]?.toString() || '';
  
  if (
    message.includes('Warning: React.createElement') ||
    message.includes('Warning: validateDOMNesting') ||
    message.includes('Non-serializable values were found')
  ) {
    return; // Suppress these warnings
  }
  
  originalConsoleError.apply(console, args);
};

// Handle unhandled promise rejections
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    console.error('🚨 Unhandled Promise Rejection:', event.reason);
    event.preventDefault(); // Prevent crash
  });
}

// Global error handler for JavaScript errors (React Native specific)
const globalAny = global as any;
const originalErrorHandler = globalAny.ErrorUtils?.getGlobalHandler();

if (globalAny.ErrorUtils) {
  globalAny.ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    console.error('🚨 Global JavaScript Error:', error);
    console.error('Fatal:', isFatal);
    
    if (isFatal) {
      // Prevent app crash by handling fatal errors gracefully
      console.error('💥 FATAL ERROR PREVENTED - App continues running');
      
      Alert.alert(
        'Kritik Hata',
        'Uygulama kritik bir hatayla karşılaştı ancak çalışmaya devam ediyor.',
        [{ text: 'Tamam' }]
      );
      
      return; // Don't call original handler to prevent crash
    }
    
    // Call original handler for non-fatal errors
    if (originalErrorHandler) {
      originalErrorHandler(error, isFatal);
    }
  });
}

// Safe App component with error boundary
const SafeApp: React.FC = () => {
  return (
    <AppErrorBoundary>
      <AppComponent />
    </AppErrorBoundary>
  );
};

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ff6b6b',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorSubText: {
    fontSize: 14,
    color: '#cccccc',
    marginBottom: 8,
    textAlign: 'center',
  },
  recoveryText: {
    fontSize: 12,
    color: '#4ade80',
    marginTop: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default SafeApp;
