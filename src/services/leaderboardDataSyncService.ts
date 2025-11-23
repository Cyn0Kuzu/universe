import { getFirebaseCompatSync } from '../firebase/compat';

const firebase = getFirebaseCompatSync();

/**
 * Lider Tablosu Veri Doğrulama ve Güncelleme Servisi
 */
export class LeaderboardDataSyncService {
  private static instance: LeaderboardDataSyncService;
  
  static getInstance(): LeaderboardDataSyncService {
    if (!this.instance) {
      this.instance = new LeaderboardDataSyncService();
    }
    return this.instance;
  }

  /**
   * Tüm lider tablosu verilerini güncel verilerle senkronize et
   */
  async syncAllLeaderboardData(): Promise<void> {
    console.log('🔄 Starting comprehensive leaderboard data sync...');
    
    try {
      // 1. Öğrenci verilerini senkronize et
      await this.syncStudentLeaderboardData();
      
      // 2. Kulüp verilerini senkronize et  
      await this.syncClubLeaderboardData();
      
      // 3. Etkinlik verilerini senkronize et
      await this.syncEventLeaderboardData();
      
      console.log('✅ Leaderboard data sync completed successfully');
    } catch (error) {
      console.error('❌ Error during leaderboard data sync:', error);
      throw error;
    }
  }

  /**
   * Öğrenci lider tablosu verilerini güncel verilerle senkronize et
   */
  private async syncStudentLeaderboardData(): Promise<void> {
    console.log('📚 Syncing student leaderboard data...');
    
    const db = getFirebaseCompatSync().firestore();
    const batch = db.batch();
    let updateCount = 0;
    
    try {
      // Tüm öğrenci kullanıcıları al
      const studentsQuery = await db
        .collection('users')
        .where('userType', '!=', 'club')
        .get();
      
      for (const studentDoc of studentsQuery.docs) {
        const studentId = studentDoc.id;
        const studentData = studentDoc.data();
        
        // Gerçek istatistikleri hesapla
        const realStats = await this.calculateRealStudentStats(studentId);
        
        // UserScores koleksiyonunu güncelle
        const userScoreRef = db.collection('userScores').doc(studentId);
        batch.set(userScoreRef, {
          totalPoints: realStats.totalPoints,
          level: Math.floor(realStats.totalPoints / 1000) + 1,
          weeklyPoints: realStats.weeklyPoints,
          monthlyPoints: realStats.monthlyPoints,
          streakCount: realStats.streakCount,
          lastUpdated: getFirebaseCompatSync().firestore.FieldValue.serverTimestamp(),
          
          // İstatistik detayları
          eventCount: realStats.eventCount,
          likeCount: realStats.likeCount,
          commentCount: realStats.commentCount,
          joinedClubCount: realStats.joinedClubCount
        }, { merge: true });
        
        updateCount++;
        
        // Batch limit kontrolü
        if (updateCount % 400 === 0) {
          await batch.commit();
          console.log(`📊 Student batch committed: ${updateCount} users processed`);
        }
      }
      
      if (updateCount % 400 !== 0) {
        await batch.commit();
      }
      
      console.log(`✅ Student leaderboard sync completed: ${updateCount} users updated`);
      
    } catch (error) {
      console.error('❌ Error syncing student leaderboard:', error);
      throw error;
    }
  }

  /**
   * Kulüp lider tablosu verilerini güncel verilerle senkronize et
   */
  private async syncClubLeaderboardData(): Promise<void> {
    console.log('🏛️ Syncing club leaderboard data...');
    
    const db = getFirebaseCompatSync().firestore();
    const batch = db.batch();
    let updateCount = 0;
    
    try {
      // Tüm kulüp kullanıcıları al
      const clubsQuery = await db
        .collection('users')
        .where('userType', '==', 'club')
        .get();
      
      for (const clubDoc of clubsQuery.docs) {
        const clubId = clubDoc.id;
        
        // Gerçek istatistikleri hesapla
        const realStats = await this.calculateRealClubStats(clubId);
        
        // ClubScores koleksiyonunu güncelle
        const clubScoreRef = db.collection('clubScores').doc(clubId);
        batch.set(clubScoreRef, {
          totalPoints: realStats.totalPoints,
          level: Math.floor(realStats.totalPoints / 1000) + 1,
          rank: realStats.rank,
          lastUpdated: getFirebaseCompatSync().firestore.FieldValue.serverTimestamp(),
          
          // İstatistik detayları
          eventCount: realStats.eventCount,
          memberCount: realStats.memberCount,
          likeCount: realStats.likeCount,
          commentCount: realStats.commentCount,
          participantCount: realStats.participantCount
        }, { merge: true });
        
        // UserScores koleksiyonunu da güncelle (kulüpler için)
        const userScoreRef = db.collection('userScores').doc(clubId);
        batch.set(userScoreRef, {
          totalPoints: realStats.totalPoints,
          level: Math.floor(realStats.totalPoints / 1000) + 1,
          weeklyPoints: realStats.totalPoints, // Kulüpler için total ile aynı
          monthlyPoints: realStats.totalPoints,
          streakCount: 0,
          lastUpdated: getFirebaseCompatSync().firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        updateCount++;
        
        // Batch limit kontrolü
        if (updateCount % 400 === 0) {
          await batch.commit();
          console.log(`📊 Club batch committed: ${updateCount} clubs processed`);
        }
      }
      
      if (updateCount % 400 !== 0) {
        await batch.commit();
      }
      
      console.log(`✅ Club leaderboard sync completed: ${updateCount} clubs updated`);
      
    } catch (error) {
      console.error('❌ Error syncing club leaderboard:', error);
      throw error;
    }
  }

  /**
   * Etkinlik istatistiklerini senkronize et
   */
  private async syncEventLeaderboardData(): Promise<void> {
    console.log('🎉 Syncing event leaderboard data...');
    
    const db = getFirebaseCompatSync().firestore();
    
    try {
      // Tüm etkinlikleri al
      const eventsQuery = await db.collection('events').get();
      let updateCount = 0;
      
      for (const eventDoc of eventsQuery.docs) {
        const eventId = eventDoc.id;
        const eventData = eventDoc.data();
        
        // Gerçek katılımcı sayısını hesapla
        const attendeesQuery = await db
          .collection('eventAttendees')
          .where('eventId', '==', eventId)
          .get();
        
        const realAttendeeCount = attendeesQuery.size;
        
        // Gerçek beğeni sayısını hesapla
        const likesQuery = await db
          .collection('eventLikes')
          .where('eventId', '==', eventId)
          .get();
        
        const realLikeCount = likesQuery.size;
        
        // Gerçek yorum sayısını hesapla
        const commentsQuery = await db
          .collection('events')
          .doc(eventId)
          .collection('comments')
          .get();
        
        const realCommentCount = commentsQuery.size;
        
        // Event dokümanını güncelle
        await eventDoc.ref.update({
          attendeesCount: realAttendeeCount,
          likesCount: realLikeCount,
          commentsCount: realCommentCount,
          lastSyncedAt: getFirebaseCompatSync().firestore.FieldValue.serverTimestamp()
        });
        
        updateCount++;
        
        if (updateCount % 100 === 0) {
          console.log(`📊 Event sync progress: ${updateCount} events processed`);
        }
      }
      
      console.log(`✅ Event leaderboard sync completed: ${updateCount} events updated`);
      
    } catch (error) {
      console.error('❌ Error syncing event leaderboard:', error);
      throw error;
    }
  }

  /**
   * Öğrenci için gerçek istatistikleri hesapla
   */
  private async calculateRealStudentStats(studentId: string): Promise<any> {
    const db = getFirebaseCompatSync().firestore();
    
    try {
      // Katıldığı etkinlik sayısı
      const attendedEventsQuery = await db
        .collection('eventAttendees')
        .where('userId', '==', studentId)
        .get();
      
      const eventCount = attendedEventsQuery.size;
      
      // Beğeni sayısı  
      const likesQuery = await db
        .collection('eventLikes')
        .where('userId', '==', studentId)
        .get();
      
      const likeCount = likesQuery.size;
      
      // Yorum sayısı (tüm etkinliklerdeki yorumları say)
      let commentCount = 0;
      const eventsQuery = await db.collection('events').get();
      
      for (const eventDoc of eventsQuery.docs) {
        const commentsQuery = await db
          .collection('events')
          .doc(eventDoc.id)
          .collection('comments')
          .where('userId', '==', studentId)
          .get();
        
        commentCount += commentsQuery.size;
      }
      
      // Katıldığı kulüp sayısı
      const clubMemberQuery = await db
        .collection('clubMembers')
        .where('userId', '==', studentId)
        .get();
      
      const joinedClubCount = clubMemberQuery.size;
      
      // Toplam puan hesapla
      const totalPoints = (eventCount * 20) + (likeCount * 5) + (commentCount * 10) + (joinedClubCount * 15);
      
      return {
        totalPoints,
        eventCount,
        likeCount,
        commentCount,
        joinedClubCount,
        weeklyPoints: Math.floor(totalPoints * 0.3), // Haftalık tahmini %30
        monthlyPoints: Math.floor(totalPoints * 0.7), // Aylık tahmini %70
        streakCount: 0 // Bu hesaplama karmaşık, şimdilik 0
      };
      
    } catch (error) {
      console.error(`❌ Error calculating student stats for ${studentId}:`, error);
      return {
        totalPoints: 0,
        eventCount: 0,
        likeCount: 0,
        commentCount: 0,
        joinedClubCount: 0,
        weeklyPoints: 0,
        monthlyPoints: 0,
        streakCount: 0
      };
    }
  }

  /**
   * Kulüp için gerçek istatistikleri hesapla
   */
  private async calculateRealClubStats(clubId: string): Promise<any> {
    const db = getFirebaseCompatSync().firestore();
    
    try {
      // Kulübün etkinlik sayısı
      const eventsQuery = await db
        .collection('events')
        .where('clubId', '==', clubId)
        .get();
      
      const eventCount = eventsQuery.size;
      
      // Kulübün üye sayısı
      const membersQuery = await db
        .collection('clubMembers')
        .where('clubId', '==', clubId)
        .get();
      
      const memberCount = membersQuery.size;
      
      // Kulübün etkinliklerindeki toplam beğeni sayısı
      let likeCount = 0;
      let commentCount = 0;
      let participantCount = 0;
      
      for (const eventDoc of eventsQuery.docs) {
        const eventId = eventDoc.id;
        
        // Bu etkinliğin beğeni sayısı
        const eventLikesQuery = await db
          .collection('eventLikes')
          .where('eventId', '==', eventId)
          .get();
        
        likeCount += eventLikesQuery.size;
        
        // Bu etkinliğin yorum sayısı
        const eventCommentsQuery = await db
          .collection('events')
          .doc(eventId)
          .collection('comments')
          .get();
        
        commentCount += eventCommentsQuery.size;
        
        // Bu etkinliğin katılımcı sayısı
        const eventAttendeesQuery = await db
          .collection('eventAttendees')
          .where('eventId', '==', eventId)
          .get();
        
        participantCount += eventAttendeesQuery.size;
      }
      
      // Toplam puan hesapla (kulüpler için farklı sistem)
      const totalPoints = (eventCount * 50) + (memberCount * 10) + (likeCount * 2) + (commentCount * 5) + (participantCount * 3);
      
      return {
        totalPoints,
        eventCount,
        memberCount,
        likeCount,
        commentCount,
        participantCount,
        rank: 1 // Bu daha sonra hesaplanacak
      };
      
    } catch (error) {
      console.error(`❌ Error calculating club stats for ${clubId}:`, error);
      return {
        totalPoints: 0,
        eventCount: 0,
        memberCount: 0,
        likeCount: 0,
        commentCount: 0,
        participantCount: 0,
        rank: 1
      };
    }
  }

  /**
   * Lider tablosu verilerinde tutarsızlık kontrol et
   */
  async detectLeaderboardInconsistencies(): Promise<any> {
    console.log('🔍 Detecting leaderboard data inconsistencies...');
    
    const inconsistencies = {
      students: [] as any[],
      clubs: [] as any[],
      events: [] as any[]
    };
    
    try {
      const db = getFirebaseCompatSync().firestore();
      
      // Öğrenci tutarsızlıklarını kontrol et
      const studentsQuery = await db.collection('users').where('userType', '!=', 'club').limit(10).get();
      for (const studentDoc of studentsQuery.docs) {
        const studentId = studentDoc.id;
        const userData = studentDoc.data();
        
        // UserScores'dan veriyi al
        const userScoreDoc = await db.collection('userScores').doc(studentId).get();
        const scoreData = userScoreDoc.data();
        
        // Gerçek istatistikleri hesapla
        const realStats = await this.calculateRealStudentStats(studentId);
        
        if (scoreData && Math.abs((scoreData.totalPoints || 0) - realStats.totalPoints) > 50) {
          inconsistencies.students.push({
            userId: studentId,
            userName: userData.displayName || userData.firstName + ' ' + userData.lastName,
            storedPoints: scoreData.totalPoints || 0,
            realPoints: realStats.totalPoints,
            difference: realStats.totalPoints - (scoreData.totalPoints || 0)
          });
        }
      }
      
      // Kulüp tutarsızlıklarını kontrol et  
      const clubsQuery = await db.collection('users').where('userType', '==', 'club').limit(10).get();
      for (const clubDoc of clubsQuery.docs) {
        const clubId = clubDoc.id;
        const userData = clubDoc.data();
        
        // ClubScores'dan veriyi al
        const clubScoreDoc = await db.collection('clubScores').doc(clubId).get();
        const scoreData = clubScoreDoc.data();
        
        // Gerçek istatistikleri hesapla
        const realStats = await this.calculateRealClubStats(clubId);
        
        if (scoreData && Math.abs((scoreData.totalPoints || 0) - realStats.totalPoints) > 100) {
          inconsistencies.clubs.push({
            clubId: clubId,
            clubName: userData.displayName || userData.clubName,
            storedPoints: scoreData.totalPoints || 0,
            realPoints: realStats.totalPoints,
            difference: realStats.totalPoints - (scoreData.totalPoints || 0)
          });
        }
      }
      
      console.log('🔍 Inconsistencies detected:', inconsistencies);
      return inconsistencies;
      
    } catch (error) {
      console.error('❌ Error detecting inconsistencies:', error);
      return inconsistencies;
    }
  }
}

export const leaderboardDataSyncService = LeaderboardDataSyncService.getInstance();
