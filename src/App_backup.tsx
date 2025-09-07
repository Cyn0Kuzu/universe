import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator } from 'react-native';
import { LogBox } from 'react-native';

// SAFE IMPORTS - only if they exist
let AuthNavigator: any;
let theme: any;
let AuthProvider: any;
let GlobalErrorBoundary: any;

try {
  AuthNavigator = require('./navigation/AuthNavigator').default;
} catch (e) {
  console.warn('AuthNavigator not found, using fallback');
  AuthNavigator = () => <Text style={{flex: 1, textAlign: 'center', marginTop: 100}}>Loading...</Text>;
}

try {
  theme = require('./theme').default;
} catch (e) {
  console.warn('Theme not found, using default');
  theme = {};
}

try {
  AuthProvider = require('./contexts/AuthContext').AuthProvider;
} catch (e) {
  console.warn('AuthProvider not found, using fallback');
  AuthProvider = ({ children }: any) => children;
}

try {
  GlobalErrorBoundary = require('./components/common/GlobalErrorBoundary').default;
} catch (e) {
  console.warn('GlobalErrorBoundary not found, using fallback');
  GlobalErrorBoundary = ({ children }: any) => children;
}

// Ignore warnings that don't affect functionality
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'Warning: React.createElement',
  'Warning: validateDOMNesting',
  'Setting a timer for a long period',
  'AsyncStorage has been extracted from react-native core',
  'ViewPropTypes will be removed',
  'ColorPropType will be removed',
]);

const App: React.FC = () => {
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    // Simple app initialization
    const initializeApp = async () => {
      try {
        console.log('🚀 Universe app starting...');
        
        // Give some time for initial setup
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('✅ App ready');
        setAppReady(true);
        
      } catch (error) {
        console.warn('⚠️ App initialization had issues but continuing:', error);
        setAppReady(true); // Always continue
      }
    };

    initializeApp();
  }, []);

  // Loading screen
  if (!appReady) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: '#4f46e5' 
      }}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={{ 
          color: '#ffffff', 
          marginTop: 20, 
          fontSize: 16
        }}>
          Universe yükleniyor...
        </Text>
      </View>
    );
  }

  // Main app
  return (
    <GlobalErrorBoundary>
      <SafeAreaProvider>
        <PaperProvider theme={theme as any}>
          <AuthProvider>
            <NavigationContainer
              onUnhandledAction={(action) => {
                console.warn('Unhandled navigation action:', action);
              }}
              onStateChange={(state) => {
                if (state && __DEV__) {
                  console.log('Navigation state changed');
                }
              }}
            >
              <StatusBar 
                style="auto" 
                backgroundColor="transparent" 
                translucent={false} 
              />
              <AuthNavigator />
            </NavigationContainer>
          </AuthProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </GlobalErrorBoundary>
  );
};

export default App;
