// Real-Time Statistics Synchronization Service
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { enhancedClubStatsService } from './enhancedClubStatsService';
import unifiedStatisticsService from './unifiedStatisticsService';

export interface RealTimeStatsUpdate {
  userId?: string;
  clubId?: string;
  eventId?: string;
  type: 'like' | 'unlike' | 'comment' | 'join' | 'leave' | 'follow' | 'unfollow' | 'event_created' | 'event_deleted';
  increment: number;
  metadata?: any;
}

export interface LiveStatsData {
  likes: number;
  comments: number;
  participants: number;
  followers: number;
  following: number;
  events: number;
  lastUpdated: Date;
}

class RealTimeStatsSyncService {
  private static instance: RealTimeStatsSyncService;
  private db = firebase.firestore();
  private clubStatsService = enhancedClubStatsService;
  private unifiedStatsService = unifiedStatisticsService;
  private statsListeners: Map<string, () => void> = new Map();

  static getInstance(): RealTimeStatsSyncService {
    if (!RealTimeStatsSyncService.instance) {
      RealTimeStatsSyncService.instance = new RealTimeStatsSyncService();
    }
    return RealTimeStatsSyncService.instance;
  }

  /**
   * 🔄 Update statistics in real-time
   */
  async updateStats(update: RealTimeStatsUpdate): Promise<boolean> {
    try {
      console.log('📊 Updating real-time stats:', update);

      const batch = this.db.batch();
      const now = firebase.firestore.FieldValue.serverTimestamp();

      // Update user stats if userId provided
      if (update.userId) {
        await this.updateUserStats(batch, update.userId, update, now);
      }

      // Update club stats if clubId provided
      if (update.clubId) {
        await this.updateClubStats(batch, update.clubId, update, now);
      }

      // Update event stats if eventId provided
      if (update.eventId) {
        await this.updateEventStats(batch, update.eventId, update, now);
      }

      // Commit all updates
      await batch.commit();

      // Trigger real-time updates
      this.triggerStatsUpdate(update);

      console.log('✅ Real-time stats updated successfully');
      return true;

    } catch (error) {
      console.error('❌ Failed to update real-time stats:', error);
      return false;
    }
  }

  /**
   * 👤 Update user statistics
   */
  private async updateUserStats(
    batch: firebase.firestore.WriteBatch,
    userId: string,
    update: RealTimeStatsUpdate,
    timestamp: any
  ): Promise<void> {
    const userRef = this.db.collection('users').doc(userId);
    const userStatsRef = this.db.collection('userStats').doc(userId);

    const userUpdate: any = {
      lastUpdated: timestamp,
      statsVersion: firebase.firestore.FieldValue.increment(1)
    };

    const statsUpdate: any = {
      lastUpdated: timestamp,
      version: firebase.firestore.FieldValue.increment(1)
    };

    switch (update.type) {
      case 'like':
        userUpdate.totalLikes = firebase.firestore.FieldValue.increment(update.increment);
        statsUpdate.likes = firebase.firestore.FieldValue.increment(update.increment);
        break;
      case 'comment':
        userUpdate.totalComments = firebase.firestore.FieldValue.increment(update.increment);
        statsUpdate.comments = firebase.firestore.FieldValue.increment(update.increment);
        break;
      case 'join':
        userUpdate.totalParticipations = firebase.firestore.FieldValue.increment(update.increment);
        statsUpdate.participations = firebase.firestore.FieldValue.increment(update.increment);
        break;
      case 'follow':
        userUpdate.followerCount = firebase.firestore.FieldValue.increment(update.increment);
        statsUpdate.followers = firebase.firestore.FieldValue.increment(update.increment);
        break;
      case 'event_created':
        userUpdate.totalEventsCreated = firebase.firestore.FieldValue.increment(update.increment);
        statsUpdate.eventsCreated = firebase.firestore.FieldValue.increment(update.increment);
        break;
    }

    batch.update(userRef, userUpdate);
    batch.set(userStatsRef, statsUpdate, { merge: true });
  }

  /**
   * 🏛️ Update club statistics
   */
  private async updateClubStats(
    batch: firebase.firestore.WriteBatch,
    clubId: string,
    update: RealTimeStatsUpdate,
    timestamp: any
  ): Promise<void> {
    const clubRef = this.db.collection('users').doc(clubId);
    const clubStatsRef = this.db.collection('clubStats').doc(clubId);

    const clubUpdate: any = {
      lastUpdated: timestamp,
      statsVersion: firebase.firestore.FieldValue.increment(1)
    };

    const statsUpdate: any = {
      lastUpdated: timestamp,
      version: firebase.firestore.FieldValue.increment(1)
    };

    switch (update.type) {
      case 'like':
        clubUpdate.totalLikes = firebase.firestore.FieldValue.increment(update.increment);
        statsUpdate.totalLikes = firebase.firestore.FieldValue.increment(update.increment);
        break;
      case 'comment':
        clubUpdate.totalComments = firebase.firestore.FieldValue.increment(update.increment);
        statsUpdate.totalComments = firebase.firestore.FieldValue.increment(update.increment);
        break;
      case 'join':
        clubUpdate.totalParticipants = firebase.firestore.FieldValue.increment(update.increment);
        statsUpdate.totalParticipants = firebase.firestore.FieldValue.increment(update.increment);
        break;
      case 'follow':
        clubUpdate.followerCount = firebase.firestore.FieldValue.increment(update.increment);
        statsUpdate.totalMembers = firebase.firestore.FieldValue.increment(update.increment);
        break;
      case 'event_created':
        clubUpdate.totalEvents = firebase.firestore.FieldValue.increment(update.increment);
        statsUpdate.totalEvents = firebase.firestore.FieldValue.increment(update.increment);
        break;
    }

    batch.update(clubRef, clubUpdate);
    batch.set(clubStatsRef, statsUpdate, { merge: true });
  }

  /**
   * 📅 Update event statistics
   */
  private async updateEventStats(
    batch: firebase.firestore.WriteBatch,
    eventId: string,
    update: RealTimeStatsUpdate,
    timestamp: any
  ): Promise<void> {
    const eventRef = this.db.collection('events').doc(eventId);

    const eventUpdate: any = {
      lastUpdated: timestamp,
      statsVersion: firebase.firestore.FieldValue.increment(1)
    };

    switch (update.type) {
      case 'like':
        eventUpdate.likeCount = firebase.firestore.FieldValue.increment(update.increment);
        break;
      case 'comment':
        eventUpdate.commentCount = firebase.firestore.FieldValue.increment(update.increment);
        break;
      case 'join':
        eventUpdate.participantCount = firebase.firestore.FieldValue.increment(update.increment);
        break;
    }

    batch.update(eventRef, eventUpdate);
  }

  /**
   * 📡 Setup real-time stats listener
   */
  setupStatsListener(
    targetId: string,
    targetType: 'user' | 'club' | 'event',
    onUpdate: (stats: LiveStatsData) => void
  ): () => void {
    const collection = targetType === 'user' ? 'userStats' : 
                     targetType === 'club' ? 'clubStats' : 'events';
    
    const unsubscribe = this.db.collection(collection)
      .doc(targetId)
      .onSnapshot(
        (doc) => {
          if (doc.exists) {
            const data = doc.data();
            const liveStats: LiveStatsData = {
              likes: data?.likes || data?.totalLikes || data?.likeCount || 0,
              comments: data?.comments || data?.totalComments || data?.commentCount || 0,
              participants: data?.participations || data?.totalParticipants || data?.participantCount || 0,
              followers: data?.followers || data?.followerCount || 0,
              following: data?.following || data?.followingCount || 0,
              events: data?.events || data?.totalEvents || data?.eventsCreated || 0,
              lastUpdated: data?.lastUpdated?.toDate() || new Date()
            };

            console.log('📡 Real-time stats update:', liveStats);
            onUpdate(liveStats);
          }
        },
        (error) => {
          console.error('❌ Stats listener error:', error);
        }
      );

    this.statsListeners.set(`${targetType}_${targetId}`, unsubscribe);
    return unsubscribe;
  }

  /**
   * 🔔 Trigger stats update notification
   */
  private triggerStatsUpdate(update: RealTimeStatsUpdate): void {
    console.log('🔔 Triggering stats update notification:', update);
    // This can be extended to notify specific components
  }

  /**
   * 🧹 Cleanup listeners
   */
  cleanup(): void {
    this.statsListeners.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.statsListeners.clear();
    console.log('🧹 Stats sync service cleaned up');
  }

  /**
   * 🔄 Force refresh all statistics
   */
  async forceRefreshStats(targetId: string, targetType: 'user' | 'club'): Promise<void> {
    try {
      if (targetType === 'user') {
        // Recalculate user stats
        await this.unifiedStatsService.getUserStatistics(targetId);
      } else if (targetType === 'club') {
        // Recalculate club stats
        await this.clubStatsService.getClubStats(targetId, false);
      }

      console.log('🔄 Forced stats refresh for:', targetType, targetId);
    } catch (error) {
      console.error('❌ Failed to force refresh stats:', error);
    }
  }
}

export default RealTimeStatsSyncService;




