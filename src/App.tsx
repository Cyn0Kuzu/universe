import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator, AppState } from 'react-native';
import * as Font from 'expo-font';
import AuthNavigator from './navigation/AuthNavigator';
import theme from './theme';
import { AuthProvider } from './contexts/AuthContext';
import { LogBox } from 'react-native';
import './utils/logger'; // Initialize production logging

// Professional imports
import GlobalErrorBoundary from './components/common/GlobalErrorBoundary';
import MonitoringService from './services/monitoringService';
import Config from './config/appConfig';

// Ignore specific warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

const App: React.FC = () => {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    // Initialize monitoring and analytics
    initializeApp();
    
    async function loadFonts() {
      try {
        // Direct font path loading - APK'da %100 çalışır
        await Font.loadAsync({
          'Ionicons': require('../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'),
          'MaterialCommunityIcons': require('../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf'),
          'MaterialIcons': require('../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.ttf'),
          'FontAwesome': require('../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome.ttf'),
          'AntDesign': require('../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/AntDesign.ttf'),
        });
        
        console.log('✅ Vector icons fonts loaded!');
        setFontsLoaded(true);
      } catch (error) {
        console.warn('Font loading error:', error);
        setFontsLoaded(true); // Hata olsa da uygulamayı başlat
      }
    }

    loadFonts();
  }, []);

  // Professional app initialization
  const initializeApp = async () => {
    try {
      // Track app start
      await MonitoringService.trackAppStart();
      
      // Setup app state change listeners
      AppState.addEventListener('change', handleAppStateChange);
      
      console.log('🚀 Professional app initialization completed');
    } catch (error) {
      console.error('❌ App initialization failed:', error);
      MonitoringService.reportCrash(error as Error, 'App initialization');
    }
  };

  // Handle app state changes
  const handleAppStateChange = (nextAppState: string) => {
    if (nextAppState === 'background') {
      MonitoringService.trackAppBackground();
    } else if (nextAppState === 'active') {
      MonitoringService.trackAppForeground();
    }
  };

  if (!fontsLoaded) {
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
    <GlobalErrorBoundary>
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
    </GlobalErrorBoundary>
  );
};

export default App;
