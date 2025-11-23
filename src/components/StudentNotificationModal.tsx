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
import { getFirebaseCompatSync } from '../firebase/compat';
import { UniversalAvatar } from './common';
import { useUserAvatar } from '../hooks/useUserAvatar';
// 🚀 Performance optimization imports
import { 
  useBatchedState, 
  useDebounce, 
  useMountedState, 
  useThrottle,
  firestoreCache
} from '../utils/performanceOptimizer';

interface StudentNotification {
  id?: string;
  type: string;
  title: string;
  message: string;
  recipientId: string;
  senderId?: string;
  senderName?: string;
  senderImage?: string;
  clubId?: string;
  eventId?: string;
  priority: string;
  read: boolean;
  createdAt: any;
  metadata?: any;
}

interface StudentNotificationModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
}

const firebase = getFirebaseCompatSync();

const { width, height } = Dimensions.get('window');

const StudentNotificationModal: React.FC<StudentNotificationModalProps> = ({
  visible,
  onClose,
  userId,
}) => {
  const navigation = useNavigation();
  const isMounted = useMountedState();

  // 🚀 Performance: Consolidated state using batched updates
  const [modalState, setModalState] = useBatchedState({
    notifications: [] as StudentNotification[],
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
    if (!isMounted.current) return;
    
    try {
      setModalState(prev => ({ ...prev, loading: true }));
      
      console.log(`📋 Loading student notifications for user: ${userId}`);
      
      // Tüm bildirimleri al (recipientType filtresi olmadan)
      let snapshot;
      try {
        snapshot = await getFirebaseCompatSync().firestore()
          .collection('notifications')
          .where('recipientId', '==', userId)
          .orderBy('createdAt', 'desc')
          .limit(200)
          .get();
          
        console.log(`📋 Loaded ${snapshot.size} total notifications for user ${userId}`);
      } catch (orderError) {
        console.warn('OrderBy failed, trying without ordering:', orderError);
        snapshot = await getFirebaseCompatSync().firestore()
          .collection('notifications')
          .where('recipientId', '==', userId)
          .limit(200)
          .get();
      }

      const fetchedNotifications: StudentNotification[] = [];
      
      // Tüm bildirimleri işle
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        
        // Client-side filtering: recipientType 'student' olanları veya recipientType olmayan eski bildirimleri al
        const recipientType = data.recipientType;
        if (recipientType && recipientType !== 'student') {
          return; // Skip non-student notifications
        }
        
        const notification: StudentNotification = {
          id: doc.id,
          type: data.type || 'unknown',
          title: data.title || 'Bildirim',
          message: data.message || '',
          recipientId: data.recipientId,
          senderId: data.senderId,
          senderName: data.senderName,
          senderImage: data.senderImage,
          clubId: data.metadata?.clubId || data.clubId,
          eventId: data.metadata?.eventId || data.eventId,
          priority: data.priority || 'medium',
          read: data.read || false,
          createdAt: data.createdAt,
          metadata: data.metadata,
        };
        fetchedNotifications.push(notification);
      });

      // Sort by createdAt if not ordered by Firebase
      fetchedNotifications.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return b.createdAt.toMillis() - a.createdAt.toMillis();
      });

      if (isMounted.current) {
        setModalState(prev => ({ ...prev, notifications: fetchedNotifications }));
        console.log(`✅ Successfully loaded ${fetchedNotifications.length} student notifications`);
        if (fetchedNotifications.length > 0) {
          console.log('First notification:', fetchedNotifications[0]);
        }
      }
    } catch (error) {
      console.error('Error loading student notifications:', error);
    } finally {
      if (isMounted.current) {
        setModalState(prev => ({ ...prev, loading: false }));
      }
    }
  };

  const onRefresh = useCallback(async () => {
    setModalState(prev => ({ ...prev, refreshing: true }));
    await loadNotifications();
    if (isMounted.current) {
      setModalState(prev => ({ ...prev, refreshing: false }));
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!modalState.notifications.length) return;

    try {
      const batch = getFirebaseCompatSync().firestore().batch();
      const unreadNotifications = modalState.notifications.filter(n => !n.read);
      
      unreadNotifications.forEach(notification => {
        if (notification.id) {
          const notificationRef = getFirebaseCompatSync().firestore()
            .collection('notifications')
            .doc(notification.id);
          batch.update(notificationRef, { read: true });
        }
      });

      await batch.commit();
      
      // Update local state
      setModalState(prev => ({
        ...prev,
        notifications: prev.notifications.map(n => ({ ...n, read: true }))
      }));
      
      console.log(`✅ Marked ${unreadNotifications.length} student notifications as read`);
    } catch (error) {
      console.error('Error marking all student notifications as read:', error);
    }
  }, [modalState.notifications]);

  const handleNotificationPress = useCallback(async (notification: StudentNotification) => {
    // Mark as read if not already
    if (!notification.read && notification.id) {
      try {
        await getFirebaseCompatSync().firestore()
          .collection('notifications')
          .doc(notification.id)
          .update({ read: true });

        // Update local state
        setModalState(prev => ({
          ...prev,
          notifications: prev.notifications.map(n => 
            n.id === notification.id ? { ...n, read: true } : n
          )
        }));
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Navigate based on notification type and metadata
    try {
      if (notification.metadata?.eventId) {
        (navigation as any).navigate('EventDetail', { eventId: notification.metadata.eventId });
      } else if (notification.metadata?.clubId) {
        (navigation as any).navigate('ClubProfile', { clubId: notification.metadata.clubId });
      } else if (notification.senderId) {
        (navigation as any).navigate('UserProfile', { userId: notification.senderId });
      }
      onClose(); // Close modal after navigation
    } catch (error) {
      console.error('Navigation error:', error);
    }
  }, [navigation, onClose]);

  const getNotificationIcon = (type: string): string => {
    switch (type) {
      case 'club_new_event':
        return 'calendar-plus';
      case 'event_comment_received':
      case 'joined_event_comment':
        return 'chat-outline';
      case 'membership_approved':
        return 'check-circle';
      case 'membership_rejected':
        return 'close-circle';
      case 'membership_removed':
        return 'alert-circle';
      case 'user_followed':
        return 'person-add';
      case 'user_unfollowed':
        return 'person-remove';
      default:
        return 'notifications-outline';
    }
  };

  const formatTime = (timestamp: any): string => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Şimdi';
    if (diffMins < 60) return `${diffMins}dk önce`;
    if (diffHours < 24) return `${diffHours}sa önce`;
    if (diffDays < 7) return `${diffDays} gün önce`;
    
    return date.toLocaleDateString('tr-TR');
  };

  const NotificationRow: React.FC<{ item: StudentNotification }> = ({ item }) => {
    const senderId = item.senderId;
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
              user={{ 
                id: senderId, 
                displayName: item.senderName || avatarData?.displayName, 
                profileImage: item.senderImage || avatarData?.profileImage 
              }}
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

export default StudentNotificationModal;
