import { firebase } from '../firebase/config';

/**
 * Daily Login Service
 * Kullanıcıların günlük giriş yapma takibini sağlar
 */

interface DailyLoginRecord {
  userId: string;
  loginDate: any; // firebase.firestore.Timestamp
  streakCount: number;
  totalLoginDays: number;
  lastLoginDate?: any; // firebase.firestore.Timestamp
  pointsEarned: number;
}

export class DailyLoginService {
  private static instance: DailyLoginService;
  private db: any; // firebase.firestore.Firestore

  private constructor() {
    this.db = firebase.firestore();
  }

  public static getInstance(): DailyLoginService {
    if (!DailyLoginService.instance) {
      DailyLoginService.instance = new DailyLoginService();
    }
    return DailyLoginService.instance;
  }

  /**
   * Kullanıcının günlük girişini kaydet
   */
  async recordDailyLogin(userId: string): Promise<{
    isFirstLoginToday: boolean;
    streakCount: number;
    pointsEarned: number;
  }> {
    try {
      const today = this.getToday();
      const userLoginRef = this.db.collection('dailyLogins').doc(userId);
      
      // Kullanıcının mevcut login verilerini al
      const userLoginDoc = await userLoginRef.get();
      const currentData = userLoginDoc.data() as DailyLoginRecord;
      
      // Bugün zaten giriş yapmış mı kontrol et
      if (currentData?.lastLoginDate) {
        const lastLoginDate = this.timestampToDateString(currentData.lastLoginDate);
        if (lastLoginDate === today) {
          return {
            isFirstLoginToday: false,
            streakCount: currentData.streakCount || 1,
            pointsEarned: 0
          };
        }
      }
      
      // Streak hesapla
      let newStreakCount = 1;
      let pointsEarned = 10; // Base points for daily login
      
      if (currentData?.lastLoginDate) {
        const lastLoginDate = this.timestampToDateString(currentData.lastLoginDate);
        const yesterday = this.getYesterday();
        
        if (lastLoginDate === yesterday) {
          // Consecutive day login - increase streak
          newStreakCount = (currentData.streakCount || 1) + 1;
          
          // Bonus points for streak
          if (newStreakCount >= 7) pointsEarned += 30; // Weekly bonus
          else if (newStreakCount >= 3) pointsEarned += 15; // 3-day bonus
          else pointsEarned += 5; // Consecutive day bonus
          
        } else {
          // Streak broken, reset to 1
          newStreakCount = 1;
        }
      }
      
      // TEMPORARILY DISABLED: Günlük giriş kaydını güncelle - permission sorunları için
      // const newRecord: DailyLoginRecord = {
      //   userId,
      //   loginDate: firebase.firestore.Timestamp.now(),
      //   lastLoginDate: firebase.firestore.Timestamp.now(),
      //   streakCount: newStreakCount,
      //   totalLoginDays: (currentData?.totalLoginDays || 0) + 1,
      //   pointsEarned
      // };
      
      // await userLoginRef.set(newRecord, { merge: true });
      
      console.log('TEMPORARILY DISABLED: Daily login recording to avoid permission issues');
      console.log(`Daily login for user ${userId} - streak: ${newStreakCount}, points: ${pointsEarned}`);
      
      // Kullanıcı profilindeki streak sayısını güncelle - ALSO DISABLED
      // await this.updateUserStreak(userId, newStreakCount);
      
      return {
        isFirstLoginToday: true,
        streakCount: newStreakCount,
        pointsEarned
      };
      
    } catch (error) {
      console.error('Error recording daily login:', error);
      return {
        isFirstLoginToday: false,
        streakCount: 1,
        pointsEarned: 0
      };
    }
  }

  /**
   * Kullanıcının mevcut streak bilgisini al
   */
  async getUserStreak(userId: string): Promise<{
    streakCount: number;
    totalLoginDays: number;
    lastLoginDate?: Date;
  }> {
    try {
      // TEMPORARILY DISABLED: Database okuma - permission sorunları için
      console.log('TEMPORARILY DISABLED: Daily login streak query to avoid permission issues');
      console.log(`User ${userId} streak query disabled - returning default values`);
      
      // Default değerler döndür
      return {
        streakCount: 0,
        totalLoginDays: 0
      };
      
    } catch (error) {
      console.error('Error getting user streak (disabled):', error);
      return {
        streakCount: 0,
        totalLoginDays: 0
      };
    }
  }

  /**
   * Tüm kullanıcıların streak istatistiklerini al (leaderboard için)
   */
  async getStreakLeaderboard(limit: number = 50): Promise<Array<{
    userId: string;
    streakCount: number;
    totalLoginDays: number;
  }>> {
    try {
      // TEMPORARILY DISABLED: Database okuma - permission sorunları için
      console.log('TEMPORARILY DISABLED: Streak leaderboard query to avoid permission issues');
      console.log('Returning empty leaderboard array');
      
      // Boş array döndür
      return [];
      
    } catch (error) {
      console.error('Error getting streak leaderboard (disabled):', error);
      return [];
    }
  }

  /**
   * Kullanıcı profilindeki streak bilgisini güncelle
   */
  private async updateUserStreak(userId: string, streakCount: number): Promise<void> {
    try {
      // TEMPORARILY DISABLED: Kullanıcı streak güncelleme - permission sorunları için
      // await this.db.collection('users').doc(userId).update({
      //   currentStreak: streakCount,
      //   lastStreakUpdate: firebase.firestore.Timestamp.now()
      // });
      
      console.log('TEMPORARILY DISABLED: User streak update to avoid permission issues');
      console.log(`User ${userId} streak would be updated to: ${streakCount}`);
    } catch (error) {
      console.error('User streak update disabled:', error);
    }
  }

  /**
   * Bugünün tarihini YYYY-MM-DD formatında döndür
   */
  private getToday(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  /**
   * Dünün tarihini YYYY-MM-DD formatında döndür
   */
  private getYesterday(): string {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }

  /**
   * Firebase Timestamp'ı YYYY-MM-DD formatında string'e çevir
   */
  private timestampToDateString(timestamp: any): string { // firebase.firestore.Timestamp
    return timestamp.toDate().toISOString().split('T')[0];
  }

  /**
   * Kullanıcının belirli bir gün giriş yapıp yapmadığını kontrol et
   */
  async hasUserLoggedInToday(userId: string): Promise<boolean> {
    try {
      const userLoginRef = this.db.collection('dailyLogins').doc(userId);
      const userLoginDoc = await userLoginRef.get();
      
      if (!userLoginDoc.exists) {
        return false;
      }
      
      const data = userLoginDoc.data() as DailyLoginRecord;
      
      if (!data.lastLoginDate) {
        return false;
      }
      
      const lastLoginDate = this.timestampToDateString(data.lastLoginDate);
      const today = this.getToday();
      
      return lastLoginDate === today;
      
    } catch (error) {
      console.error('Error checking daily login:', error);
      return false;
    }
  }

  /**
   * Kullanıcının haftalık giriş istatistiklerini al
   */
  async getWeeklyLoginStats(userId: string): Promise<{
    daysLoggedThisWeek: number;
    consecutiveDays: number;
    weeklyGoalProgress: number; // 0-100 percentage
  }> {
    try {
      // Son 7 günün login kayıtlarını kontrol et
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const snapshot = await this.db
        .collection('dailyLogins')
        .doc(userId)
        .get();
      
      if (!snapshot.exists) {
        return {
          daysLoggedThisWeek: 0,
          consecutiveDays: 0,
          weeklyGoalProgress: 0
        };
      }
      
      const data = snapshot.data() as DailyLoginRecord;
      const streakInfo = await this.getUserStreak(userId);
      
      // Haftalık hedef: 7 günde 5 gün giriş
      const weeklyGoal = 5;
      const progress = Math.min((streakInfo.streakCount / weeklyGoal) * 100, 100);
      
      return {
        daysLoggedThisWeek: Math.min(streakInfo.streakCount, 7),
        consecutiveDays: streakInfo.streakCount,
        weeklyGoalProgress: progress
      };
      
    } catch (error) {
      console.error('Error getting weekly stats:', error);
      return {
        daysLoggedThisWeek: 0,
        consecutiveDays: 0,
        weeklyGoalProgress: 0
      };
    }
  }
}

// Singleton instance export
export const dailyLoginService = DailyLoginService.getInstance();
export default dailyLoginService;
