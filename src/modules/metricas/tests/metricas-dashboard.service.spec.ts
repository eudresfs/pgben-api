import { Test, TestingModule } from '@nestjs/testing';
import { MetricasDashboardService } from '../services/metricas-dashboard.service';
import { SolicitacaoRepository } from '../../solicitacao/repositories/solicitacao.repository';
import { Repository, DataSource, SelectQueryBuilder } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  Concessao,
  Pagamento,
  Cidadao,
  TipoBeneficio,
  Endereco,
  ComposicaoFamiliar,
  Unidade,
} from '../../../entities';
import { RequestContextHolder } from '../../../common/services/request-context-holder.service';
import { Logger } from '@nestjs/common';
import { StatusSolicitacao } from '../../../enums/status-solicitacao.enum';
import { ScopeType } from '../../../enums/scope-type.enum';

/**
 * Testes unitários para o MetricasDashboardService
 * 
 * Foca especificamente no método calcularPerformanceOperacional
 * para garantir que os dados retornados são reais e não mockados
 */
describe('MetricasDashboardService - calcularPerformanceOperacional', () => {
  let service: MetricasDashboardService;
  let solicitacaoRepository: SolicitacaoRepository;
  let concessaoRepository: Repository<Concessao>;
  let dataSource: DataSource;

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
  };

  // Mock do SolicitacaoRepository
  const mockSolicitacaoRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  // Mock dos outros repositórios
  const mockRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  // Mock do DataSource
  const mockDataSource = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
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
        MetricasDashboardService,
        {
          provide: SolicitacaoRepository,
          useValue: mockSolicitacaoRepository,
        },
        {
          provide: getRepositoryToken(Concessao),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Pagamento),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Cidadao),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(TipoBeneficio),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Endereco),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(ComposicaoFamiliar),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Unidade),
          useValue: mockRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
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

    service = module.get<MetricasDashboardService>(MetricasDashboardService);
    solicitacaoRepository = module.get<SolicitacaoRepository>(SolicitacaoRepository);
    concessaoRepository = module.get<Repository<Concessao>>(getRepositoryToken(Concessao));
    dataSource = module.get<DataSource>(DataSource);
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  describe('calcularPerformanceOperacional', () => {
    it('deve calcular métricas reais de performance operacional', async () => {
      // Arrange - Configurar dados de retorno dos mocks
      const dataLimite = new Date('2024-01-01');
      
      // Mock para tempo médio de solicitação
      mockQueryBuilder.getRawOne
        .mockResolvedValueOnce({ tempo_medio_dias: '12.5' }) // tempo médio solicitação
        .mockResolvedValueOnce({ tempo_medio_analise: '8.3' }) // tempo médio análise
        .mockResolvedValueOnce({ total_solicitacoes: '150' }) // total solicitações
        .mockResolvedValueOnce({ total_concessoes: '120' }); // total concessões

      // Act - Executar o método
      const resultado = await service.calcularPerformanceOperacional(dataLimite);

      // Assert - Verificar se os dados são reais e não mockados
      expect(resultado).toBeDefined();
      expect(resultado.tempo_medio_solicitacao).toBe(12.5);
      expect(resultado.tempo_medio_analise).toBe(8.3);
      expect(resultado.solicitacoes_por_dia).toBe(5); // 150 solicitações / 30 dias
      expect(resultado.concessoes_por_dia).toBe(4); // 120 concessões / 30 dias

      // Verificar se as consultas SQL foram executadas
      expect(mockSolicitacaoRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.select).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalled();
      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
      expect(mockQueryBuilder.getRawOne).toHaveBeenCalled();
    });

    it('deve aplicar filtros avançados quando fornecidos', async () => {
      // Arrange
      const dataLimite = new Date('2024-01-01');
      const filtrosAvancados = {
        unidade_id: 'unidade-123',
        tipo_beneficio_id: 'tipo-456',
      };

      // Mock para retornos das consultas
      mockQueryBuilder.getRawOne
        .mockResolvedValueOnce({ tempo_medio_dias: '10.0' })
        .mockResolvedValueOnce({ tempo_medio_analise: '6.5' })
        .mockResolvedValueOnce({ total_solicitacoes: '90' })
        .mockResolvedValueOnce({ total_concessoes: '75' });

      // Act
      const resultado = await service.calcularPerformanceOperacional(dataLimite, filtrosAvancados);

      // Assert
      expect(resultado).toBeDefined();
      expect(resultado.tempo_medio_solicitacao).toBe(10);
      expect(resultado.tempo_medio_analise).toBe(6.5);
      expect(resultado.solicitacoes_por_dia).toBe(3); // 90 / 30
      expect(resultado.concessoes_por_dia).toBe(2.5); // 75 / 30

      // Verificar se os filtros foram aplicados
      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });

    it('deve retornar valores zerados em caso de erro', async () => {
      // Arrange - Simular erro na consulta
      mockQueryBuilder.getRawOne.mockRejectedValue(new Error('Erro de conexão com banco'));

      // Act
      const resultado = await service.calcularPerformanceOperacional();

      // Assert - Verificar se retorna valores zerados
      expect(resultado).toBeDefined();
      expect(resultado.tempo_medio_solicitacao).toBe(0);
      expect(resultado.tempo_medio_analise).toBe(0);
      expect(resultado.solicitacoes_por_dia).toBe(0);
      expect(resultado.concessoes_por_dia).toBe(0);
    });

    it('deve usar período padrão de 30 dias quando dataLimite não for fornecida', async () => {
      // Arrange
      const dataAtual = new Date();
      const dataEsperada = new Date(dataAtual);
      dataEsperada.setDate(dataEsperada.getDate() - 30);

      mockQueryBuilder.getRawOne
        .mockResolvedValueOnce({ tempo_medio_dias: '15.0' })
        .mockResolvedValueOnce({ tempo_medio_analise: '9.0' })
        .mockResolvedValueOnce({ total_solicitacoes: '200' })
        .mockResolvedValueOnce({ total_concessoes: '160' });

      // Act
      const resultado = await service.calcularPerformanceOperacional();

      // Assert
      expect(resultado).toBeDefined();
      expect(resultado.tempo_medio_solicitacao).toBe(15);
      expect(resultado.tempo_medio_analise).toBe(9);
      expect(resultado.solicitacoes_por_dia).toBeCloseTo(6.67, 1); // 200 / 30
      expect(resultado.concessoes_por_dia).toBeCloseTo(5.33, 1); // 160 / 30

      // Verificar se as consultas foram feitas com período correto
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('created_at'),
        expect.objectContaining({
          dataInicio: expect.any(Date),
          dataFim: expect.any(Date),
        })
      );
    });

    it('deve arredondar valores para 2 casas decimais', async () => {
      // Arrange
      mockQueryBuilder.getRawOne
        .mockResolvedValueOnce({ tempo_medio_dias: '12.456789' })
        .mockResolvedValueOnce({ tempo_medio_analise: '8.123456' })
        .mockResolvedValueOnce({ total_solicitacoes: '157' })
        .mockResolvedValueOnce({ total_concessoes: '123' });

      // Act
      const resultado = await service.calcularPerformanceOperacional();

      // Assert - Verificar arredondamento
      expect(resultado.tempo_medio_solicitacao).toBe(12.46);
      expect(resultado.tempo_medio_analise).toBe(8.12);
      expect(resultado.solicitacoes_por_dia).toBe(5.23); // 157 / 30 = 5.233...
      expect(resultado.concessoes_por_dia).toBe(4.1); // 123 / 30 = 4.1
    });
  });
});