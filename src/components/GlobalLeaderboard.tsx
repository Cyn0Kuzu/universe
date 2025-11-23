import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  RefreshControl, 
  Image,
  ActivityIndicator,
  Alert,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getFirebaseCompatSync } from '../firebase/compat';
import { centralizedRankingService } from '../services/centralizedRankingService';
import { UserStatsService, userStatsService } from '../services';
// import { RealTimeClubScoresService } from '../services'; // Module not found - commented out
import { UniversalAvatar } from './common';
import { useUserAvatar } from '../hooks/useUserAvatar';
import ClubScoreFixService from '../services/clubScoreFixService';
import unifiedStatisticsService from '../services/unifiedStatisticsService';

const firebase = getFirebaseCompatSync();

const { width } = Dimensions.get('window');

// Types for this component
interface LeaderboardEntry {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  avatar?: string;
  university?: string;
  department?: string;
  totalScore: number;
  monthlyScore: number;
  weeklyScore: number;
  level: number;
  rank: number;
  eventCount?: number;
  trend?: number;
  lastActivity: any; // firebase.firestore.Timestamp
  userHandle?: string;
}

interface LeaderboardFilter {
  university?: string;
  department?: string;
  timeframe?: 'daily' | 'weekly' | 'monthly' | 'all';
  limit?: number;
}

interface GlobalLeaderboardProps {
  userId?: string;
  category?: string;
  university?: string;
  department?: string;
  timeframe?: 'week' | 'month' | 'year' | 'all_time';
  limit?: number;
  showUserPosition?: boolean;
  userType?: 'student' | 'club';
  onUserPress?: (userId: string) => void;
  style?: any;
}

interface LeaderboardState {
  entries: LeaderboardEntry[];
  userPosition: LeaderboardEntry | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  filter: LeaderboardFilter;
}

export const GlobalLeaderboard: React.FC<GlobalLeaderboardProps> = ({
  userId,
  category = 'overall',
  university,
  department,
  timeframe = 'all_time',
  limit = 50,
  showUserPosition = true,
  userType = 'student',
  onUserPress,
  style
}) => {
  // Kulüp puanlarını gerçek verilerden hesapla
  const recalculateClubPoints = useCallback(async (clubId: string): Promise<number> => {
    let totalPoints = 0;
    
    try {
      const db = getFirebaseCompatSync().firestore();
      
      // Etkinlikler (50 puan each)
      const eventsQuery = await db.collection('events').where('clubId', '==', clubId).get();
      totalPoints += eventsQuery.size * 50;
      
      // Üyeler (10 puan each)
      const membersQuery = await db.collection('clubMembers').where('clubId', '==', clubId).get();
      totalPoints += membersQuery.size * 10;
      
      // Etkinlik etkileşimleri
      for (const eventDoc of eventsQuery.docs) {
        const eventId = eventDoc.id;
        
        // Beğeniler (2 puan each)
        const likesQuery = await db.collection('eventLikes').where('eventId', '==', eventId).get();
        totalPoints += likesQuery.size * 2;
        
        // Yorumlar (5 puan each)
        const commentsQuery = await db.collection('events').doc(eventId).collection('comments').get();
        totalPoints += commentsQuery.size * 5;
        
        // Katılımcılar (3 puan each)
        const attendeesQuery = await db.collection('eventAttendees').where('eventId', '==', eventId).get();
        totalPoints += attendeesQuery.size * 3;
      }
      
      console.log(`📊 Recalculated club points for ${clubId}: ${totalPoints}`);
      return totalPoints;
      
    } catch (error) {
      console.error(`❌ Error recalculating club points for ${clubId}:`, error);
      return 0;
    }
  }, []);

  // Map timeframe values to service expected format
  const mapTimeframe = (tf: string): 'daily' | 'weekly' | 'monthly' | 'all' => {
    switch (tf) {
      case 'weekly': return 'weekly';
      case 'monthly': return 'monthly';
      case 'daily': return 'daily';
      case 'all': return 'all';
      // Legacy mappings
      case 'week': return 'weekly';
      case 'month': return 'monthly';
      case 'year': return 'all';
      case 'all_time': return 'all';
      default: return 'weekly';
    }
  };

  const [state, setState] = useState<LeaderboardState>({
    entries: [],
    userPosition: null,
    loading: true,
    refreshing: false,
    error: null,
    filter: {
      university,
      department,
      timeframe: mapTimeframe(timeframe),
      limit
    }
  });

  // Memoized filter to prevent unnecessary re-renders
  const currentFilter = useMemo(() => {

    return {
      university,
      department,
      timeframe: mapTimeframe(timeframe),
      limit
    };
  }, [university, department, timeframe, limit]);

  /**
   * 📊 Load leaderboard data with data validation and correction
   */
  const loadLeaderboard = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setState(prev => ({ ...prev, refreshing: true, error: null }));
      } else {
        setState(prev => ({ ...prev, loading: true, error: null }));
      }

      console.log('🔄 GlobalLeaderboard: Loading leaderboard for userType:', userType);

      let entries: LeaderboardEntry[] = [];

      if (userType === 'club') {
        // ⭐ Kulüpler için clubScores koleksiyonundan veri al ve data validation uygula
        console.log('🏢 Loading clubs with data validation...');
        
        // Önce club score tutarsızlıklarını düzelt
        try {
          console.log('� Checking club score consistency...');
          
          const clubUsersSnapshot = await getFirebaseCompatSync().firestore()
            .collection('users')
            .where('userType', '==', 'club')
            .limit(10) // İlk 10 kulüp için hızlı fix
            .get();
          
          // Her kulüp için preventive fix uygula
          for (const userDoc of clubUsersSnapshot.docs) {
            await ClubScoreFixService.preventScoreReset(userDoc.id);
          }
          
          console.log('✅ GlobalLeaderboard: Preventive fixes applied');
        } catch (fixError) {
          console.error('⚠️ GlobalLeaderboard: Fix error (continuing):', fixError);
        }
        
        // clubScores koleksiyonundan veri al
        const clubScoresSnapshot = await getFirebaseCompatSync().firestore()
          .collection('clubScores')
          .orderBy('totalPoints', 'desc')
          .limit(currentFilter.limit || 50)
          .get();
        
        const clubScores = clubScoresSnapshot.docs.map((doc, index) => ({
          clubId: doc.id,
          totalPoints: doc.data().totalPoints || 0,
          rank: index + 1,
          ...doc.data()
        }));
        
        entries = await Promise.all(
          clubScores.map(async (scoreData: any) => {
            // User bilgilerini getir
            const userDoc = await getFirebaseCompatSync().firestore().collection('users').doc(scoreData.clubId).get();
            const userData = userDoc?.data();

            // Veri doğrulaması ve düzeltme
            let validatedPoints = scoreData.totalPoints;
            if (validatedPoints < 50) {
              // Düşük puan tespit edildi, gerçek verilerden hesapla
              console.log(`⚠️ Low club points detected for ${scoreData.clubId}: ${validatedPoints}, recalculating...`);
              validatedPoints = await recalculateClubPoints(scoreData.clubId);
              
              // Düzeltilmiş puanı kaydet
              try {
                await getFirebaseCompatSync().firestore().collection('clubScores').doc(scoreData.clubId).update({
                  totalPoints: validatedPoints,
                  lastRecalculated: getFirebaseCompatSync().firestore.FieldValue.serverTimestamp()
                });
                console.log(`✅ Updated club points for ${scoreData.clubId}: ${validatedPoints}`);
              } catch (updateError) {
                console.error('❌ Error updating club score:', updateError);
              }
            }

            return {
              id: scoreData.clubId,
              userId: scoreData.clubId,
              userName: userData?.username || userData?.displayName || userData?.clubName || 'Unknown Club',
              userAvatar: userData?.profilePicture || userData?.avatar,
              university: userData?.university || 'Unknown University',
              department: userData?.department || 'Unknown Department',
              totalScore: validatedPoints,
              monthlyScore: validatedPoints, // Club'lar için aynı değer
              weeklyScore: validatedPoints, // Club'lar için aynı değer
              level: Math.max(1, Math.floor(validatedPoints / 1000) + 1),
              rank: scoreData.rank || 1,
              eventCount: scoreData.eventCount || 0, // Etkinlik sayısı varsa kullan
              lastActivity: firebase.firestore.Timestamp.now()
            } as LeaderboardEntry;
          })
        );
      } else {
        // Öğrenciler için merkezi ranking servisini kullan
        console.log('🎓 Loading students from central ranking service...');
        const centralLeaderboard = await centralizedRankingService.getLeaderboard({
          limit: currentFilter.limit,
          userType: userType || 'student'
        });

        // Central service'ten gelen veriyi GlobalLeaderboard formatına çevir
        entries = await Promise.all(
          centralLeaderboard.map(async (rankData) => {
            // User bilgilerini getir
            const userDoc = await getFirebaseCompatSync().firestore().collection('users').doc(rankData.userId).get();
            const userData: any = userDoc?.data();

            const displayName = (userData?.firstName && userData?.lastName)
              ? `${userData.firstName} ${userData.lastName}`
              : userData?.displayName || userData?.name || userData?.username || userData?.userName || 'Unknown';
            const handle = userData?.username || userData?.userName || undefined;

            return {
              id: rankData.userId,
              userId: rankData.userId,
              // UI'da gösterilen isim: her zaman en güncel görünen ad
              userName: displayName,
              // Gerekirse ileride handle'ı da göstermek için sakla
              userHandle: handle,
              userAvatar: userData?.profilePicture || userData?.profileImage || userData?.avatar || userData?.photoURL,
              university: userData?.university || 'Unknown University',
              department: userData?.department || 'Unknown Department',
              totalScore: rankData.totalPoints,
              monthlyScore: rankData.monthlyPoints,
              weeklyScore: rankData.weeklyPoints,
              level: rankData.level,
              rank: rankData.rank,
              eventCount: (rankData as any).eventCount || 0, // Etkinlik sayısı varsa kullan
              lastActivity: firebase.firestore.Timestamp.now()
            } as LeaderboardEntry;
          })
        );
      }

      // Load user position if requested and userId provided
      let userPosition: LeaderboardEntry | null = null;
      if (showUserPosition && userId) {
        if (userType === 'club') {
          // ⭐ Kulüp için basic bilgileri al
          const userDoc = await getFirebaseCompatSync().firestore().collection('users').doc(userId).get();
          const userData = userDoc?.data();
          
          if (userData) {
            const displayName = (userData?.firstName && userData?.lastName)
              ? `${userData.firstName} ${userData.lastName}`
              : userData?.displayName || userData?.clubName || userData?.username || userData?.userName || 'Unknown Club';
            userPosition = {
              id: userId,
              userId: userId,
              userName: displayName,
              userHandle: userData?.username || userData?.userName,
              userAvatar: userData?.profilePicture || userData?.profileImage || userData?.avatar,
              university: userData?.university || 'Unknown University',
              department: userData?.department || 'Unknown Department',
              totalScore: userData?.totalScore || 0,
              monthlyScore: userData?.monthlyScore || 0,
              weeklyScore: userData?.weeklyScore || 0,
              level: Math.max(1, Math.floor((userData?.totalScore || 0) / 1000) + 1),
              rank: 0,
              eventCount: 0,
              lastActivity: firebase.firestore.Timestamp.now()
            } as LeaderboardEntry;
          }
        } else {
          // Öğrenci için merkezi servisten pozisyon al
          const userRankData = await centralizedRankingService.getUserRank(userId);
          if (userRankData) {
            const userDoc = await getFirebaseCompatSync().firestore().collection('users').doc(userId).get();
            const userData: any = userDoc?.data();
            const displayName = (userData?.firstName && userData?.lastName)
              ? `${userData.firstName} ${userData.lastName}`
              : userData?.displayName || userData?.name || userData?.username || userData?.userName || 'Unknown';
            
            userPosition = {
              id: userId,
              userId: userId,
              userName: displayName,
              userHandle: userData?.username || userData?.userName,
              userAvatar: userData?.profilePicture || userData?.profileImage || userData?.avatar || userData?.photoURL,
              university: userData?.university || 'Unknown University',
              department: userData?.department || 'Unknown Department',
              totalScore: userRankData.totalPoints,
              monthlyScore: userRankData.monthlyPoints,
              weeklyScore: userRankData.weeklyPoints,
              level: userRankData.level,
              rank: userRankData.rank,
              eventCount: 0,
              lastActivity: firebase.firestore.Timestamp.now()
            } as LeaderboardEntry;
          }
        }
      }

      console.log('✅ GlobalLeaderboard: Loaded', entries.length, 'entries for', userType);

      setState(prev => ({
        ...prev,
        entries,
        userPosition,
        loading: false,
        refreshing: false,
        filter: currentFilter
      }));

    } catch (error) {
      console.error('❌ Error loading leaderboard:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        refreshing: false,
        error: 'Sıralama yüklenirken hata oluştu'
      }));
    }
  }, [currentFilter, userId, showUserPosition, userType]);

  /**
   * 🔄 Refresh leaderboard
   */
  const handleRefresh = useCallback(() => {
    loadLeaderboard(true);
  }, [loadLeaderboard]);

  /**
   * 👤 Handle user press
   */
  const handleUserPress = useCallback((entry: LeaderboardEntry) => {
    if (onUserPress) {
      onUserPress(entry.userId);
    }
  }, [onUserPress]);

  // Load data on mount and filter changes
  useEffect(() => {
    loadLeaderboard();
    
    // Real-time listener for userScores changes
    const unsubscribe = getFirebaseCompatSync().firestore()
      .collection('userScores')
      .where('userType', '==', userType || 'student')
      .onSnapshot(
        (snapshot) => {
          console.log('🔄 GlobalLeaderboard: Real-time userScores update detected');
          // Reload leaderboard when scores change
          if (!snapshot.metadata.fromCache) {
            loadLeaderboard();
          }
        },
        (error) => {
          console.error('❌ GlobalLeaderboard: Real-time listener error:', error);
        }
      );
    
    // Profil bilgilerindeki değişiklikleri yakala ve yenile
    const unsubscribeUsers = getFirebaseCompatSync().firestore()
      .collection('users')
      .where('userType', '==', userType || 'student')
      .onSnapshot(
        (snapshot) => {
          console.log('🔄 GlobalLeaderboard: Real-time users update detected');
          if (!snapshot.metadata.fromCache) {
            loadLeaderboard();
          }
        },
        (error) => {
          console.error('❌ GlobalLeaderboard: Users listener error:', error);
        }
      );
    
    return () => {
      unsubscribe();
      unsubscribeUsers();
    };
  }, [loadLeaderboard, userType]);

  /**
   * 🏆 Render rank badge
   */
  const renderRankBadge = (rank: number) => {
    let rankColor = '#8E8E93';
    let rankIcon = 'trophy';
    
    if (rank === 1) {
      rankColor = '#FFD700'; // Gold
      rankIcon = 'trophy';
    } else if (rank === 2) {
      rankColor = '#C0C0C0'; // Silver
      rankIcon = 'trophy';
    } else if (rank === 3) {
      rankColor = '#CD7F32'; // Bronze
      rankIcon = 'trophy';
    }

    return (
      <View style={[styles.rankBadge, { backgroundColor: rankColor }]}>
        {rank <= 3 ? (
          <Ionicons name={rankIcon as any} size={20} color="white" />
        ) : (
          <Text style={styles.rankNumber}>{rank}</Text>
        )}
      </View>
    );
  };

  /**
   * 📊 Render level badge
   */
  const renderLevelBadge = (level: number) => {
    const levelColor = level >= 8 ? '#FF6B35' : level >= 5 ? '#4CAF50' : '#2196F3';
    
    return (
      <View style={[styles.levelBadge, { backgroundColor: levelColor }]}>
        <Text style={styles.levelText}>L{level}</Text>
      </View>
    );
  };

  /**
   * 📈 Render stats row
   */
  const renderStatsRow = (entry: LeaderboardEntry) => (
    <View style={styles.statsRow}>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{entry.totalScore.toLocaleString()}</Text>
        <Text style={styles.statLabel}>Puan</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{entry.eventCount}</Text>
        <Text style={styles.statLabel}>Etkinlik</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{entry.level}</Text>
        <Text style={styles.statLabel}>Seviye</Text>
      </View>
    </View>
  );

  /**
   * 👤 Render leaderboard entry
   */
  const LeaderboardRow: React.FC<{ item: LeaderboardEntry; index: number }> = ({ item }) => {
    const isCurrentUser = userId === item.userId;
    const isTopThree = item.rank <= 3;
    const { avatarData } = useUserAvatar(item.userId);
    const liveUserName = avatarData?.displayName || item.userName;
    const liveProfileImage = avatarData?.profileImage || item.userAvatar;
    const liveUniversity = avatarData?.university || item.university;
    const liveDepartment = avatarData?.department || item.department;

    return (
      <TouchableOpacity
        style={[
          styles.entryContainer,
          isCurrentUser && styles.currentUserEntry,
          isTopThree && styles.topThreeEntry
        ]}
        onPress={() => handleUserPress(item)}
        activeOpacity={0.7}
      >
        {isTopThree && (
          <LinearGradient
            colors={
              item.rank === 1 ? ['#FFD700', '#FFA500'] :
              item.rank === 2 ? ['#C0C0C0', '#A0A0A0'] :
              ['#CD7F32', '#B8860B']
            }
            style={styles.topThreeGradient}
          />
        )}
        
        <View style={styles.entryContent}>
          {/* Rank Badge */}
          {renderRankBadge(item.rank)}
          
          {/* User Avatar */}
          <View style={styles.avatarContainer}>
            <UniversalAvatar
              userId={item.userId}
              userName={liveUserName}
              profileImage={liveProfileImage}
              size={50}
              fallbackIcon="person"
            />
            {renderLevelBadge(item.level)}
          </View>
          
          {/* User Info */}
          <View style={styles.userInfo}>
            <Text style={[styles.userName, isCurrentUser && styles.currentUserName]}>
              {liveUserName}
              {isCurrentUser && ' (Sen)'}
            </Text>
            {/* Live username/handle */}
            {(
              avatarData?.userName ||
              (liveUserName ? liveUserName.toLowerCase().replace(/\s+/g, '') : null)
            ) && (
              <Text style={styles.username}>
                @{avatarData?.userName || liveUserName?.toLowerCase().replace(/\s+/g, '')}
              </Text>
            )}
            
            {liveUniversity && (
              <Text style={styles.university}>{liveUniversity}</Text>
            )}
            
            {liveDepartment && (
              <Text style={styles.department}>{liveDepartment}</Text>
            )}
            
            {renderStatsRow(item)}
          </View>
          
          {/* Trend Indicator */}
          {item.trend && (
            <View style={styles.trendContainer}>
              <Ionicons 
                name={item.trend > 0 ? 'trending-up' : item.trend < 0 ? 'trending-down' : 'remove'}
                size={16}
                color={item.trend > 0 ? '#4CAF50' : item.trend < 0 ? '#F44336' : '#9E9E9E'}
              />
              {item.trend !== 0 && (
                <Text style={[
                  styles.trendText,
                  { color: item.trend > 0 ? '#4CAF50' : '#F44336' }
                ]}>
                  {Math.abs(item.trend)}
                </Text>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  /**
   * 📍 Render user position card (if not in top list)
   */
  const renderUserPosition = () => {
    if (!showUserPosition || !state.userPosition || !userId) return null;
    
    // Don't show if user is already in the visible list
    const userInList = state.entries.some(entry => entry.userId === userId);
    if (userInList) return null;

    return (
      <View style={styles.userPositionCard}>
        <Text style={styles.userPositionTitle}>Senin Sıralaman</Text>
  <LeaderboardRow item={state.userPosition} index={-1} />
      </View>
    );
  };

  /**
   * 📋 Render header
   */
  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>🏆 Global Sıralama</Text>
      <Text style={styles.headerSubtitle}>
        {timeframe === 'week' ? 'Bu Hafta' :
         timeframe === 'month' ? 'Bu Ay' :
         timeframe === 'year' ? 'Bu Yıl' : 'Tüm Zamanlar'}
      </Text>
      {renderUserPosition()}
    </View>
  );

  /**
   * 📋 Render empty state
   */
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="trophy-outline" size={64} color="#E0E0E0" />
      <Text style={styles.emptyTitle}>Henüz Sıralama Yok</Text>
      <Text style={styles.emptySubtitle}>
        İlk puanları topla ve sıralamada yer al!
      </Text>
    </View>
  );

  /**
   * ⚠️ Render error state
   */
  const renderError = () => (
    <View style={styles.errorState}>
      <Ionicons name="warning-outline" size={48} color="#F44336" />
      <Text style={styles.errorTitle}>Hata Oluştu</Text>
      <Text style={styles.errorMessage}>{state.error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={() => loadLeaderboard()}>
        <Text style={styles.retryButtonText}>Tekrar Dene</Text>
      </TouchableOpacity>
    </View>
  );

  if (state.loading) {
    return (
      <View style={[styles.container, styles.loadingContainer, style]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Sıralama yükleniyor...</Text>
      </View>
    );
  }

  if (state.error) {
    return (
      <View style={[styles.container, style]}>
        {renderError()}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <FlatList
        data={state.entries}
  renderItem={({ item, index }) => <LeaderboardRow item={item} index={index} />}
        keyExtractor={(item) => item.userId}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={state.refreshing}
            onRefresh={handleRefresh}
            tintColor="#007AFF"
            title="Yenileniyor..."
          />
        }
        contentContainerStyle={state.entries.length === 0 ? styles.emptyContainer : undefined}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1D1D1F',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 4,
  },
  userPositionCard: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  userPositionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 12,
    textAlign: 'center',
  },
  entryContainer: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  currentUserEntry: {
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  topThreeEntry: {
    marginVertical: 8,
    elevation: 4,
    shadowOpacity: 0.2,
  },
  topThreeGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  entryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  rankBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  defaultAvatar: {
    backgroundColor: '#E5E5E7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    minWidth: 24,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  levelText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 2,
  },
  currentUserName: {
    color: '#007AFF',
  },
  university: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 1,
  },
  department: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 8,
  },
  username: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 1,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  statItem: {
    marginRight: 24,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  trendContainer: {
    alignItems: 'center',
    marginLeft: 12,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F44336',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default GlobalLeaderboard;
