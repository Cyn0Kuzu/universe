import { getFirebaseCompatSync } from '../firebase/compat';

const firebase = getFirebaseCompatSync();

// Activity types for better typing
export interface Activity {
  id?: string;
  userId: string;
  type: string;
  description: string;
  points?: number;
  metadata?: any;
  timestamp: any;
}

export const activityLogger = {
  // Log any activity
  logActivity: async (userId: string, type: string, description: string, points: number = 0, metadata: any = {}) => {
    try {
      // Input validation
      if (!userId || typeof userId !== 'string') {
        console.error('Invalid userId for activity logging:', userId);
        return;
      }
      
      // Filter out undefined values from metadata
      const cleanMetadata: any = {};
      for (const [key, value] of Object.entries(metadata)) {
        if (value !== undefined) {
          cleanMetadata[key] = value;
        }
      }
      
      const activityData: Activity = {
        userId,
        type,
        description,
        points,
        metadata: cleanMetadata,
        timestamp: getFirebaseCompatSync().firestore.FieldValue.serverTimestamp()
      };

      await getFirebaseCompatSync().firestore().collection('userActivities').add(activityData);
      console.log(`Activity logged: ${type} for user ${userId}`);
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  },

  // Get user stats
  getUserStats: async (userId: string) => {
    try {
      const snapshot = await getFirebaseCompatSync().firestore()
        .collection('userActivities')
        .where('userId', '==', userId)
        .limit(100)
        .get();

      const activities = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as (Activity & { id: string })[];

      // Sort activities by timestamp descending (newest first)
      activities.sort((a: any, b: any) => {
        const aTime = a.timestamp?.toMillis() || a.createdAt?.toMillis() || 0;
        const bTime = b.timestamp?.toMillis() || b.createdAt?.toMillis() || 0;
        return bTime - aTime;
      });

      return {
        totalActivities: activities.length,
        totalPoints: activities.reduce((sum, activity) => sum + (activity.points || 0), 0),
        recentActivities: activities.slice(0, 10)
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      return null;
    }
  },

  // Get leaderboard
  getLeaderboard: async () => {
    try {
      // This would need aggregation - for now return null
      return null;
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      return null;
    }
  },

  clearCache: async () => 0,

  // Specific activity loggers
  logJoinEvent: async (userId: string, eventId: string, eventTitle?: string, clubId?: string, clubName?: string) => {
    await activityLogger.logActivity(
      userId, 
      'join_event', 
      `${eventTitle || 'Etkinlik'}e katıldı`, 
      10, 
      { 
        eventId,
        eventTitle: eventTitle || 'Bilinmeyen Etkinlik',
        clubId,
        clubName,
        targetId: eventId,
        targetName: eventTitle
      }
    );
  },

  logLikeEvent: async (userId: string, eventId: string, eventTitle?: string, clubId?: string, clubName?: string) => {
    await activityLogger.logActivity(
      userId, 
      'like_event', 
      `${eventTitle || 'Etkinlik'}i beğendi`, 
      5, 
      { 
        eventId,
        eventTitle: eventTitle || 'Bilinmeyen Etkinlik',
        clubId,
        clubName,
        targetId: eventId,
        targetName: eventTitle
      }
    );
  },

  logShareEvent: async (userId: string, eventId: string, eventTitle?: string, clubId?: string, clubName?: string) => {
    await activityLogger.logActivity(
      userId, 
      'share_event', 
      `${eventTitle || 'Etkinlik'}i paylaştı`, 
      8, 
      { 
        eventId,
        eventTitle: eventTitle || 'Bilinmeyen Etkinlik',
        clubId,
        clubName,
        targetId: eventId,
        targetName: eventTitle
      }
    );
  },

  logCommentEvent: async (userId: string, eventId: string, eventTitle?: string, clubId?: string, clubName?: string) => {
    await activityLogger.logActivity(
      userId, 
      'comment_event', 
      `${eventTitle || 'Etkinlik'}e yorum yaptı`, 
      7, 
      { 
        eventId,
        eventTitle: eventTitle || 'Bilinmeyen Etkinlik',
        clubId,
        clubName,
        targetId: eventId,
        targetName: eventTitle
      }
    );
  },

  logUploadPhoto: async (userId: string) => {
    await activityLogger.logActivity(
      userId, 
      'upload_photo', 
      'Profil fotoğrafı yükledi', 
      20
    );
  },

  logCompleteEvent: async (userId: string, eventId: string) => {
    await activityLogger.logActivity(
      userId, 
      'complete_event', 
      'Etkinliği tamamladı', 
      25, 
      { eventId }
    );
  },

  logFollowClub: async (userId: string, clubId: string, clubName?: string) => {
    await activityLogger.logActivity(
      userId, 
      'follow_club', 
      `${clubName || 'Kulübü'} takip etti`, 
      10, 
      { 
        clubId,
        clubName: clubName || 'Bilinmeyen Kulüp',
        targetId: clubId,
        targetName: clubName
      }
    );
  },

  logJoinClub: async (userId: string, clubId: string, clubName?: string) => {
    await activityLogger.logActivity(
      userId, 
      'join_club', 
      `${clubName || 'Kulübe'} katıldı`, 
      25, 
      { 
        clubId,
        clubName: clubName || 'Bilinmeyen Kulüp',
        targetId: clubId,
        targetName: clubName
      }
    );
  },

  logCompleteProfile: async (userId: string) => {
    await activityLogger.logActivity(
      userId, 
      'complete_profile', 
      'Profilini tamamladı', 
      30
    );
  },

  logSearchEvent: async (userId: string, query: string) => {
    await activityLogger.logActivity(
      userId, 
      'search_event', 
      'Etkinlik aradı', 
      2, 
      { query }
    );
  },

  logInviteFriend: async (userId: string) => {
    await activityLogger.logActivity(
      userId, 
      'invite_friend', 
      'Arkadaş davet etti', 
      20
    );
  },

  logDailyCheckIn: async (userId: string) => {
    await activityLogger.logActivity(
      userId, 
      'daily_checkin', 
      'Günlük giriş yaptı', 
      5
    );
  },

  // 🔄 REVERSE ACTIONS - Ters İşlemler
  logUnlikeEvent: async (userId: string, eventId: string, clubId?: string) => {
    await activityLogger.logActivity(
      userId, 
      'unlike_event', 
      'Etkinlik beğenisini geri aldı', 
      -5, 
      { eventId, clubId }
    );
  },

  logLeaveEvent: async (userId: string, eventId: string, clubId?: string) => {
    await activityLogger.logActivity(
      userId, 
      'leave_event', 
      'Etkinlikten ayrıldı', 
      -10, 
      { eventId, clubId }
    );
  },

  logDeleteComment: async (userId: string, eventId: string, commentId: string, clubId?: string) => {
    await activityLogger.logActivity(
      userId, 
      'delete_comment', 
      'Yorumunu sildi', 
      -8, 
      { eventId, commentId, clubId }
    );
  },

  logUnfollowClub: async (userId: string, clubId: string) => {
    await activityLogger.logActivity(
      userId, 
      'unfollow_club', 
      'Kulüp takibini bıraktı', 
      -10, 
      { clubId }
    );
  },

  logLeaveClub: async (userId: string, clubId: string) => {
    await activityLogger.logActivity(
      userId, 
      'leave_club', 
      'Kulüpten ayrıldı', 
      -25, 
      { clubId }
    );
  },

  logUnlikeComment: async (userId: string, commentId: string, eventId?: string, clubId?: string) => {
    await activityLogger.logActivity(
      userId, 
      'unlike_comment', 
      'Yorum beğenisini geri aldı', 
      -3, 
      { commentId, eventId, clubId }
    );
  },

  logLikeComment: async (userId: string, commentId: string, eventId?: string, clubId?: string) => {
    await activityLogger.logActivity(
      userId, 
      'like_comment', 
      'Yorumu beğendi', 
      3, 
      { commentId, eventId, clubId }
    );
  },

  logDeleteEvent: async (userId: string, eventId: string, clubId?: string) => {
    await activityLogger.logActivity(
      userId, 
      'delete_event', 
      'Etkinliği sildi', 
      -50, 
      { eventId, clubId }
    );
  },

  logCancelEvent: async (userId: string, eventId: string, clubId?: string) => {
    await activityLogger.logActivity(
      userId, 
      'cancel_event', 
      'Etkinliği iptal etti', 
      -30, 
      { eventId, clubId }
    );
  },

  logUnshareEvent: async (userId: string, eventId: string, clubId?: string) => {
    await activityLogger.logActivity(
      userId, 
      'unshare_event', 
      'Etkinlik paylaşımını geri aldı', 
      -15, 
      { eventId, clubId }
    );
  }
};
