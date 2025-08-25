import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  RefreshControl, 
  Dimensions,
  TouchableOpacity,
  FlatList,
  Alert
} from 'react-native';
import { 
  Text, 
  useTheme, 
  Surface,
  Card,
  Avatar,
  Button,
  Chip,
  ActivityIndicator
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import firebase from 'firebase/compat/app';

// Components
import EventDetailModal from '../../components/EventDetailModal';
import EventCardModal from '../../components/EventCardModal';
import { UniversalAvatar } from '../../components/common';

// Hooks
import { useAuth } from '../../contexts/AuthContext';
import { useUserAvatar } from '../../hooks/useUserAvatar';
import { useRealtimeLeaderboard } from '../../hooks/useRealtimeLeaderboard';
import { getUniversityName } from '../../constants/universities';

// Types
import type { 
  LeaderboardType, 
  LeaderboardEntry, 
  UserLeaderboardEntry,
  ClubLeaderboardEntry,
  EventLeaderboardEntry
} from '../../types/leaderboard';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface TabConfig {
  type: 'users' | 'events' | 'clubs';
  title: string;
  icon: string;
  gradient: string[];
  stats: string[];
}

const TABS: TabConfig[] = [
  {
    type: 'users',
    title: 'Öğrenciler',
    icon: 'account-group',
    gradient: ['#667eea', '#764ba2'],
    stats: ['likes', 'comments', 'participations']
  },
  {
    type: 'events',
    title: 'Etkinlikler',
    icon: 'calendar-star',
    gradient: ['#f093fb', '#f5576c'],
    stats: ['likes', 'comments', 'participations', 'clubs']
  },
  {
    type: 'clubs',
    title: 'Kulüpler',
    icon: 'account-multiple',
    gradient: ['#4facfe', '#00f2fe'],
    stats: ['likes', 'comments', 'participations', 'members']
  }
];

interface StatisticsEntry {
  id: string;
  name: string;
  avatar?: string;
  university?: string;
  department?: string;
  username?: string;
  likes: number;
  comments: number;
  participations: number;
  members?: number; // clubs only
  clubs?: number; // events only
  createdAt?: any;
}

/**
 * Statistics-Based Leaderboard Screen
 * İstatistiklere dayalı liderlik tablosu (puanlama sistemi kaldırıldı)
 */
const ModernLeaderboardScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { currentUser } = useAuth();
  
  const [selectedTab, setSelectedTab] = useState<'users' | 'events' | 'clubs'>('users');
  const [sortBy, setSortBy] = useState<'likes' | 'comments' | 'participations' | 'members' | 'clubs'>('likes');
  const [data, setData] = useState<StatisticsEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal states
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [eventCardVisible, setEventCardVisible] = useState(false);

  // Fetch statistics data
  const fetchStatisticsData = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      let entries: StatisticsEntry[] = [];
      
      if (selectedTab === 'users') {
        // Fetch student users and their statistics
        const usersSnapshot = await firebase.firestore()
          .collection('users')
          .where('userType', '==', 'student')
          .limit(100)
          .get();
        
        for (const doc of usersSnapshot.docs) {
          const userData = doc.data();
          
          // Count likes, comments, and participations from user activities
          const likesSnapshot = await firebase.firestore()
            .collection('eventLikes')
            .where('userId', '==', doc.id)
            .get();
          
          const commentsSnapshot = await firebase.firestore()
            .collection('eventComments')
            .where('userId', '==', doc.id)
            .get();
          
          const participationsSnapshot = await firebase.firestore()
            .collection('eventAttendees')
            .where('userId', '==', doc.id)
            .get();
          
          entries.push({
            id: doc.id,
            name: userData.displayName || userData.name || 'İsimsiz',
            avatar: userData.profileImage || userData.avatar,
            university: userData.university,
            department: userData.department,
            username: userData.username,
            likes: likesSnapshot.docs.length,
            comments: commentsSnapshot.docs.length,
            participations: participationsSnapshot.docs.length
          });
        }
      } else if (selectedTab === 'events') {
        // Fetch events and their statistics
        const eventsSnapshot = await firebase.firestore()
          .collection('events')
          .where('status', '==', 'approved')
          .limit(100)
          .get();
        
        for (const doc of eventsSnapshot.docs) {
          const eventData = doc.data();
          
          entries.push({
            id: doc.id,
            name: eventData.title || eventData.name || 'İsimsiz Etkinlik',
            avatar: eventData.imageUrl || eventData.coverImage,
            username: eventData.organizer?.name || eventData.organizerName,
            likes: eventData.likeCount || 0,
            comments: eventData.commentCount || 0,
            participations: eventData.attendeesCount || 0,
            clubs: eventData.organizer?.name ? 1 : 0,
            createdAt: eventData.createdAt
          });
        }
      } else if (selectedTab === 'clubs') {
        // Fetch clubs and their statistics
        const clubsSnapshot = await firebase.firestore()
          .collection('users')
          .where('userType', '==', 'club')
          .limit(100)
          .get();
        
        for (const doc of clubsSnapshot.docs) {
          const clubData = doc.data();
          
          // Count events organized by this club
          const clubEventsSnapshot = await firebase.firestore()
            .collection('events')
            .where('organizer.id', '==', doc.id)
            .get();
          
          // Count total likes on club events
          let totalLikes = 0;
          let totalComments = 0;
          let totalParticipations = 0;
          
          for (const eventDoc of clubEventsSnapshot.docs) {
            const eventData = eventDoc.data();
            totalLikes += eventData.likeCount || 0;
            totalComments += eventData.commentCount || 0;
            totalParticipations += eventData.attendeesCount || 0;
          }
          
          entries.push({
            id: doc.id,
            name: clubData.displayName || clubData.clubName || clubData.name || 'İsimsiz Kulüp',
            avatar: clubData.profileImage || clubData.avatar,
            university: clubData.university,
            department: clubData.department,
            username: clubData.username,
            likes: totalLikes,
            comments: totalComments,
            participations: totalParticipations,
            members: clubData.memberCount || 0
          });
        }
      }
      
      // Sort by selected criteria
      entries.sort((a, b) => {
        switch (sortBy) {
          case 'likes':
            return b.likes - a.likes;
          case 'comments':
            return b.comments - a.comments;
          case 'participations':
            return b.participations - a.participations;
          case 'members':
            return (b.members || 0) - (a.members || 0);
          case 'clubs':
            return (b.clubs || 0) - (a.clubs || 0);
          default:
            return b.likes - a.likes;
        }
      });
      
      setData(entries);
    } catch (error) {
      console.error('Error fetching statistics:', error);
      Alert.alert('Hata', 'İstatistikler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStatisticsData();
  }, [selectedTab, sortBy]);
  
  // Tab change handler
  const handleTabChange = (tab: 'users' | 'events' | 'clubs') => {
    setSelectedTab(tab);
    setSortBy('likes'); // Reset sort to likes when changing tabs
  };
  
  // Sort change handler
  const handleSortChange = (sort: 'likes' | 'comments' | 'participations' | 'members' | 'clubs') => {
    setSortBy(sort);
  };
  
  // Load data when tab or sort changes
  useEffect(() => {
    fetchStatisticsData();
  }, [selectedTab, sortBy]);

  // Item press handler
  const handleItemPress = (item: StatisticsEntry) => {
    if (selectedTab === 'users') {
      (navigation as any).navigate('ViewProfile', { userId: item.id });
    } else if (selectedTab === 'clubs') {
      (navigation as any).navigate('ViewClub', { clubId: item.id });
    } else if (selectedTab === 'events') {
      setSelectedEvent(item);
      setEventCardVisible(true);
    }
  };

  // Get rank display
  const getRankDisplay = (rank: number) => {
    switch (rank) {
      case 1: return { emoji: '👑', color: '#FFD700' };
      case 2: return { emoji: '🥈', color: '#C0C0C0' };
      case 3: return { emoji: '🥉', color: '#CD7F32' };
      default: return { emoji: '', color: '#666' };
    }
  };

  // Get stat icon based on type and category
  const getStatIcon = (statType: string) => {
    switch (statType) {
      case 'likes':
        return 'heart';
      case 'comments':
        return 'comment';
      case 'participations':
        return 'account-check';
      case 'members':
        return 'account-group';
      case 'clubs':
        return 'account-multiple';
      default:
        return 'star';
    }
  };

  // Get stat label based on type
  const getStatLabel = (statType: string) => {
    switch (statType) {
      case 'likes':
        return 'Beğeni';
      case 'comments':
        return 'Yorum';
      case 'participations':
        return 'Katılım';
      case 'members':
        return 'Üye';
      case 'clubs':
        return 'Kulüp';
      default:
        return 'İstatistik';
    }
  };

  // Render sort buttons
  const renderSortButtons = () => {
    const currentTab = TABS.find(tab => tab.type === selectedTab);
    if (!currentTab) return null;

    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.sortContainer}
      >
        {currentTab.stats.map((stat) => (
          <Chip
            key={stat}
            selected={sortBy === stat}
            onPress={() => handleSortChange(stat as any)}
            style={[
              styles.sortChip,
              sortBy === stat && styles.sortChipSelected
            ]}
            textStyle={[
              styles.sortChipText,
              sortBy === stat && styles.sortChipTextSelected
            ]}
            icon={getStatIcon(stat)}
          >
            {getStatLabel(stat)}
          </Chip>
        ))}
      </ScrollView>
    );
  };

  // Render leaderboard item
  const renderLeaderboardItem = ({ item, index }: { item: StatisticsEntry; index: number }) => {
    const rank = index + 1;
    const rankInfo = getRankDisplay(rank);
    const isCurrentUser = item.id === currentUser?.uid;
    const isTopThree = rank <= 3;

    return (
      <TouchableOpacity
        style={[
          styles.itemContainer,
          isCurrentUser && styles.currentUserItem
        ]}
        activeOpacity={0.7}
        onPress={() => handleItemPress(item)}
      >
        
        {/* Rank */}
        <View style={styles.rankContainer}>
          {rank <= 3 ? (
            <Text style={[styles.rankEmoji, { color: rankInfo.color }]}>
              {rankInfo.emoji}
            </Text>
          ) : (
            <Text style={styles.rankNumber}>{rank}</Text>
          )}
        </View>

        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <UniversalAvatar
            userName={item.name}
            profileImage={item.avatar}
            size={isTopThree ? 60 : 50}
          />
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
          
          {/* Name */}
          <Text style={[
            styles.name,
            isTopThree && styles.topThreeName
          ]}>
            {item.name}
          </Text>

          {/* Info */}
          {item.university && (
            <Text style={styles.university}>
              📍 {getUniversityName(item.university)}
            </Text>
          )}
          
          {item.department && (
            <Text style={styles.department}>
              🎓 {item.department}
            </Text>
          )}

          {item.username && (
            <Text style={styles.username}>
              @{item.username}
            </Text>
          )}

          {/* Statistics */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="heart" size={14} color="#e91e63" />
              <Text style={styles.statText}>{item.likes}</Text>
            </View>
            
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="comment" size={14} color="#2196f3" />
              <Text style={styles.statText}>{item.comments}</Text>
            </View>
            
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="account-check" size={14} color="#4caf50" />
              <Text style={styles.statText}>{item.participations}</Text>
            </View>
            
            {selectedTab === 'clubs' && item.members !== undefined && (
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="account-group" size={14} color="#ff9800" />
                <Text style={styles.statText}>{item.members}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="chart-line-variant" size={64} color="#ccc" />
      <Text style={styles.emptyText}>Henüz istatistik bulunmuyor</Text>
      <Button mode="outlined" onPress={fetchStatisticsData} style={styles.retryButton}>
        Yeniden Dene
      </Button>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Liderlik Tablosu</Text>
        <Text style={styles.headerSubtitle}>İstatistiklere dayalı sıralama</Text>
      </View>

      {/* Tab Navigation */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.tabContainer}
      >
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.type}
            style={[
              styles.tabButton,
              selectedTab === tab.type && styles.activeTabButton
            ]}
            onPress={() => handleTabChange(tab.type)}
          >
            <LinearGradient
              colors={selectedTab === tab.type ? tab.gradient : ['transparent', 'transparent']}
              style={styles.tabGradient}
            >
              <MaterialCommunityIcons
                name={tab.icon as any}
                size={24}
                color={selectedTab === tab.type ? '#fff' : '#666'}
              />
              <Text style={[
                styles.tabText,
                selectedTab === tab.type && styles.activeTabText
              ]}>
                {tab.title}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Sort Options */}
      {renderSortButtons()}

      {/* Content */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>İstatistikler yükleniyor...</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          renderItem={renderLeaderboardItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
            />
          }
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={data.length === 0 ? styles.emptyContentContainer : undefined}
        />
      )}

      {/* Event Card Modal */}
      <EventCardModal
        visible={eventCardVisible}
        eventId={selectedEvent?.id || ''}
        onDismiss={() => {
          setEventCardVisible(false);
          setSelectedEvent(null);
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666'
  },
  tabContainer: {
    paddingVertical: 16,
    paddingHorizontal: 12
  },
  tabButton: {
    marginRight: 12,
    borderRadius: 25,
    overflow: 'hidden'
  },
  activeTabButton: {
    elevation: 3
  },
  tabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25
  },
  tabText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#666'
  },
  activeTabText: {
    color: '#fff'
  },
  sortContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16
  },
  sortChip: {
    marginRight: 8,
    backgroundColor: '#f0f0f0'
  },
  sortChipSelected: {
    backgroundColor: '#2196f3'
  },
  sortChipText: {
    fontSize: 12,
    color: '#666'
  },
  sortChipTextSelected: {
    color: '#fff'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666'
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3
  },
  currentUserItem: {
    borderColor: '#2196f3',
    borderWidth: 2
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
    marginRight: 12
  },
  rankEmoji: {
    fontSize: 24,
    fontWeight: 'bold'
  },
  rankNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666'
  },
  avatarContainer: {
    marginRight: 12
  },
  contentContainer: {
    flex: 1
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4
  },
  topThreeName: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  university: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4
  },
  department: {
    fontSize: 11,
    color: '#888',
    marginBottom: 4
  },
  username: {
    fontSize: 12,
    color: '#4a90e2',
    marginBottom: 8,
    fontWeight: '500'
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16
  },
  statText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    fontWeight: '500'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32
  },
  emptyContentContainer: {
    flex: 1
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center'
  },
  retryButton: {
    marginTop: 16
  }
});

export default ModernLeaderboardScreen;
