// 🎯 Unified Club Data Manager - Real-Time Service Orchestrator
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { enhancedClubStatsService as EnhancedClubStatsService, ClubStats as ClubStatsData, ClubStats } from './enhancedClubStatsService';

export interface UnifiedClubData {
  clubId: string;
  stats: ClubStatsData;
  notifications: any[];
  activities: any[];
  lastUpdated: firebase.firestore.Timestamp;
  isLoading: boolean;
  hasError: boolean;
  errorMessage?: string;
}

export interface ClubDataCallbacks {
  onStatsUpdate?: (stats: ClubStatsData) => void;
  onNotificationsUpdate?: (notifications: any[]) => void;
  onActivitiesUpdate?: (activities: any[]) => void;
  onComplete?: (data: UnifiedClubData) => void;
  onError?: (error: string) => void;
}

export class UnifiedClubDataManager {
  private static instances: Map<string, UnifiedClubDataManager> = new Map();
  private static db = firebase.firestore();
  
  private clubId: string;
  private currentData: UnifiedClubData;
  private callbacks: ClubDataCallbacks;
  private listeners: (() => void)[] = [];
  private isInitialized: boolean = false;
  private updateTimeout: NodeJS.Timeout | null = null;

  private constructor(clubId: string, callbacks: ClubDataCallbacks) {
    this.clubId = clubId;
    this.callbacks = callbacks;
    this.currentData = this.getEmptyData();
  }

  /**
   * 🎯 Get or create manager instance
   */
  static getInstance(clubId: string, callbacks: ClubDataCallbacks): UnifiedClubDataManager {
    const key = `club_${clubId}`;
    
    if (!this.instances.has(key)) {
      const instance = new UnifiedClubDataManager(clubId, callbacks);
      this.instances.set(key, instance);
    }
    
    const instance = this.instances.get(key)!;
    instance.updateCallbacks(callbacks);
    return instance;
  }

  /**
   * 🔄 Update callbacks
   */
  private updateCallbacks(callbacks: ClubDataCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * 🚀 Initialize real-time data streams
   */
  async initialize(): Promise<void> {
    try {
      console.log(`🚀 UNIFIED MANAGER: Initializing for club ${this.clubId}`);
      
      if (this.isInitialized) {
        console.log('📊 Manager already initialized - updating data');
        await this.refreshAllData();
        return;
      }

      this.currentData.isLoading = true;
      this.notifyCallbacks();

      // Setup real-time listeners
      await this.setupStatsListener();
      await this.setupNotificationsListener();
      await this.setupActivitiesListener();

      this.isInitialized = true;
      console.log(`✅ UNIFIED MANAGER: Initialization complete for club ${this.clubId}`);

    } catch (error) {
      console.error('❌ UNIFIED MANAGER: Initialization failed:', error);
      this.currentData.hasError = true;
      this.currentData.errorMessage = error instanceof Error ? error.message : String(error);
      this.currentData.isLoading = false;
      this.notifyCallbacks();
    }
  }

  /**
   * 📊 Setup stats listener
   */
  private async setupStatsListener(): Promise<void> {
    try {
      console.log(`📊 Setting up stats listener for club ${this.clubId}`);
      
      const statsUnsubscribe = EnhancedClubStatsService.onStatsChange(
        this.clubId,
        async (stats: ClubStats | null) => {
          if (stats) {
            console.log(`📊 Stats updated for club ${this.clubId}:`, stats);
            
            this.currentData.stats = stats;
            this.currentData.lastUpdated = firebase.firestore.Timestamp.now();
            
            this.callbacks.onStatsUpdate?.(stats);
            this.scheduleCompleteCallback();
          }
        }
      );

      this.listeners.push(() => statsUnsubscribe());

    } catch (error) {
      console.error('❌ Stats listener setup failed:', error);
    }
  }

  /**
   * 🔔 Setup notifications listener
   */
  private async setupNotificationsListener(): Promise<void> {
    try {
      console.log(`🔔 Setting up notifications listener for club ${this.clubId}`);
      
      const notificationsUnsubscribe = UnifiedClubDataManager.db.collection('notifications')
        .where('recipientId', '==', this.clubId)
        .where('recipientType', '==', 'club')
        .limit(20)
        .onSnapshot((snapshot) => {
          try {
            const notifications = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));

            // Sort notifications by createdAt descending (newest first)
            notifications.sort((a: any, b: any) => {
              const aTime = a.createdAt?.toMillis() || 0;
              const bTime = b.createdAt?.toMillis() || 0;
              return bTime - aTime;
            });

            console.log(`🔔 Notifications updated for club ${this.clubId}: ${notifications.length} notifications`);
            
            this.currentData.notifications = notifications;
            this.callbacks.onNotificationsUpdate?.(notifications);
            this.scheduleCompleteCallback();

          } catch (error) {
            console.error('❌ Notifications snapshot processing failed:', error);
          }
        }, (error) => {
          console.error('❌ Notifications listener error:', error);
        });

      this.listeners.push(notificationsUnsubscribe);

    } catch (error) {
      console.error('❌ Notifications listener setup failed:', error);
    }
  }

  /**
   * 📝 Setup activities listener
   */
  private async setupActivitiesListener(): Promise<void> {
    try {
      console.log(`📝 Setting up activities listener for club ${this.clubId}`);
      
      const activitiesUnsubscribe = UnifiedClubDataManager.db.collection('clubActivities')
        .where('clubId', '==', this.clubId)
        .limit(20)
        .onSnapshot((snapshot) => {
          try {
            const activities = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));

            // Sort activities by timestamp descending (newest first)
            activities.sort((a: any, b: any) => {
              const aTime = a.timestamp?.toMillis() || a.createdAt?.toMillis() || 0;
              const bTime = b.timestamp?.toMillis() || b.createdAt?.toMillis() || 0;
              return bTime - aTime;
            });

            console.log(`📝 Activities updated for club ${this.clubId}: ${activities.length} activities`);
            
            this.currentData.activities = activities;
            this.callbacks.onActivitiesUpdate?.(activities);
            this.scheduleCompleteCallback();

          } catch (error) {
            console.error('❌ Activities snapshot processing failed:', error);
          }
        }, (error) => {
          console.error('❌ Activities listener error:', error);
        });

      this.listeners.push(activitiesUnsubscribe);

    } catch (error) {
      console.error('❌ Activities listener setup failed:', error);
    }
  }

  /**
   * ⏰ Schedule complete callback (debounced)
   */
  private scheduleCompleteCallback(): void {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }

    this.updateTimeout = setTimeout(() => {
      this.currentData.isLoading = false;
      this.callbacks.onComplete?.(this.currentData);
    }, 500); // 500ms debounce
  }

  /**
   * 🔔 Notify all callbacks
   */
  private notifyCallbacks(): void {
    this.callbacks.onStatsUpdate?.(this.currentData.stats);
    this.callbacks.onNotificationsUpdate?.(this.currentData.notifications);
    this.callbacks.onActivitiesUpdate?.(this.currentData.activities);
    this.callbacks.onComplete?.(this.currentData);
  }

  /**
   * 🔄 Refresh all data
   */
  async refreshAllData(): Promise<void> {
    try {
      console.log(`🔄 UNIFIED MANAGER: Refreshing all data for club ${this.clubId}`);
      
      this.currentData.isLoading = true;
      this.notifyCallbacks();

      // Force refresh stats
      const freshStats = await EnhancedClubStatsService.forceRefreshStats(this.clubId);
      this.currentData.stats = freshStats;

      this.currentData.lastUpdated = firebase.firestore.Timestamp.now();
      this.currentData.isLoading = false;
      this.currentData.hasError = false;
      this.currentData.errorMessage = undefined;
      
      this.notifyCallbacks();
      
      console.log(`✅ UNIFIED MANAGER: Refresh complete for club ${this.clubId}`);

    } catch (error) {
      console.error('❌ UNIFIED MANAGER: Refresh failed:', error);
      this.currentData.hasError = true;
      this.currentData.errorMessage = error instanceof Error ? error.message : String(error);
      this.currentData.isLoading = false;
      this.notifyCallbacks();
    }
  }

  /**
   * 📊 Get current data
   */
  getCurrentData(): UnifiedClubData {
    return this.currentData;
  }

  /**
   * 🧹 Cleanup
   */
  cleanup(): void {
    console.log(`🧹 UNIFIED MANAGER: Cleaning up for club ${this.clubId}`);
    
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners = [];
    
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
      this.updateTimeout = null;
    }
    
    EnhancedClubStatsService.cleanupClubStats(this.clubId);
    
    this.isInitialized = false;
  }

  /**
   * 📊 Get empty data template
   */
  private getEmptyData(): UnifiedClubData {
    return {
      clubId: this.clubId,
      stats: {
        clubId: this.clubId,
        totalEvents: 0,
        totalMembers: 0,
        totalLikes: 0,
        totalComments: 0,
        totalParticipants: 0,
        totalInteractions: 0,
        monthlyEvents: 0,
        monthlyMembers: 0,
        monthlyLikes: 0,
        monthlyParticipants: 0,
        eventsThisMonth: 0,
        activitiesThisWeek: 0,
        memberGrowthToday: 0,
        averageAttendance: 0,
        averageEventRating: 0,
        engagementRate: 0,
        growthRate: 0,
        lastUpdated: firebase.firestore.Timestamp.now(),
        lastRecalculated: firebase.firestore.Timestamp.now(),
        isActive: true,
        weeklyStats: {},
        metadata: {}
      },
      notifications: [],
      activities: [],
      lastUpdated: firebase.firestore.Timestamp.now(),
      isLoading: true,
      hasError: false
    };
  }

  /**
   * 🧹 Static cleanup all instances
   */
  static cleanupAll(): void {
    this.instances.forEach(instance => instance.cleanup());
    this.instances.clear();
    EnhancedClubStatsService.cleanup();
  }

  /**
   * 🧹 Static cleanup specific club
   */
  static cleanupClub(clubId: string): void {
    const key = `club_${clubId}`;
    const instance = this.instances.get(key);
    if (instance) {
      instance.cleanup();
      this.instances.delete(key);
    }
  }
}

export default UnifiedClubDataManager;
