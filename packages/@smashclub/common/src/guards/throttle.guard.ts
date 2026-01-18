import {
  Injectable,
  ExecutionContext,
} from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';

/**
 * Custom throttle guard that uses user ID for authenticated requests
 * and IP address for unauthenticated requests
 */
@Injectable()
export class UserThrottleGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    // Use user ID if authenticated, otherwise use IP
    const user = req['user'] as { id?: string } | undefined;
    if (user?.id) {
      return `user:${user.id}`;
    }
    
    // Fallback to IP
    const ip = req['ip'] as string || 
               (req['headers'] as Record<string, string>)?.['x-forwarded-for'] || 
               'unknown';
    return `ip:${ip}`;
  }

  protected throwThrottlingException(context: ExecutionContext): Promise<void> {
    throw new ThrottlerException('Too many requests. Please try again later.');
  }
}

