// 🛡️ CRITICAL: LAZY LOAD Firebase modules to prevent synchronous native module crashes
// This prevents C++ exception failures during module initialization
// Firebase modules are loaded asynchronously on first use, not at module load time
let initializeApp: any;
let initializeAuth: any;
let initializeFirestore: any;
let getStorage: any;
let FirebaseApp: any;
let Auth: any;
let Firestore: any;
let FirebaseStorage: any;
let firebase: any;
let firebaseFirestore: any; // Compat firestore module

let firebaseModulesLoaded = false;
let firebaseModulesLoading = false;
let firebaseModulesLoadPromise: Promise<void> | null = null;

// 🛡️ CRITICAL: Lazy load Firebase modules asynchronously to prevent iOS crashes
const loadFirebaseModules = async (): Promise<void> => {
  if (firebaseModulesLoaded) return;
  if (firebaseModulesLoading && firebaseModulesLoadPromise) {
    return firebaseModulesLoadPromise;
  }

  firebaseModulesLoading = true;
  firebaseModulesLoadPromise = new Promise((resolve) => {
    // Use setTimeout to ensure this runs after React Native bridge is ready
    setTimeout(() => {
      try {
        const firebaseAppModule = require('firebase/app');
        const firebaseAuthModule = require('firebase/auth');
        const firebaseFirestoreModule = require('firebase/firestore');
        const firebaseStorageModule = require('firebase/storage');
        const firebaseCompatModule = require('firebase/compat/app');
        
        initializeApp = firebaseAppModule.initializeApp;
        FirebaseApp = firebaseAppModule.FirebaseApp;
        initializeAuth = firebaseAuthModule.initializeAuth;
        Auth = firebaseAuthModule.Auth;
        initializeFirestore = firebaseFirestoreModule.initializeFirestore;
        Firestore = firebaseFirestoreModule.Firestore;
        getStorage = firebaseStorageModule.getStorage;
        FirebaseStorage = firebaseStorageModule.FirebaseStorage;
        firebase = firebaseCompatModule.default;
        
        // Import compat modules safely
        try {
          const firebaseCompatFirestore = require('firebase/compat/firestore');
          const firebaseCompatAuth = require('firebase/compat/auth');
          const firebaseCompatStorage = require('firebase/compat/storage');
          
          // Initialize compat firestore
          if (firebaseCompatFirestore && firebase) {
            firebase.firestore = firebaseCompatFirestore.default || firebaseCompatFirestore;
          }
          
          // Initialize compat auth
          if (firebaseCompatAuth && firebase) {
            firebase.auth = firebaseCompatAuth.default || firebaseCompatAuth;
          }
          
          // Initialize compat storage
          if (firebaseCompatStorage && firebase) {
            firebase.storage = firebaseCompatStorage.default || firebaseCompatStorage;
          }
          
          firebaseFirestore = firebase.firestore;
        } catch (compatImportError: any) {
          console.warn('⚠️ Firebase compat module import warning:', compatImportError);
          // Set fallback
          firebaseFirestore = null;
        }
        
        firebaseModulesLoaded = true;
        console.log('✅ Firebase modules loaded successfully (async)');
        resolve();
      } catch (importError: any) {
        console.error('❌ Firebase module import failed:', importError);
        console.error('❌ Error details:', importError.message, importError.stack);
        // Set defaults to prevent undefined errors
        initializeApp = () => { throw new Error('Firebase not available'); };
        initializeAuth = () => { throw new Error('Firebase Auth not available'); };
        initializeFirestore = () => { throw new Error('Firebase Firestore not available'); };
        getStorage = () => { throw new Error('Firebase Storage not available'); };
        firebase = { 
          apps: [], 
          auth: () => { throw new Error('Firebase not available'); },
          firestore: () => { throw new Error('Firebase Firestore not available'); }
        };
        firebaseFirestore = null;
        firebaseModulesLoaded = true; // Mark as loaded even on error to prevent retry loops
        resolve();
      } finally {
        firebaseModulesLoading = false;
      }
    }, 0); // Run in next tick
  });

  return firebaseModulesLoadPromise;
};

import Constants from 'expo-constants';
import { Platform } from 'react-native';

// React Native polyfills for Firebase Storage (only add if not present)
try {
  const { decode, encode } = require('base-64');

  if (typeof global !== 'undefined') {
    if (!global.btoa) {
      global.btoa = encode;
    }
    if (!global.atob) {
      global.atob = decode;
    }
  }
} catch (error) {
  console.warn('Base64 polyfill not available:', error);
}

// Get platform-specific app ID
const getAppId = (): string => {
  const platform = Platform.OS;
  if (platform === 'ios') {
    return Constants.expoConfig?.extra?.firebaseAppIdIos || "1:946853543876:ios:94254d726ecfa6e263ae91";
  } else {
    return Constants.expoConfig?.extra?.firebaseAppIdAndroid || "1:946853543876:android:969ff06b2d211c3263ae91";
  }
};

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey || "AIzaSyCMnMdxxsoiX83i0CrQF7_gCM5tuTgEs5I",
  authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain || "universe-a6f60.firebaseapp.com",
  projectId: Constants.expoConfig?.extra?.firebaseProjectId || "universe-a6f60",
  storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket || "universe-a6f60.firebasestorage.app",
  messagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId || "946853543876",
  appId: getAppId(),
};

// Firebase services with error handling
let app: any;
let auth: any;
let firestore: any;
let storage: any;

let firebaseInitialized = false;
let firebaseInitializing = false;
let firebaseInitPromise: Promise<void> | null = null;

// 🛡️ CRITICAL: Lazy initialize Firebase services asynchronously to prevent iOS crashes
const initializeFirebaseServices = async (): Promise<void> => {
  if (firebaseInitialized) return;
  if (firebaseInitializing && firebaseInitPromise) {
    return firebaseInitPromise;
  }

  // First, ensure Firebase modules are loaded
  await loadFirebaseModules();

  firebaseInitializing = true;
  firebaseInitPromise = new Promise((resolve) => {
    // Use setTimeout to ensure this runs after React Native bridge is ready
    setTimeout(() => {
      try {
        // Initialize Firebase with SIMPLE and SAFE configuration for iOS
        // 🛡️ CRITICAL: All initialization wrapped in try-catch to prevent crashes
        // 🛡️ CRITICAL: Check if Firebase modules are available before initialization
        if (!initializeApp || typeof initializeApp !== 'function') {
          console.error('❌ Firebase modules not available, skipping initialization');
          // Set defaults to prevent undefined errors
          app = null as any;
          auth = null as any;
          firestore = null as any;
          storage = null as any;
          firebaseInitialized = true;
          resolve();
          return;
        }

        // Step 1: Initialize Firebase app (with error handling)
        try {
          app = initializeApp(firebaseConfig);
          console.log('✅ Firebase app initialized');
        } catch (appError: any) {
          console.error('❌ Firebase app initialization failed:', appError);
          // Try to get existing app instance
          try {
            app = initializeApp(firebaseConfig);
          } catch (retryError: any) {
            console.error('❌ Firebase app retry failed:', retryError);
            // Don't throw - set to null to prevent crashes
            app = null as any;
          }
        }

        // Step 2: Initialize Firebase compat SDK for legacy code (with error handling)
        try {
          if (firebase && firebase.apps && !firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            console.log('✅ Firebase compat SDK initialized');
          }
        } catch (compatError: any) {
          console.warn('⚠️ Firebase compat SDK initialization warning:', compatError);
          // Continue without compat SDK if it fails
        }

        // Step 3: Initialize Auth with MINIMAL configuration (no persistence to avoid iOS crashes)
        if (app && initializeAuth && typeof initializeAuth === 'function') {
          try {
            auth = initializeAuth(app);
            console.log('✅ Auth initialized (no persistence for iOS stability)');
          } catch (authError: any) {
            console.error('❌ Auth initialization failed:', authError);
            // Try basic auth initialization
            try {
              auth = initializeAuth(app);
            } catch (retryAuthError: any) {
              console.error('❌ Auth retry failed:', retryAuthError);
              // Don't throw - app can work without auth initially
              auth = null as any;
            }
          }
        } else {
          console.warn('⚠️ Firebase Auth not available');
          auth = null as any;
        }

        // Step 4: Initialize Firestore with MINIMAL configuration
        if (app && initializeFirestore && typeof initializeFirestore === 'function') {
          try {
            firestore = initializeFirestore(app);
            console.log('✅ Firestore initialized');
          } catch (firestoreError: any) {
            console.error('❌ Firestore initialization failed:', firestoreError);
            // Try basic firestore initialization
            try {
              firestore = initializeFirestore(app);
            } catch (retryFirestoreError: any) {
              console.error('❌ Firestore retry failed:', retryFirestoreError);
              // Don't throw - app can work without firestore initially
              firestore = null as any;
            }
          }
        } else {
          console.warn('⚠️ Firebase Firestore not available');
          firestore = null as any;
        }

        // Step 5: Initialize Storage
        if (app && getStorage && typeof getStorage === 'function') {
          try {
            storage = getStorage(app);
            console.log('✅ Storage initialized');
          } catch (storageError: any) {
            console.error('❌ Storage initialization failed:', storageError);
            // Try basic storage initialization
            try {
              storage = getStorage(app);
            } catch (retryStorageError: any) {
              console.error('❌ Storage retry failed:', retryStorageError);
              // Don't throw - app can work without storage initially
              storage = null as any;
            }
          }
        } else {
          console.warn('⚠️ Firebase Storage not available');
          storage = null as any;
        }

        if (app) {
          console.log('✅ Firebase initialized successfully with SIMPLE configuration (async)');
          console.log('📦 Firebase Config:', {
            projectId: firebaseConfig.projectId,
            storageBucket: firebaseConfig.storageBucket
          });
        }

        firebaseInitialized = true;
        resolve();
      } catch (initError: any) {
        console.error('❌ Firebase initialization failed:', initError);
        console.error('❌ Error details:', initError.message, initError.stack);
        
        // 🛡️ CRITICAL: Set all to null to prevent crashes
        app = null as any;
        auth = null as any;
        firestore = null as any;
        storage = null as any;
        
        console.error('❌ App will run with LIMITED functionality');
        firebaseInitialized = true; // Mark as initialized even on error to prevent retry loops
        resolve();
      } finally {
        firebaseInitializing = false;
      }
    }, 0); // Run in next tick
  });

  return firebaseInitPromise;
};

// Helper function to get firestore instance (for compat with firestore() calls)
export const getFirestore = async () => {
  await initializeFirebaseServices();
  return firestore;
};

// Helper function to get firebase.firestore() (for compat usage)
export const getFirebaseFirestore = async () => {
  await initializeFirebaseServices();
  if (firebase && firebase.firestore) {
    return firebase.firestore();
  }
  return firestore;
};

// 🛡️ CRITICAL: Export lazy getters that initialize Firebase on first use
// These maintain backward compatibility while ensuring async initialization
export const getApp = async () => {
  await initializeFirebaseServices();
  return app;
};

export const getAuth = async () => {
  await initializeFirebaseServices();
  return auth;
};

export const getFirestoreInstance = async () => {
  await initializeFirebaseServices();
  return firestore;
};

export const getStorageInstance = async () => {
  await initializeFirebaseServices();
  return storage;
};

export const getFirebase = async () => {
  await initializeFirebaseServices();
  return firebase;
};

// Export direct references (for backward compatibility)
// These will be null until initializeFirebaseServices() is called
// App.tsx should call initializeFirebaseServices() early in the app lifecycle
export { app, auth, firestore, storage, firebase, firebaseFirestore };

// Export initialization function for App.tsx to call
export { initializeFirebaseServices };

// Export individual services for tree-shaking optimization
// 🛡️ CRITICAL: Export functions safely (these require modules to be loaded first)
export const initializeAppSafe = async () => {
  await loadFirebaseModules();
  return initializeApp;
};

export const initializeAuthSafe = async () => {
  await loadFirebaseModules();
  return initializeAuth;
};

export const initializeFirestoreSafe = async () => {
  await loadFirebaseModules();
  return initializeFirestore;
};

export const getStorageSafe = async () => {
  await loadFirebaseModules();
  return getStorage;
};
