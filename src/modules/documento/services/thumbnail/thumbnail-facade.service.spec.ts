import { Test, TestingModule } from '@nestjs/testing';
import { ThumbnailFacadeService } from './thumbnail-facade.service';
import { ThumbnailService } from './thumbnail.service';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock do fs/promises
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock do path
jest.mock('path');
const mockPath = path as jest.Mocked<typeof path>;

describe('ThumbnailFacadeService', () => {
  let service: ThumbnailFacadeService;
  let thumbnailService: jest.Mocked<ThumbnailService>;
  let configService: jest.Mocked<ConfigService>;

  const mockThumbnailResult = {
    thumbnailBuffer: Buffer.from('mock-thumbnail-data'),
    thumbnailPath: 'thumbnails/test-doc-id.jpg',
  };

  beforeEach(async () => {
    const mockThumbnailService = {
      generateThumbnail: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        switch (key) {
          case 'THUMBNAIL_CACHE_DIR':
            return './storage/thumbnails';
          case 'THUMBNAIL_CACHE_TTL_HOURS':
            return 24;
          default:
            return undefined;
        }
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThumbnailFacadeService,
        {
          provide: ThumbnailService,
          useValue: mockThumbnailService,
        },

        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<ThumbnailFacadeService>(ThumbnailFacadeService);
    thumbnailService = module.get(ThumbnailService);

    configService = module.get(ConfigService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('getThumbnail', () => {
    const mockDocumentoId = 'test-doc-id';
    const mockFileBuffer = Buffer.from('mock-file-data');
    const mockMimetype = 'application/pdf';
    const mockSize = 'medium';

    beforeEach(() => {
      mockPath.join.mockReturnValue('/cache/path/hash123.jpg');
    });

    it('deve retornar thumbnail do cache quando disponível', async () => {
      const cachedThumbnail = Buffer.from('cached-thumbnail-data');
      mockFs.readFile.mockResolvedValue(cachedThumbnail);
      mockFs.stat.mockResolvedValue({
        mtime: new Date(Date.now() - 1000 * 60 * 60 * 12), // 12 horas atrás
      } as any);

      const result = await service.getThumbnail(
        mockDocumentoId,
        mockFileBuffer,
        mockMimetype,
        mockSize,
      );

      expect(result).toEqual({
        thumbnailBuffer: cachedThumbnail,
        fromCache: true,
      });
      expect(thumbnailService.generateThumbnail).not.toHaveBeenCalled();
    });

    it('deve gerar novo thumbnail quando cache não existe', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));
      thumbnailService.generateThumbnail.mockResolvedValue(mockThumbnailResult);
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await service.getThumbnail(
        mockDocumentoId,
        mockFileBuffer,
        mockMimetype,
        mockSize,
      );

      expect(result).toEqual({
        thumbnailBuffer: mockThumbnailResult.thumbnailBuffer,
        fromCache: false,
      });
      expect(thumbnailService.generateThumbnail).toHaveBeenCalledWith(
        mockFileBuffer,
        mockMimetype,
        mockDocumentoId,
      );
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('deve gerar novo thumbnail quando cache está expirado', async () => {
      const oldDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 31); // 31 dias atrás
      mockFs.stat.mockResolvedValue({ mtime: oldDate } as any);
      thumbnailService.generateThumbnail.mockResolvedValue(mockThumbnailResult);
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await service.getThumbnail(
        mockDocumentoId,
        mockFileBuffer,
        mockMimetype,
        mockSize,
      );

      expect(result).toEqual({
        thumbnailBuffer: mockThumbnailResult.thumbnailBuffer,
        fromCache: false,
      });
      expect(thumbnailService.generateThumbnail).toHaveBeenCalled();
    });

    it('deve lidar com erro ao salvar no cache', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));
      thumbnailService.generateThumbnail.mockResolvedValue(mockThumbnailResult);
      mockFs.writeFile.mockRejectedValue(new Error('Write error'));

      const result = await service.getThumbnail(
        mockDocumentoId,
        mockFileBuffer,
        mockMimetype,
        mockSize,
      );

      expect(result).toEqual({
        thumbnailBuffer: mockThumbnailResult.thumbnailBuffer,
        fromCache: false,
      });
    });
  });

  describe('removeThumbnail', () => {
    const mockDocumentoId = 'test-doc-id';

    beforeEach(() => {
      mockPath.join.mockImplementation((...args) => args.join('/'));
    });

    it('deve remover todos os tamanhos de thumbnail do cache', async () => {
      mockFs.unlink.mockResolvedValue(undefined);

      await service.removeThumbnail(mockDocumentoId);

      expect(mockFs.unlink).toHaveBeenCalledTimes(3);
    });
  });

  describe('getCacheStats', () => {
    beforeEach(() => {
      mockPath.join.mockImplementation((...args) => args.join('/'));
    });

    it('deve retornar estatísticas do cache', async () => {
      const now = Date.now();
      mockFs.readdir.mockResolvedValue(['file1.jpg', 'file2.jpg'] as any);
      mockFs.stat
        .mockResolvedValueOnce({
          size: 1024,
          mtime: new Date(now - 1000 * 60 * 60),
        } as any)
        .mockResolvedValueOnce({
          size: 2048,
          mtime: new Date(now - 1000 * 60 * 30),
        } as any);

      const stats = await service.getCacheStats();

      expect(stats.totalFiles).toBe(2);
      expect(stats.totalSize).toBe(3072);
      expect(stats.oldestFile).toBeDefined();
      expect(stats.newestFile).toBeDefined();
    });
  });

  describe('generateCacheKey', () => {
    it('deve gerar chave de cache correta', () => {
      const key = service['generateCacheKey']('test-id', 'large');
      expect(key).toMatch(/^[a-f0-9]{16}\.jpg$/);
    });
  });
});
