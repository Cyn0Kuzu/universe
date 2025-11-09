/**
 * 🔄 Real-Time Data Synchronization Service
 * Tüm uygulama verilerini gerçek zamanlı olarak senkronize eden gelişmiş servis
 * - Gerçek zamanlı Firestore dinleyicileri
 * - Akıllı cache yönetimi
 * - Otomatik veri güncellemeleri
 * - Tutarlı veri yapıları
 */

import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

export interface RealTimeClubData {
  id: string;
  clubName: string;
  displayName: string;
  description: string;
  bio: string;
  university: string;
  department: string;
  clubTypes: string[];
  profileImage: string;
  avatarIcon: string;
  avatarColor: string;
  coverImage: string;
  coverIcon: string;
  coverColor: string;
  
  // Gerçek istatistikler
  memberCount: number;
  followerCount: number;
  followingCount: number;
  eventCount: number;
  
  // Etkileşim metrikleri
  likes: number;
  comments: number;
  views: number;
  shares: number;
  
  // Scoring ve ranking
  totalScore: number;
  rank: number;
  level: number;
  
  // Durum bilgileri
  isFollowing: boolean;
  isMember: boolean;
  membershipStatus: 'none' | 'pending' | 'approved' | 'rejected';
  
  // Zaman damgaları
  createdAt: any;
  updatedAt: any;
  lastActivity: any;
  
  // Sosyal medya
  email: string;
  phone: string;
  website: string;
  instagram: string;
  facebook: string;
  twitter: string;
  
  // Diğer
  public: boolean;
  userType: string;
  foundationYear: string;
}

export interface RealTimeEventData {
  id: string;
  title: string;
  description: string;
  startDate: any;
  endDate: any;
  
  // Lokasyon
  location: {
    type: 'physical' | 'online' | 'hybrid';
    physicalAddress?: string;
    onlineLink?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  
  // Kategori ve etiketler
  category: string;
  categories: string[];
  tags: string[];
  
  // Görseller
  imageUrl: string;
  coverImage: string;
  gallery: string[];
  
  // Organizatör bilgisi
  organizer: {
    id: string;
    name: string;
    displayName: string;
    avatar: string;
    avatarIcon: string;
    avatarColor: string;
    type: 'club' | 'student';
    university: string;
  };
  
  // Katılımcı bilgileri
  participants: number;
  attendees: string[];
  capacity: number;
  availableSlots: number;
  
  // Fiyatlandırma
  isFree: boolean;
  price: number;
  currency: string;
  
  // Etkileşim metrikleri
  likes: number;
  likeCount: number;
  comments: number;
  commentCount: number;
  views: number;
  viewCount: number;
  shares: number;
  shareCount: number;
  
  // Durum bilgileri
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';
  isJoined: boolean;
  isLiked: boolean;
  isSaved: boolean;
  
  // Scoring ve ranking
  totalScore: number;
  rank: number;
  popularityScore: number;
  
  // Zaman damgaları
  createdAt: any;
  updatedAt: any;
  publishedAt: any;
  
  // Gereksinimler
  requirements: string[];
  minAge?: number;
  maxAge?: number;
  targetAudience: string[];
  
  // Üniversite
  university: string;
  clubId: string;
  clubName: string;
  createdBy: string;
}

export interface RealTimeUserData {
  id: string;
  displayName: string;
  username: string;
  email: string;
  
  // Profil bilgileri
  profileImage: string;
  avatarIcon: string;
  avatarColor: string;
  coverImage: string;
  bio: string;
  
  // Eğitim bilgileri
  university: string;
  department: string;
  classLevel: string;
  studentId: string;
  
  // Hesap tipi
  userType: 'student' | 'club';
  
  // İstatistikler
  likes: number;
  comments: number;
  participations: number;
  eventsOrganized: number;
  eventsAttended: number;
  
  // Sosyal
  followerCount: number;
  followingCount: number;
  clubMemberships: number;
  
  // Scoring
  totalScore: number;
  rank: number;
  level: number;
  badges: string[];
  
  // Durum
  isFollowing: boolean;
  isFollower: boolean;
  
  // Zaman damgaları
  createdAt: any;
  updatedAt: any;
  lastActivity: any;
  lastSeen: any;
}

class RealTimeDataSyncService {
  private static instance: RealTimeDataSyncService;
  private db: firebase.firestore.Firestore;
  
  // Listener management
  private listeners: Map<string, () => void> = new Map();
  
  // Cache management
  private cache: Map<string, any> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 1 * 60 * 1000; // 1 minute for real-time data
  
  private constructor() {
    this.db = firebase.firestore();
  }

  public static getInstance(): RealTimeDataSyncService {
    if (!RealTimeDataSyncService.instance) {
      RealTimeDataSyncService.instance = new RealTimeDataSyncService();
    }
    return RealTimeDataSyncService.instance;
  }

  /**
   * 🔄 Kulüp Verilerini Gerçek Zamanlı Çekme
   */
  public async getRealTimeClubData(
    clubId: string,
    currentUserId?: string
  ): Promise<RealTimeClubData> {
    const cacheKey = `club_${clubId}_${currentUserId || 'anonymous'}`;
    
    try {
      // Kulüp temel verilerini çek
      const clubDoc = await this.db.collection('users').doc(clubId).get();
      
      if (!clubDoc.exists) {
        throw new Error('Club not found');
      }
      
      const clubData = clubDoc.data();
      
      // Gerçek istatistikleri paralel olarak çek
      const [
        memberCount,
        followerCount,
        followingCount,
        eventCount,
        interactionMetrics,
        followStatus,
        membershipStatus
      ] = await Promise.all([
        this.getClubMemberCount(clubId),
        this.getClubFollowerCount(clubId),
        this.getClubFollowingCount(clubId),
        this.getClubEventCount(clubId),
        this.getClubInteractionMetrics(clubId),
        currentUserId ? this.checkFollowStatus(currentUserId, clubId) : Promise.resolve(false),
        currentUserId ? this.checkMembershipStatus(currentUserId, clubId) : Promise.resolve({ isMember: false, status: 'none' as const })
      ]);
      
      // Skor ve seviye hesapla
      const totalScore = this.calculateClubScore({
        memberCount,
        followerCount,
        eventCount,
        likes: interactionMetrics.likes,
        comments: interactionMetrics.comments,
        views: interactionMetrics.views
      });
      
      const level = this.calculateLevel(totalScore);
      
      const unifiedData: RealTimeClubData = {
        id: clubId,
        clubName: clubData?.clubName || '',
        displayName: clubData?.displayName || clubData?.clubName || '',
        description: clubData?.description || '',
        bio: clubData?.bio || clubData?.description || '',
        university: clubData?.university || '',
        department: clubData?.department || '',
        clubTypes: clubData?.clubTypes || [clubData?.clubType].filter(Boolean) || [],
        profileImage: clubData?.profileImage || clubData?.photoURL || '',
        avatarIcon: clubData?.avatarIcon || 'account-group',
        avatarColor: clubData?.avatarColor || '#1976D2',
        coverImage: clubData?.coverImage || '',
        coverIcon: clubData?.coverIcon || 'calendar-star',
        coverColor: clubData?.coverColor || '#1976D2',
        
        // Gerçek istatistikler
        memberCount,
        followerCount,
        followingCount,
        eventCount,
        
        // Etkileşim metrikleri
        likes: interactionMetrics.likes,
        comments: interactionMetrics.comments,
        views: interactionMetrics.views,
        shares: interactionMetrics.shares,
        
        // Scoring
        totalScore,
        rank: 0, // Will be calculated separately
        level,
        
        // Durum
        isFollowing: followStatus,
        isMember: membershipStatus.isMember,
        membershipStatus: membershipStatus.status,
        
        // Zaman damgaları
        createdAt: clubData?.createdAt,
        updatedAt: clubData?.updatedAt || clubData?.createdAt,
        lastActivity: clubData?.lastActivity || new Date(),
        
        // İletişim
        email: clubData?.email || '',
        phone: clubData?.phone || '',
        website: clubData?.website || '',
        instagram: clubData?.instagram || '',
        facebook: clubData?.facebook || '',
        twitter: clubData?.twitter || '',
        
        // Diğer
        public: clubData?.public !== false,
        userType: clubData?.userType || 'club',
        foundationYear: clubData?.foundationYear || clubData?.establishedDate?.toDate?.()?.getFullYear?.()?.toString() || '',
      };
      
      // Cache'e kaydet
      this.cache.set(cacheKey, unifiedData);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_DURATION);
      
      return unifiedData;
    } catch (error) {
      console.error('❌ Error fetching real-time club data:', error);
      throw error;
    }
  }

  /**
   * 🔄 Etkinlik Verilerini Gerçek Zamanlı Çekme
   */
  public async getRealTimeEventData(
    eventId: string,
    currentUserId?: string
  ): Promise<RealTimeEventData> {
    const cacheKey = `event_${eventId}_${currentUserId || 'anonymous'}`;
    
    try {
      // Etkinlik temel verilerini çek
      const eventDoc = await this.db.collection('events').doc(eventId).get();
      
      if (!eventDoc.exists) {
        throw new Error('Event not found');
      }
      
      const eventData = eventDoc.data();
      
      // Organizatör bilgilerini çek
      const organizer = await this.getEventOrganizer(eventData?.clubId || eventData?.createdBy);
      
      // Gerçek istatistikleri paralel olarak çek
      const [
        interactionMetrics,
        participantCount,
        joinStatus,
        likeStatus
      ] = await Promise.all([
        this.getEventInteractionMetrics(eventId),
        this.getEventParticipantCount(eventId),
        currentUserId ? this.checkEventJoinStatus(currentUserId, eventId) : Promise.resolve(false),
        currentUserId ? this.checkEventLikeStatus(currentUserId, eventId) : Promise.resolve(false)
      ]);
      
      // Skor hesapla
      const totalScore = this.calculateEventScore({
        participants: participantCount,
        likes: interactionMetrics.likes,
        comments: interactionMetrics.comments,
        views: interactionMetrics.views
      });
      
      // Lokasyon bilgisini düzenle
      const location = {
        type: (eventData?.location?.type || 'physical') as 'physical' | 'online' | 'hybrid',
        physicalAddress: eventData?.location?.physicalAddress || '',
        onlineLink: eventData?.location?.onlineLink || '',
        coordinates: eventData?.location?.coordinates
      };
      
      const unifiedData: RealTimeEventData = {
        id: eventId,
        title: eventData?.title || '',
        description: eventData?.description || '',
        startDate: eventData?.startDate,
        endDate: eventData?.endDate,
        
        location,
        
        category: eventData?.category || (eventData?.categories?.[0]) || '',
        categories: eventData?.categories || [eventData?.category].filter(Boolean) || [],
        tags: eventData?.tags || [],
        
        imageUrl: eventData?.imageUrl || eventData?.coverImage || '',
        coverImage: eventData?.coverImage || eventData?.imageUrl || '',
        gallery: eventData?.gallery || [],
        
        organizer,
        
        // Katılımcı bilgileri
        participants: participantCount,
        attendees: eventData?.attendees || [],
        capacity: eventData?.capacity || 0,
        availableSlots: Math.max(0, (eventData?.capacity || 0) - participantCount),
        
        // Fiyatlandırma
        isFree: eventData?.isFree ?? eventData?.pricing?.isFree ?? true,
        price: eventData?.price || eventData?.pricing?.price || 0,
        currency: eventData?.currency || 'TRY',
        
        // Etkileşim metrikleri
        likes: interactionMetrics.likes,
        likeCount: interactionMetrics.likes,
        comments: interactionMetrics.comments,
        commentCount: interactionMetrics.comments,
        views: interactionMetrics.views,
        viewCount: interactionMetrics.views,
        shares: interactionMetrics.shares,
        shareCount: interactionMetrics.shares,
        
        // Durum
        status: eventData?.status || 'approved',
        isJoined: joinStatus,
        isLiked: likeStatus,
        isSaved: false,
        
        // Scoring
        totalScore,
        rank: 0,
        popularityScore: interactionMetrics.likes + (participantCount * 2),
        
        // Zaman damgaları
        createdAt: eventData?.createdAt,
        updatedAt: eventData?.updatedAt || eventData?.createdAt,
        publishedAt: eventData?.publishedAt || eventData?.createdAt,
        
        // Gereksinimler
        requirements: eventData?.requirements || [],
        minAge: eventData?.minAge,
        maxAge: eventData?.maxAge,
        targetAudience: eventData?.targetAudience || [],
        
        // Üniversite
        university: eventData?.university || organizer?.university || '',
        clubId: eventData?.clubId || '',
        clubName: eventData?.clubName || organizer?.name || '',
        createdBy: eventData?.createdBy || '',
      };
      
      // Cache'e kaydet
      this.cache.set(cacheKey, unifiedData);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_DURATION);
      
      return unifiedData;
    } catch (error) {
      console.error('❌ Error fetching real-time event data:', error);
      throw error;
    }
  }

  /**
   * 📊 Kulüp İstatistik Metodları
   */
  private async getClubMemberCount(clubId: string): Promise<number> {
    try {
      const snapshot = await this.db
        .collection('clubMembers')
        .where('clubId', '==', clubId)
        .where('status', '==', 'approved')
        .get();
      return snapshot.size;
    } catch (error) {
      console.error('Error getting member count:', error);
      return 0;
    }
  }

  private async getClubFollowerCount(clubId: string): Promise<number> {
    try {
      const snapshot = await this.db
        .collection('follows')
        .where('followingId', '==', clubId)
        .get();
      return snapshot.size;
    } catch (error) {
      console.error('Error getting follower count:', error);
      return 0;
    }
  }

  private async getClubFollowingCount(clubId: string): Promise<number> {
    try {
      const snapshot = await this.db
        .collection('follows')
        .where('followerId', '==', clubId)
        .get();
      return snapshot.size;
    } catch (error) {
      console.error('Error getting following count:', error);
      return 0;
    }
  }

  private async getClubEventCount(clubId: string): Promise<number> {
    try {
      const snapshot = await this.db
        .collection('events')
        .where('clubId', '==', clubId)
        .get();
      return snapshot.size;
    } catch (error) {
      console.error('Error getting event count:', error);
      return 0;
    }
  }

  private async getClubInteractionMetrics(clubId: string): Promise<{
    likes: number;
    comments: number;
    views: number;
    shares: number;
  }> {
    try {
      // Kulüp etkinliklerinin toplam etkileşimlerini hesapla
      const eventsSnapshot = await this.db
        .collection('events')
        .where('clubId', '==', clubId)
        .get();
      
      let totalLikes = 0;
      let totalComments = 0;
      let totalViews = 0;
      let totalShares = 0;
      
      for (const doc of eventsSnapshot.docs) {
        const eventData = doc.data();
        totalLikes += eventData?.likeCount || eventData?.likes || 0;
        totalComments += eventData?.commentCount || eventData?.comments || 0;
        totalViews += eventData?.viewCount || eventData?.views || 0;
        totalShares += eventData?.shareCount || eventData?.shares || 0;
      }
      
      return {
        likes: totalLikes,
        comments: totalComments,
        views: totalViews,
        shares: totalShares
      };
    } catch (error) {
      console.error('Error getting interaction metrics:', error);
      return { likes: 0, comments: 0, views: 0, shares: 0 };
    }
  }

  /**
   * 📊 Etkinlik İstatistik Metodları
   */
  private async getEventParticipantCount(eventId: string): Promise<number> {
    try {
      const snapshot = await this.db
        .collection('eventParticipants')
        .where('eventId', '==', eventId)
        .get();
      return snapshot.size;
    } catch (error) {
      console.error('Error getting participant count:', error);
      return 0;
    }
  }

  private async getEventInteractionMetrics(eventId: string): Promise<{
    likes: number;
    comments: number;
    views: number;
    shares: number;
  }> {
    try {
      const [likesSnapshot, commentsSnapshot] = await Promise.all([
        this.db.collection('eventLikes').where('eventId', '==', eventId).get(),
        this.db.collection('eventComments').where('eventId', '==', eventId).get()
      ]);
      
      // Event document'tan view ve share sayılarını al
      const eventDoc = await this.db.collection('events').doc(eventId).get();
      const eventData = eventDoc.data();
      
      return {
        likes: likesSnapshot.size,
        comments: commentsSnapshot.size,
        views: eventData?.viewCount || eventData?.views || 0,
        shares: eventData?.shareCount || eventData?.shares || 0
      };
    } catch (error) {
      console.error('Error getting event interaction metrics:', error);
      return { likes: 0, comments: 0, views: 0, shares: 0 };
    }
  }

  /**
   * 🔍 Durum Kontrol Metodları
   */
  private async checkFollowStatus(userId: string, clubId: string): Promise<boolean> {
    try {
      const snapshot = await this.db
        .collection('follows')
        .where('followerId', '==', userId)
        .where('followingId', '==', clubId)
        .limit(1)
        .get();
      return !snapshot.empty;
    } catch (error) {
      console.error('Error checking follow status:', error);
      return false;
    }
  }

  private async checkMembershipStatus(
    userId: string,
    clubId: string
  ): Promise<{ isMember: boolean; status: 'none' | 'pending' | 'approved' | 'rejected' }> {
    try {
      const snapshot = await this.db
        .collection('clubMembers')
        .where('userId', '==', userId)
        .where('clubId', '==', clubId)
        .limit(1)
        .get();
      
      if (snapshot.empty) {
        return { isMember: false, status: 'none' };
      }
      
      const memberData = snapshot.docs[0].data();
      const status = memberData?.status || 'none';
      
      return {
        isMember: status === 'approved',
        status: status as 'none' | 'pending' | 'approved' | 'rejected'
      };
    } catch (error) {
      console.error('Error checking membership status:', error);
      return { isMember: false, status: 'none' };
    }
  }

  private async checkEventJoinStatus(userId: string, eventId: string): Promise<boolean> {
    try {
      const snapshot = await this.db
        .collection('eventParticipants')
        .where('userId', '==', userId)
        .where('eventId', '==', eventId)
        .limit(1)
        .get();
      return !snapshot.empty;
    } catch (error) {
      console.error('Error checking event join status:', error);
      return false;
    }
  }

  private async checkEventLikeStatus(userId: string, eventId: string): Promise<boolean> {
    try {
      const snapshot = await this.db
        .collection('eventLikes')
        .where('userId', '==', userId)
        .where('eventId', '==', eventId)
        .limit(1)
        .get();
      return !snapshot.empty;
    } catch (error) {
      console.error('Error checking event like status:', error);
      return false;
    }
  }

  /**
   * 👤 Organizatör Bilgilerini Getir
   */
  private async getEventOrganizer(organizerId: string): Promise<any> {
    try {
      const doc = await this.db.collection('users').doc(organizerId).get();
      
      if (!doc.exists) {
        return {
          id: organizerId,
          name: 'Unknown',
          displayName: 'Unknown',
          avatar: '',
          avatarIcon: 'account',
          avatarColor: '#1976D2',
          type: 'club',
          university: ''
        };
      }
      
      const data = doc.data();
      return {
        id: organizerId,
        name: data?.clubName || data?.displayName || 'Unknown',
        displayName: data?.displayName || data?.clubName || 'Unknown',
        avatar: data?.profileImage || data?.photoURL || '',
        avatarIcon: data?.avatarIcon || 'account-group',
        avatarColor: data?.avatarColor || '#1976D2',
        type: data?.userType || 'club',
        university: data?.university || ''
      };
    } catch (error) {
      console.error('Error getting organizer:', error);
      return {
        id: organizerId,
        name: 'Unknown',
        displayName: 'Unknown',
        avatar: '',
        avatarIcon: 'account',
        avatarColor: '#1976D2',
        type: 'club',
        university: ''
      };
    }
  }

  /**
   * 📊 Skor Hesaplama Metodları
   */
  private calculateClubScore(metrics: {
    memberCount: number;
    followerCount: number;
    eventCount: number;
    likes: number;
    comments: number;
    views: number;
  }): number {
    return (
      metrics.memberCount * 10 +
      metrics.followerCount * 5 +
      metrics.eventCount * 15 +
      metrics.likes * 2 +
      metrics.comments * 3 +
      metrics.views * 0.5
    );
  }

  private calculateEventScore(metrics: {
    participants: number;
    likes: number;
    comments: number;
    views: number;
  }): number {
    return (
      metrics.participants * 10 +
      metrics.likes * 2 +
      metrics.comments * 3 +
      metrics.views * 0.5
    );
  }

  private calculateLevel(score: number): number {
    if (score < 100) return 1;
    if (score < 500) return 2;
    if (score < 1000) return 3;
    if (score < 2500) return 4;
    if (score < 5000) return 5;
    if (score < 10000) return 6;
    if (score < 25000) return 7;
    if (score < 50000) return 8;
    if (score < 100000) return 9;
    return 10;
  }

  /**
   * 🔄 Gerçek Zamanlı Dinleyici Ekleme
   */
  public subscribeToClubUpdates(
    clubId: string,
    callback: (data: RealTimeClubData) => void,
    currentUserId?: string
  ): () => void {
    const listenerId = `club_${clubId}_${Date.now()}`;
    
    const unsubscribe = this.db.collection('users').doc(clubId).onSnapshot(
      async (doc) => {
        if (doc.exists) {
          try {
            const data = await this.getRealTimeClubData(clubId, currentUserId);
            callback(data);
          } catch (error) {
            console.error('Error in club update callback:', error);
          }
        }
      },
      (error) => {
        console.error('Error subscribing to club updates:', error);
      }
    );
    
    this.listeners.set(listenerId, unsubscribe);
    
    return () => {
      unsubscribe();
      this.listeners.delete(listenerId);
    };
  }

  public subscribeToEventUpdates(
    eventId: string,
    callback: (data: RealTimeEventData) => void,
    currentUserId?: string
  ): () => void {
    const listenerId = `event_${eventId}_${Date.now()}`;
    
    const unsubscribe = this.db.collection('events').doc(eventId).onSnapshot(
      async (doc) => {
        if (doc.exists) {
          try {
            const data = await this.getRealTimeEventData(eventId, currentUserId);
            callback(data);
          } catch (error) {
            console.error('Error in event update callback:', error);
          }
        }
      },
      (error) => {
        console.error('Error subscribing to event updates:', error);
      }
    );
    
    this.listeners.set(listenerId, unsubscribe);
    
    return () => {
      unsubscribe();
      this.listeners.delete(listenerId);
    };
  }

  /**
   * 🧹 Cleanup
   */
  public clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }

  public unsubscribeAll(): void {
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners.clear();
  }

  public destroy(): void {
    this.unsubscribeAll();
    this.clearCache();
  }
}

// Export singleton instance
const realTimeDataSyncService = RealTimeDataSyncService.getInstance();
export default realTimeDataSyncService;



































