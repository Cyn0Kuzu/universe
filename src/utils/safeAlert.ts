/**
 * Safe Alert Wrapper
 * Prevents Android Dialog crashes by wrapping Alert.alert in try-catch
 */

import { Alert, Platform } from 'react-native';

export const safeAlert = (
  title: string,
  message?: string,
  buttons?: any[],
  options?: any
): void => {
  try {
    // Add a small delay to ensure UI is ready
    setTimeout(() => {
      try {
        Alert.alert(title, message, buttons, options);
      } catch (innerError) {
        console.error('❌ Alert.alert inner error:', innerError);
        // Fallback: just log the message
        console.log(`📢 Alert: ${title} - ${message}`);
      }
    }, 100);
  } catch (error) {
    console.error('❌ Safe alert error:', error);
    console.log(`📢 Alert: ${title} - ${message}`);
  }
};

export default safeAlert;

