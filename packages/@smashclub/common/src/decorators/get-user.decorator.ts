import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestUser } from '../types/request-user.type';

/**
 * Parameter decorator to extract user from request
 * @example
 * ```ts
 * @Get('profile')
 * getProfile(@GetUser() user: RequestUser) {
 *   return user;
 * }
 * 
 * @Get('user-id')
 * getUserId(@GetUser('id') userId: string) {
 *   return userId;
 * }
 * ```
 */
export const GetUser = createParamDecorator(
  (data: keyof RequestUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as RequestUser | undefined;
    
    if (!user) {
      return undefined;
    }
    
    return data ? user[data] : user;
  },
);

