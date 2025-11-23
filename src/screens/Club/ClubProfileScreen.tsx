import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, ImageBackground, TouchableOpacity, Alert, Platform, Share, useWindowDimensions, ActivityIndicator } from 'react-native';
import { Text, useTheme, Button, Avatar, Dialog, Portal, Divider, IconButton, Menu, Chip, Card } from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { getFirebaseCompatSync } from '../../firebase/compat';
import { refreshUserProfileCounts } from '../../firebase/userProfile';
import { ClubStatsService } from '../../services/clubStatsService';
import { centralizedRankingService } from '../../services/centralizedRankingService';
// import RealTimeClubScoresService from '../../services/realTimeClubScoresService'; // Service not available - commented out
import ClubScoreFixService from '../../services/clubScoreFixService';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ClubStackParamList } from '../../navigation/ClubNavigator';
import { StatusBar } from 'expo-status-bar';
import { UNIVERSITIES_DATA as universities, CLUB_TYPES_DATA as clubTypes, DEPARTMENTS_DATA, CLASS_LEVELS_DATA } from '../../constants';
import { UniversalAvatar, EnhancedButton, EnhancedCard } from '../../components/common';
import { useResponsiveDesign } from '../../utils/responsiveDesignUtils';
import AccessibilityUtils from '../../utils/accessibilityUtils';
import ProfileEditModal from '../../components/profile/ProfileEditModal';
import { CustomTheme } from '../../types/theme';
import AccountDeletionService from '../../services/accountDeletionService';
import ImageZoomModal from '../../components/common/ImageZoomModal';
import { globalRealtimeSyncService } from '../../services/globalRealtimeSyncService';
import { enhancedRealtimeSyncService } from '../../services/enhancedRealtimeSyncService';
import { comprehensiveDataSyncService } from '../../services/comprehensiveDataSyncService';
import { clubDataSyncService } from '../../services/clubDataSyncService';

const AVATAR_SIZE = 96;
const firebase = getFirebaseCompatSync();

const ClubProfileScreen: React.FC = () => {
  const baseTheme = useTheme();
  const theme = baseTheme as unknown as CustomTheme;
  const { currentUser, refreshUserProfile, refreshUserData, signOut } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<ClubStackParamList>>();
  const { fontSizes, spacing, shadows } = useResponsiveDesign();
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const floatingMenuOffset = useMemo(() => ({
    top: Math.max(insets.top, 0) + 8,
  }), [insets.top]);
  const avatarPositionStyle = useMemo(() => ({
    left: Math.max((windowWidth - AVATAR_SIZE) / 2, 16),
  }), [windowWidth]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);
  const [deleteAccountDialogVisible, setDeleteAccountDialogVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Gerçek veriler için state'ler
  const [eventCount, setEventCount] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [memberCount, setMemberCount] = useState(0);
  
  // Club statistics state
  const [clubStats, setClubStats] = useState({
    totalPoints: 0,
    level: 0,
    rank: null as number | null,
    dailyStreak: 0,
    pointsToNextLevel: 1000,
    levelProgress: 0,
    totalClubs: 0
  });
  const [statsLoading, setStatsLoading] = useState(false);
  
  // Club Statistics States (likes, comments, participations by club events)
  const [clubStatistics, setClubStatistics] = useState({
    totalLikes: 0,
    totalComments: 0,
    totalParticipants: 0,
    likesRank: 0,
    commentsRank: 0,
    participantsRank: 0
  });
  
  // Edit modal states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editField, setEditField] = useState('');
  const [editValue, setEditValue] = useState('');
  
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

  // Değer -> Etiket dönüşümü için fonksiyon
  const getDisplayValue = (fieldType: string, value: string | undefined): string => {
    if (!value) return 'Belirtilmemiş';
    
    switch (fieldType) {
      case 'university':
        const university = universities.find((uni: any) => uni.value === value);
        return university ? university.label : value;
      case 'department':
        const department = DEPARTMENTS_DATA.find((dept: any) => dept.value === value);
        return department ? department.label : value;
      case 'classLevel':
        const classLevel = CLASS_LEVELS_DATA.find((level: any) => level.value === value);
        return classLevel ? classLevel.label : value;
      default:
        return value;
    }
  };
  
  // Load club statistics (likes, comments, participations from club events)
  const loadClubStatistics = useCallback(async () => {
    if (!currentUser?.uid) return;
    
    try {
      const db = getFirebaseCompatSync().firestore();
      
      // Get all events of this club
      const eventsSnapshot = await db.collection('events')
        .where('clubId', '==', currentUser.uid)
        .get();
      
      const eventIds = eventsSnapshot.docs.map(doc => doc.id);
      
      if (eventIds.length === 0) {
        setClubStatistics({
          totalLikes: 0,
          totalComments: 0,
          totalParticipants: 0,
          likesRank: 0,
          commentsRank: 0,
          participantsRank: 0
        });
        return;
      }
      
      // Count total likes for all club events
      const likesPromises = eventIds.map(eventId => 
        db.collection('eventLikes').where('eventId', '==', eventId).get()
      );
      const likesResults = await Promise.all(likesPromises);
      const totalLikes = likesResults.reduce((sum, snapshot) => sum + snapshot.size, 0);
      
      // Count total comments for all club events
      const commentsPromises = eventIds.map(eventId => 
        db.collection('events').doc(eventId).collection('comments').get()
      );
      const commentsResults = await Promise.all(commentsPromises);
      const totalComments = commentsResults.reduce((sum, snapshot) => sum + snapshot.size, 0);
      
      // Count total participants for all club events
      const participantsPromises = eventIds.map(eventId => 
        db.collection('eventAttendees').where('eventId', '==', eventId).get()
      );
      const participantsResults = await Promise.all(participantsPromises);
      const totalParticipants = participantsResults.reduce((sum, snapshot) => sum + snapshot.size, 0);
      
      const clubStatsData = {
        totalLikes,
        totalComments,
        totalParticipants,
        likesRank: 0, // Will be calculated if needed
        commentsRank: 0, // Will be calculated if needed
        participantsRank: 0 // Will be calculated if needed
      };
      
      setClubStatistics(clubStatsData);
      
      console.log('📊 Club statistics loaded:', clubStatsData);
    } catch (error) {
      console.error('❌ Error loading club statistics:', error);
    }
  }, [currentUser]);

  // Doğru etkinlik ve üye sayılarını getiren özel fonksiyon
  const refreshCounts = useCallback(async () => {
    if (!currentUser?.uid) return;
    
    try {
      setRefreshing(true);
      const db = getFirebaseCompatSync().firestore();
      
      // 1. Aktif üye sayısını hesapla
      const activeMemberQuery = await db.collection('clubMembers')
        .where('clubId', '==', currentUser.uid)
        .get();
      const actualMemberCount = activeMemberQuery.size;
      setMemberCount(actualMemberCount);
      
      // 2. İstatistikleri force refresh ile güncelle
      console.log('Kulüp istatistikleri güncelleniyor...');
      await ClubStatsService.forceRefreshStats(currentUser.uid);
      const stats = await ClubStatsService.getClubStats(currentUser.uid);
      const actualEventCount = stats?.totalEvents || 0;
      setEventCount(actualEventCount);
      
      // Üye sayısını veritabanında güncelle
      await db.collection('users').doc(currentUser.uid).update({
        memberCount: actualMemberCount,
        updatedAt: getFirebaseCompatSync().firestore.FieldValue.serverTimestamp()
      });
      
      console.log('Sayılar manuel olarak güncellendi:', {
        memberCount: actualMemberCount, 
        eventCount: actualEventCount
      });
    } catch (error) {
      console.error('Sayılar güncellenirken hata:', error);
    } finally {
      setRefreshing(false);
    }
  }, [currentUser]);

  // Sayıları formatlamak için fonksiyon
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return num.toString();
  };

  // Kulüp profilini getir
  const fetchClubProfile = useCallback(async () => {
    if (!currentUser?.uid) return;
    
    try {
      setLoading(true);
      
      // Kullanıcı sayılarını güncelle
      await refreshUserProfileCounts(currentUser.uid);
      
      // Use club data sync service for consistent data
      const clubData = await clubDataSyncService.getClubData(currentUser.uid, true);
      
      if (clubData) {
        setUserProfile({ ...clubData, uid: currentUser.uid });
        
        // Güncel sayıları al
        setFollowerCount(clubData?.followerCount || 0);
        setFollowingCount(clubData?.followingCount || 0);
        
        // Etkinlik sayısını stats service'den al
        try {
          console.log('Kulüp istatistikleri alınıyor:', currentUser.uid);
          const stats = await ClubStatsService.getClubStats(currentUser.uid);
          const actualEventCount = stats?.totalEvents || 0;
          console.log('Güncellenmiş etkinlik sayısı:', actualEventCount);
          setEventCount(actualEventCount);
        } catch (eventError) {
          console.error('Etkinlik sayısını alırken hata:', eventError);
          setEventCount(clubData?.eventCount || 0);
        }
        
        // Aktif üye sayısını hesapla
        const db = getFirebaseCompatSync().firestore();
        const activeMemberQuery = await db.collection('clubMembers')
          .where('clubId', '==', currentUser.uid)
          .get();
        setMemberCount(activeMemberQuery.size);
        
        console.log('Kulüp profil sayıları güncellendi:', {
          followerCount: clubData?.followerCount || 0,
          followingCount: clubData?.followingCount || 0,
          eventCount: clubData?.eventCount || 0,
          memberCount: activeMemberQuery.size
        });
      }
    } catch (error) {
      console.error('Error fetching club profile:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);
  
  // Manuel skor senkronizasyonu
  const handleManualSync = useCallback(async () => {
    if (!currentUser?.uid) return;
    
    try {
      setStatsLoading(true);
      console.log('🔄 Manual sync started for club:', currentUser.uid);
      
      // Firebase'den clubScores verisini al
      const clubScoreDoc = await getFirebaseCompatSync().firestore()
        .collection('clubScores')
        .doc(currentUser.uid)
        .get();
      
      if (clubScoreDoc.exists) {
        const clubScoreData = clubScoreDoc.data();
        console.log('📊 Club score data:', clubScoreData);
        
        // Stats'ları yeniden yükle
        await loadClubStats();
        
        Alert.alert('Başarılı', 'Kulüp skoru güncellendi!');
      } else {
        Alert.alert('Uyarı', 'Kulüp skoru bulunamadı.');
      }
    } catch (error) {
      console.error('❌ Manual sync error:', error);
      Alert.alert('Hata', 'Skor güncellenirken hata oluştu.');
    } finally {
      setStatsLoading(false);
    }
  }, [currentUser]);
  
  // Load club statistics
  const loadClubStats = useCallback(async () => {
    if (!currentUser?.uid) return;
    
    try {
      setStatsLoading(true);
      
      console.log('🏢 ClubProfileScreen: Starting comprehensive club score fix for:', currentUser.uid);
      
      // ⭐ YENİ: Önce tüm puan sistemini düzelt
      const fixResult = await ClubScoreFixService.fixCompleteClubScore(currentUser.uid);
      
      if (!fixResult.success) {
        console.error('❌ ClubProfileScreen: Score fix failed:', fixResult.message);
        Alert.alert('Hata', 'Puan sistemi güncellenirken hata oluştu: ' + fixResult.message);
        return;
      }
      
      console.log('✅ ClubProfileScreen: Score fix completed successfully:', fixResult);
      
      // ⭐ YENİ: Score reset'i engellemek için sürekli kontrol
      await ClubScoreFixService.preventScoreReset(currentUser.uid);
      
      // ⭐ YENİ: clubScores koleksiyonundan gerçek puanı al (ana kaynak)
      const clubScoreDoc = await getFirebaseCompatSync().firestore()
        .collection('clubScores')
        .doc(currentUser.uid)
        .get();
      
      let realTotalPoints = 0;
      let rankInfo = { rank: 0, totalClubs: 0 };
      
      if (clubScoreDoc.exists) {
        const clubScoreData = clubScoreDoc.data();
        realTotalPoints = clubScoreData?.totalPoints || 0;
        console.log('✅ Real totalPoints from clubScores (after fix):', realTotalPoints);
        
        // Rank bilgisi için diğer kulüplerle karşılaştır
        const allClubsSnapshot = await getFirebaseCompatSync().firestore()
          .collection('clubScores')
          .orderBy('totalPoints', 'desc')
          .get();
        
        const allClubs = allClubsSnapshot.docs.map(doc => ({
          id: doc.id,
          totalPoints: doc.data().totalPoints || 0
        }));
        
        const currentClubIndex = allClubs.findIndex(club => club.id === currentUser.uid);
        rankInfo = {
          rank: currentClubIndex >= 0 ? currentClubIndex + 1 : 0,
          totalClubs: allClubs.length
        };
        
        console.log('🏆 Club rank info from clubScores:', rankInfo);
      }
      
  // Calculate level and progress (0-based)
  const level = Math.floor(realTotalPoints / 1000);
  const pointsInCurrentLevel = realTotalPoints % 1000;
  const pointsToNextLevel = Math.max(0, 1000 - pointsInCurrentLevel);
  const levelProgress = Math.max(0, Math.min(100, (pointsInCurrentLevel / 1000) * 100));
      
      const finalStats = {
        totalPoints: Math.max(0, realTotalPoints),
  level: Math.max(0, level),
  rank: Math.max(0, rankInfo.rank || 0),
        dailyStreak: 0, // Bu daha sonra eklenebilir
        pointsToNextLevel: Math.max(0, pointsToNextLevel),
        levelProgress: Math.max(0, Math.min(100, levelProgress)),
  totalClubs: Math.max(0, rankInfo.totalClubs || 0)
      };
      
      console.log('✅ ClubProfileScreen: Final club stats (fixed):', finalStats);
      setClubStats(finalStats);
      
    } catch (error) {
      console.error('❌ ClubProfileScreen: Error loading club stats:', error);
      
      // Hata durumunda güvenli varsayılan değerler
      setClubStats({
        totalPoints: 0,
        level: 0,
  rank: 0,
        dailyStreak: 0,
        pointsToNextLevel: 1000,
        levelProgress: 0,
  totalClubs: 0
      });
      
      Alert.alert('Hata', 'Kulüp istatistikleri yüklenirken hata oluştu. Puan sistemi otomatik olarak düzeltilmeye çalışılacak.');
    } finally {
      setStatsLoading(false);
    }
  }, [currentUser]);
  
  // Enhanced gerçek zamanlı profil senkronizasyonu
  useEffect(() => {
    if (!currentUser?.uid) return;

    console.log('🔄 Setting up enhanced real-time profile sync for ClubProfileScreen');

    const handleProfileUpdate = (data: any) => {
      if (data.userId === currentUser.uid) {
        console.log('🔄 Enhanced club profile update received, refreshing all data');
        fetchClubProfile();
        loadClubStats();
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
  }, [currentUser?.uid, fetchClubProfile, loadClubStats, loadClubStatistics]);

  // Sayfa her açıldığında sayıları güncelle
  useFocusEffect(
    useCallback(() => {
      if (currentUser) {
        fetchClubProfile();
        loadClubStats();
        loadClubStatistics(); // Load club statistics
        
        // ⭐ YENİ: clubScores koleksiyonundan real-time listener
        const clubScoresUnsubscribe = getFirebaseCompatSync().firestore()
          .collection('clubScores')
          .doc(currentUser.uid)
          .onSnapshot((doc) => {
            if (doc.exists) {
              const totalPoints = doc.data()?.totalPoints || 0;
              console.log('🔄 ClubProfileScreen: Real-time clubScores update:', totalPoints);
              
              // Club stats'ı güncelle
              const level = Math.floor(totalPoints / 1000);
              const pointsInCurrentLevel = totalPoints % 1000;
              const pointsToNextLevel = Math.max(0, 1000 - pointsInCurrentLevel);
              const levelProgress = Math.max(0, Math.min(100, (pointsInCurrentLevel / 1000) * 100));
              
              setClubStats(prev => ({
                ...prev,
                totalPoints: Math.max(0, totalPoints),
                level,
                pointsToNextLevel,
                levelProgress
              }));
            }
          });
        
        // Etkinlikleri kontrol et ve güncelle
        const checkEventCount = async () => {
          try {
            const db = getFirebaseCompatSync().firestore();
            const eventsQuery = await db.collection('events')
              .where('clubId', '==', currentUser.uid)
              .get();
            
            console.log('Etkinlik sorgusu sonucu:', eventsQuery.size, 'etkinlik bulundu');
            setEventCount(eventsQuery.size);
            
            // Veritabanını güncelle
            await db.collection('users').doc(currentUser.uid).update({
              eventCount: eventsQuery.size,
              updatedAt: getFirebaseCompatSync().firestore.FieldValue.serverTimestamp()
            });
          } catch (error) {
            console.error('Etkinlik sayısı kontrol edilirken hata:', error);
          }
        };
        
        checkEventCount();
        
        // Cleanup function
        return () => {
          clubScoresUnsubscribe();
        };
      }
    }, [currentUser, fetchClubProfile])
  );

  // Enhanced real-time synchronization for club profile updates
  useEffect(() => {
    if (!currentUser) return;

    const handleProfileUpdate = (data: any) => {
      if (data.userId === currentUser.uid) {
        console.log('🔄 ClubProfile: Club profile updated via comprehensive sync, refreshing...');
        fetchClubProfile();
        loadClubStats();
        loadClubStatistics();
      }
    };

    const handleClubDataUpdate = (clubData: any) => {
      console.log('🔄 ClubProfile: Club data updated via club sync service, refreshing...');
      setUserProfile({ ...clubData, uid: currentUser.uid });
    };

    // Subscribe to comprehensive sync service
    comprehensiveDataSyncService.subscribe('ClubProfileScreen', handleProfileUpdate);
    
    // Subscribe to club data sync service
    clubDataSyncService.subscribe(currentUser.uid, handleClubDataUpdate);

    return () => {
      comprehensiveDataSyncService.unsubscribe('ClubProfileScreen', handleProfileUpdate);
      clubDataSyncService.unsubscribe(currentUser.uid, handleClubDataUpdate);
    };
  }, [currentUser?.uid, fetchClubProfile, loadClubStats, loadClubStatistics]);
  
  // İlk yüklemede profili getir ve gerekirse düzelt
  useEffect(() => {
    const initializeClubProfile = async () => {
      if (currentUser) {
        await fetchClubProfile();
        
        // Kulüp bilgilerini kontrol et ve gerekirse düzelt
        const db = getFirebaseCompatSync().firestore();
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data();
        
        if (userData && (!userData.clubName || !userData.displayName || userData.clubName === userData.email)) {
          console.log('🔧 İlk yüklemede kulüp bilgileri düzeltiliyor...');
          
          const updateData: any = {};
          
          // Kulüp adı belirle
          if (!userData.clubName || userData.clubName === userData.email) {
            updateData.clubName = 'Fizik Kulübü';
            updateData.displayName = 'Fizik Kulübü';
          }
          
          // Username belirle
          if (!userData.username) {
            updateData.username = 'fizikkulubu';
          }
          
          // Güncellemeleri uygula
          if (Object.keys(updateData).length > 0) {
            await db.collection('users').doc(currentUser.uid).update(updateData);
            console.log('✅ İlk yüklemede kulüp bilgileri güncellendi:', updateData);
            
            // Profili yeniden yükle
            await fetchClubProfile();
          }
        }
      }
    };
    
    initializeClubProfile();
  }, [currentUser, fetchClubProfile]);
  
  // Debug userProfile
  useEffect(() => {
    console.log('ClubProfileScreen userProfile:', userProfile);
    if (userProfile) {
      console.log('userProfile.description:', userProfile.description);
      console.log('userProfile.bio:', userProfile.bio);
      console.log('userProfile.university:', userProfile.university);
      console.log('userProfile.clubType:', userProfile.clubType);
      console.log('userProfile.createdAt:', userProfile.createdAt);
      
      // Eğer üniversite bir ID ise
      if (typeof userProfile.university === 'string') {
        const universityName = getUniversityName(userProfile.university);
        console.log('Resolved university name:', universityName);
      }
      // Eğer kulüp tipi bir ID ise
      if (typeof userProfile.clubType === 'string') {
        const clubTypeName = getClubTypeName(userProfile.clubType);
        console.log('Resolved club type name:', clubTypeName);
      }
      
      // Eksik verileri güncelleyelim
      updateMissingProfileData();
    }
  }, [userProfile]);
  
  // Eksik verileri güncelleme fonksiyonu
  const updateMissingProfileData = async () => {
    if (!userProfile || !userProfile.uid) return;
    
    const updates: { [key: string]: any } = {};
    let needsUpdate = false;
    
    // Üniversite bilgisi eksikse güncelle
    if (userProfile.userType === 'club' && (!userProfile.university || userProfile.university === '')) {
      console.log('Boş üniversite bilgisi güncelleniyor...');
      updates.university = 'other';
      needsUpdate = true;
    }
    
    // Kulüp türü eksikse güncelle
    if (userProfile.userType === 'club' && (!userProfile.clubType || userProfile.clubType === '')) {
      console.log('Boş kulüp türü güncelleniyor...');
      updates.clubType = 'other';
      needsUpdate = true;
    }
    
    // Multiple clubTypes eksikse güncelle
    if (userProfile.userType === 'club' && (!userProfile.clubTypes || !Array.isArray(userProfile.clubTypes) || userProfile.clubTypes.length === 0)) {
      console.log('Eksik kulüp kategorileri güncelleniyor...');
      // If we have a single clubType, use it as the first item in the array
      updates.clubTypes = userProfile.clubType ? [userProfile.clubType] : ['other'];
      needsUpdate = true;
    }
    
    // Oluşturma tarihi eksikse veya tarih formatı sorunluysa güncelle
    if (!userProfile.createdAt && !userProfile.createdDate) {
      console.log('Eksik tarih bilgisi güncelleniyor...');
      updates.createdAt = new Date();
      needsUpdate = true;
    } 
    // Tarih var ama formatı sorunluysa düzeltme
    else if (userProfile.createdAt && 
             typeof userProfile.createdAt === 'object' && 
             !userProfile.createdAt.seconds && 
             !userProfile.createdAt.toDate && 
             !(userProfile.createdAt instanceof Date)) {
      console.log('Hatalı tarih formatı düzeltiliyor:', userProfile.createdAt);
      updates.createdAt = new Date();
      needsUpdate = true;
    }
    
    // Gerekliyse güncelleme yap
    if (needsUpdate) {
      try {
        console.log('Profil verileri güncelleniyor:', updates);
        await getFirebaseCompatSync().firestore().collection('users').doc(userProfile.uid).update(updates);
        console.log('Profil başarıyla güncellendi!');
      } catch (error) {
        console.error('Profil güncellenirken hata:', error);
      }
    }
  };
  
  // Get university name from ID
  const getUniversityName = (universityId: string | any) => {
    if (!universityId) return 'Belirtilmemiş';
    
    // Eğer universityId bir obje ise
    if (typeof universityId === 'object' && universityId !== null) {
      if (universityId.label) return universityId.label;
      if (universityId.name) return universityId.name;
      if (universityId.id) {
        const university = universities.find(u => u.id === universityId.id);
        return university ? university.label : 'Belirtilmemiş';
      }
      return JSON.stringify(universityId);
    }
    
    // Eğer universityId bir string ise
    const university = universities.find(u => u.id === universityId);
    return university ? university.label : universityId;
  };
  
  // Get club type name from ID
  const getClubTypeName = (clubTypeId: string | any) => {
    if (!clubTypeId) return 'Belirtilmemiş';
    
    // Eğer clubTypeId bir obje ise
    if (typeof clubTypeId === 'object' && clubTypeId !== null) {
      if (clubTypeId.name) return clubTypeId.name;
      if (clubTypeId.id) {
        const clubType = clubTypes.find(ct => ct.id === clubTypeId.id);
        return clubType ? clubType.name : 'Belirtilmemiş';
      }
      return JSON.stringify(clubTypeId);
    }
    
    // Eğer clubTypeId bir string ise
    const clubType = clubTypes.find(ct => ct.id === clubTypeId);
    return clubType ? clubType.name : clubTypeId;
  };
  
  // Sayfa yenilendiğinde veri güncelleme
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    
    try {
      if (currentUser) {
        // AuthContext üzerinden kullanıcı verilerini yenile
        await refreshUserData();
        
        // Profil bilgilerini yenile
        await fetchClubProfile();
        
        // Load club statistics
        await loadClubStats();
        
        // REAL-TIME SCORE SYNC - Gerçek skorları senkronize et
        try {
          const clubScoreDoc = await getFirebaseCompatSync().firestore()
            .collection('clubScores')
            .doc(currentUser.uid)
            .get();
          
          if (clubScoreDoc.exists) {
            console.log('🔄 ClubProfile: Real-time score sync result:', clubScoreDoc.data());
            // Başarılı sync sonrasında clubStats'ı yenile
            await loadClubStats();
            console.log('✅ ClubProfile: Updated UI after successful sync');
          }
        } catch (syncError) {
          console.error('❌ ClubProfile: Real-time sync error:', syncError);
        }

        // Kulüp bilgilerini düzelt (eğer sadece email varsa)
        const db = getFirebaseCompatSync().firestore();
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data();
        
        if (userData && (!userData.clubName || !userData.displayName || userData.clubName === userData.email)) {
          console.log('🔧 Kulüp bilgileri düzeltiliyor...');
          
          const updateData: any = {};
          
          // Kulüp adı belirle
          if (!userData.clubName || userData.clubName === userData.email) {
            updateData.clubName = 'Fizik Kulübü';
            updateData.displayName = 'Fizik Kulübü';
          }
          
          // Username belirle
          if (!userData.username) {
            updateData.username = 'fizikkulubu';
          }
          
          // Güncellemeleri uygula
          if (Object.keys(updateData).length > 0) {
            await db.collection('users').doc(currentUser.uid).update(updateData);
            console.log('✅ Kulüp bilgileri güncellendi:', updateData);
            
            // Profili yeniden yükle
            await fetchClubProfile();
          }
        }

        // Aktif üye sayısını hesapla
        const activeMemberQuery = await db.collection('clubMembers')
          .where('clubId', '==', currentUser.uid)
          .get();
        setMemberCount(activeMemberQuery.size);
        
        // Etkinlik sayısını manuel olarak hesapla
        const eventsQuery = await db.collection('events')
          .where('clubId', '==', currentUser.uid)
          .get();
        setEventCount(eventsQuery.size);
        
        console.log('Yenileme sırasında manuel sayılar güncellendi:', { 
          memberCount: activeMemberQuery.size,
          eventCount: eventsQuery.size 
        });
      }
    } catch (error) {
      console.error('Yenileme sırasında hata:', error);
    } finally {
      setRefreshing(false);
    }
  }, [currentUser, fetchClubProfile, refreshUserData]);
  
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

      // Kullanıcı türünü belirle (kulüp)
      const userType = 'club';
      
      console.log(`🗑️ Starting account deletion for club: ${user.uid}`);
      
      // Loading state göster
      Alert.alert(
        'Kulüp Hesabınız Siliniyor...', 
        'Bu işlem birkaç dakika sürebilir. Tüm etkinlikler, üyeler ve veriler silinecek. Lütfen bekleyin.',
        [],
        { cancelable: false }
      );

      // Kapsamlı hesap silme işlemini başlat
      await AccountDeletionService.deleteUserAccount(user.uid, userType);
      
      setDeleteAccountDialogVisible(false);
      
      Alert.alert(
        'Kulüp Hesabı Silindi', 
        'Kulüp hesabınız ve tüm verileriniz başarıyla silindi.',
        [{ text: 'Tamam' }]
      );
      
    } catch (error) {
      console.error('Kulüp hesabı silinirken hata oluştu:', error);
      setDeleteAccountDialogVisible(false);
      
      // Handle requires-recent-login error specially
      if (error instanceof Error && error.message === 'REQUIRES_RECENT_LOGIN') {
        console.log('🔐 REQUIRES_RECENT_LOGIN detected for club - showing password prompt');
        Alert.alert(
          'Şifrenizi Doğrulayın',
          'Güvenlik nedeniyle kulüp hesabınızı silmek için şifrenizi tekrar girmeniz gerekiyor.',
          [
            {
              text: 'İptal',
              style: 'cancel'
            },
            {
              text: 'Devam Et',
              onPress: () => {
                console.log('🔐 Club user confirmed password prompt - calling showPasswordPromptForClub');
                showPasswordPromptForClub();
              }
            }
          ]
        );
        return;
      }
      
      // Kullanıcıya anlamlı hata mesajı göster
      let errorMessage = 'Kulüp hesabınızı silerken bir sorun oluştu.';
      
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

  // Show password prompt for club reauthentication
  const showPasswordPromptForClub = () => {
    console.log('🔐 showPasswordPromptForClub called - displaying password input');
    Alert.prompt(
      'Şifrenizi Girin',
      'Kulüp hesabınızı silmek için mevcut şifrenizi girin:',
      [
        {
          text: 'İptal',
          style: 'cancel',
          onPress: () => console.log('🔐 Club password prompt cancelled')
        },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async (password) => {
            console.log('🔐 Club password entered, attempting reauthentication and deletion');
            if (!password) {
              Alert.alert('Hata', 'Şifre gereklidir.');
              return;
            }
            
            try {
              Alert.alert(
                'Kulüp Hesabınız Siliniyor...', 
                'Bu işlem birkaç dakika sürebilir. Tüm etkinlikler, üyeler ve veriler silinecek. Lütfen bekleyin.',
                [],
                { cancelable: false }
              );

              await AccountDeletionService.reauthenticateAndDelete(password);
              console.log('✅ Club reauthentication and deletion successful');
              
              Alert.alert(
                'Kulüp Hesabı Silindi', 
                'Kulüp hesabınız ve tüm verileriniz başarıyla silindi.',
                [{ text: 'Tamam' }]
              );
              
            } catch (error) {
              console.error('❌ Club reauthentication and deletion failed:', error);
              
              let errorMessage = 'Kulüp hesabınızı silerken bir sorun oluştu.';
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
            console.log('Base64 resim oluşturuldu, boyut:', base64Image.length);
            
            // Direkt olarak Firestore'a kaydet
            await getFirebaseCompatSync().firestore().collection('users').doc(currentUser.uid).update({
              [fieldToUpdate]: base64Image,
              updatedAt: getFirebaseCompatSync().firestore.FieldValue.serverTimestamp(),
            });
            
            console.log('Resim base64 olarak Firestore\'a kaydedildi');
            
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

  // Stats handler functions
  const handleViewEvents = () => {
    // Etkinlikler sekmesine yönlendir - Bottom tab navigatorda ClubEvents sekmesine git
    try {
      // Doğrudan eventi yakalayıp işlem yapıyoruz
      const navigateToEvents = () => {
        // @ts-ignore - Tip hatası olsa da işlevsel olarak çalışacak
        navigation.navigate('ClubTabs', { screen: 'ClubEvents' });
        console.log('Etkinlikler sekmesine yönlendirildi');
      };
      
      navigateToEvents();
    } catch (error) {
      console.error('Etkinlik sayfasına yönlendirilirken hata:', error);
      
      // Alternatif yönlendirme
      try {
        // @ts-ignore
        navigation.reset({
          index: 0,
          routes: [{ name: 'ClubTabs', params: { screen: 'ClubEvents' }}],
        });
      } catch (resetError) {
        console.error('Alternatif yönlendirme de başarısız oldu:', resetError);
      }
    }
  };

  const handleViewFollowers = () => {
    // Kulübün takipçilerini görüntüle
    navigation.navigate('ClubFollowers', { clubId: userProfile?.uid });
  };

  const handleViewFollowing = () => {
    // Kulübün üyelerini görüntüle - Bottom tab'de ClubMembers sekmesine git
    // @ts-ignore - Tip hatası olsa da işlevsel olarak çalışacak
    navigation.navigate('ClubTabs', { screen: 'ClubMembers' });
  };
  
  // Profile field edit handler
  const handleEditField = (field: string, currentValue: any) => {
    console.log('Club Edit button clicked:', { field, currentValue });
    
    // Kulüp kullanıcıları için kısıtlamalar
    const restrictedFieldsForClubs = ['userType', 'email', 'role', 'uid'];
    
    if (restrictedFieldsForClubs.includes(field)) {
      Alert.alert('Kısıtlama', 'Bu alan güvenlik nedenleriyle düzenlenemez');
      return;
    }
    
    setEditField(field);
    setEditValue(currentValue);
    setEditModalVisible(true);
  };
  
  const getFieldLabel = (field: string): string => {
    switch (field) {
      case 'displayName':
        return 'Kulüp Adı';
      case 'username':
        return 'Kullanıcı Adı';
      case 'description':
        return 'Açıklama';
      case 'bio':
        return 'Hakkında';
      case 'university':
        return 'Üniversite';
      case 'categories':
        return 'Kategoriler';
      default:
        return 'Alan';
    }
  };
  
  const handleEditModalUpdate = async (field: string, value: string | string[]) => {
    console.log('🔄 ClubProfile - Field updated:', { field, value });
    await refreshUserProfile();
    setEditModalVisible(false);
  };
  
  // We're now using the imported UpcomingEventsList component
  
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 16, color: '#666' }}>Profil yükleniyor...</Text>
      </View>
    );
  }
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Cover Section */}
      <View style={styles.coverSection}>
        {userProfile?.coverImage ? (
          <TouchableOpacity 
            style={styles.coverBackground}
            onPress={() => {
              if (userProfile.coverImage) {
                handleImageZoom(userProfile.coverImage, 'Kulüp Kapak Fotoğrafı');
              }
            }}
            activeOpacity={0.9}
          >
            <ImageBackground 
              source={{ uri: userProfile.coverImage }}
              style={styles.coverBackground}
              resizeMode="cover"
            />
          </TouchableOpacity>
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
            <Menu.Item onPress={() => setLogoutDialogVisible(true)} title="Çıkış Yap" icon={() => <MaterialCommunityIcons name="logout" size={24} color="#666" />} />
            <Menu.Item onPress={() => setDeleteAccountDialogVisible(true)} title="Hesabı Sil" icon={() => <MaterialCommunityIcons name="delete" size={24} color="#666" />} />
          </Menu>
        </View>
        
        {/* Avatar that overlaps the cover and content */}
        <View style={[styles.avatarContainer, avatarPositionStyle]}>
          <TouchableOpacity 
            onPress={() => {
              if (userProfile?.profileImage) {
                handleImageZoom(userProfile.profileImage, 'Kulüp Profil Fotoğrafı');
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
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
        <View style={styles.profileHeader}>
          <View style={styles.editableRow}>
            <Text style={styles.name}>
              {clubDataSyncService.getClubDisplayName(userProfile)}
            </Text>
            <IconButton
              icon="pencil"
              size={16}
              style={{ margin: 0 }}
              onPress={() => handleEditField('displayName', userProfile?.displayName || userProfile?.clubName)}
            />
          </View>
          <View style={styles.editableRow}>
            <Text style={styles.username}>
              {(() => {
                // Username için önce userProfile.username'i kontrol et
                if (userProfile?.username) {
                  return `@${userProfile.username}`;
                }
                
                // Kulüp adından username oluştur
                let clubName = userProfile?.clubName || userProfile?.displayName || userProfile?.name;
                if (clubName && !clubName.includes('@')) {
                  const username = clubName
                    .toLowerCase()
                    .replace(/[^\w\s]/g, '') // Özel karakterleri kaldır
                    .replace(/\s+/g, '') // Boşlukları kaldır
                    .substring(0, 15); // Max 15 karakter
                  return `@${username}`;
                }
                
                // Son çare olarak email'den oluştur
                if (userProfile?.email) {
                  return `@${userProfile.email.split('@')[0]}`;
                }
                
                return '@fizikkulubu';
              })()}
            </Text>
            <IconButton
              icon="pencil"
              size={16}
              style={{ margin: 0 }}
              onPress={() => handleEditField('username', userProfile?.username)}
            />
          </View>
        </View>
        
        {/* Bio Section with frame */}
        <View style={styles.infoSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Açıklama</Text>
            <IconButton
              icon="pencil"
              size={16}
              style={{ margin: 0 }}
              onPress={() => handleEditField('description', userProfile?.description || userProfile?.bio)}
            />
          </View>
          
          {userProfile?.description || userProfile?.bio ? (
            <Text style={styles.bioText}>{userProfile.description || userProfile.bio}</Text>
          ) : (
            <TouchableOpacity 
              style={styles.addBioButton}
              onPress={() => handleEditField('description', userProfile?.description || userProfile?.bio)}
            >
              <MaterialCommunityIcons name="pencil" size={16} color="#1E88E5" style={{ marginRight: 6 }} />
              <Text style={styles.addBioText}>Açıklama ekle</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Stats (Events, Followers, Members) */}
        <View style={styles.statsContainer}>
          <TouchableOpacity 
            style={styles.statItem} 
            onPress={handleViewEvents}
          >
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
          
          <TouchableOpacity style={styles.statItem} onPress={handleViewFollowing}>
            <Text style={styles.statNumber}>{formatNumber(memberCount)}</Text>
            <Text style={styles.statLabel}>Üyeler</Text>
            <MaterialCommunityIcons name="account-group" size={14} color="#666" style={styles.statIcon} />
          </TouchableOpacity>
        </View>
        
        {/* Personal Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Kulüp Bilgileri</Text>
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
              <Text style={styles.infoValue}>Kulüp</Text>
            </View>
            {/* Kullanıcı tipi güvenlik nedenleriyle düzenlenemez */}
          </View>
          
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="school" size={24} color={theme.colors.primary} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Üniversite</Text>
              <Text style={styles.infoValue}>
                {getDisplayValue('university', userProfile?.university)}
              </Text>
            </View>
            <IconButton
              icon="pencil"
              size={16}
              style={{ margin: 0 }}
              onPress={() => handleEditField('university', userProfile?.university)}
            />
          </View>
          
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="tag-outline" size={24} color={theme.colors.primary} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Kategoriler</Text>
              {/* Multiple club types display */}
              {userProfile?.clubTypes && Array.isArray(userProfile.clubTypes) && userProfile.clubTypes.length > 0 ? (
                <View style={styles.clubTypeChipsContainer}>
                  {userProfile.clubTypes.map((typeId: string, index: number) => {
                    const typeName = getClubTypeName(typeId);
                    const clubTypeInfo = clubTypes.find(ct => ct.id === typeId);
                    return (
                      <Chip 
                        key={`${typeId}-${index}`} 
                        icon={() => <MaterialCommunityIcons name={(clubTypeInfo?.icon || 'shape') as any} size={16} color="#FFF" />}
                        style={styles.clubTypeChip}
                        textStyle={{ color: '#FFF' }}
                      >
                        {typeName}
                      </Chip>
                    );
                  })}
                </View>
              ) : (
                // Fallback to single clubType if clubTypes array is not available
                <Text style={styles.infoValue}>
                  {userProfile?.clubType 
                    ? (typeof userProfile.clubType === 'string' 
                      ? getClubTypeName(userProfile.clubType)
                      : typeof userProfile.clubType === 'object' && userProfile.clubType !== null
                        ? userProfile.clubType.name || JSON.stringify(userProfile.clubType)
                        : String(userProfile.clubType))
                    : userProfile?.clubTypeId
                      ? getClubTypeName(userProfile.clubTypeId)
                      : 'Belirtilmemiş'}
                </Text>
              )}
            </View>
            <IconButton
              icon="pencil"
              size={16}
              style={{ margin: 0 }}
              onPress={() => handleEditField('categories', userProfile?.clubTypes || userProfile?.clubType)}
            />
          </View>
          
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="calendar" size={24} color={theme.colors.primary} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Katılma Tarihi</Text>
              <Text style={styles.infoValue}>{
                (() => {
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
                    else if (!userProfile?.createdAt && !userProfile?.createdDate) {
                      return new Date().toLocaleDateString('tr-TR') + ' (Yaklaşık)';
                    }
                    // Handle serverTimestamp that hasn't been converted yet
                    else if (userProfile?.createdAt && 
                            typeof userProfile.createdAt === 'object' && 
                            userProfile.createdAt.constructor && 
                            userProfile.createdAt.constructor.name === 'Object') {
                      console.log('Converting createdAt to date:', userProfile.createdAt);
                      // If it's an object but not a timestamp or date, use current date
                      return new Date().toLocaleDateString('tr-TR') + ' (Düzeltildi)';
                    }
                    // Diğer formatlarda tarih
                    else if (userProfile?.createdAt) {
                      return String(userProfile.createdAt);
                    }
                    return 'Belirtilmemiş';
                  } catch (e) {
                    console.error('Tarih formatı hatası:', e);
                    return 'Belirtilmemiş';
                  }
                })()
              }</Text>
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
          <Dialog.Title style={[styles.dialogTitle, {color: '#D32F2F'}]}>⚠️ Kulüp Hesabını Kalıcı Olarak Sil</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogContent}>
              Bu işlem GERİ ALINAMAZ! Kulüp hesabınızı sildiğinizde:
              {'\n\n'}• Tüm kulüp profil bilgileri silinecek
              {'\n'}• Tüm etkinlikleriniz silinecek
              {'\n'}• Tüm kulüp üyeleri çıkarılacak
              {'\n'}• Tüm kulüp puanları ve istatistikleri silinecek
              {'\n'}• Tüm kulüp fotoğrafları silinecek
              {'\n'}• Tüm kulüp bildirimleri silinecek
              {'\n'}• Kulüp takipçileri silinecek
              {'\n\n'}Bu işlemden sonra aynı kulüp hesabıyla tekrar giriş yapamazsınız.
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
        
        {/* Profile Edit Modal */}
        <ProfileEditModal
          visible={editModalVisible}
          onDismiss={() => setEditModalVisible(false)}
          onUpdate={handleEditModalUpdate}
          field={editField as any}
          currentValue={editValue}
          label={getFieldLabel(editField)}
        />
      </Portal>
      
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
    backgroundColor: '#1E88E5', // Match the default cover background color
  },
  content: {
    paddingBottom: 32,
  },
  // Etkinlikler için stiller
  eventsContainer: {
    marginTop: 8,
  },
  eventCard: {
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#1E88E5',
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventDateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
    height: 50,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    padding: 4,
    marginRight: 12,
  },
  eventDay: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E88E5',
  },
  eventMonth: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
    color: '#333',
  },
  eventDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  eventDetailText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
  eventsLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  eventsLoadingText: {
    marginTop: 8,
    color: '#999',
    fontSize: 15,
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
    justifyContent: 'center',
    flexDirection: 'row',
  },
  addBioText: {
    color: '#1E88E5',
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: 'white',
    marginHorizontal: 16,
    borderRadius: 12,
    elevation: 2,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statIcon: {
    position: 'absolute',
    top: -8,
    right: -10,
  },
  verticalDivider: {
    height: 30,
    width: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 10,
    alignSelf: 'center',
  },
  infoSection: {
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  sectionLink: {
    fontSize: 14,
    color: '#1E88E5',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  infoTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '400',
  },
  clubTypeChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    marginLeft: -2,
  },
  clubTypeChip: {
    margin: 2,
    backgroundColor: '#1E88E5',
  },
  dialogTitle: {
    textAlign: 'center',
    fontWeight: 'bold',
  },
  dialogContent: {
    textAlign: 'center',
  },
  logoutDialog: {
    borderRadius: 16,
    padding: 8,
  },
  deleteAccountDialog: {
    borderRadius: 16,
    padding: 8,
  },
  dialogActions: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  cancelButton: {
    borderColor: '#DDD',
    flex: 1,
    marginRight: 8,
  },
  confirmButton: {
    flex: 1,
    marginLeft: 8,
  },
  noEventsContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  noEventsText: {
    fontSize: 16,
    color: '#999',
    marginTop: 8,
  },
  createEventButton: {
    marginTop: 16,
    backgroundColor: '#1E88E5',
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  createEventButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    marginTop: 50, // To account for avatar overlap
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  // Enhanced Statistics Section Styles
  enhancedStatsSection: {
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
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#28a745',
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
  progressText: {
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
  editableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  rankingGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    marginTop: 15,
  },
  rankingCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    minWidth: 90,
    marginHorizontal: 5,
  },
  rankingTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginTop: 5,
  },
  rankingValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 2,
  },
  rankingLabel: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  // We are using the styles from the imported UpcomingEventsList component
});

export default ClubProfileScreen;
