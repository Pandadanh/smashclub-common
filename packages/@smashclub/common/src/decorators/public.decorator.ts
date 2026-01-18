import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator to mark a route as public (no authentication required)
 * @example
 * ```ts
 * @Public()
 * @Get('health')
 * health() { return 'OK'; }
 * ```
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

