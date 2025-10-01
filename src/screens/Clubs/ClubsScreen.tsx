import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, RefreshControl, ScrollView } from 'react-native';
import { Text, useTheme, Card, Avatar, Chip, Searchbar, Button, IconButton, Divider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { firestore, firebase } from '../../firebase/config';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UNIVERSITIES_DATA, CLUB_TYPES_DATA } from '../../constants';
import { getClubCategories } from '../../constants/clubTypes';
import { useNavigation } from '@react-navigation/native';
import { followClub, unfollowClub } from '../../firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { UniversalAvatar } from '../../components/common';
import ClubFollowSyncService from '../../services/clubFollowSyncService';
import { ClubStatsService } from '../../services/clubStatsService';

interface ClubData {
  id: string;
  clubName: string;
  displayName?: string;
  description?: string;
  bio?: string;
  university?: string;
  clubTypes?: string[];
  clubType?: string;
  profileImage?: string;
  photoURL?: string; // Firebase Auth field
  avatarIcon?: string;
  avatarColor?: string;
  coverImage?: string;
  coverIcon?: string;
  coverColor?: string;
  createdAt?: any;
  public?: boolean;
  expanded?: boolean; // Track expanded/collapsed state of cards
  isFollowing?: boolean; // Kullanıcının kulübü takip edip etmediğini gösterir
  memberCount?: number; // Kulüp üye sayısı
  eventCount?: number; // Kulüp etkinlik sayısı
}

const ClubsScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { currentUser, isClubAccount } = useAuth();
  
  const [clubs, setClubs] = useState<ClubData[]>([]);
  const [joinedClubs, setJoinedClubs] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Modern filter state - Remove old variables and use new structure
  // const [filterUniversities, setFilterUniversities] = useState<string[]>([]);
  // const [filterClubTypes, setFilterClubTypes] = useState<string[]>([]);
  // const [universitySearchQuery, setUniversitySearchQuery] = useState<string>('');
  
  // Enhanced filtering system - EventsScreen style
  const [activeBottomSheet, setActiveBottomSheet] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'alphabetical' | 'popular' | 'memberCount' | 'newest' | 'oldest' | 'events'>('alphabetical');
  const [filterMode, setFilterMode] = useState<'all' | 'joined' | 'recommended' | 'followed' | 'active' | 'new'>('all');
  
  // Filter options similar to EventsScreen
  const [filterOptions, setFilterOptions] = useState({
    selectedClubTypes: [] as string[],
    selectedUniversities: [] as string[],
    statusFilter: 'all' as 'all' | 'active' | 'recruiting' | 'closed',
    memberFilter: 'all' as 'all' | 'small' | 'medium' | 'large',
  });
  
  // Fetch clubs from Firestore
  const fetchClubs = async () => {
    try {
      setLoading(true);
      const db = firestore;
      
      // Query for all club accounts
      const clubsRef = db.collection('users')
        .where('userType', '==', 'club')
        .limit(50); // Added limit for security rules
      
      const snapshot = await clubsRef.get();
      
      const clubsList: ClubData[] = [];
      
      // Kullanıcının takip ettiği kulüpleri al (eğer giriş yapılmışsa)
      let followedClubIds: string[] = [];
      let joinedClubIds: string[] = [];
      if (currentUser) {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data();
        followedClubIds = userData?.followedClubs || [];
        
        // Kullanıcının üye olduğu kulüpleri al
        const membershipsQuery = await db.collection('clubMembers')
          .where('userId', '==', currentUser.uid)
          .where('status', '==', 'approved')
          .get();
        
        joinedClubIds = membershipsQuery.docs.map(doc => doc.data().clubId);
        setJoinedClubs(joinedClubIds);
      }
      
      for (const doc of snapshot.docs) {
        const clubData = doc.data() as ClubData;
        
        // Profil resmi veya avatar bilgilerini doğru şekilde al
        let profileImage = clubData.profileImage || clubData.photoURL || '';
        
        // Boş string veya 'null' string değerlerini temizle
        if (profileImage === 'null' || profileImage === 'undefined' || !profileImage?.trim()) {
          profileImage = '';
        }
        
        // Avatar bilgilerini belirle - profil resmi yoksa kullanılacak
        const avatarIcon = clubData.avatarIcon || 'account-group';
        const avatarColor = clubData.avatarColor || '#1976D2';
        
        // Eğer üye sayısı 0 ise, gerçek üye sayısını clubMembers koleksiyonundan çek
        let actualMemberCount = clubData.memberCount || 0;
        if (actualMemberCount === 0) {
          try {
            const memberQuery = await db.collection('clubMembers')
              .where('clubId', '==', doc.id)
              .where('status', '==', 'approved')
              .get();
            actualMemberCount = memberQuery.size;
            
            // Eğer gerçek sayı varsa, kulüp dokümanını güncelle
            if (actualMemberCount > 0) {
              await db.collection('users').doc(doc.id).update({
                memberCount: actualMemberCount,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
              });
            }
          } catch (error) {
            console.error(`Kulüp ${doc.id} üye sayısı alınamadı:`, error);
          }
        }

        clubsList.push({
          id: doc.id,
          clubName: clubData.clubName || clubData.displayName || 'İsimsiz Kulüp',
          description: clubData.description || clubData.bio || '',
          university: clubData.university || '',
          clubTypes: clubData.clubTypes || (clubData.clubType ? [clubData.clubType] : []),
          clubType: clubData.clubType || '',
          profileImage: profileImage,
          avatarIcon: avatarIcon,
          avatarColor: avatarColor,
          coverImage: clubData.coverImage || '',
          coverIcon: clubData.coverIcon || '',
          coverColor: clubData.coverColor || '#0D47A1',
          createdAt: clubData.createdAt,
          expanded: false, // Initialize all cards as collapsed
          isFollowing: followedClubIds.includes(doc.id), // Kulüp takip ediliyor mu?
          memberCount: actualMemberCount, // Gerçek üye sayısı
          eventCount: clubData.eventCount || 0 // Etkinlik sayısı
        });
      }
      
      setClubs(clubsList);
    } catch (error) {
      console.error('Error fetching clubs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Initial fetch
  useEffect(() => {
    fetchClubs();
  }, []);
  
  // Handle pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchClubs();
    
    // Ayrıca tüm kulüplerin üye sayılarını güncelle
    try {
      console.log('🔄 Kulüp üye sayıları güncelleniyor...');
      
      // Mevcut kulüplerden birkaçını seçip üye sayılarını güncelleyelim
      const clubsToUpdate = clubs.slice(0, 10); // İlk 10 kulübü güncelle
      
      for (const club of clubsToUpdate) {
        try {
          const stats = await ClubStatsService.forceRefreshStats(club.id);
          
          // Kulüp dokümanını da güncelle
          await firestore.collection('users').doc(club.id).update({
            memberCount: stats.totalMembers,
            eventCount: stats.totalEvents,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          
          console.log(`✅ ${club.clubName} güncellendi: ${stats.totalMembers} üye`);
        } catch (error) {
          console.error(`❌ ${club.clubName} güncellenemedi:`, error);
        }
      }
      
      // Kulüpleri tekrar yükle
      await fetchClubs();
    } catch (error) {
      console.error('Üye sayıları güncellenirken hata:', error);
    }
  };
  
  // Get university name from ID
  const getUniversityName = (universityId: string) => {
    if (!universityId) return 'Belirtilmemiş';
    const university = UNIVERSITIES_DATA.find(u => u.id === universityId);
    return university ? university.label : universityId;
  };
  
  // Get club type name from ID
  const getClubTypeName = (clubTypeId: string) => {
    if (!clubTypeId) return 'Belirtilmemiş';
    const clubType = CLUB_TYPES_DATA.find(ct => ct.id === clubTypeId);
    return clubType ? clubType.name : clubTypeId;
  };

  // Modern filter system functions - EventsScreen style
  const openBottomSheet = (sheetType: string) => {
    setActiveBottomSheet(sheetType);
  };

  const closeBottomSheet = () => {
    setActiveBottomSheet(null);
  };

  // Get filter count for display
  const getFilterCount = (filterType: string) => {
    switch (filterType) {
      case 'clubTypes':
        return filterOptions.selectedClubTypes.length;
      case 'universities':
        return filterOptions.selectedUniversities.length;
      default:
        return 0;
    }
  };

  // Get active filter display text
  const getActiveFilterText = (filterType: string) => {
    switch (filterType) {
      case 'sort':
        const sortLabels: { [key: string]: string } = { 
          alphabetical: 'A-Z', 
          popular: 'Popüler', 
          memberCount: 'Üye Sayısı', 
          newest: 'En Yeni',
          oldest: 'En Eski',
          events: 'Etkinlik'
        };
        return sortLabels[sortBy] || 'Sıralama';
      case 'status':
        const statusLabels = { all: 'Durum', active: 'Aktif', recruiting: 'Üye Arıyor', closed: 'Kapalı' };
        return statusLabels[filterOptions.statusFilter] || 'Durum';
      case 'members':
        const memberLabels = { all: 'Üye', small: 'Küçük', medium: 'Orta', large: 'Büyük' };
        return memberLabels[filterOptions.memberFilter] || 'Üye';
      default:
        return filterType;
    }
  };
  
  // Apply sorting to clubs
  const applySorting = (clubs: ClubData[]) => {
    switch(sortBy) {
      case 'alphabetical':
        return [...clubs].sort((a, b) => a.clubName.localeCompare(b.clubName));
      case 'popular':
        // This would ideally use a popularity metric from the database
        // For now we'll simulate with a random sort
        return [...clubs].sort(() => Math.random() - 0.5);
      case 'memberCount':
        return [...clubs].sort((a, b) => {
          const memberCountA = a.memberCount || 0;
          const memberCountB = b.memberCount || 0;
          return memberCountB - memberCountA; // En çok üyeli önce
        });
      case 'newest':
        return [...clubs].sort((a, b) => {
          if (!a.createdAt || !b.createdAt) return 0;
          try {
            // Firebase Timestamp veya tarih nesnesini dönüştürme
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime();
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime();
            return dateB - dateA;
          } catch (error) {
            console.error('Tarih sıralama hatası:', error);
            return 0;
          }
        });
      case 'oldest':
        return [...clubs].sort((a, b) => {
          if (!a.createdAt || !b.createdAt) return 0;
          try {
            // Firebase Timestamp veya tarih nesnesini dönüştürme
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime();
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime();
            return dateA - dateB;
          } catch (error) {
            console.error('Tarih sıralama hatası:', error);
            return 0;
          }
        });
      case 'events':
        // This would ideally sort by number of upcoming events
        // For now we'll simulate with yet another random sort
        return [...clubs].sort(() => Math.random() - 0.5);
      default:
        return clubs;
    }
  };
  
  // Apply filters to clubs
  const applyFilters = (clubs: ClubData[]) => {
    // Start with search query and category filters
    let filtered = clubs.filter(club => {
      const matchesSearch = 
        searchQuery === '' || 
        club.clubName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (club.description?.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesUniversity = 
        filterOptions.selectedUniversities.length === 0 || 
        (club.university && filterOptions.selectedUniversities.includes(club.university));
      
      const matchesClubType = 
        filterOptions.selectedClubTypes.length === 0 || 
        (club.clubTypes && club.clubTypes.some(type => filterOptions.selectedClubTypes.includes(type))) ||
        (club.clubType && filterOptions.selectedClubTypes.includes(club.clubType));
      
      return matchesSearch && matchesUniversity && matchesClubType;
    });
    
    // Apply additional filter modes
    switch(filterMode) {
      case 'joined':
        // Kullanıcının üye olduğu kulüpleri göster
        return filtered.filter(club => joinedClubs.includes(club.id));
      case 'recommended':
        // This would show recommended clubs based on user interests, etc.
        // For now, we'll just return a different subset
        return filtered.filter((_, index) => index % 2 === 0); // Just for demonstration
      case 'followed':
        // This would show clubs the user is following but not a member of
        return filtered.filter(club => club.isFollowing); // Takip edilen kulüpleri göster
      case 'active':
        // This would show clubs with the most recent activity
        return filtered.filter((_, index) => index % 2 === 1); // Just for demonstration
      case 'new':
        // This would show recently created clubs
        return filtered.sort((a, b) => {
          if (!a.createdAt || !b.createdAt) return 0;
          try {
            // Firebase Timestamp veya tarih nesnesini dönüştürme
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime();
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime();
            return dateB - dateA;
          } catch (error) {
            console.error('Tarih sıralama hatası:', error);
            return 0;
          }
        }).slice(0, Math.max(5, Math.floor(filtered.length / 2)));
      case 'all':
      default:
        return filtered;
    }
  };
  
  // Filter clubs based on search query and filters
  const filteredClubs = applyFilters(clubs);
  
  // Sort clubs based on selected criteria
  const sortedClubs = applySorting(filteredClubs);
  
  // Navigate to club profile
  const navigateToClubProfile = (clubId: string) => {
    // Navigate to the ViewClub screen with the club ID
    navigation.navigate({
      name: 'ViewClub',
      params: { clubId },
      merge: true,
    } as never);
  };
  
  // Handle view profile button press
  const handleViewProfile = (clubId: string) => {
    navigateToClubProfile(clubId);
  };
  
  // Kulüp takip etme/takipten çıkma işlevi - synchronized with comprehensive scoring
  const handleFollowClub = async (clubId: string, isFollowing: boolean) => {
    if (!currentUser) {
      // Kullanıcı giriş yapmamışsa giriş sayfasına yönlendir
      navigation.navigate('Login' as never);
      return;
    }
    
    // Kulüp hesapları diğer kulüpleri takip edemez
    if (isClubAccount) {
      return;
    }
    
    try {
      // İlgili kulübü bul
      const updatedClubs = [...clubs];
      const clubIndex = updatedClubs.findIndex(club => club.id === clubId);
      
      if (clubIndex === -1) return;
      
      // Kulüp bilgilerini al
      const clubName = updatedClubs[clubIndex].clubName || updatedClubs[clubIndex].displayName || 'Bilinmeyen Kulüp';
      
      // Use synchronized service for follow/unfollow
      const result = await ClubFollowSyncService.toggleFollow(
        currentUser.uid,
        clubId,
        clubName,
        isFollowing,
        isClubAccount ? 'club' : 'student'
      );
      
      if (result.success) {
        // Yerel durumu güncelle
        updatedClubs[clubIndex] = {
          ...updatedClubs[clubIndex],
          isFollowing: result.newState.isFollowing
        };
        
        setClubs(updatedClubs);
        
        console.log('✅ Club follow state synchronized across all screens');
      } else {
        console.error('❌ Club follow operation failed:', result.error);
      }
    } catch (error) {
      console.error('Error in club follow operation:', error);
    }
  };
  
  // Handle card expansion toggle
  const toggleCardExpansion = (clubId: string) => {
    setClubs(prevClubs => 
      prevClubs.map(club => 
        club.id === clubId 
          ? { ...club, expanded: !club.expanded } 
          : club
      )
    );
  };
  
  // Render club card
  const renderClubCard = ({ item }: { item: ClubData }) => {
    return (
      <Card style={styles.clubCard}>
        <TouchableOpacity 
          style={styles.cardHeader} 
          onPress={() => toggleCardExpansion(item.id)}
          activeOpacity={0.7}
        >
          {/* Club Avatar */}
          <UniversalAvatar
            user={{
              id: item.id,
              name: item.displayName || item.clubName,
              profileImage: item.profileImage,
              avatarIcon: item.avatarIcon || 'account-group',
              avatarColor: item.avatarColor || '#1976D2'
            }}
            size={45}
            style={styles.avatar}
            fallbackIcon="account-group"
            fallbackColor="#1976D2"
          />
          
          {/* Basic Info */}
          <View style={styles.headerInfo}>
            <Text style={styles.clubName} numberOfLines={1}>{item.clubName}</Text>
            
            <View style={styles.universityContainer}>
              <MaterialCommunityIcons name="school" size={14} color="#555" />
              <Text style={styles.universityText} numberOfLines={1}>{getUniversityName(item.university || '')}</Text>
            </View>
          </View>
          
          {/* Expand/Collapse Indicator */}
          <MaterialCommunityIcons 
            name={item.expanded ? "chevron-up" : "chevron-down"} 
            size={24} 
            color="#555" 
            style={styles.expandIcon}
          />
        </TouchableOpacity>
        
        {/* Expandable Content */}
        {item.expanded && (
          <>
            {/* Description */}
            {(item.description || item.bio) && (
              <Card.Content style={styles.contentContainer}>
                <Text style={styles.description}>
                  {item.description || item.bio}
                </Text>
              
                {/* Club Types */}
                <View style={styles.clubTypesContainer}>
                  {item.clubTypes && item.clubTypes.map((type, index) => (
                    <Chip 
                      key={index} 
                      style={styles.clubTypeChip}
                      textStyle={{ color: 'white', fontSize: 12 }}
                      icon={() => {
                        const typeInfo = CLUB_TYPES_DATA.find(ct => ct.id === type);
                        return typeInfo ? (
                          <MaterialCommunityIcons 
                            name={typeInfo.icon as any || 'shape'} 
                            size={14} 
                            color="white" 
                          />
                        ) : null;
                      }}
                    >
                      {getClubTypeName(type)}
                    </Chip>
                  ))}
                  
                  {(!item.clubTypes || item.clubTypes.length === 0) && item.clubType && (
                    <Chip 
                      style={styles.clubTypeChip}
                      textStyle={{ color: 'white', fontSize: 12 }}
                    >
                      {getClubTypeName(item.clubType)}
                    </Chip>
                  )}
                </View>
                
                {/* Club Statistics */}
                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <MaterialCommunityIcons name="account-group" size={16} color="#666" />
                    <Text style={styles.statText}>{item.memberCount || 0} üye</Text>
                  </View>
                  <View style={styles.statItem}>
                    <MaterialCommunityIcons name="calendar-multiple" size={16} color="#666" />
                    <Text style={styles.statText}>{item.eventCount || 0} etkinlik</Text>
                  </View>
                </View>
              </Card.Content>
            )}
            
            {/* Actions */}
            <Card.Actions style={styles.cardActions}>
              <Button 
                mode="text"
                icon="eye"
                labelStyle={{ fontSize: 12 }}
                compact
                onPress={() => handleViewProfile(item.id)}
              >
                Profil Görüntüle
              </Button>
              
              {/* Membership ve Follow durumuna göre buton göster */}
              {!isClubAccount && currentUser && (
                <>
                  {joinedClubs.includes(item.id) ? (
                    // Üye ise
                    <Button 
                      mode="text"
                      icon="check-circle"
                      labelStyle={{ fontSize: 12, color: '#4CAF50' }}
                      compact
                      disabled
                    >
                      Üyesin
                    </Button>
                  ) : (
                    // Üye değilse takip durumuna göre buton göster
                    <Button 
                      mode="text"
                      icon={item.isFollowing ? "heart" : "heart-outline"}
                      labelStyle={{ 
                        fontSize: 12,
                        color: item.isFollowing ? '#E91E63' : '#666'
                      }}
                      compact
                      onPress={() => handleFollowClub(item.id, item.isFollowing || false)}
                    >
                      {item.isFollowing ? 'Takipte' : 'Takip Et'}
                    </Button>
                  )}
                </>
              )}
            </Card.Actions>
          </>
        )}
      </Card>
    );
  };

  // Get club categories and group club types by category
  const clubCategories = React.useMemo(() => {
    // Using the helper function from constants/clubTypes.ts
    return getClubCategories();
  }, []);
  
  // Group club types by category for better organization
  const groupedClubTypes = React.useMemo(() => {
    const grouped: Record<string, typeof CLUB_TYPES_DATA> = {};
    
    CLUB_TYPES_DATA.forEach(clubType => {
      if (!grouped[clubType.category]) {
        grouped[clubType.category] = [];
      }
      grouped[clubType.category].push(clubType);
    });
    
    return grouped;
  }, []);

  // Modern horizontal filters similar to EventsScreen
  const renderHorizontalFilters = () => (
    <View style={styles.horizontalFiltersContainer}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.horizontalFiltersScroll}
        contentContainerStyle={styles.horizontalFiltersContent}
      >
        {/* Kategori */}
        <TouchableOpacity 
          style={[
            styles.filterButton, 
            filterOptions.selectedClubTypes.length > 0 ? styles.filterButtonActive : {}
          ]}
          onPress={() => openBottomSheet('clubTypes')}
        >
          <View style={styles.filterButtonContent}>
            <MaterialCommunityIcons name="shape" size={16} color={filterOptions.selectedClubTypes.length > 0 ? '#fff' : '#666'} />
            <Text style={[
              styles.filterButtonText,
              filterOptions.selectedClubTypes.length > 0 ? styles.filterButtonTextActive : {}
            ]}>
              Kategori
            </Text>
            {filterOptions.selectedClubTypes.length > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{filterOptions.selectedClubTypes.length}</Text>
              </View>
            )}
          </View>
          <MaterialCommunityIcons name="chevron-down" size={16} color={filterOptions.selectedClubTypes.length > 0 ? '#fff' : '#666'} />
        </TouchableOpacity>

        {/* Sıralama */}
        <TouchableOpacity 
          style={[
            styles.filterButton, 
            sortBy !== 'alphabetical' ? styles.filterButtonActive : {}
          ]}
          onPress={() => openBottomSheet('sort')}
        >
          <View style={styles.filterButtonContent}>
            <MaterialCommunityIcons name="sort" size={16} color={sortBy !== 'alphabetical' ? '#fff' : '#666'} />
            <Text style={[
              styles.filterButtonText,
              sortBy !== 'alphabetical' ? styles.filterButtonTextActive : {}
            ]}>
              {getActiveFilterText('sort')}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-down" size={16} color={sortBy !== 'alphabetical' ? '#fff' : '#666'} />
        </TouchableOpacity>

        {/* Durum */}
        <TouchableOpacity 
          style={[
            styles.filterButton, 
            filterOptions.statusFilter !== 'all' ? styles.filterButtonActive : {}
          ]}
          onPress={() => openBottomSheet('status')}
        >
          <View style={styles.filterButtonContent}>
            <MaterialCommunityIcons name="shield-check" size={16} color={filterOptions.statusFilter !== 'all' ? '#fff' : '#666'} />
            <Text style={[
              styles.filterButtonText,
              filterOptions.statusFilter !== 'all' ? styles.filterButtonTextActive : {}
            ]}>
              {getActiveFilterText('status')}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-down" size={16} color={filterOptions.statusFilter !== 'all' ? '#fff' : '#666'} />
        </TouchableOpacity>

        {/* Üye Sayısı */}
        <TouchableOpacity 
          style={[
            styles.filterButton, 
            filterOptions.memberFilter !== 'all' ? styles.filterButtonActive : {}
          ]}
          onPress={() => openBottomSheet('members')}
        >
          <View style={styles.filterButtonContent}>
            <MaterialCommunityIcons name="account-group" size={16} color={filterOptions.memberFilter !== 'all' ? '#fff' : '#666'} />
            <Text style={[
              styles.filterButtonText,
              filterOptions.memberFilter !== 'all' ? styles.filterButtonTextActive : {}
            ]}>
              {getActiveFilterText('members')}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-down" size={16} color={filterOptions.memberFilter !== 'all' ? '#fff' : '#666'} />
        </TouchableOpacity>

        {/* Üniversite */}
        <TouchableOpacity 
          style={[
            styles.filterButton, 
            filterOptions.selectedUniversities.length > 0 ? styles.filterButtonActive : {}
          ]}
          onPress={() => openBottomSheet('universities')}
        >
          <View style={styles.filterButtonContent}>
            <MaterialCommunityIcons name="school" size={16} color={filterOptions.selectedUniversities.length > 0 ? '#fff' : '#666'} />
            <Text style={[
              styles.filterButtonText,
              filterOptions.selectedUniversities.length > 0 ? styles.filterButtonTextActive : {}
            ]}>
              Üniversite
            </Text>
            {filterOptions.selectedUniversities.length > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{filterOptions.selectedUniversities.length}</Text>
              </View>
            )}
          </View>
          <MaterialCommunityIcons name="chevron-down" size={16} color={filterOptions.selectedUniversities.length > 0 ? '#fff' : '#666'} />
        </TouchableOpacity>

        {/* Görünüm Modu */}
        <TouchableOpacity 
          style={[
            styles.filterButton, 
            filterMode !== 'all' ? styles.filterButtonActive : {}
          ]}
          onPress={() => openBottomSheet('mode')}
        >
          <View style={styles.filterButtonContent}>
            <MaterialCommunityIcons name="filter-variant" size={16} color={filterMode !== 'all' ? '#fff' : '#666'} />
            <Text style={[
              styles.filterButtonText,
              filterMode !== 'all' ? styles.filterButtonTextActive : {}
            ]}>
              Görünüm
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-down" size={16} color={filterMode !== 'all' ? '#fff' : '#666'} />
        </TouchableOpacity>

        {/* Temizle Butonu */}
        {(filterOptions.selectedClubTypes.length > 0 || 
          filterOptions.selectedUniversities.length > 0 || 
          filterOptions.statusFilter !== 'all' || 
          filterOptions.memberFilter !== 'all' ||
          sortBy !== 'alphabetical' ||
          filterMode !== 'all') && (
          <TouchableOpacity 
            style={styles.clearAllButton}
            onPress={() => {
              setFilterOptions({
                selectedClubTypes: [],
                selectedUniversities: [],
                statusFilter: 'all',
                memberFilter: 'all',
              });
              setSortBy('alphabetical');
              setFilterMode('all');
            }}
          >
            <MaterialCommunityIcons name="close-circle" size={16} color="#e74c3c" />
            <Text style={styles.clearAllButtonText}>Temizle</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );

  // Bottom sheet content components
  const renderClubTypesBottomSheet = () => (
    <View style={styles.bottomSheetContainer}>
      <View style={styles.bottomSheetHeader}>
        <Text style={styles.bottomSheetTitle}>Kulüp Kategorileri</Text>
        <TouchableOpacity onPress={closeBottomSheet}>
          <MaterialCommunityIcons name="close" size={24} color="#333" />
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        style={styles.scrollableContent}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={true}
        bounces={true}
        alwaysBounceVertical={true}
      >
        {/* Quick Actions */}
        <View style={styles.quickActionsRow}>
          <Button
            mode={filterOptions.selectedClubTypes.length === 0 ? "contained" : "outlined"}
            onPress={() => setFilterOptions(prev => ({ ...prev, selectedClubTypes: [] }))}
            style={styles.quickActionButton}
          >
            Tümü
          </Button>
          <Button
            mode="outlined"
            onPress={() => setFilterOptions(prev => ({ ...prev, selectedClubTypes: CLUB_TYPES_DATA.map(c => c.id) }))}
            style={styles.quickActionButton}
          >
            Hepsini Seç
          </Button>
        </View>

        <View style={styles.categoriesContainer}>
          {CLUB_TYPES_DATA.map(clubType => (
            <TouchableOpacity
              key={clubType.id}
              style={[
                styles.categoryCard,
                filterOptions.selectedClubTypes.includes(clubType.id) ? styles.categoryCardSelected : {}
              ]}
              onPress={() => {
                const isSelected = filterOptions.selectedClubTypes.includes(clubType.id);
                setFilterOptions(prev => ({
                  ...prev,
                  selectedClubTypes: isSelected
                    ? prev.selectedClubTypes.filter(id => id !== clubType.id)
                    : [...prev.selectedClubTypes, clubType.id]
                }));
              }}
            >
              <MaterialCommunityIcons 
                name={clubType.icon as any} 
                size={20} 
                color={filterOptions.selectedClubTypes.includes(clubType.id) ? '#fff' : '#666'} 
              />
              <Text style={[
                styles.categoryCardText,
                filterOptions.selectedClubTypes.includes(clubType.id) ? styles.categoryCardTextSelected : {}
              ]}>
                {clubType.name}
              </Text>
              {filterOptions.selectedClubTypes.includes(clubType.id) && (
                <MaterialCommunityIcons name="check-circle" size={14} color="#fff" style={styles.categoryCheckIcon} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.bottomSheetFooter}>
        <Button
          mode="contained"
          onPress={closeBottomSheet}
          style={styles.applyButton}
        >
          Uygula ({filterOptions.selectedClubTypes.length} seçili)
        </Button>
      </View>
    </View>
  );

  // Other bottom sheet components
  const renderSortBottomSheet = () => (
    <View style={styles.bottomSheetContainer}>
      <View style={styles.bottomSheetHeader}>
        <Text style={styles.bottomSheetTitle}>Sıralama</Text>
        <TouchableOpacity onPress={closeBottomSheet}>
          <MaterialCommunityIcons name="close" size={24} color="#333" />
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        style={styles.scrollableContent}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={true}
        bounces={true}
        alwaysBounceVertical={true}
      >
        {[
          { id: 'alphabetical', label: 'Alfabetik (A-Z)', icon: 'sort-alphabetical-variant', desc: 'Kulüp isimlerine göre sıralama' },
          { id: 'popular', label: 'Popülerlik', icon: 'trending-up', desc: 'En popüler kulüpler önce' },
          { id: 'memberCount', label: 'Üye Sayısı', icon: 'account-group', desc: 'En çok üyeli kulüpler önce' },
          { id: 'newest', label: 'En Yeni', icon: 'clock', desc: 'En son kurulan kulüpler önce' },
          { id: 'oldest', label: 'En Eski', icon: 'clock-outline', desc: 'En eski kulüpler önce' },
          { id: 'events', label: 'Etkinlik Sayısı', icon: 'calendar-month', desc: 'En aktif kulüpler önce' },
        ].map(sort => (
          <TouchableOpacity
            key={sort.id}
            style={[
              styles.optionItem,
              sortBy === sort.id ? styles.optionItemSelected : {}
            ]}
            onPress={() => {
              setSortBy(sort.id as any);
              closeBottomSheet();
            }}
          >
            <MaterialCommunityIcons 
              name={sort.icon as any} 
              size={24} 
              color={sortBy === sort.id ? '#fff' : '#666'} 
            />
            <View style={styles.optionItemContent}>
              <Text style={[
                styles.optionItemTitle,
                sortBy === sort.id ? styles.optionItemTitleSelected : {}
              ]}>
                {sort.label}
              </Text>
              <Text style={[
                styles.optionItemDesc,
                sortBy === sort.id ? styles.optionItemDescSelected : {}
              ]}>
                {sort.desc}
              </Text>
            </View>
            {sortBy === sort.id && (
              <MaterialCommunityIcons name="check-circle" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        ))}

        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );

  const renderUniversitiesBottomSheet = () => (
    <View style={styles.bottomSheetContainer}>
      <View style={styles.bottomSheetHeader}>
        <Text style={styles.bottomSheetTitle}>Üniversiteler</Text>
        <TouchableOpacity onPress={closeBottomSheet}>
          <MaterialCommunityIcons name="close" size={24} color="#333" />
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        style={styles.scrollableContent}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={true}
        bounces={true}
        alwaysBounceVertical={true}
      >
        {/* Quick Actions */}
        <View style={styles.quickActionsRow}>
          <Button
            mode={filterOptions.selectedUniversities.length === 0 ? "contained" : "outlined"}
            onPress={() => setFilterOptions(prev => ({ ...prev, selectedUniversities: [] }))}
            style={styles.quickActionButton}
          >
            Tümü
          </Button>
          <Button
            mode="outlined"
            onPress={() => setFilterOptions(prev => ({ ...prev, selectedUniversities: UNIVERSITIES_DATA.map(u => u.id) }))
            }
            style={styles.quickActionButton}
          >
            Hepsini Seç
          </Button>
        </View>

        {UNIVERSITIES_DATA.map((university) => (
          <TouchableOpacity
            key={university.id}
            style={[
              styles.optionItem,
              filterOptions.selectedUniversities.includes(university.id) ? styles.optionItemSelected : {}
            ]}
            onPress={() => {
              const isSelected = filterOptions.selectedUniversities.includes(university.id);
              setFilterOptions(prev => ({
                ...prev,
                selectedUniversities: isSelected
                  ? prev.selectedUniversities.filter(id => id !== university.id)
                  : [...prev.selectedUniversities, university.id]
              }));
            }}
          >
            <MaterialCommunityIcons 
              name="school" 
              size={24} 
              color={filterOptions.selectedUniversities.includes(university.id) ? '#fff' : '#666'} 
            />
            <View style={styles.optionItemContent}>
              <Text style={[
                styles.optionItemTitle,
                filterOptions.selectedUniversities.includes(university.id) ? styles.optionItemTitleSelected : {}
              ]}>
                {university.name}
              </Text>
              {university.id !== university.name && (
                <Text style={[
                  styles.optionItemDesc,
                  filterOptions.selectedUniversities.includes(university.id) ? styles.optionItemDescSelected : {}
                ]}>
                  {university.id}
                </Text>
              )}
            </View>
            {filterOptions.selectedUniversities.includes(university.id) && (
              <MaterialCommunityIcons name="check-circle" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.bottomSheetFooter}>
        <Button
          mode="contained"
          onPress={closeBottomSheet}
          style={styles.applyButton}
        >
          Uygula ({filterOptions.selectedUniversities.length} seçili)
        </Button>
      </View>
    </View>
  );

  const renderStatusBottomSheet = () => (
    <View style={styles.bottomSheetContainer}>
      <View style={styles.bottomSheetHeader}>
        <Text style={styles.bottomSheetTitle}>Kulüp Durumu</Text>
        <TouchableOpacity onPress={closeBottomSheet}>
          <MaterialCommunityIcons name="close" size={24} color="#333" />
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        style={styles.scrollableContent}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={true}
        bounces={true}
        alwaysBounceVertical={true}
      >
        {[
          { id: 'all', label: 'Tüm Kulüpler', icon: 'earth', desc: 'Aktif, pasif ve yeni tüm kulüpler' },
          { id: 'active', label: 'Aktif Kulüpler', icon: 'lightning-bolt', desc: 'Düzenli etkinlik yapan kulüpler' },
          { id: 'recruiting', label: 'Üye Arayan', icon: 'account-plus', desc: 'Yeni üye alımı yapan kulüpler' },
          { id: 'closed', label: 'Kapalı', icon: 'lock', desc: 'Yeni üye almayan kulüpler' },
        ].map(status => (
          <TouchableOpacity
            key={status.id}
            style={[
              styles.optionItem,
              filterOptions.statusFilter === status.id ? styles.optionItemSelected : {}
            ]}
            onPress={() => {
              setFilterOptions(prev => ({ ...prev, statusFilter: status.id as any }));
              closeBottomSheet();
            }}
          >
            <MaterialCommunityIcons 
              name={status.icon as any} 
              size={24} 
              color={filterOptions.statusFilter === status.id ? '#fff' : '#666'} 
            />
            <View style={styles.optionItemContent}>
              <Text style={[
                styles.optionItemTitle,
                filterOptions.statusFilter === status.id ? styles.optionItemTitleSelected : {}
              ]}>
                {status.label}
              </Text>
              <Text style={[
                styles.optionItemDesc,
                filterOptions.statusFilter === status.id ? styles.optionItemDescSelected : {}
              ]}>
                {status.desc}
              </Text>
            </View>
            {filterOptions.statusFilter === status.id && (
              <MaterialCommunityIcons name="check-circle" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        ))}

        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );

  const renderMembersBottomSheet = () => (
    <View style={styles.bottomSheetContainer}>
      <View style={styles.bottomSheetHeader}>
        <Text style={styles.bottomSheetTitle}>Üye Sayısı</Text>
        <TouchableOpacity onPress={closeBottomSheet}>
          <MaterialCommunityIcons name="close" size={24} color="#333" />
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        style={styles.scrollableContent}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={true}
        bounces={true}
        alwaysBounceVertical={true}
      >
        {[
          { id: 'all', label: 'Tüm Boyutlar', icon: 'account-group', desc: 'Üye sayısı fark etmeksizin tüm kulüpler' },
          { id: 'small', label: 'Küçük Kulüpler', icon: 'account-multiple', desc: '1-20 üyeli küçük kulüpler' },
          { id: 'medium', label: 'Orta Kulüpler', icon: 'account-group', desc: '21-100 üyeli orta büyüklükte kulüpler' },
          { id: 'large', label: 'Büyük Kulüpler', icon: 'account-supervisor-circle', desc: '100+ üyeli büyük kulüpler' },
        ].map(member => (
          <TouchableOpacity
            key={member.id}
            style={[
              styles.optionItem,
              filterOptions.memberFilter === member.id ? styles.optionItemSelected : {}
            ]}
            onPress={() => {
              setFilterOptions(prev => ({ ...prev, memberFilter: member.id as any }));
              closeBottomSheet();
            }}
          >
            <MaterialCommunityIcons 
              name={member.icon as any} 
              size={24} 
              color={filterOptions.memberFilter === member.id ? '#fff' : '#666'} 
            />
            <View style={styles.optionItemContent}>
              <Text style={[
                styles.optionItemTitle,
                filterOptions.memberFilter === member.id ? styles.optionItemTitleSelected : {}
              ]}>
                {member.label}
              </Text>
              <Text style={[
                styles.optionItemDesc,
                filterOptions.memberFilter === member.id ? styles.optionItemDescSelected : {}
              ]}>
                {member.desc}
              </Text>
            </View>
            {filterOptions.memberFilter === member.id && (
              <MaterialCommunityIcons name="check-circle" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        ))}

        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );

  const renderModeBottomSheet = () => (
    <View style={styles.bottomSheetContainer}>
      <View style={styles.bottomSheetHeader}>
        <Text style={styles.bottomSheetTitle}>Görünüm Modu</Text>
        <TouchableOpacity onPress={closeBottomSheet}>
          <MaterialCommunityIcons name="close" size={24} color="#333" />
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        style={styles.scrollableContent}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={true}
        bounces={true}
        alwaysBounceVertical={true}
      >
        {[
          { id: 'all', label: 'Tüm Kulüpler', icon: 'earth', desc: 'Katıldığım ve katılmadığım tüm kulüpler' },
          { id: 'joined', label: 'Katıldıklarım', icon: 'account-check', desc: 'Sadece üyesi olduğum kulüpler' },
          { id: 'recommended', label: 'Önerilen', icon: 'thumb-up-outline', desc: 'İlgi alanlarıma göre önerilen kulüpler' },
          { id: 'followed', label: 'Takip Ettiklerim', icon: 'heart', desc: 'Takip ettiğim ama üye olmadığım kulüpler' },
          { id: 'active', label: 'Aktif Kulüpler', icon: 'lightning-bolt', desc: 'Son zamanlarda aktif olan kulüpler' },
          { id: 'new', label: 'Yeni Kulüpler', icon: 'new-box', desc: 'Yakın zamanda kurulan kulüpler' },
        ].map(mode => (
          <TouchableOpacity
            key={mode.id}
            style={[
              styles.optionItem,
              filterMode === mode.id ? styles.optionItemSelected : {}
            ]}
            onPress={() => {
              setFilterMode(mode.id as any);
              closeBottomSheet();
            }}
          >
            <MaterialCommunityIcons 
              name={mode.icon as any} 
              size={20} 
              color={filterMode === mode.id ? '#fff' : '#666'} 
            />
            <View style={styles.optionItemContent}>
              <Text style={[
                styles.optionItemTitle,
                filterMode === mode.id ? styles.optionItemTitleSelected : {}
              ]}>
                {mode.label}
              </Text>
              <Text style={[
                styles.optionItemDesc,
                filterMode === mode.id ? styles.optionItemDescSelected : {}
              ]}>
                {mode.desc}
              </Text>
            </View>
            {filterMode === mode.id && (
              <MaterialCommunityIcons name="check-circle" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        ))}

        <View style={{ height: 50 }} />
      </ScrollView>
      
      <View style={styles.bottomSheetFooter}>
        <Button
          mode="contained"
          onPress={closeBottomSheet}
          style={styles.applyButton}
        >
          Uygula
        </Button>
      </View>
    </View>
  );

  // Render bottom sheet based on active type
  const renderBottomSheet = () => {
    if (!activeBottomSheet) return null;

    return (
      <View style={styles.bottomSheetOverlay}>
        <TouchableOpacity 
          style={styles.bottomSheetBackdrop} 
          onPress={closeBottomSheet}
          activeOpacity={1}
        />
        <View style={styles.bottomSheetModal}>
          {activeBottomSheet === 'clubTypes' && renderClubTypesBottomSheet()}
          {activeBottomSheet === 'sort' && renderSortBottomSheet()}
          {activeBottomSheet === 'universities' && renderUniversitiesBottomSheet()}
          {activeBottomSheet === 'status' && renderStatusBottomSheet()}
          {activeBottomSheet === 'members' && renderMembersBottomSheet()}
          {activeBottomSheet === 'mode' && renderModeBottomSheet()}
          {/* Add other bottom sheet types as needed */}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="auto" />
      
      {/* Search bar */}
      <Searchbar
        placeholder="Kulüp ara..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
        icon={() => <MaterialCommunityIcons name="magnify" size={20} color="#666" />}
        clearIcon={() => <MaterialCommunityIcons name="close" size={20} color="#666" />}
      />
      
      {/* Modern Horizontal Filter System */}
      <View style={styles.advancedFiltersContainer}>
        {renderHorizontalFilters()}
      </View>
      
      <Divider style={styles.divider} />
      
      {/* Clubs list */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : sortedClubs.length === 0 ? (
        <View style={styles.noDataContainer}>
          <MaterialCommunityIcons 
            name={
              searchQuery || filterOptions.selectedUniversities.length > 0 || filterOptions.selectedClubTypes.length > 0 
                ? "filter-remove-outline" 
                : "school-outline"
            } 
            size={80} 
            color="#c5c5c5" 
          />
          <Text style={styles.noDataText}>
            {searchQuery || filterOptions.selectedUniversities.length > 0 || filterOptions.selectedClubTypes.length > 0 
              ? 'Filtrelere uygun kulüp bulunamadı.' 
              : 'Henüz kulüp bulunmamaktadır.'}
          </Text>
          <Text style={styles.noDataSubText}>
            {searchQuery || filterOptions.selectedUniversities.length > 0 || filterOptions.selectedClubTypes.length > 0 
              ? 'Filtreleri değiştirmeyi veya aramayı temizlemeyi deneyin' 
              : 'Bir kulüp aramak için yukarıdaki arama çubuğunu kullanabilirsiniz'}
          </Text>
          <Button 
            mode="contained" 
            onPress={() => {
              setSearchQuery('');
              setFilterOptions({
                selectedUniversities: [],
                selectedClubTypes: [],
                statusFilter: 'all',
                memberFilter: 'all'
              });
              setFilterMode('all');
              setSortBy('alphabetical');
              onRefresh();
            }}
            style={{ marginTop: 20 }}
            icon="refresh"
          >
            {searchQuery || filterOptions.selectedUniversities.length > 0 || filterOptions.selectedClubTypes.length > 0 
              ? 'Filtreleri Sıfırla' 
              : 'Yenile'}
          </Button>
        </View>
      ) : (
        <FlatList
          data={sortedClubs}
          renderItem={renderClubCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={sortedClubs.length === 0 ? { flex: 1 } : styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
            />
          }
        />
      )}

      {/* Bottom Sheet Modal */}
      {renderBottomSheet()}
    </SafeAreaView>
  );
};

export default ClubsScreen;  // Define styles for the clubs screen
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchBar: {
    margin: 10,
    borderRadius: 10,
    elevation: 2,
  },
  // Original filter styles (keeping for compatibility)
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingBottom: 10,
    flexWrap: 'wrap',
  },
  filterChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  // New advanced filter styles
  advancedFiltersContainer: {
    paddingHorizontal: 10,
    paddingBottom: 5,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  filterSectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterSectionTitle: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  filterOptionsContainer: {
    paddingBottom: 12,
  },
  // Category filter styles
  categoriesFilterScrollView: {
    maxHeight: 300, // Kategori listesi için maksimum yükseklik
  },
  categoriesFilterContainer: {
    paddingBottom: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  categorySection: {
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 5,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  categorySelectAll: {
    paddingVertical: 2,
    paddingHorizontal: 5,
  },
  categoryChipsContainer: {
    flexDirection: 'row',
    paddingBottom: 5,
  },
  // University filter styles
  selectionCountBadge: {
    backgroundColor: '#1E88E5',
    color: '#fff',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 5,
    overflow: 'hidden',
  },
  universityFilterContainer: {
    paddingBottom: 12,
  },
  universitySearchBar: {
    height: 40,
    marginBottom: 10,
    borderRadius: 8,
    elevation: 1,
  },
  universityButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  universityChipsScrollView: {
    maxHeight: 200,
  },
  universityChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingBottom: 5,
  },
  universityFilterChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  selectedUniversitiesContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  selectedUniversitiesTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    color: '#444',
  },
  selectedUniversitiesChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  selectedUniversityChip: {
    backgroundColor: '#1E88E5',
    marginRight: 6,
    marginBottom: 6,
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
  },
  clubCard: {
    marginBottom: 16,
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  expandIcon: {
    marginLeft: 8,
  },
  avatar: {
    backgroundColor: '#1E88E5',
  },
  contentContainer: {
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  clubName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  universityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  universityText: {
    fontSize: 13,
    color: '#555',
    marginLeft: 4,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    lineHeight: 20,
  },
  clubTypesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  clubTypeChip: {
    marginRight: 6,
    marginBottom: 6,
    backgroundColor: '#1E88E5',
    height: 26,
  },
  cardActions: {
    borderTopWidth: 0.5,
    borderTopColor: '#eee',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  noDataText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  noDataSubText: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
    textAlign: 'center',
    maxWidth: '80%',
    marginBottom: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Modern filter styles
  horizontalFiltersContainer: {
  paddingVertical: 10,
  },
  horizontalFiltersScroll: {
    flexGrow: 0,
  },
  horizontalFiltersContent: {
  paddingHorizontal: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  paddingHorizontal: 12,
  paddingVertical: 8,
    marginHorizontal: 3,
    backgroundColor: '#f8f9fa',
  borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  minWidth: 84,
  minHeight: 36,
  },
  filterButtonActive: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  filterButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  gap: 6,
  },
  filterButtonText: {
  fontSize: 13,
  fontWeight: '600',
  color: '#333',
    marginLeft: 4,
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  filterBadge: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#3498db',
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginHorizontal: 3,
    backgroundColor: '#fee2e2',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  clearAllButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#e74c3c',
    marginLeft: 3,
  },
  // Bottom Sheet Styles
  bottomSheetOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  bottomSheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  bottomSheetModal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '70%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 8,
  },
  bottomSheetContainer: {
    flex: 1,
    height: '100%',
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  bottomSheetContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  scrollableContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContentContainer: {
    paddingBottom: 20,
    flexGrow: 1,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionButton: {
    flex: 1,
    marginRight: 8,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 8,
    gap: 6,
  },
  categoryCard: {
    width: '48%',
    aspectRatio: 2.8,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  categoryCardSelected: {
    backgroundColor: '#1E88E5',
    borderColor: '#1E88E5',
  },
  categoryCardText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  categoryCardTextSelected: {
    color: '#fff',
    fontWeight: '500',
  },
  categoryCheckIcon: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  bottomSheetFooter: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  applyButton: {
    borderRadius: 20,
  },
  // Option item styles in sort bottom sheet
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginVertical: 3,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  optionItemSelected: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  optionItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  optionItemTitle: {
    fontSize: 14,
    color: '#333',
  },
  optionItemTitleSelected: {
    color: '#fff',
    fontWeight: '500',
  },
  optionItemDesc: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  optionItemDescSelected: {
    color: '#fff',
  },
  // Missing styles for modern filter system
  divider: {
    height: 1,
    marginBottom: 8,
  },
  // Club statistics styles
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
});
