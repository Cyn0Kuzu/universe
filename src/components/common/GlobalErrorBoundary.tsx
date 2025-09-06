/**
 * 🛡️ Global Error Boundary - ULTRA SAFE VERSION
 * Catches and handles all React errors globally without any external dependencies
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Log error safely
    try {
      console.error('🛡️ GlobalErrorBoundary caught error:', error?.message || 'Unknown error');
    } catch (e) {
      // Even console.error might fail in some cases
    }
    
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Safe error logging
    try {
      console.error('🛡️ Error details:');
      console.error('Message:', error?.message || 'Unknown');
      console.error('Stack:', error?.stack || 'No stack');
      console.error('Component Stack:', errorInfo?.componentStack || 'No component stack');
    } catch (e) {
      // Logging failed, but don't crash
    }
  }

  handleRestart = () => {
    try {
      this.setState({
        hasError: false,
        error: null,
      });
    } catch (e) {
      // setState failed, try to reload
      try {
        if (typeof window !== 'undefined' && window.location) {
          window.location.reload();
        }
      } catch (reloadError) {
        // Can't even reload, but don't crash
      }
    }
  };

  render() {
    if (this.state.hasError) {
      // Safe error UI that should never crash
      return (
        <View style={styles.container}>
          <View style={styles.errorBox}>
            <Text style={styles.emoji}>😔</Text>
            <Text style={styles.title}>Bir Sorun Oluştu</Text>
            <Text style={styles.message}>
              Uygulama beklenmedik bir hatayla karşılaştı.
            </Text>
            <Text style={styles.errorText}>
              {this.state.error?.message || 'Bilinmeyen hata'}
            </Text>
            <TouchableOpacity 
              style={styles.button} 
              onPress={this.handleRestart}
            >
              <Text style={styles.buttonText}>Tekrar Dene</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
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
  errorBox: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
  },
  errorText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: 'monospace',
    paddingHorizontal: 10,
  },
  button: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    minWidth: 120,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default GlobalErrorBoundary;
