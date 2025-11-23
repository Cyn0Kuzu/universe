import { getFirebaseCompatSync } from '../firebase/compat';
import { 
  ActionType, 
  EntityType, 
  ScoringMetadata, 
  ScoringResponse
} from '../types/index';
import hybridPushService from './hybridPushNotificationService';
// Import services from index to avoid circular dependencies
// import { SafeNotificationCreator } from './SafeNotificationCreator';
// import { UserStatsManagementService } from './userStatsManagement';

const firebase = getFirebaseCompatSync();

interface SecurityResult {
  passed: boolean;
  reason?: string;
}

interface ActionConfig {
  user?: number;
  target?: number;
  club?: number;
  reversible?: boolean;
  cooldown?: number;
}

/**
 * 🚀 CLEAN ModernScoringEngine - Unified Notification Only
 * 
 * Bu versiyon sadece unified notification sistemi kullanır.
 * Hiç duplicate/legacy notification kodu yoktur.
 */
export class CleanModernScoringEngine {
  private db = getFirebaseCompatSync().firestore();
  // private userStatsService = UserStatsManagementService.getInstance();
  private cooldowns = new Map<string, number>();

  // 🎯 Action Configurations - CLEAN & SIMPLE
  private readonly actionConfigs: Record<ActionType, ActionConfig> = {
    // 📅 Event Interactions
    LIKE_EVENT: { user: 10, club: 15, reversible: true, cooldown: 30 },
    UNLIKE_EVENT: { user: -10, club: -15, reversible: false, cooldown: 0 },
    JOIN_EVENT: { user: 30, club: 20, reversible: true, cooldown: 60 },
    LEAVE_EVENT: { user: -30, club: -20, reversible: false, cooldown: 0 },
    COMMENT_EVENT: { user: 20, club: 10, reversible: true, cooldown: 180 },
    SHARE_EVENT: { user: 25, club: 12, reversible: true, cooldown: 300 },

    // 💬 Comment Interactions  
    LIKE_COMMENT: { user: 5, target: 8, reversible: true, cooldown: 15 },
    UNLIKE_COMMENT: { user: -5, target: -8, reversible: false, cooldown: 0 },
    DELETE_COMMENT: { user: -20, club: -10, reversible: false, cooldown: 0 },

    // 🏛️ Club Interactions
    FOLLOW_CLUB: { user: 15, club: 8, reversible: true, cooldown: 60 },
    UNFOLLOW_CLUB: { user: -15, club: -8, reversible: false, cooldown: 0 },
    JOIN_CLUB: { user: 50, club: 25, reversible: true, cooldown: 300 },
    LEAVE_CLUB: { user: -50, club: -25, reversible: false, cooldown: 0 },

    // 👥 Member Management
    APPROVE_CLUB_MEMBER: { user: 25, target: 30, club: 15, reversible: true, cooldown: 0 },
    REJECT_CLUB_MEMBER: { user: 0, club: 0, reversible: false, cooldown: 0 },
    KICK_CLUB_MEMBER: { user: -25, target: -100, club: -15, reversible: false, cooldown: 0 },

    // 👤 User Following
    FOLLOW_USER: { user: 10, target: 15, reversible: true, cooldown: 45 },
    UNFOLLOW_USER: { user: -10, target: -15, reversible: false, cooldown: 0 },

    // 🎓 Academic Actions
    CREATE_EVENT: { user: 40, club: 25, reversible: false, cooldown: 1800 },
    UPDATE_EVENT: { user: 5, club: 3, reversible: false, cooldown: 300 },
    DELETE_EVENT: { user: -40, club: -25, reversible: false, cooldown: 0 },
    COMPLETE_PROFILE: { user: 100, reversible: false, cooldown: 0 },
    DAILY_LOGIN: { user: 5, reversible: false, cooldown: 86400 }
  };

  /**
   * 🎯 MAIN ENTRY POINT - CLEAN & SIMPLE
   */
  async processAction(
    userId: string,
    action: ActionType,
    targetId?: string,
    targetType?: 'user' | 'event' | 'club',
    metadata?: ScoringMetadata
  ): Promise<ScoringResponse> {
    const callId = Math.random().toString(36).substring(2, 8);
    console.log(`🎯 [${callId}] CLEAN ModernScoringEngine.processAction START:`, { userId, action, targetId, targetType });

    try {
      // 1️⃣ Güvenlik kontrolü
      const securityCheck = await this.performSecurityCheck(userId, action);
      if (!securityCheck.passed) {
        return { success: false, error: securityCheck.reason, userPointsAwarded: 0, activityId: '' };
      }

      // 2️⃣ Action config al
      const actionConfig = this.actionConfigs[action];
      if (!actionConfig) {
        return { success: false, error: `Bilinmeyen action: ${action}`, userPointsAwarded: 0, activityId: '' };
      }

      // 3️⃣ Puan hesapla
      const userPoints = Math.round(actionConfig.user || 0);
      const targetPoints = Math.round(actionConfig.target || 0);
      const clubPoints = Math.round(actionConfig.club || 0);

      console.log(`💰 [${callId}] Points: User=${userPoints}, Target=${targetPoints}, Club=${clubPoints}`);

      // 4️⃣ Cooldown kontrolü
      if (actionConfig.cooldown && actionConfig.cooldown > 0) {
        const cooldownKey = `${userId}-${action}-${targetId}`;
        const lastAction = this.cooldowns.get(cooldownKey) || 0;
        const now = Date.now();
        
        if (now - lastAction < (actionConfig.cooldown || 0) * 1000) {
          return { success: false, error: 'Çok sık işlem yapıyorsunuz', userPointsAwarded: 0, activityId: '' };
        }
        
        this.cooldowns.set(cooldownKey, now);
      }

      // 5️⃣ Safe metadata
      const safeMetadata: ScoringMetadata = {
        eventId: metadata?.eventId || targetId || undefined,
        eventTitle: metadata?.eventTitle || undefined,
        clubId: metadata?.clubId || (targetType === 'club' ? targetId : undefined),
        clubName: metadata?.clubName || undefined,
        action: action
      };

      // 6️⃣ Puanları uygula
      await this.applyScores(userId, targetId, targetType, userPoints, targetPoints, clubPoints, safeMetadata);

      // 7️⃣ 🆕 UNIFIED NOTIFICATIONS ONLY 
      await this.sendUnifiedNotifications(userId, targetId, targetType, action, userPoints, targetPoints, clubPoints, safeMetadata);

      // 8️⃣ Aktivite kaydı
      const activityId = `activity_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      console.log(`✅ [${callId}] CLEAN ModernScoringEngine SUCCESS`);
      return {
        success: true,
        userPointsAwarded: userPoints,
        targetPointsAwarded: targetPoints,
        clubPointsAwarded: clubPoints,
        activityId,
        message: `${action} başarıyla işlendi`
      };

    } catch (error) {
      console.error(`❌ [${callId}] CLEAN ModernScoringEngine ERROR:`, error);
      return {
        success: false,
        userPointsAwarded: 0,
        activityId: '',
        error: error instanceof Error ? error.message : 'Bilinmeyen hata'
      };
    }
  }

  /**
   * 🆕 UNIFIED NOTIFICATION SYSTEM - TEK NOKTADA TÜM BİLDİRİMLER
   */
  private async sendUnifiedNotifications(
    userId: string,
    targetId: string | undefined,
    targetType: string | undefined,
    action: ActionType,
    userPoints: number,
    targetPoints: number,
    clubPoints: number,
    metadata: ScoringMetadata
  ): Promise<void> {
    try {
      // User'a bildirim (eğer puan varsa)
      if (userPoints !== 0) {
        await this.sendUnifiedUserNotification(userId, action, userPoints, metadata);
      }

      // Target user'a bildirim (eğer target puan varsa)
      if (targetPoints !== 0 && targetType === 'user' && targetId) {
        await this.sendUnifiedTargetNotification(targetId, userId, action, targetPoints, metadata);
      }

      // Club owner'a bildirim (eğer club puan varsa)
      if (clubPoints !== 0 && metadata.clubId) {
        await this.sendUnifiedClubNotification(metadata.clubId, userId, action, clubPoints, metadata);
      }

    } catch (error) {
      console.warn('Unified notification failed:', error);
    }
  }

  /**
   * 📱 User'a unified bildirim gönder
   */
  private async sendUnifiedUserNotification(
    userId: string,
    action: ActionType,
    points: number,
    metadata: ScoringMetadata
  ): Promise<void> {
    // Event/Club bilgilerini al
    let eventTitle = metadata.eventTitle || 'Etkinlik';
    let clubName = metadata.clubName || 'Kulüp';

    if (metadata.eventId) {
      try {
        const eventDoc = await this.db.collection('events').doc(metadata.eventId).get();
        if (eventDoc.exists) {
          eventTitle = eventDoc.data()?.title || eventTitle;
        }
      } catch (e) { /* ignore */ }
    }

    if (metadata.clubId && metadata.clubId !== 'unknown') {
      try {
        const clubDoc = await this.db.collection('users').doc(metadata.clubId).get();
        if (clubDoc.exists) {
          clubName = clubDoc.data()?.displayName || clubName;
        }
      } catch (e) { /* ignore */ }
    }

    // Notification content oluştur
    const { type, title, message } = this.buildUserNotification(action, points, eventTitle, clubName);

    // Simple notification logging - actual notification service would be called here
    console.log(`📱 User notification: ${title} - ${message} (${points} points)`);
    
    // Store notification data for future implementation
    try {
      const notification = {
        type: type,
        title: title,
        message: message,
        userId: userId,
        metadata: {
          points: Math.abs(points),
          action: action,
          ...(metadata.eventId && { eventId: metadata.eventId }),
          ...(metadata.clubId && { clubId: metadata.clubId })
        },
        read: false,
        createdAt: getFirebaseCompatSync().firestore.FieldValue.serverTimestamp()
      };

      await this.db.collection('notifications').add(notification);
      
      // Send push notification
      await this.sendPushNotification(userId, notification);
    } catch (error) {
      console.error('Error creating notification:', error);
    }

    console.log(`📱 Unified user notification sent: ${type} (${points} points)`);
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(userId: string, notification: any): Promise<void> {
    try {
      // Use hybrid push notification service
      await hybridPushService.sendToUser(
        userId,
        {
          type: this.getNotificationType(notification.type),
          title: notification.title,
          body: notification.message,
          data: {
            notificationId: userId,
            type: notification.type,
            ...notification.metadata
          }
        }
      );
    } catch (error) {
      console.error('Push notification failed:', error);
    }
  }

  /**
   * Get notification type for push notifications
   */
  private getNotificationType(type: string): 'event' | 'club' | 'announcement' | 'reminder' {
    switch (type) {
      case 'user_follow':
      case 'user_unfollow':
      case 'club_follow':
      case 'club_unfollow':
        return 'club';
      case 'event_like':
      case 'event_comment':
      case 'event_attendance':
        return 'event';
      case 'achievement':
      case 'score':
        return 'announcement';
      default:
        return 'announcement';
    }
  }

  /**
   * 🎯 Target user'a unified bildirim gönder
   */
  private async sendUnifiedTargetNotification(
    targetUserId: string,
    actorUserId: string,
    action: ActionType,
    points: number,
    metadata: ScoringMetadata
  ): Promise<void> {
    // Actor bilgilerini al
    let actorName = 'Kullanıcı';
    try {
      const actorDoc = await this.db.collection('users').doc(actorUserId).get();
      if (actorDoc.exists) {
        actorName = actorDoc.data()?.displayName || actorName;
      }
    } catch (e) { /* ignore */ }

    // Club bilgilerini al
    let clubName = metadata.clubName || 'Kulüp';
    if (metadata.clubId && metadata.clubId !== 'unknown') {
      try {
        const clubDoc = await this.db.collection('users').doc(metadata.clubId).get();
        if (clubDoc.exists) {
          clubName = clubDoc.data()?.displayName || clubName;
        }
      } catch (e) { /* ignore */ }
    }

    // Notification content oluştur
    const { type, title, message } = this.buildTargetNotification(action, points, actorName, clubName);

    // Simple notification logging
    console.log(`🎯 Target notification: ${title} - ${message} (${points} points)`);
    
    // Store notification data and send push notification
    try {
      const notification = {
        type: type,
        title: title,
        message: message,
        userId: targetUserId,
        metadata: {
          points: Math.abs(points),
          action: action,
          actorName: actorName,
          ...(metadata.clubId && { clubId: metadata.clubId })
        },
        read: false,
        createdAt: getFirebaseCompatSync().firestore.FieldValue.serverTimestamp()
      };

      await this.db.collection('notifications').add(notification);
      
      // Send push notification
      await this.sendPushNotification(targetUserId, notification);
    } catch (error) {
      console.error('Error creating target notification:', error);
    }

    console.log(`🎯 Unified target notification sent: ${type} (${points} points)`);
  }

  /**
   * 🏛️ Club owner'a unified bildirim gönder
   */
  private async sendUnifiedClubNotification(
    clubId: string,
    actorUserId: string,
    action: ActionType,
    points: number,
    metadata: ScoringMetadata
  ): Promise<void> {
    // Club owner'ı bul
    let clubOwnerId = clubId;
    try {
      const clubDoc = await this.db.collection('users').doc(clubId).get();
      if (clubDoc.exists) {
        const clubData = clubDoc.data();
        clubOwnerId = clubData?.ownerId || clubData?.createdBy || clubId;
      }
    } catch (e) { /* ignore */ }

    // Actor bilgilerini al
    let actorName = 'Kullanıcı';
    try {
      const actorDoc = await this.db.collection('users').doc(actorUserId).get();
      if (actorDoc.exists) {
        actorName = actorDoc.data()?.displayName || actorName;
      }
    } catch (e) { /* ignore */ }

    // Event bilgilerini al
    let eventTitle = metadata.eventTitle || 'Etkinlik';
    if (metadata.eventId) {
      try {
        const eventDoc = await this.db.collection('events').doc(metadata.eventId).get();
        if (eventDoc.exists) {
          eventTitle = eventDoc.data()?.title || eventTitle;
        }
      } catch (e) { /* ignore */ }
    }

    // Notification content oluştur
    const { type, title, message } = this.buildClubNotification(action, points, actorName, eventTitle);

    // Simple notification logging
    console.log(`🏛️ Club notification: ${title} - ${message} (${points} points)`);
    
    // Store notification data and send push notification
    try {
      const notification = {
        type: type,
        title: title,
        message: message,
        userId: clubOwnerId,
        metadata: {
          points: Math.abs(points),
          action: action,
          actorName: actorName,
          ...(metadata.eventId && { eventId: metadata.eventId })
        },
        read: false,
        createdAt: getFirebaseCompatSync().firestore.FieldValue.serverTimestamp()
      };

      await this.db.collection('notifications').add(notification);
      
      // Send push notification
      await this.sendPushNotification(clubOwnerId, notification);
    } catch (error) {
      console.error('Error creating club notification:', error);
    }

    console.log(`🏛️ Unified club notification sent: ${type} (${points} points)`);
  }

  /**
   * 📝 User notification content builder
   */
  private buildUserNotification(action: ActionType, points: number, eventTitle: string, clubName: string) {
    const pointsText = Math.abs(points);
    const isPositive = points > 0;
    const emoji = isPositive ? '🎉' : '⚠️';

    switch (action) {
      case 'LIKE_EVENT':
        return {
          type: 'event_like_points',
          title: '❤️ Etkinlik Beğendin!',
          message: `${eventTitle} etkinliğini beğendin ve ${pointsText} puan kazandın! ${emoji}`
        };

      case 'UNLIKE_EVENT':
        return {
          type: 'event_unlike_points',
          title: '💔 Beğeni Geri Alındı',
          message: `${eventTitle} etkinliğinden beğenini geri aldın ve ${pointsText} puan kaybettin ${emoji}`
        };

      case 'JOIN_EVENT':
        return {
          type: 'event_joined_points',
          title: '📅 Etkinliğe Katıldın!',
          message: `${eventTitle} etkinliğine katıldın ve ${pointsText} puan kazandın! ${emoji}`
        };

      case 'LEAVE_EVENT':
        return {
          type: 'event_left_points',
          title: '🚪 Etkinlikten Ayrıldın',
          message: `${eventTitle} etkinliğinden ayrıldın ve ${pointsText} puan kaybettin ${emoji}`
        };

      case 'COMMENT_EVENT':
        return {
          type: 'event_commented_points',
          title: '💬 Yorum Yaptın!',
          message: `${eventTitle} etkinliğine yorum yaptın ve ${pointsText} puan kazandın! ${emoji}`
        };

      case 'JOIN_CLUB':
        return {
          type: 'club_join_points',
          title: '🏠 Kulübe Katıldın!',
          message: `${clubName} kulübüne katıldın ve ${pointsText} puan kazandın! ${emoji}`
        };

      case 'LEAVE_CLUB':
        return {
          type: 'club_left_points',
          title: '🚪 Kulüpten Ayrıldın',
          message: `${clubName} kulübünden ayrıldın ve ${pointsText} puan kaybettin ${emoji}`
        };

      case 'KICK_CLUB_MEMBER':
        return {
          type: 'club_kicked_points',
          title: '❌ Kulüpten Çıkarıldın',
          message: `${clubName} kulübünden çıkarıldın ve ${pointsText} puan kaybettin ${emoji}`
        };

      case 'APPROVE_CLUB_MEMBER':
        return {
          type: 'club_membership_approved',
          title: '✅ Üyelik Onaylandı!',
          message: `${clubName} kulübüne katılma isteğiniz onaylandı ve ${pointsText} puan kazandınız! ${emoji}`
        };

      case 'FOLLOW_CLUB':
        return {
          type: 'club_followed_points',
          title: '💖 Kulübü Takip Ettin!',
          message: `${clubName} kulübünü takip ettin ve ${pointsText} puan kazandın! ${emoji}`
        };

      case 'UNFOLLOW_CLUB':
        return {
          type: 'club_unfollowed_points',
          title: '💔 Takipten Çıktın',
          message: `${clubName} kulübünden takipten çıktın ve ${pointsText} puan kaybettin ${emoji}`
        };

      case 'FOLLOW_USER':
        return {
          type: 'user_followed_points',
          title: '👥 Kullanıcı Takip Ettin!',
          message: `Yeni bir kullanıcı takip ettin ve ${pointsText} puan kazandın! ${emoji}`
        };

      case 'UNFOLLOW_USER':
        return {
          type: 'user_unfollowed_points',
          title: '👋 Takipten Çıktın',
          message: `Bir kullanıcıyı takipten çıkardın ve ${pointsText} puan kaybettin ${emoji}`
        };

      case 'LIKE_COMMENT':
        return {
          type: 'comment_liked_points',
          title: '👍 Yorum Beğendin!',
          message: `Bir yorumu beğendin ve ${pointsText} puan kazandın! ${emoji}`
        };

      case 'UNLIKE_COMMENT':
        return {
          type: 'comment_unliked_points',
          title: '👎 Yorum Beğenisini Geri Aldın',
          message: `Yorum beğenini geri aldın ve ${pointsText} puan kaybettin ${emoji}`
        };

      case 'DELETE_COMMENT':
        return {
          type: 'comment_deleted_points',
          title: '🗑️ Yorum Sildin',
          message: `Yorumunu sildin ve ${pointsText} puan kaybettin ${emoji}`
        };

      default:
        return {
          type: isPositive ? 'score_gain_points' : 'score_loss_points',
          title: isPositive ? '🎯 Puan Kazandın!' : '⚠️ Puan Kaybettin',
          message: isPositive 
            ? `${this.getActionDescription(action)} - ${pointsText} puan kazandın! ${emoji}`
            : `${this.getActionDescription(action)} - ${pointsText} puan kaybettin ${emoji}`
        };
    }
  }

  /**
   * 🎯 Target notification content builder
   */
  private buildTargetNotification(action: ActionType, points: number, actorName: string, clubName: string) {
    const pointsText = Math.abs(points);
    const isPositive = points > 0;
    const emoji = isPositive ? '🎉' : '⚠️';

    switch (action) {
      case 'FOLLOW_USER':
        return {
          type: 'user_followed_points',
          title: '👥 Yeni Takipçiniz Var!',
          message: `${actorName} sizi takip etti ve ${pointsText} puan kazandınız! ${emoji}`
        };

      case 'UNFOLLOW_USER':
        return {
          type: 'user_unfollowed_points',
          title: '👋 Takipçi Kaybı',
          message: `${actorName} sizi takipten çıkardı ve ${pointsText} puan kaybettiniz ${emoji}`
        };

      case 'LIKE_COMMENT':
        return {
          type: 'comment_target_liked_points',
          title: '👍 Yorumunuz Beğenildi!',
          message: `${actorName} yorumunuzu beğendi ve ${pointsText} puan kazandınız! ${emoji}`
        };

      case 'UNLIKE_COMMENT':
        return {
          type: 'comment_target_unliked_points',
          title: '👎 Yorum Beğenisi Geri Alındı',
          message: `${actorName} yorumunuzun beğenisini geri aldı ve ${pointsText} puan kaybettiniz ${emoji}`
        };

      case 'APPROVE_CLUB_MEMBER':
        return {
          type: 'club_membership_approved',
          title: '✅ Üyeliğiniz Onaylandı!',
          message: `${clubName} kulübüne katılma isteğiniz onaylandı ve ${pointsText} puan kazandınız! ${emoji}`
        };

      case 'KICK_CLUB_MEMBER':
        return {
          type: 'club_kicked_points',
          title: '❌ Kulüpten Çıkarıldınız',
          message: `${clubName} kulübünden çıkarıldınız ve ${pointsText} puan kaybettiniz ${emoji}`
        };

      default:
        return {
          type: isPositive ? 'target_score_gain' : 'target_score_loss',
          title: isPositive ? '🎯 Puan Kazandınız!' : '⚠️ Puan Kaybettiniz',
          message: isPositive 
            ? `${actorName} sayesinde ${pointsText} puan kazandınız! ${emoji}`
            : `${actorName} sebebiyle ${pointsText} puan kaybettiniz ${emoji}`
        };
    }
  }

  /**
   * 🏛️ Club notification content builder
   */
  private buildClubNotification(action: ActionType, points: number, actorName: string, eventTitle: string) {
    const pointsText = Math.abs(points);
    const isPositive = points > 0;
    const emoji = isPositive ? '🎉' : '⚠️';

    switch (action) {
      case 'LIKE_EVENT':
        return {
          type: 'event_like_points',
          title: '❤️ Etkinliğiniz Beğenildi!',
          message: `${actorName} "${eventTitle}" etkinliğinizi beğendi ve ${pointsText} puan kazandınız! ${emoji}`
        };

      case 'UNLIKE_EVENT':
        return {
          type: 'event_unlike_points',
          title: '💔 Etkinlik Beğenisi Geri Alındı',
          message: `${actorName} "${eventTitle}" etkinliğinizin beğenisini geri aldı ve ${pointsText} puan kaybettiniz ${emoji}`
        };

      case 'JOIN_EVENT':
        return {
          type: 'event_joined_points',
          title: '📅 Etkinliğinize Katılım!',
          message: `${actorName} "${eventTitle}" etkinliğinize katıldı ve ${pointsText} puan kazandınız! ${emoji}`
        };

      case 'LEAVE_EVENT':
        return {
          type: 'event_left_points',
          title: '🚪 Etkinlikten Ayrılma',
          message: `${actorName} "${eventTitle}" etkinliğinizden ayrıldı ve ${pointsText} puan kaybettiniz ${emoji}`
        };

      case 'COMMENT_EVENT':
        return {
          type: 'event_commented_points',
          title: '💬 Etkinliğinize Yorum!',
          message: `${actorName} "${eventTitle}" etkinliğinize yorum yaptı ve ${pointsText} puan kazandınız! ${emoji}`
        };

      case 'FOLLOW_CLUB':
        return {
          type: 'club_followed_points',
          title: '💖 Kulübünüz Takip Edildi!',
          message: `${actorName} kulübünüzü takip etti ve ${pointsText} puan kazandınız! ${emoji}`
        };

      case 'UNFOLLOW_CLUB':
        return {
          type: 'club_unfollowed_points',
          title: '💔 Takipten Çıkıldı',
          message: `${actorName} kulübünüzden takipten çıktı ve ${pointsText} puan kaybettiniz ${emoji}`
        };

      case 'JOIN_CLUB':
        return {
          type: 'club_member_joined_points',
          title: '🏠 Yeni Üye Katıldı!',
          message: `${actorName} kulübünüze katıldı ve ${pointsText} puan kazandınız! ${emoji}`
        };

      case 'LEAVE_CLUB':
        return {
          type: 'club_member_left_points',
          title: '🚪 Üye Ayrıldı',
          message: `${actorName} kulübünüzden ayrıldı ve ${pointsText} puan kaybettiniz ${emoji}`
        };

      case 'APPROVE_CLUB_MEMBER':
        return {
          type: 'club_member_approved_points',
          title: '✅ Üye Onayladınız!',
          message: `${actorName} kulübe onaylandı ve ${pointsText} puan kazandınız! ${emoji}`
        };

      default:
        return {
          type: isPositive ? 'club_score_gain_points' : 'club_score_loss_points',
          title: isPositive ? '🎯 Kulüp Puan Kazandı!' : '⚠️ Kulüp Puan Kaybetti',
          message: isPositive 
            ? `${actorName} sayesinde ${pointsText} puan kazandınız! ${emoji}`
            : `${actorName} sebebiyle ${pointsText} puan kaybettiniz ${emoji}`
        };
    }
  }

  /**
   * 💰 Puanları uygula
   */
  private async applyScores(
    userId: string,
    targetId: string | undefined,
    targetType: string | undefined,
    userPoints: number,
    targetPoints: number,
    clubPoints: number,
    metadata: ScoringMetadata
  ): Promise<void> {
    const batch = this.db.batch();

    // User puanı
    if (userPoints !== 0) {
      const userRef = this.db.collection('users').doc(userId);
      batch.update(userRef, {
        totalPoints: getFirebaseCompatSync().firestore.FieldValue.increment(userPoints),
        lastUpdated: firebase.firestore.Timestamp.now()
      });
    }

    // Target user puanı
    if (targetPoints !== 0 && targetType === 'user' && targetId) {
      const targetUserRef = this.db.collection('users').doc(targetId);
      batch.update(targetUserRef, {
        totalPoints: getFirebaseCompatSync().firestore.FieldValue.increment(targetPoints),
        lastUpdated: firebase.firestore.Timestamp.now()
      });
    }

    // Club puanı
    if (clubPoints !== 0 && metadata.clubId) {
      const clubRef = this.db.collection('users').doc(metadata.clubId);
      batch.update(clubRef, {
        totalPoints: getFirebaseCompatSync().firestore.FieldValue.increment(clubPoints),
        lastUpdated: firebase.firestore.Timestamp.now()
      });
    }

    // Event puanı
    if (targetPoints !== 0 && targetType === 'event' && targetId) {
      const eventRef = this.db.collection('events').doc(targetId);
      batch.update(eventRef, {
        score: getFirebaseCompatSync().firestore.FieldValue.increment(targetPoints),
        lastUpdated: firebase.firestore.Timestamp.now()
      });
    }

    await batch.commit();
    console.log('💰 Scores applied successfully');
  }

  /**
   * 🛡️ Güvenlik kontrolü
   */
  private async performSecurityCheck(userId: string, action: ActionType): Promise<SecurityResult> {
    try {
      // User varlık kontrolü
      const userDoc = await this.db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        return { passed: false, reason: 'Kullanıcı bulunamadı' };
      }

      const userData = userDoc.data();
      
      // Banned kontrolü
      if (userData?.isBanned || userData?.status === 'banned') {
        return { passed: false, reason: 'Yasaklı kullanıcı' };
      }

      // Puan negatife düşme kontrolü
      const currentPoints = userData?.totalPoints || 0;
      const actionConfig = this.actionConfigs[action];
      const userPointChange = actionConfig?.user || 0;
      
      if (currentPoints + userPointChange < 0) {
        return { passed: false, reason: 'Puan negatife düşemez' };
      }

      return { passed: true };

    } catch (error) {
      return { passed: false, reason: 'Güvenlik kontrolü başarısız' };
    }
  }

  /**
   * 📋 Action açıklaması
   */
  private getActionDescription(action: ActionType): string {
    const descriptions: Record<ActionType, string> = {
      LIKE_EVENT: 'Etkinlik beğeni',
      UNLIKE_EVENT: 'Etkinlik beğeni geri alma',
      JOIN_EVENT: 'Etkinliğe katılma',
      LEAVE_EVENT: 'Etkinlikten ayrılma',
      COMMENT_EVENT: 'Etkinlik yorumu',
      SHARE_EVENT: 'Etkinlik paylaşım',
      LIKE_COMMENT: 'Yorum beğeni',
      UNLIKE_COMMENT: 'Yorum beğeni geri alma',
      DELETE_COMMENT: 'Yorum silme',
      FOLLOW_CLUB: 'Kulüp takip',
      UNFOLLOW_CLUB: 'Kulüp takip bırakma',
      JOIN_CLUB: 'Kulübe katılma',
      LEAVE_CLUB: 'Kulüpten ayrılma',
      APPROVE_CLUB_MEMBER: 'Üye onaylama',
      REJECT_CLUB_MEMBER: 'Üye reddetme',
      KICK_CLUB_MEMBER: 'Üye çıkarma',
      FOLLOW_USER: 'Kullanıcı takip',
      UNFOLLOW_USER: 'Kullanıcı takip bırakma',
      CREATE_EVENT: 'Etkinlik oluşturma',
      UPDATE_EVENT: 'Etkinlik güncelleme',
      DELETE_EVENT: 'Etkinlik silme',
      COMPLETE_PROFILE: 'Profil tamamlama',
      DAILY_LOGIN: 'Günlük giriş'
    };
    
    return descriptions[action] || action;
  }
}

// Export singleton instance
export const cleanModernScoringEngine = new CleanModernScoringEngine();
