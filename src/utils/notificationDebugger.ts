/**
 * Notification Debugger - Analyze and clean up notifications
 */

import { getFirebaseCompatSync } from '../firebase/compat';
import 'firebase/compat/firestore';

const firebase = getFirebaseCompatSync();

export class NotificationDebugger {
  
  /**
   * 🔍 Debug notifications for a user
   */
  static async debugUserNotifications(userId: string): Promise<void> {
    try {
      console.log('🔍 DEBUGGING: Checking notifications for user:', userId);
      
      const db = getFirebaseCompatSync().firestore();
      
      // Check all notifications for this user
      const snapshot = await db
        .collection('notifications')
        .where('recipientId', '==', userId)
        .get();
        
      console.log('🔍 DEBUGGING: Total notifications found:', snapshot.size);
      
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      
      // Group by type
      const byType: Record<string, number> = {};
      const testNotifications: any[] = [];
      
      notifications.forEach((n: any) => {
        byType[n.type] = (byType[n.type] || 0) + 1;
        
        // Check for test notifications
        if (n.message?.includes('DirectTest') || 
            n.message?.includes('Test') || 
            n.userName?.includes('Test') ||
            n.title?.includes('DIRECT TEST') ||
            n.title?.includes('TEST')) {
          testNotifications.push(n);
        }
      });
      
      console.log('🔍 DEBUGGING: Notifications by type:', byType);
      console.log('🔍 DEBUGGING: Test notifications found:', testNotifications.length);
      
      // Show sample notifications
      console.log('🔍 DEBUGGING: Sample notifications:');
      notifications.slice(0, 5).forEach((n: any, i: number) => {
        console.log(`${i + 1}. Type: ${n.type}, Title: "${n.title}", Read: ${n.read}, Message: "${n.message}"`);
      });
      
      return;
      
    } catch (error) {
      console.error('❌ Debug notifications failed:', error);
    }
  }
  
  /**
   * 🧹 Clean up test notifications
   */
  static async cleanupTestNotifications(userId: string): Promise<number> {
    try {
      console.log('🧹 CLEANUP: Removing test notifications for user:', userId);
      
      const db = getFirebaseCompatSync().firestore();
      
      // Find test notifications by multiple criteria
      const testQueries = [
        db.collection('notifications')
          .where('recipientId', '==', userId)
          .where('message', '>=', 'DirectTest')
          .where('message', '<=', 'DirectTest\uf8ff'),
          
        db.collection('notifications')
          .where('recipientId', '==', userId)
          .where('userName', '>=', 'DirectTestUser')
          .where('userName', '<=', 'DirectTestUser\uf8ff'),
          
        db.collection('notifications')
          .where('recipientId', '==', userId)
          .where('title', '>=', 'DIRECT TEST')
          .where('title', '<=', 'DIRECT TEST\uf8ff')
      ];
      
      let totalDeleted = 0;
      
      for (const query of testQueries) {
        try {
          const snapshot = await query.get();
          
          if (!snapshot.empty) {
            const batch = db.batch();
            snapshot.docs.forEach(doc => {
              batch.delete(doc.ref);
            });
            
            await batch.commit();
            totalDeleted += snapshot.size;
            console.log(`🧹 CLEANUP: Deleted ${snapshot.size} test notifications`);
          }
        } catch (error) {
          console.warn('⚠️ Cleanup query failed:', error);
        }
      }
      
      console.log(`✅ CLEANUP: Total test notifications deleted: ${totalDeleted}`);
      return totalDeleted;
      
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      return 0;
    }
  }
  
  /**
   * 🔧 Fix notification screen query
   */
  static async testNotificationQuery(userId: string, isClubAccount: boolean = false): Promise<void> {
    try {
      console.log('🔧 TESTING: Testing notification query for user:', userId);
      
      const db = getFirebaseCompatSync().firestore();
      const collection = isClubAccount ? 'clubNotifications' : 'notifications';
      
      // Test basic query first
      console.log('🔧 TESTING: Basic recipientId query...');
      const basicQuery = await db
        .collection(collection)
        .where('recipientId', '==', userId)
        .get();
        
      console.log('🔧 TESTING: Basic query returned:', basicQuery.size, 'notifications');
      
      if (basicQuery.size > 0) {
        const sample = basicQuery.docs[0].data() as any;
        console.log('🔧 TESTING: Sample notification:', {
          type: sample.type,
          title: sample.title,
          read: sample.read,
          hasCreatedAt: !!sample.createdAt
        });
      }
      
      // Test with type filtering
      const notificationTypes = isClubAccount 
        ? ['event_like_points', 'event_unlike_points', 'event_commented_points', 'new_follow', 'event_join']
        : ['comment_liked_points', 'event_joined_points', 'user_follow', 'membership_approved', 'achievement_unlocked'];
      
      console.log('🔧 TESTING: Type-filtered query...');
      try {
        const typeQuery = await db
          .collection(collection)
          .where('recipientId', '==', userId)
          .where('type', 'in', notificationTypes.slice(0, 10)) // Max 10 items in 'in' query
          .get();
          
        console.log('🔧 TESTING: Type-filtered query returned:', typeQuery.size, 'notifications');
      } catch (error) {
        console.log('🔧 TESTING: Type-filtered query failed:', (error as Error).message);
      }
      
    } catch (error) {
      console.error('❌ Test query failed:', error);
    }
  }
}

export default NotificationDebugger;
