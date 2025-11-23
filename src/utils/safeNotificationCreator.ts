/**
 * 🛡️ Safe Notification Creation Utility
 * 
 * Güvenli bildirim oluşturma için yardımcı fonksiyonlar.
 * Firebase'ın undefined değerlerle ilgili katı kurallarını handle eder.
 */

import { getFirebaseCompatSync } from '../firebase/compat';

const firebase = getFirebaseCompatSync();

export interface SafeNotificationData {
  type: string;
  recipientId: string;
  title: string;
  message: string;
  clubId?: string;
  eventId?: string;
  userId?: string;
  userName?: string;
  userProfileImage?: string;
  data?: any;
  priority?: 'low' | 'normal' | 'high';
  category?: string;
  read?: boolean;
}

export class SafeNotificationCreator {
  
  /**
   * 🛡️ Güvenli bildirim nesnesi oluştur - undefined değerleri filtreler
   */
  static createSafeNotification(notificationData: SafeNotificationData): any {
    const baseNotification = {
      type: notificationData.type,
      recipientId: notificationData.recipientId,
      title: notificationData.title,
      message: notificationData.message,
      data: notificationData.data || {},
      read: notificationData.read || false,
      createdAt: getFirebaseCompatSync().firestore.FieldValue.serverTimestamp()
    };

    // Sadece tanımlı ve boş olmayan değerleri ekle
    const safeNotification: any = { ...baseNotification };

    // Opsiyonel string alanları kontrol et - ASLA undefined SET ETME
    if (notificationData.clubId && typeof notificationData.clubId === 'string' && notificationData.clubId.trim() !== '') {
      safeNotification.clubId = notificationData.clubId;
    }

    if (notificationData.eventId && typeof notificationData.eventId === 'string' && notificationData.eventId.trim() !== '') {
      safeNotification.eventId = notificationData.eventId;
    }

    if (notificationData.userId && typeof notificationData.userId === 'string' && notificationData.userId.trim() !== '') {
      safeNotification.userId = notificationData.userId;
    }

    if (notificationData.userName && typeof notificationData.userName === 'string' && notificationData.userName.trim() !== '') {
      safeNotification.userName = notificationData.userName;
    }

    if (notificationData.userProfileImage && typeof notificationData.userProfileImage === 'string' && notificationData.userProfileImage.trim() !== '') {
      safeNotification.userProfileImage = notificationData.userProfileImage;
    }

    if (notificationData.priority && typeof notificationData.priority === 'string' && notificationData.priority.trim() !== '') {
      safeNotification.priority = notificationData.priority;
    }

    if (notificationData.category && typeof notificationData.category === 'string' && notificationData.category.trim() !== '') {
      safeNotification.category = notificationData.category;
    }

    return safeNotification;
  }

  /**
   * 🛡️ Güvenli bildirim kaydetme - Firebase'a undefined değerler göndermez
   */
  static async saveSafeNotification(notificationData: SafeNotificationData): Promise<{
    success: boolean;
    documentId?: string;
    error?: string;
  }> {
    try {
      console.log('🛡️ Creating safe notification for:', notificationData.recipientId);
      console.log('🛡️ Input data:', JSON.stringify(notificationData, null, 2));

      // Güvenli bildirim nesnesi oluştur
      const safeNotification = this.createSafeNotification(notificationData);
      
      console.log('🛡️ Safe notification object:', JSON.stringify(safeNotification, null, 2));

      // 🚨 EMERGENCY: Final undefined check before Firebase
      const emergencyFinalCheck: any = {};
      for (const [key, value] of Object.entries(safeNotification)) {
        if (value !== undefined && value !== null) {
          emergencyFinalCheck[key] = value;
        } else {
          console.log(`🚨 EMERGENCY SAFE: Removed undefined/null key: ${key}`);
        }
      }
      
      console.log('🚨 EMERGENCY SAFE: Final notification before Firebase:', JSON.stringify(emergencyFinalCheck, null, 2));

      // Firebase'a kaydet
      const db = getFirebaseCompatSync().firestore();
      const docRef = await db.collection('notifications').add(emergencyFinalCheck);

      console.log('✅ Safe notification saved with ID:', docRef.id);

      return {
        success: true,
        documentId: docRef.id
      };

    } catch (error: any) {
      console.error('❌ Safe notification creation failed:', error);
      
      return {
        success: false,
        error: error?.message || 'Unknown error'
      };
    }
  }

  /**
   * 🛡️ Kullanıcı takip bildirimi - güvenli versiyon
   */
  static async createSafeUserFollowNotification(
    followerId: string,
    followerName: string,
    targetUserId: string,
    followerProfileImage?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`🛡️ Creating safe user follow notification: ${followerName} -> ${targetUserId}`);

      const notificationData: SafeNotificationData = {
        type: 'user_follow',
        recipientId: targetUserId,
        title: 'Yeni Takipçi',
        message: `${followerName} seni takip etmeye başladı`,
        userId: followerId,
        userName: followerName,
        userProfileImage: followerProfileImage,
        data: {
          actorId: followerId,
          actorName: followerName,
          actorImage: followerProfileImage,
          actionType: 'user_follow',
          targetUserId: targetUserId
        },
        priority: 'normal',
        category: 'social'
      };

      const result = await this.saveSafeNotification(notificationData);
      
      if (result.success) {
        console.log('✅ Safe user follow notification created successfully');
        return { success: true };
      } else {
        console.error('❌ Safe user follow notification failed:', result.error);
        return { success: false, error: result.error };
      }

    } catch (error: any) {
      console.error('❌ Safe user follow notification error:', error);
      return { success: false, error: error?.message || 'Unknown error' };
    }
  }

  /**
   * 🛡️ Puan kaybı bildirimi - güvenli versiyon
   */
  static async createSafeScoreLossNotification(
    userId: string,
    points: number,
    reason: string,
    details?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`� DEBUG: SafeNotificationCreator.createSafeScoreLossNotification called for user: ${userId}, points: ${points}, reason: ${reason}`);
      console.log(`�🛡️ Creating safe score loss notification for user: ${userId}`);

      const notificationData: SafeNotificationData = {
        type: 'score_loss',
        recipientId: userId,
        title: '⚠️ Puan Kaybı',
        message: `${reason} sebebiyle ${points} puan kaybettiniz${details ? `. ${details}` : ''}`,
        userId: 'system',
        userName: 'Sistem',
        data: {
          points: points,
          reason: reason,
          details: details || '',
          actionType: 'score_loss'
        },
        priority: points >= 50 ? 'high' : points >= 20 ? 'normal' : 'low',
        category: 'system'
      };

      const result = await this.saveSafeNotification(notificationData);
      
      if (result.success) {
        console.log('✅ Safe score loss notification created successfully');
        console.log('🔔 DEBUG: SCORE LOSS notification actually saved to database - this might be a duplicate!');
        return { success: true };
      } else {
        console.error('❌ Safe score loss notification failed:', result.error);
        return { success: false, error: result.error };
      }

    } catch (error: any) {
      console.error('❌ Safe score loss notification error:', error);
      return { success: false, error: error?.message || 'Unknown error' };
    }
  }

  /**
   * 🛡️ Puan kazanımı bildirimi - güvenli versiyon
   */
  static async createSafeScoreGainNotification(
    userId: string,
    points: number,
    reason: string,
    details?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`🛡️ Creating safe score gain notification for user: ${userId}`);

      const notificationData: SafeNotificationData = {
        type: 'score_gain',
        recipientId: userId,
        title: '🎉 Puan Kazandınız',
        message: `${reason} sebebiyle ${points} puan kazandınız${details ? `. ${details}` : ''}`,
        userId: 'system',
        userName: 'Sistem',
        data: {
          points: points,
          reason: reason,
          details: details || '',
          actionType: 'score_gain'
        },
        priority: points >= 50 ? 'high' : points >= 20 ? 'normal' : 'low',
        category: 'system'
      };

      const result = await this.saveSafeNotification(notificationData);
      if (result.success) {
        console.log('✅ Safe score gain notification created successfully');
        return { success: true };
      } else {
        console.error('❌ Safe score gain notification failed:', result.error);
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      console.error('❌ Safe score gain notification error:', error);
      return { success: false, error: error?.message || 'Unknown error' };
    }
  }

  /**
   * 🛡️ Kulüp bildirimi - güvenli versiyon
   */
  static async createSafeClubNotification(
    clubId: string,
    title: string,
    message: string,
    type: string = 'club_announcement',
    additionalData?: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`🛡️ Creating safe club notification for club: ${clubId}`);

      const notificationData: SafeNotificationData = {
        type: type,
        recipientId: 'club_members', // Will be resolved later
        title: title,
        message: message,
        clubId: clubId,
        userId: 'system',
        userName: 'Sistem',
        data: {
          clubId: clubId,
          actionType: type,
          ...additionalData
        },
        priority: 'normal',
        category: 'club'
      };

      const result = await this.saveSafeNotification(notificationData);
      
      if (result.success) {
        console.log('✅ Safe club notification created successfully');
        return { success: true };
      } else {
        console.error('❌ Safe club notification failed:', result.error);
        return { success: false, error: result.error };
      }

    } catch (error: any) {
      console.error('❌ Safe club notification error:', error);
      return { success: false, error: error?.message || 'Unknown error' };
    }
  }

  /**
   * 🔍 Bildirim verilerini doğrula
   */
  static validateNotificationData(data: SafeNotificationData): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!data.type || data.type.trim() === '') {
      errors.push('Notification type is required');
    }

    if (!data.recipientId || data.recipientId.trim() === '') {
      errors.push('Recipient ID is required');
    }

    if (!data.title || data.title.trim() === '') {
      errors.push('Notification title is required');
    }

    if (!data.message || data.message.trim() === '') {
      errors.push('Notification message is required');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }
}

export default SafeNotificationCreator;
