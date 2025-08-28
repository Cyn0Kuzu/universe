/**
 * Utils Module Exports
 * Utility functions and helpers
 * Updated for TypeScript cache refresh
 */

// Date utilities
export { formatDate, formatTime, getRelativeTime, isToday, isSameDay } from './dateUtils';

// Validation utilities  
export { validateEmail, validatePassword, validateUsername, validatePhoneNumber } from './validation';

// Error handling utilities
export { handleError, logError, createErrorResponse } from './errorHandling';

// Cleanup utilities
export { TestDataCleanup } from './cleanupTestData';

// Secure storage utilities
export { SecureStorage } from './secureStorage';

// Network utilities
export { NetworkManager } from './networkManager';

// Image utilities
export { optimizeImageForUpload, validateImageFile } from './imageUtils';

// Text utilities  
export { truncateText, capitalizeWords, generateSlug } from './textUtils';

// Performance utilities
export { debounce, throttle, measurePerformance } from './performanceUtils';
