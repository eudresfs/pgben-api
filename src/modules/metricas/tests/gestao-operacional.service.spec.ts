import { Test, TestingModule } from '@nestjs/testing';
import { GestaoOperacionalService } from '../services/gestao-operacional.service';
import { ScopedRepository } from '../../../common/repositories/scoped-repository';
import { RequestContextHolder } from '../../../common/services/request-context-holder.service';
import { Logger } from '@nestjs/common';
import { ScopeType } from '../../../enums/scope-type.enum';
import { StatusSolicitacao } from '../../../enums/status-solicitacao.enum';
import {
  Solicitacao,
  Pagamento,
  Concessao,
  Cidadao,
} from '../../../entities';

/**
 * Testes unitários para o GestaoOperacionalService
 * 
 * Testa a funcionalidade específica de métricas de gestão operacional,
 * incluindo o uso correto do ScopedRepository e cálculos de performance
 */
describe('GestaoOperacionalService', () => {
  let service: GestaoOperacionalService;
  let solicitacaoRepository: ScopedRepository<Solicitacao>;
  let pagamentoRepository: ScopedRepository<Pagamento>;
  let concessaoRepository: ScopedRepository<Concessao>;
  let cidadaoRepository: ScopedRepository<Cidadao>;

  // Mock do QueryBuilder
  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    setParameters: jest.fn().mockReturnThis(),
    getRawOne: jest.fn(),
    getRawMany: jest.fn(),
    getCount: jest.fn(),
    pipe: jest.fn().mockReturnThis(),
  };

  // Mock do ScopedRepository
  const mockScopedRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
  };

  beforeEach(async () => {
    // Limpar todos os mocks antes de cada teste
    jest.clearAllMocks();

    // Mock do RequestContextHolder
    jest.spyOn(RequestContextHolder, 'get').mockReturnValue({
      tipo: ScopeType.GLOBAL,
      unidade_id: null,
      usuario_id: 'test-user',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GestaoOperacionalService,
        {
          provide: 'ScopedRepository<Solicitacao>',
          useValue: mockScopedRepository,
        },
        {
          provide: 'ScopedRepository<Pagamento>',
          useValue: mockScopedRepository,
        },
        {
          provide: 'ScopedRepository<Concessao>',
          useValue: mockScopedRepository,
        },
        {
          provide: 'ScopedRepository<Cidadao>',
          useValue: mockScopedRepository,
        },
        {
          provide: Logger,
          useValue: {
            error: jest.fn(),
            debug: jest.fn(),
            log: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<GestaoOperacionalService>(GestaoOperacionalService);
    solicitacaoRepository = module.get('ScopedRepository<Solicitacao>');
    pagamentoRepository = module.get('ScopedRepository<Pagamento>');
    concessaoRepository = module.get('ScopedRepository<Concessao>');
    cidadaoRepository = module.get('ScopedRepository<Cidadao>');
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  describe('getGestaoOperacional', () => {
    it('deve calcular métricas de gestão operacional corretamente', async () => {
      // Arrange
      const filtros = { unidade_id: 'test-unidade' };
      
      // Mock dos retornos das consultas
      mockQueryBuilder.getRawOne
        .mockResolvedValueOnce({ total: '75' }) // novos beneficiários
        .mockResolvedValueOnce({ total: '120' }) // solicitações iniciadas
        .mockResolvedValueOnce({ total: '90' }) // concessões
        .mockResolvedValueOnce({ em_analise: '25', pendente_documentacao: '15', aprovadas: '80', rejeitadas: '10' }) // status tramitação
        .mockResolvedValueOnce({ tempo_medio_dias: '12.5' }) // tempo médio solicitação
        .mockResolvedValueOnce({ tempo_medio_analise: '8.3' }) // tempo médio análise
        .mockResolvedValueOnce({ total_solicitacoes: '150' }) // total solicitações para cálculo diário
        .mockResolvedValueOnce({ total_concessoes: '120' }); // total concessões para cálculo diário

      // Act
      const resultado = await service.getGestaoOperacional(filtros);

      // Assert
      expect(resultado).toBeDefined();
      expect(resultado.metricas_principais.novos_beneficiarios).toBe(75);
      expect(resultado.metricas_principais.solicitacoes_iniciadas).toBe(120);
      expect(resultado.metricas_principais.concessoes).toBe(90);
      expect(resultado.status_tramitacao.em_analise).toBe(25);
      expect(resultado.status_tramitacao.pendente_documentacao).toBe(15);
      expect(resultado.status_tramitacao.aprovadas).toBe(80);
      expect(resultado.status_tramitacao.rejeitadas).toBe(10);
      expect(resultado.performance.tempo_medio_solicitacao).toBe(12.5);
      expect(resultado.performance.tempo_medio_analise).toBe(8.3);
      expect(resultado.performance.solicitacoes_por_dia).toBe(5); // 150 / 30
      expect(resultado.performance.concessoes_por_dia).toBe(4); // 120 / 30
      expect(resultado.performance.taxa_concessao).toBe(0.75); // 90 / 120
    });

    it('deve aplicar filtros de período corretamente', async () => {
      // Arrange
      const filtros = {
        periodo_inicio: '2024-01-01',
        periodo_fim: '2024-12-31',
        status: StatusSolicitacao.EM_ANALISE,
      };

      mockQueryBuilder.getRawOne
        .mockResolvedValueOnce({ total: '50' })
        .mockResolvedValueOnce({ total: '80' })
        .mockResolvedValueOnce({ total: '60' })
        .mockResolvedValueOnce({ em_analise: '20', pendente_documentacao: '10', aprovadas: '45', rejeitadas: '5' })
        .mockResolvedValueOnce({ tempo_medio_dias: '10.0' })
        .mockResolvedValueOnce({ tempo_medio_analise: '6.5' })
        .mockResolvedValueOnce({ total_solicitacoes: '100' })
        .mockResolvedValueOnce({ total_concessoes: '75' });

      // Act
      await service.getGestaoOperacional(filtros);

      // Assert
      expect(mockScopedRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.pipe).toHaveBeenCalled();
    });

    it('deve retornar valores zerados em caso de erro', async () => {
      // Arrange
      mockQueryBuilder.getRawOne.mockRejectedValue(new Error('Erro de banco'));

      // Act
      const resultado = await service.getGestaoOperacional({});

      // Assert
      expect(resultado.metricas_principais.novos_beneficiarios).toBe(0);
      expect(resultado.metricas_principais.solicitacoes_iniciadas).toBe(0);
      expect(resultado.metricas_principais.concessoes).toBe(0);
      expect(resultado.performance.tempo_medio_solicitacao).toBe(0);
      expect(resultado.performance.tempo_medio_analise).toBe(0);
      expect(resultado.performance.solicitacoes_por_dia).toBe(0);
      expect(resultado.performance.concessoes_por_dia).toBe(0);
      expect(resultado.performance.taxa_concessao).toBe(0);
    });

    it('deve calcular taxa de concessão corretamente quando não há solicitações', async () => {
      // Arrange
      mockQueryBuilder.getRawOne
        .mockResolvedValueOnce({ total: '0' }) // novos beneficiários
        .mockResolvedValueOnce({ total: '0' }) // solicitações iniciadas
        .mockResolvedValueOnce({ total: '0' }) // concessões
        .mockResolvedValueOnce({ em_analise: '0', pendente_documentacao: '0', aprovadas: '0', rejeitadas: '0' })
        .mockResolvedValueOnce({ tempo_medio_dias: '0' })
        .mockResolvedValueOnce({ tempo_medio_analise: '0' })
        .mockResolvedValueOnce({ total_solicitacoes: '0' })
        .mockResolvedValueOnce({ total_concessoes: '0' });

      // Act
      const resultado = await service.getGestaoOperacional({});

      // Assert
      expect(resultado.performance.taxa_concessao).toBe(0);
    });
  });

  describe('obterSolicitacoesPorStatus', () => {
    it('deve retornar solicitações filtradas por status', async () => {
      // Arrange
      const filtros = { status: StatusSolicitacao.EM_ANALISE };
      const solicitacoesMock = [
        { id: '1', status: StatusSolicitacao.EM_ANALISE },
        { id: '2', status: StatusSolicitacao.EM_ANALISE },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValue(solicitacoesMock);

      // Act
      const resultado = await service.obterSolicitacoesPorStatus(filtros);

      // Assert
      expect(resultado).toEqual(solicitacoesMock);
      expect(mockScopedRepository.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('debugEscopo', () => {
    it('deve retornar informações de debug do escopo', async () => {
      // Act
      const resultado = await service.debugEscopo();

      // Assert
      expect(resultado).toBeDefined();
      expect(resultado.contexto_atual).toBeDefined();
      expect(resultado.contexto_atual.tipo).toBe(ScopeType.GLOBAL);
      expect(resultado.contexto_atual.usuario_id).toBe('test-user');
    });
  });

  describe('cálculos de performance', () => {
    it('deve arredondar valores para 2 casas decimais', async () => {
      // Arrange
      mockQueryBuilder.getRawOne
        .mockResolvedValueOnce({ total: '50' })
        .mockResolvedValueOnce({ total: '75' })
        .mockResolvedValueOnce({ total: '60' })
        .mockResolvedValueOnce({ em_analise: '10', pendente_documentacao: '5', aprovadas: '55', rejeitadas: '5' })
        .mockResolvedValueOnce({ tempo_medio_dias: '12.456789' })
        .mockResolvedValueOnce({ tempo_medio_analise: '8.123456' })
        .mockResolvedValueOnce({ total_solicitacoes: '157' })
        .mockResolvedValueOnce({ total_concessoes: '123' });

      // Act
      const resultado = await service.getGestaoOperacional({});

      // Assert
      expect(resultado.performance.tempo_medio_solicitacao).toBe(12.46);
      expect(resultado.performance.tempo_medio_analise).toBe(8.12);
      expect(resultado.performance.solicitacoes_por_dia).toBe(5.23); // 157 / 30
      expect(resultado.performance.concessoes_por_dia).toBe(4.1); // 123 / 30
    });
  });
});