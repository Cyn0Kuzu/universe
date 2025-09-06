import React, { useEffect, useState, useCallback } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator, AppState, Alert } from 'react-native';
import * as Font from 'expo-font';
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
  AuthNavigator = () => <Text>Navigation Error</Text>;
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

// Ignore specific warnings that don't affect functionality
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
  const [fontsLoaded, setFontsLoaded] = useState(true); // Start with true to avoid loading screen
  const [appReady, setAppReady] = useState(false);

  // Minimal, safe font loading
  const loadFonts = useCallback(async () => {
    try {
      console.log('📱 Starting minimal font loading...');
      
      // Try to load fonts but don't fail if they're not available
      const fontLoadingPromises = [];
      
      // Only load essential fonts, catch each individually
      try {
        fontLoadingPromises.push(
          Font.loadAsync({
            'Ionicons': require('../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'),
          })
        );
      } catch (e) { console.warn('Ionicons not available'); }

      try {
        fontLoadingPromises.push(
          Font.loadAsync({
            'MaterialIcons': require('../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.ttf'),
          })
        );
      } catch (e) { console.warn('MaterialIcons not available'); }

      // Wait for all font promises to settle (don't fail on errors)
      if (fontLoadingPromises.length > 0) {
        await Promise.allSettled(fontLoadingPromises);
      }
      
      console.log('✅ Font loading completed (or skipped safely)');
      
    } catch (error) {
      console.warn('⚠️ Font loading failed but continuing anyway:', error);
    } finally {
      setFontsLoaded(true); // Always set to true so app continues
    }
  }, []);
        
        Font.loadAsync({
          'AntDesign': require('../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/AntDesign.ttf'),
        }).catch(e => console.warn('AntDesign load failed:', e)),
      ];
      
      await Promise.allSettled(fontPromises);
      console.log('✅ Font loading completed (with fallbacks)');
      
    } catch (error) {
      console.warn('⚠️ Font loading error (continuing anyway):', error);
    } finally {
      setFontsLoaded(true);
    }
  }, []);

  // Safe app initialization
  const initializeApp = useCallback(async () => {
    try {
      console.log('🚀 Initializing Universe app...');
      
      // Setup app state change listeners with error handling
      const handleAppStateChange = (nextAppState: string) => {
        try {
          if (nextAppState === 'background') {
            console.log('📱 App moved to background');
          } else if (nextAppState === 'active') {
            console.log('📱 App became active');
          }
        } catch (error) {
          console.warn('AppState change error:', error);
        }
      };
      
      AppState.addEventListener('change', handleAppStateChange);
      
      // Load fonts
      await loadFonts();
      
      console.log('✅ App initialization completed successfully');
      setAppReady(true);
      
    } catch (error) {
      console.error('❌ App initialization failed:', error);
      // Don't crash, show error to user
      Alert.alert(
        'Başlatma Hatası',
        'Uygulama başlatılırken bir sorun oluştu. Temel özellikler kullanılabilir.',
        [{ text: 'Devam Et', onPress: () => setAppReady(true) }]
      );
    }
  }, [loadFonts]);

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  // Loading screen while app initializes
  if (!fontsLoaded || !appReady) {
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
          marginTop: 10, 
          fontSize: 16,
          textAlign: 'center'
        }}>
          {!fontsLoaded ? 'İkonlar yükleniyor...' : 'Uygulama hazırlanıyor...'}
        </Text>
      </View>
    );
  }

  // Main app with error boundary protection
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
                // Safe navigation state logging
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
