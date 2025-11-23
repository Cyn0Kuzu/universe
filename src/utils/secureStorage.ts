import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

interface UserSession {
  uid: string;
  email: string;
  displayName?: string;
  emailVerified: boolean;
  userType: 'student' | 'club';
  token?: string;
  password?: string; // Remember Me için şifre saklama (SecureStore ile şifrelenmiş olarak tutulur)
  expiresAt: number;
}

export interface AdminCredentials {
  username: string;
  password: string;
}

export class SecureStorage {
  private static readonly KEYS = {
    USER_SESSION: 'user_session',
    REMEMBER_ME: 'remember_me',
    AUTH_TOKEN: 'auth_token',
    LAST_LOGIN: 'last_login',
    ADMIN_CREDENTIALS: 'admin_credentials'
  };

  private static secureStoreReady: boolean | null = null;
  private static readonly SECURE_OPTIONS: SecureStore.SecureStoreOptions = {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  };

  private static async isSecureStoreAvailable(): Promise<boolean> {
    if (this.secureStoreReady === null) {
      try {
        this.secureStoreReady = await SecureStore.isAvailableAsync();
      } catch (error) {
        console.warn('⚠️ [SecureStorage] SecureStore availability check failed, falling back to AsyncStorage:', error);
        this.secureStoreReady = false;
      }
    }
    return this.secureStoreReady ?? false;
  }

  private static async writeSecureItem(key: string, value: string): Promise<void> {
    if (await this.isSecureStoreAvailable()) {
      await SecureStore.setItemAsync(key, value, this.SECURE_OPTIONS);
    } else {
      await AsyncStorage.setItem(key, value);
    }
  }

  private static async readSecureItem(key: string): Promise<string | null> {
    if (await this.isSecureStoreAvailable()) {
      return SecureStore.getItemAsync(key);
    }
    return AsyncStorage.getItem(key);
  }

  private static async deleteSecureItem(key: string): Promise<void> {
    if (await this.isSecureStoreAvailable()) {
      await SecureStore.deleteItemAsync(key, this.SECURE_OPTIONS);
    } else {
      await AsyncStorage.removeItem(key);
    }
  }

  // User session yönetimi - SecureStore ile
  static async setUserSession(user: UserSession, rememberMe: boolean = true): Promise<void> {
    try {
      const sessionData = {
        ...user,
        expiresAt: rememberMe ? Number.MAX_SAFE_INTEGER : Date.now() + (24 * 60 * 60 * 1000),
        rememberMe
      };

      await Promise.all([
        this.writeSecureItem(this.KEYS.USER_SESSION, JSON.stringify(sessionData)),
        this.writeSecureItem(this.KEYS.REMEMBER_ME, rememberMe.toString()),
        this.writeSecureItem(this.KEYS.LAST_LOGIN, Date.now().toString())
      ]);

      console.log('✅ [SecureStorage] User session saved securely');
    } catch (error) {
      console.error('❌ [SecureStorage] Failed to save user session:', error);
      throw error;
    }
  }

  static async getUserSession(): Promise<UserSession | null> {
    try {
      const sessionData = await this.readSecureItem(this.KEYS.USER_SESSION);
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
      await Promise.all([
        this.deleteSecureItem(this.KEYS.USER_SESSION),
        this.deleteSecureItem(this.KEYS.REMEMBER_ME),
        this.deleteSecureItem(this.KEYS.AUTH_TOKEN)
      ]);
      console.log('✅ [SecureStorage] User session cleared successfully');
    } catch (error) {
      console.error('❌ [SecureStorage] Failed to clear user session:', error);
    }
  }

  // Remember Me kontrolü
  static async getRememberMe(): Promise<boolean> {
    try {
      const rememberMe = await this.readSecureItem(this.KEYS.REMEMBER_ME);
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
      if (await this.isSecureStoreAvailable()) {
        console.log('📱 [SecureStorage] SecureStore is enabled - items are encrypted at rest');
      } else {
      const keys = await AsyncStorage.getAllKeys();
      const items = await AsyncStorage.multiGet(keys);
      
        console.log('📱 [SecureStorage] Storage contents (AsyncStorage fallback):');
      items.forEach(([key, value]: [string, string | null]) => {
        if (key.includes('user') || key.includes('auth') || key.includes('remember')) {
          console.log(`  ${key}: ${value ? 'EXISTS' : 'NULL'}`);
        }
      });
      }
    } catch (error) {
      console.error('❌ [SecureStorage] Failed to get storage info:', error);
    }
  }

  // Admin credentials management
  static async getAdminCredentials(defaultCredentials: AdminCredentials): Promise<AdminCredentials> {
    try {
      const stored = await this.readSecureItem(this.KEYS.ADMIN_CREDENTIALS);
      if (!stored) {
        return defaultCredentials;
      }
      const parsed = JSON.parse(stored);
      return {
        username: parsed.username || defaultCredentials.username,
        password: parsed.password || defaultCredentials.password,
      };
    } catch (error) {
      console.error('❌ [SecureStorage] Failed to get admin credentials:', error);
      return defaultCredentials;
    }
  }

  static async setAdminCredentials(credentials: AdminCredentials): Promise<void> {
    try {
      await this.writeSecureItem(this.KEYS.ADMIN_CREDENTIALS, JSON.stringify(credentials));
      console.log('✅ [SecureStorage] Admin credentials updated');
    } catch (error) {
      console.error('❌ [SecureStorage] Failed to set admin credentials:', error);
      throw error;
    }
  }
}

export default SecureStorage;
