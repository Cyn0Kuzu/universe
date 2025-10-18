/**
 * React Native Warnings Fix
 * Addresses common React Native warnings and improves performance
 */

import { LogBox } from 'react-native';

/**
 * Suppress non-critical warnings to reduce log noise
 */
export const suppressNonCriticalWarnings = () => {
  // Suppress specific warnings that are not critical
  LogBox.ignoreLogs([
    // View manager warnings
    'Could not find generated setter for class',
    'Don\'t know how to round that drawable',
    
    // SafeAreaView warnings
    'Timed out waiting for layout',
    
    // Memory warnings (non-severe)
    'Memory warning (pressure level: TRIM_MEMORY_UI_HIDDEN)',
    
    // React Native internal warnings
    'Tried to update size of non-existent tag',
    'Attempt to set local data for view with unknown tag',
    
    // Expo warnings
    'The expo-updates system is explicitly disabled',
    
    // Firebase warnings
    'App measurement disabled via the manifest',
    
    // Performance warnings (non-critical)
    'Slow Looper main',
  ]);
};

/**
 * Initialize warning suppression
 */
export const initializeWarningSuppression = () => {
  suppressNonCriticalWarnings();
  
  // Additional configuration for production
  if (__DEV__ === false) {
    LogBox.ignoreAllLogs(true);
  }
};

/**
 * Custom warning handler for critical warnings only
 */
export const setupCustomWarningHandler = () => {
  const originalWarn = console.warn;
  
  console.warn = (...args) => {
    const message = args.join(' ');
    
    // Only show critical warnings
    const criticalWarnings = [
      'Error:',
      'Failed to',
      'Cannot',
      'Exception:',
      'Fatal:',
      'Critical:',
    ];
    
    const isCritical = criticalWarnings.some(keyword => 
      message.toLowerCase().includes(keyword.toLowerCase())
    );
    
    if (isCritical) {
      originalWarn(...args);
    }
  };
};

/**
 * Performance monitoring for warnings
 */
export const monitorPerformanceWarnings = () => {
  const originalWarn = console.warn;
  
  console.warn = (...args) => {
    const message = args.join(' ');
    
    // Monitor performance-related warnings
    if (message.includes('Skipped') && message.includes('frames')) {
      console.log('🚨 Performance Warning:', message);
      // Could trigger performance optimization here
    }
    
    originalWarn(...args);
  };
};

export default {
  suppressNonCriticalWarnings,
  initializeWarningSuppression,
  setupCustomWarningHandler,
  monitorPerformanceWarnings,
};




