import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

export interface GatewayRegistryConfig {
  /** Gateway URL (default: http://localhost:8080) */
  gatewayUrl: string;
  /** Service name for registration */
  serviceName: string;
  /** Base URL of this service */
  baseUrl: string;
  /** Unique instance ID */
  instanceId: string;
  /** Heartbeat interval in ms (default: 5000) */
  heartbeatInterval: number;
  /** Retry interval in ms (default: 15000) */
  retryInterval: number;
  /** Enable registration (default: true) */
  enabled: boolean;
}

@Injectable()
export class GatewayRegistryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GatewayRegistryService.name);
  private readonly config: GatewayRegistryConfig;
  private heartbeatTimer?: ReturnType<typeof setInterval>;
  private retryTimer?: ReturnType<typeof setInterval>;
  private registered = false;
  private isRetrying = false;

  constructor(private readonly configService: ConfigService) {
    const port = this.configService.get<number>('PORT') || 3000;
    const host = this.configService.get<string>('SERVICE_HOST') || 'localhost';
    const protocol = this.configService.get<string>('SERVICE_PROTOCOL') || 'http';
    const serviceName = this.configService.get<string>('SERVICE_NAME') || 'unknown';

    this.config = {
      gatewayUrl:
        this.configService.get<string>('GATEWAY_URL') || 'http://localhost:8080',
      serviceName,
      baseUrl:
        this.configService.get<string>('SERVICE_BASE_URL') ||
        `${protocol}://${host}:${port}`,
      instanceId:
        this.configService.get<string>('SERVICE_INSTANCE_ID') ||
        `${serviceName}-${randomUUID().slice(0, 8)}`,
      heartbeatInterval: parseInt(
        this.configService.get<string>('GATEWAY_HEARTBEAT_INTERVAL') || '5000',
        10,
      ),
      retryInterval: parseInt(
        this.configService.get<string>('GATEWAY_RETRY_INTERVAL') || '15000',
        10,
      ),
      enabled: this.configService.get<string>('GATEWAY_REGISTRY_ENABLED') !== 'false',
    };
  }

  async onModuleInit(): Promise<void> {
    if (!this.config.enabled) {
      this.logger.warn('Gateway registry is disabled');
      return;
    }

    this.logger.log(`🔄 Registering with gateway: ${this.config.gatewayUrl}`);
    this.logger.log(
      `   Service: ${this.config.serviceName}, Instance: ${this.config.instanceId}`,
    );

    await this.attemptRegistration();
  }

  async onModuleDestroy(): Promise<void> {
    this.stopTimers();

    if (this.registered) {
      try {
        await this.deregister();
        this.logger.log('Service deregistered from gateway');
      } catch (error) {
        this.logger.error('Failed to deregister from gateway:', error);
      }
    }
  }

  private stopTimers(): void {
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
      this.retryTimer = undefined;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  private async attemptRegistration(): Promise<void> {
    if (this.registered) return;

    try {
      await this.register();
      this.registered = true;
      this.isRetrying = false;

      if (this.retryTimer) {
        clearInterval(this.retryTimer);
        this.retryTimer = undefined;
      }

      this.startHeartbeat();

      this.logger.log(
        `✅ Registered: ${this.config.serviceName} (${this.config.instanceId})`,
      );
      this.logger.log(
        `   Accessible at: ${this.config.gatewayUrl}/${this.config.serviceName}/...`,
      );
    } catch (error) {
      this.logger.error('❌ Registration failed:', error);
      this.registered = false;

      if (!this.isRetrying) {
        this.isRetrying = true;
        this.logger.warn(
          `   Retrying every ${this.config.retryInterval / 1000}s...`,
        );

        this.retryTimer = setInterval(async () => {
          if (!this.registered) {
            this.logger.log('🔄 Retrying registration...');
            await this.attemptRegistration();
          }
        }, this.config.retryInterval);
      }
    }
  }

  private async register(): Promise<void> {
    const url = `${this.config.gatewayUrl}/registry/register`;
    const payload = {
      service: this.config.serviceName,
      baseUrl: this.config.baseUrl,
      instanceId: this.config.instanceId,
      meta: {
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
        startedAt: new Date().toISOString(),
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Registration failed: ${response.status} ${text}`);
    }
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(async () => {
      await this.sendHeartbeat();
    }, this.config.heartbeatInterval);
  }

  private async sendHeartbeat(): Promise<void> {
    if (!this.registered) {
      await this.attemptRegistration();
      return;
    }

    const url = `${this.config.gatewayUrl}/registry/heartbeat/${this.config.serviceName}/${this.config.instanceId}`;

    try {
      const response = await fetch(url, { method: 'POST' });
      if (!response.ok) {
        this.logger.warn(`Heartbeat failed: ${response.status}`);
        this.registered = false;
        await this.attemptRegistration();
      }
    } catch (error) {
      this.logger.warn('Heartbeat error:', error);
      this.registered = false;
      await this.attemptRegistration();
    }
  }

  private async deregister(): Promise<void> {
    const url = `${this.config.gatewayUrl}/registry/${this.config.serviceName}/${this.config.instanceId}`;
    await fetch(url, { method: 'DELETE' });
    this.registered = false;
  }

  getRegistrationInfo(): {
    registered: boolean;
    serviceName: string;
    instanceId: string;
    baseUrl: string;
    gatewayUrl: string;
  } {
    return {
      registered: this.registered,
      serviceName: this.config.serviceName,
      instanceId: this.config.instanceId,
      baseUrl: this.config.baseUrl,
      gatewayUrl: this.config.gatewayUrl,
    };
  }
}

