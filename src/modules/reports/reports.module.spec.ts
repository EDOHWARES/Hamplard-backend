import { ExecutionContext, INestApplication } from '@nestjs/common';
import { request as httpRequest } from 'node:http';
import { AddressInfo } from 'node:net';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { InstructorReportService } from './instructor-report.service';
import { ReportsModule } from './reports.module';
import { RevenueReportService } from './revenue-report.service';
import { TopCoursesService } from './top-courses.service';

describe('ReportsModule (HTTP routes)', () => {
  let app: INestApplication;

  const reportMocks = {
    revenue: { generate: jest.fn().mockResolvedValue({ report: 'revenue' }) },
    topCourses: { getTopCourses: jest.fn().mockResolvedValue({ report: 'top-courses' }) },
    instructor: { getReport: jest.fn().mockResolvedValue({ report: 'instructor-performance' }) },
  };

  const adminJwtGuard = {
    canActivate: jest.fn((context: ExecutionContext) => {
      context.switchToHttp().getRequest().user = {
        id: 'admin-1',
        role: UserRole.ADMIN,
      };
      return true;
    }),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule, ReportsModule],
      providers: [RolesGuard],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(RevenueReportService)
      .useValue(reportMocks.revenue)
      .overrideProvider(TopCoursesService)
      .useValue(reportMocks.topCourses)
      .overrideProvider(InstructorReportService)
      .useValue(reportMocks.instructor)
      .overrideGuard(JwtAuthGuard)
      .useValue(adminJwtGuard)
      .compile();

    app = moduleRef.createNestApplication();
    await app.listen(0);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const get = async (path: string): Promise<{ status: number; body: unknown }> => {
    const address = app.getHttpServer().address() as AddressInfo;
    return new Promise((resolve, reject) => {
      const req = httpRequest(
        { host: '127.0.0.1', port: address.port, path, method: 'GET' },
        (res) => {
          let responseBody = '';
          res.setEncoding('utf8');
          res.on('data', (chunk: string) => (responseBody += chunk));
          res.on('end', () => {
            resolve({
              status: res.statusCode ?? 0,
              body: JSON.parse(responseBody),
            });
          });
        },
      );
      req.on('error', reject);
      req.end();
    });
  };

  it('serves the revenue report endpoint to an admin', async () => {
    const response = await get('/reports/revenue');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ report: 'revenue' });
    expect(reportMocks.revenue.generate).toHaveBeenCalled();
  });

  it('serves the top-courses endpoint to an admin', async () => {
    const response = await get('/reports/top-courses');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ report: 'top-courses' });
    expect(reportMocks.topCourses.getTopCourses).toHaveBeenCalled();
  });

  it('serves the instructor performance endpoint to an admin', async () => {
    const response = await get('/reports/instructors/instructor-1/performance');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ report: 'instructor-performance' });
    expect(reportMocks.instructor.getReport).toHaveBeenCalledWith(
      'instructor-1',
      expect.any(Object),
    );
  });
});