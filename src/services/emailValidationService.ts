/**
 * Email Kontrolü Servisi
 * Email benzersizlik ve format kontrolü
 */

import { firebase } from '../firebase/config';

interface EmailCache {
  [email: string]: {
    exists: boolean;
    timestamp: number;
  };
}

class EmailValidationService {
  private cache: EmailCache = {};
  private readonly CACHE_DURATION = 30000; // 30 saniye

  /**
   * Email format validasyonu
   */
  validateEmailFormat(email: string): {
    isValid: boolean;
    error?: string;
  } {
    const trimmed = email.trim().toLowerCase();

    if (!trimmed) {
      return { isValid: false, error: 'Email boş olamaz' };
    }

    // Temel email format kontrolü
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      return { isValid: false, error: 'Geçersiz email formatı' };
    }

    // Özel domain kontrolleri
    if (trimmed.includes('@gmail.com') || 
        trimmed.endsWith('.edu.tr') || 
        trimmed.includes('@hotmail.') ||
        trimmed.includes('@yahoo.') ||
        trimmed.includes('@outlook.') ||
        /\.(com|net|org|edu)$/.test(trimmed)) {
      return { isValid: true };
    }

    return { isValid: false, error: 'Desteklenmeyen email domain\'i' };
  }

  /**
   * Email benzersizlik kontrolü
   */
  async checkEmailAvailability(email: string, currentUserId?: string): Promise<{
    isAvailable: boolean;
    error?: string;
  }> {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      
      if (!normalizedEmail) {
        return { isAvailable: false, error: 'Email boş olamaz' };
      }

      // Önce format kontrolü
      const formatCheck = this.validateEmailFormat(normalizedEmail);
      if (!formatCheck.isValid) {
        return { isAvailable: false, error: formatCheck.error };
      }

      // Cache kontrolü
      const cached = this.cache[normalizedEmail];
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        console.log('📋 EmailValidation: Using cached result for', normalizedEmail);
        return { isAvailable: !cached.exists };
      }

      console.log('🔍 EmailValidation: Checking availability for', normalizedEmail);

      // Eğer mevcut kullanıcının email'i ile aynıysa müsait
      if (currentUserId) {
        try {
          const currentUserDoc = await firebase.firestore()
            .collection('users')
            .doc(currentUserId)
            .get();
          
          const currentUserData = currentUserDoc.data();
          if (currentUserData?.email === normalizedEmail) {
            console.log('✅ EmailValidation: Same as current user email');
            return { isAvailable: true };
          }
        } catch (error) {
          console.log('⚠️ Could not check current user, continuing...');
        }
      }

      // emails collection'ını kontrol et
      try {
        console.log('🔍 Directly checking emails collection...');
        
        const emailDocRef = firebase.firestore().collection('emails').doc(normalizedEmail);
        const emailDocSnapshot = await emailDocRef.get();
        
        const exists = emailDocSnapshot.exists;
        console.log(`🔍 Email "${normalizedEmail}" exists in emails collection:`, exists);
        
        // Cache'e kaydet
        this.cache[normalizedEmail] = {
          exists: exists,
          timestamp: Date.now()
        };

        if (exists) {
          console.log('❌ Email already taken:', normalizedEmail);
          return { 
            isAvailable: false, 
            error: 'Bu email zaten kullanılıyor' 
          };
        } else {
          console.log('✅ Email available:', normalizedEmail);
          return { isAvailable: true };
        }

      } catch (firebaseError: any) {
        console.error('❌ Firebase emails collection error:', firebaseError);
        
        // Alternative: users collection'ında email field'ını ara
        try {
          console.log('🔍 Fallback: Checking users collection for email...');
          
          const usersQuery = await firebase.firestore()
            .collection('users')
            .where('email', '==', normalizedEmail)
            .limit(1)
            .get();

          const exists = !usersQuery.empty;
          console.log(`🔍 Email "${normalizedEmail}" found in users collection:`, exists);
          
          // Cache'e kaydet
          this.cache[normalizedEmail] = {
            exists: exists,
            timestamp: Date.now()
          };

          if (exists) {
            console.log('❌ Email already taken (from users collection):', normalizedEmail);
            return { 
              isAvailable: false, 
              error: 'Bu email zaten kullanılıyor' 
            };
          } else {
            console.log('✅ Email available (from users collection):', normalizedEmail);
            return { isAvailable: true };
          }

        } catch (usersError: any) {
          console.error('❌ Users collection query also failed:', usersError);
          
          // Son çare: optimistic validation
          console.log('⚠️ EmailValidation: Using optimistic validation due to all Firebase errors');
          
          this.cache[normalizedEmail] = {
            exists: false,
            timestamp: Date.now()
          };

          return { 
            isAvailable: true,
            error: 'Email kontrolü yapılamadı (varsayılan: müsait)'
          };
        }
      }

    } catch (error: any) {
      console.error('❌ EmailValidation: Unexpected error:', error);
      
      return { 
        isAvailable: false, 
        error: 'Email kontrolü yapılamadı' 
      };
    }
  }

  /**
   * Registration sırasında email benzersizlik kontrolü ve rezervasyonu
   */
  async validateAndReserveEmail(email: string, userId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      
      console.log('🔐 Validating and reserving email:', normalizedEmail);
      
      // Transaction ile atomik kontrol ve kayıt
      const result = await firebase.firestore().runTransaction(async (transaction) => {
        // emails collection'ında kontrol et
        const emailDocRef = firebase.firestore().collection('emails').doc(normalizedEmail);
        const emailDoc = await transaction.get(emailDocRef);
        
        if (emailDoc.exists) {
          throw new Error('Bu email zaten kullanılıyor');
        }
        
        // Email'i rezerve et
        transaction.set(emailDocRef, {
          userId: userId,
          createdAt: new Date(),
        });
        
        return { success: true };
      });
      
      console.log('✅ Email validated and reserved successfully');
      return result;
      
    } catch (error: any) {
      console.error('❌ Email validation/reservation failed:', error);
      return { 
        success: false, 
        error: error.message || 'Email rezervasyon hatası' 
      };
    }
  }

  /**
   * Cache'i temizle
   */
  clearCache(): void {
    this.cache = {};
    console.log('🗑️ EmailValidation: Cache cleared');
  }

  /**
   * Email önerisi oluştur
   */
  generateEmailSuggestions(baseEmail: string): string[] {
    const suggestions: string[] = [];
    
    try {
      const [localPart, domain] = baseEmail.split('@');
      
      if (!localPart || !domain) {
        return [];
      }
      
      // Sayı eklemeli öneriler
      for (let i = 1; i <= 3; i++) {
        suggestions.push(`${localPart}${i}@${domain}`);
        suggestions.push(`${localPart}.${i}@${domain}`);
      }
      
      // Alternatif domain önerileri
      const commonDomains = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com'];
      const originalDomain = domain.toLowerCase();
      
      commonDomains.forEach(suggestedDomain => {
        if (suggestedDomain !== originalDomain) {
          suggestions.push(`${localPart}@${suggestedDomain}`);
        }
      });
      
    } catch (error) {
      console.error('Email suggestion generation error:', error);
    }
    
    return [...new Set(suggestions)].slice(0, 5); // Maksimum 5 öneri
  }
}

export const emailValidationService = new EmailValidationService();
