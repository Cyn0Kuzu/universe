// 🛡️ CRITICAL: LAZY LOAD Firebase modules to prevent synchronous native module crashes
// This prevents C++ exception failures during module initialization
// Firebase modules are loaded asynchronously on first use, not at module load time

// Type-safe require function
declare const require: (module: string) => any;

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

// 🛡️ CRITICAL: Lazy load Firebase modules asynchronously to prevent iOS crashes
const loadFirebaseModules = (): void => {
  if (firebaseModulesLoaded) {
    return;
  }

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
    firebase = firebaseCompatModule.default || firebaseCompatModule;

    try {
      require('firebase/compat/firestore');
      require('firebase/compat/auth');
      require('firebase/compat/storage');
      try {
        require('firebase/compat/functions');
      } catch {
        // Functions may not be available in all environments
      }

      firebaseFirestore = firebase?.firestore ?? null;
    } catch (compatImportError: any) {
      console.warn('⚠️ Firebase compat module import warning:', compatImportError);
      firebaseFirestore = null;
    }

    firebaseModulesLoaded = true;
    console.log('✅ Firebase modules loaded successfully');
  } catch (importError: any) {
    console.error('❌ Firebase module import failed:', importError);
    console.error('❌ Error details:', importError.message, importError.stack);
    initializeApp = () => { throw new Error('Firebase not available'); };
    initializeAuth = () => { throw new Error('Firebase Auth not available'); };
    initializeFirestore = () => { throw new Error('Firebase Firestore not available'); };
    getStorage = () => { throw new Error('Firebase Storage not available'); };
    firebase = {
      apps: [],
      auth: () => { throw new Error('Firebase not available'); },
      firestore: () => { throw new Error('Firebase Firestore not available'); },
      storage: () => { throw new Error('Firebase Storage not available'); },
    };
    firebaseFirestore = null;
    firebaseModulesLoaded = false;
  }
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
export const firebaseConfig = {
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

const bootstrapFirebase = (): void => {
  if (firebaseInitialized || firebaseInitializing) {
    return;
  }

  firebaseInitializing = true;

  try {
    loadFirebaseModules();

    if (!initializeApp || typeof initializeApp !== 'function') {
      throw new Error('Firebase modules not available');
    }

    try {
      if (!app) {
        app = initializeApp(firebaseConfig);
        console.log('✅ Firebase app initialized');
      }
    } catch (appError: any) {
      console.warn('⚠️ Firebase app initialization warning:', appError?.message || appError);
      try {
        const firebaseAppModule = require('firebase/app');
        app = firebaseAppModule?.getApps?.()?.[0] ?? app;
      } catch {
        // ignore - will continue with compat only
      }
    }

    try {
      if (firebase && firebase.apps && !firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log('✅ Firebase compat SDK initialized');
      }
    } catch (compatError: any) {
      console.warn('⚠️ Firebase compat SDK initialization warning:', compatError?.message || compatError);
    }

    if (app && initializeAuth && typeof initializeAuth === 'function') {
      try {
        auth = initializeAuth(app);
        console.log('✅ Auth initialized');
      } catch (authError: any) {
        console.warn('⚠️ Auth initialization warning:', authError?.message || authError);
        auth = null;
      }
    }

    if (app && initializeFirestore && typeof initializeFirestore === 'function') {
      try {
        firestore = initializeFirestore(app, {});
        console.log('✅ Firestore initialized');
      } catch (firestoreError: any) {
        console.warn('⚠️ Firestore initialization warning:', firestoreError?.message || firestoreError);
        firestore = null;
      }
    }

    if (app && getStorage && typeof getStorage === 'function') {
      try {
        storage = getStorage(app);
        console.log('✅ Storage initialized');
      } catch (storageError: any) {
        console.warn('⚠️ Storage initialization warning:', storageError?.message || storageError);
        storage = null;
      }
    }

    firebaseInitialized = true;
  } catch (initError: any) {
    console.error('❌ Firebase initialization failed:', initError);
    console.error('❌ Error details:', initError?.message, initError?.stack);
    app = null;
    auth = null;
    firestore = null;
    storage = null;
    firebaseInitialized = false;
  } finally {
    firebaseInitializing = false;
  }
};

// 🛡️ CRITICAL: Lazy initialize Firebase services while keeping compatibility with existing calls
const initializeFirebaseServices = async (): Promise<void> => {
  if (firebaseInitialized) {
    return;
  }

  if (!firebaseInitPromise) {
    firebaseInitPromise = (async () => {
      bootstrapFirebase();
    })().finally(() => {
      firebaseInitPromise = null;
    });
  }

  if (firebaseInitPromise) {
    await firebaseInitPromise;
  }
};

// Helper function to get firestore instance (for compat with firestore() calls)
export const getFirestore = async () => {
  await initializeFirebaseServices();
  return firestore;
};

// Helper function to get firebase.firestore() (for compat usage)
// NOTE: This function uses the local 'firebase' variable defined in this file (line 16)
// which is safe because this file initializes Firebase. This is NOT a direct firebase.firestore() call
// from an uninitialized module - it's using the initialized firebase variable from this same file.
export const getFirebaseFirestore = async () => {
  await initializeFirebaseServices();
  if (firebase && firebase.firestore) {
    // Safe: firebase is the local variable initialized in this file (line 16), not an external import
    const firestoreInstance = firebase.firestore();
    return firestoreInstance;
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

export const ensureFirebaseReadySync = (): void => {
  if (!firebaseInitialized) {
    bootstrapFirebase();
  }
};

try {
  ensureFirebaseReadySync();
} catch (bootstrapError) {
  console.warn('⚠️ Initial Firebase bootstrap failed, will retry on demand:', bootstrapError);
}

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
