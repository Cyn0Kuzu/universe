import { firebase } from '../firebase/config';

// Activity interface definitions
export interface ClubActivity {
  id?: string;
  type: 'event_created' | 'event_updated' | 'event_cancelled' | 'event_liked' | 'event_commented' | 'event_joined' | 'event_left' |
  'member_joined' | 'member_left' | 'member_promoted' | 'member_demoted' | 'member_approved' | 'member_rejected' |
        'milestone_reached' | 'announcement_posted' | 'club_updated';
  title: string;
  description: string;
  clubId: string;
  userId: string;
  userName: string;
  userPhotoURL?: string;
  targetId?: string; // eventId, memberId etc.
  targetName?: string;
  category: 'events' | 'membership' | 'announcements' | 'general';
  visibility: 'public' | 'members_only' | 'admins_only';
  priority: 'low' | 'medium' | 'high';
  metadata?: {
    eventId?: string;
    eventTitle?: string;
    eventDate?: Date;
    memberId?: string;
    memberName?: string;
    oldRole?: string;
    newRole?: string;
    milestoneType?: string;
    milestoneValue?: number;
    announcementId?: string;
    commentText?: string;
    likeCount?: number;
    newAttendeeCount?: number;
    changeDetails?: any;
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

export interface ActivityFilter {
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
 * Enhanced Club Activity Service
 * Professional-grade activity management with caching, real-time updates, and comprehensive filtering
 */
export class EnhancedClubActivityService {
  private static instance: EnhancedClubActivityService;
  private db: any; // firebase.firestore.Firestore
  private cache: Map<string, ClubActivity[]> = new Map();
  private listeners: Map<string, () => void> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    this.db = firebase.firestore();
    // Service initialized
  }

  static getInstance(): EnhancedClubActivityService {
    if (!EnhancedClubActivityService.instance) {
      EnhancedClubActivityService.instance = new EnhancedClubActivityService();
    }
    return EnhancedClubActivityService.instance;
  }

  // ============================================================================
  // CORE ACTIVITY MANAGEMENT
  // ============================================================================

  async createActivity(activity: Partial<ClubActivity>): Promise<string | null> {
    try {
      // Validate activity data
      if (!this.validateActivity(activity)) {
        console.error('❌ [ActivityService] Invalid activity data:', activity);
        throw new Error('Invalid activity data');
      }

      console.log('🔄 [ActivityService] Creating activity:', {
        type: activity.type,
        clubId: activity.clubId,
        title: activity.title,
        description: activity.description?.substring(0, 50)
      });

      // Clean metadata - remove undefined values
      const cleanMetadata = activity.metadata ? 
        Object.fromEntries(
          Object.entries(activity.metadata).filter(([_, value]) => value !== undefined)
        ) : {};

      const activityData: any = {
        ...activity,
        // Clean metadata to prevent undefined values
        metadata: cleanMetadata,
        // Ensure userPhotoURL is not undefined
        userPhotoURL: activity.userPhotoURL || null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        isHighlighted: false,
        isPinned: false,
        reactions: {},
        reactionCounts: {
          '👍': 0,
          '❤️': 0,
          '😊': 0,
          '🎉': 0,
          '🔥': 0
        }
      };

      // Add to Firestore activities collection
      const docRef = await this.db.collection('activities').add(activityData);
      
      console.log('✅ [ActivityService] Activity created successfully:', {
        id: docRef.id,
        type: activity.type,
        clubId: activity.clubId,
        collection: 'activities'
      });
      
      // Update cache
      this.invalidateClubCache(activity.clubId!);
      
      return docRef.id;
    } catch (error) {
      console.error(`❌ [ActivityService] Error creating activity:`, error);
      return null;
    }
  }

  async getClubActivities(
    clubId: string, 
    filter?: ActivityFilter,
    useCache: boolean = true
  ): Promise<ClubActivity[]> {
    try {
      const cacheKey = this.generateCacheKey(clubId, filter);
      
      // Check cache first
      if (useCache && this.isCacheValid(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (cached) {
          return cached;
        }
      }

      // Load activities from Firestore - Optimized query to avoid index requirements
      let query = this.db.collection('clubActivities')
        .where('clubId', '==', clubId);

      // Apply simple filters first (before orderBy to avoid index issues)
      if (filter?.visibility && filter.visibility.length > 0) {
        query = query.where('visibility', 'in', filter.visibility);
      }

      // Get all matching documents first, then sort and filter in memory
      const snapshot = await query.get();
      
      let clubActivities: ClubActivity[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        const activity: ClubActivity = {
          id: doc.id,
          type: data.type,
          clubId: data.clubId,
          userId: data.userId || '',
          userName: data.userName || 'Bilinmeyen Kullanıcı',
          userPhotoURL: data.userPhotoURL,
          title: data.title,
          description: data.description,
          targetId: data.targetId,
          targetName: data.targetName,
          category: data.category,
          visibility: data.visibility,
          priority: data.priority,
          metadata: data.metadata,
          createdAt: data.createdAt || firebase.firestore.Timestamp.now(),
          isHighlighted: data.isHighlighted || false,
          isPinned: data.isPinned || false,
          reactions: data.reactions || {},
          reactionCounts: data.reactionCounts || {}
        };

        // Apply category filter in memory
        if (!filter?.category || filter.category.length === 0 || filter.category.includes(activity.category)) {
          clubActivities.push(activity);
        }
      });

      // Sort in memory by creation date, newest first (pinned items first)
      clubActivities.sort((a, b) => {
        // Pinned items go to top
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        // Then sort by date
        return b.createdAt.seconds - a.createdAt.seconds;
      });

      // Apply limit after sorting
      if (filter?.limit) {
        clubActivities = clubActivities.slice(0, filter.limit);
      } else {
        clubActivities = clubActivities.slice(0, 100); // Default limit
      }

      // Update cache
      this.cache.set(cacheKey, clubActivities);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_DURATION);

      return clubActivities;
    } catch (error) {
      console.error('Error loading club activities:', error);
      return [];
    }
  }

  async getUserActivities(
    userId: string,
    filter?: ActivityFilter
  ): Promise<ClubActivity[]> {
    try {
      let query: any = this.db // firebase.firestore.Query
        .collection('activities')
        .where('userId', '==', userId);

      // Apply filters
      if (filter) {
        query = this.applyFilters(query, filter);
      }

      // Remove orderBy to avoid composite index requirement
      // Sorting will be done in memory after fetching
      const snapshot = await query.get();
      const activities: ClubActivity[] = [];

      snapshot.forEach((doc: any) => {
        const data = doc.data();
        activities.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt
        } as ClubActivity);
      });

      // Sort in memory and apply limit
      activities.sort((a, b) => {
        const aTime = a.createdAt?.toMillis() || 0;
        const bTime = b.createdAt?.toMillis() || 0;
        return bTime - aTime; // desc order
      });

      // Apply limit after sorting
      const limit = filter?.limit || 20;
      return activities.slice(0, limit);
    } catch (error) {
      console.error(`❌ [ActivityService] Error fetching user activities:`, error);
      return [];
    }
  }

  // ============================================================================
  // REAL-TIME ACTIVITY LISTENERS
  // ============================================================================

  subscribeToClubActivities(
    clubId: string,
    onUpdate: (activities: ClubActivity[]) => void,
    filter?: ActivityFilter
  ): () => void {
    try {
      // Setup real-time listener for club activities
      const limit = filter?.limit || 20;
      
      const unsubscribe = this.db.collection('clubActivities')
        .where('clubId', '==', clubId)
        .limit(limit)
        .onSnapshot((snapshot) => {
          const activities: ClubActivity[] = [];
          
          snapshot.forEach((doc) => {
            const data = doc.data();
            activities.push({
              id: doc.id,
              type: data.type,
              clubId: data.clubId,
              userId: data.performedBy || data.userId,
              userName: data.performedByName || data.userName,
              targetId: data.targetId,
              targetName: data.targetName,
              title: data.title,
              description: data.description,
              category: data.category || 'general',
              visibility: data.visibility || 'public',
              priority: data.priority || 'medium',
              metadata: data.data || data.metadata,
              createdAt: data.timestamp || data.createdAt || firebase.firestore.Timestamp.now(),
              isHighlighted: data.isHighlighted || false,
              isPinned: data.isPinned || false,
              reactions: data.reactions || {}
            });
          });

          // Sort activities by timestamp descending (newest first) in memory
          activities.sort((a, b) => {
            const aTime = a.createdAt?.toMillis() || 0;
            const bTime = b.createdAt?.toMillis() || 0;
            return bTime - aTime;
          });

          onUpdate(activities);
        }, (error) => {
          console.error(`❌ [ActivityService] Real-time listener error:`, error);
          onUpdate([]);
        });

      return unsubscribe;
    } catch (error) {
      console.error(`❌ [ActivityService] Error setting up real-time listener:`, error);
      return () => {};
    }
  }

  // ============================================================================
  // ACTIVITY INTERACTIONS
  // ============================================================================

  async toggleReaction(
    activityId: string,
    userId: string,
    reaction: '👍' | '❤️' | '😊' | '🎉' | '🔥'
  ): Promise<boolean> {
    try {


      const activityRef = this.db.collection('activities').doc(activityId);
      
      await this.db.runTransaction(async (transaction: any) => {
        const activityDoc = await transaction.get(activityRef);
        
        if (!activityDoc.exists) {
          throw new Error('Activity not found');
        }

        const activityData = activityDoc.data() as ClubActivity;
        const reactions = activityData.reactions || {};
        const reactionCounts = activityData.reactionCounts || {
          '👍': 0, '❤️': 0, '😊': 0, '🎉': 0, '🔥': 0
        };

        // Toggle reaction
        if (reactions[userId] === reaction) {
          // Remove reaction
          delete reactions[userId];
          reactionCounts[reaction] = Math.max(0, reactionCounts[reaction] - 1);
        } else {
          // Remove old reaction if exists
          if (reactions[userId]) {
            reactionCounts[reactions[userId]] = Math.max(0, reactionCounts[reactions[userId]] - 1);
          }
          // Add new reaction
          reactions[userId] = reaction;
          reactionCounts[reaction] = reactionCounts[reaction] + 1;
        }

        transaction.update(activityRef, {
          reactions,
          reactionCounts
        });
      });

      // Invalidate cache
      this.invalidateAllCaches();


      return true;
    } catch (error) {
      console.error(`❌ [ActivityService] Error toggling reaction:`, error);
      return false;
    }
  }

  async pinActivity(activityId: string, isPinned: boolean): Promise<boolean> {
    try {


      await this.db.collection('activities').doc(activityId).update({
        isPinned,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      // Invalidate cache
      this.invalidateAllCaches();


      return true;
    } catch (error) {
      console.error(`❌ [ActivityService] Error ${isPinned ? 'pinning' : 'unpinning'} activity:`, error);
      return false;
    }
  }

  async highlightActivity(activityId: string, isHighlighted: boolean): Promise<boolean> {
    try {


      await this.db.collection('activities').doc(activityId).update({
        isHighlighted,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      // Invalidate cache
      this.invalidateAllCaches();


      return true;
    } catch (error) {
      console.error(`❌ [ActivityService] Error ${isHighlighted ? 'highlighting' : 'unhighlighting'} activity:`, error);
      return false;
    }
  }

  async deleteActivity(activityId: string): Promise<boolean> {
    try {


      await this.db.collection('activities').doc(activityId).delete();

      // Invalidate cache
      this.invalidateAllCaches();


      return true;
    } catch (error) {
      console.error(`❌ [ActivityService] Error deleting activity:`, error);
      return false;
    }
  }

  // ============================================================================
  // SPECIALIZED ACTIVITY CREATORS
  // ============================================================================

  async createEventActivity(
    type: 'event_created' | 'event_updated' | 'event_cancelled',
    clubId: string,
    userId: string,
    userName: string,
    eventId: string,
    eventTitle: string,
    eventDate?: Date,
    changeDetails?: any
  ): Promise<string | null> {
    const typeLabels = {
      event_created: 'created a new event',
      event_updated: 'updated an event',
      event_cancelled: 'cancelled an event'
    };

    // Build metadata without undefined values
    const metadata: any = {
      eventId,
      eventTitle
    };

    // Only add eventDate if it's defined
    if (eventDate) {
      metadata.eventDate = eventDate;
    }

    // Only add changeDetails if it's defined
    if (changeDetails) {
      metadata.changeDetails = changeDetails;
    }

    return await this.createActivity({
      type,
      title: `${userName} ${typeLabels[type]}`,
      description: `${eventTitle}`,
      clubId,
      userId,
      userName,
      targetId: eventId,
      targetName: eventTitle,
      category: 'events',
      visibility: 'public',
      priority: type === 'event_created' ? 'high' : 'medium',
      metadata
    });
  }

  async createMembershipActivity(
    type: 'member_joined' | 'member_left' | 'member_promoted' | 'member_demoted',
    clubId: string,
    userId: string,
    userName: string,
    memberId: string,
    memberName: string,
    oldRole?: string,
    newRole?: string
  ): Promise<string | null> {
    const typeLabels = {
      member_joined: 'joined the club',
      member_left: 'left the club',
      member_promoted: 'was promoted',
      member_demoted: 'role was changed'
    };

    const description = type === 'member_promoted' || type === 'member_demoted' 
      ? `${memberName} ${oldRole} → ${newRole}`
      : memberName;

    return await this.createActivity({
      type,
      title: `${memberName} ${typeLabels[type]}`,
      description,
      clubId,
      userId,
      userName,
      targetId: memberId,
      targetName: memberName,
      category: 'membership',
      visibility: 'members_only',
      priority: 'medium',
      metadata: {
        memberId,
        memberName,
        oldRole,
        newRole
      }
    });
  }

  async createAnnouncementActivity(
    clubId: string,
    userId: string,
    userName: string,
    announcementId: string,
    title: string,
    content: string
  ): Promise<string | null> {
    return await this.createActivity({
      type: 'announcement_posted',
      title: `${userName} posted an announcement`,
      description: title,
      clubId,
      userId,
      userName,
      targetId: announcementId,
      targetName: title,
      category: 'announcements',
      visibility: 'members_only',
      priority: 'high',
      metadata: {
        announcementId
      }
    });
  }

  async createMembershipModerationActivity(
    type: 'member_approved' | 'member_rejected',
    clubId: string,
    userId: string,
    userName: string,
    memberId: string,
    memberName: string,
  ): Promise<string | null> {
    const label = type === 'member_approved' ? 'Üyelik Onaylandı' : 'Üyelik Reddedildi';
    const desc = type === 'member_approved'
      ? `${memberName} kulübe kabul edildi`
      : `${memberName} başvurusu reddedildi`;

    return await this.createActivity({
      type,
      title: label,
      description: desc,
      clubId,
      userId,
      userName,
      targetId: memberId,
      targetName: memberName,
      category: 'membership',
      visibility: type === 'member_rejected' ? 'admins_only' : 'members_only',
      priority: 'medium',
      metadata: { memberId, memberName }
    });
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private validateActivity(activity: Partial<ClubActivity>): boolean {
    const required = ['type', 'title', 'description', 'clubId', 'userId', 'userName', 'category', 'visibility', 'priority'];
    return required.every(field => activity[field as keyof ClubActivity] != null);
  }

  private applyFilters(query: any, filter: ActivityFilter): any { // firebase.firestore.Query
    if (filter.type && filter.type.length > 0) {
      query = query.where('type', 'in', filter.type);
    }
    
    if (filter.category && filter.category.length > 0) {
      query = query.where('category', 'in', filter.category);
    }
    
    if (filter.visibility && filter.visibility.length > 0) {
      query = query.where('visibility', 'in', filter.visibility);
    }
    
    if (filter.userId) {
      query = query.where('userId', '==', filter.userId);
    }
    
    if (filter.priority && filter.priority.length > 0) {
      query = query.where('priority', 'in', filter.priority);
    }
    
    if (filter.isPinned !== undefined) {
      query = query.where('isPinned', '==', filter.isPinned);
    }
    
    return query;
  }

  private generateCacheKey(clubId: string, filter?: ActivityFilter): string {
    const filterKey = filter ? JSON.stringify(filter) : 'all';
    return `club_${clubId}_${filterKey}`;
  }

  private isCacheValid(cacheKey: string): boolean {
    const expiry = this.cacheExpiry.get(cacheKey);
    return expiry ? Date.now() < expiry : false;
  }

  private invalidateClubCache(clubId: string): void {
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.startsWith(`club_${clubId}_`)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
    });
    

  }

  private invalidateAllCaches(): void {
    this.cache.clear();
    this.cacheExpiry.clear();

  }

  // Cleanup method
  cleanup(): void {
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners.clear();
    this.cache.clear();
    this.cacheExpiry.clear();

  }
}

// Export singleton instance
export const clubActivityService = EnhancedClubActivityService.getInstance();
