/**
 * 🚨 Error Handling Utilities
 * Centralized error handling and logging system
 */

import { Alert } from 'react-native';

export interface ErrorInfo {
  message: string;
  code?: string | number;
  details?: any;
  timestamp: Date;
  stack?: string;
  userId?: string;
  screen?: string;
  action?: string;
}

export interface ErrorHandlerOptions {
  showAlert?: boolean;
  logToConsole?: boolean;
  logToService?: boolean;
  alertTitle?: string;
  alertMessage?: string;
}

/**
 * Error types enum
 */
export enum ErrorType {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  SERVER_ERROR = 'SERVER_ERROR',
  CLIENT_ERROR = 'CLIENT_ERROR',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Custom error class with additional context
 */
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly code?: string | number;
  public readonly details?: any;
  public readonly timestamp: Date;
  public readonly userId?: string;
  public readonly screen?: string;
  public readonly action?: string;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    code?: string | number,
    details?: any
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  setContext(userId?: string, screen?: string, action?: string): AppError {
    (this as any).userId = userId;
    (this as any).screen = screen;
    (this as any).action = action;
    return this;
  }
}

/**
 * Error handler class
 */
class ErrorHandler {
  private errorQueue: ErrorInfo[] = [];
  private maxQueueSize = 100;

  /**
   * Handle error with options
   */
  handle(error: Error | AppError | string, options: ErrorHandlerOptions = {}): void {
    const errorInfo = this.parseError(error);
    
    // Add to queue
    this.addToQueue(errorInfo);
    
    // Log to console
    if (options.logToConsole !== false) {
      this.logToConsole(errorInfo);
    }
    
    // Show alert if requested
    if (options.showAlert) {
      this.showAlert(
        options.alertTitle || 'Hata',
        options.alertMessage || this.getUserFriendlyMessage(errorInfo)
      );
    }
    
    // Log to external service
    if (options.logToService) {
      this.logToService(errorInfo);
    }
  }

  /**
   * Parse error into ErrorInfo
   */
  private parseError(error: Error | AppError | string): ErrorInfo {
    if (typeof error === 'string') {
      return {
        message: error,
        timestamp: new Date()
      };
    }

    if (error instanceof AppError) {
      return {
        message: error.message,
        code: error.code,
        details: error.details,
        timestamp: error.timestamp,
        stack: error.stack,
        userId: error.userId,
        screen: error.screen,
        action: error.action
      };
    }

    return {
      message: error.message,
      stack: error.stack,
      timestamp: new Date()
    };
  }

  /**
   * Add error to queue
   */
  private addToQueue(errorInfo: ErrorInfo): void {
    this.errorQueue.push(errorInfo);
    
    // Maintain queue size
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift();
    }
  }

  /**
   * Log to console with formatting
   */
  private logToConsole(errorInfo: ErrorInfo): void {
    console.group('🚨 Error Report');
    console.error('Message:', errorInfo.message);
    
    if (errorInfo.code) {
      console.error('Code:', errorInfo.code);
    }
    
    if (errorInfo.details) {
      console.error('Details:', errorInfo.details);
    }
    
    if (errorInfo.userId) {
      console.error('User ID:', errorInfo.userId);
    }
    
    if (errorInfo.screen) {
      console.error('Screen:', errorInfo.screen);
    }
    
    if (errorInfo.action) {
      console.error('Action:', errorInfo.action);
    }
    
    if (errorInfo.stack) {
      console.error('Stack:', errorInfo.stack);
    }
    
    console.error('Timestamp:', errorInfo.timestamp.toISOString());
    console.groupEnd();
  }

  /**
   * Show alert to user
   */
  private showAlert(title: string, message: string): void {
    Alert.alert(title, message, [{ text: 'Tamam', style: 'default' }]);
  }

  /**
   * Get user-friendly error message
   */
  private getUserFriendlyMessage(errorInfo: ErrorInfo): string {
    const message = errorInfo.message.toLowerCase();
    
    if (message.includes('network') || message.includes('connection')) {
      return 'İnternet bağlantınızı kontrol edin ve tekrar deneyin.';
    }
    
    if (message.includes('timeout')) {
      return 'İşlem zaman aşımına uğradı. Lütfen tekrar deneyin.';
    }
    
    if (message.includes('auth') || message.includes('login')) {
      return 'Oturum açma sırasında bir sorun oluştu. Lütfen tekrar giriş yapın.';
    }
    
    if (message.includes('permission') || message.includes('unauthorized')) {
      return 'Bu işlem için yetkiniz bulunmuyor.';
    }
    
    if (message.includes('not found') || message.includes('404')) {
      return 'Aranan içerik bulunamadı.';
    }
    
    if (message.includes('server') || message.includes('500')) {
      return 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.';
    }
    
    if (message.includes('validation')) {
      return 'Girilen bilgilerde hata var. Lütfen kontrol edin.';
    }
    
    return 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.';
  }

  /**
   * Log to external service (placeholder)
   */
  private logToService(errorInfo: ErrorInfo): void {
    // This would send to Crashlytics, Bugsnag, Sentry, etc.
    console.log('📡 Logging to external service:', errorInfo);
  }

  /**
   * Get recent errors
   */
  getRecentErrors(count: number = 10): ErrorInfo[] {
    return this.errorQueue.slice(-count);
  }

  /**
   * Clear error queue
   */
  clearErrors(): void {
    this.errorQueue = [];
  }

  /**
   * Export errors for debugging
   */
  exportErrors(): string {
    return JSON.stringify(this.errorQueue, null, 2);
  }
}

// Singleton instance
const errorHandler = new ErrorHandler();

/**
 * Handle error with default options
 */
export const handleError = (
  error: Error | AppError | string,
  options?: ErrorHandlerOptions
): void => {
  errorHandler.handle(error, options);
};

/**
 * Handle and show error to user
 */
export const handleErrorWithAlert = (
  error: Error | AppError | string,
  title?: string,
  message?: string
): void => {
  errorHandler.handle(error, {
    showAlert: true,
    alertTitle: title,
    alertMessage: message
  });
};

/**
 * Create network error
 */
export const createNetworkError = (message: string = 'Network error occurred'): AppError => {
  return new AppError(message, ErrorType.NETWORK, 'NETWORK_ERROR');
};

/**
 * Create validation error
 */
export const createValidationError = (message: string, field?: string): AppError => {
  return new AppError(message, ErrorType.VALIDATION, 'VALIDATION_ERROR', { field });
};

/**
 * Create authentication error
 */
export const createAuthError = (message: string = 'Authentication failed'): AppError => {
  return new AppError(message, ErrorType.AUTHENTICATION, 'AUTH_ERROR');
};

/**
 * Async error wrapper
 */
export const withErrorHandling = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  options?: ErrorHandlerOptions
) => {
  return async (...args: T): Promise<R | undefined> => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error as Error, options);
      return undefined;
    }
  };
};

/**
 * React component error boundary helper
 */
export const logComponentError = (
  error: Error,
  errorInfo: { componentStack: string },
  componentName: string
): void => {
  const appError = new AppError(
    `Component error in ${componentName}: ${error.message}`,
    ErrorType.CLIENT_ERROR,
    'COMPONENT_ERROR',
    { componentStack: errorInfo.componentStack }
  );
  
  handleError(appError, { logToConsole: true, logToService: true });
};

// Export error handler instance for advanced usage
export { errorHandler, ErrorHandler };
