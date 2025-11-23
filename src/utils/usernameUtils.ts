/**
 * 👤 Username Utilities
 * Utilities for username validation, formatting, and management
 */

/**
 * Validate username format
 */
export const validateUsername = (username: string): { isValid: boolean; error?: string } => {
  if (!username || username.trim().length === 0) {
    return { isValid: false, error: 'Username is required' };
  }

  const trimmedUsername = username.trim();

  // Check length
  if (trimmedUsername.length < 3) {
    return { isValid: false, error: 'Username must be at least 3 characters long' };
  }

  if (trimmedUsername.length > 20) {
    return { isValid: false, error: 'Username must not exceed 20 characters' };
  }

  // Check format (alphanumeric and underscore only)
  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  if (!usernameRegex.test(trimmedUsername)) {
    return { isValid: false, error: 'Username can only contain letters, numbers, and underscores' };
  }

  // Check if it starts with a letter or number (not underscore)
  if (trimmedUsername.startsWith('_')) {
    return { isValid: false, error: 'Username cannot start with an underscore' };
  }

  // Check for consecutive underscores
  if (trimmedUsername.includes('__')) {
    return { isValid: false, error: 'Username cannot contain consecutive underscores' };
  }

  return { isValid: true };
};

/**
 * Sanitize username by removing invalid characters
 */
export const sanitizeUsername = (username: string): string => {
  return username
    .trim()
    .toLowerCase()
    .replace(/[^a-zA-Z0-9_]/g, '') // Remove invalid characters
    .replace(/_{2,}/g, '_') // Replace consecutive underscores with single
    .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
    .substring(0, 20); // Limit length
};

/**
 * Generate username suggestions based on name
 */
export const generateUsernameSuggestions = (firstName: string, lastName: string): string[] => {
  const suggestions: string[] = [];
  const first = sanitizeUsername(firstName);
  const last = sanitizeUsername(lastName);

  if (first && last) {
    // Basic combinations
    suggestions.push(`${first}_${last}`);
    suggestions.push(`${first}${last}`);
    suggestions.push(`${last}_${first}`);
    
    // With initials
    suggestions.push(`${first}_${last.charAt(0)}`);
    suggestions.push(`${first.charAt(0)}_${last}`);
    
    // With numbers
    for (let i = 1; i <= 3; i++) {
      suggestions.push(`${first}_${last}${i}`);
      suggestions.push(`${first}${last}${i}`);
    }
  } else if (first) {
    suggestions.push(first);
    for (let i = 1; i <= 5; i++) {
      suggestions.push(`${first}${i}`);
    }
  }

  // Filter valid suggestions and remove duplicates
  return [...new Set(suggestions.filter(s => validateUsername(s).isValid))];
};

/**
 * Check if username is reserved
 */
export const isReservedUsername = (username: string): boolean => {
  const reservedUsernames = [
    'admin', 'administrator', 'root', 'user', 'test', 'guest',
    'support', 'help', 'info', 'contact', 'about', 'privacy',
    'terms', 'login', 'signup', 'register', 'profile', 'settings',
    'universe', 'system', 'api', 'www', 'mail', 'email',
    'moderator', 'mod', 'staff', 'official', 'verified'
  ];

  return reservedUsernames.includes(username.toLowerCase());
};

/**
 * Format username for display (capitalize first letter)
 */
export const formatUsernameForDisplay = (username: string): string => {
  if (!username) return '';
  return username.charAt(0).toUpperCase() + username.slice(1);
};

/**
 * Extract initials from username
 */
export const getUsernameInitials = (username: string): string => {
  if (!username) return '';
  
  // If username contains underscore, use first letter of each part
  if (username.includes('_')) {
    return username
      .split('_')
      .map(part => part.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
  }
  
  // Otherwise, just use first two characters
  return username.substring(0, 2).toUpperCase();
};

/**
 * Check username availability (placeholder - should be implemented with actual API call)
 */
export const checkUsernameAvailability = async (username: string): Promise<{ available: boolean; suggestions?: string[] }> => {
  // This is a placeholder implementation
  // In a real app, this would make an API call to check availability
  
  const validation = validateUsername(username);
  if (!validation.isValid) {
    return { available: false };
  }

  if (isReservedUsername(username)) {
    return { available: false };
  }

  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // For demo purposes, randomly return availability
  const isAvailable = Math.random() > 0.3;
  
  if (!isAvailable) {
    // Generate suggestions if not available
    const nameParts = username.split('_');
    const suggestions = generateUsernameSuggestions(
      nameParts[0] || username,
      nameParts[1] || ''
    );
    
    return { available: false, suggestions };
  }

  return { available: true };
};

/**
 * Get username color based on hash (for consistent avatar colors)
 */
export const getUsernameColor = (username: string): string => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ];

  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
};
