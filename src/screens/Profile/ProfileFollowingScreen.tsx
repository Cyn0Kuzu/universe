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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirebaseCompatSync } from '../../firebase/compat';
import { useAuth } from '../../contexts/AuthContext';
import { StudentStackParamList } from '../../navigation/StudentNavigator';
import { userFollowSyncService } from '../../services/userFollowSyncService';
import { NotificationManagement } from '../../firebase/notificationManagement';
import { EnhancedUserActivityService } from '../../services/enhancedUserActivityService';
import { useGlobalFollowState } from '../../hooks/useGlobalFollowState';
import { globalFollowStateManager } from '../../services/globalFollowStateManager';

const firebase = getFirebaseCompatSync();

type ProfileFollowingScreenRouteProp = RouteProp<
  {
    ProfileFollowing: { userId: string };
  },
  'ProfileFollowing'
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
}

const ProfileFollowingScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<StudentStackParamList>>();
  const route = useRoute<ProfileFollowingScreenRouteProp>();
  const { userId } = route.params;
  const { currentUser, isClubAccount } = useAuth();
  
  // Global follow state integration
  const globalFollowActions = {
    unfollowUser: async (targetUserId: string) => {
      if (!currentUser) return false;
      const currentUserName = currentUser.displayName || currentUser.email || 'Anonim Kullanıcı';
      return await globalFollowStateManager.performUnfollow(
        currentUser.uid,
        currentUserName,
        targetUserId
      );
    }
  };
  
  const [user, setUser] = useState<{
    id: string;
    name?: string;
    displayName?: string;
    profileImage?: string;
    avatarIcon?: string;
    avatarColor?: string;
    followingCount?: number;
  } | null>(null);
  const [following, setFollowing] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const prevFollowingRef = useRef<string[] | null>(null);

  // Filtrelenmiş takip edilenler
  const filteredFollowing = useMemo(() => {
    if (!searchQuery.trim()) return following;
    
    const query = searchQuery.toLowerCase();
    return following.filter(user => 
      user.name?.toLowerCase().includes(query) ||
      user.displayName?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.university?.toLowerCase().includes(query) ||
      user.department?.toLowerCase().includes(query)
    );
  }, [following, searchQuery]);

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
          setUser({
            id: userId,
            name: userData?.name || '',
            displayName: userData?.displayName || '',
            profileImage: userData?.profileImage || userData?.photoURL,
            avatarIcon: userData?.avatarIcon,
            avatarColor: userData?.avatarColor,
            followingCount: userData?.following?.length || 0,
          });
        }
      }, (error) => {
        console.error('Error in user details listener:', error);
      });

      return unsubscribeUser;
    } catch (error) {
      console.error('Error setting up user details listener:', error);
    }
  }, [userId]);

  // Kullanıcının takip ettiklerini getir - Yeni Sync Service
  const fetchFollowing = useCallback(async () => {
    try {
      setLoading(true);
      
      // Yeni servis ile takip listesini al
      const followingData = await userFollowSyncService.getUserFollowing(userId, false);
      
      // UserFollowData[] formatından User[] formatına dönüştür
      const formattedFollowing: User[] = followingData.map(item => ({
        id: item.id,
        displayName: item.displayName,
        email: item.email,
        profileImage: item.photoURL,
        isFollowing: item.isFollowing,
        userType: 'student' as const
      }));
      
      setFollowing(formattedFollowing);
      console.log(`✅ Following data loaded: ${formattedFollowing.length} users`);

      // Persist latest following count for consistency with ProfileScreen
      try {
        const { saveFollowingCountToStorage } = require('../../firebase/userProfile');
        await saveFollowingCountToStorage(userId, formattedFollowing.length);
      } catch (persistErr) {
        console.warn('⚠️ Could not persist following count:', persistErr);
      }
      
    } catch (error) {
      console.error('❌ Error fetching following:', error);
      setFollowing([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const handleViewProfile = (userId: string) => {
    navigation.navigate('ViewProfile', { userId });
  };

  const handleViewClub = (clubId: string) => {
    navigation.navigate('ViewClub', { clubId });
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchUserDetails();
    fetchFollowing();
  };

  // Kullanıcıyı takip et/takipten çıkar - Global State Manager Kullanımı
  const handleToggleFollow = async (targetUserId: string, isFollowing: boolean) => {
    if (!currentUser || currentUser.uid === targetUserId || isClubAccount) return;
    
    try {
      const currentUserName = currentUser.displayName || currentUser.email || 'Anonim Kullanıcı';
      
      if (isFollowing) {
        // Takipten çık - Global State Manager kullan
        console.log(`🔄 Unfollowing user via Global State Manager: ${currentUserName} -> ${targetUserId}`);
        
        const success = await globalFollowStateManager.performUnfollow(
          currentUser.uid,
          currentUserName,
          targetUserId
        );
        
        if (success) {
          // Yerel state'i güncelle - takip edilenler listesinden çıkar
          setFollowing(prev => prev.filter(user => user.id !== targetUserId));
          console.log('✅ User unfollowed and removed from following list via Global State Manager');
        } else {
          throw new Error('Unfollow operation failed via Global State Manager');
        }
      } else {
        // Takip et - Global State Manager kullan
        console.log(`🔄 Following user via Global State Manager: ${currentUserName} -> ${targetUserId}`);
        
        const success = await globalFollowStateManager.performFollow(
          currentUser.uid,
          currentUserName,
          targetUserId
        );
        
        if (success) {
          // Yerel state'i güncelle - takip edilen olarak işaretle
          setFollowing(prev => prev.map(user => 
            user.id === targetUserId 
              ? { ...user, isFollowing: true }
              : user
          ));
          console.log('✅ User followed via Global State Manager');
        } else {
          throw new Error('Follow operation failed via Global State Manager');
        }
      }
    } catch (error) {
      console.error('❌ Toggle follow error via Global State Manager:', error);
    }
  };

  const FollowingRow: React.FC<{ item: User }> = ({ item }) => {
    const { avatarData } = useUserAvatar(item.id);
    const isClub = item.userType === 'club';
    const displayName = avatarData?.displayName || item.displayName || item.name || 'İsimsiz Kullanıcı';
    const handle = getUsernameDisplay(item, avatarData?.userName);
    const university = avatarData?.university || item.university;

    return (
      <View style={styles.followingItem}>
        <TouchableOpacity
          style={styles.followingProfile}
          onPress={() => isClub ? handleViewClub(item.id) : handleViewProfile(item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.avatarContainer}>
            <UniversalAvatar user={item} size={50} />
          </View>
          <View style={styles.followingInfo}>
            <View style={styles.followingNameRow}>
              <Text style={styles.followingName}>
                {displayName}
              </Text>
              {isClub && (
                <MaterialCommunityIcons
                  name="shield-check"
                  size={16}
                  color="#1E88E5"
                  style={{ marginLeft: 4 }}
                />
              )}
            </View>
            {/* Kullanıcı adı */}
            <Text style={styles.followingUsername}>
              @{handle}
            </Text>
            {university && (
              <Text style={styles.followingUniversity}>{university}</Text>
            )}
            {item.bio && (
              <Text
                style={styles.followingBio}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.bio}
              </Text>
            )}
          </View>
        </TouchableOpacity>
        
        {/* Follow/Unfollow Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.followButton,
              { 
                backgroundColor: '#FF6B6B',
                borderColor: '#FF6B6B'
              }
            ]}
            onPress={() => handleToggleFollow(item.id, isClub)}
            activeOpacity={0.8}
          >
            <Text style={[styles.followButtonText, { color: '#FFFFFF' }]}>
              Takibi Bırak
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Ana initialization useEffect - Tüm listener'ları başlat
  useEffect(() => {
    if (!userId) return;

    let unsubscribeUser: (() => void) | undefined;
  let unsubscribeFollowing: (() => void) | undefined;

    const setupListeners = async () => {
      try {
        // User details listener'ını başlat
        unsubscribeUser = await fetchUserDetails();
        
        // Following listener'ını başlat - user doc üzerinden array değişimleri
        console.log(`🔔 Setting up real-time following listener for user: ${userId}`);
        unsubscribeFollowing = getFirebaseCompatSync().firestore()
          .collection('users')
          .doc(userId)
          .onSnapshot(
            async (doc) => {
              if (doc.exists) {
                const data = doc.data() || {} as any;
                const following: string[] = Array.isArray(data.following) ? data.following : [];
                const prev = prevFollowingRef.current;
                const changed = !prev || following.length !== prev.length || JSON.stringify(following) !== JSON.stringify(prev);
                if (changed) {
                  prevFollowingRef.current = following;
                  console.log(`🔄 Following array changed for user ${userId}, reloading list...`);
                  await fetchFollowing();
                }
              }
            },
            (error) => {
              console.error('❌ Following real-time listener error:', error);
            }
          );

        // Initial load
        await fetchFollowing();
      } catch (error) {
        console.error('Error setting up listeners:', error);
      }
    };

    setupListeners();

    return () => {
      console.log(`🔕 Cleaning up all listeners for user: ${userId}`);
      if (unsubscribeUser) unsubscribeUser();
      if (unsubscribeFollowing) unsubscribeFollowing();
    };
  }, [userId]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Takip Edilenler
        </Text>
        <View style={styles.placeholder} />
      </View>
      
      <Searchbar
        placeholder="Takip edilenlerde ara..."
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
          <Text style={styles.loadingText}>Takip edilenler yükleniyor...</Text>
        </View>
      ) : filteredFollowing.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="account-multiple" size={64} color="#e0e0e0" />
          <Text style={styles.emptyTitle}>
            {searchQuery ? 'Arama sonucu bulunamadı' : 'Henüz takip edilen yok'}
          </Text>
          <Text style={styles.emptyText}>
            {searchQuery 
              ? 'Aradığınız kriterlere uygun kullanıcı bulunamadı.'
              : 'Bu kullanıcı henüz kimseyi takip etmiyor.'
            }
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredFollowing}
          renderItem={({ item }) => <FollowingRow item={item} />}
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
  followingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  followingProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    marginRight: 12,
  },
  followingImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  followingAvatar: {
    backgroundColor: '#1E88E5',
  },
  avatarIconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  followingInfo: {
    flex: 1,
  },
  followingNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  followingName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  followingUsername: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  followingUniversity: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  followingBio: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
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
  followButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});

export default ProfileFollowingScreen;
