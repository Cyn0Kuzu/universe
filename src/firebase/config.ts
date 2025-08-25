import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';
import Constants from 'expo-constants';

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

// Initialize Firebase if it hasn't been initialized already
if (!firebase.apps.length) {
  try {
    firebase.initializeApp(firebaseConfig);
    console.log('🔥 Firebase initialized successfully');
  } catch (initError: any) {
    console.error('❌ Firebase initialization failed:', initError);
    // Don't throw, allow app to continue with limited functionality
    console.warn('⚠️ App will continue with limited functionality');
  }
} else {
  console.log('🔥 Firebase already initialized');
}

// Get Firebase services with error handling
let auth: firebase.auth.Auth;
let firestore: firebase.firestore.Firestore;
let storage: firebase.storage.Storage;

try {
  auth = firebase.auth();
  
  // Persistence will be handled by FirebaseAuthPersistenceManager
  // Don't set persistence here to avoid conflicts
  console.log('✅ Firebase Auth initialized (persistence will be managed separately)');
} catch (authError) {
  console.error('❌ Firebase Auth initialization failed:', authError);
  throw authError;
}

try {
  firestore = firebase.firestore();
  console.log('✅ Firestore initialized');
} catch (firestoreError) {
  console.error('❌ Firestore initialization failed:', firestoreError);
  throw firestoreError;
}

try {
  storage = firebase.storage();
  console.log('✅ Firebase Storage initialized');
  console.log('🪣 Storage bucket:', (storage.app.options as any).storageBucket);
} catch (storageError) {
  console.error('❌ Firebase Storage initialization failed:', storageError);
  throw storageError;
}

export { firebase, auth, firestore, storage };

// Debug storage configuration
if (storage) {
  console.log('🔧 Storage debug info:', {
    bucket: (storage.app.options as any).storageBucket,
    appName: storage.app.name,
    projectId: (storage.app.options as any).projectId
  });
}
