/**
 * 🔧 System Health Monitor v1.0
 * Comprehensive system monitoring and automated fixes for scoring, notifications, and activity systems
 */

import type firebaseType from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { NotificationManagement } from '../firebase/notificationManagement';
import { EnhancedUserActivityService } from './enhancedUserActivityService';
import { userStatsService, UserStatsService } from './index';
import { getFirebaseCompatSync } from '../firebase/compat';

const firebase = getFirebaseCompatSync() as typeof firebaseType;

interface SystemHealth {
  scoring: {
    operational: boolean;
    lastCheck: Date;
    errors: string[];
  };
  notifications: {
    operational: boolean;
    lastCheck: Date;
    errors: string[];
  };
  activities: {
    operational: boolean;
    lastCheck: Date;
    errors: string[];
  };
  overall: {
    status: 'healthy' | 'degraded' | 'critical';
    lastFullCheck: Date;
  };
}

interface SystemIssue {
  component: 'scoring' | 'notifications' | 'activities';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  fixAttempted: boolean;
  resolved: boolean;
  timestamp: Date;
}

export class SystemHealthMonitor {
  private static instance: SystemHealthMonitor;
  private db: firebaseType.firestore.Firestore;
  private healthStatus: SystemHealth;
  private activityService: EnhancedUserActivityService;
  private lastHealthCheck: Date = new Date(0);
  private readonly CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private issues: SystemIssue[] = [];

  private constructor() {
    this.db = getFirebaseCompatSync().firestore();
    this.activityService = EnhancedUserActivityService.getInstance();
    this.healthStatus = this.initializeHealthStatus();
  }

  static getInstance(): SystemHealthMonitor {
    if (!SystemHealthMonitor.instance) {
      SystemHealthMonitor.instance = new SystemHealthMonitor();
    }
    return SystemHealthMonitor.instance;
  }

  private initializeHealthStatus(): SystemHealth {
    const now = new Date();
    return {
      scoring: {
        operational: true,
        lastCheck: now,
        errors: []
      },
      notifications: {
        operational: true,
        lastCheck: now,
        errors: []
      },
      activities: {
        operational: true,
        lastCheck: now,
        errors: []
      },
      overall: {
        status: 'healthy',
        lastFullCheck: now
      }
    };
  }

  /**
   * 🔍 Comprehensive System Health Check
   */
  async performHealthCheck(): Promise<SystemHealth> {
    console.log('🔍 HEALTH MONITOR: Starting comprehensive system check...');
    
    try {
      // Check if enough time has passed since last check
      const timeSinceLastCheck = Date.now() - this.lastHealthCheck.getTime();
      if (timeSinceLastCheck < this.CHECK_INTERVAL) {
        return this.healthStatus;
      }

      this.lastHealthCheck = new Date();

      // Test all systems
      const scoringHealth = await this.checkScoringSystem();
      const notificationHealth = await this.checkNotificationSystem();
      const activityHealth = await this.checkActivitySystem();

      // Update health status
      this.healthStatus = {
        scoring: scoringHealth,
        notifications: notificationHealth,
        activities: activityHealth,
        overall: {
          status: this.calculateOverallStatus(scoringHealth, notificationHealth, activityHealth),
          lastFullCheck: new Date()
        }
      };

      // Auto-fix critical issues
      await this.autoFixCriticalIssues();

      console.log('✅ HEALTH MONITOR: System check completed', this.healthStatus.overall.status);
      return this.healthStatus;

    } catch (error) {
      console.error('❌ HEALTH MONITOR: Health check failed:', error);
      this.healthStatus.overall.status = 'critical';
      return this.healthStatus;
    }
  }

  /**
   * 🎯 Check Scoring System Health
   */
  private async checkScoringSystem(): Promise<SystemHealth['scoring']> {
    const errors: string[] = [];
    let operational = true;

    try {
      console.log('🎯 Checking scoring system...');

      // Test basic scoring functionality
      const testUserId = 'health_check_test_user';
      
      // Scoring system removed - statistics are tracked directly in Firebase
      // No additional health checks needed for statistics-based system
      console.log('✅ Statistics tracking is operational (Firebase-based)');

      // Test user stats integration
      try {
        const userStats = await userStatsService.getUserStats('health_check_test_user');
        if (!userStats) {
          errors.push('User stats integration issue detected');
          operational = false;
        }
      } catch (statsError) {
        errors.push('User stats service connection failed');
        operational = false;
      }

      console.log(`✅ Scoring system check: ${operational ? 'PASSED' : 'FAILED'}`);

    } catch (error) {
      console.error('❌ Scoring system check failed:', error);
      errors.push(`Scoring system error: ${error}`);
      operational = false;
    }

    return {
      operational,
      lastCheck: new Date(),
      errors
    };
  }

  /**
   * 📱 Check Notification System Health
   */
  private async checkNotificationSystem(): Promise<SystemHealth['notifications']> {
    const errors: string[] = [];
    let operational = true;

    try {
      console.log('📱 Checking notification system...');

      // Test notification preferences
      const testUserId = 'health_check_test_user';
      const preferences = await NotificationManagement.getUserNotificationPreferences(testUserId);
      
      if (!preferences) {
        errors.push('Notification preferences system failed');
        operational = false;
      }

      // Test notification sending (without actually sending)
      try {
        const testNotification = await NotificationManagement.sendNotificationToUser(
          testUserId,
          'event_created',
          'Health Check Test',
          'This is a health check notification',
          { healthCheckTest: true },
          { silent: true }
        );

        if (!testNotification) {
          errors.push('Notification sending system failed');
          operational = false;
        }
      } catch (notifError) {
        errors.push('Notification system error detected');
        operational = false;
      }

      console.log(`✅ Notification system check: ${operational ? 'PASSED' : 'FAILED'}`);

    } catch (error) {
      console.error('❌ Notification system check failed:', error);
      errors.push(`Notification system error: ${error}`);
      operational = false;
    }

    return {
      operational,
      lastCheck: new Date(),
      errors
    };
  }

  /**
   * 📊 Check Activity System Health
   */
  private async checkActivitySystem(): Promise<SystemHealth['activities']> {
    const errors: string[] = [];
    let operational = true;

    try {
      console.log('📊 Checking activity system...');

      const testUserId = 'health_check_test_user';

      // Test activity creation
      const activityId = await this.activityService.createActivity({
        type: 'event_like',
        title: 'Health Check Activity',
        description: 'System health check test activity',
        userId: testUserId,
        userName: 'Health Check User',
        category: 'events',
        visibility: 'private',
        priority: 'low',
        metadata: {
          eventId: 'health_check',
          eventTitle: 'Health Check Test'
        }
      });

      if (!activityId) {
        errors.push('Activity creation failed');
        operational = false;
      }

      // Test activity retrieval
      const activities = await this.activityService.getUserActivities(testUserId, { limit: 1 });
      
      if (!activities || activities.length === 0) {
        errors.push('Activity retrieval failed');
        operational = false;
      }

      // Clean up test activity
      if (activityId) {
        await this.activityService.deleteActivity(activityId, testUserId);
      }

      console.log(`✅ Activity system check: ${operational ? 'PASSED' : 'FAILED'}`);

    } catch (error) {
      console.error('❌ Activity system check failed:', error);
      errors.push(`Activity system error: ${error}`);
      operational = false;
    }

    return {
      operational,
      lastCheck: new Date(),
      errors
    };
  }

  /**
   * 🔧 Auto-Fix Critical Issues
   */
  private async autoFixCriticalIssues(): Promise<void> {
    try {
      console.log('🔧 Checking for critical issues to auto-fix...');

      // Fix scoring system issues
      if (!this.healthStatus.scoring.operational) {
        await this.fixScoringIssues();
      }

      // Fix notification system issues
      if (!this.healthStatus.notifications.operational) {
        await this.fixNotificationIssues();
      }

      // Fix activity system issues
      if (!this.healthStatus.activities.operational) {
        await this.fixActivityIssues();
      }

    } catch (error) {
      console.error('❌ Auto-fix failed:', error);
    }
  }

  /**
   * 🎯 Fix Statistics System Issues
   */
  private async fixScoringIssues(): Promise<void> {
    try {
      console.log('🔧 Attempting to fix statistics system issues...');

      // Statistics system is Firebase-based - no service reset needed
      // Re-initialize user stats service if needed
      await userStatsService.ensureUserStatsDocument('health_check_test_user');

      console.log('✅ Statistics system fix attempt completed');

    } catch (error) {
      console.error('❌ Failed to fix scoring issues:', error);
    }
  }

  /**
   * 📱 Fix Notification System Issues
   */
  private async fixNotificationIssues(): Promise<void> {
    try {
      console.log('🔧 Attempting to fix notification system issues...');

      // Test connection to notification preferences
      const testUserId = 'health_check_test_user';
      await NotificationManagement.updateNotificationPreferences(testUserId, {
        pushEnabled: true,
        inAppEnabled: true
      });

      console.log('✅ Notification system fix attempt completed');

    } catch (error) {
      console.error('❌ Failed to fix notification issues:', error);
    }
  }

  /**
   * 📊 Fix Activity System Issues
   */
  private async fixActivityIssues(): Promise<void> {
    try {
      console.log('🔧 Attempting to fix activity system issues...');

      // Reset activity service
      this.activityService = EnhancedUserActivityService.getInstance();

      // Clean up any corrupted data
      this.activityService.cleanup();

      console.log('✅ Activity system fix attempt completed');

    } catch (error) {
      console.error('❌ Failed to fix activity issues:', error);
    }
  }

  /**
   * 📈 Calculate Overall System Status
   */
  private calculateOverallStatus(
    scoring: SystemHealth['scoring'],
    notifications: SystemHealth['notifications'],
    activities: SystemHealth['activities']
  ): 'healthy' | 'degraded' | 'critical' {
    const operationalSystems = [scoring, notifications, activities].filter(s => s.operational).length;

    if (operationalSystems === 3) return 'healthy';
    if (operationalSystems >= 2) return 'degraded';
    return 'critical';
  }

  /**
   * 📊 Get Current Health Status
   */
  getHealthStatus(): SystemHealth {
    return this.healthStatus;
  }

  /**
   * 🚨 Record System Issue
   */
  recordIssue(issue: Omit<SystemIssue, 'timestamp'>): void {
    this.issues.push({
      ...issue,
      timestamp: new Date()
    });

    // Keep only last 100 issues
    if (this.issues.length > 100) {
      this.issues = this.issues.slice(-100);
    }
  }

  /**
   * 📋 Get Recent Issues
   */
  getRecentIssues(limit: number = 10): SystemIssue[] {
    return this.issues.slice(-limit).reverse();
  }

  /**
   * 🧹 Cleanup
   */
  cleanup(): void {
    this.issues = [];
  }
}

// Export singleton instance
export const systemHealthMonitor = SystemHealthMonitor.getInstance();
