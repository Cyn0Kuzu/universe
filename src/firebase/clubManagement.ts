import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { ClubStatsService } from '../services/clubStatsService';
import { DetailedNotificationService } from '../services/detailedNotificationService';

/**
 * 👋 Kulüp üyeliğini geri alma
 */
export const leaveClub = async (userId: string, clubId: string): Promise<boolean> => {
  try {
    if (!userId || !clubId) {
      return false;
    }

    // Firestore'dan üyeliği kaldır
    const memberQuery = await firebase.firestore().collection('clubMembers')
      .where('userId', '==', userId)
      .where('clubId', '==', clubId)
      .limit(1)
      .get();

    if (!memberQuery.empty) {
      await memberQuery.docs[0].ref.delete();

      // Club member count'u güncelle
      await firebase.firestore().collection('clubs').doc(clubId).update({
        memberCount: firebase.firestore.FieldValue.increment(-1)
      });

      // İstatistikleri güncelle
      try {
        await ClubStatsService.decrementMemberCount(clubId);
      } catch (statsError) {
        console.warn('Club stats update failed:', statsError);
      }

      // Club leave is internal action, no notification needed
      // await DetailedNotificationService.notifyClubLeft(clubId, userId);

      // Synchronize club statistics  
      await DetailedNotificationService.syncClubStatistics(clubId);

      console.log('✅ Club leave statistics recorded and synchronized');

      return true;
    }

    return false;
  } catch (error) {
    console.error('Kulüp üyeliği geri alınırken hata:', error);
    return false;
  }
};

/**
 * 💔 Kulüp takipini geri alma
 */
export const unfollowClub = async (userId: string, clubId: string): Promise<boolean> => {
  try {
    if (!userId || !clubId) {
      return false;
    }

    // Firestore'dan takibi kaldır
    const followQuery = await firebase.firestore().collection('clubFollowers')
      .where('userId', '==', userId)
      .where('clubId', '==', clubId)
      .limit(1)
      .get();

    if (!followQuery.empty) {
      await followQuery.docs[0].ref.delete();

      // Club follower count'u güncelle
      await firebase.firestore().collection('clubs').doc(clubId).update({
        followerCount: firebase.firestore.FieldValue.increment(-1)
      });

      // Club unfollow is internal action, no specific notification needed
      // await DetailedNotificationService.notifyClubUnfollowed(clubId, userId);

      // Synchronize club statistics
      await DetailedNotificationService.syncClubStatistics(clubId);

      console.log('✅ Club unfollow statistics recorded and synchronized');

      return true;
    }

    return false;
  } catch (error) {
    console.error('Kulüp takibi geri alınırken hata:', error);
    return false;
  }
};

/**
 * 🗑️ Kulüp silme işlemi (Puanlama sistemini dikkate alarak)
 */
export const deleteClubSafely = async (clubId: string, userId: string): Promise<boolean> => {
  try {
    if (!clubId || !userId) {
      console.error('Geçersiz clubId veya userId');
      return false;
    }

    // Kulüp var mı kontrol et
    const clubDoc = await firebase.firestore().collection('clubs').doc(clubId).get();
    if (!clubDoc.exists) {
      console.error('Kulüp bulunamadı');
      return false;
    }

    const clubData = clubDoc.data();
    if (!clubData) {
      return false;
    }

    // Sadece kulüp sahibi silebilir
    if (clubData.creatorId !== userId) {
      console.error('Bu kulübü silme yetkiniz yok');
      return false;
    }

    // Club deletion is administrative action, no specific notification needed
    // await DetailedNotificationService.notifyClubDeleted(clubId, userId);

    // Synchronize all related statistics
    await DetailedNotificationService.syncClubStatistics(clubId);

    console.log('✅ Club deletion statistics recorded and synchronized');

    // İlgili koleksiyonları temizle
    const batch = firebase.firestore().batch();

    // Kulüp üyelerini sil
    const membersSnapshot = await firebase.firestore().collection('clubMembers')
      .where('clubId', '==', clubId)
      .get();
    membersSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Kulüp takipçilerini sil
    const followersSnapshot = await firebase.firestore().collection('clubFollowers')
      .where('clubId', '==', clubId)
      .get();
    followersSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Kulüp etkinliklerini sil
    const eventsSnapshot = await firebase.firestore().collection('events')
      .where('clubId', '==', clubId)
      .get();
    eventsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Kulübü sil
    batch.delete(firebase.firestore().collection('clubs').doc(clubId));

    await batch.commit();

    console.log(`✅ Kulüp güvenli şekilde silindi: ${clubId}`);
    return true;
  } catch (error) {
    console.error('Kulüp silinirken hata:', error);
    return false;
  }
};

/**
 * 🔍 Kullanıcının kulüp ile etkileşimini kontrol et
 */
export const checkUserClubInteraction = async (userId: string, clubId: string): Promise<{
  isMember: boolean;
  isFollower: boolean;
}> => {
  try {
    if (!userId || !clubId) {
      return { isMember: false, isFollower: false };
    }

    // Üyelik kontrolü
    const memberQuery = await firebase.firestore().collection('clubMembers')
      .where('userId', '==', userId)
      .where('clubId', '==', clubId)
      .limit(1)
      .get();

    // Takip kontrolü
    const followerQuery = await firebase.firestore().collection('clubFollowers')
      .where('userId', '==', userId)
      .where('clubId', '==', clubId)
      .limit(1)
      .get();

    return {
      isMember: !memberQuery.empty,
      isFollower: !followerQuery.empty
    };
  } catch (error) {
    console.error('Kulüp etkileşimi kontrol edilirken hata:', error);
    return { isMember: false, isFollower: false };
  }
};
