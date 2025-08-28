/**
 * Error Handling Utilities
 * Centralized error handling and logging
 */

export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

/**
 * Handle and format errors consistently
 */
export const handleError = (error: any, context?: string): AppError => {
  const timestamp = new Date();
  
  // Firebase errors
  if (error?.code) {
    return {
      code: error.code,
      message: getFirebaseErrorMessage(error.code),
      details: error,
      timestamp
    };
  }

  // Network errors
  if (error?.name === 'NetworkError' || error?.message?.includes('network')) {
    return {
      code: 'NETWORK_ERROR',
      message: 'İnternet bağlantınızı kontrol edin',
      details: error,
      timestamp
    };
  }

  // Default error
  return {
    code: 'UNKNOWN_ERROR',
    message: error?.message || 'Beklenmeyen bir hata oluştu',
    details: error,
    timestamp
  };
};

/**
 * Log error with context
 */
export const logError = (error: any, context?: string): void => {
  const appError = handleError(error, context);
  
  console.error(`[${context || 'APP'}] Error:`, {
    code: appError.code,
    message: appError.message,
    timestamp: appError.timestamp,
    details: appError.details
  });
  
  // In production, send to crash reporting service
  if (__DEV__ === false) {
    // TODO: Send to Firebase Crashlytics or similar service
  }
};

/**
 * Create standardized error response
 */
export const createErrorResponse = (message: string, code?: string): AppError => {
  return {
    code: code || 'APP_ERROR',
    message,
    timestamp: new Date()
  };
};

/**
 * Get user-friendly Firebase error messages
 */
const getFirebaseErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/user-not-found':
      return 'Kullanıcı bulunamadı';
    case 'auth/wrong-password':
      return 'Hatalı şifre';
    case 'auth/email-already-in-use':
      return 'Bu e-posta adresi zaten kullanımda';
    case 'auth/weak-password':
      return 'Şifre çok zayıf';
    case 'auth/invalid-email':
      return 'Geçersiz e-posta adresi';
    case 'auth/network-request-failed':
      return 'İnternet bağlantınızı kontrol edin';
    case 'permission-denied':
      return 'Bu işlem için yetkiniz bulunmuyor';
    case 'not-found':
      return 'İstenen veri bulunamadı';
    case 'already-exists':
      return 'Bu veri zaten mevcut';
    case 'resource-exhausted':
      return 'Sistem yoğunluğu nedeniyle tekrar deneyin';
    case 'unauthenticated':
      return 'Oturum açmanız gerekiyor';
    default:
      return 'Bir hata oluştu, lütfen tekrar deneyin';
  }
};
