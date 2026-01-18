import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RequestUser } from '../types/request-user.type';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    
    // No roles required = allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as RequestUser | undefined;
    
    if (!user || !user.roles || user.roles.length === 0) {
      throw new ForbiddenException('Insufficient permissions');
    }

    // Normalize roles to uppercase for comparison
    const userRolesUpper = user.roles.map(r => r.toUpperCase());
    const requiredRolesUpper = requiredRoles.map(r => r.toUpperCase());

    // Check if user has any of the required roles
    const hasRole = requiredRolesUpper.some(required => 
      userRolesUpper.includes(required)
    );

    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied. Required roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}

