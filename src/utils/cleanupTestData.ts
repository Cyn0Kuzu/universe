/**
 * 🧹 Test Data Cleanup Utility
 * Sahte ve test verilerini temizler
 */

import { firebase } from '../firebase/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class TestDataCleanup {
  /**
   * 🧹 Firebase'deki test bildirimlerini temizle
   */
  static async cleanupTestNotifications(userType: 'student' | 'club' = 'student'): Promise<{
    success: boolean;
    deletedCount: number;
    errors: string[];
  }> {
    const collection = userType === 'club' ? 'clubNotifications' : 'notifications';
    const errors: string[] = [];
    let deletedCount = 0;

    try {
      console.log(`🧹 Starting cleanup of test notifications in ${collection}...`);
      
      const db = firebase.firestore();
      
      // Test/fake notification types to delete
      const testTypes = [
        'debug', 'test', 'internal', 'deprecated', 'fake', 'sample',
        'test_notification', 'debug_notification', 'mock_notification'
      ];
      
      // Test message patterns
      const testMessagePatterns = [
        'test', 'fake', 'sample', 'debug', 'mock', 'örnek', 'deneme'
      ];

      // Query for test notifications by type
      for (const testType of testTypes) {
        try {
          const querySnapshot = await db.collection(collection)
            .where('type', '==', testType)
            .limit(500) // Safety limit
            .get();
          
          if (!querySnapshot.empty) {
            console.log(`🧹 Found ${querySnapshot.docs.length} notifications of type: ${testType}`);
            
            // Delete in batches
            const batch = db.batch();
            querySnapshot.docs.forEach(doc => {
              batch.delete(doc.ref);
            });
            
            await batch.commit();
            deletedCount += querySnapshot.docs.length;
            console.log(`✅ Deleted ${querySnapshot.docs.length} notifications of type: ${testType}`);
          }
        } catch (error: any) {
          console.error(`❌ Error deleting notifications of type ${testType}:`, error);
          errors.push(`Failed to delete type ${testType}: ${error.message}`);
        }
      }

      // Also clean by message patterns (more careful approach)
      try {
        const allNotifications = await db.collection(collection)
          .limit(1000) // Safety limit
          .get();
        
        const testNotificationIds: string[] = [];
        
        allNotifications.docs.forEach(doc => {
          const data = doc.data();
          const message = (data.message || '').toLowerCase();
          const title = (data.title || '').toLowerCase();
          
          // Check if message or title contains test patterns
          const isTestNotification = testMessagePatterns.some(pattern => 
            message.includes(pattern) || title.includes(pattern)
          );
          
          if (isTestNotification) {
            testNotificationIds.push(doc.id);
          }
        });
        
        if (testNotificationIds.length > 0) {
          console.log(`🧹 Found ${testNotificationIds.length} notifications with test patterns in content`);
          
          // Delete in smaller batches
          const batchSize = 100;
          for (let i = 0; i < testNotificationIds.length; i += batchSize) {
            const batch = db.batch();
            const currentBatch = testNotificationIds.slice(i, i + batchSize);
            
            currentBatch.forEach(id => {
              batch.delete(db.collection(collection).doc(id));
            });
            
            await batch.commit();
            deletedCount += currentBatch.length;
            console.log(`✅ Deleted batch of ${currentBatch.length} test notifications`);
          }
        }
      } catch (error: any) {
        console.error('❌ Error cleaning notifications by content:', error);
        errors.push(`Content cleanup failed: ${error.message}`);
      }

      console.log(`🧹 Cleanup completed: ${deletedCount} test notifications deleted`);
      
      return {
        success: deletedCount > 0 || errors.length === 0,
        deletedCount,
        errors
      };
      
    } catch (error: any) {
      console.error('❌ Test data cleanup failed:', error);
      return {
        success: false,
        deletedCount,
        errors: [...errors, error.message || 'Unknown error']
      };
    }
  }

  /**
   * 🧹 AsyncStorage'deki geçersiz bildirim ID'lerini temizle
   */
  static async cleanupInvalidAsyncStorageIds(
    userId: string, 
    userType: 'student' | 'club' = 'student'
  ): Promise<{
    success: boolean;
    removedCount: number;
    remainingCount: number;
  }> {
    try {
      console.log(`🧹 Cleaning AsyncStorage for ${userType} ${userId}...`);
      
      const readNotificationsKey = userType === 'club' 
        ? `readNotifications_club_${userId}`
        : `readNotifications_${userId}`;
      
      const existingData = await AsyncStorage.getItem(readNotificationsKey);
      if (!existingData) {
        return { success: true, removedCount: 0, remainingCount: 0 };
      }
      
      const readNotificationIds: string[] = JSON.parse(existingData);
      const db = firebase.firestore();
      const collection = userType === 'club' ? 'clubNotifications' : 'notifications';
      
      const validIds: string[] = [];
      let removedCount = 0;
      
      // Check each ID in Firebase
      for (const id of readNotificationIds) {
        try {
          const docSnapshot = await db.collection(collection).doc(id).get();
          if (docSnapshot.exists) {
            validIds.push(id);
          } else {
            removedCount++;
            console.log(`🧹 Removed invalid AsyncStorage ID: ${id}`);
          }
        } catch (error) {
          // If we can't check, remove it to be safe
          removedCount++;
          console.log(`🧹 Removed problematic AsyncStorage ID: ${id}`);
        }
      }
      
      // Save cleaned list
      await AsyncStorage.setItem(readNotificationsKey, JSON.stringify(validIds));
      
      console.log(`🧹 AsyncStorage cleanup completed: ${removedCount} invalid IDs removed, ${validIds.length} remaining`);
      
      return {
        success: true,
        removedCount,
        remainingCount: validIds.length
      };
      
    } catch (error) {
      console.error('❌ AsyncStorage cleanup failed:', error);
      return {
        success: false,
        removedCount: 0,
        remainingCount: 0
      };
    }
  }

  /**
   * 🧹 Tam temizlik - hem Firebase hem AsyncStorage
   */
  static async fullCleanup(
    userId: string,
    userType: 'student' | 'club' = 'student'
  ): Promise<{
    success: boolean;
    firebase: { deletedCount: number; errors: string[] };
    asyncStorage: { removedCount: number; remainingCount: number };
  }> {
    console.log(`🧹 Starting full cleanup for ${userType} ${userId}...`);
    
    // 1. Clean Firebase test data
    const firebaseResult = await this.cleanupTestNotifications(userType);
    
    // 2. Clean AsyncStorage invalid IDs
    const asyncStorageResult = await this.cleanupInvalidAsyncStorageIds(userId, userType);
    
    const success = firebaseResult.success && asyncStorageResult.success;
    
    console.log(`🧹 Full cleanup ${success ? 'completed successfully' : 'completed with issues'}`);
    
    return {
      success,
      firebase: {
        deletedCount: firebaseResult.deletedCount,
        errors: firebaseResult.errors
      },
      asyncStorage: {
        removedCount: asyncStorageResult.removedCount,
        remainingCount: asyncStorageResult.remainingCount
      }
    };
  }

  /**
   * 🧹 Acil temizlik - sadece AsyncStorage (Firebase index beklenirken)
   */
  static async emergencyAsyncStorageCleanup(
    userId: string,
    userType: 'student' | 'club' = 'student'
  ): Promise<boolean> {
    try {
      console.log(`🚨 Emergency AsyncStorage cleanup for ${userType} ${userId}...`);
      
      const readNotificationsKey = userType === 'club' 
        ? `readNotifications_club_${userId}`
        : `readNotifications_${userId}`;
      
      // Simply clear all read notifications to reset state
      await AsyncStorage.removeItem(readNotificationsKey);
      
      console.log(`✅ Emergency cleanup completed - AsyncStorage cleared`);
      return true;
      
    } catch (error) {
      console.error('❌ Emergency cleanup failed:', error);
      return false;
    }
  }
}
