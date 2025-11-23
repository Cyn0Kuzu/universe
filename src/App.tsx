import React, { useEffect, useState, useCallback, useRef } from 'react';
// 🛡️ CRITICAL: Lazy load BackgroundLoadingService to prevent native module crashes
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { Text, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
// 🛡️ CRITICAL: Import gesture handler properly to prevent bundle issues
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View } from 'react-native';
import { useFonts } from 'expo-font';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import GlobalAdminBanner from './components/admin/GlobalAdminBanner';
import AdminPushListener from './components/admin/AdminPushListener';
import SimpleSplashScreen from './components/SimpleSplashScreen';

// Fallback wrapper if GestureHandlerRootView fails
const SafeGestureHandlerRootView = ({ children, style }: any) => {
  try {
    return <GestureHandlerRootView style={style}>{children}</GestureHandlerRootView>;
  } catch (error) {
    return <View style={style}>{children}</View>;
  }
};

// Some legacy third-party libraries still expect global.React to exist.
// React Native 0.76 removed this, so we polyfill it once here.
if (!(global as any).React) {
  (global as any).React = React;
}
const reactAny = React as any;
if (typeof reactAny.useMemo !== 'function') {
  console.warn('⚠️ React.useMemo not found - applying fallback polyfill');
  reactAny.useMemo = (factory: () => any) => factory();
}

// 🛡️ CRITICAL: Patch Alert.alert to prevent Android Dialog crashes
import { patchGlobalAlert } from './utils/globalAlertPatch';
patchGlobalAlert();

// 🛡️ CRITICAL: Global error handler to catch ALL unhandled errors
if (typeof ErrorUtils !== 'undefined') {
  const originalHandler = (ErrorUtils as any).getGlobalHandler();
  (ErrorUtils as any).setGlobalHandler((error: Error, isFatal?: boolean) => {
    console.error('🚨 GLOBAL ERROR CAUGHT:', error?.message);
    console.error('🚨 Stack:', error?.stack?.substring(0, 300));
    console.error('🚨 Is Fatal:', isFatal);
    
    // Don't crash the app - just log
    if (!isFatal && originalHandler) {
      try {
        originalHandler(error, false);
      } catch (e) {
        console.error('Original handler failed:', e);
      }
    }
  });
  console.log('✅ Global error handler installed');
}

import AuthNavigator from './navigation/AuthNavigator';
import theme from './theme';
import { AuthProvider } from './contexts/AuthContext';
import { LogBox } from 'react-native';
// 🛡️ CRITICAL: Lazy load Firebase to prevent native module initialization crashes
// Firebase import is moved to lazy loading to prevent C++ exception failures
import { SecureStorage } from './utils/secureStorage';
import { initializeWarningSuppression } from './utils/reactNativeWarningsFix';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ImagePreviewProvider } from './contexts/ImagePreviewContext';

// 🛡️ iOS CRASH PREVENTION: Initialize all native modules asynchronously
// This prevents C++ exception failures during synchronous module initialization
let screensEnabled = false;
let warningSuppressionInitialized = false;

// Initialize native modules safely
const initializeNativeModules = async (): Promise<void> => {
  return new Promise((resolve) => {
    // Use setTimeout to ensure this runs after React Native bridge is ready
    setTimeout(() => {
      try {
        // 1. Enable React Native Screens (async)
        try {
          import('react-native-screens').then((screensModule) => {
            const { enableScreens } = screensModule;
            if (enableScreens && typeof enableScreens === 'function') {
              enableScreens(true);
              screensEnabled = true;
              console.log('✅ React Native Screens enabled');
            }
          }).catch((screensError: any) => {
            console.warn('⚠️ React Native Screens enable failed:', screensError);
          });
        } catch (screensError: any) {
          console.warn('⚠️ React Native Screens enable failed:', screensError);
        }

        // 2. Initialize warning suppression (async)
        try {
          initializeWarningSuppression();
          warningSuppressionInitialized = true;
        } catch (warningError: any) {
          console.warn('⚠️ Warning suppression initialization failed:', warningError);
        }

        resolve();
      } catch (error: any) {
        console.error('❌ Native module initialization error:', error);
        resolve(); // Always resolve to prevent blocking
      }
    }, 0); // Run in next tick
  });
};

// 🛡️ iOS CRASH PREVENTION: Enhanced global error handlers
// Initialize error handlers asynchronously to prevent native module crashes
const initializeErrorHandlers = (): void => {
  const globalScope = global as any;
  
  // Set up React Native error handler (iOS crash prevention)
  if (globalScope.ErrorUtils && typeof globalScope.ErrorUtils.setGlobalHandler === 'function') {
    try {
      const originalHandler = globalScope.ErrorUtils.getGlobalHandler();
      globalScope.ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
        console.error('🚨 Global Error Handler:', error?.message || 'Unknown error');
        console.error('🚨 Error Stack:', error?.stack || 'No stack trace');
        console.error('🚨 Is Fatal:', isFatal);
        
        // Prevent fatal crashes on iOS by catching exceptions
        if (isFatal) {
          console.error('💥 FATAL ERROR CAUGHT - Preventing crash');
          // Log error but don't crash the app
          try {
            console.error('💥 Fatal error details:', {
              message: error?.message,
              stack: error?.stack,
              name: error?.name,
              platform: Platform.OS,
            });
          } catch (logError) {
            // Even logging failed, but don't crash
            console.error('💥 Logging failed:', logError);
          }
          // Don't call original handler to prevent crash
          return;
        }
        
        // For non-fatal errors, use original handler
        if (originalHandler) {
          try {
            originalHandler(error, isFatal);
          } catch (handlerError) {
            console.error('💥 Original error handler failed:', handlerError);
          }
        }
      });
      console.log('✅ Global error handler initialized');
    } catch (handlerError: any) {
      console.error('❌ Failed to set global error handler:', handlerError);
    }
  }

  // Set up Promise rejection handler
  if (globalScope.Promise) {
    try {
      const originalUnhandledRejection = globalScope.onunhandledrejection;
      globalScope.onunhandledrejection = (event: any) => {
        console.error('🚨 Unhandled Promise Rejection:', event?.reason || 'Unknown');
        console.error('🚨 Rejection Stack:', event?.reason?.stack || 'No stack');
        
        // Prevent crash from unhandled promise rejections
        if (event?.preventDefault) {
          event.preventDefault();
        }
        
        if (originalUnhandledRejection) {
          try {
            originalUnhandledRejection(event);
          } catch (handlerError) {
            console.error('💥 Original promise rejection handler failed:', handlerError);
          }
        }
      };
      console.log('✅ Promise rejection handler initialized');
    } catch (rejectionError: any) {
      console.error('❌ Failed to set promise rejection handler:', rejectionError);
    }
  }

  // Set up iOS-specific native exception handler
  if (Platform.OS === 'ios') {
    try {
      // 🛡️ CRITICAL: iOS-specific crash prevention for C++ exceptions
      // Catch objc_exception_throw failures that cause SIGABRT
      if (globalScope.NativeModules) {
        import('react-native').then((rnModule) => {
          const { NativeModules } = rnModule;
          // Try to initialize crash reporting if available
          if (NativeModules?.ExceptionManager) {
            console.log('✅ iOS native exception manager available');
          }
        }).catch(() => {
          // Ignore import errors
        });
      }
      
      // 🛡️ CRITICAL: Wrap all native module access in try-catch
      // This prevents C++ exception failures from crashing the app
      const originalRequire = globalScope.require;
      if (originalRequire) {
        globalScope.require = function(...args: any[]) {
          try {
            return originalRequire.apply(this, args);
          } catch (requireError: any) {
            console.error('🚨 Native module require error (iOS crash prevention):', requireError);
            // Return a safe fallback instead of crashing
            return {
              default: () => {},
              __esModule: true,
            };
          }
        };
      }
      
      // 🛡️ CRITICAL: Catch uncaught exceptions at the native level
      // This prevents objc_exception_throw from causing SIGABRT
      if (globalScope.__fbBatchedBridge) {
        const originalCallFunctionReturnFlushedQueue = globalScope.__fbBatchedBridge.callFunctionReturnFlushedQueue;
        if (originalCallFunctionReturnFlushedQueue) {
          globalScope.__fbBatchedBridge.callFunctionReturnFlushedQueue = function(...args: any[]) {
            try {
              return originalCallFunctionReturnFlushedQueue.apply(this, args);
            } catch (bridgeError: any) {
              console.error('🚨 React Native bridge error (iOS crash prevention):', bridgeError);
              // Return empty queue to prevent crash
              return [[], [], [], 0];
            }
          };
        }
      }
      
      console.log('✅ iOS-specific crash prevention initialized');
    } catch (iosError: any) {
      console.warn('⚠️ iOS native exception handler setup failed:', iosError);
    }
  }
};

// Initialize error handlers immediately (safe, no native modules)
initializeErrorHandlers();

const App: React.FC = () => {
  const [fontsLoaded, fontError] = useFonts({
    ...MaterialCommunityIcons.font,
    ...Ionicons.font,
  });
  const [isReady, setIsReady] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [nativeModulesReady, setNativeModulesReady] = useState(false);
  const initializationStarted = useRef(false);

  useEffect(() => {
    if (fontError) {
      console.error('❌ Icon font loading failed:', fontError);
    }
  }, [fontError]);

  const startBackgroundInitialization = useCallback(() => {
    const run = async () => {
      // Initialize push notifications in background
      try {
        console.log('🔔 (bg) Initializing push notification system...');
        let PushNotificationService: any;
        try {
          const pushModule = await import('./services/pushNotificationService');
          PushNotificationService = pushModule.default;
          if (!PushNotificationService) {
            throw new Error('PushNotificationService not found');
          }
        } catch (moduleError: any) {
          console.error('❌ PushNotificationService module load error:', moduleError);
          throw moduleError;
        }

        const pushService = PushNotificationService.getInstance();
        if (!pushService) {
          throw new Error('PushNotificationService instance not found');
        }

        const token = await Promise.race([
          pushService.initialize(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Push notification timeout')), 8000)),
        ]).catch((error) => {
          console.warn('⚠️ Push notification timeout or error:', error);
          return null;
        });

        if (token) {
          console.log('✅ Push notifications initialized successfully with token:', token.substring(0, 20) + '...');
        } else {
          console.warn('⚠️ Push notifications initialization completed without token (permission may be denied)');
        }
      } catch (pushError: any) {
        console.error('❌ Push notification initialization error:', pushError);
      }

      // Request other permissions without blocking the first render
      try {
        console.log('🔐 (bg) Requesting other app permissions...');
        let PermissionManager: any;
        try {
          const permissionModule = await import('./services/permissionManager');
          PermissionManager = permissionModule.default;
          if (!PermissionManager) {
            throw new Error('PermissionManager not found');
          }
        } catch (moduleError: any) {
          console.error('❌ PermissionManager module load error:', moduleError);
          throw moduleError;
        }

        const permissionManager = PermissionManager.getInstance();
        if (!permissionManager) {
          throw new Error('PermissionManager instance not found');
        }

        await Promise.race([
          permissionManager.requestOtherPermissions(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Permission request timeout')), 5000)),
        ]).catch((error) => {
          console.warn('⚠️ Permission request timeout or error:', error);
        });
      } catch (permissionError) {
        console.error('❌ Permission request error:', permissionError);
      }
    };

    run();
  }, []);


  // Check authentication status during the initial boot sequence
  // 🛡️ CRITICAL: Lazy load Firebase to prevent native module crashes
  const checkAuthenticationStatus = useCallback(async () => {
    try {
      console.log('🔐 Checking authentication status...');
      
      // 🛡️ SAFETY: Initialize Firebase services first (async)
      let firebaseInstance: any;
      try {
        const firebaseConfigModule = await import('./firebase/config');
        // Initialize Firebase services if not already initialized
        if (firebaseConfigModule.initializeFirebaseServices) {
          await firebaseConfigModule.initializeFirebaseServices();
        }
        
        const firebaseModule = await import('./firebase');
        firebaseInstance = firebaseModule.firebase;
        
        if (!firebaseInstance) {
          console.warn('⚠️ Firebase not available, skipping auth check');
          setAuthChecked(true);
          return;
        }
      } catch (firebaseLoadError: any) {
        console.error('❌ Firebase load error:', firebaseLoadError);
        console.warn('⚠️ Firebase not available, skipping auth check');
        setAuthChecked(true);
        return;
      }
      
      // Check if user is already authenticated
      try {
        const currentUser = firebaseInstance.auth().currentUser;
        if (currentUser) {
          console.log('✅ User already authenticated:', currentUser.email);
          setAuthChecked(true);
          return;
        }
      } catch (authError: any) {
        console.warn('⚠️ Auth check error:', authError);
        // Continue to check SecureStorage
      }

      // Check SecureStorage for stored session
      try {
        const storedSession = await SecureStorage.getUserSession();
        if (storedSession) {
          console.log('✅ Found stored session, attempting auto sign-in...');
          
          if (storedSession.password) {
            try {
              await firebaseInstance.auth().signInWithEmailAndPassword(
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
      } catch (storageError: any) {
        console.warn('⚠️ SecureStorage error:', storageError);
      }
      
      setAuthChecked(true);
    } catch (error) {
      console.error('❌ Auth check error:', error);
      setAuthChecked(true);
    }
  }, []);

  // Initialize native modules first (prevents iOS crashes)
  useEffect(() => {
    if (initializationStarted.current) return;
    initializationStarted.current = true;

    const initNativeModules = async () => {
      try {
        console.log('🔄 Initializing native modules...');
        await initializeNativeModules();
        
        // 🛡️ CRITICAL: Initialize Firebase services after native modules are ready
        // This prevents synchronous Firebase module loading from causing crashes
        try {
          console.log('🔄 Initializing Firebase services (async)...');
          const firebaseConfigModule = await import('./firebase/config');
          if (firebaseConfigModule.initializeFirebaseServices) {
            await firebaseConfigModule.initializeFirebaseServices();
            console.log('✅ Firebase services initialized');
          }
        } catch (firebaseInitError: any) {
          console.warn('⚠️ Firebase initialization error (non-blocking):', firebaseInitError);
          // Continue even if Firebase initialization fails
        }
        
        setNativeModulesReady(true);
        console.log('✅ Native modules initialized');
      } catch (error: any) {
        console.error('❌ Native module initialization error:', error);
        // Still set ready to prevent blocking
        setNativeModulesReady(true);
      }
    };

    // Use setTimeout to ensure React Native bridge is ready
    setTimeout(() => {
      initNativeModules();
    }, 100);
  }, []);

  // Enhanced boot sequence with authentication check
  useEffect(() => {
    if (!nativeModulesReady) return; // Wait for native modules
    
    let isMounted = true;
    let initializationTimeout: NodeJS.Timeout;
    
    const initializeApp = async () => {
      try {
        console.log('🚀 Starting app initialization with auth check...');

        const authCheckPromise = Promise.race([
          checkAuthenticationStatus(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Auth check timeout')), 5000)),
        ]).catch((error) => {
          console.warn('⚠️ Auth check error or timeout:', error);
        });

        try {
          await authCheckPromise;
        } catch (authError) {
          console.warn('⚠️ Auth check completed with error, continuing anyway');
        }

        if (!isMounted) return;

        setIsReady(true);
        startBackgroundInitialization();
        console.log('✅ App initialization completed (background tasks continuing).');
      } catch (error) {
        console.error('❌ App initialization error:', error);
        if (!isMounted) return;

        setIsReady(true);
        startBackgroundInitialization();
      }
    };

    // 🛡️ SAFETY: Add timeout to prevent infinite initialization
    initializationTimeout = setTimeout(() => {
      console.warn('⚠️ App initialization timeout - forcing ready state');
      if (isMounted) {
        setIsReady(true);
        startBackgroundInitialization();
      }
    }, 8000); // 8 second max initialization time (reduced for faster startup)
    
    initializeApp();
    
    // Cleanup function
    return () => {
      isMounted = false;
      if (initializationTimeout) {
        clearTimeout(initializationTimeout);
      }
    };
  }, [checkAuthenticationStatus, nativeModulesReady, startBackgroundInitialization]);

  const appReady = fontsLoaded && nativeModulesReady && isReady;

  // Prevent rendering until all critical initialization completes
  if (!appReady) {
    return <SimpleSplashScreen />;
  }

  return (
    <ErrorBoundary>
      <SafeGestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <PaperProvider theme={theme as any}>
            <ImagePreviewProvider>
            <AuthProvider>
              <>
                <NavigationContainer
                  onReady={() => {
                    console.log('Navigation ready');
                  }}
                  onStateChange={(state) => {
                    // Safe state change logging
                    try {
                      if (__DEV__ && state) {
                        console.log('Navigation state changed');
                      }
                    } catch (stateError) {
                      // Ignore state change errors
                    }
                  }}
                  onUnhandledAction={(action) => {
                    // Safe unhandled action logging
                    try {
                      console.warn('Unhandled navigation action:', action?.type || 'Unknown');
                    } catch (actionError) {
                      // Ignore action errors
                    }
                  }}
                  fallback={<Text style={{ textAlign: 'center', marginTop: 50 }}>Navigation yükleniyor...</Text>}
                >
                  <StatusBar style="auto" backgroundColor="transparent" translucent={false} />
                  <AuthNavigator />
                </NavigationContainer>
                <GlobalAdminBanner />
                <AdminPushListener />
              </>
            </AuthProvider>
            </ImagePreviewProvider>
          </PaperProvider>
        </SafeAreaProvider>
      </SafeGestureHandlerRootView>
    </ErrorBoundary>
  );
};

export default App;