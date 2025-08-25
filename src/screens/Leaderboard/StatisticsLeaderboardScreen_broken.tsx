import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  RefreshControl, 
  Dimensions,
  TouchableOpacity,
  FlatList,
  Alert,
  TextInput,
  Image
} from 'react-native';
import { 
  Text, 
  useTheme, 
  Surface,
  Card,
  Avatar,
  Button,
  Chip,
  ActivityIndicator,
  Searchbar
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import firebase from 'firebase/compat/app';

// Components
import EventCardModal from '../../components/EventCardModal';
import { UniversalAvatar } from '../../components/common';

// Services
import unifiedStatisticsService from '../../services/unifiedStatisticsService';

// Hooks
import { useAuth } from '../../contexts/AuthContext';
import { getUniversityName } from '../../constants/universities';

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
    stats: ['likes', 'comments', 'participations', 'followers', 'following', 'clubs']
  },
  {
    type: 'events',
    title: 'Etkinlikler',
    icon: 'calendar-star',
    gradient: ['#f093fb', '#f5576c'],
    stats: ['likes', 'comments', 'participations']
  },
  {
    type: 'clubs',
    title: 'Kulüpler',
    icon: 'account-multiple',
    gradient: ['#4facfe', '#00f2fe'],
    stats: ['likes', 'comments', 'participations', 'members', 'followers']
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
  followers?: number; // users and clubs
  following?: number; // users only
  clubs?: number; // users and events
  createdAt?: any;
  // Event-specific fields
  description?: string;
  clubId?: string;
  clubName?: string;
  clubUsername?: string;
  clubAvatar?: string;
  startDate?: any;
  location?: string;
}

/**
 * Statistics-Based Leaderboard Screen
 * İstatistiklere dayalı liderlik tablosu (puanlama sistemi kaldırıldı)
 */
const StatisticsLeaderboardScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { currentUser } = useAuth();
  
  const [selectedTab, setSelectedTab] = useState<'users' | 'events' | 'clubs'>('users');
  const [sortBy, setSortBy] = useState<'likes' | 'comments' | 'participations' | 'members' | 'followers' | 'following' | 'clubs'>('likes');
  const [data, setData] = useState<StatisticsEntry[]>([]);
  const [filteredData, setFilteredData] = useState<StatisticsEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  
  // Modal states
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [eventCardVisible, setEventCardVisible] = useState(false);
  const [imageErrors, setImageErrors] = useState<{[key: string]: boolean}>({});

  // Fetch statistics data using unified service
  const fetchStatisticsData = async () => {
    if (loading) return;
    
    setLoading(true);
    console.log(`🔄 StatisticsLeaderboard: Fetching ${selectedTab} statistics using unified service...`);
    
    try {
      let entries: StatisticsEntry[] = [];
      
      if (selectedTab === 'users') {
        console.log('👥 Fetching user statistics using unified service...');
        // Fetch student users first
        const usersSnapshot = await firebase.firestore()
          .collection('users')
          .where('userType', '==', 'student')
          .limit(100)
          .get();
        
        console.log(`👥 Found ${usersSnapshot.docs.length} student users`);
        
        // Use unified statistics service for each user
        for (const doc of usersSnapshot.docs) {
          try {
            const userData = doc.data();
            
            // Get comprehensive user statistics from unified service
            const userStats = await unifiedStatisticsService.getUserStatistics(doc.id);
            
            entries.push({
              id: doc.id,
              name: userData.displayName || userData.name || 'İsimsiz',
              avatar: userData.profileImage || userData.avatar,
              university: userData.university,
              department: userData.department,
              username: userData.username,
              likes: userStats.likes,
              comments: userStats.comments,
              participations: userStats.participations,
              followers: userData.followers?.length || 0, // Real-time from user document
              following: userData.following?.length || 0, // Real-time from user document
              clubs: 0, // Will be calculated from clubMembers
              createdAt: userData.createdAt
            });
          } catch (userError) {
            console.warn(`⚠️ Error loading statistics for user ${doc.id}:`, userError);
            // Add user with default stats on error
            const userData = doc.data();
            entries.push({
              id: doc.id,
              name: userData.displayName || userData.name || 'İsimsiz',
              avatar: userData.profileImage || userData.avatar,
              university: userData.university,
              department: userData.department,
              username: userData.username,
              likes: 0,
              comments: 0,
              participations: 0,
              followers: userData.followers?.length || 0,
              following: userData.following?.length || 0,
              clubs: 0,
              createdAt: userData.createdAt
            });
          }
        }
        
        // Load club membership counts for users (batch operation)
        try {
          const clubMembershipPromises = entries.map(async (user) => {
            try {
              const clubMembersSnapshot = await firebase.firestore()
                .collection('clubMembers')
                .where('userId', '==', user.id)
                .where('status', '==', 'approved')
                .get();
              return { userId: user.id, clubCount: clubMembersSnapshot.size };
            } catch (error) {
              console.warn(`Error getting club memberships for user ${user.id}:`, error);
              return { userId: user.id, clubCount: 0 };
            }
          });
          
          const clubMembershipResults = await Promise.all(clubMembershipPromises);
          const clubCountMap = new Map(clubMembershipResults.map(r => [r.userId, r.clubCount]));
          
          // Update entries with club counts
          entries = entries.map(entry => ({
            ...entry,
            clubs: clubCountMap.get(entry.id) || 0
          }));
        } catch (error) {
          console.warn('Error loading club memberships:', error);
        }
        
        console.log(`✅ Loaded statistics for ${entries.length} users with unified service`);
        
      } else if (selectedTab === 'events') {
        console.log('🎉 Fetching event statistics...');
        // Fetch events
        const eventsSnapshot = await firebase.firestore()
          .collection('events')
          .orderBy('createdAt', 'desc')
          .limit(100)
          .get();
        
        console.log(`📊 Found ${eventsSnapshot.docs.length} events`);
        
        for (const doc of eventsSnapshot.docs) {
          try {
            const eventData = doc.data();
            
            // Get event statistics directly from collections (more accurate for events)
            const [likesSnapshot, commentsSnapshot, attendeesSnapshot] = await Promise.all([
              firebase.firestore().collection('eventLikes').where('eventId', '==', doc.id).get(),
              firebase.firestore().collection('events').doc(doc.id).collection('comments').get(),
              firebase.firestore().collection('eventAttendees').where('eventId', '==', doc.id).get()
            ]);
            
            // Get club information
            let clubData = null;
            if (eventData.organizerId) {
              try {
                const clubDoc = await firebase.firestore()
                  .collection('users')
                  .doc(eventData.organizerId)
                  .get();
                
                if (clubDoc.exists) {
                  clubData = clubDoc.data();
                }
              } catch (error) {
                console.warn(`Error getting club data for event ${doc.id}:`, error);
              }
            }
            
            entries.push({
              id: doc.id,
              name: eventData.title || 'İsimsiz Etkinlik',
              avatar: eventData.eventImage || eventData.image,
              description: eventData.description,
              clubId: eventData.organizerId,
              clubName: clubData?.displayName || clubData?.name,
              clubUsername: clubData?.username,
              clubAvatar: clubData?.profileImage,
              startDate: eventData.startDate,
              location: eventData.location,
              likes: likesSnapshot.size,
              comments: commentsSnapshot.size,
              participations: attendeesSnapshot.size,
              createdAt: eventData.createdAt
            });
          } catch (eventError) {
            console.warn(`⚠️ Error loading statistics for event ${doc.id}:`, eventError);
            // Add event with default stats on error
            const eventData = doc.data();
            entries.push({
              id: doc.id,
              name: eventData.title || 'İsimsiz Etkinlik',
              avatar: eventData.eventImage || eventData.image,
              description: eventData.description,
              clubId: eventData.organizerId,
              startDate: eventData.startDate,
              location: eventData.location,
              likes: 0,
              comments: 0,
              participations: 0,
              createdAt: eventData.createdAt
            });
          }
        }
        
        console.log(`✅ Loaded statistics for ${entries.length} events`);
        
      } else if (selectedTab === 'clubs') {
        console.log('🏛️ Fetching club statistics using unified service...');
        // Fetch club users
        const clubsSnapshot = await firebase.firestore()
          .collection('users')
          .where('userType', '==', 'club')
          .limit(100)
          .get();
        
        console.log(`🏛️ Found ${clubsSnapshot.docs.length} clubs`);
        
        // Use unified statistics service for each club
        for (const doc of clubsSnapshot.docs) {
          try {
            const clubData = doc.data();
            
            // Get comprehensive club statistics from unified service
            const clubStats = await unifiedStatisticsService.getClubStatistics(doc.id);
            
            entries.push({
              id: doc.id,
              name: clubData.displayName || clubData.name || 'İsimsiz Kulüp',
              avatar: clubData.profileImage || clubData.avatar,
              university: clubData.university,
              department: clubData.department,
              username: clubData.username,
              likes: clubStats.likes,
              comments: clubStats.comments,
              participations: clubStats.eventsOrganized, // For clubs, participations = events organized
              members: clubStats.memberCount,
              followers: clubData.followers?.length || 0, // Real-time from club document
              createdAt: clubData.createdAt
            });
          } catch (clubError) {
            console.warn(`⚠️ Error loading statistics for club ${doc.id}:`, clubError);
            // Add club with default stats on error
            const clubData = doc.data();
            entries.push({
              id: doc.id,
              name: clubData.displayName || clubData.name || 'İsimsiz Kulüp',
              avatar: clubData.profileImage || clubData.avatar,
              university: clubData.university,
              department: clubData.department,
              username: clubData.username,
              likes: 0,
              comments: 0,
              participations: 0,
              members: 0,
              followers: clubData.followers?.length || 0,
              createdAt: clubData.createdAt
            });
          }
        }
        
        console.log(`✅ Loaded statistics for ${entries.length} clubs with unified service`);
      }
      
      console.log(`📊 Total entries loaded: ${entries.length}`);
      setData(entries);
      setFilteredData(entries);
      
    } catch (error) {
      console.error('❌ Error fetching statistics data:', error);
      Alert.alert('Hata', 'İstatistikler yüklenirken bir hata oluştu.');
      setData([]);
      setFilteredData([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle tab change 
                   eventData.image || eventData.eventImage || eventData.cover || 
                   eventData.photo || null,
            username: eventData.organizer?.name || eventData.organizerName || eventData.creatorName,
            likes: actualLikes,
            comments: actualComments,
            participations: actualParticipations,
            clubs: eventData.clubId ? 1 : 0,
            createdAt: eventData.createdAt,
            // Additional event details
            description: eventData.description || eventData.shortDescription || '',
            clubId: eventData.clubId || eventData.organizerId,
            // Improved club name resolution
            clubName: clubData?.displayName || clubData?.name || clubData?.clubName || 
                     eventData.clubName || eventData.organizer?.displayName || 
                     eventData.organizer?.name || eventData.organizerName || 'Bilinmeyen Kulüp',
            // Improved club username resolution
            clubUsername: clubData?.username || clubData?.userName || 
                         eventData.clubUsername || eventData.organizer?.username || null,
            // Improved club avatar resolution
            clubAvatar: clubData?.profileImage || clubData?.avatar || clubData?.photoURL || 
                       eventData.clubAvatar || eventData.organizer?.profileImage || 
                       eventData.organizer?.avatar || null,
            university: clubData?.university || eventData.university || eventData.organizer?.university,
            startDate: eventData.startDate || eventData.date,
            location: eventData.location || eventData.venue
          });
        }
        console.log(`🎉 Total events processed: ${entries.length}`);
      } else if (selectedTab === 'clubs') {
        console.log('🏛️ Fetching club statistics...');
        // Fetch clubs and their statistics
        const clubsSnapshot = await firebase.firestore()
          .collection('users')
          .where('userType', '==', 'club')
          .limit(100)
          .get();
        
        console.log(`🏛️ Found ${clubsSnapshot.docs.length} clubs`);
        
        for (const doc of clubsSnapshot.docs) {
          const clubData = doc.data();
          
          // Count events organized by this club and followers
          const [clubEventsSnapshot, followersSnapshot] = await Promise.all([
            firebase.firestore()
              .collection('events')
              .where('organizer.id', '==', doc.id)
              .get(),
            // Count club followers
            firebase.firestore()
              .collection('clubFollowers')
              .where('clubId', '==', doc.id)
              .get()
          ]);
          
          // Count total likes on club events
          let totalLikes = 0;
          let totalComments = 0;
          let totalParticipations = 0;
          
          for (const eventDoc of clubEventsSnapshot.docs) {
            const eventData = eventDoc.data();
            // Calculate actual statistics from collections for more accurate data
            const [eventLikesSnapshot, eventCommentsSnapshot, eventAttendeesSnapshot] = await Promise.all([
              firebase.firestore().collection('eventLikes').where('eventId', '==', eventDoc.id).get(),
              firebase.firestore().collection('eventComments').where('eventId', '==', eventDoc.id).get(),
              firebase.firestore().collection('eventAttendees').where('eventId', '==', eventDoc.id).get()
            ]);
            
            totalLikes += eventLikesSnapshot.docs.length;
            totalComments += eventCommentsSnapshot.docs.length;
            totalParticipations += eventAttendeesSnapshot.docs.length;
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
            members: clubData.memberCount || 0,
            followers: followersSnapshot.docs.length
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
          case 'followers':
            return (b.followers || 0) - (a.followers || 0);
          case 'following':
            return (b.following || 0) - (a.following || 0);
          case 'clubs':
            return (b.clubs || 0) - (a.clubs || 0);
          default:
            return b.likes - a.likes;
        }
      });
      
      console.log(`✅ StatisticsLeaderboard: Setting ${entries.length} ${selectedTab} entries`);
      setData(entries);
      setImageErrors({}); // Clear image errors on data refresh
    } catch (error) {
      console.error('❌ Error fetching statistics:', error);
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
    setSearchQuery(''); // Clear search when changing tabs
  };

  // Search functionality
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setFilteredData(data);
      return;
    }
    
    const filtered = data.filter((item) => {
      const name = item.name?.toLowerCase() || '';
      const username = item.username?.toLowerCase() || '';
      const university = item.university?.toLowerCase() || '';
      const department = item.department?.toLowerCase() || '';
      const searchLower = query.toLowerCase();
      
      return (
        name.includes(searchLower) ||
        username.includes(searchLower) ||
        university.includes(searchLower) ||
        department.includes(searchLower)
      );
    });
    
    setFilteredData(filtered);
  };

  // Toggle search visibility
  const toggleSearch = () => {
    setSearchVisible(!searchVisible);
    if (searchVisible) {
      setSearchQuery('');
      setFilteredData(data);
    }
  };

  // Update filtered data when main data changes
  useEffect(() => {
    if (searchQuery.trim()) {
      handleSearch(searchQuery);
    } else {
      setFilteredData(data);
    }
  }, [data]);
  
  // Sort change handler
  const handleSortChange = (sort: 'likes' | 'comments' | 'participations' | 'members' | 'followers' | 'following' | 'clubs') => {
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
      // For events, we need to pass the event ID to the modal
      setSelectedEvent({ id: item.id });
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
      case 'followers':
        return 'account-heart';
      case 'following':
        return 'account-plus';
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
      case 'followers':
        return 'Takipçi';
      case 'following':
        return 'Takip';
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

    // Special rendering for events
    if (selectedTab === 'events') {
      return (
        <TouchableOpacity
          style={[
            styles.itemContainer,
            styles.eventItemContainer,
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

          {/* Event Cover Image */}
          <View style={styles.eventImageContainer}>
            {item.avatar && !imageErrors[item.id] ? (
              <Image 
                source={{ uri: item.avatar }} 
                style={styles.eventImage}
                onError={(error) => {
                  console.log('🚨 Event image loading failed:', item.name, 'URI:', item.avatar);
                  console.log('🚨 Error details:', error.nativeEvent);
                  setImageErrors(prev => ({ ...prev, [item.id]: true }));
                }}
                onLoad={() => {
                  console.log('✅ Event image loaded successfully:', item.name);
                  setImageErrors(prev => ({ ...prev, [item.id]: false }));
                }}
                onLoadStart={() => {
                  console.log('🔄 Event image loading started:', item.name);
                }}
              />
            ) : (
              <View style={[styles.eventImage, styles.eventImagePlaceholder]}>
                <Image
                  source={require('../../../assets/universe_logo.png')}
                  style={styles.defaultEventImage}
                  resizeMode="contain"
                />
                {item.avatar && imageErrors[item.id] && (
                  <View style={styles.errorOverlay}>
                    <Text style={styles.errorText}>
                      Resim yüklenemedi
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Event Content */}
          <View style={styles.eventContentContainer}>
            
            {/* Event Title */}
            <Text style={[
              styles.eventTitle,
              isTopThree && styles.topThreeEventTitle
            ]} numberOfLines={2}>
              {item.name}
            </Text>

            {/* Club Info Row - Small - Right under title */}
            <View style={styles.clubInfoRowSmall}>
              {/* Small Club Avatar */}
              {item.clubAvatar && !imageErrors[`club_${item.clubId}`] ? (
                <Image 
                  source={{ uri: item.clubAvatar }} 
                  style={styles.clubAvatarSmall}
                  onError={(error) => {
                    console.log('🚨 Club avatar loading failed:', item.clubName, 'URI:', item.clubAvatar);
                    setImageErrors(prev => ({ ...prev, [`club_${item.clubId}`]: true }));
                  }}
                  onLoad={() => {
                    setImageErrors(prev => ({ ...prev, [`club_${item.clubId}`]: false }));
                  }}
                />
              ) : (
                <View style={styles.clubAvatarSmall}>
                  <MaterialCommunityIcons name="account-group" size={14} color="#9ca3af" />
                </View>
              )}
              
              {/* Small Club Details */}
              <View style={styles.clubDetailsSmall}>
                <Text style={styles.clubInfoText} numberOfLines={1}>
                  {item.clubName || 'Bilinmeyen Kulüp'}
                </Text>
                
                {item.clubUsername && (
                  <Text style={styles.clubUsernameSmall} numberOfLines={1}>
                    @{item.clubUsername}
                  </Text>
                )}
                
                {item.university && (
                  <Text style={styles.clubUniversitySmall}>
                    📍 {getUniversityName(item.university)}
                  </Text>
                )}
              </View>
            </View>
            
          </View>

          {/* Event Statistics */}
          <View style={styles.eventStatisticsContainer}>
            <View style={styles.eventStatsRow}>
              <View style={styles.eventStatItem}>
                <MaterialCommunityIcons name="heart" size={14} color="#e91e63" />
                <Text style={styles.eventStatText}>{item.likes}</Text>
              </View>
              
              <View style={styles.eventStatItem}>
                <MaterialCommunityIcons name="comment" size={14} color="#2196f3" />
                <Text style={styles.eventStatText}>{item.comments}</Text>
              </View>
              
              <View style={styles.eventStatItem}>
                <MaterialCommunityIcons name="account-check" size={14} color="#4caf50" />
                <Text style={styles.eventStatText}>{item.participations}</Text>
              </View>
            </View>
          </View>

        </TouchableOpacity>
      );
    }

    // Default rendering for users and clubs
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
            userId={item.id}
            userName={item.name}
            profileImage={item.avatar}
            size={isTopThree ? 50 : 40}
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
        </View>

        {/* Statistics - positioned to align with rank */}
        <View style={styles.statisticsContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.statsScrollContainer}
          >
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="heart" size={12} color="#e91e63" />
                <Text style={styles.statText}>{item.likes}</Text>
              </View>
              
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="comment" size={12} color="#2196f3" />
                <Text style={styles.statText}>{item.comments}</Text>
              </View>
              
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="account-check" size={12} color="#4caf50" />
                <Text style={styles.statText}>{item.participations}</Text>
              </View>
              
              {selectedTab === 'users' && item.followers !== undefined && (
                <View style={styles.statItem}>
                  <MaterialCommunityIcons name="account-heart" size={12} color="#9c27b0" />
                  <Text style={styles.statText}>{item.followers}</Text>
                </View>
              )}
              
              {selectedTab === 'users' && item.following !== undefined && (
                <View style={styles.statItem}>
                  <MaterialCommunityIcons name="account-plus" size={12} color="#607d8b" />
                  <Text style={styles.statText}>{item.following}</Text>
                </View>
              )}
              
              {selectedTab === 'users' && item.clubs !== undefined && (
                <View style={styles.statItem}>
                  <MaterialCommunityIcons name="account-multiple" size={12} color="#ff5722" />
                  <Text style={styles.statText}>{item.clubs}</Text>
                </View>
              )}
              
              {selectedTab === 'clubs' && item.members !== undefined && (
                <View style={styles.statItem}>
                  <MaterialCommunityIcons name="account-group" size={12} color="#ff9800" />
                  <Text style={styles.statText}>{item.members}</Text>
                </View>
              )}
              
              {selectedTab === 'clubs' && item.followers !== undefined && (
                <View style={styles.statItem}>
                  <MaterialCommunityIcons name="account-heart" size={12} color="#9c27b0" />
                  <Text style={styles.statText}>{item.followers}</Text>
                </View>
              )}
            </View>
          </ScrollView>
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
      
      {/* Modern Header with Search */}
      <View style={styles.headerSurface}>
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            {/* Back Button */}
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => navigation.goBack()}
            >
              <MaterialCommunityIcons 
                name="arrow-left" 
                size={24} 
                color={theme.colors.primary} 
              />
            </TouchableOpacity>
            
            <View style={styles.headerTitleContainer}>
              <MaterialCommunityIcons 
                name="trophy-variant" 
                size={28} 
                color={theme.colors.primary} 
              />
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle}>Liderlik Tablosu</Text>
                <Text style={styles.headerSubtitle}>İstatistiklere dayalı sıralama</Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.searchButton} 
              onPress={toggleSearch}
            >
              <MaterialCommunityIcons 
                name={searchVisible ? "close" : "magnify"} 
                size={24} 
                color={theme.colors.primary} 
              />
            </TouchableOpacity>
          </View>
          
          {/* Search Bar */}
          {searchVisible && (
            <View style={styles.searchContainer}>
              <Searchbar
                placeholder={
                  selectedTab === 'users' ? "Öğrenci ara..." :
                  selectedTab === 'events' ? "Etkinlik ara..." :
                  "Kulüp ara..."
                }
                value={searchQuery}
                onChangeText={handleSearch}
                style={styles.searchBar}
                inputStyle={styles.searchInput}
                iconColor={theme.colors.primary}
              />
            </View>
          )}
        </View>
      </View>

      {/* Modern Tab Navigation */}
      <View style={styles.tabSurface}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScrollContent}
        >
          {TABS.map((tab, index) => (
            <TouchableOpacity
              key={tab.type}
              style={[
                styles.modernTab,
                selectedTab === tab.type && styles.modernTabActive,
                index === 0 && styles.firstTab,
                index === TABS.length - 1 && styles.lastTab
              ]}
              onPress={() => handleTabChange(tab.type)}
              activeOpacity={0.7}
            >
              {selectedTab === tab.type ? (
                <LinearGradient
                  colors={tab.gradient}
                  style={styles.modernTabGradient}
                >
                  <MaterialCommunityIcons
                    name={tab.icon as any}
                    size={20}
                    color="#fff"
                  />
                  <Text style={styles.modernTabTextActive}>
                    {tab.title}
                  </Text>
                </LinearGradient>
              ) : (
                <View style={styles.modernTabContent}>
                  <MaterialCommunityIcons
                    name={tab.icon as any}
                    size={20}
                    color="#666"
                  />
                  <Text style={styles.modernTabText}>
                    {tab.title}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Enhanced Sort Options */}
      <View style={styles.sortSurface}>
        {renderSortButtons()}
      </View>

      {/* Content */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>İstatistikler yükleniyor...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredData}
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
          contentContainerStyle={filteredData.length === 0 ? styles.emptyContentContainer : undefined}
        />
      )}

      {/* Event Card Modal */}
      {selectedEvent && (
        <EventCardModal
          visible={eventCardVisible}
          eventId={selectedEvent.id}
          onDismiss={() => {
            setEventCardVisible(false);
            setSelectedEvent(null);
          }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa'
  },
  
  // Modern Header Styles
  headerSurface: {
    backgroundColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e4e7'
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingVertical: 16
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  headerTextContainer: {
    marginLeft: 12
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a202c'
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#718096',
    marginTop: 2
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f7fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  searchContainer: {
    marginTop: 16
  },
  searchBar: {
    elevation: 2,
    backgroundColor: '#fff',
    borderRadius: 12
  },
  searchInput: {
    fontSize: 16
  },

  // Modern Tab Navigation Styles
  tabSurface: {
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    paddingVertical: 12
  },
  tabScrollContent: {
    paddingHorizontal: 16
  },
  modernTab: {
    marginRight: 12,
    borderRadius: 16,
    overflow: 'hidden',
    minWidth: 100
  },
  modernTabActive: {
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4
  },
  firstTab: {
    marginLeft: 0
  },
  lastTab: {
    marginRight: 16
  },
  modernTabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16
  },
  modernTabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  modernTabTextActive: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#fff'
  },
  modernTabText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#718096'
  },

  // Enhanced Sort Options
  sortSurface: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 1
  },
  sortContainer: {
    paddingHorizontal: 16
  },
  sortChip: {
    marginRight: 10,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    height: 36
  },
  sortChipSelected: {
    backgroundColor: '#4299e1',
    borderColor: '#4299e1',
    elevation: 2
  },
  sortChipText: {
    fontSize: 13,
    color: '#718096',
    fontWeight: '500'
  },
  sortChipTextSelected: {
    color: '#fff',
    fontWeight: '600'
  },

  // Loading and Empty States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#718096',
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
    color: '#a0aec0',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#4299e1',
    borderRadius: 12,
    paddingHorizontal: 24
  },

  // Enhanced Item Styles
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 28,  // Even more bottom padding
    paddingHorizontal: 20,  // More horizontal padding too
    marginHorizontal: 16,
    marginVertical: 4,
    minHeight: 140,  // Much bigger cards
    backgroundColor: '#fff',
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#f7fafc'
  },
  currentUserItem: {
    borderColor: '#4299e1',
    borderWidth: 2,
    backgroundColor: '#f7faff'
  },
  rankContainer: {
    width: 44,
    alignItems: 'center',
    marginRight: 16
  },
  rankEmoji: {
    fontSize: 28,
    fontWeight: 'bold'
  },
  rankNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#718096'
  },
  avatarContainer: {
    marginRight: 12
  },
  contentContainer: {
    flex: 1
  },
  statisticsContainer: {
    position: 'absolute',
    bottom: 8,  // Slightly closer to bottom
    left: 64,  // Slightly more left alignment with bigger padding
    right: 20,  // Match the horizontal padding
    flexDirection: 'row'
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 6  // More space below username
  },
  topThreeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a202c'
  },
  university: {
    fontSize: 13,
    color: '#718096',
    marginBottom: 8,  // More space below university
    fontWeight: '500'
  },
  department: {
    fontSize: 12,
    color: '#a0aec0',
    marginBottom: 4
  },
  username: {
    fontSize: 11,
    color: '#4299e1',
    marginBottom: 4,
    fontWeight: '500'
  },
  statsScrollContainer: {
    maxHeight: 40,
    flex: 1
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    minWidth: 40
  },
  statText: {
    fontSize: 10,
    color: '#4a5568',
    marginLeft: 3,
    fontWeight: '600'
  },

  // Legacy styles (keeping for compatibility)
  header: {
    padding: 20,
    backgroundColor: '#fff',
    alignItems: 'center'
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

  // Event-specific styles
  eventItemContainer: {
    minHeight: 160,
    paddingBottom: 16,
  },
  eventImageContainer: {
    width: 85,
    height: 85,
    borderRadius: 12,
    marginRight: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  eventImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  eventImagePlaceholder: {
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultEventImage: {
    width: '80%',
    height: '80%',
    opacity: 0.6,
  },
  errorOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  errorText: {
    fontSize: 8,
    color: '#ffffff',
    textAlign: 'center',
  },
  eventContentContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingRight: 8,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a202c',
    marginBottom: 2,
    lineHeight: 20,
  },
  topThreeEventTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  eventDescription: {
    fontSize: 13,
    color: '#4a5568',
    marginBottom: 8,
    lineHeight: 18,
  },
  clubInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  clubInfoRowSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingVertical: 4,
  },
  clubAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  clubAvatarSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clubDetails: {
    flex: 1,
  },
  clubDetailsSmall: {
    flex: 1,
  },
  clubName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 2,
  },
  clubInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 4,
  },
  clubUsername: {
    fontSize: 11,
    color: '#718096',
    marginBottom: 2,
  },
  clubUsernameSmall: {
    fontSize: 12,
    color: '#718096',
    marginBottom: 4,
  },
  clubUniversity: {
    fontSize: 11,
    color: '#a0aec0',
  },
  clubUniversitySmall: {
    fontSize: 11,
    color: '#718096',
    lineHeight: 15,
    flexWrap: 'wrap',
  },
  eventDetailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  eventDetail: {
    fontSize: 11,
    color: '#718096',
    marginRight: 12,
    marginBottom: 2,
  },
  eventStatisticsContainer: {
    position: 'absolute',
    bottom: 16,
    right: 16,
  },
  eventStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  eventStatText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4a5568',
    marginLeft: 4,
  }
});

export default StatisticsLeaderboardScreen;
