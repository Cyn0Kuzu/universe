import { getFirebaseCompatSync } from '../firebase/compat';
import { SecureStorage } from '../utils/secureStorage';
import OfflineDataManager from './offlineDataManager';

const firebase = getFirebaseCompatSync();

export interface RealtimeSubscription {
  id: string;
  collection: string;
  query?: any;
  callback: (data: any, action: 'added' | 'modified' | 'removed') => void;
  isActive: boolean;
  lastUpdate: number;
  retryCount: number;
}

export interface UpdateEvent {
  id: string;
  type: 'user' | 'event' | 'club' | 'notification';
  action: 'created' | 'updated' | 'deleted';
  data: any;
  timestamp: number;
  source: 'local' | 'remote';
}

export interface RealtimeConfig {
  enableRealtime: boolean;
  maxSubscriptions: number;
  retryAttempts: number;
  retryDelay: number; // milliseconds
  offlineFallback: boolean;
}

export class RealtimeUpdateManager {
  private static instance: RealtimeUpdateManager;
  private subscriptions: Map<string, RealtimeSubscription> = new Map();
  private unsubscribeFunctions: Map<string, () => void> = new Map();
  private updateQueue: UpdateEvent[] = [];
  private isOnline: boolean = true;
  private maxRetries: number = 3;
  private retryDelay: number = 5000;
  private config: RealtimeConfig = {
    enableRealtime: true,
    maxSubscriptions: 10,
    retryAttempts: 3,
    retryDelay: 5000,
    offlineFallback: true,
  };

  static getInstance(): RealtimeUpdateManager {
    if (!RealtimeUpdateManager.instance) {
      RealtimeUpdateManager.instance = new RealtimeUpdateManager();
    }
    return RealtimeUpdateManager.instance;
  }

  /**
   * Manager'ı başlat
   */
  async initialize(config?: Partial<RealtimeConfig>): Promise<void> {
    try {
      console.log('🔄 Initializing Realtime Update Manager...');
      
      if (config) {
        this.config = { ...this.config, ...config };
      }

      // Network durumunu kontrol et
      this.checkNetworkStatus();
      
      // Pending subscriptions'ları yükle
      await this.loadSubscriptions();
      
      console.log('✅ Realtime Update Manager initialized');
    } catch (error) {
      console.error('❌ Failed to initialize realtime manager:', error);
    }
  }

  /**
   * Collection'ı dinlemeye başla
   */
  subscribeToCollection(
    id: string,
    collection: string,
    callback: (data: any, action: 'added' | 'modified' | 'removed') => void,
    query?: any
  ): boolean {
    try {
      if (this.subscriptions.size >= this.config.maxSubscriptions) {
        console.warn('⚠️ Maximum subscription limit reached');
        return false;
      }

      if (this.subscriptions.has(id)) {
        console.warn(`⚠️ Subscription ${id} already exists`);
        return false;
      }

      const subscription: RealtimeSubscription = {
        id,
        collection,
        query,
        callback,
        isActive: false,
        lastUpdate: Date.now(),
        retryCount: 0,
      };

      this.subscriptions.set(id, subscription);
      
      if (this.isOnline && this.config.enableRealtime) {
        this.activateSubscription(id);
      } else if (this.config.offlineFallback) {
        this.setupOfflineFallback(id);
      }

      console.log(`📡 Subscribed to collection: ${collection} (${id})`);
      return true;
    } catch (error) {
      console.error('❌ Failed to subscribe to collection:', error);
      return false;
    }
  }

  /**
   * Document'ı dinlemeye başla
   */
  subscribeToDocument(
    id: string,
    collection: string,
    documentId: string,
    callback: (data: any, exists: boolean) => void
  ): boolean {
    try {
      if (this.subscriptions.size >= this.config.maxSubscriptions) {
        console.warn('⚠️ Maximum subscription limit reached');
        return false;
      }

      const subscription: RealtimeSubscription = {
        id,
        collection,
        query: { documentId },
        callback: (data, action) => {
          callback(data, action !== 'removed');
        },
        isActive: false,
        lastUpdate: Date.now(),
        retryCount: 0,
      };

      this.subscriptions.set(id, subscription);
      
      if (this.isOnline && this.config.enableRealtime) {
        this.activateDocumentSubscription(id, collection, documentId);
      }

      console.log(`📄 Subscribed to document: ${collection}/${documentId} (${id})`);
      return true;
    } catch (error) {
      console.error('❌ Failed to subscribe to document:', error);
      return false;
    }
  }

  /**
   * Subscription'ı aktifleştir
   */
  private activateSubscription(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    try {
      const db = getFirebaseCompatSync().firestore();
      let ref: any = db.collection(subscription.collection); // firebase.firestore.Query

      // Query uygula
      if (subscription.query && !subscription.query.documentId) {
        // Collection query'leri için
        if (subscription.query.where) {
          ref = ref.where(
            subscription.query.where.field,
            subscription.query.where.operator,
            subscription.query.where.value
          );
        }
        if (subscription.query.orderBy) {
          ref = ref.orderBy(subscription.query.orderBy.field, subscription.query.orderBy.direction);
        }
        if (subscription.query.limit) {
          ref = ref.limit(subscription.query.limit);
        }
      }

      const unsubscribe = ref.onSnapshot(
        (snapshot) => {
          subscription.lastUpdate = Date.now();
          subscription.retryCount = 0;
          subscription.isActive = true;

          snapshot.docChanges().forEach((change) => {
            const data = { id: change.doc.id, ...change.doc.data() };
            
            // Offline cache'i güncelle
            this.updateOfflineCache(subscription.collection, data, change.type);
            
            // Callback'i çağır
            subscription.callback(data, change.type);
            
            // Update event'i queue'ya ekle
            this.addUpdateEvent({
              id: change.doc.id,
              type: this.getDataType(subscription.collection),
              action: this.mapChangeType(change.type),
              data,
              timestamp: Date.now(),
              source: 'remote',
            });
          });
        },
        (error) => {
          console.error(`❌ Subscription error for ${subscriptionId}:`, error);
          subscription.isActive = false;
          subscription.retryCount++;
          
          if (subscription.retryCount < this.maxRetries) {
            setTimeout(() => {
              this.activateSubscription(subscriptionId);
            }, this.retryDelay);
          } else if (this.config.offlineFallback) {
            this.setupOfflineFallback(subscriptionId);
          }
        }
      );

      this.unsubscribeFunctions.set(subscriptionId, unsubscribe);
    } catch (error) {
      console.error(`❌ Failed to activate subscription ${subscriptionId}:`, error);
    }
  }

  /**
   * Document subscription'ı aktifleştir
   */
  private activateDocumentSubscription(subscriptionId: string, collection: string, documentId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    try {
      const db = getFirebaseCompatSync().firestore();
      const docRef = db.collection(collection).doc(documentId);

      const unsubscribe = docRef.onSnapshot(
        (doc) => {
          subscription.lastUpdate = Date.now();
          subscription.retryCount = 0;
          subscription.isActive = true;

          if (doc.exists) {
            const data = { id: doc.id, ...doc.data() };
            
            // Offline cache'i güncelle
            this.updateOfflineCache(collection, data, 'modified');
            
            // Callback'i çağır
            subscription.callback(data, 'modified');
          } else {
            // Document silinmiş
            subscription.callback(null, 'removed');
            
            // Offline cache'den kaldır
            OfflineDataManager.removeOfflineData(`${collection}_${documentId}`);
          }
        },
        (error) => {
          console.error(`❌ Document subscription error for ${subscriptionId}:`, error);
          subscription.isActive = false;
          subscription.retryCount++;
          
          if (subscription.retryCount < this.maxRetries) {
            setTimeout(() => {
              this.activateDocumentSubscription(subscriptionId, collection, documentId);
            }, this.retryDelay);
          }
        }
      );

      this.unsubscribeFunctions.set(subscriptionId, unsubscribe);
    } catch (error) {
      console.error(`❌ Failed to activate document subscription ${subscriptionId}:`, error);
    }
  }

  /**
   * Offline fallback ayarla
   */
  private async setupOfflineFallback(subscriptionId: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    try {
      // Cache'den veri getir
      const cachedData = await OfflineDataManager.searchOfflineData('', subscription.collection);
      
      if (cachedData.length > 0) {
        cachedData.forEach(item => {
          subscription.callback(item.data, 'added');
        });
        
        console.log(`📱 Loaded ${cachedData.length} items from offline cache for ${subscriptionId}`);
      }
    } catch (error) {
      console.error(`❌ Failed to setup offline fallback for ${subscriptionId}:`, error);
    }
  }

  /**
   * Subscription'ı durdur
   */
  unsubscribe(subscriptionId: string): boolean {
    try {
      const unsubscribeFunc = this.unsubscribeFunctions.get(subscriptionId);
      if (unsubscribeFunc) {
        unsubscribeFunc();
        this.unsubscribeFunctions.delete(subscriptionId);
      }

      const subscription = this.subscriptions.get(subscriptionId);
      if (subscription) {
        subscription.isActive = false;
        this.subscriptions.delete(subscriptionId);
        console.log(`🔌 Unsubscribed from: ${subscriptionId}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`❌ Failed to unsubscribe from ${subscriptionId}:`, error);
      return false;
    }
  }

  /**
   * Tüm subscription'ları durdur
   */
  unsubscribeAll(): void {
    try {
      this.unsubscribeFunctions.forEach((unsubscribe, id) => {
        unsubscribe();
        console.log(`🔌 Unsubscribed from: ${id}`);
      });

      this.unsubscribeFunctions.clear();
      this.subscriptions.clear();
      
      console.log('🔌 All subscriptions stopped');
    } catch (error) {
      console.error('❌ Failed to unsubscribe all:', error);
    }
  }

  /**
   * Subscription'ları yeniden başlat
   */
  reconnectSubscriptions(): void {
    console.log('🔄 Reconnecting subscriptions...');
    
    this.subscriptions.forEach((subscription, id) => {
      if (!subscription.isActive) {
        subscription.retryCount = 0;
        
        if (subscription.query?.documentId) {
          this.activateDocumentSubscription(id, subscription.collection, subscription.query.documentId);
        } else {
          this.activateSubscription(id);
        }
      }
    });
  }

  /**
   * Subscription durumlarını getir
   */
  getSubscriptionStatus(): {
    active: number;
    inactive: number;
    total: number;
    subscriptions: Array<{
      id: string;
      collection: string;
      isActive: boolean;
      lastUpdate: number;
      retryCount: number;
    }>;
  } {
    const subscriptions = Array.from(this.subscriptions.values()).map(sub => ({
      id: sub.id,
      collection: sub.collection,
      isActive: sub.isActive,
      lastUpdate: sub.lastUpdate,
      retryCount: sub.retryCount,
    }));

    return {
      active: subscriptions.filter(s => s.isActive).length,
      inactive: subscriptions.filter(s => !s.isActive).length,
      total: subscriptions.length,
      subscriptions,
    };
  }

  /**
   * Update event'i queue'ya ekle
   */
  private addUpdateEvent(event: UpdateEvent): void {
    this.updateQueue.push(event);
    
    // Queue boyutunu sınırla
    if (this.updateQueue.length > 100) {
      this.updateQueue = this.updateQueue.slice(-50);
    }
  }

  /**
   * Update queue'yu getir
   */
  getUpdateQueue(): UpdateEvent[] {
    return [...this.updateQueue];
  }

  /**
   * Update queue'yu temizle
   */
  clearUpdateQueue(): void {
    this.updateQueue = [];
  }

  /**
   * Offline cache'i güncelle
   */
  private async updateOfflineCache(collection: string, data: any, changeType: any): Promise<void> { // firebase.firestore.DocumentChangeType
    try {
      const key = `${collection}_${data.id}`;
      
      if (changeType === 'removed') {
        await OfflineDataManager.removeOfflineData(key);
      } else {
        await OfflineDataManager.storeOfflineData(key, data, {
          priority: 'medium',
          expiresInMinutes: 60 * 24, // 24 saat
        });
      }
    } catch (error) {
      console.error('❌ Failed to update offline cache:', error);
    }
  }

  /**
   * Change type'ı map et
   */
  private mapChangeType(changeType: any): 'created' | 'updated' | 'deleted' { // firebase.firestore.DocumentChangeType
    switch (changeType) {
      case 'added':
        return 'created';
      case 'modified':
        return 'updated';
      case 'removed':
        return 'deleted';
      default:
        return 'updated';
    }
  }

  /**
   * Data type'ı belirle
   */
  private getDataType(collection: string): 'user' | 'event' | 'club' | 'notification' {
    if (collection.includes('user')) return 'user';
    if (collection.includes('event')) return 'event';
    if (collection.includes('club')) return 'club';
    return 'notification';
  }

  /**
   * Network durumunu kontrol et
   */
  private checkNetworkStatus(): void {
    // React Native'de NetInfo kullanabilirsiniz
    this.isOnline = true; // Gerçek implementasyonda NetInfo kullanın
    
    if (this.isOnline) {
      this.reconnectSubscriptions();
    }
  }

  /**
   * Config güncelle
   */
  updateConfig(config: Partial<RealtimeConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (!config.enableRealtime) {
      // Realtime kapatıldıysa tüm subscription'ları durdur
      this.unsubscribeAll();
    } else if (config.enableRealtime && this.subscriptions.size > 0) {
      // Realtime açıldıysa subscription'ları yeniden başlat
      this.reconnectSubscriptions();
    }
  }

  /**
   * Subscription'ları kaydet
   */
  private async saveSubscriptions(): Promise<void> {
    try {
      const subscriptionsData = Array.from(this.subscriptions.entries()).map(([id, sub]) => ({
        id: sub.id,
        collection: sub.collection,
        query: sub.query,
        lastUpdate: sub.lastUpdate,
        retryCount: sub.retryCount,
      }));

      await SecureStorage.setCache('realtime_subscriptions', subscriptionsData, 60); // 1 saat
    } catch (error) {
      console.error('❌ Failed to save subscriptions:', error);
    }
  }

  /**
   * Subscription'ları yükle
   */
  private async loadSubscriptions(): Promise<void> {
    try {
      const subscriptionsData = await SecureStorage.getCache('realtime_subscriptions');
      
      if (subscriptionsData && Array.isArray(subscriptionsData)) {
        console.log(`📥 Loaded ${subscriptionsData.length} saved subscriptions`);
        // Not: Callback fonksiyonları yeniden assign edilmeli
      }
    } catch (error) {
      console.error('❌ Failed to load subscriptions:', error);
    }
  }

  /**
   * Manager'ı temizle
   */
  cleanup(): void {
    this.unsubscribeAll();
    this.updateQueue = [];
    this.subscriptions.clear();
    this.unsubscribeFunctions.clear();
  }
}

export default RealtimeUpdateManager.getInstance();
