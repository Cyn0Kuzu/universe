/**
 * 🔔 Safe Notification Creator
 * Creates notifications without triggering complex cascades
 */

import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

export interface SafeNotificationData {
  type: string;
  title: string;
  message: string;
  userId: string;
  targetId?: string;
  metadata?: any;
}

export class SafeNotificationCreator {
  private db: firebase.firestore.Firestore;

  constructor() {
    this.db = firebase.firestore();
  }

  /**
   * Create a simple notification without complex triggers
   */
  async createNotification(data: SafeNotificationData): Promise<void> {
    try {
      await this.db.collection('notifications').add({
        ...data,
        read: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Error creating safe notification:', error);
    }
  }

  /**
   * Create achievement notification
   */
  async createAchievementNotification(
    userId: string,
    achievement: string,
    points: number
  ): Promise<void> {
    await this.createNotification({
      type: 'achievement',
      title: 'Yeni Başarı!',
      message: `${achievement} kazandınız! +${points} puan`,
      userId,
      metadata: { achievement, points }
    });
  }

  /**
   * Create score notification
   */
  async createScoreNotification(
    userId: string,
    action: string,
    points: number
  ): Promise<void> {
    if (points > 0) {
      await this.createNotification({
        type: 'score',
        title: 'Puan Kazandınız!',
        message: `${action} için +${points} puan aldınız`,
        userId,
        metadata: { action, points }
      });
    }
  }
}

export default new SafeNotificationCreator();
