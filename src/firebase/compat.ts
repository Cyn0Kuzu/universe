import type firebaseType from 'firebase/compat/app';
import {
  firebase as firebaseCompatExport,
  initializeFirebaseServices,
  ensureFirebaseReadySync,
} from './config';

let firebaseCompatCache: typeof firebaseType | null = null;

const resolveFirebaseCompat = (): typeof firebaseType => {
  ensureFirebaseReadySync();
  if (firebaseCompatCache) {
    return firebaseCompatCache;
  }
  if (!firebaseCompatExport) {
    throw new Error('Firebase compat SDK has not been initialized');
  }
  firebaseCompatCache = firebaseCompatExport as typeof firebaseType;
  return firebaseCompatCache;
};

export const getFirebaseCompatSync = (): typeof firebaseType => {
  return resolveFirebaseCompat();
};

export const getFirebaseCompat = async (): Promise<typeof firebaseType> => {
  await initializeFirebaseServices();
  return resolveFirebaseCompat();
};

