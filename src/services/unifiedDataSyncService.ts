/**
 * 🔄 Unified Data Synchronization Service
 * Tüm veri tutarsızlıklarını çözen merkezi senkronizasyon servisi
 */

import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

export interface UnifiedClubData {
  id: string;
  clubName: string;
  displayName: string;
  description: string;
  bio: string;
  university: string;
  department: string;
  clubTypes: string[];
  clubType: string;
  profileImage: string;
  avatarIcon: string;
  avatarColor: string;
  coverImage: string;
  coverIcon: string;
  coverColor: string;
  createdAt: any;
  public: boolean;
  memberCount: number;
  followerCount: number;
  followingCount: number;
  eventCount: number;
  likes: number;
  comments: number;
  totalScore: number;
  rank: number;
  level: number;
  lastActivity: any;
  userType: string;
  foundationYear: string;
  establishedDate: any;
  email: string;
  phone: string;
  website: string;
  instagram: string;
  facebook: string;
  twitter: string;
  isFollowing: boolean;
  isMember: boolean;
  membershipStatus: 'none' | 'pending' | 'approved' | 'rejected';
}

export interface UnifiedEventData {
  id: string;
  title: string;
  description: string;
  startDate: any;
  endDate: any;
  location: string;
  category: string;
  imageUrl: string;
  coverImage: string;
  organizer: {
    id: string;
    name: string;
    avatar: string;
    type: 'club' | 'student';
  };
  likes: number;
  comments: number;
  participants: number;
  attendees: string[];
  totalScore: number;
  rank: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  isJoined: boolean;
  isLiked: boolean;
  createdAt: any;
  updatedAt: any;
  capacity: number;
  price: number;
  requirements: string[];
  tags: string[];
}

export interface UnifiedUserData {
  id: string;
  displayName: string;
  username: string;
  email: string;
  profileImage: string;
  avatarIcon: string;
  avatarColor: string;
  university: string;
  department: string;
  bio: string;
  userType: 'student' | 'club';
  likes: number;
  comments: number;
  participations: number;
  eventsOrganized: number;
  totalScore: number;
  rank: number;
  level: number;
  followerCount: number;
  followingCount: number;
  lastActivity: any;
  createdAt: any;
  isFollowing: boolean;
  isFollower: boolean;
}

class UnifiedDataSyncService {
  private db: firebase.firestore.Firestore;
  private static instance: UnifiedDataSyncService;
  private cache: Map<string, any> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 2 * 60 * 1000; // 2 minutes
  private readonly MAX_CACHE_SIZE = 1000;

  private constructor() {
    this.db = firebase.firestore();
  }

  public static getInstance(): UnifiedDataSyncService {
    if (!UnifiedDataSyncService.instance) {
      UnifiedDataSyncService.instance = new UnifiedDataSyncService();
    }
    return UnifiedDataSyncService.instance;
  }

  /**
   * Cache management
   */
  private getCachedData<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const expiry = this.cacheExpiry.get(key) || 0;
    
    if (this.cache.has(key) && now < expiry) {
      console.log(`📦 Cache hit for key: ${key}`);
      return Promise.resolve(this.cache.get(key));
    }
    
    return fetchFn().then(data => {
      this.cache.set(key, data);
      this.cacheExpiry.set(key, now + this.CACHE_DURATION);
      
      // Cleanup old cache entries
      if (this.cache.size > this.MAX_CACHE_SIZE) {
        this.cleanupCache();
      }
      
      console.log(`💾 Cached data for key: ${key}`);
      return data;
    });
  }

  private cleanupCache() {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    this.cacheExpiry.forEach((expiry, key) => {
      if (now > expiry) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
    });
    
    console.log(`🧹 Cleaned up ${keysToDelete.length} expired cache entries`);
  }

  /**
   * Get unified club data with all statistics
   */
  async getUnifiedClubData(clubId: string, currentUserId?: string): Promise<UnifiedClubData | null> {
    const cacheKey = `club_${clubId}_${currentUserId || 'anonymous'}`;
    
    return this.getCachedData(cacheKey, async () => {
      try {
        console.log(`🔄 Fetching unified club data for: ${clubId}`);
        
        // Get basic club data
        const clubDoc = await this.db.collection('users').doc(clubId).get();
        if (!clubDoc.exists) {
          console.warn(`❌ Club ${clubId} not found in users collection`);
          return null;
        }
        
        const clubData = clubDoc.data();
        
        // Get comprehensive statistics
        const [
          memberCount,
          followerCount,
          followingCount,
          eventCount,
          likes,
          comments,
          totalScore,
          isFollowing,
          isMember,
          membershipStatus
        ] = await Promise.all([
          this.getClubMemberCount(clubId),
          this.getClubFollowerCount(clubId),
          this.getClubFollowingCount(clubId),
          this.getClubEventCount(clubId),
          this.getClubLikes(clubId),
          this.getClubComments(clubId),
          this.getClubTotalScore(clubId),
          currentUserId ? this.isUserFollowingClub(currentUserId, clubId) : false,
          currentUserId ? this.isUserMemberOfClub(currentUserId, clubId) : false,
          currentUserId ? this.getMembershipStatus(currentUserId, clubId) : 'none'
        ]);
        
        const level = this.calculateLevel(totalScore);
        const rank = await this.calculateClubRank(clubId, totalScore);
        
        const unifiedData: UnifiedClubData = {
          id: clubId,
          clubName: clubData?.clubName || clubData?.displayName || clubData?.name || 'İsimsiz Kulüp',
          displayName: clubData?.displayName || clubData?.clubName || clubData?.name || 'İsimsiz Kulüp',
          description: clubData?.description || clubData?.bio || '',
          bio: clubData?.bio || clubData?.description || '',
          university: clubData?.university || '',
          department: clubData?.department || '',
          clubTypes: clubData?.clubTypes || (clubData?.clubType ? [clubData.clubType] : []),
          clubType: clubData?.clubType || '',
          profileImage: clubData?.profileImage || clubData?.photoURL || '',
          avatarIcon: clubData?.avatarIcon || 'account-group',
          avatarColor: clubData?.avatarColor || '#1976D2',
          coverImage: clubData?.coverImage || '',
          coverIcon: clubData?.coverIcon || '',
          coverColor: clubData?.coverColor || '#0D47A1',
          createdAt: clubData?.createdAt,
          public: clubData?.public !== false,
          memberCount,
          followerCount,
          followingCount,
          eventCount,
          likes,
          comments,
          totalScore,
          rank,
          level,
          lastActivity: clubData?.lastActivity || clubData?.createdAt,
          userType: clubData?.userType || 'club',
          foundationYear: clubData?.foundationYear || '',
          establishedDate: clubData?.establishedDate,
          email: clubData?.email || '',
          phone: clubData?.phone || '',
          website: clubData?.website || '',
          instagram: clubData?.instagram || '',
          facebook: clubData?.facebook || '',
          twitter: clubData?.twitter || '',
          isFollowing,
          isMember,
          membershipStatus
        };
        
        console.log(`✅ Unified club data loaded: ${unifiedData.displayName}`);
        return unifiedData;
        
      } catch (error) {
        console.error(`❌ Error loading unified club data for ${clubId}:`, error);
        return null;
      }
    });
  }

  /**
   * Get unified event data with all statistics
   */
  async getUnifiedEventData(eventId: string, currentUserId?: string): Promise<UnifiedEventData | null> {
    const cacheKey = `event_${eventId}_${currentUserId || 'anonymous'}`;
    
    return this.getCachedData(cacheKey, async () => {
      try {
        console.log(`🔄 Fetching unified event data for: ${eventId}`);
        
        // Get basic event data
        const eventDoc = await this.db.collection('events').doc(eventId).get();
        if (!eventDoc.exists) {
          console.warn(`❌ Event ${eventId} not found`);
          return null;
        }
        
        const eventData = eventDoc.data();
        
        // Get organizer data
        const organizerId = eventData?.createdBy || eventData?.organizer?.id;
        let organizer = {
          id: organizerId || '',
          name: 'Bilinmeyen Organizatör',
          avatar: '',
          type: 'club' as const
        };
        
        if (organizerId) {
          try {
            const organizerDoc = await this.db.collection('users').doc(organizerId).get();
            if (organizerDoc.exists) {
              const organizerData = organizerDoc.data();
              organizer = {
                id: organizerId,
                name: organizerData?.displayName || organizerData?.clubName || organizerData?.name || 'Bilinmeyen Organizatör',
                avatar: organizerData?.profileImage || organizerData?.photoURL || '',
                type: organizerData?.userType === 'club' ? 'club' : 'student'
              };
            }
          } catch (error) {
            console.warn(`Error loading organizer data for ${organizerId}:`, error);
          }
        }
        
        // Get comprehensive statistics
        const [
          likes,
          comments,
          participants,
          attendees,
          isJoined,
          isLiked
        ] = await Promise.all([
          this.getEventLikes(eventId),
          this.getEventComments(eventId),
          this.getEventParticipants(eventId),
          this.getEventAttendees(eventId),
          currentUserId ? this.isUserJoinedEvent(currentUserId, eventId) : false,
          currentUserId ? this.isUserLikedEvent(currentUserId, eventId) : false
        ]);
        
        const totalScore = (likes * 2) + (comments * 3) + (participants * 5);
        const rank = await this.calculateEventRank(eventId, totalScore);
        
        const unifiedData: UnifiedEventData = {
          id: eventId,
          title: eventData?.title || 'İsimsiz Etkinlik',
          description: eventData?.description || '',
          startDate: eventData?.startDate,
          endDate: eventData?.endDate,
          location: eventData?.location || '',
          category: eventData?.category || '',
          imageUrl: eventData?.imageUrl || eventData?.coverImage || '',
          coverImage: eventData?.coverImage || eventData?.imageUrl || '',
          organizer,
          likes,
          comments,
          participants,
          attendees,
          totalScore,
          rank,
          status: eventData?.status || 'pending',
          isJoined,
          isLiked,
          createdAt: eventData?.createdAt,
          updatedAt: eventData?.updatedAt,
          capacity: eventData?.capacity || 0,
          price: eventData?.price || 0,
          requirements: eventData?.requirements || [],
          tags: eventData?.tags || []
        };
        
        console.log(`✅ Unified event data loaded: ${unifiedData.title}`);
        return unifiedData;
        
      } catch (error) {
        console.error(`❌ Error loading unified event data for ${eventId}:`, error);
        return null;
      }
    });
  }

  /**
   * Get unified user data with all statistics
   */
  async getUnifiedUserData(userId: string, currentUserId?: string): Promise<UnifiedUserData | null> {
    const cacheKey = `user_${userId}_${currentUserId || 'anonymous'}`;
    
    return this.getCachedData(cacheKey, async () => {
      try {
        console.log(`🔄 Fetching unified user data for: ${userId}`);
        
        // Get basic user data
        const userDoc = await this.db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
          console.warn(`❌ User ${userId} not found`);
          return null;
        }
        
        const userData = userDoc.data();
        
        // Get comprehensive statistics
        const [
          likes,
          comments,
          participations,
          eventsOrganized,
          followerCount,
          followingCount,
          isFollowing,
          isFollower
        ] = await Promise.all([
          this.getUserLikes(userId),
          this.getUserComments(userId),
          this.getUserParticipations(userId),
          this.getUserEventsOrganized(userId),
          this.getUserFollowerCount(userId),
          this.getUserFollowingCount(userId),
          currentUserId ? this.isUserFollowingUser(currentUserId, userId) : false,
          currentUserId ? this.isUserFollowingUser(userId, currentUserId) : false
        ]);
        
        const totalScore = (likes * 1) + (comments * 2) + (participations * 3) + (eventsOrganized * 5);
        const level = this.calculateLevel(totalScore);
        const rank = await this.calculateUserRank(userId, totalScore);
        
        const unifiedData: UnifiedUserData = {
          id: userId,
          displayName: userData?.displayName || userData?.name || 'İsimsiz Kullanıcı',
          username: userData?.username || '',
          email: userData?.email || '',
          profileImage: userData?.profileImage || userData?.photoURL || '',
          avatarIcon: userData?.avatarIcon || 'account',
          avatarColor: userData?.avatarColor || '#1976D2',
          university: userData?.university || '',
          department: userData?.department || '',
          bio: userData?.bio || '',
          userType: userData?.userType || 'student',
          likes,
          comments,
          participations,
          eventsOrganized,
          totalScore,
          rank,
          level,
          followerCount,
          followingCount,
          lastActivity: userData?.lastActivity || userData?.createdAt,
          createdAt: userData?.createdAt,
          isFollowing,
          isFollower
        };
        
        console.log(`✅ Unified user data loaded: ${unifiedData.displayName}`);
        return unifiedData;
        
      } catch (error) {
        console.error(`❌ Error loading unified user data for ${userId}:`, error);
        return null;
      }
    });
  }

  // Helper methods for getting specific statistics
  private async getClubMemberCount(clubId: string): Promise<number> {
    try {
      const snapshot = await this.db.collection('clubMembers')
        .where('clubId', '==', clubId)
        .where('status', '==', 'approved')
        .get();
      return snapshot.size;
    } catch (error) {
      console.warn('Error getting club member count:', error);
      return 0;
    }
  }

  private async getClubFollowerCount(clubId: string): Promise<number> {
    try {
      const snapshot = await this.db.collection('userFollows')
        .where('followingId', '==', clubId)
        .get();
      return snapshot.size;
    } catch (error) {
      console.warn('Error getting club follower count:', error);
      return 0;
    }
  }

  private async getClubFollowingCount(clubId: string): Promise<number> {
    try {
      const snapshot = await this.db.collection('userFollows')
        .where('followerId', '==', clubId)
        .get();
      return snapshot.size;
    } catch (error) {
      console.warn('Error getting club following count:', error);
      return 0;
    }
  }

  private async getClubEventCount(clubId: string): Promise<number> {
    try {
      const snapshot = await this.db.collection('events')
        .where('createdBy', '==', clubId)
        .where('status', '==', 'approved')
        .get();
      return snapshot.size;
    } catch (error) {
      console.warn('Error getting club event count:', error);
      return 0;
    }
  }

  private async getClubLikes(clubId: string): Promise<number> {
    try {
      // Get likes on all events organized by this club
      const eventsSnapshot = await this.db.collection('events')
        .where('createdBy', '==', clubId)
        .get();
      
      let totalLikes = 0;
      for (const eventDoc of eventsSnapshot.docs) {
        const likesSnapshot = await this.db.collection('eventLikes')
          .where('eventId', '==', eventDoc.id)
          .get();
        totalLikes += likesSnapshot.size;
      }
      return totalLikes;
    } catch (error) {
      console.warn('Error getting club likes:', error);
      return 0;
    }
  }

  private async getClubComments(clubId: string): Promise<number> {
    try {
      // Get comments on all events organized by this club
      const eventsSnapshot = await this.db.collection('events')
        .where('createdBy', '==', clubId)
        .get();
      
      let totalComments = 0;
      for (const eventDoc of eventsSnapshot.docs) {
        const commentsSnapshot = await this.db.collection('events')
          .doc(eventDoc.id)
          .collection('comments')
          .get();
        totalComments += commentsSnapshot.size;
      }
      return totalComments;
    } catch (error) {
      console.warn('Error getting club comments:', error);
      return 0;
    }
  }

  private async getClubTotalScore(clubId: string): Promise<number> {
    try {
      const doc = await this.db.collection('userScores').doc(clubId).get();
      return doc.exists ? (doc.data()?.totalPoints || 0) : 0;
    } catch (error) {
      console.warn('Error getting club total score:', error);
      return 0;
    }
  }

  private async getEventLikes(eventId: string): Promise<number> {
    try {
      const snapshot = await this.db.collection('eventLikes')
        .where('eventId', '==', eventId)
        .get();
      return snapshot.size;
    } catch (error) {
      console.warn('Error getting event likes:', error);
      return 0;
    }
  }

  private async getEventComments(eventId: string): Promise<number> {
    try {
      const snapshot = await this.db.collection('events')
        .doc(eventId)
        .collection('comments')
        .get();
      return snapshot.size;
    } catch (error) {
      console.warn('Error getting event comments:', error);
      return 0;
    }
  }

  private async getEventParticipants(eventId: string): Promise<number> {
    try {
      const snapshot = await this.db.collection('eventAttendees')
        .where('eventId', '==', eventId)
        .get();
      return snapshot.size;
    } catch (error) {
      console.warn('Error getting event participants:', error);
      return 0;
    }
  }

  private async getEventAttendees(eventId: string): Promise<string[]> {
    try {
      const snapshot = await this.db.collection('eventAttendees')
        .where('eventId', '==', eventId)
        .get();
      return snapshot.docs.map(doc => doc.data().userId);
    } catch (error) {
      console.warn('Error getting event attendees:', error);
      return [];
    }
  }

  private async getUserLikes(userId: string): Promise<number> {
    try {
      const snapshot = await this.db.collection('eventLikes')
        .where('userId', '==', userId)
        .get();
      return snapshot.size;
    } catch (error) {
      console.warn('Error getting user likes:', error);
      return 0;
    }
  }

  private async getUserComments(userId: string): Promise<number> {
    try {
      const snapshot = await this.db.collectionGroup('comments')
        .where('userId', '==', userId)
        .get();
      return snapshot.size;
    } catch (error) {
      console.warn('Error getting user comments:', error);
      return 0;
    }
  }

  private async getUserParticipations(userId: string): Promise<number> {
    try {
      const snapshot = await this.db.collection('eventAttendees')
        .where('userId', '==', userId)
        .get();
      return snapshot.size;
    } catch (error) {
      console.warn('Error getting user participations:', error);
      return 0;
    }
  }

  private async getUserEventsOrganized(userId: string): Promise<number> {
    try {
      const snapshot = await this.db.collection('events')
        .where('createdBy', '==', userId)
        .where('status', '==', 'approved')
        .get();
      return snapshot.size;
    } catch (error) {
      console.warn('Error getting user events organized:', error);
      return 0;
    }
  }

  private async getUserFollowerCount(userId: string): Promise<number> {
    try {
      const snapshot = await this.db.collection('userFollows')
        .where('followingId', '==', userId)
        .get();
      return snapshot.size;
    } catch (error) {
      console.warn('Error getting user follower count:', error);
      return 0;
    }
  }

  private async getUserFollowingCount(userId: string): Promise<number> {
    try {
      const snapshot = await this.db.collection('userFollows')
        .where('followerId', '==', userId)
        .get();
      return snapshot.size;
    } catch (error) {
      console.warn('Error getting user following count:', error);
      return 0;
    }
  }

  // Relationship checks
  private async isUserFollowingClub(userId: string, clubId: string): Promise<boolean> {
    try {
      const snapshot = await this.db.collection('userFollows')
        .where('followerId', '==', userId)
        .where('followingId', '==', clubId)
        .limit(1)
        .get();
      return !snapshot.empty;
    } catch (error) {
      console.warn('Error checking if user follows club:', error);
      return false;
    }
  }

  private async isUserMemberOfClub(userId: string, clubId: string): Promise<boolean> {
    try {
      const snapshot = await this.db.collection('clubMembers')
        .where('userId', '==', userId)
        .where('clubId', '==', clubId)
        .where('status', '==', 'approved')
        .limit(1)
        .get();
      return !snapshot.empty;
    } catch (error) {
      console.warn('Error checking if user is member of club:', error);
      return false;
    }
  }

  private async getMembershipStatus(userId: string, clubId: string): Promise<'none' | 'pending' | 'approved' | 'rejected'> {
    try {
      const snapshot = await this.db.collection('clubMembers')
        .where('userId', '==', userId)
        .where('clubId', '==', clubId)
        .limit(1)
        .get();
      
      if (snapshot.empty) return 'none';
      
      const status = snapshot.docs[0].data().status;
      return status || 'none';
    } catch (error) {
      console.warn('Error getting membership status:', error);
      return 'none';
    }
  }

  private async isUserJoinedEvent(userId: string, eventId: string): Promise<boolean> {
    try {
      const snapshot = await this.db.collection('eventAttendees')
        .where('userId', '==', userId)
        .where('eventId', '==', eventId)
        .limit(1)
        .get();
      return !snapshot.empty;
    } catch (error) {
      console.warn('Error checking if user joined event:', error);
      return false;
    }
  }

  private async isUserLikedEvent(userId: string, eventId: string): Promise<boolean> {
    try {
      const snapshot = await this.db.collection('eventLikes')
        .where('userId', '==', userId)
        .where('eventId', '==', eventId)
        .limit(1)
        .get();
      return !snapshot.empty;
    } catch (error) {
      console.warn('Error checking if user liked event:', error);
      return false;
    }
  }

  private async isUserFollowingUser(followerId: string, followingId: string): Promise<boolean> {
    try {
      const snapshot = await this.db.collection('userFollows')
        .where('followerId', '==', followerId)
        .where('followingId', '==', followingId)
        .limit(1)
        .get();
      return !snapshot.empty;
    } catch (error) {
      console.warn('Error checking if user follows user:', error);
      return false;
    }
  }

  // Ranking calculations
  private calculateLevel(totalScore: number): number {
    if (totalScore < 100) return 1;
    if (totalScore < 500) return 2;
    if (totalScore < 1000) return 3;
    if (totalScore < 2500) return 4;
    if (totalScore < 5000) return 5;
    if (totalScore < 10000) return 6;
    if (totalScore < 25000) return 7;
    if (totalScore < 50000) return 8;
    if (totalScore < 100000) return 9;
    return 10;
  }

  private async calculateClubRank(clubId: string, totalScore: number): Promise<number> {
    try {
      // Simplified ranking - in production, you might want to cache this
      const snapshot = await this.db.collection('users')
        .where('userType', '==', 'club')
        .get();
      
      let rank = 1;
      for (const doc of snapshot.docs) {
        if (doc.id === clubId) continue;
        
        const clubScore = await this.getClubTotalScore(doc.id);
        if (clubScore > totalScore) {
          rank++;
        }
      }
      
      return rank;
    } catch (error) {
      console.warn('Error calculating club rank:', error);
      return 1;
    }
  }

  private async calculateEventRank(eventId: string, totalScore: number): Promise<number> {
    try {
      const snapshot = await this.db.collection('events')
        .where('status', '==', 'approved')
        .get();
      
      let rank = 1;
      for (const doc of snapshot.docs) {
        if (doc.id === eventId) continue;
        
        const eventLikes = await this.getEventLikes(doc.id);
        const eventComments = await this.getEventComments(doc.id);
        const eventParticipants = await this.getEventParticipants(doc.id);
        const eventScore = (eventLikes * 2) + (eventComments * 3) + (eventParticipants * 5);
        
        if (eventScore > totalScore) {
          rank++;
        }
      }
      
      return rank;
    } catch (error) {
      console.warn('Error calculating event rank:', error);
      return 1;
    }
  }

  private async calculateUserRank(userId: string, totalScore: number): Promise<number> {
    try {
      const snapshot = await this.db.collection('users')
        .where('userType', '==', 'student')
        .get();
      
      let rank = 1;
      for (const doc of snapshot.docs) {
        if (doc.id === userId) continue;
        
        const userLikes = await this.getUserLikes(doc.id);
        const userComments = await this.getUserComments(doc.id);
        const userParticipations = await this.getUserParticipations(doc.id);
        const userEventsOrganized = await this.getUserEventsOrganized(doc.id);
        const userScore = (userLikes * 1) + (userComments * 2) + (userParticipations * 3) + (userEventsOrganized * 5);
        
        if (userScore > totalScore) {
          rank++;
        }
      }
      
      return rank;
    } catch (error) {
      console.warn('Error calculating user rank:', error);
      return 1;
    }
  }

  /**
   * Clear cache for specific data type
   */
  clearCache(type?: 'club' | 'event' | 'user') {
    if (type) {
      const keysToDelete = Array.from(this.cache.keys()).filter(key => key.startsWith(`${type}_`));
      keysToDelete.forEach(key => {
        this.cache.delete(key);
        this.cacheExpiry.delete(key);
      });
      console.log(`🧹 Cleared cache for ${type} data`);
    } else {
      this.cache.clear();
      this.cacheExpiry.clear();
      console.log('🧹 Cleared all cache');
    }
  }

  /**
   * Refresh specific data
   */
  async refreshClubData(clubId: string, currentUserId?: string) {
    const cacheKey = `club_${clubId}_${currentUserId || 'anonymous'}`;
    this.cache.delete(cacheKey);
    this.cacheExpiry.delete(cacheKey);
    return this.getUnifiedClubData(clubId, currentUserId);
  }

  async refreshEventData(eventId: string, currentUserId?: string) {
    const cacheKey = `event_${eventId}_${currentUserId || 'anonymous'}`;
    this.cache.delete(cacheKey);
    this.cacheExpiry.delete(cacheKey);
    return this.getUnifiedEventData(eventId, currentUserId);
  }

  async refreshUserData(userId: string, currentUserId?: string) {
    const cacheKey = `user_${userId}_${currentUserId || 'anonymous'}`;
    this.cache.delete(cacheKey);
    this.cacheExpiry.delete(cacheKey);
    return this.getUnifiedUserData(userId, currentUserId);
  }

  /**
   * Get multiple clubs data efficiently
   */
  async getMultipleClubsData(clubIds: string[], currentUserId?: string): Promise<UnifiedClubData[]> {
    const promises = clubIds.map(id => this.getUnifiedClubData(id, currentUserId));
    const results = await Promise.all(promises);
    return results.filter(data => data !== null) as UnifiedClubData[];
  }

  /**
   * Get multiple events data efficiently
   */
  async getMultipleEventsData(eventIds: string[], currentUserId?: string): Promise<UnifiedEventData[]> {
    const promises = eventIds.map(id => this.getUnifiedEventData(id, currentUserId));
    const results = await Promise.all(promises);
    return results.filter(data => data !== null) as UnifiedEventData[];
  }

  /**
   * Get multiple users data efficiently
   */
  async getMultipleUsersData(userIds: string[], currentUserId?: string): Promise<UnifiedUserData[]> {
    const promises = userIds.map(id => this.getUnifiedUserData(id, currentUserId));
    const results = await Promise.all(promises);
    return results.filter(data => data !== null) as UnifiedUserData[];
  }
}

export default UnifiedDataSyncService.getInstance();



