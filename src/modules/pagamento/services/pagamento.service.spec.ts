import { Test } from '@nestjs/testing';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';
import { StatusConcessao } from '../../../enums/status-concessao.enum';
import { PagamentoUpdateStatusDto } from '../dtos/pagamento-update-status.dto';
import { TipoBeneficio } from '../../../enums/tipo-beneficio.enum';
import { PeriodoPredefinido } from '../../../enums/periodo-predefinido.enum';

// Mock das dependências
const mockPagamentoRepository = {
  findPagamentoComRelacoes: jest.fn(),
  update: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn(),
  createScopedQueryBuilder: jest.fn(),
  create: jest.fn().mockImplementation((dados) => Promise.resolve({
    id: 'mock-pagamento-id',
    ...dados,
  })),
};

const mockConcessaoService = {
  atualizarStatus: jest.fn(),
};

const mockCacheInvalidationService = {
  emitCacheInvalidationEvent: jest.fn(),
};

const mockPagamentoEventosService = {
  emitirEventoStatusAtualizado: jest.fn(),
  emitirEventoPagamentoCriado: jest.fn(),
};

const mockPagamentoWorkflowService = {
  processUpdateStatus: jest.fn(),
  liberarPagamento: jest.fn(),
  processarPagamentosAgendados: jest.fn(),
};

const mockPagamentoCalculatorService = {
  calcularPagamento: jest.fn(),
  prepararDadosPagamento: jest.fn(),
};

const mockSolicitacaoService = {
  findById: jest.fn(),
};

const mockValidationService = {
  validarDadosPagamento: jest.fn(),
};

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
};

const mockAuditoriaService = {
  registrarOperacao: jest.fn(),
};

const mockMapper = {
  toEntity: jest.fn(),
  toDto: jest.fn(),
};

const mockFiltrosAvancadosService = {
  aplicarFiltros: jest.fn(),
  calcularPeriodoPredefinido: jest.fn(),
  normalizarFiltros: jest.fn(),
};

const mockConcessaoAutoUpdateService = {
  atualizarStatusConcessao: jest.fn(),
  processarAtualizacaoConcessao: jest.fn().mockImplementation(async (pagamento, status, usuarioId, pagamentoId) => {
    try {
      // Simular a lógica do ConcessaoAutoUpdateService que chama o ConcessaoService
      // Verificar se concessao_id existe, se é a primeira parcela e se o status é LIBERADO
      if (pagamento.numero_parcela === 1 && pagamento.concessao_id && status === StatusPagamentoEnum.LIBERADO) {
        await mockConcessaoService.atualizarStatus(
          pagamento.concessao_id,
          StatusConcessao.ATIVO,
          usuarioId,
          'Ativação automática - Primeira parcela do pagamento liberada'
        );
      }
    } catch (error) {
      // Simular o comportamento real: não propagar o erro
      // O ConcessaoAutoUpdateService trata erros internamente e não falha a operação principal
    }
  }),
};

// Mock do PagamentoValidationUtil
jest.mock('../utils/pagamento-validation.util', () => ({
  PagamentoValidationUtil: {
    validarTransicaoStatus: jest.fn(),
    validarValor: jest.fn(),
    validarParaComprovante: jest.fn(),
    validarParaConfirmacao: jest.fn(),
  },
}));

// Mock do Logger
jest.mock('@nestjs/common', () => ({
  ...jest.requireActual('@nestjs/common'),
  Logger: jest.fn().mockImplementation(() => ({
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

// Mock da função processAdvancedSearchParam
jest.mock('../../../shared/utils/cpf-search.util', () => ({
  processAdvancedSearchParam: jest.fn().mockReturnValue({
    processedSearch: 'test',
    variations: ['test'],
  }),
}));

// Importar o serviço após os mocks
import { PagamentoService } from './pagamento.service';

describe('PagamentoService - updateStatus', () => {
  let service: PagamentoService;

  const mockPagamento = {
    id: 'test-pagamento-id',
    numero_parcela: 1,
    concessao_id: 'test-concessao-id',
    status: StatusPagamentoEnum.PENDENTE,
    solicitacao_id: 'test-solicitacao-id',
  };

  beforeEach(() => {
    // Criar instância do serviço com mocks
    service = new PagamentoService(
      mockPagamentoRepository as any,
      {} as any, // validationService
      {} as any, // cacheService
      mockCacheInvalidationService as any,
      {} as any, // auditoriaService
      {} as any, // solicitacaoService
      mockConcessaoService as any,
      {} as any, // mapper
      {} as any, // pagamentoCalculatorService
      {} as any, // filtrosAvancadosService
      mockPagamentoEventosService as any, // pagamentoEventosService
      mockPagamentoWorkflowService as any, // pagamentoWorkflowService
      mockConcessaoAutoUpdateService as any, // concessaoAutoUpdateService
    );

    // Limpar mocks
    jest.clearAllMocks();
  });

  describe('quando atualizar status de pagamento com parcela 1', () => {
    it('deve atualizar o status da concessão para ATIVO', async () => {
      // Arrange
      const updateDto: PagamentoUpdateStatusDto = {
        status: StatusPagamentoEnum.LIBERADO,
      };
      const usuarioId = 'test-user-id';

      mockPagamentoRepository.findPagamentoComRelacoes.mockResolvedValue(mockPagamento as any);
      mockPagamentoRepository.update.mockResolvedValue({ ...mockPagamento, status: StatusPagamentoEnum.LIBERADO } as any);
      mockConcessaoService.atualizarStatus.mockResolvedValue({} as any);

      // Act
      await service.updateStatus(mockPagamento.id, updateDto, usuarioId);

      // Assert
      expect(mockConcessaoService.atualizarStatus).toHaveBeenCalledWith(
        mockPagamento.concessao_id,
        StatusConcessao.ATIVO,
        usuarioId,
        expect.stringContaining('Ativação automática - Primeira parcela do pagamento'),
      );
    });

    it('não deve atualizar o status da concessão quando parcela não for 1', async () => {
      // Arrange
      const pagamentoParcelaNao1 = {
        ...mockPagamento,
        numero_parcela: 2,
      };
      const updateDto: PagamentoUpdateStatusDto = {
        status: StatusPagamentoEnum.LIBERADO,
      };
      const usuarioId = 'test-user-id';

      mockPagamentoRepository.findPagamentoComRelacoes.mockResolvedValue(pagamentoParcelaNao1 as any);
      mockPagamentoRepository.update.mockResolvedValue({ ...pagamentoParcelaNao1, status: StatusPagamentoEnum.LIBERADO } as any);

      // Act
      await service.updateStatus(pagamentoParcelaNao1.id, updateDto, usuarioId);

      // Assert
      expect(mockConcessaoService.atualizarStatus).not.toHaveBeenCalled();
    });

    it('não deve atualizar o status da concessão quando concessao_id for null', async () => {
      // Arrange
      const pagamentoSemConcessao = {
        ...mockPagamento,
        concessao_id: null,
      };
      const updateDto: PagamentoUpdateStatusDto = {
        status: StatusPagamentoEnum.LIBERADO,
      };
      const usuarioId = 'test-user-id';

      mockPagamentoRepository.findPagamentoComRelacoes.mockResolvedValue(pagamentoSemConcessao as any);
      mockPagamentoRepository.update.mockResolvedValue({ ...pagamentoSemConcessao, status: StatusPagamentoEnum.LIBERADO } as any);

      // Act
      await service.updateStatus(pagamentoSemConcessao.id, updateDto, usuarioId);

      // Assert
      expect(mockConcessaoService.atualizarStatus).not.toHaveBeenCalled();
    });

    it('deve continuar a operação mesmo se houver erro na atualização da concessão', async () => {
      // Arrange
      const updateDto: PagamentoUpdateStatusDto = {
        status: StatusPagamentoEnum.LIBERADO,
      };
      const usuarioId = 'test-user-id';

      mockPagamentoRepository.findPagamentoComRelacoes.mockResolvedValue(mockPagamento as any);
      mockPagamentoRepository.update.mockResolvedValue({ ...mockPagamento, status: StatusPagamentoEnum.LIBERADO } as any);
      mockConcessaoService.atualizarStatus.mockRejectedValue(new Error('Erro na concessão'));

      // Act & Assert
      await expect(service.updateStatus(mockPagamento.id, updateDto, usuarioId)).resolves.not.toThrow();
      expect(mockConcessaoService.atualizarStatus).toHaveBeenCalled();
    });
  });

  describe('gerarPagamentosParaConcessao', () => {
    it('deve gerar pagamentos para concessão com dados específicos', async () => {
      // Arrange
      const concessao = { id: '1', valor_total: 1000 };
      const solicitacao = { 
        id: '1', 
        tipo_beneficio: { codigo: TipoBeneficio.NATALIDADE },
        valor: 1000,
        quantidade_parcelas: 2
      };
      const usuarioId = 'user-1';
      const dadosEspecificos = { parcelas: 2 };

      // Mock com estrutura correta do ResultadoCalculoPagamento
      const resultadoCalculo = {
        quantidadeParcelas: 2,
        valorParcela: 500,
        dataLiberacao: new Date('2024-01-15'),
        dataVencimento: new Date('2024-01-30'),
        intervaloParcelas: 30,
      };

      mockPagamentoCalculatorService.calcularPagamento.mockResolvedValue(resultadoCalculo);
      mockPagamentoRepository.save.mockResolvedValue([]);

      // Criar instância do serviço com todos os mocks necessários
      const service = new PagamentoService(
        mockPagamentoRepository as any,
        mockValidationService as any,
        mockCacheService as any,
        mockCacheInvalidationService as any,
        mockAuditoriaService as any,
        mockSolicitacaoService as any,
        mockConcessaoService as any,
        mockMapper as any,
        mockPagamentoCalculatorService as any,
        mockFiltrosAvancadosService as any,
        mockPagamentoEventosService as any,
        mockPagamentoWorkflowService as any,
        mockConcessaoAutoUpdateService as any,
      );

      // Act
      const result = await service.gerarPagamentosParaConcessao(
        concessao,
        solicitacao,
        usuarioId,
        dadosEspecificos,
      );

      // Assert
      expect(mockPagamentoCalculatorService.calcularPagamento).toHaveBeenCalledWith({
        tipoBeneficio: TipoBeneficio.NATALIDADE,
        valor: 1000,
        dataInicio: expect.any(Date),
        quantidadeParcelas: 2,
        dadosEspecificos,
      });
      expect(mockPagamentoRepository.create).toHaveBeenCalled();
      expect(result).toEqual([expect.objectContaining({ id: 'mock-pagamento-id' }), expect.objectContaining({ id: 'mock-pagamento-id' })]);
    });

    it('deve gerar pagamentos para concessão sem dados específicos', async () => {
      // Arrange
      const concessao = { id: '2', valor_total: 2000 };
      const solicitacao = { 
        id: '2', 
        tipo_beneficio: { codigo: TipoBeneficio.NATALIDADE },
        valor: 2000,
        quantidade_parcelas: 2
      };
      const usuarioId = 'user-2';

      // Mock com estrutura correta do ResultadoCalculoPagamento
      const resultadoCalculo = {
        quantidadeParcelas: 2,
        valorParcela: 1000,
        dataLiberacao: new Date('2024-01-15'),
        dataVencimento: new Date('2024-01-30'),
        intervaloParcelas: 30,
      };

      mockPagamentoCalculatorService.calcularPagamento.mockResolvedValue(resultadoCalculo);
      mockPagamentoRepository.save.mockResolvedValue([]);

      // Criar instância do serviço com todos os mocks necessários
      const service = new PagamentoService(
        mockPagamentoRepository as any,
        mockValidationService as any,
        mockCacheService as any,
        mockCacheInvalidationService as any,
        mockAuditoriaService as any,
        mockSolicitacaoService as any,
        mockConcessaoService as any,
        mockMapper as any,
        mockPagamentoCalculatorService as any,
        mockFiltrosAvancadosService as any,
        mockPagamentoEventosService as any,
        mockPagamentoWorkflowService as any,
        mockConcessaoAutoUpdateService as any,
      );

      // Act
      const result = await service.gerarPagamentosParaConcessao(
        concessao,
        solicitacao,
        usuarioId,
      );

      // Assert
      expect(mockPagamentoCalculatorService.calcularPagamento).toHaveBeenCalledWith({
        tipoBeneficio: TipoBeneficio.NATALIDADE,
        valor: 2000,
        dataInicio: expect.any(Date),
        quantidadeParcelas: 2,
        dadosEspecificos: undefined,
      });
      expect(mockPagamentoRepository.create).toHaveBeenCalled();
      expect(result).toEqual([expect.objectContaining({ id: 'mock-pagamento-id' }), expect.objectContaining({ id: 'mock-pagamento-id' })]);
    });
  });

  describe('aplicarFiltrosAvancados', () => {
    let mockQueryBuilder: any;
    let mockRepository: any;
    let service: PagamentoService;

    beforeEach(() => {
      mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
        createScopedQueryBuilder: jest.fn(),
        setParameters: jest.fn().mockReturnThis(),
        getParameters: jest.fn().mockReturnValue({}),
        getQuery: jest.fn().mockReturnValue('SELECT * FROM pagamento'),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        innerJoinAndSelect: jest.fn().mockReturnThis(),
      };

      // Configurar o mock do repositório para este teste
      mockPagamentoRepository.createScopedQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Criar instância do serviço com todos os mocks necessários
      service = new PagamentoService(
        mockPagamentoRepository as any,
        mockValidationService as any,
        mockCacheService as any,
        mockCacheInvalidationService as any,
        mockAuditoriaService as any,
        mockSolicitacaoService as any,
        mockConcessaoService as any,
        mockMapper as any,
        mockPagamentoCalculatorService as any,
        mockFiltrosAvancadosService as any,
        mockPagamentoEventosService as any,
        mockPagamentoWorkflowService as any,
        mockConcessaoAutoUpdateService as any,
      );

      // Mock dos métodos do FiltrosAvancadosService
      mockFiltrosAvancadosService.normalizarFiltros = jest.fn().mockReturnValue({});
      mockFiltrosAvancadosService.calcularPeriodoPredefinido = jest.fn().mockReturnValue({
        dataInicio: new Date(),
        dataFim: new Date(),
      });
    });

    it('deve aplicar filtro proxima_parcela_liberacao quando habilitado', async () => {
      // Arrange
      const filtros = {
        proxima_parcela_liberacao: true,
        limit: 10,
        offset: 0,
      };

      // Mock para a query principal
      const mockMainQuery = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
        getParameters: jest.fn().mockReturnValue({}),
        setParameters: jest.fn().mockReturnThis(),
      };

      // Mock para a subquery
      const mockSubQuery = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getQuery: jest.fn().mockReturnValue('(SELECT MIN(p_proxima.numero_parcela) as min_parcela_proxima, p_proxima.concessao_id as concessao_id_proxima FROM pagamento p_proxima WHERE p_proxima.status IN (:...statusNaoLiberados) GROUP BY p_proxima.concessao_id)'),
        getParameters: jest.fn().mockReturnValue({
          statusNaoLiberados: [StatusPagamentoEnum.PENDENTE, StatusPagamentoEnum.AGENDADO],
        }),
      };

      // Configurar o mock para retornar diferentes objetos baseado no parâmetro
      mockPagamentoRepository.createScopedQueryBuilder
        .mockReturnValueOnce(mockMainQuery) // Primeira chamada (query principal)
        .mockReturnValueOnce(mockSubQuery); // Segunda chamada (subquery)

      // Act
      const result = await service.aplicarFiltrosAvancados(filtros);

      // Assert
      expect(result).toBeDefined();
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(mockPagamentoRepository.createScopedQueryBuilder).toHaveBeenCalled();
    });

    it('não deve aplicar filtro proxima_parcela_liberacao quando desabilitado', async () => {
      // Arrange
      const filtros = {
        proxima_parcela_liberacao: false,
        limit: 10,
        offset: 0,
      };

      // Act
      const result = await service.aplicarFiltrosAvancados(filtros);

      // Assert
      expect(result).toBeDefined();
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith(
        expect.stringContaining('(pagamento.concessao_id, pagamento.numero_parcela) IN')
      );
    });

    it('não deve aplicar filtro proxima_parcela_liberacao quando não especificado', async () => {
      // Arrange
      const filtros = {
        limit: 10,
        offset: 0,
      };

      // Act
      const result = await service.aplicarFiltrosAvancados(filtros);

      // Assert
      expect(result).toBeDefined();
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith(
        expect.stringContaining('(pagamento.concessao_id, pagamento.numero_parcela) IN')
      );
    });
  });
});