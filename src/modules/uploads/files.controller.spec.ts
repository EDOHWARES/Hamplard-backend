import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CdnService } from './cdn.service';
import { FilesController } from './files.controller';
import { UploadsService } from './uploads.service';
import { VirusScanService } from './virus-scan.service';
import { VideoTranscodeService } from './video-transcode.service';
import { VideoThumbnailService } from './video-thumbnail.service';

jest.mock('clamscan', () => jest.fn());

describe('FilesController', () => {
  let controller: FilesController;
  let cdn: CdnService;
  let uploadDir: string;
  let res: { set: jest.Mock };

  const writeUpload = (relativePath: string, content: string | Buffer) => {
    const fullPath = path.join(uploadDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  };

  const signedQuery = (originPath: string) => {
    const { cdnUrl } = cdn.generateCdnUrl(originPath, { visibility: 'private' });
    const url = new URL(cdnUrl);
    return {
      expires: url.searchParams.get('expires') ?? undefined,
      signature: url.searchParams.get('signature') ?? undefined,
    };
  };

  beforeEach(async () => {
    uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hamplard-uploads-'));
    const configValues: Record<string, string | number> = {
      UPLOAD_DIR: uploadDir,
      CDN_BASE_URL: 'https://cdn.hamplard.com',
      CDN_ORIGIN_BASE_URL: 'http://localhost:3000/api/v1',
      CDN_SIGNING_SECRET: 'test-secret',
      CDN_SIGNED_URL_TTL_SECONDS: 3600,
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FilesController],
      providers: [
        UploadsService,
        CdnService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: unknown) =>
              configValues[key] !== undefined ? configValues[key] : defaultValue,
            ),
          },
        },
        { provide: VirusScanService, useValue: { scanFile: jest.fn() } },
        { provide: VideoTranscodeService, useValue: { validateVideoFormat: jest.fn() } },
        { provide: VideoThumbnailService, useValue: { extractThumbnail: jest.fn() } },
        {
          provide: require('../../common/prisma/prisma.service').PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get(FilesController);
    cdn = module.get(CdnService);
    res = { set: jest.fn() };
  });

  afterEach(() => {
    fs.rmSync(uploadDir, { recursive: true, force: true });
  });

  it('serves public files inline with safe headers', () => {
    writeUpload('courses/c1/thumb.png', Buffer.from([0x89, 0x50, 0x4e, 0x47]));

    const file = controller.serveFile('courses/c1/thumb.png', undefined, undefined, res as any);

    expect(file).toBeInstanceOf(StreamableFile);
    expect(file.options.type).toBe('image/png');
    expect(file.options.disposition).toBe('inline; filename="thumb.png"');
    expect(file.options.length).toBe(4);
    expect(res.set).toHaveBeenCalledWith(
      expect.objectContaining({
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox",
      }),
    );
    file.getStream().destroy();
  });

  it('serves unknown types as an octet-stream attachment', () => {
    writeUpload('resources/page.html', '<script>alert(1)</script>');

    const file = controller.serveFile('resources/page.html', undefined, undefined, res as any);

    expect(file.options.type).toBe('application/octet-stream');
    expect(file.options.disposition).toBe('attachment; filename="page.html"');
    file.getStream().destroy();
  });

  it('returns 404 for missing files', () => {
    expect(() =>
      controller.serveFile('courses/missing.png', undefined, undefined, res as any),
    ).toThrow(NotFoundException);
  });

  it('rejects path traversal outside the upload directory', () => {
    expect(() =>
      controller.serveFile('../../etc/passwd', undefined, undefined, res as any),
    ).toThrow(BadRequestException);
  });

  describe('private files', () => {
    beforeEach(() => {
      writeUpload('kyc/kyc-inst-1.pdf', '%PDF-1.7');
    });

    it('never serves kyc/ files without a signature', () => {
      expect(() =>
        controller.serveFile('kyc/kyc-inst-1.pdf', undefined, undefined, res as any),
      ).toThrow(ForbiddenException);
    });

    it('blocks kyc/ access smuggled through a relative path', () => {
      expect(() =>
        controller.serveFile('courses/../kyc/kyc-inst-1.pdf', undefined, undefined, res as any),
      ).toThrow(ForbiddenException);
    });

    it('rejects an invalid signature', () => {
      const { expires } = signedQuery('/uploads/kyc/kyc-inst-1.pdf');

      expect(() =>
        controller.serveFile('kyc/kyc-inst-1.pdf', expires, 'deadbeef', res as any),
      ).toThrow(ForbiddenException);
    });

    it('rejects a signature issued for a different file', () => {
      const { expires, signature } = signedQuery('/uploads/kyc/other.pdf');

      expect(() =>
        controller.serveFile('kyc/kyc-inst-1.pdf', expires, signature, res as any),
      ).toThrow(ForbiddenException);
    });

    it('rejects an expired signature', () => {
      const { expires, signature } = (() => {
        const { cdnUrl } = cdn.generateCdnUrl('/uploads/kyc/kyc-inst-1.pdf', {
          visibility: 'private',
          expiresInSeconds: -60,
        });
        const url = new URL(cdnUrl);
        return {
          expires: url.searchParams.get('expires') ?? undefined,
          signature: url.searchParams.get('signature') ?? undefined,
        };
      })();

      expect(() =>
        controller.serveFile('kyc/kyc-inst-1.pdf', expires, signature, res as any),
      ).toThrow(ForbiddenException);
    });

    it('serves kyc/ files with a valid signature and no caching', () => {
      const { expires, signature } = signedQuery('/uploads/kyc/kyc-inst-1.pdf');

      const file = controller.serveFile('kyc/kyc-inst-1.pdf', expires, signature, res as any);

      expect(file).toBeInstanceOf(StreamableFile);
      expect(file.options.type).toBe('application/pdf');
      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({ 'Cache-Control': 'private, no-store' }),
      );
      file.getStream().destroy();
    });
  });
});
