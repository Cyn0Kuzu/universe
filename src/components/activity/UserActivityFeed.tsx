import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Animated,
  StatusBar,
  Platform,
} from 'react-native';
import {
  Text,
  Card,
  useTheme,
  Avatar,
  Chip,
  Surface,
  IconButton,
  Button,
  Divider,
  Badge,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import moment from 'moment';
import 'moment/locale/tr';
import { userActivityService, UserActivity } from '../../services/enhancedUserActivityService';
import { UniversalAvatar } from '../common';
import { useAuth } from '../../contexts/AuthContext';

moment.locale('tr');

const { width, height } = Dimensions.get('window');
const CARD_MARGIN = 16;
const CARD_WIDTH = width - (CARD_MARGIN * 2);

interface UserActivityFeedProps {
  userId: string;
  limit?: number;
  showHeader?: boolean;
  instanceId?: string; // Listener çakışmasını önlemek için
  filter?: {
    category?: string[];
    type?: string[];
  };
  theme?: 'modern' | 'glassmorphism' | 'minimal';
  // Sahip görünümünde özel (private) aktiviteleri de göster
  includePrivate?: boolean;
}

// Modern aktivite tipine göre ikon, renk ve animasyon
const getActivityConfig = (type: string) => {
  const configs: Record<string, {
    icon: string;
    gradient: string[];
    bgColor: string;
    accentColor: string;
    emoji: string;
    priority: 'high' | 'medium' | 'low';
  }> = {
    // ETKİNLİK AKTİVİTELERİ
    'event_like': {
      icon: 'heart',
      gradient: ['#FF6B9D', '#FF1744'],
      bgColor: 'rgba(255, 107, 157, 0.15)',
      accentColor: '#FF1744',
      emoji: '❤️',
      priority: 'medium'
    },
    'profile_update': {
      icon: 'account-edit',
      gradient: ['#9575CD', '#5E35B1'],
      bgColor: 'rgba(149, 117, 205, 0.15)',
      accentColor: '#5E35B1',
      emoji: '🛠️',
      priority: 'medium'
    },
    'event_unlike': {
      icon: 'heart-broken',
      gradient: ['#FF5722', '#D32F2F'],
      bgColor: 'rgba(255, 87, 34, 0.15)',
      accentColor: '#D32F2F',
      emoji: '💔',
      priority: 'low'
    },
    'event_comment': {
      icon: 'comment-text',
      gradient: ['#42A5F5', '#1976D2'],
      bgColor: 'rgba(66, 165, 245, 0.15)',
      accentColor: '#1976D2',
      emoji: '💬',
      priority: 'medium'
    },
    'event_join': {
      icon: 'calendar-check',
      gradient: ['#66BB6A', '#2E7D32'],
      bgColor: 'rgba(102, 187, 106, 0.15)',
      accentColor: '#2E7D32',
      emoji: '✅',
      priority: 'high'
    },
    'event_create': {
      icon: 'calendar-plus',
      gradient: ['#AB47BC', '#6A1B9A'],
      bgColor: 'rgba(171, 71, 188, 0.15)',
      accentColor: '#6A1B9A',
      emoji: '🎉',
      priority: 'high'
    },
    'event_share': {
      icon: 'share-variant',
      gradient: ['#26C6DA', '#00ACC1'],
      bgColor: 'rgba(38, 198, 218, 0.15)',
      accentColor: '#00ACC1',
      emoji: '📣',
      priority: 'medium'
    },
    
    // SOSYAL AKTİVİTELER
    'user_follow': {
      icon: 'account-plus',
      gradient: ['#4CAF50', '#2E7D32'],
      bgColor: 'rgba(76, 175, 80, 0.15)',
      accentColor: '#2E7D32',
      emoji: '👥',
      priority: 'medium'
    },
    'user_unfollow': {
      icon: 'account-minus',
      gradient: ['#FF9800', '#E65100'],
      bgColor: 'rgba(255, 152, 0, 0.15)',
      accentColor: '#E65100',
  emoji: '👋',
      priority: 'low'
    },
    'club_follow': {
      icon: 'account-group-outline',
      gradient: ['#9C27B0', '#4A148C'],
      bgColor: 'rgba(156, 39, 176, 0.15)',
      accentColor: '#4A148C',
      emoji: '🏢',
      priority: 'medium'
    },
    'club_unfollow': {
      icon: 'account-group-outline',
      gradient: ['#BCAAA4', '#5D4037'],
      bgColor: 'rgba(188, 170, 164, 0.15)',
      accentColor: '#5D4037',
      emoji: '🚪',
      priority: 'low'
    },
    'club_join': {
      icon: 'account-plus',
      gradient: ['#8E24AA', '#6A1B9A'],
      bgColor: 'rgba(142, 36, 170, 0.15)',
      accentColor: '#6A1B9A',
      emoji: '🧩',
      priority: 'high'
    },
    'club_request': {
      icon: 'account-clock',
      gradient: ['#7E57C2', '#4527A0'],
      bgColor: 'rgba(126, 87, 194, 0.15)',
      accentColor: '#4527A0',
      emoji: '📝',
      priority: 'medium'
    },
    'club_approved': {
      icon: 'check-decagram',
      gradient: ['#66BB6A', '#2E7D32'],
      bgColor: 'rgba(102, 187, 106, 0.15)',
      accentColor: '#2E7D32',
      emoji: '✅',
      priority: 'high'
    },
    'club_rejected': {
      icon: 'close-octagon',
      gradient: ['#EF5350', '#C62828'],
      bgColor: 'rgba(239, 83, 80, 0.15)',
      accentColor: '#C62828',
      emoji: '⛔',
      priority: 'medium'
    },
    'club_kicked': {
      icon: 'account-cancel',
      gradient: ['#FF7043', '#D84315'],
      bgColor: 'rgba(255, 112, 67, 0.15)',
      accentColor: '#D84315',
      emoji: '🚫',
      priority: 'medium'
    },
    // Kulüpten ayrılma (enhanced türü)
    'club_leave': {
      icon: 'exit-to-app',
      gradient: ['#A1887F', '#3E2723'],
      bgColor: 'rgba(161, 136, 127, 0.15)',
      accentColor: '#3E2723',
      emoji: '👋',
      priority: 'low'
    },
    // Takipçiden kaldırma (özel)
    'follower_removal': {
      icon: 'account-remove',
      gradient: ['#90A4AE', '#455A64'],
      bgColor: 'rgba(144, 164, 174, 0.15)',
      accentColor: '#455A64',
      emoji: '🧹',
      priority: 'low'
    },
    
    // BAŞARI AKTİVİTELERİ
    'achievement_earned': {
      icon: 'trophy',
      gradient: ['#FFD700', '#FF8F00'],
      bgColor: 'rgba(255, 215, 0, 0.15)',
      accentColor: '#FF8F00',
      emoji: '🏆',
      priority: 'high'
    },
    'leaderboard_rank': {
      icon: 'podium-gold',
      gradient: ['#FF5722', '#BF360C'],
      bgColor: 'rgba(255, 87, 34, 0.15)',
      accentColor: '#BF360C',
      emoji: '🥇',
      priority: 'high'
    },
    
    // TERS İŞLEMLER (REVERSE ACTIONS)
    'unlike_event': {
      icon: 'heart-broken',
      gradient: ['#FFA726', '#FF6F00'],
      bgColor: 'rgba(255, 167, 38, 0.15)',
      accentColor: '#FF6F00',
      emoji: '💔',
      priority: 'low'
    },
    'leave_event': {
      icon: 'calendar-remove',
      gradient: ['#FF8A65', '#D84315'],
      bgColor: 'rgba(255, 138, 101, 0.15)',
      accentColor: '#D84315',
      emoji: '❌',
      priority: 'low'
    },
    'event_leave': {
      icon: 'calendar-remove',
      gradient: ['#FF8A65', '#D84315'],
      bgColor: 'rgba(255, 138, 101, 0.15)',
      accentColor: '#D84315',
      emoji: '❌',
      priority: 'low'
    },
    'delete_comment': {
      icon: 'comment-remove',
      gradient: ['#F48FB1', '#C2185B'],
      bgColor: 'rgba(244, 143, 177, 0.15)',
      accentColor: '#C2185B',
      emoji: '🗑️',
      priority: 'low'
    },
    'unfollow_club': {
      icon: 'account-group-outline',
      gradient: ['#BCAAA4', '#5D4037'],
      bgColor: 'rgba(188, 170, 164, 0.15)',
      accentColor: '#5D4037',
      emoji: '🚪',
      priority: 'low'
    },
    'leave_club': {
      icon: 'exit-to-app',
      gradient: ['#A1887F', '#3E2723'],
      bgColor: 'rgba(161, 136, 127, 0.15)',
      accentColor: '#3E2723',
      emoji: '👋',
      priority: 'low'
    },
    'unlike_comment': {
      icon: 'comment-minus',
      gradient: ['#FFB74D', '#F57C00'],
      bgColor: 'rgba(255, 183, 77, 0.15)',
      accentColor: '#F57C00',
      emoji: '👎',
      priority: 'low'
    },
    'delete_event': {
      icon: 'calendar-minus',
      gradient: ['#E57373', '#C62828'],
      bgColor: 'rgba(229, 115, 115, 0.15)',
      accentColor: '#C62828',
      emoji: '🗂️',
      priority: 'medium'
    },
    'cancel_event': {
      icon: 'calendar-clock',
      gradient: ['#FFB74D', '#FF6F00'],
      bgColor: 'rgba(255, 183, 77, 0.15)',
      accentColor: '#FF6F00',
      emoji: '⏰',
      priority: 'medium'
    },
    'unshare_event': {
      icon: 'share-off',
      gradient: ['#90A4AE', '#455A64'],
      bgColor: 'rgba(144, 164, 174, 0.15)',
      accentColor: '#455A64',
      emoji: '📴',
      priority: 'low'
    },
    'like_comment': {
      icon: 'comment-plus',
      gradient: ['#81C784', '#388E3C'],
      bgColor: 'rgba(129, 199, 132, 0.15)',
      accentColor: '#388E3C',
      emoji: '👍',
      priority: 'medium'
    }
  };

  // Map legacy/alternate type keys from other loggers to modern ones
  const legacyMap: Record<string, string> = {
    like_event: 'event_like',
    unlike_event: 'event_unlike',
    comment_event: 'event_comment',
    join_event: 'event_join',
  share_event: 'event_share',
    unshare_event: 'unshare_event',
    follow_club: 'club_follow',
  unfollow_club: 'club_unfollow',
  join_club: 'club_join',
    leave_club: 'leave_club',
    delete_comment: 'delete_comment',
  like_comment: 'like_comment',
  event_comment_delete: 'delete_comment',
  // ensure enhanced keys pass through
  event_like: 'event_like',
  event_unlike: 'event_unlike',
  event_comment: 'event_comment',
  user_follow: 'user_follow',
  user_unfollow: 'user_unfollow',
  club_request: 'club_request',
  club_approved: 'club_approved',
  club_rejected: 'club_rejected',
  club_kicked: 'club_kicked',
  club_leave: 'club_leave',
  follower_removal: 'follower_removal',
  };
  const mapped = legacyMap[type];
  if (mapped && configs[mapped]) return configs[mapped];

  return configs[type] || {
    icon: 'help-circle',
    gradient: ['#9E9E9E', '#616161'],
    bgColor: 'rgba(158, 158, 158, 0.15)',
    accentColor: '#616161',
    emoji: '📝',
    priority: 'low' as const
  };
};

// Modern kategori konfigürasyonu
const getCategoryConfig = (category: string) => {
  const configs: Record<string, {
    label: string;
    color: string;
    bgColor: string;
    icon: string;
  }> = {
    'events': { label: 'Etkinlik', color: '#4CAF50', bgColor: '#E8F5E8', icon: 'calendar' },
    'social': { label: 'Sosyal', color: '#2196F3', bgColor: '#E3F2FD', icon: 'account-group' },
    'achievements': { label: 'Başarı', color: '#FF9800', bgColor: '#FFF3E0', icon: 'trophy' },
    'profile': { label: 'Profil', color: '#9C27B0', bgColor: '#F3E5F5', icon: 'account' },
    'general': { label: 'Genel', color: '#607D8B', bgColor: '#ECEFF1', icon: 'information' }
  };
  return configs[category] || configs['general'];
};

// Modern Aktivite Card Komponenti
const ActivityCard: React.FC<{
  activity: UserActivity;
  index: number;
  onPress: () => void;
  theme: any;
}> = ({ activity, index, onPress, theme }) => {
  const config = getActivityConfig(activity.type);
  const categoryConfig = getCategoryConfig(activity.category);
  const [pressed, setPPressed] = useState(false);
  const scaleAnim = useMemo(() => new Animated.Value(1), []);

  const handlePressIn = () => {
    setPPressed(true);
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    setPPressed(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const formatTime = (timestamp: any): string => {
    const now = moment();
    const time = moment(timestamp.toDate());
    const diffMinutes = now.diff(time, 'minutes');
    const diffHours = now.diff(time, 'hours');
    const diffDays = now.diff(time, 'days');

    if (diffMinutes < 5) return 'Az önce';
    if (diffMinutes < 60) return `${diffMinutes}dk`;
    if (diffHours < 24) return `${diffHours}sa`;
    if (diffDays < 7) return `${diffDays}g`;
    return time.format('DD.MM');
  };

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        {
          transform: [{ scale: scaleAnim }],
          opacity: pressed ? 0.9 : 1,
        }
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={styles.cardTouchable}
      >
        <Surface
          style={[
            styles.modernCard,
            {
              backgroundColor: theme.colors.surface,
              borderLeftColor: config.accentColor,
            }
          ]}
        >
          {/* Priority Badge */}
          {config.priority === 'high' && (
            <View style={[styles.priorityBadge, { backgroundColor: config.accentColor }]}>
              <Text style={styles.priorityText}>!</Text>
            </View>
          )}

          <View style={styles.cardContent}>
            {/* Sol - Aktivite İkonu */}
            <View style={styles.leftSection}>
              <LinearGradient
                colors={config.gradient}
                style={styles.iconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons
                  name={config.icon as any}
                  size={24}
                  color="white"
                />
              </LinearGradient>
              
              {/* Emoji Badge */}
              <View style={styles.emojiContainer}>
                <Text style={styles.emoji}>{config.emoji}</Text>
              </View>
            </View>

            {/* Orta - İçerik */}
            <View style={styles.contentSection}>
              <View style={styles.titleRow}>
                <Text style={[styles.activityTitle, { color: theme.colors.onSurface }]}>
                  {activity.title || (activity as any).description || 'Aktivite'}
                </Text>
                {activity.isPinned && (
                  <MaterialCommunityIcons
                    name="pin"
                    size={16}
                    color={config.accentColor}
                  />
                )}
              </View>

              <Text
                style={[styles.activityDescription, { color: theme.colors.onSurface }]}
                numberOfLines={2}
              >
                {activity.description}
              </Text>

              {/* Alt Meta Bilgiler */}
              <View style={styles.metaRow}>
                <Chip
                  style={[
                    styles.categoryChip,
                    { backgroundColor: categoryConfig.bgColor }
                  ]}
                  textStyle={[
                    styles.categoryChipText,
                    { color: categoryConfig.color }
                  ]}
                  icon={categoryConfig.icon}
                >
                  {categoryConfig.label}
                </Chip>

                <View style={styles.timeContainer}>
                  <MaterialCommunityIcons
                    name="clock-outline"
                    size={12}
                    color={theme.colors.onSurface}
                  />
                  <Text style={[styles.timeText, { color: theme.colors.onSurface }]}>
                    {formatTime(activity.createdAt)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Sağ - Avatar/Target */}
            <View style={styles.rightSection}>
              {activity.targetName && (
                <View style={styles.avatarContainer}>
                  <UniversalAvatar
                    size={36}
                    userName={activity.targetName}
                    profileImage={activity.userPhotoURL}
                  />
                  {config.priority === 'high' && (
                    <View style={[styles.avatarBadge, { backgroundColor: config.accentColor }]}>
                      <MaterialCommunityIcons name="star" size={8} color="white" />
                    </View>
                  )}
                </View>
              )}

              {/* Action Button */}
              <IconButton
                icon="chevron-right"
                size={16}
                style={styles.actionButton}
              />
            </View>
          </View>

          {/* Alt Çizgi Efekti */}
          <View
            style={[
              styles.bottomAccent,
              { backgroundColor: config.accentColor + '20' }
            ]}
          />
        </Surface>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Ana UserActivityFeed Komponenti
const UserActivityFeed: React.FC<UserActivityFeedProps> = ({
  userId,
  limit = 10,
  showHeader = true,
  instanceId = 'default',
  filter = {},
  theme: themeType = 'modern',
  includePrivate = false,
}) => {
  const theme = useTheme();
  const { userProfile } = useAuth();
  
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Animasyon değerleri
  const fadeAnim = useMemo(() => new Animated.Value(0), []);
  const slideAnim = useMemo(() => new Animated.Value(50), []);

  // userId kontrolü
  if (!userId) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: theme.colors.background }]}>
        <MaterialCommunityIcons
          name="account-alert-outline"
          size={64}
          color={theme.colors.onSurface}
        />
        <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>
          Kullanıcı Bulunamadı
        </Text>
        <Text style={[styles.emptyText, { color: theme.colors.onSurface, opacity: 0.7 }]}>
          Aktiviteleri görüntülemek için geçerli bir kullanıcı gerekli
        </Text>
      </View>
    );
  }

  // Optimized filter handling - sadece değer değişirse string değişir
  const filterString = useMemo(() => JSON.stringify(filter), [filter]);

  // Real-time listener - En basit ve güvenli yaklaşım
  useEffect(() => {
    if (!userId) return;

    let isActive = true;
    let unsubscribeListener: (() => void) | null = null;
    
    console.log(`🔔 UserActivityFeed: Setting up real-time listener for user ${userId} (instance: ${instanceId})`);
    
    // Real-time listener kurulumu
    const setupListener = () => {
      try {
        unsubscribeListener = userActivityService.setupRealtimeListener(userId, (newActivities) => {
          if (!isActive) return;
          
          console.log(`🔄 UserActivityFeed: Received ${newActivities.length} activities for user ${userId} (instance: ${instanceId})`);
          console.log('🎯 UserActivityFeed: Activities:', newActivities.map(a => `${a.type}:${a.title}`));
          console.log('📝 UserActivityFeed: Setting activities state...');
          
          // Ham veriyi al, filtreleme computed property ile yapılacak
          setActivities(newActivities);
          setLoading(false);
          
          console.log('✅ UserActivityFeed: Activities state updated');
        });
      } catch (error) {
        console.error('Error setting up real-time listener:', error);
        setLoading(false);
      }
    };

    setLoading(true);
    setupListener();

    return () => {
      isActive = false;
      console.log(`🔕 UserActivityFeed: Cleaning up listener for user ${userId} (instance: ${instanceId})`);
      if (unsubscribeListener) {
        try {
          unsubscribeListener();
        } catch (error) {
          console.error('Error unsubscribing listener:', error);
        }
      }
    };
  }, [userId, instanceId]); // instanceId de dependency'ye eklendi

  // Filtered activities - computed property
  const filteredActivities = useMemo(() => {
    console.log(`🔍 UserActivityFeed: Filtering ${activities.length} activities for user ${userId}`);
    let result = [...activities];

    // Öğrenci kullanıcıları için passive aktiviteleri filtrele
    // Sadece kendi yaptığı aktiviteleri göster
    if (userProfile?.userType === 'student') {
      const passiveActivityTypes = [
        'club_approved', // Kulüp üyeliği onaylandı (kulübün yaptığı eylem)
        'club_rejected', // Kulüp üyeliği reddedildi (kulübün yaptığı eylem)
        'club_kicked',   // Kulüpten çıkarıldı (kulübün yaptığı eylem)
      ];
      
      result = result.filter(activity => !passiveActivityTypes.includes(activity.type));
      console.log(`👤 UserActivityFeed: Filtered passive activities for student: ${result.length} activities remaining`);
    }

    // Filtre uygulama
    if (selectedCategory) {
      result = result.filter(activity => activity.category === selectedCategory);
      console.log(`📂 UserActivityFeed: Filtered by category '${selectedCategory}': ${result.length} activities`);
    } else if (filter.category && filter.category.length > 0) {
      result = result.filter(activity => filter.category!.includes(activity.category));
      console.log(`📂 UserActivityFeed: Filtered by filter categories: ${result.length} activities`);
    }

    if (filter.type && filter.type.length > 0) {
      result = result.filter(activity => filter.type!.includes(activity.type));
      console.log(`🏷️ UserActivityFeed: Filtered by types: ${result.length} activities`);
    }

    result = result.filter(activity => {
      const vis = (activity as any).visibility || 'public';
      // includePrivate true ise owner görünümü için private aktiviteleri de göster
      return includePrivate ? ['public', 'followers_only', 'private'].includes(vis) : ['public', 'followers_only'].includes(vis);
    });
    console.log(`👁️ UserActivityFeed: Filtered by visibility: ${result.length} activities`);

    if (limit) {
      result = result.slice(0, limit);
      console.log(`🔢 UserActivityFeed: Limited to ${limit}: ${result.length} activities`);
    }

    console.log(`✅ UserActivityFeed: Final filtered result: ${result.length} activities`);
    return result;
  }, [activities, selectedCategory, filter.category, filter.type, limit, userId, userProfile?.userType]);

  // Animasyon başlatma
  useEffect(() => {
    if (filteredActivities.length > 0) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [filteredActivities.length]);

  // Refresh handler
  const onRefresh = useCallback(async () => {
    if (!userId) return;
    
    try {
      setRefreshing(true);
      const userActivities = await userActivityService.getUserActivities(userId, {
        limit: 50, // Refresh'te daha fazla veri çek
        visibility: ['public', 'followers_only'],
      });
      setActivities(userActivities);
    } catch (error) {
      console.error('Error refreshing user activities:', error);
    } finally {
      setRefreshing(false);
    }
  }, [userId]);

  // Activity press handler
  const handleActivityPress = (activity: UserActivity) => {
    // Haptic feedback
    if (Platform.OS === 'ios') {
      // HapticFeedback.impactAsync(HapticFeedback.ImpactFeedbackStyle.Light);
    }

    // Navigation logic based on activity type
    switch (activity.type) {
      case 'event_like':
      case 'event_unlike':
      case 'event_comment':
      case 'event_join':
        if (activity.metadata?.eventId) {
          // navigation.navigate('EventDetail', { eventId: activity.metadata.eventId });
        }
        break;
      case 'club_follow':
      case 'club_join':
        if (activity.metadata?.clubId) {
          // navigation.navigate('ClubProfile', { clubId: activity.metadata.clubId });
        }
        break;
      case 'user_follow':
        if (activity.metadata?.followedUserId) {
          // navigation.navigate('UserProfile', { userId: activity.metadata.followedUserId });
        }
        break;
    }
  };

  // Kategori filtreleri
  const categories = ['events', 'social', 'achievements', 'profile'];

  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.onSurface }]}>
            Aktiviteler yükleniyor...
          </Text>
          <View style={styles.loadingDots}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[styles.loadingDot, { backgroundColor: theme.colors.primary }]}
              />
            ))}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar
        backgroundColor={theme.colors.surface}
        barStyle={theme.dark ? 'light-content' : 'dark-content'}
      />

      {/* Modern Header */}
      {showHeader && (
        <Surface style={[styles.headerSurface, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.headerIcon}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons name="timeline-clock" size={24} color="white" />
              </LinearGradient>
              <View>
                <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
                  Son Aktiviteler
                </Text>
                <Text style={[styles.headerSubtitle, { color: theme.colors.onSurface, opacity: 0.7 }]}>
                  {filteredActivities.length} aktivite
                </Text>
              </View>
            </View>

            <IconButton
              icon="filter-variant"
              size={24}
              style={styles.filterButton}
            />
          </View>

          {/* Kategori Filtreleri */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScrollView}
            contentContainerStyle={styles.filterContent}
          >
            <Chip
              selected={selectedCategory === null}
              onPress={() => setSelectedCategory(null)}
              style={[
                styles.filterChip,
                selectedCategory === null && { backgroundColor: theme.colors.primary }
              ]}
              textStyle={[
                styles.filterChipText,
                selectedCategory === null && { color: 'white' }
              ]}
            >
              Tümü
            </Chip>
            {categories.map((category) => {
              const config = getCategoryConfig(category);
              return (
                <Chip
                  key={category}
                  selected={selectedCategory === category}
                  onPress={() => setSelectedCategory(category)}
                  icon={config.icon}
                  style={[
                    styles.filterChip,
                    selectedCategory === category && { backgroundColor: config.color }
                  ]}
                  textStyle={[
                    styles.filterChipText,
                    selectedCategory === category && { color: 'white' }
                  ]}
                >
                  {config.label}
                </Chip>
              );
            })}
          </ScrollView>
        </Surface>
      )}

      {/* Activities List */}
      <Animated.View
        style={[
          styles.listContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          contentContainerStyle={styles.scrollContent}
        >
          {filteredActivities.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="timeline-clock-outline"
                size={80}
                color={theme.colors.onSurface}
              />
              <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>
                Henüz Aktivite Yok
              </Text>
              <Text style={[styles.emptyText, { color: theme.colors.onSurface, opacity: 0.7 }]}>
                {selectedCategory
                  ? `${getCategoryConfig(selectedCategory).label} kategorisinde aktivite bulunmuyor`
                  : 'Etkileşimleriniz burada görüntülenecek'}
              </Text>
              
              <Button
                mode="contained"
                onPress={() => setSelectedCategory(null)}
                style={styles.emptyButton}
                icon="refresh"
              >
                Yenile
              </Button>
            </View>
          ) : (
            filteredActivities.map((activity, index) => (
              <ActivityCard
                key={activity.id || index}
                activity={activity}
                index={index}
                onPress={() => handleActivityPress(activity)}
                theme={theme}
              />
            ))
          )}

          {/* Bottom Spacer */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // Header Styles
  headerSurface: {
    paddingTop: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  filterButton: {
    margin: 0,
  },

  // Filter Styles
  filterScrollView: {
    marginBottom: 8,
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  filterChip: {
    marginRight: 8,
    height: 36,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // List Styles
  listContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 8,
  },

  // Card Styles
  cardContainer: {
    marginHorizontal: 8,
    marginVertical: 4,
  },
  cardTouchable: {
    borderRadius: 16,
  },
  modernCard: {
    borderRadius: 16,
    borderLeftWidth: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  priorityBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  priorityText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
  },

  // Left Section
  leftSection: {
    alignItems: 'center',
    marginRight: 12,
  },
  iconGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  emojiContainer: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    backgroundColor: 'white',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  emoji: {
    fontSize: 12,
  },

  // Content Section
  contentSection: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  activityDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    opacity: 0.8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryChip: {
    height: 28,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },

  // Right Section
  rightSection: {
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButton: {
    margin: 0,
    width: 32,
    height: 32,
  },

  // Bottom Accent
  bottomAccent: {
    height: 2,
    width: '100%',
  },

  // Loading Styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  loadingDots: {
    flexDirection: 'row',
    marginTop: 12,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 2,
  },

  // Empty State Styles
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    marginTop: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    opacity: 0.7,
  },
  emptyButton: {
    marginTop: 24,
  },

  bottomSpacer: {
    height: 32,
  },
});

export default UserActivityFeed;
