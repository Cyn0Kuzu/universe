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
} else {
  console.log('🔥 Firebase already initialized');
}

// Get Firebase services with error handling
let auth: firebase.auth.Auth;
let firestore: firebase.firestore.Firestore;
let storage: firebase.storage.Storage;

try {
  auth = firebase.auth();
  
  // Set network timeout to prevent hanging
  if (auth && typeof (auth as any).settings === 'function') {
    try {
      (auth as any).settings({ appVerificationDisabledForTesting: false });
    } catch (settingsError) {
      console.warn('⚠️ Could not set auth settings:', settingsError);
    }
  }
  
  // Persistence will be handled by FirebaseAuthPersistenceManager
  // Don't set persistence here to avoid conflicts
  console.log('✅ Firebase Auth initialized (persistence will be managed separately)');
} catch (authError) {
  console.error('❌ Firebase Auth initialization failed:', authError);
  console.error('❌ This will prevent user authentication from working');
  throw authError;
}

try {
  firestore = firebase.firestore();
  
  // Configure Firestore settings for better performance and reliability
  firestore.settings({
    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
    ignoreUndefinedProperties: true,
  });
  
  console.log('✅ Firestore initialized with cache');
} catch (firestoreError) {
  console.error('❌ Firestore initialization failed:', firestoreError);
  console.error('❌ This will prevent data access from working');
  throw firestoreError;
}

try {
  storage = firebase.storage();
  
  // Verify storage bucket is configured
  const { storageBucket } = storage.app.options as any;
  if (!storageBucket || storageBucket === '') {
    console.error('❌ Storage bucket is not configured!');
    console.error('❌ Check Firebase Console -> Storage -> Get Started');
  }
  
  console.log('✅ Firebase Storage initialized');
  console.log('🪣 Storage bucket:', storageBucket);
} catch (storageError) {
  console.error('❌ Firebase Storage initialization failed:', storageError);
  console.error('❌ This will prevent image uploads from working');
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
