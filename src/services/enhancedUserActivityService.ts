import type firebase from 'firebase/compat/app';
import {
  firebaseConfig,
  getFirebase,
  initializeFirebaseServices,
} from '../firebase/config';

// User Activity interface definitions
export interface UserActivity {
  id?: string;
  type: 'event_like' | 'event_unlike' | 'event_comment' | 'event_comment_delete' | 'event_join' | 'event_leave' | 'event_create' |
        'club_join' | 'club_leave' | 'club_follow' | 'club_unfollow' | 'club_like' |
        'club_request' | 'club_approved' | 'club_rejected' | 'club_kicked' | 'club_left' |
        'user_follow' | 'user_unfollow' | 'follower_removal' | 'profile_update' |
  'leaderboard_rank' | 'milestone_reached' | 'event_share' | 'unshare_event' | 'club_share' | 'like_comment' | 'unlike_comment';
  title: string;
  description: string;
  userId: string;
  userName: string;
  userPhotoURL?: string;
  // Top-level clubId to support simple equality queries from club feeds
  clubId?: string;
  targetId?: string; // eventId, clubId, userId etc.
  targetName?: string;
  category: 'events' | 'social' | 'profile' | 'general';
  visibility: 'public' | 'private' | 'followers_only';
  priority: 'low' | 'medium' | 'high';
  metadata?: {
  commentId?: string;
    eventId?: string;
    eventTitle?: string;
    eventDate?: Date;
    clubId?: string;
    clubName?: string;
    followedUserId?: string;
    followedUserName?: string;
  unfollowedUserId?: string;
  unfollowedUserName?: string;
    removedFollowerId?: string;
    removedFollowerName?: string;
    commentText?: string;
    likeCount?: number;
    milestoneType?: string;
    milestoneValue?: number;
    shareCount?: number;
    changeDetails?: any;
    action?: string;
  };
  createdAt: any; // firebase.firestore.Timestamp
  isHighlighted: boolean;
  isPinned: boolean;
  reactions?: {
    [userId: string]: '👍' | '❤️' | '😊' | '🎉' | '🔥';
  };
  reactionCounts?: {
    '👍': number;
    '❤️': number;
    '😊': number;
    '🎉': number;
    '🔥': number;
  };
}

export interface UserActivityFilter {
  type?: string[];
  category?: string[];
  visibility?: string[];
  userId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  priority?: string[];
  isPinned?: boolean;
  limit?: number;
}

/**
 * Enhanced User Activity Service
 * Professional-grade user activity management with real-time updates and comprehensive filtering
 */
export class EnhancedUserActivityService {
  private static instance: EnhancedUserActivityService;
  private db: firebase.firestore.Firestore | null = null;
  private firebaseCompat: typeof firebase | null = null;
  private initializationPromise: Promise<void> | null = null;
  private cache: Map<string, UserActivity[]> = new Map();
  private listeners: Map<string, () => void> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    // Production mode - no debug logs
    this.ensureFirebaseReady().catch((error) => {
      console.warn('⚠️ EnhancedUserActivityService initialization warning:', error);
    });
  }

  static getInstance(): EnhancedUserActivityService {
    if (!EnhancedUserActivityService.instance) {
      EnhancedUserActivityService.instance = new EnhancedUserActivityService();
    }
    return EnhancedUserActivityService.instance;
  }

  private async ensureFirebaseReady(): Promise<void> {
    if (this.db && this.firebaseCompat) {
      return;
    }

    if (!this.initializationPromise) {
      this.initializationPromise = (async () => {
        await initializeFirebaseServices();
        const firebaseCompat = await getFirebase();
        if (!firebaseCompat) {
          throw new Error('[EnhancedUserActivityService] Firebase SDK not available');
        }
        if (!firebaseCompat.apps?.length) {
          firebaseCompat.initializeApp?.(firebaseConfig);
        }
        if (!firebaseCompat.firestore) {
          throw new Error('[EnhancedUserActivityService] Firestore API not available');
        }
        this.firebaseCompat = firebaseCompat;
        this.db = firebaseCompat.firestore();
      })().finally(() => {
        this.initializationPromise = null;
      });
    }

    await this.initializationPromise;
  }

  private async getDb(): Promise<firebase.firestore.Firestore> {
    await this.ensureFirebaseReady();
    if (!this.db) {
      throw new Error('[EnhancedUserActivityService] Firestore not initialized');
    }
    return this.db;
  }

  private getFieldValue() {
    if (!this.firebaseCompat?.firestore?.FieldValue) {
      throw new Error('[EnhancedUserActivityService] FieldValue not available');
    }
    return this.firebaseCompat.firestore.FieldValue;
  }

  private getTimestamp() {
    if (!this.firebaseCompat?.firestore?.Timestamp) {
      throw new Error('[EnhancedUserActivityService] Timestamp not available');
    }
    return this.firebaseCompat.firestore.Timestamp;
  }

  // ============================================================================
  // CORE ACTIVITY MANAGEMENT - Enhanced with error handling
  // ============================================================================

  async createActivity(activity: Partial<UserActivity>): Promise<string | null> {
    console.log('📝 EnhancedUserActivityService.createActivity called with:', {
      type: activity.type,
      userId: activity.userId,
      userName: activity.userName,
      title: activity.title,
      clubId: activity.clubId
    });
    
    return this.safeOperation(async () => {
      const db = await this.getDb();
      const FieldValue = this.getFieldValue();

      // Validate activity data
      if (!this.validateActivity(activity)) {
        console.error('❌ Activity validation failed:', activity);
        throw new Error('Invalid activity data');
      }

      console.log('✅ Activity validation passed');

      // Sanitize and validate inputs
      const sanitizedActivity = this.sanitizeActivityData(activity);
      console.log('✅ Activity data sanitized');

      // Add default values
      const activityData: Partial<UserActivity> = {
        ...sanitizedActivity,
        createdAt: FieldValue.serverTimestamp() as any,
        isHighlighted: sanitizedActivity.isHighlighted || false,
        isPinned: sanitizedActivity.isPinned || false,
        priority: sanitizedActivity.priority || 'medium',
        visibility: sanitizedActivity.visibility || 'public',
        reactions: {},
        reactionCounts: {
          '👍': 0,
          '❤️': 0,
          '😊': 0,
          '🎉': 0,
          '🔥': 0
        }
      };

      console.log('📝 Ready to save activity to Firestore:', {
        type: activityData.type,
        userId: activityData.userId,
        title: activityData.title
      });

      // Add to Firestore with retry mechanism
      const docRef = await this.retryOperation(
        () => db.collection('userActivities').add(activityData),
        'Create Activity'
      );
      
      console.log(`✅ Activity created: ${sanitizedActivity.type} for user ${sanitizedActivity.userId} - ${sanitizedActivity.title}`);
      
      // Clear cache for this user
      if (sanitizedActivity.userId) {
        this.clearCache(sanitizedActivity.userId);
      }

      return (docRef as any).id;
    }, 'Create Activity');
  }

  /**
   * 🧹 Sanitize activity data to prevent XSS and other security issues
   */
  private sanitizeActivityData(activity: Partial<UserActivity>): Partial<UserActivity> {
    const sanitized = { ...activity };
    
    // Sanitize string fields
    if (sanitized.title) {
      sanitized.title = sanitized.title.substring(0, 200).trim();
    }
    if (sanitized.description) {
      sanitized.description = sanitized.description.substring(0, 500).trim();
    }
    if (sanitized.userName) {
      sanitized.userName = sanitized.userName.substring(0, 100).trim();
    }
    if (sanitized.targetName) {
      sanitized.targetName = sanitized.targetName.substring(0, 200).trim();
    }

    return sanitized;
  }

  /**
   * 🔄 Retry mechanism for operations
   */
  private async retryOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        console.warn(`❌ ${operationName} attempt ${attempt}/${maxRetries} failed:`, error);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * 🛡️ Safe operation wrapper
   */
  private async safeOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    fallbackValue: T = null as T
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      console.error(`❌ ${operationName} failed after all attempts:`, error);
      return fallbackValue;
    }
  }

  private validateActivity(activity: Partial<UserActivity>): boolean {
    return !!(
      activity.type &&
      activity.title &&
      activity.description &&
      activity.userId &&
      activity.userName &&
      activity.category
    );
  }

  // ============================================================================
  // ACTIVITY RETRIEVAL
  // ============================================================================

  async getUserActivities(userId: string, filter: UserActivityFilter = {}): Promise<UserActivity[]> {
    try {
      const db = await this.getDb();
      const Timestamp = this.getTimestamp();
      // Check cache first
      const cacheKey = `${userId}_${JSON.stringify(filter)}`;
      if (this.cache.has(cacheKey) && this.isCacheValid(cacheKey)) {
        // Cache hit - return cached data
        return this.cache.get(cacheKey) || [];
      }

      // Build query
      let query: any = db // firebase.firestore.Query
        .collection('userActivities')
        .where('userId', '==', userId);

      // Apply filters
      if (filter.type && filter.type.length > 0) {
        query = query.where('type', 'in', filter.type);
      }

      if (filter.category && filter.category.length > 0) {
        query = query.where('category', 'in', filter.category);
      }

      if (filter.visibility && filter.visibility.length > 0) {
        query = query.where('visibility', 'in', filter.visibility);
      }

      if (filter.priority && filter.priority.length > 0) {
        query = query.where('priority', 'in', filter.priority);
      }

      if (filter.isPinned !== undefined) {
        query = query.where('isPinned', '==', filter.isPinned);
      }

      // Remove orderBy to avoid composite index requirement
      // Sorting will be done in memory

      // Apply limit
      if (filter.limit) {
        query = query.limit(filter.limit);
      }

      // Execute query
      const snapshot = await query.get();
      const activities: UserActivity[] = [];

      snapshot.forEach(doc => {
        const data: any = doc.data();
        activities.push({
          id: doc.id,
          ...data,
          // Support legacy entries that use `timestamp` instead of `createdAt`
          createdAt: data.createdAt || data.timestamp || Timestamp.now()
        } as UserActivity);
      });

      // Sort by creation date first (newest first)
      activities.sort((a, b) => {
        const aTime = a.createdAt?.toMillis() || 0;
        const bTime = b.createdAt?.toMillis() || 0;
        return bTime - aTime;
      });

      // Apply date range filter (client-side for better performance)
      let filteredActivities = activities;
      if (filter.dateRange) {
        filteredActivities = activities.filter(activity => {
          const activityDate = activity.createdAt.toDate();
          return activityDate >= filter.dateRange!.start && activityDate <= filter.dateRange!.end;
        });
      }

      // Sort pinned activities to top while preserving date order within groups
      filteredActivities.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        const aTime = a.createdAt?.toMillis() || 0;
        const bTime = b.createdAt?.toMillis() || 0;
        return bTime - aTime;
      });

      // Cache the results
      this.cache.set(cacheKey, filteredActivities);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_DURATION);

      // Production mode - no debug logs
      return filteredActivities;
    } catch (error) {
      console.error(`❌ Error getting user activities for ${userId}:`, error);
      return [];
    }
  }

  // ============================================================================
  // REAL-TIME LISTENERS
  // ============================================================================

  async setupRealtimeListener(userId: string, callback: (activities: UserActivity[]) => void): Promise<() => void> {
    const listenerKey = `user_${userId}`;
    
    // Remove existing listener
    if (this.listeners.has(listenerKey)) {
      this.listeners.get(listenerKey)!();
    }

    console.log(`🔔 Setting up real-time listener for user activities: ${userId}`);

    await this.ensureFirebaseReady();
    const db = await this.getDb();
    const Timestamp = this.getTimestamp();

    // Set up new listener with proper ordering - simplified to avoid index issues
    const unsubscribe = db
      .collection('userActivities')
      .where('userId', '==', userId)
      .limit(50)
      .onSnapshot(
        (snapshot) => {
          console.log(`📡 Firestore snapshot received: ${snapshot.docs.length} documents for user ${userId}`);
          
          const activities: UserActivity[] = [];
          snapshot.forEach(doc => {
            const data: any = doc.data();
            activities.push({
              id: doc.id,
              ...data,
              // Support legacy entries that use `timestamp` instead of `createdAt`
              createdAt: data.createdAt || data.timestamp || Timestamp.now()
            } as UserActivity);
          });

          // Sort by creation date (newest first)
          activities.sort((a, b) => {
            const aTime = a.createdAt?.toMillis() || 0;
            const bTime = b.createdAt?.toMillis() || 0;
            return bTime - aTime;
          });

          // Then sort pinned activities to top while preserving date order
          activities.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            const aTime = a.createdAt?.toMillis() || 0;
            const bTime = b.createdAt?.toMillis() || 0;
            return bTime - aTime;
          });

          // Clear cache and update
          this.clearCache(userId);
          callback(activities);
          
          console.log(`🔄 Real-time update: ${activities.length} activities for user ${userId}`);
        },
        (error) => {
          // Handle permission denied errors gracefully
          if (error.code === 'permission-denied') {
            console.warn(`⚠️ [UserActivityService] Permission denied for ${userId} - using cached data`);
            // Use cached data if available
            const cachedActivities = this.cache.get(userId) || [];
            callback(cachedActivities);
          } else {
            console.error(`❌ Error in user activities listener for ${userId}:`, error);
          }
        }
      );

    this.listeners.set(listenerKey, unsubscribe);
    console.log(`✅ Real-time listener set up for user activities: ${userId}`);

    return () => {
      unsubscribe();
      this.listeners.delete(listenerKey);
      console.log(`🔕 Real-time listener removed for user activities: ${userId}`);
    };
  }

  // ============================================================================
  // ACTIVITY CREATION HELPERS
  // ============================================================================

  async logEventLike(userId: string, userName: string, eventId: string, eventTitle: string, clubId?: string, clubName?: string): Promise<void> {
    await this.createActivity({
      type: 'event_like',
      title: 'Etkinlik Beğenildi',
      description: `${eventTitle} etkinliğini beğendi`,
      userId,
      userName,
      targetId: eventId,
      targetName: eventTitle,
  clubId,
      category: 'events',
      visibility: 'public',
      priority: 'low',
      metadata: {
        eventId,
        eventTitle,
        clubId,
        clubName
      }
    });
  }

  async logEventUnlike(userId: string, userName: string, eventId: string, eventTitle: string, clubId?: string, clubName?: string): Promise<void> {
    await this.createActivity({
      type: 'event_unlike',
      title: 'Beğeni Geri Alındı',
      description: `${eventTitle} etkinliğinden beğenisini geri aldı`,
      userId,
      userName,
      targetId: eventId,
      targetName: eventTitle,
  clubId,
      category: 'events',
      visibility: 'public',
      priority: 'low',
      metadata: {
        eventId,
        eventTitle,
        clubId,
        clubName
      }
    });
  }

  async logEventComment(userId: string, userName: string, eventId: string, eventTitle: string, commentText: string, clubId?: string, clubName?: string): Promise<void> {
    await this.createActivity({
      type: 'event_comment',
      title: 'Etkinliğe Yorum',
      description: `${eventTitle} etkinliğine yorum yaptı`,
      userId,
      userName,
      targetId: eventId,
      targetName: eventTitle,
  clubId,
      category: 'events',
      visibility: 'public',
      priority: 'medium',
      metadata: {
        eventId,
        eventTitle,
        commentText: commentText.substring(0, 100), // Limit length
        clubId,
        clubName
      }
    });
  }

  async logEventCommentDelete(userId: string, userName: string, eventId: string, eventTitle: string, commentText: string, clubId?: string, clubName?: string): Promise<void> {
    await this.createActivity({
      type: 'event_comment_delete',
      title: 'Etkinlik Yorumu Sildi',
      description: `${eventTitle} etkinliğinden yorumunu sildi`,
      userId,
      userName,
      targetId: eventId,
      targetName: eventTitle,
  clubId,
      category: 'events',
      visibility: 'public',
      priority: 'medium',
      metadata: {
        eventId,
        eventTitle,
        commentText: commentText.substring(0, 100), // Limit length
        clubId,
        clubName
      }
    });
  }

  async logEventJoin(userId: string, userName: string, eventId: string, eventTitle: string, clubId?: string, clubName?: string): Promise<void> {
    await this.createActivity({
      type: 'event_join',
      title: 'Etkinliğe Katıldı',
      description: `${eventTitle} etkinliğine katıldı`,
      userId,
      userName,
      targetId: eventId,
      targetName: eventTitle,
  clubId,
      category: 'events',
      visibility: 'public',
      priority: 'medium',
      metadata: {
        eventId,
        eventTitle,
        clubId,
        clubName
      }
    });
  }

  async logEventLeave(userId: string, userName: string, eventId: string, eventTitle: string, clubId?: string, clubName?: string): Promise<void> {
    await this.createActivity({
      type: 'event_leave',
      title: 'Etkinlikten Ayrıldı',
      description: `${eventTitle} etkinliğinden ayrıldı`,
      userId,
      userName,
      targetId: eventId,
      targetName: eventTitle,
  clubId,
      category: 'events',
      visibility: 'public',
      priority: 'low',
      metadata: {
        eventId,
        eventTitle,
        clubId,
        clubName
      }
    });
  }

  async logClubFollow(userId: string, userName: string, clubId: string, clubName: string): Promise<void> {
    console.log('📝 EnhancedUserActivityService.logClubFollow called with:', {
      userId,
      userName,
      clubId,
      clubName
    });
    
    try {
      await this.createActivity({
        type: 'club_follow',
        title: 'Kulüp Takibi',
        description: `${clubName} kulübünü takip etmeye başladı`,
        userId,
        userName,
        targetId: clubId,
        targetName: clubName,
        clubId,
        category: 'social',
        visibility: 'public',
        priority: 'medium',
        metadata: {
          clubId,
          clubName
        }
      });
      
      console.log('✅ EnhancedUserActivityService.logClubFollow completed successfully');
    } catch (error) {
      console.error('❌ EnhancedUserActivityService.logClubFollow failed:', error);
      throw error;
    }
  }

  async logClubUnfollow(userId: string, userName: string, clubId: string, clubName: string): Promise<void> {
    console.log('📝 EnhancedUserActivityService.logClubUnfollow called with:', {
      userId,
      userName,
      clubId,
      clubName
    });
    
    try {
      await this.createActivity({
        type: 'club_unfollow',
        title: 'Kulüp Takipten Çıkma',
        description: `${clubName} kulübünü takip etmeyi bıraktı`,
        userId,
        userName,
        targetId: clubId,
        targetName: clubName,
        clubId,
        category: 'social',
        visibility: 'public',
        priority: 'low',
        metadata: {
          clubId,
          clubName
        }
      });
      
      console.log('✅ EnhancedUserActivityService.logClubUnfollow completed successfully');
    } catch (error) {
      console.error('❌ EnhancedUserActivityService.logClubUnfollow failed:', error);
      throw error;
    }
  }

  async logUserFollow(userId: string, userName: string, followedUserId: string, followedUserName: string): Promise<void> {
    await this.createActivity({
      type: 'user_follow',
      title: 'Kullanıcı Takibi',
      description: `${followedUserName} kullanıcısını takip etmeye başladı`,
      userId,
      userName,
      targetId: followedUserId,
      targetName: followedUserName,
      category: 'social',
      visibility: 'public',
      priority: 'medium',
      metadata: {
        followedUserId,
        followedUserName
      }
    });
  }

  async logUserUnfollow(userId: string, userName: string, unfollowedUserId: string, unfollowedUserName: string): Promise<void> {
    await this.createActivity({
      type: 'user_unfollow',
      title: 'Takipten Çıkıldı',
      description: `${unfollowedUserName} kullanıcısını takip etmeyi bıraktı`,
      userId,
      userName,
      targetId: unfollowedUserId,
      targetName: unfollowedUserName,
      category: 'social',
      visibility: 'public',
      priority: 'low',
      metadata: {
        unfollowedUserId,
        unfollowedUserName
      }
    });
  }

  async logFollowerRemoval(userId: string, userName: string, removedFollowerId: string, removedFollowerName: string): Promise<void> {
    await this.createActivity({
      type: 'follower_removal',
      title: 'Takipçi Kaldırma',
      description: `${removedFollowerName} takipçiden kaldırıldı`,
      userId,
      userName,
      targetId: removedFollowerId,
      targetName: removedFollowerName,
      category: 'social',
      visibility: 'private', // This is more private since it's removing followers
      priority: 'low',
      metadata: {
        removedFollowerId,
        removedFollowerName,
        action: 'follower_removed'
      }
    });
  }

  async logClubJoin(userId: string, userName: string, clubId: string, clubName: string): Promise<void> {
    await this.createActivity({
      type: 'club_join',
      title: 'Kulüp Üyeliği',
      description: `${clubName} kulübüne üye oldu`,
      userId,
      userName,
      targetId: clubId,
      targetName: clubName,
  clubId,
      category: 'social',
      visibility: 'public',
      priority: 'high',
      metadata: {
        clubId,
        clubName
      }
    });
  }

  async logClubRequest(userId: string, userName: string, clubId: string, clubName: string): Promise<void> {
    await this.createActivity({
      type: 'club_request',
      title: 'Kulüp Başvurusu',
      description: `${clubName} kulübüne üyelik başvurusu yaptı`,
      userId,
      userName,
      targetId: clubId,
      targetName: clubName,
  clubId,
      category: 'social',
      visibility: 'public',
      priority: 'medium',
      metadata: {
        clubId,
        clubName
      }
    });
  }

  async logClubApproved(userId: string, userName: string, clubId: string, clubName: string): Promise<void> {
    await this.createActivity({
      type: 'club_approved',
      title: 'Kulüp Üyeliği Onaylandı',
      description: `${clubName} kulübüne üyelik başvurusu onaylandı`,
      userId,
      userName,
      targetId: clubId,
      targetName: clubName,
  clubId,
      category: 'social',
      visibility: 'public',
      priority: 'high',
      metadata: {
        clubId,
        clubName
      }
    });
  }

  async logClubRejected(userId: string, userName: string, clubId: string, clubName: string): Promise<void> {
    await this.createActivity({
      type: 'club_rejected',
      title: 'Kulüp Üyeliği Reddedildi',
      description: `${clubName} kulübüne üyelik başvurusu reddedildi`,
      userId,
      userName,
      targetId: clubId,
      targetName: clubName,
  clubId,
      category: 'social',
      visibility: 'public',
      priority: 'medium',
      metadata: {
        clubId,
        clubName
      }
    });
  }

  async logClubLeave(userId: string, userName: string, clubId: string, clubName: string): Promise<void> {
    await this.createActivity({
      type: 'club_leave',
      title: 'Kulüpten Ayrıldı',
      description: `${clubName} kulübünden ayrıldı`,
      userId,
      userName,
      targetId: clubId,
      targetName: clubName,
  clubId,
      category: 'social',
      visibility: 'public',
      priority: 'medium',
      metadata: {
        clubId,
        clubName
      }
    });
  }

  async logClubKicked(userId: string, userName: string, clubId: string, clubName: string): Promise<void> {
    await this.createActivity({
      type: 'club_kicked',
      title: 'Kulüpten Çıkarıldı',
      description: `${clubName} kulübünden çıkarıldı`,
      userId,
      userName,
      targetId: clubId,
      targetName: clubName,
      clubId,
      category: 'social',
      visibility: 'public',
      priority: 'medium',
      metadata: {
        clubId,
        clubName
      }
    });
  }

  async logClubLeft(userId: string, userName: string, clubId: string, clubName: string): Promise<void> {
    await this.createActivity({
      type: 'club_left',
      title: 'Kulüpten Ayrıldı',
      description: `${clubName} kulübünden ayrıldı`,
      userId,
      userName,
      targetId: clubId,
      targetName: clubName,
      clubId,
      category: 'social',
      visibility: 'public',
      priority: 'low',
      metadata: {
        clubId,
        clubName
      }
    });
  }

  // ============================================================================
  // ADDITIONAL HELPERS: SHARING AND PROFILE UPDATES
  // ============================================================================

  async logEventShare(userId: string, userName: string, eventId: string, eventTitle: string, clubId?: string, clubName?: string): Promise<void> {
    await this.createActivity({
      type: 'event_share',
      title: 'Etkinlik Paylaşıldı',
      description: `${eventTitle} etkinliğini paylaştı`,
      userId,
      userName,
      targetId: eventId,
      targetName: eventTitle,
      clubId,
      category: 'events',
      visibility: 'public',
      priority: 'low',
      metadata: { eventId, eventTitle, clubId, clubName }
    });
  }

  async logEventUnshare(userId: string, userName: string, eventId: string, eventTitle: string, clubId?: string, clubName?: string): Promise<void> {
    await this.createActivity({
      type: 'unshare_event',
      title: 'Paylaşım Geri Alındı',
      description: `${eventTitle} etkinlik paylaşımını geri aldı`,
      userId,
      userName,
      targetId: eventId,
      targetName: eventTitle,
      clubId,
      category: 'events',
      visibility: 'public',
      priority: 'low',
      metadata: { eventId, eventTitle, clubId, clubName }
    });
  }

  async logProfileUpdate(userId: string, userName: string, changeDetails?: any): Promise<void> {
    await this.createActivity({
      type: 'profile_update',
      title: 'Profil Güncellendi',
      description: 'Profil bilgilerini güncelledi',
      userId,
      userName,
      category: 'profile',
      visibility: 'followers_only',
      priority: 'medium',
      metadata: { changeDetails }
    });
  }

  async logLikeComment(userId: string, userName: string, commentId: string, eventId?: string, eventTitle?: string, clubId?: string, clubName?: string): Promise<void> {
    await this.createActivity({
      type: 'like_comment',
      title: 'Yorum Beğenildi',
      description: 'Bir yorumu beğendi',
      userId,
      userName,
      targetId: commentId,
      clubId,
      category: 'events',
      visibility: 'public',
      priority: 'low',
      metadata: { commentId, eventId, eventTitle, clubId, clubName }
    });
  }

  async logUnlikeComment(userId: string, userName: string, commentId: string, eventId?: string, eventTitle?: string, clubId?: string, clubName?: string): Promise<void> {
    await this.createActivity({
      type: 'unlike_comment',
      title: 'Beğeni Geri Alındı',
      description: 'Bir yorum beğenisini geri aldı',
      userId,
      userName,
      targetId: commentId,
      clubId,
      category: 'events',
      visibility: 'public',
      priority: 'low',
      metadata: { commentId, eventId, eventTitle, clubId, clubName }
    });
  }

  // ============================================================================
  // CACHE MANAGEMENT
  // ============================================================================

  private clearCache(userId: string): void {
    const keysToDelete = Array.from(this.cache.keys()).filter(key => key.startsWith(userId));
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
    });
  }

  private isCacheValid(cacheKey: string): boolean {
    const expiry = this.cacheExpiry.get(cacheKey);
    return expiry ? Date.now() < expiry : false;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  async deleteActivity(activityId: string, userId: string): Promise<boolean> {
    try {
      const db = await this.getDb();
      await db.collection('userActivities').doc(activityId).delete();
      this.clearCache(userId);
      console.log(`✅ User activity deleted: ${activityId}`);
      return true;
    } catch (error) {
      console.error(`❌ Error deleting user activity ${activityId}:`, error);
      return false;
    }
  }

  cleanup(): void {
    // Remove all listeners
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners.clear();
    
    // Clear cache
    this.cache.clear();
    this.cacheExpiry.clear();
    
    console.log('🧹 EnhancedUserActivityService cleaned up');
  }
}

// Export singleton instance
export const userActivityService = EnhancedUserActivityService.getInstance();
