/**
 * Professional Notification Screen
 * Single, optimized notification screen implementation
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type firebaseCompat from 'firebase/compat/app';

import { useAuth } from '../../contexts/AuthContext';
import { getFirebaseCompatSync } from '../../firebase/compat';
import type { NotificationBase as AppNotification } from '../../types';
import { markNotificationAsRead, markAllNotificationsAsRead } from '../../utils/notificationHelper';
import { useResponsiveDesign } from '../../utils/responsiveDesignUtils';

const firebase = getFirebaseCompatSync();

interface NotificationItemProps {
  item: AppNotification;
  index: number;
  onPress: (notification: AppNotification) => void;
  theme: any;
  fontSizes: any;
  spacing: any;
}

// Optimized NotificationItem component
const NotificationItem = React.memo<NotificationItemProps>(({ 
  item, 
  index, 
  onPress, 
  theme,
  fontSizes,
  spacing
}) => {
  const formattedTimestamp = useMemo(() => formatTimestamp(item.createdAt), [item.createdAt]);
  
  return (
    <TouchableOpacity
      onPress={() => onPress(item)}
      style={[
        styles.notificationItem,
        { 
          backgroundColor: item.read ? theme.colors.surface : theme.colors.background,
          padding: spacing.md,
          marginBottom: spacing.sm,
        },
      ]}
      activeOpacity={0.7}
    >
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <MaterialCommunityIcons
            name={getNotificationIcon(item.type) as any}
            size={24}
            color={theme.colors.primary}
            style={styles.notificationIcon}
          />
          <View style={styles.notificationTextContainer}>
            <Text
              style={[
                styles.notificationTitle,
                { 
                  color: theme.colors.onSurface,
                  fontSize: fontSizes.body,
                  fontWeight: item.read ? 'normal' : 'bold',
                },
              ]}
              numberOfLines={2}
            >
              {item.title || 'Bildirim'}
            </Text>
            <Text
              style={[
                styles.notificationMessage,
                { 
                  color: theme.colors.onSurfaceVariant,
                  fontSize: fontSizes.caption,
                },
              ]}
              numberOfLines={3}
            >
              {item.message || 'Yeni bildirim'}
            </Text>
          </View>
          {!item.read && (
            <View style={[styles.unreadIndicator, { backgroundColor: theme.colors.primary }]} />
          )}
        </View>
        
        <View style={styles.notificationFooter}>
          <Text
            style={[
              styles.timestamp,
              { 
                color: theme.colors.onSurfaceVariant,
                fontSize: fontSizes.caption,
              },
            ]}
          >
            {formattedTimestamp}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

// Format timestamp helper
const formatTimestamp = (timestamp: any): string => {
  try {
    if (!timestamp) return '';
    
    const now = new Date();
    const notificationTime = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - notificationTime.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Az önce';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} dakika önce`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} saat önce`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} gün önce`;
    }
  } catch (error) {
    return '';
  }
};

// Get notification icon based on type
const getNotificationIcon = (type: string): string => {
  const iconMap: { [key: string]: string } = {
    'event_created': 'calendar-plus',
    'event_updated': 'calendar-edit',
    'event_join': 'calendar-check',
    'event_reminder': 'bell-ring',
    'membership_approved': 'account-check',
    'membership_rejected': 'account-cancel',
    'new_follow': 'account-plus',
    'user_follow': 'account-plus',
    'user_unfollow': 'account-minus',
    'club_follow': 'account-group-plus',
    'club_unfollow': 'account-group-minus',
    'achievement_unlocked': 'trophy',
    'level_up': 'trending-up',
    'points_earned': 'plus-circle',
    'points_lost': 'minus-circle',
    'score_gain': 'arrow-up-bold',
    'score_loss': 'arrow-down-bold',
    'system_message': 'information',
    'default': 'bell',
  };
  
  return iconMap[type] || iconMap.default;
};

const NotificationScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { currentUser, isClubAccount } = useAuth();
  const { fontSizes, spacing, shadows } = useResponsiveDesign();
  
  // Consolidated state management
  const [screenState, setScreenState] = useState({
    notifications: [] as AppNotification[],
    loading: true,
    refreshing: false,
    unreadCount: 0,
    hasMore: true,
    loadingMore: false,
  });

  // Memoized notification types for Firebase query optimization
  const notificationTypes = useMemo(() => {
    const commonTypes = [
      'event_created', 'event_updated', 'event_join', 'event_reminder',
      'membership_approved', 'membership_rejected', 'new_follow',
      'user_follow', 'user_unfollow', 'club_follow', 'club_unfollow',
      'achievement_unlocked', 'level_up', 'points_earned', 'points_lost',
      'score_gain', 'score_loss', 'system_message'
    ];
    
    return isClubAccount 
      ? commonTypes.filter(type => 
          ['event_created', 'event_updated', 'membership_approved', 'membership_rejected', 'club_follow', 'club_unfollow'].includes(type)
        )
      : commonTypes;
  }, [isClubAccount]);

  // Optimized notification fetching
  const fetchNotifications = useCallback(async (isRefresh = false) => {
    if (!currentUser?.uid) return;

    try {
      if (isRefresh) {
        setScreenState(prev => ({ ...prev, refreshing: true }));
      } else {
        setScreenState(prev => ({ ...prev, loading: true }));
      }

      console.log('📱 Fetching notifications for user:', currentUser.uid, 'isClub:', isClubAccount);

      // Optimized Firebase query - no orderBy to avoid index issues
      const db = getFirebaseCompatSync().firestore();
      const notificationsRef = db.collection('notifications');
      const [userIdSnapshot, recipientSnapshot] = await Promise.all([
        notificationsRef.where('userId', '==', currentUser.uid).limit(50).get(),
        notificationsRef.where('recipientId', '==', currentUser.uid).limit(50).get(),
      ]);

      const combinedDocs = new Map<string, firebaseCompat.firestore.QueryDocumentSnapshot>();
      [userIdSnapshot, recipientSnapshot].forEach((snapshot) => {
        snapshot.docs.forEach((doc) => {
          if (!combinedDocs.has(doc.id)) {
            combinedDocs.set(doc.id, doc);
          }
        });
      });

      // Load AsyncStorage read state
      const readNotificationsKey = `readNotifications_${currentUser.uid}${isClubAccount ? '_club' : ''}`;
      let asyncReadIds: string[] = [];
      try {
        const stored = await AsyncStorage.getItem(readNotificationsKey);
        asyncReadIds = stored ? JSON.parse(stored) : [];
        console.log(`💾 Loaded ${asyncReadIds.length} read notification IDs from AsyncStorage`);
      } catch (asyncError) {
        console.warn('⚠️ Failed to load AsyncStorage read state:', asyncError);
      }

      const fetchedNotifications: AppNotification[] = [];
      
      combinedDocs.forEach(doc => {
        const data = doc.data();
        const recipientType = (data.recipientType || 'student') as AppNotification['recipientType'];
        
        // Check if read from Firebase OR AsyncStorage
        const isRead = data.read || asyncReadIds.includes(doc.id);
        
        fetchedNotifications.push({
          id: doc.id,
          type: data.type || 'unknown',
          title: data.title || 'Bildirim',
          message: data.message || data.body || 'Yeni bildirim',
          userId: data.userId,
          recipientId: data.recipientId || data.userId,
          recipientType,
          eventId: data.eventId,
          clubId: data.clubId,
          timestamp: data.timestamp || data.createdAt,
          read: isRead,
          data: data.data,
          createdAt: data.createdAt || new Date(),
          updatedAt: data.updatedAt || new Date(),
          _collection: 'notifications',
          // senderInfo: data.senderInfo
        });
      });

      // Client-side filtering and sorting
      let filteredNotifications = fetchedNotifications;
      
      console.log(`📊 Before filtering: ${fetchedNotifications.length} notifications`);
      console.log(`📊 Notification types to include:`, notificationTypes);
      
      // Don't filter by type - show all notifications
      // if (notificationTypes.length <= 30) {
      //   filteredNotifications = fetchedNotifications.filter(n => 
      //     notificationTypes.includes(n.type)
      //   );
      // }

      // Sort by timestamp (newest first)
      filteredNotifications.sort((a, b) => {
        const aTime = a.timestamp?.toMillis?.() || a.timestamp?.seconds * 1000 || a.createdAt?.getTime?.() || 0;
        const bTime = b.timestamp?.toMillis?.() || b.timestamp?.seconds * 1000 || b.createdAt?.getTime?.() || 0;
        return bTime - aTime;
      });

      console.log(`📊 After sorting: ${filteredNotifications.length} notifications`);

      const unread = filteredNotifications.filter(n => !n.read).length;

      setScreenState(prev => ({
        ...prev,
        notifications: filteredNotifications,
        unreadCount: unread,
        loading: false,
        refreshing: false,
      }));
      
      console.log(`📱 Loaded ${filteredNotifications.length} notifications, ${unread} unread`);
      console.log(`📊 Notification details:`, filteredNotifications.map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        read: n.read
      })));

    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
      setScreenState(prev => ({
        ...prev,
        loading: false,
        refreshing: false,
      }));
    }
  }, [currentUser?.uid, isClubAccount, notificationTypes]);

  // Optimized notification press handler
  const handleNotificationPress = useCallback(async (notification: AppNotification) => {
    try {
      console.log('📱 Notification pressed:', notification.id, 'read:', notification.read);
      
      // Mark as read if not already read
      if (!notification.read) {
        const success = await markNotificationAsRead(
          notification.id, 
          currentUser?.uid || '', 
          isClubAccount ? 'club' : 'student',
          notification._collection
        );
        
        if (success) {
          console.log('✅ Notification marked as read:', notification.id);
          setScreenState(prev => ({
            ...prev,
            notifications: prev.notifications.map(n => 
              n.id === notification.id ? { ...n, read: true } : n
            ),
            unreadCount: Math.max(0, prev.unreadCount - 1),
          }));
        }
      }

      // Handle navigation based on notification type
      if (notification.eventId) {
        (navigation as any).navigate('ViewEvent', { eventId: notification.eventId });
      } else if (notification.clubId) {
        (navigation as any).navigate('ViewClub', { clubId: notification.clubId });
      } else if (notification.userId) {
        (navigation as any).navigate('ViewProfile', { userId: notification.userId });
      }

    } catch (error) {
      console.error('❌ Error handling notification press:', error);
    }
  }, [navigation, currentUser?.uid, isClubAccount]);

  // Mark all as read handler
  const handleMarkAllAsRead = useCallback(async () => {
    try {
      const unreadNotifications = screenState.notifications.filter(n => !n.read);
      if (unreadNotifications.length === 0) return;

      await markAllNotificationsAsRead(unreadNotifications, currentUser?.uid || '', isClubAccount ? 'club' : 'student');
      
      setScreenState(prev => ({
        ...prev,
        notifications: prev.notifications.map(n => ({ ...n, read: true })),
        unreadCount: 0,
      }));

      console.log('✅ All notifications marked as read');
    } catch (error) {
      console.error('❌ Error marking all notifications as read:', error);
    }
  }, [screenState.notifications]);

  // Load notifications on mount
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Refresh handler
  const handleRefresh = useCallback(() => {
    fetchNotifications(true);
  }, [fetchNotifications]);

  // Render notification item
  const renderNotificationItem = useCallback(({ item, index }: { item: AppNotification; index: number }) => (
    <NotificationItem
      item={item}
      index={index}
      onPress={handleNotificationPress}
      theme={theme}
      fontSizes={fontSizes}
      spacing={spacing}
    />
  ), [handleNotificationPress, theme, fontSizes, spacing]);

  // Render empty state
  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons
        name="bell-off"
        size={64}
        color={theme.colors.onSurface}
        style={styles.emptyIcon}
      />
      <Text style={[styles.emptyTitle, { color: theme.colors.onSurface, fontSize: fontSizes.h4 }]}>
        Bildirim Yok
      </Text>
      <Text style={[styles.emptyMessage, { color: theme.colors.onSurface, fontSize: fontSizes.body }]}>
        Henüz bildiriminiz bulunmuyor.
      </Text>
    </View>
  ), [theme, fontSizes]);

  // Render header
  const renderHeader = useCallback(() => (
    <View style={[styles.header, { padding: spacing.lg }]}>
      <View style={styles.headerContent}>
        <Text style={[styles.headerTitle, { color: theme.colors.onSurface, fontSize: fontSizes.h3 }]}>
          Bildirimler
        </Text>
        {screenState.unreadCount > 0 && (
          <TouchableOpacity
            onPress={handleMarkAllAsRead}
            style={[styles.markAllButton, { backgroundColor: theme.colors.primary }]}
          >
            <Text style={[styles.markAllText, { color: theme.colors.primary, fontSize: fontSizes.caption }]}>
              Tümünü Okundu İşaretle
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  ), [screenState.unreadCount, handleMarkAllAsRead, theme, fontSizes, spacing]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar style="dark" />
      
      {renderHeader()}
      
      <FlatList
        data={screenState.notifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={screenState.refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        contentContainerStyle={[
          styles.listContainer,
          screenState.notifications.length === 0 && styles.emptyListContainer,
        ]}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={10}
        windowSize={10}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  markAllText: {
    fontWeight: '500',
  },
  listContainer: {
    flexGrow: 1,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  notificationItem: {
    borderRadius: 12,
    marginHorizontal: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  notificationTextContainer: {
    flex: 1,
  },
  notificationTitle: {
    marginBottom: 4,
  },
  notificationMessage: {
    lineHeight: 18,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
    marginTop: 4,
  },
  notificationFooter: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  timestamp: {
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default NotificationScreen;
