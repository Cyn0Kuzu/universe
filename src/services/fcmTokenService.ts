/**
 * FCM Token Service
 * Manages Firebase Cloud Messaging token for Android push notifications
 */

import { Platform } from 'react-native';
// @ts-ignore - Optional dependency
let messaging: any;
try {
  messaging = require('@react-native-firebase/messaging').default;
} catch {
  // Module not available - will handle gracefully
  messaging = null;
}
import { getFirebaseCompatSync } from '../firebase/compat';

const firebase = getFirebaseCompatSync();

class FCMTokenService {
  private static instance: FCMTokenService;
  private fcmToken: string | null = null;

  private constructor() {}

  static getInstance(): FCMTokenService {
    if (!FCMTokenService.instance) {
      FCMTokenService.instance = new FCMTokenService();
    }
    return FCMTokenService.instance;
  }

  /**
   * Initialize FCM and get token
   */
  async initialize(): Promise<string | null> {
    try {
      // Only for Android (iOS needs different setup)
      if (Platform.OS !== 'android') {
        console.log('FCM token service is Android-only');
        return null;
      }

      const messagingInstance = this.getMessagingInstance();
      // Check if messaging is available
      if (!messagingInstance) {
        console.warn('⚠️ FCM messaging module not available');
        return null;
      }

      console.log('🔐 Initializing FCM token service...');

      // Check and request permission
      const authStatus = await messagingInstance.requestPermission?.();
      const authorizationStatus = messaging?.AuthorizationStatus || messagingInstance?.AuthorizationStatus;
      const enabled =
        authStatus === authorizationStatus?.AUTHORIZED ||
        authStatus === authorizationStatus?.PROVISIONAL;

      if (!enabled) {
        console.warn('⚠️ FCM permission not granted');
        return null;
      }

      console.log('✅ FCM permission granted');

      // Get FCM token
      const token = await messagingInstance.getToken?.();
      
      if (!token) {
        console.error('❌ Failed to get FCM token');
        return null;
      }

      this.fcmToken = token;
      console.log('📱 FCM Token obtained:', `${token.substring(0, 20)}...`);

      // Save token to Firestore
      await this.saveFCMTokenToFirestore(token);

      // Listen for token refresh
      this.setupTokenRefreshListener();

      // Setup message handlers
      this.setupMessageHandlers();

      return token;
    } catch (error) {
      console.error('❌ Failed to initialize FCM:', error);
      return null;
    }
  }

  /**
   * Save FCM token to user's Firestore profile
   */
  private async saveFCMTokenToFirestore(fcmToken: string): Promise<void> {
    try {
      const user = getFirebaseCompatSync().auth().currentUser;
      if (!user) {
        console.warn('No authenticated user found for FCM token save');
        return;
      }

      const db = getFirebaseCompatSync().firestore();
      const userRef = db.collection('users').doc(user.uid);

      console.log('📱 Saving FCM token to Firestore');

      // Update user document with FCM token
      const updateData: any = {
        fcmToken: fcmToken,
        fcmTokens: getFirebaseCompatSync().firestore.FieldValue.arrayUnion(fcmToken),
        lastFCMTokenUpdate: getFirebaseCompatSync().firestore.FieldValue.serverTimestamp(),
        deviceInfo: {
          platform: Platform.OS,
          version: Platform.Version,
        },
      };

      // Try to update the user document
      try {
        await userRef.update(updateData);
        console.log('✅ FCM token saved to Firestore');
      } catch (updateError: any) {
        // If update fails (document might not exist), use set with merge
        if (updateError?.code === 'not-found') {
          await userRef.set(updateData, { merge: true });
          console.log('✅ FCM token merged to Firestore');
        } else {
          throw updateError;
        }
      }
    } catch (error) {
      console.error('❌ Failed to save FCM token to Firestore:', error);
    }
  }

  /**
   * Setup token refresh listener
   */
  private setupTokenRefreshListener(): void {
    const messagingInstance = this.getMessagingInstance();
    if (!messagingInstance) {
      console.warn('⚠️ FCM messaging not available for token refresh listener');
      return;
    }
    messagingInstance.onTokenRefresh?.(async (token: string) => {
      console.log('🔄 FCM token refreshed:', `${token.substring(0, 20)}...`);
      this.fcmToken = token;
      await this.saveFCMTokenToFirestore(token);
    });
  }

  /**
   * Setup message handlers for foreground and background
   */
  private setupMessageHandlers(): void {
    const messagingInstance = this.getMessagingInstance();
    if (!messagingInstance) {
      console.warn('⚠️ FCM messaging not available for message handlers');
      return;
    }
    // Foreground message handler
    messagingInstance.onMessage?.(async (remoteMessage: any) => {
      console.log('📱 FCM message received in foreground:', remoteMessage);
      
      // Handle foreground notification display
      // This is handled by expo-notifications in pushNotificationService
    });

    // Background message handler is set in index.js or App.tsx
    // messaging().setBackgroundMessageHandler(async remoteMessage => {
    //   console.log('Message handled in the background!', remoteMessage);
    // });
  }

  /**
   * Get current FCM token
   */
  getCurrentToken(): string | null {
    return this.fcmToken;
  }

  /**
   * Delete FCM token (for logout)
   */
  async deleteToken(): Promise<void> {
    try {
      const messagingInstance = this.getMessagingInstance();
      if (Platform.OS === 'android' && messagingInstance && typeof messagingInstance.deleteToken === 'function') {
        await messagingInstance.deleteToken();
        this.fcmToken = null;
        console.log('✅ FCM token deleted');
      }
    } catch (error) {
      console.error('❌ Failed to delete FCM token:', error);
    }
  }

  /**
   * Check if FCM is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      if (Platform.OS !== 'android') {
        return false;
      }

      const messagingInstance = this.getMessagingInstance();
      if (!messagingInstance) {
        return false;
      }

      const authStatus = await messagingInstance.hasPermission?.();
      const authorizationStatus = messaging?.AuthorizationStatus || messagingInstance?.AuthorizationStatus;
      return (
        authStatus === authorizationStatus?.AUTHORIZED ||
        authStatus === authorizationStatus?.PROVISIONAL
      );
    } catch (error) {
      console.error('Error checking FCM availability:', error);
      return false;
    }
  }

  /**
   * Safely resolve the messaging instance
   */
  private getMessagingInstance(): ReturnType<typeof messaging> | null {
    if (!messaging || typeof messaging !== 'function') {
      return null;
    }

    try {
      const instance = messaging();
      if (!instance) {
        console.warn('⚠️ FCM messaging resolved to null instance');
      }
      return instance || null;
    } catch (error) {
      console.warn('⚠️ Failed to resolve FCM messaging instance:', error);
      return null;
    }
  }
}

export default FCMTokenService;





























































