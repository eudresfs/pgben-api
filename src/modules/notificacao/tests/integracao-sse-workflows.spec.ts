import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { NotificacaoService } from '../services/notificacao.service';
import { NotificacaoProativaService } from '../services/notificacao-proativa.service';
import { NotificacaoPreferenciasService } from '../services/notificacao-preferencias.service';
import { WorkflowProativoListener } from '../listeners/workflow-proativo.listener';
import { NotificacaoProativaScheduler } from '../services/notificacao-proativa.scheduler';
import {
  NotificacaoSistema,
  TipoNotificacao,
  PrioridadeNotificacao,
} from '../../../entities/notification.entity';
import { Usuario } from '../../../entities/usuario.entity';
import { Solicitacao } from '../../../entities/solicitacao.entity';
import { StatusSolicitacao } from '../../../enums/status-solicitacao.enum';
import { TipoBeneficio } from '../../../enums/tipo-beneficio.enum';

describe('Integração SSE + Workflows (E2E)', () => {
  let module: TestingModule;
  let notificacaoService: NotificacaoService;
  let notificacaoProativaService: NotificacaoProativaService;
  let notificacaoPreferenciasService: NotificacaoPreferenciasService;
  let workflowListener: WorkflowProativoListener;
  let scheduler: NotificacaoProativaScheduler;
  let eventEmitter: EventEmitter2;

  let notificacaoRepository: jest.Mocked<Repository<NotificacaoSistema>>;
  let usuarioRepository: jest.Mocked<Repository<Usuario>>;
  let solicitacaoRepository: jest.Mocked<Repository<Solicitacao>>;
  let configService: jest.Mocked<ConfigService>;
  let schedulerRegistry: jest.Mocked<SchedulerRegistry>;

  const mockNotificacaoRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getCount: jest.fn(),
    })),
  };

  const mockUsuarioRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    })),
  };

  const mockSolicitacaoRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    })),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        NOTIFICACAO_CACHE_TTL: '300000',
        NOTIFICACAO_LIMITE_DIARIO_DEFAULT: '50',
        NOTIFICACAO_PRAZO_ALERTA_DIAS: '3',
        NOTIFICACAO_CLEANUP_DIAS: '30',
        AZURE_STORAGE_CONNECTION_STRING: 'test-connection',
        AZURE_STORAGE_CONTAINER: 'test-container',
      };
      return config[key];
    }),
  };

  const mockSchedulerRegistry = {
    addCronJob: jest.fn(),
    deleteCronJob: jest.fn(),
    getCronJob: jest.fn(),
  };

  const usuarioTeste = {
    id: 'user-123',
    nome: 'João Silva',
    email: 'joao@teste.com',
    perfil: 'CIDADAO',
    notificacao_preferencias: {
      ativo: true,
      idioma: 'pt-BR',
      timezone: 'America/Sao_Paulo',
      tipos: [
        {
          tipo: TipoNotificacao.SOLICITACAO,
          ativo: true,
          canais: ['sse', 'email'],
          prioridade_minima: 'low',
          horario_silencioso: { ativo: false },
          agrupamento: { ativo: false },
        },
      ],
      configuracoes_globais: {
        pausar_todas: false,
        limite_diario: 50,
      },
    },
  };

  const solicitacaoTeste = {
    id: 'sol-123',
    numero_protocolo: '2024001',
    usuario_id: 'user-123',
    tipo_beneficio: TipoBeneficio.AUXILIO_NATALIDADE,
    status: StatusSolicitacao.PENDENTE,
    data_criacao: new Date(),
    prazo_analise: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
    dados_solicitacao: {
      nome_beneficiario: 'João Silva',
      cpf: '12345678901',
    },
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        NotificacaoService,
        NotificacaoProativaService,
        NotificacaoPreferenciasService,
        WorkflowProativoListener,
        NotificacaoProativaScheduler,
        EventEmitter2,
        {
          provide: getRepositoryToken(NotificacaoSistema),
          useValue: mockNotificacaoRepository,
        },
        {
          provide: getRepositoryToken(Usuario),
          useValue: mockUsuarioRepository,
        },
        {
          provide: getRepositoryToken(Solicitacao),
          useValue: mockSolicitacaoRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: SchedulerRegistry,
          useValue: mockSchedulerRegistry,
        },
      ],
    }).compile();

    notificacaoService = module.get<NotificacaoService>(NotificacaoService);
    notificacaoProativaService = module.get<NotificacaoProativaService>(
      NotificacaoProativaService,
    );
    notificacaoPreferenciasService = module.get<NotificacaoPreferenciasService>(
      NotificacaoPreferenciasService,
    );
    workflowListener = module.get<WorkflowProativoListener>(
      WorkflowProativoListener,
    );
    scheduler = module.get<NotificacaoProativaScheduler>(
      NotificacaoProativaScheduler,
    );
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    notificacaoRepository = module.get(getRepositoryToken(NotificacaoSistema));
    usuarioRepository = module.get(getRepositoryToken(Usuario));
    solicitacaoRepository = module.get(getRepositoryToken(Solicitacao));
    configService = module.get(ConfigService);
    schedulerRegistry = module.get(SchedulerRegistry);

    // Configurar mocks padrão
    mockUsuarioRepository.findOne.mockResolvedValue(usuarioTeste as any);
    mockSolicitacaoRepository.findOne.mockResolvedValue(
      solicitacaoTeste as any,
    );
    mockNotificacaoRepository.save.mockImplementation((notificacao) =>
      Promise.resolve({ ...notificacao, id: 'notif-' + Date.now() }),
    );
    mockNotificacaoRepository.create.mockImplementation((data) => data as any);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    if (module) {
      await module.close();
    }
  });

  describe('Fluxo Completo: Criação de Solicitação', () => {
    it('deve processar evento de criação de solicitação com notificações proativas', async () => {
      // Simular evento de criação de solicitação
      const eventoSolicitacao = {
        solicitacaoId: solicitacaoTeste.id,
        usuarioId: usuarioTeste.id,
        status: StatusSolicitacao.PENDENTE,
        tipoBeneficio: TipoBeneficio.AUXILIO_NATALIDADE,
        timestamp: new Date(),
      };

      // Executar listener
      await workflowListener.handleSolicitacaoCriada(eventoSolicitacao);

      // Verificar se notificação foi criada
      expect(mockNotificacaoRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          destinatario_id: usuarioTeste.id,
          tipo: TipoNotificacao.SOLICITACAO,
          titulo: expect.stringContaining('Solicitação criada'),
        }),
      );

      // Verificar se alerta de prazo foi agendado
      const alertas = await notificacaoProativaService.obterAlertasPendentes();
      expect(alertas.length).toBeGreaterThan(0);
    });

    it('deve respeitar preferências do usuário ao enviar notificações', async () => {
      // Configurar usuário com notificações pausadas
      const usuarioComPreferencias = {
        ...usuarioTeste,
        notificacao_preferencias: {
          ...usuarioTeste.notificacao_preferencias,
          configuracoes_globais: {
            pausar_todas: true,
            pausar_ate: new Date(Date.now() + 60000), // 1 minuto
          },
        },
      };

      mockUsuarioRepository.findOne.mockResolvedValue(
        usuarioComPreferencias as any,
      );

      const eventoSolicitacao = {
        solicitacaoId: solicitacaoTeste.id,
        usuarioId: usuarioTeste.id,
        status: StatusSolicitacao.PENDENTE,
        tipoBeneficio: TipoBeneficio.AUXILIO_NATALIDADE,
        timestamp: new Date(),
      };

      await workflowListener.handleSolicitacaoCriada(eventoSolicitacao);

      // Verificar que notificação não foi enviada devido às preferências
      const deveEnviar =
        await notificacaoPreferenciasService.deveEnviarNotificacao(
          usuarioTeste.id,
          TipoNotificacao.SOLICITACAO,
          'medium',
          'sse',
        );

      expect(deveEnviar).toBe(false);
    });
  });

  describe('Fluxo Completo: Mudança de Status', () => {
    it('deve processar mudança de status com notificação adequada', async () => {
      const eventoMudancaStatus = {
        solicitacaoId: solicitacaoTeste.id,
        usuarioId: usuarioTeste.id,
        statusAnterior: StatusSolicitacao.PENDENTE,
        statusNovo: StatusSolicitacao.APROVADA,
        observacoes: 'Solicitação aprovada pela análise técnica',
        timestamp: new Date(),
      };

      await workflowListener.handleMudancaStatus(eventoMudancaStatus);

      expect(mockNotificacaoRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          destinatario_id: usuarioTeste.id,
          tipo: TipoNotificacao.APROVACAO,
          titulo: expect.stringContaining('aprovada'),
          prioridade: PrioridadeNotificacao.ALTA,
        }),
      );
    });

    it('deve cancelar alertas de prazo quando solicitação for finalizada', async () => {
      // Primeiro, criar um alerta de prazo
      await notificacaoProativaService.criarAlertaPrazo(
        solicitacaoTeste.id,
        usuarioTeste.id,
        new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 dia
        'Prazo de análise se aproximando',
      );

      // Simular finalização da solicitação
      const eventoFinalizacao = {
        solicitacaoId: solicitacaoTeste.id,
        usuarioId: usuarioTeste.id,
        statusAnterior: StatusSolicitacao.PENDENTE,
        statusNovo: StatusSolicitacao.APROVADA,
        timestamp: new Date(),
      };

      await workflowListener.handleSolicitacaoFinalizada(eventoFinalizacao);

      // Verificar se alertas foram cancelados
      const alertasPendentes =
        await notificacaoProativaService.obterAlertasPendentes();
      const alertasSolicitacao = alertasPendentes.filter(
        (alerta) => alerta.contexto?.solicitacao_id === solicitacaoTeste.id,
      );

      expect(alertasSolicitacao.length).toBe(0);
    });
  });

  describe('Sistema de Agrupamento', () => {
    it('deve agrupar notificações quando configurado', async () => {
      // Configurar usuário com agrupamento ativo
      const usuarioComAgrupamento = {
        ...usuarioTeste,
        notificacao_preferencias: {
          ...usuarioTeste.notificacao_preferencias,
          tipos: [
            {
              tipo: TipoNotificacao.SISTEMA,
              ativo: true,
              canais: ['sse'],
              agrupamento: {
                ativo: true,
                frequencia: 'CADA_30_MIN',
                maximo_por_grupo: 5,
              },
            },
          ],
        },
      };

      mockUsuarioRepository.findOne.mockResolvedValue(
        usuarioComAgrupamento as any,
      );

      // Adicionar múltiplas notificações ao grupo
      for (let i = 0; i < 3; i++) {
        await notificacaoPreferenciasService.adicionarAoGrupo(
          usuarioTeste.id,
          TipoNotificacao.SISTEMA,
          {
            titulo: `Notificação ${i + 1}`,
            mensagem: `Mensagem ${i + 1}`,
            prioridade: 'medium',
            contexto: { indice: i },
            timestamp: new Date(),
          },
        );
      }

      // Processar grupos
      const resultado =
        await notificacaoPreferenciasService.processarGruposPorFrequencia(
          'CADA_30_MIN',
        );

      expect(resultado.gruposProcessados).toBeGreaterThan(0);
      expect(resultado.notificacoesEnviadas).toBeGreaterThan(0);
    });
  });

  describe('Scheduler de Tarefas Proativas', () => {
    it('deve executar verificação de prazos automaticamente', async () => {
      // Configurar solicitações próximas do prazo
      const solicitacoesPrazo = [
        {
          ...solicitacaoTeste,
          id: 'sol-prazo-1',
          prazo_analise: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 dias
        },
        {
          ...solicitacaoTeste,
          id: 'sol-prazo-2',
          prazo_analise: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 dia
        },
      ];

      mockSolicitacaoRepository
        .createQueryBuilder()
        .getMany.mockResolvedValue(solicitacoesPrazo);

      // Executar verificação de prazos
      await scheduler.verificarPrazos();

      // Verificar se alertas foram criados
      expect(mockNotificacaoRepository.save).toHaveBeenCalledTimes(2);
    });

    it('deve executar limpeza automática de notificações antigas', async () => {
      const notificacoesAntigas = [
        {
          id: 'notif-old-1',
          created_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // 35 dias atrás
        },
        {
          id: 'notif-old-2',
          created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), // 40 dias atrás
        },
      ];

      mockNotificacaoRepository
        .createQueryBuilder()
        .getMany.mockResolvedValue(notificacoesAntigas);
      mockNotificacaoRepository.delete.mockResolvedValue({
        affected: 2,
      } as any);

      const resultado = await scheduler.limpezaAutomatica();

      expect(resultado.notificacoesRemovidas).toBe(2);
      expect(mockNotificacaoRepository.delete).toHaveBeenCalled();
    });

    it('deve gerar relatório de atividades', async () => {
      // Configurar dados para relatório
      mockNotificacaoRepository.count
        .mockResolvedValueOnce(150) // Total enviadas
        .mockResolvedValueOnce(25) // Pendentes
        .mockResolvedValueOnce(5); // Com falha

      mockUsuarioRepository.createQueryBuilder().getMany.mockResolvedValue([
        { id: 'user-1', ultimo_acesso: new Date() },
        {
          id: 'user-2',
          ultimo_acesso: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        },
      ]);

      const relatorio = await scheduler.gerarRelatorioAtividades();

      expect(relatorio).toMatchObject({
        periodo: expect.any(Object),
        notificacoes: expect.objectContaining({
          total_enviadas: 150,
          pendentes: 25,
          com_falha: 5,
        }),
        usuarios: expect.objectContaining({
          total: 2,
          ativos_7_dias: 1,
        }),
      });
    });
  });

  describe('Tratamento de Erros e Recuperação', () => {
    it('deve lidar com falha na criação de notificação', async () => {
      mockNotificacaoRepository.save.mockRejectedValue(
        new Error('Erro de banco'),
      );

      const eventoSolicitacao = {
        solicitacaoId: solicitacaoTeste.id,
        usuarioId: usuarioTeste.id,
        status: StatusSolicitacao.PENDENTE,
        tipoBeneficio: TipoBeneficio.AUXILIO_NATALIDADE,
        timestamp: new Date(),
      };

      // Não deve gerar exceção não tratada
      await expect(
        workflowListener.handleSolicitacaoCriada(eventoSolicitacao),
      ).resolves.not.toThrow();
    });

    it('deve tentar reenvio de notificações com falha', async () => {
      const notificacaoComFalha = {
        id: 'notif-falha',
        destinatario_id: usuarioTeste.id,
        status: 'FALHA',
        numero_tentativas: 2,
        proxima_tentativa: new Date(Date.now() - 1000), // Já passou do horário
        dados_envio: {
          canal: 'email',
          endereco: 'joao@teste.com',
        },
      };

      mockNotificacaoRepository
        .createQueryBuilder()
        .getMany.mockResolvedValue([notificacaoComFalha]);
      mockNotificacaoRepository.save.mockResolvedValue(
        notificacaoComFalha as any,
      );

      const resultado = await scheduler.reprocessarFalhas();

      expect(resultado.tentativasReprocessamento).toBe(1);
      expect(mockNotificacaoRepository.save).toHaveBeenCalled();
    });
  });

  describe('Métricas e Monitoramento', () => {
    it('deve coletar métricas de performance', async () => {
      // Simular algumas operações
      await notificacaoProativaService.criarNotificacaoSistema(
        'Sistema em manutenção',
        'O sistema estará em manutenção das 02:00 às 04:00',
        'medium',
        { manutencao: true },
      );

      const metricas = await notificacaoProativaService.obterMetricas();

      expect(metricas).toMatchObject({
        notificacoes_enviadas_24h: expect.any(Number),
        alertas_ativos: expect.any(Number),
        usuarios_com_preferencias: expect.any(Number),
        taxa_entrega: expect.any(Number),
      });
    });

    it('deve monitorar saúde do sistema', async () => {
      const saudeServicos = await Promise.all([
        notificacaoService.verificarSaude?.() ||
          Promise.resolve({ status: 'ok' }),
        notificacaoProativaService.verificarSaude(),
        notificacaoPreferenciasService.verificarSaude?.() ||
          Promise.resolve({ status: 'ok' }),
      ]);

      saudeServicos.forEach((saude) => {
        expect(saude.status).toBeDefined();
      });
    });
  });

  describe('Integração com SSE', () => {
    it('deve emitir eventos SSE para notificações em tempo real', async () => {
      const spyEmit = jest.spyOn(eventEmitter, 'emit');

      await notificacaoService.criarEBroadcast(
        usuarioTeste.id,
        TipoNotificacao.SISTEMA,
        'Teste SSE',
        'Mensagem de teste para SSE',
        'medium',
        { teste: true },
      );

      expect(spyEmit).toHaveBeenCalledWith(
        'sse.notification',
        expect.objectContaining({
          userId: usuarioTeste.id,
          notification: expect.objectContaining({
            titulo: 'Teste SSE',
            mensagem: 'Mensagem de teste para SSE',
          }),
        }),
      );
    });
  });
});
