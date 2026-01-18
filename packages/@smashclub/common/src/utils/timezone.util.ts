/**
 * Default timezone for the application
 */
export const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh';

/**
 * Timezone offset in hours (Vietnam = UTC+7)
 */
export const TIMEZONE_OFFSET_HOURS = 7;

/**
 * Convert UTC date to local timezone
 */
export function toLocalTime(utcDate: Date | string): Date {
  const date = new Date(utcDate);
  return new Date(date.getTime() + TIMEZONE_OFFSET_HOURS * 60 * 60 * 1000);
}

/**
 * Convert local date to UTC
 */
export function toUtcTime(localDate: Date | string): Date {
  const date = new Date(localDate);
  return new Date(date.getTime() - TIMEZONE_OFFSET_HOURS * 60 * 60 * 1000);
}

/**
 * Get current time in local timezone
 */
export function nowLocal(): Date {
  return toLocalTime(new Date());
}

/**
 * Format date to ISO string in local timezone
 */
export function formatLocalIso(date: Date | string): string {
  return toLocalTime(date).toISOString();
}

/**
 * Get start of day in local timezone
 */
export function startOfDayLocal(date: Date | string = new Date()): Date {
  const local = toLocalTime(date);
  local.setHours(0, 0, 0, 0);
  return local;
}

/**
 * Get end of day in local timezone
 */
export function endOfDayLocal(date: Date | string = new Date()): Date {
  const local = toLocalTime(date);
  local.setHours(23, 59, 59, 999);
  return local;
}

