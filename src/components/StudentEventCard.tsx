import React, { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  Animated, 
  Share, 
  Alert, 
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager,
  ScrollView,
  TextInput,
  Modal,
  RefreshControl,
  FlatList,
} from 'react-native';
import { 
  Text, 
  Card,
  useTheme,
  Avatar
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { UNIVERSITIES_DATA } from '../constants';
import { NavigationContext } from '@react-navigation/native';
import { firebase } from '../firebase';
import { UniversalAvatar } from './common';
import { addEventComment, deleteEventComment, getEventComments } from '../firebase/commentManagement';
import { ClubStatsService } from '../services/clubStatsService';
import { ClubNotificationService } from '../services/clubNotificationService';
import { UnifiedNotificationService } from '../services/unifiedNotificationService';
import { useAuth } from '../contexts/AuthContext';
import EventDetailModal from './EventDetailModal';
import { activityLogger } from '../services/activityLogger';
import moment from 'moment';
import 'moment/locale/tr';
import { userActivityService } from '../services/enhancedUserActivityService';
import { useUserAvatar } from '../hooks/useUserAvatar';
import { leaderboardDataSyncService } from '../services/leaderboardDataSyncService';
import { logger } from '../utils/logger';

moment.locale('tr');

// Kullanıcı ID'sine göre tutarlı avatar rengi oluştur
const getAvatarColor = (userId: string): string => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA726', 
    '#AB47BC', '#26A69A', '#42A5F5', '#66BB6A',
    '#EF5350', '#5C6BC0', '#FF7043', '#9CCC65',
    '#8E24AA', '#D4AC0D', '#E67E22', '#E74C3C',
    '#3498DB', '#2ECC71', '#F39C12', '#9B59B6'
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

// Tek bir yorum satırını canlı kimlik verileriyle gösteren bileşen
const CommentItemRow: React.FC<{
  comment: any;
  currentUserId?: string;
  onPressProfile: (userId: string) => void;
  onDelete: (commentId: string) => void;
}> = ({ comment, currentUserId, onPressProfile, onDelete }) => {
  const theme = useTheme();
  const userId = comment?.userId || comment?.authorId || '';
  const { avatarData } = useUserAvatar(userId);

  const liveDisplayName = avatarData?.displayName || comment?.displayName || comment?.userName || 'Kullanıcı';
  const liveUsername = avatarData?.userName || comment?.username || (comment?.email ? comment.email.split('@')[0] : '');
  const liveUniversity = avatarData?.university || comment?.university || '';

  const createdAtVal = comment?.createdAt || comment?.timestamp || null;
  const createdDate = createdAtVal
    ? (typeof createdAtVal?.toDate === 'function' ? createdAtVal.toDate() : new Date(createdAtVal))
    : null;

  return (
    <View style={styles.commentItem}>
      <View style={styles.commentHeader}>
        <TouchableOpacity 
          style={styles.commentUserInfo}
          onPress={() => onPressProfile(userId)}
        >
          <UniversalAvatar 
            user={{ id: userId, displayName: liveDisplayName, profileImage: comment?.profileImage || comment?.userAvatar, avatarIcon: comment?.avatarIcon, avatarColor: comment?.avatarColor || getAvatarColor(userId) }}
            size={32}
            style={styles.commentAvatar}
            fallbackIcon="account"
          />
          <View style={styles.commentUserDetails}>
            <Text style={styles.commentAuthor}>{liveDisplayName}</Text>
            {!!liveUsername && <Text style={styles.commentUsername}>@{liveUsername}</Text>}
            {!!liveUniversity && (
              <View style={styles.commentUniversityBadge}>
                <MaterialCommunityIcons name="school" size={12} color="#0066cc" />
                <Text style={styles.commentUniversity}>{liveUniversity}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.commentDateContainer}>
          <Text style={styles.commentDate}>
            {createdDate ? moment(createdDate).fromNow() : ''}
          </Text>
          {currentUserId && userId === currentUserId && (
            <TouchableOpacity
              style={styles.deleteCommentButton}
              onPress={() => onDelete(comment.id)}
            >
              <MaterialCommunityIcons name="delete" size={16} color="#FF5252" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      <Text style={styles.commentText}>{comment?.text || comment?.content || ''}</Text>
    </View>
  );
};

// Katılımcı satırı: canlı foto/isim/kullanıcı adı/üniversite
const AttendeeItemRow: React.FC<{
  user: any;
  isCurrent?: boolean;
  onPress: (userId: string) => void;
}> = ({ user, isCurrent, onPress }) => {
  const uid = user?.userId || user?.uid || user?.id || '';
  const { avatarData } = useUserAvatar(uid);
  const displayName = avatarData?.displayName || user?.displayName || user?.userName || 'Kullanıcı';
  const username = avatarData?.userName || user?.username || (user?.email ? user.email.split('@')[0] : '');
  const university = avatarData?.university || user?.university || '';

  return (
    <TouchableOpacity
      onPress={() => onPress(uid)}
      style={[
        styles.userItem,
        isCurrent && { backgroundColor: '#f0f8ff' }
      ]}
    >
      <UniversalAvatar 
        user={{
          id: uid,
          displayName,
          profileImage: user?.profileImage,
          avatarIcon: user?.avatarIcon,
          avatarColor: user?.avatarColor
        }}
        size={60}
        style={styles.userAvatar}
        fallbackIcon="account"
      />
      <View style={styles.userInfo}>
        <Text style={styles.userName} numberOfLines={1}>
          {displayName} {isCurrent && <Text style={{color: '#4CAF50'}}>(Siz)</Text>}
        </Text>
        {!!username && (
          <Text style={styles.userDetail} numberOfLines={1}>@{username}</Text>
        )}
        {!!university && (
          <View style={styles.universityBadge}>
            <MaterialCommunityIcons name="school" size={14} color="#0066cc" />
            <Text style={styles.userUniversity} numberOfLines={1}>{university}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

// Beğenen satırı: canlı foto/isim/kullanıcı adı/üniversite
const LikeItemRow: React.FC<{
  user: any;
  onPress: (userId: string) => void;
}> = ({ user, onPress }) => {
  const uid = user?.userId || user?.uid || user?.id || '';
  const { avatarData } = useUserAvatar(uid);
  const displayName = avatarData?.displayName || user?.displayName || user?.userName || 'Kullanıcı';
  const username = avatarData?.userName || user?.username || (user?.email ? user.email.split('@')[0] : '');
  const university = avatarData?.university || user?.university || '';

  return (
    <TouchableOpacity
      onPress={() => onPress(uid)}
      style={styles.userItem}
    >
      <UniversalAvatar 
        user={{
          id: uid,
          displayName,
          profileImage: user?.profileImage,
          avatarIcon: user?.avatarIcon,
          avatarColor: user?.avatarColor
        }}
        size={56}
        style={styles.userAvatar}
        fallbackIcon="account"
      />
      <View style={styles.userInfo}>
        <Text style={styles.userName} numberOfLines={1}>{displayName}</Text>
        {!!username && (
          <Text style={styles.userDetail} numberOfLines={1}>@{username}</Text>
        )}
        {!!university && (
          <View style={styles.universityBadge}>
            <MaterialCommunityIcons name="school" size={14} color="#0066cc" />
            <Text style={styles.userUniversity} numberOfLines={1}>{university}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

// DÜZELTME: Etkinliğin ücretli gösterilmesi gerekip gerekmediği
const shouldShowAsPaid = (event: any): boolean => {
  if (!event) return false;
  
  try {
    // Önce isFree flag'ini kontrol et (tip kontrolü dahil)
    const isFreeValue = event.pricing?.isFree || event.isFree;
    
    if (isFreeValue === true || isFreeValue === "true") {
      return false;
    }
    
    // Sonra fiyat kontrolü yap
    let price: number | null = null;
    
    // Pricing objesi kontrol (yeni format)
    if (event.pricing && typeof event.pricing === 'object' && 'price' in event.pricing) {
      const priceStr = String(event.pricing.price).replace(',', '.');
      price = parseFloat(priceStr);
    }
    // Price özelliği kontrol (eski format)
    else if ('price' in event) {
      const priceStr = String(event.price).replace(',', '.');
      price = parseFloat(priceStr);
    }
    
    // Geçerli bir fiyat varsa ve 0'dan büyükse ücretli
    if (price !== null && !isNaN(price) && price > 0) {
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("shouldShowAsPaid hatası:", error);
    return false;
  }
};

// DÜZELTME: Biçimlendirilmiş etkinlik fiyatını döndür
const getFormattedEventPrice = (event: any): string => {
  if (!event) return "Ücretsiz Etkinlik";
  
  try {
    // Önce isFree flag'ini kontrol et (tip kontrolü dahil)
    const isFreeValue = event.pricing?.isFree || event.isFree;
    
    if (isFreeValue === true || isFreeValue === "true") {
      return "Ücretsiz Etkinlik";
    }
    
    // Sonra fiyat kontrolü yap
    let price: number | null = null;
    
    // 1. Yeni format (pricing.price)
    if (event.pricing && typeof event.pricing === 'object' && 'price' in event.pricing) {
      const priceStr = String(event.pricing.price || '0').replace(',', '.');
      price = parseFloat(priceStr);
    }
    // 2. Eski format (event.price)
    else if ('price' in event) {
      const priceStr = String(event.price || '0').replace(',', '.');
      price = parseFloat(priceStr);
    }
    
    // Fiyat işleme
    if (price !== null && !isNaN(price)) {
      if (price <= 0) {
        return "Ücretsiz Etkinlik";
      }
      
      // Fiyatı TL formatında göster
      const formattedPrice = `${price.toFixed(2).replace(/\.00$/, '')} TL`;
      return formattedPrice;
    }
    
    // Varsayılan dönüş
    return "Ücretsiz Etkinlik";
  } catch (error) {
    console.error("getFormattedEventPrice hatası:", error);
    return "Ücretsiz Etkinlik";
  }
};

// Helper function for social media icons
const getSocialIcon = (platform: string): string => {
  switch (platform?.toLowerCase()) {
    case 'instagram':
      return 'instagram';
    case 'twitter':
      return 'twitter';
    case 'facebook':
      return 'facebook';
    case 'linkedin':
      return 'linkedin';
    case 'youtube':
      return 'youtube';
    case 'telegram':
      return 'telegram';
    case 'whatsapp':
      return 'whatsapp';
    default:
      return 'link';
  }
};

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * Safely format a date with error handling
 * @param dateValue Any date value (Date, Timestamp, string, etc.)
 * @param format Optional moment.js format string
 * @returns Formatted date string or fallback text
 */
const formatDate = (dateValue: any, format?: string): string => {
  if (!dateValue) return 'Belirtilmemiş';
  
  try {
    // Handle Firestore Timestamp objects
    const date = dateValue && typeof dateValue.toDate === 'function' 
      ? dateValue.toDate() 
      : dateValue;
      
    return moment(date).format(format || 'DD MMM YYYY');
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Belirtilmemiş';
  }
};

/**
 * Safely format relative time (fromNow) with error handling
 * @param dateValue Any date value (Date, Timestamp, string, etc.)
 * @returns Relative time string or fallback text
 */
const formatRelativeTime = (dateValue: any): string => {
  if (!dateValue) return '';
  
  try {
    // Handle Firestore Timestamp objects
    const date = dateValue && typeof dateValue.toDate === 'function' 
      ? dateValue.toDate() 
      : dateValue;
      
    return moment(date).fromNow();
  } catch (error) {
    console.error('Relative time formatting error:', error);
    return '';
  }
};

interface Comment {
  id: string;
  text: string;
  authorName: string;
  authorId: string;
  authorAvatar?: string | null;
  timestamp: any;
}

interface Attendee {
  id: string;
  name: string;
  avatar?: string;
  joinedAt: any;
}

interface StudentEventCardProps {
  event: {
    id: string;
    title?: string;
    startDate: Date;
    endDate: Date;
    description?: string;
    location?: string | {
      type?: string;
      physicalAddress?: string;
      onlineLink?: string;
      roomNumber?: string;
      buildingName?: string;
      floor?: string;
      landmarks?: string;
    };
    imageUrl?: string | null;
    categories?: string[];
    tags?: string[];
    university?: string;
    universityName?: string;
    department?: string;
    organizer?: {
      id: string;
      name: string;
      logo?: string;
      profileImage?: string;
      displayName?: string;
      bio?: string;
    };
    organizerName?: string;
    
    // Pricing
    isFree?: boolean;
    price?: number;
    currency?: string;
    earlyBirdPrice?: number;
    earlyBirdDeadline?: any;
    studentDiscount?: number;
    
    // Capacity & Registration
    capacity?: number;
    attendeesCount?: number;
    minAttendees?: number;
    maxAttendees?: number;
    waitlistEnabled?: boolean;
    waitlistCount?: number;
    registrationDeadline?: any;
    registrationStartDate?: any;
    
    // Contact
    contactEmail?: string;
    contactPhone?: string;
    websiteUrl?: string;
    socialMediaLinks?: {
      facebook?: string;
      twitter?: string;
      instagram?: string;
      linkedin?: string;
    };
    
    // Event Details
    language?: string;
    requiredMaterials?: string;
    prerequisites?: string;
    targetAudience?: string;
    skillLevel?: string;
    ageRestriction?: string;
    dresscode?: string;
    difficulty?: string;
    duration?: number;
    
    // Features
    hasCertificate?: boolean;
    certificateTemplate?: string;
    isRecurring?: boolean;
    recurringType?: string;
    recurringEndDate?: any;
    allowsGuestSpeakers?: boolean;
    providesFood?: boolean;
    recordingAllowed?: boolean;
    liveStreamingAvailable?: boolean;
    liveStreamUrl?: string;
    hasParking?: boolean;
    accessibilityFeatures?: boolean;
    weatherDependent?: boolean;
    
    // Privacy & Access
    isPublic?: boolean;
    requiresApproval?: boolean;
    inviteOnly?: boolean;
    accessCode?: string;
    
    // Social
    allowGuests?: boolean;
    likeCount?: number;
    dislikeCount?: number;
    commentCount?: number;
    shareCount?: number;
    viewCount?: number;
  // Newer aggregated counters (doc fields used elsewhere)
  likesCount?: number;
  commentsCount?: number;
  sharesCount?: number;
  viewsCount?: number;
    
    // Event Type & Format
    eventType?: string;
    eventFormat?: string;
    
    // Collaboration
    collaborators?: string[];
    sponsoredBy?: string[];
    relatedEvents?: string[];
    
    // Policies
    cancellationPolicy?: string;
    refundPolicy?: string;
    
    // Metadata
    createdAt?: any;
    updatedAt?: any;
    createdBy?: string;
    lastModifiedBy?: string;
    status?: string;
    cancellationReason?: string;
    notes?: string;
    internalNotes?: string;
    
    // Legacy compatibility
    visibility?: 'public' | 'private' | 'members';
    settings?: {
      requireApproval?: boolean;
      allowGuests?: boolean;
      allowComments?: boolean;
    };
    pricing?: {
      isFree?: boolean;
      price?: number;
    };
    certificate?: {
      hasCertificate?: boolean;
      certificateDetails?: string;
    };
    universityRestrictions?: {
      isOpenToAllUniversities?: boolean;
      restrictedUniversities?: string[];
    };
    clubId?: string;
    clubName?: string;
    creatorType?: string;
    restrictionInfo?: string;
  };
  onNavigate?: (eventId: string) => void;
  onLike?: (eventId: string) => Promise<void>;
  onDislike?: (eventId: string) => Promise<void>;
  onShare?: (eventId: string) => Promise<void>;
  onJoin?: (eventId: string, userId: string) => Promise<void>;
  onUnjoin?: (eventId: string, userId: string) => Promise<void>;
  isUserJoined?: boolean;
  showOrganizer?: boolean;
  isExpanded?: boolean;
}

const StudentEventCard: React.FC<StudentEventCardProps> = ({
  event,
  onNavigate,
  onLike,
  onDislike,
  onShare,
  onJoin,
  onUnjoin,
  isUserJoined: initialIsJoined,
  showOrganizer = true,
  isExpanded = false,
}) => {
  // Early return if no event
  if (!event || !event.id) {
    return null;
  }

  console.log(`🔍 StudentEventCard render: Event ${event.title} (${event.id}) - Initial state will be loaded`);

  // Live organizer header component with real-time updates
  const LiveOrganizerHeader: React.FC<{ organizer: any; event: any }> = ({ organizer, event }) => {
    const { avatarData } = useUserAvatar(organizer?.id);
    const liveOrganizerName = avatarData?.displayName || organizer?.displayName || organizer?.name || 'Bilinmeyen Organizatör';
    const liveOrganizerImage = avatarData?.profileImage || organizer?.profileImage;
    
    return (
      <TouchableOpacity style={styles.organizerHeader} onPress={handleClubProfileNavigation}>
        <UniversalAvatar 
          user={{
            id: organizer.id,
            name: liveOrganizerName,
            profileImage: liveOrganizerImage,
            avatarIcon: organizer.avatarIcon,
            avatarColor: organizer.avatarColor
          }}
          size={40}
          style={styles.organizerHeaderImage}
          fallbackIcon="account-group"
          fallbackColor="#1976D2"
        />
        <View style={styles.organizerHeaderInfo}>
          <Text style={styles.organizerHeaderName}>{liveOrganizerName}</Text>
          <Text style={styles.organizerHeaderUniversity}>
            {event.university ? getUniversityFullName(event.university) : ""}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Define organizer interface
  interface OrganizerData {
    id?: string;
    name?: string;
    displayName?: string;
    profileImage?: string | null;
    logo?: string | null;
    avatarIcon?: string | null;
    avatarColor?: string | null;
  }

  // Create organizer object state
  const [organizer, setOrganizer] = useState<OrganizerData | null>(
    event.organizer || (event.clubId && event.clubName ? {
      id: event.clubId,
      name: event.clubName,
      displayName: event.clubName,
      profileImage: (event as any).clubProfileImage || (event as any).profileImage || null,
      logo: (event as any).clubLogo || (event as any).logo || null,
      // Safely access possible club avatar info
      avatarIcon: (event as any).clubAvatarIcon || (event as any).avatarIcon || null,
      avatarColor: (event as any).clubAvatarColor || (event as any).avatarColor || null
    } : null)
  );
  
  // Load club data if needed
  useEffect(() => {
    console.log('🔴 ORGANIZER DATA:', {
      organizer,
      hasProfileImage: !!organizer?.profileImage,
      hasAvatarIcon: !!organizer?.avatarIcon,
      avatarColor: organizer?.avatarColor
    });
    
    const loadClubData = async () => {
      if (!event.clubId || !organizer) return;
      
      try {
        const db = firebase.firestore();
        const clubDoc = await db.collection('clubs').doc(event.clubId).get();
        
        if (clubDoc.exists) {
          const clubData = clubDoc.data() || {};
          
          // Kulüp adını düzgün şekilde belirle
          let clubDisplayName = clubData.clubName || clubData.displayName || clubData.name;
          
          // Eğer email geliyorsa veya boşsa, varsayılan ad ver
          if (!clubDisplayName || clubDisplayName.includes('@')) {
            clubDisplayName = 'Fizik Kulübü';
          }
          
          setOrganizer(prevData => ({
            ...prevData!,
            name: clubDisplayName,
            displayName: clubDisplayName,
            profileImage: clubData.profileImage || clubData.photoURL || prevData?.profileImage || null,
            logo: clubData.logo || prevData?.logo || null,
            avatarIcon: clubData.avatarIcon || prevData?.avatarIcon || null,
            avatarColor: clubData.avatarColor || prevData?.avatarColor || '#1976D2',
          }));
        }
      } catch (error) {
        console.error('Error loading club data:', error);
      }
    };
    
    loadClubData();
  }, [event.clubId]);
  
  const theme = useTheme();
  // Safe navigation: works both inside and outside NavigationContainer
  const navigation = useContext(NavigationContext as any) as { navigate?: (route: string, params?: any) => void } | null;
  const safeNavigate = useCallback((routeName: string, params?: any) => {
    try {
      if (navigation && typeof navigation.navigate === 'function') {
        navigation.navigate(routeName as any, params);
        return true;
      }
    } catch (err) {
      console.warn('Navigation failed:', err);
    }
    return false;
  }, [navigation]);
  const { currentUser, userProfile, isClubAccount } = useAuth();
  
  // States
  const [liked, setLiked] = useState<boolean>(false);
  const [disliked, setDisliked] = useState<boolean>(false);
  const [likeCount, setLikeCount] = useState<number>(event.likeCount || 0);
  const [dislikeCount, setDislikeCount] = useState<number>(event.dislikeCount || 0);
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [isJoined, setIsJoined] = useState<boolean>(initialIsJoined || false);
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [imageLoadFailed, setImageLoadFailed] = useState<boolean>(false);

  // Reset image load state when event changes
  useEffect(() => {
    setImageLoadFailed(false);
  }, [event.id, event.imageUrl]);
  const [isCardExpanded, setIsCardExpanded] = useState<boolean>(isExpanded);
  const [showSeeLikesButton, setShowSeeLikesButton] = useState<boolean>(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  
  // Comment interface
  interface CommentData {
    id: string;
    text: string;
    userId: string;
    userName: string;
    displayName?: string;
    username?: string;
    email?: string;
    userAvatar?: string | null;
    profileImage?: string | null;
    avatarIcon?: string | null;
    avatarColor?: string | null;
    university?: string | null;
    createdAt: any;
    likes: number;
    likedBy: string[];
  }
  
  // Comment states
  const [showComments, setShowComments] = useState<boolean>(false);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [commentText, setCommentText] = useState<string>('');
  const [currentCommentCount, setCurrentCommentCount] = useState<number>(event.commentCount || 0);
  const [isLoadingComments, setIsLoadingComments] = useState<boolean>(false);
  const [isPostingComment, setIsPostingComment] = useState<boolean>(false);
  
  // Modal states for likes and attendees
  const [likesModalVisible, setLikesModalVisible] = useState<boolean>(false);
  const [attendeesModalVisible, setAttendeesModalVisible] = useState<boolean>(false);
  const [likesUsers, setLikesUsers] = useState<any[]>([]);
  const [attendeesUsers, setAttendeesUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  
  // Image state
  const [imageError, setImageError] = useState(false);

  // Social interaction states - Real-time data
  const [likesCount, setLikesCount] = useState(
    (event.likesCount ?? event.likeCount ?? 0) as number
  );
  const [viewCount, setViewCount] = useState((event.viewsCount ?? event.viewCount ?? 0) as number);
  const [shareCount, setShareCount] = useState((event.sharesCount ?? event.shareCount ?? 0) as number);
  const [commentCount, setCommentCount] = useState((event.commentsCount ?? event.commentCount ?? 0) as number);
  const [attendeesCount, setAttendeesCount] = useState((event.attendeesCount ?? 0) as number);
  
  // Real-time lists with profile enrichment
  const [attendeesList, setAttendeesList] = useState<any[]>([]);
  const [likesList, setLikesList] = useState<any[]>([]);
  const [commentsList, setCommentsList] = useState<any[]>([]);
  const [isLoadingLists, setIsLoadingLists] = useState(false);
  
  // Modal and view states
  const [showLikesList, setShowLikesList] = useState<boolean>(false);
  const [showAttendeesList, setShowAttendeesList] = useState<boolean>(false);
  const [isLoadingLikes, setIsLoadingLikes] = useState<boolean>(false);
  const [isLoadingAttendees, setIsLoadingAttendees] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRefreshingComments, setIsRefreshingComments] = useState(false);

  // Manual refresh function
  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      // Trigger re-fetch of real-time data by updating a dependency
      // The useEffect listeners will automatically refresh the data
      console.log("STUDENT: Manual refresh triggered for event:", event?.id);
      
      // Add a small delay to show refresh state
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error("STUDENT: Error during manual refresh:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Comments specific refresh function
  const handleCommentsRefresh = async () => {
    if (isRefreshingComments || isLoadingComments) return;
    
    setIsRefreshingComments(true);
    try {
      console.log("STUDENT: Comments refresh triggered for event:", event?.id);
      // Real-time listener already handles updates, no manual refresh needed
      // await loadComments(); // Removed - using real-time updates
      
      // Just add a small delay to show refresh state
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error("STUDENT: Error during comments refresh:", error);
    } finally {
      setIsRefreshingComments(false);
    }
  };

  // Get university full name - enhanced version
  const getUniversityFullName = useCallback((universityId: string | undefined) => {
    if (!universityId || universityId.trim() === '') return '';
    
    // Check if it already looks like a full university name
    if (universityId.includes('Üniversite') || universityId.includes('Üniversitesi')) {
      return universityId;
    }
    
    // First try to find by ID
    let university = UNIVERSITIES_DATA.find(uni => uni.id === universityId);
    
    // If not found by ID, try by value, label or name
    if (!university) {
      university = UNIVERSITIES_DATA.find(uni => 
        uni.value === universityId || 
        uni.label === universityId || 
        uni.name === universityId
      );
      
      // Try partial matching if still not found
      if (!university) {
        university = UNIVERSITIES_DATA.find(uni => 
          uni.name.toLowerCase().includes(universityId.toLowerCase()) ||
          uni.id.toLowerCase().includes(universityId.toLowerCase()) ||
          universityId.toLowerCase().includes(uni.id.toLowerCase())
        );
      }
    }
    
    return university ? university.name : universityId;
  }, []);

  // Profile enrichment function
  const enrichUserProfile = useCallback(async (userId: string, userData: any = {}) => {
    try {
      // Get user profile data
      const userProfileDoc = await firebase.firestore()
        .collection('users')
        .doc(userId)
        .get();
      
      const userProfileData = userProfileDoc.exists ? userProfileDoc.data() : {};
      
      // Get university name
      const universityName = getUniversityFullName(
        userProfileData?.university || 
        userData?.university || 
        ''
      );
      
      // Generate username from email or displayName
      let username = userProfileData?.username || userData?.username || '';
      if (!username && userProfileData?.email) {
        username = userProfileData.email.split('@')[0];
      }
      if (!username && userProfileData?.displayName) {
        username = userProfileData.displayName.toLowerCase().replace(/[^a-z0-9]/g, '');
      }
      if (!username || username.length < 3) {
        username = `kullanici${Math.floor(Math.random() * 1000)}`;
      }
      
      // Determine full name with fallbacks
      const firstName = userProfileData?.firstName || userData?.firstName || '';
      const lastName = userProfileData?.lastName || userData?.lastName || '';
      let fullName = '';
      
      if (firstName && lastName) {
        fullName = `${firstName} ${lastName}`;
      } else if (firstName) {
        fullName = firstName;
      } else if (lastName) {
        fullName = lastName;
      } else {
        fullName = userProfileData?.displayName || 
                  userData?.displayName || 
                  userProfileData?.name || 
                  userData?.userName ||
                  userData?.name || 
                  'Kullanıcı';
      }
      
      // Ensure avatar color is set
      const avatarColor = userProfileData?.avatarColor || 
                         userData?.avatarColor || 
                         getAvatarColor(userId);
      
      const enrichedProfile = {
        userId: userId,
        displayName: fullName,
        firstName: firstName,
        lastName: lastName,
        username: username,
        profileImage: userProfileData?.profileImage || 
                     userProfileData?.photoURL ||
                     userData?.profileImage || 
                     userData?.userImage ||
                     null,
        avatarIcon: userProfileData?.avatarIcon || userData?.avatarIcon || null,
        avatarColor: avatarColor,
        university: universityName,
        email: userProfileData?.email || userData?.email || '',
        bio: userProfileData?.bio || userData?.bio || '',
        ...userData
      };
      
      return enrichedProfile;
    } catch (error) {
      console.error("STUDENT: Profile enrichment error for user", userId, ":", error);
      
      // Enhanced fallback with better name handling
      const firstName = userData?.firstName || '';
      const lastName = userData?.lastName || '';
      let fallbackName = '';
      
      if (firstName && lastName) {
        fallbackName = `${firstName} ${lastName}`;
      } else if (firstName) {
        fallbackName = firstName;
      } else if (lastName) {
        fallbackName = lastName;
      } else {
        fallbackName = userData?.displayName || userData?.userName || userData?.name || 'Kullanıcı';
      }
      
      return {
        userId: userId,
        displayName: fallbackName,
        firstName: firstName,
        lastName: lastName,
        username: userData?.username || `kullanici${Math.floor(Math.random() * 1000)}`,
        profileImage: userData?.profileImage || userData?.userImage || null,
        avatarIcon: userData?.avatarIcon || null,
        avatarColor: userData?.avatarColor || getAvatarColor(userId),
        university: getUniversityFullName(userData?.university || ''),
        email: userData?.email || '',
        bio: userData?.bio || '',
        ...userData
      };
    }
  }, [getUniversityFullName]);

  // Etkinliğin ücretli olup olmadığını kontrol et - Geliştirilmiş ve hata yakalamali versiyon
  const isPaidEvent = (event: any): boolean => {
    try {
      // İlk olarak event nesnesinin geçerliliğini kontrol et
      if (!event) return false;
      
      // İsFree bayrağını kontrol et (eğer açıkça ücretsiz olarak işaretlenmişse)
      if (event.pricing?.isFree === true || event.isFree === true) {
        return false;
      }
      
      // Pricing.price kontrolü (yeni format)
      if (event.pricing && 'price' in event.pricing) {
        const pricingPrice = Number(event.pricing.price);
        if (!isNaN(pricingPrice) && pricingPrice > 0) {
          return true;
        }
      }
      
      // Direkt price kontrolü (eski format)
      if ('price' in event) {
        const price = Number(event.price);
        if (!isNaN(price) && price > 0) {
          return true;
        }
      }
      
      // Hiçbir pozitif fiyat bulunamadı
      return false;
    } catch (error) {
      console.error("isPaidEvent hatası:", error);
      return false; // Hata durumunda false dön
    }
  };
  
  // Etkinlik fiyatını al (pricing veya doğrudan price alanından)
  const getEventPrice = (event: any): number | string => {
    try {
      // İlk olarak event nesnesinin geçerliliğini kontrol et
      if (!event) return 0;
      
      // Pricing.price kontrolü (yeni format)
      if (event.pricing && 'price' in event.pricing) {
        const pricingPrice = Number(event.pricing.price);
        if (!isNaN(pricingPrice) && pricingPrice > 0) {
          return pricingPrice;
        }
      }
      
      // Direkt price kontrolü (eski format)
      if ('price' in event) {
        const price = Number(event.price);
        if (!isNaN(price) && price > 0) {
          return price;
        }
      }
      
      // Hiçbir geçerli fiyat bulunamadı
      return 0;
    } catch (error) {
      console.error("getEventPrice hatası:", error);
      return 0; // Hata durumunda 0 dön
    }
  };

  // Check like status and event participation on mount with improved debugging and data completeness
  useEffect(() => {
    const checkUserReactions = async () => {
      if (currentUser?.uid && event.id) {
        try {
          const db = firebase.firestore();
          const eventRef = db.collection('events').doc(event.id);
          
          // Check if user liked this event
          try {
            const likesQuery = await eventRef.collection('likes')
              .where('userId', '==', currentUser.uid)
              .limit(1)
              .get();
            setLiked(!likesQuery.empty);
            console.log(`📊 Like status for event ${event.id}: ${!likesQuery.empty ? 'LIKED' : 'NOT LIKED'}`);
          } catch (likeError) {
            console.error('Error checking like status:', likeError);
          }
          
          // Check if user disliked this event
          try {
            const dislikesQuery = await eventRef.collection('dislikes')
              .where('userId', '==', currentUser.uid)
              .limit(1)
              .get();
            setDisliked(!dislikesQuery.empty);
          } catch (dislikeError) {
            console.error('Error checking dislike status:', dislikeError);
          }
          
          // Check if user joined this event (if not already set from props)
          if (initialIsJoined === undefined) {
            try {
              const attendeeDoc = await eventRef.collection('attendees').doc(currentUser.uid).get();
              const isAttending = attendeeDoc.exists;
              // Check attendance status and update UI
              setIsJoined(isAttending);
              
              // If the user is attending but data is incomplete, update it
              if (isAttending) {
                const attendeeData = attendeeDoc.data() || {};
                const hasCompleteData = attendeeData.userId && attendeeData.userName;
                
                if (!hasCompleteData) {
                  // Update incomplete attendee record
                  
                  // Get complete user data
                  const userDoc = await db.collection('users').doc(currentUser.uid).get();
                  const userData = userDoc.exists ? userDoc.data() : {};
                  
                  // Update the attendee record with complete info
                  await attendeeDoc.ref.set({
                    userId: currentUser.uid,
                    userName: currentUser.displayName || userData?.displayName || currentUser.email || 'Katılımcı',
                    userImage: currentUser.photoURL || userData?.profileImage || '',
                    userEmail: currentUser.email || userData?.email || '',
                    userUniversity: userData?.university || (currentUser as any).university || '',
                    username: userData?.username || currentUser.email?.split('@')[0] || 'kullanici',
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                  }, { merge: true });
                  
                  // Attendee record updated
                }
              }
            } catch (joinError) {
              console.error('Error checking join status:', joinError);
            }
          }
        } catch (error) {
          console.error('Error checking user reactions:', error);
        }
      }
    };
    
    // Check if user is already joined from props
    if (initialIsJoined !== undefined) {
      setIsJoined(initialIsJoined);
      // Set join status from props
    }
    
    // Update real-time counts for likes, comments, and attendees
    updateLikesAndAttendees();
    
    checkUserReactions();
  }, [currentUser, event.id, initialIsJoined]);

  // Real-time listeners for event data with profile enrichment
  useEffect(() => {
    if (!event?.id) return;

    const unsubscribes: (() => void)[] = [];

    // Attendees listener with profile enrichment
    const attendeesUnsubscribe = firebase.firestore()
      .collection('events')
      .doc(event.id)
      .collection('attendees')
      .onSnapshot(async (snapshot) => {
        setAttendeesCount(snapshot.size);
        
        // Enrich profiles for attendees
        const enrichedAttendees = await Promise.all(
          snapshot.docs.map(async (doc) => {
            const data = doc.data();
            const userId = data.userId || doc.id;
            return await enrichUserProfile(userId, data);
          })
        );
        
        setAttendeesList(enrichedAttendees);
      }, (error) => {
        console.error("STUDENT: Error in attendees listener:", error);
      });

    // Likes listener with profile enrichment  
    const likesUnsubscribe = firebase.firestore()
      .collection('events')
      .doc(event.id)
      .collection('likes')
      .onSnapshot(async (snapshot) => {
        setLikesCount(snapshot.size);
        
        // Enrich profiles for likes
        const enrichedLikes = await Promise.all(
          snapshot.docs.map(async (doc) => {
            const data = doc.data();
            const userId = data.userId || doc.id;
            return await enrichUserProfile(userId, data);
          })
        );
        
        setLikesList(enrichedLikes);
      }, (error) => {
        console.error("STUDENT: Error in likes listener:", error);
      });

    // Comments listener with profile enrichment
    const commentsUnsubscribe = firebase.firestore()
      .collection('events')
      .doc(event.id)
      .collection('comments')
      .onSnapshot(async (snapshot) => {
        console.log('🔍 STUDENT: Comments listener triggered, snapshot size:', snapshot.size);
        
        const commentsCount = snapshot.size;
        setCommentCount(commentsCount);
        setCurrentCommentCount(commentsCount);
        
        if (snapshot.empty) {
          console.log('🔍 STUDENT: No comments found');
          setCommentsList([]);
          setComments([]);
          return;
        }
        
        // Get all comments and sort manually (to avoid index issues)
        const rawComments: any[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Sort by timestamp or createdAt (whichever exists)
        rawComments.sort((a: any, b: any) => {
          const aTime = a.timestamp || a.createdAt;
          const bTime = b.timestamp || b.createdAt;
          
          if (!aTime || !bTime) return 0;
          
          // Convert to timestamp if needed
          const aTimestamp = aTime.toMillis ? aTime.toMillis() : aTime;
          const bTimestamp = bTime.toMillis ? bTime.toMillis() : bTime;
          
          return bTimestamp - aTimestamp; // desc order (newest first)
        });
        
        console.log('🔍 STUDENT: Sorted comments:', rawComments.length);
        
        // Enrich profiles for comments
        const enrichedComments = await Promise.all(
          rawComments.map(async (comment, index) => {
            const userId = comment.userId || comment.authorId || comment.id;
            
            console.log(`🔍 STUDENT: Processing comment ${index + 1}/${rawComments.length}:`, {
              docId: comment.id,
              userId: userId,
              content: comment.content || comment.text,
              userName: comment.userName,
              timestamp: comment.timestamp,
              createdAt: comment.createdAt,
              allFields: Object.keys(comment)
            });
            
            return await enrichUserProfile(userId, {
              ...comment,
              commentId: comment.id
            });
          })
        );
        
        console.log('🔍 STUDENT: Enriched comments:', enrichedComments.length);
        setCommentsList(enrichedComments);
        
        // Update main comments state with formatted data for UI
        const formattedComments = enrichedComments.map((comment, index) => {
          console.log(`🔍 STUDENT: Raw enriched comment ${index + 1}:`, {
            commentId: comment.commentId,
            id: comment.id,
            content: comment.content,
            text: comment.text,
            originalContent: comment.content || comment.text,
            hasContent: !!(comment.content || comment.text),
            enrichedProfile: {
              displayName: comment.displayName,
              username: comment.username,
              profileImage: comment.profileImage,
              avatarIcon: comment.avatarIcon,
              avatarColor: comment.avatarColor,
              university: comment.university
            }
          });
          
          const formatted = {
            id: comment.commentId || comment.id || '',
            text: comment.content || comment.text || '',
            userId: comment.userId || '',
            userName: comment.displayName || comment.userName || 'Katılımcı',
            displayName: comment.displayName || comment.userName || 'Katılımcı',
            username: comment.username || '',
            email: comment.email || '',
            userAvatar: comment.profileImage || null,
            profileImage: comment.profileImage || null,
            avatarIcon: comment.avatarIcon || null,
            avatarColor: comment.avatarColor || getAvatarColor(comment.userId || ''),
            university: comment.university || '',
            createdAt: comment.timestamp || comment.createdAt,
            likes: comment.likesCount || 0,
            likedBy: []
          };
          
          console.log(`🔍 STUDENT: Formatted comment ${index + 1}:`, {
            id: formatted.id,
            text: formatted.text,
            hasText: !!formatted.text,
            textLength: formatted.text ? formatted.text.length : 0,
            userName: formatted.userName,
            displayName: formatted.displayName,
            username: formatted.username,
            userId: formatted.userId,
            hasAvatar: !!formatted.profileImage,
            hasIcon: !!formatted.avatarIcon,
            avatarColor: formatted.avatarColor,
            university: formatted.university
          });
          
          return formatted;
        });
        
        console.log('🔍 STUDENT: Setting comments state with', formattedComments.length, 'comments');
        setComments(formattedComments);
      }, (error) => {
        console.error("STUDENT: Error in comments listener:", error);
      });

    unsubscribes.push(attendeesUnsubscribe, likesUnsubscribe, commentsUnsubscribe);

    // Cleanup function
    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [event?.id, enrichUserProfile]);

  // Handle like with robust debounce and optimistic UI
  const [isLikeProcessing, setIsLikeProcessing] = useState(false);
  const likeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleLike = async () => {
    if (!currentUser?.uid || !event.id || isLikeProcessing) return;
    
    // ⭐ Kulüp hesapları beğeni yapamaz, sadece liste görür
    if (isClubAccount) {
      handleShowLikes();
      return;
    }
    
    // Clear any pending timeout
    if (likeTimeoutRef.current) {
      clearTimeout(likeTimeoutRef.current);
    }
    
    setIsLikeProcessing(true);
    
    // Optimistic UI update
    const wasLiked = liked;
    const oldCount = likeCount;
    
    console.log(`🎯 handleLike called: Current liked state = ${wasLiked}, like count = ${oldCount}`);
    
    try {
      if (onLike) {
        await onLike(event.id);
      }
      
      const db = firebase.firestore();
      const eventRef = db.collection('events').doc(event.id);
      const likesRef = eventRef.collection('likes');
      
      // Retry logic for transaction conflicts
      let retryCount = 0;
      const maxRetries = 3;
      let currentLikesCount = 0;
      let wasActuallyLiked = false;
      
      while (retryCount < maxRetries) {
        try {
          // Run this as a transaction to ensure data consistency
          await db.runTransaction(async (transaction) => {
            const eventDoc = await transaction.get(eventRef);
            if (!eventDoc.exists) {
              throw new Error("Event does not exist!");
            }
            
            const eventData = eventDoc.data()!;
            currentLikesCount = eventData.likesCount || 0;
            
            // Check for existing likes
            const existingLikeQuery = await likesRef
              .where('userId', '==', currentUser.uid)
              .get();
            
            wasActuallyLiked = existingLikeQuery.size > 0;
            
            console.log(`🔍 Transaction check: Found ${existingLikeQuery.size} existing likes for user`);
            
            if (existingLikeQuery.size > 0) {
              // User has already liked, so unlike
              console.log('🔴 DEBUG: User UNLIKE operation detected - removing like and calling studentUnlikeEvent');
              existingLikeQuery.docs.forEach(doc => {
                transaction.delete(doc.ref);
              });
              
              // Update likes count in event document
              transaction.update(eventRef, {
                likesCount: Math.max(0, currentLikesCount - existingLikeQuery.size)
              });

              // Update club stats for unlike (decrement like count)
              const clubId = event.clubId || event.organizer?.id;
              if (clubId) {
                ClubStatsService.updateLikeCount(clubId, false)
                  .catch((error: any) => console.warn('Club stats unlike update failed:', error));
                
                // Send notification to club
                try {
                  const userInfo = await UnifiedNotificationService.getUserInfo(currentUser.uid);
                  await UnifiedNotificationService.notifyClubEventUnliked(
                    clubId,
                    event.id,
                    event.title || 'Etkinlik',
                    currentUser.uid,
                    userInfo.name
                  );
                  console.log('✅ Club notification sent: Event unliked');
                } catch (notificationError) {
                  console.warn('⚠️ Failed to send club unlike notification:', notificationError);
                }
              }

              // Call scoring - either through parent onLike prop or internal scoring
              if (onLike) {
                // Parent will handle scoring through onLike prop
                console.log('Event unliked successfully - parent onLike handler will handle scoring');
              } else {
                // No parent onLike prop, handle scoring internally
                // Event unlike statistics are recorded in Firebase collections automatically

                // Log unlike activity
                userActivityService.logEventUnlike(
                  currentUser.uid,
                  currentUser.displayName || 'Bilinmeyen Kullanıcı',
                  event.id,
                  event.title || 'Bilinmeyen Etkinlik',
                  clubId,
                  event.organizer?.name || 'Bilinmeyen Kulüp'
                ).catch((error: any) => console.warn('Unlike activity logging failed:', error));

                console.log('Event unliked successfully - internal scoring completed');
              }
              
            } else {
              // User hasn't liked yet, add the like with consistent structure
              console.log('🟢 DEBUG: User LIKE operation detected - adding like and calling studentLikeEvent');
              const newLikeRef = likesRef.doc();
              
              transaction.set(newLikeRef, {
                userId: currentUser.uid,
                userName: currentUser.displayName || '',
                userImage: currentUser.photoURL || '',
                userUniversity: (currentUser as any).university || '',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
              });
              
              // Update likes count
              transaction.update(eventRef, {
                likesCount: currentLikesCount + 1
              });

              // Update club stats for like count
              const clubId = event.clubId || event.organizer?.id;
              if (clubId) {
                ClubStatsService.incrementLikeCount(clubId)
                  .catch((error: any) => console.warn('Club stats update failed:', error));
                
                // Send notification to club
                try {
                  const userInfo = await UnifiedNotificationService.getUserInfo(currentUser.uid);
                  await UnifiedNotificationService.notifyClubEventLiked(
                    clubId,
                    event.id,
                    event.title || 'Etkinlik',
                    currentUser.uid,
                    userInfo.name,
                    userInfo.image
                  );
                  console.log('✅ Club notification sent: Event liked');
                } catch (notificationError) {
                  console.warn('⚠️ Failed to send club like notification:', notificationError);
                }
              }

              // NOTE: Club owner notifications are handled automatically
              // No need for manual notification sending here to avoid duplicates
              
              // Call scoring - either through parent onLike prop or internal scoring
              if (onLike) {
                // Parent will handle scoring through onLike prop to avoid duplicates
                console.log('Event liked successfully - parent onLike handler will handle scoring');
              } else {
                // No parent onLike prop, handle scoring internally
                // Event like statistics are recorded in Firebase collections automatically

                // Log user activity
                userActivityService.logEventLike(
                  currentUser.uid,
                  currentUser.displayName || 'Bilinmeyen Kullanıcı',
                  event.id,
                  event.title || 'Bilinmeyen Etkinlik',
                  clubId,
                  event.organizer?.name || 'Bilinmeyen Kulüp'
                ).catch((error: any) => console.warn('User activity logging failed:', error));

                console.log('Event liked successfully - internal scoring completed');
              }
            }
          });
          
          // Success - break the retry loop and update UI state
          console.log(`🎯 Transaction completed successfully. Actual like status: ${wasActuallyLiked}, Final state: liked=${!wasActuallyLiked}, count=${wasActuallyLiked ? currentLikesCount - 1 : currentLikesCount + 1}`);
          
          // Update UI state after successful transaction based on actual Firestore data
          setLiked(!wasActuallyLiked);
          setLikeCount(wasActuallyLiked ? Math.max(0, currentLikesCount - 1) : currentLikesCount + 1);
          if (!wasActuallyLiked) setShowSeeLikesButton(true);
          
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
      console.error('Error handling like:', error);
      
      // Revert optimistic UI updates
      setLiked(wasLiked);
      setLikeCount(oldCount);
      
      Alert.alert('Hata', 'Beğeni işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      // Reset processing state after a delay to prevent rapid clicks
      likeTimeoutRef.current = setTimeout(() => {
        setIsLikeProcessing(false);
      }, 1500);
    }
  };

  // Beğeni listesini yükle - gerçek zamanlı veri güncellemesi için
  const loadLikes = async () => {
    if (!event.id || !currentUser) return;
    
    try {
      const db = firebase.firestore();
      const likesRef = db.collection('events').doc(event.id).collection('likes');
      
      // Önce toplam beğeni sayısını güncelle
      const likesCountSnapshot = await likesRef.get();
      setLikeCount(likesCountSnapshot.size);
      
      // Kullanıcının beğeni durumunu kontrol et
      const userLikeQuery = await likesRef
        .where('userId', '==', currentUser.uid)
        .limit(1)
        .get();
      
      setLiked(!userLikeQuery.empty);
      
      // Beğenenler listesini getir
      if (showLikesList) {
        const likesSnapshot = await likesRef
          .orderBy('timestamp', 'desc')
          .limit(50)
          .get();
        
        const likesDataPromises = likesSnapshot.docs.map(async doc => {
          const data = {
            id: doc.id,
            ...doc.data() as any
          };
          
          // Kullanıcı bilgilerini güncelle
          if (data.userId && (!data.username || !data.userUniversity)) {
            try {
              const userDoc = await db.collection('users').doc(data.userId).get();
              if (userDoc.exists) {
                const userData = userDoc.data();
                data.username = userData?.username || userData?.email?.split('@')[0] || data.userName?.toLowerCase().replace(/\s+/g, '') || 'kullanici';
                data.userUniversity = userData?.university || '';
                data.profileImage = userData?.profileImage || userData?.photoURL || null;
                data.avatarIcon = userData?.avatarIcon || null;
                data.avatarColor = userData?.avatarColor || null;
              }
            } catch (err) {
              console.warn('Kullanıcı bilgileri alınamadı:', err);
            }
          }
          
          return data;
        });
        
        const likesData = await Promise.all(likesDataPromises);
        setLikesList(likesData);
      }
    } catch (error) {
      console.error('Beğeni listesi yüklenirken hata:', error);
    }
  };

  // Handle join/unjoin
  // Enhanced methods for real-time updates
  const updateLikesAndAttendees = async () => {
    if (!event.id || !currentUser) return;
    
    try {
      const db = firebase.firestore();
      
      // Update likes count and status
      const likesRef = db.collection('events').doc(event.id).collection('likes');
      const likesCountSnapshot = await likesRef.get();
      setLikeCount(likesCountSnapshot.size);
      
      // Check user's like status
      const userLikeQuery = await likesRef
        .where('userId', '==', currentUser.uid)
        .limit(1)
        .get();
      
      setLiked(!userLikeQuery.empty);
      
      // Update attendees count
      const attendeesRef = db.collection('events').doc(event.id).collection('attendees');
      const attendeesCountSnapshot = await attendeesRef.get();
      setAttendeesCount(attendeesCountSnapshot.size);
    } catch (error) {
      console.error('Etkinlik verilerini güncellerken hata:', error);
    }
  };

  // Use eventManagement.ts joinEvent function for proper permissions
  const handleJoin = async () => {
    if (!currentUser?.uid || !event.id || isJoining) return;
    
    setIsJoining(true);
    console.log(`User ${currentUser.uid} attempting to join event ${event.id}`);
    
    try {
      const db = firebase.firestore();
      
      // First, get user details from both auth and database
      const userRef = db.collection('users').doc(currentUser.uid);
      const userDoc = await userRef.get();
      const userData = userDoc.exists ? userDoc.data() : {};
      
      // Create complete attendee data
      const attendeeData = {
        userId: currentUser.uid,
        eventId: event.id,
        userName: currentUser.displayName || userData?.displayName || currentUser.email || 'Katılımcı',
        userImage: currentUser.photoURL || userData?.profileImage || '',
        userEmail: currentUser.email || userData?.email || '',
        userUniversity: userData?.university || userData?.universityName || (currentUser as any).university || '',
        username: userData?.username || currentUser.email?.split('@')[0] || 'kullanici',
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      console.log('Attendee data prepared:', attendeeData);
      
      // Check if already joined in eventAttendees collection
      const attendeeQuery = await db.collection('eventAttendees')
        .where('userId', '==', currentUser.uid)
        .where('eventId', '==', event.id)
        .limit(1)
        .get();

      if (!attendeeQuery.empty) {
        console.log('User already joined this event - skipping');
        setIsJoined(true);
        setIsJoining(false);
        return;
      }
      
      console.log('Adding user to attendees collection...');
      
      // Add to eventAttendees global collection
      await db.collection('eventAttendees').add(attendeeData);
      console.log('Attendee document created');
      
      // Update the event's attendee count
      await db.collection('events').doc(event.id).update({
        attendeesCount: firebase.firestore.FieldValue.increment(1)
      });
      console.log(`Updated event attendees count to 1`);
      
      console.log(`User ${currentUser.uid} successfully joined event ${event.id}`);
      
      // Update the UI
      setAttendeesCount(prev => prev + 1);
      setIsJoined(true);

      // Log join action
      if (currentUser?.uid && event.id) {
        console.log('User joined event successfully');
      }
      
      // Event join statistics are recorded in Firebase collections automatically
      
      // Send notification to club about the join
      const clubId = event.clubId || event.organizer?.id;
      if (clubId) {
        try {
          const userInfo = await UnifiedNotificationService.getUserInfo(currentUser.uid);
          await UnifiedNotificationService.notifyClubEventJoined(
            clubId,
            event.id,
            event.title || 'Etkinlik',
            currentUser.uid,
            userInfo.name,
            userInfo.image
          );
          console.log('✅ Club notification sent: Event joined');
        } catch (notificationError) {
          console.warn('⚠️ Failed to send club join notification:', notificationError);
        }
      }

      // Log user activity
      userActivityService.logEventJoin(
        currentUser.uid,
        currentUser.displayName || userProfile?.displayName || 'Bilinmeyen Kullanıcı',
        event.id,
        event.title || 'Bilinmeyen Etkinlik',
        clubId,
        event.organizer?.name || 'Bilinmeyen Kulüp'
      ).catch((error: any) => console.warn('User activity logging failed:', error));
      
      // Call the onJoin callback if provided - TEMPORARILY DISABLED
      // if (onJoin) {
      //   await onJoin(event.id, currentUser.uid);
      // }
      
      // Display success message
      Alert.alert('Başarılı', 'Etkinliğe katılım sağlandı.');
    } catch (error) {
      console.error('Etkinliğe katılım/ayrılma hatası:', error);
      Alert.alert('Hata', 'Etkinliğe katılırken bir hata oluştu.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleUnjoin = async () => {
    if (!currentUser?.uid || !event.id || isJoining) return;
    
    setIsJoining(true);
    
    try {
      const db = firebase.firestore();
      
      // Find and delete from eventAttendees global collection
      const attendeeQuery = await db.collection('eventAttendees')
        .where('userId', '==', currentUser.uid)
        .where('eventId', '==', event.id)
        .limit(1)
        .get();

      if (!attendeeQuery.empty) {
        // Delete the attendee document
        await attendeeQuery.docs[0].ref.delete();
        console.log(`Successfully removed attendee ${currentUser.uid} from event ${event.id}`);
        
        // Update event attendees count
        await db.collection('events').doc(event.id).update({
          attendeesCount: firebase.firestore.FieldValue.increment(-1)
        });
        
        // Update the UI
        setAttendeesCount(prev => Math.max(0, prev - 1));
        setIsJoined(false);
        
        // Event leave statistics are recorded in Firebase collections automatically

        // Log user activity for event leave (ensure visibility in feed)
        try {
          const clubId = event.clubId || event.organizer?.id;
          await userActivityService.logEventLeave(
            currentUser.uid,
            currentUser.displayName || userProfile?.displayName || 'Bilinmeyen Kullanıcı',
            event.id,
            event.title || 'Bilinmeyen Etkinlik',
            clubId,
            event.organizer?.name || 'Bilinmeyen Kulüp'
          );
          
          // Send notification to club about leaving
          if (clubId) {
            try {
              const userInfo = await UnifiedNotificationService.getUserInfo(currentUser.uid);
              await UnifiedNotificationService.notifyClubEventLeft(
                clubId,
                event.id,
                event.title || 'Etkinlik',
                currentUser.uid,
                userInfo.name
              );
              console.log('✅ Club notification sent: Event left');
            } catch (notificationError) {
              console.warn('⚠️ Failed to send club leave notification:', notificationError);
            }
          }
        } catch (e) {
          console.warn('Activity log (event_leave) failed:', e);
        }
        
        // TEMPORARILY DISABLED onUnjoin callback
        // if (onUnjoin) {
        //   await onUnjoin(event.id, currentUser.uid);
        // }
        
        Alert.alert('Başarılı', 'Etkinlikten ayrıldınız.');
      } else {
        console.log(`User ${currentUser.uid} is not an attendee of event ${event.id}`);
        setIsJoined(false);
      }
      
    } catch (error) {
      console.error('Etkinlikten ayrılma hatası:', error);
      Alert.alert('Hata', 'Etkinlikten ayrılırken bir hata oluştu.');
    } finally {
      setIsJoining(false);
    }
  };

  // Handle comments
  const handleToggleComments = async () => {
    setShowComments(!showComments);
    
    // Real-time listener zaten çalışıyor, manual yükleme gereksiz
    // if (!showComments && comments.length === 0) {
    //   await loadComments();
    // }
  };

  const loadComments = async () => {
    // Real-time listener aktif olduğu için manual yükleme devre dışı
    // Real-time güncellemeler otomatik olarak comments state'ini güncelliyor
    console.log('🔍 [DEBUG] loadComments called but skipped - using real-time listener');
    return;
    
    /* ESKI KOD - Real-time listener kullanıldığı için devre dışı
    if (!event.id || isLoadingComments) return;
    
    setIsLoadingComments(true);
    
    console.log('🔍 [DEBUG] loadComments called for eventId:', event.id);
    
    try {
      // Use global comment management function
      const commentsData = await getEventComments(event.id);
      
      console.log('✅ [DEBUG] Comments loaded:', commentsData.length);
      
      // Update comment count and list
      setCurrentCommentCount(commentsData.length);
      setComments(commentsData.map(comment => ({
        id: comment.id || '',
        text: comment.content || '',
        userId: comment.userId || '',
        userName: comment.userName || 'Katılımcı',
        displayName: comment.userName || 'Katılımcı',
        userAvatar: comment.userProfileImage || null,
        profileImage: comment.userProfileImage || null,
        createdAt: comment.createdAt,
        likes: comment.likesCount || 0,
        likedBy: []
      })));
      
    } catch (error: any) {
      console.error('❌ [DEBUG] Error loading comments:', {
        code: error?.code,
        message: error?.message
      });
    } finally {
      setIsLoadingComments(false);
    }
    */
  };

  const handlePostComment = async () => {
    if (!commentText.trim() || !currentUser?.uid || !event.id || isPostingComment) return;
    
    setIsPostingComment(true);
    
    console.log('🔍 [DEBUG] handlePostComment called with:', {
      eventId: event.id,
      userId: currentUser.uid,
      userName: currentUser.displayName || userProfile?.displayName || 'Katılımcı',
      content: commentText.trim()
    });
    
    try {
      // Use global comment management function
      const success = await addEventComment(
        event.id,
        currentUser.uid,
        commentText.trim(),
        currentUser.displayName || userProfile?.displayName || 'Katılımcı',
        userProfile?.profileImage || currentUser.photoURL || null
      );
      
      if (success) {
        console.log('✅ [DEBUG] Comment posted successfully');
        // Real-time listener will automatically update comment count
        // setCurrentCommentCount(prev => prev + 1); // Removed - using real-time updates
        setCommentText('');
        
  // Scoring is triggered inside addEventComment via ComprehensiveScoringSystem.processAction
  // Avoid duplicate scoring/notifications here
        
        // Notification is already sent in CommentManagement.ts via ClubNotificationService
        // to prevent double notifications

        // Log user activity
        const clubId = event.clubId || event.organizer?.id;
        userActivityService.logEventComment(
          currentUser.uid,
          currentUser.displayName || userProfile?.displayName || 'Bilinmeyen Kullanıcı',
          event.id,
          event.title || 'Bilinmeyen Etkinlik',
          commentText.trim(),
          clubId,
          event.organizer?.name || 'Bilinmeyen Kulüp'
        ).catch((error: any) => console.warn('User activity logging failed:', error));
        
        // Real-time listener will automatically update comments
        // await loadComments(); // Removed - using real-time updates
      } else {
        console.error('❌ [DEBUG] Failed to post comment');
        Alert.alert('Hata', 'Yorum gönderilemedi. Lütfen tekrar deneyin.');
      }
      
    } catch (error: any) {
      console.error('❌ [DEBUG] Error in handlePostComment:', {
        code: error?.code,
        message: error?.message
      });
      Alert.alert('Hata', 'Yorum gönderilirken bir hata oluştu.');
    } finally {
      setIsPostingComment(false);
    }
  };

  // Handle share
  const handleShare = async () => {
    if (isSharing) return;
    
    setIsSharing(true);
    
    try {
      if (onShare) {
        await onShare(event.id);
      }
      
      const message = event.title + "\n\n" + event.description + "\n\nTarih: " + formatDate(event.startDate, 'DD MMMM YYYY, HH:mm') + "\nKonum: " + (typeof event.location === 'string' ? event.location : event.location?.physicalAddress || 'Online');
      
      await Share.share({
        message,
        title: event.title,
      });

      // Log share action
      if (currentUser?.uid && event.id) {
        console.log('Event shared successfully');
        // Could add database update logic here
      }
    } catch (error) {
      console.error('Error sharing event:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsCardExpanded(!isCardExpanded);
    
    Animated.timing(fadeAnim, {
      toValue: isCardExpanded ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleCardPress = () => {
    // Ana karta tıklanınca sadece expand/collapse yap, başka ekrana gitme
    toggleExpanded();
  };

  const handleClubProfileNavigation = () => {
    if (organizer?.id) {
      // Navigate to club profile
      safeNavigate('ViewClub', { clubId: organizer.id });
    }
  };
  
  // Kullanıcı profil sayfasına yönlendirme - hem yorumlar hem beğenenler/katılımcılar için kullanılabilir
  const handleUserProfileNavigation = (userId: string) => {
    if (!userId) {
      console.warn('Kullanıcı ID değeri boş!');
      return;
    }
    
    console.log('Kullanıcı profiline yönlendiriliyor:', userId);
    
    if (navigation) {
      try {
        // Kullanıcı kendi profiline mi tıkladı kontrol et
        const isOwnProfile = currentUser && currentUser.uid === userId;
        
        // Kullanıcı deneyimini iyileştiren onay kutusu
        Alert.alert(
          'Kullanıcı Profili',
          isOwnProfile 
            ? 'Kendi profilinize gitmek istiyor musunuz?' 
            : 'Bu kullanıcının profiline gitmek istiyor musunuz?',
          [
            {
              text: 'İptal',
              style: 'cancel'
            },
            {
              text: 'Evet',
              onPress: () => {
                console.log(`StudentEventCard: ${isOwnProfile ? 'Kendi profiline' : 'Başka kullanıcının profiline'} yönlendiriliyor, userId:`, userId);
                
                // Kendi profiliyse ana Profil ekranına, başkasıysa ViewProfile ekranına git
                if (isOwnProfile) {
                  safeNavigate('Profile');
                } else {
                  safeNavigate('ViewProfile', { userId });
                }
                
                // Navigasyon başarılı olup olmadığını kontrol et
                setTimeout(() => {
                  console.log('Navigation tamamlandı, yeni ekrana geçildi mi kontrol ediliyor');
                }, 500);
              }
            }
          ]
        );
      } catch (error) {
        console.error('Profil yönlendirme hatası:', error);
        Alert.alert('Hata', 'Profil sayfasına yönlendirme sırasında bir hata oluştu.');
      }
    } else {
      console.warn('Navigation objesi bulunamadı!');
      Alert.alert('Hata', 'Yönlendirme yapılamıyor.');
    }
  };
  
  // Yorum yapan kullanıcının profil sayfasına yönlendirme
  const handleCommentProfilePress = (userId: string) => {
    console.log(`Navigating to profile: ${userId}`);
    try {
      if (userId && userId !== currentUser?.uid) {
        safeNavigate('ViewProfile', { userId });
      } else if (userId === currentUser?.uid) {
        safeNavigate('Profile');
      }
    } catch (error) {
      console.error('Profile navigation error:', error);
    }
  };
  
  // Function to handle showing likes - Enhanced for real-time data
  const handleShowLikes = async () => {
    try {
      setLoadingUsers(true);
      setLikesModalVisible(true);
      
      const db = firebase.firestore();
      const likesRef = db.collection('events').doc(event.id).collection('likes');
      
      // Update real-time like count
      const likesCountSnapshot = await likesRef.get();
      setLikeCount(likesCountSnapshot.size);
      
      const likesSnapshot = await likesRef
        .orderBy('timestamp', 'desc')
        .limit(50)
        .get();
        
      console.log(`Found ${likesSnapshot.size} likes for event ${event.id}`);
      
      const usersData = await Promise.all(
        likesSnapshot.docs.map(async (doc) => {
          const likeData = doc.data();
          const userId = likeData.userId;
          
          if (!userId) {
            console.warn('Missing userId in like record:', likeData);
            // Return basic data with a fallback ID to avoid key warnings
            return {
              ...likeData,
              id: doc.id,
              userId: doc.id, // Add userId for navigation
              userName: likeData.userName || 'Katılımcı',
              displayName: likeData.userName || 'Katılımcı'
            };
          }
          
          console.log(`Processing like from user: ${userId}, name: ${likeData.userName || 'unknown'}`);
          
          // Get additional user info
          try {
            const userDoc = await db.collection('users').doc(userId).get();
            if (userDoc.exists) {
              const userData = userDoc.data();
              
              // Get university name if available
              let universityName = userData?.university || likeData.userUniversity || '';
              if (universityName && typeof universityName === 'string') {
                const universityObj = UNIVERSITIES_DATA.find(uni => uni.id === universityName);
                if (universityObj) {
                  universityName = universityObj.name;
                }
              }
              
              return {
                ...likeData,
                ...userData,
                id: userId,
                userId: userId, // Ensure userId is set for navigation
                displayName: userData?.displayName || likeData.userName || userData?.email?.split('@')[0] || 'Katılımcı',
                userName: userData?.displayName || likeData.userName || userData?.email?.split('@')[0] || 'Katılımcı',
                profileImage: userData?.profileImage || null,
                photoURL: userData?.photoURL || likeData.userImage || null,
                userImage: likeData.userImage || null,
                avatarIcon: userData?.avatarIcon || null,
                avatarColor: userData?.avatarColor || null,
                email: userData?.email || '',
                username: userData?.username || userData?.email?.split('@')[0] || likeData.userName?.toLowerCase().replace(/\s+/g, '') || 'kullanici',
                university: universityName || userData?.universityName || 'Üniversite bilgisi yok'
              };
            }
            
            // User doc doesn't exist, return basic data with fallbacks
            return {
              ...likeData,
              id: userId,
              userId: userId, // Ensure userId is set for navigation
              displayName: likeData.userName || 'İsimsiz Kullanıcı',
              userName: likeData.userName || 'İsimsiz Kullanıcı',
              username: likeData.userName?.toLowerCase().replace(/\s+/g, '') || 'kullanici',
              university: likeData.userUniversity || 'Üniversite bilgisi yok'
            };
          } catch (error) {
            console.error('Error fetching user data:', error);
            return {
              ...likeData,
              id: userId || doc.id,
              userId: userId || doc.id, // Ensure userId is set for navigation
              displayName: likeData.userName || 'İsimsiz Kullanıcı',
              userName: likeData.userName || 'İsimsiz Kullanıcı',
              username: likeData.userName?.toLowerCase().replace(/\s+/g, '') || 'kullanici'
            };
          }
        })
      );
      
      setLikesUsers(usersData);
      console.log('Loaded like users:', usersData.length);
    } catch (error) {
      console.error('Error fetching likes:', error);
      Alert.alert('Hata', 'Beğenenler yüklenirken bir sorun oluştu.');
    } finally {
      setLoadingUsers(false);
    }
  };
  
  // Function to handle showing attendees - Enhanced for real-time data with improved debugging
  // Function to handle showing attendees - Completely rewritten for better reliability
  const handleShowAttendees = async () => {
    try {
      console.log(`Starting to load attendees for event ${event.id}...`);
      setLoadingUsers(true);
      setAttendeesModalVisible(true);
      
      const db = firebase.firestore();
      
      // DEBUGGING: Add extra check to directly verify current user's attendance
      if (currentUser?.uid) {
        console.log(`Checking if current user ${currentUser.uid} is in attendees...`);
        const myAttendanceDoc = await db.collection('events').doc(event.id).collection('attendees').doc(currentUser.uid).get();
        console.log(`Current user attendance status: ${myAttendanceDoc.exists ? 'ATTENDING' : 'NOT ATTENDING'}`);
        
        // If user is shown as attending in state but isn't actually in the collection,
        // we need to add them explicitly (this fixes potential sync issues)
        if (isJoined && !myAttendanceDoc.exists) {
          console.log('State shows user joined but database doesn\'t have the record - fixing...');
          
          // Get user data
          const userDoc = await db.collection('users').doc(currentUser.uid).get();
          const userData = userDoc.exists ? userDoc.data() : {};
          
          // Create attendee record
          await db.collection('events').doc(event.id).collection('attendees').doc(currentUser.uid).set({
            userId: currentUser.uid,
            userName: currentUser.displayName || userData?.displayName || currentUser.email || 'Katılımcı',
            userImage: currentUser.photoURL || userData?.profileImage || '',
            userEmail: currentUser.email || userData?.email || '',
            userUniversity: userData?.university || (currentUser as any).university || '',
            username: userData?.username || currentUser.email?.split('@')[0] || 'kullanici',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
          });
          
          // Update event attendees count
          const eventDoc = await db.collection('events').doc(event.id).get();
          if (eventDoc.exists) {
            const eventData = eventDoc.data()!;
            await eventDoc.ref.update({
              attendeesCount: (eventData.attendeesCount || 0) + 1
            });
          }
          
          console.log('Fixed: Added current user to attendees');
        }
      }
      
      // Now get all attendees with a fresh query to ensure we have latest data
      const attendeesRef = db.collection('events').doc(event.id).collection('attendees');
      
      // First get count for proper UI display
      const attendeesCountSnapshot = await attendeesRef.get();
      const totalAttendees = attendeesCountSnapshot.size;
      setAttendeesCount(totalAttendees);
      
      console.log(`Found ${totalAttendees} attendees for event ${event.id}`);
      
      // If no attendees, set empty array and return early
      if (totalAttendees === 0) {
        setAttendeesUsers([]);
        console.log('No attendees found for this event');
        setLoadingUsers(false);
        return;
      }
      
      // Get all attendee documents
      const attendeesSnapshot = await attendeesRef.get();
      console.log(`Retrieved ${attendeesSnapshot.size} attendee documents`);
      
      // Print all attendee documents to help debug
      attendeesSnapshot.docs.forEach((doc, index) => {
        console.log(`Attendee ${index + 1} [ID: ${doc.id}]:`, doc.data());
      });
      
      // Process each attendee with proper error handling
      const attendeeDataPromises = attendeesSnapshot.docs.map(async (doc) => {
        try {
          const attendeeData = doc.data();
          const userId = attendeeData.userId || doc.id;
          
          console.log(`Processing attendee: ${userId}`);
          
          if (!userId) {
            console.warn('Missing userId in attendee document:', doc.id);
            return {
              id: doc.id,
              userId: doc.id,
              displayName: attendeeData.userName || 'Katılımcı',
              userName: attendeeData.userName || 'Katılımcı'
            };
          }
          
          // Get user data from users collection
          const userDoc = await db.collection('users').doc(userId).get();
          const userData = userDoc.exists ? userDoc.data() : {};
          
          console.log(`User data found for ${userId}:`, userDoc.exists ? 'YES' : 'NO');
          
          // Format university name if available
          let universityName = userData?.university || attendeeData.userUniversity || '';
          if (universityName && typeof universityName === 'string') {
            const universityObj = UNIVERSITIES_DATA.find(uni => uni.id === universityName);
            if (universityObj) {
              universityName = universityObj.name;
            }
          }
          
          // Get username with multiple backup sources
          const derivedUsername = 
            userData?.username || 
            (userData?.email ? userData?.email.split('@')[0] : null) || 
            (attendeeData.userName ? attendeeData.userName.toLowerCase().replace(/\s+/g, '') : null) ||
            (userData?.displayName ? userData?.displayName.toLowerCase().replace(/\s+/g, '') : null) ||
            'kullanici';
            
          // Get profile image with multiple backup sources
          const profileImage = 
            userData?.photoURL || 
            userData?.profileImage || 
            userData?.photoUrl || 
            userData?.image || 
            userData?.avatar || 
            userData?.picture ||
            attendeeData.userImage || 
            null;
            
          // Return enriched user data with proper fallbacks
          return {
            ...attendeeData,
            ...userData,
            id: userId,
            userId: userId,
            displayName: userData?.displayName || userData?.name || userData?.fullName || attendeeData.userName || userData?.email?.split('@')[0] || 'Katılımcı',
            userName: userData?.displayName || userData?.name || userData?.fullName || attendeeData.userName || userData?.email?.split('@')[0] || 'Katılımcı',
            photoURL: profileImage,
            avatarIcon: userData?.avatarIcon || null,
            avatarColor: userData?.avatarColor || null,
            email: userData?.email || attendeeData.userEmail || '',
            username: derivedUsername,
            university: universityName || userData?.universityName || userData?.schoolName || attendeeData.userUniversity || ''
          };
        } catch (error) {
          console.error(`Error processing attendee doc ${doc.id}:`, error);
          return {
            id: doc.id,
            userId: doc.id,
            displayName: 'Katılımcı',
            userName: 'Katılımcı'
          };
        }
      });
      
      // Wait for all attendee data to be processed
      const attendeesList = await Promise.all(attendeeDataPromises);
      console.log(`Successfully processed ${attendeesList.length} attendees`);
      
      // Update state with the new attendees list
      setAttendeesUsers(attendeesList);
      console.log('Attendee list updated in state');
    } catch (error) {
      console.error('Error fetching attendees:', error);
      Alert.alert('Hata', 'Katılımcılar yüklenirken bir sorun oluştu.');
    } finally {
      setLoadingUsers(false);
    }
  };
  
  // Function to delete a comment
  const handleDeleteComment = async (commentId: string) => {
    if (!currentUser?.uid || !event.id) return;
    
    console.log('🔍 [DEBUG] handleDeleteComment called with:', {
      commentId,
      userId: currentUser.uid
    });
    
    try {
      // Use global comment management function (includes comprehensive scoring)
      const success = await deleteEventComment(commentId, currentUser.uid, event.id);
      
      if (success) {
        console.log('✅ [DEBUG] Comment deleted successfully with comprehensive scoring');
        // Real-time listener will automatically update the comments list
        // Note: Comprehensive scoring, notifications, and activity logging are handled in deleteEventComment
        
        Alert.alert('Başarılı', 'Yorumunuz silindi.');
      } else {
        console.error('❌ [DEBUG] Failed to delete comment');
        Alert.alert('Hata', 'Yorum silinemedi. Lütfen tekrar deneyin.');
      }
      
    } catch (error: any) {
      console.error('❌ [DEBUG] Error in handleDeleteComment:', {
        code: error?.code,
        message: error?.message
      });
      Alert.alert('Hata', 'Yorum silinirken bir hata oluştu.');
    }
  };
  
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  const handleViewDetails = () => {
    // Modal içinde detayları göster
    setShowDetailsModal(true);
  };
  
  return (
    <>
      <Card style={styles.card} elevation={4}>
      {/* Event Image with Overlay */}
      <View style={styles.imageContainer}>
        {(() => {
          const imageUri = event.imageUrl || (event as any).coverPhoto || (event as any).image || (event as any).eventImage || (event as any).cover || (event as any).photo;
          // If no image URI or image load failed, show default image
          if (!imageUri || imageLoadFailed) {
            return (
              <Image
                source={require('../../assets/universe_logo.png')}
                style={styles.defaultEventImage}
                resizeMode="contain"
              />
            );
          }

          return (
            <Image 
              source={{ uri: imageUri }}
              style={styles.eventImage}
              resizeMode="cover"
              onError={(error) => {
                console.log('🚨 Image loading failed for event:', event.id, 'URI:', imageUri);
                setImageLoadFailed(true);
              }}
              onLoad={() => {
                setImageLoadFailed(false);
              }}
              onLoadStart={() => {
                console.log('� Image loading started for event:', event.id);
                setImageLoadFailed(false);
              }}
            />
          );
        })()}
        
        {/* Only keep the Date Badge in the top overlay */}
        <View style={styles.topOverlay}>
          {/* Date Badge */}
          <View style={styles.dateBadge}>
            <Text style={styles.dateDay}>{formatDate(event.startDate, 'DD')}</Text>
            <Text style={styles.dateMonth}>{formatDate(event.startDate, 'MMM')}</Text>
          </View>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.contentContainer}>
          {/* Organizer Info - Club Profile with Live Updates */}
          {organizer && <LiveOrganizerHeader organizer={organizer} event={event} />}
          
          {/* Title and Basic Info */}
          <View style={styles.headerSection}>
            <Text style={styles.title} numberOfLines={isCardExpanded ? undefined : 2}>
              {event.title || 'Etkinlik Başlığı'}
            </Text>
            
            {/* Description */}
            {event.description && (
              <Text style={styles.descriptionPreview} numberOfLines={isCardExpanded ? undefined : 3}>
                {event.description}
              </Text>
            )}

            {/* Access Status */}
            <View style={styles.detailRow}>
              {event.visibility === 'private' ? (
                <>
                  <MaterialCommunityIcons name="lock" size={18} color="#FF9800" />
                  <Text style={styles.detailLabel}>Erişim:</Text>
                  <Text style={[styles.detailValue, { color: "#FF9800" }]}>
                    Özel Etkinlik
                  </Text>
                </>
              ) : event.settings?.requireApproval ? (
                <>
                  <MaterialCommunityIcons name="account-check" size={18} color="#FF9800" />
                  <Text style={styles.detailLabel}>Erişim:</Text>
                  <Text style={[styles.detailValue, { color: "#FF9800" }]}>
                    Onay Gerekli
                  </Text>
                </>
              ) : event.universityRestrictions?.isOpenToAllUniversities ? (
                <>
                  <MaterialCommunityIcons name="earth" size={18} color="#4CAF50" />
                  <Text style={styles.detailLabel}>Erişim:</Text>
                  <Text style={[styles.detailValue, { color: "#4CAF50" }]}>
                    Tüm Üniversitelere Açık
                  </Text>
                </>
              ) : (
                <>
                  <MaterialCommunityIcons name="school" size={18} color="#2196F3" />
                  <Text style={styles.detailLabel}>Erişim:</Text>
                  <Text style={[styles.detailValue, { color: "#2196F3" }]}>
                    {event.university ? `Sadece ${getUniversityFullName(event.university)}` : "Sadece Kendi Üniversitemize Açık"}
                  </Text>
                </>
              )}
            </View>
            
            {/* Price Info - Tamamen düzeltilmiş versiyon */}
            <View style={styles.detailRow}>
              <MaterialCommunityIcons 
                name={shouldShowAsPaid(event) ? "cash" : "cash-multiple"} 
                size={18} 
                color={shouldShowAsPaid(event) ? "#E91E63" : "#4CAF50"} 
              />
              <Text style={styles.detailLabel}>Ücret:</Text>
              <Text style={[styles.detailValue, { color: shouldShowAsPaid(event) ? "#E91E63" : "#4CAF50" }]}>
                {getFormattedEventPrice(event)}
                {(event?.studentDiscount && shouldShowAsPaid(event)) && (
                  <Text style={{fontStyle: 'italic', fontSize: 12}}> (Öğrenci İndirimi: %{event.studentDiscount})</Text>
                )}
              </Text>
            </View>
          </View>
          
          {/* Scrollable Action Buttons */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.actionButtonsScrollView}
            contentContainerStyle={styles.actionButtonsContainer}
          >
            {/* Like Button */}
            <View>
              <TouchableOpacity 
                style={[styles.actionIconButton, isLikeProcessing && { opacity: 0.5 }]}
                onPress={isClubAccount ? handleShowLikes : handleLike}
                disabled={isLikeProcessing}
              >
                <MaterialCommunityIcons 
                  name={liked ? "thumb-up" : "thumb-up-outline"} 
                  size={22} 
                  color={liked ? theme.colors.primary : "#666"} 
                />
                <Text style={[styles.actionButtonText, liked && { color: theme.colors.primary }]}>
                  {isLikeProcessing ? '...' : likeCount}
                </Text>
              </TouchableOpacity>
              
              {/* Sadece öğrenci hesapları için beğeni gör butonu */}
              {!isClubAccount && showSeeLikesButton && liked && (
                <TouchableOpacity 
                  style={styles.seeLikesButton}
                  onPress={handleShowLikes}
                >
                  <Text style={styles.seeLikesButtonText}>Beğenenleri gör</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {/* Comment Button */}
            <TouchableOpacity 
              style={styles.actionIconButton}
              onPress={handleToggleComments}
            >
              <MaterialCommunityIcons 
                name={showComments ? "comment" : "comment-outline"} 
                size={22} 
                color={showComments ? theme.colors.primary : "#666"} 
              />
              <Text style={[styles.actionButtonText, showComments && { color: theme.colors.primary }]}>
                {currentCommentCount}
              </Text>
            </TouchableOpacity>
            
            {/* Join Button */}
            <TouchableOpacity 
              style={[styles.actionIconButton, styles.joinIconButton]}
              onPress={() => isJoined ? handleUnjoin() : handleJoin()}
              disabled={isJoining}
            >
              <MaterialCommunityIcons 
                name={isJoined ? "calendar-remove" : "calendar-plus"} 
                size={22} 
                color={isJoined ? "#FF5722" : "#4CAF50"} 
              />
              <Text style={[styles.actionButtonText, { color: isJoined ? "#FF5722" : "#4CAF50" }]}>
                {isJoined ? 'Ayrıl' : 'Katıl'}
              </Text>
              {isJoining && <ActivityIndicator size={16} color="#666" style={{ marginLeft: 4 }} />}
            </TouchableOpacity>
            
            {/* Attendees Button */}
            <TouchableOpacity 
              style={styles.actionIconButton}
              onPress={handleShowAttendees}
            >
              <MaterialCommunityIcons 
                name="account-group" 
                size={22} 
                color="#666" 
              />
              <Text style={styles.actionButtonText}>{attendeesCount}</Text>
            </TouchableOpacity>
            
            {/* Share Button */}
            <TouchableOpacity 
              style={styles.actionIconButton}
              onPress={handleShare}
            >
              <MaterialCommunityIcons 
                name="share" 
                size={22} 
                color="#666" 
              />
              <Text style={styles.actionButtonText}>Paylaş</Text>
            </TouchableOpacity>
            
            {/* Test Bildirim Button - Sadece debug için */}
            {__DEV__ && (
              <TouchableOpacity 
                style={styles.actionIconButton}
                onPress={async () => {
                  Alert.alert(
                    '🧪 Test Seçenekleri',
                    'Hangi testi yapmak istiyorsunuz?',
                    [
                      {
                        text: 'Bildirimleri Test Et',
                        onPress: async () => {
                          console.log('🧪 Testing notifications...');
                          // Test notification delivery (removed for production)
                          logger.info('Event interaction notification would be sent');
                          const clubId = event.clubId || event.organizer?.id;
                          if (clubId) {
                            console.log('🔍 Checking club notifications for:', clubId);
                            // Check notifications (removed for production)
                            logger.info('Checking notifications for club:', clubId);
                          }
                          console.log('🎯 Notification test completed - check logs above!');
                        }
                      },
                      {
                        text: 'Lider Tablosu Verilerini Test Et',
                        onPress: async () => {
                          console.log('📊 Testing leaderboard data consistency...');
                          try {
                            const inconsistencies = await leaderboardDataSyncService.detectLeaderboardInconsistencies();
                            console.log('🔍 Leaderboard inconsistencies found:', inconsistencies);
                            
                            const totalInconsistencies = inconsistencies.students.length + inconsistencies.clubs.length;
                            if (totalInconsistencies > 0) {
                              Alert.alert(
                                '⚠️ Tutarsızlık Tespit Edildi',
                                `${inconsistencies.students.length} öğrenci ve ${inconsistencies.clubs.length} kulüp verisinde tutarsızlık var. Konsolu kontrol edin.`,
                                [
                                  {
                                    text: 'Verileri Düzelt',
                                    onPress: async () => {
                                      console.log('🔄 Starting leaderboard data sync...');
                                      await leaderboardDataSyncService.syncAllLeaderboardData();
                                      console.log('✅ Leaderboard data sync completed!');
                                      Alert.alert('✅ Başarılı', 'Lider tablosu verileri güncellendi!');
                                    }
                                  },
                                  { text: 'İptal', style: 'cancel' }
                                ]
                              );
                            } else {
                              Alert.alert('✅ Harika!', 'Lider tablosu verileri tutarlı görünüyor.');
                            }
                          } catch (error) {
                            console.error('❌ Error testing leaderboard:', error);
                            Alert.alert('❌ Hata', 'Lider tablosu testi sırasında hata oluştu.');
                          }
                        }
                      },
                      { text: 'İptal', style: 'cancel' }
                    ]
                  );
                }}
              >
                <MaterialCommunityIcons 
                  name="bug-check" 
                  size={22} 
                  color="#FF9800" 
                />
                <Text style={[styles.actionButtonText, { color: '#FF9800' }]}>Test</Text>
              </TouchableOpacity>
            )}
            
            {/* Refresh Button */}
            <TouchableOpacity 
              style={styles.actionIconButton}
              onPress={handleRefresh}
              disabled={isRefreshing}
            >
              <MaterialCommunityIcons 
                name={isRefreshing ? "loading" : "refresh"} 
                size={22} 
                color={isRefreshing ? theme.colors.primary : "#666"} 
              />
              {isRefreshing && <ActivityIndicator size={16} color={theme.colors.primary} style={{ marginLeft: 4 }} />}
            </TouchableOpacity>
          </ScrollView>

          {/* Comments Section */}
          {showComments && (
            <View style={styles.commentsSection}>
              {/* Comments Header with Refresh Button */}
              <View style={styles.commentsHeader}>
                <Text style={styles.commentsSectionTitle}>Yorumlar</Text>
                <TouchableOpacity
                  style={styles.commentsRefreshButton}
                  onPress={handleCommentsRefresh}
                  disabled={isRefreshingComments || isLoadingComments}
                >
                  <MaterialCommunityIcons 
                    name={isRefreshingComments ? "loading" : "refresh"} 
                    size={20} 
                    color={isRefreshingComments ? theme.colors.primary : "#666"} 
                  />
                  <Text style={[
                    styles.commentsRefreshText,
                    { color: isRefreshingComments ? theme.colors.primary : "#666" }
                  ]}>
                    {isRefreshingComments ? "Yenileniyor..." : "Yenile"}
                  </Text>
                </TouchableOpacity>
              </View>
              
              {/* Comments List */}
              {isLoadingComments ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text style={styles.loadingText}>Yorumlar yükleniyor...</Text>
                </View>
              ) : (
                <ScrollView 
                  style={styles.commentsList}
                  nestedScrollEnabled={true}
                  showsVerticalScrollIndicator={false}
                >
                  {(comments || []).length > 0 ? (
                    (comments || []).map((comment, index) => (
                      <CommentItemRow
                        key={comment.id || `comment-${index}`}
                        comment={comment}
                        currentUserId={currentUser?.uid}
                        onPressProfile={handleCommentProfilePress}
                        onDelete={handleDeleteComment}
                      />
                    ))
                  ) : (
                    <View style={styles.noCommentsContainer}>
                      <MaterialCommunityIcons name="comment-outline" size={48} color="#CCC" />
                      <Text style={styles.noCommentsText}>Henüz yorum yapılmamış</Text>
                      <Text style={styles.noCommentsSubtext}>İlk yorumu sen yap!</Text>
                    </View>
                  )}
                </ScrollView>
              )}
              
              {/* Comment Input */}
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
                  onPress={handlePostComment}
                  disabled={!commentText.trim() || isPostingComment}
                >
                  {isPostingComment ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <MaterialCommunityIcons name="send" size={20} color="#FFF" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Expand/Collapse Indicator */}
          <View style={styles.expandIndicator}>
            <TouchableOpacity 
              onPress={handleViewDetails} 
              style={styles.expandButton}
            >
              <Text style={styles.expandText}>
                Detayları Görüntüle
              </Text>
              <MaterialCommunityIcons 
                name="chevron-right" 
                size={20} 
                color={theme.colors.primary} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </Card>
      
      {/* Event Detail Modal */}
      {showDetailsModal && (
        <EventDetailModal 
          visible={showDetailsModal}
          eventId={event.id}
          event={event}
          onDismiss={() => setShowDetailsModal(false)}
        />
      )}
      
      {/* Likes Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={likesModalVisible}
        onRequestClose={() => setLikesModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Beğenenler</Text>
              <TouchableOpacity onPress={() => setLikesModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            {loadingUsers ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.modalLoadingText}>Kullanıcılar yükleniyor...</Text>
              </View>
            ) : (
              <ScrollView
                refreshControl={
                  <RefreshControl
                    refreshing={isRefreshing}
                    onRefresh={handleRefresh}
                    colors={[theme.colors.primary]}
                  />
                }
              >
                {(likesList || []).length > 0 ? (
                  (likesList || []).map((user, index) => (
                    <LikeItemRow
                      key={(user.userId || user.uid || user.id) || `like-user-${index}`}
                      user={user}
                      onPress={handleUserProfileNavigation}
                    />
                  ))
                ) : (
                  <Text style={styles.noDataText}>Henüz beğenen bulunmamaktadır</Text>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
      
      {/* Attendees Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={attendeesModalVisible}
        onRequestClose={() => setAttendeesModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Katılımcılar</Text>
              <TouchableOpacity onPress={() => setAttendeesModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            {loadingUsers ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.modalLoadingText}>Kullanıcılar yükleniyor...</Text>
              </View>
            ) : (
              <ScrollView
                refreshControl={
                  <RefreshControl
                    refreshing={isRefreshing}
                    onRefresh={handleRefresh}
                    colors={[theme.colors.primary]}
                  />
                }
              >
                {Array.isArray(attendeesList) && attendeesList.length > 0 ? (
                  attendeesList.map((user, index) => (
                    <AttendeeItemRow
                      key={(user.userId || user.uid || user.id) || `attendee-${index}`}
                      user={user}
                      isCurrent={Boolean((user.userId || user.uid || user.id) === currentUser?.uid)}
                      onPress={handleUserProfileNavigation}
                    />
                  ))
                ) : (
                  <View style={styles.noDataContainer}>
                    <MaterialCommunityIcons name="account-group" size={48} color="#CCC" />
                    <Text style={styles.noDataText}>Henüz katılımcı bulunmamaktadır</Text>
                    {isJoined && (
                      <Text style={styles.noDataSubtext}>
                        Sizin katılımınız kaydedildi, listede görünmüyorsanız sayfayı yenileyiniz.
                      </Text>
                    )}
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  imageContainer: {
    height: 180,
    width: '100%',
    position: 'relative',
    backgroundColor: '#f0f0f0',
  },
  eventImage: {
    width: '100%',
    height: '100%',
  },
  defaultEventImage: {
    width: '100%',
    height: '100%',
    opacity: 0.5,
  },
  topOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  dateBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 60,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  dateDay: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#333',
  },
  dateMonth: {
    fontSize: 13,
    color: '#666',
    textTransform: 'uppercase',
  },
  contentContainer: {
    padding: 12,
  },
  organizerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  organizerHeaderImage: {
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  organizerHeaderInfo: {
    flex: 1,
  },
  organizerHeaderName: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  organizerHeaderUniversity: {
    fontSize: 12,
    color: '#2196F3',
  },
  headerSection: {
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
    lineHeight: 24,
  },
  descriptionPreview: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 2,
  },
  detailLabel: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
    marginRight: 4,
  },
  detailValue: {
    fontSize: 13,
    color: '#333',
  },
  actionButtonsScrollView: {
    marginVertical: 8,
    marginLeft: -6,
  },
  actionButtonsContainer: {
    paddingLeft: 6,
    paddingRight: 12,
  },
  actionIconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  actionButtonText: {
    marginLeft: 6,
    fontSize: 13,
    color: '#666',
  },
  joinIconButton: {
    paddingHorizontal: 18,
  },
  expandIndicator: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
    alignItems: 'center',
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expandText: {
    color: '#2196F3',
    fontWeight: '500',
    marginRight: 4,
  },
  tabContainer: {
    marginBottom: 10,
  },
  tabScrollContainer: {
    paddingHorizontal: 12,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  activeTab: {
    backgroundColor: '#e3f2fd',
  },
  tabText: {
    fontSize: 14,
    marginLeft: 6,
    color: '#666',
  },
  activeTabText: {
    color: '#2196F3',
    fontWeight: '500',
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  descriptionSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    color: '#555',
  },
  
  // Comment styles
  commentsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  commentsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  commentsRefreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
  },
  commentsRefreshText: {
    fontSize: 14,
    marginLeft: 4,
    fontWeight: '500',
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
  commentsList: {
    maxHeight: 250,
    marginBottom: 12,
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
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  commentUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginLeft: -6,
    borderRadius: 20,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  commentAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#CCC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  commentUserDetails: {
    flexDirection: 'column',
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  commentUsername: {
    fontSize: 12,
    color: '#2196F3',
    fontStyle: 'italic',
  },
  commentUniversityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f2ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  commentUniversity: {
    fontSize: 11,
    color: '#0066cc',
    fontWeight: '500',
    marginLeft: 3,
  },
  commentDate: {
    fontSize: 11,
    color: '#999',
  },
  commentText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    paddingVertical: 4,
    marginTop: 4,
  },
  noCommentsContainer: {
    alignItems: 'center',
    padding: 24,
  },
  noCommentsText: {
    fontSize: 16,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  noCommentsSubtext: {
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
  // New styles for seeLikesButton
  seeLikesButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    alignSelf: 'center',
    marginTop: 4,
  },
  seeLikesButtonText: {
    fontSize: 12,
    color: '#666',
  },
  // Comment deletion related styles
  commentDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'absolute',
    right: 8,
    top: 8,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalLoadingContainer: {
    padding: 24,
    alignItems: 'center',
  },
  modalLoadingText: {
    marginTop: 12,
    color: '#666',
  },
  userItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  userAvatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  userInfo: {
    marginLeft: 12,
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 2,
    color: '#333',
  },
  userDetail: {
    color: '#2196F3',
    fontSize: 14,
    fontStyle: 'italic',
  },
  universityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f2ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 4,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#cce0ff',
  },
  userUniversity: {
    color: '#0066cc',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  noDataText: {
    padding: 8,
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
    fontSize: 16,
  },
  noDataSubtext: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 8,
  },
  // 🎯 YENİ: Kulüp beğeni yönetimi stilleri
  clubLikeActionsContainer: {
    marginTop: 8,
    paddingHorizontal: 6,
  },
  clubActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginVertical: 2,
  },
  clubLikeButton: {
    backgroundColor: '#E8F5E8',
    borderColor: '#4CAF50',
  },
  clubUnlikeButton: {
    backgroundColor: '#FFEBEE',
    borderColor: '#FF5722',
  },
  clubActionText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  firstLikeButton: {
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

export default StudentEventCard;
