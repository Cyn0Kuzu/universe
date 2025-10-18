/**
 * Fixed Notification Screen
 * Bildirim ekranındaki sorunları düzelten güncellenmiş versiyon
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  Text,
  useTheme,
  Card,
  Avatar,
  Badge,
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { firebase } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { StudentStackParamList } from '../../navigation/StudentNavigator';
import { UniversalAvatar } from '../../components/common';
import { performanceOptimizer } from '../../utils/performanceOptimizer';

interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  userId?: string;
  recipientId?: string;
  eventId?: string;
  clubId?: string;
  timestamp: any;
  read: boolean;
  data?: any;
  senderInfo?: {
    id: string;
    name: string;
    profileImage?: string;
    avatarIcon?: string;
    avatarColor?: string;
  };
}

const FixedNotificationScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<StudentStackParamList>>();
  const { currentUser, isClubAccount } = useAuth();
  
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Bildirim türlerini tanımla
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

  // Bildirimleri yükle
  const fetchNotifications = useCallback(async (isRefresh = false) => {
    if (!currentUser?.uid) return;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      console.log('📱 Fetching notifications for user:', currentUser.uid, 'isClub:', isClubAccount);

      // Firebase'den bildirimleri al - Index sorununu önlemek için basitleştirilmiş query
      const collection = isClubAccount ? 'clubNotifications' : 'notifications';
      let query = firebase.firestore()
        .collection(collection)
        .where('recipientId', '==', currentUser.uid);

      // Index sorununu önlemek için orderBy'i kaldır ve client-side sorting yap
      const snapshot = await query
        .limit(100)
        .get();

      const fetchedNotifications: AppNotification[] = [];
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        fetchedNotifications.push({
          id: doc.id,
          type: data.type || 'unknown',
          title: data.title || 'Bildirim',
          message: data.message || data.body || 'Yeni bildirim',
          userId: data.userId,
          recipientId: data.recipientId,
          eventId: data.eventId,
          clubId: data.clubId,
          timestamp: data.timestamp || data.createdAt,
          read: data.read || false,
          data: data.data,
          senderInfo: data.senderInfo
        });
      });

      // Client-side filtering ve sorting
      let filteredNotifications = fetchedNotifications;
      
      // Bildirim türlerini filtrele (eğer çok fazla değilse)
      if (notificationTypes.length <= 30) {
        filteredNotifications = fetchedNotifications.filter(n => 
          notificationTypes.includes(n.type)
        );
      }

      // Timestamp'e göre sırala (en yeni önce)
      filteredNotifications.sort((a, b) => {
        const aTime = a.timestamp?.toMillis?.() || a.timestamp?.seconds * 1000 || 0;
        const bTime = b.timestamp?.toMillis?.() || b.timestamp?.seconds * 1000 || 0;
        return bTime - aTime;
      });

      // Okunmamış bildirim sayısını hesapla
      const unread = filteredNotifications.filter(n => !n.read).length;

      setNotifications(filteredNotifications);
      setUnreadCount(unread);
      
      console.log(`📱 Loaded ${filteredNotifications.length} notifications, ${unread} unread`);

    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
      Alert.alert('Hata', 'Bildirimler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser?.uid, isClubAccount, notificationTypes]);

  // Bildirimi okundu olarak işaretle
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const collection = isClubAccount ? 'clubNotifications' : 'notifications';
      await firebase.firestore()
        .collection(collection)
        .doc(notificationId)
        .update({ read: true });

      // Local state'i güncelle
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [isClubAccount]);

  // Bildirime tıklama
  const handleNotificationPress = useCallback(async (notification: AppNotification) => {
    try {
      // Okundu olarak işaretle
      if (!notification.read) {
        await markAsRead(notification.id);
      }

      // Bildirim türüne göre navigasyon
      switch (notification.type) {
        case 'event_join':
        case 'event_joined_points':
        case 'event_created':
        case 'event_updated':
          if (notification.eventId) {
            navigation.navigate('ViewEvent', { eventId: notification.eventId });
          }
          break;
        
        case 'user_follow':
        case 'user_followed_points':
        case 'user_unfollowed_points':
          if (notification.userId) {
            navigation.navigate('ViewProfile', { userId: notification.userId });
          }
          break;
        
        case 'club_followed_points':
        case 'club_unfollowed_points':
        case 'membership_approved':
        case 'membership_rejected':
          if (notification.clubId) {
            navigation.navigate('ViewClub', { clubId: notification.clubId });
          }
          break;
        
        default:
          // Genel bildirimler için herhangi bir navigasyon yapma
          console.log('No specific navigation for notification type:', notification.type);
      }
    } catch (error) {
      console.error('Error handling notification press:', error);
    }
  }, [markAsRead, navigation]);

  // Bildirim ikonu al
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'event_join':
      case 'event_joined_points':
      case 'event_created':
      case 'event_updated':
        return 'calendar-check';
      case 'user_follow':
      case 'user_followed_points':
      case 'user_unfollowed_points':
        return 'account-plus';
      case 'club_followed_points':
      case 'club_unfollowed_points':
        return 'account-group';
      case 'membership_approved':
      case 'membership_rejected':
        return 'account-check';
      case 'event_like_points':
      case 'event_unlike_points':
        return 'heart';
      case 'event_commented_points':
        return 'comment';
      case 'event_shared_points':
        return 'share';
      case 'achievement_unlocked':
      case 'level_up':
        return 'trophy';
      case 'system_message':
        return 'information';
      default:
        return 'bell';
    }
  };

  // Bildirim rengi al
  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'event_join':
      case 'event_joined_points':
        return '#4CAF50';
      case 'user_follow':
      case 'user_followed_points':
        return '#2196F3';
      case 'club_followed_points':
        return '#FF9800';
      case 'membership_approved':
        return '#4CAF50';
      case 'membership_rejected':
        return '#F44336';
      case 'event_like_points':
        return '#E91E63';
      case 'event_commented_points':
        return '#9C27B0';
      case 'achievement_unlocked':
      case 'level_up':
        return '#FFD700';
      case 'system_message':
        return '#607D8B';
      default:
        return theme.colors.primary;
    }
  };

  // Tarih formatla
  const formatTimestamp = (timestamp: any) => {
    try {
      let date: Date;
      
      if (timestamp?.toDate) {
        date = timestamp.toDate();
      } else if (timestamp?.seconds) {
        date = new Date(timestamp.seconds * 1000);
      } else if (timestamp instanceof Date) {
        date = timestamp;
      } else {
        date = new Date(timestamp);
      }

      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 1) return 'Şimdi';
      if (minutes < 60) return `${minutes} dakika önce`;
      if (hours < 24) return `${hours} saat önce`;
      if (days < 7) return `${days} gün önce`;
      
      return date.toLocaleDateString('tr-TR');
    } catch (error) {
      return '';
    }
  };

  // Bildirim öğesi render et
  const renderNotificationItem = ({ item }: { item: AppNotification }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        { backgroundColor: item.read ? theme.colors.surface : theme.colors.background }
      ]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <View style={[
            styles.notificationIconContainer,
            { backgroundColor: getNotificationColor(item.type) + '20' }
          ]}>
            <MaterialCommunityIcons
              name={getNotificationIcon(item.type) as any}
              size={20}
              color={getNotificationColor(item.type)}
            />
          </View>
          
          <View style={styles.notificationTextContainer}>
            <Text style={[styles.notificationTitle, { color: theme.colors.onSurface }]}>
              {item.title}
            </Text>
            <Text style={[styles.notificationMessage, { color: theme.colors.onSurface }]}>
              {item.message}
            </Text>
            <Text style={[styles.notificationTime, { color: theme.colors.disabled }]}>
              {formatTimestamp(item.timestamp)}
            </Text>
          </View>
          
          {!item.read && (
            <Badge size={8} style={styles.unreadBadge} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  // Boş durum render et
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons
        name="bell-off"
        size={64}
        color={theme.colors.disabled}
      />
      <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>
        Henüz bildirim yok
      </Text>
      <Text style={[styles.emptyMessage, { color: theme.colors.onSurface }]}>
        Yeni etkinlikler ve güncellemeler burada görünecek
      </Text>
    </View>
  );

  // Sayfa odaklandığında bildirimleri yükle
  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications])
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
          Bildirimler
        </Text>
        {unreadCount > 0 && (
          <Badge size={20} style={styles.headerBadge}>
            {unreadCount}
          </Badge>
        )}
      </View>

      {/* Notifications List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.onSurface }]}>
            Bildirimler yükleniyor...
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchNotifications(true)}
              colors={[theme.colors.primary]}
            />
          }
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerBadge: {
    backgroundColor: '#FF4444',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  listContainer: {
    paddingVertical: 8,
  },
  notificationItem: {
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  notificationContent: {
    padding: 16,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationTextContainer: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
  },
  unreadBadge: {
    backgroundColor: '#FF4444',
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default FixedNotificationScreen;
