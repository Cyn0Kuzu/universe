/**
 * 🎯 Types Export Center
 * All type definitions for the application
 */

// Leaderboard types
export * from './leaderboard';

// Event types  
export * from './events';

// Custom types
export * from './custom';

// Theme types
export * from './theme';

// Common interfaces
export interface BaseEntity {
  id: string;
  createdAt: any;
  updatedAt: any;
}

export interface UserProfile extends BaseEntity {
  displayName: string;
  email: string;
  photoURL?: string;
  university?: string;
  department?: string;
  classLevel?: string;
}

export interface ClubProfile extends BaseEntity {
  name: string;
  description?: string;
  logoUrl?: string;
  university?: string;
  category?: string;
  memberCount?: number;
  ownerId: string;
}

// Action types for scoring
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

// Scoring metadata interface
export interface ScoringMetadata {
  targetId?: string;
  eventId?: string;
  clubId?: string;
  userId?: string;
  points?: number;
  description?: string;
  [key: string]: any;
}
