// 🎯 Ana Servisler Export Merkezi

export { activityLogger } from './activityLogger';

// 📊 PROFESSIONAL v2.0 ENHANCED SERVICES
export { enhancedClubStatsService as EnhancedClubStatsService } from './enhancedClubStatsService';
export type { ClubStats as ClubStatsData } from './enhancedClubStatsService';

// 📢 Club Notification & Activity System
export { ClubNotificationService } from './clubNotificationService';
export type { ClubNotification } from './clubNotificationService';

// 🔔 Unified Notification System - YENİ MERKEZ SİSTEM
export { UnifiedNotificationService } from './unifiedNotificationService';
export type { 
  BaseNotification,
  ClubNotificationType,
  StudentNotificationType
} from './unifiedNotificationService';

// 🏃‍♂️ Enhanced Club Activity Service
export { clubActivityService } from './enhancedClubActivityService';
export type { ClubActivity as EnhancedClubActivity } from './enhancedClubActivityService';

// Enhanced Services
export { EnhancedClubActivityService } from './enhancedClubActivityService';
// Legacy notification services removed - using unified system
export { dailyLoginService } from './dailyLoginService';

// Club Member Stats Service
export { ClubMemberStatsService, clubMemberStatsService } from './clubMemberStatsService';
export type { MemberStats, ClubMemberStatsFilter } from './clubMemberStatsService';

// ⭐ NEW: Real-time Club Scores Service - Module not found, commented out
// export { RealTimeClubScoresService } from './realTimeClubScoresService';
// export { default as RealTimeClubScoresServiceDefault } from './realTimeClubScoresService';

// 📊 User Statistics Service
export { userStatsService, UserStatsService } from './userStatsService';

// 🔄 NEW: Advanced Data Management Services
export { default as DataSynchronizationService } from './dataSynchronizationService';
export { default as OfflineDataManager } from './offlineDataManager';
export { default as RealtimeUpdateManager } from './realtimeUpdateManager';

// Service Types
export type {
  SyncData,
  SyncStatus,
} from './dataSynchronizationService';

export type {
  OfflineData,
  CacheStrategy,
  OfflineCapability,
} from './offlineDataManager';

export type {
  RealtimeSubscription,
  UpdateEvent,
  RealtimeConfig,
} from './realtimeUpdateManager';

// Service Manager - Basit service koordinatörü
export class ServiceManager {
  private static instance: ServiceManager;
  private isInitialized: boolean = false;

  static getInstance(): ServiceManager {
    if (!ServiceManager.instance) {
      ServiceManager.instance = new ServiceManager();
    }
    return ServiceManager.instance;
  }

  /**
   * Servisleri başlatma durumu
   */
  async initializeAllServices(): Promise<void> {
    if (this.isInitialized) {
      console.log('⚠️ Services already initialized');
      return;
    }

    try {
      console.log('🚀 Initializing all services...');
      
      // Servisler lazy loading ile kullanılacak
      this.isInitialized = true;
      console.log('✅ Service manager initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize services:', error);
      throw error;
    }
  }

  /**
   * Servislerin durumunu kontrol et
   */
  getServiceStatus(): {
    initialized: boolean;
    timestamp: number;
  } {
    return {
      initialized: this.isInitialized,
      timestamp: Date.now(),
    };
  }

  /**
   * Servisleri temizle
   */
  async cleanup(): Promise<void> {
    try {
      console.log('🧹 Cleaning up services...');
      this.isInitialized = false;
      console.log('✅ Services cleaned up');
    } catch (error) {
      console.error('❌ Failed to cleanup services:', error);
    }
  }

  /**
   * Health check
   */
  async performHealthCheck(): Promise<{
    overall: 'healthy' | 'warning' | 'critical';
    message: string;
  }> {
    try {
      return {
        overall: this.isInitialized ? 'healthy' : 'warning',
        message: this.isInitialized ? 'Service manager is running' : 'Service manager not initialized',
      };
    } catch (error) {
      return {
        overall: 'critical',
        message: 'Health check failed',
      };
    }
  }
}

// Singleton instance
export const serviceManager = ServiceManager.getInstance();
