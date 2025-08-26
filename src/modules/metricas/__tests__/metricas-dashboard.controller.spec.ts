import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MetricasDashboardController } from '../controllers/metricas-dashboard.controller';
import { MetricasDashboardService } from '../services/metricas-dashboard.service';
import { ImpactoSocialData } from '../interfaces/impacto-social.interface';
import { GestaoOperacionalData } from '../interfaces/gestao-operacional.interface';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { MetricasFiltrosAvancadosDto, PeriodoPredefinido, StatusSolicitacao } from '../dto/metricas-filtros-avancados.dto';
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

/**
 * Testes unitários para o controlador MetricasDashboardController
 * 
 * Testa os endpoints de métricas de impacto social e gestão operacional
 */
describe('MetricasDashboardController', () => {
  let controller: MetricasDashboardController;
  let service: jest.Mocked<MetricasDashboardService>;

  // Mock de dados de impacto social
  const mockImpactoSocial: ImpactoSocialData = {
    metricas: {
      familias_beneficiadas: 150,
      pessoas_impactadas: 450,
      bairros_impactados: 25,
      investimento_total: 1250000,
    },
    indicadores: {
      valor_medio_por_familia: 8333.33,
      taxa_cobertura_social: 7.5,
    },
    graficos: {
      evolucao_mensal: [
        { mes: '2024-01', familias: 10, pessoas: 30, investimento: 5000 },
        { mes: '2024-02', familias: 15, pessoas: 45, investimento: 7500 }
      ],
      distribuicao_beneficios: [
        { tipo: 'Auxílio Alimentação', quantidade: 80, percentual: 53.3 },
        { tipo: 'Auxílio Transporte', quantidade: 70, percentual: 46.7 }
      ],
      recursos_faixa_etaria: [
        { faixa_etaria: '0-17 anos', recursos: 3000, percentual: 25.0 },
        { faixa_etaria: '18-64 anos', recursos: 9000, percentual: 75.0 }
      ],
      recursos_tipo_beneficio: [
        { tipo_beneficio: 'Auxílio Alimentação', recursos: 8000, percentual: 66.7 },
        { tipo_beneficio: 'Auxílio Transporte', recursos: 4000, percentual: 33.3 }
      ],
      recursos_impacto_tipo: [
        { tipo_beneficio: 'Auxílio Alimentação', recursos: 8000, familias: 80, pessoas: 240 },
        { tipo_beneficio: 'Auxílio Transporte', recursos: 4000, familias: 70, pessoas: 210 }
      ],
      recursos_bairros: [
        { bairro: 'Centro', recursos: 6000, percentual: 50.0 },
        { bairro: 'Periferia', recursos: 6000, percentual: 50.0 }
      ]
    },
  };

  // Mock de dados de gestão operacional
  const mockGestaoOperacional: GestaoOperacionalData = {
    metricas_gerais: {
      novos_beneficiarios: 50,
      solicitacoes_iniciadas: 200,
      concessoes: 180,
      concessoes_judicializadas: 15,
    },
    solicitacoes_tramitacao: {
      em_analise: 25,
      pendentes: 15,
      aprovadas: 160,
      indeferidas: 20,
    },
    performance: {
      tempo_medio_solicitacao: 5.2,
      tempo_medio_analise: 3.8,
      solicitacoes_por_dia: 12.5,
      concessoes_por_dia: 8.3,
    },
    taxa_concessao: {
      percentual_aprovacao: 80,
      percentual_indeferimento: 20,
    },
    graficos: {
      evolucao_concessoes: [
        { mes: 'Janeiro', aluguel_social: 15, cesta_basica: 20, beneficio_funeral: 5, beneficio_natalidade: 5 },
        { mes: 'Fevereiro', aluguel_social: 18, cesta_basica: 22, beneficio_funeral: 6, beneficio_natalidade: 6 },
        { mes: 'Março', aluguel_social: 20, cesta_basica: 23, beneficio_funeral: 5, beneficio_natalidade: 5 }
      ],
      solicitacoes_dia_semana: [
        { dia: 'Segunda', quantidade: 35 },
        { dia: 'Terça', quantidade: 42 },
        { dia: 'Quarta', quantidade: 38 },
        { dia: 'Quinta', quantidade: 45 },
        { dia: 'Sexta', quantidade: 40 },
      ],
      concessoes_tipo_beneficio: [
        { tipo: 'Auxílio Emergencial', quantidade: 80, percentual: 53.3 },
        { tipo: 'Benefício Eventual', quantidade: 70, percentual: 46.7 }
      ],
      solicitacoes_unidade: [
        { unidade: 'Centro', quantidade: 85, percentual: 42.5 },
        { unidade: 'Norte', quantidade: 65, percentual: 32.5 },
        { unidade: 'Sul', quantidade: 50, percentual: 25.0 },
      ],
    },
  };

  beforeEach(async () => {
    // Mock do serviço
    const mockService = {
      getImpactoSocial: jest.fn(),
      getGestaoOperacional: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricasDashboardController],
      providers: [
        {
          provide: MetricasDashboardService,
          useValue: mockService,
        },
      ],
    })
    .overrideGuard(JwtAuthGuard)
    .useValue({ canActivate: () => true })
    .overrideGuard(RolesGuard)
    .useValue({ canActivate: () => true })
    .overrideGuard(PermissionGuard)
    .useValue({ canActivate: () => true })
    .compile();

    controller = module.get<MetricasDashboardController>(MetricasDashboardController);
    service = module.get(MetricasDashboardService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getImpactoSocial', () => {
    it('deve retornar métricas de impacto social com sucesso sem filtros', async () => {
      const filtros: MetricasFiltrosAvancadosDto = {};
      service.getImpactoSocial.mockResolvedValue(mockImpactoSocial);

      const resultado = await controller.getImpactoSocial(filtros);

      expect(resultado.success).toBe(true);
      expect(resultado.message).toBe('Dados de impacto social carregados com sucesso');
      expect(resultado.data).toEqual(mockImpactoSocial);
      expect(resultado.timestamp).toBeDefined();
      expect(service.getImpactoSocial).toHaveBeenCalledWith(filtros);
    });

    it('deve retornar métricas de impacto social com filtros de período', async () => {
      const filtros: MetricasFiltrosAvancadosDto = {
        periodo: PeriodoPredefinido.ULTIMOS_90_DIAS
      };
      service.getImpactoSocial.mockResolvedValue(mockImpactoSocial);

      const resultado = await controller.getImpactoSocial(filtros);

      expect(resultado.success).toBe(true);
      expect(resultado.data).toEqual(mockImpactoSocial);
      expect(service.getImpactoSocial).toHaveBeenCalledWith(filtros);
    });

    it('deve retornar métricas de impacto social com filtros múltiplos', async () => {
      const filtros: MetricasFiltrosAvancadosDto = {
        periodo: PeriodoPredefinido.ULTIMOS_30_DIAS,
        unidades: ['123e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174001', '123e4567-e89b-12d3-a456-426614174002'],
         beneficios: ['123e4567-e89b-12d3-a456-426614174010', '123e4567-e89b-12d3-a456-426614174011'],
        bairros: ['Centro', 'Vila Nova'],
        statusList: [StatusSolicitacao.APROVADO, StatusSolicitacao.EM_ANALISE],
        incluirArquivados: false
      };
      service.getImpactoSocial.mockResolvedValue(mockImpactoSocial);

      const resultado = await controller.getImpactoSocial(filtros);

      expect(resultado.success).toBe(true);
      expect(resultado.data).toEqual(mockImpactoSocial);
      expect(service.getImpactoSocial).toHaveBeenCalledWith(filtros);
    });

    it('deve retornar métricas de impacto social com período personalizado', async () => {
      const filtros: MetricasFiltrosAvancadosDto = {
        periodo: PeriodoPredefinido.PERSONALIZADO,
        dataInicioPersonalizada: '2024-01-01T00:00:00.000Z',
        dataFimPersonalizada: '2024-12-31T23:59:59.999Z'
      };
      service.getImpactoSocial.mockResolvedValue(mockImpactoSocial);

      const resultado = await controller.getImpactoSocial(filtros);

      expect(resultado.success).toBe(true);
      expect(resultado.data).toEqual(mockImpactoSocial);
      expect(service.getImpactoSocial).toHaveBeenCalledWith(filtros);
    });

    it('deve conter todas as propriedades esperadas na resposta', async () => {
      // Arrange
      const filtros: MetricasFiltrosAvancadosDto = {};
      service.getImpactoSocial.mockResolvedValue(mockImpactoSocial);

      // Act
      const resultado = await controller.getImpactoSocial(filtros);

      // Assert
      expect(resultado).toHaveProperty('success');
      expect(resultado).toHaveProperty('data');
      expect(resultado).toHaveProperty('message');
      expect(resultado).toHaveProperty('timestamp');
      
      expect(resultado.data).toHaveProperty('metricas');
      expect(resultado.data).toHaveProperty('indicadores');
      expect(resultado.data).toHaveProperty('graficos');
      
      expect(resultado.data.metricas).toHaveProperty('familias_beneficiadas');
      expect(resultado.data.metricas).toHaveProperty('pessoas_impactadas');
      expect(resultado.data.metricas).toHaveProperty('bairros_impactados');
      expect(resultado.data.metricas).toHaveProperty('investimento_total');
      
      expect(resultado.data.indicadores).toHaveProperty('valor_medio_por_familia');
      expect(resultado.data.indicadores).toHaveProperty('taxa_cobertura_social');
      
      expect(resultado.data.graficos).toHaveProperty('evolucao_mensal');
      expect(resultado.data.graficos).toHaveProperty('distribuicao_beneficios');
      expect(resultado.data.graficos).toHaveProperty('recursos_faixa_etaria');
    });

    it('deve lançar erro quando o serviço falha', async () => {
      const filtros: MetricasFiltrosAvancadosDto = {};
      service.getImpactoSocial.mockRejectedValue(new Error('Erro no serviço'));

      await expect(controller.getImpactoSocial(filtros)).rejects.toThrow(
        'Erro ao obter métricas de impacto social'
      );
    });
  });

  describe('getGestaoOperacional', () => {
    it('deve retornar métricas de gestão operacional com sucesso sem filtros', async () => {
      const filtros: MetricasFiltrosAvancadosDto = {};
      service.getGestaoOperacional.mockResolvedValue(mockGestaoOperacional);

      const resultado = await controller.getGestaoOperacional(filtros);

      expect(resultado.success).toBe(true);
      expect(resultado.message).toBe('Dados de gestão operacional carregados com sucesso');
      expect(resultado.data).toEqual(mockGestaoOperacional);
      expect(resultado.timestamp).toBeDefined();
      expect(service.getGestaoOperacional).toHaveBeenCalledWith(filtros);
    });

    it('deve retornar métricas de gestão operacional com filtros de período', async () => {
      const filtros: MetricasFiltrosAvancadosDto = {
        periodo: PeriodoPredefinido.ULTIMOS_90_DIAS
      };
      service.getGestaoOperacional.mockResolvedValue(mockGestaoOperacional);

      const resultado = await controller.getGestaoOperacional(filtros);

      expect(resultado.success).toBe(true);
      expect(resultado.data).toEqual(mockGestaoOperacional);
      expect(service.getGestaoOperacional).toHaveBeenCalledWith(filtros);
    });

    it('deve retornar métricas de gestão operacional com filtros de unidade e usuário', async () => {
      const filtros: MetricasFiltrosAvancadosDto = {
        periodo: PeriodoPredefinido.ULTIMOS_30_DIAS,
        unidades: ['123e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174001'],
         usuarios: ['123e4567-e89b-12d3-a456-426614174020', '123e4567-e89b-12d3-a456-426614174021'],
        incluirArquivados: true
      };
      service.getGestaoOperacional.mockResolvedValue(mockGestaoOperacional);

      const resultado = await controller.getGestaoOperacional(filtros);

      expect(resultado.success).toBe(true);
      expect(resultado.data).toEqual(mockGestaoOperacional);
      expect(service.getGestaoOperacional).toHaveBeenCalledWith(filtros);
    });

    it('deve retornar métricas de gestão operacional com filtros de benefício e status', async () => {
      const filtros: MetricasFiltrosAvancadosDto = {
        beneficios: ['123e4567-e89b-12d3-a456-426614174010', '123e4567-e89b-12d3-a456-426614174012', '123e4567-e89b-12d3-a456-426614174014'],
        statusList: [StatusSolicitacao.APROVADO, StatusSolicitacao.REJEITADO],
        bairros: ['Centro']
      };
      service.getGestaoOperacional.mockResolvedValue(mockGestaoOperacional);

      const resultado = await controller.getGestaoOperacional(filtros);

      expect(resultado.success).toBe(true);
      expect(resultado.data).toEqual(mockGestaoOperacional);
      expect(service.getGestaoOperacional).toHaveBeenCalledWith(filtros);
    });

    it('deve retornar métricas de gestão operacional com paginação', async () => {
      const filtros: MetricasFiltrosAvancadosDto = {
        limite: 50,
        offset: 100
      };
      service.getGestaoOperacional.mockResolvedValue(mockGestaoOperacional);

      const resultado = await controller.getGestaoOperacional(filtros);

      expect(resultado.success).toBe(true);
      expect(resultado.data).toEqual(mockGestaoOperacional);
      expect(service.getGestaoOperacional).toHaveBeenCalledWith(filtros);
    });

    it('deve conter todas as propriedades esperadas na resposta', async () => {
       // Arrange
       const filtros: MetricasFiltrosAvancadosDto = {};
       service.getGestaoOperacional.mockResolvedValue(mockGestaoOperacional);

       // Act
       const resultado = await controller.getGestaoOperacional(filtros);

      // Assert
      expect(resultado).toHaveProperty('success');
      expect(resultado).toHaveProperty('data');
      expect(resultado).toHaveProperty('message');
      expect(resultado).toHaveProperty('timestamp');
      
      expect(resultado.data).toHaveProperty('metricas_gerais');
      expect(resultado.data).toHaveProperty('solicitacoes_tramitacao');
      expect(resultado.data).toHaveProperty('performance');
      expect(resultado.data).toHaveProperty('taxa_concessao');
      expect(resultado.data).toHaveProperty('graficos');
      
      expect(resultado.data.metricas_gerais).toHaveProperty('novos_beneficiarios');
      expect(resultado.data.metricas_gerais).toHaveProperty('solicitacoes_iniciadas');
      expect(resultado.data.metricas_gerais).toHaveProperty('concessoes');
      expect(resultado.data.metricas_gerais).toHaveProperty('concessoes_judicializadas');
      
      expect(resultado.data.solicitacoes_tramitacao).toHaveProperty('em_analise');
      expect(resultado.data.solicitacoes_tramitacao).toHaveProperty('pendentes');
      expect(resultado.data.solicitacoes_tramitacao).toHaveProperty('aprovadas');
      expect(resultado.data.solicitacoes_tramitacao).toHaveProperty('indeferidas');
      
      expect(resultado.data.performance).toHaveProperty('tempo_medio_solicitacao');
      expect(resultado.data.performance).toHaveProperty('tempo_medio_analise');
      expect(resultado.data.performance).toHaveProperty('solicitacoes_por_dia');
      expect(resultado.data.performance).toHaveProperty('concessoes_por_dia');
      
      expect(resultado.data.taxa_concessao).toHaveProperty('percentual_aprovacao');
      expect(resultado.data.taxa_concessao).toHaveProperty('percentual_indeferimento');
      
      expect(resultado.data.graficos).toHaveProperty('evolucao_concessoes');
      expect(resultado.data.graficos).toHaveProperty('solicitacoes_dia_semana');
      expect(resultado.data.graficos).toHaveProperty('concessoes_tipo_beneficio');
      expect(resultado.data.graficos).toHaveProperty('solicitacoes_unidade');
    });

    it('deve lançar erro quando o serviço falha', async () => {
      const filtros: MetricasFiltrosAvancadosDto = {};
      service.getGestaoOperacional.mockRejectedValue(new Error('Erro no serviço'));

      await expect(controller.getGestaoOperacional(filtros)).rejects.toThrow(
        'Erro ao obter métricas de gestão operacional'
      );
    });
  });

  describe('Validação de tipos', () => {
    it('deve aceitar períodos válidos para impacto social', async () => {
       service.getImpactoSocial.mockResolvedValue(mockImpactoSocial);
       const periodosValidos = [PeriodoPredefinido.ULTIMOS_7_DIAS, PeriodoPredefinido.ULTIMOS_30_DIAS, PeriodoPredefinido.ULTIMOS_90_DIAS, PeriodoPredefinido.ANO_ATUAL];

       for (const periodo of periodosValidos) {
         const filtros: MetricasFiltrosAvancadosDto = { periodo };
         await controller.getImpactoSocial(filtros);
         expect(service.getImpactoSocial).toHaveBeenCalledWith(filtros);
       }
     });

    it('deve aceitar períodos válidos para gestão operacional', async () => {
       service.getGestaoOperacional.mockResolvedValue(mockGestaoOperacional);
       const periodosValidos = [PeriodoPredefinido.ULTIMOS_7_DIAS, PeriodoPredefinido.ULTIMOS_30_DIAS, PeriodoPredefinido.ULTIMOS_90_DIAS, PeriodoPredefinido.ANO_ATUAL];

       for (const periodo of periodosValidos) {
         const filtros: MetricasFiltrosAvancadosDto = { periodo };
         await controller.getGestaoOperacional(filtros);
         expect(service.getGestaoOperacional).toHaveBeenCalledWith(filtros);
       }
     });
  });
});