/**
 * Firebase Services Index
 * Professional modular Firebase architecture
 * 🛡️ CRITICAL: Lazy load Firebase exports to prevent native module crashes
 */

// Type-safe require function
declare const require: (module: string) => any;

// 🛡️ CRITICAL: Lazy getters for Firebase core services
// These ensure Firebase modules are loaded asynchronously on first use
export const getFirebase = async () => {
  const configModule = require('./config');
  await configModule.initializeFirebaseServices();
  return configModule.firebase;
};

export const getAuth = async () => {
  const configModule = require('./config');
  await configModule.initializeFirebaseServices();
  return configModule.auth;
};

export const getFirestore = async () => {
  const configModule = require('./config');
  await configModule.initializeFirebaseServices();
  return configModule.firestore;
};

export const getStorage = async () => {
  const configModule = require('./config');
  await configModule.initializeFirebaseServices();
  return configModule.storage;
};

// 🛡️ CRITICAL: Direct exports from config.ts for backward compatibility
// These will be null until initializeFirebaseServices() is called
// Use lazy getters (getFirebase, getAuth, etc.) instead for better control
// App.tsx should call initializeFirebaseServices() early in the app lifecycle
// These are re-exported from config.ts which handles lazy loading internally
export { app, auth, firestore, storage, firebase, firebaseFirestore } from './config';

// Legacy service modules (maintain compatibility)
// These are safe to export as they don't initialize Firebase at import time
export * from './auth';
export * from './userProfile';
export * from './membership';
export * from './eventManagement';
export * from './commentManagement';

// Club management spesifik exports (çakışmayı önlemek için)
export { 
  leaveClub, 
  deleteClubSafely 
} from './clubManagement';

// Firestore utilities and types
export type { PostData, CommentData } from './firestore';

export { getFirebaseCompat, getFirebaseCompatSync } from './compat';
