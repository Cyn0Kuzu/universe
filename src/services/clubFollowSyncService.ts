/**
 * 🔗 CLUB FOLLOW SYNCHRONIZATION SERVICE
 * Ensures follow state is synchronized across all screens
 */

import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { followClub, unfollowClub } from '../firebase/firestore';
import { UnifiedNotificationService } from './unifiedNotificationService';

export interface ClubFollowState {
  isFollowing: boolean;
  followerCount: number;
}

export interface ClubFollowResult {
  success: boolean;
  newState: ClubFollowState;
  error?: string;
}

/**
 * 🎯 Centralized Club Follow Service
 * Bu servis tüm ekranlar arasında takip durumunu senkronize eder
 */
export class ClubFollowSyncService {
  private static listeners: Map<string, Set<(state: ClubFollowState) => void>> = new Map();
  
  /**
   * Register listener for club follow state changes
   */
  static subscribe(clubId: string, callback: (state: ClubFollowState) => void): () => void {
    if (!this.listeners.has(clubId)) {
      this.listeners.set(clubId, new Set());
    }
    
    this.listeners.get(clubId)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(clubId);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.listeners.delete(clubId);
        }
      }
    };
  }
  
  /**
   * Notify all listeners of state change
   */
  private static notifyListeners(clubId: string, state: ClubFollowState) {
    const listeners = this.listeners.get(clubId);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(state);
        } catch (error) {
          console.warn('Club follow listener error:', error);
        }
      });
    }
  }
  
  /**
   * Get current follow state for a club
   */
  static async getFollowState(userId: string, clubId: string): Promise<ClubFollowState> {
    try {
      const db = firebase.firestore();
      
      // Get user's follow status
      const userDoc = await db.collection('users').doc(userId).get();
      const userData = userDoc.data();
      const followedClubs = userData?.followedClubs || [];
      const isFollowing = followedClubs.includes(clubId);
      
      // Get club's REAL follower count from followers array (not cached count)
      const clubDoc = await db.collection('users').doc(clubId).get();
      const clubData = clubDoc.data();
      const followerCount = clubData?.followers ? clubData.followers.length : 0;
      
      console.log(`📊 ClubFollowSyncService - Real-time follower count for ${clubId}: ${followerCount}`);
      
      return {
        isFollowing,
        followerCount
      };
    } catch (error) {
      console.error('Error getting follow state:', error);
      return {
        isFollowing: false,
        followerCount: 0
      };
    }
  }
  
  /**
   * 👥 Follow a club with comprehensive synchronization
   */
  static async followClub(
    userId: string, 
    clubId: string, 
    clubName: string,
    userType: 'student' | 'club' = 'student'
  ): Promise<ClubFollowResult> {
    try {
      // Prevent club accounts from following
      if (userType === 'club') {
        return {
          success: false,
          newState: { isFollowing: false, followerCount: 0 },
          error: 'Club accounts cannot follow other clubs'
        };
      }
      
      const db = firebase.firestore();
      const batch = db.batch();
      
      // 1. Update Firestore atomically
      const userRef = db.collection('users').doc(userId);
      const clubRef = db.collection('users').doc(clubId);
      
      batch.update(userRef, {
        followedClubs: firebase.firestore.FieldValue.arrayUnion(clubId),
        followingCount: firebase.firestore.FieldValue.increment(1)
      });
      
      batch.update(clubRef, {
        followers: firebase.firestore.FieldValue.arrayUnion(userId),
        followerCount: firebase.firestore.FieldValue.increment(1)
      });
      
      await batch.commit();
      
      // 2. Update AsyncStorage for legacy compatibility
      await followClub(userId, clubId);
      
      // 3. Club follow statistics are tracked directly in Firebase collections
      console.log('✅ Club follow statistics recorded in Firebase');
      
      // Firebase Functions ile kulüp takip bildirimi gönder
      try {
        const FirebaseFunctionsService = require('./firebaseFunctionsService').default;
        const userInfo = await UnifiedNotificationService.getUserInfo(userId);
        
        await FirebaseFunctionsService.sendClubFollowNotification(
          userId,
          clubId,
          userInfo.name
        );
        console.log('✅ Club follow notification sent via Firebase Functions');
      } catch (notificationError) {
        console.warn('⚠️ Failed to send club follow notification:', notificationError);
      }

      // Unified Notification System - Kulüp takip edildi bildirimi
      try {
        const userInfo = await UnifiedNotificationService.getUserInfo(userId);
        await UnifiedNotificationService.notifyClubFollowed(
          clubId,
          userId,
          userInfo.name,
          userInfo.image,
          userInfo.university
        );
        console.log('✅ Unified notification system - club follow notification sent');
      } catch (unifiedNotificationError) {
        console.error('❌ Unified notification system failed:', unifiedNotificationError);
      }

      // 4. Activity logging is handled by modern scoring engine
      // No need for manual activity logging here - scoring engine covers this
      console.log('📝 Club follow activity logging handled by modern scoring engine');

      // 5. Get updated state
      const newState = await this.getFollowState(userId, clubId);

      // 6. Notify all listeners
      this.notifyListeners(clubId, newState);
      
      console.log(`✅ Club follow synchronized: ${clubName} (${clubId})`);
      
      return {
        success: true,
        newState
      };
      
    } catch (error) {
      console.error('Error following club:', error);
      return {
        success: false,
        newState: { isFollowing: false, followerCount: 0 },
        error: 'Failed to follow club'
      };
    }
  }
  
  /**
   * 👋 Unfollow a club with comprehensive synchronization
   */
  static async unfollowClub(
    userId: string, 
    clubId: string, 
    clubName: string,
    userType: 'student' | 'club' = 'student'
  ): Promise<ClubFollowResult> {
    try {
      // Prevent club accounts from unfollowing
      if (userType === 'club') {
        return {
          success: false,
          newState: { isFollowing: true, followerCount: 0 },
          error: 'Club accounts cannot unfollow'
        };
      }
      
      const db = firebase.firestore();
      const batch = db.batch();
      
      // 1. Update Firestore atomically
      const userRef = db.collection('users').doc(userId);
      const clubRef = db.collection('users').doc(clubId);
      
      batch.update(userRef, {
        followedClubs: firebase.firestore.FieldValue.arrayRemove(clubId),
        followingCount: firebase.firestore.FieldValue.increment(-1)
      });
      
      batch.update(clubRef, {
        followers: firebase.firestore.FieldValue.arrayRemove(userId),
        followerCount: firebase.firestore.FieldValue.increment(-1)
      });
      
      await batch.commit();
      
      // 2. Update AsyncStorage for legacy compatibility
      await unfollowClub(userId, clubId);
      
      // 3. Club unfollow statistics are tracked directly in Firebase collections
      console.log('🔔 DEBUG: ClubFollowSyncService unfollowClub - userId:', userId, 'clubId:', clubId, 'clubName:', clubName);
      console.log('✅ Club unfollow statistics recorded in Firebase');
      
      // Unified Notification System - Kulüp takipten çıkarma bildirimi
      try {
        const userInfo = await UnifiedNotificationService.getUserInfo(userId);
        await UnifiedNotificationService.notifyClubUnfollowed(
          clubId,
          userId,
          userInfo.name
        );
        console.log('✅ Unified notification system - club unfollow notification sent');
      } catch (unifiedNotificationError) {
        console.error('❌ Unified notification system failed:', unifiedNotificationError);
      }
      console.log('📧 Club unfollow notification queued');

      // 4. Activity logging is handled by Firebase collections
      console.log('📝 Club unfollow activity logging handled by Firebase collections');

      // 5. Get updated state
      const newState = await this.getFollowState(userId, clubId);

      // 6. Notify all listeners
      this.notifyListeners(clubId, newState);
      
      console.log(`✅ Club unfollow synchronized: ${clubName} (${clubId})`);
      
      return {
        success: true,
        newState
      };
      
    } catch (error) {
      console.error('Error unfollowing club:', error);
      return {
        success: false,
        newState: { isFollowing: true, followerCount: 0 },
        error: 'Failed to unfollow club'
      };
    }
  }
  
  /**
   * 🔄 Toggle follow state
   */
  static async toggleFollow(
    userId: string,
    clubId: string,
    clubName: string,
    currentFollowState: boolean,
    userType: 'student' | 'club' = 'student'
  ): Promise<ClubFollowResult> {
    if (currentFollowState) {
      return await this.unfollowClub(userId, clubId, clubName, userType);
    } else {
      return await this.followClub(userId, clubId, clubName, userType);
    }
  }
}

export default ClubFollowSyncService;
