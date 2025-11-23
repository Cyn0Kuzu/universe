// Follow Count Sync Service - Takipçi sayılarını güvenilir şekilde günceller
import { getFirebaseCompatSync } from '../firebase/compat';

const firebase = getFirebaseCompatSync();

export class FollowCountSyncService {
  private static db = getFirebaseCompatSync().firestore();

  /**
   * Kullanıcının takipçi ve takip sayılarını gerçek verilerle senkronize eder
   */
  static async syncUserFollowCounts(userId: string): Promise<{
    followerCount: number;
    followingCount: number;
  }> {
    try {
      console.log(`🔄 Syncing follow counts for user: ${userId}`);

      // Kullanıcı dokümanını al
      const userDoc = await this.db.collection('users').doc(userId).get();
      const userData = userDoc.data();

      if (!userData) {
        throw new Error('User not found');
      }

      // Gerçek array'lerin uzunluğunu hesapla
      const followers = userData.followers || [];
      const following = userData.following || [];
      
      const actualFollowerCount = followers.length;
      const actualFollowingCount = following.length;

      // Sayıları güncelle
      await this.db.collection('users').doc(userId).update({
        followerCount: actualFollowerCount,
        followingCount: actualFollowingCount,
        lastCountSync: getFirebaseCompatSync().firestore.FieldValue.serverTimestamp()
      });

      console.log(`✅ Follow counts synced for ${userId}: followers=${actualFollowerCount}, following=${actualFollowingCount}`);

      return {
        followerCount: actualFollowerCount,
        followingCount: actualFollowingCount
      };
    } catch (error) {
      console.error('❌ Error syncing follow counts:', error);
      throw error;
    }
  }

  /**
   * Birden fazla kullanıcının takip sayılarını toplu güncelle
   */
  static async syncMultipleUserCounts(userIds: string[]): Promise<void> {
    try {
      console.log(`🔄 Syncing follow counts for ${userIds.length} users`);

      const promises = userIds.map(userId => this.syncUserFollowCounts(userId));
      await Promise.all(promises);

      console.log(`✅ Follow counts synced for all ${userIds.length} users`);
    } catch (error) {
      console.error('❌ Error syncing multiple user counts:', error);
      throw error;
    }
  }

  /**
   * Takip işlemlerinden sonra her iki kullanıcının sayılarını güncelle
   */
  static async syncFollowRelationship(followerId: string, targetUserId: string): Promise<void> {
    try {
      console.log(`🔄 Syncing follow relationship: ${followerId} <-> ${targetUserId}`);

      await this.syncMultipleUserCounts([followerId, targetUserId]);

      console.log(`✅ Follow relationship synced for ${followerId} <-> ${targetUserId}`);
    } catch (error) {
      console.error('❌ Error syncing follow relationship:', error);
      throw error;
    }
  }

  /**
   * Tüm kullanıcıların takip sayılarını kontrol edip hatalı olanları düzelt
   */
  static async auditAndFixAllUserCounts(): Promise<{
    fixed: number;
    errors: string[];
  }> {
    try {
      console.log('🔍 Starting audit of all user follow counts...');

      const usersSnapshot = await this.db.collection('users').get();
      const results = {
        fixed: 0,
        errors: [] as string[]
      };

      for (const userDoc of usersSnapshot.docs) {
        try {
          const userData = userDoc.data();
          const followers = userData.followers || [];
          const following = userData.following || [];
          
          const actualFollowerCount = followers.length;
          const actualFollowingCount = following.length;
          const storedFollowerCount = userData.followerCount || 0;
          const storedFollowingCount = userData.followingCount || 0;

          // Sayılar eşleşmiyor mu?
          if (actualFollowerCount !== storedFollowerCount || actualFollowingCount !== storedFollowingCount) {
            console.log(`🔧 Fixing counts for ${userDoc.id}: followers ${storedFollowerCount}->${actualFollowerCount}, following ${storedFollowingCount}->${actualFollowingCount}`);
            
            await this.db.collection('users').doc(userDoc.id).update({
              followerCount: actualFollowerCount,
              followingCount: actualFollowingCount,
              lastCountAudit: getFirebaseCompatSync().firestore.FieldValue.serverTimestamp()
            });

            results.fixed++;
          }
        } catch (error) {
          console.error(`❌ Error fixing counts for user ${userDoc.id}:`, error);
          results.errors.push(`${userDoc.id}: ${error}`);
        }
      }

      console.log(`✅ Audit completed: Fixed ${results.fixed} users, ${results.errors.length} errors`);
      return results;
    } catch (error) {
      console.error('❌ Error during follow count audit:', error);
      throw error;
    }
  }
}

export default FollowCountSyncService;
