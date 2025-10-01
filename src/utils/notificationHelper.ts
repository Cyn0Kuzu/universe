import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebase } from '../firebase/config';
import { SafeNotificationManager } from '../services/safeNotificationManager';

/**
 * 🧹 Clean notification data to remove undefined values
 */
export const cleanNotificationData = (data: any): any => {
  if (!data || typeof data !== 'object') return {};
  
  const cleaned: any = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null) {
      if (typeof value === 'string' && value.trim() === '') {
        // Skip empty strings for optional fields
        if (['eventId', 'clubId', 'actorImage', 'userProfileImage'].includes(key)) {
          continue;
        }
      }
      
      if (typeof value === 'object') {
        const cleanedNested = cleanNotificationData(value);
        if (Object.keys(cleanedNested).length > 0) {
          cleaned[key] = cleanedNested;
        }
      } else {
        cleaned[key] = value;
      }
    }
  }
  
  return cleaned;
};

/**
 * 📖 Bildirimi okundu olarak işaretle (hem AsyncStorage hem Firebase)
 */
export const markNotificationAsRead = async (
  notificationId: string,
  userId: string,
  userType: 'student' | 'club' = 'student',
  notificationCollection?: string // Bildirimin hangi koleksiyondan geldiği
): Promise<boolean> => {
  try {
    console.log(`📖 Marking notification as read: ${notificationId} for ${userType} ${userId} in collection: ${notificationCollection || 'default'}`);
    
    // Collection belirleme: _collection field'ı varsa onu kullan, yoksa userType'a göre belirle
    let targetUserType = userType;
    if (notificationCollection === 'clubNotifications') {
      targetUserType = 'club';
    } else if (notificationCollection === 'notifications') {
      targetUserType = 'student';
    }
    
    // Güvenli bildirim yöneticisi ile işaretle
    const result = await SafeNotificationManager.safeUpdateNotification(
      notificationId,
      { 
        read: true, 
        readAt: firebase.firestore.FieldValue.serverTimestamp()
      },
      targetUserType
    );
    
    if (result.success) {
      // AsyncStorage'ı da güncelle
      try {
        const readNotificationsKey = `readNotifications_${userId}${userType === 'club' ? '_club' : ''}`;
        const existingReadIds = await AsyncStorage.getItem(readNotificationsKey);
        const readIds = existingReadIds ? JSON.parse(existingReadIds) : [];
        
        if (!readIds.includes(notificationId)) {
          readIds.push(notificationId);
          await AsyncStorage.setItem(readNotificationsKey, JSON.stringify(readIds));
        }
        
        console.log(`✅ Notification ${notificationId} marked as read (Firebase: ${result.success}, AsyncStorage: true)`);
        return true;
      } catch (asyncError) {
        console.error('AsyncStorage update failed:', asyncError);
        return result.success; // Firebase başarılıysa yine de true dön
      }
    } else {
      console.warn(`⚠️ Failed to mark notification ${notificationId} as read: ${result.error}`);
      return false;
    }
    
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
};

/**
 * 📖 Tüm bildirimleri okundu olarak işaretle
 */
export const markAllNotificationsAsRead = async (
  notifications: any[],
  userId: string,
  userType: 'student' | 'club' = 'student'
): Promise<boolean> => {
  try {
    const unreadNotifications = notifications.filter(n => !n.read);
    console.log(`📖 Marking all ${unreadNotifications.length} notifications as read for ${userType} ${userId}`);
    
    // Group notifications by collection
    const notificationsByCollection = unreadNotifications.reduce((groups: any, notification) => {
      const collection = notification._collection || (userType === 'club' ? 'notifications' : 'notifications');
      if (!groups[collection]) {
        groups[collection] = [];
      }
      groups[collection].push(notification);
      return groups;
    }, {});
    
    let totalSuccess = 0;
    let totalFailed = 0;
    let asyncStorageSuccess = false;
    
    // Process each collection separately
    for (const [collection, collectionNotifications] of Object.entries(notificationsByCollection)) {
      console.log(`📖 Marking ${(collectionNotifications as any[]).length} notifications as read in ${collection}`);
      
      const collectionUserType = collection === 'clubNotifications' ? 'club' : 'student';
      const result = await SafeNotificationManager.safeBatchUpdateNotifications(
        collectionNotifications as any[],
        { read: true, readAt: firebase.firestore.FieldValue.serverTimestamp() },
        collectionUserType
      );
      
      totalSuccess += result.successCount;
      totalFailed += result.failedCount;
      
      if (result.success) {
        console.log(`✅ Collection ${collection}: ${result.successCount} success, ${result.failedCount} failed`);
      }
    }
    
    // Update AsyncStorage
    try {
      const readNotificationsKey = `readNotifications_${userId}${userType === 'club' ? '_club' : ''}`;
      const existingReadIds = await AsyncStorage.getItem(readNotificationsKey);
      const readIds = existingReadIds ? JSON.parse(existingReadIds) : [];
      
      const newReadIds = unreadNotifications.map(n => n.id);
      const allReadIds = [...new Set([...readIds, ...newReadIds])];
      
      await AsyncStorage.setItem(readNotificationsKey, JSON.stringify(allReadIds));
      asyncStorageSuccess = true;
      console.log(`✅ All ${unreadNotifications.length} notifications marked as read in AsyncStorage`);
    } catch (asyncError) {
      console.error('❌ AsyncStorage update failed:', asyncError);
    }
    
    const overallSuccess = totalSuccess > 0 || asyncStorageSuccess;
    console.log(`✅ All notifications marked as read (Firebase: ${totalSuccess} success, ${totalFailed} failed, AsyncStorage: ${asyncStorageSuccess})`);
    
    return overallSuccess;
    
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return false;
  }
};
