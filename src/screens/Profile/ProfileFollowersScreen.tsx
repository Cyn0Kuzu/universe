import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, Avatar, Button, Divider, useTheme, Searchbar } from 'react-native-paper';
import { UniversalAvatar } from '../../components/common';
import { useUserAvatar } from '../../hooks/useUserAvatar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getFirebaseCompatSync } from '../../firebase/compat';
import { useAuth } from '../../contexts/AuthContext';
import { StudentStackParamList } from '../../navigation/StudentNavigator';
import { userFollowSyncService } from '../../services/userFollowSyncService';
import { globalFollowStateManager } from '../../services/globalFollowStateManager';
import useGlobalFollowState from '../../hooks/useGlobalFollowState';

const firebase = getFirebaseCompatSync();

type ProfileFollowersScreenRouteProp = RouteProp<
  {
    ProfileFollowers: { userId: string };
  },
  'ProfileFollowers'
>;

interface User {
  id: string;
  name?: string;
  displayName?: string;
  username?: string;
  email?: string;
  profileImage?: string;
  avatarIcon?: string;
  avatarColor?: string;
  university?: string;
  department?: string;
  bio?: string;
  isFollowing?: boolean;
  userType?: 'student' | 'club';
  blockedUsers?: string[];
}

const ProfileFollowersScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<StudentStackParamList>>();
  const route = useRoute<ProfileFollowersScreenRouteProp>();
  const { userId } = route.params;
  const { currentUser, isClubAccount, userProfile: authUserProfile } = useAuth();
  
  const [user, setUser] = useState<{
    id: string;
    name?: string;
    displayName?: string;
    profileImage?: string;
    avatarIcon?: string;
    avatarColor?: string;
    followerCount?: number;
  } | null>(null);
  const [followers, setFollowers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState<string | null>(null); // userId to track which user is being followed/unfollowed
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // Previous followers to avoid redundant reloads on non-array changes
  const prevFollowersRef = useRef<string[] | null>(null);

  // Filtrelenmiş takipçiler
  const filteredFollowers = useMemo(() => {
    if (!searchQuery.trim()) return followers;
    
    const query = searchQuery.toLowerCase();
    return followers.filter(user => 
      user.name?.toLowerCase().includes(query) ||
      user.displayName?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.university?.toLowerCase().includes(query) ||
      user.department?.toLowerCase().includes(query)
    );
  }, [followers, searchQuery]);

  const isUserHidden = useCallback(
    (targetId: string, targetBlockedUsers?: string[]) => {
      if (!currentUser?.uid) return false;
      const blockedByMe =
        Array.isArray(authUserProfile?.blockedUsers) && authUserProfile!.blockedUsers.includes(targetId);
      const blockedMe = Array.isArray(targetBlockedUsers) && targetBlockedUsers.includes(currentUser.uid);
      return blockedByMe || blockedMe;
    },
    [authUserProfile?.blockedUsers, currentUser?.uid]
  );

  // Avatar label'ı güvenli şekilde al
  const getAvatarLabel = (user: User): string => {
    if (user.displayName && user.displayName.trim()) {
      return user.displayName.trim()[0].toUpperCase();
    }
    if (user.name && user.name.trim()) {
      return user.name.trim()[0].toUpperCase();
    }
    if (user.email && user.email.trim()) {
      return user.email.trim()[0].toUpperCase();
    }
    return 'K'; // Kullanıcı için varsayılan
  };

  // Kullanıcı adını güvenli şekilde al (avatar cache öncelikli)
  const getUsernameDisplay = (user: User, avatarUserName?: string): string => {
    const preferred = avatarUserName || user.username;
    if (preferred && preferred.trim()) return preferred.toLowerCase();

    if (user.displayName && user.displayName.trim()) {
      const cleanName = user.displayName
        .replace(/[^a-zA-Z0-9çğıöşüÇĞIİÖŞÜ\s]/g, '')
        .replace(/\s+/g, '')
        .toLowerCase();
      if (cleanName.length > 0) return cleanName;
    }
    if (user.email && user.email.includes('@')) {
      return user.email.split('@')[0].toLowerCase();
    }
    return 'kullanici';
  };

  // Kullanıcının bilgilerini getir - Real-time listener ile
  const fetchUserDetails = useCallback(async () => {
    try {
      const db = getFirebaseCompatSync().firestore();
      
      // Real-time listener için user details
      const unsubscribeUser = db.collection('users').doc(userId).onSnapshot(async (userDoc) => {
        if (userDoc.exists) {
          const userData = userDoc.data();
          // DO NOT write inside snapshot; only derive counts to avoid loops
          const followersArr: string[] = Array.isArray(userData?.followers) ? userData!.followers : [];
          const followerCount = followersArr.length > 0 ? followersArr.length : (userData?.followerCount || 0);
          setUser({
            id: userId,
            name: userData?.name || '',
            displayName: userData?.displayName || '',
            profileImage: userData?.profileImage || userData?.photoURL,
            avatarIcon: userData?.avatarIcon,
            avatarColor: userData?.avatarColor,
            followerCount,
          });
        }
      }, (error) => {
        console.error('Error in user details listener:', error);
      });

      // Cleanup function'a ekle
      return unsubscribeUser;
    } catch (error) {
      console.error('Error setting up user details listener:', error);
    }
  }, [userId]);

  // Kullanıcı takipçilerini getir - Real-time listener ile
  const fetchFollowers = useCallback(async () => {
    try {
      setLoading(true);
      
      // Yeni servis ile takipçi listesini al
      const followersData = await userFollowSyncService.getUserFollowers(userId, false);
      
      // UserFollowData[] formatından User[] formatına dönüştür
      const formattedFollowers: User[] = [];
      
      for (const item of followersData) {
        if (isUserHidden(item.id, item.blockedUsers)) {
          continue;
        }
        // Eğer giriş yapmış kullanıcı varsa, takip durumunu kontrol et
        let isFollowing = false;
        if (currentUser) {
          const followStatus = await userFollowSyncService.checkFollowStatus(currentUser.uid, item.id);
          isFollowing = followStatus.isFollowing;
        }
        
        formattedFollowers.push({
          id: item.id,
          displayName: item.displayName,
          email: item.email,
          profileImage: item.photoURL,
          isFollowing,
          userType: 'student' as const,
          blockedUsers: Array.isArray(item.blockedUsers) ? item.blockedUsers : [],
        });
      }
      
      setFollowers(formattedFollowers);
      console.log(`✅ Followers data loaded: ${formattedFollowers.length} users`);

      // Persist latest count for consistency with ProfileScreen
      try {
        const { saveFollowerCountToStorage } = require('../../firebase/userProfile');
        await saveFollowerCountToStorage(userId, formattedFollowers.length);
      } catch (persistErr) {
        console.warn('⚠️ Could not persist follower count:', persistErr);
      }
      
    } catch (error) {
      console.error('❌ Error fetching followers:', error);
      setFollowers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, currentUser, isUserHidden]);

  // Ana initialization useEffect - Tüm listener'ları başlat
  useEffect(() => {
    if (!userId) return;

    let unsubscribeUser: (() => void) | undefined;
  let unsubscribeFollowers: (() => void) | undefined;

    const setupListeners = async () => {
      try {
        // User details listener'ını başlat
        unsubscribeUser = await fetchUserDetails();
        
        // Followers listener'ını başlat - user doc üzerinden array değişimleri
        console.log(`🔔 Setting up real-time followers listener for user: ${userId}`);
        unsubscribeFollowers = getFirebaseCompatSync().firestore()
          .collection('users')
          .doc(userId)
          .onSnapshot(
            async (doc) => {
              if (doc.exists) {
                const data = doc.data() || {} as any;
                const followers: string[] = Array.isArray(data.followers) ? data.followers : [];
                const prev = prevFollowersRef.current;
                const changed = !prev || followers.length !== prev.length || JSON.stringify(followers) !== JSON.stringify(prev);
                if (changed) {
                  prevFollowersRef.current = followers;
                  console.log(`🔄 Followers array changed for user ${userId}, reloading list...`);
                  await fetchFollowers();
                }
              }
            },
            (error) => {
              console.error('❌ Followers real-time listener error:', error);
            }
          );

        // Initial load
        await fetchFollowers();
      } catch (error) {
        console.error('Error setting up listeners:', error);
      }
    };

    setupListeners();

    return () => {
      console.log(`🔕 Cleaning up all listeners for user: ${userId}`);
      if (unsubscribeUser) unsubscribeUser();
      if (unsubscribeFollowers) unsubscribeFollowers();
    };
  }, [userId]);

  // Kullanıcıları takip etme/bırakma işlevi - Yeni Sync Service ile
  const handleToggleFollow = async (followerId: string, isFollowing: boolean) => {
    if (!currentUser || currentUser.uid === followerId || isClubAccount || followLoading === followerId) return;
    
    setFollowLoading(followerId);
    try {
      const currentUserName = currentUser.displayName || currentUser.email || 'Anonim Kullanıcı';
      
      if (isFollowing) {
        // Takipten çık
        const success = await userFollowSyncService.unfollowUser(
          currentUser.uid,
          currentUserName,
          followerId
        );
        
        if (success) {
          console.log('✅ User unfollowed successfully');
        }
      } else {
        // Takip et
        const success = await userFollowSyncService.followUser(
          currentUser.uid,
          currentUserName,
          followerId
        );
        
        if (success) {
          console.log('✅ User followed successfully');
        }
      }
      
      // Yerel durumu güncelle
      setFollowers(prev => 
        prev.map(user => 
          user.id === followerId ? {...user, isFollowing: !isFollowing} : user
        )
      );
    } catch (error) {
      console.error('Error toggling follow status:', error);
    } finally {
      setFollowLoading(null);
    }
  };

  // Remove follower function - Using Global State Manager
  const handleRemoveFollower = async (followerId: string) => {
    try {
      if (!currentUser) return;
      
      console.log('🚫 Removing follower via Global State Manager:', followerId);
      
      const currentUserName = user?.name || user?.displayName || 'Ben';
      
      // Use global state manager for synchronized removal
      const success = await globalFollowStateManager.performRemoveFollower(
        currentUser.uid,
        currentUserName,
        followerId
      );

      if (success) {
        // Log activity
        try {
          const { EnhancedUserActivityService } = require('../../services/enhancedUserActivityService');
          const activityService = EnhancedUserActivityService.getInstance();
          
          const followerDoc = await getFirebaseCompatSync().firestore()
            .collection('users')
            .doc(followerId)
            .get();
          
          const followerData = followerDoc.data();
          const followerName = followerData?.displayName || followerData?.firstName + ' ' + followerData?.lastName || 'Kullanıcı';
          
          await activityService.logFollowerRemoval(
            currentUser.uid,
            currentUserName,
            followerId,
            followerName
          );
          console.log('✅ Follower removal activity logged');
        } catch (activityError) {
          console.warn('⚠️ Activity logging failed:', activityError);
        }

        // Update local followers list
        setFollowers(prev => prev.filter(user => user.id !== followerId));
        
        // Get updated stats from global manager
        const updatedStats = globalFollowStateManager.getUserStats(currentUser.uid);
        if (updatedStats) {
          setUser(prev => prev ? {
            ...prev,
            followerCount: updatedStats.followerCount
          } : null);
        }
        
        console.log('✅ Follower removed successfully via Global State Manager');
      } else {
        console.error('❌ Failed to remove follower via Global State Manager');
      }
    } catch (error) {
      console.error('❌ Error removing follower:', error);
    }
  };

  // Handle when we want to remove a follower (simulate follower unfollowing us)
  const handleFollowerUnfollow = async (followerId: string) => {
    try {
      if (!currentUser) return;
      
      console.log('🔄 Simulating follower unfollowing current user:', followerId, '->', currentUser.uid);
      
      // We simulate that the follower unfollows us by breaking the follow relationship
      // This means: followerId was following currentUser.uid, now they unfollow
      const success = await globalFollowStateManager.performUnfollow(
        followerId, // the follower who is unfollowing
        '', // follower name (not needed for unfollow)
        currentUser.uid // the user being unfollowed (current user)
      );

      if (success) {
        console.log('✅ Follower removed successfully (simulated unfollow)');
        
        // Takipçi sayılarını doğrula ve düzelt
        try {
          await globalFollowStateManager.verifyAndFixFollowerCounts(currentUser.uid);
          console.log('✅ Follower counts verified and corrected after removal');
        } catch (error) {
          console.error('❌ Error verifying follower counts:', error);
        }
        
        // Force refresh to get updated counts from server
        await fetchUserDetails();
        await fetchFollowers();
        
        // Also update local state immediately for better UX
        setFollowers(prev => prev.filter(user => user.id !== followerId));
        
      } else {
        console.error('❌ Failed to remove follower');
      }
    } catch (error) {
      console.error('❌ Error removing follower:', error);
    }
  };

  const handleViewProfile = (userId: string) => {
    navigation.navigate('ViewProfile', { userId });
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    
    // Takipçi sayılarını doğrula (eğer current user'ın profili ise)
    if (currentUser && userId === currentUser.uid) {
      try {
        await globalFollowStateManager.verifyAndFixFollowerCounts(currentUser.uid);
        console.log('✅ Follower counts verified during refresh');
      } catch (error) {
        console.error('❌ Error verifying follower counts during refresh:', error);
      }
    }
    
    await fetchUserDetails();
    await fetchFollowers();
  };

  // Satır bileşeni: canlı profil verileriyle isim/kullanıcı adı
  const FollowerRow: React.FC<{ item: User }> = ({ item }) => {
    const { avatarData } = useUserAvatar(item.id);
    const displayName = avatarData?.displayName || item.displayName || item.name || 'İsimsiz Kullanıcı';
    const handle = getUsernameDisplay(item, avatarData?.userName);
    const university = avatarData?.university || item.university;

    // Aramaya göre filtrele
    if (
      searchQuery &&
      !(
        (displayName && displayName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (university && university.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.department && item.department.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    ) {
      return null;
    }

    return (
      <View style={styles.followerItem}>
        <TouchableOpacity
          style={styles.followerProfile}
          onPress={() => handleViewProfile(item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.avatarContainer}>
            <UniversalAvatar user={item} size={50} />
          </View>
          <View style={styles.followerInfo}>
            <Text style={styles.followerName}>
              {displayName}
            </Text>
            {/* Kullanıcı adı */}
            <Text style={styles.followerUsername}>
              @{handle}
            </Text>
            {university && (
              <Text style={styles.followerUniversity}>{university}</Text>
            )}
            {item.bio && (
              <Text
                style={styles.followerBio}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.bio}
              </Text>
            )}
          </View>
        </TouchableOpacity>

        {currentUser && currentUser.uid !== item.id && !isClubAccount && (
          <View style={styles.buttonContainer}>
            <Button
              mode={item.isFollowing ? 'outlined' : 'contained'}
              style={styles.followButton}
              labelStyle={styles.followButtonLabel}
              loading={followLoading === item.id}
              disabled={followLoading === item.id}
              onPress={() => handleToggleFollow(item.id, item.isFollowing || false)}
            >
              {followLoading === item.id 
                ? 'İşleniyor...' 
                : item.isFollowing ? 'Takip Ediliyor' : 'Takip Et'}
            </Button>
            
            {/* Remove Follower X Button - follower unfollows current user */}
            <TouchableOpacity
              style={styles.unfollowButton}
              onPress={() => handleFollowerUnfollow(item.id)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="close" size={20} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // Global follow state değişikliklerini dinle
  useEffect(() => {
    if (!currentUser || !userId) return;

    const unsubscribe = globalFollowStateManager.subscribeToUser(userId, (update: any) => {
      console.log('👥 Follow state update received for user:', userId, update);
      
      // Takipçi sayısı güncellemesi
      if (update.followerCount !== undefined) {
        setUser(prev => prev ? {
          ...prev,
          followerCount: update.followerCount
        } : null);
      }
    });

    return () => unsubscribe();

    return unsubscribe;
  }, [currentUser, userId, fetchFollowers]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Takipçiler
        </Text>
        <View style={styles.placeholder} />
      </View>
      
      <Searchbar
        placeholder="Takipçilerde ara..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
        iconColor="#666"
        clearIcon={() => searchQuery ? (
          <MaterialCommunityIcons name="close" size={20} color="#666" />
        ) : (
          <MaterialCommunityIcons name="magnify" size={20} color="transparent" />
        )}
      />
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Takipçiler yükleniyor...</Text>
        </View>
      ) : filteredFollowers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="account-group" size={64} color="#e0e0e0" />
          <Text style={styles.emptyTitle}>
            {searchQuery ? 'Arama sonucu bulunamadı' : 'Henüz takipçi yok'}
          </Text>
          <Text style={styles.emptyText}>
            {searchQuery 
              ? 'Aradığınız kriterlere uygun kullanıcı bulunamadı.'
              : 'Bu kullanıcının henüz takipçisi bulunmuyor.'
            }
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredFollowers}
          renderItem={({ item }) => <FollowerRow item={item} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <Divider style={styles.divider} />}
          refreshing={refreshing}
          onRefresh={handleRefresh}
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
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  searchBar: {
    margin: 16,
    backgroundColor: '#f5f5f5',
    elevation: 1,
    borderRadius: 10,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  followerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  followerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    marginRight: 12,
  },
  followerImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  followerAvatar: {
    backgroundColor: '#1E88E5',
  },
  avatarIconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  followerInfo: {
    flex: 1,
  },
  followerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  followerUsername: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  followerUniversity: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  followerBio: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  followButton: {
    borderRadius: 20,
    height: 36,
    paddingHorizontal: 12,
  },
  followButtonLabel: {
    fontSize: 12,
    marginVertical: 0,
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unfollowButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF0F0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFE0E0',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
    textAlign: 'center',
    maxWidth: '80%',
  },
});

export default ProfileFollowersScreen;
