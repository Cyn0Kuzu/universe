import { SecureStorage } from '../utils/secureStorage';
import { NetworkManager } from '../utils/networkManager';
import DataSynchronizationService from './dataSynchronizationService';

export interface OfflineData {
  key: string;
  data: any;
  timestamp: number;
  version: number;
  expiresAt?: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface CacheStrategy {
  maxSize: number; // MB cinsinden
  maxAge: number; // Dakika cinsinden
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
}

export interface OfflineCapability {
  read: boolean;
  write: boolean;
  delete: boolean;
  search: boolean;
}

export class OfflineDataManager {
  private static instance: OfflineDataManager;
  private cacheSize: number = 0; // MB cinsinden
  private maxCacheSize: number = 50; // MB
  private compressionThreshold: number = 1; // MB
  
  private readonly CACHE_PREFIX = 'offline_';
  private readonly METADATA_KEY = 'offline_metadata';
  
  static getInstance(): OfflineDataManager {
    if (!OfflineDataManager.instance) {
      OfflineDataManager.instance = new OfflineDataManager();
    }
    return OfflineDataManager.instance;
  }

  /**
   * Manager'ı başlat
   */
  async initialize(): Promise<void> {
    try {
      console.log('📦 Initializing Offline Data Manager...');
      
      await this.calculateCacheSize();
      await this.cleanExpiredData();
      
      console.log(`💾 Cache size: ${this.cacheSize.toFixed(2)} MB`);
      console.log('✅ Offline Data Manager initialized');
    } catch (error) {
      console.error('❌ Failed to initialize offline manager:', error);
    }
  }

  /**
   * Data'yı offline cache'e kaydet
   */
  async storeOfflineData(
    key: string, 
    data: any, 
    options?: {
      expiresInMinutes?: number;
      priority?: 'low' | 'medium' | 'high' | 'critical';
      compress?: boolean;
      encrypt?: boolean;
    }
  ): Promise<boolean> {
    try {
      const cacheKey = this.getCacheKey(key);
      const priority = options?.priority || 'medium';
      const expiresAt = options?.expiresInMinutes 
        ? Date.now() + (options.expiresInMinutes * 60 * 1000)
        : undefined;

      let processedData = data;
      
      // Compression
      if (options?.compress && this.shouldCompress(data)) {
        processedData = this.compressData(data);
      }

      const offlineData: OfflineData = {
        key,
        data: processedData,
        timestamp: Date.now(),
        version: 1,
        expiresAt,
        priority,
      };

      // Cache boyutunu kontrol et
      const dataSize = this.calculateDataSize(offlineData);
      if (dataSize + this.cacheSize > this.maxCacheSize) {
        await this.freeUpSpace(dataSize);
      }

      await SecureStorage.setCache(cacheKey, offlineData, options?.expiresInMinutes);
      
      // Metadata güncelle
      await this.updateMetadata(key, {
        size: dataSize,
        priority,
        timestamp: Date.now(),
        compressed: !!options?.compress,
        encrypted: !!options?.encrypt,
      });

      this.cacheSize += dataSize;
      
      console.log(`💾 Stored offline data: ${key} (${dataSize.toFixed(2)} MB)`);
      return true;
    } catch (error) {
      console.error('❌ Failed to store offline data:', error);
      return false;
    }
  }

  /**
   * Offline data'yı getir
   */
  async getOfflineData<T = any>(key: string): Promise<T | null> {
    try {
      const cacheKey = this.getCacheKey(key);
      const offlineData: OfflineData | null = await SecureStorage.getCache(cacheKey);
      
      if (!offlineData) {
        return null;
      }

      // Expired kontrolü
      if (offlineData.expiresAt && Date.now() > offlineData.expiresAt) {
        await this.removeOfflineData(key);
        return null;
      }

      let data = offlineData.data;
      
      // Decompression
      if (this.isCompressed(data)) {
        data = this.decompressData(data);
      }

      console.log(`📥 Retrieved offline data: ${key}`);
      return data as T;
    } catch (error) {
      console.error('❌ Failed to get offline data:', error);
      return null;
    }
  }

  /**
   * Offline data'yı güncelle
   */
  async updateOfflineData(
    key: string, 
    data: any, 
    options?: {
      incrementVersion?: boolean;
      merge?: boolean;
    }
  ): Promise<boolean> {
    try {
      const existingData = await this.getOfflineData(key);
      
      if (!existingData && !options?.merge) {
        return this.storeOfflineData(key, data);
      }

      let newData = data;
      if (options?.merge && existingData) {
        newData = { ...existingData, ...data };
      }

      const cacheKey = this.getCacheKey(key);
      const existingOfflineData: OfflineData | null = await SecureStorage.getCache(cacheKey);
      
      if (existingOfflineData) {
        existingOfflineData.data = newData;
        existingOfflineData.timestamp = Date.now();
        
        if (options?.incrementVersion) {
          existingOfflineData.version++;
        }

        await SecureStorage.setCache(cacheKey, existingOfflineData);
        
        // Sync queue'ya ekle
        await DataSynchronizationService.addSyncOperation({
          type: this.getDataType(key),
          action: 'update',
          data: { id: key, updates: newData },
          userId: 'current_user', // AuthContext'ten al
        });

        console.log(`🔄 Updated offline data: ${key}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Failed to update offline data:', error);
      return false;
    }
  }

  /**
   * Offline data'yı sil
   */
  async removeOfflineData(key: string): Promise<boolean> {
    try {
      const cacheKey = this.getCacheKey(key);
      
      // SecureStorage'dan sil
      await SecureStorage.setCache(cacheKey, null, 0);
      
      // Metadata'dan kaldır
      await this.removeFromMetadata(key);
      console.log(`🗑️ Removed offline data: ${key}`);

      return true;
    } catch (error) {
      console.error('❌ Failed to remove offline data:', error);
      return false;
    }
  }

  /**
   * Offline search
   */
  async searchOfflineData(query: string, dataType?: string): Promise<any[]> {
    try {
      const metadata = await this.getMetadata();
      const results: any[] = [];
      
      for (const [key, meta] of Object.entries(metadata)) {
        if (dataType && !key.startsWith(dataType)) {
          continue;
        }
        
        const data = await this.getOfflineData(key);
        if (data && this.matchesQuery(data, query)) {
          results.push({
            key,
            data,
            metadata: meta,
          });
        }
      }

      // Priority'ye göre sırala
      results.sort((a, b) => {
        const priorityOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.metadata.priority] || 0;
        const bPriority = priorityOrder[b.metadata.priority] || 0;
        return bPriority - aPriority;
      });

      console.log(`🔍 Found ${results.length} offline results for: ${query}`);
      return results;
    } catch (error) {
      console.error('❌ Failed to search offline data:', error);
      return [];
    }
  }

  /**
   * Offline capability kontrolü
   */
  async checkOfflineCapability(operation: string): Promise<OfflineCapability> {
    // Network durumunu kontrol etmeden basit offline capability döndür
    return {
      read: true, // Her zaman offline okuma mümkün
      write: true, // Sync queue'ya eklenir
      delete: true, // Local'den silinir, sync'te remote'dan da silinir
      search: true, // Local cache'de arama mümkün
    };
  }

  /**
   * Cache istatistikleri
   */
  async getCacheStats(): Promise<{
    totalSize: number;
    itemCount: number;
    oldestItem: number;
    newestItem: number;
    compressionRatio: number;
  }> {
    try {
      const metadata = await this.getMetadata();
      const itemCount = Object.keys(metadata).length;
      
      let oldestItem = Date.now();
      let newestItem = 0;
      let totalCompressedSize = 0;
      let totalUncompressedSize = 0;

      for (const meta of Object.values(metadata)) {
        if (meta.timestamp < oldestItem) oldestItem = meta.timestamp;
        if (meta.timestamp > newestItem) newestItem = meta.timestamp;
        
        totalCompressedSize += meta.size;
        if (meta.compressed) {
          // Estimate uncompressed size (rough calculation)
          totalUncompressedSize += meta.size * 2;
        } else {
          totalUncompressedSize += meta.size;
        }
      }

      const compressionRatio = totalUncompressedSize > 0 
        ? totalCompressedSize / totalUncompressedSize 
        : 1;

      return {
        totalSize: this.cacheSize,
        itemCount,
        oldestItem,
        newestItem,
        compressionRatio,
      };
    } catch (error) {
      console.error('❌ Failed to get cache stats:', error);
      return {
        totalSize: 0,
        itemCount: 0,
        oldestItem: 0,
        newestItem: 0,
        compressionRatio: 1,
      };
    }
  }

  /**
   * Cache temizle
   */
  async clearCache(options?: {
    olderThan?: number; // Timestamp
    priority?: 'low' | 'medium' | 'high' | 'critical';
    dataType?: string;
  }): Promise<number> {
    try {
      const metadata = await this.getMetadata();
      let removedCount = 0;

      for (const [key, meta] of Object.entries(metadata)) {
        let shouldRemove = false;

        if (options?.olderThan && meta.timestamp < options.olderThan) {
          shouldRemove = true;
        }
        
        if (options?.priority && meta.priority === options.priority) {
          shouldRemove = true;
        }
        
        if (options?.dataType && !key.startsWith(options.dataType)) {
          shouldRemove = false;
        }
        
        if (shouldRemove || !options) {
          await this.removeOfflineData(key);
          removedCount++;
        }
      }

      await this.calculateCacheSize();
      console.log(`🧹 Cleared ${removedCount} items from cache`);
      return removedCount;
    } catch (error) {
      console.error('❌ Failed to clear cache:', error);
      return 0;
    }
  }

  /**
   * Cache boyutunu hesapla
   */
  private async calculateCacheSize(): Promise<void> {
    try {
      const metadata = await this.getMetadata();
      this.cacheSize = Object.values(metadata).reduce((total, meta) => total + meta.size, 0);
    } catch (error) {
      console.error('❌ Failed to calculate cache size:', error);
      this.cacheSize = 0;
    }
  }

  /**
   * Expired data'yı temizle
   */
  private async cleanExpiredData(): Promise<void> {
    const now = Date.now();
    const metadata = await this.getMetadata();
    
    for (const [key, meta] of Object.entries(metadata)) {
      const data = await this.getOfflineData(key);
      if (data && (data as OfflineData).expiresAt && (data as OfflineData).expiresAt! < now) {
        await this.removeOfflineData(key);
      }
    }
  }

  /**
   * Yer açmak için cache temizle
   */
  private async freeUpSpace(requiredSpace: number): Promise<void> {
    const metadata = await this.getMetadata();
    
    // Priority ve timestamp'e göre sırala (düşük priority ve eski olanlar önce)
    const sortedItems = Object.entries(metadata).sort((a, b) => {
      const priorityOrder: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };
      const aPriority = priorityOrder[a[1].priority] || 0;
      const bPriority = priorityOrder[b[1].priority] || 0;
      const priorityDiff = aPriority - bPriority;
      
      if (priorityDiff !== 0) return priorityDiff;
      return a[1].timestamp - b[1].timestamp;
    });

    let freedSpace = 0;
    for (const [key, meta] of sortedItems) {
      if (freedSpace >= requiredSpace) break;
      
      await this.removeOfflineData(key);
      freedSpace += meta.size;
    }

    await this.calculateCacheSize();
  }

  /**
   * Data boyutunu hesapla (MB)
   */
  private calculateDataSize(data: any): number {
    try {
      const jsonString = JSON.stringify(data);
      return new Blob([jsonString]).size / (1024 * 1024); // MB
    } catch (error) {
      return 0;
    }
  }

  /**
   * Compression gerekli mi kontrol et
   */
  private shouldCompress(data: any): boolean {
    return this.calculateDataSize(data) > this.compressionThreshold;
  }

  /**
   * Data'yı compress et
   */
  private compressData(data: any): any {
    // Basit compression - gerçek implementasyonda LZ-string gibi library kullanın
    return {
      __compressed: true,
      data: JSON.stringify(data),
    };
  }

  /**
   * Data compressed mi kontrol et
   */
  private isCompressed(data: any): boolean {
    return data && typeof data === 'object' && data.__compressed === true;
  }

  /**
   * Data'yı decompress et
   */
  private decompressData(data: any): any {
    if (this.isCompressed(data)) {
      return JSON.parse(data.data);
    }
    return data;
  }

  /**
   * Query ile eşleşme kontrolü
   */
  private matchesQuery(data: any, query: string): boolean {
    const searchString = JSON.stringify(data).toLowerCase();
    return searchString.includes(query.toLowerCase());
  }

  /**
   * Data type'ı belirle
   */
  private getDataType(key: string): 'user' | 'event' | 'club' | 'notification' {
    if (key.startsWith('user_')) return 'user';
    if (key.startsWith('event_')) return 'event';
    if (key.startsWith('club_')) return 'club';
    return 'notification';
  }

  /**
   * Cache key oluştur
   */
  private getCacheKey(key: string): string {
    return `${this.CACHE_PREFIX}${key}`;
  }

  /**
   * Metadata getir
   */
  private async getMetadata(): Promise<Record<string, any>> {
    try {
      return await SecureStorage.getCache(this.METADATA_KEY) || {};
    } catch (error) {
      return {};
    }
  }

  /**
   * Metadata güncelle
   */
  private async updateMetadata(key: string, metadata: any): Promise<void> {
    try {
      const allMetadata = await this.getMetadata();
      allMetadata[key] = metadata;
      await SecureStorage.setCache(this.METADATA_KEY, allMetadata, 24 * 60); // 24 saat
    } catch (error) {
      console.error('❌ Failed to update metadata:', error);
    }
  }

  /**
   * Metadata'dan kaldır
   */
  private async removeFromMetadata(key: string): Promise<void> {
    try {
      const allMetadata = await this.getMetadata();
      delete allMetadata[key];
      await SecureStorage.setCache(this.METADATA_KEY, allMetadata, 24 * 60);
    } catch (error) {
      console.error('❌ Failed to remove from metadata:', error);
    }
  }
}

export default OfflineDataManager.getInstance();
