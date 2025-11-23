import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, ImageBackground, TouchableOpacity, Alert, Platform, Share, useWindowDimensions } from 'react-native';
import { Text, useTheme, Button, Avatar, Dialog, Portal, Divider, IconButton, Menu } from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { getFirebaseCompatSync } from '../../firebase/compat';
import { globalAvatarCache } from '../../services/globalAvatarCacheService';
import { globalRealtimeSyncService } from '../../services/globalRealtimeSyncService';
import { enhancedRealtimeSyncService } from '../../services/enhancedRealtimeSyncService';
import { comprehensiveDataSyncService } from '../../services/comprehensiveDataSyncService';
import { 
  refreshUserProfileCounts,
  getFollowerCountFromStorage,
  getFollowingCountFromStorage,
  initializeUserFollowCounts,
  saveFollowerCountToStorage,
  saveFollowingCountToStorage
} from '../../firebase/userProfile';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StudentStackParamList } from '../../navigation/StudentNavigator';
import { StatusBar } from 'expo-status-bar';
// import { ProfileLeaderboardCard } from '../../components/ProfileLeaderboardCard'; // Removed - replaced with user stats
import { globalFollowStateManager } from '../../services/globalFollowStateManager';
import ProfileEditModal from '../../components/profile/ProfileEditModal';
import { UniversalAvatar, EnhancedButton, EnhancedCard } from '../../components/common';
import { useResponsiveDesign } from '../../utils/responsiveDesignUtils';
import AccessibilityUtils from '../../utils/accessibilityUtils';
import { centralizedRankingService } from '../../services/centralizedRankingService';
import AccountDeletionService from '../../services/accountDeletionService';
import { MemoryStorage } from '../../utils/MemoryStorage';
import { CustomTheme } from '../../types/theme';
import unifiedStatisticsService, { UserStatistics } from '../../services/unifiedStatisticsService';
import { UNIVERSITIES_DATA } from '../../constants/universities';
import { DEPARTMENTS_DATA } from '../../constants/departments';
import { CLASS_LEVELS_DATA } from '../../constants/classLevels';
import { getClubMembershipsFromStorage } from '../../utils/clubStorageManager';
import { useImagePreview } from '../../contexts/ImagePreviewContext';

const AVATAR_SIZE = 96;
const firebase = getFirebaseCompatSync();

const ProfileScreen: React.FC = () => {
  const baseTheme = useTheme();
  const theme = baseTheme as unknown as CustomTheme;
  const { currentUser, userProfile, refreshUserProfile, refreshUserData, isClubAccount, signOut } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<StudentStackParamList>>();
  const { fontSizes, spacing, shadows } = useResponsiveDesign();
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const floatingMenuOffset = useMemo(() => ({
    top: Math.max(insets.top, 0) + 8,
  }), [insets.top]);
  const avatarPositionStyle = useMemo(() => ({
    left: Math.max((windowWidth - AVATAR_SIZE) / 2, 16),
  }), [windowWidth]);
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);
  const [deleteAccountDialogVisible, setDeleteAccountDialogVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [debugScreenVisible, setDebugScreenVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [eventsCount, setEventsCount] = useState(0);
  // Club memberships (student profiles)
  const [membershipCount, setMembershipCount] = useState(0);
  const [memberClubsMini, setMemberClubsMini] = useState<Array<{ id: string; name: string; displayName?: string; profileImage?: string; avatarIcon?: string; avatarColor?: string }>>([]);
  const [userScore, setUserScore] = useState<{totalPoints: number, rank: number, level: number, streakCount?: number} | null>(null);
  
  // User Statistics States
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
  
  // Profile Edit Modal States
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editField, setEditField] = useState('');
  const [editValue, setEditValue] = useState<any>('');
  
  // Image Zoom Modal States
  const { showPreview } = useImagePreview();
  
  // Image zoom function (global preview)
  const handleImageZoom = useCallback(
    (imageUri: string, title: string) => {
    if (imageUri) {
        showPreview(imageUri, { title });
    }
    },
    [showPreview],
  );

  // Real-time kullanıcı istatistikleri - scoring system removed

  // Leaderboard data refresh function
  const refreshLeaderboardData = useCallback(async (userId: string) => {
    try {
      // Force refresh the centralized ranking service cache
      await centralizedRankingService.clearCache();
      console.log('🔄 Leaderboard data refreshed');
    } catch (error) {
      console.error('Error refreshing leaderboard data:', error);
    }
  }, []);

  // Load user statistics using unified service
  const loadUserStatistics = useCallback(async () => {
    if (!currentUser?.uid) {
      console.warn('🚫 ProfileScreen: loadUserStatistics: currentUser.uid is missing');
      return;
    }
    
    try {
      console.log('🔄 ProfileScreen: Loading unified user statistics for user:', currentUser.uid);
      const statistics = await unifiedStatisticsService.getUserStatistics(currentUser.uid);
      setUserStats(statistics);
      
      // Also update user score from statistics
      setUserScore({
        totalPoints: statistics.totalPoints,
        rank: statistics.rank,
        level: statistics.level,
        streakCount: statistics.streakCount
      });
      
      console.log('✅ ProfileScreen: Unified user statistics loaded successfully:', statistics);
    } catch (error) {
      console.error('❌ ProfileScreen: Error loading unified user statistics:', error);
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
      console.log('📊 ProfileScreen: Set default statistics due to error');
    }
  }, [currentUser]);

  // Fetch and subscribe to approved club memberships for current user (students)
  useEffect(() => {
    if (!currentUser?.uid || userProfile?.userType === 'club') return;

    const db = getFirebaseCompatSync().firestore();

    // Seed from local storage (offline support)
    (async () => {
      try {
        const cachedMemberships = await getClubMembershipsFromStorage(currentUser.uid);
        if (Array.isArray(cachedMemberships) && cachedMemberships.length > 0) {
          setMembershipCount(cachedMemberships.length);
          const items = cachedMemberships.slice(0, 10).map((m) => ({
            id: m.clubId,
            name: m.clubName || 'Kulüp',
            displayName: m.clubName,
          }));
          setMemberClubsMini(items);
        }
      } catch (e) {
        // ignore cache errors
      }
    })();
    const unsub = db
      .collection('clubMembers')
      .where('userId', '==', currentUser.uid)
      .where('status', '==', 'approved')
      .onSnapshot(async (snap) => {
        try {
          const clubIds = snap.docs.map((d) => d.data().clubId).filter(Boolean);
          setMembershipCount(clubIds.length);

          // Build a small carousel list (max 10 clubs)
          const limitedIds = clubIds.slice(0, 10);
          if (limitedIds.length === 0) {
            setMemberClubsMini([]);
            return;
          }

          // Firestore 'in' supports up to 10
          const clubsSnap = await db
            .collection('users')
            .where((firebase.firestore as any).FieldPath.documentId(), 'in', limitedIds)
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
          console.warn('⚠️ club memberships mini fetch failed:', err);
          setMemberClubsMini([]);
        }
      }, (err) => console.error('❌ clubMembers listener error:', err));

    return unsub;
  }, [currentUser?.uid, userProfile?.userType]);

  // Tarih formatlama fonksiyonu
  const formatJoinDate = useCallback((userProfile: any) => {
    try {
      // Firebase Timestamp
      if (userProfile?.createdAt?.seconds) {
        return new Date(userProfile.createdAt.seconds * 1000).toLocaleDateString('tr-TR');
      }
      // JavaScript Date nesnesi
      else if (userProfile?.createdAt instanceof Date) {
        return userProfile.createdAt.toLocaleDateString('tr-TR');
      }
      // String tarih
      else if (typeof userProfile?.createdAt === 'string') {
        return new Date(userProfile.createdAt).toLocaleDateString('tr-TR');
      }
      // Timestamp with toDate method (Firestore Timestamp object)
      else if (userProfile?.createdAt && typeof userProfile.createdAt.toDate === 'function') {
        return userProfile.createdAt.toDate().toLocaleDateString('tr-TR');
      }
      // createdDate alanı kontrol et
      else if (userProfile?.createdDate?.seconds) {
        return new Date(userProfile.createdDate.seconds * 1000).toLocaleDateString('tr-TR');
      }
      // Bugünün tarihi olarak göster (kayıt tarihi eksikse)
      else {
        return new Date().toLocaleDateString('tr-TR') + ' (Yaklaşık)';
      }
    } catch (error) {
      console.error('Tarih formatlanırken hata:', error);
      return new Date().toLocaleDateString('tr-TR') + ' (Hata)';
    }
  }, []);
  
  // Sayıları AsyncStorage'dan getiren fonksiyon - permission safe
  const fetchCounts = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      console.log('🔄 ProfileScreen: Fetching counts for user:', currentUser.uid, 'userType:', userProfile?.userType);
      
      // AsyncStorage'dan güncel takip sayılarını al (database fallback ile)
      const counts = await refreshUserProfileCounts(currentUser.uid);
      
      // UI'ı güncelle
      setFollowerCount(counts.followerCount);
      setFollowingCount(counts.followingCount);
      
      console.log('📊 Profile sayıları güncellendi:', counts);
      
      // Etkinlik sayısı hesaplama (kulüp vs öğrenci)
      if (userProfile?.userType === 'club') {
        // Kulüp: organize edilen etkinlik sayısı
        try {
          const eventsSnapshot = await getFirebaseCompatSync().firestore()
            .collection('events')
            .where('organizerId', '==', currentUser.uid)
            .get();
          setEventsCount(eventsSnapshot.size);
          console.log('🏢 Club events count updated:', eventsSnapshot.size);
        } catch (error) {
          console.error('❌ Error fetching club events:', error);
          setEventsCount(0);
        }
      } else {
        // Öğrenci: katıldığı etkinlik sayısı (eventAttendees authoritative)
        try {
          const attendeesSnapshot = await getFirebaseCompatSync().firestore()
            .collection('eventAttendees')
            .where('userId', '==', currentUser.uid)
            .get();
          setEventsCount(attendeesSnapshot.size);
          console.log('�️ Student attended events count updated:', attendeesSnapshot.size);
        } catch (error) {
          console.error('❌ Error fetching attended events (student):', error);
          setEventsCount(0);
        }
      }
      
      // Enhanced Scoring System verilerini getir
      try {
        console.log('🔍 ProfileScreen: Fetching user stats for user:', currentUser.uid, 'userType:', userProfile?.userType);
        
        // Kulüp kullanıcıları için özel puan hesaplama
        if (userProfile?.userType === 'club') {
          console.log('🏢 ProfileScreen: Calculating club-specific scores...');
          await calculateClubUserScore();
        } else {
          // Öğrenci kullanıcılar için normal userScores collection
          await calculateStudentUserScore();
        }
        
        // Daily login bonus (sadece günde bir kez) - TEMPORARILY DISABLED
        const today = new Date().toDateString();
        const lastLoginKey = `lastLogin_${currentUser.uid}`;
        const lastLogin = await MemoryStorage.getItem(lastLoginKey);
        
        if (lastLogin !== today) {
          // TEMPORARILY DISABLED: Günlük giriş puanı - permission sorunları için
          
          // Son giriş tarihini kaydet (local tracking için)
          await MemoryStorage.setItem(lastLoginKey, today);
        }
        
      } catch (error) {
        console.error('Kullanıcı skoru getirilirken hata:', error);
        setUserScore({ totalPoints: 0, rank: 0, level: 1, streakCount: 0 });
      }
    } catch (error) {
      console.error('Profil sayıları getirilirken hata:', error);
    }
  }, [currentUser, userProfile?.userType]);

  // Real-time rank tracking için merkezi servis listener'ı
  // DISABLED: Central ranking listener - yeni hesaplama sistemi kullanıyoruz
  /*
  useEffect(() => {
    if (!currentUser?.uid) return;

    console.log('🔄 ProfileScreen: Setting up central ranking listener for:', currentUser.uid);
    
    const unsubscribe = centralizedRankingService.subscribeToUserRank(
      currentUser.uid,
      (rankData) => {
        if (rankData) {
          console.log('📊 ProfileScreen: Central ranking updated:', rankData);
          setUserScore({
            totalPoints: rankData.totalPoints,
            rank: rankData.rank,
            level: rankData.level,
            streakCount: rankData.streakCount
          });
        }
      }
    );

    return unsubscribe;
  }, [currentUser?.uid]);
  */

  // Takipçi sayılarını gerçek verilerle doğrula ve düzelt
  const verifyAndFixFollowerCounts = useCallback(async () => {
    if (!currentUser?.uid) return;
    
    try {
      console.log('🔍 Takipçi sayıları doğrulanıyor...');
      
      // GlobalFollowStateManager üzerinden doğrula
      const correctedCounts = await globalFollowStateManager.verifyAndFixFollowerCounts(currentUser.uid);
      
      // Sadece farklıysa local state'i güncelle
      if (followerCount !== correctedCounts.followerCount) {
        setFollowerCount(correctedCounts.followerCount);
        console.log(`🔧 Local follower count updated: ${followerCount} -> ${correctedCounts.followerCount}`);
      }
      
      if (followingCount !== correctedCounts.followingCount) {
        setFollowingCount(correctedCounts.followingCount);
        console.log(`🔧 Local following count updated: ${followingCount} -> ${correctedCounts.followingCount}`);
      }
      
      console.log('✅ Takipçi sayıları doğrulandı:', correctedCounts);
      
    } catch (error) {
      console.error('❌ Takipçi sayıları doğrulanırken hata:', error);
    }
  }, [currentUser?.uid, followerCount, followingCount]);

  // Enhanced gerçek zamanlı profil senkronizasyonu
  useEffect(() => {
    if (!currentUser?.uid) return;

    console.log('🔄 Setting up enhanced real-time profile sync for ProfileScreen');

    const handleProfileUpdate = (data: any) => {
      if (data.userId === currentUser.uid) {
        console.log('🔄 Enhanced profile update received, refreshing all data');
        refreshUserProfile();
        fetchCounts();
        loadUserStatistics();
        verifyAndFixFollowerCounts();
      }
    };

    // Use both services for maximum reliability
    globalRealtimeSyncService.on('profileUpdated', handleProfileUpdate);
    enhancedRealtimeSyncService.on('profileUpdated', handleProfileUpdate);

    return () => {
      globalRealtimeSyncService.off('profileUpdated', handleProfileUpdate);
      enhancedRealtimeSyncService.off('profileUpdated', handleProfileUpdate);
    };
  }, [currentUser?.uid, refreshUserProfile, fetchCounts, loadUserStatistics, verifyAndFixFollowerCounts]);

  // Sayfa her açıldığında sayıları güncelle ve doğrula
  useFocusEffect(
    useCallback(() => {
      if (currentUser) {
        fetchCounts();
        verifyAndFixFollowerCounts(); // Sayıları doğrula ve düzelt
        loadUserStatistics(); // Load user statistics
        // Force refresh user profile for clubs
        if (userProfile?.userType === 'club') {
          refreshUserProfile();
        }
      }
    }, [currentUser, userProfile?.userType, loadUserStatistics])
  );

  // Enhanced real-time synchronization for profile updates
  useEffect(() => {
    if (!currentUser) return;

    const handleProfileUpdate = (data: any) => {
      if (data.userId === currentUser.uid) {
        console.log('🔄 Profile updated via comprehensive sync, refreshing all data...');
        // Always refresh user profile first to get latest data
        refreshUserProfile();
        fetchCounts();
        loadUserStatistics();
        verifyAndFixFollowerCounts();
      }
    };

    // Subscribe to comprehensive sync service
    comprehensiveDataSyncService.subscribe('ProfileScreen', handleProfileUpdate);

    return () => {
      comprehensiveDataSyncService.unsubscribe('ProfileScreen', handleProfileUpdate);
    };
  }, [currentUser?.uid, fetchCounts, loadUserStatistics, verifyAndFixFollowerCounts, refreshUserProfile, userProfile?.userType]);
  
  // İlk yüklemede sayıları getir ve initialize et
  useEffect(() => {
    if (currentUser) {
      initializeUserFollowCounts(currentUser.uid).then(() => {
        fetchCounts();
        // İlk yüklemede bir kez doğrula
        setTimeout(() => {
          verifyAndFixFollowerCounts();
        }, 1000); // Biraz gecikme ekleyelim
      });
      
      // Kulüp profilleri için ek refresh
      if (userProfile?.userType === 'club') {
        refreshUserProfile();
      }
    }
  }, [currentUser?.uid, userProfile?.userType]);

  // Real-time club profile listener
  useEffect(() => {
    if (!currentUser?.uid || userProfile?.userType !== 'club') return;

    console.log('🏢 Setting up real-time club profile listener for:', currentUser.uid);
    
    const unsubscribe = getFirebaseCompatSync().firestore()
      .collection('users')
      .doc(currentUser.uid)
      .onSnapshot((doc) => {
        if (doc.exists) {
          console.log('🔄 Club profile updated in real-time');
          refreshUserProfile();
        }
      }, (error) => {
        console.error('❌ Club profile listener error:', error);
      });

    return unsubscribe;
  }, [currentUser?.uid, userProfile?.userType, refreshUserProfile]);

  // Real-time counts listener for all users to keep counts in sync with lists
  useEffect(() => {
    if (!currentUser?.uid) return;

    const unsub = getFirebaseCompatSync().firestore()
      .collection('users')
      .doc(currentUser.uid)
      .onSnapshot(async (doc) => {
        if (!doc.exists) return;
        const data: any = doc.data() || {};
        const followers: string[] = Array.isArray(data.followers) ? data.followers : [];
        const following: string[] = Array.isArray(data.following) ? data.following : [];
        const nextFollower = followers.length > 0 ? followers.length : (data.followerCount || 0);
        const nextFollowing = following.length > 0 ? following.length : (data.followingCount || 0);
        setFollowerCount(nextFollower);
        setFollowingCount(nextFollowing);
        // Persist for other screens using AsyncStorage-backed counts
        try {
          await Promise.all([
            saveFollowerCountToStorage(currentUser.uid, nextFollower),
            saveFollowingCountToStorage(currentUser.uid, nextFollowing)
          ]);
        } catch (e) {
          console.warn('⚠️ Failed persisting follow counts:', e);
        }
      }, (error) => {
        // Handle permission denied errors gracefully
        if (error.code === 'permission-denied') {
          console.warn('⚠️ [ProfileScreen] Permission denied for follow counts - using cached data');
        } else {
          console.error('❌ Real-time follow counts listener error:', error);
        }
      });

    return unsub;
  }, [currentUser?.uid]);

  // Real-time attended events count for students (keeps eventsCount accurate)
  useEffect(() => {
    if (!currentUser?.uid || userProfile?.userType === 'club') return;

    console.log('🎧 Setting up real-time attended events listener for student:', currentUser.uid);
    const unsubscribe = getFirebaseCompatSync().firestore()
      .collection('eventAttendees')
      .where('userId', '==', currentUser.uid)
      .onSnapshot(
        (snapshot) => {
          const count = snapshot.size;
          setEventsCount(count);
        },
        (error) => {
          // Handle permission denied errors gracefully
          if (error.code === 'permission-denied') {
            console.warn('⚠️ [ProfileScreen] Permission denied for attended events - using cached data');
          } else {
            console.error('❌ Real-time attended events listener error:', error);
          }
        }
      );

    return unsubscribe;
  }, [currentUser?.uid, userProfile?.userType]);
  
  // Sayfa yenilendiğinde tüm verileri güncelle
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (currentUser) {
        console.log('🔄 ProfileScreen: Manual refresh started for:', userProfile?.userType, 'user');
        
        // AuthContext'ten kullanıcı verilerini yenile
        await refreshUserData();
        await refreshUserProfile();
        
        // Sayıları güncelle
        await fetchCounts();
        
        // Takipçi sayılarını doğrula ve düzelt
        await verifyAndFixFollowerCounts();
        
        // Leaderboard verilerini de yenile
        await refreshLeaderboardData(currentUser.uid);
        
        // Kulüp profilleri için ek güncelleme
        if (userProfile?.userType === 'club') {
          console.log('🏢 Performing additional club profile refresh');
          
          // Force re-fetch user profile from Firestore
          const userDoc = await getFirebaseCompatSync().firestore()
            .collection('users')
            .doc(currentUser.uid)
            .get();
          
          if (userDoc.exists) {
            console.log('✅ Club profile data refreshed from Firestore');
          }
        }
        
        console.log('✅ ProfileScreen: Manual refresh completed');
      }
    } catch (error) {
      console.error('❌ Yenileme sırasında hata:', error);
    } finally {
      setRefreshing(false);
    }
  }, [currentUser, userProfile?.userType, refreshUserData, refreshUserProfile, fetchCounts, refreshLeaderboardData, verifyAndFixFollowerCounts]);
  
  // Takipçileri görüntüle
  const handleViewFollowers = () => {
    if (!currentUser) return;
    navigation.navigate('ProfileFollowers', { userId: currentUser.uid });
  };
  
  // Takip edilenleri görüntüle
  const handleViewFollowing = () => {
    if (!currentUser) return;
    navigation.navigate('ProfileFollowing', { userId: currentUser.uid });
  };
  
  const handleViewEvents = () => {
    if (!currentUser) return;
    navigation.navigate('StudentEventsList', { 
      userId: currentUser.uid,
      userName: userProfile?.firstName && userProfile?.lastName 
        ? `${userProfile.firstName} ${userProfile.lastName}`
        : undefined
    });
  };
  
  // Kulüp kullanıcıları için puan hesaplama
  const calculateClubUserScore = async () => {
    if (!currentUser) return;
    
    try {
      console.log('🏢 Calculating club user score for user ID:', currentUser.uid);
      
      // Önce userScores collection'ında veri var mı kontrol et
      const userScoreDoc = await getFirebaseCompatSync().firestore().collection('userScores').doc(currentUser.uid).get();
      
      console.log('📊 UserScores document exists:', userScoreDoc.exists);
      
      if (userScoreDoc.exists) {
        const userScoreData = userScoreDoc.data();
        console.log('📋 Raw userScores data:', userScoreData);
        
        // UserScores'da veri varsa bunu kullan
        const scoreToSet = {
          totalPoints: userScoreData?.totalPoints || 0,
          rank: 0, // Bu hesaplanacak
          level: userScoreData?.level || 1,
          streakCount: userScoreData?.streakCount || 0
        };
        
        console.log('✅ Club user score from userScores (before rank):', scoreToSet);
        
        // Sadece kulüp kullanıcıları arasında rank hesapla
        const clubUsersSnapshot = await getFirebaseCompatSync().firestore()
          .collection('users')
          .where('userType', '==', 'club')
          .get();
        
        const clubUserIds = clubUsersSnapshot.docs.map(doc => doc.id);
        console.log('🏢 Found club users:', clubUserIds.length);
        
        // Bu kulüp kullanıcılarının userScores'larını al
        const clubScoresPromises = clubUserIds.map(id => 
          getFirebaseCompatSync().firestore().collection('userScores').doc(id).get()
        );
        
        const clubScoresDocs = await Promise.all(clubScoresPromises);
        const clubScores = clubScoresDocs
          .filter(doc => doc.exists)
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .sort((a: any, b: any) => (b.totalPoints || 0) - (a.totalPoints || 0));
        
        console.log('📊 Club scores data:', clubScores);
        
        const currentRank = clubScores.findIndex(score => score.id === currentUser.uid) + 1;
        
        scoreToSet.rank = currentRank || clubScores.length + 1;
        
        console.log('✅ Final club user score with rank:', scoreToSet);
        setUserScore(scoreToSet);
        
      } else {
        console.log('⚠️ No userScores found, using fallback calculation...');
        
        // UserScores'da veri yoksa 0 olarak ayarla (database ile tutarlı)
        const scoreToSet = {
          totalPoints: 0,
          rank: 1,
          level: 1,
          streakCount: 0
        };
        
        console.log('✅ Club user fallback score:', scoreToSet);
        setUserScore(scoreToSet);
        
        // Bu kullanıcı için userScores oluştur
        await getFirebaseCompatSync().firestore().collection('userScores').doc(currentUser.uid).set({
          totalPoints: 0,
          level: 1,
          streakCount: 0,
          weeklyPoints: 0,
          monthlyPoints: 0,
          lastUpdated: getFirebaseCompatSync().firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        console.log('📝 Created initial userScores entry with 0 points');
      }
      
    } catch (error) {
      console.error('❌ Error calculating club user score:', error);
      setUserScore({ totalPoints: 0, rank: 0, level: 1, streakCount: 0 });
    }
  };
  
  // Öğrenci kullanıcıları için puan hesaplama
  const calculateStudentUserScore = async () => {
    if (!currentUser) return;
    
    try {
      console.log('🎓 Calculating student user score...');
      
      // Direkt userScores collection'ından al - LeaderboardService ile tutarlı
      const userScoreDoc = await getFirebaseCompatSync().firestore().collection('userScores').doc(currentUser.uid).get();
      
      if (userScoreDoc.exists) {
        const userScoreData = userScoreDoc.data();
        
        // Sadece öğrenci kullanıcıları arasında rank hesapla
        const studentUsersSnapshot = await getFirebaseCompatSync().firestore()
          .collection('users')
          .where('userType', '==', 'student')
          .get();
        
        const studentUserIds = studentUsersSnapshot.docs.map(doc => doc.id);
        
        // Öğrenci kullanıcılarının userScores'larını al
        const higherPointsSnapshot = await getFirebaseCompatSync().firestore()
          .collection('userScores')
          .where('totalPoints', '>', userScoreData?.totalPoints || 0)
          .get();
        
        // Bu kullanıcıların kaçı öğrenci kontrol et
        let studentRank = 1;
        for (const doc of higherPointsSnapshot.docs) {
          if (studentUserIds.includes(doc.id)) {
            studentRank++;
          }
        }
        
        const scoreToSet = {
          totalPoints: userScoreData?.totalPoints || 0,
          rank: studentRank,
          level: userScoreData?.level || 1,
          streakCount: userScoreData?.streakCount || 0
        };
        
        console.log('✅ Student user score from userScores:', scoreToSet);
        setUserScore(scoreToSet);
        
      } else {
        console.log('⚠️ Student userScores not found, setting default score');
        setUserScore({ totalPoints: 0, rank: 0, level: 1, streakCount: 0 });
      }
      
    } catch (error) {
      console.error('❌ Error calculating student user score:', error);
      setUserScore({ totalPoints: 0, rank: 0, level: 1, streakCount: 0 });
    }
  };
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut();
      setLogoutDialogVisible(false);
    } catch (error) {
      console.error('Çıkış yapılırken hata oluştu:', error);
      Alert.alert('Hata', 'Çıkış yapılırken bir sorun oluştu. Lütfen tekrar deneyin.');
    }
  };
  
  // Handle delete account
  const handleDeleteAccount = async () => {
    try {
      const user = getFirebaseCompatSync().auth().currentUser;
      if (!user || !userProfile) {
        Alert.alert('Hata', 'Oturum açmanız gerekiyor.');
        return;
      }

      // Kullanıcı türünü belirle
      const userType = userProfile.userType || userProfile.accountType || 'student';
      
      console.log(`🗑️ Starting account deletion for user: ${user.uid} (${userType})`);
      
      // Loading state göster
      Alert.alert(
        'Hesabınız Siliniyor...', 
        'Bu işlem birkaç dakika sürebilir. Lütfen bekleyin.',
        [],
        { cancelable: false }
      );

      // Kapsamlı hesap silme işlemini başlat
      await AccountDeletionService.deleteUserAccount(user.uid, userType as 'student' | 'club');
      
      setDeleteAccountDialogVisible(false);
      
      Alert.alert(
        'Hesap Silindi', 
        'Hesabınız ve tüm verileriniz başarıyla silindi.',
        [{ text: 'Tamam' }]
      );
      
    } catch (error) {
      console.error('Hesap silinirken hata oluştu:', error);
      setDeleteAccountDialogVisible(false);
      
      // Handle requires-recent-login error specially
      if (error instanceof Error && error.message === 'REQUIRES_RECENT_LOGIN') {
        console.log('🔐 REQUIRES_RECENT_LOGIN detected - showing password prompt');
        Alert.alert(
          'Şifrenizi Doğrulayın',
          'Güvenlik nedeniyle hesabınızı silmek için şifrenizi tekrar girmeniz gerekiyor.',
          [
            {
              text: 'İptal',
              style: 'cancel'
            },
            {
              text: 'Devam Et',
              onPress: () => {
                console.log('🔐 User confirmed password prompt - calling showPasswordPrompt');
                showPasswordPrompt();
              }
            }
          ]
        );
        return;
      }
      
      // Kullanıcıya anlamlı hata mesajı göster
      let errorMessage = 'Hesabınızı silerken bir sorun oluştu.';
      
      if (error instanceof Error) {
        if (error.message.includes('requires-recent-login')) {
          errorMessage = 'Güvenlik nedeniyle tekrar giriş yapmanız gerekiyor. Lütfen çıkış yapıp tekrar giriş yaptıktan sonra deneyin.';
        } else if (error.message.includes('network')) {
          errorMessage = 'İnternet bağlantınızı kontrol edip tekrar deneyin.';
        } else if (error.message.includes('Girdiğiniz şifre hatalı')) {
          errorMessage = error.message;
        } else if (error.message.includes('Çok fazla deneme')) {
          errorMessage = error.message;
        }
      }
      
      Alert.alert('Hata', errorMessage);
    }
  };

  // Show password prompt for reauthentication
  const showPasswordPrompt = () => {
    console.log('🔐 showPasswordPrompt called - displaying password input');
    Alert.prompt(
      'Şifrenizi Girin',
      'Hesabınızı silmek için mevcut şifrenizi girin:',
      [
        {
          text: 'İptal',
          style: 'cancel',
          onPress: () => console.log('🔐 Password prompt cancelled')
        },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async (password) => {
            console.log('🔐 Password entered, attempting reauthentication and deletion');
            if (!password) {
              Alert.alert('Hata', 'Şifre gereklidir.');
              return;
            }
            
            try {
              Alert.alert(
                'Hesabınız Siliniyor...', 
                'Bu işlem birkaç dakika sürebilir. Lütfen bekleyin.',
                [],
                { cancelable: false }
              );

              await AccountDeletionService.reauthenticateAndDelete(password);
              console.log('✅ Reauthentication and deletion successful');
              
              Alert.alert(
                'Hesap Silindi', 
                'Hesabınız ve tüm verileriniz başarıyla silindi.',
                [{ text: 'Tamam' }]
              );
              
            } catch (error) {
              console.error('❌ Reauthentication and deletion failed:', error);
              
              let errorMessage = 'Hesabınızı silerken bir sorun oluştu.';
              if (error instanceof Error) {
                errorMessage = error.message;
              }
              
              Alert.alert('Hata', errorMessage);
            }
          }
        }
      ],
      'secure-text'
    );
  };
  
  // Handle edit profile
  const handleEditProfile = async (imageType = 'profile') => {
    if (!currentUser) {
      Alert.alert('Hata', 'Oturum açmanız gerekiyor.');
      return;
    }
    
    try {
      // İzin kontrolü
      if (Platform.OS !== 'web') {
        const galleryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!galleryStatus.granted) {
          Alert.alert('İzin Gerekli', 'Fotoğraf yükleyebilmek için galeri erişim izni gerekiyor.');
          return;
        }
      }
      
      // Configure image picker options
      const pickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: imageType === 'profile' ? [1, 1] as [number, number] : [16, 9] as [number, number],
        quality: 0.5,
        exif: false,
      };
      
      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync(pickerOptions);
      
      if (result.canceled) return;
      
      if (result.assets && result.assets[0].uri) {
        setRefreshing(true);
        
        try {
          console.log('Resim yükleme başladı:', result.assets[0].uri);
          
          // Yeni yaklaşım: Base64'e çevir ve direkt Firestore'a kaydet
          const fieldToUpdate = imageType === 'profile' ? 'profileImage' : 'coverImage';
          
          // Resmi Base64'e çevirme işlemi
          const manipulateResult = await ImageManipulator.manipulateAsync(
            result.assets[0].uri,
            // Profil resmi için kare, kapak resmi için geniş ölçek
            imageType === 'profile' 
              ? [{ resize: { width: 400, height: 400 } }]
              : [{ resize: { width: 800, height: 450 } }],
            { format: ImageManipulator.SaveFormat.JPEG, compress: 0.6, base64: true }
          );
          
          if (manipulateResult.base64) {
            // Base64 veriyi URL formatında oluştur
            const base64Image = `data:image/jpeg;base64,${manipulateResult.base64}`;
            
            // Direkt olarak Firestore'a kaydet
            await getFirebaseCompatSync().firestore().collection('users').doc(currentUser.uid).update({
              [fieldToUpdate]: base64Image,
              updatedAt: getFirebaseCompatSync().firestore.FieldValue.serverTimestamp(),
            });
            
            console.log('Resim base64 olarak Firestore\'a kaydedildi');
            
            // GlobalAvatarCache'i güncelle - TÜM AVATARLARIN GÜNCELLENMESI İÇİN!
            if (imageType === 'profile') {
              await globalAvatarCache.updateUserAvatar(
                currentUser.uid, 
                base64Image,
                userProfile?.displayName || userProfile?.name
              );
              console.log('🖼️ Global avatar cache updated for user:', currentUser.uid);
            }
            
            // AuthContext'teki user profile'ı güncelle
            await refreshUserProfile();
            
            const successMessage = imageType === 'profile' 
              ? 'Profil fotoğrafınız güncellendi.'
              : 'Kapak fotoğrafınız güncellendi.';
            Alert.alert('Başarılı', successMessage);
          } else {
            throw new Error('Resim base64 formatına dönüştürülemedi');
          }
        } catch (error) {
          console.error('Resim yükleme hatası detayları:', error);
          
          let errorMessage = 'Fotoğraf yüklenirken bir hata oluştu.';
          if (error instanceof Error) {
            errorMessage += ' ' + error.message;
          }
          
          Alert.alert('Hata', errorMessage);
        } finally {
          setRefreshing(false);
        }
      }
    } catch (error) {
      console.error('Fotoğraf güncellenirken hata:', error);
      Alert.alert('Hata', 'Fotoğraf güncellenirken bir hata oluştu.');
      setRefreshing(false);
    }
  };
  
  // Debug and fix profile data
  useEffect(() => {
    if (userProfile) {
      // Debug logs
      
      // Check for missing or invalid data
      updateMissingProfileData();
    }
  }, [userProfile]);
  
  // Function to update missing or incorrect profile data
  const updateMissingProfileData = async () => {
    if (!userProfile || !userProfile.uid) return;
    
    const updates: { [key: string]: any } = {};
    let needsUpdate = false;
    
    // Fix missing or invalid createdAt field
    if (!userProfile.createdAt && !userProfile.createdDate) {
      updates.createdAt = new Date();
      needsUpdate = true;
    } 
    // Fix problematic date format
    else if (userProfile.createdAt && 
             typeof userProfile.createdAt === 'object' && 
             !userProfile.createdAt.seconds && 
             !userProfile.createdAt.toDate && 
             !(userProfile.createdAt instanceof Date)) {
      updates.createdAt = new Date();
      needsUpdate = true;
    }
    
    // Initialize following array if missing
    if (!userProfile.following) {
      updates.following = [];
      needsUpdate = true;
    }
    
    // Initialize followers array if missing
    if (!userProfile.followers) {
      updates.followers = [];
      needsUpdate = true;
    }
    
    // Initialize followedClubs array if missing
    if (!userProfile.followedClubs) {
      updates.followedClubs = [];
      needsUpdate = true;
    }
    
    // Update profile if needed
    if (needsUpdate) {
      try {
        await getFirebaseCompatSync().firestore().collection('users').doc(userProfile.uid).update(updates);
        console.log('Profil başarıyla güncellendi!');
        
        // Sayıları güncelle
        await fetchCounts();
      } catch (error) {
        console.error('Profil güncellenirken hata:', error);
      }
    }
  };
  
  // Profile field edit handler
  const handleEditField = (field: string, currentValue: any) => {
    console.log('🔵 Edit button clicked:', { field, currentValue });
    
    // Kulüp kullanıcıları için kısıtlamalar
    const isClubUser = userProfile?.userType === 'club';
    const restrictedFieldsForClubs = ['email', 'userType'];
    
    if (isClubUser && restrictedFieldsForClubs.includes(field)) {
      Alert.alert('Kısıtlama', 'Kulüp hesapları bu alanı düzenleyemez');
      return;
    }
    
    // Genel kısıtlamalar
    const generalRestrictedFields = ['userType', 'email'];
    if (generalRestrictedFields.includes(field)) {
      Alert.alert('Kısıtlama', 'Bu alan güvenlik nedenleriyle düzenlenemez');
      return;
    }
    
    setEditField(field);
    setEditValue(currentValue);
    setEditModalVisible(true);
    console.log('🔵 Modal visibility set to true');
  };
  
  const getFieldLabel = (field: string): string => {
    switch (field) {
      case 'displayName':
        return 'Görünen Ad';
      case 'username':
        return 'Kullanıcı Adı';
      case 'bio':
        return 'Hakkında';
      case 'description':
        return 'Açıklama';
      case 'university':
        return 'Üniversite';
      case 'department':
        return 'Bölüm';
      case 'classLevel':
        return 'Sınıf';
      default:
        return 'Alan';
    }
  };

  // Değerleri kullanıcı dostu metinlere çeviren fonksiyon
  const getDisplayValue = (field: string, value: string | undefined): string => {
    if (!value) return 'Belirtilmemiş';

    switch (field) {
      case 'university':
        const university = UNIVERSITIES_DATA.find(u => u.value === value || u.label === value);
        return university ? university.label : value;
      case 'department':
        const department = DEPARTMENTS_DATA.find(d => d.value === value || d.label === value);
        return department ? department.label : value;
      case 'classLevel':
        const classLevel = CLASS_LEVELS_DATA.find(c => c.value === value || c.label === value);
        return classLevel ? classLevel.label : value;
      default:
        return value;
    }
  };
  
  const handleEditModalUpdate = async (field: string, value: string | string[]) => {
    console.log('🔄 ProfileScreen - Field updated:', { field, value });
    
    // Profil verilerini yenile
    await refreshUserProfile();
    
    // Global avatar cache'i yenile - lider tablosu ve diğer bileşenler için
    if (currentUser) {
      try {
        // Sadece bu kullanıcının cache'ini refresh et
        await globalAvatarCache.refreshUserData(currentUser.uid);
        console.log('🔄 Global avatar cache refreshed for user after profile update');
      } catch (error) {
        console.error('Error refreshing global avatar cache:', error);
      }
    }
    
    setEditModalVisible(false);
  };
  
  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar
        style={Platform.OS === 'ios' ? 'light' : 'auto'}
        backgroundColor="transparent"
      />
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Cover Section */}
      <View style={styles.coverSection}>
        <TouchableOpacity 
          style={styles.coverBackground} 
          onPress={() => {
            if (userProfile?.coverImage) {
              handleImageZoom(userProfile.coverImage, 'Kapak Fotoğrafı');
            }
          }}
          activeOpacity={0.9}
        >
          {userProfile?.coverImage ? (
            <ImageBackground 
              source={{ uri: userProfile.coverImage }}
              style={styles.coverBackground}
              resizeMode="cover"
            />
          ) : userProfile?.coverIcon ? (
            <View style={[styles.coverBackground, { backgroundColor: userProfile.coverColor || '#1E88E5' }]}>
              <MaterialCommunityIcons 
                name={userProfile.coverIcon as any} 
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
        
        {/* Three-dot menu in top right corner */}
        <View style={[styles.menuContainer, floatingMenuOffset]}>
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
            <Menu.Item onPress={() => setLogoutDialogVisible(true)} title="Çıkış Yap" icon="logout" />
            <Menu.Item onPress={() => setDeleteAccountDialogVisible(true)} title="Hesabı Sil" icon="delete" />
          </Menu>
        </View>
        
        {/* Avatar that overlaps the cover and content */}
        <View style={[styles.avatarContainer, avatarPositionStyle]}>
          <TouchableOpacity 
            onPress={() => {
              if (userProfile?.profileImage) {
                handleImageZoom(userProfile.profileImage, 'Profil Fotoğrafı');
              }
            }}
            activeOpacity={0.8}
          >
            <UniversalAvatar
              user={userProfile}
              size={96}
              style={styles.avatar}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.editAvatarButton} onPress={() => handleEditProfile('profile')}>
            <MaterialCommunityIcons name="camera" size={16} color="#FFF" />
          </TouchableOpacity>
        </View>
        
        {/* Cover Photo Edit Button */}
        <TouchableOpacity style={styles.editCoverButton} onPress={() => handleEditProfile('cover')}>
          <MaterialCommunityIcons name="camera" size={16} color="#FFF" />
        </TouchableOpacity>
      </View>
      
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
      }>
        <View style={styles.profileHeader}>
          <View style={styles.editableRow}>
            <Text style={styles.name}>
              {userProfile?.displayName || 'İsimsiz Kullanıcı'}
            </Text>
            <IconButton
              icon="pencil"
              size={16}
              style={{ margin: 0 }}
              onPress={() => handleEditField('displayName', userProfile?.displayName)}
            />
          </View>
          <View style={styles.editableRow}>
            <Text style={styles.username}>@{userProfile?.username || userProfile?.email?.split('@')[0] || 'username'}</Text>
            <IconButton
              icon="pencil"
              size={16}
              style={{ margin: 0 }}
              onPress={() => handleEditField('username', userProfile?.username)}
            />
          </View>
        </View>
        
        {/* Kullanıcı İstatistikleri Widget */}
        {userProfile?.uid && (
          <View style={styles.statisticsSection}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="chart-bar" size={24} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>İstatistiklerim</Text>
            </View>
            
            <View style={styles.statsRow}>
              {/* Beğeniler */}
              <View style={styles.userStatItem}>
                <View style={[styles.statCircle, { backgroundColor: '#FF6B6B' }]}>
                  <MaterialCommunityIcons name="heart" size={24} color="#FFF" />
                </View>
                <Text style={styles.userStatNumber}>{userStats.likes}</Text>
                <Text style={styles.userStatLabel}>Beğeni</Text>
                {userStats.likesRank > 0 && (
                  <Text style={styles.rankText}>#{userStats.likesRank}</Text>
                )}
              </View>
              
              {/* Yorumlar */}
              <View style={styles.userStatItem}>
                <View style={[styles.statCircle, { backgroundColor: '#4ECDC4' }]}>
                  <MaterialCommunityIcons name="comment" size={24} color="#FFF" />
                </View>
                <Text style={styles.userStatNumber}>{userStats.comments}</Text>
                <Text style={styles.userStatLabel}>Yorum</Text>
                {userStats.commentsRank > 0 && (
                  <Text style={styles.rankText}>#{userStats.commentsRank}</Text>
                )}
              </View>
              
              {/* Katılımlar */}
              <View style={styles.userStatItem}>
                <View style={[styles.statCircle, { backgroundColor: '#45B7D1' }]}>
                  <MaterialCommunityIcons name="calendar-check" size={24} color="#FFF" />
                </View>
                <Text style={styles.userStatNumber}>{userStats.participations}</Text>
                <Text style={styles.userStatLabel}>Katılım</Text>
                {userStats.participationsRank > 0 && (
                  <Text style={styles.rankText}>#{userStats.participationsRank}</Text>
                )}
              </View>
            </View>
          </View>
        )}
        
        {/* Bio Section with frame */}
        <View style={styles.infoSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Biyografi</Text>
            <IconButton
              icon="pencil"
              size={16}
              style={{ margin: 0 }}
              onPress={() => handleEditField('bio', userProfile?.bio)}
            />
          </View>
          
          {userProfile?.bio ? (
            <Text style={styles.bioText}>{userProfile.bio}</Text>
          ) : (
            <TouchableOpacity 
              style={styles.addBioButton}
              onPress={() => handleEditProfile('profile')}
            >
              <MaterialCommunityIcons name="pencil" size={16} color="#1E88E5" style={{ marginRight: 6 }} />
              <Text style={styles.addBioText}>Biyografi ekle</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Stats (Followers, Following, Clubs, Events) - Horizontal */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalStatsContent}
          style={{ marginTop: 10, marginBottom: 8 }}
        >
          <TouchableOpacity style={styles.modernStatCard} onPress={handleViewFollowers}>
            <View style={styles.statIconContainer}>
              <MaterialCommunityIcons name="account-group" size={20} color="#10b981" />
            </View>
            <Text style={styles.modernStatNumber}>{followerCount}</Text>
            <Text style={styles.modernStatLabel}>Takipçi</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.modernStatCard} onPress={handleViewFollowing}>
            <View style={styles.statIconContainer}>
              <MaterialCommunityIcons name="account-multiple" size={20} color="#f59e0b" />
            </View>
            <Text style={styles.modernStatNumber}>{followingCount}</Text>
            <Text style={styles.modernStatLabel}>Takip</Text>
          </TouchableOpacity>
          {userProfile?.userType !== 'club' && (
            <TouchableOpacity style={styles.modernStatCard} onPress={() => navigation.navigate('MyMemberships') }>
              <View style={styles.statIconContainer}>
                <MaterialCommunityIcons name="account-group-outline" size={20} color="#0ea5e9" />
              </View>
              <Text style={styles.modernStatNumber}>{membershipCount}</Text>
              <Text style={styles.modernStatLabel}>Kulüp</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.modernStatCard} onPress={handleViewEvents}>
            <View style={styles.statIconContainer}>
              <MaterialCommunityIcons name="calendar-star" size={20} color="#4f46e5" />
            </View>
            <Text style={styles.modernStatNumber}>{eventsCount}</Text>
            <Text style={styles.modernStatLabel}>Etkinlik</Text>
          </TouchableOpacity>
        </ScrollView>

  {/* Kulüplerim bölümü kaldırıldı */}
        
        {/* Personal Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Kişisel Bilgiler</Text>
          </View>
          
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="email-outline" size={24} color={theme.colors.primary} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>E-posta</Text>
              <Text style={styles.infoValue}>{userProfile?.email || currentUser?.email || 'Belirtilmemiş'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="account-outline" size={24} color={theme.colors.primary} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Kullanıcı Tipi</Text>
              <Text style={styles.infoValue}>
                {userProfile?.userType === 'student' ? 'Öğrenci' : 
                 userProfile?.userType === 'club' ? 'Kulüp' : 'Belirtilmemiş'}
              </Text>
            </View>
            {/* Kullanıcı tipi güvenlik nedenleriyle düzenlenemez */}
          </View>
          
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="school" size={24} color={theme.colors.primary} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Üniversite</Text>
              <Text style={styles.infoValue}>{getDisplayValue('university', userProfile?.university)}</Text>
            </View>
            <IconButton
              icon="pencil"
              size={16}
              style={{ margin: 0 }}
              onPress={() => handleEditField('university', userProfile?.university)}
            />
          </View>
          
          {userProfile?.userType === 'student' && (
            <>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="book-education" size={24} color={theme.colors.primary} />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Bölüm</Text>
                  <Text style={styles.infoValue}>{getDisplayValue('department', userProfile?.department)}</Text>
                </View>
                <IconButton
                  icon="pencil"
                  size={16}
                  style={{ margin: 0 }}
                  onPress={() => handleEditField('department', userProfile?.department)}
                />
              </View>
              
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="school-outline" size={24} color={theme.colors.primary} />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Sınıf</Text>
                  <Text style={styles.infoValue}>{getDisplayValue('classLevel', userProfile?.classLevel)}</Text>
                </View>
                <IconButton
                  icon="pencil"
                  size={16}
                  style={{ margin: 0 }}
                  onPress={() => handleEditField('classLevel', userProfile?.classLevel)}
                />
              </View>
            </>
          )}
          
          {userProfile?.userType === 'club' && (
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="text-box-outline" size={24} color={theme.colors.primary} />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Açıklama</Text>
                <Text style={styles.infoValue}>{userProfile?.description || 'Belirtilmemiş'}</Text>
              </View>
              <IconButton
                icon="pencil"
                size={16}
                style={{ margin: 0 }}
                onPress={() => handleEditField('description', userProfile?.description)}
              />
            </View>
          )}
          
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="calendar" size={24} color={theme.colors.primary} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Katılma Tarihi</Text>
              <Text style={styles.infoValue}>{formatJoinDate(userProfile)}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
      
      {/* Logout Dialog */}
      <Portal>
        <Dialog 
          visible={logoutDialogVisible}
          onDismiss={() => setLogoutDialogVisible(false)}
          style={styles.logoutDialog}
        >
          <Dialog.Title style={styles.dialogTitle}>Çıkış Yap</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogContent}>
              Hesabınızdan çıkış yapmak istediğinize emin misiniz?
            </Text>
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button 
              mode="outlined" 
              onPress={() => setLogoutDialogVisible(false)}
              style={styles.cancelButton}
              color="#666"
            >
              İptal
            </Button>
            <Button 
              mode="contained" 
              onPress={handleLogout}
              style={styles.confirmButton}
              color="#FF5722"
            >
              Çıkış Yap
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      
      {/* Delete Account Dialog */}
      <Portal>
        <Dialog 
          visible={deleteAccountDialogVisible}
          onDismiss={() => setDeleteAccountDialogVisible(false)}
          style={styles.deleteAccountDialog}
        >
          <Dialog.Title style={[styles.dialogTitle, {color: '#D32F2F'}]}>⚠️ Hesabı Kalıcı Olarak Sil</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogContent}>
              Bu işlem GERİ ALINAMAZ! Hesabınızı sildiğinizde:
              {'\n\n'}• Tüm profil bilgileriniz silinecek
              {'\n'}• Tüm yorumlarınız ve aktiviteleriniz silinecek
              {'\n'}• Tüm takip ilişkileriniz silinecek
              {'\n'}• Tüm puanlarınız ve istatistikleriniz silinecek
              {'\n'}• Kulüp üyelikleriniz sonlanacak
              {'\n'}• Tüm fotoğraflarınız silinecek
              {'\n\n'}Bu işlemden sonra aynı hesapla tekrar giriş yapamazsınız.
            </Text>
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button 
              mode="outlined" 
              onPress={() => setDeleteAccountDialogVisible(false)}
              style={styles.cancelButton}
              color="#666"
            >
              İptal
            </Button>
            <Button 
              mode="contained" 
              onPress={handleDeleteAccount}
              style={[styles.confirmButton, {backgroundColor: '#D32F2F'}]}
              color="#FFF"
            >
              Hesabı Sil
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Debug Screen Modal */}
      <Portal>
        <Dialog 
          visible={debugScreenVisible}
          onDismiss={() => setDebugScreenVisible(false)}
          style={styles.debugDialog}
        >
          <Dialog.Title>Debug & Migration Tools</Dialog.Title>
          <Dialog.Content style={styles.debugContent}>
            <Text>Debug tools have been removed for production.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDebugScreenVisible(false)}>Kapat</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
        
    </View>
    
    {/* Profile Edit Modal */}
    <ProfileEditModal
      visible={editModalVisible}
      onDismiss={() => setEditModalVisible(false)}
      onUpdate={handleEditModalUpdate}
      field={editField as any}
      currentValue={editValue}
      label={getFieldLabel(editField)}
      userType={userProfile?.userType}
    />
    
    {/* Image Zoom Modal */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1E88E5',
  },
  container: {
    flex: 1,
    backgroundColor: '#1E88E5', // Match the default cover background color
  },
  content: {
    paddingBottom: 32,
  },
  coverSection: {
    height: 220, // Increased height to account for status bar
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
  menuContainer: {
    position: 'absolute',
    right: 10,
    zIndex: 10,
  },
  backButton: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    margin: 0,
  },
  menuButton: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    margin: 0,
  },
  avatarContainer: {
    position: 'absolute',
    bottom: -48,
    zIndex: 10,
    alignItems: 'center',
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
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#1E88E5',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  editCoverButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: '#1E88E5',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    zIndex: 5,
  },
  profileHeader: {
    marginTop: 52,
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  bioText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  addBioButton: {
    padding: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    borderStyle: 'dashed',
    paddingVertical: 12,
  },
  addBioText: {
    fontSize: 14,
    color: '#1E88E5',
    textAlign: 'center',
  },

  infoSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 16,
    width: '100%',
  },
  actionButton: {
    backgroundColor: '#1E88E5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 6,
    elevation: 2,
  },
  actionButtonText: {
    color: '#FFF',
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.03)',
  },
  infoTextContainer: {
    marginLeft: 12,
    flex: 1,
    paddingVertical: 2,
  },
  infoLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    backgroundColor: 'rgba(0,0,0,0.01)',
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statIcon: {
    marginTop: 4,
  },
  verticalDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#e0e0e0',
    alignSelf: 'center',
  },
  // Modern Stats Styles
  modernStatsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 16,
  },
  modernStatCard: {
    width: 100,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 6,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  horizontalStatsContent: {
    paddingHorizontal: 10,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  modernStatNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  modernStatLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
  },
  // Scoring Stats Styles
  scoringStatsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  scoringHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  scoringTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginLeft: 8,
  },
  scoringStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  scoringStatCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 4,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
  },
  scoringStatIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  scoringStatNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  scoringStatLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  modernStreakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  streakIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  streakInfo: {
    flex: 1,
  },
  streakNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ef4444',
  },
  streakLabel: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '500',
  },
  logoutDialog: {
    borderRadius: 16,
    paddingVertical: 8,
  },
  deleteAccountDialog: {
    borderRadius: 16,
    paddingVertical: 8,
  },
  dialogTitle: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
  },
  dialogContent: {
    textAlign: 'center',
    paddingVertical: 8,
  },
  dialogActions: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    justifyContent: 'space-between',
  },
  cancelButton: {
    marginRight: 8,
    borderRadius: 8,
  },
  confirmButton: {
    borderRadius: 8,
  },
  streakItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
    marginRight: 8,
  },
  streakSubtext: {
    fontSize: 12,
    color: '#666',
  },
  noContentText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    paddingVertical: 16,
  },
  clubPill: {
    width: 120,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)'
  },
  clubPillText: {
    marginTop: 8,
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
    maxWidth: 100,
  },
  activityContainer: {
    marginTop: 8,
    paddingHorizontal: 2,
    paddingVertical: 8,
  },
  debugDialog: {
    maxHeight: '80%',
    borderRadius: 16,
  },
  debugContent: {
    padding: 0,
    maxHeight: 400,
  },
  editableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // User Statistics Styles
  statisticsSection: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  userStatItem: {
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
  userStatNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  userStatLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  rankText: {
    fontSize: 10,
    color: '#999',
    fontWeight: '500',
  },
});

export default ProfileScreen;
