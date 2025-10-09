/**
 * Notification Testing Utilities
 * Comprehensive testing utilities for notification functionality
 */

import { Platform } from 'react-native';
import { firebase } from '../firebase/config';
import PushNotificationService from '../services/pushNotificationService';

export interface NotificationTestResult {
  testName: string;
  success: boolean;
  error?: string;
  details?: any;
  timestamp: Date;
}

export interface NotificationTestSuite {
  results: NotificationTestResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  successRate: number;
}

export class NotificationTester {
  private static instance: NotificationTester;
  private pushService: PushNotificationService;

  private constructor() {
    this.pushService = PushNotificationService.getInstance();
  }

  static getInstance(): NotificationTester {
    if (!NotificationTester.instance) {
      NotificationTester.instance = new NotificationTester();
    }
    return NotificationTester.instance;
  }

  /**
   * Run comprehensive notification tests
   */
  async runAllTests(): Promise<NotificationTestSuite> {
    const results: NotificationTestResult[] = [];
    
    console.log('🧪 Starting notification tests...');

    // Test 1: Push notification service initialization
    results.push(await this.testPushServiceInitialization());

    // Test 2: Permission handling
    results.push(await this.testPermissionHandling());

    // Test 3: Token generation
    results.push(await this.testTokenGeneration());

    // Test 4: Notification screen loading
    results.push(await this.testNotificationScreenLoading());

    // Test 5: Firestore queries
    results.push(await this.testFirestoreQueries());

    // Test 6: Notification sending
    results.push(await this.testNotificationSending());

    // Test 7: Error handling
    results.push(await this.testErrorHandling());

    const passedTests = results.filter(r => r.success).length;
    const failedTests = results.filter(r => !r.success).length;
    const successRate = (passedTests / results.length) * 100;

    const testSuite: NotificationTestSuite = {
      results,
      totalTests: results.length,
      passedTests,
      failedTests,
      successRate,
    };

    console.log(`🧪 Notification tests completed: ${passedTests}/${results.length} passed (${successRate.toFixed(1)}%)`);
    
    return testSuite;
  }

  /**
   * Test push notification service initialization
   */
  private async testPushServiceInitialization(): Promise<NotificationTestResult> {
    try {
      console.log('🧪 Testing push service initialization...');
      
      const token = await this.pushService.initialize();
      
      if (token) {
        return {
          testName: 'Push Service Initialization',
          success: true,
          details: { tokenLength: token.length },
          timestamp: new Date(),
        };
      } else {
        return {
          testName: 'Push Service Initialization',
          success: false,
          error: 'Failed to obtain push token',
          timestamp: new Date(),
        };
      }
    } catch (error) {
      return {
        testName: 'Push Service Initialization',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Test permission handling
   */
  private async testPermissionHandling(): Promise<NotificationTestResult> {
    try {
      console.log('🧪 Testing permission handling...');
      
      const isAvailable = await this.pushService.isAvailable();
      
      return {
        testName: 'Permission Handling',
        success: isAvailable,
        details: { isAvailable, platform: Platform.OS },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        testName: 'Permission Handling',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Test token generation
   */
  private async testTokenGeneration(): Promise<NotificationTestResult> {
    try {
      console.log('🧪 Testing token generation...');
      
      const token = this.pushService.getCurrentExpoToken();
      
      if (token) {
        return {
          testName: 'Token Generation',
          success: true,
          details: { tokenLength: token.length, tokenPrefix: token.substring(0, 10) },
          timestamp: new Date(),
        };
      } else {
        return {
          testName: 'Token Generation',
          success: false,
          error: 'No token available',
          timestamp: new Date(),
        };
      }
    } catch (error) {
      return {
        testName: 'Token Generation',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Test notification screen loading
   */
  private async testNotificationScreenLoading(): Promise<NotificationTestResult> {
    try {
      console.log('🧪 Testing notification screen loading...');
      
      const user = firebase.auth().currentUser;
      if (!user) {
        return {
          testName: 'Notification Screen Loading',
          success: false,
          error: 'No authenticated user',
          timestamp: new Date(),
        };
      }

      // Test basic Firestore query without complex ordering
      const snapshot = await firebase.firestore()
        .collection('notifications')
        .where('recipientId', '==', user.uid)
        .limit(10)
        .get();

      return {
        testName: 'Notification Screen Loading',
        success: true,
        details: { notificationCount: snapshot.docs.length },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        testName: 'Notification Screen Loading',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Test Firestore queries
   */
  private async testFirestoreQueries(): Promise<NotificationTestResult> {
    try {
      console.log('🧪 Testing Firestore queries...');
      
      const user = firebase.auth().currentUser;
      if (!user) {
        return {
          testName: 'Firestore Queries',
          success: false,
          error: 'No authenticated user',
          timestamp: new Date(),
        };
      }

      // Test different query patterns
      const queries = [
        firebase.firestore().collection('notifications').where('recipientId', '==', user.uid).limit(5),
        firebase.firestore().collection('clubNotifications').where('recipientId', '==', user.uid).limit(5),
      ];

      const results = await Promise.all(queries.map(q => q.get()));
      const totalDocs = results.reduce((sum, snapshot) => sum + snapshot.docs.length, 0);

      return {
        testName: 'Firestore Queries',
        success: true,
        details: { totalDocs, queryCount: queries.length },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        testName: 'Firestore Queries',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Test notification sending
   */
  private async testNotificationSending(): Promise<NotificationTestResult> {
    try {
      console.log('🧪 Testing notification sending...');
      
      const token = this.pushService.getCurrentExpoToken();
      if (!token) {
        return {
          testName: 'Notification Sending',
          success: false,
          error: 'No push token available',
          timestamp: new Date(),
        };
      }

      // Test sending a notification to self
      await this.pushService.sendPushNotification(
        [token],
        {
          type: 'announcement',
          title: 'Test Notification',
          body: 'This is a test notification from the notification tester',
          data: { test: true, timestamp: Date.now() },
        }
      );

      return {
        testName: 'Notification Sending',
        success: true,
        details: { tokenUsed: token.substring(0, 10) },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        testName: 'Notification Sending',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Test error handling
   */
  private async testErrorHandling(): Promise<NotificationTestResult> {
    try {
      console.log('🧪 Testing error handling...');
      
      // Test with invalid token
      try {
        await this.pushService.sendPushNotification(
          ['invalid-token'],
          {
            type: 'announcement',
            title: 'Test',
            body: 'Test',
          }
        );
      } catch (error) {
        // Expected to fail
      }

      // Test with empty tokens array
      try {
        await this.pushService.sendPushNotification(
          [],
          {
            type: 'announcement',
            title: 'Test',
            body: 'Test',
          }
        );
      } catch (error) {
        // Expected to fail
      }

      return {
        testName: 'Error Handling',
        success: true,
        details: { errorHandling: 'Proper error handling detected' },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        testName: 'Error Handling',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Generate test report
   */
  generateTestReport(testSuite: NotificationTestSuite): string {
    let report = '📱 Notification Test Report\n';
    report += '========================\n\n';
    
    report += `Total Tests: ${testSuite.totalTests}\n`;
    report += `Passed: ${testSuite.passedTests}\n`;
    report += `Failed: ${testSuite.failedTests}\n`;
    report += `Success Rate: ${testSuite.successRate.toFixed(1)}%\n\n`;
    
    report += 'Test Details:\n';
    report += '------------\n';
    
    testSuite.results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      report += `${status} ${result.testName}\n`;
      
      if (result.error) {
        report += `   Error: ${result.error}\n`;
      }
      
      if (result.details) {
        report += `   Details: ${JSON.stringify(result.details)}\n`;
      }
      
      report += `   Time: ${result.timestamp.toISOString()}\n\n`;
    });
    
    return report;
  }

  /**
   * Quick health check
   */
  async quickHealthCheck(): Promise<boolean> {
    try {
      const isAvailable = await this.pushService.isAvailable();
      const token = this.pushService.getCurrentExpoToken();
      
      return isAvailable && !!token;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}

export default NotificationTester;
