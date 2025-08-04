import { Test, TestingModule } from '@nestjs/testing';
import { DocumentoController } from './documento.controller';
import { ThumbnailFacadeService } from '../services/thumbnail/thumbnail-facade.service';
import { ThumbnailService } from '../services/thumbnail/thumbnail.service';
import { DocumentoService } from '../services/documento.service';
import { DocumentoBatchService } from '../services/batch-download/documento-batch.service';
import { ROLES } from '../../../shared/constants/roles.constants';
import { DocumentoUrlService } from '../services/documento-url.service';
import { ThumbnailQueueService } from '../services/thumbnail/thumbnail-queue.service';
import { StorageProviderFactory } from '../factories/storage-provider.factory';
import { AuditEventEmitter } from '../../auditoria/events/emitters/audit-event.emitter';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('DocumentoController - Integração Thumbnail', () => {
  let controller: DocumentoController;
  let thumbnailFacadeService: jest.Mocked<ThumbnailFacadeService>;

  const mockResponse = {
    set: jest.fn(),
    send: jest.fn(),
    status: jest.fn().mockReturnThis(),
  } as unknown as Response;

  const mockThumbnailResult = {
    thumbnailBuffer: Buffer.from('mock-thumbnail-data'),
    fromCache: true,
  };

  const mockUser = {
    id: 'user-123',
    nome: 'Test User',
    email: 'test@example.com',
    senhaHash: 'hashedPassword',
    cpf: '12345678901',
    telefone: '11999999999',
    matricula: 'MAT123',
    role_id: 'role-123',
    unidade_id: 'unidade-123',
    setor_id: 'setor-123',
    status: 'ATIVO',
    primeiro_acesso: false,
    tentativas_login: 0,
    ultimo_login: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
    removed_at: null,
    role: { id: 'role-123', nome: 'Admin' },
    unidade: { id: 'unidade-123', nome: 'Unidade Teste' },
    setor: { id: 'setor-123', nome: 'Setor Teste' },
    refreshTokens: [],
    isAtivo: () => true,
    ativar: () => {},
    desativar: () => {},
    isPrimeiroAcesso: () => false,
    marcarPrimeiroAcessoRealizado: () => {},
    getNomeFormatado: () => 'Test User',
    podeSerDeletado: () => false,
  } as any;

  const mockContext = {
    requestID: 'req-123',
    url: '/api/documentos/test',
    ip: '127.0.0.1',
    user: {
      id: 'user-123',
      username: 'testuser',
      roles: [ROLES.TECNICO],
      permissions: [],
      permissionScopes: {},
      unidade_id: 'unidade-123',
      escopo: 'test',
    },
  };

  beforeEach(async () => {
    const mockThumbnailFacadeService = {
      getThumbnail: jest.fn(),
      removeThumbnail: jest.fn(),
      getCacheStats: jest.fn(),
    };

    const mockThumbnailService = {
      generateThumbnail: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const mockDocumentoService = {
      findById: jest.fn().mockResolvedValue({
        id: 'test-doc-id',
        mimetype: 'application/pdf',
        caminho: 'test/path',
        created_at: new Date(),
        updated_at: new Date(),
      }),
    };

    const mockStorageProviderFactory = {
      getProvider: jest.fn().mockReturnValue({
        obterArquivo: jest
          .fn()
          .mockResolvedValue(Buffer.from('mock-file-data')),
      }),
    };

    const mockAuditEventEmitter = {
      emit: jest.fn().mockResolvedValue(undefined),
      emitEntityAccessed: jest.fn().mockResolvedValue(undefined),
      emitEntityUpdated: jest.fn().mockResolvedValue(undefined),
      emitEntityCreated: jest.fn().mockResolvedValue(undefined),
      emitEntityDeleted: jest.fn().mockResolvedValue(undefined),
      emitSecurityEvent: jest.fn().mockResolvedValue(undefined),
      emitSystemEvent: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentoController],
      providers: [
        {
          provide: ThumbnailFacadeService,
          useValue: mockThumbnailFacadeService,
        },
        {
          provide: ThumbnailService,
          useValue: mockThumbnailService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: DocumentoService,
          useValue: mockDocumentoService,
        },
        {
          provide: DocumentoBatchService,
          useValue: { processDocuments: jest.fn() },
        },
        {
          provide: DocumentoUrlService,
          useValue: { generateUrl: jest.fn() },
        },
        {
          provide: ThumbnailQueueService,
          useValue: {
            getProcessingStatus: jest.fn(),
            getStats: jest.fn(),
            addToQueue: jest.fn(),
          },
        },
        {
          provide: StorageProviderFactory,
          useValue: mockStorageProviderFactory,
        },
        {
          provide: AuditEventEmitter,
          useValue: mockAuditEventEmitter,
        },
      ],
    }).compile();

    controller = module.get<DocumentoController>(DocumentoController);
    thumbnailFacadeService = module.get(ThumbnailFacadeService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('getThumbnail', () => {
    const mockDocumentoId = 'test-doc-id';
    const mockFileBuffer = Buffer.from('mock-file-data');
    const mockMimetype = 'application/pdf';
    const mockSize = 'medium';

    it('deve retornar thumbnail com sucesso', async () => {
      thumbnailFacadeService.getThumbnail.mockResolvedValue(
        mockThumbnailResult,
      );

      await controller.getThumbnail(
        mockDocumentoId,
        'medium',
        mockResponse,
        mockUser,
        mockContext,
      );

      expect(thumbnailFacadeService.getThumbnail).toHaveBeenCalledWith(
        mockDocumentoId,
        mockFileBuffer,
        mockMimetype,
        mockSize,
      );

      expect(mockResponse.set).toHaveBeenCalledWith({
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
        'X-Thumbnail-Cache': 'HIT',
      });

      expect(mockResponse.send).toHaveBeenCalledWith(
        mockThumbnailResult.thumbnailBuffer,
      );
    });

    it('deve definir cache como MISS quando thumbnail não vem do cache', async () => {
      const thumbnailFromGeneration = {
        ...mockThumbnailResult,
        fromCache: false,
      };
      thumbnailFacadeService.getThumbnail.mockResolvedValue(
        thumbnailFromGeneration,
      );

      await controller.getThumbnail(
        mockDocumentoId,
        'medium',
        mockResponse,
        mockUser,
        mockContext,
      );

      expect(mockResponse.set).toHaveBeenCalledWith({
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
        'X-Thumbnail-Cache': 'MISS',
      });
    });

    it('deve lidar com erro na geração de thumbnail', async () => {
      thumbnailFacadeService.getThumbnail.mockRejectedValue(
        new Error('Erro na geração'),
      );

      await expect(
        controller.getThumbnail(
          mockDocumentoId,
          'medium',
          mockResponse,
          mockUser,
          mockContext,
        ),
      ).rejects.toThrow('Erro na geração');
    });

    it('deve usar tamanho padrão quando não especificado', async () => {
      thumbnailFacadeService.getThumbnail.mockResolvedValue(
        mockThumbnailResult,
      );

      await controller.getThumbnail(
        mockDocumentoId,
        undefined, // size não especificado
        mockResponse,
        mockUser,
        mockContext,
      );

      expect(thumbnailFacadeService.getThumbnail).toHaveBeenCalledWith(
        mockDocumentoId,
        expect.any(Buffer), // fileBuffer obtido do storage
        expect.any(String), // mimetype do documento
        'medium', // tamanho padrão
      );
    });
  });

  describe('regenerateThumbnail', () => {
    const mockDocumentoId = 'test-doc-id';
    const mockFileBuffer = Buffer.from('mock-file-data');
    const mockMimetype = 'application/pdf';

    it('deve regenerar thumbnail com sucesso', async () => {
      thumbnailFacadeService.removeThumbnail.mockResolvedValue();
      thumbnailFacadeService.getThumbnail.mockResolvedValue(
        mockThumbnailResult,
      );

      const result = await controller.regenerateThumbnail(
        mockDocumentoId,
        mockUser,
        mockContext,
      );

      expect(thumbnailFacadeService.removeThumbnail).toHaveBeenCalledWith(
        mockDocumentoId,
      );

      expect(thumbnailFacadeService.getThumbnail).toHaveBeenCalledWith(
        mockDocumentoId,
        expect.any(Buffer), // fileBuffer obtido do storage
        expect.any(String), // mimetype do documento
        'medium',
      );

      expect(result).toEqual({
        success: true,
        message: 'Thumbnail regenerado com sucesso',
        regenerated: true,
        fromCache: mockThumbnailResult.fromCache,
      });
    });

    it('deve lidar com erro na regeneração', async () => {
      thumbnailFacadeService.removeThumbnail.mockResolvedValue();
      thumbnailFacadeService.getThumbnail.mockRejectedValue(
        new Error('Erro na regeneração'),
      );

      await expect(
        controller.regenerateThumbnail(mockDocumentoId, mockUser, mockContext),
      ).rejects.toThrow('Erro na regeneração');
    });

    it('deve lidar com erro na remoção do cache', async () => {
      thumbnailFacadeService.removeThumbnail.mockRejectedValue(
        new Error('Erro na remoção'),
      );

      await expect(
        controller.regenerateThumbnail(mockDocumentoId, mockUser, mockContext),
      ).rejects.toThrow('Erro na remoção');
    });
  });

  describe('Validações de entrada', () => {
    it('deve validar parâmetros obrigatórios no getThumbnail', async () => {
      await expect(
        controller.getThumbnail(
          '', // ID vazio
          'medium',
          mockResponse,
          mockUser,
          mockContext,
        ),
      ).rejects.toThrow();
    });

    it('deve validar buffer não vazio', async () => {
      await expect(
        controller.getThumbnail(
          'test-id',
          'medium',
          mockResponse,
          mockUser,
          mockContext,
        ),
      ).rejects.toThrow();
    });

    it('deve validar mimetype suportado', async () => {
      await expect(
        controller.getThumbnail(
          'test-id',
          'medium',
          mockResponse,
          mockUser,
          mockContext,
        ),
      ).rejects.toThrow();
    });

    it('deve validar tamanho de thumbnail', async () => {
      await expect(
        controller.getThumbnail(
          'test-id',
          'invalid-size' as any, // Tamanho inválido
          mockResponse,
          mockUser,
          mockContext,
        ),
      ).rejects.toThrow();
    });
  });

  describe('Performance e Cache', () => {
    it('deve definir headers de cache apropriados', async () => {
      thumbnailFacadeService.getThumbnail.mockResolvedValue(
        mockThumbnailResult,
      );

      await controller.getThumbnail(
        'test-id',
        'medium',
        mockResponse,
        mockUser,
        mockContext,
      );

      expect(mockResponse.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Cache-Control': 'public, max-age=86400',
          'Content-Type': 'image/jpeg',
        }),
      );
    });

    it('deve indicar corretamente se o thumbnail veio do cache', async () => {
      const cacheHitResult = { ...mockThumbnailResult, fromCache: true };
      thumbnailFacadeService.getThumbnail.mockResolvedValue(cacheHitResult);

      await controller.getThumbnail(
        'test-id',
        'medium',
        mockResponse,
        mockUser,
        mockContext,
      );

      expect(mockResponse.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'X-Thumbnail-Cache': 'HIT',
        }),
      );
    });
  });
});
