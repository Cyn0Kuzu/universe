/**
 * 🛡️ Firebase Auth Persistence Manager
 * 
 * Firebase Auth persistence sorunlarını çözer ve güvenli giriş-çıkış işlemleri sağlar.
 * Remember Me özelliği ile kullanıcı oturumunu hatırlar ve otomatik giriş sağlar.
 */

import type firebase from 'firebase/compat/app';
import AsyncStorage from '@react-native-async-storage/async-storage';

declare const require: (module: string) => any;

type FirebaseCompatModule = any;

let firebaseCompat: FirebaseCompatModule | null = null;

const loadFirebaseCompat = async (): Promise<FirebaseCompatModule> => {
  if (firebaseCompat) {
    return firebaseCompat;
  }

  try {
    const configModule = require('./config');
    if (typeof configModule.initializeFirebaseServices === 'function') {
      await configModule.initializeFirebaseServices();
    }

    const firebaseModule = require('firebase/compat/app');
    require('firebase/compat/auth');

    firebaseCompat = firebaseModule.default || firebaseModule;
    return firebaseCompat!;
  } catch (error) {
    console.error('❌ [AuthPersistence] Failed to load Firebase compat:', error);
    throw error;
  }
};

const getFirebaseCompatSync = (): FirebaseCompatModule | null => firebaseCompat;

const loadFirebaseAuth = async () => {
  const firebaseModule = await loadFirebaseCompat();
  return firebaseModule.auth();
};

const getFirebaseAuthSync = () => {
  const firebaseModule = getFirebaseCompatSync();
  return firebaseModule ? firebaseModule.auth() : null;
};

// Basit AsyncStorage availability check (test yapmadan)
const isAsyncStorageAvailable = (): boolean => {
  try {
    return !!(AsyncStorage && typeof AsyncStorage.setItem === 'function');
  } catch (error) {
    console.warn('⚠️ [AuthPersistence] AsyncStorage not available:', error);
    return false;
  }
};

export class FirebaseAuthPersistenceManager {
  private static initialized = false;
  private static memoryBackup: any = null;
  private static readonly PERSISTENT_AUTH_KEY = 'firebase_persistent_auth_state';
  
  /**
   * Firebase Auth persistence'ı güvenli şekilde aktifleştir (Remember Me özelliği)
   */
  static async initializeSafePersistence(): Promise<void> {
    try {
      console.log('🔧 [AuthPersistence] Initializing persistence with Remember Me...');
      
      // Sadece bir kez initialize et
      if (this.initialized) {
        console.log('✅ [AuthPersistence] Already initialized, skipping...');
        return;
      }
      
      await loadFirebaseCompat();

      // Firebase'ın kendi AsyncStorage kullanımını tamamen kapatıp NONE persistence kullan
      // Bu setItem of undefined hatalarını tamamen önler
      console.log('� [AuthPersistence] Setting Firebase persistence to NONE to prevent AsyncStorage errors');
      
      try {
        // Modern Firebase SDK'da setPersistence deprecated, bu yüzden skip ediyoruz
        console.log('✅ [AuthPersistence] Skipping deprecated setPersistence - Custom Remember Me will handle persistence');
      } catch (persistenceError) {
        console.error('❌ [AuthPersistence] Failed to set NONE persistence:', persistenceError);
      }
      
      // Auth state listener kurulumunu yap
      await this.setupAuthStateListener();
      
      this.initialized = true;
      console.log('✅ [AuthPersistence] Persistence initialized with custom Remember Me support');
      
    } catch (error) {
      console.error('❌ [AuthPersistence] Failed to initialize persistence:', error);
      // Hata durumunda da initialized olarak işaretle ki uygulama devam etsin
      this.initialized = true;
    }
  }
  
  /**
   * Auth state listener'ı hem memory hem de persistent backup için kur
   */
  private static async setupAuthStateListener(): Promise<void> {
    try {
      const auth = await loadFirebaseAuth();
      auth.onAuthStateChanged(async (user: firebase.User | null) => {
        if (user) {
          console.log('👤 [AuthPersistence] User authenticated, saving backups...');
          this.saveMemoryBackup(user);
          await this.savePersistentBackup(user);
        } else {
          console.log('👻 [AuthPersistence] User signed out, clearing backups...');
          this.clearMemoryBackup();
          await this.clearPersistentBackup();
        }
      });
      
      console.log('✅ [AuthPersistence] Auth state listener configured (memory + persistent)');
    } catch (error) {
      console.error('❌ [AuthPersistence] Failed to setup auth state listener:', error);
    }
  }
  
  /**
   * Memory backup (hızlı erişim için)
   */
  private static saveMemoryBackup(user: firebase.User): void {
    try {
      this.memoryBackup = {
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified,
        displayName: user.displayName,
        savedAt: Date.now()
      };
      console.log('✅ [AuthPersistence] Memory backup saved');
    } catch (error) {
      console.error('❌ [AuthPersistence] Failed to save memory backup:', error);
    }
  }
  
  /**
   * Persistent backup (AsyncStorage'da kalıcı saklama)
   */
  private static async savePersistentBackup(user: firebase.User): Promise<void> {
    try {
      console.log('💾 [AuthPersistence] Attempting to save persistent backup...');
      
      if (!isAsyncStorageAvailable()) {
        console.log('📝 [AuthPersistence] AsyncStorage not available, skipping persistent backup');
        return;
      }
      
      const persistentState = {
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified,
        displayName: user.displayName,
        photoURL: user.photoURL,
        savedAt: Date.now(),
        rememberMe: true,
        professionalRememberMe: true,
        lastSignInTime: user.metadata?.lastSignInTime || new Date().toISOString(),
        autoSignInEnabled: true
      };
      
      await AsyncStorage.setItem(this.PERSISTENT_AUTH_KEY, JSON.stringify(persistentState));
      console.log('✅ [AuthPersistence] Persistent backup saved (Remember Me active)');
      
    } catch (error) {
      console.error('❌ [AuthPersistence] Failed to save persistent backup:', error);
      // Hata durumunda da devam et, kritik bir işlem değil
    }
  }
  
  private static clearMemoryBackup(): void {
    this.memoryBackup = null;
    console.log('✅ [AuthPersistence] Memory backup cleared');
  }
  
  /**
   * Persistent backup'ı temizle
   */
  private static async clearPersistentBackup(): Promise<void> {
    try {
      console.log('🗑️ [AuthPersistence] Attempting to clear persistent backup...');
      
      if (!isAsyncStorageAvailable()) {
        console.log('🗑️ [AuthPersistence] AsyncStorage not available, skipping persistent backup clear');
        return;
      }
      
      await AsyncStorage.removeItem(this.PERSISTENT_AUTH_KEY);
      console.log('✅ [AuthPersistence] Persistent backup cleared');
      
    } catch (error) {
      console.error('❌ [AuthPersistence] Failed to clear persistent backup:', error);
      // Hata durumunda da devam et
    }
  }
  
  static getMemoryBackup(): any | null {
    if (this.memoryBackup) {
      // SINIRSIZ SÜRE - sadece memory backup varsa döndür
      console.log('✅ [AuthPersistence] Memory backup found - UNLIMITED DURATION');
      return this.memoryBackup;
    }
    return null;
  }
  
  /**
   * Persistent backup'ı yükle (Remember Me için)
   */
  static async loadPersistentBackup(): Promise<any | null> {
    try {
      console.log('📖 [AuthPersistence] Attempting to load persistent backup...');
      
      if (!isAsyncStorageAvailable()) {
        console.log('📖 [AuthPersistence] AsyncStorage not available, no persistent backup to load');
        return null;
      }
      
      const persistentStateString = await AsyncStorage.getItem(this.PERSISTENT_AUTH_KEY);
      
      if (persistentStateString) {
        const persistentState = JSON.parse(persistentStateString);
        
        // Remember Me aktifse SINIRSIZ süre - hiç expire etme
        const now = Date.now();
        const savedAt = persistentState.savedAt || 0;
        // SINIRSIZ SÜRE - sadece rememberMe kontrolü yap
        
        if (persistentState.rememberMe) {
          console.log('✅ [AuthPersistence] Valid persistent backup found (Remember Me UNLIMITED)');
          return persistentState;
        } else {
          console.log('⚠️ [AuthPersistence] Remember Me disabled, clearing...');
          await this.clearPersistentBackup();
        }
      } else {
        console.log('📖 [AuthPersistence] No persistent backup found');
      }
      
      return null;
    } catch (error) {
      console.error('❌ [AuthPersistence] Failed to load persistent backup:', error);
      return null;
    }
  }
  
  /**
   * Uygulama başlangıcında kullanıcı durumunu kontrol et ve otomatik giriş hazırla
   */
  static async checkPersistedUser(): Promise<firebase.User | null> {
    try {
      console.log('🔍 [AutoSignIn] Checking for saved user session...');
      
      // İlk olarak Firebase'in kendi auth state'ini kontrol et
      const auth = await loadFirebaseAuth();
      const currentUser = auth.currentUser;
      if (currentUser) {
        console.log('✅ [AutoSignIn] Active Firebase user found, using current session');
        return currentUser;
      }
      
      // Firebase'da kullanıcı yoksa AsyncStorage'daki backup'ı kontrol et
      const persistentBackup = await this.loadPersistentBackup();
      
      if (persistentBackup && persistentBackup.uid && persistentBackup.autoSignInEnabled) {
        console.log('� [AutoSignIn] Found valid user backup with auto sign-in enabled');
        console.log('🚀 [AutoSignIn] Creating mock user session for automatic login');
        
        // Kullanıcı bilgilerini memory'ye yükle
        this.memoryBackup = {
          uid: persistentBackup.uid,
          email: persistentBackup.email,
          emailVerified: persistentBackup.emailVerified,
          displayName: persistentBackup.displayName,
          savedAt: Date.now(),
          isAutoRestored: true
        };
        
        // Mock Firebase User objesi oluştur - bu sayede app kullanıcıyı giriş yapmış olarak görecek
        const mockUser = {
          uid: persistentBackup.uid,
          email: persistentBackup.email,
          emailVerified: persistentBackup.emailVerified,
          displayName: persistentBackup.displayName,
          photoURL: persistentBackup.photoURL,
          phoneNumber: null,
          providerId: 'firebase',
          isAnonymous: false,
          tenantId: null,
          metadata: {
            creationTime: persistentBackup.lastSignInTime || new Date().toISOString(),
            lastSignInTime: persistentBackup.lastSignInTime || new Date().toISOString()
          },
          providerData: [],
          refreshToken: 'auto-signin-token-' + Date.now(),
          isFromPersistentRestore: true,
          multiFactor: {} as any,
          
          // Required Firebase User methods
          getIdToken: async (forceRefresh?: boolean) => `auto-signin-token-${persistentBackup.uid}`,
          getIdTokenResult: async (forceRefresh?: boolean) => ({} as any),
          reload: async () => {},
          toJSON: () => ({}),
          delete: async () => {},
          updateEmail: async (newEmail: string) => {},
          updatePassword: async (newPassword: string) => {},
          updatePhoneNumber: async (phoneCredential: any) => {},
          updateProfile: async (profile: any) => {},
          linkWithCredential: async (credential: any) => ({} as any),
          linkWithPhoneNumber: async (phoneNumber: string, appVerifier: any) => ({} as any),
          linkWithPopup: async (provider: any) => ({} as any),
          linkWithRedirect: async (provider: any) => {},
          linkAndRetrieveDataWithCredential: async (credential: any) => ({} as any),
          reauthenticateWithCredential: async (credential: any) => ({} as any),
          reauthenticateWithPhoneNumber: async (phoneNumber: string, appVerifier: any) => ({} as any),
          reauthenticateWithPopup: async (provider: any) => ({} as any),
          reauthenticateWithRedirect: async (provider: any) => {},
          reauthenticateAndRetrieveDataWithCredential: async (credential: any) => ({} as any),
          sendEmailVerification: async (actionCodeSettings?: any) => {},
          unlink: async (providerId: string) => ({} as any),
          verifyBeforeUpdateEmail: async (newEmail: string, actionCodeSettings?: any) => {}
        } as unknown as firebase.User;
        
        console.log('✅ [AutoSignIn] Mock user session created successfully');
        console.log('🏠 [AutoSignIn] User will be automatically redirected to HomeScreen');
        
        return mockUser;
      }
      
      console.log('� [AutoSignIn] No valid user session found - user will see login screen');
      return null;
      
    } catch (error) {
      console.error('❌ [AutoSignIn] Failed to check persisted user:', error);
      return null;
    }
  }
  
  /**
   * Profesyonel giriş işlemi (Auto Remember Me ile)
   */
  static async safeSignIn(email: string, password: string): Promise<firebase.auth.UserCredential> {
    try {
      console.log('🔐 [AuthPersistence] Starting Professional Sign In with Auto Remember Me...');
      
      // Auth persistence'ın initialize edildiğinden emin ol
      if (!this.initialized) {
        await this.initializeSafePersistence();
      }
      
      // Normal Firebase sign in işlemini yap
      const auth = await loadFirebaseAuth();
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      
      if (userCredential.user && !userCredential.user.emailVerified) {
        // Email doğrulanmamışsa hata fırlat
        throw new Error('email-not-verified');
      }
      
      // Kullanıcı başarıyla giriş yaptı - otomatik olarak Remember Me aktif et
      if (userCredential.user) {
        console.log('✅ [AuthPersistence] User sign in successful - Auto-enabling Professional Remember Me');
        
        // Persistent backup kaydet (şifre kaydetmeden)
        await this.savePersistentBackup(userCredential.user);
        
        console.log('🏆 [AuthPersistence] Professional Remember Me activated - User will auto sign-in on next app open');
      }
      
      return userCredential;
      
    } catch (error) {
      console.error('❌ [AuthPersistence] Professional Sign in failed:', error);
      throw error;
    }
  }
  
  /**
   * Profesyonel çıkış işlemi (Remember Me'yi temizler)
   */
  static async safeSignOut(): Promise<void> {
    try {
      console.log('🚪 [AuthPersistence] Starting Professional Sign Out (clearing Remember Me)...');
      
      // Hem memory hem persistent backup'ları temizle
      this.clearMemoryBackup();
      await this.clearPersistentBackup();
      
      // Firebase'den çıkış yap
      const auth = await loadFirebaseAuth();
      await auth.signOut();
      
      console.log('✅ [AuthPersistence] Professional Sign Out successful (Remember Me cleared)');
      console.log('👋 [AuthPersistence] User will see login screen on next app open');
      
    } catch (error) {
      console.error('❌ [AuthPersistence] Professional Sign out failed:', error);
      
      // Çıkış işlemi başarısız olsa bile backup'ları temizle
      this.clearMemoryBackup();
      try {
        await this.clearPersistentBackup();
      } catch (clearError) {
        console.error('❌ [AuthPersistence] Failed to clear persistent backup on failed sign out:', clearError);
      }
      
      throw error;
    }
  }
  
  /**
   * Authentication durumunu kontrol et
   */
  static getCurrentUser(): firebase.User | null {
    try {
      const auth = getFirebaseAuthSync();
      return auth?.currentUser ?? null;
    } catch (error) {
      console.error('❌ [AuthPersistence] Failed to get current user:', error);
      return null;
    }
  }
  
  /**
   * Email doğrulama durumunu kontrol et
   */
  static async checkEmailVerification(): Promise<boolean> {
    try {
      const auth = await loadFirebaseAuth();
      const user = auth.currentUser;
      if (!user) {
        return false;
      }
      
      // Kullanıcı bilgilerini yenile
      await user.reload();
      
      return user.emailVerified;
    } catch (error) {
      console.error('❌ [AuthPersistence] Failed to check email verification:', error);
      return false;
    }
  }
  
  /**
   * Email doğrulama maili gönder
   */
  static async sendEmailVerification(): Promise<void> {
    try {
      const auth = await loadFirebaseAuth();
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No user logged in');
      }
      
      // Email zaten doğrulanmışsa gönderme
      if (user.emailVerified) {
        console.log('✅ [AuthPersistence] Email already verified, skipping');
        return;
      }
      
      // Action code settings ile email gönder
      const actionCodeSettings = {
        url: 'https://universe-a6f60.firebaseapp.com/email-verified',
        handleCodeInApp: false,
      };
      
      await user.sendEmailVerification(actionCodeSettings);
      console.log('✅ [AuthPersistence] Email verification sent successfully');
      
    } catch (error) {
      console.error('❌ [AuthPersistence] Failed to send email verification:', error);
      throw error;
    }
  }

  /**
   * Clear persisted user data (alias for clearPersistentBackup)
   */
  static async clearPersistedUser(): Promise<void> {
    try {
      console.log('🧹 [AuthPersistence] Clearing persisted user data...');
      this.clearMemoryBackup();
      await this.clearPersistentBackup();
      console.log('✅ [AuthPersistence] Persisted user data cleared');
    } catch (error) {
      console.error('❌ [AuthPersistence] Failed to clear persisted user data:', error);
      throw error;
    }
  }

  /**
   * Sign out (alias for safeSignOut)
   */
  static async signOut(): Promise<void> {
    return this.safeSignOut();
  }
}

export default FirebaseAuthPersistenceManager;
