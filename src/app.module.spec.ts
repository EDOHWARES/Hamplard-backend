import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { buildSwaggerConfig } from './swagger.config';
import { PrismaService } from './common/prisma/prisma.service';

import { CouponsModule } from './modules/coupons/coupons.module';
import { CouponsController } from './modules/coupons/coupons.controller';
import { CouponsService } from './modules/coupons/coupons.service';
import { BundlesModule } from './modules/bundles/bundles.module';
import { BundlesController } from './modules/bundles/bundles.controller';
import { BundlesService } from './modules/bundles/bundles.service';
import { DisputesModule } from './modules/disputes/disputes.module';
import { DisputesController } from './modules/disputes/disputes.controller';
import { DisputesService } from './modules/disputes/disputes.service';
import { FeatureFlagsModule } from './modules/feature-flags/feature-flags.module';
import { FeatureFlagsController } from './modules/feature-flags/feature-flags.controller';
import { FeatureFlagsService } from './modules/feature-flags/feature-flags.service';
import { CronMonitorModule } from './modules/cron-monitor/cron-monitor.module';
import { CronMonitorController } from './modules/cron-monitor/cron-monitor.controller';
import { CronMonitorService } from './modules/cron-monitor/cron-monitor.service';
import { CronMonitorScheduler } from './modules/cron-monitor/cron-monitor.scheduler';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SmsController } from './modules/notifications/sms.controller';
import { SmsService } from './modules/notifications/sms.service';

describe('AppModule route smoke test', () => {
  it('imports the coupons, bundles, disputes, feature-flags and cron-monitor modules', () => {
    const imports = Reflect.getMetadata('imports', AppModule);
    expect(imports).toEqual(
      expect.arrayContaining([
        CouponsModule,
        BundlesModule,
        DisputesModule,
        FeatureFlagsModule,
        CronMonitorModule,
        NotificationsModule,
      ]),
    );
  });

  it('registers the cron-monitor scheduler so housekeeping crons run', () => {
    const providers = Reflect.getMetadata('providers', CronMonitorModule);
    expect(providers).toContain(CronMonitorScheduler);
  });

  describe('Swagger document', () => {
    let app: INestApplication;
    let document: OpenAPIObject;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        controllers: [
          CouponsController,
          BundlesController,
          DisputesController,
          FeatureFlagsController,
          CronMonitorController,
          SmsController,
        ],
        providers: [
          { provide: PrismaService, useValue: {} },
          { provide: CouponsService, useValue: {} },
          { provide: BundlesService, useValue: {} },
          { provide: DisputesService, useValue: {} },
          { provide: FeatureFlagsService, useValue: {} },
          { provide: CronMonitorService, useValue: {} },
          { provide: SmsService, useValue: {} },
        ],
      }).compile();

      app = moduleRef.createNestApplication();
      await app.init();
      document = SwaggerModule.createDocument(app, buildSwaggerConfig());
    });

    afterAll(async () => {
      await app.close();
    });

    it.each([
      '/coupons',
      '/bundles',
      '/disputes',
      '/feature-flags',
      '/cron-monitor/runs',
      '/notifications/sms/send',
      '/notifications/sms/{id}/status',
      '/notifications/sms/callback',
    ])('lists %s', (path) => {
      expect(document.paths[path]).toBeDefined();
    });

    it.each(['coupons', 'bundles', 'disputes', 'feature-flags', 'cron-monitor', 'sms'])(
      'declares the %s tag',
      (tag) => {
        expect(document.tags.map((t) => t.name)).toContain(tag);
      },
    );
  });
});
