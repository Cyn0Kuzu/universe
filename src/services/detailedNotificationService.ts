import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { NotificationManagement } from '../firebase/notificationManagement';

/**
 * Detailed Notification Service - Replaces scoring system notifications
 * Provides comprehensive, descriptive notifications for all user interactions
 */
export class DetailedNotificationService {
  private static db = firebase.firestore();

  // ================== FOLLOW SYSTEM NOTIFICATIONS ==================

  /**
   * Notify when someone follows a user
   */
  static async notifyUserFollowed(followedUserId: string, followerUserId: string): Promise<void> {
    try {
      const [followerDoc, followedDoc] = await Promise.all([
        this.db.collection('users').doc(followerUserId).get(),
        this.db.collection('users').doc(followedUserId).get()
      ]);

      const followerData = followerDoc.data();
      const followedData = followedDoc.data();

      if (!followerData || !followedData) return;

      const followerName = followerData.displayName || followerData.name || 'Bilinmeyen Kullanıcı';
      const followerUsername = followerData.username ? `@${followerData.username}` : '';
      const followerUniversity = followerData.university || '';

      let message = `${followerName}`;
      if (followerUsername) message += ` (${followerUsername})`;
      if (followerUniversity) message += ` - ${this.getUniversityName(followerUniversity)}`;
      message += ' sizi takip etmeye başladı';

      await NotificationManagement.sendNotificationToUser(
        followedUserId,
        'user_follow',
        'Yeni Takipçi! 👥',
        message,
        {
          actorId: followerUserId,
          actorName: followerName,
          actorImage: followerData.profileImage,
          actorUsername: followerData.username,
          actorUniversity: followerUniversity
        },
        { priority: 'normal', category: 'social' }
      );

    } catch (error) {
      console.error('Error sending follow notification:', error);
    }
  }

  /**
   * Notify when someone unfollows a user
   */
  static async notifyUserUnfollowed(unfollowedUserId: string, unfollowerUserId: string): Promise<void> {
    try {
      const [unfollowerDoc, unfollowedDoc] = await Promise.all([
        this.db.collection('users').doc(unfollowerUserId).get(),
        this.db.collection('users').doc(unfollowedUserId).get()
      ]);

      const unfollowerData = unfollowerDoc.data();
      const unfollowedData = unfollowedDoc.data();

      if (!unfollowerData || !unfollowedData) return;

      const unfollowerName = unfollowerData.displayName || unfollowerData.name || 'Bilinmeyen Kullanıcı';
      const unfollowerUsername = unfollowerData.username ? `@${unfollowerData.username}` : '';

      let message = `${unfollowerName}`;
      if (unfollowerUsername) message += ` (${unfollowerUsername})`;
      message += ' sizi takip etmeyi bıraktı';

      await NotificationManagement.sendNotificationToUser(
        unfollowedUserId,
        'user_unfollow',
        'Takip Bırakıldı 📉',
        message,
        {
          actorId: unfollowerUserId,
          actorName: unfollowerName,
          actorImage: unfollowerData.profileImage,
          actorUsername: unfollowerData.username
        },
        { priority: 'low', category: 'social' }
      );

    } catch (error) {
      console.error('Error sending unfollow notification:', error);
    }
  }

  // ================== CLUB FOLLOW NOTIFICATIONS ==================

  /**
   * Notify club when someone follows them
   */
  static async notifyClubFollowed(clubId: string, followerId: string): Promise<void> {
    try {
      const [followerDoc, clubDoc] = await Promise.all([
        this.db.collection('users').doc(followerId).get(),
        this.db.collection('users').doc(clubId).get()
      ]);

      const followerData = followerDoc.data();
      const clubData = clubDoc.data();

      if (!followerData || !clubData) return;

      const followerName = followerData.displayName || followerData.name || 'Bilinmeyen Kullanıcı';
      const followerUsername = followerData.username ? `@${followerData.username}` : '';
      const followerUniversity = followerData.university || '';

      let message = `${followerName}`;
      if (followerUsername) message += ` (${followerUsername})`;
      if (followerUniversity) message += ` - ${this.getUniversityName(followerUniversity)}`;
      message += ' kulübünüzü takip etmeye başladı';

      await NotificationManagement.sendNotificationToUser(
        clubId,
        'club_followed',
        'Yeni Kulüp Takipçisi! 🏛️',
        message,
        {
          actorId: followerId,
          actorName: followerName,
          actorImage: followerData.profileImage,
          actorUsername: followerData.username,
          actorUniversity: followerUniversity,
          clubId: clubId
        },
        { priority: 'normal', category: 'club' }
      );

    } catch (error) {
      console.error('Error sending club follow notification:', error);
    }
  }

  // ================== EVENT INTERACTION NOTIFICATIONS ==================

  /**
   * Notify event organizer when someone likes their event
   */
  static async notifyEventLiked(eventId: string, likerId: string): Promise<void> {
    try {
      const [eventDoc, likerDoc] = await Promise.all([
        this.db.collection('events').doc(eventId).get(),
        this.db.collection('users').doc(likerId).get()
      ]);

      const eventData = eventDoc.data();
      const likerData = likerDoc.data();

      if (!eventData || !likerData) return;

      const eventTitle = eventData.title || eventData.name || 'İsimsiz Etkinlik';
      const likerName = likerData.displayName || likerData.name || 'Bilinmeyen Kullanıcı';
      const likerUsername = likerData.username ? `@${likerData.username}` : '';
      
      const organizerId = eventData.clubId || eventData.organizerId || eventData.creatorId;
      if (!organizerId) return;

      let message = `${likerName}`;
      if (likerUsername) message += ` (${likerUsername})`;
      message += ` "${eventTitle}" etkinliğinizi beğendi`;

      await NotificationManagement.sendNotificationToUser(
        organizerId,
        'event_like',
        'Etkinliğiniz Beğenildi! ❤️',
        message,
        {
          actorId: likerId,
          actorName: likerName,
          actorImage: likerData.profileImage,
          actorUsername: likerData.username,
          eventId: eventId,
          eventTitle: eventTitle
        },
        { priority: 'normal', category: 'event' }
      );

    } catch (error) {
      console.error('Error sending event liked notification:', error);
    }
  }

  /**
   * Notify event organizer when someone unlikes their event
   */
  static async notifyEventUnliked(eventId: string, unlikerId: string): Promise<void> {
    try {
      const [eventDoc, unlikerDoc] = await Promise.all([
        this.db.collection('events').doc(eventId).get(),
        this.db.collection('users').doc(unlikerId).get()
      ]);

      const eventData = eventDoc.data();
      const unlikerData = unlikerDoc.data();

      if (!eventData || !unlikerData) return;

      const eventTitle = eventData.title || eventData.name || 'İsimsiz Etkinlik';
      const unlikerName = unlikerData.displayName || unlikerData.name || 'Bilinmeyen Kullanıcı';
      const unlikerUsername = unlikerData.username ? `@${unlikerData.username}` : '';
      
      const organizerId = eventData.clubId || eventData.organizerId || eventData.creatorId;
      if (!organizerId) return;

      let message = `${unlikerName}`;
      if (unlikerUsername) message += ` (${unlikerUsername})`;
      message += ` "${eventTitle}" etkinliğindeki beğenisini geri aldı`;

      await NotificationManagement.sendNotificationToUser(
        organizerId,
        'event_like',
        'Beğeni Geri Alındı 💔',
        message,
        {
          actorId: unlikerId,
          actorName: unlikerName,
          actorImage: unlikerData.profileImage,
          actorUsername: unlikerData.username,
          eventId: eventId,
          eventTitle: eventTitle
        },
        { priority: 'low', category: 'event' }
      );

    } catch (error) {
      console.error('Error sending event unliked notification:', error);
    }
  }

  /**
   * Notify event organizer when someone joins their event
   */
  static async notifyEventJoined(eventId: string, participantId: string): Promise<void> {
    try {
      const [eventDoc, participantDoc] = await Promise.all([
        this.db.collection('events').doc(eventId).get(),
        this.db.collection('users').doc(participantId).get()
      ]);

      const eventData = eventDoc.data();
      const participantData = participantDoc.data();

      if (!eventData || !participantData) return;

      const eventTitle = eventData.title || eventData.name || 'İsimsiz Etkinlik';
      const participantName = participantData.displayName || participantData.name || 'Bilinmeyen Kullanıcı';
      const participantUsername = participantData.username ? `@${participantData.username}` : '';
      
      const organizerId = eventData.clubId || eventData.organizerId || eventData.creatorId;
      if (!organizerId) return;

      let message = `${participantName}`;
      if (participantUsername) message += ` (${participantUsername})`;
      message += ` "${eventTitle}" etkinliğinize katıldı`;

      await NotificationManagement.sendNotificationToUser(
        organizerId,
        'event_join',
        'Yeni Katılımcı! 🎉',
        message,
        {
          actorId: participantId,
          actorName: participantName,
          actorImage: participantData.profileImage,
          actorUsername: participantData.username,
          eventId: eventId,
          eventTitle: eventTitle
        },
        { priority: 'normal', category: 'event' }
      );

    } catch (error) {
      console.error('Error sending event joined notification:', error);
    }
  }

  /**
   * Notify event organizer when someone leaves their event
   */
  static async notifyEventLeft(eventId: string, leaverId: string): Promise<void> {
    try {
      const [eventDoc, leaverDoc] = await Promise.all([
        this.db.collection('events').doc(eventId).get(),
        this.db.collection('users').doc(leaverId).get()
      ]);

      const eventData = eventDoc.data();
      const leaverData = leaverDoc.data();

      if (!eventData || !leaverData) return;

      const eventTitle = eventData.title || eventData.name || 'İsimsiz Etkinlik';
      const leaverName = leaverData.displayName || leaverData.name || 'Bilinmeyen Kullanıcı';
      const leaverUsername = leaverData.username ? `@${leaverData.username}` : '';
      
      const organizerId = eventData.clubId || eventData.organizerId || eventData.creatorId;
      if (!organizerId) return;

      let message = `${leaverName}`;
      if (leaverUsername) message += ` (${leaverUsername})`;
      message += ` "${eventTitle}" etkinliğinizden ayrıldı`;

      await NotificationManagement.sendNotificationToUser(
        organizerId,
        'event_join',
        'Katılımcı Ayrıldı 😔',
        message,
        {
          actorId: leaverId,
          actorName: leaverName,
          actorImage: leaverData.profileImage,
          actorUsername: leaverData.username,
          eventId: eventId,
          eventTitle: eventTitle
        },
        { priority: 'low', category: 'event' }
      );

    } catch (error) {
      console.error('Error sending event left notification:', error);
    }
  }

  // ================== COMMENT NOTIFICATIONS ==================

  /**
   * Notify event organizer when someone comments on their event
   */
  static async notifyEventCommented(eventId: string, commenterId: string, commentText: string): Promise<void> {
    try {
      const [eventDoc, commenterDoc] = await Promise.all([
        this.db.collection('events').doc(eventId).get(),
        this.db.collection('users').doc(commenterId).get()
      ]);

      const eventData = eventDoc.data();
      const commenterData = commenterDoc.data();

      if (!eventData || !commenterData) return;

      const eventTitle = eventData.title || eventData.name || 'İsimsiz Etkinlik';
      const commenterName = commenterData.displayName || commenterData.name || 'Bilinmeyen Kullanıcı';
      const commenterUsername = commenterData.username ? `@${commenterData.username}` : '';
      
      const organizerId = eventData.clubId || eventData.organizerId || eventData.creatorId;
      if (!organizerId) return;

      let message = `${commenterName}`;
      if (commenterUsername) message += ` (${commenterUsername})`;
      message += ` "${eventTitle}" etkinliğinize yorum yaptı: "${commentText.substring(0, 50)}${commentText.length > 50 ? '...' : ''}"`;

      await NotificationManagement.sendNotificationToUser(
        organizerId,
        'event_comment',
        'Yeni Yorum! 💬',
        message,
        {
          actorId: commenterId,
          actorName: commenterName,
          actorImage: commenterData.profileImage,
          actorUsername: commenterData.username,
          eventId: eventId,
          eventTitle: eventTitle,
          commentText: commentText
        },
        { priority: 'normal', category: 'event' }
      );

    } catch (error) {
      console.error('Error sending event comment notification:', error);
    }
  }

  /**
   * Notify event organizer when someone deletes their comment
   */
  static async notifyCommentDeleted(eventId: string, deleterId: string, commentText: string): Promise<void> {
    try {
      const [eventDoc, deleterDoc] = await Promise.all([
        this.db.collection('events').doc(eventId).get(),
        this.db.collection('users').doc(deleterId).get()
      ]);

      const eventData = eventDoc.data();
      const deleterData = deleterDoc.data();

      if (!eventData || !deleterData) return;

      const eventTitle = eventData.title || eventData.name || 'İsimsiz Etkinlik';
      const deleterName = deleterData.displayName || deleterData.name || 'Bilinmeyen Kullanıcı';
      const deleterUsername = deleterData.username ? `@${deleterData.username}` : '';
      
      const organizerId = eventData.clubId || eventData.organizerId || eventData.creatorId;
      if (!organizerId) return;

      let message = `${deleterName}`;
      if (deleterUsername) message += ` (${deleterUsername})`;
      message += ` "${eventTitle}" etkinliğindeki yorumunu sildi`;

      await NotificationManagement.sendNotificationToUser(
        organizerId,
        'event_comment',
        'Yorum Silindi 🗑️',
        message,
        {
          actorId: deleterId,
          actorName: deleterName,
          actorImage: deleterData.profileImage,
          actorUsername: deleterData.username,
          eventId: eventId,
          eventTitle: eventTitle,
          deletedCommentText: commentText
        },
        { priority: 'low', category: 'event' }
      );

    } catch (error) {
      console.error('Error sending comment deleted notification:', error);
    }
  }

  // ================== STATISTICS SYNCHRONIZATION ==================

  /**
   * Synchronize all user statistics after any interaction
   */
  static async syncUserStatistics(userId: string): Promise<void> {
    try {
      console.log(`🔄 Syncing statistics for user: ${userId}`);
      
      const [likesGiven, commentsGiven, eventsJoined, followersCount, followingCount, clubsFollowed] = await Promise.all([
        // Likes given by user
        this.db.collection('eventLikes').where('userId', '==', userId).get(),
        // Comments made by user  
        this.db.collection('eventComments').where('userId', '==', userId).get(),
        // Events joined by user
        this.db.collection('eventAttendees').where('userId', '==', userId).get(),
        // User's followers
        this.db.collection('userFollowers').where('followedUserId', '==', userId).get(),
        // User's following
        this.db.collection('userFollowers').where('followerUserId', '==', userId).get(),
        // Clubs followed by user
        this.db.collection('clubFollowers').where('followerId', '==', userId).get()
      ]);

      const stats = {
        likesGiven: likesGiven.size,
        commentsGiven: commentsGiven.size,
        eventsJoined: eventsJoined.size,
        followersCount: followersCount.size,
        followingCount: followingCount.size,
        clubsFollowed: clubsFollowed.size,
        lastSynced: firebase.firestore.FieldValue.serverTimestamp()
      };

      await this.db.collection('userStats').doc(userId).set(stats, { merge: true });
      
      console.log(`✅ Statistics synced for user ${userId}:`, stats);

    } catch (error) {
      console.error('Error syncing user statistics:', error);
    }
  }

  /**
   * Synchronize event statistics after any interaction
   */
  static async syncEventStatistics(eventId: string): Promise<void> {
    try {
      console.log(`🔄 Syncing statistics for event: ${eventId}`);
      
      const [likesCount, commentsCount, attendeesCount] = await Promise.all([
        this.db.collection('eventLikes').where('eventId', '==', eventId).get(),
        this.db.collection('eventComments').where('eventId', '==', eventId).get(),
        this.db.collection('eventAttendees').where('eventId', '==', eventId).get()
      ]);

      const stats = {
        likesCount: likesCount.size,
        commentsCount: commentsCount.size,
        attendeesCount: attendeesCount.size,
        lastSynced: firebase.firestore.FieldValue.serverTimestamp()
      };

      await this.db.collection('eventStats').doc(eventId).set(stats, { merge: true });
      
      console.log(`✅ Statistics synced for event ${eventId}:`, stats);

    } catch (error) {
      console.error('Error syncing event statistics:', error);
    }
  }

  /**
   * Synchronize club statistics after any interaction
   */
  static async syncClubStatistics(clubId: string): Promise<void> {
    try {
      console.log(`🔄 Syncing statistics for club: ${clubId}`);
      
      const [followersCount, membersCount, eventsCount] = await Promise.all([
        this.db.collection('clubFollowers').where('clubId', '==', clubId).get(),
        this.db.collection('clubMembers').where('clubId', '==', clubId).get(),
        this.db.collection('events').where('clubId', '==', clubId).get()
      ]);

      const stats = {
        followersCount: followersCount.size,
        membersCount: membersCount.size,
        eventsCount: eventsCount.size,
        lastSynced: firebase.firestore.FieldValue.serverTimestamp()
      };

      await this.db.collection('clubStats').doc(clubId).set(stats, { merge: true });
      
      console.log(`✅ Statistics synced for club ${clubId}:`, stats);

    } catch (error) {
      console.error('Error syncing club statistics:', error);
    }
  }

  // ================== UTILITY METHODS ==================

  /**
   * Get university display name
   */
  private static getUniversityName(universityCode: string): string {
    const universities: { [key: string]: string } = {
      'istanbul-university': 'İstanbul Üniversitesi',
      'bogazici-university': 'Boğaziçi Üniversitesi',
      'metu': 'ODTÜ',
      'hacettepe-university': 'Hacettepe Üniversitesi',
      'ankara-university': 'Ankara Üniversitesi',
      'itu': 'İTÜ',
      'marmara-university': 'Marmara Üniversitesi',
      'galatasaray-university': 'Galatasaray Üniversitesi',
      'yildiz-technical': 'Yıldız Teknik Üniversitesi',
      'istanbul-technical': 'İstanbul Teknik Üniversitesi'
    };
    
    return universities[universityCode] || universityCode;
  }
}

export default DetailedNotificationService;
