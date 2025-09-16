import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';
import { StatusConcessao } from '../../../enums/status-concessao.enum';
import { PagamentoUpdateStatusDto } from '../dtos/pagamento-update-status.dto';
import { TipoBeneficioEnum } from '../../../enums/tipo-beneficio.enum';

// Mock das dependências
const mockPagamentoRepository = {
  findPagamentoComRelacoes: jest.fn(),
  update: jest.fn(),
};

const mockConcessaoService = {
  atualizarStatus: jest.fn(),
};

const mockCacheInvalidationService = {
  emitCacheInvalidationEvent: jest.fn(),
};

const mockPagamentoEventosService = {
  emitirEventoStatusAtualizado: jest.fn(),
};

const mockPagamentoCalculatorService = {
  calcularPagamento: jest.fn(),
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
};

// Mock do PagamentoValidationUtil
jest.mock('../utils/pagamento-validation.util', () => ({
  PagamentoValidationUtil: {
    validarTransicaoStatus: jest.fn(),
  },
}));

// Mock do Logger
jest.mock('@nestjs/common', () => ({
  ...jest.requireActual('@nestjs/common'),
  Logger: jest.fn().mockImplementation(() => ({
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
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
    let service: PagamentoService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          PagamentoService,
          { provide: 'PagamentoRepository', useValue: mockPagamentoRepository },
          { provide: 'ConcessaoService', useValue: mockConcessaoService },
          { provide: 'PagamentoCacheInvalidationService', useValue: mockCacheInvalidationService },
          { provide: 'PagamentoEventosService', useValue: mockPagamentoEventosService },
          { provide: 'PagamentoCalculatorService', useValue: mockPagamentoCalculatorService },
          { provide: 'SolicitacaoService', useValue: mockSolicitacaoService },
          { provide: 'PagamentoValidationService', useValue: mockValidationService },
          { provide: 'PagamentoCacheService', useValue: mockCacheService },
          { provide: 'AuditoriaService', useValue: mockAuditoriaService },
          { provide: 'PagamentoUnifiedMapper', useValue: mockMapper },
          { provide: 'FiltrosAvancadosService', useValue: mockFiltrosAvancadosService },
        ],
      }).compile();

      service = module.get<PagamentoService>(PagamentoService);
    });

    it('deve passar dados específicos para o calculador de pagamentos', async () => {
      // Arrange
      const mockConcessao = {
        id: 'concessao-123',
        tipo_beneficio: TipoBeneficioEnum.NATALIDADE,
        valor_beneficio: 1000,
        data_inicio: new Date('2024-01-01'),
        quantidade_parcelas: 3,
        solicitacao_id: 'solicitacao-123',
      };

      const mockSolicitacao = {
        id: 'solicitacao-123',
        liberador_id: 'user-123',
      };

      const mockDadosEspecificos = {
        quantidade_bebes_esperados: 2,
        data_provavel_parto: new Date('2024-06-01'),
      };

      const mockResultadoCalculo = {
        pagamentos: [
          {
            numero_parcela: 1,
            valor: 1000,
            data_vencimento: new Date('2024-02-01'),
            data_liberacao: new Date('2024-01-15'),
          },
        ],
      };

      mockPagamentoCalculatorService.calcularPagamento.mockReturnValue(mockResultadoCalculo);
      mockPagamentoRepository.save = jest.fn().mockResolvedValue([]);

      // Act
      await service.gerarPagamentosParaConcessao(
        mockConcessao as any,
        mockSolicitacao as any,
        'user-123',
        mockDadosEspecificos,
      );

      // Assert
      expect(mockPagamentoCalculatorService.calcularPagamento).toHaveBeenCalledWith(
        expect.objectContaining({
          tipoBeneficio: TipoBeneficioEnum.NATALIDADE,
          valor: 1000,
          dataInicio: mockConcessao.data_inicio,
          quantidadeParcelas: 3,
          dadosEspecificos: mockDadosEspecificos,
        }),
      );
    });

    it('deve funcionar mesmo sem dados específicos', async () => {
      // Arrange
      const mockConcessao = {
        id: 'concessao-123',
        tipo_beneficio: TipoBeneficioEnum.CESTA_BASICA,
        valor_beneficio: 500,
        data_inicio: new Date('2024-01-01'),
        quantidade_parcelas: 1,
        solicitacao_id: 'solicitacao-123',
      };

      const mockSolicitacao = {
        id: 'solicitacao-123',
        liberador_id: 'user-123',
      };

      const mockResultadoCalculo = {
        pagamentos: [
          {
            numero_parcela: 1,
            valor: 500,
            data_vencimento: new Date('2024-02-01'),
            data_liberacao: new Date('2024-01-15'),
          },
        ],
      };

      mockPagamentoCalculatorService.calcularPagamento.mockReturnValue(mockResultadoCalculo);
      mockPagamentoRepository.save = jest.fn().mockResolvedValue([]);

      // Act
      await service.gerarPagamentosParaConcessao(
        mockConcessao as any,
        mockSolicitacao as any,
        'user-123',
        null, // Sem dados específicos
      );

      // Assert
      expect(mockPagamentoCalculatorService.calcularPagamento).toHaveBeenCalledWith(
        expect.objectContaining({
          tipoBeneficio: TipoBeneficioEnum.CESTA_BASICA,
          valor: 500,
          dataInicio: mockConcessao.data_inicio,
          quantidadeParcelas: 1,
          dadosEspecificos: null,
        }),
      );
    });
  });
});