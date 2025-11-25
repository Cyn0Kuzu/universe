import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type firebaseCompat from 'firebase/compat/app';
import { getFirebaseCompatSync } from '../firebase/compat';
import { useAuth } from '../contexts/AuthContext';

const firebase = getFirebaseCompatSync();

export const useNotificationCount = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const { currentUser, isClubAccount } = useAuth();

  // AsyncStorage'dan bildirim sayısını hesapla
  const calculateUnreadCount = useCallback(async () => {
    if (!currentUser) {
      setUnreadCount(0);
      return;
    }

    try {
      const db = getFirebaseCompatSync().firestore();
      const notificationsRef = db.collection('notifications');
      const [userIdSnapshot, recipientSnapshot] = await Promise.all([
        notificationsRef.where('userId', '==', currentUser.uid).get(),
        notificationsRef.where('recipientId', '==', currentUser.uid).get(),
      ]);

      const docMap = new Map<string, firebaseCompat.firestore.DocumentSnapshot>();
      [userIdSnapshot, recipientSnapshot].forEach(snapshot => {
        snapshot.docs.forEach(doc => {
          if (!docMap.has(doc.id)) {
            docMap.set(doc.id, doc);
          }
        });
      });

      // AsyncStorage'dan okunmuş bildirim durumlarını al
      const readNotificationsKey = `readNotifications_${currentUser.uid}${isClubAccount ? '_club' : ''}`;
      let existingReadNotifications = null;
      try {
        existingReadNotifications = await AsyncStorage.getItem(readNotificationsKey);
      } catch (error) {
        console.warn('AsyncStorage.getItem failed in useNotificationCount:', error);
        existingReadNotifications = null;
      }
      const readNotificationIds = existingReadNotifications ? JSON.parse(existingReadNotifications) : [];
      
      // Okunmamış bildirim sayısını hesapla
      let unread = 0;
      docMap.forEach(doc => {
        const data = doc.data();
        const isRead = data.read || readNotificationIds.includes(doc.id);
        if (!isRead) {
          unread++;
        }
      });
      
      setUnreadCount(unread);
      console.log(`📊 Bildirim sayısı güncellendi: ${unread} okunmamış`);
      
    } catch (error) {
      console.error('Bildirim sayısı hesaplanırken hata:', error);
      setUnreadCount(0);
    }
  }, [currentUser, isClubAccount]);

  useEffect(() => {
    if (!currentUser) {
      setUnreadCount(0);
      return;
    }

    // İlk yüklemede hesapla
    calculateUnreadCount();

    // Real-time listener setup for student notifications
    const unsubscribeFns: Array<() => void> = [];
    
    try {
      console.log('🔔 Setting up real-time notification count listener...');
      const db = getFirebaseCompatSync().firestore();
      
      const handleSnapshotUpdate = () => {
        calculateUnreadCount();
      };

      unsubscribeFns.push(
        db
          .collection('notifications')
          .where('userId', '==', currentUser.uid)
          .onSnapshot(handleSnapshotUpdate, (error) => {
            console.error('Notification count listener error (userId):', error);
          })
      );

      unsubscribeFns.push(
        db
          .collection('notifications')
          .where('recipientId', '==', currentUser.uid)
          .onSnapshot(handleSnapshotUpdate, (error) => {
            console.error('Notification count listener error (recipientId):', error);
          })
      );
        
    } catch (error) {
      console.error('Error setting up notification count listener:', error);
      // Listener setup failed, will use periodic refresh as fallback
    }
    
    return () => {
      unsubscribeFns.forEach(unsub => unsub());
      console.log('🔕 Notification count listeners cleaned up');
    };
  }, [currentUser, calculateUnreadCount]);

  // Manual refresh fonksiyonu
  const refreshCount = useCallback(() => {
    calculateUnreadCount();
  }, [calculateUnreadCount]);

  return { unreadCount, refreshCount };
};
