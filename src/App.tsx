import React, { useEffect, useState, useCallback } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator, AppState, Alert } from 'react-native';
import * as Font from 'expo-font';
import AuthNavigator from './navigation/AuthNavigator';
import theme from './theme';
import { AuthProvider } from './contexts/AuthContext';
import { LogBox } from 'react-native';

// Professional imports
import GlobalErrorBoundary from './components/common/GlobalErrorBoundary';

// Ignore specific warnings that don't affect functionality
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'Warning: React.createElement',
  'Warning: validateDOMNesting',
  'Setting a timer for a long period',
  'AsyncStorage has been extracted from react-native core',
]);

const App: React.FC = () => {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [appReady, setAppReady] = useState(false);

  // Safe font loading with fallback
  const loadFonts = useCallback(async () => {
    try {
      console.log('📱 Starting font loading...');
      
      // Load fonts with error handling for each font
      const fontPromises = [
        Font.loadAsync({
          'Ionicons': require('../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'),
        }).catch(e => console.warn('Ionicons load failed:', e)),
        
        Font.loadAsync({
          'MaterialCommunityIcons': require('../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf'),
        }).catch(e => console.warn('MaterialCommunityIcons load failed:', e)),
        
        Font.loadAsync({
          'MaterialIcons': require('../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.ttf'),
        }).catch(e => console.warn('MaterialIcons load failed:', e)),
        
        Font.loadAsync({
          'FontAwesome': require('../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome.ttf'),
        }).catch(e => console.warn('FontAwesome load failed:', e)),
        
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
