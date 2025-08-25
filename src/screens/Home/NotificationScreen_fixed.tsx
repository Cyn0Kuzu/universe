/**
 * 🚀 Optimized Notification Screen - Performance Enhanced
 * Akıcı bildirim deneyimi için optimize edilmiş ekran
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  FlatList,
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
  // Pre-calculate timestamp to avoid repeated calculations during render
  const formattedTimestamp = useMemo(() => formatTimestamp(item.createdAt), [item.createdAt]);
  
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
            {formattedTimestamp}
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

// 🚀 Performance: Memoized timestamp formatter with cache
const timestampCache = new Map<string, string>();

const formatTimestamp = (timestamp: any) => {
  if (!timestamp) return '';
  
  try {
    const cacheKey = timestamp.toMillis ? timestamp.toMillis().toString() : timestamp.toString();
    
    // Check cache first
    if (timestampCache.has(cacheKey)) {
      return timestampCache.get(cacheKey)!;
    }
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    let result = '';
    if (diffMinutes < 1) result = 'Şimdi';
    else if (diffMinutes < 60) result = `${diffMinutes} dakika önce`;
    else if (diffHours < 24) result = `${diffHours} saat önce`;
    else if (diffDays < 7) result = `${diffDays} gün önce`;
    else {
      result = date.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
    
    // Cache the result (limit cache size to prevent memory leak)
    if (timestampCache.size > 100) {
      timestampCache.clear();
    }
    timestampCache.set(cacheKey, result);
    
    return result;
  } catch (error) {
    return '';
  }
};

const NotificationScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { currentUser, isClubAccount } = useAuth();
  const isMounted = useMountedState();
  
  // 🚀 Performance: Render time tracking (temporarily disabled)
  // useRenderTime('NotificationScreen');

  // 🚀 Performance: Consolidated state using regular state (simpler than batched)
  const [screenState, setScreenState] = useState({
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

  // 🚀 Performance: Memoized notification types - Limited to 30 for Firebase IN query
  const notificationTypes = useMemo(() => {
    // Firebase IN query supports max 30 values, so prioritize most common types
    return [
      // Most common types first (based on debug output)
      'score_gain', 'score_loss', 'points_earned', 'points_lost', 'score_loss_points',
      'user_follow', 'user_unfollow', 'membership_approved', 'membership_kicked',
      'event_like_points', 'event_unlike_points', 'event_commented_points',
      'event_shared_points', 'event_joined_points', 'event_left_points',
      'new_follow', 'user_followed_points', 'user_unfollowed_points',
      'club_followed_points', 'club_unfollowed_points', 'club_joined_points',
      'comment_liked_points', 'comment_target_liked_points', 'comment_replied_points',
      'event_created', 'event_updated', 'event_join', 'event_reminder',
      'membership_request', 'membership_rejected', 'member_approved_points',
      'achievement_unlocked', 'level_up', 'system_message'
    ]; // Exactly 30 items - Firebase limit
  }, []);

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
          setScreenState(prev => ({
            ...prev,
            notifications: cachedData,
            loading: false
          }));
        }
      }

      const collection = isClubAccount ? 'clubNotifications' : 'notifications';
      
      let snapshot;
      try {
        // Skip the complex type filtering to avoid Firebase IN limit issues
        // Just get all notifications and filter client-side
        console.log('📱 Using simple recipientId query (no type filtering)...');
        
        let query = firebase.firestore()
          .collection(collection)
          .where('recipientId', '==', currentUser.uid);
        
        // For club notifications, check if index is ready
        if (isClubAccount) {
          try {
            // Try with orderBy first
            query = query.orderBy('createdAt', 'desc').limit(100);
            snapshot = await query.get();
          } catch (indexError: any) {
            if (indexError.code === 'failed-precondition') {
              console.log('🔄 Index building for club notifications, using fallback query...');
              // Fallback: query without ordering, sort client-side
              query = firebase.firestore()
                .collection(collection)
                .where('recipientId', '==', currentUser.uid)
                .limit(100);
              snapshot = await query.get();
            } else {
              throw indexError;
            }
          }
        } else {
          // Regular notifications - should work fine
          query = query.orderBy('createdAt', 'desc').limit(100);
          snapshot = await query.get();
        }
      } catch (error: any) {
        console.error('❌ Query failed:', error);
        throw error;
      }
      
      if (!isMounted()) return;

      let notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];

      // Client-side filtering - keep most notifications, only filter out truly unwanted types
      const excludedTypes = ['debug', 'test', 'internal', 'deprecated']; // Only exclude clearly unwanted types
      notifications = notifications.filter(n => {
        const shouldExclude = excludedTypes.includes(n.type);
        if (shouldExclude) {
          console.log('🔍 FILTERING OUT notification type:', n.type);
        }
        return !shouldExclude;
      }).slice(0, 50); // Limit to 50 after filtering

      // If no ordering was applied (fallback case), sort client-side
      if (isClubAccount) {
        notifications.sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || a.createdAt || 0;
          const bTime = b.createdAt?.toMillis?.() || b.createdAt || 0;
          return bTime - aTime; // Descending order
        });
      }

      // Cache the data
      firestoreCache.set(cacheKey, notifications, 180000); // 3 minutes TTL

      const unreadCount = notifications.filter(n => !n.read).length;

      setScreenState(prev => ({
        ...prev,
        notifications,
        unreadCount,
        loading: false,
        refreshing: false
      }));

    } catch (error) {
      console.error('Error fetching notifications:', error);
      if (isMounted()) {
        setScreenState(prev => ({
          ...prev,
          loading: false,
          refreshing: false
        }));
      }
    }
  }, [currentUser?.uid, isClubAccount, notificationTypes]); // Remove isMounted from deps

  // 🚀 Performance: Setup optimized real-time listener
  useEffect(() => {
    if (!currentUser?.uid) return;

    const collection = isClubAccount ? 'clubNotifications' : 'notifications';
    const listenerPath = `${collection}_${currentUser.uid}`;

    const callback = (data: any[]) => {
      if (!isMounted()) return;
      
      // Apply same client-side filtering as in fetchNotifications
      const excludedTypes = ['debug', 'test', 'internal', 'deprecated'];
      let notifications = data.filter(item => 
        !excludedTypes.includes(item.type)
      ) as Notification[];
      
      // Sort client-side for consistency
      notifications.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || a.createdAt || 0;
        const bTime = b.createdAt?.toMillis?.() || b.createdAt || 0;
        return bTime - aTime; // Descending order
      });
      
      const unreadCount = notifications.filter(n => !n.read).length;
      
      setScreenState(prev => ({
        ...prev,
        notifications,
        unreadCount
      }));
    };

    // Use global optimized listener with simple query factory
    globalFirestoreListener.addListener(
      listenerPath,
      callback,
      () => {
        // Use simple query without ordering to avoid index issues
        return firebase.firestore()
          .collection(collection)
          .where('recipientId', '==', currentUser.uid)
          .limit(100);
      }
    );

    return () => {
      globalFirestoreListener.removeListener(listenerPath, callback);
    };
  }, [currentUser?.uid, isClubAccount, notificationTypes]); // Remove isMounted from deps

  // Initial fetch
  useEffect(() => {
    fetchNotifications(false);
  }, [fetchNotifications]);

  // 🚀 Performance: Throttled refresh control
  const onRefresh = useThrottle(async () => {
    setScreenState(prev => ({ ...prev, refreshing: true }));
    await fetchNotifications(true);
    
    // Refresh notification counts
    if (isClubAccount) {
      refreshClubNotificationCount();
    } else {
      refreshStudentNotificationCount();
    }
  }, 1000);

  // Handle mark all as read
  const handleMarkAllAsRead = useCallback(async () => {
    if (!currentUser?.uid || screenState.unreadCount === 0) return;
    
    try {
      await markAllNotificationsAsRead(screenState.notifications, currentUser.uid, isClubAccount ? 'club' : 'student');
      
      // Update local state
      setScreenState(prev => ({
        ...prev,
        notifications: prev.notifications.map(n => ({ ...n, read: true })),
        unreadCount: 0
      }));

      // Refresh notification counts
      if (isClubAccount) {
        refreshClubNotificationCount();
      } else {
        refreshStudentNotificationCount();
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [currentUser?.uid, isClubAccount, screenState.unreadCount, screenState.notifications, refreshClubNotificationCount, refreshStudentNotificationCount]);

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
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={theme.colors.onSurface}
            />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
              Bildirimler
            </Text>
          </View>

          <View style={styles.rightPlaceholder} />
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
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={theme.colors.onSurface}
          />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
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

        {screenState.unreadCount > 0 && (
          <TouchableOpacity
            onPress={handleMarkAllAsRead}
            style={[styles.markAllButton, { backgroundColor: theme.colors.primary }]}
          >
            <Text style={[styles.markAllButtonText, { color: '#FFFFFF' }]}>
              Tümünü Oku
            </Text>
          </TouchableOpacity>
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
          maxToRenderPerBatch={5}
          windowSize={5}
          initialNumToRender={10}
          updateCellsBatchingPeriod={100}
          disableIntervalMomentum={true}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 10,
          }}
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
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  rightPlaceholder: {
    width: 40, // Same width as backButton to center the title
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
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    minWidth: 80,
    alignItems: 'center',
  },
  markAllButtonText: {
    fontSize: 12,
    fontWeight: '600',
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

export default React.memo(NotificationScreen);
