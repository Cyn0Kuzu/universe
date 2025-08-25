/**
 * 🏆 Modern Scoring Engine v4.0 - Production Ready
 * App Store ve Play Store için hazır puanlama sistemi
 */

import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import SafeNotificationCreator from '../utils/safeNotificationCreator';

// Type definitions
type ActionType = string;
type EntityType = 'user' | 'club' | 'event' | 'comment';

interface ScoreActivity {
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

interface ScoringResponse {
  success: boolean;
  userPointsAwarded: number;
  targetPointsAwarded?: number;
  clubPointsAwarded?: number;
  activityId: string;
  message?: string;
  error?: string;
}

interface UserScore {
  userId: string;
  totalScore: number;
  lastUpdated: any;
}

interface ScoringMetadata {
  eventTitle?: string;
  clubName?: string;
  clubId?: string;
  eventId?: string;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  [key: string]: any;
}

interface SecurityResult {
  allowed: boolean;
  reason?: string;
}

// 🎯 Puanlama Konfigürasyonu - App Store Ready
const SCORING_CONFIG = {
  // 👍 Social Interactions
  LIKE_EVENT: { user: 5, target: 3, club: 2, reversible: true, cooldown: 0 },
  UNLIKE_EVENT: { user: -5, target: -3, club: -2, reversible: false, cooldown: 0, allowNegative: true },
  LIKE_COMMENT: { user: 2, target: 1, reversible: true, cooldown: 0 },
  UNLIKE_COMMENT: { user: -2, target: -1, reversible: false, cooldown: 0, allowNegative: true },
  
  // 🚶‍♂️ Event Participation
  JOIN_EVENT: { user: 20, target: 15, club: 10, reversible: true, cooldown: 60 },
  LEAVE_EVENT: { user: -20, target: -15, club: -10, reversible: false, cooldown: 0 },
  
  // 🏢 Club Interactions
  FOLLOW_CLUB: { user: 15, club: 20, reversible: true, cooldown: 30 },
  UNFOLLOW_CLUB: { user: -15, club: -20, reversible: false, cooldown: 0 },
  JOIN_CLUB: { user: 50, club: 25, reversible: true, cooldown: 300 },
  LEAVE_CLUB: { user: -50, club: -25, reversible: false, cooldown: 0 },
  
  // 🎯 Club Member Management
  APPROVE_CLUB_MEMBER: { user: 25, target: 30, club: 15, reversible: true, cooldown: 0 },
  REJECT_CLUB_MEMBER: { user: 0, club: 0, reversible: false, cooldown: 0 },
  KICK_CLUB_MEMBER: { user: -25, target: -100, club: -15, reversible: false, cooldown: 0 },
  
  // 👥 User Following
  FOLLOW_USER: { user: 10, target: 15, reversible: true, cooldown: 45 },
  UNFOLLOW_USER: { user: -10, target: -15, reversible: false, cooldown: 0 },
  
  // 💬 Comments
  COMMENT_EVENT: { user: 8, target: 5, club: 3, reversible: true, cooldown: 30 },
  DELETE_COMMENT: { user: -8, target: -5, club: -3, reversible: false, cooldown: 0 },
  REPLY_COMMENT: { user: 5, target: 3, reversible: true, cooldown: 15 },
  
  // 📤 Sharing
  SHARE_EVENT: { user: 12, target: 8, club: 5, reversible: false, cooldown: 300 },
  UNSHARE_EVENT: { user: -12, target: -8, club: -5, reversible: false, cooldown: 0 },
  SHARE_CLUB: { user: 10, target: 12, reversible: false, cooldown: 180 },
  
  // 🎯 Event Management
  CREATE_EVENT: { user: 100, club: 50, reversible: false, cooldown: 0 },
  UPDATE_EVENT: { user: 8, target: 5, club: 3, reversible: false, cooldown: 60 },
  DELETE_EVENT: { user: -50, club: -30, reversible: false, cooldown: 0 },
  COMPLETE_EVENT: { user: 150, club: 100, reversible: false, cooldown: 0 },
  
  // 👤 Profile Actions
  COMPLETE_PROFILE: { user: 200, reversible: false, cooldown: 0 },
  UPDATE_PROFILE: { user: 10, reversible: false, cooldown: 1440 },
  VERIFY_EMAIL: { user: 100, reversible: false, cooldown: 0 },
  
  // 🎯 Engagement
  VIEW_EVENT: { user: 1, target: 0.5, club: 0.2, reversible: false, cooldown: 0 },
  VIEW_CLUB: { user: 0.8, target: 1.2, reversible: false, cooldown: 0 },
  SEARCH_EVENT: { user: 0.5, reversible: false, cooldown: 0 },
  
  // 🏆 Special Actions
  FIRST_EVENT_JOIN: { user: 200, reversible: false, cooldown: 0 },
  FIRST_CLUB_FOLLOW: { user: 100, reversible: false, cooldown: 0 },
  DAILY_LOGIN: { user: 10, reversible: false, cooldown: 1440 },
  
  // 🎖️ Achievements
  RATE_EVENT: { user: 15, target: 10, club: 5, reversible: true, cooldown: 0 },
  REVIEW_EVENT: { user: 25, target: 20, club: 10, reversible: true, cooldown: 300 },
  INVITE_FRIEND: { user: 50, reversible: false, cooldown: 60 },
  TUTORIAL_COMPLETE: { user: 50, reversible: false, cooldown: 0 },
  FEEDBACK_SUBMIT: { user: 30, reversible: false, cooldown: 1440 },
} as const;

export class ModernScoringEngine {
  private db: firebase.firestore.Firestore;
  private cooldownCache: Map<string, number> = new Map();
  private static instance: ModernScoringEngine;

  private constructor() {
    this.db = firebase.firestore();
  }

  public static getInstance(): ModernScoringEngine {
    if (!ModernScoringEngine.instance) {
      ModernScoringEngine.instance = new ModernScoringEngine();
    }
    return ModernScoringEngine.instance;
  }

  /**
   * 🎯 Ana puanlama fonksiyonu
   */
  async processAction(
    userId: string,
    action: ActionType,
    targetId: string,
    targetType: EntityType,
    metadata: ScoringMetadata = {}
  ): Promise<ScoringResponse> {
    const callId = Math.random().toString(36).substring(2, 8);
    
    try {
      console.log(`🎯 ModernScoringEngine [${callId}]: Processing ${action} for user ${userId}`);
      
      // Güvenlik kontrolü
      const securityResult = await this.performSecurityCheck(userId, action);
      if (!securityResult.allowed) {
        return {
          success: false,
          userPointsAwarded: 0,
          activityId: '',
          error: securityResult.reason || 'Güvenlik kontrolü başarısız'
        };
      }

      // Action config kontrolü
      const actionConfig = SCORING_CONFIG[action as keyof typeof SCORING_CONFIG];
      if (!actionConfig) {
        return {
          success: false,
          userPointsAwarded: 0,
          activityId: '',
          error: 'Geçersiz aksiyon türü'
        };
      }

      // Puan hesaplamaları
      const userPoints = Math.round((actionConfig as any).user || 0);
      const targetPoints = Math.round((actionConfig as any).target || 0);
      const clubPoints = Math.round((actionConfig as any).club || 0);

      // Metadata'yı güvenli hale getir
      const safeMetadata = this.sanitizeMetadata(metadata);
      if (targetType === 'club' && targetId && (!safeMetadata.clubId || safeMetadata.clubId === 'unknown')) {
        safeMetadata.clubId = targetId;
      }

      // Activity kaydı oluştur
      const activityId = await this.createActivity({
        userId,
        action,
        targetId,
        targetType,
        userPoints,
        targetPoints,
        clubPoints,
        metadata: safeMetadata
      });

      // Puanları uygula
      await this.applyScores(
        userId, 
        targetId, 
        targetType, 
        userPoints, 
        targetPoints, 
        clubPoints,
        safeMetadata
      );

      // Cooldown uygula
      this.applyCooldown(userId, action, actionConfig.cooldown || 0);

      // Kullanıcı aktivite geçmişine kayıt ekle
      try {
        // Bu kısım şu an basitleştirildi - gelecekte ayrı service ile genişletilebilir
        console.log(`📊 Activity logged for user ${userId}: ${action} -> ${userPoints} points`);
      } catch (activityError) {
        console.warn('Activity logging failed:', activityError);
      }

      console.log(`✅ ModernScoringEngine [${callId}]: Action processed successfully`);
      return {
        success: true,
        userPointsAwarded: userPoints,
        targetPointsAwarded: targetPoints,
        clubPointsAwarded: clubPoints,
        activityId,
        message: "Action processed successfully"
      };

    } catch (error) {
      console.error(`❌ ModernScoringEngine [${callId}]: Error:`, error);
      return {
        success: false,
        userPointsAwarded: 0,
        activityId: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 🛡️ Güvenlik kontrolü
   */
  private async performSecurityCheck(userId: string, action: ActionType): Promise<SecurityResult> {
    try {
      // Temel doğrulamalar
      if (!userId || userId.trim().length === 0) {
        return { allowed: false, reason: 'Geçersiz kullanıcı ID' };
      }

      if (!action || action.trim().length === 0) {
        return { allowed: false, reason: 'Geçersiz aksiyon' };
      }

      // Cooldown kontrolü
      const cooldownKey = `${userId}_${action}`;
      const lastActionTime = this.cooldownCache.get(cooldownKey);
      
      if (lastActionTime) {
        const actionConfig = SCORING_CONFIG[action as keyof typeof SCORING_CONFIG];
        const cooldownMinutes = (actionConfig as any)?.cooldown || 0;
        const timeSinceLastAction = (Date.now() - lastActionTime) / 1000 / 60;
        
        if (timeSinceLastAction < cooldownMinutes) {
          const remainingMinutes = Math.ceil(cooldownMinutes - timeSinceLastAction);
          return { 
            allowed: false, 
            reason: `Bu işlemi ${remainingMinutes} dakika sonra tekrar yapabilirsiniz` 
          };
        }
      }

      return { allowed: true };
    } catch (error) {
      console.error('Security check error:', error);
      return { allowed: false, reason: 'Güvenlik kontrolü başarısız' };
    }
  }

  /**
   * 🧹 Metadata temizleme
   */
  private sanitizeMetadata(metadata: ScoringMetadata): ScoringMetadata {
    const safe: ScoringMetadata = {};
    
    // Güvenli alanları kopyala
    if (metadata.eventTitle) safe.eventTitle = String(metadata.eventTitle).slice(0, 100);
    if (metadata.clubName) safe.clubName = String(metadata.clubName).slice(0, 50);
    if (metadata.clubId) safe.clubId = String(metadata.clubId);
    if (metadata.eventId) safe.eventId = String(metadata.eventId);
    if (metadata.description) safe.description = String(metadata.description).slice(0, 200);
    
    return safe;
  }

  /**
   * 📊 Activity kaydı oluştur
   */
  private async createActivity(data: any): Promise<string> {
    try {
      const activity: Partial<ScoreActivity> = {
        userId: data.userId,
        action: data.action,
        targetId: data.targetId,
        targetType: data.targetType,
        points: data.userPoints,
        userPoints: data.userPoints,
        targetPoints: data.targetPoints,
        relatedEntityPoints: data.clubPoints,
        metadata: data.metadata,
        status: 'active',
        timestamp: firebase.firestore.FieldValue.serverTimestamp() as any,
        isReversible: (SCORING_CONFIG[data.action as keyof typeof SCORING_CONFIG] as any)?.reversible || false
      };

      const docRef = await this.db.collection('activities').add(activity);
      return docRef.id;
    } catch (error) {
      console.error('Create activity error:', error);
      return '';
    }
  }

  /**
   * 💰 Puanları uygula
   */
  private async applyScores(
    userId: string,
    targetId: string,
    targetType: EntityType,
    userPoints: number,
    targetPoints: number,
    clubPoints: number,
    metadata: ScoringMetadata
  ): Promise<void> {
    console.log(`💰 ModernScoringEngine: Applying scores - User: ${userPoints}, Target: ${targetPoints}, Club: ${clubPoints}`);
    
    try {
      const batch = this.db.batch();

      // Kullanıcı puanını güncelle
      if (userPoints !== 0) {
        const userRef = this.db.collection('users').doc(userId);
        batch.update(userRef, {
          totalScore: firebase.firestore.FieldValue.increment(userPoints),
          [`stats.${new Date().toISOString().split('T')[0]}.score`]: firebase.firestore.FieldValue.increment(userPoints),
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
      }

      // Target puanını güncelle (user ise)
      if (targetPoints !== 0 && targetType === 'user' && targetId) {
        const targetRef = this.db.collection('users').doc(targetId);
        batch.update(targetRef, {
          totalScore: firebase.firestore.FieldValue.increment(targetPoints),
          [`stats.${new Date().toISOString().split('T')[0]}.score`]: firebase.firestore.FieldValue.increment(targetPoints),
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
      }

      // Kulüp puanını güncelle (club ise)
      if (clubPoints !== 0 && targetType === 'club' && targetId) {
        const clubRef = this.db.collection('clubs').doc(targetId);
        batch.update(clubRef, {
          totalScore: firebase.firestore.FieldValue.increment(clubPoints),
          [`stats.${new Date().toISOString().split('T')[0]}.score`]: firebase.firestore.FieldValue.increment(clubPoints),
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
      }

      await batch.commit();
      console.log(`✅ ModernScoringEngine: Scores applied successfully`);
    } catch (error) {
      console.error('Apply scores error:', error);
      throw error;
    }
  }

  /**
   * ⏱️ Cooldown uygula
   */
  private applyCooldown(userId: string, action: ActionType, cooldownMinutes: number): void {
    if (cooldownMinutes > 0) {
      const cooldownKey = `${userId}_${action}`;
      this.cooldownCache.set(cooldownKey, Date.now());
    }
  }
}

// Singleton instance export
export const modernScoringEngine = ModernScoringEngine.getInstance();
