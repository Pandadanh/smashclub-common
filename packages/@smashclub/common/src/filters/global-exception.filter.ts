import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

export interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
  requestId?: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    
    const requestId = request.headers['x-request-id'] as string | undefined;
    
    let status: number;
    let message: string;
    let error: string;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = exception.name;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as Record<string, unknown>;
        message = (responseObj['message'] as string) || exception.message;
        error = (responseObj['error'] as string) || exception.name;
      } else {
        message = exception.message;
        error = exception.name;
      }
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      error = 'InternalServerError';
      
      // Log the actual error for debugging
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
      );
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      error = 'UnknownError';
      
      this.logger.error(`Unknown exception type: ${String(exception)}`);
    }

    const errorResponse: ErrorResponse = {
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(requestId && { requestId }),
    };

    response.status(status).json(errorResponse);
  }
}

