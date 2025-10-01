/**
 * Firebase Services Index
 * Professional modular Firebase architecture
 */

// Core Firebase exports
export { firebase, auth, firestore, storage } from './config';

// Legacy service modules (maintain compatibility)
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
