import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, Avatar, Button, Divider, useTheme, Searchbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirebaseCompatSync } from '../../firebase/compat';
import { useAuth } from '../../contexts/AuthContext';
import { StudentStackParamList } from '../../navigation/StudentNavigator';

const firebase = getFirebaseCompatSync();

type ClubFollowersScreenRouteProp = RouteProp<
  {
    ClubFollowers: { clubId: string };
  },
  'ClubFollowers'
>;

interface User {
  id: string;
  name?: string;
  displayName?: string;
  email?: string;
  profileImage?: string;
  university?: string;
  department?: string;
  bio?: string;
  isFollowing?: boolean;
}

const ClubFollowersScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<StudentStackParamList>>();
  const route = useRoute<ClubFollowersScreenRouteProp>();
  const { clubId } = route.params;
  const { currentUser, isClubAccount } = useAuth();
  
  const [club, setClub] = useState<{
    id: string;
    name?: string;
    displayName?: string;
    profileImage?: string;
    followerCount?: number;
  } | null>(null);
  const [followers, setFollowers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Local storage helper fonksiyonları
  const getFollowersListKey = (clubId: string) => `followers_list_${clubId}`;
  const getFollowingKey = (userId: string, clubId: string) => `following_${userId}_${clubId}`;
  
  // Takipçiler listesini local storage'dan yükle
  const loadFollowersFromStorage = async () => {
    try {
      const followersKey = getFollowersListKey(clubId);
      const savedFollowers = await AsyncStorage.getItem(followersKey);
      
      if (savedFollowers) {
        const followersList = JSON.parse(savedFollowers);
        console.log(`Loaded ${followersList.length} followers from local storage`);
        return followersList;
      }
      return [];
    } catch (error) {
      console.error('Error loading followers from local storage:', error);
      return [];
    }
  };
  
  // Takipçiler listesini local storage'a kaydet
  const saveFollowersToStorage = async (followersList: User[]) => {
    try {
      const followersKey = getFollowersListKey(clubId);
      await AsyncStorage.setItem(followersKey, JSON.stringify(followersList));
      console.log(`Saved ${followersList.length} followers to local storage`);
    } catch (error) {
      console.error('Error saving followers to local storage:', error);
    }
  };
  
  // Kulübe takipçi ekle (local storage'a)
  const addFollowerToStorage = async (newFollower: User) => {
    try {
      const currentFollowers = await loadFollowersFromStorage();
      const isAlreadyFollower = currentFollowers.some((f: User) => f.id === newFollower.id);
      
      if (!isAlreadyFollower) {
        const updatedFollowers = [...currentFollowers, newFollower];
        await saveFollowersToStorage(updatedFollowers);
        setFollowers(updatedFollowers);
        console.log(`Added follower ${newFollower.id} to local storage`);
      }
    } catch (error) {
      console.error('Error adding follower to storage:', error);
    }
  };
  
  // Kulüpten takipçi çıkar (local storage'dan)
  const removeFollowerFromStorage = async (followerId: string) => {
    try {
      const currentFollowers = await loadFollowersFromStorage();
      const updatedFollowers = currentFollowers.filter((f: User) => f.id !== followerId);
      await saveFollowersToStorage(updatedFollowers);
      setFollowers(updatedFollowers);
      console.log(`Removed follower ${followerId} from local storage`);
    } catch (error) {
      console.error('Error removing follower from storage:', error);
    }
  };

  // Kulübün bilgilerini getir
  const fetchClubDetails = useCallback(async () => {
    try {
      const db = getFirebaseCompatSync().firestore();
      
      // Önce users koleksiyonunda kulüp bilgilerini ara
      const clubDoc = await db.collection('users').doc(clubId).get();
      
      if (clubDoc.exists) {
        const clubData = clubDoc.data();
        
        // Gerçek takipçi sayısını followers array'den hesapla
        const realFollowerCount = clubData?.followers ? clubData.followers.length : 0;
        
        console.log(`📊 Club ${clubId} real follower count: ${realFollowerCount}`);
        
        setClub({
          id: clubId,
          name: clubData?.name || '',
          displayName: clubData?.displayName || clubData?.clubName || '',
          profileImage: clubData?.profileImage || clubData?.photoURL,
          followerCount: realFollowerCount, // Gerçek sayı
        });
      } else {
        // Eğer users koleksiyonunda bulunamazsa clubs koleksiyonunda ara
        const clubAltDoc = await db.collection('clubs').doc(clubId).get();
        if (clubAltDoc.exists) {
          const clubData = clubAltDoc.data();
          const realFollowerCount = clubData?.followers ? clubData.followers.length : 0;
          
          setClub({
            id: clubId,
            name: clubData?.name || '',
            displayName: clubData?.displayName || clubData?.clubName || '',
            profileImage: clubData?.profileImage || clubData?.photoURL,
            followerCount: realFollowerCount, // Gerçek sayı
          });
        }
      }
    } catch (error) {
      console.error('Error fetching club details:', error);
    }
  }, [clubId]);

  // Kulüp takipçilerini getir - Local storage'dan
  const fetchFollowers = useCallback(async () => {
    try {
      setLoading(true);
      
      console.log(`🔍 Fetching real followers for club: ${clubId}`);
      
      const db = getFirebaseCompatSync().firestore();
      
      // 1. Kulübün followers array'ini al
      const clubDoc = await db.collection('users').doc(clubId).get();
      
      if (!clubDoc.exists) {
        console.log('❌ Club document not found');
        setFollowers([]);
        setLoading(false);
        return;
      }
      
      const clubData = clubDoc.data();
      const followerIds = clubData?.followers || [];
      
      console.log(`📊 Club ${clubId} has ${followerIds.length} followers in Firestore`);
      
      if (followerIds.length === 0) {
        setFollowers([]);
        setLoading(false);
        return;
      }
      
      // 2. Her takipçi için kullanıcı bilgilerini al
      const followerPromises = followerIds.map(async (followerId: string) => {
        try {
          const userDoc = await db.collection('users').doc(followerId).get();
          
          if (userDoc.exists) {
            const userData = userDoc.data();
            
            // Bu kullanıcının current user'i takip edip etmediğini kontrol et
            let isFollowing = false;
            if (currentUser && currentUser.uid !== followerId) {
              const currentUserFollowing = userData?.followedClubs || [];
              isFollowing = currentUserFollowing.includes(currentUser.uid);
            }
            
            return {
              id: followerId,
              name: userData?.displayName || userData?.name || 'Kullanıcı',
              displayName: userData?.displayName || userData?.name || 'Kullanıcı',
              email: userData?.email || '',
              profileImage: userData?.profileImage || userData?.photoURL || '',
              university: userData?.university || 'Belirtilmemiş',
              department: userData?.department || '',
              bio: userData?.bio || '',
              isFollowing
            } as User;
          }
          return null;
        } catch (error) {
          console.error(`Error fetching follower ${followerId}:`, error);
          return null;
        }
      });
      
      const followers = await Promise.all(followerPromises);
      const validFollowers = followers.filter(f => f !== null) as User[];
      
      console.log(`✅ Loaded ${validFollowers.length} valid followers from Firestore`);
      
      setFollowers(validFollowers);
      
      // AsyncStorage'a da kaydet (legacy uyumluluk için)
      await saveFollowersToStorage(validFollowers);
      
      setLoading(false);
      
    } catch (error) {
      console.error('Error fetching followers from Firestore:', error);
      
      // Hata durumunda AsyncStorage'dan yükle
      try {
        const localFollowers = await loadFollowersFromStorage();
        setFollowers(localFollowers);
        console.log(`📱 Fallback: Loaded ${localFollowers.length} followers from AsyncStorage`);
      } catch (storageError) {
        console.error('Error loading from AsyncStorage fallback:', storageError);
      }
      
      setLoading(false);
    }
  }, [clubId, currentUser]);

  // Takip et/takibi bırak fonksiyonu
  // Kullanıcıları takip etme/bırakma işlevi
  const handleToggleFollow = async (userId: string, isFollowing: boolean) => {
    if (!currentUser || currentUser.uid === userId || isClubAccount) return;
    
    try {
      const db = getFirebaseCompatSync().firestore();
      const batch = db.batch();
      
      const currentUserRef = db.collection('users').doc(currentUser.uid);
      const targetUserRef = db.collection('users').doc(userId);
      
      if (isFollowing) {
        // Takibi bırak - batch operations
        batch.update(currentUserRef, {
          following: getFirebaseCompatSync().firestore.FieldValue.arrayRemove(userId),
          followingCount: getFirebaseCompatSync().firestore.FieldValue.increment(-1)
        });
        
        batch.update(targetUserRef, {
          followers: getFirebaseCompatSync().firestore.FieldValue.arrayRemove(currentUser.uid),
          followerCount: getFirebaseCompatSync().firestore.FieldValue.increment(-1)
        });
      } else {
        // Takip et - batch operations
        batch.update(currentUserRef, {
          following: getFirebaseCompatSync().firestore.FieldValue.arrayUnion(userId),
          followingCount: getFirebaseCompatSync().firestore.FieldValue.increment(1)
        });
        
        batch.update(targetUserRef, {
          followers: getFirebaseCompatSync().firestore.FieldValue.arrayUnion(currentUser.uid),
          followerCount: getFirebaseCompatSync().firestore.FieldValue.increment(1)
        });
      }
      
      // Firestore batch commit
      await batch.commit();
      
      // Yerel durumu güncelle
      setFollowers(prev => 
        prev.map(user => 
          user.id === userId ? {...user, isFollowing: !isFollowing} : user
        )
      );
    } catch (error) {
      console.error('Error toggling follow status:', error);
    }
  };

  // Kullanıcı profiline git
  const handleViewProfile = (userId: string) => {
    navigation.navigate('ViewProfile', { userId });
  };

  // Yenileme işlevi
  const handleRefresh = () => {
    setRefreshing(true);
    fetchClubDetails();
    fetchFollowers();
  };

  // Arama işlevi
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  // Arama sonuçlarını filtrele
  const filteredFollowers = followers.filter(user => {
    const searchLower = searchQuery.toLowerCase();
    return (
      (user.name?.toLowerCase().includes(searchLower)) || 
      (user.displayName?.toLowerCase().includes(searchLower)) ||
      (user.university?.toLowerCase().includes(searchLower)) ||
      (user.department?.toLowerCase().includes(searchLower))
    );
  });

  useEffect(() => {
    fetchClubDetails();
    fetchFollowers();
  }, [fetchClubDetails, fetchFollowers]);

  // Takipçi elemanını render et
  const renderFollowerItem = ({ item }: { item: User }) => {
    return (
      <TouchableOpacity 
        style={styles.followerItem}
        onPress={() => handleViewProfile(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.followerContent}>
          {item.profileImage ? (
            <Image source={{ uri: item.profileImage }} style={styles.profileImage} />
          ) : (
            <Avatar.Text 
              size={50} 
              label={(item.displayName || item.name || '?').substring(0, 1).toUpperCase()} 
              style={styles.avatar}
            />
          )}
          
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.displayName || item.name}</Text>
            {/* Kullanıcı adı */}
            <Text style={styles.userUsername}>
              @{item.email?.split('@')[0] || item.displayName?.toLowerCase().replace(/\s/g, '') || 'kullanici'}
            </Text>
            <Text style={styles.userDetail} numberOfLines={1}>
              {item.university}{item.department ? `, ${item.department}` : ''}
            </Text>
          </View>
        </View>
        
        {currentUser && currentUser.uid !== item.id && !isClubAccount && (
          <View style={styles.buttonContainer}>
            <Button
              mode={item.isFollowing ? "outlined" : "contained"}
              compact
              onPress={() => handleToggleFollow(item.id, item.isFollowing || false)}
              style={styles.followButton}
              labelStyle={styles.followButtonLabel}
            >
              {item.isFollowing ? "Takibi Bırak" : "Takip Et"}
            </Button>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Takipçiler</Text>
        <View style={styles.placeholder} />
      </View>
      
      {club && (
        <View style={styles.clubInfo}>
          {club.profileImage ? (
            <Image source={{ uri: club.profileImage }} style={styles.clubImage} />
          ) : (
            <Avatar.Text 
              size={60} 
              label={(club.name || '').substring(0, 1).toUpperCase()} 
              style={styles.clubAvatar}
            />
          )}
          
          <View style={styles.clubDetails}>
            <Text style={styles.clubName}>{club.displayName || club.name}</Text>
            <Text style={styles.followerCount}>
              {club.followerCount || 0} takipçi
            </Text>
          </View>
        </View>
      )}
      
      <Divider />
      
      <Searchbar
        placeholder="Takipçilerde ara..."
        onChangeText={handleSearch}
        value={searchQuery}
        style={styles.searchBar}
        inputStyle={styles.searchInput}
        iconColor="#666"
      />
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Takipçiler yükleniyor...</Text>
        </View>
      ) : followers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="account-group" size={64} color="#e0e0e0" />
          <Text style={styles.emptyTitle}>Henüz takipçi yok</Text>
          <Text style={styles.emptyText}>Bu kulübün henüz takipçisi bulunmuyor.</Text>
        </View>
      ) : filteredFollowers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="magnify" size={64} color="#e0e0e0" />
          <Text style={styles.emptyTitle}>Sonuç bulunamadı</Text>
          <Text style={styles.emptyText}>"{searchQuery}" araması için takipçi bulunamadı.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredFollowers}
          keyExtractor={(item) => item.id}
          renderItem={renderFollowerItem}
          contentContainerStyle={styles.listContainer}
          ItemSeparatorComponent={() => <Divider style={styles.divider} />}
          onRefresh={handleRefresh}
          refreshing={refreshing}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 32,
  },
  clubInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  clubImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  clubAvatar: {
    backgroundColor: '#1976D2',
  },
  clubDetails: {
    marginLeft: 12,
  },
  clubName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  followerCount: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  searchBar: {
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    height: 46,
  },
  searchInput: {
    fontSize: 14,
  },
  listContainer: {
    paddingBottom: 16,
    backgroundColor: '#fff',
  },
  followerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#fff',
  },
  followerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatar: {
    backgroundColor: '#1976D2',
  },
  userInfo: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  userUsername: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  userDetail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  followButton: {
    borderRadius: 20,
    minWidth: 100,
  },
  followButtonLabel: {
    fontSize: 12,
    marginVertical: 0,
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  divider: {
    marginLeft: 74,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default ClubFollowersScreen;
