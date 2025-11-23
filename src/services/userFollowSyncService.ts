/**
 * User Follow Synchronization Service
 * Kullanıcı takip sistemi için gerçek zamanlı senkroniz      // Cache'i temizle
      this.clearUserCache(followerId);
      this.clearUserCache(targetUserId);

      // Send detailed follow notif      // Cache'i temizle
      this.clearUserCache(followerId);
      this.clearUserCache(targetUserId);

      // Send detailed unfollow notification
      await DetailedNotificationService.notifyUserUnfollowed(targetUserId, followerId);
      
      // Sync statistics for both users
      await Promise.all([
        DetailedNotificationService.syncUserStatistics(followerId),
        DetailedNotificationService.syncUserStatistics(targetUserId)
      ]); await DetailedNotificationService.notifyUserFollowed(targetUserId, followerId);
      
      // Sync statistics for both users
      await Promise.all([
        DetailedNotificationService.syncUserStatistics(followerId),
        DetailedNotificationService.syncUserStatistics(targetUserId)
      ]);lenler ve takipçi listeleri için tutarlılık sağlar
 */

import type firebaseType from 'firebase/compat/app';
import 'firebase/compat/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendNotificationToUser } from '../firebase/notificationManagement';
import { userActivityService } from './enhancedUserActivityService';
import DetailedNotificationService from './detailedNotificationService';
import { getFirebaseCompatSync } from '../firebase/compat';

const firebase = getFirebaseCompatSync() as typeof firebaseType;
type FirestoreTimestamp = firebaseType.firestore.Timestamp;

export interface UserFollowData {
  id: string;
  displayName?: string;
  username?: string;
  email?: string;
  photoURL?: string;
  university?: string;
  department?: string;
  isFollowing?: boolean;
  isFollowedBy?: boolean;
  followedAt?: FirestoreTimestamp;
}

export interface FollowStats {
  followingCount: number;
  followerCount: number;
  mutualFollowCount: number;
}

export class UserFollowSyncService {
  private static instance: UserFollowSyncService;
  private db: firebaseType.firestore.Firestore;
  private cache: Map<string, UserFollowData[]> = new Map();
  private listeners: Map<string, () => void> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    this.db = getFirebaseCompatSync().firestore();
  }

  static getInstance(): UserFollowSyncService {
    if (!UserFollowSyncService.instance) {
      UserFollowSyncService.instance = new UserFollowSyncService();
    }
    return UserFollowSyncService.instance;
  }

  // ============================================================================
  // FOLLOW MANAGEMENT
  // ============================================================================

  /**
   * Kullanıcıyı takip et - kapsamlı güncelleme
   */
  async followUser(
    followerId: string,
    followerName: string,
    targetUserId: string
  ): Promise<boolean> {
    try {
      console.log(`👥 Starting follow process: ${followerName} -> ${targetUserId}`);

      const batch = this.db.batch();
      const now = getFirebaseCompatSync().firestore.FieldValue.serverTimestamp();

      // 1. Follower'ın following listesini güncelle
      const followerRef = this.db.collection('users').doc(followerId);
      batch.update(followerRef, {
        following: getFirebaseCompatSync().firestore.FieldValue.arrayUnion(targetUserId),
        followingCount: getFirebaseCompatSync().firestore.FieldValue.increment(1),
        lastActivity: now
      });

      // 2. Target kullanıcının followers listesini güncelle
      const targetRef = this.db.collection('users').doc(targetUserId);
      batch.update(targetRef, {
        followers: getFirebaseCompatSync().firestore.FieldValue.arrayUnion(followerId),
        followerCount: getFirebaseCompatSync().firestore.FieldValue.increment(1),
        lastActivity: now
      });

      // 3. UserFollowings koleksiyonuna kayıt ekle (detaylı tracking için)
      const followingRef = this.db.collection('userFollowings').doc();
      batch.set(followingRef, {
        followerId,
        followerName,
        targetUserId,
        status: 'active',
        createdAt: now,
        updatedAt: now
      });

      // 4. Local storage'ı güncelle
      await this.updateLocalFollowData(followerId, targetUserId, 'follow');

      // Batch işlemini çalıştır
      await batch.commit();

  // Cache'i temizle
      this.clearUserCache(followerId);
      this.clearUserCache(targetUserId);

      // 🚨 CRITICAL: Send follow notification to target user
      try {
        console.log('📨 Creating follow notification...');
        
        // Import notification management
        const { NotificationManagement } = require('../firebase/notificationManagement');
        
        await NotificationManagement.sendNotificationToUser(
          targetUserId,
          'user_follow',
          'Yeni Takipçi 👥',
          `${followerName} seni takip etmeye başladı`,
          {
            actorId: followerId,
            actorName: followerName,
            actionType: 'user_follow'
          }
        );
        
        console.log('✅ Follow notification sent successfully to:', targetUserId);
      } catch (error: any) {
        console.error('❌ Follow notification exception:', error);
        // Don't fail the follow operation for notification errors
      }

        // 🎯 Modern scoring system for user follow
        try {
          console.log('🎯 Starting user follow scoring...');
          
          // Simple scoring - award points for following
          const db = getFirebaseCompatSync().firestore();
          const batch = db.batch();
          
          // Award points to follower
          const followerRef = db.collection('users').doc(followerId);
          batch.update(followerRef, {
            points: getFirebaseCompatSync().firestore.FieldValue.increment(10),
            lastActivity: getFirebaseCompatSync().firestore.FieldValue.serverTimestamp()
          });
          
          // Award points to target user
          const targetRef = db.collection('users').doc(targetUserId);
          batch.update(targetRef, {
            points: getFirebaseCompatSync().firestore.FieldValue.increment(5),
            lastActivity: getFirebaseCompatSync().firestore.FieldValue.serverTimestamp()
          });
          
          await batch.commit();
          console.log('✅ User follow scoring completed successfully');
          
        } catch (scoringError: any) {
          console.error('❌ User follow scoring failed:', scoringError);
          // Don't fail the follow operation for scoring errors
        }

      // 📝 Log user follow activity
      try {
        console.log('📝 Logging user follow activity...');
        
        // Get target user's display name
        const targetUserDoc = await this.db.collection('users').doc(targetUserId).get();
        const targetUserData = targetUserDoc.data();
        const targetUserName = targetUserData?.displayName || targetUserData?.firstName || 'Bilinmeyen Kullanıcı';
        
        await userActivityService.logUserFollow(
          followerId,
          followerName,
          targetUserId,
          targetUserName
        );
        
        console.log('✅ User follow activity logged successfully');
      } catch (activityError: any) {
        console.error('❌ User follow activity logging failed:', activityError);
        // Don't fail the follow operation for activity logging errors
      }

      console.log(`✅ Follow completed: ${followerName} -> ${targetUserId}`);
      return true;
    } catch (error) {
      console.error('❌ Error following user:', error);
      return false;
    }
  }

  /**
   * Kullanıcıyı takipten çıkar - kapsamlı güncelleme
   */
  async unfollowUser(
    followerId: string,
    followerName: string,
    targetUserId: string
  ): Promise<boolean> {
    try {
      console.log(`👥 Starting unfollow process: ${followerName} -> ${targetUserId}`);

      const batch = this.db.batch();
      const now = getFirebaseCompatSync().firestore.FieldValue.serverTimestamp();

      // 1. Follower'ın following listesini güncelle
      const followerRef = this.db.collection('users').doc(followerId);
      batch.update(followerRef, {
        following: getFirebaseCompatSync().firestore.FieldValue.arrayRemove(targetUserId),
        followingCount: getFirebaseCompatSync().firestore.FieldValue.increment(-1),
        lastActivity: now
      });

      // 2. Target kullanıcının followers listesini güncelle
      const targetRef = this.db.collection('users').doc(targetUserId);
      batch.update(targetRef, {
        followers: getFirebaseCompatSync().firestore.FieldValue.arrayRemove(followerId),
        followerCount: getFirebaseCompatSync().firestore.FieldValue.increment(-1),
        lastActivity: now
      });

      // 3. UserFollowings koleksiyonundaki kaydı güncelle
      const followingQuery = await this.db.collection('userFollowings')
        .where('followerId', '==', followerId)
        .where('targetUserId', '==', targetUserId)
        .where('status', '==', 'active')
        .get();

      followingQuery.docs.forEach(doc => {
        batch.update(doc.ref, {
          status: 'unfollowed',
          unfollowedAt: now,
          updatedAt: now
        });
      });

      // 4. Local storage'ı güncelle
      await this.updateLocalFollowData(followerId, targetUserId, 'unfollow');

      // Batch işlemini çalıştır
      await batch.commit();

  // Cache'i temizle
      this.clearUserCache(followerId);
      this.clearUserCache(targetUserId);

      // 📝 Log user unfollow activity
      try {
        console.log('📝 Logging user unfollow activity...');
        
        // Get target user's display name
        const targetUserDoc = await this.db.collection('users').doc(targetUserId).get();
        const targetUserData = targetUserDoc.data();
        const targetUserName = targetUserData?.displayName || targetUserData?.firstName || 'Bilinmeyen Kullanıcı';
        
        await userActivityService.logUserUnfollow(
          followerId,
          followerName,
          targetUserId,
          targetUserName
        );
        
        console.log('✅ User unfollow activity logged successfully');
      } catch (activityError: any) {
        console.error('❌ User unfollow activity logging failed:', activityError);
        // Don't fail the unfollow operation for activity logging errors
      }

      // 🎯 Modern scoring system for user unfollow
      try {
        console.log('🎯 Starting user unfollow scoring...');
        
        // Simple scoring - deduct points for unfollowing
        const db = getFirebaseCompatSync().firestore();
        const batch = db.batch();
        
        // Deduct points from follower
        const followerRef = db.collection('users').doc(followerId);
        batch.update(followerRef, {
          points: getFirebaseCompatSync().firestore.FieldValue.increment(-5),
          lastActivity: getFirebaseCompatSync().firestore.FieldValue.serverTimestamp()
        });
        
        // Deduct points from target user
        const targetRef = db.collection('users').doc(targetUserId);
        batch.update(targetRef, {
          points: getFirebaseCompatSync().firestore.FieldValue.increment(-3),
          lastActivity: getFirebaseCompatSync().firestore.FieldValue.serverTimestamp()
        });
        
        await batch.commit();
        console.log('✅ User unfollow scoring completed successfully');
        
      } catch (scoringError: any) {
        console.error('❌ User unfollow scoring failed:', scoringError);
        // Don't fail the unfollow operation for scoring errors
      }

      console.log(`✅ Unfollow completed: ${followerName} -> ${targetUserId}`);
      return true;
    } catch (error) {
      console.error('❌ Error unfollowing user:', error);
      return false;
    }
  }

  // ============================================================================
  // DATA RETRIEVAL
  // ============================================================================

  /**
   * Kullanıcının takip ettikleri listesini al
   */
  async getUserFollowing(userId: string, useCache: boolean = true): Promise<UserFollowData[]> {
    try {
      const cacheKey = `following_${userId}`;
      
      if (useCache && this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey) || [];
      }

      // Kullanıcı dokümanından following array'ini al
      const userDoc = await this.db.collection('users').doc(userId).get();
      const userData = userDoc.data();
      const followingIds = userData?.following || [];

      if (followingIds.length === 0) {
        this.cache.set(cacheKey, []);
        return [];
      }

      // Takip edilen kullanıcıların detaylarını al
      const followingUsers: UserFollowData[] = [];
      
      // Batch olarak kullanıcı verilerini al (10'lu gruplar halinde)
      for (let i = 0; i < followingIds.length; i += 10) {
        const batch = followingIds.slice(i, i + 10);
        const userPromises = batch.map((id: string) => 
          this.db.collection('users').doc(id).get()
        );
        
        const userDocs = await Promise.all(userPromises);
    userDocs.forEach(doc => {
          if (doc.exists) {
            const data = doc.data();
            followingUsers.push({
              id: doc.id,
              displayName: data?.displayName,
      username: data?.username || data?.userName,
              email: data?.email,
              photoURL: data?.photoURL,
              university: data?.university,
              department: data?.department,
              isFollowing: true
            });
          }
        });
      }

      this.cache.set(cacheKey, followingUsers);
      return followingUsers;
    } catch (error) {
      console.error('❌ Error getting user following:', error);
      return [];
    }
  }

  /**
   * Kullanıcının takipçilerini al
   */
  async getUserFollowers(userId: string, useCache: boolean = true): Promise<UserFollowData[]> {
    try {
      const cacheKey = `followers_${userId}`;
      
      if (useCache && this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey) || [];
      }

      // Kullanıcı dokümanından followers array'ini al
      const userDoc = await this.db.collection('users').doc(userId).get();
      const userData = userDoc.data();
      const followerIds = userData?.followers || [];

      if (followerIds.length === 0) {
        this.cache.set(cacheKey, []);
        return [];
      }

      // Takipçi kullanıcıların detaylarını al
      const followerUsers: UserFollowData[] = [];
      
      // Batch olarak kullanıcı verilerini al (10'lu gruplar halinde)
      for (let i = 0; i < followerIds.length; i += 10) {
        const batch = followerIds.slice(i, i + 10);
        const userPromises = batch.map((id: string) => 
          this.db.collection('users').doc(id).get()
        );
        
        const userDocs = await Promise.all(userPromises);
    userDocs.forEach(doc => {
          if (doc.exists) {
            const data = doc.data();
            followerUsers.push({
              id: doc.id,
              displayName: data?.displayName,
      username: data?.username || data?.userName,
              email: data?.email,
              photoURL: data?.photoURL,
              university: data?.university,
              department: data?.department,
              isFollowedBy: true
            });
          }
        });
      }

      this.cache.set(cacheKey, followerUsers);
      return followerUsers;
    } catch (error) {
      console.error('❌ Error getting user followers:', error);
      return [];
    }
  }

  /**
   * Kullanıcının takip istatistiklerini al
   */
  async getUserFollowStats(userId: string): Promise<FollowStats> {
    try {
      const userDoc = await this.db.collection('users').doc(userId).get();
      const userData = userDoc.data() || {} as any;

      // Prefer authoritative arrays if present; fall back to stored counters
      const followers: string[] = Array.isArray(userData.followers) ? userData.followers : [];
      const following: string[] = Array.isArray(userData.following) ? userData.following : [];

      const followerCount = followers.length > 0 ? followers.length : (userData.followerCount || 0);
      const followingCount = following.length > 0 ? following.length : (userData.followingCount || 0);

      return {
        followingCount,
        followerCount,
        mutualFollowCount: 0 // Optional: compute if needed
      };
    } catch (error) {
      console.error('❌ Error getting follow stats:', error);
      return {
        followingCount: 0,
        followerCount: 0,
        mutualFollowCount: 0
      };
    }
  }

  /**
   * İki kullanıcı arasındaki takip durumunu kontrol et
   */
  async checkFollowStatus(userId: string, targetUserId: string): Promise<{
    isFollowing: boolean;
    isFollowedBy: boolean;
    isMutual: boolean;
  }> {
    try {
      const [userDoc, targetDoc] = await Promise.all([
        this.db.collection('users').doc(userId).get(),
        this.db.collection('users').doc(targetUserId).get()
      ]);

      const userData = userDoc.data();
      const targetData = targetDoc.data();

      const isFollowing = (userData?.following || []).includes(targetUserId);
      const isFollowedBy = (targetData?.following || []).includes(userId);

      return {
        isFollowing,
        isFollowedBy,
        isMutual: isFollowing && isFollowedBy
      };
    } catch (error) {
      console.error('❌ Error checking follow status:', error);
      return {
        isFollowing: false,
        isFollowedBy: false,
        isMutual: false
      };
    }
  }

  // ============================================================================
  // REAL-TIME LISTENERS
  // ============================================================================

  /**
   * Kullanıcının takip verilerini gerçek zamanlı dinle
   */
  setupFollowListener(
    userId: string, 
    callback: (stats: FollowStats) => void
  ): () => void {
    const listenerKey = `follow_${userId}`;
    
    // Mevcut listener'ı kaldır
    if (this.listeners.has(listenerKey)) {
      this.listeners.get(listenerKey)!();
    }

    console.log(`🔔 Setting up follow listener for user: ${userId}`);

    const unsubscribe = this.db.collection('users').doc(userId)
      .onSnapshot((doc) => {
        if (doc.exists) {
          const data = doc.data();
          const stats: FollowStats = {
            followingCount: data?.followingCount || 0,
            followerCount: data?.followerCount || 0,
            mutualFollowCount: 0 // Hesaplanabilir
          };
          
          callback(stats);
          console.log(`🔄 Follow stats updated for ${userId}:`, stats);
        }
      }, (error) => {
        console.error(`❌ Error in follow listener for ${userId}:`, error);
      });

    this.listeners.set(listenerKey, unsubscribe);
    return () => {
      unsubscribe();
      this.listeners.delete(listenerKey);
      console.log(`🔕 Follow listener removed for user: ${userId}`);
    };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Local storage'daki takip verilerini güncelle
   */
  private async updateLocalFollowData(
    userId: string, 
    targetUserId: string, 
    action: 'follow' | 'unfollow'
  ): Promise<void> {
    try {
      const followingKey = `following_${userId}`;
      const followersKey = `followers_${targetUserId}`;
      
      // Following listesini güncelle
      const existingFollowing = await AsyncStorage.getItem(followingKey);
      let followingList = existingFollowing ? JSON.parse(existingFollowing) : [];
      
      if (action === 'follow') {
        if (!followingList.includes(targetUserId)) {
          followingList.push(targetUserId);
        }
      } else {
        followingList = followingList.filter((id: string) => id !== targetUserId);
      }
      
      await AsyncStorage.setItem(followingKey, JSON.stringify(followingList));

      // Followers listesini güncelle
      const existingFollowers = await AsyncStorage.getItem(followersKey);
      let followersList = existingFollowers ? JSON.parse(existingFollowers) : [];
      
      if (action === 'follow') {
        if (!followersList.includes(userId)) {
          followersList.push(userId);
        }
      } else {
        followersList = followersList.filter((id: string) => id !== userId);
      }
      
      await AsyncStorage.setItem(followersKey, JSON.stringify(followersList));
      
      console.log(`✅ Local follow data updated: ${action} - ${userId} -> ${targetUserId}`);
    } catch (error) {
      console.error('❌ Error updating local follow data:', error);
    }
  }

  /**
   * Kullanıcıya ait cache'i temizle
   */
  private clearUserCache(userId: string): void {
    this.cache.delete(`following_${userId}`);
    this.cache.delete(`followers_${userId}`);
  }

  /**
   * Tüm cache'i temizle
   */
  clearAllCache(): void {
    this.cache.clear();
    console.log('🗑️ All follow cache cleared');
  }

  /**
   * Kullanıcının takip verilerini senkronize et
   */
  async syncUserFollowData(userId: string): Promise<boolean> {
    try {
      console.log(`🔄 Syncing follow data for user: ${userId}`);

      // Cache'i temizle ve fresh data al
      this.clearUserCache(userId);
      
      const [following, followers, stats] = await Promise.all([
        this.getUserFollowing(userId, false),
        this.getUserFollowers(userId, false),
        this.getUserFollowStats(userId)
      ]);

      console.log(`✅ Follow data synced for ${userId}:`, {
        following: following.length,
        followers: followers.length,
        stats
      });

      return true;
    } catch (error) {
      console.error('❌ Error syncing follow data:', error);
      return false;
    }
  }
}

// Export singleton instance
export const userFollowSyncService = UserFollowSyncService.getInstance();
