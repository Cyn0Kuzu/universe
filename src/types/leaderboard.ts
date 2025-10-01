/**
 * 🏆 Leaderboard Types - Modern Statistics System
 * İstatistiklere dayalı liderlik tablosu tipler
 */

// Leaderboard türleri
export type LeaderboardType = 'users' | 'events' | 'clubs';

// Base interface for all leaderboard entries
export interface BaseLeaderboardEntry {
  id: string;
  name?: string;
  displayName?: string;
  avatar?: string;
  profileImage?: string;
  totalScore: number;
  weeklyScore?: number;
  monthlyScore?: number;
  rank?: number;
  
  // Statistics
  likes?: number;
  comments?: number;
  participations?: number;
  
  // Meta
  createdAt?: any;
  updatedAt?: any;
}

// User leaderboard entry
export interface UserLeaderboardEntry extends BaseLeaderboardEntry {
  username?: string;
  university?: string;
  department?: string;
  classLevel?: string;
  email?: string;
  followersCount?: number;
  followingCount?: number;
  eventsJoined?: number;
  clubsFollowed?: number;
  badges?: string[];
}

// Club leaderboard entry
export interface ClubLeaderboardEntry extends BaseLeaderboardEntry {
  name: string;
  description?: string;
  university?: string;
  category?: string;
  memberCount?: number;
  eventsCount?: number;
  followersCount?: number;
  ownerId?: string;
  ownerName?: string;
}

// Event leaderboard entry
export interface EventLeaderboardEntry extends BaseLeaderboardEntry {
  title: string;
  description?: string;
  image?: string;
  imageUrl?: string;
  coverImage?: string;
  startDate?: any;
  endDate?: any;
  location?: string;
  
  // Organizer info
  organizerId?: string;
  organizerDisplayName?: string;
  organizerUsername?: string;
  organizerProfileImage?: string;
  
  // Club info
  clubId?: string;
  clubName?: string;
  
  // Stats
  attendeeCount?: number;
  attendeesCount?: number;
  likesCount?: number;
  commentsCount?: number;
  category?: string;
  
  // Status
  status?: 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled';
}

// Union type for all leaderboard entries
export type LeaderboardEntry = UserLeaderboardEntry | ClubLeaderboardEntry | EventLeaderboardEntry;

// Statistics interface
export interface StatisticsData {
  likes: number;
  comments: number;
  participations: number;
  members?: number; // for clubs
  clubs?: number; // for events
}

// Scoring interfaces (legacy - kept for compatibility)
export type ActionType = 
  | 'LIKE_EVENT'
  | 'UNLIKE_EVENT'
  | 'JOIN_EVENT'
  | 'LEAVE_EVENT'
  | 'COMMENT_EVENT'
  | 'DELETE_COMMENT'
  | 'SHARE_EVENT'
  | 'FOLLOW_CLUB'
  | 'UNFOLLOW_CLUB'
  | 'JOIN_CLUB'
  | 'LEAVE_CLUB'
  | 'FOLLOW_USER'
  | 'UNFOLLOW_USER'
  | 'CREATE_EVENT'
  | 'UPDATE_EVENT'
  | 'DELETE_EVENT'
  | 'COMPLETE_PROFILE'
  | 'DAILY_LOGIN'
  | 'LIKE_COMMENT'
  | 'UNLIKE_COMMENT'
  | 'APPROVE_CLUB_MEMBER'
  | 'REJECT_CLUB_MEMBER'
  | 'KICK_CLUB_MEMBER'
  | 'REPLY_COMMENT'
  | 'UNSHARE_EVENT'
  | 'SHARE_CLUB'
  | 'COMPLETE_EVENT'
  | 'UPDATE_PROFILE'
  | 'VERIFY_EMAIL'
  | 'VIEW_EVENT'
  | 'VIEW_CLUB'
  | 'SEARCH_EVENT'
  | 'FIRST_EVENT_JOIN'
  | 'FIRST_CLUB_FOLLOW'
  | 'RATE_EVENT'
  | 'REVIEW_EVENT'
  | 'INVITE_FRIEND'
  | 'TUTORIAL_COMPLETE'
  | 'FEEDBACK_SUBMIT';

export type EntityType = 'user' | 'club' | 'event' | 'comment';

export interface ScoreActivity {
  id?: string;
  userId: string;
  action: ActionType;
  targetId: string;
  targetType: EntityType;
  points: number;
  userPoints: number;
  targetPoints?: number;
  relatedEntityPoints?: number;
  metadata?: any;
  status: 'active' | 'reversed' | 'expired';
  timestamp: any;
  isReversible: boolean;
}

export interface ScoringResponse {
  success: boolean;
  userPointsAwarded: number;
  targetPointsAwarded?: number;
  clubPointsAwarded?: number;
  activityId: string;
  message?: string;
  error?: string;
}

export interface UserScore {
  userId: string;
  totalScore: number;
  lastUpdated: any;
}

// Leaderboard Hook Return Type
export interface LeaderboardHookReturn {
  data: LeaderboardEntry[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}
