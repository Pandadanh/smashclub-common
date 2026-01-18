import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Decorator to specify required roles for a route
 * Accepts string roles for flexibility with different Prisma schemas
 * @example
 * ```ts
 * @Roles('ADMIN', 'OWNER')
 * @Get('admin-only')
 * adminOnly() { return 'Admin area'; }
 * ```
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

