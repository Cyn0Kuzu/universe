import { SecureStorage } from './secureStorage';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  offline?: boolean;
  retry?: () => Promise<ApiResponse<T>>;
}

export class NetworkManager {
  private static isOnline: boolean = true;
  private static listeners: ((isOnline: boolean) => void)[] = [];

  static init() {
    // Basit network durumu - gelecekte NetInfo eklenebilir
    console.log('🌐 NetworkManager initialized');
  }

  static addNetworkListener(callback: (isOnline: boolean) => void) {
    this.listeners.push(callback);
    // İlk durumu bildir
    callback(this.isOnline);
  }

  static removeNetworkListener(callback: (isOnline: boolean) => void) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  static async handleApiCall<T>(
    apiCall: () => Promise<T>,
    options: {
      retryCount?: number;
      timeout?: number;
      cacheKey?: string;
      offlineMessage?: string;
    } = {}
  ): Promise<ApiResponse<T>> {
    const { retryCount = 3, timeout = 10000, cacheKey, offlineMessage } = options;

    // Offline kontrolü
    if (!this.isOnline) {
      // Cache'den dene
      if (cacheKey) {
        try {
          const cachedData = await SecureStorage.getCache(cacheKey);
          if (cachedData) {
            return {
              success: true,
              data: cachedData,
              offline: true
            };
          }
        } catch (error) {
          console.error('❌ Failed to get cached data:', error);
        }
      }

      return {
        success: false,
        error: offlineMessage || 'İnternet bağlantınızı kontrol edin',
        offline: true,
        retry: () => this.handleApiCall(apiCall, options)
      };
    }

    let lastError: Error | undefined;

    // Retry mekanizması
    for (let attempt = 1; attempt <= retryCount; attempt++) {
      try {
        console.log(`🔄 API call attempt ${attempt}/${retryCount}`);
        
        // Timeout wrapper
        const result = await Promise.race([
          apiCall(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), timeout)
          )
        ]);

        // Başarılı sonucu cache'e kaydet
        if (cacheKey && result) {
          try {
            await SecureStorage.setCache(cacheKey, result, 30); // 30 dakika cache
          } catch (cacheError) {
            console.warn('⚠️ Failed to cache result:', cacheError);
          }
        }

        console.log(`✅ API call successful on attempt ${attempt}`);
        return { success: true, data: result };

      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ API call failed on attempt ${attempt}:`, error);

        // Son deneme değilse bekle
        if (attempt < retryCount) {
          await new Promise(resolve => setTimeout(resolve, attempt * 1000)); // Exponential backoff
        }
      }
    }

    // Tüm denemeler başarısız
    let errorMessage = 'Bir hata oluştu, lütfen tekrar deneyin';
    
    if (lastError) {
      if (lastError.message.includes('timeout')) {
        errorMessage = 'İstek zaman aşımına uğradı';
      } else if (lastError.message.includes('permission-denied')) {
        errorMessage = 'Bu işlem için yetkiniz yok';
      } else if (lastError.message.includes('unavailable')) {
        errorMessage = 'Servis şu anda kullanılamıyor';
      }
    }

    return {
      success: false,
      error: errorMessage,
      retry: () => this.handleApiCall(apiCall, options)
    };
  }

  static getConnectionStatus(): boolean {
    return this.isOnline;
  }
}

// Global error boundary için
export class ErrorReporter {
  static reportError(error: Error, context: string) {
    console.error(`❌ [${context}] Error:`, error);
    
    // Production'da Crashlytics'e gönder
    if (__DEV__) {
      // Development'da detaylı log
      console.error('Stack trace:', error.stack);
    } else {
      // Production'da hata raporlama servisi
      // crashlytics().recordError(error);
    }
  }

  static showUserFriendlyError(error: string) {
    // Toast veya Alert göster
    console.log('📢 User Error:', error);
    // Burada Toast kütüphanesi kullanılabilir
  }
}

export default NetworkManager;
