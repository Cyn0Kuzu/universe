// Professional Notification Management System - CLEAN VERSION
import { firebase } from './config';
import { ClubNotificationService, ClubNotification } from '../services/clubNotificationService';
import { SafeNotificationCreator } from '../utils/safeNotificationCreator';
import PushNotificationService from '../services/pushNotificationService';
import hybridPushService from '../services/hybridPushNotificationService';

export interface NotificationPreferences {
  userId: string;
  
  // Push Notifications
  pushEnabled: boolean;
  eventNotifications: boolean;
  clubNotifications: boolean;
  achievementNotifications: boolean;
  socialNotifications: boolean;
  
  // Email Notifications
  emailEnabled: boolean;
  weeklyDigest: boolean;
  eventReminders: boolean;
  clubUpdates: boolean;
  
  // In-App Notifications
  inAppEnabled: boolean;
  soundEnabled: boolean;
  badgeEnabled: boolean;
  
  // Frequency Settings
  instantNotifications: boolean;
  dailyDigest: boolean;
  
  // Do Not Disturb
  quietHoursEnabled: boolean;
  quietHoursStart: string; // "22:00"
  quietHoursEnd: string;   // "08:00"
  
  // Context-based
  locationBasedNotifications: boolean;
  universityNotifications: boolean;
  departmentNotifications: boolean;
  
  createdAt: firebase.firestore.Timestamp;
  updatedAt: firebase.firestore.Timestamp;
}

export class NotificationManagement {
  private static db = firebase.firestore();
  private static retryAttempts = 3;
  private static retryDelay = 1000; // 1 second

  /**
   * 🔄 Retry mechanism for failed operations
   */
  private static async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.retryAttempts,
    delay: number = this.retryDelay
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        console.warn(`❌ Attempt ${attempt}/${maxRetries} failed:`, error);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * 📱 Send notification to specific user
   */
  static async sendNotificationToUser(
    userId: string,
    type: ClubNotification['type'],
    title: string,
    message: string,
    data?: any,
    options?: {
      priority?: 'low' | 'normal' | 'high';
      category?: string;
      silent?: boolean;
    }
  ): Promise<boolean> {
    try {
      console.log('📱 Creating notification');
      console.log('Type:', type, 'User:', userId, 'Data:', JSON.stringify(data, null, 2));
      
      // Create notification directly - filter out undefined values
      const notification: any = {
        type,
        recipientId: userId,
        title,
        message,
        userId: data?.actorId || 'system',
        userName: data?.actorName || 'Sistem',
        data: data || {},
        priority: options?.priority || 'normal',
        category: options?.category || 'system',
        read: false,
        archived: false,
        actionRequired: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      // Only add optional fields if they have values
      if (data?.actorImage) {
        notification.userProfileImage = data.actorImage;
      }
      if (data?.clubId) {
        notification.clubId = data.clubId;
      }
      if (data?.eventId) {
        notification.eventId = data.eventId;
      }
      
      const docRef = await firebase.firestore()
        .collection('notifications')
        .add(notification);
      
      console.log('✅ Notification sent successfully with ID:', docRef.id);
      
      // Push bildirim gönder
      await this.sendPushNotification(userId, notification);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to send notification:', error);
      return false;
    }
  }

  /**
   * Get notification type for push notifications
   */
  private static getNotificationType(type: string): 'event' | 'club' | 'announcement' | 'reminder' {
    switch (type) {
      case 'user_follow':
      case 'user_unfollow':
      case 'club_follow':
      case 'club_unfollow':
        return 'club';
      case 'event_like':
      case 'event_comment':
      case 'event_attendance':
        return 'event';
      case 'announcement':
        return 'announcement';
      default:
        return 'announcement';
    }
  }

  /**
   * Push bildirim gönder
   */
  private static async sendPushNotification(userId: string, notification: any): Promise<void> {
    try {
      // Use hybrid push notification service
      await hybridPushService.sendToUser(
        userId,
        {
          type: this.getNotificationType(notification.type),
          title: notification.title,
          body: notification.message,
          data: {
            notificationId: userId,
            type: notification.type,
            ...notification.data
          }
        }
      );
    } catch (error) {
      console.error('Push notification failed:', error);
      // Push bildirim hatası ana bildirim sistemini etkilemesin
    }
  }
  static async sendUserFollowNotification(
    followerId: string,
    followerName: string,
    targetUserId: string,
    followerProfileImage?: string
  ): Promise<boolean> {
    try {
      console.log(`👥 Sending user follow notification from ${followerName} to user ${targetUserId}`);

      // Check if target user wants social notifications
      const preferences = await this.getUserNotificationPreferences(targetUserId);
      if (!preferences.socialNotifications) {
        console.log('🔕 Target user has social notifications disabled');
        return false;
      }

      return await this.sendNotificationToUser(
        targetUserId,
        'user_follow',
        'Yeni Takipçi 👥',
        `${followerName} seni takip etmeye başladı`,
        {
          actorId: followerId,
          actorName: followerName,
          actorImage: followerProfileImage,
          actionType: 'user_follow'
        },
        {
          priority: 'normal',
          category: 'social'
        }
      );
    } catch (error) {
      console.error('❌ Failed to send user follow notification:', error);
      return false;
    }
  }

  /**
   * 🔔 Get user notification preferences with defaults
   */
  static async getUserNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const doc = await this.db.collection('notificationPreferences').doc(userId).get();
      
      if (doc.exists) {
        return doc.data() as NotificationPreferences;
      } else {
        // Return default preferences
        const defaultPrefs: NotificationPreferences = {
          userId,
          pushEnabled: true,
          eventNotifications: true,
          clubNotifications: true,
          achievementNotifications: true,
          socialNotifications: true,
          emailEnabled: true,
          weeklyDigest: true,
          eventReminders: true,
          clubUpdates: true,
          inAppEnabled: true,
          soundEnabled: true,
          badgeEnabled: true,
          instantNotifications: true,
          dailyDigest: false,
          quietHoursEnabled: false,
          quietHoursStart: '22:00',
          quietHoursEnd: '08:00',
          locationBasedNotifications: true,
          universityNotifications: true,
          departmentNotifications: true,
          createdAt: firebase.firestore.Timestamp.now(),
          updatedAt: firebase.firestore.Timestamp.now()
        };
        
        // Save default preferences
        await this.db.collection('notificationPreferences').doc(userId).set(defaultPrefs);
        return defaultPrefs;
      }
    } catch (error) {
      console.error('❌ Failed to get notification preferences:', error);
      // Return safe defaults
      return {
        userId,
        pushEnabled: true,
        eventNotifications: true,
        clubNotifications: true,
        achievementNotifications: true,
        socialNotifications: true,
        emailEnabled: true,
        weeklyDigest: true,
        eventReminders: true,
        clubUpdates: true,
        inAppEnabled: true,
        soundEnabled: true,
        badgeEnabled: true,
        instantNotifications: true,
        dailyDigest: false,
        quietHoursEnabled: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        locationBasedNotifications: true,
        universityNotifications: true,
        departmentNotifications: true,
        createdAt: firebase.firestore.Timestamp.now(),
        updatedAt: firebase.firestore.Timestamp.now()
      };
    }
  }

  /**
   * ⚙️ Update user notification preferences
   */
  static async updateNotificationPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<boolean> {
    try {
      await this.db.collection('notificationPreferences').doc(userId).update({
        ...preferences,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('❌ Failed to update notification preferences:', error);
      return false;
    }
  }

  /**
   * 📊 Get notification statistics for user
   */
  static async getNotificationStats(userId: string): Promise<{
    total: number;
    unread: number;
    byType: Record<string, number>;
  }> {
    try {
      const snapshot = await this.db
        .collection('notifications')
        .where('recipientId', '==', userId)
        .get();

      const stats = {
        total: 0,
        unread: 0,
        byType: {} as Record<string, number>
      };

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        stats.total++;
        
        if (!data.read) {
          stats.unread++;
        }
        
        const type = data.type || 'unknown';
        stats.byType[type] = (stats.byType[type] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('❌ Failed to get notification stats:', error);
      return {
        total: 0,
        unread: 0,
        byType: {}
      };
    }
  }

  /**
   * 🧹 Mark notification as read
   */
  static async markNotificationAsRead(notificationId: string): Promise<boolean> {
    try {
      await this.db.collection('notifications').doc(notificationId).update({
        read: true,
        readAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('❌ Failed to mark notification as read:', error);
      return false;
    }
  }

  /**
   * 🧹 Mark all user notifications as read
   */
  static async markAllNotificationsAsRead(userId: string): Promise<boolean> {
    try {
      const snapshot = await this.db
        .collection('notifications')
        .where('recipientId', '==', userId)
        .where('read', '==', false)
        .get();

      const batch = this.db.batch();
      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          read: true,
          readAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      });

      await batch.commit();
      return true;
    } catch (error) {
      console.error('❌ Failed to mark all notifications as read:', error);
      return false;
    }
  }

  /**
   * 🗑️ Delete notification
   */
  static async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      await this.db.collection('notifications').doc(notificationId).delete();
      return true;
    } catch (error) {
      console.error('❌ Failed to delete notification:', error);
      return false;
    }
  }

  /**
   * 🧹 Clean old notifications (older than 30 days)
   */
  static async cleanOldNotifications(): Promise<number> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const snapshot = await this.db
        .collection('notifications')
        .where('createdAt', '<', firebase.firestore.Timestamp.fromDate(thirtyDaysAgo))
        .get();

      if (snapshot.empty) {
        return 0;
      }

      const batch = this.db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      return snapshot.size;
    } catch (error) {
      console.error('❌ Failed to clean old notifications:', error);
      return 0;
    }
  }
}

// Export individual functions for convenience
export const {
  sendNotificationToUser,
  sendUserFollowNotification,
  getUserNotificationPreferences,
  updateNotificationPreferences,
  getNotificationStats,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  cleanOldNotifications
} = NotificationManagement;

export default NotificationManagement;
