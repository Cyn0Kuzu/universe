import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

export interface ClubStatsData {
  totalEvents: number;
  totalMembers: number;
  totalLikes: number;
  totalComments: number;
  totalParticipants: number;
  totalInteractions: number; // etkinlik + beğeni + yorum + katılımcı
  totalScore?: number; // Hesaplanmış toplam skor
  monthlyEvents: number;
  monthlyMembers: number;
  monthlyLikes: number;
  lastUpdated: firebase.firestore.Timestamp;
}

class ClubStatsServiceClass {
  async getClubStats(clubId: string): Promise<ClubStatsData | null> {
    try {
      const statsDoc = await firebase.firestore()
        .collection('clubStats')
        .doc(clubId)
        .get();

      if (!statsDoc.exists) {
        return this.initializeClubStats(clubId);
      }

      return statsDoc.data() as ClubStatsData;
    } catch (error) {
      console.error('Failed to get club stats:', error);
      return null;
    }
  }

  private async initializeClubStats(clubId: string): Promise<ClubStatsData> {
    const initialStats: ClubStatsData = {
      totalEvents: 0,
      totalMembers: 0,
      totalLikes: 0,
      totalComments: 0,
      totalParticipants: 0,
      totalInteractions: 0,
      totalScore: 0,
      monthlyEvents: 0,
      monthlyMembers: 0,
      monthlyLikes: 0,
      lastUpdated: firebase.firestore.Timestamp.now()
    };

    try {
      await firebase.firestore()
        .collection('clubStats')
        .doc(clubId)
        .set(initialStats);
    } catch (error) {
      console.error('Failed to initialize club stats:', error);
    }

    return initialStats;
  }

  // Helper function to ensure clubStats document exists before updating
  private async ensureStatsDocumentExists(clubId: string): Promise<void> {
    const statsRef = firebase.firestore().collection('clubStats').doc(clubId);
    const statsDoc = await statsRef.get();
    
    if (!statsDoc.exists) {
      await statsRef.set({
        clubId,
        totalLikes: 0,
        monthlyLikes: 0,
        totalComments: 0,
        totalShares: 0,
        totalInteractions: 0,
        eventLikes: 0,
        eventComments: 0,
        eventShares: 0,
        eventParticipants: 0,
        followerCount: 0,
        memberCount: 0,
        eventCount: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
  }

  async updateClubStats(clubId: string, updates: Partial<ClubStatsData>): Promise<void> {
    try {
      await this.ensureStatsDocumentExists(clubId);
      await firebase.firestore()
        .collection('clubStats')
        .doc(clubId)
        .update({
          ...updates,
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
      console.error('Failed to update club stats:', error);
      throw error;
    }
  }

  async incrementEventCount(clubId: string): Promise<void> {
    try {
      await this.ensureStatsDocumentExists(clubId);
      await firebase.firestore()
        .collection('clubStats')
        .doc(clubId)
        .update({
          totalEvents: firebase.firestore.FieldValue.increment(1),
          monthlyEvents: firebase.firestore.FieldValue.increment(1),
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
      console.error('Failed to increment event count:', error);
    }
  }

  async incrementMemberCount(clubId: string): Promise<void> {
    try {
      await this.ensureStatsDocumentExists(clubId);
      await firebase.firestore()
        .collection('clubStats')
        .doc(clubId)
        .update({
          totalMembers: firebase.firestore.FieldValue.increment(1),
          monthlyMembers: firebase.firestore.FieldValue.increment(1),
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
      console.error('Failed to increment member count:', error);
    }
  }

  async decrementMemberCount(clubId: string): Promise<void> {
    try {
      await this.ensureStatsDocumentExists(clubId);
      await firebase.firestore()
        .collection('clubStats')
        .doc(clubId)
        .update({
          totalMembers: firebase.firestore.FieldValue.increment(-1),
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
      console.error('Failed to decrement member count:', error);
    }
  }

  async incrementLikeCount(clubId: string): Promise<void> {
    try {
      await this.ensureStatsDocumentExists(clubId);
      await firebase.firestore()
        .collection('clubStats')
        .doc(clubId)
        .update({
          totalLikes: firebase.firestore.FieldValue.increment(1),
          monthlyLikes: firebase.firestore.FieldValue.increment(1),
          totalInteractions: firebase.firestore.FieldValue.increment(1),
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
      console.error('Failed to increment like count:', error);
    }
  }

  async incrementCommentCount(clubId: string): Promise<void> {
    try {
      await this.ensureStatsDocumentExists(clubId);
      await firebase.firestore()
        .collection('clubStats')
        .doc(clubId)
        .update({
          totalComments: firebase.firestore.FieldValue.increment(1),
          totalInteractions: firebase.firestore.FieldValue.increment(1),
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
      console.error('Failed to increment comment count:', error);
    }
  }

  async updateCommentCount(clubId: string, increment: boolean = true): Promise<void> {
    try {
      await this.ensureStatsDocumentExists(clubId);
      const incrementValue = increment ? 1 : -1;
      await firebase.firestore()
        .collection('clubStats')
        .doc(clubId)
        .update({
          totalComments: firebase.firestore.FieldValue.increment(incrementValue),
          totalInteractions: firebase.firestore.FieldValue.increment(incrementValue),
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
      console.error('Failed to update comment count:', error);
    }
  }

  async updateEventCount(clubId: string, increment: boolean = true): Promise<void> {
    try {
      const incrementValue = increment ? 1 : -1;
      await firebase.firestore()
        .collection('clubStats')
        .doc(clubId)
        .update({
          totalEvents: firebase.firestore.FieldValue.increment(incrementValue),
          monthlyEvents: firebase.firestore.FieldValue.increment(incrementValue),
          totalInteractions: firebase.firestore.FieldValue.increment(incrementValue),
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error: any) {
      console.error('Failed to update event count:', error);
      // Eğer doküman yoksa oluştur
      if (error?.code === 'not-found') {
        const initialStats = await this.initializeClubStats(clubId);
        const newEventCount = increment ? 1 : 0;
        await this.updateClubStats(clubId, {
          totalEvents: newEventCount,
          monthlyEvents: newEventCount
        });
      }
    }
  }

  async createDefaultStats(clubId: string): Promise<ClubStatsData> {
    return await this.initializeClubStats(clubId);
  }

  async forceRefreshStats(clubId: string): Promise<ClubStatsData> {
    try {
      // Get actual event count from events collection
      const eventsSnapshot = await firebase.firestore()
        .collection('events')
        .where('clubId', '==', clubId)
        .get();
      
      const actualEventCount = eventsSnapshot.size;
      console.log(`🔧 Kulüp ${clubId} gerçek etkinlik sayısı: ${actualEventCount}`);
      
      // Get actual member count from clubMembers collection
      const membersSnapshot = await firebase.firestore()
        .collection('clubMembers')
        .where('clubId', '==', clubId)
        .get();
      
      const actualMemberCount = membersSnapshot.size;
      console.log(`🔧 Kulüp ${clubId} gerçek üye sayısı: ${actualMemberCount}`);
      
      // Get actual comment count, participant count and likes count from all events of this club
      let totalComments = 0;
      let totalParticipants = 0;
      let totalLikes = 0;
      
      for (const eventDoc of eventsSnapshot.docs) {
        const eventData = eventDoc.data();
        totalComments += eventData.commentsCount || 0;
        totalLikes += eventData.likesCount || 0; // Add real likes count
        
        // Get actual attendees count for this event
        const attendeesSnapshot = await firebase.firestore()
          .collection('events')
          .doc(eventDoc.id)
          .collection('attendees')
          .get();
        
        totalParticipants += attendeesSnapshot.size;
      }
      
      console.log(`🔧 Kulüp ${clubId} gerçek yorum sayısı: ${totalComments}`);
      console.log(`🔧 Kulüp ${clubId} gerçek beğeni sayısı: ${totalLikes}`);
      console.log(`🔧 Kulüp ${clubId} gerçek katılımcı sayısı: ${totalParticipants}`);
      
      // Calculate total interactions with all real counts
      const totalInteractions = actualEventCount + totalLikes + totalComments + totalParticipants;
      
      console.log(`🔧 Kulüp ${clubId} toplam etkileşim: ${totalInteractions} (etkinlik: ${actualEventCount}, üye: ${actualMemberCount}, beğeni: ${totalLikes}, yorum: ${totalComments}, katılımcı: ${totalParticipants})`);
      
      // Update stats with all real counts
      await this.updateClubStats(clubId, {
        totalEvents: actualEventCount,
        totalMembers: actualMemberCount,
        monthlyEvents: actualEventCount,
        monthlyMembers: actualMemberCount,
        totalComments: totalComments,
        totalLikes: totalLikes, // Update with real likes count
        totalParticipants: totalParticipants, // Update with real participant count
        totalInteractions: totalInteractions
      });
      
      // Return updated stats
      const updatedStats = await this.getClubStats(clubId);
      return updatedStats || await this.initializeClubStats(clubId);
    } catch (error) {
      console.error('Failed to force refresh stats:', error);
      return await this.initializeClubStats(clubId);
    }
  }

  // 🎯 TÜM KULÜP İSTATİSTİKLERİNİ SIFIRLA
  async resetAllClubStats(): Promise<void> {
    try {
      console.log('🔧 Tüm kulüp istatistikleri sıfırlanıyor...');
      
      // Tüm kulüpleri al
      const usersSnapshot = await firebase.firestore()
        .collection('users')
        .where('userType', '==', 'club')
        .get();
      
      console.log(`📊 ${usersSnapshot.size} kulüp bulundu`);
      
      // Her kulüp için istatistikleri sıfırla
      for (const clubDoc of usersSnapshot.docs) {
        const clubId = clubDoc.id;
        const clubData = clubDoc.data();
        console.log(`🎪 Kulüp işleniyor: ${clubData.name || clubData.displayName}`);
        
        await this.forceRefreshStats(clubId);
        console.log(`✅ ${clubId} kulübü tamamlandı`);
      }
      
      console.log('🎉 Tüm kulüp istatistikleri başarıyla sıfırlandı!');
    } catch (error) {
      console.error('❌ İstatistik sıfırlama hatası:', error);
    }
  }

  async updateLikeCount(clubId: string, increment: boolean = true): Promise<void> {
    try {
      const incrementValue = increment ? 1 : -1;
      await firebase.firestore()
        .collection('clubStats')
        .doc(clubId)
        .update({
          totalLikes: firebase.firestore.FieldValue.increment(incrementValue),
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error: any) {
      console.error('Failed to update like count:', error);
      if (error?.code === 'not-found') {
        await this.initializeClubStats(clubId);
      }
    }
  }

  async updateParticipantCount(clubId: string, increment: boolean = true): Promise<void> {
    try {
      const incrementValue = increment ? 1 : -1;
      await firebase.firestore()
        .collection('clubStats')
        .doc(clubId)
        .update({
          totalParticipants: firebase.firestore.FieldValue.increment(incrementValue),
          totalInteractions: firebase.firestore.FieldValue.increment(incrementValue),
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error: any) {
      console.error('Failed to update participant count:', error);
      if (error?.code === 'not-found') {
        await this.initializeClubStats(clubId);
      }
    }
  }

  // 📊 Toplam etkileşim hesaplama ve güncelleme
  private calculateTotalInteractions(stats: ClubStatsData): number {
    return stats.totalEvents + stats.totalLikes + stats.totalComments + stats.totalParticipants;
  }

  async updateTotalInteractions(clubId: string): Promise<void> {
    try {
      const currentStats = await this.getClubStats(clubId);
      if (currentStats) {
        const totalInteractions = this.calculateTotalInteractions(currentStats);
        
        await firebase.firestore()
          .collection('clubStats')
          .doc(clubId)
          .update({
            totalInteractions: totalInteractions,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
          });
        
        console.log(`📊 Total interactions updated for club ${clubId}: ${totalInteractions}`);
        
        // Also update userScores for leaderboard consistency
        await this.syncUserScores(clubId);
      }
    } catch (error) {
      console.error('Failed to update total interactions:', error);
    }
  }

  async incrementTotalInteractions(clubId: string, amount: number = 1): Promise<void> {
    try {
      await firebase.firestore()
        .collection('clubStats')
        .doc(clubId)
        .update({
          totalInteractions: firebase.firestore.FieldValue.increment(amount),
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
      
      // Also update userScores for leaderboard consistency
      await this.syncUserScores(clubId);
    } catch (error) {
      console.error('Failed to increment total interactions:', error);
    }
  }

  /**
   * Sync club stats to userScores collection for leaderboard
   */
  async syncUserScores(clubId: string): Promise<void> {
    try {
      const stats = await this.getClubStats(clubId);
      if (!stats) return;

      const derivedPoints = Math.max(0, (stats.totalInteractions || 0) * 10);

      // Read current userScores to avoid decreasing totals accidentally
      const userScoreRef = firebase.firestore().collection('userScores').doc(clubId);
      const currentDoc = await userScoreRef.get();
      const current = currentDoc.exists ? (currentDoc.data() as any) : {};

      const currentTotal = Number(current?.totalPoints) || 0;
      const currentWeekly = Number(current?.weeklyPoints) || 0;
      const currentMonthly = Number(current?.monthlyPoints) || 0;

      // Never decrease points: take the max between existing and derived
      const newTotalPoints = Math.max(currentTotal, derivedPoints);
      const newWeeklyPoints = Math.max(currentWeekly, derivedPoints);
      const newMonthlyPoints = Math.max(currentMonthly, derivedPoints);
      const level = Math.floor(newTotalPoints / 1000);

      await userScoreRef.set(
        {
          // Preserve/increase only
          totalPoints: newTotalPoints,
          weeklyPoints: newWeeklyPoints,
          monthlyPoints: newMonthlyPoints,
          level,
          userType: 'club',
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
          // Extra transparency fields (do not affect ranking logic)
          totalInteractions: stats.totalInteractions || 0,
          totalEvents: stats.totalEvents || 0,
          totalMembers: stats.totalMembers || 0,
          _derivedPointsFromStats: derivedPoints,
          _lastSyncedBy: 'ClubStatsService.syncUserScores'
        },
        { merge: true }
      );

      console.log(
        '✅ ClubStatsService: Synced userScores for club:',
        clubId,
        'derived:', derivedPoints,
        'final totalPoints:', newTotalPoints
      );
    } catch (error) {
      console.error('❌ ClubStatsService: Failed to sync userScores:', error);
    }
  }

  /**
   * Real-time club stats listener
   */
  onClubStatsChange(clubId: string, callback: (stats: ClubStatsData | null) => void): () => void {
    const unsubscribe = firebase.firestore()
      .collection('clubStats')
      .doc(clubId)
      .onSnapshot(
        (doc) => {
          if (doc.exists) {
            const data = doc.data() as ClubStatsData;
            console.log(`📊 Real-time stats update for club ${clubId}:`, data);
            callback(data);
          } else {
            console.log(`📊 No stats found for club ${clubId}, initializing...`);
            this.initializeClubStats(clubId).then(callback);
          }
        },
        (error) => {
          console.error('Real-time stats listener error:', error);
          callback(null);
        }
      );

    return unsubscribe;
  }

  /**
   * Force refresh and trigger real-time update
   */
  async triggerStatsUpdate(clubId: string): Promise<void> {
    try {
      await this.forceRefreshStats(clubId);
      console.log(`📊 Triggered stats update for club ${clubId}`);
    } catch (error) {
      console.error('Failed to trigger stats update:', error);
    }
  }
}

export const ClubStatsService = new ClubStatsServiceClass();