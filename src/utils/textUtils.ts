/**
 * Text Utilities
 * Text processing and formatting functions
 */

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number = 100): string => {
  if (!text) return '';
  
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength).trim() + '...';
};

/**
 * Capitalize words
 */
export const capitalizeWords = (text: string): string => {
  if (!text) return '';
  
  return text
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Generate URL-friendly slug
 */
export const generateSlug = (text: string): string => {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

/**
 * Extract hashtags from text
 */
export const extractHashtags = (text: string): string[] => {
  if (!text) return [];
  
  const hashtagRegex = /#[a-zA-Z0-9_\u00c0-\u024f\u1e00-\u1eff]+/g;
  const matches = text.match(hashtagRegex);
  
  return matches ? matches.map(tag => tag.substring(1)) : [];
};

/**
 * Extract mentions from text
 */
export const extractMentions = (text: string): string[] => {
  if (!text) return [];
  
  const mentionRegex = /@[a-zA-Z0-9_]+/g;
  const matches = text.match(mentionRegex);
  
  return matches ? matches.map(mention => mention.substring(1)) : [];
};

/**
 * Clean and format username
 */
export const formatUsername = (username: string): string => {
  if (!username) return '';
  
  return username
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '') // Remove invalid characters
    .substring(0, 20); // Limit length
};

/**
 * Format phone number for display
 */
export const formatPhoneNumber = (phone: string): string => {
  if (!phone) return '';
  
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Format as (5XX) XXX-XXXX for Turkish numbers
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  // Format with country code
  if (cleaned.length === 12 && cleaned.startsWith('90')) {
    return `+90 (${cleaned.slice(2, 5)}) ${cleaned.slice(5, 8)}-${cleaned.slice(8)}`;
  }
  
  return phone; // Return original if format not recognized
};

/**
 * Remove HTML tags from text
 */
export const stripHtmlTags = (html: string): string => {
  if (!html) return '';
  
  return html.replace(/<[^>]*>/g, '');
};

/**
 * Count words in text
 */
export const countWords = (text: string): number => {
  if (!text) return 0;
  
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
};

/**
 * Escape special characters for regex
 */
export const escapeRegex = (text: string): string => {
  if (!text) return '';
  
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};
