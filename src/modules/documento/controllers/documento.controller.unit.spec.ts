import { DocumentoController } from './documento.controller';
import { ThumbnailFacadeService } from '../services/thumbnail/thumbnail-facade.service';
import { ThumbnailService } from '../services/thumbnail/thumbnail.service';
import { DocumentoService } from '../services/documento.service';
import { DocumentoBatchService } from '../services/batch-download/documento-batch.service';
import { DocumentoUrlService } from '../services/documento-url.service';
import { ThumbnailQueueService } from '../services/thumbnail/thumbnail-queue.service';
import { StorageProviderFactory } from '../factories/storage-provider.factory';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { ROLES } from '../../../shared/constants/roles.constants';

describe('DocumentoController - Unit Tests', () => {
  let controller: DocumentoController;
  let thumbnailFacadeService: jest.Mocked<ThumbnailFacadeService>;
  let documentoService: jest.Mocked<DocumentoService>;
  let storageProviderFactory: jest.Mocked<StorageProviderFactory>;
  let mockStorageProvider: any;

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

  const mockDocumento = {
    id: 'test-doc-id',
    solicitacao_id: 'solicitacao-123',
    cidadao_id: 'cidadao-123',
    cidadao: null,
    tipo: 'rg' as any,
    nome_arquivo: 'test-document.pdf',
    nome_original: 'original-document.pdf',
    caminho: 'test/path',
    thumbnail: null,
    descricao: 'Test document',
    tamanho: 1024,
    mimetype: 'application/pdf',
    data_upload: new Date(),
    usuario_upload_id: 'user-123',
    usuario_upload: null,
    verificado: false,
    data_verificacao: null,
    usuario_verificacao_id: null,
    usuario_verificacao: null,
    observacoes_verificacao: null,
    reutilizavel: false,
    hash_arquivo: null,
    upload_session_id: null,
    upload_session: null,
    data_validade: null,
    metadados: null,
    url_publica: null,
    created_at: new Date(),
    updated_at: new Date(),
    removed_at: null,
  };

  beforeEach(() => {
    const mockThumbnailFacadeService = {
      getThumbnail: jest.fn(),
      removeThumbnail: jest.fn(),
      getCacheStats: jest.fn(),
    } as any;

    const mockThumbnailService = {
      generateThumbnail: jest.fn(),
    } as any;

    const mockDocumentoService = {
      findById: jest.fn(),
    } as any;

    mockStorageProvider = {
      obterArquivo: jest.fn(),
    };

    const mockStorageProviderFactory = {
      getProvider: jest.fn().mockReturnValue(mockStorageProvider),
    } as any;

    const mockConfigService = {
      get: jest.fn(),
    } as any;

    // Mocks simples para outras dependências
    const mockDocumentoBatchService = {
      processDocuments: jest.fn(),
    } as any;

    const mockDocumentoUrlService = {
      generateUrl: jest.fn(),
    } as any;

    const mockThumbnailQueueService = {
      getProcessingStatus: jest.fn(),
      getStats: jest.fn(),
      addToQueue: jest.fn(),
      removeFromQueue: jest.fn(),
      getQueueStatus: jest.fn(),
      stopProcessing: jest.fn(),
      processExistingDocuments: jest.fn(),
      cleanupQueue: jest.fn(),
    } as any;

    const mockAuditEventEmitter = {
      emit: jest.fn(),
      emitEntityAccessed: jest.fn(),
      emitEntityUpdated: jest.fn(),
      emitEntityCreated: jest.fn(),
      emitEntityDeleted: jest.fn(),
      emitSecurityEvent: jest.fn(),
      emitSystemEvent: jest.fn(),
    };

    // Instanciar o controller diretamente sem TestingModule
    controller = new DocumentoController(
      mockDocumentoService,
      mockDocumentoBatchService,
      mockDocumentoUrlService,
      mockThumbnailService,
      mockThumbnailFacadeService,
      mockThumbnailQueueService,
      mockStorageProviderFactory,
      mockAuditEventEmitter as any,
    );

    thumbnailFacadeService = mockThumbnailFacadeService;
    documentoService = mockDocumentoService;
    storageProviderFactory = mockStorageProviderFactory;

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('getThumbnail', () => {
    const mockDocumentoId = 'test-doc-id';
    const mockFileBuffer = Buffer.from('mock-file-data');
    const mockSize = 'medium';

    beforeEach(() => {
      documentoService.findById.mockResolvedValue(mockDocumento);
      mockStorageProvider.obterArquivo.mockResolvedValue(mockFileBuffer);
    });

    it('deve retornar thumbnail com sucesso', async () => {
      thumbnailFacadeService.getThumbnail.mockResolvedValue(
        mockThumbnailResult,
      );

      await controller.getThumbnail(
        mockDocumentoId,
        mockSize,
        mockResponse,
        mockUser,
        mockContext,
      );

      expect(documentoService.findById).toHaveBeenCalledWith(mockDocumentoId);
      expect(thumbnailFacadeService.getThumbnail).toHaveBeenCalledWith(
        mockDocumentoId,
        mockFileBuffer,
        mockDocumento.mimetype,
        mockSize,
      );

      expect(mockResponse.set).toHaveBeenCalledWith({
        'Cache-Control': 'public, max-age=86400, immutable',
        'Content-Length': '19',
        'Content-Type': 'image/jpeg',
        ETag: '"test-doc-id-thumbnail"',
        'Last-Modified': expect.any(String),
        Vary: 'Accept-Encoding',
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
        mockSize,
        mockResponse,
        mockUser,
        mockContext,
      );

      expect(mockResponse.set).toHaveBeenCalledWith({
        'Cache-Control': 'public, max-age=86400, immutable',
        'Content-Length': '19',
        'Content-Type': 'image/jpeg',
        ETag: '"test-doc-id-thumbnail"',
        'Last-Modified': expect.any(String),
        Vary: 'Accept-Encoding',
      });
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
        mockFileBuffer,
        mockDocumento.mimetype,
        'medium', // tamanho padrão
      );
    });

    it('deve lidar com erro na geração de thumbnail', async () => {
      thumbnailFacadeService.getThumbnail.mockRejectedValue(
        new Error('Erro na geração'),
      );

      await expect(
        controller.getThumbnail(
          mockDocumentoId,
          mockSize,
          mockResponse,
          mockUser,
          mockContext,
        ),
      ).rejects.toThrow('Erro na geração');
    });
  });

  describe('regenerateThumbnail', () => {
    const mockDocumentoId = 'test-doc-id';
    const mockFileBuffer = Buffer.from('mock-file-data');

    beforeEach(() => {
      documentoService.findById.mockResolvedValue(mockDocumento);
      mockStorageProvider.obterArquivo.mockResolvedValue(mockFileBuffer);
    });

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
        mockFileBuffer,
        mockDocumento.mimetype,
        'medium',
      );

      expect(result).toEqual({
        message: 'Thumbnail regenerado com sucesso',
        metadata: undefined,
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
});
