import { Injectable, Logger, LogLevel } from '@nestjs/common';

export interface LogContext {
  requestId?: string;
  userId?: string;
  service?: string;
  [key: string]: unknown;
}

/**
 * Structured logging service with context support
 */
@Injectable()
export class LoggingService {
  private readonly logger = new Logger('App');
  private readonly isProduction = process.env.NODE_ENV === 'production';

  /**
   * Log with context
   */
  log(message: string, context?: LogContext): void {
    if (this.isProduction) {
      // JSON format for production (easier to parse)
      console.log(JSON.stringify({ level: 'info', message, ...context, timestamp: new Date().toISOString() }));
    } else {
      this.logger.log(this.formatMessage(message, context));
    }
  }

  /**
   * Debug log (only in non-production)
   */
  debug(message: string, context?: LogContext): void {
    if (!this.isProduction) {
      this.logger.debug(this.formatMessage(message, context));
    }
  }

  /**
   * Warning log
   */
  warn(message: string, context?: LogContext): void {
    if (this.isProduction) {
      console.warn(JSON.stringify({ level: 'warn', message, ...context, timestamp: new Date().toISOString() }));
    } else {
      this.logger.warn(this.formatMessage(message, context));
    }
  }

  /**
   * Error log
   */
  error(message: string, trace?: string, context?: LogContext): void {
    if (this.isProduction) {
      console.error(JSON.stringify({ 
        level: 'error', 
        message, 
        trace, 
        ...context, 
        timestamp: new Date().toISOString() 
      }));
    } else {
      this.logger.error(this.formatMessage(message, context), trace);
    }
  }

  private formatMessage(message: string, context?: LogContext): string {
    if (!context) return message;
    
    const contextStr = Object.entries(context)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}=${v}`)
      .join(' ');
    
    return contextStr ? `${message} | ${contextStr}` : message;
  }
}

