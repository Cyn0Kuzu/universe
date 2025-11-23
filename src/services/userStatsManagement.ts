/**
 * 📊 User Stats Management Service
 * Legacy service for user statistics management
 */

import type firebaseType from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { getFirebaseCompatSync } from '../firebase/compat';

const firebase = getFirebaseCompatSync() as typeof firebaseType;

export interface UserStats {
  userId: string;
  totalScore: number;
  weeklyScore: number;
  monthlyScore: number;
  eventsJoined: number;
  clubsFollowed: number;
  badges: string[];
  lastActivity: any;
}

export class UserStatsManagementService {
  private db: firebaseType.firestore.Firestore;
  private static instance: UserStatsManagementService;

  private constructor() {
    this.db = getFirebaseCompatSync().firestore();
  }

  public static getInstance(): UserStatsManagementService {
    if (!UserStatsManagementService.instance) {
      UserStatsManagementService.instance = new UserStatsManagementService();
    }
    return UserStatsManagementService.instance;
  }

  /**
   * Update user stats
   */
  async updateUserStats(userId: string, updates: Partial<UserStats>): Promise<void> {
    try {
      await this.db.collection('userStats').doc(userId).set(
        {
          ...updates,
          lastActivity: getFirebaseCompatSync().firestore.FieldValue.serverTimestamp()
        },
        { merge: true }
      );
    } catch (error) {
      console.error('Error updating user stats:', error);
    }
  }

  /**
   * Increment user score
   */
  async incrementUserScore(userId: string, points: number): Promise<void> {
    try {
      await this.db.collection('userStats').doc(userId).update({
        totalScore: getFirebaseCompatSync().firestore.FieldValue.increment(points),
        weeklyScore: getFirebaseCompatSync().firestore.FieldValue.increment(points),
        monthlyScore: getFirebaseCompatSync().firestore.FieldValue.increment(points),
        lastActivity: getFirebaseCompatSync().firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Error incrementing user score:', error);
    }
  }

  /**
   * Get user stats
   */
  async getUserStats(userId: string): Promise<UserStats | null> {
    try {
      const doc = await this.db.collection('userStats').doc(userId).get();
      if (doc.exists) {
        return { userId, ...doc.data() } as UserStats;
      }
      return null;
    } catch (error) {
      console.error('Error getting user stats:', error);
      return null;
    }
  }

  /**
   * Initialize user stats document
   */
  async initializeUserStats(userId: string): Promise<void> {
    try {
      await this.db.collection('userStats').doc(userId).set(
        {
          totalScore: 0,
          weeklyScore: 0,
          monthlyScore: 0,
          eventsJoined: 0,
          clubsFollowed: 0,
          badges: [],
          lastActivity: getFirebaseCompatSync().firestore.FieldValue.serverTimestamp()
        },
        { merge: true }
      );
    } catch (error) {
      console.error('Error initializing user stats:', error);
    }
  }
}

export default UserStatsManagementService.getInstance();
