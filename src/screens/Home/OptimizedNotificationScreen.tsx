/**
 * 🚀 Optimized Notification Screen - Performance Enhanced
 * Akıcı bildirim deneyimi için optimize edilmiş ekran
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  FlatList, // ScrollView yerine FlatList - daha performanslı
  RefreshControl, 
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { Text, useTheme, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../contexts/AuthContext';
import { firebase } from '../../firebase';
import { markNotificationAsRead, markAllNotificationsAsRead } from '../../utils/notificationHelper';
import { useNotificationCount } from '../../hooks/useNotificationCount';
import { useClubNotificationCount } from '../../hooks/useClubNotificationCount';
// 🚀 Performance imports
import { 
  useBatchedState, 
  useDebounce, 
  useMountedState, 
  useThrottle,
  useRenderTime,
  firestoreCache,
  globalFirestoreListener
} from '../../utils/performanceOptimizer';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: any;
  recipientType?: 'club' | 'student';
  actionData?: {
    eventId?: string;
    clubId?: string;
    userId?: string;
  };
}

interface NotificationItemProps {
  item: Notification;
  index: number;
  onPress: (notification: Notification) => void;
  theme: any;
}

// 🚀 Memoized NotificationItem component - Re-render'ları önler
const NotificationItem = React.memo<NotificationItemProps>(({ 
  item, 
  index, 
  onPress, 
  theme 
}) => {
  return (
    <TouchableOpacity
      onPress={() => onPress(item)}
      style={[
        styles.notificationItem,
        { backgroundColor: item.read ? theme.colors.surface : theme.colors.background },
      ]}
      activeOpacity={0.7}
    >
      <View style={styles.notificationContent}>
        <View style={[styles.unreadIndicator, { 
          backgroundColor: item.read ? 'transparent' : theme.colors.primary 
        }]} />
        
        <View style={styles.textContainer}>
          <Text 
            style={[styles.title, { color: theme.colors.onSurface }]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text 
            style={[styles.message, { color: theme.colors.placeholder }]}
            numberOfLines={2}
          >
            {item.message}
          </Text>
          <Text style={[styles.timestamp, { color: theme.colors.disabled }]}>
            {formatTimestamp(item.createdAt)}
          </Text>
        </View>
        
        <MaterialCommunityIcons
          name="chevron-right"
          size={24}
          color={theme.colors.placeholder}
        />
      </View>
    </TouchableOpacity>
  );
});

// 🚀 Performance: Memoized timestamp formatter
const formatTimestamp = (timestamp: any) => {
  if (!timestamp) return '';
  
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 1) return 'Şimdi';
    if (diffMinutes < 60) return `${diffMinutes} dakika önce`;
    if (diffHours < 24) return `${diffHours} saat önce`;
    if (diffDays < 7) return `${diffDays} gün önce`;
    
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    return '';
  }
};

const OptimizedNotificationScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { currentUser, isClubAccount } = useAuth();
  const isMounted = useMountedState();
  
  // 🚀 Performance: Render time tracking
  useRenderTime('NotificationScreen');

  // 🚀 Performance: Consolidated state using batched updates
  const [screenState, setScreenState] = useBatchedState({
    notifications: [] as Notification[],
    loading: true,
    refreshing: false,
    unreadCount: 0,
    hasMore: true,
    loadingMore: false
  });

  // Bildirim sayısı hook'ları
  const { refreshCount: refreshStudentNotificationCount } = useNotificationCount();
  const { refreshCount: refreshClubNotificationCount } = useClubNotificationCount(currentUser?.uid);

  // 🚀 Performance: Memoized notification types
  const notificationTypes = useMemo(() => {
    if (isClubAccount) {
      return [
        'event_like_points', 'event_unlike_points', 'event_commented_points',
        'event_shared_points', 'member_approved_points', 'member_left_points',
        'club_followed_points', 'club_unfollowed_points', 'event_created',
        'event_updated', 'membership_request', 'membership_approved',
        'new_follow', 'event_join', 'milestone_reached', 'system_message'
      ];
    } else {
      return [
        'comment_liked_points', 'comment_target_liked_points', 'event_joined_points',
        'event_left_points', 'user_followed_points', 'user_unfollowed_points',
        'comment_replied_points', 'event_shared_points', 'club_joined_points',
        'membership_approved', 'membership_rejected', 'event_reminder',
        'achievement_unlocked', 'level_up', 'daily_reward', 'system_message'
      ];
    }
  }, [isClubAccount]);

  // 🚀 Performance: Debounced search for better UX
  const debouncedRefresh = useDebounce(screenState.refreshing, 300);

  // 🚀 Performance: Throttled notification handler
  const handleNotificationPress = useThrottle(async (notification: Notification) => {
    if (!isMounted() || !currentUser?.uid) return;

    try {
      // Mark as read
      if (!notification.read) {
        await markNotificationAsRead(notification.id, currentUser.uid, isClubAccount ? 'club' : 'student');
        
        // Update local state
        setScreenState(prev => ({
          ...prev,
          notifications: prev.notifications.map(n => 
            n.id === notification.id ? { ...n, read: true } : n
          ),
          unreadCount: Math.max(0, prev.unreadCount - 1)
        }));
      }

      // Navigate based on notification type
      if (notification.actionData?.eventId) {
        navigation.navigate('EventDetail', { eventId: notification.actionData.eventId });
      } else if (notification.actionData?.clubId) {
        navigation.navigate('ClubProfile', { clubId: notification.actionData.clubId });
      } else if (notification.actionData?.userId) {
        navigation.navigate('UserProfile', { userId: notification.actionData.userId });
      }
    } catch (error) {
      console.error('Error handling notification press:', error);
    }
  }, 500);

  // 🚀 Performance: Optimized fetch notifications with caching
  const fetchNotifications = useCallback(async (isRefresh = false) => {
    if (!currentUser?.uid || !isMounted()) return;

    const cacheKey = `notifications_${currentUser.uid}_${isClubAccount ? 'club' : 'student'}`;
    
    try {
      // Check cache first (only for initial load, not refresh)
      if (!isRefresh) {
        const cachedData = firestoreCache.get(cacheKey);
        if (cachedData && Array.isArray(cachedData)) {
          setScreenState({
            notifications: cachedData,
            loading: false
          });
        }
      }

      const collection = isClubAccount ? 'clubNotifications' : 'notifications';
      const query = firebase.firestore()
        .collection(collection)
        .where('recipientId', '==', currentUser.uid)
        .where('type', 'in', notificationTypes)
        .orderBy('createdAt', 'desc')
        .limit(50);

      const snapshot = await query.get();
      
      if (!isMounted()) return;

      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];

      // Cache the data
      firestoreCache.set(cacheKey, notifications, 180000); // 3 minutes TTL

      const unreadCount = notifications.filter(n => !n.read).length;

      setScreenState({
        notifications,
        unreadCount,
        loading: false,
        refreshing: false
      });

    } catch (error) {
      console.error('Error fetching notifications:', error);
      if (isMounted()) {
        setScreenState({
          loading: false,
          refreshing: false
        });
      }
    }
  }, [currentUser?.uid, isClubAccount, notificationTypes, isMounted]);

  // 🚀 Performance: Setup optimized real-time listener
  useEffect(() => {
    if (!currentUser?.uid) return;

    const collection = isClubAccount ? 'clubNotifications' : 'notifications';
    const listenerPath = `${collection}_${currentUser.uid}`;

    const callback = (data: any[]) => {
      if (!isMounted()) return;
      
      const notifications = data.filter(item => 
        notificationTypes.includes(item.type)
      ) as Notification[];
      
      const unreadCount = notifications.filter(n => !n.read).length;
      
      setScreenState({
        notifications,
        unreadCount
      });
    };

    // Use global optimized listener
    globalFirestoreListener.addListener(
      listenerPath,
      callback,
      () => firebase.firestore()
        .collection(collection)
        .where('recipientId', '==', currentUser.uid)
        .where('type', 'in', notificationTypes)
        .orderBy('createdAt', 'desc')
        .limit(50)
    );

    return () => {
      globalFirestoreListener.removeListener(listenerPath, callback);
    };
  }, [currentUser?.uid, isClubAccount, notificationTypes, isMounted]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications(false);
  }, [fetchNotifications]);

  // 🚀 Performance: Throttled refresh control
  const onRefresh = useThrottle(async () => {
    setScreenState({ refreshing: true });
    await fetchNotifications(true);
    
    // Refresh notification counts
    if (isClubAccount) {
      refreshClubNotificationCount();
    } else {
      refreshStudentNotificationCount();
    }
  }, 1000);

  // 🚀 Performance: Optimized FlatList render
  const renderNotification = useCallback(({ item, index }: { 
    item: Notification; 
    index: number 
  }) => (
    <NotificationItem 
      item={item}
      index={index}
      onPress={handleNotificationPress}
      theme={theme}
    />
  ), [handleNotificationPress, theme]);

  const keyExtractor = useCallback((item: Notification) => item.id, []);

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: 80,
      offset: 80 * index,
      index,
    }),
    []
  );

  if (screenState.loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
            Bildirimler
          </Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.onSurface }]}>
            Bildirimler yükleniyor...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
          Bildirimler
        </Text>
        {screenState.unreadCount > 0 && (
          <View style={[styles.unreadBadge, { backgroundColor: theme.colors.primary }]}>
            <Text style={[styles.unreadBadgeText, { color: '#FFFFFF' }]}>
              {screenState.unreadCount}
            </Text>
          </View>
        )}
      </View>

      {screenState.notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="bell-outline"
            size={64}
            color={theme.colors.disabled}
          />
          <Text style={[styles.emptyText, { color: theme.colors.onSurface }]}>
            Henüz bildiriminiz yok
          </Text>
          <Text style={[styles.emptySubtext, { color: theme.colors.backdrop }]}>
            Etkinliklere katılın ve etkileşimde bulunun!
          </Text>
        </View>
      ) : (
        <FlatList
          data={screenState.notifications}
          renderItem={renderNotification}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          refreshControl={
            <RefreshControl
              refreshing={screenState.refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={15}
          updateCellsBatchingPeriod={50}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  unreadBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  unreadBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  notificationItem: {
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  textContainer: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
  },
});

export default OptimizedNotificationScreen;
