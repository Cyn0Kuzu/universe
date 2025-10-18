// Direct notification creation bypass - guaranteed to work
import { firebase } from '../firebase/config';
import hybridPushService from '../services/hybridPushNotificationService';

export class DirectNotificationCreator {
  
  /**
   * Create a notification directly in Firebase with absolute minimal fields
   * This bypasses ALL services and guarantees the notification will be created
   */
  static async createDirectUserFollowNotification(targetUserId: string): Promise<string | null> {
    try {
      console.log('🚨 DIRECT: Creating minimal user follow notification for:', targetUserId);
      
      // Absolutely minimal notification object
      const notification = {
        type: 'user_follow',
        recipientId: targetUserId,
        title: 'DIRECT TEST: Yeni Takipçi',
        message: 'DirectTestUser seni takip etmeye başladı',
        read: false,
        archived: false,
        priority: 'medium',
        category: 'social',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        userId: 'direct-test-' + Date.now(),
        userName: 'DirectTestUser'
      };

      console.log('🚨 DIRECT: Creating notification with data:', notification);

      const docRef = await firebase.firestore()
        .collection('notifications')
        .add(notification);

      console.log('✅ DIRECT: Notification created successfully with ID:', docRef.id);
      
      // Send push notification
      await this.sendPushNotification(targetUserId, notification);
      
      return docRef.id;
      
    } catch (error) {
      console.error('❌ DIRECT: Failed to create notification:', error);
      return null;
    }
  }

  /**
   * Send push notification
   */
  private static async sendPushNotification(userId: string, notification: any): Promise<void> {
    try {
      // Use hybrid push notification service
      await hybridPushService.sendToUser(
        userId,
        {
          type: 'announcement',
          title: notification.title,
          body: notification.message,
          data: {
            notificationId: userId,
            type: notification.type
          }
        }
      );
    } catch (error) {
      console.error('Push notification failed:', error);
    }
  }

  /**
   * Test if notifications can be read back correctly
   */
  static async testNotificationRead(targetUserId: string): Promise<void> {
    try {
      console.log('🔍 DIRECT: Testing notification read for user:', targetUserId);
      
      const snapshot = await firebase.firestore()
        .collection('notifications')
        .where('recipientId', '==', targetUserId)
        .get();
        
      console.log('🔍 DIRECT: Read test returned', snapshot.size, 'notifications');
      
      let userFollowCount = 0;
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data.type === 'user_follow') {
          userFollowCount++;
          console.log('🔍 DIRECT: Found user_follow notification:', {
            id: doc.id,
            title: data.title,
            archived: data.archived,
            read: data.read
          });
        }
      });
      
      console.log('🔍 DIRECT: Total user_follow notifications found:', userFollowCount);
      
    } catch (error) {
      console.error('❌ DIRECT: Read test failed:', error);
    }
  }

  /**
   * Clean up test notifications
   */
  static async cleanupTestNotifications(targetUserId: string): Promise<void> {
    try {
      console.log('🧹 DIRECT: Cleaning up test notifications for:', targetUserId);
      
      const snapshot = await firebase.firestore()
        .collection('notifications')
        .where('recipientId', '==', targetUserId)
        .where('message', '>=', 'DirectTestUser')
        .where('message', '<=', 'DirectTestUser\uf8ff')
        .get();
        
      const batch = firebase.firestore().batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      console.log('🧹 DIRECT: Cleaned up', snapshot.size, 'test notifications');
      
    } catch (error) {
      console.error('❌ DIRECT: Cleanup failed:', error);
    }
  }
}

export default DirectNotificationCreator;
