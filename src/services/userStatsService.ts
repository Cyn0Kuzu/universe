/**
 * 🔧 User Stats Service
 * User statistics management service
 */

import type firebaseType from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { getFirebaseCompatSync } from '../firebase/compat';

const firebase = getFirebaseCompatSync() as typeof firebaseType;

export interface UserActivity {
  id?: string;
  type: string;
  description: string;
  points?: number;
  timestamp: any;
  metadata?: any;
}

export interface UserStats {
  totalScore: number;
  weeklyScore: number;
  monthlyScore: number;
  eventsJoined: number;
  clubsFollowed: number;
  badges: string[];
  lastActivity: any;
}

export class UserStatsService {
  private db: firebaseType.firestore.Firestore;
  private static instance: UserStatsService;

  private constructor() {
    this.db = getFirebaseCompatSync().firestore();
  }

  public static getInstance(): UserStatsService {
    if (!UserStatsService.instance) {
      UserStatsService.instance = new UserStatsService();
    }
    return UserStatsService.instance;
  }

  /**
   * Add activity to user's activity log
   */
  async addActivity(userId: string, activity: UserActivity): Promise<void> {
    try {
      const db = getFirebaseCompatSync().firestore();
      const activityRef = db.collection('userActivities').doc();
      
      await activityRef.set({
        ...activity,
        id: activityRef.id,
        userId,
        timestamp: activity.timestamp || getFirebaseCompatSync().firestore.FieldValue.serverTimestamp()
      });

      console.log(`✅ User activity logged: ${activity.type} for user ${userId}`);
    } catch (error) {
      console.error('Error adding user activity:', error);
    }
  }

  /**
   * Get user activities
   */
  async getUserActivities(userId: string, limit: number = 50): Promise<UserActivity[]> {
    try {
      const db = getFirebaseCompatSync().firestore();
      const snapshot = await db
        .collection('userActivities')
        .where('userId', '==', userId)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      const activities: UserActivity[] = [];
      snapshot.forEach(doc => {
        activities.push({ id: doc.id, ...doc.data() } as UserActivity);
      });

      return activities;
    } catch (error) {
      console.error('Error getting user activities:', error);
      return [];
    }
  }

  /**
   * Update user statistics
   */
  async updateUserStats(userId: string, stats: any): Promise<void> {
    try {
      const db = getFirebaseCompatSync().firestore();
      await db.collection('users').doc(userId).update({
        ...stats,
        lastUpdated: getFirebaseCompatSync().firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating user stats:', error);
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: string): Promise<UserStats | null> {
    try {
      const doc = await this.db.collection('userStats').doc(userId).get();
      if (doc.exists) {
        return doc.data() as UserStats;
      }
      return null;
    } catch (error) {
      console.error('Error getting user stats:', error);
      return null;
    }
  }

  /**
   * Ensure user stats document exists
   */
  async ensureUserStatsDocument(userId: string): Promise<void> {
    try {
      const docRef = this.db.collection('userStats').doc(userId);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        await docRef.set({
          totalScore: 0,
          weeklyScore: 0,
          monthlyScore: 0,
          eventsJoined: 0,
          clubsFollowed: 0,
          badges: [],
          lastActivity: getFirebaseCompatSync().firestore.FieldValue.serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error ensuring user stats document:', error);
    }
  }
}

// Export singleton instance
export const userStatsService = UserStatsService.getInstance();
