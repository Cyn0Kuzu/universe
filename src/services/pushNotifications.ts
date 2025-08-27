/**
 * Push Notifications Legacy Service
 * Basic push notification functionality
 */
export const sendExpoPush = async (tokens: string[], notification: any) => {
  try {
    const messages = tokens.map(token => ({
      to: token,
      sound: 'default',
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
    }));

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    return await response.json();
  } catch (error) {
    console.error('Failed to send push notification:', error);
    throw error;
  }
};