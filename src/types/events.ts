import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

export interface EventData {
  id: string;
  title: string;
  description: string;
  date: Date | firebase.firestore.Timestamp;
  startDate: Date | firebase.firestore.Timestamp;
  endDate: Date | firebase.firestore.Timestamp;
  location: string;
  imageUrl?: string;
  coverImageUrl?: string;
  coverImage?: string;
  image?: string;
  photoUrl?: string;
  bannerUrl?: string;
  headerImage?: string;
  thumbnail?: string;
  organizerId: string;
  creatorId?: string;
  organizer?: {
    id?: string;
    name?: string;
    displayName?: string;
    profileImage?: string;
    logo?: string;
    [key: string]: any;
  };
  university?: string;
  universityName?: string;
  department?: string;
  category?: string;
  isOnline?: boolean;
  meetingUrl?: string;
  attendeesCount?: number;
  likesCount?: number;
  commentsCount?: number;
  createdAt?: Date | firebase.firestore.Timestamp;
  updatedAt?: Date | firebase.firestore.Timestamp;
  
  // Erişim ve görünürlük kontrolü
  visibility?: 'public' | 'private' | 'members';
  settings?: {
    requireApproval?: boolean;
  };
  universityRestrictions?: {
    isOpenToAllUniversities?: boolean;
    restrictedUniversities?: string[];
  };
  
  // Geriye uyumluluk için deprecated fieldlar
  isPrivate?: boolean; // @deprecated - visibility kullan
  isOpenToAllUniversities?: boolean; // @deprecated - universityRestrictions kullan
  
  [key: string]: any;
}

export interface CommentData {
  id: string;
  eventId: string;
  userId: string;
  text: string;
  timestamp: Date | firebase.firestore.Timestamp;
  user?: {
    displayName?: string;
    fullName?: string;
    profileImage?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface AttendeeData {
  id: string;
  userId: string;
  eventId: string;
  timestamp: Date | firebase.firestore.Timestamp;
  user?: {
    displayName?: string;
    fullName?: string;
    profileImage?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface LikeData {
  id: string;
  userId: string;
  eventId: string;
  timestamp: Date | firebase.firestore.Timestamp;
  user?: {
    displayName?: string;
    fullName?: string;
    profileImage?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface OrganizerImageProps {
  organizer: {
    id?: string;
    name?: string;
    displayName?: string;
    profileImage?: string;
    logo?: string;
    [key: string]: any;
  };
  style?: any;
  size?: number;
}

export interface ClubEventCardProps {
  event: any; // Herhangi bir event tipi kabul edilecek
  style?: any;
  isAdminView?: boolean;
  onDelete?: (eventId: string) => void;
  onViewAttendees?: (eventId: string) => void;
  onEdit?: (eventId: string) => void;
}

export interface StudentEventCardProps {
  event: EventData;
  style?: any;
}
