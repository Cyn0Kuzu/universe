import { firebase } from '../firebase/config';
import { NetworkManager } from '../utils/networkManager';
import { SecureStorage } from '../utils/secureStorage';

export interface SyncData {
  id: string;
  type: 'user' | 'event' | 'club' | 'notification';
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
  userId: string;
  synced: boolean;
  retryCount: number;
}

export interface SyncStatus {
  isOnline: boolean;
  lastSyncTime: number;
  pendingOperations: number;
  failedOperations: number;
  isAutoSyncEnabled: boolean;
}

export class DataSynchronizationService {
  private static instance: DataSynchronizationService;
  private syncQueue: SyncData[] = [];
  private isOnline: boolean = true;
  private lastSyncTime: number = 0;
  private maxRetries: number = 3;
  private syncInterval: NodeJS.Timeout | null = null;
  private subscribers: ((status: SyncStatus) => void)[] = [];

  static getInstance(): DataSynchronizationService {
    if (!DataSynchronizationService.instance) {
      DataSynchronizationService.instance = new DataSynchronizationService();
    }
    return DataSynchronizationService.instance;
  }

  /**
   * Servisi başlat
   */
  async initialize(): Promise<void> {
    try {
      console.log('🔄 Initializing Data Synchronization Service...');
      
      // Pending sync operations'ları yükle
      await this.loadPendingOperations();
      
      // Network durumunu kontrol et
      this.checkNetworkStatus();
      
      // Auto sync'i başlat
      this.startAutoSync();
      
      console.log('✅ Data Synchronization Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize sync service:', error);
    }
  }

  /**
   * Pending operations'ları SecureStorage'dan yükle
   */
  private async loadPendingOperations(): Promise<void> {
    try {
      const cached = await SecureStorage.getCache('sync_queue');
      if (cached && Array.isArray(cached)) {
        this.syncQueue = cached;
        console.log(`📥 Loaded ${this.syncQueue.length} pending sync operations`);
      }
    } catch (error) {
      console.error('❌ Failed to load pending operations:', error);
    }
  }

  /**
   * Pending operations'ları SecureStorage'a kaydet
   */
  private async savePendingOperations(): Promise<void> {
    try {
      await SecureStorage.setCache('sync_queue', this.syncQueue, 24 * 60); // 24 saat
    } catch (error) {
      console.error('❌ Failed to save pending operations:', error);
    }
  }

  /**
   * Sync operation ekle
   */
  async addSyncOperation(operation: Omit<SyncData, 'id' | 'timestamp' | 'synced' | 'retryCount'>): Promise<void> {
    const syncData: SyncData = {
      ...operation,
      id: this.generateId(),
      timestamp: Date.now(),
      synced: false,
      retryCount: 0,
    };

    this.syncQueue.push(syncData);
    await this.savePendingOperations();
    
    console.log('➕ Sync operation added:', syncData.type, syncData.action);
    
    // Online ise hemen sync et
    if (this.isOnline) {
      this.processSyncQueue();
    }
    
    this.notifyStatusChange();
  }

  /**
   * Sync queue'yu işle
   */
  async processSyncQueue(): Promise<void> {
    if (!this.isOnline || this.syncQueue.length === 0) {
      return;
    }

    console.log(`🔄 Processing ${this.syncQueue.length} sync operations...`);
    
    const operations = [...this.syncQueue.filter(op => !op.synced)];
    
    for (const operation of operations) {
      try {
        await this.processSingleOperation(operation);
      } catch (error) {
        console.error(`❌ Failed to process operation ${operation.id}:`, error);
        
        operation.retryCount++;
        
        if (operation.retryCount >= this.maxRetries) {
          console.error(`🚫 Operation ${operation.id} exceeded max retries`);
          this.removeOperation(operation.id);
        }
      }
    }
    
    await this.savePendingOperations();
    this.lastSyncTime = Date.now();
    this.notifyStatusChange();
  }

  /**
   * Tek bir sync operation'ı işle
   */
  private async processSingleOperation(operation: SyncData): Promise<void> {
    const result = await NetworkManager.handleApiCall(
      () => this.executeOperation(operation),
      {
        offlineMessage: 'Operation will be synced when online',
        retryCount: 1
      }
    );

    if (result.success) {
      operation.synced = true;
      console.log(`✅ Synced operation: ${operation.type} ${operation.action}`);
      
      // Başarılı operation'ları queue'dan kaldır
      this.removeOperation(operation.id);
    } else {
      throw new Error(result.error);
    }
  }

  /**
   * Operation'ı execute et
   */
  private async executeOperation(operation: SyncData): Promise<any> {
    const db = firebase.firestore();
    
    switch (operation.type) {
      case 'user':
        return this.syncUserData(db, operation);
      case 'event':
        return this.syncEventData(db, operation);
      case 'club':
        return this.syncClubData(db, operation);
      case 'notification':
        return this.syncNotificationData(db, operation);
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  /**
   * User data sync
   */
  private async syncUserData(db: firebase.firestore.Firestore, operation: SyncData): Promise<any> {
    const { action, data } = operation;
    
    switch (action) {
      case 'create':
        return db.collection('users').add(data);
      case 'update':
        return db.collection('users').doc(data.id).update(data.updates);
      case 'delete':
        return db.collection('users').doc(data.id).delete();
      default:
        throw new Error(`Unknown user action: ${action}`);
    }
  }

  /**
   * Event data sync
   */
  private async syncEventData(db: firebase.firestore.Firestore, operation: SyncData): Promise<any> {
    const { action, data } = operation;
    
    switch (action) {
      case 'create':
        return db.collection('events').add(data);
      case 'update':
        return db.collection('events').doc(data.id).update(data.updates);
      case 'delete':
        return db.collection('events').doc(data.id).delete();
      default:
        throw new Error(`Unknown event action: ${action}`);
    }
  }

  /**
   * Club data sync
   */
  private async syncClubData(db: firebase.firestore.Firestore, operation: SyncData): Promise<any> {
    const { action, data } = operation;
    
    switch (action) {
      case 'create':
        return db.collection('clubs').add(data);
      case 'update':
        return db.collection('clubs').doc(data.id).update(data.updates);
      case 'delete':
        return db.collection('clubs').doc(data.id).delete();
      default:
        throw new Error(`Unknown club action: ${action}`);
    }
  }

  /**
   * Notification data sync
   */
  private async syncNotificationData(db: firebase.firestore.Firestore, operation: SyncData): Promise<any> {
    const { action, data } = operation;
    
    switch (action) {
      case 'create':
        return db.collection('notifications').add(data);
      case 'update':
        return db.collection('notifications').doc(data.id).update(data.updates);
      case 'delete':
        return db.collection('notifications').doc(data.id).delete();
      default:
        throw new Error(`Unknown notification action: ${action}`);
    }
  }

  /**
   * Operation'ı queue'dan kaldır
   */
  private removeOperation(operationId: string): void {
    const index = this.syncQueue.findIndex(op => op.id === operationId);
    if (index > -1) {
      this.syncQueue.splice(index, 1);
    }
  }

  /**
   * Network durumunu kontrol et
   */
  private checkNetworkStatus(): void {
    // React Native'de NetInfo kullanabilirsiniz
    // Şimdilik basit bir network kontrolü yapıyoruz
    this.isOnline = true; // Gerçek implementasyonda NetInfo kullanın
  }

  /**
   * Auto sync başlat
   */
  private startAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    // Her 30 saniyede bir sync kontrol et
    this.syncInterval = setInterval(() => {
      if (this.isOnline && this.syncQueue.length > 0) {
        this.processSyncQueue();
      }
    }, 30000);
  }

  /**
   * Auto sync durdur
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Manual sync başlat
   */
  async forcSync(): Promise<void> {
    console.log('🔄 Force sync initiated...');
    await this.processSyncQueue();
  }

  /**
   * Sync status'u getir
   */
  getSyncStatus(): SyncStatus {
    return {
      isOnline: this.isOnline,
      lastSyncTime: this.lastSyncTime,
      pendingOperations: this.syncQueue.filter(op => !op.synced).length,
      failedOperations: this.syncQueue.filter(op => op.retryCount >= this.maxRetries).length,
      isAutoSyncEnabled: this.syncInterval !== null,
    };
  }

  /**
   * Status değişikliklerini dinle
   */
  subscribe(callback: (status: SyncStatus) => void): () => void {
    this.subscribers.push(callback);
    
    // İlk status'u gönder
    callback(this.getSyncStatus());
    
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  /**
   * Subscribers'ı bilgilendir
   */
  private notifyStatusChange(): void {
    const status = this.getSyncStatus();
    this.subscribers.forEach(callback => callback(status));
  }

  /**
   * Queue'yu temizle
   */
  async clearSyncQueue(): Promise<void> {
    this.syncQueue = [];
    await this.savePendingOperations();
    this.notifyStatusChange();
    console.log('🗑️ Sync queue cleared');
  }

  /**
   * Failed operations'ları retry et
   */
  async retryFailedOperations(): Promise<void> {
    const failedOperations = this.syncQueue.filter(op => op.retryCount >= this.maxRetries);
    
    // Retry count'u sıfırla
    failedOperations.forEach(op => {
      op.retryCount = 0;
    });
    
    await this.processSyncQueue();
    console.log(`🔄 Retrying ${failedOperations.length} failed operations`);
  }

  /**
   * ID oluşturucu
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Servisi temizle
   */
  cleanup(): void {
    this.stopAutoSync();
    this.subscribers = [];
    this.syncQueue = [];
  }
}

export default DataSynchronizationService.getInstance();
