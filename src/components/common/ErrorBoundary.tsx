import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import * as Updates from 'expo-updates';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
    
    // Log error details for debugging
    console.error('Error Boundary Details:', {
      timestamp: new Date().toISOString(),
      message: error?.message || 'No message',
      stack: error?.stack || 'No stack',
      componentStack: errorInfo?.componentStack || 'No component stack'
    });
  }

  handleRestart = async () => {
    try {
      // Try to reload the app
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        await Updates.reloadAsync();
      } else {
        // Reset component state
        this.setState({ 
          hasError: false, 
          error: null, 
          errorInfo: null 
        });
      }
    } catch (e) {
      console.error('Restart failed:', e);
      Alert.alert(
        'Yeniden Başlatma Hatası',
        'Uygulama yeniden başlatılamadı. Lütfen uygulamayı manuel olarak kapatıp açın.',
        [{ text: 'Tamam' }]
      );
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>🛡️ Bir Hata Oluştu</Text>
          <Text style={styles.subtitle}>
            Uygulama bir hata ile karşılaştı ancak güvenlik önlemleri devreye girdi.
          </Text>
          
          <ScrollView style={styles.errorContainer} showsVerticalScrollIndicator={false}>
            <Text style={styles.errorLabel}>Hata Detayları:</Text>
            <Text style={styles.errorText}>
              {this.state.error?.message || 'Bilinmeyen hata'}
            </Text>
            
            {__DEV__ && this.state.error?.stack && (
              <>
                <Text style={styles.errorLabel}>Stack Trace:</Text>
                <Text style={styles.stackTrace}>
                  {this.state.error.stack}
                </Text>
              </>
            )}
          </ScrollView>
          
          <TouchableOpacity style={styles.restartButton} onPress={this.handleRestart}>
            <Text style={styles.restartButtonText}>🔄 Uygulamayı Yeniden Başlat</Text>
          </TouchableOpacity>
          
          <Text style={styles.supportText}>
            Bu hata devam ederse, lütfen uygulama geliştiricileri ile iletişime geçin.
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#e74c3c',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  errorContainer: {
    maxHeight: 200,
    marginVertical: 20,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    width: '100%',
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
  },
  errorLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 5,
  },
  errorText: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 15,
    lineHeight: 20,
  },
  stackTrace: {
    fontSize: 12,
    color: '#868e96',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  restartButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 20,
  },
  restartButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  supportText: {
    fontSize: 12,
    color: '#868e96',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
});

export default ErrorBoundary;
