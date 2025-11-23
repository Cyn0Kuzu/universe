import type firebase from 'firebase/compat/app';
import {
  getFirebase,
  initializeFirebaseServices,
  firebaseConfig,
} from '../firebase/config';

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
  private db: firebase.firestore.Firestore | null = null;
  private firebaseCompat: typeof firebase | null = null;
  private statisticsCache: Map<string, any> = new Map();
  private listeners: Map<string, () => void> = new Map();
  private initializationPromise: Promise<void> | null = null;

  private constructor() {
  }

  public static getInstance(): EnhancedStatisticsService {
    if (!EnhancedStatisticsService.instance) {
      EnhancedStatisticsService.instance = new EnhancedStatisticsService();
    }
    return EnhancedStatisticsService.instance;
  }

  private async ensureInitialized(): Promise<void> {
    if (this.db) {
      return;
    }

    if (!this.initializationPromise) {
      this.initializationPromise = (async () => {
        try {
          await initializeFirebaseServices();
          const firebaseCompat = await getFirebase();

          if (!firebaseCompat) {
            throw new Error('Firebase compat SDK not available');
          }

          if (!firebaseCompat.apps?.length) {
            // initializeFirebaseServices should ensure an app exists, but double-check
            firebaseCompat.initializeApp?.(firebaseConfig);
          }

          if (!firebaseCompat.firestore) {
            throw new Error('Firebase Firestore compat API not available');
          }

          this.firebaseCompat = firebaseCompat;
          this.db = firebaseCompat.firestore();
          console.log('✅ EnhancedStatisticsService connected to Firestore');
        } catch (error) {
          this.db = null;
          this.firebaseCompat = null;
          console.error('❌ Failed to initialize EnhancedStatisticsService Firestore:', error);
          throw error;
        }
      })().finally(() => {
        this.initializationPromise = null;
      });
    }

    await this.initializationPromise;
  }

  private async getDb(): Promise<firebase.firestore.Firestore> {
    await this.ensureInitialized();
    if (!this.db) {
      throw new Error('Firebase Firestore is not initialized');
    }
    return this.db;
  }

  private getFieldValue() {
    const fieldValue = this.firebaseCompat?.firestore?.FieldValue;
    if (!fieldValue) {
      throw new Error('Firebase FieldValue is not available');
    }
    return fieldValue;
  }

  /**
   * Öğrenci istatistiklerini hesapla ve güncelle
   */
  async calculateUserStatistics(userId: string): Promise<UserStatistics> {
    try {
      const db = await this.getDb();
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
        db.collection('eventLikes')
          .where('userId', '==', userId)
          .get(),
        
        // Toplam yorum sayısı
        db.collection('eventComments')
          .where('userId', '==', userId)
          .get(),
        
        // Toplam katılım sayısı
        db.collection('eventAttendees')
          .where('userId', '==', userId)
          .get(),
        
        // Takipçi sayısı
        db.collection('users').doc(userId).get()
          .then(doc => doc.exists ? (doc.data()?.followers?.length || 0) : 0),
        
        // Takip edilen sayısı
        db.collection('users').doc(userId).get()
          .then(doc => doc.exists ? (doc.data()?.following?.length || 0) : 0),
        
        // Katıldığı kulüp sayısı
        db.collection('clubMembers')
          .where('userId', '==', userId)
          .where('status', '==', 'approved')
          .get(),
        
        // Oluşturduğu etkinlik sayısı (kulüp hesapları için)
        db.collection('events')
          .where('organizerId', '==', userId)
          .get()
      ]);

      const FieldValue = this.getFieldValue();
      const statistics: UserStatistics = {
        userId,
        totalLikes: likesSnapshot.docs.length,
        totalComments: commentsSnapshot.docs.length,
        totalParticipations: participationsSnapshot.docs.length,
        totalFollowers: followersSnapshot,
        totalFollowing: followingSnapshot,
        totalClubsJoined: clubsSnapshot.docs.length,
        totalEventsCreated: eventsCreatedSnapshot.docs.length,
        lastUpdated: FieldValue.serverTimestamp() as firebase.firestore.Timestamp
      };

      // Cache'e kaydet
      this.statisticsCache.set(`user_${userId}`, statistics);

      // Firestore'a kaydet
      await db.collection('userStatistics').doc(userId).set(statistics, { merge: true });

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
      const db = await this.getDb();
      console.log(`📊 Calculating statistics for event: ${eventId}`);

      const [
        likesSnapshot,
        commentsSnapshot,
        participantsSnapshot
      ] = await Promise.all([
        // Toplam beğeni sayısı
        db.collection('eventLikes')
          .where('eventId', '==', eventId)
          .get(),
        
        // Toplam yorum sayısı
        db.collection('eventComments')
          .where('eventId', '==', eventId)
          .get(),
        
        // Toplam katılımcı sayısı
        db.collection('eventAttendees')
          .where('eventId', '==', eventId)
          .get()
      ]);

      const FieldValue = this.getFieldValue();
      const statistics: EventStatistics = {
        eventId,
        totalLikes: likesSnapshot.docs.length,
        totalComments: commentsSnapshot.docs.length,
        totalParticipants: participantsSnapshot.docs.length,
        lastUpdated: FieldValue.serverTimestamp() as firebase.firestore.Timestamp
      };

      // Cache'e kaydet
      this.statisticsCache.set(`event_${eventId}`, statistics);

      // Firestore'a kaydet
      await db.collection('eventStatistics').doc(eventId).set(statistics, { merge: true });

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
      const db = await this.getDb();
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
        db.collection('events')
          .where('organizerId', '==', clubId)
          .get(),
        
        // Toplam üye sayısı
        db.collection('clubMembers')
          .where('clubId', '==', clubId)
          .where('status', '==', 'approved')
          .get(),
        
        // Toplam beğeni sayısı (kulübün etkinliklerindeki)
        db.collection('events')
          .where('organizerId', '==', clubId)
          .get()
          .then(async (events) => {
            let totalLikes = 0;
            for (const event of events.docs) {
              const likes = await db.collection('eventLikes')
                .where('eventId', '==', event.id)
                .get();
              totalLikes += likes.docs.length;
            }
            return totalLikes;
          }),
        
        // Toplam yorum sayısı (kulübün etkinliklerindeki)
        db.collection('events')
          .where('organizerId', '==', clubId)
          .get()
          .then(async (events) => {
            let totalComments = 0;
            for (const event of events.docs) {
              const comments = await db.collection('eventComments')
                .where('eventId', '==', event.id)
                .get();
              totalComments += comments.docs.length;
            }
            return totalComments;
          }),
        
        // Toplam katılımcı sayısı (kulübün etkinliklerindeki)
        db.collection('events')
          .where('organizerId', '==', clubId)
          .get()
          .then(async (events) => {
            let totalParticipants = 0;
            for (const event of events.docs) {
              const participants = await db.collection('eventAttendees')
                .where('eventId', '==', event.id)
                .get();
              totalParticipants += participants.docs.length;
            }
            return totalParticipants;
          }),
        
        // Takipçi sayısı
        db.collection('users').doc(clubId).get()
          .then(doc => doc.exists ? (doc.data()?.followers?.length || 0) : 0)
      ]);

      const FieldValue = this.getFieldValue();
      const statistics: ClubStatistics = {
        clubId,
        totalEvents: eventsSnapshot.docs.length,
        totalMembers: membersSnapshot.docs.length,
        totalLikes: likesSnapshot,
        totalComments: commentsSnapshot,
        totalParticipants: participantsSnapshot,
        totalFollowers: followersSnapshot,
        lastUpdated: FieldValue.serverTimestamp() as firebase.firestore.Timestamp
      };

      // Cache'e kaydet
      this.statisticsCache.set(`club_${clubId}`, statistics);

      // Firestore'a kaydet
      await db.collection('clubStatistics').doc(clubId).set(statistics, { merge: true });

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
  async subscribeToStatistics(type: 'user' | 'event' | 'club', id: string): Promise<void> {
    const key = `${type}_${id}`;
    
    if (this.listeners.has(key)) {
      console.log(`👂 Already subscribed to ${type} statistics for: ${id}`);
      return;
    }

    console.log(`👂 Subscribing to ${type} statistics for: ${id}`);
    try {
      const db = await this.getDb();
      const collectionName = `${type}Statistics`;
      const docRef = db.collection(collectionName).doc(id);

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
    } catch (error) {
      console.error(`❌ Failed to subscribe to ${type} statistics for ${id}:`, error);
    }
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
      const db = await this.getDb();
      console.log('🔄 Recalculating all statistics...');

      // Kullanıcı istatistikleri
      const usersSnapshot = await db.collection('users').get();
      for (const userDoc of usersSnapshot.docs) {
        await this.calculateUserStatistics(userDoc.id);
      }

      // Etkinlik istatistikleri
      const eventsSnapshot = await db.collection('events').get();
      for (const eventDoc of eventsSnapshot.docs) {
        await this.calculateEventStatistics(eventDoc.id);
      }

      // Kulüp istatistikleri
      const clubsSnapshot = await db.collection('users')
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


