// Enhanced Data Synchronization Service
import type firebaseType from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { comprehensiveErrorHandler } from '../utils/comprehensiveErrorHandler';
import { getFirebaseCompatSync } from '../firebase/compat';

const firebase = getFirebaseCompatSync() as typeof firebaseType;

interface SyncConfig {
  collection: string;
  userId?: string;
  clubId?: string;
  eventId?: string;
  fields?: string[];
  realTime?: boolean;
}

interface SyncResult {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: Date;
}

class EnhancedDataSyncService {
  private static instance: EnhancedDataSyncService;
  private db: firebaseType.firestore.Firestore;
  private syncCache: Map<string, { data: any; timestamp: Date }> = new Map();
  private listeners: Map<string, () => void> = new Map();
  private syncQueue: Array<{ config: SyncConfig; resolve: Function; reject: Function }> = [];
  private isProcessingQueue = false;

  private constructor() {
    this.db = getFirebaseCompatSync().firestore();
    this.startQueueProcessor();
  }

  public static getInstance(): EnhancedDataSyncService {
    if (!EnhancedDataSyncService.instance) {
      EnhancedDataSyncService.instance = new EnhancedDataSyncService();
    }
    return EnhancedDataSyncService.instance;
  }

  /**
   * Sync user profile data across all screens
   */
  async syncUserProfile(userId: string): Promise<SyncResult> {
    try {
      console.log('🔄 Syncing user profile:', userId);

      const startTime = Date.now();
      
      // Get user data
      const userDoc = await this.db.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      
      // Update cache
      this.syncCache.set(`user_${userId}`, {
        data: userData,
        timestamp: new Date()
      });

      // Update related collections
      await this.updateRelatedUserData(userId, userData);

      const syncTime = Date.now() - startTime;
      console.log(`✅ User profile synced in ${syncTime}ms`);

      return {
        success: true,
        data: userData,
        timestamp: new Date()
      };

    } catch (error) {
      comprehensiveErrorHandler.handleFirebaseError(error, {
        userId,
        screen: 'EnhancedDataSyncService',
        action: 'syncUserProfile'
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * Sync club data across all screens
   */
  async syncClubData(clubId: string): Promise<SyncResult> {
    try {
      console.log('🔄 Syncing club data:', clubId);

      const startTime = Date.now();
      
      // Get club data
      const clubDoc = await this.db.collection('users').doc(clubId).get();
      
      if (!clubDoc.exists) {
        throw new Error('Club not found');
      }

      const clubData = clubDoc.data();
      
      // Update cache
      this.syncCache.set(`club_${clubId}`, {
        data: clubData,
        timestamp: new Date()
      });

      // Update related collections
      await this.updateRelatedClubData(clubId, clubData);

      const syncTime = Date.now() - startTime;
      console.log(`✅ Club data synced in ${syncTime}ms`);

      return {
        success: true,
        data: clubData,
        timestamp: new Date()
      };

    } catch (error) {
      comprehensiveErrorHandler.handleFirebaseError(error, {
        userId: clubId,
        screen: 'EnhancedDataSyncService',
        action: 'syncClubData'
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * Sync event data
   */
  async syncEventData(eventId: string): Promise<SyncResult> {
    try {
      console.log('🔄 Syncing event data:', eventId);

      const startTime = Date.now();
      
      // Get event data
      const eventDoc = await this.db.collection('events').doc(eventId).get();
      
      if (!eventDoc.exists) {
        throw new Error('Event not found');
      }

      const eventData = eventDoc.data();
      
      // Update cache
      this.syncCache.set(`event_${eventId}`, {
        data: eventData,
        timestamp: new Date()
      });

      const syncTime = Date.now() - startTime;
      console.log(`✅ Event data synced in ${syncTime}ms`);

      return {
        success: true,
        data: eventData,
        timestamp: new Date()
      };

    } catch (error) {
      comprehensiveErrorHandler.handleFirebaseError(error, {
        screen: 'EnhancedDataSyncService',
        action: 'syncEventData'
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * Update related user data in other collections
   */
  private async updateRelatedUserData(userId: string, userData: any): Promise<void> {
    try {
      const batch = this.db.batch();

      // Update events where user is organizer
      const eventsQuery = await this.db.collection('events')
        .where('createdBy', '==', userId)
        .get();

      eventsQuery.docs.forEach(doc => {
        const eventUpdate: any = {};
        if (userData.displayName) eventUpdate['organizer.displayName'] = userData.displayName;
        if (userData.username) eventUpdate['organizer.username'] = userData.username;
        if (userData.profileImage) eventUpdate['organizer.profileImage'] = userData.profileImage;
        
        batch.update(doc.ref, eventUpdate);
      });

      // Update event attendees
      const attendeesQuery = await this.db.collection('eventAttendees')
        .where('userId', '==', userId)
        .get();

      attendeesQuery.docs.forEach(doc => {
        const attendeeUpdate: any = {};
        if (userData.displayName) attendeeUpdate.displayName = userData.displayName;
        if (userData.username) attendeeUpdate.username = userData.username;
        if (userData.profileImage) attendeeUpdate.profileImage = userData.profileImage;
        
        batch.update(doc.ref, attendeeUpdate);
      });

      // Update club members
      const clubMembersQuery = await this.db.collection('clubMembers')
        .where('userId', '==', userId)
        .get();

      clubMembersQuery.docs.forEach(doc => {
        const memberUpdate: any = {};
        if (userData.displayName) memberUpdate.displayName = userData.displayName;
        if (userData.username) memberUpdate.username = userData.username;
        if (userData.profileImage) memberUpdate.profileImage = userData.profileImage;
        
        batch.update(doc.ref, memberUpdate);
      });

      await batch.commit();
      console.log('✅ Related user data updated');

    } catch (error) {
      comprehensiveErrorHandler.handleFirebaseError(error, {
        userId,
        screen: 'EnhancedDataSyncService',
        action: 'updateRelatedUserData'
      });
    }
  }

  /**
   * Update related club data in other collections
   */
  private async updateRelatedClubData(clubId: string, clubData: any): Promise<void> {
    try {
      const batch = this.db.batch();

      // Update events where club is organizer
      const eventsQuery = await this.db.collection('events')
        .where('createdBy', '==', clubId)
        .get();

      eventsQuery.docs.forEach(doc => {
        const eventUpdate: any = {};
        if (clubData.displayName) eventUpdate['organizer.displayName'] = clubData.displayName;
        if (clubData.username) eventUpdate['organizer.username'] = clubData.username;
        if (clubData.profileImage) eventUpdate['organizer.profileImage'] = clubData.profileImage;
        
        batch.update(doc.ref, eventUpdate);
      });

      await batch.commit();
      console.log('✅ Related club data updated');

    } catch (error) {
      comprehensiveErrorHandler.handleFirebaseError(error, {
        userId: clubId,
        screen: 'EnhancedDataSyncService',
        action: 'updateRelatedClubData'
      });
    }
  }

  /**
   * Get cached data
   */
  getCachedData(key: string): any | null {
    const cached = this.syncCache.get(key);
    if (cached && Date.now() - cached.timestamp.getTime() < 300000) { // 5 minutes
      return cached.data;
    }
    return null;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.syncCache.clear();
    console.log('🗑️ Sync cache cleared');
  }

  /**
   * Start queue processor
   */
  private startQueueProcessor(): void {
    setInterval(() => {
      if (!this.isProcessingQueue && this.syncQueue.length > 0) {
        this.processQueue();
      }
    }, 1000);
  }

  /**
   * Process sync queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.syncQueue.length === 0) return;
    
    this.isProcessingQueue = true;
    
    while (this.syncQueue.length > 0) {
      const { config, resolve, reject } = this.syncQueue.shift()!;
      
      try {
        let result: SyncResult;
        
        if (config.userId) {
          result = await this.syncUserProfile(config.userId);
        } else if (config.clubId) {
          result = await this.syncClubData(config.clubId);
        } else if (config.eventId) {
          result = await this.syncEventData(config.eventId);
        } else {
          throw new Error('Invalid sync config');
        }
        
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }
    
    this.isProcessingQueue = false;
  }

  /**
   * Queue sync operation
   */
  queueSync(config: SyncConfig): Promise<SyncResult> {
    return new Promise((resolve, reject) => {
      this.syncQueue.push({ config, resolve, reject });
    });
  }

  /**
   * Get sync status
   */
  getSyncStatus(): {
    cacheSize: number;
    queueSize: number;
    isProcessing: boolean;
    listeners: number;
  } {
    return {
      cacheSize: this.syncCache.size,
      queueSize: this.syncQueue.length,
      isProcessing: this.isProcessingQueue,
      listeners: this.listeners.size
    };
  }
}

export const enhancedDataSyncService = EnhancedDataSyncService.getInstance();


