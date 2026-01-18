/**
 * User information attached to request by Gateway
 * This is decoded from JWT or passed via x-user-* headers
 */
export interface RequestUser {
  /** User ID */
  id: string;
  /** User email */
  email?: string;
  /** User roles - string array for flexibility */
  roles: string[];
  /** Additional claims from JWT */
  [key: string]: unknown;
}

/**
 * Extended Express Request with user
 */
export interface AuthenticatedRequest extends Request {
  user: RequestUser;
}

