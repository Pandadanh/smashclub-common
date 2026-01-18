import { Logger } from '@nestjs/common';

export interface RepositoryLoggerOptions {
  /** Enable logging (default: false in production) */
  enabled?: boolean;
  /** Log slow queries (threshold in ms, default: 1000) */
  slowQueryThreshold?: number;
  /** Log query parameters (default: false in production) */
  logParams?: boolean;
}

/**
 * Optimized logger for repositories
 * 
 * In production:
 * - Only logs slow queries and errors
 * - Doesn't log query parameters (security)
 * 
 * In development:
 * - Logs all queries with parameters
 * - Helps with debugging
 */
export class RepositoryLogger {
  private readonly logger: Logger;
  private readonly options: Required<RepositoryLoggerOptions>;

  constructor(
    repositoryName: string,
    options: RepositoryLoggerOptions = {},
  ) {
    this.logger = new Logger(repositoryName);
    const isProduction = process.env.NODE_ENV === 'production';
    
    this.options = {
      enabled: options.enabled ?? !isProduction,
      slowQueryThreshold: options.slowQueryThreshold ?? 1000,
      logParams: options.logParams ?? !isProduction,
    };
  }

  /**
   * Log a query operation
   */
  query<T>(
    operation: string,
    params: Record<string, unknown> | null,
    fn: () => Promise<T>,
  ): Promise<T> {
    if (!this.options.enabled) {
      return fn();
    }

    return this.executeWithTiming(operation, params, fn);
  }

  /**
   * Execute function with timing and logging
   */
  private async executeWithTiming<T>(
    operation: string,
    params: Record<string, unknown> | null,
    fn: () => Promise<T>,
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await fn();
      const duration = Date.now() - startTime;

      if (duration > this.options.slowQueryThreshold) {
        this.logger.warn(
          `SLOW QUERY: ${operation} took ${duration}ms` +
            (this.options.logParams && params ? ` | params: ${this.safeStringify(params)}` : ''),
        );
      } else if (this.options.enabled && process.env.NODE_ENV !== 'production') {
        this.logger.debug(
          `${operation} (${duration}ms)` +
            (this.options.logParams && params ? ` | params: ${this.safeStringify(params)}` : ''),
        );
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `FAILED: ${operation} (${duration}ms)` +
          (this.options.logParams && params ? ` | params: ${this.safeStringify(params)}` : ''),
        (error as Error).stack,
      );
      throw error;
    }
  }

  /**
   * Safely stringify params (truncate long values)
   */
  private safeStringify(obj: Record<string, unknown>): string {
    try {
      return JSON.stringify(obj, (_, value) => {
        if (typeof value === 'string' && value.length > 100) {
          return value.substring(0, 100) + '...';
        }
        return value;
      });
    } catch {
      return '[Unable to stringify]';
    }
  }
}

/**
 * Decorator for logging repository methods
 * 
 * @example
 * ```ts
 * class MyRepository {
 *   @LogQuery('findById')
 *   async findById(id: string) {
 *     return this.prisma.entity.findUnique({ where: { id } });
 *   }
 * }
 * ```
 */
export function LogQuery(operation?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const methodName = operation || propertyKey;

    descriptor.value = async function (...args: any[]) {
      const isProduction = process.env.NODE_ENV === 'production';
      
      // Skip logging in production unless slow
      if (isProduction) {
        const startTime = Date.now();
        try {
          const result = await originalMethod.apply(this, args);
          const duration = Date.now() - startTime;
          
          if (duration > 1000) {
            console.warn(`[SLOW] ${target.constructor.name}.${methodName}: ${duration}ms`);
          }
          
          return result;
        } catch (error) {
          console.error(`[ERROR] ${target.constructor.name}.${methodName}:`, error);
          throw error;
        }
      }

      // Development logging
      const startTime = Date.now();
      console.log(`[QUERY] ${target.constructor.name}.${methodName} started`);
      
      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;
        console.log(`[QUERY] ${target.constructor.name}.${methodName} completed (${duration}ms)`);
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[ERROR] ${target.constructor.name}.${methodName} failed (${duration}ms):`, error);
        throw error;
      }
    };

    return descriptor;
  };
}

