import { initializeApp, FirebaseApp } from 'firebase/app';
import { initializeAuth, Auth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
// Firebase compat SDK for legacy code compatibility
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/auth';
import 'firebase/compat/storage';

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

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey || "AIzaSyDcaOq6dViuwHtnBdOoUhuIPGl21_L25Uc",
  authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain || "universe-a6f60.firebaseapp.com",
  projectId: Constants.expoConfig?.extra?.firebaseProjectId || "universe-a6f60",
  storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket || "universe-a6f60.appspot.com",
  messagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId || "946853543876",
  appId: Constants.expoConfig?.extra?.firebaseAppId || "1:946853543876:android:7a40780d639fa5f763ae91",
};

// Firebase services with error handling
let app: FirebaseApp;
let auth: Auth;
let firestore: Firestore;
let storage: FirebaseStorage;

// Initialize Firebase with modern SDK
try {
  app = initializeApp(firebaseConfig);

  // Initialize Firebase compat SDK for legacy code
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  // Auth with default persistence
  auth = initializeAuth(app);

  // Firestore with optimized cache settings
  firestore = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });

  // Storage with optimized configuration
  storage = getStorage(app);

  console.log('✅ Firebase initialized successfully with modern SDK + compat');
  console.log('📦 Firebase Config:', {
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket,
    apiKey: firebaseConfig.apiKey ? '***' : 'MISSING'
  });
} catch (initError: any) {
  console.error('❌ Firebase initialization failed:', initError);
  console.error('❌ Config details:', {
    projectId: firebaseConfig.projectId,
    hasApiKey: !!firebaseConfig.apiKey,
    hasAuthDomain: !!firebaseConfig.authDomain
  });
  // Don't throw, allow app to continue with limited functionality
  console.warn('⚠️ App will continue with limited functionality');
}

export { app, auth, firestore, storage, firebase };

// Export individual services for tree-shaking optimization
export { initializeApp } from 'firebase/app';
export { initializeAuth } from 'firebase/auth';
export { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
export { getStorage } from 'firebase/storage';

// Storage is initialized in try-catch block above
