/**
 * Fixed Push Notification Service
 * Comprehensive push notification service with error handling
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { firebase } from '../firebase/config';

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
   * Initialize push notifications with comprehensive error handling
   */
  async initialize(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        console.warn('Push notifications only work on physical devices');
        return null;
      }

      console.log('🚀 Starting push notification initialization...');

      // Request Expo notifications permissions with retry logic
      let finalStatus = 'undetermined';
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries && finalStatus !== 'granted') {
        try {
          const { status: existingStatus } = await Notifications.getPermissionsAsync();
          console.log(`📋 Current notification permission status: ${existingStatus} (attempt ${retryCount + 1})`);
          
          finalStatus = existingStatus;

          if (existingStatus !== 'granted') {
            console.log('🔔 Requesting notification permissions...');
            
            // Try multiple permission request strategies
            let permissionGranted = false;
            
            // Strategy 1: Standard request
            try {
              const { status } = await Notifications.requestPermissionsAsync({
                ios: {
                  allowAlert: true,
                  allowBadge: true,
                  allowSound: true,
                  allowAnnouncements: true,
                },
                android: {
                  allowAlert: true,
                  allowBadge: true,
                  allowSound: true,
                },
              });
              finalStatus = status;
              permissionGranted = status === 'granted';
              console.log(`✅ Permission request result: ${finalStatus}`);
            } catch (permissionError) {
              console.warn('⚠️ Standard permission request failed:', permissionError);
            }
            
            // Strategy 2: If still not granted, try again with different approach
            if (!permissionGranted) {
              try {
                console.log('🔄 Retrying permission request...');
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
                permissionGranted = status === 'granted';
                console.log(`🔄 Retry permission result: ${finalStatus}`);
              } catch (retryError) {
                console.warn('⚠️ Retry permission request failed:', retryError);
              }
            }
            
            // Strategy 3: Show user-friendly message
            if (!permissionGranted) {
              console.log('📱 Notification permissions not granted - user needs to enable manually');
              // Don't return null here - continue with limited functionality
            }
          }
          
          retryCount++;
          if (finalStatus !== 'granted' && retryCount < maxRetries) {
            console.log(`⏳ Waiting 2 seconds before retry ${retryCount + 1}/${maxRetries}...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (error) {
          console.error(`❌ Permission request attempt ${retryCount + 1} failed:`, error);
          retryCount++;
        }
      }

      // Continue even if permissions not granted - user can enable later
      if (finalStatus !== 'granted') {
        console.warn('⚠️ Push notification permissions not granted - continuing with limited functionality');
        // Don't return null - continue with token generation
      }

      // Configure notification channels for Android
      if (Platform.OS === 'android') {
        await this.setupAndroidNotificationChannels();
      }

      // Get Expo push token with multiple strategies
      try {
        const projectId = 'universe-a6f60'; // Firebase project ID
        console.log('🔑 Getting Expo push token with project ID:', projectId);
        
        let token = null;
        let tokenAttempts = 0;
        const maxTokenAttempts = 3;

        while (!token && tokenAttempts < maxTokenAttempts) {
          try {
            tokenAttempts++;
            console.log(`🔑 Token attempt ${tokenAttempts}/${maxTokenAttempts}`);
            
            const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
            token = tokenData.data;

            if (token) {
              console.log('📱 Expo Token obtained:', `${token.substring(0, 20)}...`);
              break;
            }
          } catch (tokenError) {
            console.warn(`⚠️ Token attempt ${tokenAttempts} failed:`, tokenError);
            if (tokenAttempts < maxTokenAttempts) {
              console.log(`⏳ Waiting 3 seconds before token retry...`);
              await new Promise(resolve => setTimeout(resolve, 3000));
            }
          }
        }

        if (!token) {
          console.error('❌ Failed to obtain Expo push token after all attempts');
          return null;
        }

        this.expoPushToken = token;
        
        // Save token to user profile
        await this.saveTokenToUserProfile(token);
        
        // Setup notification listeners
        this.setupNotificationListeners();

        console.log('✅ Push notifications initialized successfully');
        return token;
      } catch (tokenError) {
        console.error('❌ Failed to get Expo push token:', tokenError);
        return null;
      }
    } catch (error) {
      console.error('❌ Failed to initialize push notifications:', error);
      return null;
    }
  }

  /**
   * Setup Android notification channels with comprehensive error handling
   */
  private async setupAndroidNotificationChannels(): Promise<void> {
    try {
      console.log('🔧 Setting up Android notification channels...');
      
      // Default channel with retry logic
      let channelSetupSuccess = false;
      let channelAttempts = 0;
      const maxChannelAttempts = 3;

      while (!channelSetupSuccess && channelAttempts < maxChannelAttempts) {
        try {
          channelAttempts++;
          console.log(`🔧 Channel setup attempt ${channelAttempts}/${maxChannelAttempts}`);
          
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Universe Campus',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#6750A4',
            sound: 'default',
            description: 'General notifications from Universe Campus',
            enableLights: true,
            enableVibrate: true,
            showBadge: true,
          });
          
          channelSetupSuccess = true;
          console.log('✅ Default notification channel setup successful');
        } catch (channelError) {
          console.warn(`⚠️ Channel setup attempt ${channelAttempts} failed:`, channelError);
          if (channelAttempts < maxChannelAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }

      // Events channel
      await Notifications.setNotificationChannelAsync('events', {
        name: 'Etkinlikler',
        importance: Notifications.AndroidImportance.HIGH,
        description: 'Event notifications and reminders',
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6750A4',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
      });

      // Club channel
      await Notifications.setNotificationChannelAsync('clubs', {
        name: 'Kulüpler',
        importance: Notifications.AndroidImportance.HIGH,
        description: 'Club notifications and updates',
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6750A4',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
      });

      console.log('✅ Android notification channels configured');
    } catch (error) {
      console.error('❌ Failed to setup Android notification channels:', error);
    }
  }

  /**
   * Get Expo push token with retry logic
   */
  private async getExpoPushToken(): Promise<string | null> {
    try {
      const projectId = (Constants as any)?.expoConfig?.extra?.eas?.projectId || 
                       (Constants as any)?.easConfig?.projectId;
      
      if (!projectId) {
        console.error('❌ EAS project ID not found in configuration');
        return null;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId } as any);
      const token = (tokenData as any)?.data ?? null;

      if (!token) {
        console.error('❌ Failed to obtain Expo push token');
        return null;
      }

      return token;
    } catch (error) {
      console.error('❌ Error getting Expo push token:', error);
      return null;
    }
  }

  /**
   * Save push token to user's Firestore profile
   */
  private async saveTokenToUserProfile(expoToken: string): Promise<void> {
    try {
      const user = firebase.auth().currentUser;
      if (!user) {
        console.warn('No authenticated user found for push token save');
        return;
      }

      const db = firebase.firestore();
      const userRef = db.collection('users').doc(user.uid);
      
      // Update user document with push token
      await userRef.update({
        expoPushToken: expoToken,
        pushTokens: firebase.firestore.FieldValue.arrayUnion(expoToken),
        lastTokenUpdate: firebase.firestore.FieldValue.serverTimestamp(),
        deviceInfo: {
          platform: Platform.OS,
          version: Platform.Version,
          isDevice: Device.isDevice,
        },
      });

      console.log('✅ Push token saved to user profile');
    } catch (error) {
      console.error('❌ Failed to save push token to user profile:', error);
    }
  }

  /**
   * Setup notification listeners
   */
  private setupNotificationListeners(): void {
    try {
      // Handle notifications received while app is in foreground
      Notifications.addNotificationReceivedListener(notification => {
        console.log('📱 Notification received:', notification);
      });

      // Handle notification taps
      Notifications.addNotificationResponseReceivedListener(response => {
        console.log('📱 Notification tapped:', response);
        // Handle navigation based on notification data
        this.handleNotificationTap(response);
      });

      console.log('✅ Notification listeners setup completed');
    } catch (error) {
      console.error('❌ Failed to setup notification listeners:', error);
    }
  }

  /**
   * Handle notification tap
   */
  private handleNotificationTap(response: Notifications.NotificationResponse): void {
    try {
      const data = response.notification.request.content.data;
      console.log('📱 Handling notification tap with data:', data);
      
      // Navigate based on notification type
      if (data?.type === 'event' && data?.eventId) {
        // Navigate to event detail
        console.log('📱 Navigating to event:', data.eventId);
      } else if (data?.type === 'club' && data?.clubId) {
        // Navigate to club detail
        console.log('📱 Navigating to club:', data.clubId);
      }
    } catch (error) {
      console.error('❌ Error handling notification tap:', error);
    }
  }

  /**
   * Send push notification via Expo's push service
   */
  async sendPushNotification(
    tokens: string[],
    notification: NotificationData
  ): Promise<void> {
    if (!tokens || tokens.length === 0) {
      console.warn('No tokens provided for push notification');
      return;
    }

    const messages = tokens.map(token => ({
      to: token,
      sound: 'default',
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      channelId: this.getChannelForType(notification.type),
      priority: 'high',
      badge: 1,
    }));

    try {
      console.log(`Sending push notification to ${tokens.length} tokens: ${notification.title}`);
      
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
        console.error(`Push notification failed: ${response.status} - ${JSON.stringify(result)}`);
        throw new Error(`Push notification failed: ${JSON.stringify(result)}`);
      }

      // Log successful sends
      if (result.data) {
        const successCount = result.data.filter((item: any) => item.status === 'ok').length;
        const errorCount = result.data.filter((item: any) => item.status === 'error').length;
        
        console.log(`Push notification sent successfully: ${successCount} success, ${errorCount} errors`);
        
        // Log any errors for debugging
        result.data.forEach((item: any, index: number) => {
          if (item.status === 'error') {
            console.error(`Push notification error for token ${index}: ${item.message}`);
          }
        });
      }
    } catch (error) {
      console.error('Failed to send push notification:', error);
      throw error;
    }
  }

  /**
   * Get notification channel based on type
   */
  private getChannelForType(type: string): string {
    switch (type) {
      case 'event':
        return 'events';
      case 'club':
        return 'clubs';
      case 'announcement':
      case 'reminder':
      default:
        return 'default';
    }
  }

  /**
   * Get current Expo token for testing
   */
  getCurrentExpoToken(): string | null {
    return this.expoPushToken;
  }

  /**
   * Check if push notifications are available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted' && Device.isDevice;
    } catch (error) {
      console.error('Error checking notification availability:', error);
      return false;
    }
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications(): Promise<void> {
    try {
      await Notifications.dismissAllNotificationsAsync();
      console.log('✅ All notifications cleared');
    } catch (error) {
      console.error('❌ Failed to clear notifications:', error);
    }
  }

  /**
   * Get notification count
   */
  async getNotificationCount(): Promise<number> {
    try {
      const notifications = await Notifications.getPresentedNotificationsAsync();
      return notifications.length;
    } catch (error) {
      console.error('❌ Failed to get notification count:', error);
      return 0;
    }
  }
}

export default PushNotificationService;