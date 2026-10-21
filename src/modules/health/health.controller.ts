import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckError,
  HealthIndicatorResult,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { VirusScanService } from '../uploads/virus-scan.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
    private readonly virusScan: VirusScanService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Check API and database health' })
  check() {
    return this.health.check([
      () => this.prismaHealth.pingCheck('database', this.prisma),
      () => this.eventPollerCheckpointIndicator(),
      () => this.virusScannerIndicator(),
    ]);
  }

  @Get('checkpoint')
  @ApiOperation({
    summary: 'Current Stellar event-poller ledger checkpoint (crash recovery)',
  })
  checkpoint() {
    return this.events.getCheckpointStatus();
  }

  /**
   * Reports the event-poller checkpoint inside the aggregate health check.
   * Informational only: it always reports `up` (with a `checkpointHealthy`
   * flag and failure details) so a transient checkpoint write failure on the
   * poller never sends a 503 that pulls the whole service out of rotation.
   * Use GET /health/checkpoint for the authoritative checkpoint state.
   */
  private async eventPollerCheckpointIndicator(): Promise<HealthIndicatorResult> {
    const status = await this.events.getCheckpointStatus();
    return {
      event_poller_checkpoint: {
        status: 'up',
        checkpointHealthy: status.healthy,
        lastProcessedLedger: status.lastProcessedLedger,
        persistedLedger: status.persistedLedger,
        lastPolledAt: status.lastPolledAt,
        resumedFromCheckpoint: status.resumedFromCheckpoint,
        consecutiveWriteFailures: status.consecutiveWriteFailures,
        lastWriteError: status.lastWriteError,
      },
    };
  }

  private async virusScannerIndicator(): Promise<HealthIndicatorResult> {
    const scanner = this.virusScan.getScannerStatus();
    const result: HealthIndicatorResult = {
      virus_scanner: {
        status: scanner.enabled && !scanner.available ? 'down' : 'up',
        enabled: scanner.enabled,
        available: scanner.available,
      },
    };

    if (scanner.enabled && !scanner.available) {
      throw new HealthCheckError('Virus scanner is unavailable', result);
    }

    return result;
  }
}
