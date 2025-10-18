// Real-Time Profile Synchronization Service
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EnhancedUserActivityService } from './enhancedUserActivityService';

export interface ProfileUpdateData {
  displayName?: string;
  username?: string;
  email?: string;
  profileImage?: string;
  bio?: string;
  university?: string;
  department?: string;
  classLevel?: string;
  phoneNumber?: string;
  socialLinks?: {
    instagram?: string;
    twitter?: string;
    linkedin?: string;
  };
}

export interface CacheInvalidationEvent {
  userId: string;
  type: 'profile_update' | 'follow_change' | 'stats_update';
  timestamp: Date;
}

class RealTimeProfileSyncService {
  private static instance: RealTimeProfileSyncService;
  private db = firebase.firestore();
  private activityService = EnhancedUserActivityService.getInstance();
  private cacheInvalidationListeners: Map<string, () => void> = new Map();
  private profileUpdateListeners: Map<string, () => void> = new Map();
  private callbacks: Map<string, ((data: any) => void)[]> = new Map();

  static getInstance(): RealTimeProfileSyncService {
    if (!RealTimeProfileSyncService.instance) {
      RealTimeProfileSyncService.instance = new RealTimeProfileSyncService();
    }
    return RealTimeProfileSyncService.instance;
  }

  /**
   * Callback system
   */
  public on(event: string, callback: (data: any) => void): void {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }
    this.callbacks.get(event)!.push(callback);
  }

  public off(event: string, callback: (data: any) => void): void {
    const callbacks = this.callbacks.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private triggerCallback(event: string, data: any): void {
    const callbacks = this.callbacks.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ Error in callback for event ${event}:`, error);
        }
      });
    }
  }

  /**
   * 🔄 Update user profile with real-time synchronization
   */
  async updateUserProfile(
    userId: string, 
    updateData: ProfileUpdateData,
    userName?: string
  ): Promise<boolean> {
    try {
      console.log('🔄 Starting profile update for user:', userId);

      const batch = this.db.batch();
      const now = firebase.firestore.FieldValue.serverTimestamp();

      // 1. Update user document
      const userRef = this.db.collection('users').doc(userId);
      const updatePayload = {
        ...updateData,
        lastUpdated: now,
        lastProfileUpdate: now,
        profileVersion: firebase.firestore.FieldValue.increment(1)
      };

      batch.update(userRef, updatePayload);

      // 2. Update user cache version for invalidation
      const cacheRef = this.db.collection('userCache').doc(userId);
      batch.set(cacheRef, {
        profileVersion: firebase.firestore.FieldValue.increment(1),
        lastInvalidated: now,
        invalidatedFields: Object.keys(updateData)
      }, { merge: true });

      // 3. Update all related collections that reference this user
      if (updateData.displayName || updateData.username) {
        // Update event organizers
        const eventsQuery = await this.db.collection('events')
          .where('organizerId', '==', userId)
          .get();
        
        eventsQuery.docs.forEach(doc => {
          const eventUpdate: any = {};
          if (updateData.displayName) eventUpdate['organizer.displayName'] = updateData.displayName;
          if (updateData.username) eventUpdate['organizer.username'] = updateData.username;
          if (updateData.profileImage) eventUpdate['organizer.profileImage'] = updateData.profileImage;
          
          batch.update(doc.ref, eventUpdate);
        });

        // Update event attendees
        const attendeesQuery = await this.db.collection('eventAttendees')
          .where('userId', '==', userId)
          .get();
        
        attendeesQuery.docs.forEach(doc => {
          const attendeeUpdate: any = {};
          if (updateData.displayName) attendeeUpdate.displayName = updateData.displayName;
          if (updateData.username) attendeeUpdate.username = updateData.username;
          if (updateData.profileImage) attendeeUpdate.profileImage = updateData.profileImage;
          
          batch.update(doc.ref, attendeeUpdate);
        });

        // Update club members
        const clubMembersQuery = await this.db.collection('clubMembers')
          .where('userId', '==', userId)
          .get();
        
        clubMembersQuery.docs.forEach(doc => {
          const memberUpdate: any = {};
          if (updateData.displayName) memberUpdate.displayName = updateData.displayName;
          if (updateData.username) memberUpdate.username = updateData.username;
          if (updateData.profileImage) memberUpdate.profileImage = updateData.profileImage;
          
          batch.update(doc.ref, memberUpdate);
        });
      }

      // 4. Commit batch update
      await batch.commit();

      // 5. Clear local cache
      await this.clearUserCache(userId);

      // 6. Log profile update activity
      if (userName) {
        await this.activityService.logProfileUpdate(userId, userName, updateData);
      }

      // 7. Trigger cache invalidation for all listeners
      this.triggerCacheInvalidation(userId, 'profile_update');

      // 8. Trigger callback for real-time update
      this.triggerCallback('profileUpdated', { userId, updateData });

      console.log('✅ Profile updated successfully with real-time sync');
      return true;

    } catch (error) {
      console.error('❌ Failed to update profile:', error);
      return false;
    }
  }

  /**
   * 🧹 Clear user cache (local and remote)
   */
  async clearUserCache(userId: string): Promise<void> {
    try {
      // Clear local AsyncStorage cache
      const cacheKeys = [
        `user_profile_${userId}`,
        `user_stats_${userId}`,
        `user_followers_${userId}`,
        `user_following_${userId}`,
        `preloaded_user_profile`
      ];

      await Promise.all(
        cacheKeys.map(key => AsyncStorage.removeItem(key))
      );

      console.log('🧹 User cache cleared for:', userId);
    } catch (error) {
      console.error('❌ Failed to clear user cache:', error);
    }
  }

  /**
   * 📡 Setup real-time profile listener
   */
  setupProfileListener(userId: string, onUpdate: (userData: any) => void): () => void {
    const unsubscribe = this.db.collection('users')
      .doc(userId)
      .onSnapshot(
        (doc) => {
          if (doc.exists) {
            const userData = { id: doc.id, ...doc.data() };
            console.log('📡 Real-time profile update received:', userData);
            onUpdate(userData);
          }
        },
        (error) => {
          console.error('❌ Profile listener error:', error);
        }
      );

    this.profileUpdateListeners.set(userId, unsubscribe);
    return unsubscribe;
  }

  /**
   * 📡 Setup cache invalidation listener
   */
  setupCacheInvalidationListener(userId: string, onInvalidation: () => void): () => void {
    const unsubscribe = this.db.collection('userCache')
      .doc(userId)
      .onSnapshot(
        (doc) => {
          if (doc.exists) {
            console.log('📡 Cache invalidation received for user:', userId);
            onInvalidation();
          }
        },
        (error) => {
          console.error('❌ Cache invalidation listener error:', error);
        }
      );

    this.cacheInvalidationListeners.set(userId, unsubscribe);
    return unsubscribe;
  }

  /**
   * 🔔 Trigger cache invalidation
   */
  private triggerCacheInvalidation(userId: string, type: 'profile_update' | 'follow_change' | 'stats_update'): void {
    const event: CacheInvalidationEvent = {
      userId,
      type,
      timestamp: new Date()
    };

    // Notify all components that might be displaying this user's data
    console.log('🔔 Triggering cache invalidation:', event);
  }

  /**
   * 🧹 Cleanup listeners
   */
  cleanup(): void {
    // Cleanup profile listeners
    this.profileUpdateListeners.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.profileUpdateListeners.clear();

    // Cleanup cache invalidation listeners
    this.cacheInvalidationListeners.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.cacheInvalidationListeners.clear();

    console.log('🧹 Profile sync service cleaned up');
  }

  /**
   * 🔄 Force refresh user data across all components
   */
  async forceRefreshUserData(userId: string): Promise<void> {
    try {
      // Clear all caches
      await this.clearUserCache(userId);

      // Trigger invalidation
      this.triggerCacheInvalidation(userId, 'profile_update');

      console.log('🔄 Forced refresh for user:', userId);
    } catch (error) {
      console.error('❌ Failed to force refresh user data:', error);
    }
  }
}

export default RealTimeProfileSyncService;

