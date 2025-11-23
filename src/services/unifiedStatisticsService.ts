/**
 * 📊 Unified Statistics Service
 * Provides synchronized and accurate statistics across all profile screens
 */

import type firebaseType from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { getFirebaseCompatSync } from '../firebase/compat';

const firebase = getFirebaseCompatSync() as typeof firebaseType;

export interface UserStatistics {
  likes: number;
  comments: number;
  participations: number;
  eventsOrganized?: number; // For clubs
  totalPoints: number;
  rank: number;
  level: number;
  streakCount: number;
  likesRank: number;
  commentsRank: number;
  participationsRank: number;
}

export interface ClubStatistics {
  likes: number;
  comments: number;
  eventsOrganized: number;
  memberCount: number;
  totalPoints: number;
  rank: number;
  level: number;
  likesRank: number;
  commentsRank: number;
  eventsRank: number;
}

class UnifiedStatisticsService {
  private db: firebaseType.firestore.Firestore;
  private static instance: UnifiedStatisticsService;

  private constructor() {
    this.db = getFirebaseCompatSync().firestore();
  }

  public static getInstance(): UnifiedStatisticsService {
    if (!UnifiedStatisticsService.instance) {
      UnifiedStatisticsService.instance = new UnifiedStatisticsService();
    }
    return UnifiedStatisticsService.instance;
  }

  /**
   * Get comprehensive user statistics (for students)
   */
  async getUserStatistics(userId: string): Promise<UserStatistics> {
    try {
      console.log('📊 Loading statistics for user:', userId);

      // Get user's event participations
      const participationsSnapshot = await this.db.collection('eventAttendees')
        .where('userId', '==', userId)
        .get();
      
      const totalParticipations = participationsSnapshot.size;
      console.log('📊 User participations:', totalParticipations);

      // Get user's likes across all events (not limited to participated events)
      const likesSnapshot = await this.db.collection('eventLikes')
        .where('userId', '==', userId)
        .get();
      const totalLikes = likesSnapshot.size;
      console.log('📊 User likes:', totalLikes);

      // Get user's comments across ALL events using collectionGroup (more efficient)
      let totalComments = 0;
      try {
        // Use collectionGroup query to search all comments subcollections at once
        const commentsSnapshot = await this.db.collectionGroup('comments')
          .where('userId', '==', userId)
          .get();
        totalComments = commentsSnapshot.size;
        console.log('📊 User comments (via collectionGroup):', totalComments);
      } catch (error) {
        console.warn('Error getting comments via collectionGroup, trying fallback method:', error);
        
        // Fallback: iterate through events (slower but more reliable)
        try {
          const eventsSnapshot = await this.db.collection('events').get();
          const eventIds = eventsSnapshot.docs.map(doc => doc.id);
          
          if (eventIds.length > 0) {
            // Process in batches to avoid Firebase limits
            const batchSize = 10;
            for (let i = 0; i < eventIds.length; i += batchSize) {
              const batch = eventIds.slice(i, i + batchSize);
              const commentsPromises = batch.map(async eventId => {
                try {
                  const commentsSnapshot = await this.db.collection('events')
                    .doc(eventId)
                    .collection('comments')
                    .where('userId', '==', userId)
                    .get();
                  return commentsSnapshot.size;
                } catch (error) {
                  console.warn('Error getting comments for event:', eventId, error);
                  return 0;
                }
              });
              const batchResults = await Promise.all(commentsPromises);
              totalComments += batchResults.reduce((sum, count) => sum + count, 0);
            }
          }
        } catch (fallbackError) {
          console.warn('Fallback comment count method also failed:', fallbackError);
          totalComments = 0;
        }
      }
      
      console.log('📊 User comments:', totalComments);

      // Get user scoring data
      let userScoreData = {
        totalPoints: 0,
        rank: 0,
        level: 1,
        streakCount: 0
      };

      try {
        const userScoreDoc = await this.db.collection('userScores').doc(userId).get();
        if (userScoreDoc.exists) {
          const data = userScoreDoc.data();
          userScoreData = {
            totalPoints: data?.totalPoints || 0,
            rank: data?.rank || 0,
            level: data?.level || 1,
            streakCount: data?.streakCount || 0
          };
        }
      } catch (error) {
        console.warn('Error getting user score data:', error);
      }

      // Calculate rankings (simplified approach)
      const likesRank = await this.calculateUserRankByMetric('likes', userId, totalLikes);
      const commentsRank = await this.calculateUserRankByMetric('comments', userId, totalComments);
      const participationsRank = await this.calculateUserRankByMetric('participations', userId, totalParticipations);

      const statistics: UserStatistics = {
        likes: totalLikes,
        comments: totalComments,
        participations: totalParticipations,
        totalPoints: userScoreData.totalPoints,
        rank: userScoreData.rank,
        level: userScoreData.level,
        streakCount: userScoreData.streakCount,
        likesRank,
        commentsRank,
        participationsRank
      };

      console.log('✅ User statistics loaded successfully:', statistics);
      return statistics;

    } catch (error) {
      console.error('❌ Error loading user statistics:', error);
      // Return default values on error
      return {
        likes: 0,
        comments: 0,
        participations: 0,
        totalPoints: 0,
        rank: 0,
        level: 1,
        streakCount: 0,
        likesRank: 0,
        commentsRank: 0,
        participationsRank: 0
      };
    }
  }

  /**
   * Get comprehensive club statistics (for clubs)
   */
  async getClubStatistics(clubId: string): Promise<ClubStatistics> {
    try {
      console.log('📊 Loading statistics for club:', clubId);

      // Get club's organized events - using 'createdBy' field
      const eventsSnapshot = await this.db.collection('events')
        .where('createdBy', '==', clubId)
        .get();
      const eventIds = eventsSnapshot.docs.map(doc => doc.id);
      const totalEventsOrganized = eventIds.length;
      console.log('📊 Club events organized (createdBy):', totalEventsOrganized);

      // Get club's member count
      const membersSnapshot = await this.db.collection('clubMembers')
        .where('clubId', '==', clubId)
        .where('status', '==', 'approved')
        .get();
      const memberCount = membersSnapshot.size;

      // Get total likes on club's events
      let totalLikes = 0;
      if (eventIds.length > 0) {
        const likesPromises = eventIds.map(async eventId => {
          try {
            const likesSnapshot = await this.db.collection('eventLikes')
              .where('eventId', '==', eventId)
              .get();
            return likesSnapshot.size;
          } catch (error) {
            console.warn('Error getting likes for event:', eventId, error);
            return 0;
          }
        });
        const likesResults = await Promise.all(likesPromises);
        totalLikes = likesResults.reduce((sum, count) => sum + count, 0);
      }

      // Get total comments on club's events
      let totalComments = 0;
      if (eventIds.length > 0) {
        const commentsPromises = eventIds.map(async eventId => {
          try {
            const commentsSnapshot = await this.db.collection('events')
              .doc(eventId)
              .collection('comments')
              .get();
            return commentsSnapshot.size;
          } catch (error) {
            console.warn('Error getting comments for event:', eventId, error);
            return 0;
          }
        });
        const commentsResults = await Promise.all(commentsPromises);
        totalComments = commentsResults.reduce((sum, count) => sum + count, 0);
      }

      // Get club scoring data
      let clubScoreData = {
        totalPoints: 0,
        rank: 0,
        level: 1
      };

      try {
        const clubScoreDoc = await this.db.collection('userScores').doc(clubId).get();
        if (clubScoreDoc.exists) {
          const data = clubScoreDoc.data();
          clubScoreData = {
            totalPoints: data?.totalPoints || 0,
            rank: data?.rank || 0,
            level: data?.level || 1
          };
        }
      } catch (error) {
        console.warn('Error getting club score data:', error);
      }

      // Calculate rankings
      const likesRank = await this.calculateClubRankByMetric('likes', clubId, totalLikes);
      const commentsRank = await this.calculateClubRankByMetric('comments', clubId, totalComments);
      const eventsRank = await this.calculateClubRankByMetric('events', clubId, totalEventsOrganized);

      const statistics: ClubStatistics = {
        likes: totalLikes,
        comments: totalComments,
        eventsOrganized: totalEventsOrganized,
        memberCount,
        totalPoints: clubScoreData.totalPoints,
        rank: clubScoreData.rank,
        level: clubScoreData.level,
        likesRank,
        commentsRank,
        eventsRank
      };

      console.log('✅ Club statistics loaded successfully:', statistics);
      return statistics;

    } catch (error) {
      console.error('❌ Error loading club statistics:', error);
      // Return default values on error
      return {
        likes: 0,
        comments: 0,
        eventsOrganized: 0,
        memberCount: 0,
        totalPoints: 0,
        rank: 0,
        level: 1,
        likesRank: 0,
        commentsRank: 0,
        eventsRank: 0
      };
    }
  }

  /**
   * Calculate user rank by specific metric (simplified ranking)
   */
  private async calculateUserRankByMetric(metric: string, userId: string, userValue: number): Promise<number> {
    try {
      // This is a simplified ranking calculation
      // In a real implementation, you might want to cache rankings or use a more efficient approach
      
      if (userValue === 0) return 0;
      
      // For now, return a simplified rank based on the value
      // You could implement more sophisticated ranking logic here
      return Math.max(1, Math.floor(userValue / 10) + 1);
      
    } catch (error) {
      console.warn(`Error calculating user rank for ${metric}:`, error);
      return 0;
    }
  }

  /**
   * Calculate club rank by specific metric (simplified ranking)
   */
  private async calculateClubRankByMetric(metric: string, clubId: string, clubValue: number): Promise<number> {
    try {
      // This is a simplified ranking calculation
      // In a real implementation, you might want to cache rankings or use a more efficient approach
      
      if (clubValue === 0) return 0;
      
      // For now, return a simplified rank based on the value
      return Math.max(1, Math.floor(clubValue / 5) + 1);
      
    } catch (error) {
      console.warn(`Error calculating club rank for ${metric}:`, error);
      return 0;
    }
  }

  /**
   * Refresh statistics cache for a user/club
   */
  async refreshStatistics(id: string, isClub: boolean = false): Promise<UserStatistics | ClubStatistics> {
    if (isClub) {
      return await this.getClubStatistics(id);
    } else {
      return await this.getUserStatistics(id);
    }
  }
}

export default UnifiedStatisticsService.getInstance();
