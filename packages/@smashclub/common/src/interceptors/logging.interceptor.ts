import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';

export interface LoggingInterceptorOptions {
  /** Enable logging (default: true in non-production) */
  enabled?: boolean;
  /** Threshold in ms to log slow requests (default: 3000) */
  slowRequestThreshold?: number;
  /** Log request body (default: false) */
  logBody?: boolean;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');
  private readonly options: Required<LoggingInterceptorOptions>;

  constructor(options: LoggingInterceptorOptions = {}) {
    this.options = {
      enabled: options.enabled ?? process.env.NODE_ENV !== 'production',
      slowRequestThreshold: options.slowRequestThreshold ?? 3000,
      logBody: options.logBody ?? false,
    };
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (!this.options.enabled) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const { method, url } = request;
    const requestId = request.headers['x-request-id'] || 'N/A';
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const response = context.switchToHttp().getResponse();
          const statusCode = response.statusCode;

          if (duration > this.options.slowRequestThreshold) {
            this.logger.warn(
              `[${requestId}] ${method} ${url} ${statusCode} - ${duration}ms (SLOW)`,
            );
          } else {
            this.logger.log(
              `[${requestId}] ${method} ${url} ${statusCode} - ${duration}ms`,
            );
          }
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logger.error(
            `[${requestId}] ${method} ${url} ERROR - ${duration}ms`,
            error.stack,
          );
        },
      }),
    );
  }
}

