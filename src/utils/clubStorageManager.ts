import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebase } from '../firebase/config';

/**
 * Kullanıcının takip ettiği kulüpleri AsyncStorage'dan yönetir
 */

const STORAGE_KEYS = {
  followedClubs: (userId: string) => `followedClubs_${userId}`,
  clubMemberships: (userId: string) => `clubMemberships_${userId}`,
};

export interface FollowedClub {
  clubId: string;
  clubName: string;
  displayName?: string;
  profileImage?: string;
  university?: string;
  followedAt: string; // ISO string
}

export interface ClubMembership {
  clubId: string;
  clubName: string;
  role: 'member' | 'admin';
  joinedAt: string; // ISO string
}

/**
 * Takip edilen kulüp listesini AsyncStorage'dan al
 */
export const getFollowedClubsFromStorage = async (userId: string): Promise<FollowedClub[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.followedClubs(userId));
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Takip edilen kulüpler alınırken hata:', error);
    return [];
  }
};

/**
 * Takip edilen kulüp listesini AsyncStorage'a kaydet
 */
export const saveFollowedClubsToStorage = async (userId: string, clubs: FollowedClub[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.followedClubs(userId), JSON.stringify(clubs));
    console.log(`✅ ${clubs.length} takip edilen kulüp AsyncStorage'a kaydedildi`);
  } catch (error) {
    console.error('Takip edilen kulüpler kaydedilirken hata:', error);
  }
};

/**
 * Yeni bir kulübü takip listesine ekle
 */
export const addFollowedClubToStorage = async (
  userId: string, 
  clubData: Omit<FollowedClub, 'followedAt'>
): Promise<void> => {
  try {
    const existingClubs = await getFollowedClubsFromStorage(userId);
    
    // Zaten takip ediliyor mu kontrol et
    const isAlreadyFollowed = existingClubs.some(club => club.clubId === clubData.clubId);
    
    if (!isAlreadyFollowed) {
      const newClub: FollowedClub = {
        ...clubData,
        followedAt: new Date().toISOString()
      };
      
      const updatedClubs = [...existingClubs, newClub];
      await saveFollowedClubsToStorage(userId, updatedClubs);
      
      console.log(`➕ Kulüp takip listesine eklendi: ${clubData.clubName}`);
    }
  } catch (error) {
    console.error('Kulüp takip listesine eklenirken hata:', error);
  }
};

/**
 * Bir kulübü takip listesinden çıkar
 */
export const removeFollowedClubFromStorage = async (userId: string, clubId: string): Promise<void> => {
  try {
    const existingClubs = await getFollowedClubsFromStorage(userId);
    const updatedClubs = existingClubs.filter(club => club.clubId !== clubId);
    
    await saveFollowedClubsToStorage(userId, updatedClubs);
    
    console.log(`➖ Kulüp takip listesinden çıkarıldı: ${clubId}`);
  } catch (error) {
    console.error('Kulüp takip listesinden çıkarılırken hata:', error);
  }
};

/**
 * Kulüp üyeliklerini AsyncStorage'dan al
 */
export const getClubMembershipsFromStorage = async (userId: string): Promise<ClubMembership[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.clubMemberships(userId));
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Kulüp üyelikleri alınırken hata:', error);
    return [];
  }
};

/**
 * Kulüp üyeliklerini AsyncStorage'a kaydet
 */
export const saveClubMembershipsToStorage = async (userId: string, memberships: ClubMembership[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.clubMemberships(userId), JSON.stringify(memberships));
    console.log(`✅ ${memberships.length} kulüp üyeliği AsyncStorage'a kaydedildi`);
  } catch (error) {
    console.error('Kulüp üyelikleri kaydedilirken hata:', error);
  }
};

/**
 * Database'den ilk kez yüklerken takip listelerini başlat
 */
export const initializeClubRelationsFromDatabase = async (userId: string): Promise<void> => {
  try {
    console.log('🔄 Kulüp ilişkileri database\'den başlatılıyor...');
    
    // AsyncStorage'da zaten veri var mı kontrol et
    const existingFollowedClubs = await getFollowedClubsFromStorage(userId);
    const existingMemberships = await getClubMembershipsFromStorage(userId);
    
    if (existingFollowedClubs.length > 0 || existingMemberships.length > 0) {
      console.log('✅ Kulüp ilişkileri zaten mevcut, database\'den yükleme atlanıyor');
      return;
    }
    
    // Database'den yükle (permission hatası yakalanacak)
    try {
      const db = firebase.firestore();
      
      // Kullanıcı verilerini al
      const userDoc = await db.collection('users').doc(userId).get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        const following = userData?.following || [];
        const clubMemberships = userData?.clubMemberships || [];
        
        // Takip edilen kulüpler için detayları al
        const followedClubPromises = following.map(async (clubId: string) => {
          try {
            const clubDoc = await db.collection('users').doc(clubId).get();
            if (clubDoc.exists) {
              const clubData = clubDoc.data();
              return {
                clubId,
                clubName: clubData?.clubName || clubData?.displayName || 'Bilinmeyen Kulüp',
                displayName: clubData?.displayName,
                profileImage: clubData?.profileImage,
                university: clubData?.university
              };
            }
          } catch (error) {
            console.error(`Kulüp detayları alınırken hata (${clubId}):`, error);
          }
          return null;
        });
        
        const followedClubsData = (await Promise.all(followedClubPromises)).filter(Boolean) as Omit<FollowedClub, 'followedAt'>[];
        
        // AsyncStorage'a kaydet
        const followedClubs: FollowedClub[] = followedClubsData.map(club => ({
          ...club,
          followedAt: new Date().toISOString()
        }));
        
        const memberships: ClubMembership[] = clubMemberships.map((membership: any) => ({
          clubId: membership.clubId,
          clubName: membership.clubName || 'Bilinmeyen Kulüp',
          role: membership.role || 'member',
          joinedAt: new Date().toISOString()
        }));
        
        await Promise.all([
          saveFollowedClubsToStorage(userId, followedClubs),
          saveClubMembershipsToStorage(userId, memberships)
        ]);
        
        console.log('✅ Kulüp ilişkileri database\'den başarıyla yüklendi:', {
          followedClubs: followedClubs.length,
          memberships: memberships.length
        });
      }
    } catch (dbError) {
      console.log('⚠️ Database\'den kulüp ilişkileri yüklenemedi, boş listeler kullanılacak:', dbError);
      // Varsayılan boş listeler
      await Promise.all([
        saveFollowedClubsToStorage(userId, []),
        saveClubMembershipsToStorage(userId, [])
      ]);
    }
  } catch (error) {
    console.error('Kulüp ilişkileri başlatılırken hata:', error);
  }
};

export default {
  getFollowedClubsFromStorage,
  saveFollowedClubsToStorage,
  addFollowedClubToStorage,
  removeFollowedClubFromStorage,
  getClubMembershipsFromStorage,
  saveClubMembershipsToStorage,
  initializeClubRelationsFromDatabase
};
