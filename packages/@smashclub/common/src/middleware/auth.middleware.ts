import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import { RequestUser } from '../types/request-user.type';
import { UserRole } from '../constants/roles.constant';

/**
 * Auth middleware that extracts user from Gateway headers
 * 
 * This middleware reads x-user-* headers set by the Gateway
 * and attaches user info to the request object.
 * 
 * For development without Gateway, it can optionally validate JWT locally.
 */
@Injectable()
export class GatewayAuthMiddleware implements NestMiddleware {
  private readonly trustGateway: boolean;
  private readonly jwtSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.trustGateway = 
      this.configService.get<string>('TRUST_GATEWAY_AUTH') !== 'false';
    this.jwtSecret = this.configService.get<string>('JWT_SECRET') || '';
  }

  use(req: Request, _res: Response, next: NextFunction): void {
    // Try Gateway headers first
    const userId = req.headers['x-user-id'] as string | undefined;
    const userEmail = req.headers['x-user-email'] as string | undefined;
    const userRoles = req.headers['x-user-roles'] as string | undefined;

    if (userId) {
      // User info from Gateway
      const roles = userRoles 
        ? userRoles.split(',').map(r => r.trim() as UserRole)
        : [];

      (req as any).user = {
        id: userId,
        email: userEmail,
        roles,
      } as RequestUser;

      return next();
    }

    // If not trusting gateway, try local JWT validation
    if (!this.trustGateway && this.jwtSecret) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        try {
          // Dynamic import to avoid requiring jsonwebtoken everywhere
          const jwt = require('jsonwebtoken');
          const token = authHeader.substring(7);
          const decoded = jwt.verify(token, this.jwtSecret) as any;

          (req as any).user = {
            id: decoded.sub || decoded.id || decoded.userId,
            email: decoded.email,
            roles: decoded.roles || [],
          } as RequestUser;
        } catch (error) {
          // Token invalid - continue without user
        }
      }
    }

    next();
  }
}

