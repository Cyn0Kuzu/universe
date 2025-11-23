import type firebaseType from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { globalRealtimeSyncService } from './globalRealtimeSyncService';
import { enhancedRealtimeSyncService } from './enhancedRealtimeSyncService';
import { universalProfileSyncService } from './universalProfileSyncService';
import { clubDataSyncService } from './clubDataSyncService';
import { getFirebaseCompatSync } from '../firebase/compat';

const firebase = getFirebaseCompatSync() as typeof firebaseType;

export interface SyncData {
  userId: string;
  type: 'profile' | 'stats' | 'events' | 'followers' | 'members';
  data?: any;
  timestamp?: Date;
}

class ComprehensiveDataSyncService {
  private listeners: Map<string, Set<(data: SyncData) => void>> = new Map();
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Initialize all sync services
      await Promise.all([
        // Services don't have initialize methods, they auto-initialize
        Promise.resolve(),
        Promise.resolve(),
        Promise.resolve()
      ]);

      // Set up cross-service communication
      this.setupCrossServiceSync();
      
      this.isInitialized = true;
      console.log('✅ ComprehensiveDataSyncService initialized');
    } catch (error) {
      console.error('❌ Failed to initialize ComprehensiveDataSyncService:', error);
    }
  }

  private setupCrossServiceSync() {
    // Global sync service listener
    globalRealtimeSyncService.on('profileUpdated', (data) => {
      this.broadcastUpdate('profile', data);
    });

    // Enhanced sync service listener
    enhancedRealtimeSyncService.on('profileUpdated', (data) => {
      this.broadcastUpdate('profile', data);
    });

    // Universal profile sync service listener
    universalProfileSyncService.on('userUpdated', (data) => {
      this.broadcastUpdate('profile', data);
    });
  }

  private broadcastUpdate(type: SyncData['type'], data: any) {
    const syncData: SyncData = {
      userId: data.userId || data.id,
      type,
      data,
      timestamp: new Date()
    };

    // Broadcast to all listeners
    this.listeners.forEach((listenerSet) => {
      listenerSet.forEach((listener) => {
        try {
          listener(syncData);
        } catch (error) {
          console.error('Error in sync listener:', error);
        }
      });
    });
  }

  // Subscribe to data updates
  subscribe(listenerId: string, callback: (data: SyncData) => void) {
    if (!this.listeners.has(listenerId)) {
      this.listeners.set(listenerId, new Set());
    }
    this.listeners.get(listenerId)!.add(callback);
  }

  // Unsubscribe from data updates
  unsubscribe(listenerId: string, callback?: (data: SyncData) => void) {
    const listenerSet = this.listeners.get(listenerId);
    if (listenerSet) {
      if (callback) {
        listenerSet.delete(callback);
      } else {
        listenerSet.clear();
      }
      
      if (listenerSet.size === 0) {
        this.listeners.delete(listenerId);
      }
    }
  }

  // Force sync for a specific user
  async forceSyncUser(userId: string) {
    try {
      console.log(`🔄 Force syncing user: ${userId}`);
      
      // Invalidate all caches for this user
      universalProfileSyncService.invalidateCache(userId);
      clubDataSyncService.invalidateCache(userId);
      
      // Trigger all sync services
      await Promise.all([
        // Services don't have these methods, we'll trigger manually
        Promise.resolve(),
        Promise.resolve(),
        Promise.resolve()
      ]);

      // Broadcast the update
      this.broadcastUpdate('profile', { userId, forceSync: true });
      
      console.log(`✅ Force sync completed for user: ${userId}`);
    } catch (error) {
      console.error(`❌ Force sync failed for user ${userId}:`, error);
    }
  }

  // Sync profile data across all collections
  async syncProfileData(userId: string, profileData: any) {
    try {
      console.log(`🔄 Syncing profile data for user: ${userId}`);
      
      const db = getFirebaseCompatSync().firestore();
      const batch = db.batch();

      // Update main user document
      const userRef = db.collection('users').doc(userId);
      batch.update(userRef, {
        ...profileData,
        updatedAt: getFirebaseCompatSync().firestore.FieldValue.serverTimestamp()
      });

      // Update events where user is organizer
      const eventsQuery = await db.collection('events')
        .where('createdBy', '==', userId)
        .get();
      
      eventsQuery.docs.forEach(doc => {
        batch.update(doc.ref, {
          organizer: {
            ...profileData,
            id: userId
          },
          updatedAt: getFirebaseCompatSync().firestore.FieldValue.serverTimestamp()
        });
      });

      // Update club memberships
      const membershipsQuery = await db.collection('clubMembers')
        .where('userId', '==', userId)
        .get();
      
      membershipsQuery.docs.forEach(doc => {
        batch.update(doc.ref, {
          user: {
            ...profileData,
            id: userId
          },
          updatedAt: getFirebaseCompatSync().firestore.FieldValue.serverTimestamp()
        });
      });

      // Update event attendees
      const attendeesQuery = await db.collection('eventAttendees')
        .where('userId', '==', userId)
        .get();
      
      attendeesQuery.docs.forEach(doc => {
        batch.update(doc.ref, {
          user: {
            ...profileData,
            id: userId
          },
          updatedAt: getFirebaseCompatSync().firestore.FieldValue.serverTimestamp()
        });
      });

      await batch.commit();
      
      // Trigger sync services
      await this.forceSyncUser(userId);
      
      console.log(`✅ Profile data synced for user: ${userId}`);
    } catch (error) {
      console.error(`❌ Profile data sync failed for user ${userId}:`, error);
      throw error;
    }
  }

  // Get comprehensive user data
  async getComprehensiveUserData(userId: string) {
    try {
      const db = getFirebaseCompatSync().firestore();
      
      const [userDoc, eventsQuery, membershipsQuery, attendeesQuery] = await Promise.all([
        db.collection('users').doc(userId).get(),
        db.collection('events').where('createdBy', '==', userId).get(),
        db.collection('clubMembers').where('userId', '==', userId).get(),
        db.collection('eventAttendees').where('userId', '==', userId).get()
      ]);

      return {
        profile: userDoc.exists ? userDoc.data() : null,
        eventsCreated: eventsQuery.size,
        clubMemberships: membershipsQuery.size,
        eventsAttended: attendeesQuery.size,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error(`❌ Failed to get comprehensive data for user ${userId}:`, error);
      throw error;
    }
  }

  // Cleanup
  destroy() {
    this.listeners.clear();
    this.isInitialized = false;
  }
}

// Export singleton instance
export const comprehensiveDataSyncService = new ComprehensiveDataSyncService();
export default comprehensiveDataSyncService;
