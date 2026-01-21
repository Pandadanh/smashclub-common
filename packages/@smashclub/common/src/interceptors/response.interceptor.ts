import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
}

/**
 * Check if response is already wrapped in standard API format
 */
function isAlreadyWrapped(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  // Already wrapped if has: (statusCode OR status) AND (data OR message)
  return (
    ('statusCode' in obj || 'status' in obj) &&
    ('data' in obj || 'message' in obj)
  );
}

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T> | T>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T> | T> {
    return next.handle().pipe(
      map((data) => {
        // Skip wrapping if already in standard format
        if (isAlreadyWrapped(data)) {
          return data;
        }

        const response = context.switchToHttp().getResponse();
        const statusCode = response.statusCode || 200;
        
        return {
          statusCode,
          message: 'Success',
          data,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
