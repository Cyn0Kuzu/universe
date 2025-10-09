import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { UniversalAvatar } from './common';
import { useUserAvatar } from '../hooks/useUserAvatar';
// 🚀 Performance optimization imports
import { 
  useBatchedState, 
  useDebounce, 
  useMountedState, 
  useThrottle,
  // useRenderTime, // Disabled to reduce warnings
  firestoreCache
} from '../utils/performanceOptimizer';

interface ClubNotification {
  id?: string;
  type: string;
  title: string;
  message: string;
  recipientId: string;
  userId?: string;
  userName?: string;
  clubId?: string;
  eventId?: string;
  priority: string;
  read: boolean;
  createdAt: any;
  data?: any;
}

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
}

const { width, height } = Dimensions.get('window');

const NotificationModal: React.FC<NotificationModalProps> = ({
  visible,
  onClose,
  userId,
}) => {
  const navigation = useNavigation();
  const isMounted = useMountedState();
  
  // 🚀 Performance: Render time tracking (disabled to reduce warnings)
  // useRenderTime('NotificationModal');

  // 🚀 Performance: Consolidated state using batched updates
  const [modalState, setModalState] = useBatchedState({
    notifications: [] as ClubNotification[],
    loading: false,
    refreshing: false
  });

  // 🚀 Performance: Memoized unread count
  const unreadCount = useMemo(() => 
    modalState.notifications.filter(n => !n.read).length, 
    [modalState.notifications]
  );

  useEffect(() => {
    if (visible && userId) {
      loadNotifications();
    }
  }, [visible, userId]);

  const loadNotifications = async () => {
    if (!isMounted()) return;
    
    try {
      setModalState({ loading: true });
      
      console.log(`📋 Loading notifications for user: ${userId}`);
      
      // Tüm bildirimleri al (recipientType filtresi olmadan)
      let snapshot;
      try {
        snapshot = await firebase.firestore()
          .collection('notifications')
          .where('recipientId', '==', userId)
          .orderBy('createdAt', 'desc')
          .limit(200)
          .get();
          
        console.log(`📋 Loaded ${snapshot.size} total notifications for user ${userId}`);
      } catch (orderError) {
        console.warn('OrderBy failed, trying without ordering:', orderError);
        snapshot = await firebase.firestore()
          .collection('notifications')
          .where('recipientId', '==', userId)
          .limit(200)
          .get();
      }

      const fetchedNotifications: ClubNotification[] = [];
      
      // Tüm bildirimleri işle
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        
        // Client-side filtering: recipientType 'club' olanları veya recipientType olmayan eski bildirimleri al
        const recipientType = data.recipientType;
        if (recipientType && recipientType !== 'club') {
          return; // Skip non-club notifications
        }
        
        const notification: ClubNotification = {
          id: doc.id,
          type: data.type || 'unknown',
          title: data.title || 'Bildirim',
          message: data.message || '',
          recipientId: data.recipientId,
          userId: data.senderId || data.userId,
          userName: data.senderName || data.userName,
          clubId: data.metadata?.clubId || data.clubId,
          eventId: data.metadata?.eventId || data.eventId,
          priority: data.priority || 'medium',
          read: data.read || false,
          createdAt: data.createdAt,
          data: data.metadata || data.data,
        };
        fetchedNotifications.push(notification);
      });

      // Sort by createdAt if not ordered by Firebase
      fetchedNotifications.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return b.createdAt.toMillis() - a.createdAt.toMillis();
      });

      if (isMounted()) {
        setModalState({ notifications: fetchedNotifications });
        console.log(`✅ Successfully loaded ${fetchedNotifications.length} club notifications`);
        if (fetchedNotifications.length > 0) {
          console.log('First notification:', fetchedNotifications[0]);
        }
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      if (isMounted()) {
        setModalState({ loading: false });
      }
    }
  };

  const onRefresh = useCallback(async () => {
    setModalState({ refreshing: true });
    await loadNotifications();
    if (isMounted()) {
      setModalState({ refreshing: false });
    }
  }, [loadNotifications, isMounted]);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!isMounted()) return;
    
    try {
      await firebase.firestore()
        .collection('notifications')
        .doc(notificationId)
        .update({ read: true });

      setModalState(prev => ({
        notifications: prev.notifications.map((notification: ClubNotification) =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      }));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [isMounted]);

  const markAllAsRead = useCallback(async () => {
    if (!isMounted()) return;
    
    try {
      const batch = firebase.firestore().batch();
      
      modalState.notifications
        .filter((notification: ClubNotification) => !notification.read && notification.id)
        .forEach((notification: ClubNotification) => {
          const notificationRef = firebase.firestore()
            .collection('notifications')
            .doc(notification.id!);
          batch.update(notificationRef, { read: true });
        });

      await batch.commit();
      
      if (isMounted()) {
        setModalState(prev => ({
          notifications: prev.notifications.map((notification: ClubNotification) => ({ ...notification, read: true }))
        }));
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [modalState.notifications, isMounted]);

  const handleNotificationPress = async (notification: ClubNotification) => {
    // Mark as read when pressed
    if (!notification.read && notification.id) {
      await markAsRead(notification.id);
    }

    // Navigate based on notification type
    switch (notification.type) {
      // 👥 Takip bildirimleri
      case 'user_follow':
      case 'new_follow':
      case 'user_followed_points':
      case 'user_unfollowed_points':
        // Navigate to user profile
        break;
        
      // 🎯 Yeni birleşik bildirim tipleri - Etkinlik + Puan
      case 'event_like_points':
      case 'event_unlike_points':
      case 'event_joined_points':
      case 'event_left_points':
      case 'event_commented_points':
      case 'event_shared_points':
        if (notification.data?.eventId || notification.eventId) {
          // Navigate to event details
        }
        break;
        
      // 🎯 Yorum bildirimleri
      case 'comment_liked_points':
      case 'comment_unliked_points':
        if (notification.data?.eventId || notification.eventId) {
          // Navigate to event details (yorum sayfası)
        }
        break;
        
      // 🎯 Kulüp yönetimi bildirimleri
      case 'member_approved_points':
      case 'member_left_points':
      case 'member_kicked_points':
        if (notification.data?.clubId || notification.clubId) {
          // Navigate to club management
        }
        break;
        
      // 🎯 Kulüp katılım bildirimleri
      case 'club_join_points':
      case 'club_followed_points':
      case 'club_unfollowed_points':
        if (notification.data?.clubId || notification.clubId) {
          // Navigate to club details
        }
        break;
        
      // 📅 Etkinlik bildirimleri
      case 'event_created':
      case 'event_updated':
      case 'event_comment':
      case 'event_join':
        if (notification.eventId || notification.data?.eventId) {
          // Navigate to event details
        }
        break;
        
      // 🏛️ Kulüp bildirimleri
      case 'membership_approved':
      case 'membership_rejected':
      case 'club_follow':
      case 'member_request':
      case 'club_announcement':
        if (notification.clubId || notification.data?.clubId) {
          // Navigate to club
        }
        break;
        
      // ⚠️ ESKİ TİPLER - Geriye dönük uyumluluk (DEPRECATED)
      case 'event_like':
      case 'event_unlike':
      case 'score_gain':
      case 'score_loss':
        // Legacy navigation - can be deprecated later
        break;
        
      default:
        break;
    }

    onClose();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      // 👥 Takip bildirimleri
      case 'user_follow':
      case 'new_follow':
      case 'user_followed_points':
        return 'person-add';
      case 'user_unfollow':
      case 'user_unfollowed_points':
        return 'person-remove';
        
      // 🎯 Yeni birleşik bildirim tipleri - İşlem + Puan
      case 'event_like_points':
        return 'heart'; // Etkinlik beğeni + puan
      case 'event_unlike_points':
        return 'heart-dislike'; // Etkinlik beğeni geri alma + puan kaybı
      case 'event_joined_points':
        return 'calendar-number'; // Etkinlik katılım + puan
      case 'event_left_points':
        return 'exit'; // Etkinlik ayrılma + puan kaybı
      case 'event_commented_points':
        return 'chatbubble'; // Etkinlik yorum + puan
      case 'event_shared_points':
        return 'share'; // Etkinlik paylaşım + puan
      case 'comment_liked_points':
        return 'thumbs-up'; // Yorum beğeni + puan
      case 'comment_unliked_points':
        return 'thumbs-down'; // Yorum beğeni geri alma + puan kaybı
      case 'member_approved_points':
        return 'checkmark-circle'; // Üye onay + puan
      case 'member_left_points':
        return 'exit-outline'; // Üye ayrılma + puan kaybı
      case 'member_kicked_points':
        return 'remove-circle'; // Üye atma + puan değişimi
      case 'club_join_points':
        return 'home'; // Kulüp katılım + puan
      case 'club_followed_points':
        return 'heart-circle'; // Kulüp takip + puan
      case 'club_unfollowed_points':
        return 'heart-dislike-circle'; // Kulüp takip bırakma + puan kaybı
      case 'club_membership_approved':
        return 'checkmark-circle'; // Üyelik onayı + puan
      case 'club_member_approved_points':
        return 'checkmark-circle'; // Club owner: Üye onayı + puan
      case 'club_left_points':
        return 'exit-outline'; // Kulüpten ayrılma + puan kaybı
      case 'club_kicked_points':
        return 'close-circle-outline'; // Kulüpten çıkarılma + puan kaybı
      case 'comment_target_liked_points':
        return 'thumbs-up'; // Target: Yorumun beğenildi + puan
      case 'comment_target_unliked_points':
        return 'thumbs-down'; // Target: Yorum beğenisi geri alındı + puan kaybı
      case 'event_shared_points':
        return 'share'; // Etkinlik paylaşım + puan
      case 'comment_deleted_points':
        return 'trash'; // Yorum silme + puan kaybı
      case 'event_created_points':
        return 'calendar-plus'; // Etkinlik oluşturma + puan
      case 'event_updated_points':
        return 'calendar-edit'; // Etkinlik güncelleme + puan
      case 'event_deleted_points':
        return 'calendar-remove'; // Etkinlik silme + puan kaybı
        
      // 📊 Genel sistem bildirimleri
      case 'level_up':
        return 'star';
      case 'system_message':
        return 'information-circle';
        
      // 📅 Etkinlik bildirimleri
      case 'event_created':
        return 'calendar';
      case 'event_updated':
        return 'calendar-outline';
      case 'event_comment':
        return 'chatbubble-outline';
      case 'event_join':
        return 'enter-outline';
        
      // 🏛️ Kulüp bildirimleri
      case 'membership_approved':
        return 'checkmark-circle';
      case 'membership_rejected':
        return 'close-circle';
      case 'club_announcement':
        return 'megaphone';
      case 'club_follow':
        return 'heart-outline';
      case 'member_request':
        return 'person-add-outline';
        
      // ⚠️ ESKİ TİPLER - Geriye dönük uyumluluk (DEPRECATED)
      case 'event_like':
        return 'heart-outline';
      case 'event_unlike':
        return 'heart-dislike-outline';
      case 'score_gain':
        return 'trending-up';
      case 'score_loss':
        return 'trending-down';
        
      default:
        return 'notifications';
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      
      const minutes = Math.floor(diff / (1000 * 60));
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      
      if (minutes < 1) return 'Şimdi';
      if (minutes < 60) return `${minutes}dk`;
      if (hours < 24) return `${hours}s`;
      if (days < 7) return `${days}g`;
      
      return date.toLocaleDateString('tr-TR');
    } catch (error) {
      return '';
    }
  };

  const NotificationRow: React.FC<{ item: ClubNotification }> = ({ item }) => {
    const senderId = item.userId || item.clubId;
    const { avatarData } = useUserAvatar(senderId || '');
    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          !item.read && styles.unreadNotification,
        ]}
        onPress={() => handleNotificationPress(item)}
      >
        <View style={styles.notificationIcon}>
          {senderId ? (
            <UniversalAvatar
              user={{ id: senderId, displayName: avatarData?.displayName, profileImage: avatarData?.profileImage }}
              size={36}
            />
          ) : (
            <Ionicons
              name={getNotificationIcon(item.type) as any}
              size={24}
              color={!item.read ? '#4ECDC4' : '#999'}
            />
          )}
        </View>

        <View style={styles.notificationContent}>
          <Text style={[
            styles.notificationTitle,
            !item.read && styles.unreadTitle
          ]}>
            {item.title}
          </Text>
          <Text style={styles.notificationMessage}>
            {item.message}
          </Text>
          <Text style={styles.notificationTime}>
            {formatTime(item.createdAt)}
          </Text>
        </View>

        {!item.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            Bildirimler {unreadCount > 0 && `(${unreadCount})`}
          </Text>
          <View style={styles.headerButtons}>
            {unreadCount > 0 && (
              <TouchableOpacity
                style={styles.markAllButton}
                onPress={markAllAsRead}
              >
                <Text style={styles.markAllText}>Tümünü Oku</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
        </View>

        {modalState.loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4ECDC4" />
            <Text style={styles.loadingText}>Bildirimler yükleniyor...</Text>
          </View>
        ) : (
          <FlatList
            data={modalState.notifications}
            renderItem={({ item }) => <NotificationRow item={item} />}
            keyExtractor={(item) => item.id || Math.random().toString()}
            style={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={modalState.refreshing}
                onRefresh={onRefresh}
                colors={['#4ECDC4']}
              />
            }
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Ionicons name="notifications-outline" size={64} color="#ccc" />
                <Text style={styles.emptyText}>Henüz bildiriminiz yok</Text>
              </View>
            )}
            extraData={modalState.notifications.length}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  markAllButton: {
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 10,
  },
  markAllText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  closeButton: {
    padding: 5,
  },
  list: {
    flex: 1,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    marginVertical: 1,
    alignItems: 'flex-start',
  },
  unreadNotification: {
    backgroundColor: '#f8f9ff',
  },
  notificationIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  unreadTitle: {
    color: '#000',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ECDC4',
    marginTop: 8,
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
});

export default NotificationModal;
