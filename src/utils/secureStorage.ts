import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserSession {
  uid: string;
  email: string;
  displayName?: string;
  emailVerified: boolean;
  userType: 'student' | 'club';
  token?: string;
  password?: string; // Remember Me için şifre saklama
  expiresAt: number;
}

export class SecureStorage {
  private static readonly KEYS = {
    USER_SESSION: 'user_session',
    REMEMBER_ME: 'remember_me',
    AUTH_TOKEN: 'auth_token',
    LAST_LOGIN: 'last_login'
  };

  // User session yönetimi - SINIRSIZ SÜRE
  static async setUserSession(user: UserSession, rememberMe: boolean = true): Promise<void> {
    try {
      const sessionData = {
        ...user,
        expiresAt: rememberMe ? Number.MAX_SAFE_INTEGER : Date.now() + (24 * 60 * 60 * 1000), // SINIRSIZ veya 1 gün
        rememberMe
      };

      await AsyncStorage.multiSet([
        [this.KEYS.USER_SESSION, JSON.stringify(sessionData)],
        [this.KEYS.REMEMBER_ME, rememberMe.toString()],
        [this.KEYS.LAST_LOGIN, Date.now().toString()]
      ]);

      console.log('✅ [SecureStorage] User session saved successfully - UNLIMITED DURATION');
    } catch (error) {
      console.error('❌ [SecureStorage] Failed to save user session:', error);
      throw error;
    }
  }

  static async getUserSession(): Promise<UserSession | null> {
    try {
      const sessionData = await AsyncStorage.getItem(this.KEYS.USER_SESSION);
      if (!sessionData) {
        console.log('🔍 [SecureStorage] No user session found');
        return null;
      }

      const session: UserSession = JSON.parse(sessionData);
      
      // Oturum süresi kontrolü
      if (Date.now() > session.expiresAt) {
        console.log('⏰ [SecureStorage] User session expired, clearing...');
        await this.clearUserSession();
        return null;
      }

      console.log('✅ [SecureStorage] Valid user session found');
      return session;
    } catch (error) {
      console.error('❌ [SecureStorage] Failed to get user session:', error);
      return null;
    }
  }

  static async clearUserSession(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        this.KEYS.USER_SESSION,
        this.KEYS.REMEMBER_ME,
        this.KEYS.AUTH_TOKEN
      ]);
      console.log('✅ [SecureStorage] User session cleared successfully');
    } catch (error) {
      console.error('❌ [SecureStorage] Failed to clear user session:', error);
    }
  }

  // Remember Me kontrolü
  static async getRememberMe(): Promise<boolean> {
    try {
      const rememberMe = await AsyncStorage.getItem(this.KEYS.REMEMBER_ME);
      return rememberMe === 'true';
    } catch (error) {
      console.error('❌ [SecureStorage] Failed to get remember me status:', error);
      return false;
    }
  }

  // Cache yönetimi
  static async setCache(key: string, data: any, ttlMinutes: number = 60): Promise<void> {
    try {
      const cacheData = {
        data,
        expiresAt: Date.now() + (ttlMinutes * 60 * 1000)
      };
      await AsyncStorage.setItem(`cache_${key}`, JSON.stringify(cacheData));
    } catch (error) {
      console.error('❌ [SecureStorage] Failed to set cache:', error);
    }
  }

  static async getCache(key: string): Promise<any | null> {
    try {
      const cacheData = await AsyncStorage.getItem(`cache_${key}`);
      if (!cacheData) return null;

      const parsed = JSON.parse(cacheData);
      if (Date.now() > parsed.expiresAt) {
        await AsyncStorage.removeItem(`cache_${key}`);
        return null;
      }

      return parsed.data;
    } catch (error) {
      console.error('❌ [SecureStorage] Failed to get cache:', error);
      return null;
    }
  }

  // Debug bilgileri
  static async getStorageInfo(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const items = await AsyncStorage.multiGet(keys);
      
      console.log('📱 [SecureStorage] Storage contents:');
      items.forEach(([key, value]: [string, string | null]) => {
        if (key.includes('user') || key.includes('auth') || key.includes('remember')) {
          console.log(`  ${key}: ${value ? 'EXISTS' : 'NULL'}`);
        }
      });
    } catch (error) {
      console.error('❌ [SecureStorage] Failed to get storage info:', error);
    }
  }
}

export default SecureStorage;
