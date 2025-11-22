/**
 * Utility functions for handling Israel timezone
 */

/**
 * Convert a date string or Date object to Israel timezone (Asia/Jerusalem)
 * @param date - Date string or Date object
 * @returns Date object in Israel timezone
 */
export const toIsraelTime = (date: string | Date): Date => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  // Convert to Israel timezone
  return new Date(dateObj.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }));
};

/**
 * Format date in Israel timezone with Hebrew locale
 * @param date - Date string or Date object
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export const formatIsraelTime = (
  date: string | Date,
  options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit'
  }
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleString('he-IL', {
    ...options,
    timeZone: 'Asia/Jerusalem'
  });
};

/**
 * Format date for chat message timestamp
 * @param date - Date string or Date object
 * @returns Formatted date string
 */
export const formatChatTime = (date: string | Date): string => {
  return formatIsraelTime(date, {
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Format date for chat message date header
 * @param date - Date string or Date object
 * @returns Formatted date string
 */
export const formatChatDate = (date: string | Date): string => {
  return formatIsraelTime(date, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
};

