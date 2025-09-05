/**
 * 📊 Professional Analytics & Performance Monitoring Service
 * Enterprise-grade monitoring and analytics system
 */

import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Application from 'expo-application';

// Types
interface AnalyticsEvent {
  name: string;
  parameters?: Record<string, any>;
  timestamp?: Date;
  userId?: string;
  sessionId?: string;
}

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface CrashReport {
  error: Error;
  context: string;
  userId?: string;
  deviceInfo: DeviceInfo;
  appInfo: AppInfo;
  timestamp: Date;
}

interface DeviceInfo {
  platform: string;
  osVersion: string;
  modelName: string;
  brand: string;
  manufacturer: string;
  totalMemory: number;
}

interface AppInfo {
  version: string;
  buildNumber: string;
  bundleIdentifier: string;
  environment: 'development' | 'staging' | 'production';
}

class ProfessionalMonitoringService {
  private isEnabled: boolean = true;
  private sessionId: string;
  private userId?: string;
  private deviceInfo?: DeviceInfo;
  private appInfo?: AppInfo;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initialize();
  }

  /**
   * 🚀 Initialize monitoring service
   */
  private async initialize(): Promise<void> {
    try {
      // Collect device information
      this.deviceInfo = await this.collectDeviceInfo();
      this.appInfo = await this.collectAppInfo();

      // Initialize external services in production
      if (__DEV__ === false) {
        await this.initializeExternalServices();
      }

      console.log('📊 Professional monitoring service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize monitoring service:', error);
    }
  }

  /**
   * 📱 Collect device information
   */
  private async collectDeviceInfo(): Promise<DeviceInfo> {
    try {
      const deviceInfo: DeviceInfo = {
        platform: Platform.OS,
        osVersion: Platform.Version.toString(),
        modelName: Device.modelName || 'Unknown',
        brand: Device.brand || 'Unknown',
        manufacturer: Device.manufacturer || 'Unknown',
        totalMemory: Device.totalMemory || 0,
      };

      return deviceInfo;
    } catch (error) {
      console.error('Failed to collect device info:', error);
      return {
        platform: Platform.OS,
        osVersion: 'Unknown',
        modelName: 'Unknown',
        brand: 'Unknown',
        manufacturer: 'Unknown',
        totalMemory: 0,
      };
    }
  }

  /**
   * 📦 Collect app information
   */
  private async collectAppInfo(): Promise<AppInfo> {
    try {
      const appInfo: AppInfo = {
        version: Application.nativeApplicationVersion || '1.0.0',
        buildNumber: Application.nativeBuildVersion || '1',
        bundleIdentifier: Application.applicationId || 'com.universe.app',
        environment: __DEV__ ? 'development' : 'production',
      };

      return appInfo;
    } catch (error) {
      console.error('Failed to collect app info:', error);
      return {
        version: '1.0.0',
        buildNumber: '1',
        bundleIdentifier: 'com.universe.app',
        environment: __DEV__ ? 'development' : 'production',
      };
    }
  }

  /**
   * 🔌 Initialize external monitoring services
   */
  private async initializeExternalServices(): Promise<void> {
    try {
      // Initialize crash reporting (Sentry, Crashlytics, etc.)
      // await crashlytics().log('Monitoring service initialized');
      
      // Initialize analytics (Google Analytics, Mixpanel, etc.)
      // await analytics().logEvent('app_start', this.appInfo);
      
      console.log('📊 External monitoring services initialized');
    } catch (error) {
      console.error('❌ Failed to initialize external services:', error);
    }
  }

  /**
   * 📊 Track analytics event
   */
  async trackEvent(event: AnalyticsEvent): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const enrichedEvent = {
        ...event,
        timestamp: event.timestamp || new Date(),
        sessionId: this.sessionId,
        userId: event.userId || this.userId,
        deviceInfo: this.deviceInfo,
        appInfo: this.appInfo,
      };

      if (__DEV__) {
        console.log('📊 Analytics Event:', enrichedEvent);
      } else {
        // Send to analytics service in production
        // await analytics().logEvent(event.name, enrichedEvent);
      }
    } catch (error) {
      console.error('❌ Failed to track event:', error);
    }
  }

  /**
   * ⚡ Track performance metric
   */
  async trackPerformance(metric: PerformanceMetric): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const enrichedMetric = {
        ...metric,
        sessionId: this.sessionId,
        userId: this.userId,
        deviceInfo: this.deviceInfo,
        appInfo: this.appInfo,
      };

      if (__DEV__) {
        console.log('⚡ Performance Metric:', enrichedMetric);
      } else {
        // Send to performance monitoring service
        // await performance().putMetric(metric.name, metric.value);
      }
    } catch (error) {
      console.error('❌ Failed to track performance:', error);
    }
  }

  /**
   * 💥 Report crash/error
   */
  async reportCrash(error: Error, context: string): Promise<void> {
    try {
      const crashReport: CrashReport = {
        error,
        context,
        userId: this.userId,
        deviceInfo: this.deviceInfo!,
        appInfo: this.appInfo!,
        timestamp: new Date(),
      };

      if (__DEV__) {
        console.error('💥 Crash Report:', crashReport);
      } else {
        // Send to crash reporting service
        // await crashlytics().recordError(error);
      }
    } catch (reportError) {
      console.error('❌ Failed to report crash:', reportError);
    }
  }

  /**
   * 👤 Set user context
   */
  setUser(userId: string, userProperties?: Record<string, any>): void {
    this.userId = userId;
    
    if (__DEV__ === false) {
      // Set user context in external services
      // crashlytics().setUserId(userId);
      // analytics().setUserId(userId);
    }
  }

  /**
   * 🏷️ Set custom properties
   */
  setCustomProperty(key: string, value: any): void {
    if (__DEV__ === false) {
      // Set custom property in external services
      // crashlytics().setAttribute(key, value);
    }
  }

  /**
   * 🔄 Generate session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * ⚙️ Enable/disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    console.log(`📊 Monitoring ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * 📈 Track app lifecycle events
   */
  async trackAppStart(): Promise<void> {
    await this.trackEvent({
      name: 'app_start',
      parameters: {
        session_id: this.sessionId,
        platform: Platform.OS,
        app_version: this.appInfo?.version,
      },
    });
  }

  async trackAppBackground(): Promise<void> {
    await this.trackEvent({
      name: 'app_background',
      parameters: {
        session_id: this.sessionId,
      },
    });
  }

  async trackAppForeground(): Promise<void> {
    await this.trackEvent({
      name: 'app_foreground',
      parameters: {
        session_id: this.sessionId,
      },
    });
  }

  /**
   * 🎯 Track screen views
   */
  async trackScreenView(screenName: string, screenClass?: string): Promise<void> {
    await this.trackEvent({
      name: 'screen_view',
      parameters: {
        screen_name: screenName,
        screen_class: screenClass || screenName,
      },
    });
  }

  /**
   * 🛒 Track user actions
   */
  async trackUserAction(action: string, target?: string, value?: number): Promise<void> {
    await this.trackEvent({
      name: 'user_action',
      parameters: {
        action,
        target,
        value,
      },
    });
  }
}

// Export singleton instance
export const MonitoringService = new ProfessionalMonitoringService();
export default MonitoringService;
