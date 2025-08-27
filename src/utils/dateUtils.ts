/**
 * 🔄 Date & Time Utilities
 * Modern date formatting and manipulation utilities
 */

/**
 * Format a date to a readable string
 */
export const formatDate = (date: Date | string | number): string => {
  const d = new Date(date);
  
  if (isNaN(d.getTime())) {
    return 'Invalid Date';
  }
  
  return d.toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Format a date with time
 */
export const formatDateTime = (date: Date | string | number): string => {
  const d = new Date(date);
  
  if (isNaN(d.getTime())) {
    return 'Invalid Date';
  }
  
  return d.toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Format time only
 */
export const formatTime = (date: Date | string | number): string => {
  const d = new Date(date);
  
  if (isNaN(d.getTime())) {
    return 'Invalid Time';
  }
  
  return d.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Get relative time (e.g., "2 hours ago", "3 days ago")
 */
export const getRelativeTime = (date: Date | string | number): string => {
  const d = new Date(date);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Az önce';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} dakika önce`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} saat önce`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} gün önce`;
  }
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} hafta önce`;
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} ay önce`;
  }
  
  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} yıl önce`;
};

/**
 * Check if a date is today
 */
export const isToday = (date: Date | string | number): boolean => {
  const d = new Date(date);
  const today = new Date();
  
  return d.toDateString() === today.toDateString();
};

/**
 * Check if a date is yesterday
 */
export const isYesterday = (date: Date | string | number): boolean => {
  const d = new Date(date);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  return d.toDateString() === yesterday.toDateString();
};

/**
 * Check if a date is this week
 */
export const isThisWeek = (date: Date | string | number): boolean => {
  const d = new Date(date);
  const now = new Date();
  const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  
  return d >= weekStart && d <= weekEnd;
};

/**
 * Get start of day
 */
export const getStartOfDay = (date: Date | string | number): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Get end of day
 */
export const getEndOfDay = (date: Date | string | number): Date => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

/**
 * Add days to a date
 */
export const addDays = (date: Date | string | number, days: number): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

/**
 * Add hours to a date
 */
export const addHours = (date: Date | string | number, hours: number): Date => {
  const d = new Date(date);
  d.setHours(d.getHours() + hours);
  return d;
};

/**
 * Format duration in milliseconds to human readable string
 */
export const formatDuration = (milliseconds: number): string => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days} gün`;
  }
  if (hours > 0) {
    return `${hours} saat`;
  }
  if (minutes > 0) {
    return `${minutes} dakika`;
  }
  return `${seconds} saniye`;
};

/**
 * Get age from birth date
 */
export const getAge = (birthDate: Date | string | number): number => {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
};

/**
 * Check if a year is leap year
 */
export const isLeapYear = (year: number): boolean => {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
};

/**
 * Get days in month
 */
export const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

/**
 * Format date for input fields (YYYY-MM-DD)
 */
export const formatDateForInput = (date: Date | string | number): string => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Parse date from input format (YYYY-MM-DD)
 */
export const parseDateFromInput = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Get Turkish day name
 */
export const getTurkishDayName = (date: Date | string | number): string => {
  const d = new Date(date);
  const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  return days[d.getDay()];
};

/**
 * Get Turkish month name
 */
export const getTurkishMonthName = (date: Date | string | number): string => {
  const d = new Date(date);
  const months = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];
  return months[d.getMonth()];
};
