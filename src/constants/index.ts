/**
 * 📋 Constants Export Center
 * Centralized export for all application constants
 */

// Academic constants
export * from './departments';
export * from './classLevels';
export * from './universities';

// Application constants
export * from './clubTypes';
export * from './eventCategories';

// === APPLICATION-WIDE CONSTANTS ===

// App Configuration
export const APP_CONFIG = {
  name: 'Universe',
  version: '2.0.0',
  description: 'University Social Platform',
  supportEmail: 'destek@universe-kampus.com',
  supportUrl: 'https://support.universe-kampus.com',
  termsUrl: 'https://universe-kampus.com/terms',
  privacyUrl: 'https://universe-kampus.com/privacy',
} as const;

// API Configuration
export const API_CONFIG = {
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
  pageSize: 20,
  maxFileSize: 10 * 1024 * 1024, // 10MB
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: '@universe/auth_token',
  USER_PROFILE: '@universe/user_profile',
  THEME_PREFERENCE: '@universe/theme',
  LANGUAGE_PREFERENCE: '@universe/language',
  NOTIFICATION_SETTINGS: '@universe/notifications',
  ONBOARDING_COMPLETED: '@universe/onboarding_completed',
  LAST_SYNC: '@universe/last_sync',
  OFFLINE_DATA: '@universe/offline_data',
  READ_NOTIFICATIONS: '@universe/read_notifications',
} as const;

// Notification Types
export const NOTIFICATION_TYPES = {
  EVENT_CREATED: 'event_created',
  EVENT_UPDATED: 'event_updated',
  EVENT_REMINDER: 'event_reminder',
  EVENT_CANCELLED: 'event_cancelled',
  CLUB_JOINED: 'club_joined',
  MEMBER_REQUEST: 'member_request',
  MEMBER_APPROVED: 'member_approved',
  MEMBER_REJECTED: 'member_rejected',
  FOLLOW_RECEIVED: 'follow_received',
  MENTION: 'mention',
  LIKE_RECEIVED: 'like_received',
  COMMENT_RECEIVED: 'comment_received',
  SYSTEM: 'system',
  ANNOUNCEMENT: 'announcement',
} as const;

// User Roles
export const USER_ROLES = {
  STUDENT: 'student',
  CLUB_ADMIN: 'club_admin',
  SUPER_ADMIN: 'super_admin',
} as const;

// Event Status
export const EVENT_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ONGOING: 'ongoing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

// Membership Status
export const MEMBERSHIP_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;

// Image Dimensions
export const IMAGE_DIMENSIONS = {
  AVATAR: {
    width: 200,
    height: 200,
  },
  CLUB_LOGO: {
    width: 300,
    height: 300,
  },
  EVENT_BANNER: {
    width: 800,
    height: 400,
  },
  COVER_PHOTO: {
    width: 1200,
    height: 600,
  },
} as const;

// Validation Rules
export const VALIDATION_RULES = {
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 20,
    PATTERN: /^[a-zA-Z0-9_]+$/,
  },
  PASSWORD: {
    MIN_LENGTH: 8,
    PATTERN: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
  },
  EMAIL: {
    PATTERN: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
  },
  PHONE: {
    PATTERN: /^\+?[1-9]\d{1,14}$/,
  },
  STUDENT_ID: {
    PATTERN: /^\d{9,11}$/,
  },
} as const;

// Date Formats
export const DATE_FORMATS = {
  SHORT: 'DD/MM/YYYY',
  LONG: 'DD MMMM YYYY',
  WITH_TIME: 'DD/MM/YYYY HH:mm',
  TIME_ONLY: 'HH:mm',
  ISO: 'YYYY-MM-DDTHH:mm:ss.sssZ',
} as const;

// Animation Durations (in milliseconds)
export const ANIMATION_DURATION = {
  FAST: 200,
  NORMAL: 300,
  SLOW: 500,
  VERY_SLOW: 800,
} as const;

// Screen Names (for navigation)
export const SCREEN_NAMES = {
  // Auth
  LOGIN: 'Login',
  REGISTER: 'Register',
  FORGOT_PASSWORD: 'ForgotPassword',
  
  // Main Tabs
  HOME: 'Home',
  EVENTS: 'Events',
  CLUBS: 'Clubs',
  LEADERBOARD: 'Leaderboard',
  PROFILE: 'Profile',
  
  // Event Screens
  EVENT_DETAIL: 'EventDetail',
  CREATE_EVENT: 'CreateEvent',
  EDIT_EVENT: 'EditEvent',
  
  // Club Screens
  CLUB_DETAIL: 'ClubDetail',
  CLUB_MANAGEMENT: 'ClubManagement',
  CLUB_MEMBERS: 'ClubMembers',
  
  // Profile Screens
  USER_PROFILE: 'UserProfile',
  EDIT_PROFILE: 'EditProfile',
  SETTINGS: 'Settings',
  
  // Other
  SEARCH: 'Search',
  NOTIFICATIONS: 'Notifications',
  ABOUT: 'About',
  TERMS: 'Terms',
  PRIVACY: 'Privacy',
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'İnternet bağlantınızı kontrol edin',
  TIMEOUT_ERROR: 'İşlem zaman aşımına uğradı',
  AUTH_ERROR: 'Kimlik doğrulama hatası',
  PERMISSION_ERROR: 'Bu işlem için yetkiniz bulunmuyor',
  NOT_FOUND_ERROR: 'Aranan içerik bulunamadı',
  SERVER_ERROR: 'Sunucu hatası oluştu',
  VALIDATION_ERROR: 'Girilen bilgilerde hata var',
  UNKNOWN_ERROR: 'Beklenmeyen bir hata oluştu',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  SAVE_SUCCESS: 'Başarıyla kaydedildi',
  UPDATE_SUCCESS: 'Başarıyla güncellendi',
  DELETE_SUCCESS: 'Başarıyla silindi',
  SEND_SUCCESS: 'Başarıyla gönderildi',
  JOIN_SUCCESS: 'Başarıyla katıldınız',
  LEAVE_SUCCESS: 'Başarıyla ayrıldınız',
} as const;
