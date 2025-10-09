import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, Share, ImageBackground, Dimensions } from 'react-native';
import { Text, Avatar, Button, useTheme, Menu, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { firebase } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { StudentStackParamList } from '../../navigation/StudentNavigator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UniversalAvatar } from '../../components/common';
import ImageZoomModal from '../../components/common/ImageZoomModal';
import { ClubNotificationService } from '../../services/clubNotificationService';
import { NotificationManagement } from '../../firebase/notificationManagement';
import { EnhancedUserActivityService } from '../../services/enhancedUserActivityService';
import { userFollowSyncService } from '../../services/userFollowSyncService';
import { globalFollowStateManager } from '../../services/globalFollowStateManager';
import unifiedStatisticsService, { UserStatistics } from '../../services/unifiedStatisticsService';

type ViewProfileScreenRouteProp = RouteProp<
  {
    ViewProfile: { userId: string };
  },
  'ViewProfile'
>;

interface CustomTheme {
  colors: {
    primary: string;
    accent: string;
    background: string;
    text: string;
    placeholder: string;
    cardBorder: string;
    lightGray: string;
    secondaryBlue: string;
    darkBlue: string;
  }
}

interface User {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  email?: string;
  profileImage?: string;
  coverImage?: string;
  coverIcon?: string;
  coverColor?: string;
  avatarIcon?: string;
  avatarColor?: string;
  university?: string;
  department?: string;
  bio?: string;
  classLevel?: string;
  userType?: string;
  followerCount?: number;
  followingCount?: number;
  eventCount?: number;
  attendedEvents?: string[];
  isFollowing?: boolean;
  createdAt?: any;
  username?: string;
  totalLikes?: number;
  totalComments?: number;
  totalParticipations?: number;
}

const ViewProfileScreen: React.FC = () => {
  const theme = useTheme() as CustomTheme;
  const navigation = useNavigation<NativeStackNavigationProp<StudentStackParamList>>();
  const route = useRoute<ViewProfileScreenRouteProp>();
  const userId = route.params?.userId;
  const { currentUser, isClubAccount } = useAuth();
  
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [membershipCount, setMembershipCount] = useState(0);
  const [memberClubsMini, setMemberClubsMini] = useState<Array<{ id: string; name: string; displayName?: string; profileImage?: string; avatarIcon?: string; avatarColor?: string }>>([]);
  const [userStats, setUserStats] = useState<UserStatistics>({
    likes: 0,
    comments: 0,
    participations: 0,
    totalPoints: 0,
    rank: 0,
    level: 1,
    streakCount: 0,
    likesRank: 0,
    commentsRank: 0,
    participationsRank: 0
  });

  // Image Zoom Modal States
  const [imageZoomVisible, setImageZoomVisible] = useState(false);
  const [zoomImageUri, setZoomImageUri] = useState('');
  const [zoomImageTitle, setZoomImageTitle] = useState('');

  // Image zoom functions
  const handleImageZoom = useCallback((imageUri: string, title: string) => {
    if (imageUri) {
      setZoomImageUri(imageUri);
      setZoomImageTitle(title);
      setImageZoomVisible(true);
    }
  }, []);

  const handleCloseImageZoom = useCallback(() => {
    setImageZoomVisible(false);
    setZoomImageUri('');
    setZoomImageTitle('');
  }, []);

  // Tarih formatlama fonksiyonu
  const formatJoinDate = useCallback((userProfile: any) => {
    try {
      if (userProfile?.createdAt?.seconds) {
        return new Date(userProfile.createdAt.seconds * 1000).toLocaleDateString('tr-TR');
      }
      else if (userProfile?.createdAt instanceof Date) {
        return userProfile.createdAt.toLocaleDateString('tr-TR');
      }
      else if (typeof userProfile?.createdAt === 'string') {
        return new Date(userProfile.createdAt).toLocaleDateString('tr-TR');
      }
      else if (userProfile?.createdAt && typeof userProfile.createdAt.toDate === 'function') {
        return userProfile.createdAt.toDate().toLocaleDateString('tr-TR');
      }
      else if (userProfile?.createdDate?.seconds) {
        return new Date(userProfile.createdDate.seconds * 1000).toLocaleDateString('tr-TR');
      }
      else {
        return new Date().toLocaleDateString('tr-TR') + ' (Yaklaşık)';
      }
    } catch (error) {
      console.error('Tarih formatlanırken hata:', error);
      return new Date().toLocaleDateString('tr-TR') + ' (Hata)';
    }
  }, []);

  // Kullanıcı istatistiklerini yükle
  const loadUserStatistics = useCallback(async () => {
    if (!userId) {
      console.warn('🚫 loadUserStatistics: userId is missing');
      return;
    }
    
    try {
      console.log('🔄 ViewProfileScreen: Loading unified user statistics for user:', userId);
      const statistics = await unifiedStatisticsService.getUserStatistics(userId);
      
      // Verilerin doğruluğunu kontrol et
      console.log('📊 ViewProfileScreen: Statistics loaded:', {
        userId,
        likes: statistics.likes,
        comments: statistics.comments,
        participations: statistics.participations,
        totalPoints: statistics.totalPoints,
        rank: statistics.rank
      });
      
      setUserStats(statistics);
      console.log('✅ ViewProfileScreen: Unified user statistics loaded successfully');
      
    } catch (error) {
      console.error('❌ ViewProfileScreen: Error loading unified user statistics:', error);
      // Set default values on error
      const defaultStats: UserStatistics = {
        likes: 0,
        comments: 0,
        participations: 0,
        totalPoints: 0,
        rank: 0,
        level: 1,
        streakCount: 0,
        likesRank: 0,
        commentsRank: 0,
        participationsRank: 0
      };
      setUserStats(defaultStats);
      console.log('📊 ViewProfileScreen: Set default statistics due to error');
    }
  }, [userId]);

  // Kullanıcı bilgilerini getir
  const fetchUserDetails = useCallback(async () => {
    try {
      setLoading(true);
      if (!userId) {
        console.error('ViewProfileScreen: userId is undefined or null');
        setLoading(false);
        Alert.alert(
          'Hata',
          'Profil bilgileri yüklenemedi. Kullanıcı kimliği bulunamadı.',
          [{ 
            text: 'Tamam', 
            onPress: () => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('StudentTabs');
              }
            }
          }]
        );
        return;
      }

      const db = firebase.firestore();
      const userDoc = await db.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        console.error('User not found');
        setLoading(false);
        return;
      }
      
      const userData = userDoc.data();
      
      // Kullanıcı takip durumunu local storage'dan kontrol et
      let isFollowing = false;
      if (currentUser) {
        try {
          const followingKey = `following_${currentUser.uid}`;
          const followingData = await AsyncStorage.getItem(followingKey);
          const following: string[] = followingData ? JSON.parse(followingData) : [];
          isFollowing = following.includes(userId);
        } catch (error) {
          console.error('Error checking follow status from local storage:', error);
          // Fallback to Firebase
          const currentUserDoc = await db.collection('users').doc(currentUser.uid).get();
          const currentUserData = currentUserDoc.data();
          isFollowing = currentUserData?.following?.includes(userId) || false;
        }
      }
      
      // Local follower count'u al
      let localFollowerCount = userData?.followerCount || userData?.followers?.length || 0;
      try {
        const followersKey = `followers_${userId}`;
        const followersData = await AsyncStorage.getItem(followersKey);
        if (followersData) {
          const followers: string[] = JSON.parse(followersData);
          localFollowerCount = followers.length;
        }
      } catch (error) {
        console.error('Error getting local follower count:', error);
      }
      
      // Başlangıç kullanıcı verisi - gerçek zamanlı hesaplama
      const initialUser: User = {
        id: userId,
        name: userData?.name || '',
        displayName: userData?.displayName || '',
        firstName: userData?.firstName || '',
        lastName: userData?.lastName || '',
        email: userData?.email || '',
        profileImage: userData?.profileImage || '',
        coverImage: userData?.coverImage || '',
        coverIcon: userData?.coverIcon || '',
        coverColor: userData?.coverColor || '',
        avatarIcon: userData?.avatarIcon || '',
        avatarColor: userData?.avatarColor || '',
        university: userData?.university || '',
        department: userData?.department || '',
        bio: userData?.bio || '',
        classLevel: userData?.classLevel || '',
        userType: userData?.userType || 'student',
        followerCount: userData?.followers ? userData.followers.length : 0, // Gerçek zamanlı hesaplama
        followingCount: userData?.following ? userData.following.length : 0, // Gerçek zamanlı hesaplama
        eventCount: userData?.eventCount || userData?.attendedEvents?.length || 0,
        attendedEvents: userData?.attendedEvents || [],
        isFollowing,
        createdAt: userData?.createdAt,
        username: userData?.username || ''
      };

      // Öğrenci profilleri için eventCount'u eventAttendees üzerinden doğru hesapla
      if ((userData?.userType || 'student') !== 'club') {
        try {
          const attendeesSnapshot = await firebase.firestore()
            .collection('eventAttendees')
            .where('userId', '==', userId)
            .get();
          initialUser.eventCount = attendeesSnapshot.size;
        } catch (err) {
          console.warn('⚠️ ViewProfileScreen attended events count fetch failed, using fallback:', err);
        }
      }

      setUser(initialUser);
      
      // İstatistikleri yükle
      await loadUserStatistics();
      
    } catch (error) {
      console.error('Error fetching user details:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, currentUser]);

  // Real-time attended events count for viewed student profile
  useEffect(() => {
    if (!userId || user?.userType === 'club') return;
    const db = firebase.firestore();
    const unsub = db.collection('eventAttendees')
      .where('userId', '==', userId)
      .onSnapshot(
        (snap) => {
          setUser(prev => prev ? { ...prev, eventCount: snap.size } : prev);
        },
        (err) => console.error('❌ ViewProfileScreen real-time attended events error:', err)
      );
    return unsub;
  }, [userId, user?.userType]);

  // Real-time follower and following counts
  useEffect(() => {
    if (!userId) return;
    
    const db = firebase.firestore();
    const userDocRef = db.collection('users').doc(userId);
    
    const unsubscribe = userDocRef.onSnapshot(
      (doc) => {
        if (doc.exists) {
          const data = doc.data();
          setUser(prev => prev ? {
            ...prev,
            followerCount: data?.followers ? data.followers.length : 0,
            followingCount: data?.following ? data.following.length : 0,
          } : prev);
        }
      },
      (err) => console.error('❌ ViewProfileScreen real-time user stats error:', err)
    );
    
    return unsubscribe;
  }, [userId]);

  // Takip etme/takipten çıkma işlemi - Global State Manager
  const handleToggleFollow = async () => {
    console.log('🔄 handleToggleFollow called', { 
      currentUser: currentUser?.uid, 
      user: user?.displayName, 
      isFollowing: user?.isFollowing 
    });
    
    if (!currentUser || !user) {
      console.log('❌ Missing currentUser or user data');
      return;
    }
    
    try {
      const currentUserName = currentUser.displayName || currentUser.email || 'Anonim Kullanıcı';
      
      if (user.isFollowing) {
        // Takipten çık - Global State Manager kullan
        console.log(`🔄 Unfollowing user via Global State Manager: ${currentUserName} -> ${user.displayName}`);
        
        const success = await globalFollowStateManager.performUnfollow(
          currentUser.uid,
          currentUserName,
          userId
        );
        
        if (success) {
          // Get updated stats from global manager
          const updatedStats = globalFollowStateManager.getUserStats(userId);
          
          setUser(prev => prev ? {
            ...prev, 
            isFollowing: false, 
            followerCount: updatedStats?.followerCount || Math.max(0, (prev.followerCount || 0) - 1)
          } : null);
          
          console.log('✅ User unfollowed successfully via Global State Manager');
        } else {
          throw new Error('Unfollow operation failed via Global State Manager');
        }
      } else {
        // Takip et - Global State Manager kullan
        console.log(`🔄 Following user via Global State Manager: ${currentUserName} -> ${user.displayName}`);
        
        const success = await globalFollowStateManager.performFollow(
          currentUser.uid,
          currentUserName,
          userId
        );
        
        if (success) {
          // Get updated stats from global manager
          const updatedStats = globalFollowStateManager.getUserStats(userId);
          
          setUser(prev => prev ? {
            ...prev, 
            isFollowing: true, 
            followerCount: updatedStats?.followerCount || (prev.followerCount || 0) + 1
          } : null);
          
          console.log('✅ User followed successfully via Global State Manager');
        } else {
          throw new Error('Follow operation failed via Global State Manager');
        }
      }
      
    } catch (error) {
      console.error('Error toggling follow status via Global State Manager:', error);
      Alert.alert('Hata', 'Takip durumu değiştirilirken bir hata oluştu.');
    }
  };

  // Takipçileri görüntüleme işlevi
  const handleViewFollowers = () => {
    navigation.navigate('ProfileFollowers', { userId });
  };
  
  // Takip edilenleri görüntüleme işlevi
  const handleViewFollowing = () => {
    navigation.navigate('ProfileFollowing', { userId });
  };

  // Kullanıcının katıldığı etkinlikleri görüntüleme
  const handleViewEvents = () => {
    navigation.navigate('StudentEventsList', { 
      userId,
      userName: user?.firstName && user?.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : user?.name || user?.displayName
    });
  };
  
  // Yenileme işlevi
  const handleRefresh = () => {
    setRefreshing(true);
    fetchUserDetails();
  };
  
  // Profil paylaşma işlevi
  const handleShareProfile = async () => {
    try {
      const userName = user?.displayName || user?.name || 'Bir kullanıcı';
      const message = `${userName}'nın Universe profili`;
      const url = `https://universe.app/users/${userId}`;
      
      await Share.share({
        message: `${message}\n${url}`,
        title: message,
      });
    } catch (error) {
      console.error('Profil paylaşım hatası:', error);
      Alert.alert('Paylaşım Hatası', 'Profil paylaşılırken bir sorun oluştu.');
    }
  };

  useEffect(() => {
    if (userId) {
      fetchUserDetails();
    } else {
      console.error('useEffect içinde userId yok!');
    }
  }, [fetchUserDetails, userId]);

  // Refresh statistics when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (userId) {
        console.log('🔄 ViewProfileScreen focused - refreshing statistics');
        loadUserStatistics();
      }
    }, [userId, loadUserStatistics])
  );

  // Real-time statistics updates
  useEffect(() => {
    if (!userId) return;

    console.log('📊 Setting up real-time statistics listeners for user:', userId);

    const db = firebase.firestore();
    const unsubscribers: (() => void)[] = [];

    // Listen to user's likes
    const likesUnsub = db.collection('eventLikes')
      .where('userId', '==', userId)
      .onSnapshot(
        (snapshot) => {
          const likesCount = snapshot.size;
          console.log('📊 Real-time likes update:', likesCount);
          setUserStats(prev => ({ ...prev, likes: likesCount }));
        },
        (error) => console.warn('❌ Likes listener error:', error)
      );
    unsubscribers.push(likesUnsub);

    // Listen to user's participations
    const participationsUnsub = db.collection('eventAttendees')
      .where('userId', '==', userId)
      .onSnapshot(
        (snapshot) => {
          const participationsCount = snapshot.size;
          console.log('📊 Real-time participations update:', participationsCount);
          setUserStats(prev => ({ ...prev, participations: participationsCount }));
        },
        (error) => console.warn('❌ Participations listener error:', error)
      );
    unsubscribers.push(participationsUnsub);

    // Listen to user's comments using collectionGroup
    const commentsUnsub = db.collectionGroup('comments')
      .where('userId', '==', userId)
      .onSnapshot(
        (snapshot) => {
          const commentsCount = snapshot.size;
          console.log('📊 Real-time comments update:', commentsCount);
          setUserStats(prev => ({ ...prev, comments: commentsCount }));
        },
        (error) => {
          console.warn('❌ Comments collectionGroup listener error:', error);
          // If collectionGroup fails, don't update comments count
        }
      );
    unsubscribers.push(commentsUnsub);

    // Cleanup function
    return () => {
      console.log('📊 Cleaning up real-time statistics listeners');
      unsubscribers.forEach(unsub => unsub());
    };
  }, [userId]);

  // Listen to approved memberships for the viewed user (student only)
  useEffect(() => {
    if (!userId) return;
    const db = firebase.firestore();
    const unsub = db
      .collection('clubMembers')
      .where('userId', '==', userId)
      .where('status', '==', 'approved')
      .onSnapshot(async (snap) => {
        try {
          const clubIds = snap.docs.map((d) => d.data().clubId).filter(Boolean);
          setMembershipCount(clubIds.length);
          const limitedIds = clubIds.slice(0, 10);
          if (limitedIds.length === 0) {
            setMemberClubsMini([]);
            return;
          }
          const clubsSnap = await db
            .collection('users')
            .where(firebase.firestore.FieldPath.documentId(), 'in', limitedIds)
            .get();
          const items = clubsSnap.docs.map((doc) => {
            const data: any = doc.data() || {};
            return {
              id: doc.id,
              name: data.name || data.displayName || 'Kulüp',
              displayName: data.displayName || data.name,
              profileImage: data.profileImage,
              avatarIcon: data.avatarIcon,
              avatarColor: data.avatarColor,
            };
          });
          setMemberClubsMini(items);
        } catch (err) {
          console.warn('⚠️ ViewProfile memberships mini fetch failed:', err);
          setMemberClubsMini([]);
        }
      }, (err) => console.error('❌ clubMembers listener error:', err));

    return unsub;
  }, [userId]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Profil yükleniyor...</Text>
        </View>
      ) : !user ? (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="account-off" size={64} color="#e0e0e0" />
          <Text style={styles.errorTitle}>Kullanıcı bulunamadı</Text>
          <Text style={styles.errorText}>Bu kullanıcı mevcut değil veya silinmiş olabilir.</Text>
          <Button mode="contained" onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('StudentTabs');
            }
          }} style={styles.backToHomeButton}>
            Geri Dön
          </Button>
        </View>
      ) : (
        <>
          {/* Cover Section */}
          <View style={styles.coverSection}>
            <TouchableOpacity 
              style={styles.coverBackground} 
              onPress={() => {
                if (user?.coverImage) {
                  handleImageZoom(user.coverImage, 'Kapak Fotoğrafı');
                }
              }}
              activeOpacity={0.9}
            >
              {user?.coverImage ? (
                <ImageBackground 
                  source={{ uri: user.coverImage }}
                  style={styles.coverBackground}
                  resizeMode="cover"
                />
              ) : user?.coverIcon ? (
                <View style={[styles.coverBackground, { backgroundColor: user.coverColor || '#1E88E5' }]}>
                  <MaterialCommunityIcons 
                    name={user.coverIcon as any} 
                    size={180} 
                    color="rgba(255,255,255,0.3)" 
                    style={styles.coverIconStyle} 
                  />
                </View>
              ) : (
                <View style={[styles.coverBackground, { backgroundColor: '#1E88E5' }]}>
                  <MaterialCommunityIcons 
                    name="city-variant" 
                    size={180} 
                    color="rgba(255,255,255,0.3)" 
                    style={styles.coverIconStyle} 
                  />
                </View>
              )}
            </TouchableOpacity>
            
            {/* Header with back button and menu */}
            <View style={styles.headerOverlay}>
              <TouchableOpacity onPress={() => {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.navigate('StudentTabs');
                }
              }} style={styles.backButton}>
                <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={styles.menuContainer}>
                <Menu
                  visible={menuVisible}
                  onDismiss={() => setMenuVisible(false)}
                  anchor={
                    <IconButton 
                      icon="dots-vertical" 
                      color="#FFFFFF" 
                      size={24} 
                      onPress={() => setMenuVisible(true)}
                      style={{backgroundColor: 'rgba(0,0,0,0.2)'}}
                    />
                  }
                >
                  <Menu.Item onPress={handleShareProfile} title="Profili Paylaş" icon="share" />
                  {currentUser?.uid !== userId && currentUser && !isClubAccount && (
                    <Menu.Item 
                      onPress={handleToggleFollow} 
                      title={user.isFollowing ? "Takibi Bırak" : "Takip Et"} 
                    />
                  )}
                </Menu>
              </View>
            </View>
            
            {/* Avatar that overlaps the cover and content */}
            <View style={styles.avatarContainer}>
              <TouchableOpacity 
                onPress={() => {
                  if (user?.profileImage) {
                    handleImageZoom(user.profileImage, 'Profil Fotoğrafı');
                  }
                }}
                activeOpacity={0.8}
              >
                <UniversalAvatar
                  user={user}
                  size={96}
                  style={styles.avatar}
                />
              </TouchableOpacity>
            </View>
          </View>
          
          <ScrollView 
            contentContainerStyle={styles.content} 
            showsVerticalScrollIndicator={false} 
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} />
            }
          >
            <View style={styles.profileHeader}>
              <Text style={styles.name}>{user?.displayName || user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Kullanıcı'}</Text>
              <Text style={styles.username}>@{user?.username || user?.email?.split('@')[0] || 'username'}</Text>
            </View>
            
            {/* İstatistikler Bölümü */}
            {user?.id && (
              <View style={styles.infoSection}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>İstatistikler</Text>
                </View>
                
                {/* Main Stats */}
                <View style={styles.mainStats}>
                  {/* Beğeniler */}
                  <View style={styles.statItem}>
                    <View style={[styles.statCircle, { backgroundColor: '#FF6B6B' }]}>
                      <MaterialCommunityIcons name="heart" size={20} color="#fff" />
                    </View>
                    <Text style={styles.statLabel}>Beğeni</Text>
                                        <Text style={styles.statNumber}>{userStats.likes}</Text>
                  </View>

                  {/* Yorumlar */}
                  <View style={styles.statItem}>
                    <View style={[styles.statCircle, { backgroundColor: '#4ECDC4' }]}>
                      <MaterialCommunityIcons name="comment" size={20} color="#fff" />
                    </View>
                    <Text style={styles.statLabel}>Yorum</Text>
                    <Text style={styles.statNumber}>{userStats.comments}</Text>
                  </View>

                  {/* Katılımlar */}
                  <View style={styles.statItem}>
                    <View style={[styles.statCircle, { backgroundColor: '#45B7D1' }]}>
                      <MaterialCommunityIcons name="calendar-check" size={20} color="#fff" />
                    </View>
                    <Text style={styles.statLabel}>Katılım</Text>
                    <Text style={styles.statNumber}>{userStats.participations}</Text>
                  </View>
                </View>
              </View>
            )}
            
            {/* Bio Section with frame */}
            <View style={styles.infoSection}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Biyografi</Text>
              </View>
              
              {user?.bio ? (
                <Text style={styles.bioText}>{user.bio}</Text>
              ) : (
                <Text style={styles.noBioText}>Henüz biyografi eklenmemiş.</Text>
              )}
            </View>
            
            {/* Stats strip: Followers, Following, Clubs, Events */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalStatsContent}
              style={{ marginHorizontal: 16, marginVertical: 8 }}
            >
              <TouchableOpacity style={styles.modernStatCard} onPress={handleViewFollowers}>
                <View style={styles.statIconContainer}>
                  <MaterialCommunityIcons name="account-group" size={20} color="#10b981" />
                </View>
                <Text style={styles.modernStatNumber}>{user?.followerCount || 0}</Text>
                <Text style={styles.modernStatLabel}>Takipçi</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modernStatCard} onPress={handleViewFollowing}>
                <View style={styles.statIconContainer}>
                  <MaterialCommunityIcons name="account-multiple" size={20} color="#f59e0b" />
                </View>
                <Text style={styles.modernStatNumber}>{user?.followingCount || 0}</Text>
                <Text style={styles.modernStatLabel}>Takip</Text>
              </TouchableOpacity>
              {user?.userType !== 'club' && (
                <View style={styles.modernStatCard}>
                  <View style={styles.statIconContainer}>
                    <MaterialCommunityIcons name="account-group-outline" size={20} color="#0ea5e9" />
                  </View>
                  <Text style={styles.modernStatNumber}>{membershipCount}</Text>
                  <Text style={styles.modernStatLabel}>Kulüp</Text>
                </View>
              )}
              <TouchableOpacity style={styles.modernStatCard} onPress={handleViewEvents}>
                <View style={styles.statIconContainer}>
                  <MaterialCommunityIcons name="calendar-star" size={20} color="#4f46e5" />
                </View>
                <Text style={styles.modernStatNumber}>{user?.eventCount || 0}</Text>
                <Text style={styles.modernStatLabel}>Etkinlik</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Kulüpleri bölümü kaldırıldı */}
            
            {/* Personal Info Section */}
            <View style={styles.infoSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Kişisel Bilgiler</Text>
              </View>
              
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="email-outline" size={24} color={theme.colors.primary} />
                <Text style={styles.infoText}>{user?.email || 'E-posta belirtilmemiş'}</Text>
              </View>

              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="account-outline" size={24} color={theme.colors.primary} />
                <Text style={styles.infoText}>{user?.userType === 'student' ? 'Öğrenci' : user?.userType || 'Kullanıcı'}</Text>
              </View>
              
              {user?.university && (
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="school-outline" size={24} color={theme.colors.primary} />
                  <Text style={styles.infoText}>{user.university}</Text>
                </View>
              )}
              
              {user?.department && (
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="book-outline" size={24} color={theme.colors.primary} />
                  <Text style={styles.infoText}>{user.department}</Text>
                </View>
              )}
              
              {user?.classLevel && (
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="school" size={24} color={theme.colors.primary} />
                  <Text style={styles.infoText}>{user.classLevel}</Text>
                </View>
              )}
              
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="calendar-account" size={24} color={theme.colors.primary} />
                <Text style={styles.infoText}>Katılım: {formatJoinDate(user)}</Text>
              </View>
            </View>
            
            {/* Action Buttons - Kulüp hesapları başkalarını takip edemez */}
            {(() => {
              const showButton = currentUser && currentUser.uid !== userId && !isClubAccount;
              console.log('🔍 Follow button visibility check:', {
                currentUser: currentUser?.uid,
                userId,
                isClubAccount,
                showButton,
                userIsFollowing: user?.isFollowing
              });
              return showButton;
            })() && (
              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity
                  onPress={handleToggleFollow}
                  style={[
                    styles.customActionButton,
                    user.isFollowing ? styles.unfollowButton : styles.followButton
                  ]}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.customButtonText,
                    user.isFollowing ? styles.unfollowButtonText : styles.followButtonText
                  ]}>
                    {user.isFollowing ? "Takibi Bırak" : "Takip Et"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </>
      )}
      
      {/* Image Zoom Modal */}
      <ImageZoomModal
        visible={imageZoomVisible}
        imageUri={zoomImageUri}
        title={zoomImageTitle}
        onClose={handleCloseImageZoom}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E88E5',
  },
  content: {
    paddingBottom: 32,
  },
  coverSection: {
    height: 220,
    position: 'relative',
    marginTop: 0,
  },
  coverBackground: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverIconStyle: {
    position: 'absolute',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  backButton: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 8,
    borderRadius: 20,
  },
  menuContainer: {
    // Container styling if needed
  },
  avatarContainer: {
    position: 'absolute',
    bottom: -48,
    left: Dimensions.get('window').width / 2 - 48,
    zIndex: 10,
  },
  avatar: {
    borderWidth: 4,
    borderColor: '#FFF',
  },
  customAvatarWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFF',
  },
  customAvatarIcon: {
    // Any additional styling for the icon if needed
  },
  profileHeader: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  infoSection: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  bioText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  noBioText: {
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
  modernStatsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 8,
    gap: 8,
  },
  horizontalStatsContent: {
    paddingHorizontal: 6,
  },
  modernStatCard: {
    width: 100,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginRight: 8,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  modernStatNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  modernStatLabel: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 12,
    flex: 1,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 16,
    gap: 8,
  },
  actionButton: {
    borderRadius: 25,
  },
  actionButtonContent: {
    height: 48,
  },
  customActionButton: {
    height: 48,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  followButton: {
    backgroundColor: '#1E88E5',
  },
  unfollowButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#1E88E5',
  },
  customButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  followButtonText: {
    color: '#FFFFFF',
  },
  unfollowButtonText: {
    color: '#1E88E5',
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
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  backToHomeButton: {
    borderRadius: 25,
  },
  clubPill: {
    width: 120,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9e9e9',
    marginRight: 8,
  },
  clubPillText: {
    marginTop: 8,
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
    maxWidth: 100,
  },
  mainStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  rankingInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  rankingItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  secondaryLabel: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
});

export default ViewProfileScreen;
