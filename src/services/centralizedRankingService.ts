/**
 * Merkezi Sıralama Servisi
 * Tüm sıralama hesaplamalarını tek noktadan yönetir
 */

import { getFirebaseCompatSync } from '../firebase/compat';
import { performanceOptimizer } from '../utils/performanceOptimizer';
import { optimizedFirebase } from './optimizedFirebaseService';

const firebase = getFirebaseCompatSync();

export interface UserRankData {
  userId: string;
  totalPoints: number;
  rank: number;
  level: number;
  streakCount: number;
  weeklyPoints: number;
  monthlyPoints: number;
  lastUpdated: Date;
}

export interface RankingFilter {
  university?: string;
  department?: string;
  userType?: 'student' | 'club';
  limit?: number;
}

class CentralizedRankingService {
  private db = getFirebaseCompatSync().firestore();
  private rankCache = new Map<string, UserRankData>();
  private lastCacheUpdate = 0;
  private CACHE_DURATION = 30000; // 30 saniye

  /**
   * Kullanıcının güncel rank bilgisini al
   */
  async getUserRank(userId: string, forceRefresh = true): Promise<UserRankData | null> {
    try {
      // Always force refresh for real-time accuracy
      if (!forceRefresh && this.isCacheValid()) {
        const cached = this.rankCache.get(userId);
        if (cached) {
          console.log('📊 CentralizedRanking: Using cached rank for', userId, cached.rank);
          return cached;
        }
      }

      // Kullanıcının score bilgisini al - optimized
      const userScoreData = await optimizedFirebase.readDocument('userScores', userId);
      if (!userScoreData) {
        console.warn('⚠️ CentralizedRanking: No score data for user', userId);
        return null;
      }

      // Kullanıcının user tipini kontrol et - optimized
      const userData = await optimizedFirebase.readDocument('users', userId);
      if (!userData) return null;
      
      const userType = userData?.userType || userData?.accountType;

      console.log('🔍 CentralizedRanking: Getting rank for', userId, 'type:', userType, 'points:', userScoreData.totalPoints);

      // Aynı tipteki kullanıcılar arasında rank hesapla
      const rank = await this.calculateUserRank(userId, userScoreData.totalPoints || 0, userType);

      const rankData: UserRankData = {
        userId,
        totalPoints: userScoreData.totalPoints || 0,
        rank,
  level: typeof userScoreData.level === 'number' ? userScoreData.level : 0,
        streakCount: userScoreData.streakCount || 0,
        weeklyPoints: userScoreData.weeklyPoints || 0,
        monthlyPoints: userScoreData.monthlyPoints || 0,
        lastUpdated: new Date()
      };

      // Cache'e kaydet
      this.rankCache.set(userId, rankData);

      console.log('📊 CentralizedRanking: Updated rank for', userId, 'rank:', rank, 'points:', userScoreData.totalPoints);
      return rankData;

    } catch (error) {
      console.error('❌ CentralizedRanking: Error getting user rank:', error);
      return null;
    }
  }

  /**
   * Kullanıcının sıralamasını hesapla
   */
  private async calculateUserRank(userId: string, userPoints: number, userType?: string): Promise<number> {
    try {
      // Kulüp ve öğrenci için farklı sıralama hesapla
      let query = this.db.collection('userScores').orderBy('totalPoints', 'desc');
      const allScoresSnapshot = await query.get();
      const relevantScores: { id: string; points: number }[] = [];

      for (const doc of allScoresSnapshot.docs) {
        const scoreData = doc.data();
        
        // User tipini kontrol et
        const userDoc = await this.db.collection('users').doc(doc.id).get();
        const userData = userDoc.data();
        
        // userType'a göre filtreleme yap
        if (userType === 'club') {
          // Kulüp hesapları için sadece kulüp hesaplarını dahil et
          if (userData?.userType === 'club' || userData?.accountType === 'club') {
            relevantScores.push({
              id: doc.id,
              points: scoreData.totalPoints || 0
            });
          }
        } else {
          // Öğrenci hesapları için kulüp olmayan hesapları dahil et
          if (userData?.userType !== 'club' && userData?.accountType !== 'club') {
            relevantScores.push({
              id: doc.id,
              points: scoreData.totalPoints || 0
            });
          }
        }
      }

      // Puanlara göre sırala
      relevantScores.sort((a, b) => b.points - a.points);

      // Kullanıcının sıralamasını bul
      const userIndex = relevantScores.findIndex(score => score.id === userId);
  // Return 0 when user has no rank yet (no points or not present), to align with app-wide defaults
  return userIndex >= 0 ? userIndex + 1 : 0;

    } catch (error) {
      console.error('❌ CentralizedRanking: Error calculating rank:', error);
  // On error, prefer a non-misleading default rank of 0
  return 0;
    }
  }

  /**
   * Liderlik tablosu al (merkezi)
   */
  async getLeaderboard(filter: RankingFilter = {}): Promise<UserRankData[]> {
    try {
      let query = this.db.collection('userScores').orderBy('totalPoints', 'desc');

      if (filter.limit) {
        query = query.limit(filter.limit * 3); // Daha fazla al, sonra filtrele
      }

      const snapshot = await query.get();
      const leaderboard: UserRankData[] = [];

      for (let i = 0; i < snapshot.docs.length; i++) {
        const doc = snapshot.docs[i];
        const scoreData = doc.data();

        // User tipini kontrol et
        const userDoc = await this.db.collection('users').doc(doc.id).get();
        const userData = userDoc.data();

        // Filter'a göre kullanıcı tipini kontrol et
        let shouldInclude = false;
        
        if (filter.userType === 'club') {
          // Kulüp leaderboard'u
          shouldInclude = userData?.userType === 'club' || userData?.accountType === 'club';
        } else if (filter.userType === 'student') {
          // Öğrenci leaderboard'u
          shouldInclude = userData?.userType !== 'club' && userData?.accountType !== 'club';
        } else {
          // Varsayılan: öğrenci leaderboard'u (eski davranış)
          shouldInclude = userData?.userType !== 'club' && userData?.accountType !== 'club';
        }

        if (shouldInclude) {
          // Veri doğrulaması ve düzeltmesi
          let validatedTotalPoints = scoreData.totalPoints || 0;
          
          // Eğer puan çok düşükse, gerçek verilerden hesapla
          if (validatedTotalPoints < 10) {
            console.log(`⚠️ Low points detected for ${doc.id}, recalculating...`);
            validatedTotalPoints = await this.recalculateUserPoints(doc.id, userData);
            
            // Düzeltilmiş puanı kaydet
            await this.db.collection('userScores').doc(doc.id).update({
              totalPoints: validatedTotalPoints,
              lastRecalculated: new Date()
            }).catch(error => {
              console.error('❌ Error updating recalculated points:', error);
            });
          }
          
          const rankData: UserRankData = {
            userId: doc.id,
            totalPoints: validatedTotalPoints,
            rank: leaderboard.length + 1, // Filtrelenmiş sıralama
            level: typeof scoreData.level === 'number' ? scoreData.level : Math.floor(validatedTotalPoints / 1000) + 1,
            streakCount: scoreData.streakCount || 0,
            weeklyPoints: scoreData.weeklyPoints || 0,
            monthlyPoints: scoreData.monthlyPoints || 0,
            lastUpdated: new Date()
          };

          leaderboard.push(rankData);
          
          // Cache'e kaydet
          this.rankCache.set(doc.id, rankData);

          // İstenen limit'e ulaştık mı?
          if (filter.limit && leaderboard.length >= filter.limit) {
            break;
          }
        }
      }

      this.lastCacheUpdate = Date.now();
      console.log(`📊 CentralizedRanking: Updated ${filter.userType || 'student'} leaderboard cache with`, leaderboard.length, 'entries');

      return leaderboard;

    } catch (error) {
      console.error('❌ CentralizedRanking: Error getting leaderboard:', error);
      return [];
    }
  }

  /**
   * Cache'i temizle - real-time updates için
   */
  clearCache(): void {
    this.rankCache.clear();
    this.lastCacheUpdate = 0;
    console.log('🧹 CentralizedRanking: Cache cleared for real-time updates');
  }

  /**
   * Cache geçerli mi kontrol et
   */
  private isCacheValid(): boolean {
    return Date.now() - this.lastCacheUpdate < this.CACHE_DURATION;
  }

  /**
   * Birden fazla kullanıcının rank bilgisini toplu al
   */
  async getMultipleUserRanks(userIds: string[]): Promise<Map<string, UserRankData>> {
    const results = new Map<string, UserRankData>();

    for (const userId of userIds) {
      const rankData = await this.getUserRank(userId);
      if (rankData) {
        results.set(userId, rankData);
      }
    }

    return results;
  }

  /**
   * Real-time listener kurarak rank değişikliklerini izle
   */
  subscribeToUserRank(userId: string, callback: (rankData: UserRankData | null) => void): () => void {
    console.log('🔄 CentralizedRanking: Setting up real-time listener for', userId);

    const unsubscribe = this.db.collection('userScores')
      .doc(userId)
      .onSnapshot(async (doc) => {
        if (doc.exists) {
          const rankData = await this.getUserRank(userId, true); // Force refresh
          callback(rankData);
        } else {
          callback(null);
        }
      });

    return unsubscribe;
  }

  /**
   * Kullanıcının gerçek puanlarını hesapla
   */
  private async recalculateUserPoints(userId: string, userData: any): Promise<number> {
    try {
      const userType = userData?.userType || userData?.accountType;
      
      if (userType === 'club') {
        return await this.calculateClubPoints(userId);
      } else {
        return await this.calculateStudentPoints(userId);
      }
    } catch (error) {
      console.error(`❌ Error recalculating points for ${userId}:`, error);
      return 0;
    }
  }

  /**
   * Öğrenci için gerçek puanları hesapla
   */
  private async calculateStudentPoints(userId: string): Promise<number> {
    let totalPoints = 0;
    
    try {
      // Katıldığı etkinlikler (20 puan each)
      const attendeesQuery = await this.db
        .collection('eventAttendees')
        .where('userId', '==', userId)
        .get();
      totalPoints += attendeesQuery.size * 20;
      
      // Beğeniler (5 puan each)
      const likesQuery = await this.db
        .collection('eventLikes')
        .where('userId', '==', userId)
        .get();
      totalPoints += likesQuery.size * 5;
      
      // Yorumlar (10 puan each) - tüm etkinliklerde
      const eventsQuery = await this.db.collection('events').get();
      let commentCount = 0;
      
      for (const eventDoc of eventsQuery.docs) {
        const commentsQuery = await this.db
          .collection('events')
          .doc(eventDoc.id)
          .collection('comments')
          .where('userId', '==', userId)
          .get();
        commentCount += commentsQuery.size;
      }
      totalPoints += commentCount * 10;
      
      // Kulüp üyelikleri (15 puan each)
      const membershipsQuery = await this.db
        .collection('clubMembers')
        .where('userId', '==', userId)
        .get();
      totalPoints += membershipsQuery.size * 15;
      
      console.log(`📊 Recalculated student points for ${userId}: ${totalPoints}`);
      return totalPoints;
      
    } catch (error) {
      console.error(`❌ Error calculating student points for ${userId}:`, error);
      return 0;
    }
  }

  /**
   * Kulüp için gerçek puanları hesapla
   */
  private async calculateClubPoints(clubId: string): Promise<number> {
    let totalPoints = 0;
    
    try {
      // Etkinlikler (50 puan each)
      const eventsQuery = await this.db
        .collection('events')
        .where('clubId', '==', clubId)
        .get();
      totalPoints += eventsQuery.size * 50;
      
      // Üyeler (10 puan each)
      const membersQuery = await this.db
        .collection('clubMembers')
        .where('clubId', '==', clubId)
        .get();
      totalPoints += membersQuery.size * 10;
      
      // Etkinlik etkileşimleri
      let interactionPoints = 0;
      for (const eventDoc of eventsQuery.docs) {
        const eventId = eventDoc.id;
        
        // Beğeniler (2 puan each)
        const likesQuery = await this.db
          .collection('eventLikes')
          .where('eventId', '==', eventId)
          .get();
        interactionPoints += likesQuery.size * 2;
        
        // Yorumlar (5 puan each)
        const commentsQuery = await this.db
          .collection('events')
          .doc(eventId)
          .collection('comments')
          .get();
        interactionPoints += commentsQuery.size * 5;
        
        // Katılımcılar (3 puan each)
        const attendeesQuery = await this.db
          .collection('eventAttendees')
          .where('eventId', '==', eventId)
          .get();
        interactionPoints += attendeesQuery.size * 3;
      }
      
      totalPoints += interactionPoints;
      console.log(`📊 Recalculated club points for ${clubId}: ${totalPoints}`);
      return totalPoints;
      
    } catch (error) {
      console.error(`❌ Error calculating club points for ${clubId}:`, error);
      return 0;
    }
  }
}

export const centralizedRankingService = new CentralizedRankingService();
