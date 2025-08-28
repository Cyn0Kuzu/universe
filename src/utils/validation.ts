/**
 * Validation Utilities
 * Form validation and data validation functions
 */

/**
 * Validate email address
 */
export const validateEmail = (email: string): { isValid: boolean; error?: string } => {
  if (!email) {
    return { isValid: false, error: 'E-posta adresi gereklidir' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Geçerli bir e-posta adresi giriniz' };
  }

  return { isValid: true };
};

/**
 * Validate password
 */
export const validatePassword = (password: string): { isValid: boolean; error?: string } => {
  if (!password) {
    return { isValid: false, error: 'Şifre gereklidir' };
  }

  if (password.length < 6) {
    return { isValid: false, error: 'Şifre en az 6 karakter olmalıdır' };
  }

  return { isValid: true };
};

/**
 * Validate username
 */
export const validateUsername = (username: string): { isValid: boolean; error?: string } => {
  if (!username) {
    return { isValid: false, error: 'Kullanıcı adı gereklidir' };
  }

  if (username.length < 3) {
    return { isValid: false, error: 'Kullanıcı adı en az 3 karakter olmalıdır' };
  }

  if (username.length > 20) {
    return { isValid: false, error: 'Kullanıcı adı en fazla 20 karakter olabilir' };
  }

  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  if (!usernameRegex.test(username)) {
    return { isValid: false, error: 'Kullanıcı adı sadece harf, rakam ve alt çizgi içerebilir' };
  }

  return { isValid: true };
};

/**
 * Validate phone number
 */
export const validatePhoneNumber = (phone: string): { isValid: boolean; error?: string } => {
  if (!phone) {
    return { isValid: false, error: 'Telefon numarası gereklidir' };
  }

  const phoneRegex = /^(\+90|0)?[1-9][0-9]{9}$/;
  if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
    return { isValid: false, error: 'Geçerli bir telefon numarası giriniz' };
  }

  return { isValid: true };
};

/**
 * Validate required field
 */
export const validateRequired = (value: string, fieldName: string): { isValid: boolean; error?: string } => {
  if (!value || value.trim().length === 0) {
    return { isValid: false, error: `${fieldName} gereklidir` };
  }
  return { isValid: true };
};

/**
 * Validate URL
 */
export const validateUrl = (url: string): { isValid: boolean; error?: string } => {
  if (!url) {
    return { isValid: false, error: 'URL gereklidir' };
  }

  try {
    new URL(url);
    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Geçerli bir URL giriniz' };
  }
};
