import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Image, ScrollView, ActivityIndicator, Share } from 'react-native';
import { Text, useTheme, Button, Avatar, Card, Chip, Divider, Searchbar } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { firebase } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import StudentEventCard from '../../components/StudentEventCard';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StudentStackParamList } from '../../navigation/StudentNavigator';
import { followClub, unfollowClub } from '../../firebase/firestore';
import ClubFollowSyncService from '../../services/clubFollowSyncService';
import { unlikeEvent, leaveEvent } from '../../firebase/eventManagement';
import { useNotificationCount } from '../../hooks/useNotificationCount';
import { UniversalAvatar, EnhancedSearchResultCard, EnhancedButton, EnhancedCard } from '../../components/common';
import PerformanceOptimizer from '../../utils/performanceOptimizer';
import PushNotificationService from '../../services/pushNotificationService';
import { useResponsiveDesign } from '../../utils/responsiveDesignUtils';
import AccessibilityUtils from '../../utils/accessibilityUtils';

interface User {
  id: string;
  displayName?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  profileImage?: string;
  avatarIcon?: string;
  avatarColor?: string;
  university?: string;
  department?: string;
  userType?: string;
}

interface Club {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  university?: string;
  profileImage?: string;
  photoURL?: string;
  avatarIcon?: string;
  avatarColor?: string;
  followerCount?: number;
  memberCount?: number;
  eventCount?: number;
  isFollowing?: boolean;
}

interface Event {
  id: string;
  title?: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  location?: {
    type?: string;
    physicalAddress?: string;
    onlineLink?: string;
  };
  imageUrl?: string | null;
  categories?: string[];
  clubId?: string;
  clubName?: string;
  organizer?: {
    id: string;
    name: string;
    logo?: string;
    profileImage?: string;
    displayName?: string;
    university?: string;
    avatarIcon?: string;
    avatarColor?: string;
  };
  attendeesCount?: number;
  viewCount?: number;
  // Additional fields for compatibility
  capacity?: number;
  attendees?: string[];
  isFree?: boolean;
  price?: number;
  pricing?: {
    isFree?: boolean;
    price?: number;
  };
  likeCount?: number;
  shareCount?: number;
  likes?: string[];
  university?: string;
  createdBy?: string;
  createdAt?: any;
  updatedAt?: any;
  // University restrictions
  universityRestrictions?: {
    isOpenToAllUniversities?: boolean;
    restrictedUniversities?: string[];
  };
}

const HomeScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<StudentStackParamList>>();
  const { currentUser } = useAuth();
  const { fontSizes, spacing, shadows, borderRadius, isTablet, isSmallDevice } = useResponsiveDesign();
  
  const [followedClubs, setFollowedClubs] = useState<Club[]>([]);
  const [followedClubEvents, setFollowedClubEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  
  // Loading states for different sections
  const [followedEventsLoading, setFollowedEventsLoading] = useState(false);
  const [joinedEventsLoading, setJoinedEventsLoading] = useState(false);
  
  // New states for user search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  // Filter states
  const [activeFilter, setActiveFilter] = useState<'followed' | 'joined'>('followed');
  const [joinedEvents, setJoinedEvents] = useState<Event[]>([]);
  const [memberClubs, setMemberClubs] = useState<Club[]>([]);
  
  // Event interaction states
  const [userJoinedEvents, setUserJoinedEvents] = useState<string[]>([]);
  const [userLikedEvents, setUserLikedEvents] = useState<string[]>([]);
  
  // Sort states
  const [sortOption, setSortOption] = useState<'newest' | 'oldest' | 'upcoming' | 'popular'>('newest');
  
  // Bildirim sayısını al
  const { unreadCount: unreadNotificationCount, refreshCount: refreshNotificationCount } = useNotificationCount();
  
  // Kullanıcının katıldığı etkinlikleri yükle
  const fetchUserJoinedEvents = useCallback(async () => {
    if (!currentUser?.uid) return;
    
    try {
      const db = firebase.firestore();
      const userDoc = await db.collection('users').doc(currentUser.uid).get();
      const userData = userDoc.data();
      
      if (userData?.joinedEvents) {
        setUserJoinedEvents(userData.joinedEvents);
      }
      
      if (userData?.likedEvents) {
        setUserLikedEvents(userData.likedEvents);
      }
    } catch (error) {
      console.error('Error fetching user joined events:', error);
    }
  }, [currentUser]);
  
  // Takip edilen kulüpleri getir
  const fetchFollowedClubs = useCallback(async () => {
    if (!currentUser?.uid) {
      console.log('❌ fetchFollowedClubs: No current user');
      return;
    }
    
    try {
      setLoading(true);
      const db = firebase.firestore();
      
      // Kullanıcının takip ettiği kulüplerin ID'lerini al
      const userRef = db.collection('users').doc(currentUser.uid);
      const userDoc = await userRef.get();
      const userData = userDoc.data();
      
      console.log('👤 User data for followed clubs:', {
        exists: userDoc.exists,
        followedClubs: userData?.followedClubs,
        isArray: Array.isArray(userData?.followedClubs)
      });
      
      if (!userData || !userData.followedClubs || !Array.isArray(userData.followedClubs)) {
        console.log('❌ No followed clubs found in user data');
        setFollowedClubs([]);
        return [];
      }
      
      const followedClubIds = userData.followedClubs;
      console.log('📋 Followed club IDs:', followedClubIds);
      
      if (followedClubIds.length === 0) {
        console.log('❌ Empty followed clubs array');
        setFollowedClubs([]);
        return [];
      }
      
      // Takip edilen kulüplerin detaylarını getir
      const clubsData: Club[] = [];
      
      // Kulüp verilerini paralel olarak getir
      await Promise.all(followedClubIds.map(async (clubId: string) => {
        try {
          // Önce users koleksiyonunda ara (kulüpler de users koleksiyonunda olabilir)
          const clubDoc = await db.collection('users').doc(clubId).get();
          
          // 🎯 GERÇEK ZAMANLI İSTATİSTİKLER - clubStats koleksiyonundan al
          let realEventCount = 0;
          let realMemberCount = 0;
          try {
            const statsDoc = await db.collection('clubStats').doc(clubId).get();
            if (statsDoc.exists) {
              const statsData = statsDoc.data();
              realEventCount = statsData?.totalEvents || 0;
              realMemberCount = statsData?.totalMembers || 0;
              console.log(`📊 Kulüp ${clubId} gerçek etkinlik sayısı: ${realEventCount}, üye sayısı: ${realMemberCount}`);
            } else {
              // Eğer istatistik yoksa events koleksiyonundan say
              const eventsQuery = await db.collection('events').where('clubId', '==', clubId).get();
              realEventCount = eventsQuery.size;
              
              // Üye sayısını clubMembers koleksiyonundan say
              const membersQuery = await db.collection('clubMembers').where('clubId', '==', clubId).get();
              realMemberCount = membersQuery.size;
              console.log(`📊 Kulüp ${clubId} manuel sayım etkinlik sayısı: ${realEventCount}, üye sayısı: ${realMemberCount}`);
            }
          } catch (error) {
            console.error('İstatistik alınırken hata:', error);
            realEventCount = 0;
            realMemberCount = 0;
          }
          
          if (clubDoc.exists) {
            const club = clubDoc.data();
            console.log('🔴 KULÜP VERİSİ - TAM DATA:', {
              clubId,
              fullClubObject: club,
              avatarIcon: club?.avatarIcon,
              avatarColor: club?.avatarColor,
              profileImage: club?.profileImage
            });
            
            clubsData.push({
              id: clubId,
              name: club?.name || club?.displayName || 'İsimsiz Kulüp',
              displayName: club?.displayName,
              description: club?.description || club?.bio,
              university: club?.university,
              profileImage: club?.profileImage || club?.photoURL,
              photoURL: club?.photoURL,
              avatarIcon: club?.avatarIcon,
              avatarColor: club?.avatarColor,
              followerCount: club?.followerCount || 0,
              memberCount: realMemberCount, // 🎯 GERÇEK ZAMANLI ÜYE SAYISI
              eventCount: realEventCount, // 🎯 GERÇEK ZAMANLI SAYI
              isFollowing: true // Takip edilen kulüpler listesinde olduğu için true
            });
          } else {
            // Eğer users koleksiyonunda bulunamazsa clubs koleksiyonunda ara
            const clubAltDoc = await db.collection('clubs').doc(clubId).get();
            if (clubAltDoc.exists) {
              const club = clubAltDoc.data();
              console.log('🎯 ALTERNATİF KULÜP VERİSİ:', {
                clubId,
                name: club?.name,
                displayName: club?.displayName,
                profileImage: club?.profileImage,
                photoURL: club?.photoURL,
                avatarIcon: club?.avatarIcon,
                avatarColor: club?.avatarColor
              });
              
              clubsData.push({
                id: clubId,
                name: club?.name || club?.displayName || 'İsimsiz Kulüp',
                displayName: club?.displayName,
                description: club?.description || club?.bio,
                university: club?.university,
                profileImage: club?.profileImage || club?.photoURL,
                photoURL: club?.photoURL,
                avatarIcon: club?.avatarIcon,
                avatarColor: club?.avatarColor,
                followerCount: club?.followerCount || 0,
                memberCount: realMemberCount, // 🎯 GERÇEK ZAMANLI ÜYE SAYISI
                eventCount: realEventCount, // 🎯 GERÇEK ZAMANLI SAYI
                isFollowing: true
              });
            }
          }
        } catch (error) {
          console.error('Error fetching club details:', error);
        }
      }));
      
      setFollowedClubs(clubsData);
      return clubsData;
    } catch (error) {
      console.error('Error fetching followed clubs:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [currentUser]);
  
  // Takip edilen kulüplerin etkinliklerini getir
  const fetchFollowedClubEvents = useCallback(async () => {
    if (!currentUser?.uid) return;
    
    try {
      setFollowedEventsLoading(true);
      const clubsData = await fetchFollowedClubs();
      
      if (!clubsData || clubsData.length === 0) {
        console.log('No followed clubs found');
        setFollowedClubEvents([]);
        return;
      }
      
      const clubIds = clubsData.map(club => club.id);
      console.log('Fetching events for followed clubs:', clubIds);
      const db = firebase.firestore();
      
      // Firebase index problemi olabilir, daha basit sorgu yapalım
      const eventsData: Event[] = [];
      
      // Her kulüp için ayrı ayrı sorgu yap
      for (const clubId of clubIds) {
        try {
          console.log('Fetching events for club:', clubId);
          
          const eventsQuery = await db.collection('events')
            .where('clubId', '==', clubId)
            .orderBy('startDate', 'desc')
            .limit(10)
            .get();
          
          console.log(`Found ${eventsQuery.size} events for club ${clubId}`);
          
          if (!eventsQuery.empty) {
            eventsQuery.forEach(doc => {
              const eventData = doc.data();
              const club = clubsData.find(c => c.id === eventData.clubId);
              
              // Fix for Firebase Timestamp
              let startDate, endDate;
              try {
                if (eventData.startDate && eventData.startDate.toDate) {
                  startDate = eventData.startDate.toDate();
                } else if (eventData.startDate) {
                  startDate = new Date(eventData.startDate);
                } else {
                  startDate = new Date();
                }
                
                if (eventData.endDate && eventData.endDate.toDate) {
                  endDate = eventData.endDate.toDate();
                } else if (eventData.endDate) {
                  endDate = new Date(eventData.endDate);
                } else {
                  endDate = new Date();
                }
                
                // Validate dates
                if (isNaN(startDate.getTime())) {
                  startDate = new Date();
                }
                if (isNaN(endDate.getTime())) {
                  endDate = new Date();
                }
              } catch (error) {
                console.error('Date parsing error:', error);
                startDate = new Date();
                endDate = new Date();
              }
              
              const organizerData = {
                id: eventData.clubId || clubId,
                name: eventData.clubName || club?.displayName || club?.name || 'Bilinmeyen Kulüp',
                profileImage: club?.profileImage || club?.photoURL,
                displayName: club?.displayName || club?.name,
                logo: club?.profileImage || club?.photoURL,
                university: club?.university,
                avatarIcon: club?.avatarIcon, // Use actual database value
                avatarColor: club?.avatarColor // Use actual database value
              };
              
              console.log('🔴 EVENT ORGANIZER:', {
                eventId: doc.id,
                eventTitle: eventData.title,
                organizerData
              });
              
              eventsData.push({
                id: doc.id,
                title: eventData.title || 'Başlıksız Etkinlik',
                description: eventData.description || '',
                startDate,
                endDate,
                location: eventData.location || {},
                imageUrl: eventData.imageUrl || null,
                categories: eventData.categories || [],
                clubId: eventData.clubId || clubId,
                clubName: eventData.clubName || club?.displayName || club?.name || 'Bilinmeyen Kulüp',
                organizer: organizerData,
                attendeesCount: eventData.attendeesCount || 0,
                viewCount: eventData.viewCount || 0,
                // Pricing information
                isFree: eventData.isFree,
                price: eventData.price,
                pricing: eventData.pricing,
                // University and access info
                university: eventData.university || club?.university,
                universityRestrictions: eventData.universityRestrictions || {
                  isOpenToAllUniversities: eventData.universityRestrictions?.isOpenToAllUniversities !== false,
                  restrictedUniversities: eventData.restrictedUniversities || []
                },
                // Additional fields from EventsScreen
                capacity: eventData.capacity,
                attendees: eventData.attendees || [],
                likeCount: eventData.likeCount || 0,
                shareCount: eventData.shareCount || 0,
                likes: eventData.likes || [],
                createdBy: eventData.createdBy,
                createdAt: eventData.createdAt,
                updatedAt: eventData.updatedAt
              });
            });
          }
        } catch (error) {
          console.error('Error fetching events for club:', clubId, error);
        }
      }
      
      // Tarih sıralaması uygula
      eventsData.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
      
      console.log('Total followed club events found:', eventsData.length);
      setFollowedClubEvents(eventsData);
    } catch (error) {
      console.error('Error fetching followed club events:', error);
      setFollowedClubEvents([]);
    } finally {
      setFollowedEventsLoading(false);
      setRefreshing(false);
    }
  }, [fetchFollowedClubs, currentUser]);
  
  // Önerilen kulüpleri getir
  // Removing the fetchSuggestedClubs function since we don't need it anymore

  const handleFollowClub = async (clubId: string, isFollowing: boolean) => {
    if (!currentUser?.uid) return;
    
    try {
      // Get club name for the synchronized service
      let clubName = 'Bilinmeyen Kulüp';
      try {
        const clubData = followedClubs?.find(club => club.id === clubId);
        clubName = clubData?.name || clubData?.displayName || 'Bilinmeyen Kulüp';
      } catch (error) {
        console.warn('Could not get club name:', error);
      }
      
      // Use synchronized service for follow/unfollow
      const result = await ClubFollowSyncService.toggleFollow(
        currentUser.uid,
        clubId,
        clubName,
        isFollowing,
        'student'
      );
      
      if (result.success) {
        if (result.newState.isFollowing) {
          // Kulüp detaylarını getir ve takip edilen kulüpler listesine ekle
          const db = firebase.firestore();
          const clubDoc = await db.collection('users').doc(clubId).get();
          
          // 🎯 GERÇEK ZAMANLI İSTATİSTİKLER - clubStats koleksiyonundan al
          let realEventCount = 0;
          try {
            const statsDoc = await db.collection('clubStats').doc(clubId).get();
            if (statsDoc.exists) {
              const statsData = statsDoc.data();
              realEventCount = statsData?.totalEvents || 0;
            } else {
              // Eğer istatistik yoksa events koleksiyonundan say
              const eventsQuery = await db.collection('events').where('clubId', '==', clubId).get();
              realEventCount = eventsQuery.size;
            }
          } catch (error) {
            console.error('İstatistik alınırken hata:', error);
            realEventCount = 0;
          }
          
          if (clubDoc.exists) {
            const clubData = clubDoc.data();
            const newClub: Club = {
              id: clubId,
              name: clubData?.name || clubData?.displayName || 'İsimsiz Kulüp',
              displayName: clubData?.displayName,
              description: clubData?.description || clubData?.bio,
              university: clubData?.university,
              profileImage: clubData?.profileImage || clubData?.photoURL,
              followerCount: result.newState.followerCount,
              eventCount: realEventCount,
              isFollowing: true
            };
            
            setFollowedClubs(prev => [...prev, newClub]);
          }
        } else {
          // Yerel durumu güncelle - sadece takip edilen kulüplerden çıkar
          setFollowedClubs(prev => (prev || []).filter(club => club.id !== clubId));
        }
        
        // Takip edilen kulüplerin etkinliklerini yeniden yükle
        fetchFollowedClubEvents();
        
        console.log('✅ Club follow state synchronized across all screens');
      } else {
        console.error('❌ Club follow operation failed:', result.error);
      }
    } catch (error) {
      console.error('Error in club follow operation:', error);
    }
  };
  
  const onRefresh = async () => {
    console.log('🔄 Refreshing data...');
    setRefreshing(true);
    
    try {
      await Promise.all([
        fetchFollowedClubEvents(),
        fetchJoinedEvents(),
        fetchMemberClubs(),
        fetchUserJoinedEvents(),
        fetchAllUsers() // Kullanıcı listesini de yenile
      ]);
      console.log('✅ Refresh completed');
    } catch (error) {
      console.error('❌ Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };
  
  const handleViewClub = (clubId: string) => {
    navigation.navigate('ViewClub', { clubId });
  };
  
  const handleViewEvent = (eventId: string) => {
    navigation.navigate('ViewEvent', { eventId });
  };

  // Event interaction functions
  const handleJoinEvent = async (eventId: string) => {
    if (!currentUser?.uid) return;
    
    try {
      const db = firebase.firestore();
      const eventRef = db.collection('events').doc(eventId);
      const userRef = db.collection('users').doc(currentUser.uid);
      
      // Get event data for club ID
      const eventDoc = await eventRef.get();
      const eventData = eventDoc.data();
      const clubId = eventData?.clubId;
      
      // Add user to event attendees
      await eventRef.update({
        attendees: firebase.firestore.FieldValue.arrayUnion(currentUser.uid),
        attendeesCount: firebase.firestore.FieldValue.increment(1)
      });
      
      // Add event to user's joined events
      await userRef.update({
        joinedEvents: firebase.firestore.FieldValue.arrayUnion(eventId)
      });
      
      // Event join statistics are tracked directly in Firebase collections
      console.log('✅ Event join statistics recorded');
      
      // Update local state
      setUserJoinedEvents(prev => [...prev, eventId]);
      
      console.log('✅ Joined event:', eventId);
    } catch (error) {
      console.error('❌ Error joining event:', error);
    }
  };

  const handleUnjoinEvent = async (eventId: string) => {
    if (!currentUser?.uid) return;
    
    try {
      const db = firebase.firestore();
      const eventRef = db.collection('events').doc(eventId);
      const userRef = db.collection('users').doc(currentUser.uid);
      
      // Remove user from event attendees
      await eventRef.update({
        attendees: firebase.firestore.FieldValue.arrayRemove(currentUser.uid),
        attendeesCount: firebase.firestore.FieldValue.increment(-1)
      });
      
      // Remove event from user's joined events
      await userRef.update({
        joinedEvents: firebase.firestore.FieldValue.arrayRemove(eventId)
      });
      
      // 🎯 Puanlama sistemi: Etkinlikten ayrılma (negatif puan)
      try {
        await leaveEvent(currentUser.uid, eventId);
      } catch (scoringError) {
        console.warn('Leave event scoring failed:', scoringError);
      }
      
      // Update local state
      setUserJoinedEvents(prev => (prev || []).filter(id => id !== eventId));
      
      console.log('✅ Left event:', eventId);
    } catch (error) {
      console.error('❌ Error leaving event:', error);
    }
  };

  const handleLikeEvent = async (eventId: string) => {
    if (!currentUser?.uid) return;
    
    try {
      const db = firebase.firestore();
      const eventRef = db.collection('events').doc(eventId);
      const likesRef = eventRef.collection('likes');
      
      // Get event data for club ID
      const eventDoc = await eventRef.get();
      const eventData = eventDoc.data();
      const clubId = eventData?.clubId;
      
      // Check if user has already liked using subcollection (consistent with StudentEventCard)
      const existingLikeQuery = await likesRef
        .where('userId', '==', currentUser.uid)
        .limit(1)
        .get();
      
      const isLiked = !existingLikeQuery.empty;
      console.log(`🏠 HomeScreen handleLikeEvent: isLiked = ${isLiked}, eventId = ${eventId}`);
      
      if (isLiked) {
        // Unlike - consistent with StudentEventCard transaction logic
        console.log(`🏠 HomeScreen: UNLIKE operation for event ${eventId}`);
        // Event unlike statistics are tracked directly in Firebase collections
        // Note: StudentEventCard transaction handles Firestore updates
      } else {
        // Like - consistent with StudentEventCard transaction logic  
        console.log(`🏠 HomeScreen: LIKE operation for event ${eventId}`);
        // Event like statistics are tracked directly in Firebase collections
        // Note: StudentEventCard transaction handles Firestore updates
      }
      
      console.log('✅ Toggled like for event:', eventId);
    } catch (error) {
      console.error('❌ Error toggling like:', error);
    }
  };

  const handleShareEvent = async (eventId: string) => {
    try {
      console.log('📤 Share event:', eventId);
      
      // Etkinlik bilgilerini al
      const db = firebase.firestore();
      const eventRef = db.collection('events').doc(eventId);
      const eventDoc = await eventRef.get();
      
      if (eventDoc.exists) {
        const eventData = eventDoc.data();
        const clubId = eventData?.clubId;
        const shareMessage = `🎉 ${eventData?.title || 'Harika bir etkinlik'}\n\n📅 ${eventData?.date ? new Date(eventData.date.seconds * 1000).toLocaleDateString('tr-TR') : ''}\n📍 ${eventData?.location || ''}\n\n${eventData?.description || ''}\n\nUniverse uygulamasından paylaşıldı.`;
        
        // Use React Native's built-in Share
        await Share.share({
          message: shareMessage,
          title: 'Etkinlik Paylaşımı',
        });
        
        // Event share statistics are tracked directly in Firebase collections
        console.log('✅ Event share statistics recorded');
        
        // Paylaşım sayısını artır
        await eventRef.update({
          shareCount: firebase.firestore.FieldValue.increment(1)
        });
      }
      
    } catch (error: any) {
      if (error?.message !== 'User did not share') {
        console.error('❌ Error sharing event:', error);
      }
    }
  };

  const handleSeeAllFollowedClubEvents = () => {
    navigation.navigate('Events', { filter: 'followed' });
  };

  // User search function
  const fetchAllUsers = useCallback(async () => {
    if (loadingUsers) return;
    
    setLoadingUsers(true);
    try {
      const db = firebase.firestore();
      const usersRef = db.collection('users');
      
      // Tüm öğrenci kullanıcıları getir
      const snapshot = await usersRef
        .where('userType', '==', 'student')
        .limit(100) // Performans için limit koyuyoruz
        .get();
        
      const users: User[] = [];
      
      snapshot.forEach(doc => {
        const userData = doc.data();
        // Mevcut kullanıcıyı hariç tut
        if (doc.id !== currentUser?.uid) {
          users.push({
            id: doc.id,
            displayName: userData.displayName,
            name: userData.name,
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            profileImage: userData.profileImage || userData.photoURL,
            avatarIcon: userData.avatarIcon,
            avatarColor: userData.avatarColor,
            university: userData.university,
            department: userData.department,
            userType: userData.userType
          });
        }
      });
      
      // Alfabetik olarak sırala
      users.sort((a, b) => {
        const aName = (a.displayName || a.name || '').toLowerCase();
        const bName = (b.displayName || b.name || '').toLowerCase();
        return aName.localeCompare(bName);
      });
      
      setAllUsers(users);
      // Kullanıcı listesini sadece hafızada tut, otomatik gösterme
      // Liste sadece kullanıcı arama yaptığında görünecek
    } catch (error) {
      console.error('Error fetching all users:', error);
      setAllUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, [currentUser?.uid, loadingUsers]);

  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim()) {
      // Arama boşsa hiçbir şey gösterme
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    
    setIsSearching(true);
    setShowSearchResults(true);
    
    try {
      const queryLower = query.toLowerCase();
      
      // Önce yerel verilerden ara (daha hızlı)
      let filteredUsers = allUsers.filter(user => {
        const displayName = (user.displayName || '').toLowerCase();
        const name = (user.name || '').toLowerCase();
        const firstName = (user.firstName || '').toLowerCase();
        const lastName = (user.lastName || '').toLowerCase();
        const email = (user.email || '').toLowerCase();
        const fullName = `${firstName} ${lastName}`.toLowerCase();
        const university = (user.university || '').toLowerCase();
        const department = (user.department || '').toLowerCase();
        
        return displayName.includes(queryLower) || 
               name.includes(queryLower) || 
               firstName.includes(queryLower) ||
               lastName.includes(queryLower) ||
               fullName.includes(queryLower) ||
               email.includes(queryLower) ||
               university.includes(queryLower) ||
               department.includes(queryLower);
      });
      
      // Eğer yerel verilerde yeterli sonuç yoksa, veritabanından daha fazla ara
      if (filteredUsers.length < 5 && allUsers.length < 50) {
        const db = firebase.firestore();
        const usersRef = db.collection('users');
        
        // Daha kapsamlı arama yap
        const snapshot = await usersRef
          .where('userType', '==', 'student')
          .limit(200)
          .get();
          
        const newUsers: User[] = [];
        
        snapshot.forEach(doc => {
          const userData = doc.data();
          if (doc.id !== currentUser?.uid) {
            const user = {
              id: doc.id,
              displayName: userData.displayName,
              name: userData.name,
              firstName: userData.firstName,
              lastName: userData.lastName,
              email: userData.email,
              profileImage: userData.profileImage || userData.photoURL,
              avatarIcon: userData.avatarIcon,
              avatarColor: userData.avatarColor,
              university: userData.university,
              department: userData.department,
              userType: userData.userType
            };
            
            // Arama kriterlerine uyan kullanıcıları ekle
            const displayName = (user.displayName || '').toLowerCase();
            const name = (user.name || '').toLowerCase();
            const firstName = (user.firstName || '').toLowerCase();
            const lastName = (user.lastName || '').toLowerCase();
            const email = (user.email || '').toLowerCase();
            const fullName = `${firstName} ${lastName}`.toLowerCase();
            
            if (displayName.includes(queryLower) || 
                name.includes(queryLower) || 
                firstName.includes(queryLower) ||
                lastName.includes(queryLower) ||
                fullName.includes(queryLower) ||
                email.includes(queryLower)) {
              newUsers.push(user);
            }
          }
        });
        
        // Duplikatları kaldır ve birleştir
        const userMap = new Map();
        [...allUsers, ...newUsers].forEach(user => {
          userMap.set(user.id, user);
        });
        
        const updatedAllUsers = Array.from(userMap.values());
        setAllUsers(updatedAllUsers);
        
        // Güncellenmiş listeden tekrar filtrele
        filteredUsers = updatedAllUsers.filter(user => {
          const displayName = (user.displayName || '').toLowerCase();
          const name = (user.name || '').toLowerCase();
          const firstName = (user.firstName || '').toLowerCase();
          const lastName = (user.lastName || '').toLowerCase();
          const email = (user.email || '').toLowerCase();
          const fullName = `${firstName} ${lastName}`.toLowerCase();
          
          return displayName.includes(queryLower) || 
                 name.includes(queryLower) || 
                 firstName.includes(queryLower) ||
                 lastName.includes(queryLower) ||
                 fullName.includes(queryLower) ||
                 email.includes(queryLower);
        });
      }
      
      // Sonuçları relevansa göre sırala
      filteredUsers.sort((a, b) => {
        const aName = (a.displayName || a.name || '').toLowerCase();
        const bName = (b.displayName || b.name || '').toLowerCase();
        
        // Tam eşleşme önce
        if (aName === queryLower && bName !== queryLower) return -1;
        if (bName === queryLower && aName !== queryLower) return 1;
        
        // Başlangıçta eşleşenler
        if (aName.startsWith(queryLower) && !bName.startsWith(queryLower)) return -1;
        if (bName.startsWith(queryLower) && !aName.startsWith(queryLower)) return 1;
        
        // Alfabetik sıralama
        return aName.localeCompare(bName);
      });
      
      setSearchResults(filteredUsers);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [allUsers, currentUser?.uid]);
  
  // Handle search query change
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      // Kullanıcı yazmaya başladığında listeyi göster ve ara
      setShowSearchResults(true);
      searchUsers(query);
    } else {
      // Arama boşsa, listeyi gizle
      setSearchResults([]);
      setShowSearchResults(false);
    }
  };
  
  // Handle search bar focus - show all users when focused
  const handleSearchFocus = () => {
    // SADECE arama query'si varsa sonuçları göster
    // Kullanıcı bara tıkladığında tüm liste görünmemeli
    if (searchQuery.trim()) {
      setShowSearchResults(true);
      searchUsers(searchQuery);
    }
    // Arama boşsa hiçbir şey gösterme - kullanıcı yazmaya başlayınca otomatik gösterilecek
  };
  
  // Handle search bar blur - hide results when not focused
  const handleSearchBlur = () => {
    // Kısa bir delay ekleyelim ki kullanıcı bir sonuca tıklayabilsin
    setTimeout(() => {
      if (!searchQuery.trim()) {
        setShowSearchResults(false);
      }
    }, 200);
  };
  
  // Handle closing search
  const handleCloseSearch = () => {
    setSearchQuery('');
    setShowSearchResults(false);
    setSearchResults([]);
  };
  
  // Navigate to user profile
  const handleViewUserProfile = (userId: string) => {
    console.log('🔍 handleViewUserProfile called with userId:', userId);
    console.log('🔍 Navigation object:', navigation);
    console.log('🔍 Available routes:', navigation.getState()?.routes?.map(r => r.name));
    
    if (!userId) {
      console.error('❌ No userId provided to handleViewUserProfile');
      return;
    }
    
    setSearchQuery('');
    setShowSearchResults(false);
    setSearchResults([]);
    
    try {
      console.log('🚀 Attempting navigation to ViewProfile with userId:', userId);
      // Navigate to ViewProfile screen
      navigation.navigate('ViewProfile', { userId });
      console.log('✅ Navigation call completed successfully');
    } catch (error) {
      console.error('❌ Navigation error:', error);
      console.error('❌ Error details:', {
        name: (error as any)?.name,
        message: (error as any)?.message,
        stack: (error as any)?.stack?.substring(0, 200)
      });
    }
  };

  // Handle user press in search results
  const handleUserPress = (user: User) => {
    console.log('👤 handleUserPress called with user:', {
      id: user.id,
      displayName: user.displayName,
      name: user.name,
      userType: user.userType
    });
    
    if (!user.id) {
      console.error('❌ No user ID available for navigation');
      return;
    }
    
    handleViewUserProfile(user.id);
  };

  // Etkinlik sıralama fonksiyonu
  const sortEvents = (events: Event[], sortType: string): Event[] => {
    if (!events || !Array.isArray(events)) {
      console.warn('sortEvents: events is not an array:', events);
      return [];
    }
    
    const sortedEvents = [...events];
    const now = new Date();
    
    // Filter out events with invalid dates
    const validEvents = sortedEvents.filter(event => {
      if (!event.startDate) {
        console.warn('Event missing startDate:', event.id);
        return false;
      }
      
      // Ensure startDate is a Date object
      if (!(event.startDate instanceof Date)) {
        console.warn('Event startDate is not a Date object:', event.id, typeof event.startDate);
        return false;
      }
      
      return true;
    });
    
    switch (sortType) {
      case 'newest':
        return validEvents.sort((a, b) => {
          try {
            return b.startDate.getTime() - a.startDate.getTime();
          } catch (error) {
            console.error('Error sorting by newest:', error, { a: a.id, b: b.id });
            return 0;
          }
        });
      case 'oldest':
        return validEvents.sort((a, b) => {
          try {
            return a.startDate.getTime() - b.startDate.getTime();
          } catch (error) {
            console.error('Error sorting by oldest:', error, { a: a.id, b: b.id });
            return 0;
          }
        });
      case 'upcoming': {
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const upcoming = validEvents.filter(event => {
          try {
            if (!(event.startDate instanceof Date)) return false;
            const t = event.startDate.getTime();
            return t > now.getTime() && t <= weekFromNow.getTime();
          } catch (error) {
            console.error('Error filtering upcoming events:', error, event.id);
            return false;
          }
        });
        return upcoming.sort((a, b) => {
          try {
            const aTime = a.startDate.getTime();
            const bTime = b.startDate.getTime();
            return aTime - bTime;
          } catch (error) {
            console.error('Error sorting upcoming events:', error, { a: a.id, b: b.id });
            return 0;
          }
        });
      }
      case 'popular':
        return validEvents.sort((a, b) => (b.attendeesCount || 0) - (a.attendeesCount || 0));
      default:
        return validEvents;
    }
  };

  // Etkinlikleri sıralı şekilde al - memoized to prevent repeated calculations
  const getSortedEvents = useCallback((events: Event[]): Event[] => {
    try {
      if (!events || !Array.isArray(events)) {
        console.warn('getSortedEvents: events is not an array:', events);
        return [];
      }
      
      console.log(`getSortedEvents: Processing ${events.length} events with sort option: ${sortOption}`);
      return sortEvents(events, sortOption);
    } catch (error) {
      console.error('Error in getSortedEvents:', error);
      return [];
    }
  }, [sortOption]);

  // Memoize sorted events to prevent repeated calculations
  const sortedFollowedEvents = useMemo(() => {
    return getSortedEvents(followedClubEvents || []);
  }, [followedClubEvents, getSortedEvents]);

  const sortedJoinedEvents = useMemo(() => {
    return getSortedEvents(joinedEvents || []);
  }, [joinedEvents, getSortedEvents]);

  // Üye olunan kulüplerin etkinliklerini getir
  const fetchJoinedEvents = useCallback(async () => {
    if (!currentUser?.uid) return;
    
    try {
      setJoinedEventsLoading(true);
      const db = firebase.firestore();
      
      // Kullanıcının üye olduğu kulüplerin ID'lerini al
      const membershipQuery = await db.collection('clubMembers')
        .where('userId', '==', currentUser.uid)
        .where('status', '==', 'approved')
        .get();
      
      if (membershipQuery.empty) {
        console.log('No club memberships found');
        setJoinedEvents([]);
        return;
      }
      
      const clubIds = membershipQuery.docs.map(doc => doc.data().clubId);
      console.log('Member club IDs:', clubIds);
      
      // Üye olunan kulüplerin etkinliklerini getir
      const eventsData: Event[] = [];
      
      for (const clubId of clubIds) {
        try {
          console.log('Fetching events for member club:', clubId);
          
          // Her kulüp için etkinlikleri getir
          const eventsQuery = await db.collection('events')
            .where('clubId', '==', clubId)
            .orderBy('startDate', 'desc')
            .limit(10)
            .get();
          
          console.log(`Found ${eventsQuery.size} events for member club ${clubId}`);
          
          // Kulüp bilgilerini al
          let clubInfo: {
            id: string;
            name: string;
            profileImage?: string;
            displayName?: string;
            university?: string;
          } | null = null;
          try {
            const clubDoc = await db.collection('users').doc(clubId).get();
            if (clubDoc.exists) {
              const clubData = clubDoc.data();
              clubInfo = {
                id: clubId,
                name: clubData?.displayName || clubData?.name || 'Bilinmeyen Kulüp',
                profileImage: clubData?.profileImage || clubData?.photoURL,
                displayName: clubData?.displayName,
                university: clubData?.university
              };
            }
          } catch (clubError) {
            console.error('Error fetching club info:', clubError);
          }
          
          if (!eventsQuery.empty) {
            eventsQuery.forEach(eventDoc => {
              const eventData = eventDoc.data();
              
              // Fix for Firebase Timestamp
              let startDate, endDate;
              try {
                if (eventData.startDate && eventData.startDate.toDate) {
                  startDate = eventData.startDate.toDate();
                } else if (eventData.startDate) {
                  startDate = new Date(eventData.startDate);
                } else {
                  startDate = new Date();
                }
                
                if (eventData.endDate && eventData.endDate.toDate) {
                  endDate = eventData.endDate.toDate();
                } else if (eventData.endDate) {
                  endDate = new Date(eventData.endDate);
                } else {
                  endDate = new Date();
                }
                
                // Validate dates
                if (isNaN(startDate.getTime())) {
                  startDate = new Date();
                }
                if (isNaN(endDate.getTime())) {
                  endDate = new Date();
                }
              } catch (error) {
                console.error('Date parsing error:', error);
                startDate = new Date();
                endDate = new Date();
              }
              
              eventsData.push({
                id: eventDoc.id,
                title: eventData?.title || 'Başlıksız Etkinlik',
                description: eventData?.description || '',
                startDate: startDate,
                endDate: endDate,
                location: eventData?.location || {},
                imageUrl: eventData?.imageUrl || null,
                categories: eventData?.categories || [],
                clubId: eventData?.clubId || clubId,
                clubName: eventData?.clubName || clubInfo?.name || 'Bilinmeyen Kulüp',
                organizer: clubInfo ? {
                  ...clubInfo,
                  logo: clubInfo.profileImage
                } : {
                  id: eventData?.clubId || clubId,
                  name: eventData?.clubName || 'Bilinmeyen Kulüp',
                  profileImage: eventData?.organizer?.profileImage,
                  displayName: eventData?.organizer?.displayName || eventData?.clubName,
                  logo: eventData?.organizer?.profileImage
                },
                attendeesCount: eventData?.attendeesCount || 0,
                viewCount: eventData?.viewCount || 0,
                // Pricing information
                isFree: eventData?.isFree,
                price: eventData?.price,
                pricing: eventData?.pricing,
                // University and access info
                university: eventData?.university || clubInfo?.university,
                universityRestrictions: eventData?.universityRestrictions || {
                  isOpenToAllUniversities: eventData?.universityRestrictions?.isOpenToAllUniversities !== false,
                  restrictedUniversities: eventData?.restrictedUniversities || []
                },
                // Additional fields from EventsScreen
                capacity: eventData?.capacity,
                attendees: eventData?.attendees || [],
                likeCount: eventData?.likeCount || 0,
                shareCount: eventData?.shareCount || 0,
                likes: eventData?.likes || [],
                createdBy: eventData?.createdBy,
                createdAt: eventData?.createdAt,
                updatedAt: eventData?.updatedAt
              });
            });
          }
        } catch (error) {
          console.error('Error fetching events for member club:', clubId, error);
        }
      }
      
      // Tarihe göre sırala (yeniden eskiye)
      eventsData.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
      
      console.log('Total member club events found:', eventsData.length);
      setJoinedEvents(eventsData);
    } catch (error: any) {
      console.error('Error fetching member club events:', error);
      // Firebase izin hatası durumunda sessizce geç
      if (error?.code === 'permission-denied') {
        console.log('Kulüp etkinliklerine erişim izni yok, boş liste gösteriliyor');
      }
      setJoinedEvents([]);
    } finally {
      setJoinedEventsLoading(false);
    }
  }, [currentUser]);

  // Üye olunan kulüpleri getir
  const fetchMemberClubs = useCallback(async () => {
    if (!currentUser?.uid) return;
    
    try {
      const db = firebase.firestore();
      
      // Kullanıcının üye olduğu kulüplerin ID'lerini al
      const membershipQuery = await db.collection('clubMembers')
        .where('userId', '==', currentUser.uid)
        .where('status', '==', 'approved')
        .get();
      
      if (membershipQuery.empty) {
        setMemberClubs([]);
        return [];
      }
      
      const clubIds = membershipQuery.docs.map(doc => doc.data().clubId);
      
      // Kulüp detaylarını getir
      const clubsData: Club[] = [];
      
      await Promise.all(clubIds.map(async (clubId: string) => {
        try {
          const clubDoc = await db.collection('users').doc(clubId).get();
          
          // 🎯 GERÇEK ZAMANLI İSTATİSTİKLER - clubStats koleksiyonundan al
          let realEventCount = 0;
          let realMemberCount = 0;
          try {
            const statsDoc = await db.collection('clubStats').doc(clubId).get();
            if (statsDoc.exists) {
              const statsData = statsDoc.data();
              realEventCount = statsData?.totalEvents || 0;
              realMemberCount = statsData?.totalMembers || 0;
            } else {
              // Eğer istatistik yoksa events koleksiyonundan say
              const eventsQuery = await db.collection('events').where('clubId', '==', clubId).get();
              realEventCount = eventsQuery.size;
              
              // Üye sayısını clubMembers koleksiyonundan say
              const membersQuery = await db.collection('clubMembers').where('clubId', '==', clubId).get();
              realMemberCount = membersQuery.size;
            }
          } catch (error) {
            console.error('İstatistik alınırken hata:', error);
            realEventCount = 0;
            realMemberCount = 0;
          }
          
          if (clubDoc.exists) {
            const club = clubDoc.data();
            clubsData.push({
              id: clubId,
              name: club?.name || club?.displayName || 'İsimsiz Kulüp',
              displayName: club?.displayName,
              description: club?.description || club?.bio,
              university: club?.university,
              profileImage: club?.profileImage || club?.photoURL,
              followerCount: club?.followerCount || 0,
              memberCount: realMemberCount, // 🎯 GERÇEK ZAMANLI ÜYE SAYISI
              eventCount: realEventCount, // 🎯 GERÇEK ZAMANLI SAYI
              isFollowing: false // Üye olduğu kulüpler için takip durumu önemli değil
            });
          }
        } catch (error) {
          console.error('Error fetching member club details:', error);
          // Hata durumunda minimal bilgiyle kulüp ekle
          clubsData.push({
            id: clubId,
            name: 'Kulüp Bilgisi Yüklenemiyor',
            displayName: 'Kulüp Bilgisi Yüklenemiyor',
            description: '',
            university: '',
            profileImage: '',
            followerCount: 0,
            eventCount: 0,
            isFollowing: false
          });
        }
      }));
      
      setMemberClubs(clubsData);
      return clubsData;
    } catch (error: any) {
      console.error('Error fetching member clubs:', error);
      // Firebase izin hatası durumunda boş array döndür ve hata mesajı gösterme
      if (error?.code === 'permission-denied') {
        console.log('Kulüp üyelik bilgilerine erişim izni yok, boş liste gösteriliyor');
      }
      setMemberClubs([]);
      return [];
    }
  }, [currentUser]);
  
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 HomeScreen useFocusEffect triggered');
      console.log('👤 Current user:', currentUser?.uid);
      
      if (!currentUser?.uid) {
        console.log('❌ No current user, skipping data fetch');
        return;
      }
      
      const loadData = async () => {
        try {
          setLoading(true);
          console.log('📊 Starting data fetch...');
          
          // Verileri paralel olarak yükle
          await Promise.all([
            fetchFollowedClubEvents(),
            fetchJoinedEvents(),
            fetchMemberClubs(),
            fetchUserJoinedEvents(),
            fetchAllUsers() // Tüm kullanıcıları da yükle
          ]);
          
          console.log('🎉 All data loaded successfully');
        } catch (error) {
          console.error('❌ Error loading data:', error);
        } finally {
          setLoading(false);
        }
      };
      
      loadData();
    }, [currentUser?.uid]) // Only depend on currentUser.uid, not the functions
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      
      {/* Modern Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { 
            color: theme.colors.text,
            fontSize: isTablet ? fontSizes.title : fontSizes.lg 
          }]}>
            Ana Sayfa
          </Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.notificationButton}
              onPress={() => navigation.navigate('Notifications')}
              accessibilityLabel={`Bildirimler${unreadNotificationCount > 0 ? `, ${unreadNotificationCount} okunmamış bildirim` : ''}`}
              accessibilityRole="button"
              accessibilityHint="Bildirimler sayfasına gider"
            >
              <View style={styles.notificationIconContainer}>
                <MaterialCommunityIcons 
                  name="bell-outline" 
                  size={isTablet ? 28 : 24} 
                  color={theme.colors.text} 
                />
                {unreadNotificationCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      
      {/* Modern Search Bar */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Öğrenci ara..."
          onChangeText={handleSearchChange}
          value={searchQuery}
          style={[styles.searchBar, { 
            backgroundColor: theme.colors.surface,
            elevation: 2,
            ...shadows.sm 
          }]}
          icon={() => <MaterialCommunityIcons name="magnify" size={20} color="#666" />}
          clearIcon={() => <MaterialCommunityIcons name="close" size={20} color="#666" />}
          onFocus={handleSearchFocus}
          onBlur={handleSearchBlur}
          accessibilityLabel="Öğrenci arama kutusu"
          accessibilityHint="Öğrenci ismi, e-posta veya üniversite bilgisi ile arama yapın"
          accessibilityRole="search"
        />
      </View>
      
      {/* Search Results - Inline Expanding Results */}
      {showSearchResults && (
        <View style={[styles.inlineSearchResults, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.inlineSearchHeader}>
            <Text style={[styles.inlineSearchTitle, { color: theme.colors.onSurface }]}>
              {searchQuery.trim() ? `"${searchQuery}" için sonuçlar` : 'Tüm Kullanıcılar'}
            </Text>
            <Text style={[styles.inlineSearchSubtitle, { color: '#666' }]}>
              {searchResults.length} kullanıcı bulundu
            </Text>
            <TouchableOpacity 
              style={styles.inlineSearchCloseButton}
              onPress={handleCloseSearch}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons 
                name="close" 
                size={20} 
                color={theme.colors.onSurface} 
              />
            </TouchableOpacity>
          </View>
          
          <View style={styles.inlineSearchContent}>
            {isSearching || loadingUsers ? (
              <ActivityIndicator size="large" color={theme.colors.primary} style={styles.inlineSearchLoader} />
            ) : searchResults.length > 0 ? (
              <FlatList
                data={searchResults}
                keyExtractor={(item, index) => item.id || `user-${index}`}
                renderItem={({ item }) => {
                  console.log('🎯 Rendering search result item:', {
                    id: item.id,
                    displayName: item.displayName,
                    name: item.name,
                    userType: item.userType
                  });
                  return (
                    <EnhancedSearchResultCard
                      user={{...item, email: item.email || '', userType: (item.userType as 'student' | 'club') || 'student', createdAt: new Date(), updatedAt: new Date()}}
                      onPress={handleViewUserProfile}
                      searchQuery={searchQuery}
                    />
                  );
                }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.inlineSearchListContent}
                {...PerformanceOptimizer.getFlatListOptimizationProps()}
              />
            ) : (
              <View style={styles.inlineSearchEmptyState}>
                <MaterialCommunityIcons name="account-search" size={48} color="#e0e0e0" />
                <Text style={styles.inlineSearchEmptyTitle}>
                  {searchQuery.trim() ? 'Kullanıcı bulunamadı' : 'Henüz kullanıcı yok'}
                </Text>
                <Text style={styles.inlineSearchEmptyText}>
                  {searchQuery.trim() ? 'Farklı bir arama terimi deneyin' : 'Kayıtlı öğrenci kullanıcı bulunmuyor'}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}
      
      {!showSearchResults && (
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          // showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          {...(PerformanceOptimizer.getScrollViewOptimizationProps() as any)}
        >
        {/* Header removed as requested */}
        
        {/* Removed duplicate search bar */}
        
        {/* Filter Buttons */}
        <View style={styles.filterContainer}>
          <TouchableOpacity 
            style={[
              styles.filterButton,
              activeFilter === 'followed' && styles.activeFilterButton
            ]}
            onPress={() => setActiveFilter('followed')}
          >
            <MaterialCommunityIcons 
              name="account-group-outline" 
              size={18} 
              color={activeFilter === 'followed' ? '#fff' : '#666'} 
            />
            <Text style={[
              styles.filterButtonText,
              activeFilter === 'followed' && styles.activeFilterButtonText
            ]}>
              Takip Ettiklerim
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.filterButton,
              activeFilter === 'joined' && styles.activeFilterButton
            ]}
            onPress={() => setActiveFilter('joined')}
          >
            <MaterialCommunityIcons 
              name="account-group" 
              size={18} 
              color={activeFilter === 'joined' ? '#fff' : '#666'} 
            />
            <Text style={[
              styles.filterButtonText,
              activeFilter === 'joined' && styles.activeFilterButtonText
            ]}>
              Üye Olduklarım
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sort Options */}
        <View style={styles.sortContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sortScrollView}
          >
            <TouchableOpacity 
              style={[
                styles.sortButton,
                sortOption === 'newest' && styles.activeSortButton
              ]}
              onPress={() => setSortOption('newest')}
            >
              <MaterialCommunityIcons 
                name="calendar-clock" 
                size={16} 
                color={sortOption === 'newest' ? '#fff' : '#666'} 
              />
              <Text style={[
                styles.sortButtonText,
                sortOption === 'newest' && styles.activeSortButtonText
              ]}>
                En Yeni
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.sortButton,
                sortOption === 'oldest' && styles.activeSortButton
              ]}
              onPress={() => setSortOption('oldest')}
            >
              <MaterialCommunityIcons 
                name="calendar-arrow-left" 
                size={16} 
                color={sortOption === 'oldest' ? '#fff' : '#666'} 
              />
              <Text style={[
                styles.sortButtonText,
                sortOption === 'oldest' && styles.activeSortButtonText
              ]}>
                En Eski
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.sortButton,
                sortOption === 'upcoming' && styles.activeSortButton
              ]}
              onPress={() => setSortOption('upcoming')}
            >
              <MaterialCommunityIcons 
                name="calendar-arrow-right" 
                size={16} 
                color={sortOption === 'upcoming' ? '#fff' : '#666'} 
              />
              <Text style={[
                styles.sortButtonText,
                sortOption === 'upcoming' && styles.activeSortButtonText
              ]}>
                Yaklaşan
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.sortButton,
                sortOption === 'popular' && styles.activeSortButton
              ]}
              onPress={() => setSortOption('popular')}
            >
              <MaterialCommunityIcons 
                name="heart-multiple" 
                size={16} 
                color={sortOption === 'popular' ? '#fff' : '#666'} 
              />
              <Text style={[
                styles.sortButtonText,
                sortOption === 'popular' && styles.activeSortButtonText
              ]}>
                Popüler
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Conditional Content Based on Filter */}
        {activeFilter === 'followed' ? (
          <>
            {/* Takip Edilen Kulüpler */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Takip Ettiğin Kulüpler</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Clubs')}>
                  <Text style={styles.seeAll}>Tümünü Gör</Text>
                </TouchableOpacity>
              </View>
              
              {followedEventsLoading && followedClubs.length === 0 ? (
                <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
              ) : (
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.compactClubsScrollView}
                >
                  {followedClubs.map((club) => (
                    <TouchableOpacity 
                      key={club.id} 
                      style={styles.compactClubCard}
                      onPress={() => handleViewClub(club.id)}
                      activeOpacity={0.8}
                    >
                      <UniversalAvatar
                        user={club}
                        size={40}
                        style={styles.compactClubImage}
                      />
                      <View style={styles.compactClubInfo}>
                        <Text style={styles.compactClubName} numberOfLines={1}>
                          {club.displayName || club.name}
                        </Text>
                        <View style={styles.compactClubStats}>
                          <MaterialCommunityIcons name="account-group" size={12} color="#666" />
                          <Text style={styles.compactClubStatText}>{club.followerCount || 0}</Text>
                          <MaterialCommunityIcons name="account-multiple" size={12} color="#666" style={{marginLeft: 8}} />
                          <Text style={styles.compactClubStatText}>{club.memberCount || 0}</Text>
                          <MaterialCommunityIcons name="calendar-month" size={12} color="#666" style={{marginLeft: 8}} />
                          <Text style={styles.compactClubStatText}>{club.eventCount || 0}</Text>
                        </View>
                      </View>
                      <Button 
                        mode="text"
                        compact
                        onPress={() => handleFollowClub(club.id, club.isFollowing || false)}
                        style={styles.compactFollowButton}
                        labelStyle={styles.compactFollowButtonLabel}
                      >
                        {club.isFollowing ? "Takipte" : "Takip Et"}
                      </Button>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Takip Edilen Kulüplerin Etkinlikleri */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Takip Ettiğin Kulüplerin Etkinlikleri</Text>
                <TouchableOpacity onPress={handleSeeAllFollowedClubEvents}>
                  <Text style={styles.seeAll}>Tümünü Gör</Text>
                </TouchableOpacity>
              </View>
              
              {followedEventsLoading && followedClubEvents.length === 0 ? (
                <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
              ) : (
                <View style={styles.eventsContainer}>
                  {sortedFollowedEvents.map((event, index) => {
                    return (
                      <View key={event.id} style={styles.eventCardContainer}>
                        <StudentEventCard
                          event={{
                            ...event,
                            categories: event.categories || [],  // Ensure categories is always an array
                          }}
                          onNavigate={() => handleViewEvent(event.id)}
                          onJoin={async (eventId: string, userId: string) => {
                            await handleJoinEvent(eventId);
                          }}
                          onUnjoin={async (eventId: string, userId: string) => {
                            await handleUnjoinEvent(eventId);
                          }}
                          onShare={async (eventId: string) => {
                            await handleShareEvent(eventId);
                          }}
                          onLike={async (eventId: string) => {
                            await handleLikeEvent(eventId);
                          }}
                          showOrganizer={true}
                          isExpanded={false}
                          isUserJoined={userJoinedEvents?.includes(event.id) || false}
                        />
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </>
        ) : (
          <>
            {/* Üye Olunan Kulüpler */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Üye Olduğun Kulüpler</Text>
                <TouchableOpacity onPress={() => navigation.navigate('MyMemberships')}>
                  <Text style={styles.seeAll}>Tümünü Gör</Text>
                </TouchableOpacity>
              </View>
              
              {joinedEventsLoading && memberClubs.length === 0 ? (
                <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
              ) : (
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.compactClubsScrollView}
                >
                  {memberClubs.map((club) => (
                    <TouchableOpacity 
                      key={club.id} 
                      style={styles.compactClubCard}
                      onPress={() => handleViewClub(club.id)}
                      activeOpacity={0.8}
                    >
                      <UniversalAvatar
                        user={{
                          id: club.id,
                          name: club.displayName || club.name,
                          profileImage: club.profileImage,
                          avatarIcon: club.avatarIcon || 'account-group',
                          avatarColor: club.avatarColor || '#1976D2'
                        }}
                        size={40}
                        style={styles.compactClubAvatar}
                        fallbackIcon="account-group"
                        fallbackColor="#1976D2"
                      />
                      <View style={styles.compactClubInfo}>
                        <Text style={styles.compactClubName} numberOfLines={1}>
                          {club.displayName || club.name}
                        </Text>
                        <View style={styles.compactClubStats}>
                          <MaterialCommunityIcons name="account-group" size={12} color="#666" />
                          <Text style={styles.compactClubStatText}>{club.followerCount || 0}</Text>
                          <MaterialCommunityIcons name="account-multiple" size={12} color="#666" style={{marginLeft: 8}} />
                          <Text style={styles.compactClubStatText}>{club.memberCount || 0}</Text>
                          <MaterialCommunityIcons name="calendar-month" size={12} color="#666" style={{marginLeft: 8}} />
                          <Text style={styles.compactClubStatText}>{club.eventCount || 0}</Text>
                        </View>
                      </View>
                      <View style={styles.memberBadge}>
                        <Text style={styles.memberBadgeText}>Üye</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Üye Olunan Kulüplerin Etkinlikleri */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Üye Olduğun Kulüplerin Etkinlikleri</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Events')}>
                  <Text style={styles.seeAll}>Tümünü Gör</Text>
                </TouchableOpacity>
              </View>
              
              {joinedEventsLoading && joinedEvents.length === 0 ? (
                <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
              ) : (
                <View style={styles.eventsContainer}>
                  {sortedJoinedEvents.slice(0, 5).map((event, index) => {
                    return (
                      <View key={event.id} style={styles.eventCardContainer}>
                        <StudentEventCard
                          event={{
                            ...event,
                            categories: event.categories || [],  // Ensure categories is always an array
                          }}
                          onNavigate={() => handleViewEvent(event.id)}
                          onJoin={async (eventId: string, userId: string) => {
                            await handleJoinEvent(eventId);
                          }}
                          onUnjoin={async (eventId: string, userId: string) => {
                            await handleUnjoinEvent(eventId);
                          }}
                          onShare={async (eventId: string) => {
                            await handleShareEvent(eventId);
                          }}
                          onLike={async (eventId: string) => {
                            await handleLikeEvent(eventId);
                          }}
                          showOrganizer={true}
                          isExpanded={false}
                          isUserJoined={userJoinedEvents?.includes(event.id) || false}
                        />
                      </View>
                    );
                  })}
                  
                  {sortedJoinedEvents.length > 5 && (
                    <Button 
                      mode="outlined" 
                      onPress={() => navigation.navigate('Events')}
                      style={styles.showMoreButton}
                    >
                      Daha Fazla Göster ({sortedJoinedEvents.length - 5} etkinlik daha)
                    </Button>
                  )}
                </View>
              )}
            </View>
          </>
        )}
        
          <View style={styles.footer}>
            <Text style={styles.footerText}>Universe - Tüm etkinlikler bir arada</Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 24,
  },
  // Header styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  notificationButton: {
    padding: 8,
    borderRadius: 20,
  },
  notificationIconContainer: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // Search bar styles - improved
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 5,
    zIndex: 1000,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  searchBar: {
    margin: 10,
    borderRadius: 10,
    elevation: 2,
  },
  searchBarWithBack: {
    flex: 1,
  },
  // Search Modal Styles
  searchModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 1000,
    elevation: 20,
  },
  searchModalContainer: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: 80,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 30,
  },
  searchModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#f8f9fa',
  },
  searchModalBackButton: {
    padding: 10,
    borderRadius: 25,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchModalTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  searchModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
  searchModalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  searchModalCloseButton: {
    padding: 10,
    borderRadius: 25,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchModalContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  searchModalLoader: {
    marginTop: 50,
  },
  searchModalListContent: {
    paddingVertical: 16,
  },
  searchModalResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchModalResultAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  searchModalResultContent: {
    marginLeft: 16,
    flex: 1,
  },
  searchModalResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  searchModalResultDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  searchModalResultEmail: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
  },
  searchModalEmptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  searchModalEmptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  searchModalEmptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },

  // Inline Search Styles
  inlineSearchResults: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    maxHeight: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  inlineSearchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#f8f9fa',
  },
  inlineSearchTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  inlineSearchSubtitle: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  inlineSearchCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  inlineSearchContent: {
    maxHeight: 320,
  },
  inlineSearchLoader: {
    marginTop: 20,
    marginBottom: 20,
  },
  inlineSearchListContent: {
    paddingVertical: 8,
  },
  inlineSearchEmptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  inlineSearchEmptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
  inlineSearchEmptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  // Main content styles
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  seeAll: {
    color: '#1976D2',
    fontWeight: '600',
  },
  clubsScrollView: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  clubCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    marginVertical: 4,
    width: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  clubCardHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  clubImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  clubAvatar: {
    backgroundColor: '#1976D2',
  },
  clubDetails: {
    marginLeft: 12,
    flex: 1,
    justifyContent: 'center',
  },
  clubName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  clubUniversity: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  clubCardFooter: {
    marginTop: 8,
  },
  clubStats: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  clubStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  clubStatText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  followButton: {
    borderRadius: 20,
  },
  followButtonLabel: {
    fontSize: 12,
  },
  eventsContainer: {
    paddingHorizontal: 16,
  },
  eventCardContainer: {
    marginBottom: 12,
  },
  eventCard: {
    marginBottom: 16,
    elevation: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  eventImage: {
    height: 150,
  },
  eventContent: {
    padding: 12,
  },
  eventOrganizer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  organizerImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  organizerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1976D2',
  },
  organizerName: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  eventDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  eventDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 4,
  },
  eventDetailText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  eventCategories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  categoryChip: {
    marginRight: 8,
    marginBottom: 4,
    backgroundColor: '#f0f7ff',
    height: 26,
  },
  categoryChipText: {
    fontSize: 10,
    color: '#1976D2',
  },
  moreCategoriesText: {
    fontSize: 12,
    color: '#666',
    alignSelf: 'center',
  },
  showMoreButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  loader: {
    padding: 32,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 16,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyStateButton: {
    borderRadius: 20,
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    marginBottom: 8,
    elevation: 1,
  },
  userImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userAvatar: {
    backgroundColor: '#1976D2',
  },
  userDetails: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  userUniversity: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  usersList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  recommendedSection: {
    marginTop: 16,
    marginBottom: 24,
  },
  recommendedSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  recommendedTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  recommendedClubsScrollView: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  compactClubsScrollView: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingRight: 4,
  },
  compactClubCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    marginRight: 12,
    elevation: 2,
    width: 200,
  },
  compactClubImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  compactClubAvatar: {
    width: 40,
    height: 40,
  },
  compactClubInfo: {
    flex: 1,
    marginLeft: 8,
    justifyContent: 'space-between',
  },
  compactClubName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  compactClubStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  compactClubStatText: {
    fontSize: 11,
    color: '#666',
    marginRight: 12,
    marginLeft: 4,
  },
  compactFollowButton: {
    height: 30,
    borderRadius: 15,
    margin: 0,
    padding: 0,
  },
  compactFollowButtonLabel: {
    fontSize: 11,
    margin: 0,
  },
  // Filter styles
  filterContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 4,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  activeFilterButton: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginLeft: 6,
  },
  activeFilterButtonText: {
    color: '#fff',
  },
  // Sort Styles
  sortContainer: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  sortScrollView: {
    paddingVertical: 5,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 15,
    gap: 4,
  },
  activeSortButton: {
    backgroundColor: '#007AFF',
  },
  sortButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  activeSortButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  // Header button styles
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  // Member badge styles
  memberBadge: {
    backgroundColor: '#28a745',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  memberBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  // Search improvements
  moreResultsText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 10,
    paddingVertical: 8,
  },
});

export default HomeScreen;
