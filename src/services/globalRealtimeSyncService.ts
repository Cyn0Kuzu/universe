import type firebase from 'firebase/compat/app';
import {
  getFirebase,
  initializeFirebaseServices,
  firebaseConfig,
} from '../firebase/config';
import { enhancedStatisticsService } from './enhancedStatisticsService';

interface SyncEvent {
  type: 'profile_update' | 'event_update' | 'club_update' | 'like' | 'comment' | 'participation' | 'follow';
  entityId: string;
  entityType: 'user' | 'event' | 'club';
  data: any;
  timestamp: firebase.firestore.Timestamp;
}

class GlobalRealtimeSyncService {
  private static instance: GlobalRealtimeSyncService;
  private db: firebase.firestore.Firestore | null = null;
  private firebaseCompat: typeof firebase | null = null;
  private initializationPromise: Promise<void> | null = null;
  private listeners: Map<string, () => void> = new Map();
  private syncQueue: SyncEvent[] = [];
  private isProcessingQueue = false;
  private callbacks: Map<string, ((data: any) => void)[]> = new Map();

  private constructor() {
    this.startQueueProcessor();
  }

  public static getInstance(): GlobalRealtimeSyncService {
    if (!GlobalRealtimeSyncService.instance) {
      GlobalRealtimeSyncService.instance = new GlobalRealtimeSyncService();
    }
    return GlobalRealtimeSyncService.instance;
  }

  private async ensureFirebaseReady(): Promise<void> {
    if (this.db) {
      return;
    }

    if (!this.initializationPromise) {
      this.initializationPromise = (async () => {
        try {
          await initializeFirebaseServices();
          const firebaseCompat = await getFirebase();

          if (!firebaseCompat) {
            throw new Error('Firebase compat SDK not available');
          }

          if (!firebaseCompat.apps?.length) {
            firebaseCompat.initializeApp?.(firebaseConfig);
          }

          if (!firebaseCompat.firestore) {
            throw new Error('Firebase Firestore compat API not available');
          }

          this.firebaseCompat = firebaseCompat;
          this.db = firebaseCompat.firestore();
          console.log('✅ GlobalRealtimeSyncService connected to Firestore');
        } catch (error) {
          this.firebaseCompat = null;
          this.db = null;
          console.error('❌ Failed to initialize GlobalRealtimeSyncService Firestore:', error);
          throw error;
        }
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

  private getFieldValue() {
    const fieldValue = this.firebaseCompat?.firestore?.FieldValue;
    if (!fieldValue) {
      throw new Error('Firebase FieldValue is not available');
    }
    return fieldValue;
  }

  private getServerTimestamp(): firebase.firestore.Timestamp {
    const FieldValue = this.getFieldValue();
    return FieldValue.serverTimestamp() as firebase.firestore.Timestamp;
  }

  /**
   * Global senkronizasyonu başlat
   */
  public async startGlobalSync(): Promise<void> {
    try {
      await this.ensureFirebaseReady();
    } catch (error) {
      console.error('❌ Unable to start global real-time synchronization:', error);
      return;
    }

    if (this.listeners.size > 0) {
      console.log('ℹ️ Global real-time synchronization already running');
      return;
    }

    console.log('🔄 Starting global real-time synchronization...');
    
    await Promise.all([
      this.subscribeToProfileUpdates(),
      this.subscribeToEventUpdates(),
      this.subscribeToClubUpdates(),
      this.subscribeToLikes(),
      this.subscribeToComments(),
      this.subscribeToParticipations(),
      this.subscribeToFollows(),
    ]);
    
    console.log('✅ Global real-time synchronization started');
  }

  /**
   * Profil güncellemelerini dinle
   */
  private async subscribeToProfileUpdates(): Promise<void> {
    const db = await this.getDb();
    const usersRef = db.collection('users');
    
    const unsubscribe = usersRef.onSnapshot(
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'modified') {
            const userData = change.doc.data();
            const userId = change.doc.id;
            
            console.log(`👤 Profile updated: ${userData.displayName || userData.username || userId}`);
            
            // İstatistikleri güncelle
            this.queueSyncEvent({
              type: 'profile_update',
              entityId: userId,
              entityType: 'user',
              data: userData,
              timestamp: this.getServerTimestamp()
            });
            
            // Global profil senkronizasyonunu tetikle
            this.triggerCallback('profileUpdated', { userId, data: userData });
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
   * Etkinlik güncellemelerini dinle
   */
  private async subscribeToEventUpdates(): Promise<void> {
    const db = await this.getDb();
    const eventsRef = db.collection('events');
    
    const unsubscribe = eventsRef.onSnapshot(
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'modified') {
            const eventData = change.doc.data();
            const eventId = change.doc.id;
            
            console.log(`🎉 Event updated: ${eventData.title || eventId}`);
            
            // İstatistikleri güncelle
            this.queueSyncEvent({
              type: 'event_update',
              entityId: eventId,
              entityType: 'event',
              data: eventData,
              timestamp: this.getServerTimestamp()
            });
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
   * Kulüp güncellemelerini dinle
   */
  private async subscribeToClubUpdates(): Promise<void> {
    const db = await this.getDb();
    const clubsRef = db.collection('users').where('userType', '==', 'club');
    
    const unsubscribe = clubsRef.onSnapshot(
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'modified') {
            const clubData = change.doc.data();
            const clubId = change.doc.id;
            
            console.log(`🏛️ Club updated: ${clubData.displayName || clubData.clubName || clubId}`);
            
            // İstatistikleri güncelle
            this.queueSyncEvent({
              type: 'club_update',
              entityId: clubId,
              entityType: 'club',
              data: clubData,
              timestamp: this.getServerTimestamp()
            });
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
   * Beğeni güncellemelerini dinle
   */
  private async subscribeToLikes(): Promise<void> {
    const db = await this.getDb();
    const likesRef = db.collection('eventLikes');
    
    const unsubscribe = likesRef.onSnapshot(
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const likeData = change.doc.data();
          const eventId = likeData.eventId;
          const userId = likeData.userId;
          
          console.log(`❤️ Like ${change.type}: Event ${eventId}, User ${userId}`);
          
          // İlgili istatistikleri güncelle
          this.queueSyncEvent({
            type: 'like',
            entityId: eventId,
            entityType: 'event',
            data: { userId, eventId, action: change.type },
            timestamp: this.getServerTimestamp()
          });
          
          if (userId) {
            this.queueSyncEvent({
              type: 'like',
              entityId: userId,
              entityType: 'user',
              data: { userId, eventId, action: change.type },
              timestamp: this.getServerTimestamp()
            });
          }
        });
      },
      (error) => {
        console.error('❌ Error listening to likes:', error);
      }
    );
    
    this.listeners.set('likes', unsubscribe);
  }

  /**
   * Yorum güncellemelerini dinle
   */
  private async subscribeToComments(): Promise<void> {
    const db = await this.getDb();
    const commentsRef = db.collection('eventComments');
    
    const unsubscribe = commentsRef.onSnapshot(
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const commentData = change.doc.data();
          const eventId = commentData.eventId;
          const userId = commentData.userId;
          
          console.log(`💬 Comment ${change.type}: Event ${eventId}, User ${userId}`);
          
          // İlgili istatistikleri güncelle
          this.queueSyncEvent({
            type: 'comment',
            entityId: eventId,
            entityType: 'event',
            data: { userId, eventId, action: change.type },
            timestamp: this.getServerTimestamp()
          });
          
          if (userId) {
            this.queueSyncEvent({
              type: 'comment',
              entityId: userId,
              entityType: 'user',
              data: { userId, eventId, action: change.type },
              timestamp: this.getServerTimestamp()
            });
          }
        });
      },
      (error) => {
        console.error('❌ Error listening to comments:', error);
      }
    );
    
    this.listeners.set('comments', unsubscribe);
  }

  /**
   * Katılım güncellemelerini dinle
   */
  private async subscribeToParticipations(): Promise<void> {
    const db = await this.getDb();
    const participationsRef = db.collection('eventAttendees');
    
    const unsubscribe = participationsRef.onSnapshot(
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const participationData = change.doc.data();
          const eventId = participationData.eventId;
          const userId = participationData.userId;
          
          console.log(`🎯 Participation ${change.type}: Event ${eventId}, User ${userId}`);
          
          // İlgili istatistikleri güncelle
          this.queueSyncEvent({
            type: 'participation',
            entityId: eventId,
            entityType: 'event',
            data: { userId, eventId, action: change.type },
            timestamp: this.getServerTimestamp()
          });
          
          if (userId) {
            this.queueSyncEvent({
              type: 'participation',
              entityId: userId,
              entityType: 'user',
              data: { userId, eventId, action: change.type },
              timestamp: this.getServerTimestamp()
            });
          }
        });
      },
      (error) => {
        console.error('❌ Error listening to participations:', error);
      }
    );
    
    this.listeners.set('participations', unsubscribe);
  }

  /**
   * Takip güncellemelerini dinle
   */
  private async subscribeToFollows(): Promise<void> {
    // Bu fonksiyon users koleksiyonundaki followers/following alanlarını dinler
    const db = await this.getDb();
    const usersRef = db.collection('users');
    
    const unsubscribe = usersRef.onSnapshot(
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'modified') {
            const userData = change.doc.data();
            const userId = change.doc.id;
            
            // Takipçi/takip edilen sayısı değişti mi kontrol et
            const oldData = change.doc.metadata.fromCache ? null : change.doc.data();
            if (oldData && (
              oldData.followers?.length !== userData.followers?.length ||
              oldData.following?.length !== userData.following?.length
            )) {
              console.log(`👥 Follow update: User ${userId}`);
              
              this.queueSyncEvent({
                type: 'follow',
                entityId: userId,
                entityType: 'user',
                data: userData,
                timestamp: this.getServerTimestamp()
              });
            }
          }
        });
      },
      (error) => {
        console.error('❌ Error listening to follows:', error);
      }
    );
    
    this.listeners.set('follows', unsubscribe);
  }

  /**
   * Senkronizasyon olayını kuyruğa ekle
   */
  private queueSyncEvent(event: SyncEvent): void {
    this.syncQueue.push(event);
    console.log(`📋 Queued sync event: ${event.type} for ${event.entityType} ${event.entityId}`);
  }

  /**
   * Kuyruk işleyicisini başlat
   */
  private startQueueProcessor(): void {
    setInterval(async () => {
      if (this.isProcessingQueue || this.syncQueue.length === 0) {
        return;
      }
      
      this.isProcessingQueue = true;
      
      try {
        const event = this.syncQueue.shift();
        if (event) {
          await this.processSyncEvent(event);
        }
      } catch (error) {
        console.error('❌ Error processing sync event:', error);
      } finally {
        this.isProcessingQueue = false;
      }
    }, 1000); // Her saniye kontrol et
  }

  /**
   * Senkronizasyon olayını işle
   */
  private async processSyncEvent(event: SyncEvent): Promise<void> {
    try {
      console.log(`🔄 Processing sync event: ${event.type} for ${event.entityType} ${event.entityId}`);
      
      switch (event.entityType) {
        case 'user':
          await enhancedStatisticsService.calculateUserStatistics(event.entityId);
          break;
        case 'event':
          await enhancedStatisticsService.calculateEventStatistics(event.entityId);
          break;
        case 'club':
          await enhancedStatisticsService.calculateClubStatistics(event.entityId);
          break;
      }
      
      // Global güncelleme olayını yayınla
      this.triggerCallback('statisticsUpdated', {
        type: event.entityType,
        id: event.entityId,
        event: event
      });
      
      console.log(`✅ Sync event processed: ${event.type} for ${event.entityType} ${event.entityId}`);
    } catch (error) {
      console.error(`❌ Error processing sync event for ${event.entityType} ${event.entityId}:`, error);
    }
  }

  /**
   * Belirli bir entity için istatistikleri manuel olarak güncelle
   */
  public async triggerManualUpdate(type: 'user' | 'event' | 'club', id: string): Promise<void> {
    try {
      console.log(`🔄 Manual update triggered for ${type} ${id}`);
      
      switch (type) {
        case 'user':
          await enhancedStatisticsService.calculateUserStatistics(id);
          break;
        case 'event':
          await enhancedStatisticsService.calculateEventStatistics(id);
          break;
        case 'club':
          await enhancedStatisticsService.calculateClubStatistics(id);
          break;
      }
      
      this.triggerCallback('manualUpdateCompleted', { type, id });
      console.log(`✅ Manual update completed for ${type} ${id}`);
    } catch (error) {
      console.error(`❌ Error in manual update for ${type} ${id}:`, error);
      throw error;
    }
  }

  /**
   * Tüm dinleyicileri durdur
   */
  public stopGlobalSync(): void {
    console.log('🛑 Stopping global real-time synchronization...');
    
    this.listeners.forEach((unsubscribe, key) => {
      unsubscribe();
      console.log(`🛑 Stopped listener: ${key}`);
    });
    
    this.listeners.clear();
    this.syncQueue = [];
    
    console.log('✅ Global real-time synchronization stopped');
  }

  /**
   * Callback sistemi
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
   * Senkronizasyon durumunu al
   */
  public getSyncStatus(): { listeners: number; queueSize: number; isProcessing: boolean } {
    return {
      listeners: this.listeners.size,
      queueSize: this.syncQueue.length,
      isProcessing: this.isProcessingQueue
    };
  }
}

export const globalRealtimeSyncService = GlobalRealtimeSyncService.getInstance();


