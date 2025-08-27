/**
 * 🛠️ Form Validation Utilities
 * Modern, type-safe form validation helpers
 */

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Email validation regex (more comprehensive)
export const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// Password strength regex (at least 8 chars, 1 uppercase, 1 lowercase, 1 number)
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;

// Phone number regex (international format)
export const PHONE_REGEX = /^\+?[1-9]\d{1,14}$/;

// URL validation regex
export const URL_REGEX = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;

/**
 * Validate a single field against rules
 */
export const validateField = (
  fieldName: string,
  value: any,
  rules: ValidationRule
): ValidationError | null => {
  // Required validation
  if (rules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
    return {
      field: fieldName,
      message: `${fieldName} is required`
    };
  }

  // Skip other validations if field is empty and not required
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return null;
  }

  const stringValue = String(value);

  // Minimum length validation
  if (rules.minLength && stringValue.length < rules.minLength) {
    return {
      field: fieldName,
      message: `${fieldName} must be at least ${rules.minLength} characters`
    };
  }

  // Maximum length validation
  if (rules.maxLength && stringValue.length > rules.maxLength) {
    return {
      field: fieldName,
      message: `${fieldName} must not exceed ${rules.maxLength} characters`
    };
  }

  // Pattern validation
  if (rules.pattern && !rules.pattern.test(stringValue)) {
    return {
      field: fieldName,
      message: `${fieldName} format is invalid`
    };
  }

  // Custom validation
  if (rules.custom) {
    const customResult = rules.custom(value);
    if (customResult !== true) {
      return {
        field: fieldName,
        message: typeof customResult === 'string' ? customResult : `${fieldName} is invalid`
      };
    }
  }

  return null;
};

/**
 * Validate multiple fields against their rules
 */
export const validateForm = (
  data: Record<string, any>,
  rules: Record<string, ValidationRule>
): ValidationResult => {
  const errors: ValidationError[] = [];

  Object.entries(rules).forEach(([fieldName, fieldRules]) => {
    const error = validateField(fieldName, data[fieldName], fieldRules);
    if (error) {
      errors.push(error);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Common validation rules for reuse
 */
export const commonValidationRules = {
  email: {
    required: true,
    pattern: EMAIL_REGEX,
    maxLength: 100
  },
  password: {
    required: true,
    minLength: 8,
    pattern: PASSWORD_REGEX
  },
  confirmPassword: (originalPassword: string) => ({
    required: true,
    custom: (value: string) => value === originalPassword || 'Passwords do not match'
  }),
  name: {
    required: true,
    minLength: 2,
    maxLength: 50,
    pattern: /^[a-zA-ZğüşöçıİĞÜŞÖÇ\s]+$/ // Supports Turkish characters
  },
  username: {
    required: true,
    minLength: 3,
    maxLength: 20,
    pattern: /^[a-zA-Z0-9_]+$/ // Alphanumeric and underscore only
  },
  phone: {
    pattern: PHONE_REGEX
  },
  url: {
    pattern: URL_REGEX
  },
  studentId: {
    required: true,
    pattern: /^\d{9,11}$/ // 9-11 digit student ID
  },
  universityEmail: {
    required: true,
    pattern: /^[a-zA-Z0-9._%+-]+@(edu\.tr|[a-zA-Z0-9.-]+\.edu\.tr)$/ // Turkish university email
  }
} as const;

/**
 * Get error message for a specific field
 */
export const getFieldError = (errors: ValidationError[], fieldName: string): string | undefined => {
  const error = errors.find(err => err.field === fieldName);
  return error?.message;
};

/**
 * Check if a specific field has an error
 */
export const hasFieldError = (errors: ValidationError[], fieldName: string): boolean => {
  return errors.some(err => err.field === fieldName);
};

/**
 * Sanitize input by removing potentially dangerous characters
 */
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
};

/**
 * Format validation errors for display
 */
export const formatValidationErrors = (errors: ValidationError[]): string => {
  return errors.map(error => error.message).join('\n');
};
