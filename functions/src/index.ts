/**
 * Firebase Cloud Functions for Universe App
 * Handles server-side push notifications and other backend operations
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

interface AdminPushQueuePayload {
  title: string;
  message: string;
  ctaLabel?: string;
  ctaUrl?: string;
  category?: string;
  deliveryMode?: 'global' | 'localOnly';
  audience?: 'all' | 'students' | 'clubs';
}

interface DeliverySummary {
  tokens: number;
  sent: number;
  failed: number;
  errors: string[];
}

const isExpoPushToken = (token?: unknown): token is string => {
  if (typeof token !== 'string') {
    return false;
  }
  return token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[');
};

const chunkArray = <T>(items: T[], size: number): T[][] => {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
};

const sendExpoBroadcast = async (
    tokens: string[],
    title: string,
    body: string,
    data: Record<string, string>
): Promise<DeliverySummary> => {
  const summary: DeliverySummary = {
    tokens: tokens.length,
    sent: 0,
    failed: 0,
    errors: [],
  };

  if (tokens.length === 0) {
    return summary;
  }

  const chunks = chunkArray(tokens, 100);
  for (const chunk of chunks) {
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'accept-encoding': 'gzip, deflate',
          'content-type': 'application/json',
        },
        body: JSON.stringify(
            chunk.map((token) => ({
              to: token,
              sound: 'default',
              title,
              body,
              data,
              priority: 'high',
            }))),
      });

      const result = await response.json();
      if (!response.ok || !Array.isArray(result.data)) {
        summary.failed += chunk.length;
        const errorMessage =
            result?.errors?.[0]?.message || response.statusText || 'Unknown Expo error';
        summary.errors.push(`Expo batch failed: ${errorMessage}`);
        continue;
      }

      result.data.forEach((item: any, index: number) => {
        if (item?.status === 'ok') {
          summary.sent += 1;
        } else {
          summary.failed += 1;
          const message = item?.message || 'Unknown Expo error';
          summary.errors.push(`Expo(${chunk[index]?.slice(0, 12) || 'token'}): ${message}`);
        }
      });
    } catch (error: any) {
      summary.failed += chunk.length;
      summary.errors.push(`Expo batch exception: ${error?.message || error}`);
    }
  }

  return summary;
};

const sendFcmBroadcast = async (
    tokens: string[],
    title: string,
    body: string,
    data: Record<string, string>
): Promise<DeliverySummary> => {
  const summary: DeliverySummary = {
    tokens: tokens.length,
    sent: 0,
    failed: 0,
    errors: [],
  };

  if (tokens.length === 0) {
    return summary;
  }

  const chunks = chunkArray(tokens, 500);
  for (const chunk of chunks) {
    try {
      const response = await admin.messaging().sendEachForMulticast({
        tokens: chunk,
        notification: {
          title,
          body,
        },
        data,
        android: {
          priority: 'high',
          notification: {
            channelId: 'default',
            sound: 'default',
            color: '#6750A4',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              alert: {
                title,
                body,
              },
            },
          },
        },
      });

      summary.sent += response.successCount;
      summary.failed += response.failureCount;
      response.responses.forEach((result, index) => {
        if (!result.success) {
          summary.errors.push(
              `FCM(${chunk[index]?.slice(0, 12) || 'token'}): ${result.error?.message || 'Unknown error'}`);
        }
      });
    } catch (error: any) {
      summary.failed += chunk.length;
      summary.errors.push(`FCM batch exception: ${error?.message || error}`);
    }
  }

  return summary;
};

export const processAdminPushQueue = functions.firestore
    .document('adminPushQueue/{messageId}')
    .onCreate(async (snap, context) => {
      const payload = snap.data() as AdminPushQueuePayload | undefined;

      if (!payload) {
        console.warn('⚠️ Received empty admin push payload');
        return null;
      }

      if (!payload.title || !payload.message) {
        await snap.ref.update({
          delivered: false,
          status: 'failed',
          error: 'Missing title or message',
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return null;
      }

      if ((payload.deliveryMode || 'global') === 'localOnly') {
        await snap.ref.update({
          delivered: true,
          status: 'local_only',
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return null;
      }

      try {
        const audience = payload.audience || 'all';
        console.log(`📱 Processing admin push for audience: ${audience}`);
        
        const usersSnapshot = await admin.firestore().collection('users').get();
        console.log(`📊 Total users in database: ${usersSnapshot.size}`);

        const expoTokens = new Set<string>();
        const fcmTokens = new Set<string>();
        let totalCandidates = 0;

        usersSnapshot.forEach((doc) => {
          const data = doc.data();
          if (!data) {
            return;
          }

          if (audience === 'students' && data.userType !== 'student') {
            return;
          }

          if (audience === 'clubs' && data.userType !== 'club') {
            return;
          }

          if (data.adminBroadcastOptOut === true) {
            return;
          }

          totalCandidates += 1;

          if (isExpoPushToken(data.expoPushToken)) {
            expoTokens.add(data.expoPushToken);
          }

          if (Array.isArray(data.pushTokens)) {
            data.pushTokens.forEach((token: unknown) => {
              if (isExpoPushToken(token)) {
                expoTokens.add(token);
              }
            });
          }

          if (typeof data.fcmToken === 'string' && data.fcmToken.length > 20) {
            fcmTokens.add(data.fcmToken);
          }
        });

        console.log(`📊 Filtered candidates: ${totalCandidates}, Expo tokens: ${expoTokens.size}, FCM tokens: ${fcmTokens.size}`);

        const dataPayload: Record<string, string> = {
          type: payload.category || 'announcement',
          ctaLabel: payload.ctaLabel || '',
          ctaUrl: payload.ctaUrl || '',
          adminMessageId: context.params.messageId,
        };

        const expoSummary = await sendExpoBroadcast(
            Array.from(expoTokens),
            payload.title,
            payload.message,
            dataPayload);
        const fcmSummary = await sendFcmBroadcast(
            Array.from(fcmTokens),
            payload.title,
            payload.message,
            dataPayload);

        const delivered = expoSummary.sent + fcmSummary.sent > 0;

        console.log(`✅ Admin push processed: ${expoSummary.sent + fcmSummary.sent} sent, ${expoSummary.failed + fcmSummary.failed} failed`);

        await snap.ref.update({
          delivered,
          status: delivered ? 'delivered' : 'failed',
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
          stats: {
            audience,
            totalCandidates,
            expo: expoSummary,
            fcm: fcmSummary,
          },
          errors: [...expoSummary.errors, ...fcmSummary.errors].slice(0, 25),
        });

        return null;
      } catch (error: any) {
        console.error('❌ Failed to process admin push queue:', error);
        console.error('❌ Error details:', {
          message: error?.message,
          code: error?.code,
          stack: error?.stack?.substring(0, 500),
        });
        
        await snap.ref.update({
          delivered: false,
          status: 'failed',
          error: error?.message || 'Unknown error',
          errorCode: error?.code || 'unknown',
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return null;
      }
    });

/**
 * Automatically send push notification when a notification document is created
 * This is triggered by Firestore onCreate event
 */
export const sendPushNotification = functions.firestore
  .document('notifications/{notificationId}')
  .onCreate(async (snap, context) => {
    const notification = snap.data();
    const { userId, title, body, type, data } = notification;

    console.log(`📱 Processing push notification for user ${userId}: ${title}`);

    try {
      // Get user's tokens from Firestore
      const userDoc = await admin.firestore()
        .collection('users')
        .doc(userId)
        .get();

      const userData = userDoc.data();
      
      if (!userData) {
        console.log(`❌ User not found: ${userId}`);
        await snap.ref.update({
          pushError: 'User not found',
          pushAttemptedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return null;
      }

      let fcmSent = false;
      let expoSent = false;
      const errors: string[] = [];

      // Send via FCM if token exists
      if (userData.fcmToken) {
        try {
          const message: admin.messaging.Message = {
            token: userData.fcmToken,
            notification: {
              title: title,
              body: body,
            },
            data: {
              type: type || 'default',
              notificationId: context.params.notificationId,
              ...(data || {}),
            },
            android: {
              priority: 'high',
              notification: {
                channelId: type === 'event' ? 'events' : type === 'club' ? 'clubs' : 'default',
                color: '#6750A4',
                sound: 'default',
              },
            },
          };

          await admin.messaging().send(message);
          console.log(`✅ FCM notification sent to ${userId}`);
          fcmSent = true;
        } catch (fcmError: any) {
          console.error(`❌ FCM error for ${userId}:`, fcmError.message);
          errors.push(`FCM: ${fcmError.message}`);
          
          // If token is invalid, remove it
          if (fcmError.code === 'messaging/invalid-registration-token' || 
              fcmError.code === 'messaging/registration-token-not-registered') {
            await admin.firestore().collection('users').doc(userId).update({
              fcmToken: admin.firestore.FieldValue.delete(),
            });
            console.log(`🗑️ Removed invalid FCM token for ${userId}`);
          }
        }
      }

      // Send via Expo if token exists
      if (userData.expoPushToken && 
          (userData.expoPushToken.startsWith('ExponentPushToken[') || 
           userData.expoPushToken.startsWith('ExpoPushToken['))) {
        try {
          const expoMessage = {
            to: userData.expoPushToken,
            sound: 'default',
            title: title,
            body: body,
            data: data || {},
            priority: 'high',
            badge: 1,
          };

          const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Accept-encoding': 'gzip, deflate',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(expoMessage),
          });

          const expoResult = await expoResponse.json();
          
          if (expoResponse.ok && expoResult.data?.[0]?.status === 'ok') {
            console.log(`✅ Expo notification sent to ${userId}`);
            expoSent = true;
          } else {
            const errorMsg = expoResult.data?.[0]?.message || 'Unknown Expo error';
            console.error(`❌ Expo error for ${userId}:`, errorMsg);
            errors.push(`Expo: ${errorMsg}`);
            
            // Remove invalid Expo token
            if (errorMsg.includes('DeviceNotRegistered')) {
              await admin.firestore().collection('users').doc(userId).update({
                expoPushToken: admin.firestore.FieldValue.delete(),
              });
              console.log(`🗑️ Removed invalid Expo token for ${userId}`);
            }
          }
        } catch (expoError: any) {
          console.error(`❌ Expo error for ${userId}:`, expoError.message);
          errors.push(`Expo: ${expoError.message}`);
        }
      }

      // Update notification document with results
      const updateData: any = {
        pushAttemptedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (fcmSent || expoSent) {
        updateData.pushSent = true;
        updateData.pushSentAt = admin.firestore.FieldValue.serverTimestamp();
        updateData.sentVia = [];
        if (fcmSent) updateData.sentVia.push('fcm');
        if (expoSent) updateData.sentVia.push('expo');
        console.log(`✅ Push sent to ${userId} via ${updateData.sentVia.join(', ')}`);
      }

      if (errors.length > 0) {
        updateData.pushErrors = errors;
        console.log(`⚠️ Push errors for ${userId}:`, errors.slice(0, 3));
      }

      if (!fcmSent && !expoSent) {
        updateData.pushError = errors.length > 0 ? errors.join('; ') : 'No valid tokens found';
        console.warn(`❌ No push sent to ${userId}: ${updateData.pushError}`);
      }

      await snap.ref.update(updateData);

      return null;
    } catch (error: any) {
      console.error(`❌ Failed to send push notification to ${userId}:`, error);
      console.error('❌ Error details:', {
        message: error?.message,
        code: error?.code,
      });
      
      await snap.ref.update({
        pushError: error.message,
        pushAttemptedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return null;
    }
  });

/**
 * Manually send push notification via callable function
 * Use this for immediate/critical notifications
 */
export const sendManualNotification = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { userId, title, body, type, customData } = data;

  if (!userId || !title || !body) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
  }

  console.log(`📱 Manual notification request for ${userId}: ${title}`);

  try {
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(userId)
      .get();

    const userData = userDoc.data();
    
    if (!userData) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }

    let sent = false;

    // Send to FCM token if available
    if (userData.fcmToken) {
      try {
        await admin.messaging().send({
          token: userData.fcmToken,
          notification: { title, body },
          data: { 
            type: type || 'default', 
            ...(customData || {})
          },
          android: {
            priority: 'high',
            notification: {
              channelId: type === 'event' ? 'events' : type === 'club' ? 'clubs' : 'default',
              color: '#6750A4',
            },
          },
        });
        sent = true;
        console.log(`✅ Manual FCM notification sent to ${userId}`);
      } catch (fcmError: any) {
        console.error(`❌ Manual FCM error:`, fcmError.message);
      }
    }

    // Send to Expo token if available
    if (userData.expoPushToken) {
      try {
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: userData.expoPushToken,
            title,
            body,
            data: customData,
            priority: 'high',
          }),
        });
        sent = true;
        console.log(`✅ Manual Expo notification sent to ${userId}`);
      } catch (expoError: any) {
        console.error(`❌ Manual Expo error:`, expoError.message);
      }
    }

    if (!sent) {
      throw new functions.https.HttpsError('failed-precondition', 'No valid push tokens found');
    }

    return { success: true, message: 'Notification sent successfully' };
  } catch (error: any) {
    console.error('❌ Manual notification error:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Batch send notifications to multiple users
 */
export const sendBatchNotifications = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { userIds, title, body, type, customData } = data;

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid userIds array');
  }

  if (!title || !body) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing title or body');
  }

  console.log(`📱 Batch notification request for ${userIds.length} users: ${title}`);

  try {
    const results = {
      total: userIds.length,
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process in batches of 500 (Firestore batch limit)
    const batchSize = 500;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batchUserIds = userIds.slice(i, i + batchSize);
      
      const promises = batchUserIds.map(async (userId: string) => {
        try {
          // Create notification document (will trigger sendPushNotification)
          await admin.firestore().collection('notifications').add({
            userId,
            title,
            body,
            type: type || 'default',
            data: customData || {},
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            read: false,
            pushSent: false,
          });
          results.sent++;
        } catch (error: any) {
          results.failed++;
          results.errors.push(`${userId}: ${error.message}`);
        }
      });

      await Promise.all(promises);
    }

    console.log(`✅ Batch complete: ${results.sent} sent, ${results.failed} failed`);
    return results;
  } catch (error: any) {
    console.error('❌ Batch notification error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Clean up old notifications (run daily)
 */
export const cleanupOldNotifications = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    try {
      const snapshot = await admin.firestore()
        .collection('notifications')
        .where('createdAt', '<', thirtyDaysAgo)
        .limit(500)
        .get();

      if (snapshot.empty) {
        console.log('No old notifications to clean up');
        return null;
      }

      const batch = admin.firestore().batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      console.log(`✅ Cleaned up ${snapshot.size} old notifications`);
      return null;
    } catch (error) {
      console.error('❌ Cleanup error:', error);
      return null;
    }
  });

/**
 * Helper function to create notification
 */
async function createNotification(userId: string, title: string, body: string, type: string, data?: any) {
  return await admin.firestore().collection('notifications').add({
    userId,
    title,
    body,
    type,
    data: data || {},
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    read: false,
    pushSent: false,
  });
}

/**
 * Send follow notification
 */
export const sendFollowNotification = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { followerId, followedId, followerName } = data;
  
  await createNotification(
    followedId,
    'Yeni Takipçi',
    `${followerName} sizi takip etmeye başladı`,
    'follow',
    { followerId }
  );

  return { success: true };
});

/**
 * Send club follow notification
 */
export const sendClubFollowNotification = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { followerId, clubId, followerName } = data;
  
  // Get club admin IDs
  const clubDoc = await admin.firestore().collection('clubs').doc(clubId).get();
  const clubData = clubDoc.data();
  
  if (clubData && clubData.adminIds) {
    const promises = clubData.adminIds.map((adminId: string) => 
      createNotification(
        adminId,
        'Yeni Takipçi',
        `${followerName} kulübünüzü takip etmeye başladı`,
        'club_follow',
        { followerId, clubId }
      )
    );
    await Promise.all(promises);
  }

  return { success: true };
});

/**
 * Send like notification
 */
export const sendLikeNotification = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { likerId, postOwnerId, likerName, postType } = data;
  
  await createNotification(
    postOwnerId,
    'Yeni Beğeni',
    `${likerName} ${postType === 'event' ? 'etkinliğinizi' : 'gönderinizi'} beğendi`,
    'like',
    { likerId, postType }
  );

  return { success: true };
});

/**
 * Send comment notification
 */
export const sendCommentNotification = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { commenterId, postOwnerId, commenterName, commentText } = data;
  
  await createNotification(
    postOwnerId,
    'Yeni Yorum',
    `${commenterName}: ${commentText}`,
    'comment',
    { commenterId }
  );

  return { success: true };
});

/**
 * Send event join notification
 */
export const sendEventJoinNotification = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { userId, eventId, eventTitle, userName } = data;
  
  // Get event creator
  const eventDoc = await admin.firestore().collection('events').doc(eventId).get();
  const eventData = eventDoc.data();
  
  if (eventData && eventData.creatorId) {
    await createNotification(
      eventData.creatorId,
      'Yeni Katılımcı',
      `${userName} "${eventTitle}" etkinliğine katıldı`,
      'event_join',
      { userId, eventId }
    );
  }

  return { success: true };
});

/**
 * Send member request notification
 */
export const sendMemberRequestNotification = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { userId, clubId, userName, clubName } = data;
  
  // Get club admins
  const clubDoc = await admin.firestore().collection('clubs').doc(clubId).get();
  const clubData = clubDoc.data();
  
  if (clubData && clubData.adminIds) {
    const promises = clubData.adminIds.map((adminId: string) => 
      createNotification(
        adminId,
        'Yeni Üyelik Talebi',
        `${userName} "${clubName}" kulübüne katılmak istiyor`,
        'member_request',
        { userId, clubId }
      )
    );
    await Promise.all(promises);
  }

  return { success: true };
});

/**
 * Send member approved notification
 */
export const sendMemberApprovedNotification = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { userId, clubId, clubName } = data;
  
  await createNotification(
    userId,
    'Üyelik Onaylandı',
    `"${clubName}" kulübüne üyeliğiniz onaylandı`,
    'member_approved',
    { clubId }
  );

  return { success: true };
});

/**
 * Send member rejected notification
 */
export const sendMemberRejectedNotification = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { userId, clubId, clubName } = data;
  
  await createNotification(
    userId,
    'Üyelik Reddedildi',
    `"${clubName}" kulübüne üyelik talebiniz reddedildi`,
    'member_rejected',
    { clubId }
  );

  return { success: true };
});

/**
 * Send event created notification
 */
export const sendEventCreatedNotification = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { eventId, eventTitle, clubId, clubName, memberIds } = data;
  
  if (memberIds && Array.isArray(memberIds)) {
    const promises = memberIds.map((memberId: string) => 
      createNotification(
        memberId,
        'Yeni Etkinlik',
        `${clubName} yeni bir etkinlik oluşturdu: ${eventTitle}`,
        'event_created',
        { eventId, clubId }
      )
    );
    await Promise.all(promises);
  }

  return { success: true };
});

/**
 * Send event updated notification
 */
export const sendEventUpdatedNotification = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { eventId, eventTitle, participantIds } = data;
  
  if (participantIds && Array.isArray(participantIds)) {
    const promises = participantIds.map((participantId: string) => 
      createNotification(
        participantId,
        'Etkinlik Güncellendi',
        `"${eventTitle}" etkinliğinde değişiklikler yapıldı`,
        'event_updated',
        { eventId }
      )
    );
    await Promise.all(promises);
  }

  return { success: true };
});

/**
 * Send event cancelled notification
 */
export const sendEventCancelledNotification = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { eventId, eventTitle, participantIds } = data;
  
  if (participantIds && Array.isArray(participantIds)) {
    const promises = participantIds.map((participantId: string) => 
      createNotification(
        participantId,
        'Etkinlik İptal Edildi',
        `"${eventTitle}" etkinliği iptal edildi`,
        'event_cancelled',
        { eventId }
      )
    );
    await Promise.all(promises);
  }

  return { success: true };
});

/**
 * Send system notification
 */
export const sendSystemNotification = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { userId, title, message } = data;
  
  await createNotification(
    userId,
    title,
    message,
    'system',
    {}
  );

  return { success: true };
});

/**
 * Send announcement notification
 */
export const sendAnnouncementNotification = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { clubId, title, message, memberIds } = data;
  
  if (memberIds && Array.isArray(memberIds)) {
    const promises = memberIds.map((memberId: string) => 
      createNotification(
        memberId,
        title,
        message,
        'announcement',
        { clubId }
      )
    );
    await Promise.all(promises);
  }

  return { success: true };
});

/**
 * Send notification to user
 */
export const sendNotificationToUser = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { userId, title, body, type, customData } = data;
  
  await createNotification(userId, title, body, type || 'default', customData);

  return { success: true };
});

/**
 * Send notification to all users
 */
export const sendNotificationToAllUsers = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { title, body, type } = data;
  
  // Get all users
  const usersSnapshot = await admin.firestore().collection('users').limit(1000).get();
  
  const promises = usersSnapshot.docs.map(doc => 
    createNotification(doc.id, title, body, type || 'default', {})
  );
  
  await Promise.all(promises);

  return { success: true, count: usersSnapshot.size };
});

/**
 * Send notification to topic
 */
export const sendNotificationToTopic = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { topic, title, body } = data;
  
  await admin.messaging().send({
    topic: topic,
    notification: { title, body },
    android: {
      priority: 'high',
      notification: {
        channelId: 'default',
        color: '#6750A4',
      },
    },
  });

  return { success: true };
});







