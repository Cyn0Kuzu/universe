import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MemberStats, clubMemberStatsService } from '../services/clubMemberStatsService';

type StatCategory = 'participation' | 'likes' | 'comments';

interface ClubMemberStatsProps {
  clubId: string;
  currentUserId?: string;
  navigation?: any; // Navigation prop for profile navigation
}

interface MemberStatsItemProps {
  member: MemberStats;
  onPress: () => void;
  category: StatCategory;
}

const MemberStatsItem: React.FC<MemberStatsItemProps> = ({ member, onPress, category }) => {
  const getCategoryIcon = () => {
    switch (category) {
      case 'participation': return 'calendar-check';
      case 'likes': return 'heart';
      case 'comments': return 'comment-text';
      default: return 'account';
    }
  };

  const getCategoryColor = () => {
    switch (category) {
      case 'participation': return '#4CAF50';
      case 'likes': return '#FF5722';
      case 'comments': return '#2196F3';
      default: return '#667eea';
    }
  };

  const getCategoryValue = () => {
    switch (category) {
      case 'participation': return member.totalParticipation;
      case 'likes': return member.totalLikes;
      case 'comments': return member.totalComments;
      default: return member.totalParticipation; // Varsayılan olarak katılım göster
    }
  };

  const getCategoryLabel = () => {
    switch (category) {
      case 'participation': return 'Katılım';
      case 'likes': return 'Beğeni';
      case 'comments': return 'Yorum';
      default: return 'Toplam';
    }
  };

  return (
    <TouchableOpacity style={styles.memberItem} onPress={onPress}>
      <View style={[styles.memberRank, { backgroundColor: getCategoryColor() }]}>
        <Text style={styles.rankText}>#{member.rank}</Text>
      </View>
      
      <Image
        source={{
          uri: member.userAvatar || 'https://via.placeholder.com/50x50.png?text=👤'
        }}
        style={styles.memberAvatar}
      />
      
      <View style={styles.memberInfo}>
        {/* İsim ve Kullanıcı Adı */}
        <Text style={styles.memberName} numberOfLines={1}>
          {member.userName}
        </Text>
        <Text style={styles.memberUsername} numberOfLines={1}>
          @{member.userHandle || member.userId}
        </Text>
        
        {/* Üniversite Bilgisi */}
        <Text style={styles.memberUniversity} numberOfLines={1}>
          {member.university || 'Üniversite belirtilmemiş'}
        </Text>
        
        {/* İstatistikler */}
        <View style={styles.allStatsContainer}>
          {/* Katılım */}
          <View style={styles.statItem}>
            <MaterialCommunityIcons 
              name="calendar-check" 
              size={16} 
              color="#4CAF50" 
            />
            <Text style={styles.statValue}>
              {member.totalParticipation}
            </Text>
            <Text style={styles.statLabel}>Katılım</Text>
          </View>
          
          {/* Beğeni */}
          <View style={styles.statItem}>
            <MaterialCommunityIcons 
              name="heart" 
              size={16} 
              color="#FF5722" 
            />
            <Text style={styles.statValue}>
              {member.totalLikes}
            </Text>
            <Text style={styles.statLabel}>Beğeni</Text>
          </View>
          
          {/* Yorum */}
          <View style={styles.statItem}>
            <MaterialCommunityIcons 
              name="comment-text" 
              size={16} 
              color="#2196F3" 
            />
            <Text style={styles.statValue}>
              {member.totalComments}
            </Text>
            <Text style={styles.statLabel}>Yorum</Text>
          </View>
          
          {/* Etkinlik */}
          <View style={styles.statItem}>
            <MaterialCommunityIcons 
              name="calendar-star" 
              size={16} 
              color="#9C27B0" 
            />
            <Text style={styles.statValue}>
              {(member as any).eventCount || 0}
            </Text>
            <Text style={styles.statLabel}>Etkinlik</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const ClubMemberStats: React.FC<ClubMemberStatsProps> = ({ clubId, currentUserId, navigation }) => {
  const [activeCategory, setActiveCategory] = useState<StatCategory>('participation');
  const [members, setMembers] = useState<MemberStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MemberStats[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    loadMemberStats();
  }, [clubId, activeCategory]);

  const loadMemberStats = async (forceRefresh = false) => {
    try {
      setLoading(true);
      console.log(`🔄 Loading REAL-TIME member stats for club ${clubId}, category: ${activeCategory}, forceRefresh: ${forceRefresh}`);
      
      const stats = await clubMemberStatsService.getClubMemberStats(clubId, {
        limit: 7,
        orderBy: getOrderByField()
      });
      
      console.log(`📊 Loaded ${stats.length} member stats with real-time data`);
      
      // Re-rank based on category
      const rankedStats = stats
        .sort((a, b) => getCategoryValue(b, activeCategory) - getCategoryValue(a, activeCategory))
        .map((member, index) => ({
          ...member,
          rank: index + 1
        }));
      
      setMembers(rankedStats);
      
      // Log sample data for debugging
      if (rankedStats.length > 0) {
        console.log(`📈 Sample member stats:`, {
          name: rankedStats[0].userName,
          participation: rankedStats[0].totalParticipation,
          likes: rankedStats[0].totalLikes,
          comments: rankedStats[0].totalComments,
          university: rankedStats[0].university
        });
      }
      
    } catch (error) {
      console.error('❌ Error loading real-time member stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryValue = (member: MemberStats, category: StatCategory) => {
    switch (category) {
      case 'participation': return member.totalParticipation;
      case 'likes': return member.totalLikes;
      case 'comments': return member.totalComments;
      default: return member.totalParticipation; // Default olarak katılım
    }
  };

  const getOrderByField = () => {
    switch (activeCategory) {
      case 'participation': return 'totalParticipation';
      case 'likes': return 'totalLikes';
      case 'comments': return 'totalComments';
      default: return 'totalParticipation'; // Default olarak katılım
    }
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearchLoading(true);
      const results = await clubMemberStatsService.searchClubMembers(
        clubId,
        query,
        50 // More results for search
      );
      
      // Sort search results by active category
      const sortedResults = results
        .sort((a, b) => getCategoryValue(b, activeCategory) - getCategoryValue(a, activeCategory))
        .map((member, index) => ({
          ...member,
          rank: index + 1
        }));
      
      setSearchResults(sortedResults);
    } catch (error) {
      console.error('Error searching members:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleMemberPress = (member: MemberStats) => {
    if (navigation?.navigate) {
      navigation.navigate('ViewProfile', { userId: member.id });
    }
  };

  const getCategoryInfo = (category: StatCategory) => {
    switch (category) {
      case 'participation':
        return { title: 'Katılım', icon: '📅', color: '#4CAF50' };
      case 'likes':
        return { title: 'Beğeni', icon: '❤️', color: '#FF5722' };
      case 'comments':
        return { title: 'Yorum', icon: '💬', color: '#2196F3' };
      default:
        return { title: 'Genel', icon: '🏆', color: '#667eea' };
    }
  };

  const renderCategoryTab = (category: StatCategory) => {
    const info = getCategoryInfo(category);
    const isActive = activeCategory === category;
    
    return (
      <TouchableOpacity
        key={category}
        style={[
          styles.categoryTab,
          isActive && { backgroundColor: info.color }
        ]}
        onPress={() => setActiveCategory(category)}
      >
        <Text style={[
          styles.categoryTabText,
          isActive && styles.categoryTabTextActive
        ]}>
          {info.icon} {info.title}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#667eea" />
        <Text style={styles.loadingText}>Üye istatistikleri hesaplanıyor...</Text>
        <Text style={styles.loadingSubtext}>
          {getCategoryInfo(activeCategory).title} verileri analiz ediliyor
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <MaterialCommunityIcons name="account-star" size={24} color="#667eea" />
          <Text style={styles.title}>Üye İstatistikleri</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => loadMemberStats(true)}
            disabled={loading}
          >
            <MaterialCommunityIcons 
              name={loading ? "loading" : "refresh"} 
              size={20} 
              color="#667eea" 
            />
            <Text style={styles.refreshButtonText}>Yenile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => setShowSearchModal(true)}
          >
            <MaterialCommunityIcons name="account-search" size={20} color="#667eea" />
            <Text style={styles.searchButtonText}>Ara</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Category Tabs */}
      <View style={styles.categoryTabs}>
        {renderCategoryTab('participation')}
        {renderCategoryTab('likes')}
        {renderCategoryTab('comments')}
      </View>

      {/* Member List */}
      {members.length > 0 ? (
        <ScrollView 
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
          contentContainerStyle={styles.memberList}
        >
          {members.map((member) => (
            <MemberStatsItem
              key={member.id}
              member={member}
              category={activeCategory}
              onPress={() => handleMemberPress(member)}
            />
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="account-group" size={48} color="#ccc" />
          <Text style={styles.emptyText}>
            Bu kulüpte henüz {getCategoryInfo(activeCategory).title.toLowerCase()} istatistiği olan üye bulunmuyor.
          </Text>
          <Text style={styles.emptySubtext}>
            Üyeler etkinliklere katılıp aktivite gösterdikçe burada görünecekler.
          </Text>
        </View>
      )}

      {/* Search Modal */}
      <Modal
        visible={showSearchModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {getCategoryInfo(activeCategory).icon} {getCategoryInfo(activeCategory).title} Araması
            </Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => {
                setShowSearchModal(false);
                setSearchQuery('');
                setSearchResults([]);
              }}
            >
              <MaterialCommunityIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchInputContainer}>
            <MaterialCommunityIcons name="magnify" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder={`${getCategoryInfo(activeCategory).title} yapan üyeleri ara...`}
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                handleSearch(text);
              }}
              autoFocus
            />
          </View>

          {searchLoading ? (
            <View style={styles.searchLoadingContainer}>
              <ActivityIndicator size="small" color="#667eea" />
              <Text style={styles.searchLoadingText}>Aranıyor...</Text>
            </View>
          ) : searchResults.length > 0 ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.searchResults}
            >
              {searchResults.map((member) => (
                <MemberStatsItem
                  key={member.id}
                  member={member}
                  category={activeCategory}
                  onPress={() => {
                    handleMemberPress(member);
                    setShowSearchModal(false);
                  }}
                />
              ))}
            </ScrollView>
          ) : searchQuery.length > 0 ? (
            <View style={styles.emptySearchContainer}>
              <MaterialCommunityIcons name="account-search" size={48} color="#ccc" />
              <Text style={styles.emptySearchText}>
                "{searchQuery}" için sonuç bulunamadı
              </Text>
            </View>
          ) : (
            <View style={styles.emptySearchContainer}>
              <MaterialCommunityIcons name="account-search" size={48} color="#ccc" />
              <Text style={styles.emptySearchText}>
                Üye aramaya başlayın
              </Text>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  refreshButtonText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#667eea',
    fontWeight: '500',
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  searchButtonText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#667eea',
    fontWeight: '500',
  },
  categoryTabs: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 4,
  },
  categoryTab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  categoryTabTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  memberList: {
    paddingBottom: 10,
    maxHeight: 400, // Maksimum yükseklik
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  memberRank: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  memberUsername: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  memberUniversity: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  categoryStatContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryStatValue: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    marginRight: 4,
  },
  categoryStatLabel: {
    fontSize: 14,
    color: '#666',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  loadingSubtext: {
    marginTop: 4,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalCloseButton: {
    padding: 4,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    marginHorizontal: 20,
    marginVertical: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
  searchResults: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexGrow: 1,
  },
  searchLoadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  searchLoadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptySearchContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptySearchText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  // Yeni stiller - Tüm istatistikler için
  allStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
    color: '#333',
  },
  statLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 1,
    textAlign: 'center',
  },
  totalScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
  },
  totalScoreText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
    marginLeft: 4,
  },
});

export default ClubMemberStats;
