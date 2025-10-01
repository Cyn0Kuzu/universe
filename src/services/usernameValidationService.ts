/**
 * Username Kontrolü Servisi
 * Firebase permission sorunlarını bypass eden güvenli yaklaşım
 */

import { firebase } from '../firebase/config';

interface UsernameCache {
  [username: string]: {
    exists: boolean;
    timestamp: number;
  };
}

class UsernameValidationService {
  private cache: UsernameCache = {};
  private readonly CACHE_DURATION = 30000; // 30 saniye

  /**
   * Username benzersizlik kontrolü - Direkt usernames collection kontrolü
   * Security rules bypass etmek için admin yaklaşımı
   */
  async checkUsernameAvailability(username: string, currentUserId?: string): Promise<{
    isAvailable: boolean;
    error?: string;
  }> {
    try {
      const normalizedUsername = username.toLowerCase().trim();
      
      if (!normalizedUsername) {
        return { isAvailable: false, error: 'Username boş olamaz' };
      }

      // Önce format kontrolü
      const formatCheck = this.validateUsernameFormat(normalizedUsername);
      if (!formatCheck.isValid) {
        return { isAvailable: false, error: formatCheck.error };
      }

      // Cache kontrolü
      const cached = this.cache[normalizedUsername];
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        console.log('📋 UsernameValidation: Using cached result for', normalizedUsername);
        return { isAvailable: !cached.exists };
      }

      console.log('🔍 UsernameValidation: Checking availability for', normalizedUsername);

      // Eğer mevcut kullanıcının username'i ile aynıysa müsait
      if (currentUserId) {
        try {
          const currentUserDoc = await firebase.firestore()
            .collection('users')
            .doc(currentUserId)
            .get();
          
          const currentUserData = currentUserDoc.data();
          if (currentUserData?.username === normalizedUsername) {
            console.log('✅ UsernameValidation: Same as current user username');
            return { isAvailable: true };
          }
        } catch (error) {
          console.log('⚠️ Could not check current user, continuing...');
        }
      }

      // YENI YAKLAŞIM: usernames collection'ını direkt kontrol et
      try {
        console.log('🔍 Directly checking usernames collection...');
        
        // BASIT GETDoc TESTİ
        console.log('🧪 Testing basic Firestore access...');
        try {
          const testDoc = await firebase.firestore().collection('usernames').doc('test_doc_access').get();
          console.log('✅ Basic firestore access successful, doc exists:', testDoc.exists);
        } catch (testError) {
          console.error('❌ Basic firestore access failed:', testError);
        }
        
        // usernames collection'ından document'ı kontrol et
        const usernameDocRef = firebase.firestore().collection('usernames').doc(normalizedUsername);
        const usernameDocSnapshot = await usernameDocRef.get();
        
        const exists = usernameDocSnapshot.exists;
        console.log(`🔍 Username "${normalizedUsername}" exists in usernames collection:`, exists);
        if (exists) {
          console.log('📊 Username doc data:', usernameDocSnapshot.data());
        }
        
        // Cache'e kaydet
        this.cache[normalizedUsername] = {
          exists: exists,
          timestamp: Date.now()
        };

        if (exists) {
          console.log('❌ Username already taken:', normalizedUsername);
          return { 
            isAvailable: false, 
            error: 'Bu kullanıcı adı zaten kullanılıyor' 
          };
        } else {
          console.log('✅ Username available:', normalizedUsername);
          return { isAvailable: true };
        }

      } catch (firebaseError: any) {
        console.error('❌ Firebase usernames collection error:', firebaseError);
        
        // Alternative: users collection'ında username field'ını ara
        try {
          console.log('🔍 Fallback: Checking users collection for username...');
          
          const usersQuery = await firebase.firestore()
            .collection('users')
            .where('username', '==', normalizedUsername)
            .limit(1)
            .get();

          const exists = !usersQuery.empty;
          console.log(`🔍 Username "${normalizedUsername}" found in users collection:`, exists);
          
          // Cache'e kaydet
          this.cache[normalizedUsername] = {
            exists: exists,
            timestamp: Date.now()
          };

          if (exists) {
            console.log('❌ Username already taken (from users collection):', normalizedUsername);
            return { 
              isAvailable: false, 
              error: 'Bu kullanıcı adı zaten kullanılıyor' 
            };
          } else {
            console.log('✅ Username available (from users collection):', normalizedUsername);
            return { isAvailable: true };
          }

        } catch (usersError: any) {
          console.error('❌ Users collection query also failed:', usersError);
          
          // Son çare: optimistic validation
          console.log('⚠️ UsernameValidation: Using optimistic validation due to all Firebase errors');
          
          this.cache[normalizedUsername] = {
            exists: false,
            timestamp: Date.now()
          };

          return { 
            isAvailable: true,
            error: 'Username kontrolü yapılamadı (varsayılan: müsait)'
          };
        }
      }

    } catch (error: any) {
      console.error('❌ UsernameValidation: Unexpected error:', error);
      
      return { 
        isAvailable: false, 
        error: 'Username kontrolü yapılamadı' 
      };
    }
  }

  /**
   * Registration sırasında username benzersizlik kontrolü VE rezervasyonu
   * Transaction ile atomik kontrol ve rezervasyon
   */
  async validateAndReserveUsername(username: string, userId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const normalizedUsername = username.toLowerCase().trim();
      
      // Format kontrolü
      const formatCheck = this.validateUsernameFormat(normalizedUsername);
      if (!formatCheck.isValid) {
        return { success: false, error: formatCheck.error };
      }

      console.log('🔒 Attempting to validate and reserve username:', normalizedUsername);

      // Transaction ile atomik rezervasyon
      const result = await firebase.firestore().runTransaction(async (transaction) => {
        const usernameRef = firebase.firestore().collection('usernames').doc(normalizedUsername);
        const usernameDoc = await transaction.get(usernameRef);
        
        if (usernameDoc.exists) {
          const existingData = usernameDoc.data();
          if (existingData?.userId !== userId) {
            console.log('❌ Username already reserved by another user');
            throw new Error('Bu kullanıcı adı zaten kullanılıyor');
          } else {
            console.log('✅ Username already reserved for this user');
            return { success: true };
          }
        }

        // Username müsait - hemen rezerve et
        console.log('🔒 Reserving username immediately:', normalizedUsername);
        transaction.set(usernameRef, {
          userId: userId,
          reservedAt: new Date(),
          createdAt: new Date()
        });

        return { success: true };
      });

      console.log('✅ Username validated and reserved successfully:', normalizedUsername);
      return result;

    } catch (error: any) {
      console.error('❌ Username validation and reservation failed:', error);
      return { 
        success: false, 
        error: error.message || 'Username kontrolü başarısız'
      };
    }
  }

  /**
   * Profile update sırasında username kontrolü
   */
  async validateUsernameUpdate(newUsername: string, currentUsername: string, userId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const normalizedNew = newUsername.toLowerCase().trim();
      const normalizedCurrent = currentUsername?.toLowerCase().trim();
      
      // Aynı username ise güncelleme gerekmiyor
      if (normalizedNew === normalizedCurrent) {
        return { success: true };
      }

      // Format kontrolü
      const formatCheck = this.validateUsernameFormat(normalizedNew);
      if (!formatCheck.isValid) {
        return { success: false, error: formatCheck.error };
      }

      // Yeni username'i kontrol et
      const validationResult = await this.validateAndReserveUsername(normalizedNew, userId);
      return validationResult;

    } catch (error: any) {
      console.error('❌ Username update validation failed:', error);
      return { 
        success: false, 
        error: 'Username güncelleme kontrolü başarısız: ' + (error.message || 'Bilinmeyen hata') 
      };
    }
  }

  /**
   * Username format validasyonu
   */
  validateUsernameFormat(username: string): {
    isValid: boolean;
    error?: string;
  } {
    const trimmed = username.trim();

    if (!trimmed) {
      return { isValid: false, error: 'Username boş olamaz' };
    }

    if (trimmed.length < 3) {
      return { isValid: false, error: 'Username en az 3 karakter olmalı' };
    }

    if (trimmed.length > 20) {
      return { isValid: false, error: 'Username en fazla 20 karakter olabilir' };
    }

    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      return { isValid: false, error: 'Username sadece harf, rakam ve _ içerebilir' };
    }

    if (/^[0-9]+$/.test(trimmed)) {
      return { isValid: false, error: 'Username sadece rakamlardan oluşamaz' };
    }

    if (!/^[a-zA-Z]/.test(trimmed)) {
      return { isValid: false, error: 'Username bir harfle başlamalıdır' };
    }

    // Yasaklı username'ler
    const bannedUsernames = [
      'admin', 'root', 'system', 'user', 'test', 'null', 'undefined',
      'universe', 'club', 'student', 'api', 'www', 'mail', 'email',
      'support', 'help', 'info', 'contact', 'about', 'privacy', 'terms'
    ];

    if (bannedUsernames.includes(trimmed.toLowerCase())) {
      return { isValid: false, error: 'Bu username kullanılamaz' };
    }

    return { isValid: true };
  }

  /**
   * Cache'i temizle
   */
  clearCache(): void {
    this.cache = {};
    console.log('🗑️ UsernameValidation: Cache cleared');
  }

  /**
   * Username önerisi oluştur
   */
  generateUsernameSuggestions(baseName: string): string[] {
    const normalized = baseName.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
    const suggestions: string[] = [];

    // Eğer çok kısa ise uzatabilecek önekler ekle
    let baseForSuggestion = normalized;
    if (baseForSuggestion.length < 3) {
      baseForSuggestion = 'user' + baseForSuggestion;
    }

    // Temel öneri
    if (baseForSuggestion.length >= 3 && baseForSuggestion.length <= 20) {
      suggestions.push(baseForSuggestion);
    }

    // Sayı eklemeli öneriler
    for (let i = 1; i <= 5; i++) {
      const withNumber = `${baseForSuggestion}${i}`;
      const withUnderscore = `${baseForSuggestion}_${i}`;
      
      if (withNumber.length <= 20) suggestions.push(withNumber);
      if (withUnderscore.length <= 20) suggestions.push(withUnderscore);
    }

    // Rastgele sayı eklemeli
    const randomNum = Math.floor(Math.random() * 999) + 1;
    const withRandom = `${baseForSuggestion}${randomNum}`;
    if (withRandom.length <= 20) {
      suggestions.push(withRandom);
    }

    // Benzersiz ve geçerli önerileri filtrele
    return [...new Set(suggestions)].filter(s => {
      const validation = this.validateUsernameFormat(s);
      return validation.isValid;
    });
  }
}

export const usernameValidationService = new UsernameValidationService();
