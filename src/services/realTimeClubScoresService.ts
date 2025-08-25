/**
 * 🏆 Real Time Club Scores Service
 * Real-time club scoring and statistics service
 */

import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

export interface ClubScore {
  clubId: string;
  clubName: string;
  totalScore: number;
  memberCount: number;
  eventsCount: number;
  followersCount: number;
  lastUpdated: any;
}

export class RealTimeClubScoresService {
  private db: firebase.firestore.Firestore;
  private static instance: RealTimeClubScoresService;

  private constructor() {
    this.db = firebase.firestore();
  }

  public static getInstance(): RealTimeClubScoresService {
    if (!RealTimeClubScoresService.instance) {
      RealTimeClubScoresService.instance = new RealTimeClubScoresService();
    }
    return RealTimeClubScoresService.instance;
  }

  /**
   * Get club scores in real-time
   */
  async getClubScores(limit: number = 50): Promise<ClubScore[]> {
    try {
      const snapshot = await this.db
        .collection('clubs')
        .where('isActive', '==', true)
        .orderBy('totalScore', 'desc')
        .limit(limit)
        .get();

      const scores: ClubScore[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        scores.push({
          clubId: doc.id,
          clubName: data.name || data.displayName || 'İsimsiz Kulüp',
          totalScore: data.totalScore || 0,
          memberCount: data.memberCount || 0,
          eventsCount: data.eventsCount || 0,
          followersCount: data.followersCount || 0,
          lastUpdated: data.lastUpdated
        });
      });

      return scores;
    } catch (error) {
      console.error('Error getting club scores:', error);
      return [];
    }
  }

  /**
   * Update club score
   */
  async updateClubScore(clubId: string, points: number): Promise<void> {
    try {
      await this.db.collection('clubs').doc(clubId).update({
        totalScore: firebase.firestore.FieldValue.increment(points),
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating club score:', error);
    }
  }

  /**
   * Listen to club score changes
   */
  listenToClubScores(
    callback: (scores: ClubScore[]) => void,
    limit: number = 50
  ): () => void {
    const unsubscribe = this.db
      .collection('clubs')
      .where('isActive', '==', true)
      .orderBy('totalScore', 'desc')
      .limit(limit)
      .onSnapshot(
        (snapshot) => {
          const scores: ClubScore[] = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            scores.push({
              clubId: doc.id,
              clubName: data.name || data.displayName || 'İsimsiz Kulüp',
              totalScore: data.totalScore || 0,
              memberCount: data.memberCount || 0,
              eventsCount: data.eventsCount || 0,
              followersCount: data.followersCount || 0,
              lastUpdated: data.lastUpdated
            });
          });
          callback(scores);
        },
        (error) => {
          console.error('Error listening to club scores:', error);
          callback([]);
        }
      );

    return unsubscribe;
  }
}

export default RealTimeClubScoresService.getInstance();
