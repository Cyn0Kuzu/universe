import { firestore } from '../firebase/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Global Avatar Cache Service
 * Kullanıcı profil fotoğraflarını önbellekte tutar ve tüm uygulamada otomatik günceller
 */

export interface UserAvatarData {
  userId: string;
  profileImage?: string;
  displayName?: string;
  userName?: string; // username/handle
  firstName?: string;
  lastName?: string;
  university?: string;
  department?: string;
  clubName?: string;
  updatedAt: number;
}

type AvatarUpdateListener = (userData: UserAvatarData) => void;

class GlobalAvatarCacheService {
  private avatarCache = new Map<string, UserAvatarData>();
  private listeners = new Map<string, Set<AvatarUpdateListener>>();
  private realtimeListeners = new Map<string, () => void>();

  private CACHE_KEY_PREFIX = 'avatar_cache_';
  private CACHE_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 saat

  /**
   * Kullanıcının avatar verilerini cache'den al
   */
  async getUserAvatarData(userId: string): Promise<UserAvatarData | null> {
    try {
      // Önce memory cache'den kontrol et
      if (this.avatarCache.has(userId)) {
        const cachedData = this.avatarCache.get(userId)!;
        // Cache geçerli mi kontrol et
        if (Date.now() - cachedData.updatedAt < this.CACHE_EXPIRY_TIME) {
          return cachedData;
        }
      }

      // AsyncStorage'dan kontrol et
      const cacheKey = `${this.CACHE_KEY_PREFIX}${userId}`;
      const cachedJson = await AsyncStorage.getItem(cacheKey);
      
      if (cachedJson) {
        const cachedData: UserAvatarData = JSON.parse(cachedJson);
        if (Date.now() - cachedData.updatedAt < this.CACHE_EXPIRY_TIME) {
          this.avatarCache.set(userId, cachedData);
          return cachedData;
        }
      }

      // Cache'de yoksa veya süresi dolmuşsa Firestore'dan al
      return await this.fetchAndCacheUserData(userId);
    } catch (error) {
      console.error('getUserAvatarData error:', error);
      return null;
    }
  }

  /**
   * Firestore'dan kullanıcı verilerini al ve cache'le
   */
  private async fetchAndCacheUserData(userId: string): Promise<UserAvatarData | null> {
    try {
      const userDoc = await firestore.collection('users').doc(userId).get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        const avatarData: UserAvatarData = {
          userId,
          profileImage: userData?.profileImage || userData?.profilePicture || userData?.photoURL,
          // Prefer explicit displayName if provided; otherwise fall back to first+last, then other fields
          displayName: userData?.displayName
            || ((userData?.firstName && userData?.lastName) ? `${userData.firstName} ${userData.lastName}` : undefined)
            || userData?.name
            || userData?.clubName,
          userName: userData?.username || userData?.userName,
          firstName: userData?.firstName,
          lastName: userData?.lastName,
          university: userData?.university,
          department: userData?.department,
          clubName: userData?.clubName,
          updatedAt: Date.now(),
        };

        // Cache'le
        await this.cacheUserData(avatarData);
        
        return avatarData;
      }
      
      return null;
    } catch (error) {
      console.error('fetchAndCacheUserData error:', error);
      return null;
    }
  }

  /**
   * Kullanıcı verilerini cache'le
   */
  private async cacheUserData(userData: UserAvatarData): Promise<void> {
    try {
      // Memory cache
      this.avatarCache.set(userData.userId, userData);
      
      // AsyncStorage cache
      const cacheKey = `${this.CACHE_KEY_PREFIX}${userData.userId}`;
      await AsyncStorage.setItem(cacheKey, JSON.stringify(userData));
      
      if (__DEV__) {
        console.log(`🖼️ Avatar cached for user ${userData.userId}`);
      }
    } catch (error) {
      console.error('cacheUserData error:', error);
    }
  }

  /**
   * Kullanıcı profil fotoğrafını güncelle ve tüm listenerlara bildir
   */
  async updateUserAvatar(userId: string, profileImage: string, displayName?: string): Promise<void> {
    try {
      const avatarData: UserAvatarData = {
        userId,
        profileImage,
        displayName,
        updatedAt: Date.now(),
      };

      // Cache'i güncelle
      await this.cacheUserData(avatarData);

      // Tüm listenerlara bildir
      this.notifyListeners(userId, avatarData);

      console.log(`🔄 Avatar updated and broadcasted for user ${userId}`);
    } catch (error) {
      console.error('updateUserAvatar error:', error);
    }
  }

  /**
   * Belirli bir kullanıcı için avatar güncellemelerini dinle
   */
  subscribeToAvatarUpdates(userId: string, listener: AvatarUpdateListener): () => void {
    if (!this.listeners.has(userId)) {
      this.listeners.set(userId, new Set());
    }
    
    this.listeners.get(userId)!.add(listener);

    // Real-time listener kur (eğer yoksa)
    this.setupRealtimeListener(userId);

    if (__DEV__) {
      console.log(`👂 Avatar listener added for user ${userId}`);
    }

    // Unsubscribe fonksiyonu döndür
    return () => {
      const userListeners = this.listeners.get(userId);
      if (userListeners) {
        userListeners.delete(listener);
        
        // Eğer bu kullanıcı için artık listener kalmadıysa real-time listener'ı kaldır
        if (userListeners.size === 0) {
          this.listeners.delete(userId);
          this.removeRealtimeListener(userId);
        }
      }
      console.log(`👂 Avatar listener removed for user ${userId}`);
    };
  }

  /**
   * Real-time Firestore listener kur
   */
  private setupRealtimeListener(userId: string): void {
    if (this.realtimeListeners.has(userId)) {
      return; // Zaten listener var
    }

    const unsubscribe = firestore.collection('users').doc(userId)
      .onSnapshot(
        (doc) => {
          if (doc.exists) {
            const userData = doc.data();
            const avatarData: UserAvatarData = {
              userId,
              profileImage: userData?.profileImage || userData?.profilePicture || userData?.photoURL,
              // Prefer explicit displayName if provided
              displayName: userData?.displayName
                || ((userData?.firstName && userData?.lastName) ? `${userData.firstName} ${userData.lastName}` : undefined)
                || userData?.name
                || userData?.clubName,
              userName: userData?.username || userData?.userName,
              firstName: userData?.firstName,
              lastName: userData?.lastName,
              university: userData?.university,
              department: userData?.department,
              clubName: userData?.clubName,
              updatedAt: Date.now(),
            };

            // Cache'i güncelle
            this.cacheUserData(avatarData);

            // Listenerlara bildir
            this.notifyListeners(userId, avatarData);

            if (__DEV__) {
              console.log(`🔄 Real-time avatar update for user ${userId}`);
            }
          }
        },
        (error) => {
          console.error(`Real-time listener error for user ${userId}:`, error);
        }
      );

    this.realtimeListeners.set(userId, unsubscribe);
    if (__DEV__) {
      console.log(`📡 Real-time avatar listener setup for user ${userId}`);
    }
  }

  /**
   * Real-time listener'ı kaldır
   */
  private removeRealtimeListener(userId: string): void {
    const unsubscribe = this.realtimeListeners.get(userId);
    if (unsubscribe) {
      unsubscribe();
      this.realtimeListeners.delete(userId);
      console.log(`📡 Real-time avatar listener removed for user ${userId}`);
    }
  }

  /**
   * Listenerlara güncelleme bildir
   */
  private notifyListeners(userId: string, avatarData: UserAvatarData): void {
    const userListeners = this.listeners.get(userId);
    if (userListeners) {
      userListeners.forEach((listener) => {
        try {
          listener(avatarData);
        } catch (error) {
          console.error('Listener notification error:', error);
        }
      });
    }
  }

  /**
   * Cache'i temizle
   */
  async clearCache(): Promise<void> {
    try {
      this.avatarCache.clear();
      
      // AsyncStorage'dan tüm avatar cache'lerini kaldır
      const keys = await AsyncStorage.getAllKeys();
      const avatarKeys = keys.filter(key => key.startsWith(this.CACHE_KEY_PREFIX));
      await AsyncStorage.multiRemove(avatarKeys);
      
      console.log('🧹 Avatar cache cleared');
    } catch (error) {
      console.error('clearCache error:', error);
    }
  }

  /**
   * Belirli bir kullanıcının cache'ini temizle ve fresh data al
   */
  async refreshUserData(userId: string): Promise<UserAvatarData | null> {
    try {
      // Memory cache'den sil
      this.avatarCache.delete(userId);
      
      // AsyncStorage'dan sil
      const cacheKey = `${this.CACHE_KEY_PREFIX}${userId}`;
      await AsyncStorage.removeItem(cacheKey);
      
      // Fresh data al
      const freshData = await this.fetchAndCacheUserData(userId);
      
      // Eğer bu kullanıcı için listener varsa, güncellemeleri bildir
      if (freshData) {
        this.notifyListeners(userId, freshData);
      }
      
      console.log(`🔄 User data refreshed for ${userId}`);
      return freshData;
    } catch (error) {
      console.error('refreshUserData error:', error);
      return null;
    }
  }

  /**
   * Toplu kullanıcı verilerini cache'le (liste sayfaları için)
   */
  async batchCacheUsers(userIds: string[]): Promise<Map<string, UserAvatarData>> {
    const results = new Map<string, UserAvatarData>();
    
    try {
      // Firestore'dan toplu veri al
      const userDocs = await Promise.all(
        userIds.map(userId => firestore.collection('users').doc(userId).get())
      );

      for (let i = 0; i < userDocs.length; i++) {
        const doc = userDocs[i];
        const userId = userIds[i];
        
        if (doc.exists) {
          const userData = doc.data();
          const avatarData: UserAvatarData = {
            userId,
            profileImage: userData?.profileImage || userData?.profilePicture || userData?.photoURL,
            // Prefer explicit displayName if provided
            displayName: userData?.displayName
              || ((userData?.firstName && userData?.lastName) ? `${userData.firstName} ${userData.lastName}` : undefined)
              || userData?.name
              || userData?.clubName,
            userName: userData?.username || userData?.userName,
            firstName: userData?.firstName,
            lastName: userData?.lastName,
            university: userData?.university,
            department: userData?.department,
            clubName: userData?.clubName,
            updatedAt: Date.now(),
          };

          results.set(userId, avatarData);
          await this.cacheUserData(avatarData);
        }
      }

      console.log(`🔄 Batch cached ${results.size} user avatars`);
    } catch (error) {
      console.error('batchCacheUsers error:', error);
    }

    return results;
  }
}

// Singleton instance
export const globalAvatarCache = new GlobalAvatarCacheService();

export default globalAvatarCache;

// Optional aliases for profile-centric usage
export const getUserProfileLite = (userId: string) => globalAvatarCache.getUserAvatarData(userId);
export const subscribeToProfileUpdates = (
  userId: string,
  listener: AvatarUpdateListener
) => globalAvatarCache.subscribeToAvatarUpdates(userId, listener);
