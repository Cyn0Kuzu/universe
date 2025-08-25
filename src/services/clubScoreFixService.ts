import { firebase } from '../firebase/config';
// Modern notification system available globally

/**
 * Club Score Fix Service
 * Kulüp puan sistemindeki senkronizasyon ve data integrity sorunlarını düzeltir
 */
export class ClubScoreFixService {
  
  /**
   * Kulüp için clubScores dokümanını sıfırdan oluştur/güncelle
   */
  static async ensureClubScoreDocument(clubId: string): Promise<boolean> {
    try {
      console.log('🔧 ClubScoreFix: Ensuring clubScore document for:', clubId);
      
      // User bilgilerini al
      const userDoc = await firebase.firestore().collection('users').doc(clubId).get();
      if (!userDoc.exists) {
        console.error('❌ ClubScoreFix: User document not found for club:', clubId);
        return false;
      }
      
      const userData = userDoc.data();
      if (userData?.userType !== 'club') {
        console.error('❌ ClubScoreFix: User is not a club:', clubId);
        return false;
      }
      
      // clubStats'dan gerçek puan hesapla
      let calculatedPoints = 0;
      const clubStatsDoc = await firebase.firestore().collection('clubStats').doc(clubId).get();
      
      if (clubStatsDoc.exists) {
        const clubStatsData = clubStatsDoc.data();
        
        // Önce totalScore'u kontrol et
        if (clubStatsData?.totalScore && clubStatsData.totalScore > 0) {
          calculatedPoints = clubStatsData.totalScore;
          console.log('✅ ClubScoreFix: Using totalScore from clubStats:', calculatedPoints);
        }
        // Yoksa totalInteractions'dan hesapla
        else if (clubStatsData?.totalInteractions && clubStatsData.totalInteractions > 0) {
          calculatedPoints = clubStatsData.totalInteractions * 10;
          console.log('📊 ClubScoreFix: Calculated from totalInteractions:', calculatedPoints);
        }
      }
      
  // Minimum puan garantisi: başlangıç 0 olmalı
  calculatedPoints = Math.max(calculatedPoints, 0);

  // Level hesaplama: 0'dan başla (her 1000 puan = +1 seviye)
  const level = Math.floor(calculatedPoints / 1000);
      
      // clubScores mevcut puanı ile kıyasla (asla düşürme)
      const clubScoresRef = firebase.firestore().collection('clubScores').doc(clubId);
      const existingClubScores = await clubScoresRef.get();
      const currentTotal = existingClubScores.exists ? Number(existingClubScores.data()?.totalPoints || 0) : 0;
      const currentWeekly = existingClubScores.exists ? Number(existingClubScores.data()?.weeklyPoints || 0) : 0;
      const currentMonthly = existingClubScores.exists ? Number(existingClubScores.data()?.monthlyPoints || 0) : 0;
      const newTotal = Math.max(currentTotal, calculatedPoints);
      const newWeekly = Math.max(currentWeekly, calculatedPoints);
      const newMonthly = Math.max(currentMonthly, calculatedPoints);
      const newLevel = Math.floor(newTotal / 1000);

      // clubScores dokümanını oluştur/güncelle (güvenli maksimum ile)
      const clubScoreData = {
        clubId: clubId,
        clubName: userData.clubName || userData.displayName || 'Unknown Club',
        university: userData.university || 'Unknown University',
        totalPoints: newTotal,
        weeklyPoints: newWeekly,
        monthlyPoints: newMonthly,
        level: newLevel,
        userType: 'club',
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        fixedByService: true,
        fixedAt: firebase.firestore.FieldValue.serverTimestamp(),
        note: currentTotal > calculatedPoints ? 'kept_existing_higher_total' : 'set_from_calculated_points'
      };
      
      await clubScoresRef.set(clubScoreData, { merge: true });
      
      console.log('✅ ClubScoreFix: clubScores document created/updated with', calculatedPoints, 'points');
      return true;
      
    } catch (error) {
      console.error('❌ ClubScoreFix: Error ensuring clubScore document:', error);
      return false;
    }
  }
  
  /**
   * userScores ile clubScores'ı senkronize et
   */
  static async syncUserScoresWithClubScores(clubId: string): Promise<boolean> {
    try {
      console.log('🔄 ClubScoreFix: Syncing userScores with clubScores for:', clubId);
      
      // clubScores'dan veriyi al
      const clubScoreDoc = await firebase.firestore().collection('clubScores').doc(clubId).get();
      
      if (!clubScoreDoc.exists) {
        console.log('⚠️ ClubScoreFix: clubScores document not found, creating first...');
        await this.ensureClubScoreDocument(clubId);
        return await this.syncUserScoresWithClubScores(clubId); // Recursive call after creation
      }
      
      const clubScoreData = clubScoreDoc.data();
      const clubTotal = clubScoreData?.totalPoints || 0;
      const currentUserScoresDoc = await firebase.firestore().collection('userScores').doc(clubId).get();
      const currentTotal = currentUserScoresDoc.exists ? Number(currentUserScoresDoc.data()?.totalPoints || 0) : 0;
      const newTotal = Math.max(currentTotal, clubTotal);
      const level = Math.floor(newTotal / 1000);
      
      // userScores'ı güncelle (asla düşürme)
      const userScoreData = {
        totalPoints: newTotal,
        weeklyPoints: newTotal,
        monthlyPoints: newTotal,
        level: level,
        userType: 'club',
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
        syncedFromClubScores: true,
        syncedAt: firebase.firestore.FieldValue.serverTimestamp(),
        note: currentTotal < clubTotal ? 'raised_to_club_total' : 'kept_existing_higher_total'
      };
      
      await firebase.firestore()
        .collection('userScores')
        .doc(clubId)
        .set(userScoreData, { merge: true });
      
  console.log('✅ ClubScoreFix: userScores synced with', newTotal, 'points');
      return true;
      
    } catch (error) {
      console.error('❌ ClubScoreFix: Error syncing userScores:', error);
      return false;
    }
  }
  
  /**
   * Kulüp için tüm puan sistemini sıfırdan düzelt
   */
  static async fixCompleteClubScore(clubId: string): Promise<{
    success: boolean;
    totalPoints: number;
    level: number;
    message: string;
  }> {
    try {
      console.log('🛠️ ClubScoreFix: Starting complete fix for club:', clubId);
      
      // 1. clubScores dokümanını düzelt
      const clubScoreCreated = await this.ensureClubScoreDocument(clubId);
      if (!clubScoreCreated) {
        return {
          success: false,
          totalPoints: 0,
          level: 0,
          message: 'Failed to create/update clubScores document'
        };
      }
      
      // 2. userScores ile senkronize et
      const syncSuccess = await this.syncUserScoresWithClubScores(clubId);
      if (!syncSuccess) {
        return {
          success: false,
          totalPoints: 0,
          level: 0,
          message: 'Failed to sync userScores'
        };
      }
      
      // 3. Final verification
      const finalClubScoreDoc = await firebase.firestore().collection('clubScores').doc(clubId).get();
      const finalData = finalClubScoreDoc.data();
      
      console.log('🎯 ClubScoreFix: Complete fix successful!');
      
      return {
        success: true,
        totalPoints: finalData?.totalPoints || 0,
  level: finalData?.level ?? 0,
        message: 'Club score system successfully fixed and synchronized'
      };
      
    } catch (error) {
      console.error('❌ ClubScoreFix: Complete fix failed:', error);
      return {
        success: false,
        totalPoints: 0,
  level: 0,
        message: `Fix failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  /**
   * Tüm kulüpler için toplu düzeltme
   */
  static async fixAllClubScores(): Promise<{
    totalClubs: number;
    fixedClubs: number;
    failedClubs: number;
    results: Array<{ clubId: string; clubName: string; success: boolean; totalPoints: number; }>
  }> {
    try {
      console.log('🔄 ClubScoreFix: Starting bulk fix for all clubs...');
      
      // Tüm kulüp kullanıcılarını al
      const clubUsersSnapshot = await firebase.firestore()
        .collection('users')
        .where('userType', '==', 'club')
        .get();
      
      const results = [];
      let fixedClubs = 0;
      let failedClubs = 0;
      
      for (const userDoc of clubUsersSnapshot.docs) {
        const clubId = userDoc.id;
        const userData = userDoc.data();
        const clubName = userData.clubName || userData.displayName || 'Unknown Club';
        
        console.log(`🔧 ClubScoreFix: Fixing club: ${clubName} (${clubId})`);
        
        const fixResult = await this.fixCompleteClubScore(clubId);
        
        results.push({
          clubId,
          clubName,
          success: fixResult.success,
          totalPoints: fixResult.totalPoints
        });
        
        if (fixResult.success) {
          fixedClubs++;
          console.log(`✅ Fixed: ${clubName} - ${fixResult.totalPoints} points`);
        } else {
          failedClubs++;
          console.log(`❌ Failed: ${clubName} - ${fixResult.message}`);
        }
        
        // Rate limiting - 100ms between each club
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log('🎯 ClubScoreFix: Bulk fix completed!');
      
      return {
        totalClubs: clubUsersSnapshot.size,
        fixedClubs,
        failedClubs,
        results
      };
      
    } catch (error) {
      console.error('❌ ClubScoreFix: Bulk fix failed:', error);
      return {
        totalClubs: 0,
        fixedClubs: 0,
        failedClubs: 0,
        results: []
      };
    }
  }
  
  /**
   * Kulüp puan sıfırlama durumunu kontrol et ve düzelt
   */
  static async preventScoreReset(clubId: string): Promise<boolean> {
    try {
      console.log('🛡️ ClubScoreFix: Preventing score reset for club:', clubId);
      
      // Mevcut clubScores'ı kontrol et
      const clubScoreDoc = await firebase.firestore().collection('clubScores').doc(clubId).get();
      
      if (!clubScoreDoc.exists) {
        console.log('⚠️ ClubScoreFix: No clubScores document found, creating...');
        return await this.ensureClubScoreDocument(clubId);
      }
      
      const clubScoreData = clubScoreDoc.data();
      const currentPoints = clubScoreData?.totalPoints || 0;
      
      // Eğer puan 0 veya çok düşükse, yeniden hesapla
      // 0 puan başlangıç için geçerlidir; sadece negatif veya NaN durumunda düzelt
      if (typeof currentPoints !== 'number' || isNaN(currentPoints) || currentPoints < 0) {
        console.log('⚠️ ClubScoreFix: Invalid points detected, recalculating...');
        return await this.ensureClubScoreDocument(clubId);
      }
      
      console.log('✅ ClubScoreFix: Score is healthy:', currentPoints);
      return true;
      
    } catch (error) {
      console.error('❌ ClubScoreFix: Error preventing score reset:', error);
      return false;
    }
  }

  /**
   * Puan değişikliği tracking ve bildirim sistemi
   */
  static async trackScoreChange(
    clubId: string, 
    oldPoints: number, 
    newPoints: number, 
    reason: string, 
    details?: string
  ): Promise<void> {
    try {
      const pointDifference = newPoints - oldPoints;
      
      // Sadece puan kaybında bildirim gönder
      if (pointDifference < 0) {
        const lostPoints = Math.abs(pointDifference);
        
        console.log(`📉 ClubScoreFix: Score loss detected for club ${clubId}: -${lostPoints} points`);
        
        // Puan kaybı bildirimini gönder
        // TODO: Replace with ClubNotificationService
        console.log('Club score loss notification would be sent');
        // await advancedNotificationService.sendClubScoreLossNotification(
        //   clubId, lostPoints, reason, details
        // );
        
        // Score change logunu kaydet
        await this.logScoreChange(clubId, oldPoints, newPoints, reason, details);
      }
      
    } catch (error) {
      console.error('❌ ClubScoreFix: Error tracking score change:', error);
    }
  }

  /**
   * Öğrenci puan değişikliği tracking
   */
  static async trackStudentScoreChange(
    userId: string, 
    oldPoints: number, 
    newPoints: number, 
    reason: string, 
    details?: string
  ): Promise<void> {
    try {
      const pointDifference = newPoints - oldPoints;
      
      // Sadece puan kaybında bildirim gönder
      if (pointDifference < 0) {
        const lostPoints = Math.abs(pointDifference);
        
        console.log(`📉 ClubScoreFix: Student score loss detected for user ${userId}: -${lostPoints} points`);
        
        // Puan kaybı bildirimini gönder
        // TODO: Replace with ClubNotificationService
        console.log('Student score loss notification would be sent');
        // await advancedNotificationService.sendStudentScoreLossNotification(
        //   userId, lostPoints, reason, details
        // );
        
        // Score change logunu kaydet
        await this.logStudentScoreChange(userId, oldPoints, newPoints, reason, details);
      }
      
    } catch (error) {
      console.error('❌ ClubScoreFix: Error tracking student score change:', error);
    }
  }

  /**
   * Kulüp puan değişiklik logunu kaydet
   */
  private static async logScoreChange(
    clubId: string, 
    oldPoints: number, 
    newPoints: number, 
    reason: string, 
    details?: string
  ): Promise<void> {
    try {
      const logData = {
        clubId: clubId,
        oldPoints: oldPoints,
        newPoints: newPoints,
        pointDifference: newPoints - oldPoints,
        reason: reason,
        details: details || '',
        timestamp: firebase.firestore.Timestamp.now(),
        type: 'club_score_change'
      };

      await firebase.firestore().collection('scoreChangeLogs').add(logData);
      console.log('📝 ClubScoreFix: Score change logged for club:', clubId);
      
    } catch (error) {
      console.error('❌ ClubScoreFix: Error logging score change:', error);
    }
  }

  /**
   * Öğrenci puan değişiklik logunu kaydet
   */
  private static async logStudentScoreChange(
    userId: string, 
    oldPoints: number, 
    newPoints: number, 
    reason: string, 
    details?: string
  ): Promise<void> {
    try {
      const logData = {
        userId: userId,
        oldPoints: oldPoints,
        newPoints: newPoints,
        pointDifference: newPoints - oldPoints,
        reason: reason,
        details: details || '',
        timestamp: firebase.firestore.Timestamp.now(),
        type: 'student_score_change'
      };

      await firebase.firestore().collection('scoreChangeLogs').add(logData);
      console.log('📝 ClubScoreFix: Student score change logged for user:', userId);
      
    } catch (error) {
      console.error('❌ ClubScoreFix: Error logging student score change:', error);
    }
  }
}

export default ClubScoreFixService;
