import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GatewayRegistryService } from './services/gateway-registry.service';
import { LoggingService } from './services/logging.service';
import { XUserSessionGuard } from './guards/x-usersession.guard';
import { APP_GUARD } from '@nestjs/core';

/**
 * Common module that provides shared services across all microservices
 * 
 * Usage:
 * ```ts
 * @Module({
 *   imports: [SmashClubCommonModule],
 * })
 * export class AppModule {}
 * ```
 */
@Global() 
@Module({
  imports: [ConfigModule],
  providers: [
    GatewayRegistryService,
    LoggingService,
    {
      provide:APP_GUARD,
      useClass:XUserSessionGuard,
    }
  ],
  exports: [GatewayRegistryService, LoggingService],
})
export class SmashClubCommonModule {}

