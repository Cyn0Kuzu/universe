import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { getFirestore, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { auth } from '../firebase/config';
import { logger } from '../utils/logger';

// Notification handler configuration
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationData {
  type: 'event' | 'club' | 'announcement' | 'reminder';
  title: string;
  body: string;
  data?: Record<string, any>;
}

class PushNotificationService {
  private static instance: PushNotificationService;
  private expoPushToken: string | null = null;

  private constructor() {}

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  /**
   * Initialize push notifications
   */
  async initialize(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        throw new Error('Push notifications only work on physical devices');
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        throw new Error('Push notification permissions not granted');
      }

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
        });

        await Notifications.setNotificationChannelAsync('events', {
          name: 'Events',
          importance: Notifications.AndroidImportance.HIGH,
          description: 'Event notifications',
          vibrationPattern: [0, 250, 250, 250],
          sound: 'default',
        });

        await Notifications.setNotificationChannelAsync('clubs', {
          name: 'Clubs',
          importance: Notifications.AndroidImportance.DEFAULT,
          description: 'Club updates and announcements',
          sound: 'default',
        });
      }

      // Get Expo push token
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      if (!projectId) {
        throw new Error('EAS project ID not configured');
      }

      const pushTokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      this.expoPushToken = pushTokenData.data;
      
      // Save token to user profile
      if (this.expoPushToken) {
        await this.saveTokenToUserProfile(this.expoPushToken);
      }

      return this.expoPushToken;
    } catch (error) {
      logger.error('Failed to initialize push notifications:', error);
      return null;
    }
  }

  /**
   * Save push token to user's Firestore profile
   */
  private async saveTokenToUserProfile(token: string): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const db = getFirestore();
      const userRef = doc(db, 'users', user.uid);
      
      await updateDoc(userRef, {
        pushTokens: arrayUnion(token),
        lastTokenUpdate: new Date(),
      });
    } catch (error) {
      logger.error('Failed to save push token:', error);
    }
  }

  /**
   * Schedule a local notification
   */
  async scheduleLocalNotification(
    notification: NotificationData,
    trigger?: Notifications.NotificationTriggerInput
  ): Promise<string> {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: trigger || null,
    });

    return identifier;
  }

  /**
   * Schedule event reminder
   */
  async scheduleEventReminder(
    eventId: string,
    eventTitle: string,
    eventDate: Date,
    reminderMinutes: number = 30
  ): Promise<string> {
    const reminderDate = new Date(eventDate.getTime() - reminderMinutes * 60 * 1000);
    
    if (reminderDate <= new Date()) {
      throw new Error('Event reminder time has already passed');
    }

    return this.scheduleLocalNotification(
      {
        type: 'reminder',
        title: 'Etkinlik Hatırlatması',
        body: `"${eventTitle}" etkinliği ${reminderMinutes} dakika sonra başlayacak!`,
        data: { eventId, type: 'event_reminder' },
      },
      { date: reminderDate }
    );
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelNotification(identifier: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /**
   * Get scheduled notifications
   */
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  /**
   * Handle notification response (when user taps notification)
   */
  addNotificationResponseListener(
    listener: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(listener);
  }

  /**
   * Handle foreground notifications
   */
  addNotificationReceivedListener(
    listener: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(listener);
  }

  /**
   * Get current push token
   */
  getPushToken(): string | null {
    return this.expoPushToken;
  }

  /**
   * Send push notification via Expo's push service
   */
  async sendPushNotification(
    tokens: string[],
    notification: NotificationData
  ): Promise<void> {
    const messages = tokens.map(token => ({
      to: token,
      sound: 'default',
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      channelId: this.getChannelForType(notification.type),
    }));

    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(`Push notification failed: ${JSON.stringify(result)}`);
      }
    } catch (error) {
      logger.error('Failed to send push notification:', error);
      throw error;
    }
  }

  /**
   * Get notification channel based on type
   */
  private getChannelForType(type: string): string {
    switch (type) {
      case 'event':
      case 'reminder':
        return 'events';
      case 'club':
      case 'announcement':
        return 'clubs';
      default:
        return 'default';
    }
  }
}

export default PushNotificationService;
