// Enhanced Real-Time Synchronization Service
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

interface SyncEvent {
  type: 'profile_update' | 'event_update' | 'club_update' | 'like' | 'comment' | 'participation' | 'follow';
  entityId: string;
  entityType: 'user' | 'event' | 'club';
  data: any;
  timestamp: firebase.firestore.Timestamp;
}

interface ProfileUpdateData {
  displayName?: string;
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

class EnhancedRealtimeSyncService {
  private static instance: EnhancedRealtimeSyncService;
  private db: firebase.firestore.Firestore;
  private listeners: Map<string, () => void> = new Map();
  private syncQueue: SyncEvent[] = [];
  private isProcessingQueue = false;
  private callbacks: Map<string, ((data: any) => void)[]> = new Map();
  private profileUpdateListeners: Map<string, () => void> = new Map();

  private constructor() {
    this.db = firebase.firestore();
    this.startQueueProcessor();
  }

  public static getInstance(): EnhancedRealtimeSyncService {
    if (!EnhancedRealtimeSyncService.instance) {
      EnhancedRealtimeSyncService.instance = new EnhancedRealtimeSyncService();
    }
    return EnhancedRealtimeSyncService.instance;
  }

  /**
   * Start global synchronization
   */
  public startGlobalSync(): void {
    console.log('🚀 Starting enhanced global synchronization');
    
    this.subscribeToProfileUpdates();
    this.subscribeToEventUpdates();
    this.subscribeToClubUpdates();
    
    console.log('✅ Enhanced global synchronization started');
  }

  /**
   * Stop global synchronization
   */
  public stopGlobalSync(): void {
    console.log('🛑 Stopping enhanced global synchronization');
    
    this.listeners.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.listeners.clear();
    
    this.profileUpdateListeners.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.profileUpdateListeners.clear();
    
    console.log('✅ Enhanced global synchronization stopped');
  }

  /**
   * Subscribe to profile updates with enhanced logic
   */
  private subscribeToProfileUpdates(): void {
    const usersRef = this.db.collection('users');
    
    const unsubscribe = usersRef.onSnapshot(
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'modified') {
            const userData = change.doc.data();
            const userId = change.doc.id;
            
            console.log(`👤 Enhanced profile update: ${userData.displayName || userData.username || userId}`);
            
            // Queue sync event
            this.queueSyncEvent({
              type: 'profile_update',
              entityId: userId,
              entityType: 'user',
              data: userData,
              timestamp: firebase.firestore.FieldValue.serverTimestamp() as firebase.firestore.Timestamp
            });
            
            // Trigger immediate callback
            this.triggerCallback('profileUpdated', { userId, data: userData });
            
            // Update related collections
            this.updateRelatedCollections(userId, userData);
          }
        });
      },
      (error) => {
        console.error('❌ Error listening to profile updates:', error);
      }
    );
    
    this.listeners.set('profiles', unsubscribe);
  }

  /**
   * Subscribe to event updates
   */
  private subscribeToEventUpdates(): void {
    const eventsRef = this.db.collection('events');
    
    const unsubscribe = eventsRef.onSnapshot(
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'modified' || change.type === 'added') {
            const eventData = change.doc.data();
            const eventId = change.doc.id;
            
            console.log(`📅 Event update: ${eventData.title || eventId}`);
            
            this.queueSyncEvent({
              type: 'event_update',
              entityId: eventId,
              entityType: 'event',
              data: eventData,
              timestamp: firebase.firestore.FieldValue.serverTimestamp() as firebase.firestore.Timestamp
            });
            
            this.triggerCallback('eventUpdated', { eventId, data: eventData });
          }
        });
      },
      (error) => {
        console.error('❌ Error listening to event updates:', error);
      }
    );
    
    this.listeners.set('events', unsubscribe);
  }

  /**
   * Subscribe to club updates
   */
  private subscribeToClubUpdates(): void {
    const clubsRef = this.db.collection('users').where('userType', '==', 'club');
    
    const unsubscribe = clubsRef.onSnapshot(
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'modified') {
            const clubData = change.doc.data();
            const clubId = change.doc.id;
            
            console.log(`🏢 Club update: ${clubData.displayName || clubData.clubName || clubId}`);
            
            this.queueSyncEvent({
              type: 'club_update',
              entityId: clubId,
              entityType: 'club',
              data: clubData,
              timestamp: firebase.firestore.FieldValue.serverTimestamp() as firebase.firestore.Timestamp
            });
            
            this.triggerCallback('clubUpdated', { clubId, data: clubData });
          }
        });
      },
      (error) => {
        console.error('❌ Error listening to club updates:', error);
      }
    );
    
    this.listeners.set('clubs', unsubscribe);
  }

  /**
   * Update related collections when profile changes
   */
  private async updateRelatedCollections(userId: string, userData: any): Promise<void> {
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
      console.log('✅ Related collections updated for user:', userId);
    } catch (error) {
      console.error('❌ Error updating related collections:', error);
    }
  }

  /**
   * Update user profile with enhanced synchronization
   */
  async updateUserProfile(
    userId: string, 
    updateData: ProfileUpdateData,
    userName?: string
  ): Promise<boolean> {
    try {
      console.log('🔄 Enhanced profile update for user:', userId);

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

      // 3. Commit batch update
      await batch.commit();

      // 4. Update related collections
      await this.updateRelatedCollections(userId, updateData);

      // 5. Trigger immediate callback
      this.triggerCallback('profileUpdated', { userId, data: updateData });

      console.log('✅ Enhanced profile updated successfully');
      return true;

    } catch (error) {
      console.error('❌ Failed to update profile:', error);
      return false;
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
          console.error('❌ Error processing sync event:', error);
        }
      }
    }
    
    this.isProcessingQueue = false;
  }

  /**
   * Process individual sync event
   */
  private async processSyncEvent(event: SyncEvent): Promise<void> {
    console.log(`🔄 Processing sync event: ${event.type} for ${event.entityId}`);
    
    // Additional processing logic can be added here
    // For now, we rely on the callback system
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
   * Trigger manual update
   */
  public triggerManualUpdate(entityType: 'user' | 'event' | 'club', entityId: string): void {
    console.log(`🔄 Manual update triggered for ${entityType}: ${entityId}`);
    
    this.triggerCallback(`${entityType}Updated`, { 
      [`${entityType}Id`]: entityId, 
      data: { manual: true } 
    });
  }

  /**
   * Get sync status
   */
  public getSyncStatus(): { 
    listeners: number; 
    queueSize: number; 
    isProcessing: boolean 
  } {
    return {
      listeners: this.listeners.size,
      queueSize: this.syncQueue.length,
      isProcessing: this.isProcessingQueue
    };
  }
}

export const enhancedRealtimeSyncService = EnhancedRealtimeSyncService.getInstance();


