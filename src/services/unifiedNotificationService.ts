/**
 * 🔔 Unified Notification Service
 * Kulüp ve öğrenci için merkezi bildirim sistemi
 */

import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

export interface BaseNotification {
  id?: string;
  recipientId: string;
  recipientType: 'club' | 'student';
  senderId: string;
  senderName: string;
  senderImage?: string;
  senderUsername?: string;
  title: string;
  message: string;
  type: string;
  category: 'membership' | 'events' | 'social' | 'system';
  priority: 'high' | 'medium' | 'low';
  read: boolean;
  createdAt: firebase.firestore.Timestamp;
  metadata?: any;
}

// ============ KULÜP BİLDİRİM TÜRLERİ ============
export type ClubNotificationType = 
  | 'event_like'           // Etkinlik beğenildi
  | 'event_unlike'         // Etkinlik beğenisi geri alındı  
  | 'event_comment'        // Etkinlige yorum yapıldı
  | 'event_comment_delete' // Etkinlik yorumu silindi
  | 'event_join'           // Etkinliğe katılındı
  | 'event_leave'          // Etkinlikten ayrılındı
  | 'membership_request'   // Üyelik başvurusu
  | 'club_follow'          // Kulüp takip edildi
  | 'club_unfollow'        // Kulüp takipten çıkarıldı
  | 'user_follow'          // Kullanıcı takip edildi
  | 'user_unfollow';       // Kullanıcı takipten çıkarıldı

// ============ ÖĞRENCİ BİLDİRİM TÜRLERİ ============
export type StudentNotificationType = 
  | 'club_new_event'           // Üye olduğunuz kulüp yeni etkinlik paylaştı
  | 'event_comment_received'   // Beğendiğiniz etkinliğe yorum yapıldı
  | 'joined_event_comment'     // Katıldığınız etkinliğe yorum yapıldı
  | 'membership_approved'      // Üyeliğiniz onaylandı
  | 'membership_rejected'      // Üyeliğiniz reddedildi
  | 'membership_removed'       // Üyelikten çıkarıldınız
  | 'user_followed'            // Sizi takip etti
  | 'user_unfollowed';         // Sizi takipten çıkardı

export class UnifiedNotificationService {
  private static db = firebase.firestore();

  // =================== KULÜP BİLDİRİMLERİ ===================

  /**
   * Etkinlik beğenildiğinde kulübü bilgilendir
   */
  static async notifyClubEventLiked(
    clubId: string,
    eventId: string,
    eventTitle: string,
    userId: string,
    userName: string,
    userImage?: string
  ): Promise<void> {
    try {
      await this.sendNotification({
        recipientId: clubId,
        recipientType: 'club',
        senderId: userId,
        senderName: userName,
        senderImage: userImage,
        title: 'Etkinlik Beğenildi ❤️',
        message: `${userName} "${eventTitle}" etkinliğinizi beğendi`,
        type: 'event_like',
        category: 'events',
        priority: 'medium',
        metadata: { eventId, eventTitle }
      });
    } catch (error) {
      console.error('Club event liked notification failed:', error);
    }
  }

  /**
   * Etkinlik beğenisi geri alındığında kulübü bilgilendir
   */
  static async notifyClubEventUnliked(
    clubId: string,
    eventId: string,
    eventTitle: string,
    userId: string,
    userName: string
  ): Promise<void> {
    try {
      await this.sendNotification({
        recipientId: clubId,
        recipientType: 'club',
        senderId: userId,
        senderName: userName,
        title: 'Beğeni Geri Alındı 💔',
        message: `${userName} "${eventTitle}" etkinliğindeki beğenisini geri aldı`,
        type: 'event_unlike',
        category: 'events',
        priority: 'low',
        metadata: { eventId, eventTitle }
      });
    } catch (error) {
      console.error('Club event unliked notification failed:', error);
    }
  }

  /**
   * Etkinliğe yorum yapıldığında kulübü bilgilendir
   */
  static async notifyClubEventComment(
    clubId: string,
    eventId: string,
    eventTitle: string,
    userId: string,
    userName: string,
    commentContent: string,
    userImage?: string
  ): Promise<void> {
    try {
      await this.sendNotification({
        recipientId: clubId,
        recipientType: 'club',
        senderId: userId,
        senderName: userName,
        senderImage: userImage,
        title: 'Yeni Yorum 💬',
        message: `${userName} "${eventTitle}" etkinliğinize yorum yaptı: "${commentContent.substring(0, 50)}..."`,
        type: 'event_comment',
        category: 'events',
        priority: 'medium',
        metadata: { eventId, eventTitle, commentContent }
      });
    } catch (error) {
      console.error('Club event comment notification failed:', error);
    }
  }

  /**
   * Etkinlik yorumu silindiğinde kulübü bilgilendir
   */
  static async notifyClubEventCommentDeleted(
    clubId: string,
    eventId: string,
    eventTitle: string,
    userId: string,
    userName: string,
    commentContent: string
  ): Promise<void> {
    try {
      await this.sendNotification({
        recipientId: clubId,
        recipientType: 'club',
        senderId: userId,
        senderName: userName,
        title: 'Yorum Silindi 🗑️',
        message: `${userName} "${eventTitle}" etkinliğindeki yorumunu sildi`,
        type: 'event_comment_delete',
        category: 'events',
        priority: 'low',
        metadata: { eventId, eventTitle, commentContent }
      });
    } catch (error) {
      console.error('Club event comment deleted notification failed:', error);
    }
  }

  /**
   * Etkinliğe katılındığında kulübü bilgilendir
   */
  static async notifyClubEventJoined(
    clubId: string,
    eventId: string,
    eventTitle: string,
    userId: string,
    userName: string,
    userImage?: string
  ): Promise<void> {
    try {
      await this.sendNotification({
        recipientId: clubId,
        recipientType: 'club',
        senderId: userId,
        senderName: userName,
        senderImage: userImage,
        title: 'Yeni Katılımcı 🎉',
        message: `${userName} "${eventTitle}" etkinliğinize katıldı`,
        type: 'event_join',
        category: 'events',
        priority: 'medium',
        metadata: { eventId, eventTitle }
      });
    } catch (error) {
      console.error('Club event joined notification failed:', error);
    }
  }

  /**
   * Etkinlikten ayrılındığında kulübü bilgilendir
   */
  static async notifyClubEventLeft(
    clubId: string,
    eventId: string,
    eventTitle: string,
    userId: string,
    userName: string
  ): Promise<void> {
    try {
      await this.sendNotification({
        recipientId: clubId,
        recipientType: 'club',
        senderId: userId,
        senderName: userName,
        title: 'Katılımcı Ayrıldı 😞',
        message: `${userName} "${eventTitle}" etkinliğinden ayrıldı`,
        type: 'event_leave',
        category: 'events',
        priority: 'low',
        metadata: { eventId, eventTitle }
      });
    } catch (error) {
      console.error('Club event left notification failed:', error);
    }
  }

  /**
   * Üyelik başvurusu yapıldığında kulübü bilgilendir
   */
  static async notifyClubMembershipRequest(
    clubId: string,
    userId: string,
    userName: string,
    userImage?: string,
    userUniversity?: string
  ): Promise<void> {
    try {
      await this.sendNotification({
        recipientId: clubId,
        recipientType: 'club',
        senderId: userId,
        senderName: userName,
        senderImage: userImage,
        title: 'Yeni Üyelik Başvurusu 📝',
        message: `${userName} kulübünüze üyelik başvurusu yaptı`,
        type: 'membership_request',
        category: 'membership',
        priority: 'high',
        metadata: { userUniversity }
      });
    } catch (error) {
      console.error('Club membership request notification failed:', error);
    }
  }

  /**
   * Kulüp takip edildiğinde kulübü bilgilendir
   */
  static async notifyClubFollowed(
    clubId: string,
    userId: string,
    userName: string,
    userImage?: string,
    userUniversity?: string
  ): Promise<void> {
    try {
      await this.sendNotification({
        recipientId: clubId,
        recipientType: 'club',
        senderId: userId,
        senderName: userName,
        senderImage: userImage,
        title: 'Yeni Takipçi 👥',
        message: `${userName} kulübünüzü takip etmeye başladı`,
        type: 'club_follow',
        category: 'social',
        priority: 'medium',
        metadata: { userUniversity }
      });
    } catch (error) {
      console.error('Club followed notification failed:', error);
    }
  }

  /**
   * Kulüp takipten çıkarıldığında kulübü bilgilendir
   */
  static async notifyClubUnfollowed(
    clubId: string,
    userId: string,
    userName: string
  ): Promise<void> {
    try {
      await this.sendNotification({
        recipientId: clubId,
        recipientType: 'club',
        senderId: userId,
        senderName: userName,
        title: 'Takipten Çıkarıldı 📉',
        message: `${userName} kulübünüzü takip etmeyi bıraktı`,
        type: 'club_unfollow',
        category: 'social',
        priority: 'low',
        metadata: {}
      });
    } catch (error) {
      console.error('Club unfollowed notification failed:', error);
    }
  }

  // =================== ÖĞRENCİ BİLDİRİMLERİ ===================

  /**
   * Üye olduğu kulüp yeni etkinlik paylaştığında öğrenciyi bilgilendir
   */
  static async notifyStudentClubNewEvent(
    studentIds: string[],
    eventId: string,
    eventTitle: string,
    clubId: string,
    clubName: string,
    clubImage?: string
  ): Promise<void> {
    try {
      const promises = studentIds.map(studentId =>
        this.sendNotification({
          recipientId: studentId,
          recipientType: 'student',
          senderId: clubId,
          senderName: clubName,
          senderImage: clubImage,
          title: 'Yeni Etkinlik! 🎉',
          message: `${clubName} yeni bir etkinlik paylaştı: "${eventTitle}"`,
          type: 'club_new_event',
          category: 'events',
          priority: 'high',
          metadata: { eventId, eventTitle, clubId, clubName }
        })
      );
      
      await Promise.all(promises);
    } catch (error) {
      console.error('Student club new event notification failed:', error);
    }
  }

  /**
   * Beğendiği etkinliğe yorum yapıldığında öğrenciyi bilgilendir
   */
  static async notifyStudentLikedEventComment(
    studentIds: string[],
    eventId: string,
    eventTitle: string,
    commenterId: string,
    commenterName: string,
    commentContent: string
  ): Promise<void> {
    try {
      const promises = studentIds.map(studentId =>
        this.sendNotification({
          recipientId: studentId,
          recipientType: 'student',
          senderId: commenterId,
          senderName: commenterName,
          title: 'Beğendiğiniz Etkinliğe Yorum 💬',
          message: `${commenterName} beğendiğiniz "${eventTitle}" etkinliğine yorum yaptı`,
          type: 'event_comment_received',
          category: 'events',
          priority: 'medium',
          metadata: { eventId, eventTitle, commentContent }
        })
      );
      
      await Promise.all(promises);
    } catch (error) {
      console.error('Student liked event comment notification failed:', error);
    }
  }

  /**
   * Katıldığı etkinliğe yorum yapıldığında öğrenciyi bilgilendir
   */
  static async notifyStudentJoinedEventComment(
    studentIds: string[],
    eventId: string,
    eventTitle: string,
    commenterId: string,
    commenterName: string,
    commentContent: string
  ): Promise<void> {
    try {
      const promises = studentIds.map(studentId =>
        this.sendNotification({
          recipientId: studentId,
          recipientType: 'student',
          senderId: commenterId,
          senderName: commenterName,
          title: 'Katıldığınız Etkinliğe Yorum 💬',
          message: `${commenterName} katıldığınız "${eventTitle}" etkinliğine yorum yaptı`,
          type: 'joined_event_comment',
          category: 'events',
          priority: 'medium',
          metadata: { eventId, eventTitle, commentContent }
        })
      );
      
      await Promise.all(promises);
    } catch (error) {
      console.error('Student joined event comment notification failed:', error);
    }
  }

  /**
   * Üyelik onaylandığında öğrenciyi bilgilendir
   */
  static async notifyStudentMembershipApproved(
    studentId: string,
    clubId: string,
    clubName: string,
    clubImage?: string
  ): Promise<void> {
    try {
      await this.sendNotification({
        recipientId: studentId,
        recipientType: 'student',
        senderId: clubId,
        senderName: clubName,
        senderImage: clubImage,
        title: 'Üyelik Onaylandı! 🎉',
        message: `${clubName} kulübüne üyeliğiniz onaylandı. Hoş geldiniz!`,
        type: 'membership_approved',
        category: 'membership',
        priority: 'high',
        metadata: { clubId, clubName }
      });
    } catch (error) {
      console.error('Student membership approved notification failed:', error);
    }
  }

  /**
   * Üyelik reddedildiğinde öğrenciyi bilgilendir
   */
  static async notifyStudentMembershipRejected(
    studentId: string,
    clubId: string,
    clubName: string,
    reason?: string
  ): Promise<void> {
    try {
      const message = reason 
        ? `${clubName} kulübüne üyelik başvurunuz reddedildi. Sebep: ${reason}`
        : `${clubName} kulübüne üyelik başvurunuz reddedildi.`;

      await this.sendNotification({
        recipientId: studentId,
        recipientType: 'student',
        senderId: clubId,
        senderName: clubName,
        title: 'Üyelik Reddedildi ❌',
        message,
        type: 'membership_rejected',
        category: 'membership',
        priority: 'medium',
        metadata: { clubId, clubName, reason }
      });
    } catch (error) {
      console.error('Student membership rejected notification failed:', error);
    }
  }

  /**
   * Üyelikten çıkarıldığında öğrenciyi bilgilendir
   */
  static async notifyStudentMembershipRemoved(
    studentId: string,
    clubId: string,
    clubName: string,
    reason?: string
  ): Promise<void> {
    try {
      const message = reason 
        ? `${clubName} kulübünden üyeliğiniz sonlandırıldı. Sebep: ${reason}`
        : `${clubName} kulübünden üyeliğiniz sonlandırıldı.`;

      await this.sendNotification({
        recipientId: studentId,
        recipientType: 'student',
        senderId: clubId,
        senderName: clubName,
        title: 'Üyelik Sonlandırıldı ⚠️',
        message,
        type: 'membership_removed',
        category: 'membership',
        priority: 'high',
        metadata: { clubId, clubName, reason }
      });
    } catch (error) {
      console.error('Student membership removed notification failed:', error);
    }
  }

  /**
   * Takip edildiğinde öğrenciyi bilgilendir
   */
  static async notifyStudentFollowed(
    studentId: string,
    followerId: string,
    followerName: string,
    followerImage?: string,
    followerUsername?: string
  ): Promise<void> {
    try {
      await this.sendNotification({
        recipientId: studentId,
        recipientType: 'student',
        senderId: followerId,
        senderName: followerName,
        senderImage: followerImage,
        senderUsername: followerUsername,
        title: 'Yeni Takipçi! 👥',
        message: `${followerName} sizi takip etmeye başladı`,
        type: 'user_followed',
        category: 'social',
        priority: 'medium',
        metadata: { followerUsername }
      });
    } catch (error) {
      console.error('Student followed notification failed:', error);
    }
  }

  /**
   * Takipten çıkarıldığında öğrenciyi bilgilendir
   */
  static async notifyStudentUnfollowed(
    studentId: string,
    unfollowerId: string,
    unfollowerName: string
  ): Promise<void> {
    try {
      await this.sendNotification({
        recipientId: studentId,
        recipientType: 'student',
        senderId: unfollowerId,
        senderName: unfollowerName,
        title: 'Takipten Çıkarıldı 📉',
        message: `${unfollowerName} sizi takip etmeyi bıraktı`,
        type: 'user_unfollowed',
        category: 'social',
        priority: 'low',
        metadata: {}
      });
    } catch (error) {
      console.error('Student unfollowed notification failed:', error);
    }
  }

  // =================== YARDIMCI FONKSİYONLAR ===================

  /**
   * Bildirim gönder
   */
  private static async sendNotification(notification: Omit<BaseNotification, 'id' | 'read' | 'createdAt'>): Promise<void> {
    try {
      const notificationData: BaseNotification = {
        ...notification,
        read: false,
        createdAt: firebase.firestore.Timestamp.now()
      };

      await this.db.collection('notifications').add(notificationData);
      console.log(`✅ Notification sent to ${notification.recipientType}: ${notification.recipientId}`);
    } catch (error) {
      console.error('Send notification failed:', error);
      throw error;
    }
  }

  /**
   * Kullanıcı bilgilerini getir
   */
  static async getUserInfo(userId: string): Promise<{ name: string; image?: string; username?: string; university?: string }> {
    try {
      const userDoc = await this.db.collection('users').doc(userId).get();
      const userData = userDoc.data();
      
      if (!userData) {
        return { name: 'Bilinmeyen Kullanıcı' };
      }

      return {
        name: userData.displayName || userData.name || 'Bilinmeyen Kullanıcı',
        image: userData.profileImage,
        username: userData.username,
        university: userData.university
      };
    } catch (error) {
      console.error('Get user info failed:', error);
      return { name: 'Bilinmeyen Kullanıcı' };
    }
  }

  /**
   * Etkinlik bilgilerini getir
   */
  static async getEventInfo(eventId: string): Promise<{ title: string; clubId?: string }> {
    try {
      const eventDoc = await this.db.collection('events').doc(eventId).get();
      const eventData = eventDoc.data();
      
      if (!eventData) {
        return { title: 'Bilinmeyen Etkinlik' };
      }

      return {
        title: eventData.title || eventData.name || 'Bilinmeyen Etkinlik',
        clubId: eventData.clubId || eventData.organizerId
      };
    } catch (error) {
      console.error('Get event info failed:', error);
      return { title: 'Bilinmeyen Etkinlik' };
    }
  }

  /**
   * Kulüp bilgilerini getir
   */
  static async getClubInfo(clubId: string): Promise<{ name: string; image?: string }> {
    try {
      const clubDoc = await this.db.collection('users').doc(clubId).get();
      const clubData = clubDoc.data();
      
      if (!clubData) {
        return { name: 'Bilinmeyen Kulüp' };
      }

      return {
        name: clubData.displayName || clubData.name || clubData.clubName || 'Bilinmeyen Kulüp',
        image: clubData.profileImage
      };
    } catch (error) {
      console.error('Get club info failed:', error);
      return { name: 'Bilinmeyen Kulüp' };
    }
  }

  /**
   * Etkinliği beğenen öğrencileri getir
   */
  static async getEventLikers(eventId: string): Promise<string[]> {
    try {
      const likesSnapshot = await this.db
        .collection('eventLikes')
        .where('eventId', '==', eventId)
        .get();

      return likesSnapshot.docs.map(doc => doc.data().userId);
    } catch (error) {
      console.error('Get event likers failed:', error);
      return [];
    }
  }

  /**
   * Etkinliğe katılan öğrencileri getir
   */
  static async getEventAttendees(eventId: string): Promise<string[]> {
    try {
      const attendeesSnapshot = await this.db
        .collection('eventAttendees')
        .where('eventId', '==', eventId)
        .get();

      return attendeesSnapshot.docs.map(doc => doc.data().userId);
    } catch (error) {
      console.error('Get event attendees failed:', error);
      return [];
    }
  }

  /**
   * Kulüp üyelerini getir
   */
  static async getClubMembers(clubId: string): Promise<string[]> {
    try {
      const membersSnapshot = await this.db
        .collection('clubMembers')
        .where('clubId', '==', clubId)
        .where('status', '==', 'approved')
        .get();

      return membersSnapshot.docs.map(doc => doc.data().userId);
    } catch (error) {
      console.error('Get club members failed:', error);
      return [];
    }
  }

  /**
   * Kulüp takipçilerini getir
   */
  static async getClubFollowers(clubId: string): Promise<string[]> {
    try {
      const followersSnapshot = await this.db
        .collection('clubFollowers')
        .where('clubId', '==', clubId)
        .get();

      return followersSnapshot.docs.map(doc => doc.data().userId);
    } catch (error) {
      console.error('Get club followers failed:', error);
      return [];
    }
  }
}
