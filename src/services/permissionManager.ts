/**
 * Comprehensive Permission Manager
 * Handles all app permissions including notifications and storage
 */

import { Platform, Alert, Linking, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as ImagePicker from 'expo-image-picker';

export interface PermissionResult {
  granted: boolean;
  canAskAgain: boolean;
  status: string;
}

export class PermissionManager {
  private static instance: PermissionManager;
  private static readonly PERMISSIONS_REQUESTED_KEY = 'permissions_requested';

  static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager();
    }
    return PermissionManager.instance;
  }

  /**
   * Check if permissions have been requested before
   */
  private async havePermissionsBeenRequested(): Promise<boolean> {
    try {
      const requested = await AsyncStorage.getItem(PermissionManager.PERMISSIONS_REQUESTED_KEY);
      return requested === 'true';
    } catch (error) {
      console.error('❌ Error checking permission status:', error);
      return false;
    }
  }

  /**
   * Mark permissions as requested
   */
  private async markPermissionsAsRequested(): Promise<void> {
    try {
      await AsyncStorage.setItem(PermissionManager.PERMISSIONS_REQUESTED_KEY, 'true');
    } catch (error) {
      console.error('❌ Error marking permissions as requested:', error);
    }
  }

  /**
   * Request all necessary permissions for the app (only on first launch)
   */
  async requestAllPermissions(): Promise<{
    notifications: PermissionResult;
    storage: PermissionResult;
    camera: PermissionResult;
  }> {
    console.log('🔐 Checking if permissions should be requested...');

    // Check if permissions have been requested before
    const alreadyRequested = await this.havePermissionsBeenRequested();
    if (alreadyRequested) {
      console.log('ℹ️ Permissions already requested before, skipping...');
      return {
        notifications: { granted: false, canAskAgain: true, status: 'skipped' },
        storage: { granted: false, canAskAgain: true, status: 'skipped' },
        camera: { granted: false, canAskAgain: true, status: 'skipped' },
      };
    }

    console.log('🔐 Requesting all app permissions for the first time...');

    const results = {
      notifications: await this.requestNotificationPermissions(),
      storage: await this.requestStoragePermissions(),
      camera: await this.requestCameraPermissions(),
    };

    // Mark permissions as requested
    await this.markPermissionsAsRequested();

    console.log('📋 Permission results:', results);
    return results;
  }

  /**
   * Request other permissions (storage, camera) - only on first launch
   * Note: Notification permissions are handled by PushNotificationService
   */
  async requestOtherPermissions(): Promise<{
    storage: PermissionResult;
    camera: PermissionResult;
  }> {
    console.log('🔐 Checking if other permissions should be requested...');

    // Check if permissions have been requested before
    const alreadyRequested = await this.havePermissionsBeenRequested();
    if (alreadyRequested) {
      console.log('ℹ️ Other permissions already requested before, skipping...');
      return {
        storage: { granted: false, canAskAgain: true, status: 'skipped' },
        camera: { granted: false, canAskAgain: true, status: 'skipped' },
      };
    }

    console.log('🔐 Requesting other app permissions for the first time...');

    const results = {
      storage: await this.requestStoragePermissions(),
      camera: await this.requestCameraPermissions(),
    };

    // Mark permissions as requested
    await this.markPermissionsAsRequested();

    console.log('📋 Other permission results:', results);
    return results;
  }

  /**
   * Request notification permissions (native Android system only)
   */
  async requestNotificationPermissions(): Promise<PermissionResult> {
    try {
      console.log('🔔 Requesting notification permissions...');

      // Check current status
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      console.log(`📋 Current notification permission status: ${existingStatus}`);

      if (existingStatus === 'granted') {
        return { granted: true, canAskAgain: false, status: existingStatus };
      }

      // Request permission directly (native Android dialog)
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

      console.log(`✅ Notification permission result: ${status}`);
      return { granted: status === 'granted', canAskAgain: status !== 'denied', status };
    } catch (error) {
      console.error('❌ Notification permission request failed:', error);
      return { granted: false, canAskAgain: true, status: 'error' };
    }
  }

  /**
   * Request storage permissions (native Android system only)
   */
  async requestStoragePermissions(): Promise<PermissionResult> {
    try {
      console.log('💾 Requesting storage permissions...');

      if (Platform.OS === 'android') {
        // Android 13+ (API 33+) uses scoped storage
        if (Platform.Version >= 33) {
          // For Android 13+, we use READ_MEDIA_IMAGES permission
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
            {
              title: 'Medya İzni',
              message: 'Fotoğraflara erişim için medya izni gereklidir.',
              buttonNeutral: 'Daha Sonra',
              buttonNegative: 'İptal',
              buttonPositive: 'İzin Ver',
            }
          );

          console.log(`📋 Media permission: ${granted}`);
          return { granted: granted === PermissionsAndroid.RESULTS.GRANTED, canAskAgain: granted !== PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN, status: granted };
        } else {
          // Android 12 and below
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
            {
              title: 'Depolama İzni',
              message: 'Profil fotoğrafı ve etkinlik fotoğrafları için depolama erişimi gereklidir.',
              buttonNeutral: 'Daha Sonra',
              buttonNegative: 'İptal',
              buttonPositive: 'İzin Ver',
            }
          );

          console.log(`📋 Storage permission: ${granted}`);
          return { granted: granted === PermissionsAndroid.RESULTS.GRANTED, canAskAgain: granted !== PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN, status: granted };
        }
      }

      // iOS uses photo library permission
      const photoPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log(`📋 Photo library permission: ${photoPermission.status}`);
      
      return { granted: photoPermission.granted, canAskAgain: photoPermission.canAskAgain, status: photoPermission.status };
    } catch (error) {
      console.error('❌ Storage permission request failed:', error);
      return { granted: false, canAskAgain: true, status: 'error' };
    }
  }

  /**
   * Request camera permissions (native Android system only)
   */
  async requestCameraPermissions(): Promise<PermissionResult> {
    try {
      console.log('📷 Requesting camera permissions...');

      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      console.log(`📋 Camera permission: ${cameraPermission.status}`);

      return { granted: cameraPermission.granted, canAskAgain: cameraPermission.canAskAgain, status: cameraPermission.status };
    } catch (error) {
      console.error('❌ Camera permission request failed:', error);
      return { granted: false, canAskAgain: true, status: 'error' };
    }
  }


  /**
   * Check if all critical permissions are granted
   */
  async checkCriticalPermissions(): Promise<boolean> {
    try {
      const notificationStatus = await Notifications.getPermissionsAsync();
      const storageStatus = await ImagePicker.getMediaLibraryPermissionsAsync();

      const notificationsGranted = notificationStatus.status === 'granted';
      const storageGranted = storageStatus.granted;

      console.log('🔍 Critical permissions check:', {
        notifications: notificationsGranted,
        storage: storageGranted
      });

      return notificationsGranted && storageGranted;
    } catch (error) {
      console.error('❌ Permission check failed:', error);
      return false;
    }
  }
}

export default PermissionManager;
