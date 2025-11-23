/**
 * Fixed Push Notification Service
 * Comprehensive push notification service with error handling
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import type firebaseCompat from 'firebase/compat/app';
import { getFirebaseCompatSync } from '../firebase/compat';

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
  private listenersAttached = false;
  private notificationReceivedSubscription?: Notifications.Subscription;
  private notificationResponseSubscription?: Notifications.Subscription;
  private initializingPromise: Promise<string | null> | null = null;
  private lastRegisteredUserId: string | null = null;

  private constructor() {}

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  /**
   * Initialize push notifications (simplified and reliable)
   */
  async initialize(): Promise<string | null> {
    if (this.initializingPromise) {
      return this.initializingPromise;
    }

    this.initializingPromise = (async () => {
      try {
        // 🛡️ SAFETY: Device check with error handling (simulator'da da çalışması için)
        try {
          if (!Device.isDevice) {
            console.warn('⚠️ Push notifications may not work on simulators');
            // Simulator'da da devam et (crash yerine null döndür)
          }
        } catch (deviceCheckError) {
          console.warn('⚠️ Device check failed:', deviceCheckError);
          // Device check hatası durumunda devam et
        }

        console.log('🚀 Starting push notification initialization...');

        // 🛡️ SAFETY: Check current permission status with error handling
        let existingStatus = 'undetermined';
        try {
          const permissionResult = await Notifications.getPermissionsAsync();
          existingStatus = permissionResult.status;
          console.log(`📋 Current notification permission status: ${existingStatus}`);
        } catch (permError) {
          console.error('❌ Permission check failed:', permError);
          return null; // Çökme yerine null döndür
        }

        // If not granted, request permission
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          console.log('🔔 Requesting notification permissions...');
          try {
            const { status } = await Notifications.requestPermissionsAsync({
              ios: {
                allowAlert: true,
                allowBadge: true,
                allowSound: true,
                // allowAnnouncements removed - not supported in iOS notification permissions
              },
              android: {
                allowAlert: true,
                allowBadge: true,
                allowSound: true,
              },
            });
            finalStatus = status;
            console.log(`✅ Permission request result: ${finalStatus}`);
          } catch (requestError) {
            console.error('❌ Permission request failed:', requestError);
            return null; // Çökme yerine null döndür
          }
        }

        // If still not granted after request, return early
        if (finalStatus !== 'granted') {
          console.warn('⚠️ Notification permission denied by user');
          return null;
        }

        // Configure notification channels for Android
        if (Platform.OS === 'android') {
          await this.setupAndroidNotificationChannels();
        }

        // Initialize FCM token service for Android
        if (Platform.OS === 'android') {
          try {
            const FCMTokenService = require('./fcmTokenService').default;
            const fcmService = FCMTokenService.getInstance();
            const fcmToken = await fcmService.initialize();
            console.log('✅ FCM service initialized:', fcmToken ? 'Token obtained' : 'No token');
          } catch (fcmError) {
            console.warn('⚠️ FCM initialization failed (continuing with Expo tokens):', fcmError);
          }
        }

        // Get Expo push token
        try {
          // Use EAS project ID from app.json
          const projectId = Constants.expoConfig?.extra?.eas?.projectId || '87915ccc-6506-4464-8a60-1573cbc33a76';
          console.log('🔑 Getting Expo push token with EAS project ID:', projectId);
          
          const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
          const token = tokenData.data;

          if (!token) {
            console.error('❌ Failed to obtain Expo push token');
            return null;
          }

          console.log('📱 Expo Token obtained:', `${token.substring(0, 20)}...`);
          this.expoPushToken = token;
          
          // Save token to user profile
          await this.saveTokenToUserProfile(token);
          
          // Setup notification listeners
          this.attachNotificationListeners();

          console.log('✅ Push notifications initialized successfully');
          return token;
        } catch (tokenError) {
          console.error('❌ Failed to get Expo push token:', tokenError);
          return null;
        }
      } catch (error) {
        console.error('❌ Failed to initialize push notifications:', error);
        return null;
      } finally {
        this.initializingPromise = null;
      }
    })();

    return this.initializingPromise;
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
  private async saveTokenToUserProfile(expoToken: string, explicitUser?: firebaseCompat.User | null): Promise<void> {
    try {
      const user = explicitUser || getFirebaseCompatSync().auth().currentUser;
      if (!user) {
        console.warn('No authenticated user found for push token save');
        return;
      }

      const db = getFirebaseCompatSync().firestore();
      const userRef = db.collection('users').doc(user.uid);
      
      console.log('📱 Saving Expo push token for cross-platform compatibility');
      
      // Update user document with Expo token
      const updateData: any = {
        expoPushToken: expoToken,
        pushTokens: getFirebaseCompatSync().firestore.FieldValue.arrayUnion(expoToken),
        lastTokenUpdate: getFirebaseCompatSync().firestore.FieldValue.serverTimestamp(),
        deviceInfo: {
          platform: Platform.OS,
          version: Platform.Version,
          isDevice: Device.isDevice,
        },
      };

      // Try to update the user document
      try {
        await userRef.update(updateData);
        console.log('✅ Push tokens saved to user profile');
      } catch (updateError: any) {
        // If update fails (document might not exist), use set with merge
        if (updateError?.code === 'not-found') {
          await userRef.set(updateData, { merge: true });
          console.log('✅ Push tokens merged to user profile');
        } else {
          throw updateError;
        }
      }
      this.lastRegisteredUserId = user.uid;
    } catch (error) {
      console.error('❌ Failed to save push token to user profile:', error);
    }
  }

  /**
   * Setup notification listeners
   */
  private attachNotificationListeners(): void {
    if (this.listenersAttached) {
      return;
    }

    try {
      // Handle notifications received while app is in foreground
      this.notificationReceivedSubscription = Notifications.addNotificationReceivedListener(notification => {
        console.log('📱 Notification received in foreground:', notification);
        
        // Show local notification when app is in foreground
        Notifications.scheduleNotificationAsync({
          content: {
            title: notification.request.content.title,
            body: notification.request.content.body,
            data: notification.request.content.data,
          },
          trigger: null, // Show immediately
        });
      });

      // Handle notification taps
      this.notificationResponseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('📱 Notification tapped:', response);
        // Handle navigation based on notification data
        this.handleNotificationTap(response);
      });

      this.listenersAttached = true;
      console.log('✅ Notification listeners setup completed');
    } catch (error) {
      console.error('❌ Failed to setup notification listeners:', error);
    }
  }
  async syncTokenWithCurrentUser(options?: { forceRefresh?: boolean }): Promise<void> {
    const user = getFirebaseCompatSync().auth().currentUser;
    if (!user) {
      this.lastRegisteredUserId = null;
      return;
    }

    if (options?.forceRefresh || !this.expoPushToken) {
      await this.initialize();
      return;
    }

    if (this.lastRegisteredUserId === user.uid) {
      return;
    }

    try {
      await this.saveTokenToUserProfile(this.expoPushToken, user);
    } catch (error) {
      console.error('❌ Failed syncing push token with current user:', error);
    }
  }


  /**
   * Handle notification tap
   */
  private handleNotificationTap(response: Notifications.NotificationResponse): void {
    try {
      const { data } = response.notification.request.content;
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
   * Send push notification via Expo's push service with retry mechanism
   */
  async sendPushNotification(
    tokens: string[],
    notification: NotificationData
  ): Promise<void> {
    if (!tokens || tokens.length === 0) {
      console.warn('No tokens provided for push notification');
      return;
    }

    // Validate tokens
    const validTokens = tokens.filter(token => {
      if (!token || typeof token !== 'string') {
        console.warn('Invalid token found:', token);
        return false;
      }
      if (!token.startsWith('ExponentPushToken[') && !token.startsWith('ExpoPushToken[')) {
        console.warn('Token format invalid:', token.substring(0, 20) + '...');
        return false;
      }
      return true;
    });

    if (validTokens.length === 0) {
      console.warn('No valid tokens found for push notification');
      return;
    }

    const messages = validTokens.map(token => ({
      to: token,
      sound: 'default',
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      channelId: this.getChannelForType(notification.type),
      priority: 'high',
      badge: 1,
    }));

    // Retry mechanism
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        console.log(`Sending push notification to ${validTokens.length} tokens (attempt ${attempts + 1}): ${notification.title}`);
        
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
          if (attempts === maxAttempts - 1) {
            throw new Error(`Push notification failed after ${maxAttempts} attempts: ${JSON.stringify(result)}`);
          }
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts)); // Exponential backoff
          continue;
        }

        // Log successful sends
        if (result.data) {
          const successCount = result.data.filter((item: any) => item.status === 'ok').length;
          const errorCount = result.data.filter((item: any) => item.status === 'error').length;
          
          console.log(`✅ Push notification sent successfully: ${successCount} success, ${errorCount} errors`);
          
          // Log any errors for debugging
          result.data.forEach((item: any, index: number) => {
            if (item.status === 'error') {
              console.error(`❌ Push notification error for token ${index}: ${item.message}`);
            }
          });
        }
        
        return; // Success, exit retry loop
        
      } catch (error) {
        console.error(`❌ Push notification attempt ${attempts + 1} failed:`, error);
        attempts++;
        
        if (attempts >= maxAttempts) {
          console.error('❌ Push notification failed after all retry attempts');
          throw error;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
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