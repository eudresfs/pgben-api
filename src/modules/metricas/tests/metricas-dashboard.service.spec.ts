import { Test, TestingModule } from '@nestjs/testing';
import { MetricasDashboardService } from '../services/metricas-dashboard.service';
import { ImpactoSocialService } from '../services/impacto-social.service';
import { GestaoOperacionalService } from '../services/gestao-operacional.service';
import { RequestContextHolder } from '../../../common/services/request-context-holder.service';
import { Logger } from '@nestjs/common';
import { StatusSolicitacao } from '../../../enums/status-solicitacao.enum';
import { ScopeType } from '../../../enums/scope-type.enum';

/**
 * Testes unitários para o MetricasDashboardService
 * 
 * Testa a integração com os novos serviços especializados:
 * - ImpactoSocialService
 * - GestaoOperacionalService
 */
describe('MetricasDashboardService', () => {
  let service: MetricasDashboardService;
  let impactoSocialService: ImpactoSocialService;
  let gestaoOperacionalService: GestaoOperacionalService;

  // Mock do ImpactoSocialService
  const mockImpactoSocialService = {
    getImpactoSocial: jest.fn(),
    obterSolicitacoesPorStatus: jest.fn(),
    debugEscopo: jest.fn(),
  };

  // Mock do GestaoOperacionalService
  const mockGestaoOperacionalService = {
    getGestaoOperacional: jest.fn(),
    obterSolicitacoesPorStatus: jest.fn(),
    debugEscopo: jest.fn(),
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
          provide: ImpactoSocialService,
          useValue: mockImpactoSocialService,
        },
        {
          provide: GestaoOperacionalService,
          useValue: mockGestaoOperacionalService,
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
    impactoSocialService = module.get<ImpactoSocialService>(ImpactoSocialService);
    gestaoOperacionalService = module.get<GestaoOperacionalService>(GestaoOperacionalService);
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
    expect(impactoSocialService).toBeDefined();
    expect(gestaoOperacionalService).toBeDefined();
  });

  describe('getImpactoSocial', () => {
    it('deve delegar para o ImpactoSocialService', async () => {
      // Arrange
      const filtros = { unidade_id: 'test-unidade' };
      const resultadoEsperado = {
        metricas_principais: {
          familias_beneficiadas: 100,
          pessoas_impactadas: 350,
          bairros_impactados: 15,
          investimento_total: 250000,
        },
        indicadores_derivados: {
          valor_medio_por_familia: 2500,
          taxa_cobertura_social: 0.75,
        },
        graficos: [],
      };

      mockImpactoSocialService.getImpactoSocial.mockResolvedValue(resultadoEsperado);

      // Act
      const resultado = await service.getImpactoSocial(filtros);

      // Assert
      expect(resultado).toEqual(resultadoEsperado);
      expect(mockImpactoSocialService.getImpactoSocial).toHaveBeenCalledWith(filtros);
    });
  });

  describe('getGestaoOperacional', () => {
    it('deve delegar para o GestaoOperacionalService', async () => {
      // Arrange
      const filtros = { periodo: '2024-01' };
      const resultadoEsperado = {
        metricas_principais: {
          novos_beneficiarios: 50,
          solicitacoes_iniciadas: 75,
          concessoes: 45,
        },
        status_tramitacao: {
          em_analise: 20,
          pendente_documentacao: 10,
          aprovadas: 40,
          rejeitadas: 5,
        },
        performance: {
          tempo_medio_solicitacao: 12.5,
          tempo_medio_analise: 8.3,
          solicitacoes_por_dia: 2.5,
          concessoes_por_dia: 1.5,
          taxa_concessao: 0.6,
        },
        graficos: [],
      };

      mockGestaoOperacionalService.getGestaoOperacional.mockResolvedValue(resultadoEsperado);

      // Act
      const resultado = await service.getGestaoOperacional(filtros);

      // Assert
      expect(resultado).toEqual(resultadoEsperado);
      expect(mockGestaoOperacionalService.getGestaoOperacional).toHaveBeenCalledWith(filtros);
    });
  });

  describe('obterSolicitacoesPorStatus', () => {
    it('deve delegar para o GestaoOperacionalService quando tipo for gestao_operacional', async () => {
      // Arrange
      const filtros = { status: StatusSolicitacao.EM_ANALISE };
      const resultadoEsperado = [{ id: '1', status: StatusSolicitacao.EM_ANALISE }];

      mockGestaoOperacionalService.obterSolicitacoesPorStatus.mockResolvedValue(resultadoEsperado);

      // Act
      const resultado = await service.obterSolicitacoesPorStatus('gestao_operacional', filtros);

      // Assert
      expect(resultado).toEqual(resultadoEsperado);
      expect(mockGestaoOperacionalService.obterSolicitacoesPorStatus).toHaveBeenCalledWith(filtros);
    });

    it('deve delegar para o ImpactoSocialService quando tipo for impacto_social', async () => {
      // Arrange
      const filtros = { status: StatusSolicitacao.APROVADA };
      const resultadoEsperado = [{ id: '2', status: StatusSolicitacao.APROVADA }];

      mockImpactoSocialService.obterSolicitacoesPorStatus.mockResolvedValue(resultadoEsperado);

      // Act
      const resultado = await service.obterSolicitacoesPorStatus('impacto_social', filtros);

      // Assert
      expect(resultado).toEqual(resultadoEsperado);
      expect(mockImpactoSocialService.obterSolicitacoesPorStatus).toHaveBeenCalledWith(filtros);
    });
  });

  describe('debugEscopo', () => {
    it('deve delegar para o GestaoOperacionalService quando tipo for gestao_operacional', async () => {
      // Arrange
      const resultadoEsperado = { escopo: 'GLOBAL', usuario_id: 'test-user' };
      mockGestaoOperacionalService.debugEscopo.mockResolvedValue(resultadoEsperado);

      // Act
      const resultado = await service.debugEscopo('gestao_operacional');

      // Assert
      expect(resultado).toEqual(resultadoEsperado);
      expect(mockGestaoOperacionalService.debugEscopo).toHaveBeenCalled();
    });

    it('deve delegar para o ImpactoSocialService quando tipo for impacto_social', async () => {
      // Arrange
      const resultadoEsperado = { escopo: 'UNIDADE', unidade_id: 'test-unidade' };
      mockImpactoSocialService.debugEscopo.mockResolvedValue(resultadoEsperado);

      // Act
      const resultado = await service.debugEscopo('impacto_social');

      // Assert
      expect(resultado).toEqual(resultadoEsperado);
      expect(mockImpactoSocialService.debugEscopo).toHaveBeenCalled();
    });
  });
});