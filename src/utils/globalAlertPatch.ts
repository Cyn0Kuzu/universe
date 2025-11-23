/**
 * Global Alert Patch
 * Completely disables Alert.alert to prevent Android Dialog NullPointerException crashes
 * Shows messages in console instead
 */

import { Alert, ToastAndroid, Platform } from 'react-native';

let isPatched = false;

export const patchGlobalAlert = () => {
  if (isPatched) {
    return;
  }

  const originalAlert = Alert.alert;

  (Alert as any).alert = (
    title: string,
    message?: string,
    buttons?: any[],
    options?: any
  ) => {
    try {
      console.log(`📢 Alert: ${title}${message ? ' - ' + message : ''}`);
      
      // Use Android Toast instead of Dialog (safer)
      if (Platform.OS === 'android' && ToastAndroid) {
        const fullMessage = message ? `${title}: ${message}` : title;
        ToastAndroid.show(fullMessage, ToastAndroid.LONG);
      } else {
        // iOS - use original Alert but with safety delay
        setTimeout(() => {
          try {
            originalAlert(title, message, buttons, options);
          } catch (innerError) {
            console.error('❌ Alert.alert inner error:', innerError);
          }
        }, 100);
      }
    } catch (error) {
      console.error('❌ Alert patch error:', error);
    }
  };

  isPatched = true;
  console.log('✅ Global Alert.alert patched (Android uses Toast, iOS uses delayed Alert)');
};

export default patchGlobalAlert;

