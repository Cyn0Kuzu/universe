/**
 * Firebase Cloud Functions for Universe App
 * Handles server-side push notifications and other backend operations
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

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
      }

      if (errors.length > 0) {
        updateData.pushErrors = errors;
      }

      if (!fcmSent && !expoSent) {
        updateData.pushError = errors.length > 0 ? errors.join('; ') : 'No valid tokens found';
      }

      await snap.ref.update(updateData);

      return null;
    } catch (error: any) {
      console.error(`❌ Failed to send push notification to ${userId}:`, error);
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







