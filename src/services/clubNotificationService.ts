// Professional Club Notification Service
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

export interface ClubNotification {
  id?: string;
  type: 
    | 'event_like'           // Etkinlik beğenisi  
    | 'event_comment'        // Etkinlik yorumu
    | 'event_join'           // Etkinlik katılımı
    | 'member_request'       // Katılma isteği
    | 'club_followed'        // Kulüp takibi
    | 'club_liked'           // Kulüp beğenisi
    | 'club_shared'          // Kulüp paylaşımı
    | 'follow'               // Kullanıcı takibi (genel)
    | 'user_follow'          // Kullanıcı takibi (spesifik)
    | 'user_unfollow'        // Kullanıcı takipten çıkma
    | 'member_approved'      // Katılma onayı
    | 'member_rejected'      // Katılma reddi
    | 'event_created'        // Yeni etkinlik (üyeler için)
    | 'event_updated'        // Etkinlik güncelleme
    | 'event_cancelled'      // Etkinlik iptali
    | 'new_event'            // Yeni etkinlik
    | 'event_update'         // Etkinlik güncelleme
    | 'event_cancel'         // Etkinlik iptal
    | 'new_member'           // Yeni üye
    | 'member_left'          // Üye ayrıldı
    | 'new_comment'          // Yeni yorum
    | 'level_up'             // Seviye atlama
    | 'system_message'       // Sistem mesajı
    | 'announcement'         // Duyuru
    | 'leaderboard_rank';    // Liderlik sıralaması
  
  recipientType: 'club' | 'student';
  category: 'membership' | 'events' | 'social' | 'system';
  recipientId: string;
  clubId: string;
  eventId?: string;
  userId: string;
  userName: string;
  userProfileImage?: string;
  title: string;
  message: string;
  data?: {
    eventTitle?: string;
    commentContent?: string;
    memberName?: string;
    clubName?: string;
    rankPosition?: number;
  };
  read: boolean;
  createdAt: firebase.firestore.Timestamp;
}

export class ClubNotificationService {
  private db = firebase.firestore();

  async sendClubNotification(notification: Omit<ClubNotification, 'id' | 'createdAt' | 'read'>): Promise<void> {
    try {
      const notificationData: Omit<ClubNotification, 'id'> = {
        ...notification,
        read: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp() as firebase.firestore.Timestamp,
      };

      const docRef = await this.db.collection('clubNotifications').add(notificationData);
      
      console.log(`✅ Club notification sent: ${docRef.id}`);
    } catch (error) {
      console.error('❌ Error sending club notification:', error);
      throw error;
    }
  }

  /**
   * 📝 Yeni yorum bildirimi gönder
   */
  async sendNewCommentNotification(
    clubId: string,
    userId: string,
    eventId: string,
    userName: string,
    eventTitle: string,
    commentContent: string
  ): Promise<void> {
    try {
      await this.sendClubNotification({
        type: 'new_comment',
        recipientType: 'club',
        category: 'events',
        recipientId: clubId,
        clubId,
        eventId,
        userId,
        userName,
        title: 'Yeni Etkinlik Yorumu',
        message: `${userName} "${eventTitle}" etkinliğinize yorum yaptı`,
        data: {
          eventTitle,
          commentContent: commentContent.substring(0, 100)
        }
      });
      
      console.log(`✅ New comment notification sent to club: ${clubId}`);
    } catch (error) {
      console.error('❌ Error sending new comment notification:', error);
    }
  }

  /**
   * 🗑️ Yorum silme bildirimi gönder
   */
  async sendCommentDeletedNotification(
    clubId: string,
    userId: string,
    eventId: string,
    userName: string,
    eventTitle: string,
    commentContent: string
  ): Promise<void> {
    try {
      await this.sendClubNotification({
        type: 'event_comment',
        recipientType: 'club',
        category: 'events',
        recipientId: clubId,
        clubId,
        eventId,
        userId,
        userName,
        title: 'Etkinlik Yorumu Silindi',
        message: `${userName} "${eventTitle}" etkinliğindeki yorumunu sildi`,
        data: {
          eventTitle,
          commentContent: commentContent.substring(0, 100)
        }
      });
      
      console.log(`✅ Comment deleted notification sent to club: ${clubId}`);
    } catch (error) {
      console.error('❌ Error sending comment deleted notification:', error);
    }
  }

  async getUnreadNotificationCount(recipientId: string, recipientType: 'club' | 'student'): Promise<number> {
    try {
      const snapshot = await this.db
        .collection('clubNotifications')
        .where('recipientId', '==', recipientId)
        .where('recipientType', '==', recipientType)
        .where('read', '==', false)
        .get();

      return snapshot.size;
    } catch (error) {
      console.error('❌ Error getting unread notification count:', error);
      return 0;
    }
  }
}

export default ClubNotificationService;
