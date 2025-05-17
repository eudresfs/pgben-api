import { Test, TestingModule } from '@nestjs/testing';
import { ThumbnailService } from '../thumbnail.service';
import { Logger } from '@nestjs/common';
import sharp from 'sharp';

// Mock do sharp
jest.mock('sharp', () => {
  const mockSharp = jest.fn().mockImplementation(() => ({
    metadata: jest.fn(),
    resize: jest.fn().mockReturnThis(),
    toFormat: jest.fn().mockReturnThis(),
    toBuffer: jest.fn(),
  }));
  return mockSharp;
});

describe('ThumbnailService', () => {
  let service: ThumbnailService;

  // Mocks para os testes
  const mockImageBuffer = Buffer.from('imagem de teste', 'utf-8');
  const mockThumbnailBuffer = Buffer.from('thumbnail de teste', 'utf-8');

  // Mock para o Logger
  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThumbnailService,
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<ThumbnailService>(ThumbnailService);

    // Sobrescrever o logger para evitar logs durante os testes
    Object.defineProperty(service, 'logger', { value: mockLogger });
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  describe('canGenerateThumbnail', () => {
    it('deve retornar true para tipos MIME suportados', () => {
      // Arrange
      const tiposSuportados = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/tiff',
        'image/gif',
        'image/bmp',
      ];

      // Act & Assert
      tiposSuportados.forEach((tipo) => {
        expect(service.canGenerateThumbnail(tipo)).toBe(true);
      });
    });

    it('deve retornar false para tipos MIME não suportados', () => {
      // Arrange
      const tiposNaoSuportados = [
        'application/pdf',
        'text/plain',
        'application/json',
        'video/mp4',
      ];

      // Act & Assert
      tiposNaoSuportados.forEach((tipo) => {
        expect(service.canGenerateThumbnail(tipo)).toBe(false);
      });
    });
  });

  describe('gerarThumbnail', () => {
    it('deve gerar uma miniatura com tamanho médio por padrão', async () => {
      // Arrange
      const mockMetadata = { format: 'jpeg', width: 1000, height: 800 };
      const mockSharpInstance = {
        metadata: jest.fn().mockResolvedValue(mockMetadata),
        resize: jest.fn().mockReturnThis(),
        toFormat: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(mockThumbnailBuffer),
      };

      (sharp as unknown as jest.Mock).mockReturnValue(mockSharpInstance);

      // Act
      const resultado = await service.gerarThumbnail(mockImageBuffer);

      // Assert
      expect(sharp).toHaveBeenCalledWith(mockImageBuffer);
      expect(mockSharpInstance.metadata).toHaveBeenCalled();
      expect(mockSharpInstance.resize).toHaveBeenCalledWith(300, 300, {
        fit: 'inside',
        withoutEnlargement: true,
      });
      expect(mockSharpInstance.toFormat).toHaveBeenCalledWith('jpeg', {
        quality: 80,
        progressive: true,
      });
      expect(mockSharpInstance.toBuffer).toHaveBeenCalled();

      expect(resultado).toEqual(mockThumbnailBuffer);
    });

    it('deve gerar uma miniatura com tamanho pequeno quando especificado', async () => {
      // Arrange
      const mockMetadata = { format: 'jpeg', width: 1000, height: 800 };
      const mockSharpInstance = {
        metadata: jest.fn().mockResolvedValue(mockMetadata),
        resize: jest.fn().mockReturnThis(),
        toFormat: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(mockThumbnailBuffer),
      };

      (sharp as unknown as jest.Mock).mockReturnValue(mockSharpInstance);

      // Act
      const resultado = await service.gerarThumbnail(
        mockImageBuffer,
        'pequena',
      );

      // Assert
      expect(mockSharpInstance.resize).toHaveBeenCalledWith(
        150,
        150,
        expect.any(Object),
      );
      expect(resultado).toEqual(mockThumbnailBuffer);
    });

    it('deve lançar erro para tipos de arquivo não suportados', async () => {
      // Arrange
      const mockMetadata = { format: 'pdf', width: 1000, height: 800 };
      const mockSharpInstance = {
        metadata: jest.fn().mockResolvedValue(mockMetadata),
        resize: jest.fn().mockReturnThis(),
        toFormat: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(mockThumbnailBuffer),
      };

      (sharp as unknown as jest.Mock).mockReturnValue(mockSharpInstance);

      // Act & Assert
      await expect(service.gerarThumbnail(mockImageBuffer)).rejects.toThrow(
        'Tipo de arquivo não suportado para geração de miniaturas: image/pdf',
      );
    });
  });

  describe('generateThumbnails', () => {
    it('deve gerar miniaturas em três tamanhos diferentes', async () => {
      // Arrange
      const mockMetadata = { format: 'jpeg', width: 1000, height: 800 };
      const mockSharpInstance = {
        metadata: jest.fn().mockResolvedValue(mockMetadata),
        resize: jest.fn().mockReturnThis(),
        toFormat: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(mockThumbnailBuffer),
      };

      (sharp as unknown as jest.Mock).mockReturnValue(mockSharpInstance);

      // Act
      const resultado = await service.generateThumbnails(
        mockImageBuffer,
        'image/jpeg',
      );

      // Assert
      expect(sharp as unknown as jest.Mock).toHaveBeenCalledTimes(4); // Uma vez para metadata, três vezes para thumbnails
      expect(mockSharpInstance.metadata).toHaveBeenCalled();
      expect(mockSharpInstance.resize).toHaveBeenCalledTimes(3);
      expect(mockSharpInstance.toFormat).toHaveBeenCalledTimes(3);
      expect(mockSharpInstance.toBuffer).toHaveBeenCalledTimes(3);

      expect(resultado).toEqual({
        pequena: mockThumbnailBuffer,
        media: mockThumbnailBuffer,
        grande: mockThumbnailBuffer,
        formato: 'jpeg',
      });
    });

    it('deve lançar erro para tipos MIME não suportados', async () => {
      // Arrange
      const mimeTypeNaoSuportado = 'application/pdf';

      // Act & Assert
      await expect(
        service.generateThumbnails(mockImageBuffer, mimeTypeNaoSuportado),
      ).rejects.toThrow(
        `Tipo de arquivo não suportado para geração de miniaturas: ${mimeTypeNaoSuportado}`,
      );
    });

    it('deve propagar erros do sharp', async () => {
      // Arrange
      const mockError = new Error('Erro ao processar imagem');
      const mockSharpInstance = {
        metadata: jest.fn().mockRejectedValue(mockError),
        resize: jest.fn().mockReturnThis(),
        toFormat: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(mockThumbnailBuffer),
      };

      (sharp as unknown as jest.Mock).mockReturnValue(mockSharpInstance);

      // Act & Assert
      await expect(
        service.generateThumbnails(mockImageBuffer, 'image/jpeg'),
      ).rejects.toThrow('Erro ao gerar miniaturas: Erro ao processar imagem');
    });
  });

  describe('getOutputFormat', () => {
    it('deve manter o formato GIF para imagens GIF', () => {
      // Act
      const resultado = service['getOutputFormat']('image/gif');

      // Assert
      expect(resultado).toBe('gif');
    });

    it('deve manter o formato PNG para imagens PNG', () => {
      // Act
      const resultado = service['getOutputFormat']('image/png');

      // Assert
      expect(resultado).toBe('png');
    });

    it('deve converter para JPEG outros formatos de imagem', () => {
      // Arrange
      const outrosFormatos = [
        'image/jpeg',
        'image/webp',
        'image/tiff',
        'image/bmp',
      ];

      // Act & Assert
      outrosFormatos.forEach((formato) => {
        expect(service['getOutputFormat'](formato)).toBe('jpeg');
      });
    });
  });
});
