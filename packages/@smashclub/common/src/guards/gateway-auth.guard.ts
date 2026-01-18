import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { RequestUser } from '../types/request-user.type';

/**
 * Auth guard that trusts Gateway's authentication
 * 
 * When requests come through the Gateway:
 * - Gateway validates JWT and sets x-user-id, x-user-roles headers
 * - This guard reads those headers and attaches user to request
 * 
 * For direct access (dev mode):
 * - Reads user from request.user (set by local JWT validation)
 */
@Injectable()
export class GatewayAuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    
    // Try to get user from Gateway headers first
    const userId = request.headers['x-user-id'];
    const userRoles = request.headers['x-user-roles'];
    const userEmail = request.headers['x-user-email'];
    
    if (userId && !request.user) {
      // User info from Gateway - parse roles
      const roles = userRoles 
        ? String(userRoles).split(',').map((r: string) => r.trim())
        : [];
      
      request.user = {
        id: String(userId),
        email: userEmail ? String(userEmail) : undefined,
        roles,
      } as RequestUser;
    }
    
    // Check if user exists (from gateway headers or local JWT)
    if (request.user && (request.user.id || request.user.sub)) {
      // Normalize user object if needed
      if (!request.user.id && request.user.sub) {
        request.user.id = request.user.sub;
      }
      return true;
    }
    
    throw new UnauthorizedException('Authentication required');
  }
}

