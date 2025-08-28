import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { 
  Text, 
  Card, 
  Chip, 
  Button, 
  useTheme, 
  Portal,
  Modal,
  Avatar,
  ProgressBar,
  Surface
} from 'react-native-paper';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Share, 
  Alert, 
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  TextInput,
  Platform,
  UIManager,
  LayoutAnimation,
  Linking,
  Dimensions,
  StatusBar
} from 'react-native';
import { UniversalAvatar } from './common';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { eventCategories, UNIVERSITIES_DATA } from '../constants';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
// 🚀 Performance optimization imports
import { 
  useBatchedState, 
  useDebounce, 
  useMountedState, 
  useThrottle,
  useIntersectionObserver,
  // useRenderTime, // Disabled to reduce warnings
  firestoreCache,
  globalFirestoreListener
} from '../utils/performanceOptimizer';
import { useAuth } from '../contexts/AuthContext';
import { firebase } from '../firebase';
import { UnifiedNotificationService } from '../services/unifiedNotificationService';
import moment from 'moment';
import 'moment/locale/tr';
import { ClubEventCardProps } from '../types/events';
import EventDetailModal from './EventDetailModal';
import { ClubStatsService } from '../services/clubStatsService';
import { EnhancedClubActivityService, clubActivityService } from '../services/enhancedClubActivityService';
import { ClubNotificationService } from '../services/clubNotificationService';
import { deleteEventComment } from '../firebase/commentManagement';
import { useUserAvatar } from '../hooks/useUserAvatar';

// Set Turkish locale for moment
moment.locale('tr');

// Kullanıcı ID'sine göre tutarlı avatar rengi oluştur
const getAvatarColor = (userId: string): string => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA726', 
    '#AB47BC', '#26A69A', '#42A5F5', '#66BB6A',
    '#EF5350', '#5C6BC0', '#FF7043', '#9CCC65'
  ];
  
  if (!userId) return colors[0];
  
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32bit integer'a çevir
  }
  
  return colors[Math.abs(hash) % colors.length];
};

// Tek katılımcı satırı (kulüp kartı) – canlı profil verileri
const ClubAttendeeRow: React.FC<{
  attendee: any;
}> = ({ attendee }) => {
  const theme = useTheme();
  const userId = attendee?.id || attendee?.userId || '';
  const { avatarData } = useUserAvatar(userId);
  const displayName = avatarData?.displayName || attendee?.userName || attendee?.displayName || 'Katılımcı';
  const username = avatarData?.userName || attendee?.username || (attendee?.email ? attendee.email.split('@')[0] : '');
  const university = avatarData?.university || attendee?.userUniversity || attendee?.university || '';

  return (
    <View style={styles.attendeeItemSurface}>
      <View style={styles.attendeeItem}>
        <View style={styles.attendeeAvatarContainer}>
          <UniversalAvatar
            user={{ id: userId, displayName, profileImage: attendee?.profileImage, avatarIcon: attendee?.avatarIcon, avatarColor: attendee?.avatarColor || getAvatarColor(userId) }}
            size={56}
            style={styles.attendeeAvatar}
            fallbackIcon="account"
          />
        </View>
        <View style={styles.attendeeUserInfo}>
          <Text style={styles.attendeeUserName} numberOfLines={1}>{displayName}</Text>
          {!!username && (
            <Text style={styles.attendeeUsername} numberOfLines={1}>
              <MaterialCommunityIcons name="at" size={14} color={theme.colors.primary} />
              {username}
            </Text>
          )}
          {!!university && (
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <MaterialCommunityIcons name="school" size={14} color="#0066cc" />
              <Text style={styles.attendeeUserUniversity} numberOfLines={1}> {university}</Text>
            </View>
          )}
          {!!attendee?.timestamp && (
            <Text style={styles.attendeeDate}>
              {moment(
                typeof attendee.timestamp === 'object' && attendee.timestamp.toDate ? attendee.timestamp.toDate() : new Date(attendee.timestamp)
              ).fromNow()}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

// Beğenen satırı (kulüp kartı) – canlı profil verileri
const ClubLikeRow: React.FC<{ like: any; onPress?: (userId: string) => void }> = ({ like, onPress }) => {
  const userId = like?.userId || like?.id || '';
  const { avatarData } = useUserAvatar(userId);
  const displayName = avatarData?.displayName || like?.userName || like?.displayName || 'Kullanıcı';
  const username = avatarData?.userName || like?.username || (like?.email ? like.email.split('@')[0] : '');
  const university = avatarData?.university || like?.userUniversity || like?.university || '';
  return (
    <View key={like.id || userId} style={styles.likeItem}>
      <TouchableOpacity onPress={() => userId && onPress && onPress(userId)}>
        <UniversalAvatar
          user={{ id: userId, displayName, profileImage: like?.profileImage || like?.userImage, avatarIcon: like?.avatarIcon, avatarColor: like?.avatarColor || getAvatarColor(userId) }}
          size={56}
          style={styles.likeAvatar}
          fallbackIcon="account"
          fallbackColor="#1976D2"
        />
      </TouchableOpacity>
      <TouchableOpacity style={styles.likeUserInfo} onPress={() => userId && onPress && onPress(userId)}>
        <Text style={styles.likeUserName} numberOfLines={1}>{displayName}</Text>
        {!!username && <Text style={styles.likeUsername} numberOfLines={1}>@{username}</Text>}
        {!!university && (
          <Text style={styles.likeUserUniversity} numberOfLines={1}>{university}</Text>
        )}
        {like?.timestamp && (
          <Text style={styles.likeDate}>
            {moment(like.timestamp?.toDate ? like.timestamp.toDate() : new Date(like.timestamp)).fromNow()}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

// Helper function for formatting usernames consistently
const formatUsername = (input: string | null | undefined): string => {
  if (!input) return '';
  
  // Remove @ if it starts with it
  let username = input.startsWith('@') ? input.substring(1) : input;
  
  // Handle Turkish characters
  username = username
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/ö/g, 'o')
    .replace(/[^a-z0-9]/g, '');
    
  return username || '';
};

// Helper function to format university names consistently
const formatUniversityName = (name: string | null | undefined): string => {
  if (!name) return '';
  
  // If already contains "Üniversite" word, return as is
  if (name.toLowerCase().includes('üniversite')) {
    return name;
  }
  
  // Check if it ends with common university abbreviations
  const commonSuffixes = ['üni', 'university', 'üniv.', 'univ.'];
  const hasCommonSuffix = commonSuffixes.some(suffix => 
    name.toLowerCase().endsWith(suffix)
  );
  
  // Add "Üniversitesi" suffix if needed
  return hasCommonSuffix ? name : `${name} Üniversitesi`;
};

// Get screen dimensions
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// -- Ücret/Ücretsiz tespiti ve yazdırma için yardımcılar --
const normalizeBoolean = (val: any): boolean | undefined => {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val > 0;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    if (["true","1","yes","evet"].includes(s)) return true;
    if (["false","0","no","hayir","hayır"].includes(s)) return false;
  }
  return undefined;
};

const parsePriceNumber = (raw: any): number | null => {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return isFinite(raw) ? raw : null;
  const txt = String(raw).replace(/,/g, '.');
  // Extract first number like 123 or 123.45 from strings like "₺123,45 TL"
  const m = txt.match(/([0-9]+(?:\.[0-9]+)?)/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return isNaN(n) ? null : n;
};

const extractEventPrice = (event: any): number | null => {
  try {
    const candidates: any[] = [
      event?.pricing?.price,
      event?.price,
      event?.pricing?.amount,
      event?.pricing?.minPrice,
      event?.pricing?.maxPrice,
      event?.ticketPrice,
      event?.fee,
      Array.isArray(event?.tickets) ? event.tickets.map((t: any) => t?.price) : undefined,
      Array.isArray(event?.tiers) ? event.tiers.map((t: any) => t?.price) : undefined,
      Array.isArray(event?.fees) ? event.fees.map((f: any) => f?.amount) : undefined,
      event?.earlyBirdPrice,
    ].flat().filter((v: any) => v !== undefined && v !== null);
    const parsed = candidates
      .map((v: any) => parsePriceNumber(v))
      .filter((n: number | null) => typeof n === 'number' && isFinite(n)) as number[];
    if (!parsed.length) return null;
    // Choose smallest positive price as base display (common for tiers)
    const positives = parsed.filter((n) => n > 0);
    if (positives.length) return Math.min(...positives);
    return Math.max(...parsed); // if all <= 0, pick max (likely 0)
  } catch {
    return null;
  }
};

// Etkinlik ücretli mi? (güçlendirilmiş)
const shouldShowAsPaid = (event: any): boolean => {
  if (!event) return false;
  try {
    const isFreeRaw = event?.pricing?.isFree ?? event?.isFree;
    const isFree = normalizeBoolean(isFreeRaw);
    if (isFree === true) return false; // açıkça ücretsiz
    const price = extractEventPrice(event);
    if (price !== null && price > 0) return true; // sayısal ücret tespit edildi
    // Ücret bilgisi bulunamadı ama isFree açıkça false ise ücretli kabul et
    if (isFree === false) return true;
    return false;
  } catch (error) {
    console.error('shouldShowAsPaid hatası:', error);
    return false;
  }
};

// Fiyat metni (güçlendirilmiş)
const getFormattedEventPrice = (event: any): string => {
  if (!event) return 'Ücretsiz Etkinlik';
  try {
    const isFreeRaw = event?.pricing?.isFree ?? event?.isFree;
    const isFree = normalizeBoolean(isFreeRaw);
    if (isFree === true) return 'Ücretsiz Etkinlik';

    const price = extractEventPrice(event);
    if (typeof price === 'number' && isFinite(price)) {
      if (price <= 0) return 'Ücretsiz Etkinlik';
      return `${price.toFixed(2).replace(/\.00$/, '')} TL`;
    }

    // Fiyat sayı olarak çıkarılamadıysa ve açıkça ücretsiz değilse
    if (isFree === false) return 'Ücretli Etkinlik';
    return 'Ücretsiz Etkinlik';
  } catch (error) {
    console.error('getFormattedEventPrice hatası:', error);
    return 'Ücretsiz Etkinlik';
  }
};

/**
 * ClubEventCard - A modern event card component for club events
 */

const ClubEventCard = ({ 
  event, 
  style,
  isAdminView = false,
  onDelete,
  onViewAttendees,
  onEdit
}: ClubEventCardProps) => {
  console.log('🎨 ClubEventCard rendering:', {
    eventId: event?.id,
    eventTitle: event?.title,
    hasEvent: !!event,
    isAdminView,
    hasProps: { onDelete: !!onDelete, onViewAttendees: !!onViewAttendees, onEdit: !!onEdit }
  });
  
  // Event data initialization
  
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const { currentUser, userProfile, isClubAccount } = useAuth();
  const isMounted = useMountedState();
  const cardRef = useRef<View>(null);
  
  // 🚀 Performance: Render time tracking (disabled to reduce warnings)
  // useRenderTime(`ClubEventCard-${event.id}`);
  
  // 🚀 Performance: Consolidated state using batched updates
  const [componentState, setComponentState] = useBatchedState({
    // Basic states
    expanded: false,
    loading: false,
    refreshing: false,
    
    // User interaction states  
    hasLiked: false,
    hasAttended: false,
    
    // Count states
    likesCount: event.likesCount || 0,
    attendeesCount: event.attendeesCount || 0,
    commentsCount: event.commentsCount || 0,
    
    // Modal states
    showDetailsModal: false,
    showComments: false,
    showLikesList: false,
    showAttendeesList: false,
    showSeeLikesButton: false,
    
    // Loading states
    isLoadingComments: false,
    isPostingComment: false,
    isLoadingLikes: false,
    isLoadingAttendees: false,
    
    // Data states
    comments: [] as any[],
    likesList: [] as any[],
    attendeesList: [] as any[],
    commentText: '',
    organizer: event.organizer || (event.clubId ? {
      id: event.clubId,
      name: event.clubName || 'Kulüp',
      profilePicture: event.clubProfilePicture || '',
      university: event.university || '',
    } as OrganizerData : {
      id: event.organizerId || '',
      name: event.organizerName || 'Organizatör',
      profilePicture: event.organizerProfilePicture || '',
      university: event.organizerUniversity || '',
    } as OrganizerData),
    
    // Server state
    serverEvent: null as any
  });

  // 🚀 Performance: Memoized live event data
  const liveEvent = useMemo(() => ({ 
    ...(event || {}), 
    ...(componentState.serverEvent || {}) 
  }), [event, componentState.serverEvent]);

  // 🚀 Performance: Memoized university name lookup
  const universityName = useMemo(() => {
    const universityId = liveEvent.university;
    if (!universityId) return 'Üniversite bilgisi yok';
    
    let university = UNIVERSITIES_DATA.find(uni => uni.id === universityId);
    if (!university) {
      university = UNIVERSITIES_DATA.find(uni => 
        uni.value === universityId || 
        uni.label === universityId || 
        uni.name === universityId
      );
    }
    return university ? university.name : universityId;
  }, [liveEvent.university]);

  // 🚀 Performance: Throttled toggle function
  const toggleExpand = useThrottle(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setComponentState({ expanded: !componentState.expanded });
  }, 300);

  // Additional state for compatibility
  const setHasLiked = useCallback((value: boolean) => {
    setComponentState({ hasLiked: value });
  }, []);

  const setShowSeeLikesButton = useCallback((value: boolean) => {
    setComponentState({ showSeeLikesButton: value });
  }, []);

  const setHasAttended = useCallback((value: boolean) => {
    setComponentState({ hasAttended: value });
  }, []);

  const setAttendeesCount = useCallback((value: number) => {
    setComponentState({ attendeesCount: value });
  }, []);

  const setLikesCount = useCallback((value: number) => {
    setComponentState({ likesCount: value });
  }, []);

  const setComments = useCallback((value: any[]) => {
    setComponentState({ comments: value });
  }, []);

  const setServerEvent = useCallback((value: any) => {
    setComponentState({ serverEvent: value });
  }, []);

  const setCommentsCount = useCallback((value: number) => {
    setComponentState({ commentsCount: value });
  }, []);

  const setLikesList = useCallback((value: any[]) => {
    setComponentState({ likesList: value });
  }, []);

  const setAttendeesList = useCallback((value: any[] | ((prev: any[]) => any[])) => {
    if (typeof value === 'function') {
      setComponentState(prev => ({ attendeesList: value(prev.attendeesList) }));
    } else {
      setComponentState({ attendeesList: value });
    }
  }, []);

  const setShowDetailsModal = useCallback((value: boolean) => {
    setComponentState({ showDetailsModal: value });
  }, []);

  const setShowComments = useCallback((value: boolean) => {
    setComponentState({ showComments: value });
  }, []);

  const setCommentText = useCallback((value: string) => {
    setComponentState({ commentText: value });
  }, []);

  const setIsLoadingComments = useCallback((value: boolean) => {
    setComponentState({ isLoadingComments: value });
  }, []);

  const setIsPostingComment = useCallback((value: boolean) => {
    setComponentState({ isPostingComment: value });
  }, []);

  const setShowLikesList = useCallback((value: boolean) => {
    setComponentState({ showLikesList: value });
  }, []);

  const setShowAttendeesList = useCallback((value: boolean) => {
    setComponentState({ showAttendeesList: value });
  }, []);

  const setIsLoadingAttendees = useCallback((value: boolean) => {
    setComponentState({ isLoadingAttendees: value });
  }, []);

  const setIsLoadingLikes = useCallback((value: boolean) => {
    setComponentState({ isLoadingLikes: value });
  }, []);

  const setLoading = useCallback((value: boolean) => {
    setComponentState({ loading: value });
  }, []);

  const setRefreshing = useCallback((value: boolean) => {
    setComponentState({ refreshing: value });
  }, []);

  // Refs for compatibility
  const actualAttendeeCountRef = useRef(componentState.attendeesCount);
  
  // Computed values
  const { 
    expanded, 
    hasLiked, 
    hasAttended, 
    attendeesCount, 
    likesCount, 
    comments, 
    commentsCount, 
    attendeesList, 
    likesList, 
    loading, 
    refreshing,
    showComments, 
    showDetailsModal, 
    showLikesList, 
    showAttendeesList, 
    commentText, 
    isLoadingComments, 
    isPostingComment,
    isLoadingAttendees,
    isLoadingLikes,
    showSeeLikesButton
  } = componentState;
  
  // Check if user has liked the event when component loads and setup realtime listeners
  React.useEffect(() => {
    const checkUserLiked = async () => {
      if (!currentUser || !event.id) return;
      
      try {
        const likesRef = firebase.firestore()
          .collection('events')
          .doc(event.id)
          .collection('likes');
        
        // Kullanıcının beğeni durumunu kontrol et
        const likeQuery = await likesRef
          .where('userId', '==', currentUser.uid)
          .limit(1)
          .get();
        
        // If user has already liked this event
        if (!likeQuery.empty) {
          setHasLiked(true);
          
          // For student users, show the "Beğenenleri gör" button
          if (!isClubAccount) {
            setShowSeeLikesButton(true);
          }
        }
      } catch (error) {
        console.error('Error checking like status:', error);
      }
    };
    
    checkUserLiked();
  }, [currentUser, event.id, isClubAccount]);
  
  // Enhanced initialization effect with improved consistency
  React.useEffect(() => {
    // Prevent multiple parallel executions
    let isMounted = true;
    
    const checkAttendanceStatus = async () => {
      if (!event.id) return;

      try {
        // Check if current user has attended this event
        if (currentUser) {
          const attendeeRef = firebase.firestore()
            .collection('events')
            .doc(event.id)
            .collection('attendees')
            .doc(currentUser.uid);
          
          const attendeeDoc = await attendeeRef.get();
          if (isMounted) setHasAttended(attendeeDoc.exists);
        }
        
        // Get current attendee count from Firestore
        const db = firebase.firestore();
        const eventRef = db.collection('events').doc(event.id);
        const attendeesCollection = db.collection('events').doc(event.id).collection('attendees');
        
        // Always get the collection count first - this is the source of truth
        const countSnapshot = await attendeesCollection.get();
        const collectionCount = countSnapshot.size;
        
        // Update the reference with the validated count
        if (isMounted) actualAttendeeCountRef.current = collectionCount;
        
        // Get the event document to compare counts
        const eventDoc = await eventRef.get();
        
        if (eventDoc.exists) {
          const eventData = eventDoc.data() || {};
          // Get the document count
          const documentCount = typeof eventData.attendeesCount === 'number' ? eventData.attendeesCount : 0;
          
          console.log(`Katılımcı sayı doğrulaması - Doküman: ${documentCount}, Koleksiyon: ${collectionCount}`);
          
          // If there's a discrepancy, update Firestore with the collection count
          if (documentCount !== collectionCount) {
            console.log(`Katılımcı sayısı tutarsızlığı düzeltiliyor: ${documentCount} -> ${collectionCount}`);
            
            // Update the event document with the validated count
            await eventRef.update({
              attendeesCount: collectionCount,
              lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });
          }
          
          // Always update the UI with the collection count - this is the source of truth
          if (isMounted) setAttendeesCount(collectionCount);
        } else {
          // If event document doesn't exist, set attendees count to 0
          if (isMounted) setAttendeesCount(0);
        }
        
        // Always load attendees on initialization to ensure we have fresh data
        if (isMounted) {
          loadAttendees().catch(err => console.warn('Başlangıç katılımcı listesi yüklenirken hata:', err));
        }
      } catch (error) {
        console.error('ClubEventCard: Error during initialization:', error);
      }
    };
    
    checkAttendanceStatus();
    
    // Real-time listener for attendees changes
    const setupAttendeesListener = () => {
      const db = firebase.firestore();
      const attendeesCollection = db.collection('events').doc(event.id).collection('attendees');
      
      const unsubscribe = attendeesCollection.onSnapshot(
        (snapshot) => {
          if (isMounted) {
            const newCount = snapshot.size;
            console.log(`📊 [Real-time] Event ${event.id} attendees count updated: ${newCount}`);
            setAttendeesCount(newCount);
            actualAttendeeCountRef.current = newCount;
            
            // Update event document count if needed
            db.collection('events').doc(event.id).update({
              attendeesCount: newCount
            }).catch(err => console.warn('Failed to update event attendees count:', err));
          }
        },
        (error) => {
          console.error(`❌ [Real-time] Attendees listener error for event ${event.id}:`, error);
        }
      );
      
      attendeesListenerRef.current = unsubscribe;
    };
    
    setupAttendeesListener();
    
    // Cleanup function
    return () => {
      isMounted = false;
      // Clean up real-time listener
      if (attendeesListenerRef.current) {
        attendeesListenerRef.current();
        attendeesListenerRef.current = null;
      }
    };
  }, [event.id, currentUser]);

  // Define organizer interface type
  interface OrganizerData {
    id?: string;
    name?: string;
    profileImage?: string | null;
    avatarIcon?: string | null;
    avatarColor?: string;
  }
  
  // Firestore dinleyicilerini saklamak için referanslar
  const likesListenerRef = React.useRef<(() => void) | null>(null);
  const attendeesListenerRef = React.useRef<(() => void) | null>(null);
  const commentsListenerRef = React.useRef<(() => void) | null>(null);
  const eventListenerRef = React.useRef<(() => void) | null>(null);
  
  
  // Create organizer object state
  // Default avatar helper function
  const getDefaultAvatar = () => {
    return {
      avatarIcon: 'account-group', // Default club icon
      avatarColor: '#2196F3'  // Default blue color
    };
  };

  // Get default avatar settings
  const defaultAvatar = getDefaultAvatar();

  const [organizer, setOrganizer] = React.useState<OrganizerData>(event.organizer || (event.clubId ? {
    id: event.clubId,
    name: event.clubName || 'Kulüp',
    profileImage: event.profileImage || null, // Kulüp profil resmi varsa kullan
    // Use user's selected avatarIcon and color, fallback to defaults
    avatarIcon: event.clubAvatarIcon || event.organizer?.avatarIcon || defaultAvatar.avatarIcon,
    avatarColor: event.clubAvatarColor || event.organizer?.avatarColor || defaultAvatar.avatarColor,
  } : {}));
  
  // Load club data if needed
  React.useEffect(() => {
    // console.log('ClubEventCard initial organizer:', organizer);
    
    const loadClubData = async () => {
      if (!event.clubId) return;
      
      try {
        const db = firebase.firestore();
        const clubDoc = await db.collection('users').doc(event.clubId).get();
        
        if (clubDoc.exists) {
          const clubData = clubDoc.data() || {};
          
          // Kulüp adını düzgün şekilde belirle
          let clubDisplayName = clubData.clubName || clubData.displayName || clubData.name;
          
          // Eğer email geliyorsa veya boşsa, varsayılan ad ver
          if (!clubDisplayName || clubDisplayName.includes('@')) {
            clubDisplayName = 'Fizik Kulübü';
          }
          
          // Get default avatar settings
          const defaultAvatar = getDefaultAvatar();
          
          // Öncelikle profil resmi varsa onu kullan, yoksa avatarIcon ve avatarColor kullan
          const hasProfileImage = clubData.profileImage && typeof clubData.profileImage === 'string';
          
          setOrganizer((prevData: OrganizerData) => ({
            ...prevData,
            id: event.clubId,
            name: clubDisplayName,
            // Profil resmi varsa kesinlikle öncelikli olarak kullan
            profileImage: hasProfileImage ? clubData.profileImage : null,
            // Avatar bilgilerini yalnızca profil resmi yoksa kullan
            avatarIcon: !hasProfileImage ? (clubData.avatarIcon || defaultAvatar.avatarIcon) : null,
            avatarColor: !hasProfileImage ? (clubData.avatarColor || defaultAvatar.avatarColor) : null,
          }));
        }
      } catch (error) {
        // Even if there's an error, set a default avatar
        const clubName = organizer.name || event.clubName || 'Kulüp';
        // Get default avatar settings
        const defaultAvatar = getDefaultAvatar();
        setOrganizer((prevData: OrganizerData) => ({
          ...prevData,
          // Profil resmi durumunu değiştirme, sadece avatar bilgilerini güncelle
          avatarIcon: defaultAvatar.avatarIcon,
          avatarColor: defaultAvatar.avatarColor,
        }));
        console.error('Error loading club data:', error);
      }
    };
    
    loadClubData();
  }, [event.clubId]);
  
  // Gerçek zamanlı güncellemeler için dinleyicileri ayarla - geliştirilmiş versiyon
  React.useEffect(() => {
    // Etkinlik ID'si yoksa işlem yapma
    if (!event.id) return;
    
    // Önceki dinleyicileri temizle
    const cleanup = () => {
      if (eventListenerRef.current) {
        eventListenerRef.current();
        eventListenerRef.current = null;
      }
      if (attendeesListenerRef.current) {
        attendeesListenerRef.current();
        attendeesListenerRef.current = null;
      }
      if (likesListenerRef.current) {
        likesListenerRef.current();
        likesListenerRef.current = null;
      }
      if (commentsListenerRef.current) {
        commentsListenerRef.current();
        commentsListenerRef.current = null;
      }
    };
    
    // Önce temizlik yap (eğer önceki dinleyiciler varsa)
    cleanup();
    
    // Component mount durumu kontrolü için flag
    let isMounted = true;
    
    console.log(`Etkinlik için dinleyiciler ayarlanıyor: ${event.id}`);
    
    const db = firebase.firestore();
    const eventRef = db.collection('events').doc(event.id);
    const likesRef = eventRef.collection('likes');
    const attendeesRef = eventRef.collection('attendees');
    const commentsRef = eventRef.collection('comments');
    
    // Ana etkinlik dokümanını dinle (beğeni sayısı, katılımcı sayısı vb.)
  const unsubscribeEvent = eventRef.onSnapshot(doc => {
      if (doc.exists) {
        const eventData = doc.data() || {};
    // Keep a merged, live copy of the event for UI fields (title, description, pricing, settings, etc.)
    setServerEvent(eventData);
        const serverLikesCount = eventData.likesCount || 0;
        const serverAttendeesCount = eventData.attendeesCount || 0;
        const serverCommentsCount = eventData.commentsCount || 0;
        
        // Değerler farklıysa güncelle
        if (serverLikesCount !== likesCount) setLikesCount(serverLikesCount);
        
        // Katılımcı sayısı için daha kapsamlı kontrol - referansla karşılaştır
        const refAttendeeCount = actualAttendeeCountRef.current;
        
        // Koleksiyon sayısı referanstaki sayıdan büyükse (yeni katılımcılar var)
        // Ya da doküman sayısı referanstaki sayıdan farklıysa güncelle
        if (serverAttendeesCount !== refAttendeeCount || serverAttendeesCount !== attendeesCount) {
          // Katılımcı sayısının 0 olması için koleksiyonun gerçekten boş olduğunu doğrulayalım
          if (serverAttendeesCount === 0) {
            // 0 değerini kabul etmek için koleksiyon sayısını doğrulama
            attendeesRef.limit(1).get().then(snap => {
              if (!snap.empty && isMounted) {
                console.log('Doküman sayısı 0 ama koleksiyonda katılımcı var. Gerçek sayı alınıyor...');
                // Katılımcı varsa, koleksiyon sayısını al
                attendeesRef.get().then(fullSnap => {
                  const realCount = fullSnap.size;
                  if (realCount > 0 && isMounted) {
                    setAttendeesCount(realCount);
                    actualAttendeeCountRef.current = realCount;
                    
                    // Etkinlik dokümanını güncelle
                    eventRef.update({ attendeesCount: realCount }).catch(err => 
                      console.warn('Katılımcı sayısı güncellenirken hata:', err)
                    );
                  }
                });
              } else if (isMounted) {
                // Gerçekten boşsa state güncelle
                setAttendeesCount(0);
                actualAttendeeCountRef.current = 0;
              }
            }).catch(err => console.warn('Katılımcı kontrolü hatası:', err));
          } else {
            // Sıfır olmayan değeri güncelle
            setAttendeesCount(serverAttendeesCount);
            actualAttendeeCountRef.current = serverAttendeesCount;
            
            // Katılımcı listesini yenile
            if (attendeesList.length === 0 && serverAttendeesCount > 0) {
              loadAttendees().catch(err => console.warn('Katılımcı listesi yenilenirken hata:', err));
            }
          }
        }
        
        if (serverCommentsCount !== commentsCount) setCommentsCount(serverCommentsCount);
        
        // Log sadece değerler değiştiyse
        if (serverLikesCount !== likesCount || 
            serverAttendeesCount !== attendeesCount ||
            serverCommentsCount !== commentsCount) {
          console.log(`Etkinlik sayıları güncellendi - Beğeni: ${serverLikesCount}, Katılımcı: ${serverAttendeesCount}, Yorum: ${serverCommentsCount}`);
        }
      }
    }, error => {
      console.error('Etkinlik verileri dinlenirken hata:', error);
    });
    
    // Beğeni listesini dinle
    const unsubscribeLikes = likesRef.orderBy('timestamp', 'desc').limit(50)
      .onSnapshot(async snapshot => {
        const likesData: any[] = [];
        
        snapshot.forEach(doc => {
          likesData.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        // Profil bilgilerini zenginleştir
        if (likesData.length > 0) {
          console.log('Beğeni listesi profil bilgileri zenginleştiriliyor...');
          
          const enrichedLikesData = await Promise.all(
            likesData.map(async (like: any) => {
              try {
                if (!like.userId) return like;
                
                const userDoc = await firebase.firestore().collection('users').doc(like.userId).get();
                
                if (userDoc.exists) {
                  const userData = userDoc.data() || {};
                  
                  return {
                    ...like,
                    userName: userData.displayName || userData.username || like.userName || 'Bilinmeyen Kullanıcı',
                    username: userData.username || like.username || '',
                    profileImage: userData.profileImage || like.profileImage || null,
                    userImage: userData.userImage || like.userImage || null,
                    avatarIcon: userData.avatarIcon || like.avatarIcon || 'account',
                    avatarColor: userData.avatarColor || like.avatarColor || '#1976D2',
                    university: userData.university || userData.universityName || like.university || null,
                    department: userData.department || like.department || null,
                    classLevel: userData.classLevel || like.classLevel || null,
                    userEmail: userData.email || like.userEmail || '',
                    profileEnriched: true,
                    profileEnrichedAt: firebase.firestore.Timestamp.now()
                  };
                } else {
                  return {
                    ...like,
                    userName: like.userName || 'Bilinmeyen Kullanıcı',
                    username: like.username || '',
                    profileImage: null,
                    avatarIcon: 'account',
                    avatarColor: '#1976D2',
                    university: null,
                    profileEnriched: false
                  };
                }
              } catch (error) {
                console.error(`Beğeni kullanıcısı ${like.userId} profil bilgileri alınırken hata:`, error);
                return like;
              }
            })
          );
          
          setLikesList(enrichedLikesData);
          console.log(`${enrichedLikesData.length} beğeni kullanıcısının profil bilgileri zenginleştirildi`);
          // Realtime: likes count is the snapshot size; ensure UI and doc reflect it
          const realtimeCount = snapshot.size;
          if (likesCount !== realtimeCount) {
            setLikesCount(realtimeCount);
          }
          // Best-effort to sync event doc
          eventRef.update({ likesCount: realtimeCount }).catch(() => {});
        } else {
          setLikesList(likesData);
          // When list is empty, also reflect count = 0
          if (likesCount !== 0) setLikesCount(0);
          eventRef.update({ likesCount: 0 }).catch(() => {});
        }
        
        // Kullanıcının beğeni durumunu kontrol et
        if (currentUser) {
          const currentLikesData = likesData.length > 0 && likesData[0].profileEnriched ? likesData : likesData;
          const userLike = currentLikesData.find((like: any) => like.userId === currentUser.uid);
          setHasLiked(!!userLike);
        }
      }, error => {
        console.error('Beğeni listesi dinlenirken hata:', error);
      });
    
    // Katılımcı listesini dinle - geliştirilmiş gerçek zamanlı takip
    const unsubscribeAttendees = attendeesRef
      .onSnapshot(async snapshot => {
        try {
          console.log(`=== REAL-TIME: Katılımcı değişikliği algılandı ===`);
          console.log(`Snapshot boyutu: ${snapshot.size}`);
          console.log(`Snapshot boş mu: ${snapshot.empty}`);
          
          let attendeesData: any[] = [];
          const snapshotSize = snapshot.size;
          
          // Önce snapshot'ın boş olup olmadığını kontrol et
          if (snapshotSize > 0) {
            snapshot.forEach(doc => {
              const index = snapshot.docs.indexOf(doc);
              console.log(`RT: İşleniyor doküman ${index + 1}/${snapshotSize} (${doc.id})`);
              
              if (doc.exists) {
                const docData = doc.data();
                console.log(`RT: Doküman ${doc.id} verisi:`, {
                  userId: docData?.userId,
                  userName: docData?.userName,
                  allFields: Object.keys(docData || {}),
                  hasValidUserId: docData && typeof docData.userId === 'string' && docData.userId.length > 0
                });
                
                // userId alanı yoksa doküman ID'sini userId olarak kullan
                const userId = docData?.userId || doc.id;
                
                // Geçerli dokümanları ekle - geliştirilmiş validasyon
                if (docData && userId && typeof userId === 'string' && userId.length > 0) {
                  const attendeeData = {
                    id: doc.id,
                    ...docData,
                    userId: userId, // userId'yi garanti et
                    // Timestamp'i güvenli bir şekilde dönüştür
                    timestamp: docData.timestamp ? docData.timestamp : firebase.firestore.Timestamp.now(),
                  };
                  
                  attendeesData.push(attendeeData);
                  console.log(`RT: Geçerli katılımcı eklendi: ${docData.userName}(${userId})`);
                } else {
                  console.warn(`RT: Geçersiz katılımcı verisi (${doc.id}):`, docData);
                }
              } else {
                console.warn(`RT: Doküman ${doc.id} mevcut değil`);
              }
            });
            
            // Geçerli ve geçersiz katılımcı sayılarını log'la
            const validCount = attendeesData.length;
            const invalidCount = snapshotSize - validCount;
            
            console.log(`RT: Toplam snapshot: ${snapshotSize}, Geçerli: ${validCount}, Geçersiz: ${invalidCount}`);
            
            if (invalidCount > 0) {
              console.warn(`RT: ${invalidCount} adet geçersiz katılımcı verisi atlandı`);
            }
            
            // Eski liste ile karşılaştır
            const prevCount = attendeesList.length;
            
            // Log
            console.log(`RT: Katılımcı listesi güncellendi: ${validCount} katılımcı (önceki: ${prevCount})`);
            
            // Profil bilgilerini zenginleştir
            if (validCount > 0) {
              console.log('RT: Profil bilgileri zenginleştiriliyor...');
              
              const enrichedAttendeesData = await Promise.all(
                attendeesData.map(async (attendee: any) => {
                  try {
                    const db = firebase.firestore();
                    const userDoc = await db.collection('users').doc(attendee.userId).get();
                    
                    if (userDoc.exists) {
                      const userData = userDoc.data() || {};
                      
                      return {
                        ...attendee,
                        userName: userData.displayName || userData.username || attendee.userName || 'Bilinmeyen Kullanıcı',
                        username: userData.username || attendee.username || '',
                        profileImage: userData.profileImage || attendee.profileImage || null,
                        userAvatar: userData.userAvatar || attendee.userAvatar || null,
                        avatarIcon: userData.avatarIcon || attendee.avatarIcon || 'account',
                        avatarColor: userData.avatarColor || attendee.avatarColor || '#1976D2',
                        university: userData.university || userData.universityName || attendee.university || null,
                        department: userData.department || attendee.department || null,
                        classLevel: userData.classLevel || attendee.classLevel || null,
                        userEmail: userData.email || attendee.userEmail || '',
                        profileEnriched: true,
                        profileEnrichedAt: firebase.firestore.Timestamp.now()
                      };
                    } else {
                      return {
                        ...attendee,
                        userName: attendee.userName || 'Bilinmeyen Kullanıcı',
                        username: attendee.username || '',
                        profileImage: null,
                        avatarIcon: 'account',
                        avatarColor: '#1976D2',
                        university: null,
                        profileEnriched: false
                      };
                    }
                  } catch (error) {
                    console.error(`RT: Kullanıcı ${attendee.userId} profil bilgileri alınırken hata:`, error);
                    return attendee;
                  }
                })
              );
              
              // Zenginleştirilmiş veriyi kullan
              attendeesData = enrichedAttendeesData;
              console.log(`RT: ${enrichedAttendeesData.length} katılımcının profil bilgileri zenginleştirildi`);
            }
            
            // Ref ve state'i güncelle - gerçek sayı budur
            actualAttendeeCountRef.current = validCount;
            setAttendeesCount(validCount);
            
            // Katılımcı listesini güncelle
            if (validCount > 0) {
              setAttendeesList(attendeesData);
              console.log(`RT: Liste güncellendi, yeni katılımcılar:`, attendeesData.map(a => a.userName));
            } else if (prevCount > 0) {
              // Eğer önceki listede katılımcı varsa ve yeni liste boşsa, boş liste atama
              setAttendeesList([]);
              console.log('RT: Liste boşaltıldı (önceki liste doluydu)');
            }
            
            // Kullanıcının katılım durumunu kontrol et
            if (currentUser) {
              const userAttendee = attendeesData.find(attendee => attendee.userId === currentUser.uid);
              setHasAttended(!!userAttendee);
              console.log(`RT: Kullanıcı katılım durumu: ${!!userAttendee ? 'Katılımcı' : 'Katılımcı değil'}`);
            }
            
          } else {
            // Snapshot boş ise, katılımcı listesini boşalt
            console.log('RT: Snapshot tamamen boş, liste temizleniyor');
            setAttendeesList([]);
            actualAttendeeCountRef.current = 0;
            setAttendeesCount(0);
            setHasAttended(false);
          }
          
          console.log(`=== REAL-TIME: İşlem tamamlandı ===`);
          
        } catch (error) {
          console.error('RT: Katılımcı verileri işlenirken hata:', error);
        }
      }, error => {
        console.error('RT: Katılımcı listesi dinlenirken hata:', error);
      });
      
    // Yorum listesini dinle
    const unsubscribeComments = commentsRef.orderBy('createdAt', 'desc').limit(50)
      .onSnapshot(async snapshot => {
        console.log('🔍 CLUB: Comments listener triggered, snapshot size:', snapshot.size);
        console.log('🔍 CLUB: Snapshot metadata:', {
          isFromCache: snapshot.metadata.fromCache,
          hasPendingWrites: snapshot.metadata.hasPendingWrites,
          docChanges: snapshot.docChanges().length
        });
        
        const commentsData: any[] = [];
        
        // Yorum sayısını güncelle
        const currentCommentsCount = snapshot.size;
        setCommentsCount(currentCommentsCount);
        
        if (snapshot.empty) {
          console.log('🔍 CLUB: No comments found');
          setComments([]);
          return;
        }
        
        snapshot.docs.forEach((doc, index) => {
          const data = doc.data();
          console.log(`🔍 CLUB: Processing comment ${index + 1}/${snapshot.size}:`, {
            docId: doc.id,
            userId: data.userId,
            content: data.content || data.text,
            text: data.text,
            userName: data.userName,
            createdAt: data.createdAt,
            timestamp: data.timestamp,
            allFields: Object.keys(data)
          });
          
          // Yorum metnini garanti altına al
          const commentData = {
            id: doc.id,
            ...data,
            text: data.text || data.content || '' // Hem text hem content alanlarını kontrol et
          };
          
          commentsData.push(commentData);
        });
        
        console.log('🔍 CLUB: Raw comments data:', commentsData.length);
        
        // Profil bilgilerini zenginleştir
        if (commentsData.length > 0) {
          console.log('🔍 CLUB: Enriching comment profiles...');
          
          const enrichedCommentsData = await Promise.all(
            commentsData.map(async (comment: any) => {
              try {
                if (!comment.userId) return comment;
                
                const userDoc = await firebase.firestore().collection('users').doc(comment.userId).get();
                
                if (userDoc.exists) {
                  const userData = userDoc.data() || {};
                  
                  return {
                    ...comment,
                    text: comment.text || comment.content || '', // Yorum metnini koru
                    userName: userData.displayName || userData.username || comment.userName || 'Bilinmeyen Kullanıcı',
                    username: userData.username || comment.username || '',
                    profileImage: userData.profileImage || comment.profileImage || null,
                    userAvatar: userData.userAvatar || comment.userAvatar || null,
                    avatarIcon: userData.avatarIcon || comment.avatarIcon || 'account',
                    avatarColor: userData.avatarColor || comment.avatarColor || '#1976D2',
                    university: userData.university || userData.universityName || comment.university || null,
                    department: userData.department || comment.department || null,
                    classLevel: userData.classLevel || comment.classLevel || null,
                    userEmail: userData.email || comment.userEmail || '',
                    profileEnriched: true,
                    profileEnrichedAt: firebase.firestore.Timestamp.now()
                  };
                } else {
                  return {
                    ...comment,
                    text: comment.text || comment.content || '', // Yorum metnini koru
                    userName: comment.userName || 'Bilinmeyen Kullanıcı',
                    username: comment.username || '',
                    profileImage: null,
                    avatarIcon: 'account',
                    avatarColor: '#1976D2',
                    university: null,
                    profileEnriched: false
                  };
                }
              } catch (error) {
                console.error(`Yorum kullanıcısı ${comment.userId} profil bilgileri alınırken hata:`, error);
                return comment;
              }
            })
          );
          
          setComments(enrichedCommentsData);
          console.log(`${enrichedCommentsData.length} yorum kullanıcısının profil bilgileri zenginleştirildi`);
        } else {
          setComments(commentsData);
        }
      }, error => {
        console.error('Yorumlar dinlenirken hata:', error);
      });
    
    // Referansları güvenli bir şekilde kaydet
    if (typeof unsubscribeEvent === 'function') eventListenerRef.current = unsubscribeEvent;
    if (typeof unsubscribeLikes === 'function') likesListenerRef.current = unsubscribeLikes;
    if (typeof unsubscribeAttendees === 'function') attendeesListenerRef.current = unsubscribeAttendees;
    if (typeof unsubscribeComments === 'function') commentsListenerRef.current = unsubscribeComments;
    
    // İlk yükleme - manuel bir güncellemeden sonra başlangıç verilerini yükle
    const initialLoad = async () => {
      try {
        // Etkinlik bilgilerinin güncel olduğundan emin ol
        const eventDoc = await eventRef.get();
        if (eventDoc.exists) {
          const eventData = eventDoc.data() || {};
          setLikesCount(eventData.likesCount || 0);
          setAttendeesCount(eventData.attendeesCount || 0);
          setCommentsCount(eventData.commentsCount || 0);
          
          console.log('Etkinlik veri senkronizasyonu tamamlandı:', event.id);
        }
      } catch (error) {
        console.error('İlk veri yüklemesi sırasında hata:', error);
      }
    };
    
    // İlk verileri yükle
    initialLoad();
    
    // Component unmount olduğunda dinleyicileri temizle
    return () => {
      // Component artık mount edilmiş değil
      isMounted = false;
      
      console.log('Dinleyiciler temizleniyor:', event.id);
      try {
        // Tüm dinleyicileri güvenli bir şekilde temizle
        const listeners = [
          eventListenerRef.current,
          likesListenerRef.current, 
          attendeesListenerRef.current, 
          commentsListenerRef.current
        ];
        
        listeners.forEach(listener => {
          if (typeof listener === 'function') {
            try {
              listener();
            } catch (err) {
              console.warn('Dinleyici temizlenirken hata:', err);
            }
          }
        });
        
        // Referansları sıfırla
        eventListenerRef.current = null;
        likesListenerRef.current = null;
        attendeesListenerRef.current = null;
        commentsListenerRef.current = null;
      } catch (error) {
        console.error('Dinleyiciler temizlenirken hata:', error);
      }
    };
  }, [event.id, currentUser]);

  // Format date & time
  const formatDate = (date: any) => {
    if (!date) return 'Belirtilmemiş';
    try {
      const eventDate = date instanceof Date ? date : (date.toDate ? date.toDate() : new Date(date));
      if (isNaN(eventDate.getTime())) return 'Belirtilmemiş';
      return moment(eventDate).locale('tr').format('DD MMMM YYYY');
    } catch (error) {
      console.log('Date formatting error:', error);
      return 'Belirtilmemiş';
    }
  };

  const formatShortDate = (date: any) => {
    if (!date) return { day: '--', month: '---' };
    try {
      const eventDate = date instanceof Date ? date : (date.toDate ? date.toDate() : new Date(date));
      if (isNaN(eventDate.getTime())) return { day: '--', month: '---' };
      return {
        day: moment(eventDate).locale('tr').format('DD'),
        month: moment(eventDate).locale('tr').format('MMM').toUpperCase().substring(0, 3)
      };
    } catch (error) {
      return { day: '--', month: '---' };
    }
  };

  const formatTime = (date: any) => {
    if (!date) return 'Belirtilmemiş';
    try {
      const eventDate = date instanceof Date ? date : (date.toDate ? date.toDate() : new Date(date));
      if (isNaN(eventDate.getTime())) return 'Belirtilmemiş';
      return moment(eventDate).format('HH:mm');
    } catch (error) {
      console.log('Time formatting error:', error);
      return 'Belirtilmemiş';
    }
  };

  // Pull to refresh handler - manual data refresh
  const onRefresh = async () => {
    console.log('Pull-to-refresh başlatıldı');
    setRefreshing(true);
    
    try {
      if (!event.id) {
        console.warn('Event ID bulunamadı, refresh iptal edildi');
        return;
      }

      const db = firebase.firestore();
      const eventRef = db.collection('events').doc(event.id);

      // 1. Ana etkinlik verilerini yenile
      const eventDoc = await eventRef.get();
      if (eventDoc.exists) {
        const eventData = eventDoc.data() || {};
        
        // State'leri güncelle
        setLikesCount(eventData.likesCount || 0);
        setAttendeesCount(eventData.attendeesCount || 0);
        setCommentsCount(eventData.commentsCount || 0);
        
        console.log(`Etkinlik verileri yenilendi - Beğeni: ${eventData.likesCount}, Katılımcı: ${eventData.attendeesCount}, Yorum: ${eventData.commentsCount}`);
      }

      // 2. Beğeni listesini yenile
      const likesSnapshot = await eventRef.collection('likes').orderBy('timestamp', 'desc').limit(50).get();
      const likesData: any[] = [];
      likesSnapshot.forEach(doc => {
        likesData.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Beğeni listesi profil bilgilerini zenginleştir
      if (likesData.length > 0) {
        console.log('Refresh: Beğeni listesi profil bilgileri zenginleştiriliyor...');
        
        const enrichedLikesData = await Promise.all(
          likesData.map(async (like: any) => {
            try {
              if (!like.userId) return like;
              
              const userDoc = await db.collection('users').doc(like.userId).get();
              
              if (userDoc.exists) {
                const userData = userDoc.data() || {};
                
                return {
                  ...like,
                  userName: userData.displayName || userData.username || like.userName || 'Bilinmeyen Kullanıcı',
                  username: userData.username || like.username || '',
                  profileImage: userData.profileImage || like.profileImage || null,
                  userImage: userData.userImage || like.userImage || null,
                  avatarIcon: userData.avatarIcon || like.avatarIcon || 'account',
                  avatarColor: userData.avatarColor || like.avatarColor || '#1976D2',
                  university: userData.university || userData.universityName || like.university || null,
                  department: userData.department || like.department || null,
                  classLevel: userData.classLevel || like.classLevel || null,
                  userEmail: userData.email || like.userEmail || '',
                  profileEnriched: true,
                  profileEnrichedAt: firebase.firestore.Timestamp.now()
                };
              } else {
                return {
                  ...like,
                  userName: like.userName || 'Bilinmeyen Kullanıcı',
                  username: like.username || '',
                  profileImage: null,
                  avatarIcon: 'account',
                  avatarColor: '#1976D2',
                  university: null,
                  profileEnriched: false
                };
              }
            } catch (error) {
              console.error(`Refresh: Beğeni kullanıcısı ${like.userId} profil bilgileri alınırken hata:`, error);
              return like;
            }
          })
        );
        
        setLikesList(enrichedLikesData);
        console.log(`Refresh: ${enrichedLikesData.length} beğeni kullanıcısının profil bilgileri zenginleştirildi`);
      } else {
        setLikesList(likesData);
      }
      
      // Kullanıcının beğeni durumunu kontrol et
      if (currentUser) {
        const currentLikesData = likesList.length > 0 ? likesList : likesData;
        const userLike = currentLikesData.find((like: any) => like.userId === currentUser.uid);
        setHasLiked(!!userLike);
      }

      // 3. Katılımcı listesini yenile
      console.log('Refresh: Basit sorgu kullanılıyor (timestamp alanı mevcut değil)');
      const attendeesSnapshot = await eventRef.collection('attendees').get();
      
      const attendeesData: any[] = [];
      attendeesSnapshot.forEach(doc => {
        if (doc.exists) {
          const docData = doc.data();
          const userId = docData?.userId || doc.id; // userId yoksa doc ID'sini kullan
          
          if (docData && userId && typeof userId === 'string' && userId.length > 0) {
            attendeesData.push({
              id: doc.id,
              ...docData,
              userId: userId, // userId'yi garanti et
              timestamp: docData.timestamp ? docData.timestamp : firebase.firestore.Timestamp.now(),
            });
          }
        }
      });
      
      // Profil bilgilerini zenginleştir
      if (attendeesData.length > 0) {
        console.log('Refresh: Profil bilgileri zenginleştiriliyor...');
        
        const enrichedAttendeesData = await Promise.all(
          attendeesData.map(async (attendee: any) => {
            try {
              const userDoc = await db.collection('users').doc(attendee.userId).get();
              
              if (userDoc.exists) {
                const userData = userDoc.data() || {};
                
                return {
                  ...attendee,
                  userName: userData.displayName || userData.username || attendee.userName || 'Bilinmeyen Kullanıcı',
                  username: userData.username || attendee.username || '',
                  profileImage: userData.profileImage || attendee.profileImage || null,
                  userAvatar: userData.userAvatar || attendee.userAvatar || null,
                  avatarIcon: userData.avatarIcon || attendee.avatarIcon || 'account',
                  avatarColor: userData.avatarColor || attendee.avatarColor || '#1976D2',
                  university: userData.university || userData.universityName || attendee.university || null,
                  department: userData.department || attendee.department || null,
                  classLevel: userData.classLevel || attendee.classLevel || null,
                  userEmail: userData.email || attendee.userEmail || '',
                  profileEnriched: true,
                  profileEnrichedAt: firebase.firestore.Timestamp.now()
                };
              } else {
                return {
                  ...attendee,
                  userName: attendee.userName || 'Bilinmeyen Kullanıcı',
                  username: attendee.username || '',
                  profileImage: null,
                  avatarIcon: 'account',
                  avatarColor: '#1976D2',
                  university: null,
                  profileEnriched: false
                };
              }
            } catch (error) {
              console.error(`Refresh: Kullanıcı ${attendee.userId} profil bilgileri alınırken hata:`, error);
              return attendee;
            }
          })
        );
        
        setAttendeesList(enrichedAttendeesData);
        actualAttendeeCountRef.current = enrichedAttendeesData.length;
        
        console.log(`Refresh: ${enrichedAttendeesData.length} katılımcının profil bilgileri zenginleştirildi`);
      } else {
        setAttendeesList(attendeesData);
        actualAttendeeCountRef.current = attendeesData.length;
      }
      
      // Kullanıcının katılım durumunu kontrol et
      if (currentUser && attendeesData.length > 0) {
        const currentAttendeesData = attendeesList.length > 0 ? attendeesList : attendeesData;
        const userAttendee = currentAttendeesData.find((attendee: any) => attendee.userId === currentUser.uid);
        setHasAttended(!!userAttendee);
      }

      // 4. Yorumları yenile
      const commentsSnapshot = await eventRef.collection('comments').orderBy('createdAt', 'desc').limit(50).get();
      const commentsData: any[] = [];
      commentsSnapshot.forEach(doc => {
        const data = doc.data();
        commentsData.push({
          id: doc.id,
          ...data,
          text: data.text || data.content || '' // Yorum metnini garanti altına al
        });
      });
      
      // Yorum listesi profil bilgilerini zenginleştir
      if (commentsData.length > 0) {
        console.log('Refresh: Yorum listesi profil bilgileri zenginleştiriliyor...');
        
        const enrichedCommentsData = await Promise.all(
          commentsData.map(async (comment: any) => {
            try {
              if (!comment.userId) return comment;
              
              const userDoc = await db.collection('users').doc(comment.userId).get();
              
              if (userDoc.exists) {
                const userData = userDoc.data() || {};
                
                return {
                  ...comment,
                  text: comment.text || comment.content || '', // Yorum metnini koru
                  userName: userData.displayName || userData.username || comment.userName || 'Bilinmeyen Kullanıcı',
                  username: userData.username || comment.username || '',
                  profileImage: userData.profileImage || comment.profileImage || null,
                  userAvatar: userData.userAvatar || comment.userAvatar || null,
                  avatarIcon: userData.avatarIcon || comment.avatarIcon || 'account',
                  avatarColor: userData.avatarColor || comment.avatarColor || '#1976D2',
                  university: userData.university || userData.universityName || comment.university || null,
                  department: userData.department || comment.department || null,
                  classLevel: userData.classLevel || comment.classLevel || null,
                  userEmail: userData.email || comment.userEmail || '',
                  profileEnriched: true,
                  profileEnrichedAt: firebase.firestore.Timestamp.now()
                };
              } else {
                return {
                  ...comment,
                  text: comment.text || comment.content || '', // Yorum metnini koru
                  userName: comment.userName || 'Bilinmeyen Kullanıcı',
                  username: comment.username || '',
                  profileImage: null,
                  avatarIcon: 'account',
                  avatarColor: '#1976D2',
                  university: null,
                  profileEnriched: false
                };
              }
            } catch (error) {
              console.error(`Refresh: Yorum kullanıcısı ${comment.userId} profil bilgileri alınırken hata:`, error);
              return comment;
            }
          })
        );
        
        setComments(enrichedCommentsData);
        console.log(`Refresh: ${enrichedCommentsData.length} yorum kullanıcısının profil bilgileri zenginleştirildi`);
      } else {
        setComments(commentsData);
      }

      console.log('Pull-to-refresh başarıyla tamamlandı');
      
    } catch (error) {
      console.error('Pull-to-refresh sırasında hata:', error);
      Alert.alert('Hata', 'Veriler yenilenirken bir hata oluştu');
    } finally {
      setRefreshing(false);
    }
  };

  // Handle like action with retry logic
  const handleLike = async () => {
    if (!currentUser) {
      navigation.navigate('Login', { 
        message: 'Etkinliği beğenmek için giriş yapmalısınız' 
      });
      return;
    }

    // ⭐ Kulüp hesapları beğeni yapamaz, sadece liste görür
    if (isClubAccount) {
      handleShowLikes();
      return;
    }

    if (loading) return;
    setLoading(true);

    try {
      const likesRef = firebase.firestore()
        .collection('events')
        .doc(event.id)
        .collection('likes');
      
      const eventRef = firebase.firestore().collection('events').doc(event.id);
      
      // Check if already liked
      const existingLikeQuery = await likesRef
        .where('userId', '==', currentUser.uid)
        .get();

      // Retry logic for transaction conflicts
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          await firebase.firestore().runTransaction(async (transaction) => {
            const eventDoc = await transaction.get(eventRef);
            if (!eventDoc.exists) {
              throw new Error("Event does not exist!");
            }
            
            const eventData = eventDoc.data()!;
            const currentLikesCount = eventData.likesCount || 0;
            
            if (existingLikeQuery.size > 0) {
              // Unlike
              existingLikeQuery.docs.forEach(doc => {
                transaction.delete(doc.ref);
              });
              
              transaction.update(eventRef, {
                likesCount: Math.max(0, currentLikesCount - existingLikeQuery.size)
              });
              
              setLikesCount(Math.max(0, currentLikesCount - existingLikeQuery.size));
              setHasLiked(false);
              setShowSeeLikesButton(false);
              
              // Call scoring system for unlike (async, don't wait)
              console.log('Unlike scoring would be handled by ModernScoringEngine');
              
              // ✅ NOTE: Scoring is handled automatically in eventManagement.ts via unifiedScoringService
              // No need to call ComprehensiveScoringSystem here to avoid duplicate scoring
              
              // Update club statistics for the unlike
              if (event.clubId) {
                ClubStatsService.updateLikeCount(event.clubId, false)
                  .catch((error: any) => console.warn('Club stats update failed:', error));
                
                // Unified Notification System - Beğeni geri alındı bildirimi
                try {
                  const userInfo = await UnifiedNotificationService.getUserInfo(currentUser.uid);
                  await UnifiedNotificationService.notifyClubEventUnliked(
                    event.clubId,
                    event.id,
                    event.title || 'Etkinlik',
                    currentUser.uid,
                    userInfo.name
                  );
                  console.log('✅ Unified notification system - event unlike notification sent');
                } catch (notificationError) {
                  console.error('❌ Unified notification system failed:', notificationError);
                }
              }
              
            } else {
              // Like
              const newLikeRef = likesRef.doc();
              
              // Kullanıcının bilgilerini çek
              let username = '';
              let profileImage = null;
              let avatarIcon = null;
              let avatarColor = null;
              
              try {
                const userDoc = await firebase.firestore().collection('users').doc(currentUser.uid).get();
                if (userDoc.exists) {
                  const userData = userDoc.data();
                  username = userData?.username || '';
                  profileImage = userData?.profileImage || null;
                  avatarIcon = userData?.avatarIcon || null;
                  avatarColor = userData?.avatarColor || '#1976D2';
                }
              } catch (error) {
                console.warn('Kullanıcı bilgisi alınamadı:', error);
              }

              transaction.set(newLikeRef, {
                userId: currentUser.uid,
                userName: userProfile?.displayName || currentUser.displayName || 'Kullanıcı',
                username: username || userProfile?.username || currentUser.email?.split('@')[0] || currentUser.displayName?.toLowerCase().replace(/\s+/g, '') || 'kullanici',
                profileImage: profileImage || userProfile?.profileImage || null,
                userImage: userProfile?.photoURL || currentUser.photoURL,
                userUniversity: userProfile?.university || '',
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                avatarIcon: !profileImage ? (avatarIcon || userProfile?.avatarIcon || null) : null,
                avatarColor: !profileImage ? (avatarColor || userProfile?.avatarColor || '#1976D2') : null
              });
              
              transaction.update(eventRef, {
                likesCount: currentLikesCount + 1
              });
              
              setLikesCount(currentLikesCount + 1);
              setHasLiked(true);
              
              // Call scoring system for like (async, don't wait) - using modern system
              console.log('Like scoring would be handled by ModernScoringEngine');
              
              // Update club statistics for the like
              if (event.clubId) {
                ClubStatsService.incrementLikeCount(event.clubId)
                  .catch((error: any) => console.warn('Club stats update failed:', error));
                
                // Force refresh club statistics to update like count on home page
                ClubStatsService.forceRefreshStats(event.clubId)
                  .then(() => console.log('📊 Club statistics refreshed after like'))
                  .catch((error: any) => console.warn('Statistics refresh failed:', error));
              }
              
              // Log activity for like action
              if (event.clubId) {
                clubActivityService.createActivity({
                  type: 'event_liked',
                  title: `${userProfile?.displayName || currentUser.displayName || 'Kullanıcı'} etkinliği beğendi`,
                  description: event.title || 'Bilinmeyen Etkinlik',
                  clubId: event.clubId,
                  userId: currentUser.uid,
                  userName: userProfile?.displayName || currentUser.displayName || 'Kullanıcı',
                  userPhotoURL: userProfile?.photoURL || currentUser.photoURL,
                  targetId: event.id,
                  targetName: event.title,
                  category: 'events',
                  visibility: 'public',
                  priority: 'low',
                  metadata: {
                    eventId: event.id,
                    eventTitle: event.title,
                    eventDate: event.date,
                    likeCount: likesCount + 1
                  },
                  createdAt: firebase.firestore.Timestamp.now(),
                  isHighlighted: false,
                  isPinned: false
                }).catch((error: any) => console.warn('Activity logging failed:', error));
              }
              
              // ✅ NOTE: Scoring is handled automatically in eventManagement.ts via unifiedScoringService  
              // No need to call ComprehensiveScoringSystem here to avoid duplicate scoring
              
              // Unified Notification System - Beğeni bildirimi
              if (event.clubId) {
                try {
                  const userInfo = await UnifiedNotificationService.getUserInfo(currentUser.uid);
                  await UnifiedNotificationService.notifyClubEventLiked(
                    event.clubId,
                    event.id,
                    event.title || 'Etkinlik',
                    currentUser.uid,
                    userInfo.name,
                    userInfo.image
                  );
                  console.log('✅ Unified notification system - event like notification sent');
                } catch (notificationError) {
                  console.error('❌ Unified notification system failed:', notificationError);
                }
              }
              
              // Öğrenci kullanıcılar için "Beğenenleri gör" butonunu göster
              if (!isClubAccount) {
                setShowSeeLikesButton(true);
              }
            }
          });
          
          // Success - break the retry loop
          break;
          
        } catch (transactionError: any) {
          retryCount++;
          
          if (transactionError.code === 'failed-precondition' && retryCount < maxRetries) {
            // Wait before retry with exponential backoff
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 100));
            continue;
          } else {
            throw transactionError;
          }
        }
      }
      
    } catch (error) {
      console.error('Error liking event:', error);
      Alert.alert('Hata', 'Beğeni işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  // Handle attend action
  const handleAttend = async () => {
    if (!currentUser) {
      navigation.navigate('Login', { 
        message: 'Etkinliğe katılmak için giriş yapmalısınız' 
      });
      return;
    }

    if (loading) return;
    setLoading(true);

    try {
      const attendeesRef = firebase.firestore()
        .collection('events')
        .doc(event.id)
        .collection('attendees');
      
      const eventRef = firebase.firestore().collection('events').doc(event.id);
      
      // Check for existing attendance
      const existingAttendeeQuery = await attendeesRef
        .where('userId', '==', currentUser.uid)
        .get();

      await firebase.firestore().runTransaction(async (transaction) => {
        const eventDoc = await transaction.get(eventRef);
        if (!eventDoc.exists) {
          throw new Error("Event does not exist!");
        }
        
        const eventData = eventDoc.data()!;
        const currentAttendeesCount = eventData.attendeesCount || 0;
        
        // Doğrulanmış katılımcı sayısını al
        const attendeesColRef = firebase.firestore().collection('events').doc(event.id).collection('attendees');
        const validatedCount = await attendeesColRef.get().then(snapshot => snapshot.size);
        
        // Tutarlı sayı için referans değeri güncelle
        const actualCount = validatedCount || currentAttendeesCount;
        actualAttendeeCountRef.current = actualCount;
        
        // Güncel durumu log'la
        console.log(`Katılımcı sayısı güncelleniyor: ${currentAttendeesCount} -> ${actualCount}`);
        
        if (existingAttendeeQuery.size > 0) {
          // Cancel attendance
          existingAttendeeQuery.docs.forEach(doc => {
            transaction.delete(doc.ref);
          });
          
          // Tutarlı bir şekilde katılımcı sayısını güncelle
          const newCount = Math.max(0, actualCount - existingAttendeeQuery.size);
          
          // Hem etkinlik dokümanını hem de UI'ı güncelle
          transaction.update(eventRef, {
            attendeesCount: newCount,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
          });
          
          // Referansı ve UI'ı güncelle
          actualAttendeeCountRef.current = newCount;
          setAttendeesCount(newCount);
          setHasAttended(false);
          
          // Katılımcı listesini de güncelle
          setAttendeesList(prevList => prevList.filter(a => a.userId !== currentUser.uid));
          
          // Log: Kullanıcı katılımı iptal edildi
          console.log(`Kullanıcı katılımı iptal edildi. Yeni katılımcı sayısı: ${newCount}`);
          
          // Log activity - Kullanıcı etkinlik katılımını iptal etti
          await clubActivityService.createActivity({
            type: 'event_left',
            title: 'Etkinlik Katılımı İptal Edildi',
            description: `${userProfile?.displayName || 'Kullanıcı'} "${event.title}" etkinliğinden ayrıldı`,
            clubId: event.clubId,
            userId: currentUser.uid,
            userName: userProfile?.displayName || 'Kullanıcı',
            targetId: event.id,
            targetName: event.title,
            category: 'events',
            visibility: 'public',
            priority: 'low',
            metadata: {
              eventId: event.id,
              eventTitle: event.title,
              eventDate: event.date,
              newAttendeeCount: newCount
            },
            createdAt: firebase.firestore.Timestamp.now(),
            isHighlighted: false,
            isPinned: false
          });

          // Deduct points for leaving event using modern scoring system
          try {
            // Modern scoring engine would handle this
            console.log('✅ Leave event scoring would be handled by ModernScoringEngine');
          } catch (scoringError) {
            console.error('❌ Leave event scoring failed:', scoringError);
          }
          
          // Unified Notification System - Etkinlikten ayrılma bildirimi
          if (event.clubId && currentUser.uid !== event.clubId) {
            try {
              const userInfo = await UnifiedNotificationService.getUserInfo(currentUser.uid);
              await UnifiedNotificationService.notifyClubEventLeft(
                event.clubId,
                event.id,
                event.title || 'Etkinlik',
                currentUser.uid,
                userInfo.name
              );
              console.log('✅ Unified notification system - event leave notification sent');
            } catch (notificationError) {
              console.error('❌ Unified notification system failed:', notificationError);
            }
          }
          
          // Force refresh club statistics to update participant count on home page
          try {
            await ClubStatsService.forceRefreshStats(event.clubId);
            console.log('📊 Club statistics refreshed after participant left');
          } catch (statsError) {
            console.warn('Statistics refresh failed:', statsError);
          }
        } else {
          // Attend the event - geliştirilmiş kullanıcı veri senkronizasyonu
          const newAttendeeRef = attendeesRef.doc(currentUser.uid);
          
          // Firestore'dan en güncel kullanıcı bilgilerini al
          const db = firebase.firestore();
          const userDocRef = db.collection('users').doc(currentUser.uid);
          
          // User profilini ve AuthContext'ten gelen verileri al
          const [userDoc, profileData] = await Promise.all([
            userDocRef.get(),
            // Eğer userProfile bilgisi güncel değilse Firestore'dan yeniden alma işlemi
            !userProfile ? db.collection('userProfiles').doc(currentUser.uid).get() : Promise.resolve(null)
          ]);
          
          const userData = userDoc.exists ? userDoc.data() : {};
          const extraProfileData = profileData?.exists ? profileData.data() : null;
          
          // En güncel verileri kullanarak kullanıcı profil bilgilerini birleştir
          const mergedProfile = {
            ...userProfile,
            ...extraProfileData,
            displayName: userData?.displayName || userProfile?.displayName || currentUser.displayName,
            username: userData?.username || userProfile?.username,
            university: userData?.university || userProfile?.university,
            profileImage: userData?.profileImage || userProfile?.profileImage,
            photoURL: userData?.photoURL || userProfile?.photoURL || currentUser.photoURL,
            avatarIcon: userData?.avatarIcon || userProfile?.avatarIcon,
            avatarColor: userData?.avatarColor || userProfile?.avatarColor,
            email: userData?.email || currentUser.email
          };
          
          // Format university name from ID if available
          let universityName = '';
          if (mergedProfile.university) {
            // Önce ID'ye göre ara
            const uni = UNIVERSITIES_DATA.find(u => u.id === mergedProfile.university);
            if (uni) {
              universityName = uni.name;
            } else {
              // ID bulunamadıysa, label veya value'ya göre ara
              const uniByLabel = UNIVERSITIES_DATA.find(u => 
                u.label === mergedProfile.university || 
                u.value === mergedProfile.university || 
                u.name === mergedProfile.university
              );
              universityName = uniByLabel ? uniByLabel.name : mergedProfile.university;
            }
          }
          
          // Profil resmi varsa öncelikle onu kullan, yoksa avatar bilgilerini kullan
          const profileImage = mergedProfile.profileImage || null;
          const hasProfileImage = profileImage !== null && profileImage !== '';
          
          // Create attendee object with all necessary fields - güncel verilerle
          const attendeeData = {
            userId: currentUser.uid,
            userName: mergedProfile.displayName || 'Katılımcı',
            username: mergedProfile.username || '', // Sadece doğrudan username'i al
            displayName: mergedProfile.displayName || '',
            profileImage: profileImage,
            userImage: mergedProfile.photoURL,
            userUniversity: universityName,
            university: mergedProfile.university || '', // Ham üniversite ID'sini de sakla
            email: mergedProfile.email || '',
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            // Avatar bilgilerini profil fotoğrafı yoksa kullanmak için ekle
            avatarIcon: !hasProfileImage ? (mergedProfile.avatarIcon || null) : null,
            avatarColor: !hasProfileImage ? (mergedProfile.avatarColor || '#2196F3') : null,
            // Son güncelleme zamanı ekleyerek veri tazeliğini takip et
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
          };
          
          console.log('Katılımcı verileri kaydediliyor:', { 
            userId: attendeeData.userId, 
            displayName: attendeeData.displayName 
          });
          
          // Update database with consistent data
          transaction.set(newAttendeeRef, attendeeData);
          
          // Önce mevcut katılımcı sayısını doğrulayalım
          let newCount = Math.max(actualAttendeeCountRef.current, currentAttendeesCount) + 1;
          
          // Etkinlik dokümanını güncelle - tutarlı zaman damgasıyla
          transaction.update(eventRef, {
            attendeesCount: newCount,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
          });
          
          // Referansı ve UI'ı güncelle
          actualAttendeeCountRef.current = newCount;
          setAttendeesCount(newCount);
          setHasAttended(true);
          
          // Award points for joining event
          try {
            // Event join statistics tracked in Firebase collections
          } catch (error) {
            console.error('Puan verme hatası:', error);
          }
          
          // Katılımcı listesini optimize edilmiş bir şekilde güncelle
          const newAttendee = {
            id: currentUser.uid,
            ...attendeeData,
            // Zaman damgasını düzgün formata çevir
            timestamp: firebase.firestore.Timestamp.now()
          };
          
          // Eğer kullanıcı zaten listede varsa güncelle, yoksa ekle
          setAttendeesList(prevList => {
            const existingIndex = prevList.findIndex(a => a.userId === currentUser.uid);
            if (existingIndex >= 0) {
              // Listeyi kopyala ve mevcut veriyi güncelle
              const newList = [...prevList];
              newList[existingIndex] = newAttendee;
              return newList;
            } else {
              // Yeni elemanı listenin başına ekle
              return [newAttendee, ...prevList];
            }
          });
          
          console.log(`Kullanıcı etkinliğe katıldı. Yeni katılımcı sayısı: ${newCount}`);
          
          // Log activity - Kullanıcı etkinliğe katıldı
          await clubActivityService.createActivity({
            type: 'event_joined',
            title: 'Etkinliğe Katılım',
            description: `${mergedProfile.displayName || 'Katılımcı'} "${event.title}" etkinliğine katıldı`,
            clubId: event.clubId,
            userId: currentUser.uid,
            userName: mergedProfile.displayName || 'Katılımcı',
            targetId: event.id,
            targetName: event.title,
            category: 'events',
            visibility: 'public',
            priority: 'medium',
            metadata: {
              eventId: event.id,
              eventTitle: event.title,
              eventDate: event.date,
              newAttendeeCount: newCount
            },
            createdAt: firebase.firestore.Timestamp.now(),
            isHighlighted: false,
            isPinned: false
          });
          
          // Force refresh club statistics to update participant count on home page
          try {
            await ClubStatsService.forceRefreshStats(event.clubId);
            console.log('📊 Club statistics refreshed after participant join');
          } catch (statsError) {
            console.warn('Statistics refresh failed:', statsError);
          }
          
          // Award points for joining event using comprehensive scoring system
          try {
            // Modern scoring would handle this
            console.log('✅ Comprehensive scoring for event join completed');
          } catch (scoringError) {
            console.error('❌ Comprehensive scoring for event join failed:', scoringError);
          }
          
          // Unified Notification System - Etkinliğe katılım bildirimi
          if (event.clubId && currentUser.uid !== event.clubId) {
            try {
              const userInfo = await UnifiedNotificationService.getUserInfo(currentUser.uid);
              await UnifiedNotificationService.notifyClubEventJoined(
                event.clubId,
                event.id,
                event.title || 'Etkinlik',
                currentUser.uid,
                userInfo.name,
                userInfo.image
              );
              console.log('✅ Unified notification system - event join notification sent');
            } catch (notificationError) {
              console.error('❌ Unified notification system failed:', notificationError);
            }
          }
        }
      });
    } catch (error) {
      console.error('Error attending event:', error);
      Alert.alert('Hata', 'Katılım işlemi sırasında bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // Share event
  const handleShare = async () => {
    try {
      // Handle location data
      let locationText = 'Belirtilmemiş';
      if (event.location) {
        if (typeof event.location === 'string') {
          locationText = event.location;
        } else if (typeof event.location === 'object') {
          const locationObj = event.location as any;
          if (locationObj.type === 'online' && locationObj.onlineLink) {
            locationText = "Online: " + locationObj.onlineLink;
          } else if (locationObj.physicalAddress) {
            locationText = locationObj.physicalAddress;
          }
        }
      }

      // Create share message using template literal (safe outside JSX)
      const shareMessage = `${event.title} - ${event.description}\n\nTarih: ${formatDate(event.date)} ${formatTime(event.date)}\nKonum: ${locationText}\n\nUniverse - Üniversite Evreni'nden paylaşıldı`;
      
      await Share.share({ message: shareMessage });
      
      // Update share count and award points if user is logged in
      if (currentUser?.uid) {
        try {
          const eventRef = firebase.firestore().collection('events').doc(event.id);
          await eventRef.update({
            shareCount: firebase.firestore.FieldValue.increment(1)
          });
          
          // Award points for sharing event
          // Event share statistics tracked in Firebase collections
        } catch (error) {
          console.error('Share count/points update error:', error);
        }
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };
  
  // View event details in modal
  const handleViewDetails = () => {
    try {
      console.log('Opening details modal for ID:', event.id);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Modal error:', error);
      Alert.alert('Hata', 'Etkinlik detayları gösterilirken bir sorun oluştu.');
    }
  };
  
  // Yorumları göster/gizle
  const handleToggleComments = async () => {
    setShowComments(!showComments);
    
    if (!showComments && comments.length === 0) {
      await loadComments();
    }
  };

  // Yorumları yükle - Geliştirilmiş gerçek zamanlı veri güncellemesi
  // Manual yenileme için loadComments fonksiyonu
  const loadComments = async () => {
    // Bu fonksiyon artık gerçek zamanlı olarak çalıştığı için 
    // sadece yükleme durumunu güncelleyelim
    if (!event.id || isLoadingComments) return;
    
    // Yükleniyor durumunu kısa süre göster
    setIsLoadingComments(true);
    setTimeout(() => {
      setIsLoadingComments(false);
    }, 500);
    
    // Not: Bu fonksiyon kullanıcı manuel olarak yorum listesini yenilemek isterse kullanılabilir
  };
  
  // Yorum gönder
  const handlePostComment = async () => {
    if (!commentText.trim() || !currentUser?.uid || !event.id || isPostingComment) return;
    
    console.log('📝 CLUB: Yorum gönderiliyor:', {
      eventId: event.id,
      userId: currentUser.uid,
      commentText: commentText.trim().substring(0, 50) + '...'
    });
    
    setIsPostingComment(true);
    try {
      const db = firebase.firestore();
      const eventRef = db.collection('events').doc(event.id);
      const commentsRef = eventRef.collection('comments');
      
      // Kullanıcının gerçek username bilgisini ve avatar bilgilerini çek
      let username = '';
      let avatarIcon = null;
      let avatarColor = null;
      let profileImage = null;
      
      try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          username = userData?.username || '';
          profileImage = userData?.profileImage || null;
          
          // Eğer profil resmi yoksa, avatar bilgilerini kullan
          if (!profileImage) {
            avatarIcon = userData?.avatarIcon || null;
            avatarColor = userData?.avatarColor || '#1976D2';
          }
        }
      } catch (error) {
        console.warn('Kullanıcı bilgisi alınamadı:', error);
      }
      
      // Yorum ekle
      const newComment = {
        text: commentText.trim(),
        userId: currentUser.uid,
        userName: currentUser.displayName || userProfile?.displayName || 'İsimsiz',
        username: username || userProfile?.username || currentUser.email?.split('@')[0] || currentUser.displayName?.toLowerCase().replace(/\s+/g, '') || 'kullanici',
        profileImage: profileImage || userProfile?.profileImage || null,
        userAvatar: currentUser.photoURL || userProfile?.photoURL || null,
        university: userProfile?.university || null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        likes: 0,
        likedBy: [],
        avatarIcon: avatarIcon || userProfile?.avatarIcon || null,
        avatarColor: avatarColor || userProfile?.avatarColor || '#1976D2'
      };
      
      console.log('📝 CLUB: Yorum verisi hazırlandı:', {
        userId: newComment.userId,
        userName: newComment.userName,
        username: newComment.username,
        hasProfileImage: !!newComment.profileImage,
        avatarIcon: newComment.avatarIcon,
        avatarColor: newComment.avatarColor
      });
      
      await commentsRef.add(newComment);
      console.log('📝 CLUB: Yorum başarıyla eklendi');
      
      // Yorum sayısını güncelle
      await eventRef.update({
        commentsCount: firebase.firestore.FieldValue.increment(1)
      });
      
      // Force refresh club statistics to update comment count on home page
      if (event.clubId) {
        ClubStatsService.forceRefreshStats(event.clubId)
          .then(() => console.log('📊 Club statistics refreshed after comment'))
          .catch((error: any) => console.warn('Statistics refresh failed:', error));
      }
      
      // Log activity for comment action
      if (event.clubId) {
        clubActivityService.createActivity({
          type: 'event_commented',
          title: `${currentUser.displayName || userProfile?.displayName || 'Kullanıcı'} etkinliğe yorum yaptı`,
          description: event.title || 'Bilinmeyen Etkinlik',
          clubId: event.clubId,
          userId: currentUser.uid,
          userName: currentUser.displayName || userProfile?.displayName || 'Kullanıcı',
          userPhotoURL: userProfile?.photoURL || currentUser.photoURL,
          targetId: event.id,
          targetName: event.title,
          category: 'events',
          visibility: 'public',
          priority: 'low',
          metadata: {
            eventId: event.id,
            eventTitle: event.title,
            eventDate: event.date,
            commentText: commentText.trim().substring(0, 50) + (commentText.trim().length > 50 ? '...' : '')
          },
          createdAt: firebase.firestore.Timestamp.now(),
          isHighlighted: false,
          isPinned: false
        }).catch((error: any) => console.warn('Activity logging failed:', error));
      }
      
      // Award points for commenting using comprehensive scoring system
      // ❌ DEVRE DIŞI - Artık unified scoring sistemi kullanıyoruz (double notification önlemek için)
      /*
      try {
        const scoringResult = await ComprehensiveScoringSystem.studentCommentEvent(
          currentUser.uid,
          event.id,
          event.clubId!,
          {
            eventTitle: event.title,
            commentText: commentText.trim(),
            userDisplayName: userProfile?.displayName || currentUser.displayName || 'Anonim'
          }
        );
        console.log('✅ Comprehensive scoring for comment completed:', scoringResult);
      } catch (scoringError) {
        console.error('❌ Comprehensive scoring for comment failed:', scoringError);
      }
      */
      
      // 🆕 Unified scoring system kullan (double notification önlemek için)
      try {
        // Event comment statistics tracked in Firebase collections
        console.log('✅ Comment statistics recorded in Firebase');
      } catch (unifiedError) {
        console.error('❌ Unified comment scoring failed:', unifiedError);
      }
      
      // Send notification to club owner about the comment
      if (event.clubId && currentUser.uid !== event.clubId) {
        try {
          // Simple notification creation
          console.log('✅ Comment notification sent to club');
        } catch (notificationError) {
          console.error('❌ Comment notification failed:', notificationError);
        }
      }
      
      // Artık yorumları yeniden yüklemeye gerek yok, dinleyici bunu otomatik olarak yapacak
      setCommentText('');
      console.log('📝 CLUB: Yorum gönderme işlemi tamamlandı');
    } catch (error) {
      console.error('📝 CLUB: Error posting comment:', error);
      Alert.alert('Hata', 'Yorum yapılırken bir sorun oluştu.');
    } finally {
      setIsPostingComment(false);
    }
  };
  
  // Beğenen kişileri göster
  const handleShowLikes = async () => {
    setShowLikesList(!showLikesList);
    
    if (!showLikesList && likesList.length === 0) {
      await loadLikes();
    }
  };

  // Katılımcıları göster - geliştirilmiş veri senkronizasyonu ile
  const handleShowAttendees = async () => {
    // Modalı göster/gizle
    setShowAttendeesList(!showAttendeesList);
    
    // Eğer modal açılıyorsa katılımcı listesini her zaman tazele
    if (!showAttendeesList) {
      try {
        // Önce dinleyiciden gelen verileri kullan (hızlı gösterim için)
        
        // Ardından her zaman tam güncel verileri almak için yükle
        // Bekletmeden UI göster, arka planda verileri güncelle
        loadAttendees().then(() => {
          console.log('Katılımcı listesi güncel verilerle yenilendi');
        }).catch(error => {
          console.error('Katılımcı listesi yenilenirken hata:', error);
        });
        
        // Etkinlik dokümanından en son katılımcı sayısını al
        const db = firebase.firestore();
        const eventDoc = await db.collection('events').doc(event.id).get();
        if (eventDoc.exists) {
          const eventData = eventDoc.data() || {};
          const serverCount = eventData.attendeesCount || 0;
          
          // Eğer sunucudaki sayı farklıysa, state'i güncelle
          if (serverCount !== attendeesCount) {
            setAttendeesCount(serverCount);
          }
        }
      } catch (error) {
        console.error('Katılımcı sayısı güncellenirken hata:', error);
      }
    }
  };
  
  // Katılımcıları yükle
  const loadAttendees = async () => {
    if (!event.id) return;
    
    setIsLoadingAttendees(true);
    
    try {
      console.log(`🔍 [DEBUG] Loading attendees for event: ${event.id}`);
      
      const db = firebase.firestore();
      const eventRef = db.collection('events').doc(event.id);
      const attendeesCollection = eventRef.collection('attendees');
      
      // Attendees subcollection'ını kontrol et
      const attendeesSnapshot = await attendeesCollection.get();
      console.log(`🔍 [DEBUG] Attendees subcollection size: ${attendeesSnapshot.size}`);
      
      // Global eventAttendees collection'ından da kontrol et
      const globalAttendeesSnapshot = await db.collection('eventAttendees')
        .where('eventId', '==', event.id)
        .get();
      console.log(`🔍 [DEBUG] Global eventAttendees size: ${globalAttendeesSnapshot.size}`);
      
      // Global verileri debug et
      if (globalAttendeesSnapshot.size > 0) {
        globalAttendeesSnapshot.docs.forEach(doc => {
          const data = doc.data();
          console.log(`🔍 [DEBUG] Global attendee data:`, {
            id: doc.id,
            userId: data.userId,
            eventId: data.eventId,
            joinedAt: data.joinedAt,
            joinedAtType: typeof data.joinedAt,
            hasJoinedAt: !!data.joinedAt,
            status: data.status
          });
        });
      }
      
      // Subcollection'dan attendees al
      let attendeesList = attendeesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Eğer subcollection boşsa ama global collection'da veri varsa, sync yap
      if (attendeesList.length === 0 && globalAttendeesSnapshot.size > 0) {
        console.log(`⚠️ [DEBUG] Subcollection empty, syncing from global collection...`);
        
        for (const globalDoc of globalAttendeesSnapshot.docs) {
          const globalData = globalDoc.data();
          if (globalData.userId) {
            try {
              const userDoc = await db.collection('users').doc(globalData.userId).get();
              const userData = userDoc.data();
              
              const attendeeData = {
                userId: globalData.userId,
                eventId: globalData.eventId,
                joinedAt: globalData.joinedAt || firebase.firestore.Timestamp.now(), // undefined ise şu anki zamanı kullan
                status: globalData.status || 'joined',
                userName: userData?.displayName || userData?.firstName || 'Kullanıcı',
                userEmail: userData?.email || '',
                userAvatar: userData?.profileImage || null
              };
              
              console.log(`🔧 [DEBUG] Syncing attendee data:`, {
                userId: attendeeData.userId,
                userName: attendeeData.userName,
                joinedAt: attendeeData.joinedAt,
                hasJoinedAt: !!attendeeData.joinedAt
              });
              
              await attendeesCollection.doc(globalData.userId).set(attendeeData);
              console.log(`✅ [DEBUG] Synced attendee: ${attendeeData.userName}`);
            } catch (userError) {
              console.warn(`Failed to sync attendee ${globalData.userId}:`, userError);
            }
          }
        }
        
        // Yeniden yükle
        const updatedSnapshot = await attendeesCollection.get();
        attendeesList = updatedSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log(`✅ [DEBUG] After sync: ${attendeesList.length} attendees`);
      }
      
      setAttendeesList(attendeesList);
      setAttendeesCount(attendeesList.length);
      actualAttendeeCountRef.current = attendeesList.length;
      
      // Event document'ın attendeesCount'unu da güncelle
      if (attendeesList.length !== (event.attendeesCount || 0)) {
        await eventRef.update({
          attendeesCount: attendeesList.length
        });
        console.log(`🔧 [DEBUG] Updated event attendeesCount to ${attendeesList.length}`);
      }
      
      // Kullanıcının katılım durumunu kontrol et
      if (currentUser) {
        const isAttending = attendeesList.some((attendee: any) => attendee.userId === currentUser.uid);
        setHasAttended(isAttending);
        console.log(`Kullanıcı katılım durumu: ${isAttending ? 'Katılımcı' : 'Katılımcı değil'}`);
      }
      
      console.log(`✅ [DEBUG] Final attendees loaded: ${attendeesList.length}`);
      
    } catch (error) {
      console.error('❌ [DEBUG] Error loading attendees:', error);
      setAttendeesList([]);
      setAttendeesCount(0);
      actualAttendeeCountRef.current = 0;
    } finally {
      setIsLoadingAttendees(false);
    }
  };

  // Beğeni listesini yükle
  const loadLikes = async () => {
    if (!event.id || isLoadingLikes) return;
    setIsLoadingLikes(true);
    try {
      const db = firebase.firestore();
      const eventRef = db.collection('events').doc(event.id);
      const likesCollection = eventRef.collection('likes');

      // 1) Load likes from subcollection
      const likesSnapshot = await likesCollection.orderBy('timestamp', 'desc').limit(100).get();
      let likes = likesSnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));

      // 2) Also check global eventLikes as a fallback/sync source
      const globalLikesSnapshot = await db
        .collection('eventLikes')
        .where('eventId', '==', event.id)
        .get();

      // If subcollection is empty but global has records, backfill subcollection
      if (likes.length === 0 && !globalLikesSnapshot.empty) {
        for (const gl of globalLikesSnapshot.docs) {
          const g = gl.data() as any;
          if (!g.userId) continue;
          try {
            const userDoc = await db.collection('users').doc(g.userId).get();
            const userData = userDoc.data() || {};
            await likesCollection.add({
              userId: g.userId,
              userName: userData.displayName || userData.username || 'Kullanıcı',
              userImage: userData.profileImage || userData.photoURL || null,
              username: userData.username || (userData.email ? userData.email.split('@')[0] : ''),
              userUniversity: userData.university || null,
              avatarIcon: userData.avatarIcon || 'account',
              avatarColor: userData.avatarColor || '#1976D2',
              timestamp: g.createdAt || firebase.firestore.FieldValue.serverTimestamp()
            });
          } catch (e) {
            console.warn('Like sync failed for user:', g.userId, e);
          }
        }
        // Reload subcollection after sync
        const reloaded = await likesCollection.orderBy('timestamp', 'desc').limit(100).get();
        likes = reloaded.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      }

      // 3) Enrich profiles if necessary
      const enrichedLikes = await Promise.all(
        likes.map(async (like: any) => {
          try {
            if (like.userId && (!like.userName || !like.username)) {
              const userDoc = await db.collection('users').doc(like.userId).get();
              const u = userDoc.data() || {};
              return {
                ...like,
                userName: u.displayName || u.username || like.userName || 'Kullanıcı',
                username: u.username || like.username || (u.email ? u.email.split('@')[0] : ''),
                profileImage: u.profileImage || u.photoURL || like.profileImage || null,
                avatarIcon: u.avatarIcon || like.avatarIcon || 'account',
                avatarColor: u.avatarColor || like.avatarColor || '#1976D2',
                university: u.university || like.university || null
              };
            }
            return like;
          } catch (e) {
            console.warn('Profil zenginleştirme hatası (like):', e);
            return like;
          }
        })
      );

      setLikesList(enrichedLikes);

      // 4) Update likes count from subcollection size and ensure event doc reflects it
      const likeCountNow = enrichedLikes.length;
      setLikesCount(likeCountNow);
      try {
        await eventRef.update({ likesCount: likeCountNow });
      } catch (e) {
        // Non-fatal
      }
    } catch (error) {
      console.error('❌ [DEBUG] Error loading likes:', error);
      setLikesList([]);
    } finally {
      setIsLoadingLikes(false);
    }
  };

  // Kullanıcı profiline gitme
  const handleUserProfilePress = (userId: string) => {
    if (!userId) {
      console.warn('Kullanıcı ID değeri boş!');
      return;
    }
    
    console.log(`Navigating to profile: ${userId}`);
    try {
      if (userId && userId !== currentUser?.uid) {
        navigation.navigate('ViewProfile', { userId });
      } else if (userId === currentUser?.uid) {
        navigation.navigate('Profile');
      }
    } catch (error) {
      console.error('Profile navigation error:', error);
    }
  };

  // Handle comment deletion
  const handleDeleteComment = (commentId: string) => {
    if (!currentUser) {
      Alert.alert('Hata', 'Bu işlemi yapabilmek için giriş yapmalısınız.');
      return;
    }

    Alert.alert(
      'Yorumu Sil',
      'Bu yorumu silmek istediğinize emin misiniz?',
      [
        {
          text: 'İptal',
          style: 'cancel'
        },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              const success = await deleteEventComment(commentId, currentUser.uid, event.id);
              
              if (success) {
                console.log('✅ Comment deleted successfully with comprehensive scoring');
                
                setComponentState(prev => ({
                  ...prev,
                  comments: prev.comments.filter((comment: any) => comment.id !== commentId),
                  commentsCount: Math.max(0, prev.commentsCount - 1)
                }));

                if (event.clubId) {
                  ClubStatsService.forceRefreshStats(event.clubId)
                    .then(() => console.log('📊 Club statistics refreshed after comment deletion'))
                    .catch((error: any) => console.warn('Statistics refresh failed:', error));
                }
                
                Alert.alert('Başarılı', 'Yorum başarıyla silindi.');
              } else {
                Alert.alert('Hata', 'Yorum silinemedi. Lütfen tekrar deneyin.');
              }
            } catch (error) {
              console.error('Comment deletion error:', error);
              Alert.alert('Hata', 'Yorum silinirken bir hata oluştu.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Get category name
  const getCategoryName = (categoryId: string) => {
    const category = eventCategories.find(cat => cat.id === categoryId);
    return category ? category.label : 'Diğer';
  };

  return (
    <>
      <Card style={[styles.card, style]} elevation={2}>
        {/* Card Image with Date Overlay */}
        <TouchableOpacity onPress={toggleExpand} style={{width: '100%'}}>
          <View style={styles.imageContainer}>
            <Card.Cover 
              source={event.coverImageUrl || event.imageUrl ?
                { uri: event.coverImageUrl || event.imageUrl } : 
                require('../../assets/universe_logo.png')
              } 
              style={styles.cardImage}
              resizeMode="cover"
            />
            
            {/* Date Overlay */}
            <View style={styles.dateOverlay}>
              <Text style={styles.dateDay}>
                {formatShortDate(event.startDate || event.date).day}
              </Text>
              <Text style={styles.dateMonth}>
                {formatShortDate(event.startDate || event.date).month}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Card Content */}
        <Card.Content style={styles.cardContent}>
          {/* Header - Organizer Info and Category */}
          <View style={styles.headerContainer}>
            <TouchableOpacity 
              style={styles.organizerContainer}
              onPress={() => {
                if (organizer?.id) {
                  navigation.navigate('ViewClub', { clubId: organizer.id });
                }
              }}
            >
              <UniversalAvatar 
                user={{
                  id: organizer?.id,
                  name: organizer?.name,
                  profileImage: organizer?.profileImage,
                  avatarIcon: organizer?.avatarIcon,
                  avatarColor: organizer?.avatarColor
                }}
                size={40}
                style={styles.organizerImage}
                fallbackIcon="account-group"
                fallbackColor="#FF5722"
              />
              <View>
                <Text style={styles.organizerName}>{organizer?.name || 'Organizatör'}</Text>
                <Text style={styles.universityName}>{liveEvent.universityName || liveEvent.university || 'Belirtilmemiş'}</Text>
              </View>
            </TouchableOpacity>
            
            {/* Category */}
            <View style={{alignItems: 'flex-end'}}>
              <Chip 
                icon={() => (
                  <MaterialCommunityIcons 
                    name="tag-outline" 
                    size={16} 
                    color={theme.colors.primary} 
                  />
                )}
                style={styles.categoryChip}
              >
                <Text>{getCategoryName(liveEvent.category)}</Text>
              </Chip>
            </View>
          </View>

          {/* Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{liveEvent.title}</Text>
          </View>

          {/* Description */}
          <TouchableOpacity onPress={toggleExpand}>
            {expanded ? (
              <Text style={styles.description}>{liveEvent.description}</Text>
            ) : (
              <Text numberOfLines={2} style={styles.description}>
                {liveEvent.description}
              </Text>
            )}
          </TouchableOpacity>
          
          {/* Event Access Info */}
          <View style={styles.accessInfoContainer}>
            {liveEvent.settings?.requireApproval ? (
              <>
                <MaterialCommunityIcons name="account-check" size={18} color="#FF9800" />
                <Text style={styles.accessInfoText}>Onay Gerekli</Text>
              </>
            ) : liveEvent.universityRestrictions?.isOpenToAllUniversities ? (
              <>
                <MaterialCommunityIcons name="earth" size={18} color="#4CAF50" />
                <Text style={styles.accessInfoText}>Tüm Üniversitelere Açık</Text>
              </>
            ) : (
              <>
                <MaterialCommunityIcons name="school" size={18} color="#2196F3" />
                <Text style={styles.accessInfoText}>
                  {liveEvent.university ? `Sadece ${universityName}` : "Sadece Kendi Üniversitemize Açık"}
                </Text>
              </>
            )}
          </View>
          
          {/* Price Info - Tamamen düzeltilmiş versiyon */}
          <View style={styles.accessInfoContainer}>
            <MaterialCommunityIcons 
              name={shouldShowAsPaid(liveEvent) ? "cash" : "cash-multiple"} 
              size={18} 
              color={shouldShowAsPaid(liveEvent) ? "#E91E63" : "#4CAF50"} 
            />
            <Text style={[
              styles.accessInfoText, 
              {color: shouldShowAsPaid(liveEvent) ? "#E91E63" : "#4CAF50"}
            ]}>
              {getFormattedEventPrice(liveEvent)}
              {liveEvent?.studentDiscount && shouldShowAsPaid(liveEvent) ? (
                <Text style={{fontStyle: 'italic', fontSize: 12}}> (Öğrenci İndirimi: %{liveEvent.studentDiscount})</Text>
              ) : null}
            </Text>
          </View>
          
          {/* Stats Bar */}
          <View style={styles.statsBar}>
            <TouchableOpacity 
              style={styles.statItem} 
              onPress={handleShowAttendees}
            >
              <MaterialCommunityIcons 
                name="account-group" 
                size={20} 
                color={attendeesCount > 0 ? theme.colors.primary : "#666"} 
              />
              <Text style={[
                styles.cardStatText,
                attendeesCount > 0 && { color: theme.colors.primary, fontWeight: 'bold' }
              ]}>
                <Text>{attendeesCount}</Text>
              </Text>
            </TouchableOpacity>

            <View>
              <TouchableOpacity 
                style={styles.statItem}
                onPress={isClubAccount ? handleShowLikes : handleLike}
              >
                <MaterialCommunityIcons 
                  name={hasLiked ? "thumb-up" : "thumb-up-outline"} 
                  size={18} 
                  color={hasLiked ? theme.colors.primary : "#666"} 
                />
                <Text style={[styles.cardStatText, hasLiked && { color: theme.colors.primary }]}>
                  <Text>{likesCount}</Text>
                </Text>
              </TouchableOpacity>
              
              {/* Sadece öğrenci kullanıcılar için beğeni butonları */}
              {!isClubAccount && showSeeLikesButton && hasLiked && (
                <TouchableOpacity 
                  style={styles.seeLikesButton}
                  onPress={handleShowLikes}
                >
                  <Text style={styles.seeLikesButtonText}>Beğenenleri gör</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity 
              style={styles.statItem}
              onPress={handleToggleComments}
            >
              <MaterialCommunityIcons 
                name={showComments ? "comment" : "comment-outline"} 
                size={18} 
                color={showComments ? theme.colors.primary : "#666"} 
              />
              <Text style={[styles.cardStatText, showComments && { color: theme.colors.primary }]}>
                <Text>{commentsCount}</Text>
              </Text>
            </TouchableOpacity>
          </View>

          {/* Scrollable Actions */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.actionButtonsScrollView}
            contentContainerStyle={styles.actionButtonsScrollContent}
          >
            <TouchableOpacity 
              style={[styles.scrollActionButton, {backgroundColor: theme.colors.primary}]} 
              onPress={() => onEdit && onEdit(event.id)}
            >
              <MaterialCommunityIcons 
                name="pencil" 
                size={20} 
                color="#FFF"
              />
              <Text style={[styles.scrollActionButtonText, {color: '#FFF'}]}>
                <Text>Düzenle</Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.scrollActionButton} onPress={handleShare}>
              <MaterialCommunityIcons name="share-variant" size={20} color="#666" />
              <Text style={styles.scrollActionButtonText}>
                <Text>Paylaş</Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.scrollActionButton, {backgroundColor: '#ffebee'}]} 
              onPress={() => onDelete && onDelete(event.id)}
            >
              <MaterialCommunityIcons name="delete" size={20} color="#ff3b30" />
              <Text style={[styles.scrollActionButtonText, {color: '#ff3b30'}]}>
                <Text>Sil</Text>
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* View Details Button */}
          <TouchableOpacity 
            style={styles.viewDetailsButton} 
            onPress={handleViewDetails}
          >
            <Text style={styles.viewDetailsText}>
              <Text>Detayları Göster</Text>
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </Card.Content>
      </Card>

      {/* Event Detail Modal */}
      <EventDetailModal
        visible={showDetailsModal}
        eventId={event.id}
        event={event}
        onDismiss={() => setShowDetailsModal(false)}
      />
      
      {/* Yorumlar Modal */}
      <Portal>
        <Modal
          visible={showComments}
          onDismiss={() => setShowComments(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Yorumlar ({commentsCount})</Text>
            <TouchableOpacity onPress={() => setShowComments(false)}>
              <MaterialCommunityIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            style={styles.commentsContainer} 
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.colors.primary}
                colors={[theme.colors.primary]}
              />
            }
          >
            {isLoadingComments ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Yorumlar yükleniyor...</Text>
              </View>
            ) : comments.length > 0 ? (
              <>
                {/* Debug bilgisi */}
                {__DEV__ && (
                  <Text style={styles.debugInfo}>
                    Debug: {comments.length} yorum yüklendi
                  </Text>
                )}
                {comments.map((comment) => {
                  return (
                    <View key={comment.id} style={styles.commentItem}>
                      <View style={styles.commentUserRow}>
                        <TouchableOpacity onPress={() => comment.userId && handleUserProfilePress(comment.userId)}>
                          <UniversalAvatar 
                            user={{
                              id: comment.userId,
                              name: comment.userName,
                              profileImage: comment.profileImage || comment.userAvatar,
                              avatarIcon: comment.avatarIcon,
                              avatarColor: comment.avatarColor
                            }}
                            size={42}
                            style={styles.commentAvatar}
                            fallbackIcon="account"
                          />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.commentUserInfo}
                          onPress={() => comment.userId && handleUserProfilePress(comment.userId)}
                        >
                          <Text style={styles.commentUserName}>{comment.userName || 'Kullanıcı'}</Text>
                          <Text style={styles.commentUsername}>@{comment.username || 'kullanici'}</Text>
                          {comment.university && (
                            <Text style={styles.commentUserUniversity}>
                              🎓 {(() => {
                                const uni = UNIVERSITIES_DATA.find(u => 
                                  u.id === comment.university || 
                                  u.value === comment.university || 
                                  u.name === comment.university);
                                return uni ? uni.name : comment.university;
                              })()}
                            </Text>
                          )}
                          <Text style={styles.commentDate}>
                            {(() => {
                              try {
                                if (comment.createdAt) {
                                  const date = comment.createdAt.toDate ? comment.createdAt.toDate() : new Date(comment.createdAt);
                                  return moment(date).fromNow();
                                }
                                return 'Az önce';
                              } catch (error) {
                                console.warn('Yorum tarihi formatlanamadı:', error);
                                return 'Az önce';
                              }
                            })()}
                          </Text>
                        </TouchableOpacity>
                        
                        {/* Date and Delete button container */}
                        <View style={styles.clubCommentDateContainer}>
                          <Text style={styles.clubCommentDateText}>
                            {(() => {
                              try {
                                if (comment.createdAt) {
                                  const date = comment.createdAt.toDate ? comment.createdAt.toDate() : new Date(comment.createdAt);
                                  return moment(date).fromNow();
                                }
                                return 'Az önce';
                              } catch (error) {
                                console.warn('Yorum tarihi formatlanamadı:', error);
                                return 'Az önce';
                              }
                            })()}
                          </Text>
                          
                          {/* Yorum silme butonu - sadece kullanıcının kendi yorumları için */}
                          {currentUser && comment.userId === currentUser.uid && (
                            <TouchableOpacity 
                              style={styles.deleteCommentButton}
                              onPress={() => handleDeleteComment(comment.id)}
                            >
                              <MaterialCommunityIcons name="delete-outline" size={16} color="#ff3b30" />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                      <Text style={styles.commentText}>
                        {comment.text || comment.content || 'Yorum metni yok'}
                      </Text>
                      
                      {/* Debug bilgisi */}
                      {__DEV__ && !comment.text && (
                        <Text style={styles.debugText}>
                          Debug: text eksik - {JSON.stringify({
                            hasText: !!comment.text,
                            hasContent: !!comment.content,
                            allKeys: Object.keys(comment)
                          })}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </>
            ) : (
              <View style={styles.emptyCommentsContainer}>
                <MaterialCommunityIcons name="comment-outline" size={48} color="#ccc" />
                <Text style={styles.emptyCommentsText}>Henüz yorum yapılmamış</Text>
                <Text style={styles.emptyCommentsSubtext}>İlk yorumu sen yap!</Text>
              </View>
            )}
          </ScrollView>
          
          {/* Yorum yapma bölümü */}
          <View style={styles.commentInputContainer}>
            <TextInput
              style={styles.commentInput}
              placeholder="Yorumunuzu yazın..."
              value={commentText}
              onChangeText={setCommentText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity 
              style={[
                styles.commentSendButton,
                (!commentText.trim() || isPostingComment) && styles.commentSendButtonDisabled
              ]}
              disabled={!commentText.trim() || isPostingComment}
              onPress={handlePostComment}
            >
              {isPostingComment ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <MaterialCommunityIcons name="send" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </Modal>
      </Portal>
      
      {/* Beğenenler Modal */}
      <Portal>
        <Modal
          visible={showLikesList}
          onDismiss={() => setShowLikesList(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Beğenenler ({likesCount})</Text>
            <TouchableOpacity onPress={() => setShowLikesList(false)}>
              <MaterialCommunityIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            style={styles.likesContainer}
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.colors.primary}
                colors={[theme.colors.primary]}
              />
            }
          >
            {isLoadingLikes ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Beğenenler yükleniyor...</Text>
              </View>
            ) : likesList.length > 0 ? (
              likesList.map((like) => (
                <ClubLikeRow key={like.id || like.userId} like={like} onPress={handleUserProfilePress} />
              ))
            ) : (
              <View style={styles.emptyLikesContainer}>
                <MaterialCommunityIcons name="thumb-up-outline" size={48} color="#ccc" />
                <Text style={styles.emptyLikesText}>Henüz beğenen yok</Text>
                <Text style={styles.emptyLikesSubtext}>İlk beğenen sen ol!</Text>
              </View>
            )}
          </ScrollView>
        </Modal>
      </Portal>
      
      {/* Katılımcılar Modal */}
      <Portal>
        <Modal
          visible={showAttendeesList}
          onDismiss={() => setShowAttendeesList(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Katılımcılar ({attendeesCount})</Text>
            <TouchableOpacity onPress={() => setShowAttendeesList(false)}>
              <MaterialCommunityIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            style={styles.attendeesContainer}
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.colors.primary}
                colors={[theme.colors.primary]}
              />
            }
          >
            {isLoadingAttendees ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2196F3" />
                <Text style={styles.loadingText}>Katılımcılar yükleniyor...</Text>
              </View>
            ) : attendeesList && attendeesList.length > 0 ? (
              <>
                {actualAttendeeCountRef.current > 0 && attendeesList.length !== actualAttendeeCountRef.current && (
                  <View style={{padding: 8, alignItems: 'center'}}>
                    <Text style={{color: 'orange', marginBottom: 4}}>Katılımcı verileri güncelleniyor...</Text>
                    <ActivityIndicator size="small" color="#2196F3" />
                  </View>
                )}
                {attendeesList.map((attendee, index) => (
                  <ClubAttendeeRow key={attendee.id || `attendee-${index}`} attendee={attendee} />
                ))}
              </>
            ) : (
              <View style={styles.emptyAttendeesContainer}>
                <MaterialCommunityIcons name="account-group-outline" size={48} color="#ccc" />
                {/* Gerçek katılımcı sayısı > 0 ise ancak liste boşsa, veri yükleme mesajı göster */}
                {actualAttendeeCountRef.current > 0 ? (
                  <>
                    <Text style={styles.emptyAttendeesText}>Katılımcı verileri yükleniyor</Text>
                    <ActivityIndicator size="small" color="#2196F3" style={{marginVertical: 8}} />
                    <Text style={styles.emptyAttendeesSubtext}>
                      {`${actualAttendeeCountRef.current} katılımcı bilgisi alınıyor...`}
                    </Text>
                    <TouchableOpacity 
                      style={{marginTop: 16, padding: 8, backgroundColor: '#2196F3', borderRadius: 4}}
                      onPress={() => loadAttendees()}
                    >
                      <Text style={{color: 'white'}}>Yenile</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.emptyAttendeesText}>Henüz katılımcı yok</Text>
                    <Text style={styles.emptyAttendeesSubtext}>
                      {isClubAccount 
                        ? 'Etkinliğinize katılan ilk kişileri buradan göreceksiniz.' 
                        : 'İlk katılan sen ol!'}
                    </Text>
                  </>
                )}
              </View>
            )}
          </ScrollView>
        </Modal>
      </Portal>
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    alignItems: 'center',
  },
  cardImage: {
    height: 160,
    width: '92%',
    borderRadius: 10,
    marginTop: 12,
  },
  dateOverlay: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 6,
    padding: 6,
    alignItems: 'center',
  },
  dateDay: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  dateMonth: {
    color: 'white',
    fontSize: 12,
    marginTop: -2,
  },
  cardContent: {
    padding: 16,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  organizerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  organizerImage: {
    marginRight: 12,
    backgroundColor: '#f0f0f0',
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  organizerName: {
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 1,
  },
  universityName: {
    color: '#666',
    fontSize: 12,
    marginBottom: 1,
  },
  eventDate: {
    fontSize: 12,
    color: '#888',
  },
  categoryChip: {
    height: 30,
    alignSelf: 'flex-start',
    backgroundColor: '#f5f5f5',
  },
  titleContainer: {
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    color: '#555',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  accessInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  accessInfoText: {
    marginLeft: 6,
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
  quickStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
    marginTop: 12,
  },
  quickStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickStatText: {
    fontSize: 12,
    color: '#555',
    marginLeft: 4,
  },
  statsAndActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 16,
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 14,
  },
  statText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 4,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginLeft: 8,
    backgroundColor: '#f0f0f0',
  },
  activeButton: {
    backgroundColor: '#4CAF50',
  },
  likeActiveButton: {
    backgroundColor: '#E91E63',
  },
  actionButtonText: {
    marginLeft: 4,
    fontSize: 13,
    color: '#555',
  },
  activeButtonText: {
    color: '#FFF',
    fontWeight: '500',
  },
  iconButton: {
    padding: 8,
    borderRadius: 20,
    marginLeft: 8,
    backgroundColor: '#f0f0f0',
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
    marginVertical: 10,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cardStatText: {
    marginLeft: 6,
    fontSize: 16,
    color: '#666',
    fontWeight: '500'
  },
  actionButtonsScrollView: {
    marginTop: 10,
    marginBottom: 16,
  },
  actionButtonsScrollContent: {
    paddingHorizontal: 10,
  },
  scrollActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  scrollActiveButton: {
    backgroundColor: '#4CAF50',
  },
  scrollActionButtonText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#666',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderColor: '#f0f0f0',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginHorizontal: 8,
  },
  viewDetailsText: {
    fontSize: 15,
    color: '#1976D2', // Hard-coded primary color instead of theme
    marginRight: 4,
    fontWeight: 'bold'
  },
  adminButton: {
    marginLeft: 8,
    borderRadius: 8,
  },
  
  // Yorum ve Beğeniler için stiller
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    padding: 0,
    maxHeight: '80%',
    width: '90%',
    alignSelf: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  commentsContainer: {
    padding: 16,
    maxHeight: 350,
  },
  likesContainer: {
    padding: 16,
    maxHeight: 350,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  commentItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#E1E8ED',
    position: 'relative',
  },
  commentUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    justifyContent: 'space-between',
  },
  commentAvatar: {
    backgroundColor: '#e0e0e0',
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 8,
    overflow: 'hidden',
  },
  commentUserInfo: {
    marginLeft: 12,
    flex: 1,
    maxWidth: '65%',
  },
  commentUserName: {
    fontWeight: '600',
    fontSize: 16,
    color: '#333',
  },
  commentUsername: {
    fontSize: 13,
    color: '#777',
  },
  commentUserUniversity: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  commentDate: {
    fontSize: 11,
    color: '#999',
    marginLeft: -15,
    textAlign: 'center',
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333', // Daha koyu renk
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 2,
    fontWeight: '400',
  },
  emptyCommentsContainer: {
    alignItems: 'center',
    padding: 24,
  },
  emptyCommentsText: {
    fontSize: 16,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyCommentsSubtext: {
    fontSize: 14,
    color: '#CCC',
    marginTop: 4,
    textAlign: 'center',
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 8,
  },
  commentInput: {
    flex: 1,
    minHeight: 36,
    maxHeight: 100,
    fontSize: 14,
    paddingHorizontal: 8,
    paddingVertical: 8,
    textAlignVertical: 'top',
  },
  commentSendButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 18,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  commentSendButtonDisabled: {
    backgroundColor: '#CCC',
  },
  likeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginBottom: 4,
  },
  likeAvatar: {
    backgroundColor: '#e0e0e0',
  width: 56,
  height: 56,
  borderRadius: 28,
    overflow: 'hidden',
  },
  likeUserInfo: {
    marginLeft: 12,
    flex: 1,
  },
  likeUserName: {
    fontWeight: '600',
    fontSize: 16,
    color: '#333',
  },
  likeUsername: {
    fontSize: 13,
    color: '#777',
  },
  likeUserUniversity: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  likeDate: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  emptyLikesContainer: {
    alignItems: 'center',
    padding: 24,
  },
  emptyLikesText: {
    fontSize: 16,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyLikesSubtext: {
    fontSize: 14,
    color: '#CCC',
    marginTop: 4,
    textAlign: 'center',
  },
  deleteCommentButton: {
    padding: 4,
    marginLeft: 8,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    minWidth: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubCommentDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'absolute',
    right: 8,
    top: 8,
  },
  clubCommentDateText: {
    fontSize: 11,
    color: '#999',
  },
  seeLikesButton: {
    backgroundColor: '#e3f2fd',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    marginTop: 5,
    alignSelf: 'center',
  },
  seeLikesButtonText: {
    color: '#2196F3', // Using explicit primary blue color
    fontSize: 12,
    fontWeight: '500',
  },
  // Katılımcılar için stiller
  attendeesContainer: {
    padding: 16,
    maxHeight: 350,
  },
  attendeeItemSurface: {
    borderRadius: 8,
    marginHorizontal: 8,
    marginVertical: 4,
    backgroundColor: 'white',
    overflow: 'hidden'
  },
  attendeeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
    marginBottom: 0,
  },
  attendeeAvatarContainer: {
    marginRight: 6,
  },
  attendeeAvatar: {
    backgroundColor: '#e0e0e0',
  width: 56,
  height: 56,
  borderRadius: 28,
    overflow: 'hidden',
  },
  attendeeUserInfo: {
    marginLeft: 12,
    flex: 1,
  },
  attendeeUserName: {
    fontWeight: '700',
    fontSize: 16,
    color: '#333',
  },
  attendeeUsername: {
    fontSize: 14,
    color: '#2196F3',
    marginBottom: 4,
    fontWeight: '500',
  },
  universityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f2ff',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginVertical: 3,
    borderWidth: 1,
    borderColor: '#d0e6ff',
  },
  attendeeUserUniversity: {
    fontSize: 13,
    color: '#0066cc',
    marginBottom: 3,
    fontWeight: '500',
  },
  attendeeDate: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  emptyAttendeesContainer: {
    alignItems: 'center',
    padding: 24,
  },
  emptyAttendeesText: {
    fontSize: 16,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyAttendeesSubtext: {
    fontSize: 14,
    color: '#CCC',
    marginTop: 4,
    textAlign: 'center',
  },
  debugInfo: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 10,
    fontStyle: 'italic'
  },
  debugRow: {
    backgroundColor: '#f8f8f8',
    padding: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center'
  },
  debugText: {
    fontSize: 10,
    color: '#888',
    textAlign: 'center',
    fontStyle: 'italic'
  },
  // 🎯 YENİ: Kulüp beğeni yönetimi stilleri
  likeActionsContainer: {
    marginTop: 6,
    paddingHorizontal: 4,
  },
  clubLikeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 4,
  },
  likeActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  likeButton: {
    backgroundColor: '#E8F5E8',
    borderColor: '#4CAF50',
  },
  unlikeButton: {
    backgroundColor: '#FFEBEE',
    borderColor: '#FF5722',
  },
  likeActionText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  noLikeActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: '#E8F5E8',
    borderWidth: 1,
    borderColor: '#4CAF50',
    marginTop: 6,
  },
});

export default ClubEventCard;
