// Global Follow State Manager - Tüm takip butonlarını senkronize eder
import { getFirebaseCompatSync } from '../firebase/compat';

const firebase = getFirebaseCompatSync();

export interface FollowStateUpdate {
  userId: string;
  followerId: string;
  isFollowing: boolean;
  action: 'follow' | 'unfollow' | 'remove_follower';
  followerCount?: number;
  followingCount?: number;
}

// React Native uyumlu EventEmitter alternatifi
class SimpleEventEmitter {
  private listeners: Map<string, Array<(data: any) => void>> = new Map();

  on(event: string, listener: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  off(event: string, listener: (data: any) => void): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  emit(event: string, data?: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => listener(data));
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

class GlobalFollowStateManager extends SimpleEventEmitter {
  private static instance: GlobalFollowStateManager;
  private followStates: Map<string, boolean> = new Map(); // userId-followerId: isFollowing
  private userStats: Map<string, { followerCount: number; followingCount: number }> = new Map();
  private verifyCache: Map<string, number> = new Map(); // Cache for verification timestamps

  private constructor() {
    super();
  }

  static getInstance(): GlobalFollowStateManager {
    if (!GlobalFollowStateManager.instance) {
      GlobalFollowStateManager.instance = new GlobalFollowStateManager();
    }
    return GlobalFollowStateManager.instance;
  }

  /**
   * İki kullanıcı arasındaki takip durumunu key olarak oluştur
   */
  private getFollowKey(followerId: string, targetUserId: string): string {
    return `${followerId}->${targetUserId}`;
  }

  /**
   * Takip durumunu güncelle ve tüm ilgili bileşenlere bildir
   */
  async updateFollowState(update: FollowStateUpdate): Promise<void> {
    try {
      console.log('🔄 GlobalFollowStateManager: Updating follow state', update);

      const { userId: targetUserId, followerId, isFollowing, action } = update;
      const followKey = this.getFollowKey(followerId, targetUserId);

      // Local state'i güncelle
      this.followStates.set(followKey, isFollowing);

      // User stats'i güncelle
      if (update.followerCount !== undefined) {
        const currentStats = this.userStats.get(targetUserId) || { followerCount: 0, followingCount: 0 };
        this.userStats.set(targetUserId, {
          ...currentStats,
          followerCount: update.followerCount
        });
      }

      if (update.followingCount !== undefined) {
        const currentStats = this.userStats.get(followerId) || { followerCount: 0, followingCount: 0 };
        this.userStats.set(followerId, {
          ...currentStats,
          followingCount: update.followingCount
        });
      }

      // Tüm listener'lara bildir
      this.emit('followStateChanged', {
        followKey,
        targetUserId,
        followerId,
        isFollowing,
        action,
        followerCount: this.userStats.get(targetUserId)?.followerCount,
        followingCount: this.userStats.get(followerId)?.followingCount
      });

      // Spesifik kullanıcılar için ayrı event'ler
      this.emit(`followState:${targetUserId}`, {
        followerId,
        isFollowing,
        action,
        followerCount: this.userStats.get(targetUserId)?.followerCount
      });

      this.emit(`followState:${followerId}`, {
        targetUserId,
        isFollowing,
        action,
        followingCount: this.userStats.get(followerId)?.followingCount
      });

      console.log('✅ GlobalFollowStateManager: Follow state updated and broadcasted');
    } catch (error) {
      console.error('❌ GlobalFollowStateManager: Error updating follow state:', error);
    }
  }

  /**
   * Takip durumunu sorgula
   */
  getFollowState(followerId: string, targetUserId: string): boolean | undefined {
    const followKey = this.getFollowKey(followerId, targetUserId);
    return this.followStates.get(followKey);
  }

  /**
   * Kullanıcının istatistiklerini al
   */
  getUserStats(userId: string): { followerCount: number; followingCount: number } | undefined {
    return this.userStats.get(userId);
  }

  /**
   * Follow işlemi gerçekleştir ve durumu güncelle
   */
  async performFollow(followerId: string, followerName: string, targetUserId: string): Promise<boolean> {
    try {
      console.log(`🔄 GlobalFollowStateManager: Performing follow ${followerId} -> ${targetUserId}`);

      // userFollowSyncService kullan
      const { userFollowSyncService } = require('./userFollowSyncService');
      const success = await userFollowSyncService.followUser(followerId, followerName, targetUserId);

      if (success) {
        // Takip edilen kullanıcının adını al
        const targetUserDoc = await getFirebaseCompatSync().firestore().collection('users').doc(targetUserId).get();
        const targetUserData = targetUserDoc.data();
        const targetUserName = targetUserData?.displayName || targetUserData?.firstName || 'Kullanıcı';

        // Puan sistemi kaldırıldı - takip istatistikleri Firebase'de direkt tutulacak
        console.log('✅ Follow action completed - statistics tracked in Firebase');

        // Firestore'dan fresh counts al
        const { FollowCountSyncService } = require('./followCountSyncService');
        const [followerStats, targetStats] = await Promise.all([
          FollowCountSyncService.syncUserFollowCounts(followerId),
          FollowCountSyncService.syncUserFollowCounts(targetUserId)
        ]);

        // Global state'i güncelle
        await this.updateFollowState({
          userId: targetUserId,
          followerId,
          isFollowing: true,
          action: 'follow',
          followerCount: targetStats.followerCount,
          followingCount: followerStats.followingCount
        });

        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ GlobalFollowStateManager: Follow operation failed:', error);
      return false;
    }
  }

  /**
   * Unfollow işlemi gerçekleştir ve durumu güncelle
   */
  async performUnfollow(followerId: string, followerName: string, targetUserId: string): Promise<boolean> {
    try {
      console.log(`🔄 GlobalFollowStateManager: Performing unfollow ${followerId} -> ${targetUserId}`);

      // userFollowSyncService kullan
      const { userFollowSyncService } = require('./userFollowSyncService');
      const success = await userFollowSyncService.unfollowUser(followerId, followerName, targetUserId);

      if (success) {
        // Takip bırakılan kullanıcının adını al
        const targetUserDoc = await getFirebaseCompatSync().firestore().collection('users').doc(targetUserId).get();
        const targetUserData = targetUserDoc.data();
        const targetUserName = targetUserData?.displayName || targetUserData?.firstName || 'Kullanıcı';

        // Puan sistemi kaldırıldı - takip istatistikleri Firebase'de direkt tutulacak
        console.log('✅ Unfollow action completed - statistics tracked in Firebase');

        // Firestore'dan fresh counts al
        const { FollowCountSyncService } = require('./followCountSyncService');
        const [followerStats, targetStats] = await Promise.all([
          FollowCountSyncService.syncUserFollowCounts(followerId),
          FollowCountSyncService.syncUserFollowCounts(targetUserId)
        ]);

        // Global state'i güncelle
        await this.updateFollowState({
          userId: targetUserId,
          followerId,
          isFollowing: false,
          action: 'unfollow',
          followerCount: targetStats.followerCount,
          followingCount: followerStats.followingCount
        });

        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ GlobalFollowStateManager: Unfollow operation failed:', error);
      return false;
    }
  }

  /**
   * Takipçi kaldırma işlemi (X butonundan)
   */
  async performRemoveFollower(currentUserId: string, currentUserName: string, followerId: string): Promise<boolean> {
    try {
      console.log(`🔄 GlobalFollowStateManager: Removing follower ${followerId} from ${currentUserId}`);

      // Manual removal - arrays'den direkt kaldır
      const batch = getFirebaseCompatSync().firestore().batch();

      // Current user'ın followers array'inden kaldır
      const currentUserRef = getFirebaseCompatSync().firestore().collection('users').doc(currentUserId);
      batch.update(currentUserRef, {
        followers: getFirebaseCompatSync().firestore.FieldValue.arrayRemove(followerId)
      });

      // Follower'ın following array'inden current user'ı kaldır
      const followerRef = getFirebaseCompatSync().firestore().collection('users').doc(followerId);
      batch.update(followerRef, {
        following: getFirebaseCompatSync().firestore.FieldValue.arrayRemove(currentUserId)
      });

      await batch.commit();

      // Counts'ları sync et
      const { FollowCountSyncService } = require('./followCountSyncService');
      const [currentUserStats, followerStats] = await Promise.all([
        FollowCountSyncService.syncUserFollowCounts(currentUserId),
        FollowCountSyncService.syncUserFollowCounts(followerId)
      ]);

      // Global state'i güncelle - follower perspective'den unfollow olarak işle
      await this.updateFollowState({
        userId: currentUserId,
        followerId: followerId,
        isFollowing: false,
        action: 'remove_follower',
        followerCount: currentUserStats.followerCount,
        followingCount: followerStats.followingCount
      });

      return true;
    } catch (error) {
      console.error('❌ GlobalFollowStateManager: Remove follower operation failed:', error);
      return false;
    }
  }

  /**
   * Belirli bir kullanıcı için listener ekle
   */
  subscribeToUser(userId: string, callback: (data: any) => void): () => void {
    const eventName = `followState:${userId}`;
    this.on(eventName, callback);
    
    // Unsubscribe function return et
    return () => {
      this.off(eventName, callback);
    };
  }

  /**
   * Global follow state değişiklikleri için listener ekle
   */
  subscribeToFollowChanges(callback: (data: any) => void): () => void {
    this.on('followStateChanged', callback);
    
    return () => {
      this.off('followStateChanged', callback);
    };
  }

  /**
   * Takipçi sayılarını gerçek verilerle doğrula ve düzelt
   */
  async verifyAndFixFollowerCounts(userId: string): Promise<{ followerCount: number; followingCount: number }> {
    try {
      console.log('🔍 GlobalFollowStateManager: Verifying follower counts for user:', userId);
      
      // Cache kontrolü - aynı kullanıcı için 30 saniye içinde tekrar kontrol etme
      const cacheKey = `verify_${userId}`;
      const lastVerifyTime = this.verifyCache.get(cacheKey) || 0;
      const now = Date.now();
      
      if (now - lastVerifyTime < 30000) { // 30 saniye
        console.log('⏭️ GlobalFollowStateManager: Skipping verification (cached)');
        const cachedStats = this.userStats.get(userId);
        if (cachedStats) {
          return cachedStats;
        }
      }
      
      // Gerçek takipçi sayısını hesapla
      const followersSnapshot = await getFirebaseCompatSync().firestore()
        .collection('userFollows')
        .where('followedUserId', '==', userId)
        .get();
      
      const actualFollowerCount = followersSnapshot.size;
      
      // Gerçek takip edilen sayısını hesapla
      const followingSnapshot = await getFirebaseCompatSync().firestore()
        .collection('userFollows')
        .where('followerUserId', '==', userId)
        .get();
      
      const actualFollowingCount = followingSnapshot.size;
      
      console.log('📊 Actual counts - Followers:', actualFollowerCount, 'Following:', actualFollowingCount);
      
      // UserProfile'daki sayıları al
      const userDoc = await getFirebaseCompatSync().firestore().collection('users').doc(userId).get();
      const currentData = userDoc.data();
      
      const currentFollowerCount = currentData?.followerCount || 0;
      const currentFollowingCount = currentData?.followingCount || 0;
      
      // Güncelleme gerekli mi kontrol et
      const updateData: any = {};
      let needsUpdate = false;
      
      if (currentFollowerCount !== actualFollowerCount) {
        updateData.followerCount = actualFollowerCount;
        needsUpdate = true;
        console.log(`🔧 Fixing follower count: ${currentFollowerCount} -> ${actualFollowerCount}`);
      }
      
      if (currentFollowingCount !== actualFollowingCount) {
        updateData.followingCount = actualFollowingCount;
        needsUpdate = true;
        console.log(`🔧 Fixing following count: ${currentFollowingCount} -> ${actualFollowingCount}`);
      }
      
      if (needsUpdate) {
        await getFirebaseCompatSync().firestore()
          .collection('users')
          .doc(userId)
          .update(updateData);
        
        console.log('✅ GlobalFollowStateManager: User profile counts updated:', updateData);
      } else {
        console.log('✅ GlobalFollowStateManager: Follower counts are already correct');
      }
      
      // Local state'i güncelle
      const finalCounts = {
        followerCount: actualFollowerCount,
        followingCount: actualFollowingCount
      };
      
      this.userStats.set(userId, finalCounts);
      
      // Cache'e kaydet
      this.verifyCache.set(cacheKey, now);
      
      // Güncelleme bildirimini yay (sadece değişiklik varsa)
      if (needsUpdate) {
        this.emit(`followState:${userId}`, {
          followerCount: actualFollowerCount,
          followingCount: actualFollowingCount,
          action: 'count_verified'
        });
      }
      
      return finalCounts;
      
    } catch (error) {
      console.error('❌ GlobalFollowStateManager: Error verifying follower counts:', error);
      throw error;
    }
  }

  /**
   * Kullanıcının takip durumlarını başlangıçta yükle
   */
  async loadUserFollowStates(userId: string): Promise<void> {
    try {
      const userDoc = await getFirebaseCompatSync().firestore().collection('users').doc(userId).get();
      const userData = userDoc.data();
      
      if (userData) {
        // Kullanıcının istatistiklerini kaydet
        this.userStats.set(userId, {
          followerCount: userData.followerCount || 0,
          followingCount: userData.followingCount || 0
        });

        // Following listesindeki her kullanıcı için follow state'i kaydet
        const following = userData.following || [];
        following.forEach((targetUserId: string) => {
          const followKey = this.getFollowKey(userId, targetUserId);
          this.followStates.set(followKey, true);
        });

        console.log(`✅ GlobalFollowStateManager: Loaded ${following.length} follow states for user ${userId}`);
      }
    } catch (error) {
      console.error('❌ GlobalFollowStateManager: Error loading user follow states:', error);
    }
  }
}

export const globalFollowStateManager = GlobalFollowStateManager.getInstance();
export default globalFollowStateManager;
