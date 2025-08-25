import { firebase } from './config';
import { ClubStatsService } from '../services/clubStatsService';
import { ClubNotificationService } from '../services/clubNotificationService';
import { clubActivityService } from '../services/enhancedClubActivityService';
import { userActivityService } from '../services/enhancedUserActivityService';
import { DetailedNotificationService } from '../services/detailedNotificationService';
import { UnifiedNotificationService } from '../services/unifiedNotificationService';

export interface MembershipRequest {
  id?: string;
  userId: string;
  clubId: string;
  status: 'pending' | 'approved' | 'rejected';
  requestDate: any;
  message?: string;
  userInfo?: {
    displayName: string;
    email: string;
    profileImage?: string;
    university?: string;
    department?: string;
    classLevel?: string;
  };
  clubInfo?: {
    clubName: string;
    profileImage?: string;
  };
}

// Helper function to safely extract user information
const extractUserInfo = (userData: any) => {
  if (!userData) return null;
  
  const userInfo: any = {
    displayName: userData.displayName || userData.email || 'İsimsiz Kullanıcı',
    email: userData.email || '',
  };
  
  // Only add fields if they exist and are not null/undefined/empty
  if (userData.profileImage && userData.profileImage.trim && userData.profileImage.trim() !== '') {
    userInfo.profileImage = userData.profileImage.trim();
  }
  if (userData.university && userData.university.trim && userData.university.trim() !== '') {
    userInfo.university = userData.university.trim();
  }
  if (userData.department && userData.department.trim && userData.department.trim() !== '') {
    userInfo.department = userData.department.trim();
  }
  if (userData.classLevel && userData.classLevel.trim && userData.classLevel.trim() !== '') {
    userInfo.classLevel = userData.classLevel.trim();
  }
  
  // Explicitly ensure phoneNumber is not included to avoid validation issues
  delete userInfo.phoneNumber;
  
  return userInfo;
};

// Helper function to safely extract club information
const extractClubInfo = (clubData: any) => {
  if (!clubData) return null;
  
  const clubInfo: any = {
    clubName: clubData.clubName || clubData.displayName || clubData.name || 'İsimsiz Kulüp',
  };
  
  // Only add profileImage if it exists and is not empty
  if (clubData.profileImage && clubData.profileImage.trim && clubData.profileImage.trim() !== '') {
    clubInfo.profileImage = clubData.profileImage.trim();
  }
  
  return clubInfo;
};

export const sendMembershipRequest = async (
  clubId: string, 
  userId: string, 
  message?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('=== sendMembershipRequest Debug ===');
    console.log('Sending membership request for clubId:', clubId, 'userId:', userId);
    const db = firebase.firestore();
    
    // Daha önce gönderilmiş bekleyen istek var mı kontrol et
    const pendingRequest = await db
      .collection('membershipRequests')
      .where('clubId', '==', clubId)
      .where('userId', '==', userId)
      .where('status', '==', 'pending')
      .get();
    
    if (!pendingRequest.empty) {
      return { success: false, error: 'Bu kulübe zaten katılma isteği gönderdiniz.' };
    }
    
    // Aktif üyelik kontrolü - clubMembers koleksiyonunda
    const activeMember = await db
      .collection('clubMembers')
      .where('clubId', '==', clubId)
      .where('userId', '==', userId)
      .where('status', '==', 'approved')
      .get();
    
    if (!activeMember.empty) {
      return { success: false, error: 'Bu kulübe zaten üyesiniz.' };
    }
    
    // Kullanıcı bilgilerini getir
    console.log('Fetching user data for userId:', userId);
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    console.log('User exists:', userDoc.exists);
    console.log('User data:', userData ? {
      displayName: userData.displayName,
      email: userData.email,
      userType: userData.userType
    } : 'No user data found');

    // Kulüp bilgilerini getir - önce users koleksiyonundan dene
    console.log('Fetching club data for clubId:', clubId);
    let clubDoc = await db.collection('users').doc(clubId).get();
    let clubData = clubDoc.data();
    
    if (!clubDoc.exists || !clubData || clubData.userType !== 'club') {
      console.log('Club not found in users collection, trying clubs collection...');
      clubDoc = await db.collection('clubs').doc(clubId).get();
      clubData = clubDoc.data();
    }
    
    console.log('Club exists:', clubDoc.exists);
    console.log('Club data:', clubData ? {
      name: clubData.name || clubData.displayName || clubData.clubName,
      userType: clubData.userType
    } : 'No club data found');

    if (!userData || !clubData) {
      const errorMsg = `Missing data - User: ${userData ? 'found' : 'not found'}, Club: ${clubData ? 'found' : 'not found'}`;
      console.error('Error:', errorMsg);
      return { success: false, error: 'Kullanıcı veya kulüp bilgileri bulunamadı.' };
    }
    
    // Membership request oluştur - helper functions kullanarak güvenli bir şekilde
    const userInfo = extractUserInfo(userData);
    const clubInfo = extractClubInfo(clubData);
    
    if (!userInfo || !clubInfo) {
      const errorMsg = `Failed to extract info - User: ${userInfo ? 'ok' : 'failed'}, Club: ${clubInfo ? 'ok' : 'failed'}`;
      console.error('Error:', errorMsg);
      return { success: false, error: 'Kullanıcı veya kulüp bilgileri işlenirken hata oluştu.' };
    }
    
    // Clean up any legacy fields that might cause validation issues
    const cleanUserInfo = { ...userInfo };
    delete cleanUserInfo.phoneNumber;
    
    const membershipRequest: MembershipRequest = {
      userId,
      clubId,
      status: 'pending',
      requestDate: firebase.firestore.FieldValue.serverTimestamp(),
      message: message || '',
      userInfo: cleanUserInfo,
      clubInfo
    };
    
    // Firestore'a kaydet
    console.log('Saving membership request to Firestore for clubId:', clubId);
    console.log('REQUEST DATA: ', JSON.stringify({
      clubId,
      userId,
      status: 'pending',
      requestDate: 'serverTimestamp',
      message: message || '',
      userInfo: membershipRequest.userInfo ? {
        displayName: membershipRequest.userInfo.displayName,
        email: membershipRequest.userInfo.email
      } : 'undefined',
      clubInfo: membershipRequest.clubInfo ? {
        clubName: membershipRequest.clubInfo.clubName
      } : 'undefined'
    }, null, 2));
    
    try {
      const docRef = await db.collection('membershipRequests').add(membershipRequest);
      console.log('Membership request saved with ID:', docRef.id);
      
      // Puanlama sistemi entegrasyonu - üyelik isteği gönderme
      // Not: Henüz üye olmadı, sadece başvuru yaptı - puan verilmez
      try {
        console.log('📝 Membership request sent successfully, no points awarded yet');
        // Puanlama onay sonrasında yapılacak, burada sadece log tutalım
        // Enhanced user activity log: membership request
        const requesterName = userData.displayName || userData.name || userData.email || 'Anonim';
        const targetClubName = clubData.displayName || clubData.clubName || clubData.name || 'Kulüp';
        await userActivityService.logClubRequest(
          userId,
          requesterName,
          clubId,
          targetClubName
        );
      } catch (scoringError) {
        console.warn('Request join club logging failed:', scoringError);
      }
      
      // Kulüp yöneticisine bildirim gönder
      console.log('Sending notification to club admin...');
      await sendMembershipNotification(clubId, userId, docRef.id, userData);
      
      // Unified Notification System - Üyelik başvurusu bildirimi
      try {
        const userInfo = await UnifiedNotificationService.getUserInfo(userId);
        await UnifiedNotificationService.notifyClubMembershipRequest(
          clubId,
          userId,
          userInfo.name,
          userInfo.image,
          userInfo.university
        );
        console.log('✅ Unified notification system - membership request notification sent');
      } catch (unifiedNotificationError) {
        console.error('❌ Unified notification system failed:', unifiedNotificationError);
      }
      
      console.log('Notification sent successfully');
      
      return { success: true };
    } catch (saveError: any) {
      console.error('Error saving to Firestore:', saveError);
      
      // If there's a validation error about phoneNumber, try to clean up and retry
      if (saveError.message && saveError.message.includes('phoneNumber')) {
        console.log('Detected phoneNumber validation error, attempting cleanup...');
        
        // Create a completely clean version without any potentially problematic fields
        const cleanMembershipRequest = {
          userId,
          clubId,
          status: 'pending' as const,
          requestDate: firebase.firestore.FieldValue.serverTimestamp(),
          message: message || '',
          userInfo: {
            displayName: userData.displayName || userData.email || 'İsimsiz Kullanıcı',
            email: userData.email || '',
            ...(userData.university && { university: userData.university }),
            ...(userData.department && { department: userData.department }),
            ...(userData.classLevel && { classLevel: userData.classLevel }),
          },
          clubInfo: {
            clubName: clubData.clubName || clubData.displayName || clubData.name || 'İsimsiz Kulüp',
          }
        };
        
        const retryDocRef = await db.collection('membershipRequests').add(cleanMembershipRequest);
        console.log('Retry membership request saved with ID:', retryDocRef.id);
        
        // Kulüp yöneticisine bildirim gönder
        await sendMembershipNotification(clubId, userId, retryDocRef.id, userData);
        return { success: true };
      }
      
      throw saveError;
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error in sendMembershipRequest:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('permission-denied') || error.message.includes('Missing or insufficient permissions')) {
        return { success: false, error: 'Bu işlem için yetkiniz bulunmuyor.' };
      } else if (error.message.includes('network')) {
        return { success: false, error: 'İnternet bağlantınızı kontrol edin.' };
      } else if (error.message.includes('index')) {
        return { success: false, error: 'Sistem şu anda yoğun. Lütfen birkaç dakika sonra tekrar deneyin.' };
      }
    }
    
    return { success: false, error: 'Katılma isteği gönderilirken bir hata oluştu. Lütfen tekrar deneyin.' };
  }
};

export const sendMembershipNotification = async (
  clubId: string,
  userId: string,
  requestId: string,
  userData: any
) => {
  try {
    const userName = userData?.displayName || userData?.name || userData?.email || 'Anonim';
    const userProfileImage = userData?.profileImageURL || userData?.photoURL;
    
    // Send notification using the enhanced service
    // TODO: Replace with ClubNotificationService
    console.log('Membership request notification would be sent');
    // await enhancedClubNotificationService.sendMembershipNotification(
    //   clubId, clubId, userData?.clubName || 'Kulüp', userId, userName, 'membership_request'
    // );
    
    console.log('✅ Membership request notification sent successfully');
  } catch (error) {
    console.error('❌ Error sending membership notification:', error);
  }
};

export const getMembershipStatus = async (
  clubId: string, 
  userId: string
): Promise<'none' | 'pending' | 'approved' | 'rejected'> => {
  try {
    const db = firebase.firestore();
    
    // Önce aktif üyelik kontrolü yap - bu en öncelikli
    const activeMember = await db
      .collection('clubMembers')
      .where('clubId', '==', clubId)
      .where('userId', '==', userId)
      .where('status', '==', 'approved')
      .get();
    
    if (!activeMember.empty) {
      console.log('✅ User is approved member');
      return 'approved';
    }

    // Membership request durumunu kontrol et
    const membershipQuery = await db
      .collection('membershipRequests')
      .where('clubId', '==', clubId)
      .where('userId', '==', userId)
      .get();
    
    if (membershipQuery.empty) {
      console.log('❌ No membership request found');
      return 'none';
    }
    
    // Tüm istekleri al ve en yenisini bul
    const requests = membershipQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as MembershipRequest
    }));
    
    // Manuel olarak en yeni isteği bul
    if (requests.length > 1) {
      requests.sort((a, b) => {
        const dateA = a.requestDate instanceof firebase.firestore.Timestamp 
          ? a.requestDate.toDate() 
          : new Date(a.requestDate);
        const dateB = b.requestDate instanceof firebase.firestore.Timestamp 
          ? b.requestDate.toDate() 
          : new Date(b.requestDate);
        return dateB.getTime() - dateA.getTime();  // Descending order
      });
    }
    
    const latestRequest = requests[0];
    console.log('📋 Latest membership request status:', latestRequest.status);
    
    return latestRequest.status as 'pending' | 'approved' | 'rejected';
  } catch (error) {
    console.error('❌ Error checking membership status:', error);
    return 'none';
  }
};

export const cancelMembershipRequest = async (
  clubId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const db = firebase.firestore();
    
    const requestQuery = await db
      .collection('membershipRequests')
      .where('clubId', '==', clubId)
      .where('userId', '==', userId)
      .where('status', '==', 'pending')
      .get();
    
    if (requestQuery.empty) {
      return { success: false, error: 'Bekleyen katılma isteği bulunamadı.' };
    }
    
    // İsteği sil
    await requestQuery.docs[0].ref.delete();
    
    return { success: true };
  } catch (error) {
    console.error('Katılma isteği iptal edilirken hata:', error);
    return { success: false, error: 'İstek iptal edilirken bir hata oluştu.' };
  }
};

// Utility function to clean up problematic membership requests
export const cleanupMembershipRequests = async (clubId: string): Promise<void> => {
  try {
    console.log('Cleaning up membership requests for club:', clubId);
    const db = firebase.firestore();
    
    const requestsQuery = await db
      .collection('membershipRequests')
      .where('clubId', '==', clubId)
      .where('status', '==', 'pending')
      .get();
    
    const batch = db.batch();
    let needsUpdate = false;
    
    requestsQuery.docs.forEach(doc => {
      const data = doc.data();
      if (data.userInfo && data.userInfo.phoneNumber !== undefined) {
        console.log('Found request with phoneNumber field, cleaning up:', doc.id);
        const cleanUserInfo = { ...data.userInfo };
        delete cleanUserInfo.phoneNumber;
        
        batch.update(doc.ref, {
          userInfo: cleanUserInfo
        });
        needsUpdate = true;
      }
    });
    
    if (needsUpdate) {
      await batch.commit();
      console.log('Cleaned up membership requests successfully');
    } else {
      console.log('No membership requests needed cleanup');
    }
  } catch (error) {
    console.error('Error cleaning up membership requests:', error);
  }
};

/**
 * ✅ Üyelik isteğini onaylama - Profesyonel implementasyon
 */
export const approveMembershipRequest = async (
  requestId: string,
  clubId: string,
  approverId: string
): Promise<{ success: boolean; error?: string }> => {
  const db = firebase.firestore();
  
  try {
    console.log('🎯 Starting membership approval process:', { requestId, clubId, approverId });

    // İsteği getir ve validate et
    const requestDoc = await db.collection('membershipRequests').doc(requestId).get();
    if (!requestDoc.exists) {
      return { success: false, error: 'Üyelik isteği bulunamadı.' };
    }

    const requestData = requestDoc.data() as MembershipRequest;
    
    if (requestData.status !== 'pending') {
      return { success: false, error: 'Bu istek zaten işleme alınmış.' };
    }

    // Kullanıcı ve kulüp bilgilerini paralel olarak getir
    const [userDoc, clubDoc] = await Promise.all([
      db.collection('users').doc(requestData.userId).get(),
      db.collection('users').doc(clubId).get()
    ]);

    const userData = userDoc.data();
    const clubData = clubDoc.data();

    if (!userData || !clubData) {
      return { success: false, error: 'Kullanıcı veya kulüp bilgileri bulunamadı.' };
    }

    // Batch transaction ile tüm veritabanı işlemlerini atomik olarak yap
    const batch = db.batch();

    // 1. Membership request'i approve olarak güncelle
    batch.update(requestDoc.ref, {
      status: 'approved',
      approvedDate: firebase.firestore.FieldValue.serverTimestamp(),
      approvedBy: approverId
    });

    // 2. Kullanıcıyı club members'a ekle
    const memberData = {
      userId: requestData.userId,
      clubId: clubId,
      joinDate: firebase.firestore.FieldValue.serverTimestamp(),
      role: 'member',
      status: 'active',
      approvedBy: approverId
    };
    batch.set(db.collection('clubMembers').doc(), memberData);

    // 3. Kulüp member count'unu artır
    batch.update(db.collection('users').doc(clubId), {
      memberCount: firebase.firestore.FieldValue.increment(1)
    });

    // 4. Batch'i commit et
    await batch.commit();
    console.log('✅ Database operations completed successfully');

    // 5. Modern scoring system entegrasyonu - SENKRON (await kullan)
    console.log('🎯 Starting scoring operations...');
    
    let clubScoringResult: any = { success: false, userPointsAwarded: 0, clubPointsAwarded: 0 };
    let studentScoringResult: any = { success: false, userPointsAwarded: 0 };

    try {
      // Send detailed notification for club member approval
      await DetailedNotificationService.notifyClubFollowed(clubId, requestData.userId);
      
      // Synchronize club statistics
      await DetailedNotificationService.syncClubStatistics(clubId);
      
      console.log('✅ Club member approval statistics recorded and synchronized');
      clubScoringResult = { success: true, clubPointsAwarded: 0 };
    } catch (error) {
      console.error('❌ Club approval notification failed:', error);
      console.error('❌ Club approval error details:', error instanceof Error ? error.message : String(error));
    }

    try {
      // Send detailed notification for user joining club
      await DetailedNotificationService.notifyClubFollowed(clubId, requestData.userId);
      
      // Synchronize user statistics
      await DetailedNotificationService.syncUserStatistics(requestData.userId);
      
      console.log('✅ Student club join statistics recorded and synchronized');
      studentScoringResult = { success: true, userPointsAwarded: 0 };
      
    } catch (error) {
      console.error('❌ Student join club notification failed:', error);
      console.error('❌ Student join club error details:', error instanceof Error ? error.message : String(error));
      console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    }

    // 6. Aktivite kayıtları (async, hata durumunda devam et)
    const activityPromises = [];

    // Kulüp aktivite kaydı
    activityPromises.push(
      userActivityService.createActivity({
        userId: clubId,
        userName: clubData.displayName || clubData.clubName || 'Kulüp',
        type: 'club_approved',
        targetId: requestData.userId,
        targetName: userData.displayName || 'Anonim',
        description: `${userData.displayName || 'Anonim'} adlı kullanıcının üyelik başvurusunu onayladınız`,
        metadata: {
          changeDetails: {
            memberName: userData.displayName || 'Anonim',
            memberId: requestData.userId,
            actionType: 'approve',
            timestamp: new Date().toISOString()
          }
        }
      }).catch(error => {
        console.error('❌ Club activity creation failed:', error);
      })
    );

    // Öğrenci aktivite kaydı - club_join kullan (kendi eylemi)
    activityPromises.push(
      userActivityService.logClubJoin(
        requestData.userId,
        userData.displayName || 'Anonim',
        clubId,
        clubData.displayName || clubData.clubName || 'Kulüp'
      ).catch(error => {
        console.error('❌ Student activity creation failed:', error);
      })
    );

    // 7. Unified Notification System - Üyelik onaylandı bildirimi
    try {
      const clubInfo = await UnifiedNotificationService.getClubInfo(clubId);
      await UnifiedNotificationService.notifyStudentMembershipApproved(
        requestData.userId,
        clubId,
        clubInfo.name,
        clubInfo.image
      );
      console.log('✅ Unified notification system - membership approved notification sent');
    } catch (unifiedNotificationError) {
      console.error('❌ Unified notification system failed:', unifiedNotificationError);
    }

    // 8. Kulüp istatistikleri güncelleme
    const statsPromises = [];
    
    statsPromises.push(
      ClubStatsService.incrementMemberCount(clubId).catch(error => {
        console.error('❌ Club stats update failed:', error);
      })
    );

    // 9. Kulüp aktivite logu
    const clubActivityPromises = [];
    
    clubActivityPromises.push(
      clubActivityService.createMembershipActivity(
        'member_joined',
        clubId,
        approverId,
        'Kulüp Yöneticisi',
        requestData.userId,
        userData.displayName || 'Anonim'
      ).catch(error => {
        console.error('❌ Club activity log failed:', error);
      })
    );

    // Tüm async işlemleri paralel olarak çalıştır (scoring ve bildirimler zaten yapıldı)
    await Promise.allSettled([
      ...activityPromises,
      ...statsPromises,
      ...clubActivityPromises
    ]);

    console.log('✅ Membership approval completed successfully:', requestId);
    return { success: true };

  } catch (error) {
    console.error('❌ Error in approveMembershipRequest:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Üyelik onaylanırken bir hata oluştu.' 
    };
  }
};

/**
 * ❌ Üyelik isteğini reddetme - Profesyonel implementasyon
 */
export const rejectMembershipRequest = async (
  requestId: string,
  rejecterId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> => {
  const db = firebase.firestore();
  
  try {
    console.log('🎯 Starting membership rejection process:', { requestId, rejecterId, reason });

    // İsteği getir ve validate et
    const requestDoc = await db.collection('membershipRequests').doc(requestId).get();
    if (!requestDoc.exists) {
      return { success: false, error: 'Üyelik isteği bulunamadı.' };
    }

    const requestData = requestDoc.data() as MembershipRequest;
    
    if (requestData.status !== 'pending') {
      return { success: false, error: 'Bu istek zaten işleme alınmış.' };
    }

    // Kullanıcı ve kulüp bilgilerini paralel olarak getir
    const [userDoc, clubDoc] = await Promise.all([
      db.collection('users').doc(requestData.userId).get(),
      db.collection('users').doc(requestData.clubId).get()
    ]);

    const userData = userDoc.data();
    const clubData = clubDoc.data();

    if (!userData || !clubData) {
      return { success: false, error: 'Kullanıcı veya kulüp bilgileri bulunamadı.' };
    }

    // İsteği reject olarak güncelle
    await db.collection('membershipRequests').doc(requestId).update({
      status: 'rejected',
      rejectedDate: firebase.firestore.FieldValue.serverTimestamp(),
      rejectedBy: rejecterId,
      rejectionReason: reason || ''
    });

    console.log('✅ Database operations completed successfully');

    // Async işlemler için promise array'ler
    const activityPromises = [];
    const clubActivityPromises = [];

    // Club member rejection statistics are tracked directly in Firebase collections
    console.log('✅ Club member rejection statistics recorded');

    // Aktivite kayıtları
    // Kulüp aktivite kaydı
    activityPromises.push(
      userActivityService.createActivity({
        userId: requestData.clubId,
        userName: clubData.displayName || clubData.clubName || 'Kulüp',
        type: 'club_rejected',
        targetId: requestData.userId,
        targetName: userData.displayName || 'Anonim',
        description: `${userData.displayName || 'Anonim'} adlı kullanıcının üyelik başvurusunu reddettiniz`,
        metadata: {
          changeDetails: {
            memberName: userData.displayName || 'Anonim',
            memberId: requestData.userId,
            reason: reason || 'Sebep belirtilmedi',
            actionType: 'reject',
            timestamp: new Date().toISOString()
          }
        }
      }).catch(error => {
        console.error('❌ Club activity creation failed:', error);
      })
    );

    // Öğrenci aktivite kaydı
    activityPromises.push(
      userActivityService.createActivity({
        userId: requestData.userId,
        userName: userData.displayName || 'Anonim',
        type: 'club_rejected',
        targetId: requestData.clubId,
        targetName: clubData.displayName || clubData.clubName || 'Kulüp',
        description: `${clubData.displayName || clubData.clubName || 'Kulüp'} kulübünden üyelik başvurunuz reddedildi`,
        metadata: {
          changeDetails: {
            clubName: clubData.displayName || clubData.clubName || 'Kulüp',
            clubId: requestData.clubId,
            reason: reason || 'Sebep belirtilmedi',
            actionType: 'rejected',
            timestamp: new Date().toISOString()
          }
        }
      }).catch(error => {
        console.error('❌ Student activity creation failed:', error);
      })
    );

    // Unified Notification System - Üyelik reddedildi bildirimi
    try {
      const clubInfo = await UnifiedNotificationService.getClubInfo(requestData.clubId);
      await UnifiedNotificationService.notifyStudentMembershipRejected(
        requestData.userId,
        requestData.clubId,
        clubInfo.name,
        reason
      );
      console.log('✅ Unified notification system - membership rejected notification sent');
    } catch (unifiedNotificationError) {
      console.error('❌ Unified notification system failed:', unifiedNotificationError);
    }

    // Kulüp aktivite logu
    clubActivityPromises.push(
      clubActivityService.createMembershipActivity(
        'member_left', // Red edildi olarak member_left kaydedilsin
        requestData.clubId,
        rejecterId,
        'Kulüp Yöneticisi',
        requestData.userId,
        userData.displayName || 'Anonim'
      ).catch(error => {
        console.error('❌ Club activity log failed:', error);
      })
    );

    // Tüm async işlemleri paralel olarak çalıştır (bildirimler zaten yapıldı)
    await Promise.allSettled([
      ...activityPromises,
      ...clubActivityPromises
    ]);

    console.log('✅ Membership rejection completed successfully:', requestId);
    return { success: true };

  } catch (error) {
    console.error('❌ Error in rejectMembershipRequest:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Üyelik reddedilirken bir hata oluştu.' 
    };
  }
};

/**
 * 🚪 Kulüpten ayrılma (öğrenci kendi isteğiyle) - Profesyonel implementasyon
 */
export const leaveClub = async (
  userId: string,
  clubId: string
): Promise<{ success: boolean; error?: string }> => {
  const db = firebase.firestore();
  
  try {
    console.log('🎯 Starting club leave process:', { userId, clubId });

    // Önce üyelik kontrolü yap
    const memberQuery = await db
      .collection('clubMembers')
      .where('userId', '==', userId)
      .where('clubId', '==', clubId)
      .where('status', '==', 'approved')
      .get();

    if (memberQuery.empty) {
      return { success: false, error: 'Bu kulübün aktif üyesi değilsiniz.' };
    }

    // Kullanıcı ve kulüp bilgilerini paralel olarak getir
    const [userDoc, clubDoc] = await Promise.all([
      db.collection('users').doc(userId).get(),
      db.collection('users').doc(clubId).get()
    ]);

    const userData = userDoc.data();
    const clubData = clubDoc.data();

    if (!userData || !clubData) {
      return { success: false, error: 'Kullanıcı veya kulüp bilgileri bulunamadı.' };
    }

    // Batch transaction ile veritabanı işlemlerini atomik olarak yap
    const batch = db.batch();

    // 1. Üyeliği pasif yap
    memberQuery.docs.forEach(doc => {
      batch.update(doc.ref, {
        status: 'left',
        leaveDate: firebase.firestore.FieldValue.serverTimestamp()
      });
    });

    // 2. Kulüp member count'unu azalt
    batch.update(db.collection('users').doc(clubId), {
      memberCount: firebase.firestore.FieldValue.increment(-1)
    });

    // 3. Batch'i commit et
    await batch.commit();
    console.log('✅ Database operations completed successfully');

    // 4. Club leave statistics are tracked directly in Firebase collections
    console.log('✅ Club leave statistics recorded');
    
    let leaveScoringResult: any = { success: true, userPointsAwarded: 0 };

    // Async işlemler için promise array'ler
    const activityPromises = [];
    const statsPromises = [];
    const clubActivityPromises = [];

    // Aktivite kayıtları
    // Öğrenci aktivite kaydı - club_left kullan
    activityPromises.push(
      userActivityService.logClubLeft(
        userId,
        userData.displayName || 'Anonim',
        clubId,
        clubData.displayName || clubData.clubName || 'Kulüp'
      ).catch(error => {
        console.error('❌ Student activity creation failed:', error);
      })
    );

    // Kulüp aktivite kaydı
    activityPromises.push(
      userActivityService.createActivity({
        userId: clubId,
        userName: clubData.displayName || clubData.clubName || 'Kulüp',
        type: 'club_leave',
        title: 'Üye Ayrıldı',
        description: `${userData.displayName || 'Anonim'} kulübünüzden ayrıldı`,
        targetId: userId,
        targetName: userData.displayName || 'Anonim',
        clubId: clubId,
        category: 'social',
        visibility: 'public',
        priority: 'low',
        metadata: {
          changeDetails: {
            memberName: userData.displayName || 'Anonim',
            memberId: userId,
            actionType: 'member_left_voluntary',
            timestamp: new Date().toISOString()
          }
        }
      }).catch(error => {
        console.error('❌ Club activity creation failed:', error);
      })
    );

    // Modern bildirimler sistemi - Senkronize edilmiş bildirimler
    console.log('📢 Sending synchronized leave notifications...');
    
    // Unified Notification System - Üyelikten çıkarma bildirimi
    try {
      const clubInfo = await UnifiedNotificationService.getClubInfo(clubId);
      await UnifiedNotificationService.notifyStudentMembershipRemoved(
        userId,
        clubId,
        clubInfo.name
      );
      console.log('✅ Unified notification system - club leave notification sent');
    } catch (unifiedNotificationError) {
      console.error('❌ Unified notification system failed:', unifiedNotificationError);
    }

    // İstatistikler
    statsPromises.push(
      ClubStatsService.decrementMemberCount(clubId).catch(error => {
        console.error('❌ Club stats update failed:', error);
      })
    );

    // Kulüp aktivite logu
    clubActivityPromises.push(
      clubActivityService.createMembershipActivity(
        'member_left',
        clubId,
        userId,
        userData.displayName || 'Anonim',
        userId,
        userData.displayName || 'Anonim'
      ).catch(error => {
        console.error('❌ Club activity log failed:', error);
      })
    );

    // Tüm async işlemleri paralel olarak çalıştır (scoring ve bildirimler zaten yapıldı)
    await Promise.allSettled([
      ...activityPromises,
      ...statsPromises,
      ...clubActivityPromises
    ]);

    console.log('✅ Club leave completed successfully:', { userId, clubId });
    return { success: true };

  } catch (error) {
    console.error('❌ Error in leaveClub:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Kulüpten ayrılırken bir hata oluştu.' 
    };
  }
};

/**
 * 👮 Kulüpten çıkarma (kulüp yöneticisi tarafından) - Profesyonel implementasyon
 */
export const kickMember = async (
  clubId: string,
  targetUserId: string,
  kickedBy: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> => {
  const db = firebase.firestore();
  
  try {
    console.log('🎯 Starting member kick process:', { clubId, targetUserId, kickedBy, reason });

    // Önce üyelik kontrolü yap
    const memberQuery = await db
      .collection('clubMembers')
      .where('userId', '==', targetUserId)
      .where('clubId', '==', clubId)
      .where('status', '==', 'approved')
      .get();

    if (memberQuery.empty) {
      return { success: false, error: 'Bu kullanıcı kulübün aktif üyesi değil.' };
    }

    // Kullanıcı ve kulüp bilgilerini paralel olarak getir
    const [userDoc, clubDoc] = await Promise.all([
      db.collection('users').doc(targetUserId).get(),
      db.collection('users').doc(clubId).get()
    ]);

    const userData = userDoc.data();
    const clubData = clubDoc.data();

    if (!userData || !clubData) {
      return { success: false, error: 'Kullanıcı veya kulüp bilgileri bulunamadı.' };
    }

    // Batch transaction ile veritabanı işlemlerini atomik olarak yap
    const batch = db.batch();

    // 1. Üyeliği pasif yap ve çıkarma bilgilerini ekle
    memberQuery.docs.forEach(doc => {
      batch.update(doc.ref, {
        status: 'kicked',
        kickDate: firebase.firestore.FieldValue.serverTimestamp(),
        kickedBy: kickedBy,
        kickReason: reason || ''
      });
    });

    // 2. Kulüp member count'unu azalt
    batch.update(db.collection('users').doc(clubId), {
      memberCount: firebase.firestore.FieldValue.increment(-1)
    });

    // 3. Batch'i commit et
    await batch.commit();
    console.log('✅ Database operations completed successfully');

    // 4. Member kick statistics are tracked directly in Firebase collections
    console.log('✅ Member kick statistics recorded');
    
    let studentKickResult: any = { success: true, userPointsAwarded: 0 };
    let clubKickResult: any = { success: true, clubPointsAwarded: 0 };

    // Club kick statistics are already recorded above
    console.log('✅ Club kick statistics recorded');

    // Async işlemler için promise array'ler
    const activityPromises = [];
    const statsPromises = [];
    const clubActivityPromises = [];

    // Aktivite kayıtları
    // Çıkarılan kullanıcının aktivite kaydı
    activityPromises.push(
      userActivityService.logClubKicked(
        targetUserId,
        userData.displayName || 'Anonim',
        clubId,
        clubData.displayName || clubData.clubName || 'Kulüp'
      ).catch(error => {
        console.error('❌ Student activity creation failed:', error);
      })
    );

    // Kulüp aktivite kaydı - Üye çıkarma
    activityPromises.push(
      userActivityService.createActivity({
        userId: clubId,
        userName: clubData.displayName || clubData.clubName || 'Kulüp',
        type: 'club_rejected', // Kulüp için üye çıkarma işlemi
        title: 'Üye Çıkarıldı',
        description: `${userData.displayName || 'Anonim'} adlı üyeyi kulüpten çıkardınız`,
        targetId: targetUserId,
        targetName: userData.displayName || 'Anonim',
        clubId: clubId,
        category: 'social',
        visibility: 'public',
        priority: 'medium',
        metadata: {
          changeDetails: {
            memberName: userData.displayName || 'Anonim',
            memberId: targetUserId,
            reason: reason || 'Sebep belirtilmedi',
            kickedBy: kickedBy,
            actionType: 'member_kicked_by_admin',
            timestamp: new Date().toISOString()
          }
        }
      }).catch(error => {
        console.error('❌ Club activity creation failed:', error);
      })
    );

    // Modern bildirimler sistemi - Senkronize edilmiş bildirimler
    console.log('📢 Sending synchronized kick notifications...');
    
    // Unified Notification System - Üyelikten çıkarma bildirimi
    try {
      const clubInfo = await UnifiedNotificationService.getClubInfo(clubId);
      await UnifiedNotificationService.notifyStudentMembershipRemoved(
        targetUserId,
        clubId,
        clubInfo.name,
        reason
      );
      console.log('✅ Unified notification system - member kick notification sent');
    } catch (unifiedNotificationError) {
      console.error('❌ Unified notification system failed:', unifiedNotificationError);
    }

    // İstatistikler
    statsPromises.push(
      ClubStatsService.decrementMemberCount(clubId).catch(error => {
        console.error('❌ Club stats update failed:', error);
      })
    );

    // Kulüp aktivite logu
    clubActivityPromises.push(
      clubActivityService.createMembershipActivity(
        'member_left',
        clubId,
        kickedBy,
        'Kulüp Yöneticisi',
        targetUserId,
        userData.displayName || 'Anonim'
      ).catch(error => {
        console.error('❌ Club activity log failed:', error);
      })
    );

    // Tüm async işlemleri paralel olarak çalıştır (scoring ve bildirimler zaten yapıldı)
    await Promise.allSettled([
      ...activityPromises,
      ...statsPromises,
      ...clubActivityPromises
    ]);

    console.log('✅ Member kick completed successfully:', { clubId, targetUserId, kickedBy });
    return { success: true };

  } catch (error) {
    console.error('❌ Error in kickMember:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Üye çıkarılırken bir hata oluştu.' 
    };
  }
};
