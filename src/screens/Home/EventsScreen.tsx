import React, { useEffect, useState, useContext, useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Alert, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Text, Button, ActivityIndicator, Searchbar, Chip, Divider, IconButton } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getFirebaseCompatSync } from '../../firebase/compat';
import { useAuth } from '../../contexts/AuthContext';
import StudentEventCard from '../../components/StudentEventCard';
import { EnhancedEventCard } from '../../components/EnhancedEventCard';
import unifiedDataSyncService from '../../services/unifiedDataSyncService';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useLeaderboardActions } from '../../hooks/useLeaderboardActions';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StudentStackParamList } from '../../navigation/StudentNavigator';
import { eventCategories, UNIVERSITIES_DATA } from '../../constants';
import { unifiedScoringService } from '../../services/unifiedScoringService';
import { globalRealtimeSyncService } from '../../services/globalRealtimeSyncService';
import { enhancedRealtimeSyncService } from '../../services/enhancedRealtimeSyncService';
import { universalProfileSyncService } from '../../services/universalProfileSyncService';

// const firebase = getFirebaseCompatSync(); // Removed - using getFirebaseCompatSync() directly

interface Event {
  id: string;
  title?: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  // Internal helper flag to ensure filtering doesn't include broken dates
  isDateValid?: boolean;
  location?: {
    type?: string;
    physicalAddress?: string;
    onlineLink?: string;
  };
  imageUrl?: string | null;
  categories?: string[];
  category?: string; // Eski format için
  clubId?: string;
  clubName?: string;
  createdBy?: string;
  attendeesCount?: number;
  capacity?: number;
  attendees?: string[];
  isFree?: boolean;
  price?: number;
  pricing?: {
    isFree?: boolean;
    price?: number;
  };
  createdAt?: Date | any; // Firebase timestamp
  // Analytics
  viewCount?: number;
  shareCount?: number;
  likeCount?: number;
  commentCount?: number;
  // Organizer information
  organizer?: {
    id: string;
    name: string;
    logo?: string;
    profileImage?: string;
    displayName?: string;
    bio?: string;
    avatarIcon?: string | null;
    avatarColor?: string;
    university?: string;
  };
  university?: string;
}

interface FilterOptions {
  status: 'all' | 'upcoming' | 'ongoing' | 'past';
  showJoinedOnly: boolean;
  searchQuery: string;
  selectedCategories: string[];
  selectedUniversities: string[];
  priceFilter: 'all' | 'free' | 'paid';
  capacityFilter: 'all' | 'available' | 'limited' | 'full';
  languageFilter: string[];
  locationFilter: 'all' | 'physical' | 'online' | 'hybrid';
}

const ITEMS_PER_PAGE = 10;

const EventsScreen = () => {
  // Default avatar helper - only use this if we can't get the user's selected avatar
  const getDefaultAvatar = () => {
    return {
      avatarIcon: 'account', // Default user icon
      avatarColor: '#2196F3'  // Default blue color
    };
  };

  // Theme değişkeni yerine direkt renkleri kullanacağız
  const PRIMARY_COLOR = '#1976D2';
  const ACCENT_COLOR = '#FF9800';
  
  const navigation = useNavigation<NativeStackNavigationProp<StudentStackParamList>>();
  const { currentUser: user } = useAuth();
  const db = getFirebaseCompatSync().firestore(); // Firebase firestore instance
  
  // Initialize leaderboard actions
  const {
    handleJoinEvent: leaderboardJoinEvent,
    handleLikeEvent: leaderboardLikeEvent,
    handleShareEvent: leaderboardShareEvent,
    handleFollowClub: leaderboardFollowClub
  } = useLeaderboardActions();
  
  const [events, setEvents] = useState<Event[]>([]);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMoreEvents, setHasMoreEvents] = useState(true);
  const [joinedEvents, setJoinedEvents] = useState<string[]>([]);
  const [likedEvents, setLikedEvents] = useState<string[]>([]);
  const [activeBottomSheet, setActiveBottomSheet] = useState<string | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    status: 'all',
    showJoinedOnly: false,
    searchQuery: '',
    selectedCategories: [],
    selectedUniversities: [],
    priceFilter: 'all',
    capacityFilter: 'all',
    languageFilter: [],
    locationFilter: 'all',
  });
  const [sortBy, setSortBy] = useState('date'); // 'date', 'popularity', 'price', 'alphabetical', 'attendeeCount', 'newest', 'capacity', 'distance'
  const [filterMode, setFilterMode] = useState<'all' | 'joined' | 'recommended' | 'trending' | 'nearby' | 'featured'>('all');
  
  const fetchJoinedEvents = useCallback(async () => {
    if (!user?.uid) return [];
    
    try {
      const userRef = getFirebaseCompatSync().firestore().collection('users').doc(user.uid);
      const userDoc = await userRef.get();
      const userData = userDoc.data();
      
      if (userData && userData.joinedEvents && Array.isArray(userData.joinedEvents)) {
        setJoinedEvents(userData.joinedEvents);
        return userData.joinedEvents;
      }
      
      return [];
    } catch (error) {
      console.error('Katıldığım etkinlikler getirilemedi:', error);
      return [];
    }
  }, [user?.uid]);
  
  // Beğeni listesi yüklemesi için hata izleme
  const [likesError, setLikesError] = useState(false);
  
  // Fetch user's liked events
  const fetchLikedEvents = useCallback(async () => {
    // Kullanıcı yoksa veya önceden hata aldıysak tekrar denemeyelim
    if (!user?.uid || likesError) return [];
    
    try {
      const userLikesRef = getFirebaseCompatSync().firestore().collection('users').doc(user.uid).collection('likes');
      const likesSnapshot = await userLikesRef.get();
      
      const userLikedEvents = likesSnapshot.docs.map(doc => doc.id);
      setLikedEvents(userLikedEvents);
      return userLikedEvents;
    } catch (error: any) {
      // Hatanın detaylı analizi
      if (error.code === 'permission-denied') {
        console.log('Beğeni listesine erişim izni yok - Firestore kurallarını kontrol edin');
        // Tekrar tekrar denemeyi önlemek için hata durumunu kaydedelim
        setLikesError(true);
      } else {
        console.log('Beğeni listesi yüklenirken beklenmeyen hata:', error.message);
      }
      
      // Boş dizi döndürelim ama uygulamanın çalışmasına engel olmayalım
      return [];
    }
  }, [user?.uid, likesError]);
  
  const fetchEvents = useCallback(async (loadMore = false) => {
    if (!user?.uid) return;
    
    try {
      if (!loadMore) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      console.log("Fetching events...");
      
      // Sadece katıldığımız etkinlikleri al, beğenileri ayrı yükleyelim
      const userJoinedEvents = await fetchJoinedEvents();
      console.log(`User joined ${userJoinedEvents.length} events`);
      
      // Create the initial query
      const eventsRef = getFirebaseCompatSync().firestore().collection('events');
      let fetchedEvents: Event[] = [];
      
      // IMPROVED: Get all events at once to make sure we have data
      try {
        console.log("Getting all events from Firestore");
        const allEventsSnapshot = await eventsRef.get();
        
        if (allEventsSnapshot.empty) {
          console.log("No events found in database");
          setEvents([]);
          setHasMoreEvents(false);
          return;
        }
        
        console.log(`Found ${allEventsSnapshot.size} events in database`);
        
        // Convert all documents to Event objects
        let allEvents = allEventsSnapshot.docs.map((doc: any) => {
          const data = doc.data();
          // Robust Timestamp/Date parsing with validity checks
          const parseToDate = (val: any): Date | null => {
            try {
              if (!val) return null;
              if (val.toDate && typeof val.toDate === 'function') return val.toDate();
              const d = new Date(val);
              return isNaN(d.getTime()) ? null : d;
            } catch {
              return null;
            }
          };

          const parsedStart = parseToDate(data.startDate);
          const parsedEnd = parseToDate(data.endDate);
          const startDate: Date = parsedStart || new Date(0); // fallback to epoch to avoid false upcoming
          const endDate: Date = parsedEnd || parsedStart || new Date(0); // single-day fallback or epoch
          const isDateValid = !!parsedStart; // require at least a valid start

          return {
            id: doc.id,
            ...data,
            startDate,
            endDate,
            isDateValid,
            categories: Array.isArray(data.categories) ? data.categories : [],
            organizer: data.clubId ? {
              id: data.clubId,
              name: data.clubName || data.organizer?.name || 'Bilinmeyen Kulüp',
              logo: data.organizer?.logo || null,
              profileImage: data.organizer?.profileImage || null,
              clubRef: data.clubRef || null,
              avatarIcon: data.clubAvatarIcon || data.organizer?.avatarIcon || null,
              avatarColor: data.clubAvatarColor || data.organizer?.avatarColor || '#1976D2',
            } : null,
          } as Event;
        });
        
        // Now fetch club details for events that have clubId
        const clubIds = [...new Set(allEvents.filter(event => event.organizer?.id).map(event => event.organizer!.id))];
        const clubDetails: { [key: string]: any } = {};
        
        if (clubIds.length > 0) {
          console.log(`Fetching details for ${clubIds.length} clubs:`, clubIds);
          
          // Kulüp bilgilerini getirme fonksiyonu
          const getClubDetails = async (clubId: string) => {
            // 1. Öncelikle users koleksiyonunda ara (en güvenilir yöntem)
            try {
              const userDoc = await getFirebaseCompatSync().firestore().collection('users').doc(clubId).get();
              
              if (userDoc.exists) {
                console.log(`Found club ${clubId} in 'users' collection`);
                const userData = userDoc.data();
                
                // Process user data
                
                // Profil resmi bul
                const profileImageUrl = await getProfileImageUrl(userData);
                
                clubDetails[clubId as string] = {
                  profileImage: profileImageUrl,
                  displayName: userData?.displayName || userData?.name || userData?.clubName || 'Kulüp',
                  university: userData?.university,
                  bio: userData?.bio || userData?.description,
                  avatarIcon: userData?.avatarIcon || null,
                  avatarColor: userData?.avatarColor || '#1976D2',
                };
                return true;
              }
            } catch (userError) {
              console.error(`Error querying users collection for ${clubId}:`, userError);
            }
            
            // 2. Users koleksiyonunda uid alanı ile dene
            try {
              const userIdQuery = await getFirebaseCompatSync().firestore()
                .collection('users')
                .where('uid', '==', clubId)
                .limit(1)
                .get();
              
              if (!userIdQuery.empty) {
                console.log(`Found club ${clubId} in 'users' collection by uid field`);
                const userData = userIdQuery.docs[0].data();
                
                // Profil resmi bul
                const profileImageUrl = await getProfileImageUrl(userData);
                
                clubDetails[clubId as string] = {
                  profileImage: profileImageUrl,
                  displayName: userData?.displayName || userData?.name || userData?.clubName || 'Kulüp',
                  university: userData?.university,
                  bio: userData?.bio || userData?.description,
                  avatarIcon: userData?.avatarIcon || null,
                  avatarColor: userData?.avatarColor || '#1976D2',
                };
                return true;
              }
            } catch (userIdError) {
              console.error(`Error querying users by uid for ${clubId}:`, userIdError);
            }
            
            // 3. Son çare - clubs koleksiyonunu dene (yetkiler nedeniyle başarısız olabilir)
            try {
              const clubDoc = await getFirebaseCompatSync().firestore().collection('clubs').doc(clubId).get();
              
              if (clubDoc.exists) {
                console.log(`Found club ${clubId} in 'clubs' collection`);
                const clubData = clubDoc.data();
                
                // Profil resmi bul
                const profileImageUrl = await getProfileImageUrl(clubData);
                
                clubDetails[clubId as string] = {
                  profileImage: profileImageUrl,
                  displayName: clubData?.displayName || clubData?.name || 'Kulüp',
                  university: clubData?.university,
                  bio: clubData?.bio || clubData?.description,
                  avatarIcon: clubData?.avatarIcon || null,
                  avatarColor: clubData?.avatarColor || '#1976D2',
                };
                return true;
              }
            } catch (clubError) {
              console.error(`Error querying clubs collection for ${clubId}:`, clubError);
            }
            
            console.log(`Could not find club ${clubId} in any collection`);
            return false;
          };
          


          // Profil resmi URL'sini bulan yardımcı fonksiyon
          const getProfileImageUrl = async (userData: any): Promise<string | null> => {
            if (!userData) return null;
            
            const possibleImageFields = [
              userData.profileImage,
              userData.photoURL,
              userData.avatar,
              userData.logo,
              userData.image
            ];
            
            // İlk geçerli URL'yi bul
            for (const imgField of possibleImageFields) {
              if (imgField && typeof imgField === 'string' && imgField.trim() !== '') {
                // HTTP/HTTPS kontrolü
                if (imgField.startsWith('http') || imgField.startsWith('https')) {
                  return imgField;
                } 
                // Firebase Storage URL
                else if (imgField.startsWith('gs://')) {
                  try {
                    const storageRef = getFirebaseCompatSync().storage().refFromURL(imgField);
                    const downloadUrl = await storageRef.getDownloadURL();
                    return downloadUrl;
                  } catch (storageError) {
                    console.error(`Failed to convert storage URL:`, storageError);
                  }
                }
              }
            }
            
            return null;
          };
          
          // Her kulüp için bilgileri getir, her biri için bir fallback hazırlayalım
          for (const clubId of clubIds) {
            try {
              // Varsayılan değerleri ayarla - bu sayede veritabanından getiremesek bile en azından UI'da gösterilecek bir şey olur
              // Find any event that references this club to get the name
              let clubName = 'Kulüp';
              const eventWithClub = allEvents.find(e => e.organizer?.id === clubId);
              if (eventWithClub?.organizer?.name) {
                clubName = eventWithClub.organizer.name;
              }
              
              // Get default avatar - only used if we can't get user's selected avatar
              const defaultAvatar = getDefaultAvatar();
              
              clubDetails[clubId as string] = {
                displayName: clubName,
                university: '',
                bio: '',
                profileImage: undefined,
                // Use default avatar settings - these will be overridden if we can fetch the actual user data
                avatarIcon: defaultAvatar.avatarIcon,
                avatarColor: defaultAvatar.avatarColor,
              };
              
              // Detayları getirmeye çalış (başarısız olsa bile üstteki fallback değerler kalacak)
              await getClubDetails(clubId as string);
            } catch (error) {
              console.error(`Error loading club data:`, error);
              // Fallback değerleri zaten ayarladık, işleme devam et
            }
          }
          
          console.log(`Prepared data for ${Object.keys(clubDetails).length} out of ${clubIds.length} clubs`);
        }
        
        try {
          // Update events with club details using universal profile sync
          allEvents = await Promise.all(allEvents.map(async event => {
            if (event.organizer?.id) {
              // Get fresh profile data from universal sync service
              const freshProfileData = await universalProfileSyncService.getProfileData(event.organizer.id);
              const clubDetail = freshProfileData || clubDetails[event.organizer.id];
              
              if (clubDetail) {
                // Get club name
                const clubName = clubDetail.displayName || event.organizer.name || 'Kulüp';
                
                return {
                  ...event,
                  organizer: {
                    ...event.organizer,
                    profileImage: undefined, // Force to undefined to use avatarIcon
                    displayName: clubName,
                    bio: clubDetail.bio,
                    // Preserve existing avatarIcon from database if available
                    avatarIcon: clubDetail.avatarIcon || event.organizer.avatarIcon || getDefaultAvatar().avatarIcon,
                    avatarColor: clubDetail.avatarColor || event.organizer.avatarColor || getDefaultAvatar().avatarColor
                  }
                };
              } else {
                // Kulüp bilgisi bulunamadıysa debug bilgisi
                if (event.organizer?.id) {
                  console.log(`Could not find club details for organizer ID: ${event.organizer.id} in event: ${event.title}`);
                }
                
                // Organizatör bilgisi olan ama avatar/profil resmi olmayan etkinlikler için default avatar icon ekleyelim
                if (event.organizer) {
                  // Get club name
                  const clubName = event.organizer.name || event.clubName || 'Kulüp';
                  // Get default avatar as fallback
                  const defaultAvatar = getDefaultAvatar();
                  
                  return {
                    ...event,
                    organizer: {
                      ...event.organizer,
                      // Profil resmi yoksa undefined olarak bırak (type uyumluluğu için)
                      profileImage: undefined,
                      // Preserve existing avatarIcon if available
                      avatarIcon: event.organizer.avatarIcon || defaultAvatar.avatarIcon,
                      avatarColor: event.organizer.avatarColor || defaultAvatar.avatarColor
                    }
                  };
                }
                
                return event;
              }
            }
            return event;
          }));
        } catch (mapError) {
          console.error('Error mapping events with club details:', mapError);
        }
        
        console.log(`Processed ${allEvents.length} events`);
        
        // Only filter for joined events if needed
        if (filterOptions.showJoinedOnly && userJoinedEvents.length > 0) {
          console.log('Filtering for joined events only');
          allEvents = allEvents.filter(event => (userJoinedEvents || []).includes(event.id));
          console.log(`After joined filter: ${allEvents.length} events`);
        }
        
        // Sort them by start date with defensive programming
        allEvents.sort((a, b) => {
          try {
            const aTime = a.startDate && a.startDate.getTime ? a.startDate.getTime() : 0;
            const bTime = b.startDate && b.startDate.getTime ? b.startDate.getTime() : 0;
            return aTime - bTime;
          } catch (error) {
            console.error('Error sorting events:', error, { a: a.id, b: b.id });
            return 0;
          }
        });
        
        // Paginate manually
        const startIndex = loadMore && lastVisible ? 
          allEvents.findIndex(e => e.id === lastVisible.id) + 1 : 0;
            
        fetchedEvents = allEvents.slice(startIndex, startIndex + ITEMS_PER_PAGE);
        console.log(`Returning ${fetchedEvents.length} events for display (${startIndex} to ${startIndex + ITEMS_PER_PAGE})`);
        
        // Update last visible if we have events
        if (fetchedEvents.length > 0) {
          // Set lastVisible document for pagination
          setLastVisible({ id: fetchedEvents[fetchedEvents.length - 1].id });
          setHasMoreEvents(startIndex + ITEMS_PER_PAGE < allEvents.length);
        } else {
          setHasMoreEvents(false);
        }
      } catch (error: any) {
        console.error("Error fetching events:", error);
        Alert.alert(
          'Hata',
          'Etkinlikler yüklenirken bir hata oluştu: ' + error.message
        );
        throw error;
      }
      
      // Update events
      if (loadMore) {
        setEvents(prev => [...prev, ...fetchedEvents]);
      } else {
        setEvents(fetchedEvents);
      }
      
    } catch (error) {
      console.error('Etkinlikler getirilemedi:', error);
      Alert.alert('Hata', 'Etkinlikler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [user?.uid, filterOptions.showJoinedOnly, lastVisible, fetchJoinedEvents]);
  
  // Universal gerçek zamanlı profil senkronizasyonu
  useEffect(() => {
    if (!user?.uid) return;

    console.log('🔄 Setting up universal real-time profile sync for EventsScreen');

    const handleProfileUpdate = (data: any) => {
      console.log('🔄 Universal profile update received, refreshing events data');
      fetchEvents(false);
      fetchLikedEvents();
    };

    const handleUserUpdate = (data: any) => {
      console.log('🔄 User update received, refreshing events data');
      fetchEvents(false);
      fetchLikedEvents();
    };

    // Use all services for maximum reliability
    globalRealtimeSyncService.on('profileUpdated', handleProfileUpdate);
    enhancedRealtimeSyncService.on('profileUpdated', handleProfileUpdate);
    universalProfileSyncService.on('profileUpdated', handleProfileUpdate);
    universalProfileSyncService.on('userUpdated', handleUserUpdate);

    return () => {
      globalRealtimeSyncService.off('profileUpdated', handleProfileUpdate);
      enhancedRealtimeSyncService.off('profileUpdated', handleProfileUpdate);
      universalProfileSyncService.off('profileUpdated', handleProfileUpdate);
      universalProfileSyncService.off('userUpdated', handleUserUpdate);
    };
  }, [user?.uid, fetchEvents, fetchLikedEvents]);

  // Ekran odak kazandığında sadece bir kez yükleme yapalım
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  
  useFocusEffect(
    useCallback(() => {
      // İlk yükleme yapıldığında ve beğeni hataları oluştuğunda sürekli dönmeyi engelleyelim
      if (!initialLoadDone) {
        // Beğenileri bir kez yüklemeyi deneyelim
        const loadInitialData = async () => {
          try {
            // Önce beğenileri, sonra etkinlikleri yükleyelim
            await fetchLikedEvents();
            fetchEvents(false);
            setInitialLoadDone(true);
          } catch (error) {
            console.error("İlk yükleme hatası:", error);
            setInitialLoadDone(true); // Hata olsa bile tekrar denemeyi durduralım
          }
        };
        
        loadInitialData();
      }
    }, [initialLoadDone])
  );

  const onRefresh = () => {
    // Yenileme sırasında, beğeni izin hatasını da sıfırlayalım
    // belki kullanıcı Firestore kurallarını düzeltmiş olabilir
    if (likesError) {
      setLikesError(false);
    }
    
    setRefreshing(true);
    setLastVisible(null);
    setHasMoreEvents(true);
    
    const refreshData = async () => {
      try {
        // Beğenileri tekrar yüklemeyi deneyelim (likesError false ise)
        if (!likesError) {
          await fetchLikedEvents();
        }
        // Etkinlikleri yükleyelim
        fetchEvents(false);
      } catch (error) {
        console.error("Yenileme hatası:", error);
        setRefreshing(false);
      }
    };
    
    refreshData();
  };
  
  const onLoadMore = () => {
    if (!loadingMore && hasMoreEvents) {
      fetchEvents(true);
    }
  };
  
  const applyFiltersAndSort = useCallback((eventsList: Event[] = events): Event[] => {
    if (__DEV__) {
      console.log(`Applying filters to ${eventsList.length} events`);
    }
    
    // Create a defensive copy
    let filtered = eventsList && Array.isArray(eventsList) ? [...eventsList] : [];
    
    if (filtered.length === 0) {
      if (__DEV__) {
        console.log("No events to filter");
      }
      return [];
    }
    
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    if (__DEV__) {
      console.log(`Current filter mode: ${filterMode}`);
    }
    
    // Apply filter mode first
    switch(filterMode) {
      case 'joined':
        filtered = filtered.filter(event => (joinedEvents || []).includes(event.id));
        console.log(`After 'joined' filter: ${filtered.length} events`);
        break;
      case 'recommended':
        // This would use AI/ML recommendations based on user interests
        filtered = filtered.filter((_, index) => index % 2 === 0); // Simulation
        console.log(`After 'recommended' filter: ${filtered.length} events`);
        break;
      case 'trending':
        // Sort by popularity and take top events
        filtered = filtered.sort((a, b) => 
          ((b.attendeesCount || 0) + (b.viewCount || 0)) - 
          ((a.attendeesCount || 0) + (a.viewCount || 0))
        );
        // Take top 60% or at least 10 events
        if (filtered.length > 0) {
          filtered = filtered.slice(0, Math.max(10, Math.floor(filtered.length * 0.6)));
        }
        console.log(`After 'trending' filter: ${filtered.length} events`);
        break;
      case 'nearby':
        // This would use location-based filtering
        filtered = filtered.filter(event => 
          event.location && 
          typeof event.location === 'object' && 
          (event.location.type === 'physical' || event.location.type === 'hybrid')
        );
        console.log(`After 'nearby' filter: ${filtered.length} events`);
        break;
      case 'featured':
        // This would show featured/promoted events
        filtered = filtered.filter((_, index) => index % 3 === 0); // Simulation
        console.log(`After 'featured' filter: ${filtered.length} events`);
        break;
      case 'all':
      default:
        // No additional filtering for 'all' mode
        console.log("Using 'all' filter - no filtering applied");
        break;
    }
    
  // Drop invalid-date events early to keep status filters stable
  filtered = filtered.filter(ev => ev.startDate && ev.startDate instanceof Date && !isNaN(ev.startDate.getTime()));

  // Filter by status
  if (filterOptions.status !== 'all') {
      filtered = filtered.filter(event => {
    const start = event.startDate?.getTime?.() ?? new Date(event.startDate as any).getTime();
    const end = event.endDate?.getTime?.() ?? new Date(event.endDate as any).getTime();
    const nowTs = now.getTime();
    if (!Number.isFinite(start)) return false;
    if (filterOptions.status === 'upcoming') return start > nowTs && start <= weekFromNow.getTime();
    if (filterOptions.status === 'ongoing') return start <= nowTs && Number.isFinite(end) && end >= nowTs;
    if (filterOptions.status === 'past') return Number.isFinite(end) ? end < nowTs : start < nowTs;
        return true;
      });
    }
    
    // Filter by search query
    if (filterOptions.searchQuery) {
      const query = filterOptions.searchQuery.toLowerCase();
      filtered = filtered.filter(event => 
        event.title?.toLowerCase().includes(query) || 
        event.description?.toLowerCase().includes(query) ||
        event.location?.physicalAddress?.toLowerCase().includes(query) ||
        event.clubName?.toLowerCase().includes(query)
      );
    }
    
    // Filter by selected categories
    if (filterOptions.selectedCategories.length > 0) {
      if (__DEV__) {
        console.log(`Filtering by categories: ${filterOptions.selectedCategories.join(', ')}`);
      }
      
      filtered = filtered.filter(event => {
        // Event'in kategorilerini kontrol et - hem categories hem de category fieldlarını destekle
        let eventCategories: string[] = [];
        
        // Yeni format: categories array
        if (Array.isArray(event.categories)) {
          eventCategories = event.categories.map(cat => String(cat));
        }
        // Eski format: tek category field
        else if (event.category) {
          eventCategories = [String(event.category)];
        }
        // Legacy: category alanını categories olarak kontrol et
        else if ((event as any).categories && typeof (event as any).categories === 'string') {
          eventCategories = [String((event as any).categories)];
        }
        
        if (eventCategories.length === 0) {
          if (__DEV__) {
            console.log(`Event ${event.id} (${event.title}) has no categories - filtering out`);
          }
          return false;
        }
        
        // Normalize both arrays for comparison
        const normalizedEventCategories = eventCategories.map(cat => String(cat).toLowerCase().trim());
        const normalizedFilterCategories = filterOptions.selectedCategories.map(cat => String(cat).toLowerCase().trim());
        
        // Check if any selected category matches event categories
        const hasMatchingCategory = normalizedEventCategories.some(eventCat => 
          normalizedFilterCategories.includes(eventCat)
        );
        
        if (__DEV__ && hasMatchingCategory) {
          console.log(`Event ${event.id} (${event.title}) matches categories:`, {
            eventCategories: normalizedEventCategories,
            filterCategories: normalizedFilterCategories,
            matched: normalizedEventCategories.filter(cat => normalizedFilterCategories.includes(cat))
          });
        }
        
        return hasMatchingCategory;
      });
      
      if (__DEV__) {
        console.log(`After category filter: ${filtered.length} events remain`);
      }
    }
    
    // Filter by universities
    if (filterOptions.selectedUniversities.length > 0) {
      filtered = filtered.filter(event => {
        // Check if the event's university or club's university matches selected universities
        const eventUniversity = event.university || event.organizer?.university || '';
        return filterOptions.selectedUniversities.includes(eventUniversity);
      });
    }
    
    // Filter by price
    if (filterOptions.priceFilter !== 'all') {
      filtered = filtered.filter(event => {
        if (filterOptions.priceFilter === 'free') {
          return event.isFree === true || event.price === 0;
        } else if (filterOptions.priceFilter === 'paid') {
          return event.isFree === false && (event.price || 0) > 0;
        }
        return true;
      });
    }
    
    // Filter by capacity
    if (filterOptions.capacityFilter !== 'all') {
      filtered = filtered.filter(event => {
        const attendees = event.attendeesCount || 0;
        const capacity = event.capacity || 999999;
        const availableSpots = capacity - attendees;
        
        if (filterOptions.capacityFilter === 'available') {
          return availableSpots > capacity * 0.2; // More than 20% available
        } else if (filterOptions.capacityFilter === 'limited') {
          return availableSpots <= capacity * 0.2 && availableSpots > 0; // Less than 20% but not full
        } else if (filterOptions.capacityFilter === 'full') {
          return availableSpots <= 0;
        }
        return true;
      });
    }
    
    // Filter by location type
    if (filterOptions.locationFilter !== 'all') {
      filtered = filtered.filter(event => {
        if (filterOptions.locationFilter === 'physical') {
          return event.location?.type === 'physical' || !event.location?.onlineLink;
        } else if (filterOptions.locationFilter === 'online') {
          return event.location?.type === 'online' || event.location?.onlineLink;
        } else if (filterOptions.locationFilter === 'hybrid') {
          return event.location?.type === 'hybrid' || (event.location?.physicalAddress && event.location?.onlineLink);
        }
        return true;
      });
    }
    
    // Sort events
    try {
  if (sortBy === 'date') {
        // Tarihe göre sıralama - yaklaşan etkinlikler önce
        filtered.sort((a, b) => {
          try {
    const aTimeRaw = a.startDate instanceof Date ? a.startDate.getTime() : new Date(a.startDate as any).getTime();
    const bTimeRaw = b.startDate instanceof Date ? b.startDate.getTime() : new Date(b.startDate as any).getTime();
    const aTime = Number.isFinite(aTimeRaw) ? aTimeRaw : Number.POSITIVE_INFINITY; // invalid dates go last
    const bTime = Number.isFinite(bTimeRaw) ? bTimeRaw : Number.POSITIVE_INFINITY;
    return aTime - bTime;
          } catch (error) {
            console.error('Error sorting events by date:', error, { a: a.id, b: b.id });
            return 0;
          }
        });
      } else if (sortBy === 'popularity') {
        // Popülerlik skoru: katılımcı + görüntülenme + beğeni + paylaşım
        filtered.sort((a, b) => {
          const aScore = (a.attendeesCount || 0) * 3 + (a.viewCount || 0) + (a.likeCount || 0) * 2 + (a.shareCount || 0) * 2;
          const bScore = (b.attendeesCount || 0) * 3 + (b.viewCount || 0) + (b.likeCount || 0) * 2 + (b.shareCount || 0) * 2;
          return bScore - aScore;
        });
      } else if (sortBy === 'price') {
        // Fiyata göre sıralama - ücretsiz önce, sonra artan fiyat
        filtered.sort((a, b) => {
          const aIsFree = a.isFree === true || (a.pricing?.isFree === true) || (a.price || 0) === 0;
          const bIsFree = b.isFree === true || (b.pricing?.isFree === true) || (b.price || 0) === 0;
          
          // Ücretsiz etkinlikler önce
          if (aIsFree && !bIsFree) return -1;
          if (!aIsFree && bIsFree) return 1;
          
          // Her ikisi de ücretsiz veya ücretli ise fiyata göre sırala
          const aPrice = a.price || a.pricing?.price || 0;
          const bPrice = b.price || b.pricing?.price || 0;
          return aPrice - bPrice;
        });
      } else if (sortBy === 'alphabetical') {
        // Alfabetik sıralama
        filtered.sort((a, b) => {
          const aTitle = (a.title || '').toLowerCase().trim();
          const bTitle = (b.title || '').toLowerCase().trim();
          return aTitle.localeCompare(bTitle, 'tr');
        });
      } else if (sortBy === 'attendeeCount') {
        // Katılımcı sayısına göre sıralama
        filtered.sort((a, b) => (b.attendeesCount || 0) - (a.attendeesCount || 0));
      } else if (sortBy === 'newest') {
        // En yeni oluşturulan etkinlikler
        filtered.sort((a, b) => {
          // createdAt varsa onu kullan, yoksa startDate'e yakınlık kullan
          if (a.createdAt && b.createdAt) {
            const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
            const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
            return bTime - aTime;
          }
          
          // Alternatif: popülerlik skoruyla karışık sıralama
          const aScore = (a.viewCount || 0) * 2 + (a.attendeesCount || 0) * 3 + (a.likeCount || 0);
          const bScore = (b.viewCount || 0) * 2 + (b.attendeesCount || 0) * 3 + (b.likeCount || 0);
          return bScore - aScore;
        });
      } else if (sortBy === 'capacity') {
        // Kapasiteye göre sıralama - boş yerler çok olanlar önce
        filtered.sort((a, b) => {
          const aCapacity = a.capacity || 999999;
          const bCapacity = b.capacity || 999999;
          const aAvailable = aCapacity - (a.attendeesCount || 0);
          const bAvailable = bCapacity - (b.attendeesCount || 0);
          return bAvailable - aAvailable;
        });
      } else if (sortBy === 'distance') {
        // Lokasyon bazlı sıralama (şimdilik online etkinlikler önce)
        filtered.sort((a, b) => {
          const aIsOnline = a.location?.type === 'online' || a.location?.onlineLink;
          const bIsOnline = b.location?.type === 'online' || b.location?.onlineLink;
          
          if (aIsOnline && !bIsOnline) return -1;
          if (!aIsOnline && bIsOnline) return 1;
          
          // Aynı tip ise popülerliğe göre sırala
          const aScore = (a.attendeesCount || 0) + (a.viewCount || 0);
          const bScore = (b.attendeesCount || 0) + (b.viewCount || 0);
          return bScore - aScore;
        });
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Error during sorting:', error);
      }
    }
    
    return filtered;
  }, [events, filterOptions, sortBy, filterMode, joinedEvents]);

  const handleJoinEvent = async (eventId: string) => {
    if (!user?.uid) {
      Alert.alert('Giriş Gerekli', 'Bu işlemi yapmak için giriş yapmanız gerekmektedir.');
      return;
    }
    
    try {
      const eventRef = getFirebaseCompatSync().firestore().collection('events').doc(eventId);
      const userRef = getFirebaseCompatSync().firestore().collection('users').doc(user.uid);
      
      // Check if user already joined
      const isJoined = (joinedEvents || []).includes(eventId);
      
      if (isJoined) {
        // Leave event
        await userRef.update({
          joinedEvents: getFirebaseCompatSync().firestore.FieldValue.arrayRemove(eventId)
        });
        
        await eventRef.update({
          attendees: getFirebaseCompatSync().firestore.FieldValue.arrayRemove(user.uid),
          attendeesCount: (events.find(e => e.id === eventId)?.attendeesCount || 1) - 1
        });

        // Remove from eventAttendees collection
        try {
          await db.collection('eventAttendees').doc(`${eventId}_${user.uid}`).delete();
        } catch (error) {
          console.warn('eventAttendees koleksiyonundan çıkarılamadı:', error);
        }

        // Remove from events/{eventId}/attendees subcollection  
        try {
          await db.collection('events').doc(eventId).collection('attendees').doc(user.uid).delete();
        } catch (error) {
          console.warn('attendees alt koleksiyonundan çıkarılamadı:', error);
        }
        
        setJoinedEvents(prev => prev.filter(id => id !== eventId));
        Alert.alert('Başarılı', 'Etkinlikten ayrıldınız.');
      } else {
        // Check capacity
        const eventDoc = await eventRef.get();
        const eventData = eventDoc.data();
        
        if (eventData?.capacity && eventData?.attendeesCount >= eventData.capacity) {
          Alert.alert('Hata', 'Bu etkinliğin kapasitesi dolmuştur.');
          return;
        }
        
        // Join event
        await userRef.update({
          joinedEvents: getFirebaseCompatSync().firestore.FieldValue.arrayUnion(eventId)
        });
        
        await eventRef.update({
          attendees: getFirebaseCompatSync().firestore.FieldValue.arrayUnion(user.uid),
          attendeesCount: (events.find(e => e.id === eventId)?.attendeesCount || 0) + 1
        });

        // Add to eventAttendees collection
        try {
          await db.collection('eventAttendees').doc(`${eventId}_${user.uid}`).set({
            eventId: eventId,
            userId: user.uid,
            joinedAt: getFirebaseCompatSync().firestore.FieldValue.serverTimestamp(),
            userEmail: user.email,
            userName: user.displayName || user.email
          });
        } catch (error) {
          console.warn('eventAttendees koleksiyonuna eklenemedi:', error);
        }

        // Add to events/{eventId}/attendees subcollection
        try {
          await db.collection('events').doc(eventId).collection('attendees').doc(user.uid).set({
            joinedAt: getFirebaseCompatSync().firestore.FieldValue.serverTimestamp(),
            userEmail: user.email,
            userName: user.displayName || user.email
          });
        } catch (error) {
          console.warn('attendees alt koleksiyonuna eklenemedi:', error);
        }
        
        setJoinedEvents(prev => [...prev, eventId]);
        Alert.alert('Başarılı', 'Etkinliğe katıldınız.');
        
        // Award points for joining event
        try {
          const event = events.find(e => e.id === eventId);
          const clubId = event?.organizer?.id;
          await leaderboardJoinEvent(user.uid, eventId, clubId);
        } catch (error) {
          console.error('Puan verme hatası:', error);
        }
      }
      
      // Refresh events
      fetchEvents(false);
    } catch (error) {
      console.error('Etkinliğe katılım/ayrılma hatası:', error);
      Alert.alert('Hata', 'İşlem sırasında bir hata oluştu.');
    }
  };

  const handleUnjoinEvent = async (eventId: string) => {
    if (!user?.uid) {
      Alert.alert('Giriş Gerekli', 'Bu işlemi yapmak için giriş yapmanız gerekmektedir.');
      return;
    }
    
    try {
      const eventRef = getFirebaseCompatSync().firestore().collection('events').doc(eventId);
      const userRef = getFirebaseCompatSync().firestore().collection('users').doc(user.uid);
      
      // Leave event
      await userRef.update({
        joinedEvents: getFirebaseCompatSync().firestore.FieldValue.arrayRemove(eventId)
      });
      
      await eventRef.update({
        attendees: getFirebaseCompatSync().firestore.FieldValue.arrayRemove(user.uid),
        attendeesCount: (events.find(e => e.id === eventId)?.attendeesCount || 1) - 1
      });

      // Remove from eventAttendees collection
      try {
        await db.collection('eventAttendees').doc(`${eventId}_${user.uid}`).delete();
      } catch (error) {
        console.warn('eventAttendees koleksiyonundan çıkarılamadı:', error);
      }

      // Remove from events/{eventId}/attendees subcollection  
      try {
        await db.collection('events').doc(eventId).collection('attendees').doc(user.uid).delete();
      } catch (error) {
        console.warn('attendees alt koleksiyonundan çıkarılamadı:', error);
      }
      
      setJoinedEvents(prev => prev.filter(id => id !== eventId));
      Alert.alert('Başarılı', 'Etkinlikten ayrıldınız.');
      
      // Refresh events
      fetchEvents(false);
    } catch (error) {
      console.error('Etkinlikten ayrılma hatası:', error);
      Alert.alert('Hata', 'İşlem sırasında bir hata oluştu.');
    }
  };
  
  // Handle like event
  const handleLikeEvent = async (eventId: string) => {
    // Eğer önceden beğeni izin hatası aldıysak işlem yapmayalım
    if (likesError) {
      Alert.alert('İzin Hatası', 'Beğeni işlemi için yetki yok. Lütfen daha sonra tekrar deneyin.');
      return;
    }
    
    if (!user?.uid) {
      Alert.alert('Giriş Gerekli', 'Bu işlemi yapmak için giriş yapmanız gerekmektedir.');
      return;
    }
    
    try {
      const eventRef = getFirebaseCompatSync().firestore().collection('events').doc(eventId);
      const userLikesRef = getFirebaseCompatSync().firestore().collection('users').doc(user.uid).collection('likes');
      
      // Check if user already liked
      const isLiked = (likedEvents || []).includes(eventId);
      
      // Toggle like status
      if (isLiked) {
        // Remove like
        await eventRef.update({
          likeCount: getFirebaseCompatSync().firestore.FieldValue.increment(-1)
        });
        await userLikesRef.doc(eventId).delete();
        setLikedEvents(prev => prev.filter(id => id !== eventId));
      } else {
        // Add like
        await eventRef.update({
          likeCount: getFirebaseCompatSync().firestore.FieldValue.increment(1)
        });
        await userLikesRef.doc(eventId).set({
          eventId,
          likedAt: getFirebaseCompatSync().firestore.FieldValue.serverTimestamp()
        });
        setLikedEvents(prev => [...prev, eventId]);
        
        // Award points for liking event
        try {
          const event = events.find(e => e.id === eventId);
          const clubId = event?.organizer?.id;
          await leaderboardLikeEvent(user.uid, eventId, clubId);
        } catch (error) {
          console.error('Puan verme hatası:', error);
        }
      }
      
      // Update events list
      setEvents(prev => prev.map(event => {
        if (event.id === eventId) {
          return {
            ...event,
            likeCount: isLiked ? 
              (event.likeCount || 0) - 1 : 
              (event.likeCount || 0) + 1
          };
        }
        return event;
      }));
      
    } catch (error: any) {
      // Yetki hatası ise bunu özel işleyelim ve tekrar denememeyi sağlayalım
      if (error.code === 'permission-denied') {
        console.log('Beğeni işlemi için yetki yok');
        setLikesError(true);
        Alert.alert('İzin Hatası', 'Beğeni işlemi için yetki yok. Firestore kurallarını kontrol edin.');
      } else {
        console.error('Beğeni işleminde hata:', error);
        Alert.alert('Hata', 'İşlem sırasında bir hata oluştu.');
      }
    }
  };
  
  const handleShareEvent = async (eventId: string) => {
    if (!user?.uid) {
      Alert.alert('Giriş Gerekli', 'Bu işlemi yapmak için giriş yapmanız gerekmektedir.');
      return;
    }
    
    try {
      // Increase share count
      const eventRef = getFirebaseCompatSync().firestore().collection('events').doc(eventId);
      await eventRef.update({
        shareCount: (events.find(e => e.id === eventId)?.shareCount || 0) + 1
      });
      
      // Update local state
      setEvents(prev => prev.map(event => {
        if (event.id === eventId) {
          return {
            ...event,
            shareCount: (event.shareCount || 0) + 1
          };
        }
        return event;
      }));
      
      // Award points for sharing event
      try {
        const event = events.find(e => e.id === eventId);
        const clubId = event?.organizer?.id;
        await leaderboardShareEvent(user.uid, eventId, clubId);
      } catch (error) {
        console.error('Puan verme hatası:', error);
      }
    } catch (error) {
      console.error('Paylaşım sayısı güncellenemedi:', error);
    }
  };
  
  const handleViewEventDetails = (eventId: string) => {
    try {
      // Increase view count
      const eventRef = getFirebaseCompatSync().firestore().collection('events').doc(eventId);
      eventRef.update({
        viewCount: (events.find(e => e.id === eventId)?.viewCount || 0) + 1
      });
      
      // Toggle expanded state instead of navigating to new page
      setExpandedEventId(currentId => currentId === eventId ? null : eventId);
    } catch (error) {
      console.error('Görüntülenme sayısı güncellenemedi:', error);
    }
  };
  
  const toggleCategory = (categoryId: string) => {
    if (__DEV__) {
      console.log(`Toggling category with ID: ${categoryId}`);
    }
    
    // Haptic feedback eklemek kullanıcı deneyimini iyileştirir (React Native Expo)
    try {
      // Bu satır doğrudan çalışmayabilir, Expo'nun haptic feedback modülünün projeye eklenmiş olması gerekir
      // Eğer Expo.Haptics kullanılabilirse bu satır çalışır, yoksa catch bloğuna düşer
      // Expo.Haptics.impactAsync(Expo.Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      // Haptics kullanılamıyorsa sessizce devam et
    }
    
    setFilterOptions(prev => {
      const selectedCategories = [...prev.selectedCategories];
      const categoryIdStr = String(categoryId);
      const index = selectedCategories.findIndex(id => String(id) === categoryIdStr);
      
      if (index > -1) {
        selectedCategories.splice(index, 1);
      } else {
        selectedCategories.push(categoryIdStr);
      }
      
      return {
        ...prev,
        selectedCategories
      };
    });
  };
  
  // Open bottom sheet for specific filter
  const openBottomSheet = (sheetType: string) => {
    console.log(`Opening bottom sheet for: ${sheetType}`);
    
    // Debug message for which bottom sheet is being opened
    switch(sheetType) {
      case 'categories':
        console.log(`Current selected categories: ${filterOptions.selectedCategories.join(', ') || 'none'}`);
        break;
      case 'sort':
        console.log(`Current sort method: ${sortBy}`);
        break;
      case 'status':
        console.log(`Current status filter: ${filterOptions.status}`);
        break;
    }
    
    setActiveBottomSheet(sheetType);
  };

  // Close bottom sheet
  const closeBottomSheet = () => {
    console.log(`Closing bottom sheet: ${activeBottomSheet}`);
    setActiveBottomSheet(null);
  };

  // Get filter count for display
  const getFilterCount = (filterType: string) => {
    switch (filterType) {
      case 'categories':
        return filterOptions.selectedCategories.length;
      case 'universities':
        return filterOptions.selectedUniversities.length;
      case 'languages':
        return filterOptions.languageFilter.length;
      default:
        return 0;
    }
  };

  // Get active filter display text
  const getActiveFilterText = (filterType: string) => {
    switch (filterType) {
      case 'status':
        const statusLabels = { all: 'Tümü', upcoming: 'Yaklaşan', ongoing: 'Devam Eden', past: 'Geçmiş' };
        return statusLabels[filterOptions.status] || 'Durum';
      case 'sort':
        const sortLabels: { [key: string]: string } = { 
          date: 'Tarihe Göre', 
          popularity: 'Popülerliğe Göre', 
          price: 'Fiyata Göre', 
          alphabetical: 'A-Z', 
          attendeeCount: 'Katılımcı Sayısına Göre',
          newest: 'En Yeni',
          capacity: 'Kapasiteye Göre',
          distance: 'Lokasyona Göre'
        };
        return sortLabels[sortBy] || 'Sıralama';
      case 'price':
        const priceLabels = { all: 'Fiyat', free: 'Ücretsiz', paid: 'Ücretli' };
        return priceLabels[filterOptions.priceFilter] || 'Fiyat';
      case 'location':
        const locationLabels = { all: 'Konum', physical: 'Yüz Yüze', online: 'Online', hybrid: 'Hibrit' };
        return locationLabels[filterOptions.locationFilter] || 'Konum';
      case 'capacity':
        const capacityLabels = { all: 'Kapasite', available: 'Müsait', limited: 'Sınırlı', full: 'Dolu' };
        return capacityLabels[filterOptions.capacityFilter] || 'Kapasite';
      default:
        return filterType;
    }
  };

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
            filterOptions.selectedCategories.length > 0 ? styles.filterButtonActive : {}
          ]}
          onPress={() => openBottomSheet('categories')}
        >
          <View style={styles.filterButtonContent}>
            <MaterialCommunityIcons name="shape" size={16} color={filterOptions.selectedCategories.length > 0 ? '#fff' : '#666'} />
            <Text style={[
              styles.filterButtonText,
              filterOptions.selectedCategories.length > 0 ? styles.filterButtonTextActive : {}
            ]}>
              Kategori
            </Text>
            {filterOptions.selectedCategories.length > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{filterOptions.selectedCategories.length}</Text>
              </View>
            )}
          </View>
          <MaterialCommunityIcons name="chevron-down" size={16} color={filterOptions.selectedCategories.length > 0 ? '#fff' : '#666'} />
        </TouchableOpacity>

        {/* Sıralama */}
        <TouchableOpacity 
          style={[
            styles.filterButton, 
            sortBy !== 'date' ? styles.filterButtonActive : {}
          ]}
          onPress={() => openBottomSheet('sort')}
        >
          <View style={styles.filterButtonContent}>
            <MaterialCommunityIcons name="sort" size={16} color={sortBy !== 'date' ? '#fff' : '#666'} />
            <Text style={[
              styles.filterButtonText,
              sortBy !== 'date' ? styles.filterButtonTextActive : {}
            ]}>
              {getActiveFilterText('sort')}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-down" size={16} color={sortBy !== 'date' ? '#fff' : '#666'} />
        </TouchableOpacity>

        {/* Durum */}
        <TouchableOpacity 
          style={[
            styles.filterButton, 
            filterOptions.status !== 'upcoming' ? styles.filterButtonActive : {}
          ]}
          onPress={() => openBottomSheet('status')}
        >
          <View style={styles.filterButtonContent}>
            <MaterialCommunityIcons name="calendar-clock" size={16} color={filterOptions.status !== 'upcoming' ? '#fff' : '#666'} />
            <Text style={[
              styles.filterButtonText,
              filterOptions.status !== 'upcoming' ? styles.filterButtonTextActive : {}
            ]}>
              {getActiveFilterText('status')}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-down" size={16} color={filterOptions.status !== 'upcoming' ? '#fff' : '#666'} />
        </TouchableOpacity>

        {/* Fiyat */}
        <TouchableOpacity 
          style={[
            styles.filterButton, 
            filterOptions.priceFilter !== 'all' ? styles.filterButtonActive : {}
          ]}
          onPress={() => openBottomSheet('price')}
        >
          <View style={styles.filterButtonContent}>
            <MaterialCommunityIcons name="cash" size={16} color={filterOptions.priceFilter !== 'all' ? '#fff' : '#666'} />
            <Text style={[
              styles.filterButtonText,
              filterOptions.priceFilter !== 'all' ? styles.filterButtonTextActive : {}
            ]}>
              {getActiveFilterText('price')}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-down" size={16} color={filterOptions.priceFilter !== 'all' ? '#fff' : '#666'} />
        </TouchableOpacity>

        {/* Konum */}
        <TouchableOpacity 
          style={[
            styles.filterButton, 
            filterOptions.locationFilter !== 'all' ? styles.filterButtonActive : {}
          ]}
          onPress={() => openBottomSheet('location')}
        >
          <View style={styles.filterButtonContent}>
            <MaterialCommunityIcons name="map-marker" size={16} color={filterOptions.locationFilter !== 'all' ? '#fff' : '#666'} />
            <Text style={[
              styles.filterButtonText,
              filterOptions.locationFilter !== 'all' ? styles.filterButtonTextActive : {}
            ]}>
              {getActiveFilterText('location')}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-down" size={16} color={filterOptions.locationFilter !== 'all' ? '#fff' : '#666'} />
        </TouchableOpacity>

        {/* Kapasite */}
        <TouchableOpacity 
          style={[
            styles.filterButton, 
            filterOptions.capacityFilter !== 'all' ? styles.filterButtonActive : {}
          ]}
          onPress={() => openBottomSheet('capacity')}
        >
          <View style={styles.filterButtonContent}>
            <MaterialCommunityIcons name="account-group" size={16} color={filterOptions.capacityFilter !== 'all' ? '#fff' : '#666'} />
            <Text style={[
              styles.filterButtonText,
              filterOptions.capacityFilter !== 'all' ? styles.filterButtonTextActive : {}
            ]}>
              {getActiveFilterText('capacity')}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-down" size={16} color={filterOptions.capacityFilter !== 'all' ? '#fff' : '#666'} />
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

        {/* Katılım Durumu */}
        <TouchableOpacity 
          style={[
            styles.filterButton, 
            filterMode !== 'all' ? styles.filterButtonActive : {}
          ]}
          onPress={() => openBottomSheet('participation')}
        >
          <View style={styles.filterButtonContent}>
            <MaterialCommunityIcons name="account-check" size={16} color={filterMode !== 'all' ? '#fff' : '#666'} />
            <Text style={[
              styles.filterButtonText,
              filterMode !== 'all' ? styles.filterButtonTextActive : {}
            ]}>
              Katılım
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-down" size={16} color={filterMode !== 'all' ? '#fff' : '#666'} />
        </TouchableOpacity>

        {/* Temizle Butonu */}
        {(filterOptions.selectedCategories.length > 0 || 
          filterOptions.selectedUniversities.length > 0 || 
          filterOptions.priceFilter !== 'all' || 
          filterOptions.locationFilter !== 'all' || 
          filterOptions.capacityFilter !== 'all' ||
          filterOptions.status !== 'all' ||
          sortBy !== 'date' ||
          filterMode !== 'all') && (
          <TouchableOpacity 
            style={styles.clearAllButton}
            onPress={() => {
              setFilterOptions({
                status: 'all',
                showJoinedOnly: false,
                searchQuery: filterOptions.searchQuery,
                selectedCategories: [],
                selectedUniversities: [],
                priceFilter: 'all',
                capacityFilter: 'all',
                languageFilter: [],
                locationFilter: 'all',
              });
              setSortBy('date');
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
  const renderCategoriesBottomSheet = () => (
    <View style={[styles.bottomSheetContainer, {backgroundColor: '#fff'}]}>
      <View style={styles.bottomSheetHeader}>
        <Text style={styles.bottomSheetTitle}>Kategoriler</Text>
        <TouchableOpacity 
          onPress={closeBottomSheet}
          style={styles.closeButton}
        >
          <MaterialCommunityIcons name="close" size={24} color="#333" />
        </TouchableOpacity>
      </View>
      
      <View style={{ flex: 1 }}>
        {/* Quick Actions */}
        <View style={styles.quickActionsRow}>
          <Button
            mode={filterOptions.selectedCategories.length === 0 ? "contained" : "outlined"}
            onPress={() => {
              if (__DEV__) {
                console.log('Clearing all category filters');
              }
              setFilterOptions(prev => ({ ...prev, selectedCategories: [] }));
              closeBottomSheet();
            }}
            style={styles.quickActionButton}
            labelStyle={styles.quickActionButtonLabel}
            contentStyle={{height: 45}}
          >
            Tümü
          </Button>
          <Button
            mode="outlined"
            onPress={() => {
              if (__DEV__) {
                console.log('Selecting all categories');
              }
              const allCategoryIds = eventCategories.map(c => c.id);
              setFilterOptions(prev => ({ ...prev, selectedCategories: allCategoryIds }));
               // Apply filters immediately
            }}
            style={styles.quickActionButton}
            labelStyle={styles.quickActionButtonLabel}
            contentStyle={{height: 45}}
          >
            Hepsini Seç
          </Button>
        </View>

        {/* Category selection counter */}
        <View style={styles.selectionCounterContainer}>
          <Text style={styles.selectionCounterText}>
            {filterOptions.selectedCategories.length} kategori seçildi
          </Text>
        </View>

        {/* Category groups for better organization */}
        <ScrollView 
          style={[styles.scrollableContent, {maxHeight: 550}]}
          contentContainerStyle={[styles.scrollContentContainer, {paddingBottom: 150}]}
          showsVerticalScrollIndicator={true}
          bounces={true}
          alwaysBounceVertical={true}
        >
          <View style={styles.categoriesContainer}>
            {eventCategories.map(category => {
              // String olarak kategori ID'sini kontrol et
              const categoryIdStr = String(category.id);
              const isSelected = filterOptions.selectedCategories.some(id => String(id) === categoryIdStr);
              
              return (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryCard,
                    isSelected ? styles.categoryCardSelected : {}
                  ]}
                  onPress={() => toggleCategory(category.id)}
                  activeOpacity={0.7}
                >
                <View style={[styles.categoryIconContainer, isSelected ? styles.categoryIconContainerSelected : {}]}>
                  <MaterialCommunityIcons 
                    name={category.icon as any} 
                    size={24} 
                    color={isSelected ? '#fff' : '#1976D2'} 
                  />
                </View>
                <Text style={[
                  styles.categoryCardText,
                  isSelected ? styles.categoryCardTextSelected : {}
                ]}>
                  {category.label}
                </Text>
                {isSelected && (
                  <MaterialCommunityIcons name="check-circle" size={18} color="#fff" style={styles.categoryCheckIcon} />
                )}
              </TouchableOpacity>
              );
            })}
          </View>

          {/* Bottom padding for scroll */}
          <View style={{ height: 100 }} />
        </ScrollView>
        
        {/* Kategori seçimini uygulama butonu */}
        <View style={styles.bottomSheetFooter}>
          <Button
            mode="contained"
            onPress={() => {
              
              closeBottomSheet();
            }}
            style={styles.applyButton}
            contentStyle={{height: 50}}
            labelStyle={{fontSize: 16, fontWeight: 'bold'}}
            icon={() => <MaterialCommunityIcons name="check" size={20} color="#fff" />}
          >
            Filtreleri Uygula ({filterOptions.selectedCategories.length})
          </Button>
        </View>
      </View>
    </View>
  );

  const renderSortBottomSheet = () => (
    <View style={[styles.bottomSheetContainer, {backgroundColor: '#fff', minHeight: 450}]}>
      <View style={styles.bottomSheetHeader}>
        <Text style={styles.bottomSheetTitle}>Sıralama Seçenekleri</Text>
        <TouchableOpacity 
          onPress={closeBottomSheet}
          style={styles.closeButton}
        >
          <MaterialCommunityIcons name="close" size={24} color="#333" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.currentSortContainer}>
        <Text style={styles.currentSortLabel}>Mevcut Sıralama:</Text>
        <View style={styles.currentSortValue}>
          <MaterialCommunityIcons 
            name={
              sortBy === 'date' ? 'calendar' : 
              sortBy === 'popularity' ? 'trending-up' :
              sortBy === 'alphabetical' ? 'sort-alphabetical-variant' :
              sortBy === 'attendeeCount' ? 'account-group' :
              sortBy === 'price' ? 'cash' :
              'new-box'
            } 
            size={20} 
            color="#1976D2" 
          />
          <Text style={styles.currentSortText}>
            {sortBy === 'date' ? 'Tarihe Göre' : 
            sortBy === 'popularity' ? 'Popülerliğe Göre' :
            sortBy === 'alphabetical' ? 'Alfabetik' :
            sortBy === 'attendeeCount' ? 'Katılımcı Sayısına Göre' :
            sortBy === 'price' ? 'Fiyata Göre' :
            'En Yeni'}
          </Text>
        </View>
      </View>
      
      <ScrollView 
        style={[styles.scrollableContent, {maxHeight: 550}]}
        contentContainerStyle={[styles.scrollContentContainer, {paddingBottom: 120}]}
        showsVerticalScrollIndicator={true}
        bounces={true}
        alwaysBounceVertical={true}
      >
        {[
          { id: 'date', label: 'Tarihe Göre', icon: 'calendar', desc: 'En yakın etkinlikler önce' },
          { id: 'popularity', label: 'Popülerliğe Göre', icon: 'trending-up', desc: 'En çok katılımcı ve görüntülenme' },
          { id: 'alphabetical', label: 'Alfabetik', icon: 'sort-alphabetical-variant', desc: 'A\'dan Z\'ye sıralama' },
          { id: 'attendeeCount', label: 'Katılımcı Sayısı', icon: 'account-group', desc: 'En çok katılımcı sayısına göre' },
          { id: 'price', label: 'Fiyata Göre', icon: 'cash', desc: 'Önce ücretsiz, sonra düşük fiyat' },
          { id: 'newest', label: 'En Yeni', icon: 'new-box', desc: 'En son eklenen etkinlikler' },
          { id: 'capacity', label: 'Kapasiteye Göre', icon: 'seat', desc: 'En çok boş yeri olan etkinlikler' },
          { id: 'distance', label: 'Lokasyona Göre', icon: 'map-marker-distance', desc: 'Online etkinlikler önce' },
        ].map(sort => (
          <TouchableOpacity
            key={sort.id}
            style={[
              styles.optionItem,
              sortBy === sort.id ? styles.optionItemSelected : {}
            ]}
            onPress={() => {
              setSortBy(sort.id);
              
              closeBottomSheet();
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.categoryIconContainer, sortBy === sort.id ? styles.categoryIconContainerSelected : {}]}>
              <MaterialCommunityIcons 
                name={sort.icon as any} 
                size={24} 
                color={sortBy === sort.id ? '#fff' : '#1976D2'} 
              />
            </View>
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
              <MaterialCommunityIcons name="check-circle" size={22} color="#fff" />
            )}
          </TouchableOpacity>
        ))}

        {/* Bottom padding */}
        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );

  const renderStatusBottomSheet = () => (
    <View style={[styles.bottomSheetContainer, {backgroundColor: '#fff', minHeight: 450}]}>
      <View style={styles.bottomSheetHeader}>
        <Text style={styles.bottomSheetTitle}>Etkinlik Durumu</Text>
        <TouchableOpacity onPress={closeBottomSheet}>
          <MaterialCommunityIcons name="close" size={24} color="#333" />
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        style={styles.scrollableContent}
        contentContainerStyle={[styles.scrollContentContainer, {paddingBottom: 120}]}
        showsVerticalScrollIndicator={true}
        bounces={true}
        alwaysBounceVertical={true}
      >
        {[
          { id: 'all', label: 'Tüm Etkinlikler', icon: 'calendar', desc: 'Geçmiş, devam eden ve gelecek tüm etkinlikler' },
          { id: 'upcoming', label: 'Yaklaşan Etkinlikler', icon: 'calendar-clock', desc: 'Henüz başlamamış etkinlikler' },
          { id: 'ongoing', label: 'Devam Eden', icon: 'play-circle', desc: 'Şu anda gerçekleşen etkinlikler' },
          { id: 'past', label: 'Geçmiş Etkinlikler', icon: 'calendar-check', desc: 'Sona ermiş etkinlikler' },
        ].map(status => (
          <TouchableOpacity
            key={status.id}
            style={[
              styles.optionItem,
              filterOptions.status === status.id ? styles.optionItemSelected : {}
            ]}
            onPress={() => {
              setFilterOptions(prev => ({ ...prev, status: status.id as any }));
              
              closeBottomSheet();
            }}
          >
            <MaterialCommunityIcons 
              name={status.icon as any} 
              size={20} 
              color={filterOptions.status === status.id ? '#fff' : '#666'} 
            />
            <View style={styles.optionItemContent}>
              <Text style={[
                styles.optionItemTitle,
                filterOptions.status === status.id ? styles.optionItemTitleSelected : {}
              ]}>
                {status.label}
              </Text>
              <Text style={[
                styles.optionItemDesc,
                filterOptions.status === status.id ? styles.optionItemDescSelected : {}
              ]}>
                {status.desc}
              </Text>
            </View>
            {filterOptions.status === status.id && (
              <MaterialCommunityIcons name="check-circle" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        ))}

        {/* Bottom padding */}
        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );

  const renderPriceBottomSheet = () => (
    <View style={[styles.bottomSheetContainer, {backgroundColor: '#fff', minHeight: 450}]}>
      <View style={styles.bottomSheetHeader}>
        <Text style={styles.bottomSheetTitle}>Fiyat Filtresi</Text>
        <TouchableOpacity onPress={closeBottomSheet}>
          <MaterialCommunityIcons name="close" size={24} color="#333" />
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        style={[styles.scrollableContent, {maxHeight: 550}]}
        contentContainerStyle={[styles.scrollContentContainer, {paddingBottom: 120}]}
        showsVerticalScrollIndicator={true}
        bounces={true}
        alwaysBounceVertical={true}
      >
        {[
          { id: 'all', label: 'Tüm Etkinlikler', icon: 'cash-multiple', desc: 'Ücretsiz ve ücretli tüm etkinlikler' },
          { id: 'free', label: 'Ücretsiz Etkinlikler', icon: 'gift', desc: 'Katılımı tamamen ücretsiz olan etkinlikler' },
          { id: 'paid', label: 'Ücretli Etkinlikler', icon: 'cash', desc: 'Katılım ücreti olan etkinlikler' },
        ].map(price => (
          <TouchableOpacity
            key={price.id}
            style={[
              styles.optionItem,
              filterOptions.priceFilter === price.id ? styles.optionItemSelected : {}
            ]}
            onPress={() => {
              setFilterOptions(prev => ({ ...prev, priceFilter: price.id as any }));
              
              closeBottomSheet();
            }}
          >
            <MaterialCommunityIcons 
              name={price.icon as any} 
              size={24} 
              color={filterOptions.priceFilter === price.id ? '#fff' : '#666'} 
            />
            <View style={styles.optionItemContent}>
              <Text style={[
                styles.optionItemTitle,
                filterOptions.priceFilter === price.id ? styles.optionItemTitleSelected : {}
              ]}>
                {price.label}
              </Text>
              <Text style={[
                styles.optionItemDesc,
                filterOptions.priceFilter === price.id ? styles.optionItemDescSelected : {}
              ]}>
                {price.desc}
              </Text>
            </View>
            {filterOptions.priceFilter === price.id && (
              <MaterialCommunityIcons name="check-circle" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        ))}

        {/* Bottom padding */}
        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );

  const renderLocationBottomSheet = () => (
    <View style={[styles.bottomSheetContainer, {backgroundColor: '#fff', minHeight: 450}]}>
      <View style={styles.bottomSheetHeader}>
        <Text style={styles.bottomSheetTitle}>Konum Türü</Text>
        <TouchableOpacity onPress={closeBottomSheet}>
          <MaterialCommunityIcons name="close" size={24} color="#333" />
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        style={[styles.scrollableContent, {maxHeight: 550}]}
        contentContainerStyle={[styles.scrollContentContainer, {paddingBottom: 120}]}
        showsVerticalScrollIndicator={true}
        bounces={true}
        alwaysBounceVertical={true}
      >
        {[
          { id: 'all', label: 'Tüm Konumlar', icon: 'earth', desc: 'Fiziksel, online ve hibrit tüm etkinlikler' },
          { id: 'physical', label: 'Yüz Yüze', icon: 'map-marker', desc: 'Fiziksel mekanlarda düzenlenen etkinlikler' },
          { id: 'online', label: 'Online', icon: 'laptop', desc: 'Sanal ortamda gerçekleşen etkinlikler' },
          { id: 'hybrid', label: 'Hibrit', icon: 'swap-horizontal', desc: 'Hem fiziksel hem online katılım seçenekli' },
        ].map(location => (
          <TouchableOpacity
            key={location.id}
            style={[
              styles.optionItem,
              filterOptions.locationFilter === location.id ? styles.optionItemSelected : {}
            ]}
            onPress={() => {
              setFilterOptions(prev => ({ ...prev, locationFilter: location.id as any }));
              
              closeBottomSheet();
            }}
          >
            <MaterialCommunityIcons 
              name={location.icon as any} 
              size={24} 
              color={filterOptions.locationFilter === location.id ? '#fff' : '#666'} 
            />
            <View style={styles.optionItemContent}>
              <Text style={[
                styles.optionItemTitle,
                filterOptions.locationFilter === location.id ? styles.optionItemTitleSelected : {}
              ]}>
                {location.label}
              </Text>
              <Text style={[
                styles.optionItemDesc,
                filterOptions.locationFilter === location.id ? styles.optionItemDescSelected : {}
              ]}>
                {location.desc}
              </Text>
            </View>
            {filterOptions.locationFilter === location.id && (
              <MaterialCommunityIcons name="check-circle" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        ))}

        {/* Bottom padding */}
        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );

  const renderCapacityBottomSheet = () => (
    <View style={[styles.bottomSheetContainer, {backgroundColor: '#fff', minHeight: 450}]}>
      <View style={styles.bottomSheetHeader}>
        <Text style={styles.bottomSheetTitle}>Kapasite Durumu</Text>
        <TouchableOpacity onPress={closeBottomSheet}>
          <MaterialCommunityIcons name="close" size={24} color="#333" />
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        style={[styles.scrollableContent, {maxHeight: 550}]}
        contentContainerStyle={[styles.scrollContentContainer, {paddingBottom: 120}]}
        showsVerticalScrollIndicator={true}
        bounces={true}
        alwaysBounceVertical={true}
      >
        {[
          { id: 'all', label: 'Tüm Etkinlikler', icon: 'account-group', desc: 'Kapasite durumu fark etmeksizin tüm etkinlikler' },
          { id: 'available', label: 'Yer Var', icon: 'account-plus', desc: 'Katılım için yeterli yer bulunan etkinlikler' },
          { id: 'limited', label: 'Sınırlı Yer', icon: 'account-clock', desc: 'Az sayıda yer kalan etkinlikler' },
          { id: 'full', label: 'Dolu', icon: 'account-remove', desc: 'Kapasitesi dolmuş etkinlikler' },
        ].map(capacity => (
          <TouchableOpacity
            key={capacity.id}
            style={[
              styles.optionItem,
              filterOptions.capacityFilter === capacity.id ? styles.optionItemSelected : {}
            ]}
            onPress={() => {
              setFilterOptions(prev => ({ ...prev, capacityFilter: capacity.id as any }));
              
              closeBottomSheet();
            }}
          >
            <MaterialCommunityIcons 
              name={capacity.icon as any} 
              size={24} 
              color={filterOptions.capacityFilter === capacity.id ? '#fff' : '#666'} 
            />
            <View style={styles.optionItemContent}>
              <Text style={[
                styles.optionItemTitle,
                filterOptions.capacityFilter === capacity.id ? styles.optionItemTitleSelected : {}
              ]}>
                {capacity.label}
              </Text>
              <Text style={[
                styles.optionItemDesc,
                filterOptions.capacityFilter === capacity.id ? styles.optionItemDescSelected : {}
              ]}>
                {capacity.desc}
              </Text>
            </View>
            {filterOptions.capacityFilter === capacity.id && (
              <MaterialCommunityIcons name="check-circle" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        ))}

        {/* Bottom padding */}
        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );

  const renderUniversitiesBottomSheet = () => (
    <View style={[styles.bottomSheetContainer, {backgroundColor: '#fff', minHeight: 500}]}>
      <View style={styles.bottomSheetHeader}>
        <Text style={styles.bottomSheetTitle}>Üniversiteler</Text>
        <TouchableOpacity onPress={closeBottomSheet}>
          <MaterialCommunityIcons name="close" size={24} color="#333" />
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        style={[styles.scrollableContent, {maxHeight: 600}]}
        contentContainerStyle={[styles.scrollContentContainer, {paddingBottom: 150}]}
        showsVerticalScrollIndicator={true}
        bounces={true}
        alwaysBounceVertical={true}
      >
        {/* Quick Actions */}
        <View style={styles.quickActionsRow}>
          <Button
            mode={filterOptions.selectedUniversities.length === 0 ? "contained" : "outlined"}
            onPress={() => {
              setFilterOptions(prev => ({ ...prev, selectedUniversities: [] }));
              
            }}
            style={styles.quickActionButton}
          >
            <Text>Tümü</Text>
          </Button>
          <Button
            mode="outlined"
            onPress={() => {
              setFilterOptions(prev => ({ ...prev, selectedUniversities: Object.keys(UNIVERSITIES_DATA) }));
              
            }}
            style={styles.quickActionButton}
          >
            <Text>Hepsini Seç</Text>
          </Button>
        </View>

        {Object.entries(UNIVERSITIES_DATA).map(([key, university]) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.universityItem,
              filterOptions.selectedUniversities.includes(key) ? styles.universityItemSelected : {}
            ]}
            onPress={() => {
              const isSelected = filterOptions.selectedUniversities.includes(key);
              setFilterOptions(prev => ({
                ...prev,
                selectedUniversities: isSelected
                  ? prev.selectedUniversities.filter(id => id !== key)
                  : [...prev.selectedUniversities, key]
              }));
              // Apply filters with a slight delay to prevent too many calls
              
            }}
          >
            <View style={styles.universityInfo}>
              <Text style={[
                styles.universityName,
                filterOptions.selectedUniversities.includes(key) ? styles.universityNameSelected : {}
              ]}>
                {university.name}
              </Text>
              <Text style={[
                styles.universityCity,
                filterOptions.selectedUniversities.includes(key) ? styles.universityCitySelected : {}
              ]}>
                {(university as any).city || university.name.split(' ').pop() || 'Türkiye'}
              </Text>
            </View>
            {filterOptions.selectedUniversities.includes(key) && (
              <MaterialCommunityIcons name="check-circle" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        ))}

        {/* Bottom padding for scroll */}
        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.bottomSheetFooter}>
        <Button
          mode="contained"
          onPress={() => {
            
            closeBottomSheet();
          }}
          style={styles.applyButton}
        >
          <Text>Uygula ({filterOptions.selectedUniversities.length} seçili)</Text>
        </Button>
      </View>
    </View>
  );

  const renderParticipationBottomSheet = () => (
    <View style={[styles.bottomSheetContainer, {backgroundColor: '#fff', minHeight: 450}]}>
      <View style={styles.bottomSheetHeader}>
        <Text style={styles.bottomSheetTitle}>Katılım Durumu</Text>
        <TouchableOpacity onPress={closeBottomSheet}>
          <MaterialCommunityIcons name="close" size={24} color="#333" />
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        style={[styles.scrollableContent, {maxHeight: 550}]}
        contentContainerStyle={[styles.scrollContentContainer, {paddingBottom: 120}]}
        showsVerticalScrollIndicator={true}
        bounces={true}
        alwaysBounceVertical={true}
      >
        {[
          { id: 'all', label: 'Tüm Etkinlikler', icon: 'earth', desc: 'Katıldığım ve katılmadığım tüm etkinlikler' },
          { id: 'joined', label: 'Katıldıklarım', icon: 'account-check', desc: 'Sadece katıldığım etkinlikler' },
          { id: 'recommended', label: 'Önerilen', icon: 'thumbs-up', desc: 'İlgi alanlarıma göre önerilen etkinlikler' },
          { id: 'trending', label: 'Trend Olanlar', icon: 'trending-up', desc: 'En popüler ve çok katılımlı etkinlikler' },
          { id: 'nearby', label: 'Yakınımdaki', icon: 'map-marker-radius', desc: 'Konumumun yakınındaki etkinlikler' },
          { id: 'featured', label: 'Öne Çıkanlar', icon: 'star', desc: 'Öne çıkarılan ve özel etkinlikler' },
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

        {/* Bottom padding */}
        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );

  // Render bottom sheet based on active type
  const renderBottomSheet = () => {
    // Sadece geliştirme ortamında ve aktif bir sheet olduğunda log göster
    if (__DEV__ && activeBottomSheet) {
      console.log(`Rendering bottom sheet: ${activeBottomSheet}`);
    }
    
    if (!activeBottomSheet) {
      return null;
    }
    
    // Determine which sheet content to show
    let sheetContent = null;
    switch (activeBottomSheet) {
      case 'categories':
        sheetContent = renderCategoriesBottomSheet();
        break;
      case 'sort':
        sheetContent = renderSortBottomSheet();
        break;
      case 'status':
        sheetContent = renderStatusBottomSheet();
        break;
      case 'price':
        sheetContent = renderPriceBottomSheet();
        break;
      case 'location':
        sheetContent = renderLocationBottomSheet();
        break;
      case 'capacity':
        sheetContent = renderCapacityBottomSheet();
        break;
      case 'universities':
        sheetContent = renderUniversitiesBottomSheet();
        break;
      case 'participation':
        sheetContent = renderParticipationBottomSheet();
        break;
      default:
        console.log(`Unknown bottom sheet type: ${activeBottomSheet}`);
        return null;
    }

    return (
      <View style={styles.bottomSheetOverlay}>
        <TouchableOpacity 
          style={styles.bottomSheetBackdrop} 
          onPress={closeBottomSheet}
          activeOpacity={0.7}
        />
        <View style={styles.bottomSheetModal}>
          {sheetContent}
        </View>
      </View>
    );
  };

  const renderEmptyState = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1976D2" />
        </View>
      );
    }
    
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="calendar-remove" size={48} color="#e0e0e0" style={styles.emptyIcon} />
        <Text style={styles.emptyTitle}>Etkinlik Bulunamadı</Text>
        <Text style={styles.emptyText}>Aradığınız kriterlere uygun etkinlik bulunamadı.{'\n'}Farklı filtreler deneyin veya daha sonra tekrar kontrol edin.</Text>
      </View>
    );
  };

  // Real-time search as user types (ClubEventsScreen ile aynı)
  const handleSearchTextChange = useCallback((text: string) => {
    setFilterOptions(prev => ({...prev, searchQuery: text}));
  }, []);

  // Filtrelenmiş etkinlikler (real-time)
  const filteredEventsForDisplay = useMemo(() => {
    return applyFiltersAndSort(events);
  }, [events, filterOptions, sortBy, filterMode, joinedEvents, likedEvents, applyFiltersAndSort]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="auto" />
      
      {/* Debug button removed for now */}
      
      {/* Search Bar - Functional search bar */}
      <View style={styles.header}>
        <Searchbar
          placeholder="Etkinlik veya kulüp ara..."
          onChangeText={handleSearchTextChange}
          value={filterOptions.searchQuery}
          style={styles.searchBar}
          icon={() => <MaterialCommunityIcons name="magnify" size={20} color="#666" />}
          clearIcon={() => <MaterialCommunityIcons name="close" size={20} color="#666" />}
        />
        
        {/* Sıralama Seçenekleri - Arama çubuğunun hemen altında */}
        <View style={{marginBottom: 8}}>
          <Text style={{fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 6, paddingHorizontal: 4}}>Sıralama:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScrollView}>
            <TouchableOpacity 
              style={[styles.sortButton, sortBy === 'date' && styles.sortButtonActive]}
              onPress={() => setSortBy('date')}
            >
              <MaterialCommunityIcons name="calendar" size={16} color={sortBy === 'date' ? '#fff' : '#666'} />
              <Text style={[styles.sortButtonText, sortBy === 'date' && styles.sortButtonTextActive]}>
                Tarihe Göre
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.sortButton, sortBy === 'alphabetical' && styles.sortButtonActive]}
              onPress={() => setSortBy('alphabetical')}
            >
              <MaterialCommunityIcons name="sort-alphabetical-variant" size={16} color={sortBy === 'alphabetical' ? '#fff' : '#666'} />
              <Text style={[styles.sortButtonText, sortBy === 'alphabetical' && styles.sortButtonTextActive]}>
                Alfabetik
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.sortButton, sortBy === 'popularity' && styles.sortButtonActive]}
              onPress={() => setSortBy('popularity')}
            >
              <MaterialCommunityIcons name="star" size={16} color={sortBy === 'popularity' ? '#fff' : '#666'} />
              <Text style={[styles.sortButtonText, sortBy === 'popularity' && styles.sortButtonTextActive]}>
                Popülerlik
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.sortButton, sortBy === 'attendeeCount' && styles.sortButtonActive]}
              onPress={() => setSortBy('attendeeCount')}
            >
              <MaterialCommunityIcons name="account-group" size={16} color={sortBy === 'attendeeCount' ? '#fff' : '#666'} />
              <Text style={[styles.sortButtonText, sortBy === 'attendeeCount' && styles.sortButtonTextActive]}>
                Katılımcı
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.sortButton, sortBy === 'newest' && styles.sortButtonActive]}
              onPress={() => setSortBy('newest')}
            >
              <MaterialCommunityIcons name="new-box" size={16} color={sortBy === 'newest' ? '#fff' : '#666'} />
              <Text style={[styles.sortButtonText, sortBy === 'newest' && styles.sortButtonTextActive]}>
                En Yeni
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Durum Filtreleri - Sıralama butonlarının hemen altında */}
        <View style={{marginBottom: 8}}>
          <Text style={{fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 6, paddingHorizontal: 4}}>Durum:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScrollView}>
            <Chip 
              selected={filterOptions.status === 'all'} 
              onPress={() => setFilterOptions(prev => ({...prev, status: 'all'}))}
              style={styles.chip}
              mode={filterOptions.status === 'all' ? 'flat' : 'outlined'}
            >
              Tümü
            </Chip>
            <Chip 
              selected={filterOptions.status === 'upcoming'} 
              onPress={() => setFilterOptions(prev => ({...prev, status: 'upcoming'}))}
              style={styles.chip}
              mode={filterOptions.status === 'upcoming' ? 'flat' : 'outlined'}
            >
              Yaklaşan
            </Chip>
            <Chip 
              selected={filterOptions.status === 'ongoing'} 
              onPress={() => setFilterOptions(prev => ({...prev, status: 'ongoing'}))}
              style={styles.chip}
              mode={filterOptions.status === 'ongoing' ? 'flat' : 'outlined'}
            >
              Devam Eden
            </Chip>
            <Chip 
              selected={filterOptions.status === 'past'} 
              onPress={() => setFilterOptions(prev => ({...prev, status: 'past'}))}
              style={styles.chip}
              mode={filterOptions.status === 'past' ? 'flat' : 'outlined'}
            >
              Geçmiş
            </Chip>
          </ScrollView>
        </View>

        {/* Kategori Filtreleri - En altta */}
        <View style={{marginBottom: 8}}>
          <Text style={{fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 6, paddingHorizontal: 4}}>Kategoriler:</Text>
          <TouchableOpacity 
            style={[
              styles.filterButton, 
              filterOptions.selectedCategories.length > 0 ? styles.filterButtonActive : {}
            ]}
            onPress={() => openBottomSheet('categories')}
          >
            <View style={styles.filterButtonContent}>
              <MaterialCommunityIcons name="shape" size={16} color={filterOptions.selectedCategories.length > 0 ? '#fff' : '#666'} />
              <Text style={[
                styles.filterButtonText,
                filterOptions.selectedCategories.length > 0 ? styles.filterButtonTextActive : {}
              ]}>
                {filterOptions.selectedCategories.length > 0 ? `${filterOptions.selectedCategories.length} Kategori Seçili` : 'Kategori Seç'}
              </Text>
              {filterOptions.selectedCategories.length > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{filterOptions.selectedCategories.length}</Text>
                </View>
              )}
            </View>
            <MaterialCommunityIcons name="chevron-down" size={16} color={filterOptions.selectedCategories.length > 0 ? '#fff' : '#666'} />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Category filters only - Selected category chips */}
      <View style={styles.filterSection}>
        
        {/* Filtreleme seçenekleri (Chipler) */}
        {filterOptions.selectedCategories.length > 0 && (
          <View style={styles.selectedFiltersContainer}>
            <View style={styles.selectedFiltersHeader}>
              <MaterialCommunityIcons name="filter-variant" size={16} color="#1976D2" />
              <Text style={styles.selectedFiltersTitle}>Seçili Filtreler</Text>
              <TouchableOpacity 
                onPress={() => {
                  setFilterOptions(prev => ({...prev, selectedCategories: []}));
                  
                }}
                style={styles.clearFiltersButton}
              >
                <Text style={styles.clearFiltersText}>Temizle</Text>
                <MaterialCommunityIcons name="close-circle" size={16} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.chipsScrollView}
              contentContainerStyle={styles.chipsScrollViewContent}
            >
              {filterOptions.selectedCategories.map((categoryId, index) => {
                // Kategori ID'sini string olarak karşılaştır
                const categoryIdStr = String(categoryId);
                const category = eventCategories.find(c => String(c.id) === categoryIdStr);
                if (!category) return null;
                
                return (
                  <Chip
                    key={`category-${categoryId}-${index}`}
                    mode="flat"
                    style={styles.filterChip}
                    onClose={() => toggleCategory(categoryId)}
                    closeIcon="close"
                    icon={() => <MaterialCommunityIcons name={category.icon as any} size={16} color="#fff" />}
                    selected={true}
                    textStyle={styles.filterChipLabel}
                    theme={{ 
                      colors: { 
                        primary: ACCENT_COLOR, 
                        text: '#fff',
                        surface: '#1976D2',
                        onSurface: '#fff'
                      } 
                    }}
                  >
                    {category.label}
                  </Chip>
                );
              })}
            </ScrollView>
          </View>
        )}
      </View>
      
      {/* Etkinlik Listesi */}
      {/* Debug logging removed - was causing type errors */}
      <FlatList
        data={filteredEventsForDisplay}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="calendar-alert" size={64} color="#e0e0e0" />
            <Text style={styles.emptyTitle}>
              Etkinlik Bulunamadı
            </Text>
            <Text style={styles.emptyText}>
              Arama kriterlerinize uygun etkinlik bulunamadı.
              Filtrelerinizi değiştirerek tekrar deneyebilirsiniz.
            </Text>
            {!loading && (
              <Button 
                mode="contained" 
                onPress={() => {
                  // Reset all filters
                  setFilterOptions({
                    status: 'all',
                    showJoinedOnly: false,
                    searchQuery: '',
                    selectedCategories: [],
                    selectedUniversities: [],
                    priceFilter: 'all',
                    capacityFilter: 'all',
                    languageFilter: [],
                    locationFilter: 'all',
                  });
                  // Refresh events
                  onRefresh();
                }}
                style={{marginTop: 16}}
                icon="refresh"
              >
                Filtrelemeleri Sıfırla
              </Button>
            )}
          </View>
        }
        renderItem={({ item }) => {
          console.log(`Rendering event card for: ${item.title || 'Untitled'} (ID: ${item.id})`);
          return (
            <View style={styles.eventCardContainer}>
              <StudentEventCard
                event={{
                  ...item,
                  categories: item.categories || [],  // Ensure categories is always an array
                }}
                onNavigate={() => handleViewEventDetails(item.id)}
                onJoin={async (eventId: string, userId: string) => await handleJoinEvent(eventId)}
                onUnjoin={async (eventId: string, userId: string) => await handleUnjoinEvent(eventId)}
                onShare={async (eventId: string) => await handleShareEvent(eventId)}
                onLike={async (eventId: string) => await handleLikeEvent(eventId)}
                showOrganizer={true}
                isExpanded={expandedEventId === item.id}
                isUserJoined={joinedEvents.includes(item.id)}
              />
            </View>
          );
        }}
        keyExtractor={item => item.id}
        contentContainerStyle={filteredEventsForDisplay.length === 0 
          ? { flex: 1, justifyContent: 'center' } 
          : { paddingBottom: 80 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={PRIMARY_COLOR}
          />
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={PRIMARY_COLOR} />
            </View>
          ) : null
        }
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.1}
      />
      
      {/* Bottom Sheet Render */}
      {renderBottomSheet()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    zIndex: 10,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1976D2', // PRIMARY_COLOR
    letterSpacing: 0.3,
  },
  searchBar: {
    height: 42,
    borderRadius: 20,
    elevation: 0,
    backgroundColor: '#f5f5f5',
    marginTop: 4,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipScrollView: {
    flexGrow: 0,
  },
  chip: {
    marginRight: 8,
    height: 32,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sortButtonActive: {
    backgroundColor: '#1976D2',
    borderColor: '#1976D2',
  },
  sortButtonText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  sortButtonTextActive: {
    color: '#fff',
  },
  filterTagsContainer: {
    marginTop: 8,
  },
  filterTagsContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterChip: {
    marginRight: 8,
    marginBottom: 8,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e3f2fd',
    shadowColor: '#1976D2',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterButtons: {
    flexDirection: 'row',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  eventCard: {
    marginTop: 8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: '100%',
    alignSelf: 'center',
  },
  footerLoader: {
    padding: 16,
    alignItems: 'center',
  },
  filterSection: {
    marginBottom: 16,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  filterChipActive: {
    backgroundColor: '#e3f2fd',
  },
  filterChipLabel: {
    fontSize: 12,
  },
  bottomSheetHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#e0e0e0',
    alignSelf: 'center',
    marginVertical: 8,
  },
  bottomSheetTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'left',
    color: '#1976D2',
    letterSpacing: 0.5,
  },
  bottomSheetContent: {
    padding: 16,
  },
  applyButtonContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  applyButton: {
    borderRadius: 25,
    marginTop: 10,
    height: 50,
    justifyContent: 'center',
    shadowColor: '#1976D2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  // Scroll Styles for Bottom Sheets
  scrollableContent: {
    flex: 1,
    paddingHorizontal: 20,
    maxHeight: 550,
  },
  scrollContentContainer: {
    paddingBottom: 80,
    flexGrow: 1,
    paddingTop: 10,
  },
  horizontalFiltersContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    marginVertical: 12,
    marginHorizontal: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  horizontalFiltersScroll: {
    paddingVertical: 12,
  },
  horizontalFiltersContent: {
    paddingHorizontal: 16,
    paddingRight: 20,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 10,
    marginVertical: 4,
    backgroundColor: '#f5f5f5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#eaeaea',
  },
  filterButtonActive: {
    backgroundColor: '#1976D2',
    borderColor: '#1976D2',
    shadowColor: '#1976D2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  filterButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    color: '#333',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  filterBadge: {
    backgroundColor: '#e53935',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  quickActionButton: {
    flex: 1,
    marginRight: 8,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    minHeight: 65,
  },
  categoryCardSelected: {
    backgroundColor: '#1976D2',
    borderColor: '#1976D2',
    shadowColor: '#1976D2',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  categoryCardText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    color: '#333',
  },
  categoryCardTextSelected: {
    color: '#fff',
  },
  categoryCheckIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  universityItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
  },
  universityItemSelected: {
    backgroundColor: '#1976D2', // theme.colors.primary yerine sabit renk değeri
  },
  universityInfo: {
    flex: 1,
    marginLeft: 16,
  },
  universityName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  universityNameSelected: {
    color: '#fff',
  },
  universityCity: {
    fontSize: 14,
    color: '#666',
  },
  universityCitySelected: {
    color: '#fff',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#f5f5f5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  optionItemSelected: {
    backgroundColor: '#1976D2',
    shadowColor: '#1976D2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  optionItemContent: {
    flex: 1,
    marginLeft: 16,
  },
  optionItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  optionItemTitleSelected: {
    color: '#fff',
  },
  optionItemDesc: {
    fontSize: 14,
    color: '#666',
  },
  optionItemDescSelected: {
    color: '#fff',
  },
  bottomSheetOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
    zIndex: 1000, // Added higher z-index to ensure it appears above everything else
    elevation: 10, // Added elevation for Android
  },
  bottomSheetBackdrop: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  bottomSheetModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    elevation: 24,
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 16,
    maxHeight: '90%', 
    minHeight: '60%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  bottomSheetContainer: {
    flex: 1,
    minHeight: 550,
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 16,
  },
  bottomSheetFooter: {
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  clearAllButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 4,
    backgroundColor: '#f5f5f5',
  },
  clearAllButtonText: {
    color: '#1976D2',
    fontSize: 12,
    fontWeight: 'bold',
  },
  eventCardContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    width: '100%',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  selectionCounterContainer: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#f0f7ff',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#1976D2',
  },
  selectionCounterText: {
    color: '#1976D2',
    fontWeight: '600',
  },
  quickActionButtonLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  categoryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryIconContainerSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  currentSortContainer: {
    backgroundColor: '#f0f7ff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    marginHorizontal: 16,
  },
  currentSortLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  currentSortValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentSortText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    marginLeft: 8,
  },
  selectedFiltersContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  selectedFiltersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  selectedFiltersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
    marginLeft: 6,
    flex: 1,
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
  },
  clearFiltersText: {
    fontSize: 12,
    color: '#666',
    marginRight: 4,
  },
  chipsScrollView: {
    flexGrow: 0,
    marginTop: 4,
  },
  chipsScrollViewContent: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
});

export default EventsScreen;
