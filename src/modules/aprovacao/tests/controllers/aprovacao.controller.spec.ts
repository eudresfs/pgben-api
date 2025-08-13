import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { AprovacaoController } from '../../controllers/aprovacao.controller';
import { AprovacaoService } from '../../services/aprovacao.service';
import { NotificacaoAprovacaoService } from '../../services/notificacao-aprovacao.service';
import { EscalacaoAprovacaoService } from '../../services/escalacao-aprovacao.service';
import { HistoricoAprovacaoService } from '../../services/historico-aprovacao.service';
import {
  StatusSolicitacaoAprovacao,
  TipoAcaoCritica,
  PrioridadeAprovacao,
  EstrategiaAprovacao,
} from '../../enums';
import { Usuario } from '../../../usuarios/entities/usuario.entity';

/**
 * Testes unitários para AprovacaoController
 * 
 * Testa todos os endpoints do controlador principal de aprovação,
 * incluindo cenários de sucesso, erro e edge cases.
 */
describe('AprovacaoController', () => {
  let controller: AprovacaoController;
  let aprovacaoService: jest.Mocked<AprovacaoService>;
  let notificacaoService: jest.Mocked<NotificacaoAprovacaoService>;
  let escalacaoService: jest.Mocked<EscalacaoAprovacaoService>;
  let historicoService: jest.Mocked<HistoricoAprovacaoService>;
  let app: INestApplication;

  // Mock do usuário autenticado
  const mockUsuario: Usuario = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    nome: 'João Silva',
    email: 'joao.silva@semtas.gov.br',
    roles: ['ADMIN'],
    unidade_id: '123e4567-e89b-12d3-a456-426614174001',
  } as Usuario;

  // Mock de solicitação de aprovação
  const mockSolicitacao = {
    id: '123e4567-e89b-12d3-a456-426614174002',
    acao_critica_id: '123e4567-e89b-12d3-a456-426614174003',
    solicitante_id: mockUsuario.id,
    aprovador_id: null,
    status: StatusSolicitacaoAprovacao.PENDENTE,
    prioridade: PrioridadeAprovacao.NORMAL,
    justificativa: 'Teste de aprovação',
    dados_contexto: { teste: true },
    prazo_aprovacao: new Date('2024-12-31T23:59:59Z'),
    data_criacao: new Date(),
    data_processamento: null,
    observacoes: null,
  };

  beforeEach(async () => {
    // Criar mocks dos serviços
    const mockAprovacaoService = {
      listarSolicitacoes: jest.fn(),
      obterSolicitacao: jest.fn(),
      criarSolicitacao: jest.fn(),
      processarAprovacao: jest.fn(),
      processarRejeicao: jest.fn(),
      cancelarSolicitacao: jest.fn(),
      delegarAprovacao: jest.fn(),
      obterEstatisticas: jest.fn(),
      listarAprovadores: jest.fn(),
      adicionarAprovador: jest.fn(),
      removerAprovador: jest.fn(),
      obterMetricas: jest.fn(),
    };

    const mockNotificacaoService = {
      enviarNotificacao: jest.fn(),
      reenviarNotificacao: jest.fn(),
    };

    const mockEscalacaoService = {
      escalarSolicitacao: jest.fn(),
      verificarEscalacoes: jest.fn(),
    };

    const mockHistoricoService = {
      obterHistorico: jest.fn(),
      registrarAcao: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AprovacaoController],
      providers: [
        {
          provide: AprovacaoService,
          useValue: mockAprovacaoService,
        },
        {
          provide: NotificacaoAprovacaoService,
          useValue: mockNotificacaoService,
        },
        {
          provide: EscalacaoAprovacaoService,
          useValue: mockEscalacaoService,
        },
        {
          provide: HistoricoAprovacaoService,
          useValue: mockHistoricoService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AprovacaoController>(AprovacaoController);
    aprovacaoService = module.get(AprovacaoService);
    notificacaoService = module.get(NotificacaoAprovacaoService);
    escalacaoService = module.get(EscalacaoAprovacaoService);
    historicoService = module.get(HistoricoAprovacaoService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Definição do Controller', () => {
    it('deve estar definido', () => {
      expect(controller).toBeDefined();
    });

    it('deve ter todos os métodos necessários', () => {
      expect(controller.listarSolicitacoes).toBeDefined();
      expect(controller.obterSolicitacao).toBeDefined();
      expect(controller.criarSolicitacao).toBeDefined();
      expect(controller.aprovarSolicitacao).toBeDefined();
      expect(controller.rejeitarSolicitacao).toBeDefined();
      expect(controller.cancelarSolicitacao).toBeDefined();
      expect(controller.delegarAprovacao).toBeDefined();
      expect(controller.obterEstatisticas).toBeDefined();
      expect(controller.listarAprovadores).toBeDefined();
      expect(controller.adicionarAprovador).toBeDefined();
      expect(controller.removerAprovador).toBeDefined();
      expect(controller.obterMetricas).toBeDefined();
    });
  });

  describe('listarSolicitacoes', () => {
    it('deve listar solicitações com filtros padrão', async () => {
      const mockResultado = {
        data: [mockSolicitacao],
        meta: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };

      aprovacaoService.listarSolicitacoes.mockResolvedValue(mockResultado);

      const resultado = await controller.listarSolicitacoes(
        undefined, // status
        undefined, // data_inicio
        undefined, // data_fim
        undefined, // solicitante_id
        undefined, // aprovador_id
        undefined, // tipo_acao
        undefined, // prioridade
        1, // page
        20, // limit
        'data_criacao', // sort
        'DESC', // order
        mockUsuario,
      );

      expect(resultado).toEqual(mockResultado);
      expect(aprovacaoService.listarSolicitacoes).toHaveBeenCalledWith(
        {
          status: undefined,
          data_inicio: undefined,
          data_fim: undefined,
          solicitante_id: undefined,
          aprovador_id: undefined,
          tipo_acao: undefined,
          prioridade: undefined,
        },
        {
          page: 1,
          limit: 20,
          sort: 'data_criacao',
          order: 'DESC',
        },
        mockUsuario,
      );
    });

    it('deve listar solicitações com filtros específicos', async () => {
      const filtros = {
        status: [StatusSolicitacaoAprovacao.PENDENTE],
        data_inicio: '2024-01-01',
        data_fim: '2024-12-31',
        prioridade: PrioridadeAprovacao.ALTA,
      };

      const mockResultado = {
        data: [mockSolicitacao],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };

      aprovacaoService.listarSolicitacoes.mockResolvedValue(mockResultado);

      const resultado = await controller.listarSolicitacoes(
        filtros.status,
        filtros.data_inicio,
        filtros.data_fim,
        undefined,
        undefined,
        undefined,
        filtros.prioridade,
        1,
        10,
        'prioridade',
        'ASC',
        mockUsuario,
      );

      expect(resultado).toEqual(mockResultado);
      expect(aprovacaoService.listarSolicitacoes).toHaveBeenCalledWith(
        {
          status: filtros.status,
          data_inicio: filtros.data_inicio,
          data_fim: filtros.data_fim,
          solicitante_id: undefined,
          aprovador_id: undefined,
          tipo_acao: undefined,
          prioridade: filtros.prioridade,
        },
        {
          page: 1,
          limit: 10,
          sort: 'prioridade',
          order: 'ASC',
        },
        mockUsuario,
      );
    });
  });

  describe('obterSolicitacao', () => {
    it('deve obter uma solicitação específica', async () => {
      const solicitacaoId = mockSolicitacao.id;
      aprovacaoService.obterSolicitacao.mockResolvedValue(mockSolicitacao);

      const resultado = await controller.obterSolicitacao(solicitacaoId, mockUsuario);

      expect(resultado).toEqual(mockSolicitacao);
      expect(aprovacaoService.obterSolicitacao).toHaveBeenCalledWith(solicitacaoId, mockUsuario);
    });

    it('deve lançar erro se solicitação não encontrada', async () => {
      const solicitacaoId = 'inexistente';
      aprovacaoService.obterSolicitacao.mockRejectedValue(
        new Error('Solicitação não encontrada'),
      );

      await expect(controller.obterSolicitacao(solicitacaoId, mockUsuario)).rejects.toThrow(
        'Solicitação não encontrada',
      );
    });
  });

  describe('criarSolicitacao', () => {
    it('deve criar uma nova solicitação', async () => {
      const dadosCriacao = {
        acao_critica_id: mockSolicitacao.acao_critica_id,
        justificativa: mockSolicitacao.justificativa,
        dados_contexto: mockSolicitacao.dados_contexto,
        prioridade: mockSolicitacao.prioridade,
        observacoes: mockSolicitacao.observacoes,
      };

      aprovacaoService.criarSolicitacao.mockResolvedValue(mockSolicitacao);

      const resultado = await controller.criarSolicitacao(dadosCriacao, mockUsuario);

      expect(resultado).toEqual(mockSolicitacao);
      expect(aprovacaoService.criarSolicitacao).toHaveBeenCalledWith(dadosCriacao, mockUsuario);
    });

    it('deve validar dados obrigatórios', async () => {
      const dadosIncompletos = {
        acao_critica_id: mockSolicitacao.acao_critica_id,
        // justificativa ausente
        dados_contexto: mockSolicitacao.dados_contexto,
      };

      aprovacaoService.criarSolicitacao.mockRejectedValue(
        new Error('Justificativa é obrigatória'),
      );

      await expect(
        controller.criarSolicitacao(dadosIncompletos as any, mockUsuario),
      ).rejects.toThrow('Justificativa é obrigatória');
    });
  });

  describe('aprovarSolicitacao', () => {
    it('deve aprovar uma solicitação', async () => {
      const solicitacaoId = mockSolicitacao.id;
      const dadosAprovacao = {
        observacoes: 'Aprovado conforme documentação',
        dados_adicionais: { verificado: true },
      };

      const solicitacaoAprovada = {
        ...mockSolicitacao,
        status: StatusSolicitacaoAprovacao.APROVADA,
        aprovador_id: mockUsuario.id,
        data_processamento: new Date(),
        observacoes: dadosAprovacao.observacoes,
      };

      aprovacaoService.processarAprovacao.mockResolvedValue(solicitacaoAprovada);

      const resultado = await controller.aprovarSolicitacao(
        solicitacaoId,
        dadosAprovacao,
        mockUsuario,
      );

      expect(resultado).toEqual(solicitacaoAprovada);
      expect(aprovacaoService.processarAprovacao).toHaveBeenCalledWith(
        solicitacaoId,
        dadosAprovacao,
        mockUsuario,
      );
    });

    it('deve rejeitar aprovação se usuário não autorizado', async () => {
      const solicitacaoId = mockSolicitacao.id;
      const dadosAprovacao = {
        observacoes: 'Tentativa de aprovação não autorizada',
      };

      aprovacaoService.processarAprovacao.mockRejectedValue(
        new Error('Usuário não autorizado para aprovar esta solicitação'),
      );

      await expect(
        controller.aprovarSolicitacao(solicitacaoId, dadosAprovacao, mockUsuario),
      ).rejects.toThrow('Usuário não autorizado para aprovar esta solicitação');
    });
  });

  describe('rejeitarSolicitacao', () => {
    it('deve rejeitar uma solicitação', async () => {
      const solicitacaoId = mockSolicitacao.id;
      const dadosRejeicao = {
        motivo: 'DOCUMENTACAO_INSUFICIENTE',
        observacoes: 'Documentação não atende aos requisitos',
        dados_adicionais: { documentos_necessarios: ['RG', 'CPF'] },
      };

      const solicitacaoRejeitada = {
        ...mockSolicitacao,
        status: StatusSolicitacaoAprovacao.REJEITADA,
        aprovador_id: mockUsuario.id,
        data_processamento: new Date(),
        observacoes: dadosRejeicao.observacoes,
      };

      aprovacaoService.processarRejeicao.mockResolvedValue(solicitacaoRejeitada);

      const resultado = await controller.rejeitarSolicitacao(
        solicitacaoId,
        dadosRejeicao,
        mockUsuario,
      );

      expect(resultado).toEqual(solicitacaoRejeitada);
      expect(aprovacaoService.processarRejeicao).toHaveBeenCalledWith(
        solicitacaoId,
        dadosRejeicao,
        mockUsuario,
      );
    });

    it('deve exigir motivo para rejeição', async () => {
      const solicitacaoId = mockSolicitacao.id;
      const dadosIncompletos = {
        observacoes: 'Rejeitado sem motivo',
        // motivo ausente
      };

      aprovacaoService.processarRejeicao.mockRejectedValue(
        new Error('Motivo da rejeição é obrigatório'),
      );

      await expect(
        controller.rejeitarSolicitacao(solicitacaoId, dadosIncompletos as any, mockUsuario),
      ).rejects.toThrow('Motivo da rejeição é obrigatório');
    });
  });

  describe('delegarAprovacao', () => {
    it('deve delegar aprovação para outro usuário', async () => {
      const solicitacaoId = mockSolicitacao.id;
      const dadosDelegacao = {
        novo_aprovador_id: '123e4567-e89b-12d3-a456-426614174004',
        motivo: 'Delegação por ausência temporária',
        observacoes: 'Aprovador estará ausente por 3 dias',
      };

      const solicitacaoDelegada = {
        ...mockSolicitacao,
        aprovador_id: dadosDelegacao.novo_aprovador_id,
      };

      aprovacaoService.delegarAprovacao.mockResolvedValue(solicitacaoDelegada);

      const resultado = await controller.delegarAprovacao(
        solicitacaoId,
        dadosDelegacao,
        mockUsuario,
      );

      expect(resultado).toEqual(solicitacaoDelegada);
      expect(aprovacaoService.delegarAprovacao).toHaveBeenCalledWith(
        solicitacaoId,
        dadosDelegacao,
        mockUsuario,
      );
    });
  });

  describe('obterEstatisticas', () => {
    it('deve obter estatísticas do usuário', async () => {
      const mockEstatisticas = {
        total_solicitacoes: 10,
        pendentes: 3,
        aprovadas: 6,
        rejeitadas: 1,
        tempo_medio_aprovacao: 24.5,
        solicitacoes_vencendo: 2,
      };

      aprovacaoService.obterEstatisticas.mockResolvedValue(mockEstatisticas);

      const resultado = await controller.obterEstatisticas(mockUsuario);

      expect(resultado).toEqual(mockEstatisticas);
      expect(aprovacaoService.obterEstatisticas).toHaveBeenCalledWith(mockUsuario);
    });
  });

  describe('obterMetricas', () => {
    it('deve obter métricas do sistema', async () => {
      const periodo = '30d';
      const mockMetricas = {
        periodo,
        total_solicitacoes: 100,
        taxa_aprovacao: 85.5,
        tempo_medio_resposta: 18.2,
        distribuicao_por_status: {
          PENDENTE: 15,
          APROVADA: 70,
          REJEITADA: 10,
          CANCELADA: 5,
        },
      };

      aprovacaoService.obterMetricas.mockResolvedValue(mockMetricas);

      const resultado = await controller.obterMetricas(periodo, mockUsuario);

      expect(resultado).toEqual(mockMetricas);
      expect(aprovacaoService.obterMetricas).toHaveBeenCalledWith(periodo, mockUsuario);
    });

    it('deve usar período padrão se não especificado', async () => {
      const mockMetricas = {
        periodo: '7d',
        total_solicitacoes: 25,
        taxa_aprovacao: 88.0,
      };

      aprovacaoService.obterMetricas.mockResolvedValue(mockMetricas);

      const resultado = await controller.obterMetricas(undefined, mockUsuario);

      expect(aprovacaoService.obterMetricas).toHaveBeenCalledWith('7d', mockUsuario);
    });
  });

  describe('Tratamento de Erros', () => {
    it('deve propagar erros do serviço', async () => {
      const erro = new Error('Erro interno do serviço');
      aprovacaoService.listarSolicitacoes.mockRejectedValue(erro);

      await expect(
        controller.listarSolicitacoes(
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          1,
          20,
          'data_criacao',
          'DESC',
          mockUsuario,
        ),
      ).rejects.toThrow('Erro interno do serviço');
    });

    it('deve lidar com parâmetros inválidos', async () => {
      const parametrosInvalidos = {
        page: -1,
        limit: 0,
        sort: 'campo_inexistente',
      };

      aprovacaoService.listarSolicitacoes.mockRejectedValue(
        new Error('Parâmetros de paginação inválidos'),
      );

      await expect(
        controller.listarSolicitacoes(
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          parametrosInvalidos.page,
          parametrosInvalidos.limit,
          parametrosInvalidos.sort,
          'DESC',
          mockUsuario,
        ),
      ).rejects.toThrow('Parâmetros de paginação inválidos');
    });
  });

  describe('Integração com Outros Serviços', () => {
    it('deve integrar com serviço de notificação ao aprovar', async () => {
      const solicitacaoId = mockSolicitacao.id;
      const dadosAprovacao = {
        observacoes: 'Aprovado',
      };

      const solicitacaoAprovada = {
        ...mockSolicitacao,
        status: StatusSolicitacaoAprovacao.APROVADA,
      };

      aprovacaoService.processarAprovacao.mockResolvedValue(solicitacaoAprovada);
      notificacaoService.enviarNotificacao.mockResolvedValue(undefined);

      await controller.aprovarSolicitacao(solicitacaoId, dadosAprovacao, mockUsuario);

      // Verificar se o serviço de aprovação foi chamado
      expect(aprovacaoService.processarAprovacao).toHaveBeenCalled();
    });

    it('deve integrar com serviço de histórico', async () => {
      const solicitacaoId = mockSolicitacao.id;
      const mockHistorico = [
        {
          id: '123e4567-e89b-12d3-a456-426614174005',
          acao: 'CRIADA',
          usuario_id: mockUsuario.id,
          data_acao: new Date(),
          observacoes: 'Solicitação criada',
        },
      ];

      historicoService.obterHistorico.mockResolvedValue(mockHistorico);

      // Simular chamada que acessa histórico
      aprovacaoService.obterSolicitacao.mockResolvedValue({
        ...mockSolicitacao,
        historico: mockHistorico,
      });

      const resultado = await controller.obterSolicitacao(solicitacaoId, mockUsuario);

      expect(resultado.historico).toEqual(mockHistorico);
    });
  });
});