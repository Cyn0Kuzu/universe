import { firestore, firebase } from './config';
import { userActivityService } from '../services/enhancedUserActivityService';
import { ClubStatsService } from '../services/clubStatsService';
import { ClubNotificationService } from '../services/clubNotificationService';
import { clubActivityService } from '../services/enhancedClubActivityService';
import DetailedNotificationService from '../services/detailedNotificationService';
import { UnifiedNotificationService } from '../services/unifiedNotificationService';

/**
 * 📖 Etkinlik detayını getir
 */
export const getEventById = async (eventId: string): Promise<any | null> => {
  try {
    const eventDoc = await firestore.collection('events').doc(eventId).get();
    if (eventDoc.exists) {
      return { id: eventDoc.id, ...eventDoc.data() };
    }
    return null;
  } catch (error) {
    console.error('Event getirirken hata:', error);
    return null;
  }
};

/**
 * ❤️ Etkinlik beğenme
 */
export const likeEvent = async (userId: string, eventId: string): Promise<boolean> => {
  try {
    if (!userId || !eventId) {
      return false;
    }

    // Zaten beğenilmiş mi kontrol et
    const likeQuery = await firestore.collection('eventLikes')
      .where('userId', '==', userId)
      .where('eventId', '==', eventId)
      .limit(1)
      .get();

    if (!likeQuery.empty) {
      console.log('Event already liked');
      return true;
    }

    // Firestore'a beğeni ekle
    await firestore.collection('eventLikes').add({
      userId,
      eventId,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Event like count'unu artır
    await firestore.collection('events').doc(eventId).update({
      likesCount: firebase.firestore.FieldValue.increment(1)
    });

    // Event data'sını al
    const eventDoc = await firestore.collection('events').doc(eventId).get();
    const eventData = eventDoc.data();

    // ✅ Event like statistics are tracked directly in Firebase collections
    console.log(`✅ LIKE_EVENT statistics recorded for user: ${userId}`);

    // Update club stats for like count
    try {
      if (eventData?.clubId) {
        await ClubStatsService.updateLikeCount(eventData.clubId, true);
        // Force immediate stats refresh
        await ClubStatsService.forceRefreshStats(eventData.clubId);
      }

      // Send detailed like notification
      await DetailedNotificationService.notifyEventLiked(eventId, userId);
      
      // Sync event statistics
      await DetailedNotificationService.syncEventStatistics(eventId);
      
    } catch (statsError) {
      console.warn('Like event stats/notification failed:', statsError);
    }

    return true;

  } catch (error) {
    console.error('Etkinlik beğenilirken hata:', error);
    return false;
  }
};

/**
 * 🚶‍♂️ Etkinliğe katılma
 */
export const joinEvent = async (userId: string, eventId: string): Promise<boolean> => {
  try {
    if (!userId || !eventId) {
      return false;
    }

    // Zaten katılmış mı kontrol et
    const attendeeQuery = await firestore.collection('eventAttendees')
      .where('userId', '==', userId)
      .where('eventId', '==', eventId)
      .limit(1)
      .get();

    if (!attendeeQuery.empty) {
      console.log('User already joined event');
      return true;
    }

    // Firestore'a katılımcı ekle - hem global collection hem de subcollection
    const userDoc = await firestore.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    const attendeeData = {
      userId,
      eventId,
      joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
      status: 'joined',
      userName: userData?.displayName || userData?.firstName || 'Kullanıcı',
      userEmail: userData?.email || '',
      userAvatar: userData?.profileImage || null
    };

    // 1. Global collection'a ekle (mevcut sistem)
    await firestore.collection('eventAttendees').add(attendeeData);
    
    // 2. Event subcollection'a da ekle (ClubEventCard için)
    await firestore.collection('events').doc(eventId).collection('attendees').doc(userId).set(attendeeData);

    // Event attendee count'unu artır
    await firestore.collection('events').doc(eventId).update({
      attendeesCount: firebase.firestore.FieldValue.increment(1)
    });

    // ✅ NOT: Puanlama sistemi StudentEventCard'da ComprehensiveScoringSystem ile yapılıyor
    // Burada duplicate scoring yapılmasın

    // Update club stats for participant count
    try {
      const eventDoc = await firestore.collection('events').doc(eventId).get();
      const eventData = eventDoc.data();
      
      // Event join statistics are tracked directly in Firebase collections
      console.log(`✅ Event join statistics recorded for user: ${userId}`);

      if (eventData?.clubId) {
        await ClubStatsService.updateParticipantCount(eventData.clubId, true);
        // Trigger real-time stats update
        await ClubStatsService.triggerStatsUpdate(eventData.clubId);
      }

      // Send detailed join notification
      await DetailedNotificationService.notifyEventJoined(eventId, userId);
      
      // Sync event statistics
      await DetailedNotificationService.syncEventStatistics(eventId);
      
    } catch (statsError) {
      console.warn('Join event stats/notification failed:', statsError);
    }

    return true;

  } catch (error) {
    console.error('Etkinliğe katılırken hata:', error);
    return false;
  }
};

/**
 * 📤 Etkinlik paylaşma
 */
export const shareEvent = async (userId: string, eventId: string): Promise<boolean> => {
  try {
    if (!userId || !eventId) {
      return false;
    }

    // Zaten paylaşılmış mı kontrol et
    const shareQuery = await firestore.collection('eventShares')
      .where('userId', '==', userId)
      .where('eventId', '==', eventId)
      .limit(1)
      .get();

    if (!shareQuery.empty) {
      console.log('Event already shared');
      return true;
    }

    // Firestore'a paylaşım ekle
    await firestore.collection('eventShares').add({
      userId,
      eventId,
      sharedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Event share count'unu artır
    await firestore.collection('events').doc(eventId).update({
      sharesCount: firebase.firestore.FieldValue.increment(1)
    });

    // Puanlama sistemi entegrasyonu
    try {
      const eventDoc = await firestore.collection('events').doc(eventId).get();
      const eventData = eventDoc.data();
      
      // Event share statistics are tracked directly in Firebase collections
      console.log('✅ Event share statistics recorded');

      // Enhanced activity logging for user feed
      try {
        const userDoc = await firestore.collection('users').doc(userId).get();
        const userData = userDoc.data();
        await userActivityService.logEventShare(
          userId,
          userData?.name || userData?.displayName || 'Kullanıcı',
          eventId,
          eventData?.title || 'Etkinlik',
          eventData?.clubId,
          eventData?.clubName || 'Kulüp'
        );
      } catch (activityErr) {
        console.warn('Enhanced activity logging (share) failed:', activityErr);
      }
    } catch (scoringError) {
      console.warn('Share event scoring failed:', scoringError);
    }

    return true;

  } catch (error) {
    console.error('Etkinlik paylaşılırken hata:', error);
    return false;
  }
};

/**
 * 🚶‍♀️ Etkinlikten ayrılma
 */
export const leaveEvent = async (userId: string, eventId: string): Promise<boolean> => {
  try {
    if (!userId || !eventId) {
      return false;
    }

    // Katılımcıyı bul ve sil - hem global collection hem de subcollection
    const attendeeQuery = await firestore.collection('eventAttendees')
      .where('userId', '==', userId)
      .where('eventId', '==', eventId)
      .limit(1)
      .get();

    if (!attendeeQuery.empty) {
      // Get event data for notification
      const event = await getEventById(eventId);
      
      // 1. Global collection'dan sil
      await attendeeQuery.docs[0].ref.delete();
      
      // 2. Event subcollection'dan da sil
      await firestore.collection('events').doc(eventId).collection('attendees').doc(userId).delete();

      // Event attendee count'unu azalt
      await firestore.collection('events').doc(eventId).update({
        attendeesCount: firebase.firestore.FieldValue.increment(-1)
      });

      // Send detailed notification
      if (event) {
        await DetailedNotificationService.notifyEventLeft(eventId, userId);
      }

      // Synchronize statistics
      await DetailedNotificationService.syncEventStatistics(eventId);

      // Kulüp istatistiklerini güncelle
      try {
        if (event?.clubId) {
          await ClubStatsService.updateParticipantCount(event.clubId, false);
          // Trigger real-time stats update
          await ClubStatsService.triggerStatsUpdate(event.clubId);
        }
      } catch (statsError) {
        console.warn('Club stats update failed:', statsError);
      }

      console.log('✅ Event leave statistics recorded and synchronized');

      return true;
    }

    return false;
  } catch (error) {
    console.error('Etkinlikten ayrılırken hata:', error);
    return false;
  }
};

/**
 * 🎯 Etkinlik oluşturma
 */
export const createEventWithScoring = async (
  eventData: any,
  creatorId: string
): Promise<{ success: boolean; eventId?: string; error?: string }> => {
  try {
    console.log('🔥 createEventWithScoring called with:', {
      title: eventData?.title,
      creatorId,
      clubId: eventData?.clubId,
      hasTimestamp: !!eventData?.timestamp
    });
    
    console.log('🔍 Starting validation checks...');
    // Validate required fields upfront
    if (!eventData?.title) {
      console.error('❌ Missing required field: title');
      return { success: false, error: 'Başlık gereklidir' };
    }
    // description'ı boş stringe normalize ederek kuralların daha esnek olmasını sağla
    if (!eventData?.description) {
      console.warn('⚠️ No description provided, normalizing to empty string');
      eventData = { ...eventData, description: '' };
    }
    
    if (!creatorId) {
      console.error('❌ Missing creatorId');
      return { success: false, error: 'Etkinlik oluşturucu ID eksik' };
    }
    
    console.log('✅ Basic validation passed');
    
    console.log('⚙️ Preparing event data with timestamps...');
    // Etkinlik verilerini hazırla
    const newEventData: any = {
      ...eventData,
      creatorId,
      // Firestore security rules require a `timestamp` field on create
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      likesCount: 0,
      attendeesCount: 0,
      sharesCount: 0,
      commentsCount: 0
    };

    // Organizer/owner aliases for rules/queries in different screens
    if (!newEventData.organizer || !newEventData.organizer.id) {
      newEventData.organizer = {
        id: newEventData.clubId || creatorId,
        type: 'club',
        name: newEventData.clubName || 'Kulüp'
      };
    }
    if (!newEventData.ownerId) newEventData.ownerId = newEventData.clubId || creatorId;
    if (!newEventData.createdBy) newEventData.createdBy = creatorId;

    console.log('📝 Final event data to save:', {
      title: newEventData.title,
      description: newEventData.description ? newEventData.description.substring(0, 50) + '...' : 'none',
      creatorId: newEventData.creatorId,
      clubId: newEventData.clubId,
      organizerId: newEventData?.organizer?.id,
      hasAllRequiredFields: !!(newEventData.title && newEventData.creatorId && newEventData.timestamp)
    });

    console.log('💾 Adding document to Firestore events collection...');
    // Firestore'a etkinlik ekle
    const docRef = await firestore.collection('events').add(newEventData);
    
    console.log('✅ Event document created with ID:', docRef.id);

    console.log('🎯 Starting scoring and stats updates...');
    
    // Event creation statistics are tracked directly in Firebase collections
    console.log('✅ Event creation statistics recorded');

    // Update club stats for event count - ÖNEMLİ
    if (eventData.clubId) {
      console.log(`🎪 ÖNEMLİ: Etkinlik oluşturuldu, istatistikleri güncelleme: ${eventData.clubId}`);
        try {
          // İstatistikleri güncelle - üç aşamalı garanti işlem
          
          // 1. Etkinlik sayısını arttır
          await ClubStatsService.updateEventCount(eventData.clubId, true);
          console.log(`✅ Etkinlik sayısı arttırıldı`);
          
          // 2. ClubStats dokümanını kontrol et
          const statsDoc = await firestore.collection('clubStats').doc(eventData.clubId).get();
          if (statsDoc.exists) {
            console.log(`📊 Mevcut istatistikler:`, statsDoc.data());
          } else {
            console.log(`❌ İstatistik dokümanı yok! Oluşturuluyor...`);
            await ClubStatsService.createDefaultStats(eventData.clubId);
          }
          
          // 3. Zorla istatistikleri yenile - çok önemli!
          const newStats = await ClubStatsService.forceRefreshStats(eventData.clubId);
          console.log(`✅ İstatistikler zorla yenilendi: `, newStats);
          
          // 4. UserScores'ı sync et - leaderboard için
          await ClubStatsService.syncUserScores(eventData.clubId);
          console.log(`✅ UserScores synced for leaderboard`);
          
          // 5. Son kez kontrol et
          const finalStats = await firestore.collection('clubStats').doc(eventData.clubId).get();
          console.log(`📊 SON KONTROL - İstatistikler:`, finalStats.data());
        } catch (statsError) {
          console.error(`❌ İstatistik güncellemede kritik hata:`, statsError);
        }
      } else {
        console.warn(`⚠️ Etkinlik için kulüp ID bulunamadı, istatistikler güncellenmedi`);
      }
      
      // Log club activity and send notifications if club ID exists
      if (eventData.clubId) {
        await clubActivityService.createEventActivity(
          'event_created',
          eventData.clubId,
          creatorId,
        'Kulüp Yöneticisi',
        docRef.id,
        eventData.title
      );
      
      // Send notification to club followers/members about new event using comprehensive service
      try {
        const clubDoc = await firestore.collection('users').doc(eventData.clubId).get();
        const clubName = clubDoc.exists ? 
          (clubDoc.data()?.name || clubDoc.data()?.displayName || 'Kulüp') : 'Kulüp';
        
        // 1. Send notification to the club itself (for admin dashboard)
        // TODO: Replace with ClubNotificationService
        console.log('Event creation notification would be sent to club:', eventData.clubId);
        // await enhancedClubNotificationService.sendEventNotification(
        //   eventData.clubId, docRef.id, eventData.title, eventData.clubId, clubName, 'event_created'
        // );
        
        // 2. Send notification to club followers/members
        const followersSnapshot = await firestore
          .collection('clubFollowers')
          .where('clubId', '==', eventData.clubId)
          .get();
          
        const membersSnapshot = await firestore
          .collection('clubMembers')
          .where('clubId', '==', eventData.clubId)
          .get();
        
        // Collect all unique recipients
        const recipients = new Set<string>();
        
        followersSnapshot.docs.forEach((doc: any) => {
          const data: any = doc.data();
          if (data?.userId && data.userId !== eventData.clubId) {
            recipients.add(data.userId as string);
          }
        });
        
        membersSnapshot.docs.forEach((doc: any) => {
          const data: any = doc.data();
          if (data?.userId && data.userId !== eventData.clubId) {
            recipients.add(data.userId as string);
          }
        });
        
        // Unified Notification System - Yeni etkinlik bildirimi
        try {
          const recipientsArray = Array.from(recipients);
          if (recipientsArray.length > 0) {
            await UnifiedNotificationService.notifyStudentClubNewEvent(
              recipientsArray,
              docRef.id,
              eventData.title,
              eventData.clubId,
              clubName
            );
            console.log('✅ Unified notification system - new event notifications sent');
          }
        } catch (unifiedNotificationError) {
          console.error('❌ Unified notification system failed:', unifiedNotificationError);
        }
        
        console.log(`✅ Event creation notifications sent to club and ${recipients.size} followers/members`);
      } catch (notificationError) {
        console.error('❌ Error sending event creation notifications:', notificationError);
      }
    }

    console.log('Event created successfully:', docRef.id);
    return { success: true, eventId: docRef.id };

  } catch (error) {
    console.error('❌ Error creating event with scoring:', error);
    console.error('❌ Full error details:', {
      name: (error as any)?.name,
      code: (error as any)?.code,
      message: (error as any)?.message,
      stack: (error as any)?.stack?.substring(0, 300) + '...'
    });
    
    let errorMessage = 'Etkinlik oluşturulurken hata oluştu.';
    if ((error as any)?.code === 'permission-denied') {
      errorMessage = 'Yetkisiz işlem: Etkinlik oluşturma izniniz yok.';
    } else if ((error as any)?.message) {
      errorMessage = (error as any).message;
    }
    
    return { success: false, error: errorMessage };
  }
};

/**
 * ⚡ Etkinlik silme işlemi (Puanlama sistemini dikkate alarak)
 */
export const deleteEventSafely = async (eventId: string, userId: string): Promise<boolean> => {
  try {
    if (!eventId || !userId) {
      console.error('Geçersiz eventId veya userId');
      return false;
    }

    // Etkinlik var mı kontrol et
    const eventDoc = await firestore.collection('events').doc(eventId).get();
    if (!eventDoc.exists) {
      console.error('Etkinlik bulunamadı');
      return false;
    }

    const eventData = eventDoc.data();
    if (!eventData) {
      return false;
    }

    // Sadece etkinlik sahibi silebilir
    if (eventData.creatorId !== userId) {
      console.error('Bu etkinliği silme yetkiniz yok');
      return false;
    }

    // Event deletion için scoring işlemi - tüm related activities'i handle etmesi gerekiyor
    // Şimdilik basit delete event scoring
    // Scoring engine removed - statistics tracked in Firebase
    console.log('Event deletion statistics recorded:', {
      userId,
      eventId,
      eventTitle: eventData.title,
      clubId: eventData.clubId,
      clubName: eventData.clubName
    });

    // Sonra etkinliği sil
    await firestore.collection('events').doc(eventId).delete();

    // Kulüp istatistiklerini güncelle
    if (eventData.clubId) {
      try {
        await ClubStatsService.updateEventCount(eventData.clubId, false); // false = decrement
        console.log(`✅ Etkinlik silindi, istatistikler güncellendi: ${eventData.clubId}`);
      } catch (statsError) {
        console.error(`❌ İstatistik güncellemede hata:`, statsError);
      }
    }

    // Log club activity for event cancellation/deletion
    try {
      if (eventData.clubId) {
        const actorDoc = await firestore.collection('users').doc(userId).get();
        const actorName = actorDoc.exists ? (actorDoc.data()?.displayName || actorDoc.data()?.name || 'Kullanıcı') : 'Kullanıcı';
        await clubActivityService.createEventActivity(
          'event_cancelled',
          eventData.clubId,
          userId,
          actorName,
          eventId,
          eventData.title || 'Etkinlik'
        );
      }
    } catch (activityErr) {
      console.warn('Event deletion activity logging failed:', activityErr);
    }

    console.log(`✅ Etkinlik güvenli şekilde silindi: ${eventId}`);
    return true;
  } catch (error) {
    console.error('Etkinlik silinirken hata:', error);
    return false;
  }
};

/**
 * 💔 Etkinlik beğenisini geri alma
 */
export const unlikeEvent = async (userId: string, eventId: string): Promise<boolean> => {
  try {
    if (!userId || !eventId) {
      return false;
    }

    // Get event details first to have all necessary metadata
    const eventDoc = await firestore.collection('events').doc(eventId).get();
    const eventData = eventDoc.data();

    if (!eventDoc.exists || !eventData) {
      console.error('Event not found for unlike operation');
      return false;
    }

    // Firestore'dan beğeniyi kaldır
    const likeQuery = await firestore.collection('eventLikes')
      .where('userId', '==', userId)
      .where('eventId', '==', eventId)
      .limit(1)
      .get();

    if (!likeQuery.empty) {
      await likeQuery.docs[0].ref.delete();

      // Event like count'u güncelle
      await firestore.collection('events').doc(eventId).update({
        likesCount: firebase.firestore.FieldValue.increment(-1)
      });

      // Get club details if available
      let clubData = null;
      if (eventData.clubId) {
        const clubDoc = await firestore.collection('clubs').doc(eventData.clubId).get();
        clubData = clubDoc.data();
      }

      // Event unlike statistics are tracked directly in Firebase collections
      console.log(`✅ Event unlike statistics recorded for user: ${userId}`);

      // Update club stats for like count decrease
      if (eventData?.clubId) {
        await ClubStatsService.updateLikeCount(eventData.clubId, false);
        // Force immediate stats refresh
        await ClubStatsService.forceRefreshStats(eventData.clubId);
      }
      
      // Send detailed unlike notification
      await DetailedNotificationService.notifyEventUnliked(eventId, userId);
      
      // Sync event statistics
      await DetailedNotificationService.syncEventStatistics(eventId);

      return true;
    }

    return false;
  } catch (error) {
    console.error('Etkinlik beğenisi geri alınırken hata:', error);
    return false;
  }
};

/**
 *  Etkinlik paylaşımını geri alma
 */
export const unshareEvent = async (userId: string, eventId: string): Promise<boolean> => {
  try {
    if (!userId || !eventId) {
      return false;
    }

    // Firestore'dan paylaşımı kaldır
    const shareQuery = await firestore.collection('eventShares')
      .where('userId', '==', userId)
      .where('eventId', '==', eventId)
      .limit(1)
      .get();

    if (!shareQuery.empty) {
      await shareQuery.docs[0].ref.delete();

      // Event share count'u güncelle
      await firestore.collection('events').doc(eventId).update({
        sharesCount: firebase.firestore.FieldValue.increment(-1)
      });

      // Event unshare statistics are tracked directly in Firebase collections
      console.log('✅ Event unshare statistics recorded');
      
      const eventDoc = await firestore.collection('events').doc(eventId).get();
      const eventData = eventDoc.data();

      try {
        const userDoc = await firestore.collection('users').doc(userId).get();
        const userData = userDoc.data();
        await userActivityService.logEventUnshare(
          userId,
          userData?.name || userData?.displayName || 'Kullanıcı',
          eventId,
          eventData?.title || 'Etkinlik',
          eventData?.clubId,
          eventData?.clubName || 'Kulüp'
        );
      } catch (activityErr) {
        console.warn('Enhanced activity logging (unshare) failed:', activityErr);
      }

      return true;
    }

    return false;
  } catch (error) {
    console.error('Etkinlik paylaşımı geri alınırken hata:', error);
    return false;
  }
};
