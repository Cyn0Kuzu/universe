/**
 * Notification Type Normalizer - Yanlış bildirim türlerini düzeltir
 */

export interface NotificationNormalizationResult {
  type: string;
  title: string;
  message: string;
  normalized: boolean;
}

export class NotificationTypeNormalizer {
  
  /**
   * Bildirim verilerini normalize eder
   */
  static normalize(data: any): NotificationNormalizationResult {
    let normalizedType = data.type;
    let normalizedTitle = data.title;
    let normalizedMessage = data.message;
    let normalized = false;

    // Type normalization
    if (normalizedType === 'cclub_announcement') {
      normalizedType = 'club_announcement';
      normalized = true;
      console.log(`🔧 Normalized notification type: cclub_announcement -> club_announcement`);
    }

    // Title normalization
    if (normalizedTitle === '⚠️ Puuan Kaybı') {
      normalizedTitle = '⚠️ Puan Kaybı';
      normalized = true;
      console.log(`🔧 Normalized notification title: Puuan -> Puan`);
    }

    return {
      type: normalizedType,
      title: normalizedTitle,
      message: normalizedMessage,
      normalized
    };
  }

  /**
   * Geçerli bildirim türlerini kontrol eder
   */
  static getValidStudentNotificationTypes(): string[] {
    return [
      'membership_approved',
      'membership_rejected', 
  'membership_kicked',
      'event_created',
      'event_updated',
      'event_cancelled',
      'event_reminder',
      'club_announcement',
      'new_follow',
      'user_follow',
      'user_unfollow',
      'comment_reply',
      'post_liked',
      'achievement_earned',
      'level_up',
      'club_promotion',
      'system_update',
      'system_message',
      'score_loss',
      'event_liked',
      'event_commented',
      'membership_request'
    ];
  }

  /**
   * Geçerli kulüp bildirim türlerini kontrol eder
   */
  static getValidClubNotificationTypes(): string[] {
    return [
      'membership_request',
      'member_joined',
      'member_left', 
      'event_created',
      'event_updated',
      'event_liked',
      'event_commented',
      'event_participation',
      'club_follow',
      'club_like',
      'club_announcement',
      'new_follow',
      'milestone_reached',
      'level_up',
      'club_milestone',
      'system_message',
      'member_request',
      'club_share',
      'event_joined',
      'club_followed',
      'member_achievement',
      'engagement_report',
      'feedback_received'
    ];
  }
}
