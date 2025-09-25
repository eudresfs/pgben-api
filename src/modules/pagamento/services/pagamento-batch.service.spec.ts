import { Test, TestingModule } from '@nestjs/testing';
import { Repository, DataSource } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Logger } from '@nestjs/common';

import { PagamentoBatchService } from './pagamento-batch.service';
import { PagamentoWorkflowService } from './pagamento-workflow.service';
import { PagamentoQueueService } from './pagamento-queue.service';
import { RequestContextHolder } from '../../../common/services/request-context-holder.service';
import { Pagamento, Documento } from '@/entities';
import { StatusPagamentoEnum } from '@/enums';
import { ScopeType } from '@/enums/scope-type.enum';
import { LiberarPagamentoDto } from '../dtos/liberar-pagamento.dto';

describe('PagamentoBatchService - Ordenação por Parcela', () => {
  let service: PagamentoBatchService;
  let pagamentoRepository: jest.Mocked<Repository<Pagamento>>;
  let workflowService: jest.Mocked<PagamentoWorkflowService>;
  let dataSource: jest.Mocked<DataSource>;

  const mockContext = {
    tipo: ScopeType.UNIDADE,
    unidade_id: 'test-unidade-id',
    user_id: 'test-user-id',
  };

  beforeEach(async () => {
    const mockPagamentoRepository = {
      createQueryBuilder: jest.fn(),
    };

    const mockWorkflowService = {
      liberarPagamento: jest.fn(),
    };

    const mockDataSource = {
      createQueryRunner: jest.fn(),
    };

    const mockDocumentoRepository = {};
    const mockQueueService = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PagamentoBatchService,
        {
          provide: getRepositoryToken(Pagamento),
          useValue: mockPagamentoRepository,
        },
        {
          provide: getRepositoryToken(Documento),
          useValue: mockDocumentoRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: PagamentoQueueService,
          useValue: mockQueueService,
        },
        {
          provide: PagamentoWorkflowService,
          useValue: mockWorkflowService,
        },
      ],
    }).compile();

    service = module.get<PagamentoBatchService>(PagamentoBatchService);
    pagamentoRepository = module.get(getRepositoryToken(Pagamento));
    workflowService = module.get(PagamentoWorkflowService);
    dataSource = module.get(DataSource);

    // Mock do RequestContextHolder
    jest.spyOn(RequestContextHolder, 'get').mockReturnValue(mockContext);
    jest.spyOn(RequestContextHolder, 'runAsync').mockImplementation(
      async (context, callback) => callback(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('liberarPagamentosInBatch', () => {
    it('deve ordenar pagamentos por numero_parcela antes da liberação', async () => {
      // Arrange
      const concessaoId = 'test-concessao-id';
      const liberacoes = [
        {
          pagamentoId: 'pagamento-3',
          dados: { data_liberacao: new Date() } as LiberarPagamentoDto,
        },
        {
          pagamentoId: 'pagamento-1',
          dados: { data_liberacao: new Date() } as LiberarPagamentoDto,
        },
        {
          pagamentoId: 'pagamento-2',
          dados: { data_liberacao: new Date() } as LiberarPagamentoDto,
        },
      ];

      const mockPagamentosData = [
        {
          id: 'pagamento-1',
          numero_parcela: 1,
          concessao_id: concessaoId,
        },
        {
          id: 'pagamento-2',
          numero_parcela: 2,
          concessao_id: concessaoId,
        },
        {
          id: 'pagamento-3',
          numero_parcela: 3,
          concessao_id: concessaoId,
        },
      ];

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockPagamentosData),
        getOne: jest.fn().mockResolvedValue(null), // Para validação de parcela anterior
      };

      pagamentoRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const mockPagamentoLiberado = {
        id: 'test-id',
        status: StatusPagamentoEnum.LIBERADO,
        data_liberacao: new Date(),
      } as Pagamento;

      workflowService.liberarPagamento.mockResolvedValue(mockPagamentoLiberado);

      // Act
      const result = await service.liberarPagamentosInBatch(liberacoes, 'test-user-id');

      // Assert
      expect(workflowService.liberarPagamento).toHaveBeenCalledTimes(3);
      
      // Verificar se foi chamado na ordem correta (parcela 1, 2, 3)
      expect(workflowService.liberarPagamento).toHaveBeenNthCalledWith(
        1,
        'pagamento-1',
        liberacoes[1].dados,
        'test-user-id',
      );
      expect(workflowService.liberarPagamento).toHaveBeenNthCalledWith(
        2,
        'pagamento-2',
        liberacoes[2].dados,
        'test-user-id',
      );
      expect(workflowService.liberarPagamento).toHaveBeenNthCalledWith(
        3,
        'pagamento-3',
        liberacoes[0].dados,
        'test-user-id',
      );

      expect(result.successCount).toBe(3);
      expect(result.errorCount).toBe(0);
    });

    it('deve validar sequência de parcelas e detectar gaps', async () => {
      // Arrange
      const concessaoId = 'test-concessao-id';
      const liberacoes = [
        {
          pagamentoId: 'pagamento-3',
          dados: { data_liberacao: new Date() } as LiberarPagamentoDto,
        },
        {
          pagamentoId: 'pagamento-1',
          dados: { data_liberacao: new Date() } as LiberarPagamentoDto,
        },
      ];

      const mockPagamentosData = [
        {
          id: 'pagamento-1',
          numero_parcela: 1,
          concessao_id: concessaoId,
        },
        {
          id: 'pagamento-3',
          numero_parcela: 3,
          concessao_id: concessaoId,
        },
      ];

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockPagamentosData),
        getOne: jest.fn().mockResolvedValue(null), // Parcela 2 não confirmada
      };

      pagamentoRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const mockPagamentoLiberado = {
        id: 'test-id',
        status: StatusPagamentoEnum.LIBERADO,
        data_liberacao: new Date(),
      } as Pagamento;

      workflowService.liberarPagamento.mockResolvedValue(mockPagamentoLiberado);

      // Spy no logger para verificar warnings
      const loggerSpy = jest.spyOn(Logger.prototype, 'warn');

      // Act
      await service.liberarPagamentosInBatch(liberacoes, 'test-user-id');

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('VALIDAÇÃO SEQUÊNCIA: Tentativa de liberar parcela 3 sem parcela anterior 2 confirmada'),
        expect.objectContaining({
          concessaoId,
          parcelaAtual: 3,
          parcelaAnterior: 2,
        }),
      );
    });

    it('deve falhar se não houver contexto de escopo', async () => {
      // Arrange
      jest.spyOn(RequestContextHolder, 'get').mockReturnValue(null);

      const liberacoes = [
        {
          pagamentoId: 'pagamento-1',
          dados: { data_liberacao: new Date() } as LiberarPagamentoDto,
        },
      ];

      // Act & Assert
      await expect(
        service.liberarPagamentosInBatch(liberacoes, 'test-user-id'),
      ).rejects.toThrow('Contexto de escopo obrigatório para liberação em lote');
    });

    it('deve continuar processamento mesmo com erros individuais', async () => {
      // Arrange
      const concessaoId = 'test-concessao-id';
      const liberacoes = [
        {
          pagamentoId: 'pagamento-1',
          dados: { data_liberacao: new Date() } as LiberarPagamentoDto,
        },
        {
          pagamentoId: 'pagamento-2',
          dados: { data_liberacao: new Date() } as LiberarPagamentoDto,
        },
      ];

      const mockPagamentosData = [
        {
          id: 'pagamento-1',
          numero_parcela: 1,
          concessao_id: concessaoId,
        },
        {
          id: 'pagamento-2',
          numero_parcela: 2,
          concessao_id: concessaoId,
        },
      ];

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockPagamentosData),
        getOne: jest.fn().mockResolvedValue(null),
      };

      pagamentoRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const mockPagamentoLiberado = {
        id: 'test-id',
        status: StatusPagamentoEnum.LIBERADO,
        data_liberacao: new Date(),
      } as Pagamento;

      // Primeiro sucesso, segundo erro
      workflowService.liberarPagamento
        .mockResolvedValueOnce(mockPagamentoLiberado)
        .mockRejectedValueOnce(new Error('Erro na liberação'));

      // Act
      const result = await service.liberarPagamentosInBatch(liberacoes, 'test-user-id');

      // Assert
      expect(result.successCount).toBe(1);
      expect(result.errorCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Erro na liberação');
    });
  });
});