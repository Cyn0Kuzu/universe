import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator, Platform } from 'react-native';
import * as Font from 'expo-font';
import AuthNavigator from './navigation/AuthNavigator';
import theme from './theme';
import { AuthProvider } from './contexts/AuthContext';
import { LogBox } from 'react-native';
import PushNotificationService from './services/pushNotificationService';
import { logger } from './utils/logger';

// Ignore only non-critical warnings
// IMPORTANT: Do not ignore "Possible Unhandled Promise Rejection" - it can cause crashes
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  // Note: Promise rejections should be handled properly, not ignored
]);

const App: React.FC = () => {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [notificationsInitialized, setNotificationsInitialized] = useState(false);

  useEffect(() => {
    async function initializeApp() {
      try {
        // Load fonts with error handling for each font
        // Expo handles these fonts automatically, but we load them explicitly for reliability
        try {
          await Font.loadAsync({
            'Ionicons': require('../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'),
            'MaterialCommunityIcons': require('../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf'),
            'MaterialIcons': require('../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.ttf'),
            'FontAwesome': require('../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome.ttf'),
            'AntDesign': require('../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/AntDesign.ttf'),
          });
          
          logger.info('Vector icons fonts loaded successfully!');
        } catch (fontError) {
          // If fonts fail to load explicitly, they might be loaded by Expo
          logger.warn('Font loading warning (may be pre-loaded by Expo):', fontError);
        }
        
        setFontsLoaded(true);

        // Initialize push notifications
        if (Platform.OS !== 'web') {
          try {
            const pushService = PushNotificationService.getInstance();
            const token = await pushService.initialize();
            
            if (token) {
              logger.info('Push notifications initialized successfully');
            } else {
              logger.warn('Push notifications initialization failed');
            }
          } catch (pushError) {
            logger.error('Push notification initialization error:', pushError);
            // Continue without push notifications
          }
        }
        
        setNotificationsInitialized(true);
      } catch (error) {
        logger.error('App initialization error:', error);
        // Always allow app to continue even if initialization fails
        setFontsLoaded(true);
        setNotificationsInitialized(true);
      }
    }

    initializeApp();
  }, []);

  // Don't show any loading screen - let the splash screen handle it
  if (!fontsLoaded || !notificationsInitialized) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme as any}>
        <AuthProvider>
          <NavigationContainer>
            {/* Status bar'ı telefon varsayılan renginde ayarla */}
            <StatusBar style="auto" backgroundColor="transparent" translucent={false} />
            <AuthNavigator />
          </NavigationContainer>
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
};

export default App;
