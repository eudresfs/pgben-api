import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DocumentoBatchService } from '../documento-batch.service';
import { DocumentoService } from '../../documento.service';
import { StorageProviderFactory } from '../../../factories/storage-provider.factory';
import { BatchJobManagerService } from '../batch-job-manager.service';
import { ZipGeneratorService } from '../zip-generator.service';
import { DocumentFilterService } from '../document-filter.service';
import { Documento } from '../../../../../entities/documento.entity';
import { DocumentoBatchJob, StatusDownloadLoteEnum } from '../../../../../entities/documento-batch-job.entity';
import { Usuario } from '../../../../../entities/usuario.entity';
import { TipoDocumentoEnum } from '../../../../../enums';
import { PassThrough } from 'stream';

/**
 * Testes unitários para DocumentoBatchService
 * 
 * Valida a orquestração de alto nível do sistema de download em lote,
 * incluindo inicialização de jobs, criação de streams e gerenciamento de status
 */
describe('DocumentoBatchService', () => {
  let service: DocumentoBatchService;
  let documentoRepository: jest.Mocked<Repository<Documento>>;
  let batchJobRepository: jest.Mocked<Repository<DocumentoBatchJob>>;
  let documentoService: jest.Mocked<DocumentoService>;
  let storageProviderFactory: jest.Mocked<StorageProviderFactory>;
  let batchJobManager: jest.Mocked<BatchJobManagerService>;
  let zipGenerator: jest.Mocked<ZipGeneratorService>;
  let documentFilterService: jest.Mocked<DocumentFilterService>;

  const mockDocumentoRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockBatchJobRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockDocumentoService = {
    findById: jest.fn(),
    validateAccess: jest.fn(),
  };

  const mockStorageProviderFactory = {
    create: jest.fn(),
  };

  const mockBatchJobManager = {
    podeIniciarJob: jest.fn().mockResolvedValue({ pode: true, motivo: null }),
    adicionarJob: jest.fn(),
    cancelarJobsExpirados: jest.fn(),
    obterEstatisticasUsuario: jest.fn(),
  };

  const mockZipGenerator = {
    gerarZipStream: jest.fn(),
  };

  const mockDocumentFilterService = {
    validarFiltros: jest.fn(),
    aplicarFiltros: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentoBatchService,
        {
          provide: getRepositoryToken(Documento),
          useValue: mockDocumentoRepository,
        },
        {
          provide: getRepositoryToken(DocumentoBatchJob),
          useValue: mockBatchJobRepository,
        },
        {
          provide: DocumentoService,
          useValue: mockDocumentoService,
        },
        {
          provide: StorageProviderFactory,
          useValue: mockStorageProviderFactory,
        },
        {
          provide: BatchJobManagerService,
          useValue: mockBatchJobManager,
        },
        {
          provide: ZipGeneratorService,
          useValue: mockZipGenerator,
        },
        {
          provide: DocumentFilterService,
          useValue: mockDocumentFilterService,
        },
      ],
    }).compile();

    service = module.get<DocumentoBatchService>(DocumentoBatchService);
    documentoRepository = module.get(getRepositoryToken(Documento));
    batchJobRepository = module.get(getRepositoryToken(DocumentoBatchJob));
    documentoService = module.get(DocumentoService);
    storageProviderFactory = module.get(StorageProviderFactory);
    batchJobManager = module.get(BatchJobManagerService);
    zipGenerator = module.get(ZipGeneratorService);
    documentFilterService = module.get(DocumentFilterService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('iniciarJob', () => {
    const mockUsuarioId = 'user-123';
    const mockFiltros = {
      cidadao_ids: ['cidadao-1', 'cidadao-2'],
      tipo_documento: [TipoDocumentoEnum.RG],
    };

    it('deve iniciar um job com sucesso', async () => {
      // Arrange
      const mockValidacao = {
        valido: true,
        erros: [],
        avisos: [],
        estimativa: {
          total_documentos: 10,
          tamanho_estimado: 1000000,
        },
      };

      const mockJob = {
        id: 'job-123',
        usuario_id: 'user-123',
        unidade_id: 'unidade-123',
        status: StatusDownloadLoteEnum.PENDING,
        filtros: mockFiltros,
        metadados: null,
        total_documentos: 0,
        documentos_processados: 0,
        tamanho_estimado: null,
        tamanho_real: null,
        progresso_percentual: 0,
        caminho_arquivo: null,
        nome_arquivo: null,
        erro_detalhes: null,
        data_inicio: null,
        data_conclusao: null,
        data_expiracao: null,
        created_at: new Date(),
        updated_at: new Date(),
        usuario: null,
        unidade: null,
        isCompleted: () => false,
        isFailed: () => false,
        isProcessing: () => false,
        isPending: () => true,
        isCancelled: () => false,
        isExpired: () => false,
        getProgressPercentage: () => 0,
        getDurationInSeconds: () => 0,
        getEstimatedTimeRemaining: () => null,
      } as DocumentoBatchJob;

      mockBatchJobManager.podeIniciarJob.mockResolvedValue({ pode: true, motivo: null });
      mockDocumentFilterService.validarFiltros.mockResolvedValue(mockValidacao);
      mockBatchJobRepository.create.mockReturnValue(mockJob);
      mockBatchJobRepository.save.mockResolvedValue(mockJob);

      // Act
      const result = await service.iniciarJob(mockFiltros, mockUsuarioId);

      // Assert
      expect(result).toBe('job-123');
      expect(mockBatchJobManager.podeIniciarJob).toHaveBeenCalledWith(mockUsuarioId);
      expect(mockDocumentFilterService.validarFiltros).toHaveBeenCalledWith(mockFiltros, mockUsuarioId);
      expect(mockBatchJobRepository.save).toHaveBeenCalled();
    });

    it('deve rejeitar se usuário não pode iniciar job', async () => {
      // Arrange
      mockBatchJobManager.podeIniciarJob.mockResolvedValue({ pode: false, motivo: 'Limite de jobs atingido' });

      // Act & Assert
      await expect(service.iniciarJob(mockFiltros, mockUsuarioId))
        .rejects.toThrow(BadRequestException);
    });

    it('deve rejeitar se filtros são inválidos', async () => {
      // Arrange
      const mockValidacao = {
        valido: false,
        erros: ['Filtros inválidos'],
        avisos: [],
        estimativa: {
          total_documentos: 0,
          tamanho_estimado: 0,
        },
      };

      mockBatchJobManager.podeIniciarJob.mockResolvedValue({ pode: true, motivo: null });
      mockDocumentFilterService.validarFiltros.mockResolvedValue(mockValidacao);

      // Act & Assert
      await expect(service.iniciarJob(mockFiltros, mockUsuarioId))
        .rejects.toThrow(BadRequestException);
    });

    it('deve rejeitar se nenhum documento for encontrado', async () => {
      // Arrange
      const mockValidacao = {
        valido: true,
        erros: [],
        avisos: [],
        estimativa: {
          total_documentos: 0,
          tamanho_estimado: 0,
        },
      };

      mockBatchJobManager.podeIniciarJob.mockResolvedValue({ pode: true, motivo: null });
      mockDocumentFilterService.validarFiltros.mockResolvedValue(mockValidacao);

      // Act & Assert
      await expect(service.iniciarJob(mockFiltros, mockUsuarioId))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('criarStreamDownload', () => {
    const mockJobId = 'job-123';

    it('deve criar stream de download com sucesso', async () => {
      // Arrange
      const mockJob = {
        id: mockJobId,
        status: StatusDownloadLoteEnum.COMPLETED,
        usuario_id: 'user-123',
        unidade_id: 'unidade-123',
        filtros: { cidadao_ids: ['cidadao-1'] },
        metadados: null,
        total_documentos: 0,
        documentos_processados: 0,
        tamanho_estimado: null,
        tamanho_real: null,
        progresso_percentual: 0,
        caminho_arquivo: null,
        nome_arquivo: null,
        erro_detalhes: null,
        data_inicio: null,
        data_conclusao: null,
        data_expiracao: null,
        created_at: new Date(),
        updated_at: new Date(),
        usuario: null,
        unidade: null,
        isCompleted: () => false,
        isFailed: () => false,
        isProcessing: () => true,
        isPending: () => false,
        isCancelled: () => false,
        isExpired: () => false,
        getProgressPercentage: () => 0,
        getDurationInSeconds: () => 0,
        getEstimatedTimeRemaining: () => null,
      } as DocumentoBatchJob;

      const mockDocumentos = [
        {
          id: 'doc-1',
          nome_arquivo: 'documento1.pdf',
          tamanho: 1000,
          cidadao_id: 'cidadao-1',
        },
      ] as Documento[];

      const mockStream = new PassThrough();

      mockBatchJobRepository.findOne.mockResolvedValue(mockJob);
      mockDocumentFilterService.aplicarFiltros.mockResolvedValue(mockDocumentos);
      mockZipGenerator.gerarZipStream.mockResolvedValue({
        stream: mockStream,
        filename: 'documentos.zip',
      });

      // Act
      const result = await service.criarStreamDownload(mockJobId);

      // Assert
      expect(result.stream).toBe(mockStream);
      expect(result.filename).toBe('documentos_lote_job-123.zip');
      expect(mockBatchJobRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockJobId },
      });
    });

    it('deve rejeitar se job não for encontrado', async () => {
      // Arrange
      mockBatchJobRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.criarStreamDownload(mockJobId))
        .rejects.toThrow(NotFoundException);
    });

    it('deve rejeitar se job não estiver em processamento', async () => {
      // Arrange
      const mockJob = {
        id: mockJobId,
        status: StatusDownloadLoteEnum.PENDING,
      } as DocumentoBatchJob;

      mockBatchJobRepository.findOne.mockResolvedValue(mockJob);

      // Act & Assert
      await expect(service.criarStreamDownload(mockJobId))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('obterStatusJob', () => {
    const mockJobId = 'job-123';
    const mockUsuarioId = 'user-123';

    it('deve retornar status do job com sucesso', async () => {
      // Arrange
      const mockJob = {
        id: mockJobId,
        usuario_id: mockUsuarioId,
        unidade_id: 'unidade-123',
        status: StatusDownloadLoteEnum.COMPLETED,
        filtros: {},
        metadados: null,
        total_documentos: 10,
        documentos_processados: 10,
        tamanho_estimado: 1000000,
        tamanho_real: 950000,
        progresso_percentual: 100,
        caminho_arquivo: '/tmp/download.zip',
        nome_arquivo: 'documentos.zip',
        erro_detalhes: null,
        data_inicio: new Date(),
        data_conclusao: new Date(),
        data_expiracao: null,
        created_at: new Date(),
        updated_at: new Date(),
        usuario: null,
        unidade: null,
        isCompleted: () => true,
        isFailed: () => false,
        isProcessing: () => false,
        isPending: () => false,
        isCancelled: () => false,
        isExpired: () => false,
        getProgressPercentage: () => 100,
        getDurationInSeconds: () => 30,
        getEstimatedTimeRemaining: () => 0,
      } as DocumentoBatchJob;

      mockBatchJobRepository.findOne.mockResolvedValue(mockJob);

      // Act
      const result = await service.obterProgresso(mockJobId);

      // Assert
      expect(result.job_id).toBe(mockJobId);
      expect(result.status).toBe(StatusDownloadLoteEnum.COMPLETED);
      expect(result.progresso).toBe(100);
    });

    it('deve rejeitar se job não for encontrado', async () => {
      // Arrange
      mockBatchJobRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.obterProgresso(mockJobId))
        .rejects.toThrow(NotFoundException);
    });

    it('deve retornar progresso mesmo para usuário diferente (sem validação de autorização)', async () => {
      // Arrange
      const mockJob = {
        id: mockJobId,
        usuario_id: 'user-456', // Usuário diferente
        unidade_id: 'unidade-123',
        status: StatusDownloadLoteEnum.COMPLETED,
        filtros: {},
        metadados: null,
        total_documentos: 10,
        documentos_processados: 10,
        tamanho_estimado: null,
        tamanho_real: null,
        progresso_percentual: 100,
        caminho_arquivo: null,
        nome_arquivo: null,
        erro_detalhes: null,
        data_inicio: new Date(),
        data_conclusao: new Date(),
        data_expiracao: null,
        created_at: new Date(),
        updated_at: new Date(),
        usuario: null,
        unidade: null,
        isCompleted: () => true,
        isFailed: () => false,
        isProcessing: () => false,
        isPending: () => false,
        isCancelled: () => false,
        isExpired: () => false,
        getProgressPercentage: () => 100,
        getDurationInSeconds: () => 30,
        getEstimatedTimeRemaining: () => 0,
      } as DocumentoBatchJob;

      mockBatchJobRepository.findOne.mockResolvedValue(mockJob);

      // Act
      const result = await service.obterProgresso(mockJobId);

      // Assert
      expect(result.job_id).toBe(mockJobId);
      expect(result.status).toBe(StatusDownloadLoteEnum.COMPLETED);
      expect(result.progresso).toBe(100);
    });
  });

  describe('cancelarJob', () => {
    const mockJobId = 'job-123';
    const mockUsuarioId = 'user-123';

    it('deve cancelar job com sucesso', async () => {
      // Arrange
      const mockJob = {
        id: mockJobId,
        usuario_id: mockUsuarioId,
        status: StatusDownloadLoteEnum.PENDING,
      } as DocumentoBatchJob;

      mockBatchJobRepository.findOne.mockResolvedValue(mockJob);
      mockBatchJobRepository.save.mockResolvedValue({
        ...mockJob,
        status: StatusDownloadLoteEnum.CANCELLED,
      });

      // Act
      await service.cancelarJob(mockJobId);

      // Assert
      expect(mockBatchJobRepository.update).toHaveBeenCalledWith(
        mockJobId,
        expect.objectContaining({
          status: StatusDownloadLoteEnum.CANCELLED,
        })
      );
    });

    it('deve rejeitar se job não for encontrado', async () => {
      // Arrange
      mockBatchJobRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.cancelarJob(mockJobId))
        .rejects.toThrow(NotFoundException);
    });

    it('deve rejeitar se job já estiver concluído', async () => {
      // Arrange
      const mockJob = {
        id: mockJobId,
        usuario_id: mockUsuarioId,
        status: StatusDownloadLoteEnum.COMPLETED,
      } as DocumentoBatchJob;

      mockBatchJobRepository.findOne.mockResolvedValue(mockJob);

      // Act & Assert
      await expect(service.cancelarJob(mockJobId))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('obterProgresso', () => {
    const mockJobId = 'job-123';

    it('deve obter progresso do job com sucesso', async () => {
      // Arrange
      const mockJob = {
        id: mockJobId,
        status: StatusDownloadLoteEnum.COMPLETED,
        progresso_percentual: 100,
        total_documentos: 10,
        documentos_processados: 10,
        created_at: new Date(),
        updated_at: new Date(),
      } as DocumentoBatchJob;

      mockBatchJobRepository.findOne.mockResolvedValue(mockJob);

      // Act
      const result = await service.obterProgresso(mockJobId);

      // Assert
      expect(result.job_id).toBe(mockJobId);
      expect(result.status).toBe(StatusDownloadLoteEnum.COMPLETED);
      expect(result.progresso).toBe(100);
    });
  });
});