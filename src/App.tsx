import React, { useEffect, useState, useCallback } from 'react';
import BackgroundLoadingService from './services/backgroundLoadingService';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AuthNavigator from './navigation/AuthNavigator';
import theme from './theme';
import { AuthProvider } from './contexts/AuthContext';
import { LogBox } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { firebase } from './firebase';
import { SecureStorage } from './utils/secureStorage';
import { initializeWarningSuppression } from './utils/reactNativeWarningsFix';

// Enable React Native Screens optimizations
import { enableScreens } from 'react-native-screens';
enableScreens(true);

// Keep splash screen visible while loading
SplashScreen.preventAutoHideAsync();

// Initialize comprehensive warning suppression
initializeWarningSuppression();

const App: React.FC = () => {
  const [isReady, setIsReady] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Check authentication status during splash screen (defined first)
  const checkAuthenticationStatus = useCallback(async () => {
    try {
      console.log('🔐 Checking authentication status...');
      
      // Check if user is already authenticated
      const currentUser = firebase.auth().currentUser;
      if (currentUser) {
        console.log('✅ User already authenticated:', currentUser.email);
        setAuthChecked(true);
        return;
      }

      // Check SecureStorage for stored session
      const storedSession = await SecureStorage.getUserSession();
      if (storedSession) {
        console.log('✅ Found stored session, attempting auto sign-in...');
        
        if (storedSession.password) {
          try {
            await firebase.auth().signInWithEmailAndPassword(
              storedSession.email, 
              storedSession.password
            );
            console.log('✅ Auto sign-in successful');
          } catch (error) {
            console.log('⚠️ Auto sign-in failed, user will need to login manually');
          }
        }
      } else {
        console.log('ℹ️ No stored session found, user will need to login');
      }
      
      setAuthChecked(true);
    } catch (error) {
      console.error('❌ Auth check error:', error);
      setAuthChecked(true);
    }
  }, []);

  // Enhanced splash screen with authentication check
  useEffect(() => {
    let isMounted = true;
    
    const initializeApp = async () => {
      try {
        console.log('🚀 Starting app initialization with auth check...');
        
        // Start authentication check immediately
        const authCheckPromise = checkAuthenticationStatus();
        
        // Wait for splash screen duration (2 seconds)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Wait for auth check to complete
        await authCheckPromise;
        
        // Only proceed if component is still mounted
        if (!isMounted) return;
        
        // Initialize push notifications FIRST (handles notification permission)
        try {
          console.log('🔔 Initializing push notification system...');
          const { default: PushNotificationService } = require('./services/pushNotificationService');
          const pushService = PushNotificationService.getInstance();
          const token = await pushService.initialize();
          if (token) {
            console.log('✅ Push notifications initialized successfully with token:', token.substring(0, 20) + '...');
          } else {
            console.warn('⚠️ Push notifications initialization completed without token (permission may be denied)');
          }
        } catch (pushError) {
          console.error('❌ Push notification initialization error:', pushError);
        }
        
        // Request other permissions (only on first launch)
        try {
          console.log('🔐 Requesting other app permissions...');
          const PermissionManager = require('./services/permissionManager').default;
          const permissionManager = PermissionManager.getInstance();
          await permissionManager.requestOtherPermissions();
        } catch (permissionError) {
          console.error('❌ Permission request error:', permissionError);
        }
        
        if (!isMounted) return;
        
        await SplashScreen.hideAsync();
        setIsReady(true);
        console.log('✅ App initialization completed with auth check and push notifications');
      } catch (error) {
        console.error('App initialization error:', error);
        if (!isMounted) return;
        await SplashScreen.hideAsync();
        setIsReady(true);
      }
    };

    initializeApp();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [checkAuthenticationStatus]);

  // Don't render main app until splash screen is hidden
  if (!isReady) {
    return null; // Expo splash screen will be shown
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider theme={theme as any}>
          <AuthProvider>
            <NavigationContainer
              onReady={() => {
                console.log('Navigation ready');
              }}
              fallback={<Text style={{ textAlign: 'center', marginTop: 50 }}>Navigation yükleniyor...</Text>}
            >
              <StatusBar style="auto" backgroundColor="transparent" translucent={false} />
              <AuthNavigator />
            </NavigationContainer>
          </AuthProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;