import { useEffect } from 'react';
// Modern unified scoring system
import { ModernScoringEngine } from '../services/modernScoringEngine';
import { activityLogger } from '../services/activityLogger';

/**
 * 🎯 Modern Leaderboard Actions Hook - v4.0
 * Unified scoring system with comprehensive action support
 */
export const useLeaderboardActions = () => {
  
  const joinEvent = async (userId: string, eventId: string, metadata: any = {}) => {
    try {
      const result = await ModernScoringEngine.getInstance().processAction(
        userId,
        'JOIN_EVENT',
        eventId,
        'event',
        metadata
      );
      
      await activityLogger.logActivity(userId, 'join_event', {
        eventId,
        eventTitle: metadata.eventTitle || metadata.title || 'Etkinlik',
        ...metadata,
        points: result.userPointsAwarded || 0
      });
      
      return result;
    } catch (error) {
      console.error('Join event action failed:', error);
      throw error;
    }
  };

  const leaveEvent = async (userId: string, eventId: string, metadata: any = {}) => {
    try {
      const result = await ModernScoringEngine.getInstance().processAction(
        userId,
        'LEAVE_EVENT',
        eventId,
        'event',
        metadata
      );
      
      await activityLogger.logActivity(userId, 'leave_event', {
        eventId,
        eventTitle: metadata.eventTitle || metadata.title || 'Etkinlik',
        ...metadata,
        points: result.userPointsAwarded || 0
      });
      
      return result;
    } catch (error) {
      console.error('Leave event action failed:', error);
      throw error;
    }
  };

  const likeEvent = async (userId: string, eventId: string, metadata: any = {}) => {
    try {
      const result = await ModernScoringEngine.getInstance().processAction(
        userId,
        'LIKE_EVENT',
        eventId,
        'event',
        metadata
      );
      
      await activityLogger.logActivity(userId, 'like_event', {
        eventId,
        ...metadata,
        points: result.userPointsAwarded || 0
      });
      
      return result;
    } catch (error) {
      console.error('Like event action failed:', error);
      throw error;
    }
  };

  const unlikeEvent = async (userId: string, eventId: string, metadata: any = {}) => {
    try {
      const result = await ModernScoringEngine.getInstance().processAction(
        userId,
        'UNLIKE_EVENT',
        eventId,
        'event',
        metadata
      );
      
      await activityLogger.logActivity(userId, 'unlike_event', {
        eventId,
        ...metadata,
        points: result.userPointsAwarded || 0
      });
      
      return result;
    } catch (error) {
      console.error('Unlike event action failed:', error);
      throw error;
    }
  };

  const shareEvent = async (userId: string, eventId: string, metadata: any = {}) => {
    try {
      const result = await ModernScoringEngine.getInstance().processAction(
        userId,
        'SHARE_EVENT',
        eventId,
        'event',
        metadata
      );
      
      await activityLogger.logActivity(userId, 'share_event', {
        eventId,
        ...metadata,
        points: result.userPointsAwarded || 0
      });
      
      return result;
    } catch (error) {
      console.error('Share event action failed:', error);
      throw error;
    }
  };

  const commentEvent = async (userId: string, eventId: string, metadata: any = {}) => {
    try {
      const result = await ModernScoringEngine.getInstance().processAction(
        userId,
        'COMMENT_EVENT',
        eventId,
        'event',
        metadata
      );
      
      await activityLogger.logActivity(userId, 'comment_event', {
        eventId,
        ...metadata,
        points: result.userPointsAwarded || 0
      });
      
      return result;
    } catch (error) {
      console.error('Comment event action failed:', error);
      throw error;
    }
  };

  const deleteComment = async (userId: string, commentId: string, metadata: any = {}) => {
    try {
      const result = await ModernScoringEngine.getInstance().processAction(
        userId,
        'DELETE_COMMENT',
        commentId,
        'comment',
        metadata
      );
      
      await activityLogger.logActivity(userId, 'delete_comment', {
        commentId,
        ...metadata,
        points: result.userPointsAwarded || 0
      });
      
      return result;
    } catch (error) {
      console.error('Delete comment action failed:', error);
      throw error;
    }
  };

  const followClub = async (userId: string, clubId: string, metadata: any = {}) => {
    try {
      const result = await ModernScoringEngine.getInstance().processAction(
        userId,
        'FOLLOW_CLUB',
        clubId,
        'club',
        metadata
      );
      
      await activityLogger.logActivity(userId, 'follow_club', {
        clubId,
        ...metadata,
        points: result.userPointsAwarded || 0
      });
      
      return result;
    } catch (error) {
      console.error('Follow club action failed:', error);
      throw error;
    }
  };

  const unfollowClub = async (userId: string, clubId: string, metadata: any = {}) => {
    try {
      const result = await ModernScoringEngine.getInstance().processAction(
        userId,
        'UNFOLLOW_CLUB',
        clubId,
        'club',
        metadata
      );
      
      await activityLogger.logActivity(userId, 'unfollow_club', {
        clubId,
        ...metadata,
        points: result.userPointsAwarded || 0
      });
      
      return result;
    } catch (error) {
      console.error('Unfollow club action failed:', error);
      throw error;
    }
  };

  const joinClub = async (userId: string, clubId: string, metadata: any = {}) => {
    try {
      const result = await ModernScoringEngine.getInstance().processAction(
        userId,
        'JOIN_CLUB',
        clubId,
        'club',
        metadata
      );
      
      await activityLogger.logActivity(userId, 'join_club', {
        clubId,
        ...metadata,
        points: result.userPointsAwarded || 0
      });
      
      return result;
    } catch (error) {
      console.error('Join club action failed:', error);
      throw error;
    }
  };

  const leaveClub = async (userId: string, clubId: string, metadata: any = {}) => {
    try {
      const result = await ModernScoringEngine.getInstance().processAction(
        userId,
        'LEAVE_CLUB',
        clubId,
        'club',
        metadata
      );
      
      await activityLogger.logActivity(userId, 'leave_club', {
        clubId,
        ...metadata,
        points: result.userPointsAwarded || 0
      });
      
      return result;
    } catch (error) {
      console.error('Leave club action failed:', error);
      throw error;
    }
  };

  const createEvent = async (userId: string, eventId: string, metadata: any = {}) => {
    try {
      const result = await ModernScoringEngine.getInstance().processAction(
        userId,
        'CREATE_EVENT',
        eventId,
        'event',
        metadata
      );
      
      await activityLogger.logActivity(userId, 'create_event', {
        eventId,
        ...metadata,
        points: result.userPointsAwarded || 0
      });
      
      return result;
    } catch (error) {
      console.error('Create event action failed:', error);
      throw error;
    }
  };

  return {
    joinEvent,
    leaveEvent,
    likeEvent,
    unlikeEvent,
    shareEvent,
    commentEvent,
    deleteComment,
    followClub,
    unfollowClub,
    joinClub,
    leaveClub,
    createEvent,
    // Handle aliases for backward compatibility
    handleJoinEvent: joinEvent,
    handleLikeEvent: likeEvent,
    handleUnlikeEvent: unlikeEvent,
    handleShareEvent: shareEvent,
    handleCommentEvent: commentEvent,
    handleFollowClub: followClub,
    handleJoinClub: joinClub
  };
};

export default useLeaderboardActions;
