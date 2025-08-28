/**
 * Date Utilities
 * Date formatting and manipulation functions
 */

import { format, isToday as isTodayFns, isSameDay as isSameDayFns, formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

/**
 * Format date to readable string
 */
export const formatDate = (date: Date | string | number, formatString: string = 'dd MMM yyyy'): string => {
  try {
    const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    return format(dateObj, formatString, { locale: tr });
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Geçersiz tarih';
  }
};

/**
 * Format time to readable string
 */
export const formatTime = (date: Date | string | number, formatString: string = 'HH:mm'): string => {
  try {
    const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    return format(dateObj, formatString, { locale: tr });
  } catch (error) {
    console.error('Time formatting error:', error);
    return 'Geçersiz saat';
  }
};

/**
 * Get relative time (e.g., "2 hours ago")
 */
export const getRelativeTime = (date: Date | string | number): string => {
  try {
    const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    return formatDistanceToNow(dateObj, { addSuffix: true, locale: tr });
  } catch (error) {
    console.error('Relative time error:', error);
    return 'Geçersiz tarih';
  }
};

/**
 * Check if date is today
 */
export const isToday = (date: Date | string | number): boolean => {
  try {
    const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    return isTodayFns(dateObj);
  } catch (error) {
    console.error('isToday error:', error);
    return false;
  }
};

/**
 * Check if two dates are the same day
 */
export const isSameDay = (date1: Date | string | number, date2: Date | string | number): boolean => {
  try {
    const date1Obj = typeof date1 === 'string' || typeof date1 === 'number' ? new Date(date1) : date1;
    const date2Obj = typeof date2 === 'string' || typeof date2 === 'number' ? new Date(date2) : date2;
    return isSameDayFns(date1Obj, date2Obj);
  } catch (error) {
    console.error('isSameDay error:', error);
    return false;
  }
};
