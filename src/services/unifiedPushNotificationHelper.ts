/**
 * Unified Push Notification Helper
 * Centralized helper to send push notifications using both Expo and FCM tokens
 */

import { firebase } from '../firebase/config';
import PushNotificationService from './pushNotificationService';

export interface PushNotificationPayload {
  type: 'event' | 'club' | 'announcement' | 'reminder';
  title: string;
  body: string;
  data?: Record<string, any>;
}

export class UnifiedPushNotificationHelper {
  /**
   * Send push notification to a user using all available tokens
   */
  static async sendToUser(
    userId: string,
    payload: PushNotificationPayload
  ): Promise<boolean> {
    try {
      // Get user's push tokens from Firestore
      const userDoc = await firebase.firestore()
        .collection('users')
        .doc(userId)
        .get();

      const userData = userDoc.data();

      if (!userData) {
        console.log(`📱 User document not found for ${userId}`);
        return false;
      }

      // Collect all available tokens
      const tokens: string[] = [];

      // Add Expo push token
      if (userData.expoPushToken) {
        tokens.push(userData.expoPushToken);
      }

      // Add additional pushTokens array (legacy support)
      if (userData.pushTokens && Array.isArray(userData.pushTokens)) {
        tokens.push(...userData.pushTokens);
      }

      // FCM tokens are handled by Android native service
      // They don't need to be sent through Expo push service
      const { fcmToken } = userData;
      if (fcmToken) {
        console.log(`📱 FCM token exists for user ${userId}, will be handled by Firebase`);
      }

      // Remove duplicates
      const uniqueTokens = [...new Set(tokens)];

      if (uniqueTokens.length === 0) {
        console.log(`📱 No push tokens found for user ${userId}`);
        return false;
      }

      // Send push notification using PushNotificationService
      const pushService = PushNotificationService.getInstance();
      await pushService.sendPushNotification(uniqueTokens, payload);

      console.log(`✅ Push notification sent to ${userId} with ${uniqueTokens.length} token(s)`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send push notification:', error);
      return false;
    }
  }

  /**
   * Send push notification to multiple users
   */
  static async sendToUsers(
    userIds: string[],
    payload: PushNotificationPayload
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    // Send notifications in parallel (with rate limiting)
    const batchSize = 10;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(userId => this.sendToUser(userId, payload))
      );

      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          success++;
        } else {
          failed++;
        }
      });

      // Small delay between batches
      if (i + batchSize < userIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`✅ Batch push notifications: ${success} success, ${failed} failed`);
    return { success, failed };
  }

  /**
   * Check if user has valid push tokens
   */
  static async hasValidTokens(userId: string): Promise<boolean> {
    try {
      const userDoc = await firebase.firestore()
        .collection('users')
        .doc(userId)
        .get();

      const userData = userDoc.data();
      if (!userData) {
        return false;
      }

      return !!(
        userData.expoPushToken ||
        userData.fcmToken ||
        (userData.pushTokens && userData.pushTokens.length > 0)
      );
    } catch (error) {
      console.error('Error checking push tokens:', error);
      return false;
    }
  }

  /**
   * Get notification type from string
   */
  static getNotificationType(type: string): 'event' | 'club' | 'announcement' | 'reminder' {
    switch (type) {
      case 'event':
      case 'event_created':
      case 'event_updated':
      case 'event_cancelled':
      case 'event_reminder':
        return 'event';
      
      case 'club':
      case 'club_joined':
      case 'club_announcement':
      case 'club_invitation':
        return 'club';
      
      case 'reminder':
        return 'reminder';
      
      default:
        return 'announcement';
    }
  }
}

