/**
 * Cache TTL constants (in seconds)
 */
export const CACHE_TTL = {
  /** 1 minute */
  SHORT: 60,
  /** 5 minutes */
  MEDIUM: 300,
  /** 30 minutes */
  LONG: 1800,
  /** 1 hour */
  HOUR: 3600,
  /** 1 day */
  DAY: 86400,
} as const;

/**
 * Cache key prefixes
 */
export const CACHE_PREFIX = {
  USER: 'user:',
  SESSION: 'session:',
  BOOKING: 'booking:',
  COURT: 'court:',
  TOURNAMENT: 'tournament:',
  NOTIFICATION: 'notification:',
  RATE_LIMIT: 'rate_limit:',
} as const;

