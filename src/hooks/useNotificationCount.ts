import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebase } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

export const useNotificationCount = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const { currentUser } = useAuth();

  // AsyncStorage'dan bildirim sayısını hesapla
  const calculateUnreadCount = useCallback(async () => {
    if (!currentUser) {
      setUnreadCount(0);
      return;
    }

    try {
      const db = firebase.firestore();
      
      // Database'den tüm bildirimleri al (recipientType filtresi olmadan)
      const notificationsSnapshot = await db
        .collection('notifications')
        .where('recipientId', '==', currentUser.uid)
        .get();

      // AsyncStorage'dan okunmuş bildirim durumlarını al
      const readNotificationsKey = `readNotifications_${currentUser.uid}`;
      let existingReadNotifications = null;
      try {
        existingReadNotifications = await AsyncStorage.getItem(readNotificationsKey);
      } catch (error) {
        console.warn('AsyncStorage.getItem failed in useNotificationCount:', error);
        existingReadNotifications = null;
      }
      const readNotificationIds = existingReadNotifications ? JSON.parse(existingReadNotifications) : [];
      
      // Okunmamış bildirim sayısını hesapla
      let unreadCount = 0;
      notificationsSnapshot.forEach(doc => {
        const data = doc.data();
        const isRead = data.read || readNotificationIds.includes(doc.id);
        if (!isRead) {
          unreadCount++;
        }
      });
      
      setUnreadCount(unreadCount);
      console.log(`📊 Bildirim sayısı güncellendi: ${unreadCount} okunmamış`);
      
    } catch (error) {
      console.error('Bildirim sayısı hesaplanırken hata:', error);
      setUnreadCount(0);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      setUnreadCount(0);
      return;
    }

    // İlk yüklemede hesapla
    calculateUnreadCount();

    // Real-time listener setup for student notifications
    let unsubscribe: (() => void) | null = null;
    
    try {
      console.log('🔔 Setting up real-time notification count listener...');
      const db = firebase.firestore();
      
      unsubscribe = db
        .collection('notifications')
        .where('recipientId', '==', currentUser.uid)
        .onSnapshot(async (snapshot) => {
          try {
            let unreadCount = 0;
            const readNotificationsKey = `readNotifications_${currentUser.uid}`;
            let existingReadNotifications = null;
            try {
              existingReadNotifications = await AsyncStorage.getItem(readNotificationsKey);
            } catch (error) {
              console.warn('AsyncStorage.getItem failed in snapshot listener:', error);
              existingReadNotifications = null;
            }
            const readNotificationIds = existingReadNotifications ? JSON.parse(existingReadNotifications) : [];
            
            snapshot.forEach(doc => {
              const data = doc.data();
              // Client-side filtering for student notifications
              const recipientType = data.recipientType || 'student';
              if (recipientType === 'student') {
                const isRead = data.read || readNotificationIds.includes(doc.id);
                if (!isRead) {
                  unreadCount++;
                }
              }
            });
            
            setUnreadCount(unreadCount);
            console.log(`🔔 Real-time notification count updated: ${unreadCount} unread`);
            
          } catch (error) {
            console.error('Notification count snapshot error:', error);
          }
        }, (error) => {
          console.error('Notification count listener error:', error);
          // Listener failed, fallback to periodic refresh in return cleanup
        });
        
    } catch (error) {
      console.error('Error setting up notification count listener:', error);
      // Listener setup failed, will use periodic refresh as fallback
    }
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
        console.log('🔕 Notification count listener cleaned up');
      }
    };
  }, [currentUser, calculateUnreadCount]);

  // Manual refresh fonksiyonu
  const refreshCount = useCallback(() => {
    calculateUnreadCount();
  }, [calculateUnreadCount]);

  return { unreadCount, refreshCount };
};
