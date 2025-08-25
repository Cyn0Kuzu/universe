/**
 * 🛡️ Safe Notification Manager
 * 
 * Güvenli bildirim yönetimi servisi - Firebase permission hatalarını ve 
 * eksik belgeleri ele alarak robust notification handling sağlar.
 */

import { firebase } from '../firebase/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NotificationDocument {
  id: string;
  read?: boolean;
  readAt?: any;
  [key: string]: any;
}

export class SafeNotificationManager {
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 1000;

  /**
   * 🔒 Güvenli tek bildirim güncelleme
   */
  static async safeUpdateNotification(
    notificationId: string,
    updateData: Partial<NotificationDocument>,
    userType: 'student' | 'club' = 'student'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const db = firebase.firestore();
      const collection = userType === 'club' ? 'clubNotifications' : 'notifications';
      const docRef = db.collection(collection).doc(notificationId);
      
      // Önce belgenin varlığını kontrol et
      const docSnapshot = await docRef.get();
      
      if (!docSnapshot.exists) {
        console.warn(`⚠️ Notification document not found: ${notificationId}`);
        return { 
          success: false, 
          error: 'Document not found' 
        };
      }
      
      // Retry mekanizması ile güncelle
      for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
        try {
          await docRef.update({
            ...updateData,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          
          console.log(`✅ Notification ${notificationId} updated successfully`);
          return { success: true };
          
        } catch (updateError: any) {
          console.warn(`⚠️ Update attempt ${attempt} failed:`, updateError);
          
          if (attempt === this.MAX_RETRIES) {
            throw updateError;
          }
          
          // Kısa bekleme
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
        }
      }
      
      return { success: false, error: 'Max retries exceeded' };
      
    } catch (error: any) {
      console.error('Safe notification update failed:', error);
      return { 
        success: false, 
        error: error.message || 'Unknown error' 
      };
    }
  }

  /**
   * 🔒 Güvenli toplu bildirim güncelleme
   */
  static async safeBatchUpdateNotifications(
    notifications: NotificationDocument[],
    updateData: Partial<NotificationDocument>,
    userType: 'student' | 'club' = 'student'
  ): Promise<{ 
    success: boolean; 
    successCount: number; 
    failedCount: number; 
    errors: string[] 
  }> {
    const db = firebase.firestore();
    const collection = userType === 'club' ? 'clubNotifications' : 'notifications';
    const errors: string[] = [];
    let successCount = 0;
    let failedCount = 0;
    
    try {
      // Önce tüm belgelerin varlığını kontrol et
      const validNotifications: NotificationDocument[] = [];
      
      for (const notification of notifications) {
        try {
          const docRef = db.collection(collection).doc(notification.id);
          const docSnapshot = await docRef.get();
          
          if (docSnapshot.exists) {
            validNotifications.push(notification);
          } else {
            console.warn(`⚠️ Skipping non-existent notification: ${notification.id}`);
            errors.push(`Document not found: ${notification.id}`);
            failedCount++;
          }
        } catch (checkError: any) {
          console.warn(`⚠️ Error checking notification ${notification.id}:`, checkError);
          errors.push(`Check failed for ${notification.id}: ${checkError.message}`);
          failedCount++;
        }
      }
      
      // Batch update için küçük gruplar halinde işle (max 500 per batch)
      const batchSize = 500;
      
      for (let i = 0; i < validNotifications.length; i += batchSize) {
        const batch = db.batch();
        const currentBatch = validNotifications.slice(i, i + batchSize);
        
        currentBatch.forEach(notification => {
          const docRef = db.collection(collection).doc(notification.id);
          batch.update(docRef, {
            ...updateData,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        });
        
        try {
          await batch.commit();
          successCount += currentBatch.length;
          console.log(`✅ Batch ${Math.floor(i/batchSize) + 1}: ${currentBatch.length} notifications updated`);
        } catch (batchError: any) {
          console.error(`❌ Batch ${Math.floor(i/batchSize) + 1} failed:`, batchError);
          errors.push(`Batch update failed: ${batchError.message}`);
          failedCount += currentBatch.length;
        }
      }
      
      return {
        success: successCount > 0,
        successCount,
        failedCount,
        errors
      };
      
    } catch (error: any) {
      console.error('Safe batch notification update failed:', error);
      return {
        success: false,
        successCount: 0,
        failedCount: notifications.length,
        errors: [error.message || 'Unknown error']
      };
    }
  }

  /**
   * 🔒 Güvenli bildirim silme
   */
  static async safeDeleteNotification(
    notificationId: string,
    userType: 'student' | 'club' = 'student'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const db = firebase.firestore();
      const collection = userType === 'club' ? 'clubNotifications' : 'notifications';
      const docRef = db.collection(collection).doc(notificationId);
      
      // Önce belgenin varlığını kontrol et
      const docSnapshot = await docRef.get();
      
      if (!docSnapshot.exists) {
        console.warn(`⚠️ Notification already deleted or not found: ${notificationId}`);
        return { success: true }; // Zaten yok, başarılı sayılır
      }
      
      await docRef.delete();
      console.log(`✅ Notification ${notificationId} deleted successfully`);
      return { success: true };
      
    } catch (error: any) {
      console.error('Safe notification deletion failed:', error);
      return { 
        success: false, 
        error: error.message || 'Unknown error' 
      };
    }
  }

  /**
   * 🔒 Güvenli bildirim okundu işaretleme (hem Firebase hem AsyncStorage)
   */
  static async safeMarkAsRead(
    notificationId: string,
    userId: string,
    userType: 'student' | 'club' = 'student'
  ): Promise<{ success: boolean; firebase: boolean; asyncStorage: boolean }> {
    let firebaseSuccess = false;
    let asyncStorageSuccess = false;
    
    // AsyncStorage güncelleme
    try {
      const readNotificationsKey = userType === 'club' 
        ? `readNotifications_club_${userId}`
        : `readNotifications_${userId}`;
      
      const existingReadNotifications = await AsyncStorage.getItem(readNotificationsKey);
      const readNotificationIds = existingReadNotifications ? JSON.parse(existingReadNotifications) : [];
      
      if (!readNotificationIds.includes(notificationId)) {
        readNotificationIds.push(notificationId);
        await AsyncStorage.setItem(readNotificationsKey, JSON.stringify(readNotificationIds));
        console.log(`✅ Notification ${notificationId} marked as read in AsyncStorage`);
      }
      
      asyncStorageSuccess = true;
    } catch (storageError) {
      console.error('AsyncStorage notification mark failed:', storageError);
    }
    
    // Firebase güncelleme
    const firebaseResult = await this.safeUpdateNotification(notificationId, {
      read: true,
      readAt: firebase.firestore.FieldValue.serverTimestamp()
    }, userType);
    
    firebaseSuccess = firebaseResult.success;
    
    return {
      success: asyncStorageSuccess || firebaseSuccess,
      firebase: firebaseSuccess,
      asyncStorage: asyncStorageSuccess
    };
  }

  /**
   * 🔒 Güvenli toplu okundu işaretleme
   */
  static async safeMarkAllAsRead(
    notifications: NotificationDocument[],
    userId: string,
    userType: 'student' | 'club' = 'student'
  ): Promise<{ 
    success: boolean; 
    firebase: { successCount: number; failedCount: number }; 
    asyncStorage: boolean 
  }> {
    let asyncStorageSuccess = false;
    
    // AsyncStorage güncelleme
    try {
      const readNotificationsKey = userType === 'club' 
        ? `readNotifications_club_${userId}`
        : `readNotifications_${userId}`;
      
      const allNotificationIds = notifications.map(n => n.id);
      await AsyncStorage.setItem(readNotificationsKey, JSON.stringify(allNotificationIds));
      console.log(`✅ All ${allNotificationIds.length} notifications marked as read in AsyncStorage`);
      asyncStorageSuccess = true;
    } catch (storageError) {
      console.error('AsyncStorage batch mark failed:', storageError);
    }
    
    // Firebase toplu güncelleme
    const unreadNotifications = notifications.filter(n => !n.read);
    const firebaseResult = await this.safeBatchUpdateNotifications(unreadNotifications, {
      read: true,
      readAt: firebase.firestore.FieldValue.serverTimestamp()
    }, userType);
    
    return {
      success: asyncStorageSuccess || firebaseResult.success,
      firebase: {
        successCount: firebaseResult.successCount,
        failedCount: firebaseResult.failedCount
      },
      asyncStorage: asyncStorageSuccess
    };
  }

  /**
   * 🔍 Bildirim varlığını kontrol et
   */
  static async checkNotificationExists(
    notificationId: string,
    userType: 'student' | 'club' = 'student'
  ): Promise<boolean> {
    try {
      const db = firebase.firestore();
      const collection = userType === 'club' ? 'clubNotifications' : 'notifications';
      const docSnapshot = await db.collection(collection).doc(notificationId).get();
      return docSnapshot.exists;
    } catch (error) {
      console.warn(`Error checking notification existence: ${notificationId}`, error);
      return false;
    }
  }

  /**
   * 🧹 Temizlik: Var olmayan bildirimleri AsyncStorage'dan kaldır
   */
  static async cleanupInvalidNotifications(
    userId: string,
    userType: 'student' | 'club' = 'student'
  ): Promise<{ removed: number; remaining: number }> {
    try {
      const readNotificationsKey = userType === 'club' 
        ? `readNotifications_club_${userId}`
        : `readNotifications_${userId}`;
      
      const existingReadNotifications = await AsyncStorage.getItem(readNotificationsKey);
      if (!existingReadNotifications) {
        return { removed: 0, remaining: 0 };
      }
      
      const readNotificationIds: string[] = JSON.parse(existingReadNotifications);
      const validIds: string[] = [];
      let removedCount = 0;
      
      // Her bildirim ID'sinin varlığını kontrol et
      for (const id of readNotificationIds) {
        const exists = await this.checkNotificationExists(id, userType);
        if (exists) {
          validIds.push(id);
        } else {
          removedCount++;
          console.log(`🧹 Removed invalid notification ID: ${id}`);
        }
      }
      
      // Temizlenmiş listeyi kaydet
      await AsyncStorage.setItem(readNotificationsKey, JSON.stringify(validIds));
      
      console.log(`🧹 Cleanup completed: ${removedCount} invalid notifications removed, ${validIds.length} remaining`);
      
      return { removed: removedCount, remaining: validIds.length };
      
    } catch (error) {
      console.error('Notification cleanup failed:', error);
      return { removed: 0, remaining: 0 };
    }
  }
}

export default SafeNotificationManager;
