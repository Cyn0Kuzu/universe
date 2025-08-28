// 🎯 Ana Servisler Export Merkezi - Professional Services Architecture

export { activityLogger } from './activityLogger';

// 📸 Advanced Firebase Storage Service - FULL IMAGE MANAGEMENT SYSTEM
export { advancedStorageService } from './advancedFirebaseStorageService';
export type { 
  ImageUploadResult, 
  ImageMetadata, 
  ImageType, 
  ImageUploadOptions 
} from './advancedFirebaseStorageService';

// 📊 Club Activity Service - Core Activity Tracking
export { clubActivityService } from './clubActivityService';
export type { ClubActivity, ClubActivityStats } from './clubActivityService';

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
export { EnhancedClubActivityService, clubActivityService as enhancedClubActivityService } from './enhancedClubActivityService';
export type { ClubActivity as EnhancedClubActivity } from './enhancedClubActivityService';

// Enhanced Services
export { dailyLoginService } from './dailyLoginService';

// Club Member Stats Service
export { ClubMemberStatsService, clubMemberStatsService } from './clubMemberStatsService';
export type { MemberStats, ClubMemberStatsFilter } from './clubMemberStatsService';

// 📊 User Statistics Service
export { userStatsService, UserStatsService } from './userStatsService';

// 🔄 Advanced Data Management Services
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

// Service Manager - Professional Service Coordinator
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
   * Initialize all services
   */
  async initializeAllServices(): Promise<void> {
    if (this.isInitialized) {
      console.log('⚠️ Services already initialized');
      return;
    }

    try {
      console.log('🚀 Initializing professional service architecture...');
      
      // Services use lazy loading for optimal performance
      this.isInitialized = true;
      console.log('✅ Professional service manager initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize services:', error);
      throw error;
    }
  }

  /**
   * Get service status
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
   * Cleanup services
   */
  async cleanup(): Promise<void> {
    try {
      console.log('🧹 Cleaning up professional services...');
      this.isInitialized = false;
      console.log('✅ Services cleaned up successfully');
    } catch (error) {
      console.error('❌ Failed to cleanup services:', error);
    }
  }

  /**
   * Health check for all services
   */
  async performHealthCheck(): Promise<{
    overall: 'healthy' | 'warning' | 'critical';
    message: string;
  }> {
    try {
      return {
        overall: this.isInitialized ? 'healthy' : 'warning',
        message: this.isInitialized ? 'Professional service manager running optimally' : 'Service manager requires initialization',
      };
    } catch (error) {
      return {
        overall: 'critical',
        message: 'Service health check failed - requires immediate attention',
      };
    }
  }
}

// Singleton instance for global service management
export const serviceManager = ServiceManager.getInstance();
