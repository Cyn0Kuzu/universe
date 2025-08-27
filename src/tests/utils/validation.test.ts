import { validateEmail, validatePassword, validateTurkishUniversityEmail } from '../../utils/validation';

describe('Validation Utils', () => {
  describe('validateEmail', () => {
    it('should validate correct email formats', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
      expect(validateEmail('test+tag@example.org')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('@domain.com')).toBe(false);
      expect(validateEmail('')).toBe(false);
      expect(validateEmail(' ')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should validate strong passwords', () => {
      expect(validatePassword('Password123!')).toBe(true);
      expect(validatePassword('SecurePass1@')).toBe(true);
      expect(validatePassword('MyP@ssw0rd')).toBe(true);
    });

    it('should reject weak passwords', () => {
      expect(validatePassword('password')).toBe(false); // No uppercase, number, special char
      expect(validatePassword('PASSWORD')).toBe(false); // No lowercase, number, special char
      expect(validatePassword('Password')).toBe(false); // No number, special char
      expect(validatePassword('Pass1!')).toBe(false); // Too short
      expect(validatePassword('')).toBe(false); // Empty
    });
  });

  describe('validateTurkishUniversityEmail', () => {
    it('should validate Turkish university email addresses', () => {
      expect(validateTurkishUniversityEmail('student@hacettepe.edu.tr')).toBe(true);
      expect(validateTurkishUniversityEmail('user@metu.edu.tr')).toBe(true);
      expect(validateTurkishUniversityEmail('test@itu.edu.tr')).toBe(true);
      expect(validateTurkishUniversityEmail('student@ankara.edu.tr')).toBe(true);
    });

    it('should reject non-Turkish university emails', () => {
      expect(validateTurkishUniversityEmail('test@gmail.com')).toBe(false);
      expect(validateTurkishUniversityEmail('user@university.com')).toBe(false);
      expect(validateTurkishUniversityEmail('student@edu.tr')).toBe(false);
      expect(validateTurkishUniversityEmail('test@hacettepe.edu')).toBe(false);
    });
  });
});
