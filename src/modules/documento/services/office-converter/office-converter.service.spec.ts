import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OfficeConverterService } from './office-converter.service';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';

// Mock do módulo child_process
jest.mock('child_process');
jest.mock('fs');
jest.mock('fs/promises');

const mockExec = exec as jest.MockedFunction<typeof exec>;
const mockFs = fs as jest.Mocked<typeof fs>;
const mockFsPromises = fs.promises as jest.Mocked<typeof fs.promises>;

describe('OfficeConverterService', () => {
  let service: OfficeConverterService;
  let configService: jest.Mocked<ConfigService>;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OfficeConverterService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<OfficeConverterService>(OfficeConverterService);
    configService = module.get(ConfigService);

    // Reset mocks
    jest.clearAllMocks();

    // Setup default config values
    configService.get.mockImplementation((key: string, defaultValue?: any) => {
      const configs = {
        OFFICE_CONVERTER_ENABLED: true,
        OFFICE_CONVERTER_TIMEOUT: 30000,
        OFFICE_CONVERTER_TEMP_DIR: '/tmp',
        OFFICE_CONVERTER_MAX_RETRIES: 2,
        OFFICE_CONVERTER_RETRY_DELAY: 1000,
        LIBREOFFICE_PATH: undefined,
      };
      return configs[key] ?? defaultValue;
    });
  });

  describe('onModuleInit', () => {
    it('should initialize and check LibreOffice availability when enabled', async () => {
      const checkSpy = jest.spyOn(service, 'checkLibreOfficeAvailability');
      checkSpy.mockResolvedValue(true);

      await service.onModuleInit();

      expect(checkSpy).toHaveBeenCalled();
    });

    it('should skip initialization when disabled', async () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'OFFICE_CONVERTER_ENABLED') return false;
        return defaultValue;
      });

      // Recreate service with new config
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          OfficeConverterService,
          {
            provide: ConfigService,
            useValue: configService,
          },
        ],
      }).compile();

      const disabledService = module.get<OfficeConverterService>(OfficeConverterService);
      const checkSpy = jest.spyOn(disabledService, 'checkLibreOfficeAvailability');

      await disabledService.onModuleInit();

      expect(checkSpy).not.toHaveBeenCalled();
    });
  });

  describe('checkLibreOfficeAvailability', () => {
    it('should return true when LibreOffice is available', async () => {
      const mockCallback = jest.fn((command, options, callback) => {
        callback(null, { stdout: 'LibreOffice 7.0.0' }, null);
      });
      mockExec.mockImplementation(mockCallback as any);

      const result = await service.checkLibreOfficeAvailability();

      expect(result).toBe(true);
      expect(service.isAvailable).toBe(true);
    });

    it('should return false when LibreOffice is not available', async () => {
      const mockCallback = jest.fn((command, options, callback) => {
        callback(new Error('Command not found'), null, null);
      });
      mockExec.mockImplementation(mockCallback as any);

      const result = await service.checkLibreOfficeAvailability();

      expect(result).toBe(false);
      expect(service.isAvailable).toBe(false);
    });

    it('should return false when output does not contain LibreOffice', async () => {
      const mockCallback = jest.fn((command, options, callback) => {
        callback(null, { stdout: 'Some other program' }, null);
      });
      mockExec.mockImplementation(mockCallback as any);

      const result = await service.checkLibreOfficeAvailability();

      expect(result).toBe(false);
    });
  });

  describe('convertToPdf', () => {
    const mockBuffer = Buffer.from('mock document content');
    const mockMimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    beforeEach(() => {
      // Mock LibreOffice as available
      jest.spyOn(service, 'checkLibreOfficeAvailability').mockResolvedValue(true);
      (service as any).isLibreOfficeAvailable = true;
    });

    it('should successfully convert document to PDF', async () => {
      const mockPdfBuffer = Buffer.from('mock pdf content');
      
      // Mock file system operations
      mockFsPromises.mkdir.mockResolvedValue(undefined);
      mockFsPromises.writeFile.mockResolvedValue(undefined);
      mockFsPromises.readFile.mockResolvedValue(mockPdfBuffer);
      mockFsPromises.readdir.mockResolvedValue([]);
      mockFsPromises.unlink.mockResolvedValue(undefined);
      mockFsPromises.rmdir.mockResolvedValue(undefined);
      mockFs.existsSync.mockReturnValue(true);

      // Mock exec for LibreOffice conversion
      const mockCallback = jest.fn((command, options, callback) => {
        callback(null, { stdout: 'conversion successful' }, null);
      });
      mockExec.mockImplementation(mockCallback as any);

      const result = await service.convertToPdf(mockBuffer, mockMimeType);

      expect(result.success).toBe(true);
      expect(result.pdfBuffer).toEqual(mockPdfBuffer);
      expect(result.originalSize).toBe(mockBuffer.length);
      expect(result.convertedSize).toBe(mockPdfBuffer.length);
      expect(result.conversionTime).toBeGreaterThan(0);
    });

    it('should return error when LibreOffice is not available', async () => {
      (service as any).isLibreOfficeAvailable = false;

      const result = await service.convertToPdf(mockBuffer, mockMimeType);

      expect(result.success).toBe(false);
      expect(result.error).toContain('LibreOffice não está disponível');
      expect(result.originalSize).toBe(mockBuffer.length);
    });

    it('should return error for unsupported MIME type', async () => {
      const unsupportedMimeType = 'text/plain';

      const result = await service.convertToPdf(mockBuffer, unsupportedMimeType);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Tipo MIME não suportado');
    });

    it('should return error when conversion is disabled', async () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'OFFICE_CONVERTER_ENABLED') return false;
        return defaultValue;
      });

      // Recreate service with disabled config
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          OfficeConverterService,
          {
            provide: ConfigService,
            useValue: configService,
          },
        ],
      }).compile();

      const disabledService = module.get<OfficeConverterService>(OfficeConverterService);

      const result = await disabledService.convertToPdf(mockBuffer, mockMimeType);

      expect(result.success).toBe(false);
      expect(result.error).toContain('conversão desabilitada');
    });

    it('should handle conversion errors gracefully', async () => {
      // Mock file system operations
      mockFsPromises.mkdir.mockResolvedValue(undefined);
      mockFsPromises.writeFile.mockResolvedValue(undefined);
      mockFsPromises.readdir.mockResolvedValue([]);
      mockFsPromises.unlink.mockResolvedValue(undefined);
      mockFsPromises.rmdir.mockResolvedValue(undefined);

      // Mock exec to fail
      const mockCallback = jest.fn((command, options, callback) => {
        callback(new Error('Conversion failed'), null, null);
      });
      mockExec.mockImplementation(mockCallback as any);

      const result = await service.convertToPdf(mockBuffer, mockMimeType);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Conversion failed');
    });

    it('should retry conversion on failure', async () => {
      // Mock file system operations
      mockFsPromises.mkdir.mockResolvedValue(undefined);
      mockFsPromises.writeFile.mockResolvedValue(undefined);
      mockFsPromises.readdir.mockResolvedValue([]);
      mockFsPromises.unlink.mockResolvedValue(undefined);
      mockFsPromises.rmdir.mockResolvedValue(undefined);

      let callCount = 0;
      const mockCallback = jest.fn((command, options, callback) => {
        callCount++;
        if (callCount < 2) {
          callback(new Error('Temporary failure'), null, null);
        } else {
          callback(null, { stdout: 'success' }, null);
        }
      });
      mockExec.mockImplementation(mockCallback as any);

      const mockPdfBuffer = Buffer.from('mock pdf content');
      mockFsPromises.readFile.mockResolvedValue(mockPdfBuffer);
      mockFs.existsSync.mockReturnValue(true);

      const result = await service.convertToPdf(mockBuffer, mockMimeType);

      expect(result.success).toBe(true);
      expect(mockCallback).toHaveBeenCalledTimes(2);
    });
  });

  describe('getStats', () => {
    it('should return service statistics', () => {
      const stats = service.getStats();

      expect(stats).toHaveProperty('enabled');
      expect(stats).toHaveProperty('libreOfficeAvailable');
      expect(stats).toHaveProperty('libreOfficePath');
      expect(stats).toHaveProperty('timeout');
      expect(stats).toHaveProperty('maxRetries');
    });
  });

  describe('isSupportedMimeType', () => {
    it('should return true for supported MIME types', () => {
      const supportedTypes = [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/msword',
        'application/vnd.ms-excel',
        'application/vnd.ms-powerpoint',
        'application/vnd.oasis.opendocument.text',
        'application/vnd.oasis.opendocument.spreadsheet',
        'application/vnd.oasis.opendocument.presentation',
        'text/rtf',
      ];

      supportedTypes.forEach(mimeType => {
        expect((service as any).isSupportedMimeType(mimeType)).toBe(true);
      });
    });

    it('should return false for unsupported MIME types', () => {
      const unsupportedTypes = [
        'text/plain',
        'application/json',
        'image/jpeg',
        'application/pdf',
      ];

      unsupportedTypes.forEach(mimeType => {
        expect((service as any).isSupportedMimeType(mimeType)).toBe(false);
      });
    });
  });

  describe('getFileExtensionFromMimeType', () => {
    it('should return correct extensions for MIME types', () => {
      const mimeToExtension = {
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
        'application/msword': 'doc',
        'application/vnd.ms-excel': 'xls',
        'application/vnd.ms-powerpoint': 'ppt',
        'text/rtf': 'rtf',
      };

      Object.entries(mimeToExtension).forEach(([mimeType, expectedExtension]) => {
        expect((service as any).getFileExtensionFromMimeType(mimeType)).toBe(expectedExtension);
      });
    });

    it('should return tmp for unknown MIME types', () => {
      expect((service as any).getFileExtensionFromMimeType('unknown/type')).toBe('tmp');
    });
  });
});