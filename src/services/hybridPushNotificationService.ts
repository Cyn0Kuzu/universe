/**
 * Hybrid Push Notification Service
 * 
 * This service creates notification documents in Firestore,
 * which trigger Cloud Functions to send actual push notifications.
 * 
 * Architecture:
 * 1. Client creates notification document in Firestore
 * 2. Cloud Function is triggered automatically
 * 3. Cloud Function sends push via FCM/Expo
 * 4. Cloud Function updates notification document with status
 * 
 * Benefits:
 * - Server-side push notification sending (secure)
 * - Automatic retry and error handling
 * - Support for both FCM and Expo tokens
 * - Notification history in Firestore
 */

import { firebase } from '../firebase';
import { Platform } from 'react-native';

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  type?: 'event' | 'club' | 'announcement' | 'reminder';
}

export class HybridPushNotificationService {
  private static instance: HybridPushNotificationService;

  private constructor() {}

  static getInstance(): HybridPushNotificationService {
    if (!HybridPushNotificationService.instance) {
      HybridPushNotificationService.instance = new HybridPushNotificationService();
    }
    return HybridPushNotificationService.instance;
  }

  /**
   * Send push notification to a user
   * Creates a Firestore document that triggers the Cloud Function
   */
  async sendToUser(
    userId: string,
    payload: PushNotificationPayload
  ): Promise<boolean> {
    try {
      console.log(`📱 Creating notification for user ${userId}: ${payload.title}`);

      // Create notification document in Firestore
      // This will trigger the sendPushNotification Cloud Function
      const notificationRef = await firebase.firestore()
        .collection('notifications')
        .add({
          userId,
          title: payload.title,
          body: payload.body,
          type: payload.type || 'default',
          data: payload.data || {},
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          read: false,
          pushSent: false,
          source: Platform.OS,
        });

      console.log(`✅ Notification document created: ${notificationRef.id}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to create notification:', error);
      return false;
    }
  }

  /**
   * Send push notification to multiple users
   * Creates batch of Firestore documents
   */
  async sendToUsers(
    userIds: string[],
    payload: PushNotificationPayload
  ): Promise<{ success: number; failed: number }> {
    console.log(`📱 Creating notifications for ${userIds.length} users: ${payload.title}`);

    let success = 0;
    let failed = 0;

    try {
      // Use batched writes for better performance (max 500 per batch)
      const batchSize = 500;
      const notificationsRef = firebase.firestore().collection('notifications');

      for (let i = 0; i < userIds.length; i += batchSize) {
        const batchUserIds = userIds.slice(i, i + batchSize);
        const batch = firebase.firestore().batch();

        batchUserIds.forEach(userId => {
          const docRef = notificationsRef.doc();
          batch.set(docRef, {
            userId,
            title: payload.title,
            body: payload.body,
            type: payload.type || 'default',
            data: payload.data || {},
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            read: false,
            pushSent: false,
            source: Platform.OS,
          });
        });

        try {
          await batch.commit();
          success += batchUserIds.length;
        } catch (batchError) {
          console.error(`❌ Batch commit failed for ${batchUserIds.length} users:`, batchError);
          failed += batchUserIds.length;
        }
      }

      console.log(`✅ Created ${success} notifications, ${failed} failed`);
    } catch (error) {
      console.error('❌ Batch notification creation failed:', error);
      failed = userIds.length - success;
    }

    return { success, failed };
  }

  /**
   * Send immediate push notification using callable function
   * Use this for critical notifications that need immediate delivery
   * without waiting for Firestore trigger
   */
  async sendImmediateToUser(
    userId: string,
    payload: PushNotificationPayload
  ): Promise<boolean> {
    try {
      console.log(`⚡ Sending immediate notification to ${userId}: ${payload.title}`);

      const sendManualNotification = firebase
        .functions()
        .httpsCallable('sendManualNotification');

      const result = await sendManualNotification({
        userId,
        title: payload.title,
        body: payload.body,
        type: payload.type || 'default',
        customData: payload.data || {},
      });

      if (result.data.success) {
        console.log(`✅ Immediate notification sent: ${result.data.message}`);
        
        // Still create notification document for history
        await firebase.firestore().collection('notifications').add({
          userId,
          title: payload.title,
          body: payload.body,
          type: payload.type || 'default',
          data: payload.data || {},
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          read: false,
          pushSent: true,
          immediate: true,
          source: Platform.OS,
        });
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Failed to send immediate notification:', error);
      return false;
    }
  }

  /**
   * Send batch notifications using Cloud Function
   * More efficient for large numbers of users
   */
  async sendBatchToUsers(
    userIds: string[],
    payload: PushNotificationPayload
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    try {
      console.log(`⚡ Sending batch notifications to ${userIds.length} users: ${payload.title}`);

      const sendBatchNotifications = firebase
        .functions()
        .httpsCallable('sendBatchNotifications');

      const result = await sendBatchNotifications({
        userIds,
        title: payload.title,
        body: payload.body,
        type: payload.type || 'default',
        customData: payload.data || {},
      });

      console.log(`✅ Batch complete: ${result.data.sent} sent, ${result.data.failed} failed`);
      
      return {
        success: result.data.sent,
        failed: result.data.failed,
        errors: result.data.errors || [],
      };
    } catch (error) {
      console.error('❌ Failed to send batch notifications:', error);
      return {
        success: 0,
        failed: userIds.length,
        errors: [error.message],
      };
    }
  }

  /**
   * Check if user has valid push tokens
   */
  async hasValidTokens(userId: string): Promise<boolean> {
    try {
      const userDoc = await firebase.firestore()
        .collection('users')
        .doc(userId)
        .get();

      const userData = userDoc.data();
      if (!userData) {
        return false;
      }

      return !!(userData.expoPushToken || userData.fcmToken);
    } catch (error) {
      console.error('Error checking push tokens:', error);
      return false;
    }
  }

  /**
   * Get user's notification preferences
   */
  async getNotificationPreferences(userId: string): Promise<{
    enabled: boolean;
    events: boolean;
    clubs: boolean;
    announcements: boolean;
  }> {
    try {
      const userDoc = await firebase.firestore()
        .collection('users')
        .doc(userId)
        .get();

      const userData = userDoc.data();
      
      return {
        enabled: userData?.notificationsEnabled ?? true,
        events: userData?.eventNotifications ?? true,
        clubs: userData?.clubNotifications ?? true,
        announcements: userData?.announcementNotifications ?? true,
      };
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      return {
        enabled: true,
        events: true,
        clubs: true,
        announcements: true,
      };
    }
  }

  /**
   * Check if user should receive notification based on preferences
   */
  async shouldSendNotification(
    userId: string,
    notificationType: string
  ): Promise<boolean> {
    const prefs = await this.getNotificationPreferences(userId);
    
    if (!prefs.enabled) {
      return false;
    }

    switch (notificationType) {
      case 'event':
        return prefs.events;
      case 'club':
        return prefs.clubs;
      case 'announcement':
        return prefs.announcements;
      default:
        return true;
    }
  }
}

// Export singleton instance
export default HybridPushNotificationService.getInstance();







