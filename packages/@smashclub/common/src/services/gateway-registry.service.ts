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
  /** Health check interval in ms (default: 30000) - verify registration is valid */
  healthCheckInterval: number;
  /** Enable registration (default: true) */
  enabled: boolean;
}

@Injectable()
export class GatewayRegistryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GatewayRegistryService.name);
  private readonly config: GatewayRegistryConfig;
  private heartbeatTimer?: ReturnType<typeof setInterval>;
  private retryTimer?: ReturnType<typeof setInterval>;
  private healthCheckTimer?: ReturnType<typeof setInterval>;
  private registered = false;
  private isRetrying = false;
  private consecutiveFailures = 0;
  private readonly maxConsecutiveFailures = 3;

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
      healthCheckInterval: parseInt(
        this.configService.get<string>('GATEWAY_HEALTH_CHECK_INTERVAL') || '30000',
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
    
    // Start periodic health check to detect gateway restart
    this.startHealthCheck();
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
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
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
      
      if (response.ok) {
        // Heartbeat successful - reset failure counter
        this.consecutiveFailures = 0;
      } else if (response.status === 404) {
        // Gateway doesn't know about us - it probably restarted
        this.logger.warn('⚠️ Gateway returned 404 - service not found. Gateway may have restarted.');
        this.forceReRegister();
      } else {
        this.handleHeartbeatFailure(`Status ${response.status}`);
      }
    } catch (error) {
      this.handleHeartbeatFailure(String(error));
    }
  }

  private handleHeartbeatFailure(reason: string): void {
    this.consecutiveFailures++;
    this.logger.warn(`Heartbeat failed (${this.consecutiveFailures}/${this.maxConsecutiveFailures}): ${reason}`);
    
    if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
      this.logger.error('❌ Too many heartbeat failures - forcing re-registration');
      this.forceReRegister();
    }
  }

  /**
   * Force re-registration - used when gateway restarts or connection is lost
   */
  private forceReRegister(): void {
    this.registered = false;
    this.consecutiveFailures = 0;
    this.isRetrying = false;
    
    // Stop current timers
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
    
    // Attempt registration immediately
    this.attemptRegistration();
  }

  /**
   * Periodic health check - verifies service is still registered with gateway
   * This catches cases where gateway restarts and loses all registrations
   */
  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(async () => {
      await this.verifyRegistration();
    }, this.config.healthCheckInterval);
  }

  private async verifyRegistration(): Promise<void> {
    if (!this.registered) return;

    const url = `${this.config.gatewayUrl}/registry?service=${this.config.serviceName}`;
    
    try {
      const response = await fetch(url, { method: 'GET' });
      
      if (!response.ok) {
        this.logger.warn('⚠️ Health check failed - gateway may be down');
        return; // Don't force re-register if gateway is down, let heartbeat handle it
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await response.json();
      const rawInstances = Array.isArray(data) ? data : (data?.instances || []);
      
      // Check if our instance is in the list
      const found = rawInstances.some(
        (inst: any) => inst?.instanceId === this.config.instanceId
      );

      if (!found) {
        this.logger.warn('⚠️ Health check: Service not found in gateway registry - forcing re-registration');
        this.forceReRegister();
      }
    } catch (error) {
      // Gateway might be temporarily unavailable - don't force re-register
      this.logger.debug(`Health check error (gateway may be down): ${error}`);
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

