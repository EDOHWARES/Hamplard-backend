import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SmsStatus } from '@prisma/client';
import { NotificationsModule } from './notifications.module';
import { SmsController } from './sms.controller';
import { SmsService } from './sms.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('NotificationsModule wiring', () => {
  it('registers SmsController', () => {
    const controllers = Reflect.getMetadata('controllers', NotificationsModule);
    expect(controllers).toContain(SmsController);
  });

  it('registers and exports SmsService', () => {
    const providers = Reflect.getMetadata('providers', NotificationsModule);
    const exportsList = Reflect.getMetadata('exports', NotificationsModule);
    expect(providers).toContain(SmsService);
    expect(exportsList).toContain(SmsService);
  });

  it('mounts the SMS routes under notifications/sms', () => {
    expect(Reflect.getMetadata('path', SmsController)).toBe('notifications/sms');
  });
});

describe('SmsService without Africa\'s Talking credentials', () => {
  let service: SmsService;

  const mockPrisma = {
    smsMessage: {
      create: jest.fn().mockResolvedValue({ id: 'sms-1' }),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'sms-1', ...data })),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: ConfigService,
          useValue: { get: jest.fn((_key: string, defaultValue?: any) => defaultValue) },
        },
      ],
    }).compile();

    service = module.get<SmsService>(SmsService);
  });

  it('can be instantiated so the app boots without credentials', () => {
    expect(service).toBeDefined();
  });

  it('marks messages as FAILED instead of throwing when the gateway is not configured', async () => {
    const result = await service.sendSms({
      phoneNumber: '08031234567',
      countryCode: 'NG',
      message: 'hello',
    });

    expect(result.status).toBe(SmsStatus.FAILED);
    expect(mockPrisma.smsMessage.update).toHaveBeenCalledWith({
      where: { id: 'sms-1' },
      data: { status: SmsStatus.FAILED, failureReason: 'SMS gateway not configured' },
    });
  });
});
