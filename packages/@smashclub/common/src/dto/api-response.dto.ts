/**
 * Standard API response messages
 */
export const API_MESSAGES = {
  SUCCESS: 'Success',
  CREATED: 'Resource created successfully',
  UPDATED: 'Resource updated successfully',
  DELETED: 'Resource deleted successfully',
  NOT_FOUND: 'Resource not found',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Access denied',
  BAD_REQUEST: 'Invalid request',
  INTERNAL_ERROR: 'Internal server error',
};

/**
 * API Response wrapper class
 */
export class ApiResponseDto<T> {
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;

  constructor(data: T, message: string = API_MESSAGES.SUCCESS, statusCode = 200) {
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.timestamp = new Date().toISOString();
  }

  static success<T>(data: T, message: string = API_MESSAGES.SUCCESS): ApiResponseDto<T> {
    return new ApiResponseDto(data, message, 200);
  }

  static created<T>(data: T, message: string = API_MESSAGES.CREATED): ApiResponseDto<T> {
    return new ApiResponseDto(data, message, 201);
  }

  static noContent(message: string = API_MESSAGES.DELETED): ApiResponseDto<null> {
    return new ApiResponseDto(null, message, 204);
  }
}

