/**
 * 🎯 Types Export Center
 * All type definitions for the application
 */

// Existing type exports
export * from './leaderboard';
export * from './events';
export * from './custom';
export * from './theme';

// === COMMON BASE TYPES ===

export interface BaseEntity {
  id: string;
  createdAt: any; // Firebase Timestamp
  updatedAt: any; // Firebase Timestamp
}

export interface TimestampEntity extends BaseEntity {
  createdAt: any; // Firebase Timestamp
  updatedAt: any; // Firebase Timestamp
}

// === USER & PROFILE TYPES ===

export interface User extends BaseEntity {
  id: string;
  displayName?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  userName?: string;
  email: string;
  photoURL?: string;
  profileImage?: string;
  university?: string;
  department?: string;
  classLevel?: string;
  bio?: string;
  isActive?: boolean;
  lastSeen?: any;
  userType?: 'student' | 'club';
  preferences?: UserPreferences;
}

export interface UserProfile extends BaseEntity {
  displayName: string;
  email: string;
  photoURL?: string;
  university?: string;
  department?: string;
  classLevel?: string;
  bio?: string;
  isActive?: boolean;
  lastSeen?: any;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  notifications?: NotificationPreferences;
  privacy?: PrivacySettings;
  theme?: 'light' | 'dark' | 'auto';
  language?: 'tr' | 'en';
}

export interface NotificationPreferences {
  push?: boolean;
  email?: boolean;
  eventReminders?: boolean;
  clubUpdates?: boolean;
  mentions?: boolean;
}

export interface PrivacySettings {
  profileVisibility?: 'public' | 'private' | 'friends';
  showEmail?: boolean;
  showUniversity?: boolean;
  allowMessages?: boolean;
}

// === CLUB TYPES ===

export interface ClubProfile extends BaseEntity {
  name: string;
  description?: string;
  logoUrl?: string;
  university?: string;
  category?: string;
  memberCount?: number;
  ownerId: string;
  isVerified?: boolean;
  isActive?: boolean;
  tags?: string[];
  socialLinks?: SocialLinks;
  location?: Location;
}

export interface SocialLinks {
  instagram?: string;
  twitter?: string;
  website?: string;
  linkedin?: string;
}

export interface Location {
  address?: string;
  city?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

// === ACTION & SCORING TYPES ===

export type ActionType = 
  | 'LIKE_EVENT'
  | 'UNLIKE_EVENT'
  | 'JOIN_EVENT'
  | 'LEAVE_EVENT'
  | 'COMMENT_EVENT'
  | 'DELETE_COMMENT'
  | 'CREATE_EVENT'
  | 'UPDATE_EVENT'
  | 'DELETE_EVENT'
  | 'FOLLOW_CLUB'
  | 'UNFOLLOW_CLUB'
  | 'SHARE_EVENT'
  | 'JOIN_CLUB'
  | 'LEAVE_CLUB'
  | 'KICK_CLUB_MEMBER'
  | 'APPROVE_CLUB_MEMBER'
  | 'REJECT_CLUB_MEMBER'
  | 'FOLLOW_USER'
  | 'UNFOLLOW_USER'
  | 'LIKE_COMMENT'
  | 'UNLIKE_COMMENT'
  | 'COMPLETE_PROFILE'
  | 'DAILY_LOGIN';

export interface ScoringMetadata {
  targetId?: string;
  eventId?: string;
  clubId?: string;
  userId?: string;
  points?: number;
  description?: string;
  category?: string;
  multiplier?: number;
  [key: string]: any;
}

// === NOTIFICATION TYPES ===

export interface NotificationBase extends BaseEntity {
  title: string;
  message: string;
  type: string;
  read: boolean;
  recipientId: string;
  recipientType: 'student' | 'club';
  data?: Record<string, any>;
  imageUrl?: string;
  actionUrl?: string;
  timestamp?: any;
  eventId?: string;
  clubId?: string;
  userId?: string;
  _collection?: string;
}

export type NotificationType = 
  | 'event_created'
  | 'event_updated'
  | 'event_reminder'
  | 'club_joined'
  | 'member_request'
  | 'member_approved'
  | 'follow_received'
  | 'mention'
  | 'like_received'
  | 'comment_received'
  | 'system'
  | 'announcement';

// === RESPONSE TYPES ===

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string | number;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// === FORM TYPES ===

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'textarea' | 'select' | 'date' | 'file';
  placeholder?: string;
  required?: boolean;
  validation?: ValidationRule[];
  options?: SelectOption[];
}

export interface SelectOption {
  label: string;
  value: string | number;
}

export interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: any;
  message: string;
}

// === NAVIGATION TYPES ===

export interface NavigationRoute {
  name: string;
  params?: Record<string, any>;
}

export interface TabBarIcon {
  focused: boolean;
  color: string;
  size: number;
}

// === SEARCH TYPES ===

export interface SearchFilters {
  category?: string;
  university?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  location?: string;
  tags?: string[];
}

export interface SearchResult {
  id: string;
  type: 'event' | 'club' | 'user';
  title: string;
  subtitle?: string;
  imageUrl?: string;
  relevanceScore?: number;
}

// === STATISTICS TYPES ===

export interface Statistics {
  totalEvents: number;
  totalMembers: number;
  totalLikes: number;
  totalComments: number;
  totalParticipants: number;
  totalInteractions: number;
  monthlyGrowth?: number;
  engagementRate?: number;
}

export interface StatsPeriod {
  daily: Statistics;
  weekly: Statistics;
  monthly: Statistics;
  yearly: Statistics;
}

// === UTILITY TYPES ===

export type Status = 'idle' | 'loading' | 'success' | 'error';

export type Theme = 'light' | 'dark' | 'auto';

export type Language = 'tr' | 'en';

export type UserRole = 'student' | 'club_admin' | 'super_admin';

export type EventStatus = 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled';

export type MembershipStatus = 'pending' | 'approved' | 'rejected' | 'active' | 'inactive';

// === TYPE GUARDS ===

export const isUserProfile = (obj: any): obj is UserProfile => {
  return obj && typeof obj.email === 'string' && typeof obj.displayName === 'string';
};

export const isClubProfile = (obj: any): obj is ClubProfile => {
  return obj && typeof obj.name === 'string' && typeof obj.ownerId === 'string';
};

export const isNotification = (obj: any): obj is NotificationBase => {
  return obj && typeof obj.title === 'string' && typeof obj.message === 'string';
};
