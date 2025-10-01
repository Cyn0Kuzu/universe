/**
 * 🚀 Op) from 'react-native';
import { Text, useTheme, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/            }));
             }));
             }));
          
          // 🔍 RAW Firebase data logging - CRITICAL for debugging
          const rawUnreadCount = clubNotifications.filter((n: any) => !n.read).length;
          console.log(`📊 Found ${clubNotifications.length} club notifications in notifications collection (filtered from ${notificationsSnapshot.docs.length} total)`);
          console.log(`📊 RAW Firebase data: ${rawUnreadCount} unread, ${clubNotifications.length - rawUnreadCount} read`);
          
          if (rawUnreadCount > 0) {
            console.log('🔥 FOUND UNREAD IN RAW FIREBASE:', clubNotifications.filter((n: any) => !n.read).slice(0, 5).map((n: any) => ({
              id: n.id.substring(0, 8) + '...',
              read: n.read,
              type: n.type,
              title: n.title?.substring(0, 40) + '...',
              createdAt: n.createdAt?.toDate?.()?.toLocaleString() || 'no date'
            })));
          } else {
            console.log('❗ NO UNREAD FOUND: All notifications in RAW Firebase data have read: true');
          }
          
          allNotifications.push(...clubNotifications);     
          // 🔍 RAW Firebase data logging - CRITICAL for debugging
          const rawUnreadCount = clubNotifications.filter((n: any) => !n.read).length;
          console.log(`📊 Found ${clubNotifications.length} club notifications in notifications collection (filtered from ${notificationsSnapshot.docs.length} total)`);
          console.log(`📊 RAW Firebase data: ${rawUnreadCount} unread, ${clubNotifications.length - rawUnreadCount} read`);
          
          if (rawUnreadCount > 0) {
            console.log('🔥 FOUND UNREAD IN RAW FIREBASE:', clubNotifications.filter((n: any) => !n.read).slice(0, 5).map((n: any) => ({
              id: n.id.substring(0, 8) + '...',
              read: n.read,
              type: n.type,
              title: n.title?.substring(0, 40) + '...',
              createdAt: n.createdAt?.toDate?.()?.toLocaleString() || 'no date'
            })));
          } else {
            console.log('❗ NO UNREAD FOUND: All notifications in RAW Firebase data have read: true');
          }
          
          allNotifications.push(...clubNotifications);     
          // 🔍 RAW Firebase data logging - CRITICAL for debugging
          const rawUnreadCount = clubNotifications.filter((n: any) => !n.read).length;
          console.log(`📊 Found ${clubNotifications.length} club notifications in notifications collection (filtered from ${notificationsSnapshot.docs.length} total)`);
          console.log(`📊 RAW Firebase data: ${rawUnreadCount} unread, ${clubNotifications.length - rawUnreadCount} read`);
          
          if (rawUnreadCount > 0) {
            console.log('📋 RAW unread notifications from Firebase:', clubNotifications.filter((n: any) => !n.read).slice(0, 3).map((n: any) => ({
              id: n.id.substring(0, 8) + '...',
              read: n.read,
              type: n.type,
              title: n.title?.substring(0, 30) + '...',
              createdAt: n.createdAt?.toDate?.()?.toLocaleString() || 'no date'
            })));
          } else {
            console.log('❗ No unread notifications found in RAW Firebase data - all notifications have read: true');
          }
          
          allNotifications.push(...clubNotifications);ve';
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
  // useRenderTime 
} from '../../hooks';imized Notification Screen - Performance Enhanced
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

  // Clean invalid AsyncStorage data
  const cleanInvalidAsyncStorageData = useCallback(async (userId: string, isClub: boolean) => {
    try {
      const readNotificationsKey = isClub 
        ? `readNotifications_club_${userId}`
        : `readNotifications_${userId}`;
      
      const existingData = await AsyncStorage.getItem(readNotificationsKey);
      if (existingData) {
        try {
          const readIds: string[] = JSON.parse(existingData);
          let cleanedIds: string[] = [];
          
          // Only keep IDs that look like valid Firebase document IDs
          for (const id of readIds) {
            if (id && typeof id === 'string' && id.length >= 15 && id.length <= 30) {
              cleanedIds.push(id);
            }
          }
          
          // If we filtered out invalid IDs, update storage
          if (cleanedIds.length !== readIds.length) {
            await AsyncStorage.setItem(readNotificationsKey, JSON.stringify(cleanedIds));
            console.log(`🧹 Cleaned ${readIds.length - cleanedIds.length} invalid notification IDs from AsyncStorage`);
          }
          
          // If too many invalid IDs (more than half), clear everything for fresh start
          if (cleanedIds.length < readIds.length / 2) {
            await AsyncStorage.removeItem(readNotificationsKey);
            console.log('🧹 Cleared AsyncStorage due to too many invalid IDs');
          }
          
        } catch (parseError) {
          // If data is corrupted, clear it
          await AsyncStorage.removeItem(readNotificationsKey);
          console.log('🧹 Cleared corrupted AsyncStorage notification data');
        }
      }
    } catch (error) {
      console.warn('AsyncStorage cleanup warning:', error);
    }
  }, []);

  // 🚀 Performance: Throttled notification handler
  const handleNotificationPress = useThrottle(async (notification: Notification) => {
    if (!isMounted() || !currentUser?.uid) return;

    try {
      // Mark as read
      if (!notification.read) {
        await markNotificationAsRead(
          notification.id, 
          currentUser.uid, 
          isClubAccount ? 'club' : 'student',
          (notification as any)._collection
        );
        
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
      // Clean invalid AsyncStorage data before fetching
      await cleanInvalidAsyncStorageData(currentUser.uid, isClubAccount);
      
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

      let allNotifications: Notification[] = [];
      
      // For club accounts, check BOTH collections with proper filtering
      if (isClubAccount) {
        console.log('🏛️ Club account - checking both collections with recipientType filtering...');
        
        // 1. First check notifications collection with recipientType = 'club'
        try {
          console.log(`📱 Checking notifications collection for club notifications...`);
          
          const notificationsQuery = firebase.firestore()
            .collection('notifications')
            .where('recipientId', '==', currentUser.uid)
            .where('recipientType', '==', 'club') // Add recipientType filter
            .limit(200); // Increase limit
          
          const notificationsSnapshot = await notificationsQuery.get();
          
          const clubNotifications = notificationsSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data(), _collection: 'notifications' })) as unknown as Notification[];
          
          console.log(`� NOTIFICATIONS (New System): ${clubNotifications.length} notifications loaded`);
          allNotifications.push(...clubNotifications);

          // Also load legacy notifications without recipientType
          console.log('📱 Loading legacy notifications without recipientType...');
          const legacyQuery = firebase.firestore()
            .collection('notifications')
            .where('recipientId', '==', currentUser.uid)
            .limit(150);
          
          const legacySnapshot = await legacyQuery.get();
          const legacyNotifications = legacySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter((data: any) => {
              // Only include notifications without recipientType (legacy)
              return !data.recipientType;
            })
            .filter((data: any) => {
              // Don't duplicate notifications we already have
              return !allNotifications.some(n => n.id === data.id);
            })
            .map((data: any) => ({
              ...data,
              _collection: 'notifications-legacy'
            })) as unknown as Notification[];

          console.log(`📊 LEGACY NOTIFICATIONS: ${legacyNotifications.length} legacy notifications loaded`);
          allNotifications.push(...legacyNotifications);
          
        } catch (error: any) {
          console.error(`❌ Error querying notifications collection:`, error);
        }
        
        // 2. Then check clubNotifications collection (no recipientType filter needed here)
        try {
          console.log(`📱 Checking clubNotifications collection...`);
          
          const clubNotificationsQuery = firebase.firestore()
            .collection('clubNotifications')
            .where('recipientId', '==', currentUser.uid)
            .limit(50);
          
          const clubNotificationsSnapshot = await clubNotificationsQuery.get();
          const clubNotificationsData = clubNotificationsSnapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data(),
            _collection: 'clubNotifications'
          })) as Notification[];
          
          // 🔍 RAW Firebase data logging for clubNotifications collection
          const rawUnreadCountClub = clubNotificationsData.filter((n: any) => !n.read).length;
          console.log(`📊 Found ${clubNotificationsData.length} notifications in clubNotifications collection`);
          console.log(`📊 RAW clubNotifications data: ${rawUnreadCountClub} unread, ${clubNotificationsData.length - rawUnreadCountClub} read`);
          
          if (rawUnreadCountClub > 0) {
            console.log('🔥 FOUND UNREAD IN CLUBNOTIFICATIONS:', clubNotificationsData.filter((n: any) => !n.read).slice(0, 3).map((n: any) => ({
              id: n.id.substring(0, 8) + '...',
              read: n.read,
              type: n.type,
              title: n.title?.substring(0, 40) + '...',
              createdAt: n.createdAt?.toDate?.()?.toLocaleString() || 'no date'
            })));
          }
          
          allNotifications.push(...clubNotificationsData);
          
        } catch (error: any) {
          console.error(`❌ Error querying clubNotifications collection:`, error);
        }
        
      } else {
        // For regular users, use notifications collection with recipientType = 'student'
        const collection = 'notifications';
        console.log(`👨‍🎓 Student account - using ${collection} with recipientType filter...`);
        
        const query = firebase.firestore()
          .collection(collection)
          .where('recipientId', '==', currentUser.uid)
          .where('recipientType', '==', 'student') // Add recipientType filter for students
          .limit(100);
        
        const snapshot = await query.get();
        allNotifications = snapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data(),
          _collection: collection // Hangi koleksiyondan geldiğini takip et
        })) as Notification[];
        
        console.log(`📊 Found ${allNotifications.length} student notifications in ${collection}`);
      }
      
      if (!isMounted()) return;

      console.log(`📊 Total raw notifications retrieved: ${allNotifications.length}`);
      
      // Remove duplicates (same ID from different collections)
      let notifications = allNotifications.reduce((unique: Notification[], notification) => {
        if (!unique.find(n => n.id === notification.id)) {
          unique.push(notification);
        }
        return unique;
      }, []);
      
      console.log(`📊 After deduplication: ${notifications.length} unique notifications`);
      
      // Log first few notification details for debugging (especially for clubs)
      if (notifications.length > 0) {
        // Unread notifications'ları özellikle logla
        const unreadNotifications = notifications.filter((n: any) => !n.read);
        console.log(`📋 Found ${unreadNotifications.length} unread notifications out of ${notifications.length} total`);
        
        if (unreadNotifications.length > 0) {
          console.log('📋 Unread notifications sample:', unreadNotifications.slice(0, 5).map((n: any) => {
            const data = n as any;
            return {
              id: n.id.substring(0, 8) + '...',
              type: n.type,
              read: n.read,
              title: n.title?.substring(0, 30) + '...',
              recipientId: data.recipientId?.substring(0, 8) + '...',
              createdAt: data.createdAt?.toDate?.()?.toLocaleString() || 'no date',
              collection: data._collection
            };
          }));
        }
        
        console.log('📋 All notifications sample (first 3):', notifications.slice(0, 3).map((n: any) => {
          const data = n as any;
          return {
            id: n.id.substring(0, 8) + '...',
            type: n.type,
            read: n.read,
            title: n.title?.substring(0, 30) + '...',
            recipientId: data.recipientId?.substring(0, 8) + '...',
            targetId: data.targetId?.substring(0, 8) + '...',
            createdAt: data.createdAt ? 'has timestamp' : 'no timestamp',
            collection: data._collection
          };
        }));
        
        // For clubs, also log the current user ID to compare
        if (isClubAccount) {
          console.log(`📋 Current club ID: ${currentUser.uid.substring(0, 8)}...`);
        }
      } else {
        console.log('📋 No notifications found - might be field name mismatch');
        if (isClubAccount) {
          console.log('📋 For club account, we checked both notifications and clubNotifications collections');
        }
      }

      // Very minimal filtering - only exclude system/internal notifications
      const originalLength = notifications.length;
      notifications = notifications.filter((n: any) => {
        // Only exclude system internal notifications, keep everything else
        return n.type !== 'system_internal' && n.type !== '__system__';
      }).slice(0, 100); // Increased limit
      
      console.log(`📊 After filtering: ${notifications.length}/${originalLength} notifications kept`);

      // Sort client-side by timestamp for consistency
      notifications.sort((a: any, b: any) => {
        const aTime = a.createdAt?.toMillis?.() || a.createdAt || 0;
        const bTime = b.createdAt?.toMillis?.() || b.createdAt || 0;
        return bTime - aTime; // Descending order
      });

      // Cache the data
      firestoreCache.set(cacheKey, notifications, 180000); // 3 minutes TTL

      // Check AsyncStorage status for debugging and merge read status
      const readNotificationsKey = isClubAccount 
        ? `readNotifications_club_${currentUser.uid}`
        : `readNotifications_${currentUser.uid}`;
      
      try {
        const asyncData = await AsyncStorage.getItem(readNotificationsKey);
        const readIds = asyncData ? JSON.parse(asyncData) : [];
        console.log(`📱 AsyncStorage has ${readIds.length} read notification IDs`);
        
        // Merge AsyncStorage read status with Firebase data
        notifications = notifications.map((n: any) => {
          const isReadInStorage = readIds.includes(n.id);
          // Use AsyncStorage as the authoritative source for read status if it's read there
          const finalReadStatus = isReadInStorage || n.read;
          
          if (isReadInStorage && !n.read) {
            console.log(`📱 Setting notification ${n.id.substring(0, 8)}... as read from AsyncStorage`);
          }
          
          return {
            ...n,
            read: finalReadStatus
          };
        });
        
      } catch (error) {
        console.warn('📱 AsyncStorage read error:', error);
      }

      // Calculate final unread count after merge
      const unreadCount = notifications.filter((n: any) => !n.read).length;
      console.log(`📊 Final unread count after AsyncStorage merge: ${unreadCount}/${notifications.length}`);
      
      // Log unread notifications for debugging
      if (unreadCount > 0) {
        const unreadNotifications = notifications.filter((n: any) => !n.read);
        console.log('📋 Final unread notifications:', unreadNotifications.slice(0, 3).map((n: any) => ({
          id: n.id.substring(0, 8) + '...',
          type: n.type,
          title: n.title?.substring(0, 30) + '...',
          collection: n._collection
        })));
      }

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
      
      // Apply same minimal filtering as in fetchNotifications
      let notifications = data.filter(item => 
        item.type !== 'system_internal' && item.type !== '__system__'
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
        // For club accounts, we need to determine the correct field to use
        if (isClubAccount) {
          // For now, try recipientId first (we'll detect the right field dynamically)
          // This will be improved as we learn which field works
          return firebase.firestore()
            .collection(collection)
            .where('recipientId', '==', currentUser.uid)
            .limit(100);
        } else {
          return firebase.firestore()
            .collection(collection)
            .where('recipientId', '==', currentUser.uid)
            .limit(100);
        }
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

  // One-time cleanup on mount
  useEffect(() => {
    const cleanupInvalidData = async () => {
      if (!currentUser?.uid) return;
      
      try {
        console.log('🧹 Starting aggressive cleanup...');
        
        // Clean invalid AsyncStorage entries
        const readNotificationsKey = isClubAccount 
          ? `readNotifications_club_${currentUser.uid}`
          : `readNotifications_${currentUser.uid}`;
        
        // For now, just clear all AsyncStorage data to start fresh
        await AsyncStorage.removeItem(readNotificationsKey);
        console.log('🧹 Cleared all AsyncStorage notification data for fresh start');
        
        // Also clear any other related notification cache
        const cacheKey = `notifications_${currentUser.uid}_${isClubAccount ? 'club' : 'student'}`;
        firestoreCache.set(cacheKey, null, 0); // Clear cache by setting to null with 0 TTL
        console.log('🧹 Cleared notification cache');
        
      } catch (error) {
        console.warn('Cleanup warning:', error);
      }
    };
    
    cleanupInvalidData();
  }, [currentUser?.uid, isClubAccount]); // Only run once per user/account type

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

        <View style={styles.headerActions}>
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
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
