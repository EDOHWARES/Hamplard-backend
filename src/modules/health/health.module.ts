// health.module.ts
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { EventsModule } from '../events/events.module';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [TerminusModule, EventsModule, UploadsModule],
  controllers: [HealthController],
})
export class HealthModule {}
