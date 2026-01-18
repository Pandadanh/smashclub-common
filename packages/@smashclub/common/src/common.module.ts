import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GatewayRegistryService } from './services/gateway-registry.service';
import { LoggingService } from './services/logging.service';

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
  providers: [GatewayRegistryService, LoggingService],
  exports: [GatewayRegistryService, LoggingService],
})
export class SmashClubCommonModule {}

