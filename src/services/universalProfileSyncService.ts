// Universal Profile Synchronization Service
import type firebase from 'firebase/compat/app';
import { getFirebase, initializeFirebaseServices } from '../firebase/config';
import { comprehensiveErrorHandler } from '../utils/comprehensiveErrorHandler';

interface ProfileData {
  id: string;
  displayName?: string;
  username?: string;
  profileImage?: string;
  email?: string;
  bio?: string;
  university?: string;
  department?: string;
  classLevel?: string;
  userType?: string;
  clubName?: string;
  clubTypes?: string[];
  [key: string]: any;
}

interface SyncEvent {
  type: 'profile_update' | 'user_update' | 'club_update';
  userId: string;
  data: ProfileData;
  timestamp: Date;
}

class UniversalProfileSyncService {
  private static instance: UniversalProfileSyncService;
  private db: firebase.firestore.Firestore | null = null;
  private firebaseCompat: typeof firebase | null = null;
  private initializationPromise: Promise<void> | null = null;
  private profileCache: Map<string, { data: ProfileData; timestamp: Date }> = new Map();
  private listeners: Map<string, () => void> = new Map();
  private callbacks: Map<string, ((data: any) => void)[]> = new Map();
  private syncQueue: SyncEvent[] = [];
  private isProcessingQueue = false;
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes
  private queueProcessorInterval?: NodeJS.Timeout;
  private cacheCleanupInterval?: NodeJS.Timeout;

  private constructor() {
    this.startQueueProcessor();
    this.startCacheCleanup();
  }

  private async ensureFirebaseReady(): Promise<void> {
    if (this.db) {
      return;
    }

    if (!this.initializationPromise) {
      this.initializationPromise = (async () => {
        await initializeFirebaseServices();
        const firebaseCompat = await getFirebase();
        if (!firebaseCompat) {
          throw new Error('Firebase compat SDK not available');
        }

        this.firebaseCompat = firebaseCompat;
        this.db = firebaseCompat.firestore();
        console.log('✅ UniversalProfileSyncService connected to Firestore');
      })().finally(() => {
        this.initializationPromise = null;
      });
    }

    await this.initializationPromise;
  }

  private async getDb(): Promise<firebase.firestore.Firestore> {
    await this.ensureFirebaseReady();
    if (!this.db) {
      throw new Error('Firebase Firestore is not initialized');
    }
    return this.db;
  }


  public static getInstance(): UniversalProfileSyncService {
    if (!UniversalProfileSyncService.instance) {
      UniversalProfileSyncService.instance = new UniversalProfileSyncService();
    }
    return UniversalProfileSyncService.instance;
  }

  /**
   * Initialize universal profile synchronization
   */
  public initialize(): void {
    if (this.listeners.size > 0) {
      console.log('ℹ️ Universal Profile Sync Service already initialized, skipping duplicate listeners');
      return;
    }

    console.log('🚀 Initializing Universal Profile Sync Service');
    this.startQueueProcessor();
    this.startCacheCleanup();

    this.ensureFirebaseReady()
      .then(() => {
        void this.subscribeToAllUsers();
        void this.subscribeToAllClubs();
      })
      .catch((error) => {
        console.error('❌ Universal Profile Sync Service init failed:', error);
      });
  }

  /**
   * Dispose all listeners and reset caches
   */
  public dispose(): void {
    console.log('🧹 Disposing Universal Profile Sync Service listeners and caches');

    this.listeners.forEach((unsubscribe, key) => {
      try {
        unsubscribe();
        console.log(`🛑 Stopped universal sync listener: ${key}`);
      } catch (error) {
        console.warn(`⚠️ Failed stopping listener ${key}:`, error);
      }
    });
    this.listeners.clear();

    this.profileCache.clear();
    this.syncQueue = [];
    this.isProcessingQueue = false;

    if (this.queueProcessorInterval) {
      clearInterval(this.queueProcessorInterval);
      this.queueProcessorInterval = undefined;
    }

    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
      this.cacheCleanupInterval = undefined;
    }
  }

  /**
   * Subscribe to all user profile updates
   */
  private async subscribeToAllUsers(): Promise<void> {
    const db = await this.getDb();
    const usersRef = db.collection('users');
    
    const unsubscribe = usersRef.onSnapshot(
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'modified' || change.type === 'added') {
            const userData = change.doc.data() as ProfileData;
            const userId = change.doc.id;
            
            console.log(`👤 Universal profile update: ${userData.displayName || userData.username || userId}`);
            
            // Update cache
            this.updateProfileCache(userId, userData);
            
            // Queue sync event
            this.queueSyncEvent({
              type: 'profile_update',
              userId,
              data: userData,
              timestamp: new Date()
            });
            
            // Trigger callbacks
            this.triggerCallback('profileUpdated', { userId, data: userData });
            this.triggerCallback('userUpdated', { userId, data: userData });
            
            // Update related collections
            this.updateRelatedCollections(userId, userData);
          }
        });
      },
      (error) => {
        comprehensiveErrorHandler.handleFirebaseError(error, {
          screen: 'UniversalProfileSyncService',
          action: 'subscribeToAllUsers'
        });
      }
    );
    
    this.listeners.set('users', unsubscribe);
  }

  /**
   * Subscribe to all club profile updates
   */
  private async subscribeToAllClubs(): Promise<void> {
    const db = await this.getDb();
    const clubsRef = db.collection('users').where('userType', '==', 'club');
    
    const unsubscribe = clubsRef.onSnapshot(
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'modified' || change.type === 'added') {
            const clubData = change.doc.data() as ProfileData;
            const clubId = change.doc.id;
            
            console.log(`🏢 Universal club update: ${clubData.displayName || clubData.clubName || clubId}`);
            
            // Update cache
            this.updateProfileCache(clubId, clubData);
            
            // Queue sync event
            this.queueSyncEvent({
              type: 'club_update',
              userId: clubId,
              data: clubData,
              timestamp: new Date()
            });
            
            // Trigger callbacks
            this.triggerCallback('profileUpdated', { userId: clubId, data: clubData });
            this.triggerCallback('clubUpdated', { clubId, data: clubData });
            
            // Update related collections
            this.updateRelatedCollections(clubId, clubData);
          }
        });
      },
      (error) => {
        comprehensiveErrorHandler.handleFirebaseError(error, {
          screen: 'UniversalProfileSyncService',
          action: 'subscribeToAllClubs'
        });
      }
    );
    
    this.listeners.set('clubs', unsubscribe);
  }

  /**
   * Update profile cache
   */
  private updateProfileCache(userId: string, data: ProfileData): void {
    this.profileCache.set(userId, {
      data: { ...data, id: userId },
      timestamp: new Date()
    });
  }

  /**
   * Invalidate profile cache for a specific user
   */
  public invalidateCache(userId: string): void {
    this.profileCache.delete(userId);
    console.log(`🗑️ Profile cache invalidated for: ${userId}`);
  }

  /**
   * Get profile data with caching
   */
  public async getProfileData(userId: string, forceRefresh: boolean = false): Promise<ProfileData | null> {
    try {
      // Check cache first (only if not forcing refresh)
      if (!forceRefresh) {
        const cached = this.profileCache.get(userId);
        if (cached && Date.now() - cached.timestamp.getTime() < this.cacheTimeout) {
          console.log(`📦 Profile cache hit for: ${userId}`);
          return cached.data;
        }
      }

      // Fetch from database (always fresh if forceRefresh is true)
      console.log(`🔄 Fetching profile data for: ${userId}${forceRefresh ? ' (forced refresh)' : ''}`);
      const db = await this.getDb();
      const doc = await db.collection('users').doc(userId).get();
      
      if (doc.exists) {
        const data = doc.data() as ProfileData;
        this.updateProfileCache(userId, data);
        return { ...data, id: userId };
      }

      return null;
    } catch (error) {
      comprehensiveErrorHandler.handleFirebaseError(error, {
        userId,
        screen: 'UniversalProfileSyncService',
        action: 'getProfileData'
      });
      return null;
    }
  }

  /**
   * Update related collections when profile changes
   */
  private async updateRelatedCollections(userId: string, profileData: ProfileData): Promise<void> {
    try {
      const db = await this.getDb();
      const batch = db.batch();
      
      // Update events where user is organizer
      const eventsQuery = await db.collection('events')
        .where('createdBy', '==', userId)
        .get();
      
      eventsQuery.docs.forEach(doc => {
        const eventUpdate: any = {};
        if (profileData.displayName) eventUpdate['organizer.displayName'] = profileData.displayName;
        if (profileData.username) eventUpdate['organizer.username'] = profileData.username;
        if (profileData.profileImage) eventUpdate['organizer.profileImage'] = profileData.profileImage;
        if (profileData.clubName) eventUpdate['organizer.name'] = profileData.clubName;
        if (profileData.university) eventUpdate['organizer.university'] = profileData.university;
        
        batch.update(doc.ref, eventUpdate);
      });

      // Update event attendees
      const attendeesQuery = await db.collection('eventAttendees')
        .where('userId', '==', userId)
        .get();
      
      attendeesQuery.docs.forEach(doc => {
        const attendeeUpdate: any = {};
        if (profileData.displayName) attendeeUpdate.displayName = profileData.displayName;
        if (profileData.username) attendeeUpdate.username = profileData.username;
        if (profileData.profileImage) attendeeUpdate.profileImage = profileData.profileImage;
        
        batch.update(doc.ref, attendeeUpdate);
      });

      // Update club members
      const clubMembersQuery = await db.collection('clubMembers')
        .where('userId', '==', userId)
        .get();
      
      clubMembersQuery.docs.forEach(doc => {
        const memberUpdate: any = {};
        if (profileData.displayName) memberUpdate.displayName = profileData.displayName;
        if (profileData.username) memberUpdate.username = profileData.username;
        if (profileData.profileImage) memberUpdate.profileImage = profileData.profileImage;
        
        batch.update(doc.ref, memberUpdate);
      });

      await batch.commit();
      console.log('✅ Related collections updated for user:', userId);
    } catch (error) {
      comprehensiveErrorHandler.handleFirebaseError(error, {
        userId,
        screen: 'UniversalProfileSyncService',
        action: 'updateRelatedCollections'
      });
    }
  }

  /**
   * Queue sync event
   */
  private queueSyncEvent(event: SyncEvent): void {
    this.syncQueue.push(event);
    
    if (!this.isProcessingQueue) {
      this.processQueue();
    }
  }

  /**
   * Process sync queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.syncQueue.length === 0) return;
    
    this.isProcessingQueue = true;
    
    while (this.syncQueue.length > 0) {
      const event = this.syncQueue.shift();
      if (event) {
        try {
          await this.processSyncEvent(event);
        } catch (error) {
          comprehensiveErrorHandler.handleFirebaseError(error, {
            userId: event.userId,
            screen: 'UniversalProfileSyncService',
            action: 'processSyncEvent'
          });
        }
      }
    }
    
    this.isProcessingQueue = false;
  }

  /**
   * Process individual sync event
   */
  private async processSyncEvent(event: SyncEvent): Promise<void> {
    console.log(`🔄 Processing sync event: ${event.type} for ${event.userId}`);
    
    // Additional processing logic can be added here
    // For now, we rely on the callback system
  }

  /**
   * Start queue processor
   */
  private startQueueProcessor(): void {
    if (this.queueProcessorInterval) {
      clearInterval(this.queueProcessorInterval);
    }

    this.queueProcessorInterval = setInterval(() => {
      if (!this.isProcessingQueue && this.syncQueue.length > 0) {
        this.processQueue();
      }
    }, 1000);
  }

  /**
   * Start cache cleanup
   */
  private startCacheCleanup(): void {
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
    }

    this.cacheCleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [userId, cached] of this.profileCache.entries()) {
        if (now - cached.timestamp.getTime() > this.cacheTimeout) {
          this.profileCache.delete(userId);
        }
      }
    }, 10 * 60 * 1000); // Clean up every 10 minutes
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
          comprehensiveErrorHandler.handleFirebaseError(error, {
            screen: 'UniversalProfileSyncService',
            action: 'triggerCallback'
          });
        }
      });
    }
  }

  /**
   * Force refresh profile data
   */
  public async forceRefreshProfile(userId: string): Promise<ProfileData | null> {
    // Clear cache
    this.profileCache.delete(userId);
    
    // Fetch fresh data
    return await this.getProfileData(userId);
  }

  /**
   * Get sync status
   */
  public getSyncStatus(): {
    cacheSize: number;
    queueSize: number;
    isProcessing: boolean;
    listeners: number;
  } {
    return {
      cacheSize: this.profileCache.size,
      queueSize: this.syncQueue.length,
      isProcessing: this.isProcessingQueue,
      listeners: this.listeners.size
    };
  }

  /**
   * Clear all data
   */
  public clearAll(): void {
    this.profileCache.clear();
    this.syncQueue = [];
    this.callbacks.clear();
    
    this.listeners.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.listeners.clear();
    
    console.log('🗑️ Universal Profile Sync Service cleared');
  }
}

export const universalProfileSyncService = UniversalProfileSyncService.getInstance();


