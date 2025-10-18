import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth } from '../firebase/config';

class FirebaseFunctionsService {
  private functions = getFunctions();

  // Tek kullanıcıya bildirim gönder
  async sendNotificationToUser(userId: string, title: string, body: string, data?: any) {
    try {
      const sendNotificationToUser = httpsCallable(this.functions, 'sendNotificationToUser');
      
      const result = await sendNotificationToUser({
        userId,
        title,
        body,
        data: data || {}
      });

      console.log('Bildirim gönderildi:', result.data);
      return { success: true, data: result.data };
    } catch (error) {
      console.error('Bildirim gönderme hatası:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  // Tüm kullanıcılara bildirim gönder
  async sendNotificationToAllUsers(title: string, body: string, data?: any) {
    try {
      const sendNotificationToAllUsers = httpsCallable(this.functions, 'sendNotificationToAllUsers');
      
      const result = await sendNotificationToAllUsers({
        title,
        body,
        data: data || {}
      });

      console.log('Toplu bildirim gönderildi:', result.data);
      return { success: true, data: result.data };
    } catch (error) {
      console.error('Toplu bildirim gönderme hatası:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  // Topic'e bildirim gönder
  async sendNotificationToTopic(topic: string, title: string, body: string, data?: any) {
    try {
      const sendNotificationToTopic = httpsCallable(this.functions, 'sendNotificationToTopic');
      
      const result = await sendNotificationToTopic({
        topic,
        title,
        body,
        data: data || {}
      });

      console.log('Topic bildirimi gönderildi:', result.data);
      return { success: true, data: result.data };
    } catch (error) {
      console.error('Topic bildirim gönderme hatası:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  // Kullanıcıyı topic'e subscribe et
  async subscribeToTopic(topic: string) {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Kullanıcı giriş yapmamış');
      }

      const subscribeToTopic = httpsCallable(this.functions, 'subscribeToTopic');
      
      const result = await subscribeToTopic({
        userId: user.uid,
        topic
      });

      console.log('Topic subscription başarılı:', result.data);
      return { success: true, data: result.data };
    } catch (error) {
      console.error('Topic subscription hatası:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  // Test bildirimi gönder (kendi kendine)
  async sendTestNotification() {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Kullanıcı giriş yapmamış');
      }

      return await this.sendNotificationToUser(
        user.uid,
        'Test Bildirimi 🧪',
        'Bu bir test bildirimidir. Firebase Functions çalışıyor!',
        { type: 'test', timestamp: new Date().toISOString() }
      );
    } catch (error) {
      console.error('Test bildirimi hatası:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  // Etkinlik bildirimi gönder
  async sendEventNotification(eventTitle: string, eventDate: string, eventLocation?: string) {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Kullanıcı giriş yapmamış');
      }

      return await this.sendNotificationToUser(
        user.uid,
        `Yeni Etkinlik: ${eventTitle}`,
        `${eventDate} tarihinde ${eventLocation || 'kampüste'} gerçekleşecek`,
        { 
          type: 'event', 
          eventTitle, 
          eventDate, 
          eventLocation,
          timestamp: new Date().toISOString() 
        }
      );
    } catch (error) {
      console.error('Etkinlik bildirimi hatası:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  // Duyuru bildirimi gönder
  async sendAnnouncementNotification(title: string, message: string) {
    try {
      return await this.sendNotificationToAllUsers(
        `📢 ${title}`,
        message,
        { 
          type: 'announcement', 
          title, 
          message,
          timestamp: new Date().toISOString() 
        }
      );
    } catch (error) {
      console.error('Duyuru bildirimi hatası:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  // ============================================================================
  // GERÇEK KULLANICI ETKİLEŞİM BİLDİRİMLERİ
  // ============================================================================

  // Takip bildirimi gönder
  async sendFollowNotification(followerId: string, followedId: string, followerName: string) {
    try {
      const sendFollowNotification = httpsCallable(this.functions, 'sendFollowNotification');
      
      const result = await sendFollowNotification({
        followerId,
        followedId,
        followerName
      });

      console.log('Takip bildirimi gönderildi:', result.data);
      return { success: true, data: result.data };
    } catch (error) {
      console.error('Takip bildirimi hatası:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  // Beğeni bildirimi gönder
  async sendLikeNotification(likerId: string, targetUserId: string, eventId: string, eventTitle?: string) {
    try {
      const sendLikeNotification = httpsCallable(this.functions, 'sendLikeNotification');
      
      const result = await sendLikeNotification({
        likerId,
        targetUserId,
        eventId,
        eventTitle: eventTitle || ''
      });

      console.log('Beğeni bildirimi gönderildi:', result.data);
      return { success: true, data: result.data };
    } catch (error) {
      console.error('Beğeni bildirimi hatası:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  // Yorum bildirimi gönder
  async sendCommentNotification(commenterId: string, targetUserId: string, eventId: string, eventTitle: string, commentContent: string) {
    try {
      const sendCommentNotification = httpsCallable(this.functions, 'sendCommentNotification');
      
      const result = await sendCommentNotification({
        commenterId,
        targetUserId,
        eventId,
        eventTitle,
        commentContent
      });

      console.log('Yorum bildirimi gönderildi:', result.data);
      return { success: true, data: result.data };
    } catch (error) {
      console.error('Yorum bildirimi hatası:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  // Etkinlik katılım bildirimi gönder
  async sendEventJoinNotification(joinerId: string, eventCreatorId: string, eventId: string, eventTitle?: string) {
    try {
      const sendEventJoinNotification = httpsCallable(this.functions, 'sendEventJoinNotification');
      
      const result = await sendEventJoinNotification({
        joinerId,
        eventCreatorId,
        eventId,
        eventTitle: eventTitle || ''
      });

      console.log('Etkinlik katılım bildirimi gönderildi:', result.data);
      return { success: true, data: result.data };
    } catch (error) {
      console.error('Etkinlik katılım bildirimi hatası:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  // ============================================================================
  // TÜM BİLDİRİM TÜRLERİ - UYGULAMADAKİ TÜM BİLDİRİMLER
  // ============================================================================

  // Kulüp üyelik isteği bildirimi
  async sendMemberRequestNotification(requesterId: string, clubId: string, requesterName: string) {
    try {
      const sendMemberRequestNotification = httpsCallable(this.functions, 'sendMemberRequestNotification');
      
      const result = await sendMemberRequestNotification({
        requesterId,
        clubId,
        requesterName
      });

      console.log('Üyelik isteği bildirimi gönderildi:', result.data);
      return { success: true, data: result.data };
    } catch (error) {
      console.error('Üyelik isteği bildirimi hatası:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  // Üyelik onayı bildirimi
  async sendMemberApprovedNotification(memberId: string, clubId: string, clubName: string) {
    try {
      const sendMemberApprovedNotification = httpsCallable(this.functions, 'sendMemberApprovedNotification');
      
      const result = await sendMemberApprovedNotification({
        memberId,
        clubId,
        clubName
      });

      console.log('Üyelik onayı bildirimi gönderildi:', result.data);
      return { success: true, data: result.data };
    } catch (error) {
      console.error('Üyelik onayı bildirimi hatası:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  // Üyelik reddi bildirimi
  async sendMemberRejectedNotification(memberId: string, clubId: string, clubName: string) {
    try {
      const sendMemberRejectedNotification = httpsCallable(this.functions, 'sendMemberRejectedNotification');
      
      const result = await sendMemberRejectedNotification({
        memberId,
        clubId,
        clubName
      });

      console.log('Üyelik reddi bildirimi gönderildi:', result.data);
      return { success: true, data: result.data };
    } catch (error) {
      console.error('Üyelik reddi bildirimi hatası:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  // Kulüp takip bildirimi
  async sendClubFollowNotification(followerId: string, clubId: string, followerName: string) {
    try {
      const sendClubFollowNotification = httpsCallable(this.functions, 'sendClubFollowNotification');
      
      const result = await sendClubFollowNotification({
        followerId,
        clubId,
        followerName
      });

      console.log('Kulüp takip bildirimi gönderildi:', result.data);
      return { success: true, data: result.data };
    } catch (error) {
      console.error('Kulüp takip bildirimi hatası:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  // Etkinlik oluşturuldu bildirimi
  async sendEventCreatedNotification(eventId: string, eventTitle: string, clubId: string, clubName: string, memberIds: string[]) {
    try {
      const sendEventCreatedNotification = httpsCallable(this.functions, 'sendEventCreatedNotification');
      
      const result = await sendEventCreatedNotification({
        eventId,
        eventTitle,
        clubId,
        clubName,
        memberIds
      });

      console.log('Etkinlik oluşturuldu bildirimi gönderildi:', result.data);
      return { success: true, data: result.data };
    } catch (error) {
      console.error('Etkinlik oluşturuldu bildirimi hatası:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  // Etkinlik güncellendi bildirimi
  async sendEventUpdatedNotification(eventId: string, eventTitle: string, clubId: string, clubName: string, attendeeIds: string[]) {
    try {
      const sendEventUpdatedNotification = httpsCallable(this.functions, 'sendEventUpdatedNotification');
      
      const result = await sendEventUpdatedNotification({
        eventId,
        eventTitle,
        clubId,
        clubName,
        attendeeIds
      });

      console.log('Etkinlik güncellendi bildirimi gönderildi:', result.data);
      return { success: true, data: result.data };
    } catch (error) {
      console.error('Etkinlik güncellendi bildirimi hatası:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  // Etkinlik iptal edildi bildirimi
  async sendEventCancelledNotification(eventId: string, eventTitle: string, clubId: string, clubName: string, attendeeIds: string[]) {
    try {
      const sendEventCancelledNotification = httpsCallable(this.functions, 'sendEventCancelledNotification');
      
      const result = await sendEventCancelledNotification({
        eventId,
        eventTitle,
        clubId,
        clubName,
        attendeeIds
      });

      console.log('Etkinlik iptal bildirimi gönderildi:', result.data);
      return { success: true, data: result.data };
    } catch (error) {
      console.error('Etkinlik iptal bildirimi hatası:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  // Sistem bildirimi gönder
  async sendSystemNotification(title: string, body: string, userIds: string[], data?: any) {
    try {
      const sendSystemNotification = httpsCallable(this.functions, 'sendSystemNotification');
      
      const result = await sendSystemNotification({
        title,
        body,
        userIds,
        data
      });

      console.log('Sistem bildirimi gönderildi:', result.data);
      return { success: true, data: result.data };
    } catch (error) {
      console.error('Sistem bildirimi hatası:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  // Duyuru bildirimi gönder (güncellenmiş)
  async sendAnnouncementNotificationNew(title: string, body: string, userIds: string[], data?: any) {
    try {
      const sendAnnouncementNotification = httpsCallable(this.functions, 'sendAnnouncementNotification');
      
      const result = await sendAnnouncementNotification({
        title,
        body,
        userIds,
        data
      });

      console.log('Duyuru bildirimi gönderildi:', result.data);
      return { success: true, data: result.data };
    } catch (error) {
      console.error('Duyuru bildirimi hatası:', error);
      return { success: false, error: (error as Error).message };
    }
  }
}

export default new FirebaseFunctionsService();
