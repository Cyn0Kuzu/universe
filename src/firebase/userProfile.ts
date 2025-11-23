// 🛡️ CRITICAL: LAZY LOAD Firebase modules to prevent iOS crashes
// Firebase modules are loaded asynchronously on first use, not at module load time
// @ts-ignore - AsyncStorage type definitions may not be available
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirebaseCompatSync } from './compat';

// Type-safe require function
declare const require: (module: string) => any;

// Lazy Firebase getter - prevents synchronous native module initialization
const getFirebase = async () => {
  const configModule = require('./config');
  await configModule.initializeFirebaseServices();
  const firebaseModule = require('firebase/compat/app');
  // Ensure compat modules are loaded
  require('firebase/compat/firestore');
  return firebaseModule.default || firebaseModule;
};

/**
 * AsyncStorage anahtarları
 */
const STORAGE_KEYS = {
  followerCount: (userId: string) => `followerCount_${userId}`,
  followingCount: (userId: string) => `followingCount_${userId}`,
  userProfile: (userId: string) => `userProfile_${userId}`,
};

/**
 * Kullanıcının takipçi sayısını AsyncStorage'dan al
 */
export const getFollowerCountFromStorage = async (userId: string): Promise<number> => {
  try {
    const count = await AsyncStorage.getItem(STORAGE_KEYS.followerCount(userId));
    return count ? parseInt(count, 10) : 0;
  } catch (error) {
    console.error('Takipçi sayısı alınırken hata:', error);
    return 0;
  }
};

/**
 * Kullanıcının takip ettiği sayısını AsyncStorage'dan al
 */
export const getFollowingCountFromStorage = async (userId: string): Promise<number> => {
  try {
    const count = await AsyncStorage.getItem(STORAGE_KEYS.followingCount(userId));
    return count ? parseInt(count, 10) : 0;
  } catch (error) {
    console.error('Takip edilen sayısı alınırken hata:', error);
    return 0;
  }
};

/**
 * Kullanıcının takipçi sayısını AsyncStorage'a kaydet
 */
export const saveFollowerCountToStorage = async (userId: string, count: number): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.followerCount(userId), count.toString());
  } catch (error) {
    console.error('Takipçi sayısı kaydedilirken hata:', error);
  }
};

/**
 * Kullanıcının takip ettiği sayısını AsyncStorage'a kaydet
 */
export const saveFollowingCountToStorage = async (userId: string, count: number): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.followingCount(userId), count.toString());
  } catch (error) {
    console.error('Takip edilen sayısı kaydedilirken hata:', error);
  }
};

/**
 * Takipçi sayısını artır
 */
export const incrementFollowerCount = async (userId: string): Promise<number> => {
  try {
    const currentCount = await getFollowerCountFromStorage(userId);
    const newCount = currentCount + 1;
    await saveFollowerCountToStorage(userId, newCount);
    console.log(`${userId} kullanıcısının takipçi sayısı artırıldı: ${currentCount} -> ${newCount}`);
    return newCount;
  } catch (error) {
    console.error('Takipçi sayısı artırılırken hata:', error);
    return 0;
  }
};

/**
 * Takipçi sayısını azalt
 */
export const decrementFollowerCount = async (userId: string): Promise<number> => {
  try {
    const currentCount = await getFollowerCountFromStorage(userId);
    const newCount = Math.max(0, currentCount - 1);
    await saveFollowerCountToStorage(userId, newCount);
    console.log(`${userId} kullanıcısının takipçi sayısı azaltıldı: ${currentCount} -> ${newCount}`);
    return newCount;
  } catch (error) {
    console.error('Takipçi sayısı azaltılırken hata:', error);
    return 0;
  }
};

/**
 * Takip edilen sayısını artır
 */
export const incrementFollowingCount = async (userId: string): Promise<number> => {
  try {
    const currentCount = await getFollowingCountFromStorage(userId);
    const newCount = currentCount + 1;
    await saveFollowingCountToStorage(userId, newCount);
    console.log(`${userId} kullanıcısının takip ettiği sayısı artırıldı: ${currentCount} -> ${newCount}`);
    return newCount;
  } catch (error) {
    console.error('Takip edilen sayısı artırılırken hata:', error);
    return 0;
  }
};

/**
 * Takip edilen sayısını azalt
 */
export const decrementFollowingCount = async (userId: string): Promise<number> => {
  try {
    const currentCount = await getFollowingCountFromStorage(userId);
    const newCount = Math.max(0, currentCount - 1);
    await saveFollowingCountToStorage(userId, newCount);
    console.log(`${userId} kullanıcısının takip ettiği sayısı azaltıldı: ${currentCount} -> ${newCount}`);
    return newCount;
  } catch (error) {
    console.error('Takip edilen sayısı azaltılırken hata:', error);
    return 0;
  }
};

/**
 * Kullanıcı için takip sayılarını başlat (ilk kurulum için)
 */
export const initializeUserFollowCounts = async (userId: string): Promise<void> => {
  try {
    // Mevcut AsyncStorage verilerini kontrol et
    const existingFollowerCount = await getFollowerCountFromStorage(userId);
    const existingFollowingCount = await getFollowingCountFromStorage(userId);
    
    // Eğer hiç veri yoksa başlangıç değerlerini ayarla
    if (existingFollowerCount === 0 && existingFollowingCount === 0) {
      try {
        // 🛡️ CRITICAL: Lazy load Firebase before use
        const firebase = await getFirebase();
        
        // Database'den mevcut verileri al
        const db = getFirebaseCompatSync().firestore();
        const userDoc = await db.collection('users').doc(userId).get();
        
        if (userDoc.exists) {
          const userData = userDoc.data();
          const followers = userData?.followers || [];
          const following = userData?.following || [];
          
          // Gerçek sayıları AsyncStorage'a kaydet
          await saveFollowerCountToStorage(userId, followers.length);
          await saveFollowingCountToStorage(userId, following.length);
          
          console.log('✅ Kullanıcı takip sayıları başlatıldı:', {
            userId,
            followerCount: followers.length,
            followingCount: following.length
          });
        } else {
          // Kullanıcı yoksa varsayılan değerler
          await saveFollowerCountToStorage(userId, 0);
          await saveFollowingCountToStorage(userId, 0);
          
          console.log('⚠️ Kullanıcı bulunamadı, varsayılan değerler ayarlandı:', { userId });
        }
      } catch (dbError) {
        // Database hatası varsa varsayılan değerler
        await saveFollowerCountToStorage(userId, 0);
        await saveFollowingCountToStorage(userId, 0);
        
        console.log('⚠️ Database hatası, varsayılan değerler ayarlandı:', { userId, error: dbError });
      }
    } else {
      console.log('✅ Kullanıcı takip sayıları zaten mevcut:', {
        userId,
        followerCount: existingFollowerCount,
        followingCount: existingFollowingCount
      });
    }
  } catch (error) {
    console.error('Kullanıcı takip sayıları başlatılırken hata:', error);
  }
};

/**
 * Takip işlemi sonrası her iki kullanıcının sayılarını güncelle
 */
export const updateFollowCounts = async (
  followerId: string, 
  followeeId: string, 
  isFollowing: boolean
): Promise<{
  followerFollowingCount: number;
  followeeFollowerCount: number;
}> => {
  try {
    let followerFollowingCount: number;
    let followeeFollowerCount: number;

    if (isFollowing) {
      // Takip etme işlemi
      followerFollowingCount = await incrementFollowingCount(followerId);
      followeeFollowerCount = await incrementFollowerCount(followeeId);
    } else {
      // Takibi bırakma işlemi
      followerFollowingCount = await decrementFollowingCount(followerId);
      followeeFollowerCount = await decrementFollowerCount(followeeId);
    }

    console.log('Takip sayıları güncellendi:', {
      follower: followerId,
      followee: followeeId,
      isFollowing,
      followerFollowingCount,
      followeeFollowerCount
    });

    return {
      followerFollowingCount,
      followeeFollowerCount
    };
  } catch (error) {
    console.error('Takip sayıları güncellenirken hata:', error);
    return {
      followerFollowingCount: 0,
      followeeFollowerCount: 0
    };
  }
};

/**
 * Kullanıcı profilini güncel sayılarla yenileyen yardımcı fonksiyon
 * AsyncStorage tabanlı - permission sorunları olmadan çalışır
 */
export const refreshUserProfileCounts = async (userId: string): Promise<{
  followerCount: number;
  followingCount: number;
}> => {
  if (!userId) {
    return { followerCount: 0, followingCount: 0 };
  }
  
  try {
    // 1) AsyncStorage'daki mevcut sayıları oku
    let [storedFollower, storedFollowing] = await Promise.all([
      getFollowerCountFromStorage(userId),
      getFollowingCountFromStorage(userId)
    ]);

    // 2) Firestore'dan gerçek sayıları hesapla (array uzunlukları tercih edilir)
    let dbFollower = storedFollower;
    let dbFollowing = storedFollowing;
    try {
      // 🛡️ CRITICAL: Lazy load Firebase before use
      const firebase = await getFirebase();
      const db = getFirebaseCompatSync().firestore();
      const userDoc = await db.collection('users').doc(userId).get();
      if (userDoc.exists) {
        const userData: any = userDoc.data() || {};
        const followers: string[] = Array.isArray(userData.followers) ? userData.followers : [];
        const following: string[] = Array.isArray(userData.following) ? userData.following : [];
        const fallbackFollower = userData.followerCount || 0;
        const fallbackFollowing = userData.followingCount || 0;
        dbFollower = followers.length > 0 ? followers.length : fallbackFollower;
        dbFollowing = following.length > 0 ? following.length : fallbackFollowing;
      }
    } catch (dbErr) {
      console.log('⚠️ Firestore okuma hatası, AsyncStorage değerleri kullanılacak:', dbErr);
    }

    // 3) Mismatch varsa AsyncStorage'ı güncelle
    if (dbFollower !== storedFollower) {
      await saveFollowerCountToStorage(userId, dbFollower);
      storedFollower = dbFollower;
    }
    if (dbFollowing !== storedFollowing) {
      await saveFollowingCountToStorage(userId, dbFollowing);
      storedFollowing = dbFollowing;
    }

    console.log(`${userId} kullanıcısının güncel sayıları:`, {
      followerCount: storedFollower,
      followingCount: storedFollowing
    });

    return { followerCount: storedFollower, followingCount: storedFollowing };
    
  } catch (error: any) {
    console.error('Kullanıcı profil sayıları alınırken hata:', error);
    return { followerCount: 0, followingCount: 0 };
  }
};

/**
 * Bir kullanıcının takip ettiği/edildiği kullanıcıların sayılarını günceller
 * Bu fonksiyon takip/takibi bırakma işlemlerinden sonra çağrılmalıdır
 * AsyncStorage tabanlı - permission sorunları olmadan çalışır
 */
export const updateRelatedUsersCounts = async (
  userId: string, 
  targetUserId: string
): Promise<{
  userCounts: { followerCount: number; followingCount: number };
  targetUserCounts: { followerCount: number; followingCount: number };
}> => {
  try {
    const [userCounts, targetUserCounts] = await Promise.all([
      refreshUserProfileCounts(userId),
      refreshUserProfileCounts(targetUserId)
    ]);
    
    console.log('İlişkili kullanıcıların sayıları güncellendi:', {
      user: userId,
      userCounts,
      targetUser: targetUserId,
      targetUserCounts
    });
    
    return { userCounts, targetUserCounts };
  } catch (error: any) {
    console.error('İlişkili kullanıcıların sayıları güncellenirken hata:', error);
    return {
      userCounts: { followerCount: 0, followingCount: 0 },
      targetUserCounts: { followerCount: 0, followingCount: 0 }
    };
  }
};
