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

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
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

