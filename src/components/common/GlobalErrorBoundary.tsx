/**
 * 🛡️ Professional Global Error Boundary
 * Catches and handles all React errors globally
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MonitoringService from '../../services/monitoringService';
import Config from '../../config/appConfig';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🛡️ Global Error Boundary caught an error:', error);
    console.error('🛡️ Error Info:', errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Report error to monitoring service
    this.reportError(error, errorInfo);
  }

  /**
   * 📊 Report error to monitoring services
   */
  private reportError = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      // Enhanced error context
      const errorContext = {
        componentStack: errorInfo.componentStack,
        errorBoundary: 'GlobalErrorBoundary',
        timestamp: new Date().toISOString(),
        appVersion: Config.getAppInfo().version,
        environment: Config.get('environment'),
        userAgent: 'React Native App',
      };

      // Report to monitoring service
      await MonitoringService.reportCrash(error, JSON.stringify(errorContext));

      // Log additional context in development
      if (Config.isDevelopment()) {
        console.error('🛡️ Error Context:', errorContext);
        console.error('🛡️ Component Stack:', errorInfo.componentStack);
        console.error('🛡️ Error Stack:', error.stack);
      }
    } catch (reportError) {
      console.error('❌ Failed to report error:', reportError);
    }
  };

  /**
   * 🔄 Handle error recovery
   */
  private handleRestart = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    // Track recovery attempt
    MonitoringService.trackEvent({
      name: 'error_boundary_restart',
      parameters: {
        error_message: this.state.error?.message,
        recovery_method: 'user_restart',
      },
    });
  };

  /**
   * 📱 Render fallback UI
   */
  private renderErrorFallback = () => {
    const { error, errorInfo } = this.state;

    // Custom fallback from props
    if (this.props.fallback) {
      return this.props.fallback(error!, errorInfo!);
    }

    // Default fallback UI
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.title}>😰 Bir şeyler ters gitti</Text>
          <Text style={styles.message}>
            Uygulamada beklenmeyen bir hata oluştu. Lütfen uygulamayı yeniden başlatmayı deneyin.
          </Text>
          
          {Config.isDevelopment() && (
            <View style={styles.debugContainer}>
              <Text style={styles.debugTitle}>🐛 Debug Information:</Text>
              <Text style={styles.debugText}>
                {error?.name}: {error?.message}
              </Text>
              <Text style={styles.debugText} numberOfLines={10}>
                {error?.stack}
              </Text>
            </View>
          )}

          <TouchableOpacity 
            style={styles.restartButton} 
            onPress={this.handleRestart}
          >
            <Text style={styles.restartButtonText}>🔄 Yeniden Dene</Text>
          </TouchableOpacity>

          {Config.isDevelopment() && (
            <TouchableOpacity 
              style={styles.debugButton}
              onPress={() => {
                console.log('🛡️ Error Details:', {
                  error,
                  errorInfo,
                  timestamp: new Date(),
                });
              }}
            >
              <Text style={styles.debugButtonText}>🐛 Debug Konsol</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  render() {
    if (this.state.hasError) {
      return this.renderErrorFallback();
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  debugContainer: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ff6b6b',
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  restartButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  restartButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  debugButton: {
    backgroundColor: '#FF9500',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  debugButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default GlobalErrorBoundary;
