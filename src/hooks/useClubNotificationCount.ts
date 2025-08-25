import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebase } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

export const useClubNotificationCount = (clubOwnerId?: string) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const { currentUser } = useAuth();

  // Club bildirim sayısını hesapla
  const calculateClubUnreadCount = useCallback(async () => {
    if (!currentUser || !clubOwnerId) {
      setUnreadCount(0);
      return;
    }

    try {
      const db = firebase.firestore();
      
      // Club bildirimleri - recipientId ile filtrele (orderBy kaldırıldı)
      const notificationsSnapshot = await db
        .collection('notifications')
        .where('recipientId', '==', clubOwnerId)
        .limit(50)
        .get();

      // Client-side filtering for club notifications
      const clubNotifications: any[] = [];
      notificationsSnapshot.forEach(doc => {
        const data = doc.data();
        // 🚨 CRITICAL FIX: Handle legacy notifications without recipientType
        const recipientType = data.recipientType || 'club'; // Default to club for backward compatibility
        // Accept notifications without recipientType field (legacy notifications)
        if (recipientType === 'club' || !data.recipientType) {
          clubNotifications.push({ id: doc.id, ...data });
        }
      });

      // Sort notifications by createdAt descending (newest first)
      clubNotifications.sort((a, b) => {
        const aTime = a.createdAt?.toMillis() || 0;
        const bTime = b.createdAt?.toMillis() || 0;
        return bTime - aTime;
      });

      // AsyncStorage'dan okunmuş bildirim durumlarını al
      const readNotificationsKey = `readNotifications_club_${clubOwnerId}`;
      let existingReadNotifications = null;
      try {
        existingReadNotifications = await AsyncStorage.getItem(readNotificationsKey);
      } catch (error) {
        console.warn('AsyncStorage.getItem failed in useClubNotificationCount:', error);
        existingReadNotifications = null;
      }
      const readNotificationIds = existingReadNotifications ? JSON.parse(existingReadNotifications) : [];
      
      // Okunmamış bildirim sayısını hesapla
      let unreadCount = 0;
      clubNotifications.forEach(notification => {
        const isRead = notification.read || readNotificationIds.includes(notification.id);
        if (!isRead) {
          unreadCount++;
        }
      });
      
      setUnreadCount(unreadCount);
      console.log(`📊 Kulüp bildirim sayısı güncellendi: ${unreadCount} okunmamış (Club: ${clubOwnerId})`);
      
    } catch (error) {
      console.error('Kulüp bildirim sayısı hesaplanırken hata:', error);
      setUnreadCount(0);
    }
  }, [currentUser, clubOwnerId]);

  useEffect(() => {
    if (!currentUser || !clubOwnerId) {
      setUnreadCount(0);
      return;
    }

    // İlk yüklemede hesapla
    calculateClubUnreadCount();

    // Real-time listener setup for club notifications
    let unsubscribe: (() => void) | null = null;
    
    try {
      console.log('🔔 Setting up real-time club notification count listener...');
      const db = firebase.firestore();
      
      unsubscribe = db
        .collection('notifications')
        .where('recipientId', '==', clubOwnerId)
        .onSnapshot(async (snapshot) => {
          try {
            let unreadCount = 0;
            const readNotificationsKey = `readNotifications_club_${clubOwnerId}`;
            let existingReadNotifications = null;
            try {
              existingReadNotifications = await AsyncStorage.getItem(readNotificationsKey);
            } catch (error) {
              console.warn('AsyncStorage.getItem failed in club notification snapshot:', error);
              existingReadNotifications = null;
            }
            const readNotificationIds = existingReadNotifications ? JSON.parse(existingReadNotifications) : [];
            
            // 🚨 CRITICAL DEBUG: Track exactly which notifications are counted as unread
            const unreadNotifications: any[] = [];
            const allClubNotifications: any[] = [];
            
            snapshot.forEach(doc => {
              const data = doc.data();
              // Client-side filtering for club notifications - FIXED: Handle undefined recipientType
              const recipientType = data.recipientType || 'club'; // Default to club for backward compatibility
              
              // 🚨 CRITICAL: Accept notifications without recipientType field (legacy notifications)
              const isClubNotification = recipientType === 'club' || !data.recipientType;
              
              if (isClubNotification) {
                allClubNotifications.push({
                  id: doc.id,
                  read: data.read,
                  type: data.type,
                  title: data.title,
                  recipientType: data.recipientType,
                  inAsyncStorage: readNotificationIds.includes(doc.id)
                });
                
                const isRead = data.read || readNotificationIds.includes(doc.id);
                if (!isRead) {
                  unreadCount++;
                  unreadNotifications.push({
                    id: doc.id.substring(0, 8) + '...',
                    read: data.read,
                    type: data.type,
                    title: data.title?.substring(0, 40) + '...',
                    recipientType: data.recipientType,
                    inAsyncStorage: readNotificationIds.includes(doc.id),
                    isLegacyNotification: !data.recipientType
                  });
                }
              }
            });
            
            // 🚨 DETAILED LOGGING
            console.log(`🔍 REAL-TIME LISTENER: Found ${allClubNotifications.length} club notifications`);
            console.log(`🔍 REAL-TIME LISTENER: ${unreadCount} unread notifications`);
            
            if (unreadNotifications.length > 0) {
              console.log('🚨 REAL-TIME UNREAD NOTIFICATIONS:', unreadNotifications);
            } else {
              console.log('✅ REAL-TIME: All notifications are read');
            }
            
            setUnreadCount(unreadCount);
            console.log(`🔔 Real-time club notification count updated: ${unreadCount} unread (Club: ${clubOwnerId})`);
            
          } catch (error) {
            console.error('Club notification count snapshot error:', error);
          }
        }, (error) => {
          console.error('Club notification count listener error:', error);
          // Listener failed, will fallback to periodic refresh in cleanup
        });
        
    } catch (error) {
      console.error('Error setting up club notification count listener:', error);
      // Listener setup failed, will use periodic refresh as fallback
    }
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
        console.log('🔕 Club notification count listener cleaned up');
      }
    };
  }, [currentUser, clubOwnerId, calculateClubUnreadCount]);

  // Manual refresh fonksiyonu
  const refreshCount = useCallback(() => {
    calculateClubUnreadCount();
  }, [calculateClubUnreadCount]);

  return { unreadCount, refreshCount };
};
