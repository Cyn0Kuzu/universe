/**
 * 🧹 Notification Cleanup Utility
 * 
 * Bildirim sisteminin temizlik ve bakım işlemleri için yardımcı araçlar.
 * Firebase permission hatalarını ve eksik belgeleri temizler.
 */

import { SafeNotificationManager } from '../services/safeNotificationManager';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Güvenli AsyncStorage wrapper
const safeAsyncStorage = {
  async removeItem(key: string): Promise<void> {
    try {
      if (AsyncStorage && typeof AsyncStorage.removeItem === 'function') {
        await AsyncStorage.removeItem(key);
      } else {
        console.warn('⚠️ AsyncStorage.removeItem not available');
      }
    } catch (error) {
      console.warn(`⚠️ AsyncStorage.removeItem failed for key ${key}:`, error);
    }
  },
  
  async getItem(key: string): Promise<string | null> {
    try {
      if (AsyncStorage && typeof AsyncStorage.getItem === 'function') {
        return await AsyncStorage.getItem(key);
      } else {
        console.warn('⚠️ AsyncStorage.getItem not available');
        return null;
      }
    } catch (error) {
      console.warn(`⚠️ AsyncStorage.getItem failed for key ${key}:`, error);
      return null;
    }
  }
};

export class NotificationCleanupUtil {
  
  /**
   * 🧹 Kullanıcının tüm bildirim verilerini temizle
   */
  static async cleanupUserNotifications(
    userId: string,
    userType: 'student' | 'club' = 'student'
  ): Promise<{
    invalidRemoved: number;
    validRemaining: number;
    success: boolean;
  }> {
    try {
      console.log(`🧹 Starting notification cleanup for ${userType} ${userId}`);
      
      const result = await SafeNotificationManager.cleanupInvalidNotifications(userId, userType);
      
      console.log(`🧹 Cleanup completed: ${result.removed} invalid notifications removed, ${result.remaining} valid remaining`);
      
      return {
        invalidRemoved: result.removed,
        validRemaining: result.remaining,
        success: true
      };
      
    } catch (error) {
      console.error('Notification cleanup failed:', error);
      return {
        invalidRemoved: 0,
        validRemaining: 0,
        success: false
      };
    }
  }

  /**
   * 🧹 Tüm notification storage'ları temizle (reset)
   */
  static async resetAllNotificationStorage(userId: string): Promise<boolean> {
    try {
      console.log(`🧹 Resetting all notification storage for user ${userId}`);
      
      // Student notifications
      try {
        await safeAsyncStorage.removeItem(`readNotifications_${userId}`);
        console.log(`✅ Removed student notifications for ${userId}`);
      } catch (error) {
        console.warn(`⚠️ Failed to remove student notifications for ${userId}:`, error);
      }
      
      // Club notifications
      try {
        await safeAsyncStorage.removeItem(`readNotifications_club_${userId}`);
        console.log(`✅ Removed club notifications for ${userId}`);
      } catch (error) {
        console.warn(`⚠️ Failed to remove club notifications for ${userId}:`, error);
      }
      
      // Notification counts
      try {
        await safeAsyncStorage.removeItem(`notificationCount_${userId}`);
        await safeAsyncStorage.removeItem(`clubNotificationCount_${userId}`);
        console.log(`✅ Removed notification counts for ${userId}`);
      } catch (error) {
        console.warn(`⚠️ Failed to remove notification counts for ${userId}:`, error);
      }
      
      // Last check timestamps
      try {
        await safeAsyncStorage.removeItem(`lastNotificationCheck_${userId}`);
        await safeAsyncStorage.removeItem(`lastClubNotificationCheck_${userId}`);
        console.log(`✅ Removed check timestamps for ${userId}`);
      } catch (error) {
        console.warn(`⚠️ Failed to remove check timestamps for ${userId}:`, error);
      }
      
      console.log(`🧹 All notification storage reset completed for ${userId}`);
      return true;
      
    } catch (error) {
      console.error('Failed to reset notification storage:', error);
      return false;
    }
  }

  /**
   * 📊 Bildirim sisteminin durumunu analiz et
   */
  static async analyzeNotificationStatus(
    userId: string,
    userType: 'student' | 'club' = 'student'
  ): Promise<{
    totalStored: number;
    validInFirebase: number;
    invalidEntries: number;
    syncIssues: string[];
    recommendations: string[];
  }> {
    const syncIssues: string[] = [];
    const recommendations: string[] = [];
    
    try {
      console.log(`📊 Analyzing notification status for ${userType} ${userId}`);
      
      const readNotificationsKey = userType === 'club' 
        ? `readNotifications_club_${userId}`
        : `readNotifications_${userId}`;
      
      // AsyncStorage'dan bildirim ID'lerini al
      const existingReadNotifications = await safeAsyncStorage.getItem(readNotificationsKey);
      const storedIds: string[] = existingReadNotifications ? JSON.parse(existingReadNotifications) : [];
      
      let validInFirebase = 0;
      let invalidEntries = 0;
      
      // Her ID'nin Firebase'da varlığını kontrol et
      for (const id of storedIds) {
        const exists = await SafeNotificationManager.checkNotificationExists(id);
        if (exists) {
          validInFirebase++;
        } else {
          invalidEntries++;
          syncIssues.push(`Invalid notification ID in storage: ${id}`);
        }
      }
      
      // Öneriler oluştur
      if (invalidEntries > 0) {
        recommendations.push(`Run cleanup to remove ${invalidEntries} invalid notification entries`);
      }
      
      if (invalidEntries > storedIds.length * 0.5) {
        recommendations.push('Consider resetting notification storage due to high invalid entry ratio');
      }
      
      if (storedIds.length === 0) {
        recommendations.push('No stored notification data found - this might be normal for new users');
      }
      
      const analysis = {
        totalStored: storedIds.length,
        validInFirebase,
        invalidEntries,
        syncIssues,
        recommendations
      };
      
      console.log(`📊 Analysis complete:`, analysis);
      return analysis;
      
    } catch (error: any) {
      console.error('Notification analysis failed:', error);
      return {
        totalStored: 0,
        validInFirebase: 0,
        invalidEntries: 0,
        syncIssues: [`Analysis failed: ${error?.message || 'Unknown error'}`],
        recommendations: ['Run notification system reset']
      };
    }
  }

  /**
   * 🔧 Otomatik bildirim sistemi bakımı
   */
  static async performAutomaticMaintenance(
    userId: string,
    userType: 'student' | 'club' = 'student'
  ): Promise<{
    analyzed: boolean;
    cleaned: boolean;
    resetRequired: boolean;
    report: string[];
  }> {
    const report: string[] = [];
    let analyzed = false;
    let cleaned = false;
    let resetRequired = false;
    
    try {
      report.push(`🔧 Starting automatic maintenance for ${userType} ${userId}`);
      
      // 1. Durum analizi
      const analysis = await this.analyzeNotificationStatus(userId, userType);
      analyzed = true;
      report.push(`📊 Analysis: ${analysis.totalStored} total, ${analysis.validInFirebase} valid, ${analysis.invalidEntries} invalid`);
      
      // 2. Temizlik gerekli mi?
      if (analysis.invalidEntries > 0) {
        const cleanupResult = await this.cleanupUserNotifications(userId, userType);
        cleaned = cleanupResult.success;
        report.push(`🧹 Cleanup: Removed ${cleanupResult.invalidRemoved} invalid entries`);
      }
      
      // 3. Reset gerekli mi?
      if (analysis.invalidEntries > analysis.totalStored * 0.7) {
        resetRequired = true;
        report.push(`⚠️ High invalid ratio detected - reset recommended`);
      }
      
      // 4. Sonuç raporu
      if (analysis.recommendations.length > 0) {
        report.push(`💡 Recommendations: ${analysis.recommendations.join(', ')}`);
      }
      
      report.push(`✅ Automatic maintenance completed`);
      
      return {
        analyzed,
        cleaned,
        resetRequired,
        report
      };
      
    } catch (error: any) {
      report.push(`❌ Maintenance failed: ${error?.message || 'Unknown error'}`);
      return {
        analyzed,
        cleaned,
        resetRequired: true,
        report
      };
    }
  }

  /**
   * 📋 Bildirim sistemi sağlık raporu
   */
  static async generateHealthReport(userId: string): Promise<string> {
    try {
      const timestamp = new Date().toISOString();
      let report = `🏥 NOTIFICATION SYSTEM HEALTH REPORT\n`;
      report += `📅 Generated: ${timestamp}\n`;
      report += `👤 User: ${userId}\n`;
      report += `${'='.repeat(50)}\n\n`;
      
      // Student notifications analizi
      const studentAnalysis = await this.analyzeNotificationStatus(userId, 'student');
      report += `📚 STUDENT NOTIFICATIONS:\n`;
      report += `  Total Stored: ${studentAnalysis.totalStored}\n`;
      report += `  Valid in Firebase: ${studentAnalysis.validInFirebase}\n`;
      report += `  Invalid Entries: ${studentAnalysis.invalidEntries}\n`;
      report += `  Health Score: ${studentAnalysis.totalStored > 0 ? Math.round((studentAnalysis.validInFirebase / studentAnalysis.totalStored) * 100) : 100}%\n\n`;
      
      // Club notifications analizi
      const clubAnalysis = await this.analyzeNotificationStatus(userId, 'club');
      report += `🏛️ CLUB NOTIFICATIONS:\n`;
      report += `  Total Stored: ${clubAnalysis.totalStored}\n`;
      report += `  Valid in Firebase: ${clubAnalysis.validInFirebase}\n`;
      report += `  Invalid Entries: ${clubAnalysis.invalidEntries}\n`;
      report += `  Health Score: ${clubAnalysis.totalStored > 0 ? Math.round((clubAnalysis.validInFirebase / clubAnalysis.totalStored) * 100) : 100}%\n\n`;
      
      // Genel öneriler
      const allRecommendations = [...studentAnalysis.recommendations, ...clubAnalysis.recommendations];
      if (allRecommendations.length > 0) {
        report += `💡 RECOMMENDATIONS:\n`;
        allRecommendations.forEach((rec, index) => {
          report += `  ${index + 1}. ${rec}\n`;
        });
        report += `\n`;
      }
      
      // Sorun listesi
      const allIssues = [...studentAnalysis.syncIssues, ...clubAnalysis.syncIssues];
      if (allIssues.length > 0) {
        report += `⚠️ ISSUES DETECTED:\n`;
        allIssues.forEach((issue, index) => {
          report += `  ${index + 1}. ${issue}\n`;
        });
        report += `\n`;
      }
      
      report += `✅ Report generation completed successfully.`;
      
      return report;
      
    } catch (error: any) {
      return `❌ Failed to generate health report: ${error?.message || 'Unknown error'}`;
    }
  }
}

export default NotificationCleanupUtil;
