// Comprehensive Error Handler and Performance Optimizer
import type firebase from 'firebase/compat/app';
import { getFirebase as getFirebaseCompat } from '../firebase/config';

const loadFirebaseCompat = async (): Promise<typeof firebase> => {
  const firebaseInstance = await getFirebaseCompat();
  if (!firebaseInstance) {
    throw new Error('Firebase compat SDK not available');
  }
  return firebaseInstance;
};

interface ErrorInfo {
  code: string;
  message: string;
  timestamp: Date;
  userId?: string;
  screen?: string;
  action?: string;
}

interface PerformanceMetrics {
  screenLoadTime: number;
  dataFetchTime: number;
  renderTime: number;
  memoryUsage: number;
}

class ComprehensiveErrorHandler {
  private static instance: ComprehensiveErrorHandler;
  private errorLog: ErrorInfo[] = [];
  private performanceLog: Map<string, PerformanceMetrics> = new Map();
  private maxLogSize = 1000;

  private constructor() {}

  public static getInstance(): ComprehensiveErrorHandler {
    if (!ComprehensiveErrorHandler.instance) {
      ComprehensiveErrorHandler.instance = new ComprehensiveErrorHandler();
    }
    return ComprehensiveErrorHandler.instance;
  }

  /**
   * Log error with comprehensive information
   */
  public logError(error: Error, context: {
    userId?: string;
    screen?: string;
    action?: string;
    additionalInfo?: any;
  }): void {
    const errorInfo: ErrorInfo = {
      code: error.name || 'UNKNOWN_ERROR',
      message: error.message,
      timestamp: new Date(),
      userId: context.userId,
      screen: context.screen,
      action: context.action
    };

    this.errorLog.push(errorInfo);
    
    // Keep only recent errors
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize);
    }

    console.error('🚨 Comprehensive Error:', {
      ...errorInfo,
      additionalInfo: context.additionalInfo,
      stack: error.stack
    });

    // Send to Firebase for monitoring
    this.sendErrorToFirebase(errorInfo, context.additionalInfo);
  }

  /**
   * Log performance metrics
   */
  public logPerformance(screen: string, metrics: PerformanceMetrics): void {
    this.performanceLog.set(screen, metrics);
    
    console.log(`📊 Performance for ${screen}:`, metrics);
    
    // Send to Firebase for monitoring
    this.sendPerformanceToFirebase(screen, metrics);
  }

  /**
   * Handle Firebase errors specifically
   */
  public handleFirebaseError(error: any, context: {
    userId?: string;
    screen?: string;
    action?: string;
  }): void {
    let errorMessage = 'Bilinmeyen hata';
    let errorCode = 'UNKNOWN';

    if (error.code) {
      errorCode = error.code;
      switch (error.code) {
        case 'permission-denied':
          errorMessage = 'Bu işlem için yetkiniz bulunmuyor';
          break;
        case 'unavailable':
          errorMessage = 'Servis şu anda kullanılamıyor';
          break;
        case 'deadline-exceeded':
          errorMessage = 'İşlem zaman aşımına uğradı';
          break;
        case 'resource-exhausted':
          errorMessage = 'Kaynak limiti aşıldı';
          break;
        case 'failed-precondition':
          errorMessage = 'Ön koşul sağlanamadı';
          break;
        case 'aborted':
          errorMessage = 'İşlem iptal edildi';
          break;
        case 'out-of-range':
          errorMessage = 'Geçersiz aralık';
          break;
        case 'unimplemented':
          errorMessage = 'Bu özellik henüz uygulanmadı';
          break;
        case 'internal':
          errorMessage = 'Sunucu hatası';
          break;
        case 'unavailable':
          errorMessage = 'Servis kullanılamıyor';
          break;
        case 'data-loss':
          errorMessage = 'Veri kaybı';
          break;
        case 'unauthenticated':
          errorMessage = 'Kimlik doğrulama gerekli';
          break;
        default:
          errorMessage = error.message || 'Bilinmeyen hata';
      }
    }

    this.logError(new Error(errorMessage), {
      ...context,
      additionalInfo: { firebaseCode: errorCode, originalError: error }
    });
  }

  /**
   * Send error to Firebase for monitoring
   */
  private async sendErrorToFirebase(errorInfo: ErrorInfo, additionalInfo?: any): Promise<void> {
    try {
      const firebaseCompat = await loadFirebaseCompat();
      await firebaseCompat.firestore().collection('errorLogs').add({
        ...errorInfo,
        additionalInfo,
        platform: 'android',
        appVersion: '1.2.1',
        timestamp: firebaseCompat.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Failed to send error to Firebase:', error);
    }
  }

  /**
   * Send performance metrics to Firebase
   */
  private async sendPerformanceToFirebase(screen: string, metrics: PerformanceMetrics): Promise<void> {
    try {
      const firebaseCompat = await loadFirebaseCompat();
      await firebaseCompat.firestore().collection('performanceLogs').add({
        screen,
        ...metrics,
        platform: 'android',
        appVersion: '1.2.1',
        timestamp: firebaseCompat.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Failed to send performance to Firebase:', error);
    }
  }

  /**
   * Get error statistics
   */
  public getErrorStats(): {
    totalErrors: number;
    errorsByScreen: Map<string, number>;
    errorsByCode: Map<string, number>;
    recentErrors: ErrorInfo[];
  } {
    const errorsByScreen = new Map<string, number>();
    const errorsByCode = new Map<string, number>();

    this.errorLog.forEach(error => {
      if (error.screen) {
        errorsByScreen.set(error.screen, (errorsByScreen.get(error.screen) || 0) + 1);
      }
      errorsByCode.set(error.code, (errorsByCode.get(error.code) || 0) + 1);
    });

    return {
      totalErrors: this.errorLog.length,
      errorsByScreen,
      errorsByCode,
      recentErrors: this.errorLog.slice(-10)
    };
  }

  /**
   * Clear error logs
   */
  public clearLogs(): void {
    this.errorLog = [];
    this.performanceLog.clear();
  }

  /**
   * Validate data integrity
   */
  public validateData(data: any, schema: any): boolean {
    try {
      // Basic validation logic
      if (!data || typeof data !== 'object') {
        this.logError(new Error('Invalid data type'), {
          action: 'validateData',
          additionalInfo: { data, schema }
        });
        return false;
      }

      // Check required fields
      for (const field in schema) {
        if (schema[field].required && !data[field]) {
          this.logError(new Error(`Missing required field: ${field}`), {
            action: 'validateData',
            additionalInfo: { field, data, schema }
          });
          return false;
        }
      }

      return true;
    } catch (error) {
      this.logError(error as Error, {
        action: 'validateData',
        additionalInfo: { data, schema }
      });
      return false;
    }
  }

  /**
   * Retry mechanism for failed operations
   */
  public async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000,
    context?: { userId?: string; screen?: string; action?: string }
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        this.logError(lastError, {
          ...context,
          additionalInfo: { attempt, maxRetries }
        });

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
      }
    }

    throw lastError || new Error('Operation failed after all retries');
  }
}

export const comprehensiveErrorHandler = ComprehensiveErrorHandler.getInstance();


