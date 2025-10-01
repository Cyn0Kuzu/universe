/**
 * 💬 Comment Management System
 * Yorum işlemleri ve detaylı bildirim sistemi entegrasyonu
 */

import { firestore, firebase } from './config';
import { ClubStatsService } from '../services/clubStatsService';
import { ClubNotificationService } from '../services/clubNotificationService';
import { activityLogger } from '../services/activityLogger';
import { userActivityService } from '../services/enhancedUserActivityService';
import { DetailedNotificationService } from '../services/detailedNotificationService';
import { UnifiedNotificationService } from '../services/unifiedNotificationService';
interface CommentData {
  id?: string;
  eventId: string;
  userId: string;
  userName: string;
  userProfileImage?: string;
  content: string;
  createdAt?: firebase.firestore.Timestamp;
  likesCount?: number;
  repliesCount?: number;
  parentCommentId?: string; // For replies
}

/**
 * 💬 Etkinliğe yorum ekleme
 */
export const addEventComment = async (
  eventId: string,
  userId: string,
  content: string,
  userName: string,
  userProfileImage?: string
): Promise<boolean> => {
  try {
    console.log('🔍 [DEBUG] addEventComment called with:', {
      eventId,
      userId,
      content: content.substring(0, 50) + '...',
      userName
    });

    // Authentication check
    const currentUser = firebase.auth().currentUser;
    console.log('🔍 [DEBUG] Current Auth User:', {
      uid: currentUser?.uid,
      email: currentUser?.email,
      authenticated: !!currentUser,
      matchesUserId: currentUser?.uid === userId
    });

    if (!currentUser) {
      console.error('❌ [DEBUG] No authenticated user');
      return false;
    }

    if (currentUser.uid !== userId) {
      console.error('❌ [DEBUG] User ID mismatch:', {
        currentUserUid: currentUser.uid,
        providedUserId: userId
      });
      return false;
    }

    if (!eventId || !userId || !content.trim()) {
      console.error('❌ [DEBUG] Invalid comment data:', { eventId, userId, content });
      return false;
    }

    // Yorum verilerini hazırla
    const commentData: CommentData = {
      eventId,
      userId,
      userName,
      userProfileImage,
      content: content.trim(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp() as any,
      likesCount: 0,
      repliesCount: 0
    };

    // Firestore'a yorum ekle - hem global collection hem de event subcollection'a
    console.log('🔍 [DEBUG] Adding comment to both collections...');
    
    // 1. Global eventComments collection'a ekle
    const docRef = await firestore.collection('eventComments').add(commentData);
    console.log('✅ [DEBUG] Comment added to global collection:', docRef.id);
    
    // 2. Event subcollection'a da ekle (real-time listener'lar için)
    const eventSubcollectionData = {
      ...commentData,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(), // timestamp field for ordering
    };
    
    await firestore.collection('events').doc(eventId).collection('comments').doc(docRef.id).set(eventSubcollectionData);
    console.log('✅ [DEBUG] Comment added to event subcollection:', docRef.id);

    // Event'in comment count'unu artır
    await firestore.collection('events').doc(eventId).update({
      commentsCount: firebase.firestore.FieldValue.increment(1)
    });

    // Puanlama sistemi entegrasyonu - Comprehensive Scoring System kullan
    try {
      const eventDoc = await firestore.collection('events').doc(eventId).get();
      const eventData = eventDoc.data();
      
      if (eventData?.clubId) {
        console.log('🎯 Starting comprehensive scoring for comment:', {
          userId,
          eventId,
          clubId: eventData.clubId,
          userName
        });

        // Send detailed comment notification
        await DetailedNotificationService.notifyEventCommented(eventId, userId, content);

        // Synchronize event statistics
        await DetailedNotificationService.syncEventStatistics(eventId);

        console.log('✅ Event comment statistics recorded and synchronized');

        const scoringResult = { success: true, userPointsAwarded: 0 };

        // Update club stats for comment count - Enhanced service kullan
        try {
          await ClubStatsService.incrementCommentCount(eventData.clubId);
          console.log(`📊 Club comment count incremented for club: ${eventData.clubId}`);
        } catch (statsError) {
          console.warn('❌ Club stats update failed:', statsError);
        }

        // Activity logging - yorum ekleme
        try {
          await userActivityService.logEventComment(
            userId,
            userName,
            eventId,
            eventData.title || 'Etkinlik',
            content,
            eventData.clubId,
            eventData.clubName || 'Kulüp'
          );
          console.log('✅ Activity logged for comment creation');
        } catch (activityError) {
          console.warn('❌ Activity logging failed:', activityError);
        }

        // Unified Notification System - Yeni yorum bildirimleri
        try {
          // 1. Kulübü bilgilendir
          const userInfo = await UnifiedNotificationService.getUserInfo(userId);
          await UnifiedNotificationService.notifyClubEventComment(
            eventData.clubId,
            eventId,
            eventData.title || 'Etkinlik',
            userId,
            userInfo.name,
            content,
            userInfo.image
          );

          // 2. Etkinliği beğenen öğrencileri bilgilendir (yorumu yapan hariç)
          const likers = await UnifiedNotificationService.getEventLikers(eventId);
          const likersExceptCommenter = likers.filter(likerId => likerId !== userId);
          if (likersExceptCommenter.length > 0) {
            await UnifiedNotificationService.notifyStudentLikedEventComment(
              likersExceptCommenter,
              eventId,
              eventData.title || 'Etkinlik',
              userId,
              userInfo.name,
              content
            );
          }

          // 3. Etkinliğe katılan öğrencileri bilgilendir (yorumu yapan hariç)
          const attendees = await UnifiedNotificationService.getEventAttendees(eventId);
          const attendeesExceptCommenter = attendees.filter(attendeeId => attendeeId !== userId);
          if (attendeesExceptCommenter.length > 0) {
            await UnifiedNotificationService.notifyStudentJoinedEventComment(
              attendeesExceptCommenter,
              eventId,
              eventData.title || 'Etkinlik',
              userId,
              userInfo.name,
              content
            );
          }

          console.log('✅ Unified notification system - comment notifications sent');
        } catch (unifiedNotificationError) {
          console.warn('❌ Unified notification system failed:', unifiedNotificationError);
        }

      } else {
        console.warn('❌ No club ID found for event - cannot process scoring');
      }

      console.log(`💬 Comment added to event: ${eventData?.title || 'Unknown Event'}`);
    } catch (scoringError: any) {
      console.error('❌ Comprehensive Scoring Error:', scoringError);
      console.error('Scoring Error Details:', {
        code: scoringError?.code,
        message: scoringError?.message,
        stack: scoringError?.stack
      });
      // Don't fail the comment creation if scoring fails
    }

    console.log('Comment added successfully:', docRef.id);
    return true;

  } catch (error: any) {
    console.error('❌ [DEBUG] Error adding comment:', {
      code: error?.code,
      message: error?.message,
      stack: error?.stack
    });
    return false;
  }
};

/**
 * 🗑️ Yorum silme
 */
export const deleteEventComment = async (
  commentId: string,
  userId: string,
  eventId?: string
): Promise<boolean> => {
  try {
    console.log('🔍 [DEBUG] deleteEventComment called with:', {
      commentId,
      userId,
      eventId
    });

    // Authentication check
    const currentUser = firebase.auth().currentUser;
    console.log('🔍 [DEBUG] Current Auth User:', {
      uid: currentUser?.uid,
      authenticated: !!currentUser,
      matchesUserId: currentUser?.uid === userId
    });

    if (!currentUser) {
      console.error('❌ [DEBUG] No authenticated user for delete');
      return false;
    }

    if (!commentId || !userId) {
      console.error('❌ [DEBUG] Invalid delete comment data');
      return false;
    }

    // Yorum bilgilerini al - eventId varsa önce o event'te ara
    let commentDoc;
    let commentData: CommentData | null = null;
    let isGlobalComment = true;
    
    if (eventId) {
      // EventId verilmişse önce o event'in subcollection'ında ara
      console.log('🔍 [DEBUG] Searching in specific event subcollection:', eventId);
      commentDoc = await firestore
        .collection('events')
        .doc(eventId)
        .collection('comments')
        .doc(commentId)
        .get();
        
      if (commentDoc.exists) {
        commentData = {
          id: commentId,
          eventId: eventId,
          userId: commentDoc.data()?.userId || '',
          userName: commentDoc.data()?.userName || '',
          content: commentDoc.data()?.text || commentDoc.data()?.content || '',
          createdAt: commentDoc.data()?.createdAt,
          likesCount: commentDoc.data()?.likes || 0,
          repliesCount: 0
        } as CommentData;
        isGlobalComment = false;
        console.log('🔍 [DEBUG] Comment found in specific event subcollection');
      }
    }
    
    // Global collection'da ara (eventId yoksa veya subcollection'da bulunamazsa)
    if (!commentData) {
      console.log('🔍 [DEBUG] Searching in global eventComments collection');
      commentDoc = await firestore.collection('eventComments').doc(commentId).get();
      
      if (commentDoc.exists) {
        commentData = commentDoc.data() as CommentData;
        console.log('🔍 [DEBUG] Comment found in global collection');
      }
    }
    
    // Son çare: tüm event'lerde ara (sadece eventId verilmemişse)
    if (!commentData && !eventId) {
      console.log('🔍 [DEBUG] Comment not found in global collection, checking all event subcollections...');
      
      try {
        const eventsSnapshot = await firestore.collection('events').limit(50).get(); // Limit for performance
        
        for (const eventDoc of eventsSnapshot.docs) {
          const subCommentDoc = await firestore
            .collection('events')
            .doc(eventDoc.id)
            .collection('comments')
            .doc(commentId)
            .get();
            
          if (subCommentDoc.exists) {
            commentData = {
              id: commentId,
              eventId: eventDoc.id,
              userId: subCommentDoc.data()?.userId || '',
              userName: subCommentDoc.data()?.userName || '',
              content: subCommentDoc.data()?.text || subCommentDoc.data()?.content || '',
              createdAt: subCommentDoc.data()?.createdAt,
              likesCount: subCommentDoc.data()?.likes || 0,
              repliesCount: 0
            } as CommentData;
            isGlobalComment = false;
            console.log('🔍 [DEBUG] Comment found in event subcollection:', eventDoc.id);
            break;
          }
        }
      } catch (subSearchError) {
        console.error('Error searching in subcollections:', subSearchError);
      }
    }

    if (!commentData) {
      console.error('❌ [DEBUG] Comment not found in any collection');
      return false;
    }

    // Sadece yorum sahibi silebilir
    if (commentData.userId !== userId) {
      console.error('Unauthorized delete attempt');
      return false;
    }

    // Yorumu sil - hem global collection hem de event subcollection'dan
    console.log('🔍 [DEBUG] Deleting comment from both collections...');
    
    try {
      // 1. Global collection'dan sil
      await firestore.collection('eventComments').doc(commentId).delete();
      console.log('✅ [DEBUG] Comment deleted from global collection');
      
      // 2. Event subcollection'dan da sil
      await firestore
        .collection('events')
        .doc(commentData.eventId)
        .collection('comments')
        .doc(commentId)
        .delete();
      console.log('✅ [DEBUG] Comment deleted from event subcollection');
    } catch (deleteError) {
      console.warn('Some deletion operations failed:', deleteError);
      // Continue with other operations even if one fails
    }

    // Event'in comment count'unu azalt
    await firestore.collection('events').doc(commentData.eventId).update({
      commentsCount: firebase.firestore.FieldValue.increment(-1)
    });

    // Get event and user data for comprehensive processing
    const eventDoc = await firestore.collection('events').doc(commentData.eventId).get();
    const eventData = eventDoc.data();
    const userDoc = await firestore.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const userName = userData?.displayName || userData?.firstName || 'Bilinmeyen kullanıcı';

    // Comprehensive notification and statistics system integration
    try {
      if (eventData?.clubId) {
        // Send detailed notification (comment deletion is internal, no notification needed)
        // await DetailedNotificationService.notifyEventCommented(); // Not needed for deletion

        // Synchronize event statistics
        await DetailedNotificationService.syncEventStatistics(commentData.eventId);

        console.log('✅ Comment deletion statistics recorded and synchronized');

        const result = { success: true, userPointsAwarded: 0 };

        // Activity logging - comment deletion
        try {
          await userActivityService.logEventCommentDelete(
            userId,
            userName,
            commentData.eventId,
            eventData.title || 'Etkinlik',
            commentData.content,
            eventData.clubId,
            eventData.clubName || 'Kulüp'
          );
          console.log('✅ Activity logged for comment deletion');
        } catch (activityError) {
          console.warn('❌ Activity logging failed:', activityError);
        }

        // Update club stats for comment count decrease
        try {
          await ClubStatsService.updateCommentCount(eventData.clubId, false);
          console.log(`📊 Club comment count decremented for club: ${eventData.clubId}`);
        } catch (statsError) {
          console.warn('❌ Club stats update failed:', statsError);
        }

        // Unified Notification System - Yorum silme bildirimi
        try {
          const userInfo = await UnifiedNotificationService.getUserInfo(userId);
          await UnifiedNotificationService.notifyClubEventCommentDeleted(
            eventData.clubId,
            commentData.eventId,
            eventData.title || 'Etkinlik',
            userId,
            userInfo.name,
            commentData.content
          );
          console.log('✅ Unified notification system - comment deletion notification sent');
        } catch (unifiedNotificationError) {
          console.warn('❌ Unified notification system failed:', unifiedNotificationError);
        }

      } else {
        console.warn('❌ No club ID found for event, using fallback scoring');
        // Fallback handled by ModernScoringEngine
      }
    } catch (scoringError: any) {
      console.error('❌ Delete comment scoring failed:', scoringError);
      console.error('Scoring Error Details:', {
        code: scoringError?.code,
        message: scoringError?.message,
        stack: scoringError?.stack
      });
    }

    console.log('Comment deleted successfully:', commentId);
    return true;

  } catch (error: any) {
    console.error('❌ [DEBUG] Error deleting comment:', {
      code: error?.code,
      message: error?.message,
      stack: error?.stack
    });
    return false;
  }
};

/**
 * 👍 Yorum beğenme
 */
export const likeEventComment = async (
  commentId: string,
  userId: string
): Promise<boolean> => {
  try {
    if (!commentId || !userId) {
      return false;
    }

    // Zaten beğenilmiş mi kontrol et
    const likeQuery = await firestore.collection('commentLikes')
      .where('commentId', '==', commentId)
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (!likeQuery.empty) {
      console.log('Comment already liked');
      return true;
    }

    // Beğeni ekle
    await firestore.collection('commentLikes').add({
      commentId,
      userId,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Comment like count'unu artır
    await firestore.collection('eventComments').doc(commentId).update({
      likesCount: firebase.firestore.FieldValue.increment(1)
    });

    // Puanlama sistemi entegrasyonu
    try {
      // Enhanced activity logging with context if available
      try {
        // Try to enrich with event metadata
        const commentDoc = await firestore.collection('eventComments').doc(commentId).get();
        const eventId = commentDoc.data()?.eventId;
        let eventTitle: string | undefined = undefined;
        let clubId: string | undefined = undefined;
        let clubName: string | undefined = undefined;
        if (eventId) {
          const eventDoc = await firestore.collection('events').doc(eventId).get();
          const eventData = eventDoc.data();
          eventTitle = eventData?.title;
          clubId = eventData?.clubId;
          clubName = eventData?.clubName;
        }
        const userDoc = await firestore.collection('users').doc(userId).get();
        const userData = userDoc.data();
        await userActivityService.logLikeComment(
          userId,
          userData?.displayName || userData?.name || 'Kullanıcı',
          commentId,
          eventId,
          eventTitle,
          clubId,
          clubName
        );
      } catch (activityErr) {
        console.warn('Enhanced activity logging for like comment failed:', activityErr);
      }
    } catch (scoringError) {
      console.warn('Like comment scoring failed:', scoringError);
    }

    console.log('Comment liked successfully');
    return true;

  } catch (error) {
    console.error('Error liking comment:', error);
    return false;
  }
};

/**
 * 💔 Yorum beğenisini geri alma
 */
export const unlikeEventComment = async (
  commentId: string,
  userId: string
): Promise<boolean> => {
  try {
    if (!commentId || !userId) {
      return false;
    }

    // Beğeniyi bul ve sil
    const likeQuery = await firestore.collection('commentLikes')
      .where('commentId', '==', commentId)
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (likeQuery.empty) {
      console.log('Comment not liked by user');
      return true;
    }

    // Beğeniyi sil
    await likeQuery.docs[0].ref.delete();

    // Comment like count'unu azalt
    await firestore.collection('eventComments').doc(commentId).update({
      likesCount: firebase.firestore.FieldValue.increment(-1)
    });

    // Puanlama sistemi entegrasyonu
    try {
      // Enhanced activity logging with context if available
      try {
        const commentDoc = await firestore.collection('eventComments').doc(commentId).get();
        const eventId = commentDoc.data()?.eventId;
        let eventTitle: string | undefined = undefined;
        let clubId: string | undefined = undefined;
        let clubName: string | undefined = undefined;
        if (eventId) {
          const eventDoc = await firestore.collection('events').doc(eventId).get();
          const eventData = eventDoc.data();
          eventTitle = eventData?.title;
          clubId = eventData?.clubId;
          clubName = eventData?.clubName;
        }
        const userDoc = await firestore.collection('users').doc(userId).get();
        const userData = userDoc.data();
        await userActivityService.logUnlikeComment(
          userId,
          userData?.displayName || userData?.name || 'Kullanıcı',
          commentId,
          eventId,
          eventTitle,
          clubId,
          clubName
        );
      } catch (activityErr) {
        console.warn('Enhanced activity logging for unlike comment failed:', activityErr);
      }
    } catch (scoringError) {
      console.warn('Unlike comment scoring failed:', scoringError);
    }

    console.log('Comment unliked successfully');
    return true;

  } catch (error) {
    console.error('Error unliking comment:', error);
    return false;
  }
};

/**
 * 📝 Etkinlik yorumlarını getirme
 */
export const getEventComments = async (
  eventId: string,
  limit: number = 50
): Promise<CommentData[]> => {
  try {
    if (!eventId) {
      return [];
    }

    console.log('🔍 [DEBUG] Getting comments for eventId:', eventId);

    // Event subcollection'dan yorumları al (real-time listener'larla uyumlu)
    const querySnapshot = await firestore
      .collection('events')
      .doc(eventId)
      .collection('comments')
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    const comments = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        eventId: eventId,
        userId: data.userId || '',
        userName: data.userName || 'Katılımcı',
        userProfileImage: data.userProfileImage || data.profileImage || null,
        content: data.content || data.text || '',
        createdAt: data.createdAt || data.timestamp,
        likesCount: data.likesCount || data.likes || 0,
        repliesCount: data.repliesCount || 0,
        parentCommentId: data.parentCommentId || null
      };
    }) as CommentData[];

    console.log('✅ [DEBUG] Comments retrieved:', comments.length);
    return comments;

  } catch (error: any) {
    console.error('❌ [DEBUG] Error getting comments:', {
      code: error?.code,
      message: error?.message,
      eventId
    });
    return [];
  }
};

/**
 * 🔢 Yorum sayısını getirme
 */
export const getEventCommentCount = async (eventId: string): Promise<number> => {
  try {
    if (!eventId) {
      return 0;
    }

    const querySnapshot = await firestore.collection('eventComments')
      .where('eventId', '==', eventId)
      .get();

    return querySnapshot.size;

  } catch (error) {
    console.error('Error getting comment count:', error);
    return 0;
  }
};