import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Logger } from '@nestjs/common';
import { AprovacaoAuditListener } from '../aprovacao-audit.listener';
import { AprovacaoAblyListener } from '../aprovacao-ably.listener';
import { AuditEventEmitter } from '../../../auditoria/events/emitters/audit-event.emitter';
import { NotificationOrchestratorService } from '../../../notificacao/services/notification-orchestrator.service';
import { TipoOperacao } from '../../../../enums/tipo-operacao.enum';
import { RiskLevel } from '../../../auditoria/events/types/audit-event.types';
import { NotificationType, NotificationPriority } from '../../../notificacao/interfaces/ably.interface';
import { SYSTEM_USER_UUID } from '../../../../shared/constants/system.constants';
import { SystemContextService } from '../../../../common/services/system-context.service';

describe('Aprovacao Listeners', () => {
  let auditListener: AprovacaoAuditListener;
  let ablyListener: AprovacaoAblyListener;
  let mockAuditEventEmitter: jest.Mocked<AuditEventEmitter>;
  let mockNotificationOrchestrator: jest.Mocked<NotificationOrchestratorService>;
  let module: TestingModule;

  const mockSolicitacao = {
    id: 'test-id',
    codigo: 'SOL-2024-001',
    solicitante_id: 'user-1',
    status: 'PENDENTE',
    acao_aprovacao: {
      tipo_acao: 'CRIAR_USUARIO',
      nome: 'Criar Usuário',
      notificar_financeiro: false
    },
    aprovadores: [
      { usuario_id: 'aprovador-1', decidido_em: null },
      { usuario_id: 'aprovador-2', decidido_em: null }
    ],
    executado_em: new Date()
  };

  beforeEach(async () => {
    // Mock do AuditEventEmitter
    mockAuditEventEmitter = {
      emit: jest.fn().mockResolvedValue(undefined),
      emitSystemEvent: jest.fn().mockResolvedValue(undefined),
      emitEntityCreated: jest.fn().mockResolvedValue(undefined),
      emitEntityUpdated: jest.fn().mockResolvedValue(undefined)
    } as any;

    // Mock do NotificationOrchestratorService
    mockNotificationOrchestrator = {
      publishNotification: jest.fn().mockResolvedValue(undefined),
      publishBroadcast: jest.fn().mockResolvedValue(undefined),
      broadcastNotification: jest.fn().mockResolvedValue(undefined)
    } as any;

    const mockSystemContextService = {
      setSystemContext: jest.fn(),
      getSystemContext: jest.fn().mockReturnValue({
        usuarioId: SYSTEM_USER_UUID,
        escopo: 'sistema'
      }),
      clearSystemContext: jest.fn(),
      runWithSystemContext: jest.fn().mockImplementation(async (callback) => {
        return await callback();
      })
    } as any;

    module = await Test.createTestingModule({
      providers: [
        AprovacaoAuditListener,
        AprovacaoAblyListener,
        {
          provide: AuditEventEmitter,
          useValue: mockAuditEventEmitter
        },
        {
          provide: NotificationOrchestratorService,
          useValue: mockNotificationOrchestrator
        },
        {
          provide: SystemContextService,
          useValue: mockSystemContextService
        }
      ]
    }).compile();

    auditListener = module.get<AprovacaoAuditListener>(AprovacaoAuditListener);
    ablyListener = module.get<AprovacaoAblyListener>(AprovacaoAblyListener);

    // Silenciar logs durante os testes
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
  });

  describe('AprovacaoAuditListener', () => {
    describe('handleSolicitacaoCriada', () => {
      it('deve registrar auditoria quando solicitação é criada', async () => {
        const payload = {
          solicitacao: mockSolicitacao,
          solicitanteId: 'user-1',
          configuracao: {
            nome: 'Criar Usuário',
            tipo_acao: 'CRIAR_USUARIO',
            estrategia: 'MANUAL'
          },
          timestamp: new Date()
        };

        await auditListener.handleSolicitacaoCriada(payload);

        expect(mockAuditEventEmitter.emit).toHaveBeenCalledWith(expect.objectContaining({
          eventType: 'entity.created',
          entityName: 'SolicitacaoAprovacao',
          entityId: mockSolicitacao.id,
          userId: payload.solicitanteId,
          riskLevel: RiskLevel.MEDIUM,
          lgpdRelevant: false,
          metadata: expect.objectContaining({
            codigo: mockSolicitacao.codigo,
            tipo_acao: payload.configuracao.tipo_acao,
            operation: TipoOperacao.CREATE,
            description: expect.stringContaining('Nova solicitação criada'),
            configuracao_nome: payload.configuracao.nome
          })
        }));
      });
    });

    describe('handleSolicitacaoAprovada', () => {
      it('deve registrar auditoria quando solicitação é aprovada', async () => {
        const payload = {
          solicitacao: mockSolicitacao,
          aprovadorId: 'aprovador-1',
          justificativa: 'Aprovado conforme política',
          timestamp: new Date()
        };

        await auditListener.handleSolicitacaoAprovada(payload);

        expect(mockAuditEventEmitter.emit).toHaveBeenCalledWith(expect.objectContaining({
          eventType: 'entity.updated',
          entityName: 'SolicitacaoAprovacao',
          entityId: mockSolicitacao.id,
          userId: payload.aprovadorId,
          riskLevel: RiskLevel.HIGH,
          lgpdRelevant: false,
          metadata: expect.objectContaining({
            codigo: mockSolicitacao.codigo,
            tipo_acao: mockSolicitacao.acao_aprovacao.tipo_acao,
            operation: TipoOperacao.APPROVE,
            description: expect.stringContaining('aprovada definitivamente'),
            justificativa: payload.justificativa
          })
        }));
      });
    });

    describe('handleSolicitacaoExecutada', () => {
      it('deve registrar auditoria quando solicitação é executada', async () => {
        const payload = {
          solicitacao: mockSolicitacao,
          dadosExecucao: { usuario_criado: 'novo-usuario' },
          timestamp: new Date()
        };

        await auditListener.handleSolicitacaoExecutada(payload);

        expect(mockAuditEventEmitter.emit).toHaveBeenCalledWith(expect.objectContaining({
          eventType: 'entity.updated',
          entityName: 'SolicitacaoAprovacao',
          entityId: mockSolicitacao.id,
          userId: SYSTEM_USER_UUID,
          riskLevel: RiskLevel.CRITICAL,
          lgpdRelevant: false,
          metadata: expect.objectContaining({
            codigo: mockSolicitacao.codigo,
            tipo_acao: mockSolicitacao.acao_aprovacao.tipo_acao,
            operation: TipoOperacao.EXECUTION,
            description: expect.stringContaining('Ação executada com sucesso'),
            dados_execucao: payload.dadosExecucao,
            executado_em: mockSolicitacao.executado_em
          })
        }));
      });
    });
  });

  describe('AprovacaoAblyListener', () => {
    describe('handleSolicitacaoCriada', () => {
      it('deve enviar notificações Ably para solicitante e aprovadores quando solicitação é criada', async () => {
        const payload = {
          solicitacao: mockSolicitacao,
          solicitanteId: 'user-1',
          configuracao: {
            nome: 'Criar Usuário',
            tipo_acao: 'CRIAR_USUARIO'
          },
          aprovadores: ['aprovador-1', 'aprovador-2'],
          timestamp: new Date()
        };

        await ablyListener.handleSolicitacaoCriada(payload);

        // Verifica notificação ao solicitante
        expect(mockNotificationOrchestrator.publishNotification).toHaveBeenCalledWith('user-1', expect.objectContaining({
          type: NotificationType.INFO,
          priority: NotificationPriority.NORMAL,
          title: 'Solicitação Criada',
          message: `Sua solicitação ${mockSolicitacao.codigo} foi criada e está aguardando aprovação.`,
          data: {
            id: mockSolicitacao.id,
            codigo: mockSolicitacao.codigo,
            tipo_acao: payload.configuracao.tipo_acao,
            status: 'PENDENTE',
            timestamp: payload.timestamp
          }
        }));

        // Verifica notificações aos aprovadores
        expect(mockNotificationOrchestrator.publishNotification).toHaveBeenCalledWith('aprovador-1', expect.objectContaining({
          type: NotificationType.INFO,
          priority: NotificationPriority.HIGH,
          title: 'Nova Solicitação para Aprovação',
          message: `Nova solicitação ${mockSolicitacao.codigo} aguarda sua aprovação.`,
          data: {
            id: mockSolicitacao.id,
            codigo: mockSolicitacao.codigo,
            tipo_acao: payload.configuracao.tipo_acao,
            solicitante: payload.solicitanteId,
            timestamp: payload.timestamp
          }
        }));

        expect(mockNotificationOrchestrator.publishNotification).toHaveBeenCalledTimes(3); // 1 solicitante + 2 aprovadores
      });
    });

    describe('handleSolicitacaoAprovada', () => {
      it('deve enviar notificação Ably para solicitante quando aprovada', async () => {
        const payload = {
          solicitacao: mockSolicitacao,
          aprovadorId: 'aprovador-1',
          solicitanteId: 'user-1',
          justificativa: 'Aprovado conforme política',
          timestamp: new Date()
        };

        await ablyListener.handleSolicitacaoAprovada(payload);

        expect(mockNotificationOrchestrator.publishNotification).toHaveBeenCalledWith('user-1', expect.objectContaining({
          type: NotificationType.SUCCESS,
          priority: NotificationPriority.HIGH,
          title: 'Solicitação Aprovada',
          message: `Sua solicitação ${mockSolicitacao.codigo} foi aprovada.`,
          data: {
            id: mockSolicitacao.id,
            codigo: mockSolicitacao.codigo,
            tipo_acao: mockSolicitacao.acao_aprovacao.tipo_acao,
            aprovador: payload.aprovadorId,
            justificativa: payload.justificativa,
            timestamp: payload.timestamp
          }
        }));
      });

      it('deve notificar setor financeiro quando aplicável', async () => {
        const solicitacaoComFinanceiro = {
          ...mockSolicitacao,
          acao_aprovacao: {
            ...mockSolicitacao.acao_aprovacao,
            notificar_financeiro: true
          }
        };

        const payload = {
          solicitacao: solicitacaoComFinanceiro,
          aprovadorId: 'aprovador-1',
          solicitanteId: 'user-1',
          justificativa: 'Aprovado',
          timestamp: new Date()
        };

        await ablyListener.handleSolicitacaoAprovada(payload);

        expect(mockNotificationOrchestrator.publishBroadcast).toHaveBeenCalledWith(expect.objectContaining({
          type: NotificationType.INFO,
          priority: NotificationPriority.NORMAL,
          title: 'Solicitação Aprovada - Financeiro',
          message: `Solicitação ${solicitacaoComFinanceiro.codigo} aprovada e requer atenção do financeiro.`,
          data: {
            id: solicitacaoComFinanceiro.id,
            codigo: solicitacaoComFinanceiro.codigo,
            tipo_acao: solicitacaoComFinanceiro.acao_aprovacao.tipo_acao,
            solicitante: payload.solicitanteId,
            aprovador: payload.aprovadorId,
            timestamp: payload.timestamp
          }
        }), {
          type: 'role',
          value: 'FINANCEIRO'
        });
      });
    });

    describe('handleSolicitacaoRejeitada', () => {
      it('deve enviar notificação Ably para solicitante quando rejeitada', async () => {
        const payload = {
          solicitacao: mockSolicitacao,
          aprovadorId: 'aprovador-1',
          solicitanteId: 'user-1',
          justificativa: 'Não atende aos critérios',
          timestamp: new Date()
        };

        await ablyListener.handleSolicitacaoRejeitada(payload);

        expect(mockNotificationOrchestrator.publishNotification).toHaveBeenCalledWith('user-1', expect.objectContaining({
          type: NotificationType.ERROR,
          priority: NotificationPriority.HIGH,
          title: 'Solicitação Rejeitada',
          message: `Sua solicitação ${mockSolicitacao.codigo} foi rejeitada.`,
          data: {
            id: mockSolicitacao.id,
            codigo: mockSolicitacao.codigo,
            tipo_acao: mockSolicitacao.acao_aprovacao.tipo_acao,
            aprovador: payload.aprovadorId,
            justificativa: payload.justificativa,
            timestamp: payload.timestamp
          }
        }));
      });
    });

    describe('handleSolicitacaoExecutada', () => {
      it('deve enviar notificação Ably para solicitante quando executada', async () => {
        const payload = {
          solicitacao: mockSolicitacao,
          solicitanteId: 'user-1',
          resultado: { usuario_criado: 'novo-usuario' },
          timestamp: new Date()
        };

        await ablyListener.handleSolicitacaoExecutada(payload);

        expect(mockNotificationOrchestrator.publishNotification).toHaveBeenCalledWith('user-1', expect.objectContaining({
          type: NotificationType.SUCCESS,
          priority: NotificationPriority.HIGH,
          title: 'Solicitação Executada',
          message: `Sua solicitação ${mockSolicitacao.codigo} foi executada com sucesso.`,
          data: {
            id: mockSolicitacao.id,
            codigo: mockSolicitacao.codigo,
            tipo_acao: mockSolicitacao.acao_aprovacao.tipo_acao,
            resultado: payload.resultado,
            timestamp: payload.timestamp
          }
        }));
      });
    });

    describe('handleSolicitacaoErroExecucao', () => {
      it('deve notificar solicitante e administradores sobre erro', async () => {
        const payload = {
          solicitacao: mockSolicitacao,
          solicitanteId: 'user-1',
          erro: 'Erro ao criar usuário',
          timestamp: new Date()
        };

        await ablyListener.handleSolicitacaoErroExecucao(payload);

        // Verifica notificação ao solicitante
        expect(mockNotificationOrchestrator.publishNotification).toHaveBeenCalledWith('user-1', expect.objectContaining({
          type: NotificationType.ERROR,
          priority: NotificationPriority.HIGH,
          title: 'Erro na Execução',
          message: `Erro ao executar sua solicitação ${mockSolicitacao.codigo}.`,
          data: {
            id: mockSolicitacao.id,
            codigo: mockSolicitacao.codigo,
            tipo_acao: mockSolicitacao.acao_aprovacao.tipo_acao,
            erro: payload.erro,
            timestamp: payload.timestamp
          }
        }));

        // Verifica notificação aos administradores
        expect(mockNotificationOrchestrator.publishBroadcast).toHaveBeenCalledWith(expect.objectContaining({
          type: NotificationType.ERROR,
          priority: NotificationPriority.URGENT,
          title: 'Erro Crítico na Execução',
          message: `Erro crítico ao executar solicitação ${mockSolicitacao.codigo}.`,
          data: {
            id: mockSolicitacao.id,
            codigo: mockSolicitacao.codigo,
            tipo_acao: mockSolicitacao.acao_aprovacao.tipo_acao,
            solicitante: payload.solicitanteId,
            erro: payload.erro,
            timestamp: payload.timestamp
          }
        }), {
          type: 'role',
          value: 'ADMIN'
        });
      });
    });

    describe('handleAprovadorDecisaoTomada', () => {
      it('deve notificar outros aprovadores sobre decisão tomada', async () => {
        const payload = {
          solicitacaoId: mockSolicitacao.id,
          codigo: mockSolicitacao.codigo,
          aprovadorId: 'aprovador-1',
          decisao: 'APROVADO' as const,
          justificativa: 'Aprovado conforme política',
          outrosAprovadores: ['aprovador-2', 'aprovador-3'],
          timestamp: new Date()
        };

        await ablyListener.handleAprovadorDecisaoTomada(payload);

        expect(mockNotificationOrchestrator.publishNotification).toHaveBeenCalledTimes(2);
        expect(mockNotificationOrchestrator.publishNotification).toHaveBeenCalledWith('aprovador-2', expect.objectContaining({
          type: NotificationType.SUCCESS,
          priority: NotificationPriority.NORMAL,
          title: 'Decisão Tomada',
          message: `Solicitação ${payload.codigo} foi aprovado por outro aprovador.`,
          data: {
            solicitacaoId: payload.solicitacaoId,
            codigo: payload.codigo,
            aprovador: payload.aprovadorId,
            decisao: payload.decisao,
            justificativa: payload.justificativa,
            timestamp: payload.timestamp
          }
        }));
      });
    });

    describe('handleSolicitacaoCancelada', () => {
      it('deve notificar solicitante e aprovadores sobre cancelamento', async () => {
        const payload = {
          solicitacao: mockSolicitacao,
          solicitanteId: 'user-1',
          motivo: 'Cancelado pelo solicitante',
          aprovadores: ['aprovador-1', 'aprovador-2'],
          timestamp: new Date()
        };

        await ablyListener.handleSolicitacaoCancelada(payload);

        // Verifica notificação ao solicitante
        expect(mockNotificationOrchestrator.publishNotification).toHaveBeenCalledWith('user-1', expect.objectContaining({
          type: NotificationType.ERROR,
          priority: NotificationPriority.NORMAL,
          title: 'Solicitação Cancelada',
          message: `Sua solicitação ${mockSolicitacao.codigo} foi cancelada.`,
          data: {
            id: mockSolicitacao.id,
            codigo: mockSolicitacao.codigo,
            tipo_acao: mockSolicitacao.acao_aprovacao.tipo_acao,
            motivo: payload.motivo,
            timestamp: payload.timestamp
          }
        }));

        // Verifica notificações aos aprovadores (chamadas individuais)
        expect(mockNotificationOrchestrator.publishNotification).toHaveBeenCalledWith('aprovador-1', expect.objectContaining({
          type: NotificationType.INFO,
          priority: NotificationPriority.LOW,
          title: 'Solicitação Cancelada',
          message: `Solicitação ${mockSolicitacao.codigo} foi cancelada pelo solicitante.`,
          data: {
            id: mockSolicitacao.id,
            codigo: mockSolicitacao.codigo,
            tipo_acao: mockSolicitacao.acao_aprovacao.tipo_acao,
            solicitante: payload.solicitanteId,
            motivo: payload.motivo,
            timestamp: payload.timestamp
          }
        }));
        
        expect(mockNotificationOrchestrator.publishNotification).toHaveBeenCalledWith('aprovador-2', expect.objectContaining({
          type: NotificationType.INFO,
          priority: NotificationPriority.LOW,
          title: 'Solicitação Cancelada',
          message: `Solicitação ${mockSolicitacao.codigo} foi cancelada pelo solicitante.`,
          data: {
            id: mockSolicitacao.id,
            codigo: mockSolicitacao.codigo,
            tipo_acao: mockSolicitacao.acao_aprovacao.tipo_acao,
            solicitante: payload.solicitanteId,
            motivo: payload.motivo,
            timestamp: payload.timestamp
          }
        }));
        
        expect(mockNotificationOrchestrator.publishNotification).toHaveBeenCalledTimes(3); // 1 solicitante + 2 aprovadores
      });
    });
  });

  describe('Tratamento de Erros', () => {
    it('deve tratar erros na auditoria sem interromper o fluxo', async () => {
      mockAuditEventEmitter.emit.mockRejectedValue(new Error('Erro de auditoria'));

      const payload = {
        solicitacao: mockSolicitacao,
        solicitanteId: 'user-1',
        configuracao: { nome: 'Teste', tipo_acao: 'TESTE', estrategia: 'MANUAL' },
        timestamp: new Date()
      };

      // Não deve lançar exceção
      await expect(auditListener.handleSolicitacaoCriada(payload)).resolves.not.toThrow();
      expect(Logger.prototype.error).toHaveBeenCalled();
    });

    it('deve tratar erros no Ably sem interromper o fluxo', async () => {
      mockNotificationOrchestrator.publishNotification.mockRejectedValue(new Error('Erro de Ably'));

      const payload = {
        solicitacao: mockSolicitacao,
        solicitanteId: 'user-1',
        configuracao: { nome: 'Teste', tipo_acao: 'TESTE' },
        aprovadores: ['aprovador-1'],
        timestamp: new Date()
      };

      // Não deve lançar exceção
      await expect(ablyListener.handleSolicitacaoCriada(payload)).resolves.not.toThrow();
      expect(Logger.prototype.error).toHaveBeenCalled();
    });
  });
});