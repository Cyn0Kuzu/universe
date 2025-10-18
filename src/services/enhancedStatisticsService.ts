import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

interface UserStatistics {
  userId: string;
  totalLikes: number;
  totalComments: number;
  totalParticipations: number;
  totalFollowers: number;
  totalFollowing: number;
  totalClubsJoined: number;
  totalEventsCreated?: number; // Kulüp hesapları için
  lastUpdated: firebase.firestore.Timestamp;
}

interface EventStatistics {
  eventId: string;
  totalLikes: number;
  totalComments: number;
  totalParticipants: number;
  lastUpdated: firebase.firestore.Timestamp;
}

interface ClubStatistics {
  clubId: string;
  totalEvents: number;
  totalMembers: number;
  totalLikes: number;
  totalComments: number;
  totalParticipants: number;
  totalFollowers: number;
  lastUpdated: firebase.firestore.Timestamp;
}

class EnhancedStatisticsService {
  private static instance: EnhancedStatisticsService;
  private db: firebase.firestore.Firestore;
  private statisticsCache: Map<string, any> = new Map();
  private listeners: Map<string, () => void> = new Map();

  private constructor() {
    this.db = firebase.firestore();
  }

  public static getInstance(): EnhancedStatisticsService {
    if (!EnhancedStatisticsService.instance) {
      EnhancedStatisticsService.instance = new EnhancedStatisticsService();
    }
    return EnhancedStatisticsService.instance;
  }

  /**
   * Öğrenci istatistiklerini hesapla ve güncelle
   */
  async calculateUserStatistics(userId: string): Promise<UserStatistics> {
    try {
      console.log(`📊 Calculating statistics for user: ${userId}`);

      const [
        likesSnapshot,
        commentsSnapshot,
        participationsSnapshot,
        followersSnapshot,
        followingSnapshot,
        clubsSnapshot,
        eventsCreatedSnapshot
      ] = await Promise.all([
        // Toplam beğeni sayısı
        this.db.collection('eventLikes')
          .where('userId', '==', userId)
          .get(),
        
        // Toplam yorum sayısı
        this.db.collection('eventComments')
          .where('userId', '==', userId)
          .get(),
        
        // Toplam katılım sayısı
        this.db.collection('eventAttendees')
          .where('userId', '==', userId)
          .get(),
        
        // Takipçi sayısı
        this.db.collection('users').doc(userId).get()
          .then(doc => doc.exists ? (doc.data()?.followers?.length || 0) : 0),
        
        // Takip edilen sayısı
        this.db.collection('users').doc(userId).get()
          .then(doc => doc.exists ? (doc.data()?.following?.length || 0) : 0),
        
        // Katıldığı kulüp sayısı
        this.db.collection('clubMembers')
          .where('userId', '==', userId)
          .where('status', '==', 'approved')
          .get(),
        
        // Oluşturduğu etkinlik sayısı (kulüp hesapları için)
        this.db.collection('events')
          .where('organizerId', '==', userId)
          .get()
      ]);

      const statistics: UserStatistics = {
        userId,
        totalLikes: likesSnapshot.docs.length,
        totalComments: commentsSnapshot.docs.length,
        totalParticipations: participationsSnapshot.docs.length,
        totalFollowers: followersSnapshot,
        totalFollowing: followingSnapshot,
        totalClubsJoined: clubsSnapshot.docs.length,
        totalEventsCreated: eventsCreatedSnapshot.docs.length,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp() as firebase.firestore.Timestamp
      };

      // Cache'e kaydet
      this.statisticsCache.set(`user_${userId}`, statistics);

      // Firestore'a kaydet
      await this.db.collection('userStatistics').doc(userId).set(statistics, { merge: true });

      console.log(`✅ User statistics calculated:`, statistics);
      return statistics;

    } catch (error) {
      console.error(`❌ Error calculating user statistics for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Etkinlik istatistiklerini hesapla ve güncelle
   */
  async calculateEventStatistics(eventId: string): Promise<EventStatistics> {
    try {
      console.log(`📊 Calculating statistics for event: ${eventId}`);

      const [
        likesSnapshot,
        commentsSnapshot,
        participantsSnapshot
      ] = await Promise.all([
        // Toplam beğeni sayısı
        this.db.collection('eventLikes')
          .where('eventId', '==', eventId)
          .get(),
        
        // Toplam yorum sayısı
        this.db.collection('eventComments')
          .where('eventId', '==', eventId)
          .get(),
        
        // Toplam katılımcı sayısı
        this.db.collection('eventAttendees')
          .where('eventId', '==', eventId)
          .get()
      ]);

      const statistics: EventStatistics = {
        eventId,
        totalLikes: likesSnapshot.docs.length,
        totalComments: commentsSnapshot.docs.length,
        totalParticipants: participantsSnapshot.docs.length,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp() as firebase.firestore.Timestamp
      };

      // Cache'e kaydet
      this.statisticsCache.set(`event_${eventId}`, statistics);

      // Firestore'a kaydet
      await this.db.collection('eventStatistics').doc(eventId).set(statistics, { merge: true });

      console.log(`✅ Event statistics calculated:`, statistics);
      return statistics;

    } catch (error) {
      console.error(`❌ Error calculating event statistics for ${eventId}:`, error);
      throw error;
    }
  }

  /**
   * Kulüp istatistiklerini hesapla ve güncelle
   */
  async calculateClubStatistics(clubId: string): Promise<ClubStatistics> {
    try {
      console.log(`📊 Calculating statistics for club: ${clubId}`);

      const [
        eventsSnapshot,
        membersSnapshot,
        likesSnapshot,
        commentsSnapshot,
        participantsSnapshot,
        followersSnapshot
      ] = await Promise.all([
        // Toplam etkinlik sayısı
        this.db.collection('events')
          .where('organizerId', '==', clubId)
          .get(),
        
        // Toplam üye sayısı
        this.db.collection('clubMembers')
          .where('clubId', '==', clubId)
          .where('status', '==', 'approved')
          .get(),
        
        // Toplam beğeni sayısı (kulübün etkinliklerindeki)
        this.db.collection('events')
          .where('organizerId', '==', clubId)
          .get()
          .then(async (events) => {
            let totalLikes = 0;
            for (const event of events.docs) {
              const likes = await this.db.collection('eventLikes')
                .where('eventId', '==', event.id)
                .get();
              totalLikes += likes.docs.length;
            }
            return totalLikes;
          }),
        
        // Toplam yorum sayısı (kulübün etkinliklerindeki)
        this.db.collection('events')
          .where('organizerId', '==', clubId)
          .get()
          .then(async (events) => {
            let totalComments = 0;
            for (const event of events.docs) {
              const comments = await this.db.collection('eventComments')
                .where('eventId', '==', event.id)
                .get();
              totalComments += comments.docs.length;
            }
            return totalComments;
          }),
        
        // Toplam katılımcı sayısı (kulübün etkinliklerindeki)
        this.db.collection('events')
          .where('organizerId', '==', clubId)
          .get()
          .then(async (events) => {
            let totalParticipants = 0;
            for (const event of events.docs) {
              const participants = await this.db.collection('eventAttendees')
                .where('eventId', '==', event.id)
                .get();
              totalParticipants += participants.docs.length;
            }
            return totalParticipants;
          }),
        
        // Takipçi sayısı
        this.db.collection('users').doc(clubId).get()
          .then(doc => doc.exists ? (doc.data()?.followers?.length || 0) : 0)
      ]);

      const statistics: ClubStatistics = {
        clubId,
        totalEvents: eventsSnapshot.docs.length,
        totalMembers: membersSnapshot.docs.length,
        totalLikes: likesSnapshot,
        totalComments: commentsSnapshot,
        totalParticipants: participantsSnapshot,
        totalFollowers: followersSnapshot,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp() as firebase.firestore.Timestamp
      };

      // Cache'e kaydet
      this.statisticsCache.set(`club_${clubId}`, statistics);

      // Firestore'a kaydet
      await this.db.collection('clubStatistics').doc(clubId).set(statistics, { merge: true });

      console.log(`✅ Club statistics calculated:`, statistics);
      return statistics;

    } catch (error) {
      console.error(`❌ Error calculating club statistics for ${clubId}:`, error);
      throw error;
    }
  }

  /**
   * İstatistikleri gerçek zamanlı dinle
   */
  subscribeToStatistics(type: 'user' | 'event' | 'club', id: string): void {
    const key = `${type}_${id}`;
    
    if (this.listeners.has(key)) {
      console.log(`👂 Already subscribed to ${type} statistics for: ${id}`);
      return;
    }

    console.log(`👂 Subscribing to ${type} statistics for: ${id}`);
    
    const collectionName = `${type}Statistics`;
    const docRef = this.db.collection(collectionName).doc(id);

    const unsubscribe = docRef.onSnapshot(
      (docSnapshot) => {
        if (docSnapshot.exists) {
          const statistics = { id: docSnapshot.id, ...docSnapshot.data() };
          this.statisticsCache.set(key, statistics);
          // Callback sistemi kullanılabilir
          console.log(`✅ Real-time ${type} statistics update received for ${id}`);
        }
      },
      (error) => {
        console.error(`❌ Error listening to ${type} statistics ${id}:`, error);
        // Error callback sistemi kullanılabilir
      }
    );

    this.listeners.set(key, unsubscribe);
  }

  /**
   * İstatistik dinlemesini durdur
   */
  unsubscribeFromStatistics(type: 'user' | 'event' | 'club', id: string): void {
    const key = `${type}_${id}`;
    const unsubscribe = this.listeners.get(key);
    
    if (unsubscribe) {
      unsubscribe();
      this.listeners.delete(key);
      console.log(`🛑 Unsubscribed from ${type} statistics for: ${id}`);
    }
  }

  /**
   * Cache'den istatistik al
   */
  getStatistics(type: 'user' | 'event' | 'club', id: string): any {
    const key = `${type}_${id}`;
    return this.statisticsCache.get(key);
  }

  /**
   * Tüm istatistikleri yeniden hesapla
   */
  async recalculateAllStatistics(): Promise<void> {
    try {
      console.log('🔄 Recalculating all statistics...');

      // Kullanıcı istatistikleri
      const usersSnapshot = await this.db.collection('users').get();
      for (const userDoc of usersSnapshot.docs) {
        await this.calculateUserStatistics(userDoc.id);
      }

      // Etkinlik istatistikleri
      const eventsSnapshot = await this.db.collection('events').get();
      for (const eventDoc of eventsSnapshot.docs) {
        await this.calculateEventStatistics(eventDoc.id);
      }

      // Kulüp istatistikleri
      const clubsSnapshot = await this.db.collection('users')
        .where('userType', '==', 'club')
        .get();
      for (const clubDoc of clubsSnapshot.docs) {
        await this.calculateClubStatistics(clubDoc.id);
      }

      console.log('✅ All statistics recalculated successfully');
    } catch (error) {
      console.error('❌ Error recalculating all statistics:', error);
      throw error;
    }
  }

  /**
   * İstatistik güncellemesini tetikle
   */
  async triggerStatisticsUpdate(type: 'user' | 'event' | 'club', id: string): Promise<void> {
    try {
      switch (type) {
        case 'user':
          await this.calculateUserStatistics(id);
          break;
        case 'event':
          await this.calculateEventStatistics(id);
          break;
        case 'club':
          await this.calculateClubStatistics(id);
          break;
      }
    } catch (error) {
      console.error(`❌ Error triggering ${type} statistics update for ${id}:`, error);
    }
  }
}

export const enhancedStatisticsService = EnhancedStatisticsService.getInstance();


