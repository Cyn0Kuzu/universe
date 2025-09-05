/**
 * 🔧 Professional App Configuration Manager
 * Centralized configuration management for all environments
 */

import Constants from 'expo-constants';

// Environment types
export type Environment = 'development' | 'staging' | 'production';

// Configuration interface
export interface AppConfig {
  // Environment
  environment: Environment;
  debug: boolean;
  
  // API Configuration
  apiUrl: string;
  apiTimeout: number;
  
  // Firebase Configuration
  firebase: {
    projectId: string;
    apiKey: string;
    authDomain: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };
  
  // Feature Flags
  features: {
    pushNotifications: boolean;
    analytics: boolean;
    crashReporting: boolean;
    performanceMonitoring: boolean;
    deepLinking: boolean;
    biometricAuth: boolean;
  };
  
  // UI Configuration
  ui: {
    enableAnimations: boolean;
    enableHapticFeedback: boolean;
    themeMode: 'light' | 'dark' | 'auto';
  };
  
  // Performance Configuration
  performance: {
    enableHermes: boolean;
    enableFastRefresh: boolean;
    enableMemoryOptimization: boolean;
  };
  
  // Security Configuration
  security: {
    enableSSLPinning: boolean;
    enableJailbreakDetection: boolean;
    sessionTimeout: number;
  };
  
  // App Information
  app: {
    name: string;
    version: string;
    buildNumber: string;
    bundleIdentifier: string;
  };
}

class ConfigManager {
  private config: AppConfig;

  constructor() {
    this.config = this.loadConfiguration();
  }

  /**
   * 📋 Load configuration based on environment
   */
  private loadConfiguration(): AppConfig {
    const environment = this.determineEnvironment();
    
    const baseConfig: AppConfig = {
      environment,
      debug: __DEV__,
      
      apiUrl: this.getEnvValue('API_URL', 'https://api.universe.com'),
      apiTimeout: 30000,
      
      firebase: {
        projectId: this.getEnvValue('FIREBASE_PROJECT_ID', 'universe-a6f60'),
        apiKey: this.getEnvValue('FIREBASE_API_KEY', 'AIzaSyDcaOq6dViuwHtnBdOoUhuIPGl21_L25Uc'),
        authDomain: this.getEnvValue('FIREBASE_AUTH_DOMAIN', 'universe-a6f60.firebaseapp.com'),
        storageBucket: this.getEnvValue('FIREBASE_STORAGE_BUCKET', 'universe-a6f60.appspot.com'),
        messagingSenderId: this.getEnvValue('FIREBASE_MESSAGING_SENDER_ID', '946853543876'),
        appId: this.getEnvValue('FIREBASE_APP_ID', '1:946853543876:android:7a40780d639fa5f763ae91'),
      },
      
      features: {
        pushNotifications: this.getBoolEnvValue('ENABLE_PUSH_NOTIFICATIONS', true),
        analytics: this.getBoolEnvValue('ENABLE_ANALYTICS', !__DEV__),
        crashReporting: this.getBoolEnvValue('ENABLE_CRASH_REPORTING', !__DEV__),
        performanceMonitoring: this.getBoolEnvValue('ENABLE_PERFORMANCE_MONITORING', !__DEV__),
        deepLinking: true,
        biometricAuth: true,
      },
      
      ui: {
        enableAnimations: true,
        enableHapticFeedback: true,
        themeMode: 'auto',
      },
      
      performance: {
        enableHermes: this.getBoolEnvValue('ENABLE_HERMES', true),
        enableFastRefresh: __DEV__,
        enableMemoryOptimization: !__DEV__,
      },
      
      security: {
        enableSSLPinning: !__DEV__,
        enableJailbreakDetection: !__DEV__,
        sessionTimeout: 30 * 60 * 1000, // 30 minutes
      },
      
      app: {
        name: 'Universe - Üniversite Evreni',
        version: Constants.expoConfig?.version || '1.5.0',
        buildNumber: Constants.expoConfig?.android?.versionCode?.toString() || '5',
        bundleIdentifier: 'com.universekampus.app',
      },
    };

    // Environment-specific overrides
    switch (environment) {
      case 'development':
        return this.applyDevelopmentConfig(baseConfig);
      case 'staging':
        return this.applyStagingConfig(baseConfig);
      case 'production':
        return this.applyProductionConfig(baseConfig);
      default:
        return baseConfig;
    }
  }

  /**
   * 🌍 Determine current environment
   */
  private determineEnvironment(): Environment {
    if (__DEV__) return 'development';
    
    const envFromConfig = this.getEnvValue('EXPO_ENV', 'production');
    return envFromConfig as Environment;
  }

  /**
   * 🔧 Development environment configuration
   */
  private applyDevelopmentConfig(config: AppConfig): AppConfig {
    return {
      ...config,
      debug: true,
      apiUrl: 'https://api-dev.universe.com',
      features: {
        ...config.features,
        analytics: false,
        crashReporting: false,
        performanceMonitoring: false,
      },
      security: {
        ...config.security,
        enableSSLPinning: false,
        enableJailbreakDetection: false,
      },
    };
  }

  /**
   * 🧪 Staging environment configuration
   */
  private applyStagingConfig(config: AppConfig): AppConfig {
    return {
      ...config,
      debug: true,
      apiUrl: 'https://api-staging.universe.com',
      features: {
        ...config.features,
        analytics: true,
        crashReporting: true,
        performanceMonitoring: true,
      },
      security: {
        ...config.security,
        enableSSLPinning: true,
        enableJailbreakDetection: false,
      },
    };
  }

  /**
   * 🚀 Production environment configuration
   */
  private applyProductionConfig(config: AppConfig): AppConfig {
    return {
      ...config,
      debug: false,
      features: {
        ...config.features,
        analytics: true,
        crashReporting: true,
        performanceMonitoring: true,
      },
      security: {
        ...config.security,
        enableSSLPinning: true,
        enableJailbreakDetection: true,
      },
    };
  }

  /**
   * 📖 Get environment variable value
   */
  private getEnvValue(key: string, defaultValue: string): string {
    return Constants.expoConfig?.extra?.[key] || 
           process.env[key] || 
           defaultValue;
  }

  /**
   * ✅ Get boolean environment variable value
   */
  private getBoolEnvValue(key: string, defaultValue: boolean): boolean {
    const value = this.getEnvValue(key, defaultValue.toString());
    return value.toLowerCase() === 'true';
  }

  /**
   * 🔍 Get configuration value
   */
  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }

  /**
   * 📊 Get nested configuration value
   */
  getFeature(feature: keyof AppConfig['features']): boolean {
    return this.config.features[feature];
  }

  getFirebaseConfig(): AppConfig['firebase'] {
    return this.config.firebase;
  }

  getAppInfo(): AppConfig['app'] {
    return this.config.app;
  }

  /**
   * 🔧 Check if feature is enabled
   */
  isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
    return this.config.features[feature];
  }

  /**
   * 🌍 Check environment
   */
  isDevelopment(): boolean {
    return this.config.environment === 'development';
  }

  isStaging(): boolean {
    return this.config.environment === 'staging';
  }

  isProduction(): boolean {
    return this.config.environment === 'production';
  }

  /**
   * 🐛 Debug mode check
   */
  isDebugMode(): boolean {
    return this.config.debug;
  }

  /**
   * 📋 Get full configuration (for debugging)
   */
  getAllConfig(): AppConfig {
    return { ...this.config };
  }

  /**
   * 🔄 Reload configuration
   */
  reload(): void {
    this.config = this.loadConfiguration();
    console.log('🔄 Configuration reloaded for environment:', this.config.environment);
  }
}

// Export singleton instance
export const Config = new ConfigManager();
export default Config;
