/**
 * Club Activity Service
 * Manages club activity tracking and analytics
 */

import firebase from 'firebase/compat/app';
import { logError } from '../utils/errorHandling';

export interface ClubActivity {
  id: string;
  clubId: string;
  type: 'event_created' | 'member_joined' | 'event_liked' | 'event_commented' | 'member_promoted';
  description: string;
  timestamp: firebase.firestore.Timestamp;
  metadata?: {
    eventId?: string;
    memberId?: string;
    userId?: string;
    [key: string]: any;
  };
}

export interface ClubActivityStats {
  clubId: string;
  totalActivities: number;
  weeklyActivities: number;
  monthlyActivities: number;
  lastActivity: firebase.firestore.Timestamp | null;
  activityTypes: {
    [key: string]: number;
  };
}

class ClubActivityService {
  private db = firebase.firestore();

  /**
   * Log club activity
   */
  async logActivity(
    clubId: string,
    type: ClubActivity['type'],
    description: string,
    metadata?: ClubActivity['metadata']
  ): Promise<void> {
    try {
      const activity: Omit<ClubActivity, 'id'> = {
        clubId,
        type,
        description,
        timestamp: firebase.firestore.Timestamp.now(),
        metadata
      };

      await this.db.collection('clubActivities').add(activity);
      
      // Update club's last activity timestamp
      await this.db.collection('users').doc(clubId).update({
        lastActivity: firebase.firestore.Timestamp.now()
      });

    } catch (error) {
      logError(error, 'ClubActivityService.logActivity');
    }
  }

  /**
   * Get club activities
   */
  async getClubActivities(
    clubId: string,
    limit: number = 50
  ): Promise<ClubActivity[]> {
    try {
      const snapshot = await this.db
        .collection('clubActivities')
        .where('clubId', '==', clubId)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ClubActivity));
    } catch (error) {
      logError(error, 'ClubActivityService.getClubActivities');
      return [];
    }
  }

  /**
   * Get club activity statistics
   */
  async getClubActivityStats(clubId: string): Promise<ClubActivityStats> {
    try {
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get all activities
      const allActivitiesSnapshot = await this.db
        .collection('clubActivities')
        .where('clubId', '==', clubId)
        .get();

      // Get weekly activities
      const weeklyActivitiesSnapshot = await this.db
        .collection('clubActivities')
        .where('clubId', '==', clubId)
        .where('timestamp', '>=', firebase.firestore.Timestamp.fromDate(oneWeekAgo))
        .get();

      // Get monthly activities
      const monthlyActivitiesSnapshot = await this.db
        .collection('clubActivities')
        .where('clubId', '==', clubId)
        .where('timestamp', '>=', firebase.firestore.Timestamp.fromDate(oneMonthAgo))
        .get();

      const activities = allActivitiesSnapshot.docs.map(doc => doc.data() as ClubActivity);
      
      // Count activity types
      const activityTypes: { [key: string]: number } = {};
      activities.forEach(activity => {
        activityTypes[activity.type] = (activityTypes[activity.type] || 0) + 1;
      });

      // Get last activity
      const lastActivity = activities.length > 0 ? 
        activities.sort((a, b) => b.timestamp.seconds - a.timestamp.seconds)[0].timestamp : 
        null;

      return {
        clubId,
        totalActivities: allActivitiesSnapshot.size,
        weeklyActivities: weeklyActivitiesSnapshot.size,
        monthlyActivities: monthlyActivitiesSnapshot.size,
        lastActivity,
        activityTypes
      };
    } catch (error) {
      logError(error, 'ClubActivityService.getClubActivityStats');
      return {
        clubId,
        totalActivities: 0,
        weeklyActivities: 0,
        monthlyActivities: 0,
        lastActivity: null,
        activityTypes: {}
      };
    }
  }

  /**
   * Clean old activities (keep last 1000 per club)
   */
  async cleanOldActivities(clubId: string): Promise<void> {
    try {
      // Get all activities for the club
      const allSnapshot = await this.db
        .collection('clubActivities')
        .where('clubId', '==', clubId)
        .orderBy('timestamp', 'desc')
        .get();

      // If we have more than 1000, delete the oldest ones
      if (allSnapshot.size > 1000) {
        const docsToDelete = allSnapshot.docs.slice(1000);
        const batch = this.db.batch();
        
        docsToDelete.forEach((doc: firebase.firestore.DocumentSnapshot) => {
          batch.delete(doc.ref);
        });

        await batch.commit();
      }
    } catch (error) {
      logError(error, 'ClubActivityService.cleanOldActivities');
    }
  }
}

export const clubActivityService = new ClubActivityService();
export default ClubActivityService;