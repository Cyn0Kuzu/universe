import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

interface PushMessage {
  to: string;
  sound?: 'default';
  title?: string;
  body?: string;
  data?: any;
  badge?: number;
  channelId?: string;
  priority?: 'default' | 'normal' | 'high';
  subtitle?: string;
}

interface PushNotificationResult {
  success: boolean;
  message?: string;
  error?: string;
  notificationId?: string;
}

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Send local push notification
export const sendLocalNotification = async (
  title: string,
  body: string,
  data?: any
): Promise<PushNotificationResult> => {
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // Show immediately
    });

    return {
      success: true,
      message: 'Local notification sent successfully',
      notificationId
    };
  } catch (error) {
    console.error('Error sending local notification:', error);
    return {
      success: false,
      error: 'Failed to send local notification'
    };
  }
};

// Send push notification via Expo API (for server use)
export const sendExpoPush = async (
  pushToken: string,
  title: string,
  body: string,
  data?: any
): Promise<PushNotificationResult> => {
  try {
    // This would typically be called from a server
    // For client-side, we'll use local notifications
    console.log('Push notification would be sent:', {
      to: pushToken,
      title,
      body,
      data
    });

    // Fallback to local notification for development
    return await sendLocalNotification(title, body, data);
  } catch (error) {
    console.error('Error in sendExpoPush:', error);
    return {
      success: false,
      error: 'Unexpected error occurred'
    };
  }
};

// Send push notifications to multiple tokens
export const sendBulkExpoPush = async (
  pushTokens: string[],
  title: string,
  body: string,
  data?: any
): Promise<PushNotificationResult[]> => {
  try {
    const results: PushNotificationResult[] = [];

    for (const token of pushTokens) {
      const result = await sendExpoPush(token, title, body, data);
      results.push(result);
    }

    return results;
  } catch (error) {
    console.error('Error in sendBulkExpoPush:', error);
    return [{
      success: false,
      error: 'Unexpected error occurred'
    }];
  }
};

// Get push token for the current device
export const getPushToken = async (): Promise<string | null> => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission not granted');
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId,
    });

    return token.data;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
};

// Validate push token format
export const validatePushToken = (token: string): boolean => {
  return token.startsWith('ExponentPushToken[') && token.endsWith(']');
};

// Configure notification channel for Android
export const configureNotificationChannel = async (): Promise<void> => {
  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'default',
    });
  } catch (error) {
    console.error('Error configuring notification channel:', error);
  }
};
