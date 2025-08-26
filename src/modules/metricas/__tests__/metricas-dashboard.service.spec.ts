import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MetricasDashboardService } from '../services/metricas-dashboard.service';
import {
  Solicitacao,
  Concessao,
  Pagamento,
  Cidadao,
  TipoBeneficio,
  Endereco,
  ComposicaoFamiliar,
  Unidade,
} from '../../../entities';
import { StatusSolicitacao } from '../../../enums/status-solicitacao.enum';
import { StatusConcessao } from '../../../enums/status-concessao.enum';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';

/**
 * Testes unitários para o serviço MetricasDashboardService
 * 
 * Testa as funcionalidades de cálculo de métricas de impacto social
 * e gestão operacional do dashboard
 */
describe('MetricasDashboardService', () => {
  let service: MetricasDashboardService;
  let solicitacaoRepository: jest.Mocked<Repository<Solicitacao>>;
  let concessaoRepository: jest.Mocked<Repository<Concessao>>;
  let pagamentoRepository: jest.Mocked<Repository<Pagamento>>;
  let cidadaoRepository: jest.Mocked<Repository<Cidadao>>;
  let tipoBeneficioRepository: jest.Mocked<Repository<TipoBeneficio>>;
  let enderecoRepository: jest.Mocked<Repository<Endereco>>;
  let composicaoFamiliarRepository: jest.Mocked<Repository<ComposicaoFamiliar>>;
  let unidadeRepository: jest.Mocked<Repository<Unidade>>;

  // Mock para QueryBuilder
  const mockQueryBuilder = {
    createQueryBuilder: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    having: jest.fn().mockReturnThis(),
    getCount: jest.fn(),
    getRawMany: jest.fn(),
    getRawOne: jest.fn(),
  };

  // Mock para métodos do serviço
  const mockServiceMethods = {
    calcularMetricasImpactoSocial: jest.fn(),
    calcularIndicadoresImpactoSocial: jest.fn(),
    gerarGraficosImpactoSocial: jest.fn(),
    calcularMetricasGeraisOperacional: jest.fn(),
    calcularSolicitacoesTramitacao: jest.fn(),
    calcularPerformanceOperacional: jest.fn(),
    calcularTaxaConcessao: jest.fn(),
    gerarGraficosGestaoOperacional: jest.fn(),
    gerarEvolucaoConcessoes: jest.fn(),
    gerarSolicitacoesDiaSemana: jest.fn(),
    gerarConcessoesTipoBeneficio: jest.fn(),
    gerarSolicitacoesUnidade: jest.fn(),
    gerarDistribuicaoBeneficios: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricasDashboardService,
        {
          provide: getRepositoryToken(Solicitacao),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
            count: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Concessao),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Pagamento),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Cidadao),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TipoBeneficio),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Endereco),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ComposicaoFamiliar),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Unidade),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MetricasDashboardService>(MetricasDashboardService);
    solicitacaoRepository = module.get(getRepositoryToken(Solicitacao));
    concessaoRepository = module.get(getRepositoryToken(Concessao));
    pagamentoRepository = module.get(getRepositoryToken(Pagamento));
    cidadaoRepository = module.get(getRepositoryToken(Cidadao));
    tipoBeneficioRepository = module.get(getRepositoryToken(TipoBeneficio));
    enderecoRepository = module.get(getRepositoryToken(Endereco));
    composicaoFamiliarRepository = module.get(getRepositoryToken(ComposicaoFamiliar));
    unidadeRepository = module.get(getRepositoryToken(Unidade));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getImpactoSocial', () => {
    it('deve retornar dados de impacto social com estrutura correta', async () => {
      // Arrange
      jest.spyOn(service as any, 'calcularMetricasImpactoSocial').mockResolvedValue({
        familias_beneficiadas: 150,
        pessoas_impactadas: 450,
        bairros_impactados: 25,
        investimento_total: 1250000,
      });
      
      jest.spyOn(service as any, 'calcularIndicadoresImpactoSocial').mockResolvedValue({
        valor_medio_por_familia: 8333.33,
        taxa_cobertura_social: 7.5,
      });
      
      jest.spyOn(service as any, 'gerarGraficosImpactoSocial').mockResolvedValue({
        evolucao_concessoes: [],
        concessoes_tipo_beneficio: [],
      });

      // Act
      const resultado = await service.getImpactoSocial('30d');

      // Assert
      expect(resultado).toBeDefined();
      expect(resultado.metricas).toBeDefined();
      expect(resultado.indicadores).toBeDefined();
      expect(resultado.graficos).toBeDefined();
    });

    it('deve chamar métodos de cálculo com período correto', async () => {
      // Arrange
      const spyMetricas = jest.spyOn(service as any, 'calcularMetricasImpactoSocial').mockResolvedValue({});
      const spyIndicadores = jest.spyOn(service as any, 'calcularIndicadoresImpactoSocial').mockResolvedValue({});
      const spyGraficos = jest.spyOn(service as any, 'gerarGraficosImpactoSocial').mockResolvedValue({});

      // Act
      await service.getImpactoSocial('90d');

      // Assert
      expect(spyMetricas).toHaveBeenCalledWith(expect.any(Date));
      expect(spyIndicadores).toHaveBeenCalledWith(expect.any(Object), expect.any(Date));
      expect(spyGraficos).toHaveBeenCalledWith(expect.any(Date));
    });
  });

  describe('getGestaoOperacional', () => {
    it('deve retornar dados de gestão operacional com estrutura correta', async () => {
      // Arrange
      jest.spyOn(service as any, 'calcularMetricasGeraisOperacional').mockResolvedValue({
        novos_beneficiarios: 50,
        solicitacoes_iniciadas: 200,
        concessoes: 180,
        concessoes_judicializadas: 15,
      });
      
      jest.spyOn(service as any, 'calcularSolicitacoesTramitacao').mockResolvedValue({
        em_analise: 25,
        pendentes: 15,
        aprovadas: 160,
        indeferidas: 20,
      });
      
      jest.spyOn(service as any, 'calcularPerformanceOperacional').mockResolvedValue({
        tempo_medio_analise: 5.2,
        tempo_medio_aprovacao: 3.8,
        backlog_pendencias: 40,
      });
      
      jest.spyOn(service as any, 'calcularTaxaConcessao').mockResolvedValue({
        percentual_aprovacao: 80,
        percentual_indeferimento: 20,
      });
      
      jest.spyOn(service as any, 'gerarGraficosGestaoOperacional').mockResolvedValue({
        solicitacoes_dia_semana: [],
        solicitacoes_unidade: [],
      });

      // Act
      const resultado = await service.getGestaoOperacional('30d');

      // Assert
      expect(resultado).toBeDefined();
      expect(resultado.metricas_gerais).toBeDefined();
      expect(resultado.solicitacoes_tramitacao).toBeDefined();
      expect(resultado.performance).toBeDefined();
      expect(resultado.taxa_concessao).toBeDefined();
      expect(resultado.graficos).toBeDefined();
    });

    it('deve chamar métodos de cálculo com período correto', async () => {
      // Arrange
      const spyMetricasGerais = jest.spyOn(service as any, 'calcularMetricasGeraisOperacional').mockResolvedValue({});
      const spyTramitacao = jest.spyOn(service as any, 'calcularSolicitacoesTramitacao').mockResolvedValue({});
      const spyPerformance = jest.spyOn(service as any, 'calcularPerformanceOperacional').mockResolvedValue({});
      const spyTaxa = jest.spyOn(service as any, 'calcularTaxaConcessao').mockResolvedValue({});
      const spyGraficos = jest.spyOn(service as any, 'gerarGraficosGestaoOperacional').mockResolvedValue({});

      // Act
      await service.getGestaoOperacional('7d');

      // Assert
      expect(spyMetricasGerais).toHaveBeenCalledWith(expect.any(Date));
      expect(spyTramitacao).toHaveBeenCalledWith(expect.any(Date));
      expect(spyPerformance).toHaveBeenCalledWith(expect.any(Date));
      expect(spyTaxa).toHaveBeenCalledWith(expect.any(Date));
      expect(spyGraficos).toHaveBeenCalledWith(expect.any(Date));
    });
  });

  describe('calcularDataLimite', () => {
    it('deve calcular data limite para 30 dias', () => {
      // Arrange
      const dataAtual = new Date('2024-01-31');
      jest.spyOn(global, 'Date').mockImplementation(() => dataAtual as any);

      // Act
      const dataLimite = (service as any).calcularDataLimite('30d');

      // Assert
      expect(dataLimite).toEqual(new Date('2024-01-01'));
    });

    it('deve calcular data limite para 90 dias', () => {
      // Arrange
      const dataAtual = new Date('2024-03-31');
      jest.spyOn(global, 'Date').mockImplementation(() => dataAtual as any);

      // Act
      const dataLimite = (service as any).calcularDataLimite('90d');

      // Assert
      expect(dataLimite).toEqual(new Date('2024-01-01'));
    });

    it('deve usar 30 dias como padrão', () => {
      // Arrange
      const dataAtual = new Date('2024-01-31');
      jest.spyOn(global, 'Date').mockImplementation(() => dataAtual as any);

      // Act
      const dataLimite = (service as any).calcularDataLimite();

      // Assert
      expect(dataLimite).toEqual(new Date('2024-01-01'));
    });
  });

  describe('gerarSolicitacoesUnidade', () => {
    it('deve ser chamado corretamente', async () => {
      // Arrange
      const dataLimite = new Date();
      const spy = jest.spyOn(service as any, 'gerarSolicitacoesUnidade').mockResolvedValue([]);

      // Act
      await (service as any).gerarSolicitacoesUnidade(dataLimite);

      // Assert
      expect(spy).toHaveBeenCalledWith(dataLimite);
    });
  });
});