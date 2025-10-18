import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, ImageBackground, TouchableOpacity, Share, Dimensions, Alert } from 'react-native';
import { Text, useTheme, Button, Avatar, Divider, IconButton, Chip, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { 
  refreshUserProfileCounts,
  initializeUserFollowCounts
} from '../../firebase/userProfile';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { UNIVERSITIES_DATA, CLUB_TYPES_DATA } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';
import { sendMembershipRequest, getMembershipStatus, cancelMembershipRequest, leaveClub } from '../../firebase/membership';
import { StudentStackParamList } from '../../navigation/StudentNavigator';
import { ClubStatsService } from '../../services/clubStatsService';
import ClubFollowSyncService from '../../services/clubFollowSyncService';
import { CustomTheme } from '../../types/theme';
import unifiedStatisticsService, { ClubStatistics } from '../../services/unifiedStatisticsService';
import ImageZoomModal from '../../components/common/ImageZoomModal';
import { globalRealtimeSyncService } from '../../services/globalRealtimeSyncService';
import { enhancedRealtimeSyncService } from '../../services/enhancedRealtimeSyncService';
import { comprehensiveDataSyncService } from '../../services/comprehensiveDataSyncService';
import { clubDataSyncService } from '../../services/clubDataSyncService';
import unifiedDataSyncService, { UnifiedClubData } from '../../services/unifiedDataSyncService';
import realTimeDataSyncService, { RealTimeClubData } from '../../services/realTimeDataSyncService';

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
  avatarIcon?: string;
  avatarColor?: string;
  coverImage?: string;
  coverIcon?: string;
  coverColor?: string;
  createdAt?: any;
  public?: boolean;
  memberCount?: number;
  followers?: string[];
  following?: string[];
  followerCount?: number;
  followingCount?: number;
  email?: string;
  phone?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  twitter?: string;
  events?: any[];
  eventCount?: number;
  userType?: string;
  foundationYear?: string;
  establishedDate?: any;
}

interface RouteParams {
  clubId: string;
}

const ViewClubScreen: React.FC = () => {
  const baseTheme = useTheme();
  const theme = baseTheme as unknown as CustomTheme;
  const navigation = useNavigation<NativeStackNavigationProp<StudentStackParamList>>();
  const route = useRoute();
  const { currentUser, isClubAccount } = useAuth();
  const { clubId } = route.params as RouteParams;
  
  // Leaderboard actions are not used here; keep screen lean
  
  const [club, setClub] = useState<ClubData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [isMember, setIsMember] = useState<boolean>(false);
  const [membershipStatus, setMembershipStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
  const [isLoadingMembership, setIsLoadingMembership] = useState<boolean>(false);
  const [memberCount, setMemberCount] = useState<number>(0);
  const [followerCount, setFollowerCount] = useState<number>(0);
  const [followingCount, setFollowingCount] = useState<number>(0);
  const [eventCount, setEventCount] = useState<number>(0);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isFollowingLoading, setIsFollowingLoading] = useState<boolean>(false);
  
  // Club statistics state - unified
  const [clubStatistics, setClubStatistics] = useState<ClubStatistics>({
    likes: 0,
    comments: 0,
    eventsOrganized: 0,
    memberCount: 0,
    totalPoints: 0,
    rank: 0,
    level: 1,
    likesRank: 0,
    commentsRank: 0,
    eventsRank: 0
  });
  const [statsLoading, setStatsLoading] = useState<boolean>(false);
  
  // Image zoom modal state
  const [imageZoomVisible, setImageZoomVisible] = useState<boolean>(false);
  const [imageZoomUri, setImageZoomUri] = useState<string>('');
  const [imageZoomTitle, setImageZoomTitle] = useState<string>('');
  
  // Image zoom handler
  const handleImageZoom = (imageUri: string, title: string) => {
    setImageZoomUri(imageUri);
    setImageZoomTitle(title);
    setImageZoomVisible(true);
  };

  // Local storage için helper fonksiyonlar
  const getFollowingKey = (userId: string, clubId: string) => `following_${userId}_${clubId}`;
  const getFollowerCountKey = (clubId: string) => `follower_count_${clubId}`;
  
  // Takip durumunu local storage'dan yükle (sadece takip durumu, sayılar değil)
  const loadFollowingStatus = async () => {
    if (!currentUser?.uid || !clubId) return;
    
    try {
      const followingKey = getFollowingKey(currentUser.uid, clubId);
      const isFollowingLocal = await AsyncStorage.getItem(followingKey);
      
      if (isFollowingLocal !== null) {
        setIsFollowing(isFollowingLocal === 'true');
        console.log(`Loaded following status from local storage: ${isFollowingLocal}`);
      }
      
      // Follower count'u AsyncStorage'dan yükleme - gerçek zamanlı veriler kullan
      console.log('Skipping follower count from AsyncStorage - using real-time data');
    } catch (error) {
      console.error('Error loading following status from local storage:', error);
    }
  };
  
  // Takip durumunu local storage'a kaydet
  const saveFollowingStatus = async (isFollowing: boolean) => {
    if (!currentUser?.uid || !clubId) return;
    
    try {
      const followingKey = getFollowingKey(currentUser.uid, clubId);
      await AsyncStorage.setItem(followingKey, isFollowing.toString());
      console.log(`Saved following status to local storage: ${isFollowing}`);
    } catch (error) {
      console.error('Error saving following status to local storage:', error);
    }
  };
  
  // Kulüp istatistiklerini yükle (beğeni, yorum, katılımcı sayıları)
  const loadClubStatistics = useCallback(async () => {
    if (!clubId) return;
    
    try {
      console.log('🔄 Loading unified club statistics for club:', clubId);
      setStatsLoading(true);
      const statistics = await unifiedStatisticsService.getClubStatistics(clubId);
      
      // Verilerin doğruluğunu kontrol et
      console.log('📊 ViewClubScreen: Statistics loaded:', {
        clubId,
        likes: statistics.likes,
        comments: statistics.comments,
        eventsOrganized: statistics.eventsOrganized,
        memberCount: statistics.memberCount,
        totalPoints: statistics.totalPoints,
        rank: statistics.rank
      });
      
      setClubStatistics(statistics);
      console.log('✅ Unified club statistics loaded successfully');
      
    } catch (error) {
      console.error('❌ Error loading unified club statistics:', error);
      // Set default values on error
      setClubStatistics({
        likes: 0,
        comments: 0,
        eventsOrganized: 0,
        memberCount: 0,
        totalPoints: 0,
        rank: 0,
        level: 1,
        likesRank: 0,
        commentsRank: 0,
        eventsRank: 0
      });
    } finally {
      setStatsLoading(false);
    }
  }, [clubId]);
  
  // Follower count artık gerçek zamanlı verilerden geldiği için AsyncStorage'a kaydetmeye gerek yok
  const saveFollowerCount = async (count: number) => {
    console.log(`ℹ️ Follower count ${count} - using real-time data, skipping AsyncStorage save`);
  };
  
  // Takip eden kişinin "Takip" listesini güncelle (Following list)
  const updateFollowingList = async (isAdding: boolean) => {
    if (!currentUser) return;
    
    try {
      const followingListKey = `following_list_${currentUser.uid}`;
      const savedFollowing = await AsyncStorage.getItem(followingListKey);
      let followingList = savedFollowing ? JSON.parse(savedFollowing) : [];
      
      if (isAdding) {
        // Takip edilen kişiyi ekle
        const isAlreadyFollowing = followingList.some((f: any) => f.id === clubId);
        if (!isAlreadyFollowing) {
          const followedClub = {
            id: clubId,
            name: club?.clubName || club?.displayName || 'Club',
            displayName: club?.clubName || club?.displayName || 'Club',
            email: club?.email || '',
            profileImage: club?.profileImage || '',
            university: club?.university || '',
            userType: 'club'
          };
          followingList.push(followedClub);
          await AsyncStorage.setItem(followingListKey, JSON.stringify(followingList));
          console.log(`Added club ${clubId} to current user's following list`);
        }
      } else {
        // Takip edilen kişiyi çıkar
        followingList = followingList.filter((f: any) => f.id !== clubId);
        await AsyncStorage.setItem(followingListKey, JSON.stringify(followingList));
        console.log(`Removed club ${clubId} from current user's following list`);
      }
    } catch (error) {
      console.error('Error updating following list:', error);
    }
  };
  
  // Takip edilen kişinin "Takipçiler" listesini güncelle (Followers list)
  const updateFollowersList = async (isAdding: boolean) => {
    if (!currentUser) return;
    
    try {
      const followersListKey = `followers_list_${clubId}`;
      const savedFollowers = await AsyncStorage.getItem(followersListKey);
      let followersList = savedFollowers ? JSON.parse(savedFollowers) : [];
      
      if (isAdding) {
        // Takipçi ekle
        const isAlreadyFollower = followersList.some((f: any) => f.id === currentUser.uid);
        if (!isAlreadyFollower) {
          const newFollower = {
            id: currentUser.uid,
            name: currentUser.displayName || 'User',
            displayName: currentUser.displayName || 'User',
            email: currentUser.email || '',
            profileImage: currentUser.photoURL || '',
            university: 'University',
            isFollowing: false
          };
          followersList.push(newFollower);
          await AsyncStorage.setItem(followersListKey, JSON.stringify(followersList));
          console.log(`Added current user to followers list`);
        }
      } else {
        // Takipçi çıkar
        followersList = followersList.filter((f: any) => f.id !== currentUser.uid);
        await AsyncStorage.setItem(followersListKey, JSON.stringify(followersList));
        console.log(`Removed current user from followers list`);
      }
    } catch (error) {
      console.error('Error updating followers list:', error);
    }
  };
  
  // Kulüp verisini ve istatistikleri getir
  const fetchClubData = useCallback(async () => {
    if (!clubId) return;
    
    try {
      setLoading(true);
      
      console.log('🔄 ViewClubScreen: Fetching club data with realTimeDataSyncService...');
      
      // Yeni real-time servisini kullan - tüm veriler gerçek ve güncel
      const clubData = await realTimeDataSyncService.getRealTimeClubData(clubId, currentUser?.uid);
      
      if (clubData) {
        console.log('✅ ViewClubScreen: Real-time club data loaded:', {
          memberCount: clubData.memberCount,
          followerCount: clubData.followerCount,
          followingCount: clubData.followingCount,
          eventCount: clubData.eventCount,
          likes: clubData.likes,
          comments: clubData.comments,
          totalScore: clubData.totalScore,
          level: clubData.level,
          isFollowing: clubData.isFollowing,
          isMember: clubData.isMember,
          membershipStatus: clubData.membershipStatus
        });
        
        // Kulüp verisini set et
        setClub({
          id: clubData.id,
          clubName: clubData.clubName,
          displayName: clubData.displayName,
          description: clubData.description,
          bio: clubData.bio,
          university: clubData.university,
          clubTypes: clubData.clubTypes,
          clubType: clubData.clubTypes[0] || '',
          profileImage: clubData.profileImage,
          avatarIcon: clubData.avatarIcon,
          avatarColor: clubData.avatarColor,
          coverImage: clubData.coverImage,
          coverIcon: clubData.coverIcon,
          coverColor: clubData.coverColor,
          createdAt: clubData.createdAt,
          public: clubData.public,
          memberCount: clubData.memberCount,
          followerCount: clubData.followerCount,
          followingCount: clubData.followingCount,
          eventCount: clubData.eventCount,
          email: clubData.email,
          phone: clubData.phone,
          website: clubData.website,
          instagram: clubData.instagram,
          facebook: clubData.facebook,
          twitter: clubData.twitter,
          userType: clubData.userType,
          foundationYear: clubData.foundationYear
        });
        
        // Sayıları set et - artık gerçek verilerle
        setMemberCount(clubData.memberCount);
        setFollowerCount(clubData.followerCount);
        setFollowingCount(clubData.followingCount);
        setEventCount(clubData.eventCount);
        
        // İstatistikleri set et
        setClubStatistics({
          likes: clubData.likes,
          comments: clubData.comments,
          eventsOrganized: clubData.eventCount,
          memberCount: clubData.memberCount,
          totalPoints: clubData.totalScore,
          rank: clubData.rank,
          level: clubData.level,
          likesRank: 0,
          commentsRank: 0,
          eventsRank: 0
        });
        
        // Durum bilgilerini set et
        setIsFollowing(clubData.isFollowing);
        setIsMember(clubData.isMember);
        setMembershipStatus(clubData.membershipStatus);
        
        // Local storage'ı da güncelle
        if (currentUser) {
          await saveFollowingStatus(clubData.isFollowing);
        }
      } else {
        Alert.alert("Hata", "Kulüp bulunamadı");
        if (navigation.canGoBack()) {
          navigation.goBack();
        }
      }
    } catch (error) {
      console.error('Kulüp verisi getirilirken hata:', error);
      Alert.alert("Hata", "Kulüp bilgileri yüklenirken bir sorun oluştu");
    } finally {
      setLoading(false);
    }
  }, [clubId, currentUser, navigation]);
  
  // Load club statistics using unified service (replaces loadClubStats)
  // Note: Statistics are now loaded through loadClubStatistics function using unified service
  
  // Enhanced gerçek zamanlı profil senkronizasyonu
  useEffect(() => {
    if (!clubId) return;

    console.log('🔄 Setting up enhanced real-time profile sync for ViewClubScreen');

    const handleProfileUpdate = (data: any) => {
      if (data.userId === clubId) {
        console.log('🔄 Enhanced club profile update received, refreshing ViewClubScreen data');
        fetchClubData();
        loadClubStatistics();
      }
    };

    // Use both services for maximum reliability
    globalRealtimeSyncService.on('profileUpdated', handleProfileUpdate);
    enhancedRealtimeSyncService.on('profileUpdated', handleProfileUpdate);

    return () => {
      globalRealtimeSyncService.off('profileUpdated', handleProfileUpdate);
      enhancedRealtimeSyncService.off('profileUpdated', handleProfileUpdate);
    };
  }, [clubId, fetchClubData, loadClubStatistics]);

  // Sayfa her açıldığında sayıları güncelle ve initialize et
  useFocusEffect(
    useCallback(() => {
      if (clubId) {
        fetchClubData();
        loadClubStatistics();
      }
      // Kullanıcının takip sayılarını da initialize et
      if (currentUser) {
        initializeUserFollowCounts(currentUser.uid);
      }
    }, [clubId, fetchClubData, loadClubStatistics, currentUser])
  );

  // Enhanced real-time synchronization for club profile updates
  useEffect(() => {
    if (!clubId) return;

    const handleProfileUpdate = (data: any) => {
      if (data.userId === clubId) {
        console.log('🔄 ViewClub: Club profile updated via comprehensive sync, refreshing...');
        fetchClubData();
        loadClubStatistics();
      }
    };

    const handleClubDataUpdate = (clubData: any) => {
      console.log('🔄 ViewClub: Club data updated via club sync service, refreshing...');
      setClub({ ...clubData, id: clubId });
    };

    // Subscribe to comprehensive sync service
    comprehensiveDataSyncService.subscribe('ViewClubScreen', handleProfileUpdate);
    
    // Subscribe to club data sync service
    clubDataSyncService.subscribe(clubId, handleClubDataUpdate);

    return () => {
      comprehensiveDataSyncService.unsubscribe('ViewClubScreen', handleProfileUpdate);
      clubDataSyncService.unsubscribe(clubId, handleClubDataUpdate);
    };
  }, [clubId, fetchClubData, loadClubStatistics]);
  
  // İlk yüklemede kulüp verilerini getir
  useEffect(() => {
    if (clubId) {
      fetchClubData();
      loadClubStatistics();
    }
  }, [clubId, fetchClubData, loadClubStatistics]);

  // Real-time statistics updates for clubs
  useEffect(() => {
    if (!clubId) return;

    console.log('📊 Setting up real-time club statistics listeners for club:', clubId);

    const db = firebase.firestore();
    const unsubscribers: (() => void)[] = [];

    // Listen to club's organized events
    const eventsUnsub = db.collection('events')
      .where('createdBy', '==', clubId)  // Fixed: use 'createdBy' not 'organizerId'
      .onSnapshot(
        (snapshot) => {
          const eventsCount = snapshot.size;
          console.log('📊 Real-time events update (createdBy):', eventsCount);
          setClubStatistics(prev => ({ ...prev, eventsOrganized: eventsCount }));
          setEventCount(eventsCount);
        },
        (error) => console.warn('❌ Club events listener error:', error)
      );
    unsubscribers.push(eventsUnsub);

    // Listen to club members
    const membersUnsub = db.collection('clubMembers')
      .where('clubId', '==', clubId)
      .where('status', '==', 'approved')
      .onSnapshot(
        (snapshot) => {
          const membersCount = snapshot.size;
          console.log('📊 Real-time members update:', membersCount);
          setClubStatistics(prev => ({ ...prev, memberCount: membersCount }));
          setMemberCount(membersCount);
        },
        (error) => console.warn('❌ Club members listener error:', error)
      );
    unsubscribers.push(membersUnsub);

    // Listen to likes on club's events (requires getting event IDs first)
    let likesUnsubscribe: (() => void) | null = null;
    let commentsUnsubscribe: (() => void) | null = null;

    const setupEventBasedListeners = async () => {
      try {
        // Get club's events first - using correct field name
        const eventsSnapshot = await db.collection('events')
          .where('createdBy', '==', clubId)  // Fixed: use 'createdBy'
          .get();
        
        const eventIds = eventsSnapshot.docs.map(doc => doc.id);
        
        if (eventIds.length > 0) {
          // Listen to likes on club's events
          likesUnsubscribe = db.collection('eventLikes')
            .where('eventId', 'in', eventIds.slice(0, 10)) // Firestore 'in' limit is 10
            .onSnapshot(
              (snapshot) => {
                const likesCount = snapshot.size;
                console.log('📊 Real-time club likes update:', likesCount);
                setClubStatistics(prev => ({ ...prev, likes: likesCount }));
              },
              (error) => console.warn('❌ Club likes listener error:', error)
            );

          // For comments, we need to listen to each event's comments subcollection
          // This is a simplified version - in production you might want to optimize this
          const commentListeners: (() => void)[] = [];
          let totalComments = 0;

          eventIds.slice(0, 5).forEach(eventId => { // Limit to 5 events to avoid too many listeners
            const commentListener = db.collection('events')
              .doc(eventId)
              .collection('comments')
              .onSnapshot(
                (snapshot) => {
                  // This is a simplified approach - you'd need to aggregate properly
                  console.log('📊 Real-time comments update for event:', eventId, snapshot.size);
                  // For now, just trigger a full statistics reload
                  loadClubStatistics();
                },
                (error) => console.warn('❌ Club comments listener error:', error)
              );
            commentListeners.push(commentListener);
          });

          commentsUnsubscribe = () => {
            commentListeners.forEach(unsub => unsub());
          };
        }
      } catch (error) {
        console.warn('❌ Error setting up event-based listeners:', error);
      }
    };

    setupEventBasedListeners();

    // Cleanup function
    return () => {
      console.log('📊 Cleaning up real-time club statistics listeners');
      unsubscribers.forEach(unsub => unsub());
      if (likesUnsubscribe) likesUnsubscribe();
      if (commentsUnsubscribe) commentsUnsubscribe();
    };
  }, [clubId, loadClubStatistics]);
  
  // Subscribe to real-time follow state changes for synchronization
  useEffect(() => {
    if (!clubId || !currentUser) return;
    
    console.log('🔔 Subscribing to follow state changes for club:', clubId);
    
    const unsubscribe = ClubFollowSyncService.subscribe(clubId, (newState) => {
      console.log('🔄 Follow state changed:', newState);
      
      // Update UI state when other screens change follow status
      setIsFollowing(newState.isFollowing);
      setFollowerCount(newState.followerCount);
      
      // Also update AsyncStorage for legacy compatibility
      saveFollowingStatus(newState.isFollowing);
    });
    
    return () => {
      console.log('🔕 Unsubscribing from follow state changes for club:', clubId);
      unsubscribe();
    };
  }, [clubId, currentUser]);

  // Real-time takipçi sayısı listener'ı - efficient version
  useEffect(() => {
    if (!clubId) return;
    
    console.log(`🔔 Setting up real-time follower count listener for club: ${clubId}`);
    
    const unsubscribeFollowerCount = firebase.firestore()
      .collection('users')
      .doc(clubId) // Kulübün kendi document'i
      .onSnapshot(
        (doc) => {
          if (doc.exists) {
            const data = doc.data();
            const realTimeFollowerCount = data?.followers ? data.followers.length : 0;
            
            // Detaylı debug için takipçi verilerini loglayalım
            console.log(`🔄 Real-time follower update for club ${clubId}:`, {
              followersArray: data?.followers,
              followersLength: realTimeFollowerCount,
              cachedCount: data?.followerCount || 0
            });
            
            setFollowerCount(realTimeFollowerCount);
            
            // Local storage'a da kaydet
            saveFollowerCount(realTimeFollowerCount);
          }
        },
        (error) => {
          console.error('❌ Real-time follower count listener error:', error);
        }
      );

    return () => {
      console.log(`🔕 Cleaning up follower count listener for club: ${clubId}`);
      unsubscribeFollowerCount();
    };
  }, [clubId]);

  // Real-time takip edilen sayısı listener'ı  
  useEffect(() => {
    if (!clubId) return;
    
    console.log(`🔔 Setting up real-time following count listener for club: ${clubId}`);
    
    const unsubscribeFollowingCount = firebase.firestore()
      .collection('users')
      .doc(clubId)
      .onSnapshot(
        (clubDoc) => {
          if (clubDoc.exists) {
            const clubData = clubDoc.data();
            const realTimeFollowingCount = clubData?.following?.length || 0;
            console.log(`🔄 Club ${clubId} following count updated: ${realTimeFollowingCount}`);
            
            setFollowingCount(realTimeFollowingCount);
          }
        },
        (error) => {
          console.error('❌ Real-time following count listener error:', error);
        }
      );

    return () => {
      console.log(`🔕 Cleaning up following count listener for club: ${clubId}`);
      unsubscribeFollowingCount();
    };
  }, [clubId]);

  // Real-time approved member count listener
  useEffect(() => {
    if (!clubId) return;

    console.log(`🔔 Setting up real-time member count listener for club: ${clubId}`);
    const unsubscribeMembers = firebase.firestore()
      .collection('clubMembers')
      .where('clubId', '==', clubId)
      .where('status', '==', 'approved')
      .onSnapshot(
        (snapshot) => {
          const count = snapshot.size;
          setMemberCount(count);
          console.log(`🔄 Club ${clubId} member count updated: ${count}`);
        },
        (error) => console.error('❌ Real-time member count listener error:', error)
      );

    return () => {
      console.log(`🔕 Cleaning up member count listener for club: ${clubId}`);
      unsubscribeMembers();
    };
  }, [clubId]);

  // Real-time event count listener
  useEffect(() => {
    if (!clubId) return;

    console.log(`🔔 Setting up real-time event count listener for club: ${clubId}`);
    const unsubscribeEvents = firebase.firestore()
      .collection('events')
      .where('createdBy', '==', clubId) // Doğru field name
      .onSnapshot(
        (snapshot) => {
          const count = snapshot.size;
          setEventCount(count);
          console.log(`🔄 Club ${clubId} event count updated: ${count}`);
        },
        (error) => console.error('❌ Real-time event count listener error:', error)
      );

    return () => {
      console.log(`🔕 Cleaning up event count listener for club: ${clubId}`);
      unsubscribeEvents();
    };
  }, [clubId]);
  
  // Takip etme/takibi bırakma işlevi - synchronized with comprehensive scoring
  const handleFollowToggle = async () => {
    if (!currentUser) {
      navigation.navigate('Login' as never);
      return;
    }
    
    // Kulüp hesapları diğer hesapları takip edemez
    if (isClubAccount) {
      Alert.alert('Uyarı', 'Kulüp hesapları diğer kullanıcıları takip edemez.');
      return;
    }
    
    // Prevent multiple simultaneous follow operations
    if (isFollowingLoading) {
      console.log('⚠️ Follow operation already in progress, ignoring duplicate request');
      return;
    }
    
    try {
      setIsFollowingLoading(true);
      const clubName = club?.clubName || club?.displayName || 'Unknown Club';
      
      // Use synchronized service for follow/unfollow
      const result = await ClubFollowSyncService.toggleFollow(
        currentUser.uid,
        clubId,
        clubName,
        isFollowing,
        isClubAccount ? 'club' : 'student'
      );
      
      if (result.success) {
        // Update UI state
        setIsFollowing(result.newState.isFollowing);
        setFollowerCount(result.newState.followerCount);
        
        // Save to AsyncStorage for legacy compatibility
        await saveFollowingStatus(result.newState.isFollowing);
        
        // Update local lists for legacy compatibility
        await updateFollowingList(result.newState.isFollowing);
        await updateFollowersList(result.newState.isFollowing);
        
        console.log('✅ Club follow state synchronized across all screens');
      } else {
        console.error('❌ Club follow operation failed:', result.error);
        Alert.alert('Hata', result.error || 'Takip işlemi sırasında bir sorun oluştu. Lütfen tekrar deneyin.');
      }
    } catch (error) {
      console.error('Takip işlemi sırasında hata oluştu:', error);
      Alert.alert('Hata', 'Takip işlemi sırasında bir sorun oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsFollowingLoading(false);
    }
  };
  
  // Katılma isteği gönderme fonksiyonu
  const handleMembershipRequest = async () => {
    if (!currentUser) {
      navigation.navigate('Login' as never);
      return;
    }
    
    // Kulüp kendine başvuru yapamaz
    if (currentUser.uid === clubId) {
      Alert.alert('Hata', 'Kendi kulübünüze başvuru yapamazsınız.');
      return;
    }
    
    if (membershipStatus === 'pending') {
      // İsteği iptal et
      Alert.alert(
        'İsteği İptal Et',
        'Katılma isteğinizi iptal etmek istediğinizden emin misiniz?',
        [
          { text: 'Hayır', style: 'cancel' },
          { 
            text: 'Evet', 
            onPress: async () => {
              setIsLoadingMembership(true);
              try {
                const result = await cancelMembershipRequest(clubId, currentUser.uid);
                if (result.success) {
                  setMembershipStatus('none');
                  Alert.alert('Başarılı', 'Katılma isteğiniz iptal edildi.');
                } else {
                  Alert.alert('Hata', result.error || 'İstek iptal edilirken bir hata oluştu.');
                }
              } catch (error) {
                console.error('İstek iptal edilirken hata:', error);
                Alert.alert('Hata', 'İstek iptal edilirken bir hata oluştu.');
              } finally {
                setIsLoadingMembership(false);
              }
            }
          }
        ]
      );
      return;
    }
    
    // Reddedilen istek için yeni istek gönderme onayı
    if (membershipStatus === 'rejected') {
      Alert.alert(
        'Yeni İstek Gönder',
        'Daha önce reddedilen başvurunuz var. Yeni bir katılma isteği göndermek istediğinizden emin misiniz?',
        [
          { text: 'Hayır', style: 'cancel' },
          { 
            text: 'Evet', 
            onPress: async () => {
              await sendNewMembershipRequest();
            }
          }
        ]
      );
      return;
    }
    
    // Normal katılma isteği gönder
    await sendNewMembershipRequest();
  };
  
  // Yeni üyelik isteği gönderme yardımcı fonksiyonu
  const sendNewMembershipRequest = async () => {
    setIsLoadingMembership(true);
    try {
      console.log('=== Membership Request Debug ===');
      console.log('Sending request for clubId:', clubId);
      console.log('Club data:', club);
      console.log('Current user ID:', currentUser?.uid);
      
      const result = await sendMembershipRequest(clubId, currentUser!.uid);
      
      if (result.success) {
        setMembershipStatus('pending');
        Alert.alert(
          'Başarılı', 
          'Katılma isteğiniz gönderildi. Kulüp yöneticisi tarafından değerlendirilecek.'
        );
      } else {
        Alert.alert('Hata', result.error || 'Katılma isteği gönderilemedi.');
      }
    } catch (error) {
      console.error('Katılma isteği gönderilirken hata:', error);
      Alert.alert('Hata', 'Katılma isteği gönderilirken bir hata oluştu.');
    } finally {
      setIsLoadingMembership(false);
    }
  };
  
  // Kulüpten ayrılma işlevi
  const handleLeaveClub = async () => {
    if (!currentUser || !club) {
      return;
    }
    
    Alert.alert(
      'Kulüpten Ayrıl',
      `${club.displayName || club.clubName} kulübünden ayrılmak istediğinizden emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Ayrıl', 
          style: 'destructive',
          onPress: async () => {
            setIsLoadingMembership(true);
            try {
              console.log('=== Leave Club Debug ===');
              console.log('Leaving club:', clubId);
              console.log('User:', currentUser.uid);
              
              // Yeni membership.ts dosyasındaki leaveClub fonksiyonunu kullan
              const result = await leaveClub(currentUser.uid, clubId);
              
              if (result.success) {
                // Local state'i güncelle
                setIsMember(false);
                setMembershipStatus('none');
                
                // Kulüp verilerini yenile
                await fetchClubData();
                await loadClubStatistics();
                
                Alert.alert('Başarılı', 'Kulüpten başarıyla ayrıldınız.');
              } else {
                Alert.alert('Hata', result.error || 'Kulüpten ayrılırken bir hata oluştu.');
              }
              
            } catch (error) {
              console.error('Kulüpten ayrılırken hata:', error);
              Alert.alert('Hata', 'Kulüpten ayrılırken bir hata oluştu. Lütfen tekrar deneyin.');
            } finally {
              setIsLoadingMembership(false);
            }
          }
        }
      ]
    );
  };
  
  // Kulübe üye olma/üyelikten çıkma işlevi
  const handleMembershipToggle = async () => {
    if (!currentUser) {
      // Kullanıcı giriş yapmamışsa giriş sayfasına yönlendir
      navigation.navigate('Login' as never);
      return;
    }
    
    try {
      if (isMember) {
        // Kulüpten ayrıl
        const membershipQuery = await firebase.firestore()
          .collection('clubMemberships')
          .where('clubId', '==', clubId)
          .where('userId', '==', currentUser.uid)
          .get();
          
        if (!membershipQuery.empty) {
          const batch = firebase.firestore().batch();
          membershipQuery.forEach((doc: any) => {
            batch.delete(doc.ref);
          });
          await batch.commit();
          
          setIsMember(false);
          setMemberCount(prev => Math.max(0, prev - 1));
          Alert.alert('Bilgi', 'Kulüp üyeliğinden ayrıldınız.');
        }
      } else {
        // Kulübe üye ol
        await firebase.firestore().collection('clubMemberships').add({
          clubId,
          userId: currentUser.uid,
          status: 'member', // veya 'pending' onay gerekiyorsa
          joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
          userDisplayName: currentUser.displayName || '',
          userEmail: currentUser.email || '',
          userPhotoURL: currentUser.photoURL || '',
        });
        
        // Update club stats (increment member count)
        try {
          await ClubStatsService.incrementMemberCount(clubId);
          console.log('✅ Club stats member count incremented');
        } catch (statsError) {
          console.error('❌ Error updating club stats:', statsError);
        }
        
        // Club join statistics are tracked directly in Firebase collections
        console.log('✅ Club join statistics recorded in Firebase');
        
        setIsMember(true);
        setMemberCount(prev => prev + 1);
        
        // Eğer takip etmiyorsa otomatik olarak takip et
        if (!isFollowing) {
          handleFollowToggle();
        }
        
        Alert.alert('Tebrikler!', 'Kulübe başarıyla üye oldunuz.');
      }
    } catch (error) {
      console.error('Üyelik işlemi sırasında hata oluştu:', error);
      Alert.alert('Hata', 'Üyelik işlemi sırasında bir sorun oluştu. Lütfen tekrar deneyin.');
    }
  };
  
  // Kulübü paylaş
  const handleShare = async () => {
    try {
      const shareMessage = `${club?.displayName || club?.clubName} kulübünü Universe uygulamasında keşfet!`;
      await Share.share({
        message: shareMessage,
        // Burada URL paylaşımı eklenebilir
      });
    } catch (error) {
      console.error('Paylaşım sırasında hata oluştu:', error);
    }
  };
  
  // Geri dön
  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('StudentTabs');
    }
  };
  
  // Üniversite adını getir
  const getUniversityName = (universityId?: string) => {
    if (!universityId) return 'Belirtilmemiş';
    const university = UNIVERSITIES_DATA.find(u => u.id === universityId);
    return university ? university.label : universityId;
  };
  
  // Kulüp türü adını getir
  const getClubTypeName = (clubTypeId?: string) => {
    if (!clubTypeId) return 'Belirtilmemiş';
    const clubType = CLUB_TYPES_DATA.find(ct => ct.id === clubTypeId);
    return clubType ? clubType.name : clubTypeId;
  };

  // Takipçileri görüntüleme işlevi
  const handleViewFollowers = () => {
    console.log('🔍 ViewClubScreen - handleViewFollowers called with clubId:', clubId);
    // ClubFollowersScreen'e yönlendir
    navigation.navigate('ClubFollowers', { clubId });
  };
  
  // Üyeleri görüntüleme işlevi
  const handleViewMembers = () => {
    // ClubMembersScreen'e yönlendir
    navigation.navigate('ClubMembers', { clubId });
  };
  
  // Takip edilenleri görüntüleme işlevi
  const handleViewFollowing = () => {
    console.log('🔍 ViewClubScreen - handleViewFollowing called with clubId:', clubId);
    // ClubFollowingScreen'e yönlendir
    navigation.navigate('ClubFollowing', { clubId });
  };
  
  // Etkinlikleri görüntüleme işlevi
  const handleViewEvents = () => {
    // Events sayfasına kulüp ID filtresi ile yönlendir
    navigation.navigate('Events', { clubId: clubId });
  };
  
  // Generate a proper username from club name
  const generateUsername = (clubName: string | undefined): string => {
    if (!clubName) return 'kulup';
    // Convert to lowercase, replace spaces with underscores, and remove special characters
    return clubName.toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
      .replace(/_{2,}/g, '_'); // Replace multiple consecutive underscores with a single one
  };
  
  // Sayı formatla fonksiyonu - büyük sayıları kısaltır (1.2K, 1.5M vb.)
  const formatNumber = (num: number): string => {
    if (num === undefined || num === null || isNaN(num)) return '0';
    
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return num.toString();
  };
  
  // Sayfa yenileme
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    
    try {
      // Kulüp istatistiklerini force refresh yap
      console.log('🔄 Kulüp istatistikleri force refresh ediliyor...');
      const stats = await ClubStatsService.forceRefreshStats(clubId);
      
      // Kulüp dokümanını güncellenmiş sayılarla güncelle
      await firebase.firestore().collection('users').doc(clubId).update({
        memberCount: stats.totalMembers,
        eventCount: stats.totalEvents,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`✅ Kulüp ${clubId} sayıları güncellendi - Üye: ${stats.totalMembers}, Etkinlik: ${stats.totalEvents}`);
      
      // Kulüp verilerini ve istatistikleri yenile
      await fetchClubData();
      await loadClubStatistics();
    } catch (error) {
      console.error('Yenileme sırasında hata:', error);
    } finally {
      setRefreshing(false);
    }
  }, [fetchClubData, loadClubStatistics, clubId]);
  
  // Yükleniyor...
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="auto" />
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons name="loading" size={40} color={theme.colors.primary} />
          <Text style={styles.loadingText}>Kulüp profili yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  // Kulüp bulunamadı
  if (!club) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="auto" />
        <View style={styles.notFoundContainer}>
          <MaterialCommunityIcons name="alert-circle-outline" size={60} color="#777" />
          <Text style={styles.notFoundText}>Kulüp bulunamadı</Text>
          <Button 
            mode="contained" 
            onPress={handleGoBack} 
            style={styles.backButton}
          >
            Geri Dön
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Cover Section */}
      <View style={styles.coverSection}>
        {/* Back Button (outside of conditional rendering for consistent position) */}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleGoBack}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        
        {/* More Options Button */}
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => {}}
        >
          <MaterialCommunityIcons name="dots-vertical" size={24} color="#fff" />
        </TouchableOpacity>
        
        {club.coverImage ? (
          <TouchableOpacity 
            style={styles.coverBackground}
            onPress={() => {
              if (club.coverImage) {
                handleImageZoom(club.coverImage, 'Kulüp Kapak Fotoğrafı');
              }
            }}
            activeOpacity={0.9}
          >
            <ImageBackground 
              source={{ uri: club.coverImage }}
              style={styles.coverBackground}
              resizeMode="cover"
            />
          </TouchableOpacity>
        ) : club.coverIcon ? (
          <View style={[styles.coverBackground, { backgroundColor: club.coverColor || '#1E88E5' }]}>
            <MaterialCommunityIcons 
              name={club.coverIcon as any} 
              size={180} 
              color="rgba(255,255,255,0.3)" 
              style={styles.coverIconStyle} 
            />
          </View>
        ) : (
          <View style={[styles.coverBackground, { backgroundColor: '#1E88E5' }]}>
            <MaterialCommunityIcons 
              name="domain" 
              size={180} 
              color="rgba(255,255,255,0.3)" 
              style={styles.coverIconStyle} 
            />
          </View>
        )}
        
        {/* Profil Resmi */}
        <View style={styles.avatarContainer}>
          {club.profileImage ? (
            <TouchableOpacity 
              onPress={() => {
                if (club.profileImage) {
                  handleImageZoom(club.profileImage, 'Kulüp Profil Fotoğrafı');
                }
              }}
              activeOpacity={0.8}
            >
              <Avatar.Image 
                size={96} 
                source={{ uri: club.profileImage }}
                style={styles.avatar}
              />
            </TouchableOpacity>
          ) : club.avatarIcon ? (
            <View style={[styles.customAvatarWrapper, { backgroundColor: club.avatarColor || theme.colors.primary }]}>
              <MaterialCommunityIcons 
                name={club.avatarIcon as any} 
                size={50} 
                color="#FFFFFF" 
                style={styles.customAvatarIcon} 
              />
            </View>
          ) : (
            <Avatar.Icon 
              size={96} 
              icon="domain"
              color="#FFFFFF"
              style={[styles.avatar, { backgroundColor: theme.colors.primary }]}
            />
          )}
          
          {/* Kamera ikonu kaldırıldı */}
        </View>
      </View>
      
      <ScrollView style={styles.mainScrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
      }>
        {/* Profil Başlığı */}
        <View style={styles.profileHeader}>
          <Text style={styles.name}>{clubDataSyncService.getClubDisplayName(club)}</Text>
          <Text style={styles.username}>
            @{clubDataSyncService.getClubUsername(club)}
          </Text>
        </View>
        
        {/* İstatistikler Bölümü */}
        <View style={styles.leaderboardCard}>
          <LinearGradient
            colors={['#ffffff', '#f8fafc']}
            style={styles.cardGradient}
          >
            {/* Header */}
            <View style={styles.leaderboardHeader}>
              <View style={styles.titleContainer}>
                <MaterialCommunityIcons name="chart-bar" size={20} color="#4f46e5" />
                <Text style={styles.leaderboardTitle}>Kulüp İstatistikleri</Text>
              </View>
            </View>

            {statsLoading ? (
              <View style={styles.statsLoadingOverlay}>
                <ActivityIndicator size="small" color="#4f46e5" />
                <Text style={styles.statsLoadingText}>İstatistikler yükleniyor...</Text>
              </View>
            ) : (
              <>
                {/* Main Stats */}
                <View style={styles.mainStats}>
                  {/* Beğeniler */}
                  <View style={styles.statItemNew}>
                    <View style={[styles.rankCircle, { backgroundColor: '#FF6B6B' }]}>
                      <MaterialCommunityIcons name="heart" size={20} color="#fff" />
                    </View>
                    <Text style={styles.statLabelNew}>Beğeni</Text>
                    {statsLoading ? (
                      <ActivityIndicator size="small" color="#FF6B6B" />
                    ) : (
                      <Text style={styles.statValueNew}>{clubStatistics.likes}</Text>
                    )}
                  </View>

                  {/* Yorumlar */}
                  <View style={styles.statItemNew}>
                    <View style={[styles.rankCircle, { backgroundColor: '#4ECDC4' }]}>
                      <MaterialCommunityIcons name="comment" size={20} color="#fff" />
                    </View>
                    <Text style={styles.statLabelNew}>Yorum</Text>
                    {statsLoading ? (
                      <ActivityIndicator size="small" color="#4ECDC4" />
                    ) : (
                      <Text style={styles.statValueNew}>{clubStatistics.comments}</Text>
                    )}
                  </View>

                  {/* Etkinlikler */}
                  <View style={styles.statItemNew}>
                    <View style={[styles.rankCircle, { backgroundColor: '#45B7D1' }]}>
                      <MaterialCommunityIcons name="calendar-multiple" size={20} color="#fff" />
                    </View>
                    <Text style={styles.statLabelNew}>Etkinlik</Text>
                    {statsLoading ? (
                      <ActivityIndicator size="small" color="#45B7D1" />
                    ) : (
                      <Text style={styles.statValueNew}>{clubStatistics.eventsOrganized}</Text>
                    )}
                  </View>
                </View>
              </>
            )}
          </LinearGradient>
        </View>
        
        {/* Açıklama Section */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionHeader}>Açıklama</Text>
          <Text style={styles.bioText}>{club.description || club.bio || 'Açıklama bulunmuyor.'}</Text>
        </View>
        
        {/* Aksiyon Butonları */}
        <View style={styles.actionButtonsContainer}>
          {/* Takip butonu - tüm öğrenci hesaplar için (üye olsun ya da olmasın) */}
          {currentUser && !isClubAccount && currentUser.uid !== clubId && (
            <Button
              mode={isFollowing ? "outlined" : "contained"}
              icon={isFollowing ? "heart" : "heart-outline"}
              onPress={handleFollowToggle}
              loading={isFollowingLoading}
              disabled={isFollowingLoading}
              style={[styles.followButton, isFollowing ? styles.outlinedButton : null]}
              labelStyle={{ color: isFollowing ? '#1E88E5' : 'white' }}>
              {isFollowing ? 'Takibi Bırak' : 'Takip Et'}
            </Button>
          )}
          
          {/* Katılma Butonu - sadece üye olmayanlar için */}
          {!isMember && currentUser?.uid !== clubId && (
            <Button
              mode={membershipStatus === 'pending' ? "outlined" : "contained"}
              icon={
                membershipStatus === 'pending' ? "clock-outline" : 
                membershipStatus === 'rejected' ? "refresh" : "account-plus"
              }
              onPress={handleMembershipRequest}
              loading={isLoadingMembership}
              disabled={isLoadingMembership}
              style={[
                styles.membershipButton, 
                membershipStatus === 'pending' ? styles.outlinedButton : null,
                membershipStatus === 'rejected' ? styles.rejectedButton : null
              ]}
              labelStyle={{ 
                color: membershipStatus === 'pending' ? '#FF9800' : 
                       membershipStatus === 'rejected' ? '#F44336' : 'white' 
              }}
            >
              {membershipStatus === 'pending' ? 'Onay Bekliyor' : 
               membershipStatus === 'rejected' ? 'Tekrar Dene' : 'Katıl'}
            </Button>
          )}
          
          {/* Üye Butonu - sadece üyeler için */}
          {isMember && currentUser?.uid !== clubId && (
            <Button
              mode="contained"
              icon="check"
              style={[styles.membershipButton, { backgroundColor: '#4CAF50' }]}
              labelStyle={{ color: 'white' }}
              onPress={handleLeaveClub}
            >
              Üyesin
            </Button>
          )}
          
          <Button
            mode="outlined"
            icon="share-variant"
            onPress={handleShare}
            style={styles.shareButton}
          >
            Paylaş
          </Button>
        </View>
        
        {/* Stats (Events, Followers, Members) */}
        <View style={styles.statsContainer}>
          <TouchableOpacity style={styles.statItem} onPress={handleViewEvents}>
            <Text style={styles.statNumber}>{formatNumber(eventCount)}</Text>
            <Text style={styles.statLabel}>Etkinlik</Text>
            <MaterialCommunityIcons name="calendar-star" size={14} color="#666" style={styles.statIcon} />
          </TouchableOpacity>
          
          <View style={styles.verticalDivider} />
          
          <TouchableOpacity style={styles.statItem} onPress={handleViewFollowers}>
            <Text style={styles.statNumber}>{formatNumber(followerCount)}</Text>
            <Text style={styles.statLabel}>Takipçi</Text>
            <MaterialCommunityIcons name="account-group-outline" size={14} color="#666" style={styles.statIcon} />
          </TouchableOpacity>
          
          <View style={styles.verticalDivider} />
          
          <TouchableOpacity style={styles.statItem} onPress={handleViewMembers}>
            <Text style={styles.statNumber}>{formatNumber(memberCount)}</Text>
            <Text style={styles.statLabel}>Üyeler</Text>
            <MaterialCommunityIcons name="account-group" size={14} color="#666" style={styles.statIcon} />
          </TouchableOpacity>
        </View>
        
        {/* Kulüp Bilgileri */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionHeader}>Kulüp Bilgileri</Text>
          
          {/* E-posta */}
          {club.email && (
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="email" size={24} color={theme.colors.primary} />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>E-posta</Text>
                <Text style={styles.infoValue}>{club.email}</Text>
              </View>
            </View>
          )}
          
          {/* Kullanıcı Tipi */}
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="account" size={24} color={theme.colors.primary} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Kullanıcı Tipi</Text>
              <Text style={styles.infoValue}>Kulüp</Text>
            </View>
          </View>
          
          {/* Üniversite Bilgisi */}
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="school" size={24} color={theme.colors.primary} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Üniversite</Text>
              <Text style={styles.infoValue}>{getUniversityName(club.university)}</Text>
            </View>
          </View>
          
          {/* Kategoriler / Kulüp Türleri */}
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="tag-multiple" size={24} color={theme.colors.primary} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Kategoriler</Text>
              <View style={styles.clubTagsContainer}>
                {club.clubTypes && club.clubTypes.length > 0 ? (
                  club.clubTypes.map((type, index) => {
                    const typeInfo = CLUB_TYPES_DATA.find(ct => ct.id === type);
                    return (
                      <Chip
                        key={index}
                        style={styles.clubTagChip}
                        textStyle={{ color: 'white', fontSize: 12 }}
                        icon={() => (
                          <MaterialCommunityIcons
                            name={(typeInfo?.icon as any) || 'shape'}
                            size={16}
                            color="white"
                          />
                        )}
                      >
                        {getClubTypeName(type)}
                      </Chip>
                    );
                  })
                ) : club.clubType ? (
                  <Chip
                    style={styles.clubTagChip}
                    textStyle={{ color: 'white', fontSize: 12 }}
                    icon={() => {
                      const typeInfo = CLUB_TYPES_DATA.find(ct => ct.id === club.clubType);
                      return (
                        <MaterialCommunityIcons
                          name={(typeInfo?.icon as any) || 'shape'}
                          size={16}
                          color="white"
                        />
                      );
                    }}
                  >
                    {getClubTypeName(club.clubType)}
                  </Chip>
                ) : (
                  <Text style={styles.noDataText}>Belirtilmemiş</Text>
                )}
              </View>
            </View>
          </View>
          
          {/* Katılım Tarihi */}
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="calendar" size={24} color={theme.colors.primary} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Katılma Tarihi</Text>
              <Text style={styles.infoValue}>
                {(() => {
                  try {
                    // Firebase Timestamp
                    if (club.createdAt?.seconds) {
                      return new Date(club.createdAt.seconds * 1000).toLocaleDateString('tr-TR');
                    }
                    // JavaScript Date nesnesi
                    else if (club.createdAt instanceof Date) {
                      return club.createdAt.toLocaleDateString('tr-TR');
                    }
                    // String tarih
                    else if (typeof club.createdAt === 'string') {
                      return new Date(club.createdAt).toLocaleDateString('tr-TR');
                    }
                    // Timestamp with toDate method
                    else if (club.createdAt && typeof club.createdAt.toDate === 'function') {
                      return club.createdAt.toDate().toLocaleDateString('tr-TR');
                    }
                    return '—';
                  } catch (e) {
                    console.error('Tarih formatı hatası:', e);
                    return '—';
                  }
                })()
              }</Text>
            </View>
          </View>
        </View>
        
        {/* İletişim Bilgileri bölümü kaldırıldı */}
        
      </ScrollView>
      
      {/* Image Zoom Modal */}
      <ImageZoomModal
        visible={imageZoomVisible}
        imageUri={imageZoomUri}
        onClose={() => setImageZoomVisible(false)}
        title={imageZoomTitle}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  mainScrollView: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  coverOverlay: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 10,
  },
  menuButton: {
    position: 'absolute',
    top: 40,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.2)',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.2)',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
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
  universityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  universityText: {
    fontSize: 16,
    color: '#555',
    marginLeft: 8,
  },
  // Stats section
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
  // Action buttons
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 8,
  },
  followButton: {
    flex: 1,
    minWidth: 110,
    borderRadius: 8,
  },
  membershipButton: {
    flex: 1,
    minWidth: 110,
    borderRadius: 8,
  },
  shareButton: {
    flex: 1,
    minWidth: 110,
    borderRadius: 8,
  },
  outlinedButton: {
    borderColor: '#1E88E5',
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  rejectedButton: {
    borderColor: '#999',
    borderWidth: 1,
    backgroundColor: '#f5f5f5',
  },
  // Info sections
  infoSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
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
  bioText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  clubTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  clubTagChip: {
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#1E88E5',
    height: 32,
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  socialButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  // Loading and not found states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  notFoundText: {
    fontSize: 18,
    marginVertical: 10,
    color: '#555',
  },
  noDataText: {
    fontSize: 15,
    color: '#777',
    fontStyle: 'italic',
    marginVertical: 10,
    textAlign: 'center',
  },
  // Statistics Section Styles
  statsSection: {
    backgroundColor: '#fff',
    marginTop: 10,
    paddingHorizontal: 0,
    paddingVertical: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  statCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
    width: '48%',
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    alignItems: 'center',
  },
  statIconContainer: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  statsCardLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  statSubtext: {
    fontSize: 11,
    color: '#888',
    textAlign: 'center',
    marginTop: 2,
  },
  progressContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
    marginHorizontal: 20,
    marginTop: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  progressText: {
    fontSize: 12,
    color: '#666',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#28a745',
    borderRadius: 4,
  },
  // Additional statistics layout styles
  statsTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  statsMiddleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#28a745',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  progressLabelText: {
    fontSize: 11,
    color: '#666',
  },
  statsLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  statsLoadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
  },
  // Profile Leaderboard Card Styles
  leaderboardCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    backgroundColor: '#fff',
  },
  cardGradient: {
    padding: 16,
    borderRadius: 16,
  },
  leaderboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leaderboardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 6,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4f46e5',
    marginRight: 2,
  },
  mainStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItemNew: {
    alignItems: 'center',
  },
  rankCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  pointsCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginBottom: 6,
  },
  pointsGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginBottom: 6,
  },
  levelGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  statLabelNew: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 2,
    textAlign: 'center',
  },
  statValueNew: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
  },
  secondaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  secondaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  secondaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  progressContainerNew: {
    marginBottom: 16,
  },
  progressBarNew: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressTextNew: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
  },
  actionButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginRight: 4,
  },
});

export default ViewClubScreen;

