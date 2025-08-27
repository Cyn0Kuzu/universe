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

// Ignore specific warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'Possible Unhandled Promise Rejection',
]);

const App: React.FC = () => {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [notificationsInitialized, setNotificationsInitialized] = useState(false);

  useEffect(() => {
    async function initializeApp() {
      try {
        // Load fonts
        await Font.loadAsync({
          'Ionicons': require('../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'),
          'MaterialCommunityIcons': require('../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf'),
          'MaterialIcons': require('../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.ttf'),
          'FontAwesome': require('../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome.ttf'),
          'AntDesign': require('../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/AntDesign.ttf'),
        });
        
        logger.info('Vector icons fonts loaded successfully!');
        setFontsLoaded(true);

        // Initialize push notifications
        if (Platform.OS !== 'web') {
          const pushService = PushNotificationService.getInstance();
          const token = await pushService.initialize();
          
          if (token) {
            logger.info('Push notifications initialized successfully');
          } else {
            logger.warn('Push notifications initialization failed');
          }
        }
        
        setNotificationsInitialized(true);
      } catch (error) {
        logger.error('App initialization error:', error);
        setFontsLoaded(true);
        setNotificationsInitialized(true);
      }
    }

    initializeApp();
  }, []);

  if (!fontsLoaded || !notificationsInitialized) {
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
          fontSize: 14 
        }}>
          İkonlar yükleniyor...
        </Text>
      </View>
    );
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
