/**
 * 🚨 Push Notification Debug & Fix Service
 * Troubleshoots and fixes common push notification issues
 */

import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { firebase } from '../firebase/config';
import { sendExpoPush } from './pushNotifications';

export interface PushNotificationStatus {
  permissionGranted: boolean;
  tokenRegistered: boolean;
  tokenValue: string | null;
  userDocumentExists: boolean;
  expoPushTokens: string[];
  projectIdConfigured: boolean;
  firebaseConfigured: boolean;
  canSendPush: boolean;
  lastError: string | null;
}

export class PushNotificationDebugService {
  private static instance: PushNotificationDebugService;

  static getInstance(): PushNotificationDebugService {
    if (!PushNotificationDebugService.instance) {
      PushNotificationDebugService.instance = new PushNotificationDebugService();
    }
    return PushNotificationDebugService.instance;
  }

  /**
   * 🔍 Complete push notification diagnostics
   */
  async diagnosePushNotifications(userId: string): Promise<PushNotificationStatus> {
    const status: PushNotificationStatus = {
      permissionGranted: false,
      tokenRegistered: false,
      tokenValue: null,
      userDocumentExists: false,
      expoPushTokens: [],
      projectIdConfigured: false,
      firebaseConfigured: false,
      canSendPush: false,
      lastError: null
    };

    try {
      console.log('🔍 Starting push notification diagnostics for user:', userId);

      // 1. Check permissions
      const permissions = await Notifications.getPermissionsAsync();
      status.permissionGranted = permissions.status === 'granted';
      console.log('📋 Permissions status:', permissions.status);

      if (!status.permissionGranted) {
        status.lastError = 'Notification permissions not granted';
        return status;
      }

      // 2. Check project ID configuration
      const projectId = (Constants as any)?.expoConfig?.extra?.eas?.projectId || (Constants as any)?.easConfig?.projectId;
      status.projectIdConfigured = !!projectId;
      console.log('🆔 Project ID configured:', status.projectIdConfigured, projectId);

      if (!status.projectIdConfigured) {
        status.lastError = 'EAS project ID not configured';
        return status;
      }

      // 3. Try to get push token
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId } as any);
        status.tokenValue = (tokenData as any)?.data ?? null;
        status.tokenRegistered = !!status.tokenValue;
        console.log('🎫 Push token obtained:', status.tokenValue ? 'SUCCESS' : 'FAILED');
      } catch (tokenError: any) {
        status.lastError = `Token generation failed: ${tokenError.message}`;
        console.error('❌ Token generation error:', tokenError);
        return status;
      }

      // 4. Check Firebase configuration
      try {
        const db = firebase.firestore();
        status.firebaseConfigured = true;
        console.log('🔥 Firebase configured: SUCCESS');

        // 5. Check user document
        const userDoc = await db.collection('users').doc(userId).get();
        status.userDocumentExists = userDoc.exists;
        console.log('👤 User document exists:', status.userDocumentExists);

        if (status.userDocumentExists) {
          const userData = userDoc.data();
          status.expoPushTokens = [
            ...(userData?.expoPushTokens || []),
            ...(userData?.expoPushToken ? [userData.expoPushToken] : [])
          ];
          console.log('📱 Stored push tokens:', status.expoPushTokens.length);
        }

      } catch (firebaseError: any) {
        status.lastError = `Firebase error: ${firebaseError.message}`;
        status.firebaseConfigured = false;
        console.error('❌ Firebase error:', firebaseError);
        return status;
      }

      // 6. Overall status
      status.canSendPush = status.permissionGranted && 
                          status.tokenRegistered && 
                          status.firebaseConfigured && 
                          status.userDocumentExists;

      console.log('✅ Push notification diagnostics completed');
      console.log('🚀 Can send push:', status.canSendPush);

      return status;

    } catch (error: any) {
      status.lastError = `Diagnostics failed: ${error.message}`;
      console.error('❌ Push notification diagnostics failed:', error);
      return status;
    }
  }

  /**
   * 🔧 Fix common push notification issues
   */
  async fixPushNotificationIssues(userId: string): Promise<boolean> {
    try {
      console.log('🔧 Starting push notification fixes for user:', userId);

      // 1. Request permissions if not granted
      const permissions = await Notifications.getPermissionsAsync();
      if (permissions.status !== 'granted') {
        console.log('📋 Requesting push notifications permissions...');
        const requested = await Notifications.requestPermissionsAsync();
        if (requested.status !== 'granted') {
          console.error('❌ User denied notification permissions');
          return false;
        }
      }

      // 2. Setup Android channels
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Genel Bildirimler',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: false,
        lightColor: '#667eea',
      });

      // 3. Get and register push token
      const projectId = (Constants as any)?.expoConfig?.extra?.eas?.projectId || (Constants as any)?.easConfig?.projectId;
      if (!projectId) {
        console.error('❌ EAS project ID not found in configuration');
        return false;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId } as any);
      const token = (tokenData as any)?.data ?? null;

      if (!token) {
        console.error('❌ Failed to obtain push token');
        return false;
      }

      // 4. Update user document with push token
      const db = firebase.firestore();
      const userRef = db.collection('users').doc(userId);

      await userRef.update({
        expoPushToken: token,
        expoPushTokens: firebase.firestore.FieldValue.arrayUnion(token),
        pushNotificationEnabled: true,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      console.log('✅ Push token registered successfully:', token);

      // 5. Test push notification
      const testResult = await this.sendTestPushNotification(userId);
      if (testResult) {
        console.log('🎉 Push notification system fully operational!');
        return true;
      } else {
        console.warn('⚠️ Push token registered but test notification failed');
        return false;
      }

    } catch (error: any) {
      console.error('❌ Push notification fix failed:', error);
      return false;
    }
  }

  /**
   * 📤 Send test push notification
   */
  async sendTestPushNotification(userId: string): Promise<boolean> {
    try {
      const db = firebase.firestore();
      const userDoc = await db.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        console.error('❌ User document not found for test push');
        return false;
      }

      const userData = userDoc.data();
      const tokens = [
        ...(userData?.expoPushTokens || []),
        ...(userData?.expoPushToken ? [userData.expoPushToken] : [])
      ].filter(Boolean);

      if (tokens.length === 0) {
        console.error('❌ No push tokens found for test');
        return false;
      }

      // Send test notification
      await sendExpoPush(
        tokens,
        '🎉 Test Bildirimi',
        'Push notification sistemi başarıyla çalışıyor!',
        {
          type: 'test',
          category: 'system',
          testTime: new Date().toISOString()
        }
      );

      console.log('✅ Test push notification sent to', tokens.length, 'tokens');
      return true;

    } catch (error: any) {
      console.error('❌ Test push notification failed:', error);
      return false;
    }
  }

  /**
   * 📊 Get push notification statistics
   */
  async getPushNotificationStats(userId: string): Promise<{
    totalTokens: number;
    activeTokens: number;
    lastUpdate: Date | null;
    permissionStatus: string;
  }> {
    try {
      const permissions = await Notifications.getPermissionsAsync();
      const db = firebase.firestore();
      const userDoc = await db.collection('users').doc(userId).get();
      
      let totalTokens = 0;
      let lastUpdate: Date | null = null;

      if (userDoc.exists) {
        const userData = userDoc.data();
        const tokens = [
          ...(userData?.expoPushTokens || []),
          ...(userData?.expoPushToken ? [userData.expoPushToken] : [])
        ];
        totalTokens = [...new Set(tokens)].length;
        
        if (userData?.updatedAt) {
          lastUpdate = userData.updatedAt.toDate();
        }
      }

      return {
        totalTokens,
        activeTokens: totalTokens, // Assume all tokens are active for now
        lastUpdate,
        permissionStatus: permissions.status
      };

    } catch (error: any) {
      console.error('❌ Failed to get push notification stats:', error);
      return {
        totalTokens: 0,
        activeTokens: 0,
        lastUpdate: null,
        permissionStatus: 'unknown'
      };
    }
  }
}

export const pushNotificationDebugService = PushNotificationDebugService.getInstance();
