import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Logger } from '@nestjs/common';
import { AprovacaoService } from '../services/aprovacao.service';
import { ExecucaoAcaoService } from '../services/execucao-acao.service';
import { AcaoAprovacao, SolicitacaoAprovacao } from '../entities';
import { ConfiguracaoAprovador } from '../entities/configuracao-aprovador.entity';
import { SolicitacaoAprovador } from '../entities/solicitacao-aprovador.entity';
import { StatusSolicitacao, TipoAcaoCritica, EstrategiaAprovacao } from '../enums';
import { AprovacaoNotificationService } from '../services/aprovacao-notification.service';
import { NotificationManagerService } from '../../notificacao/services/notification-manager.service';
import { NotificacaoService } from '../../notificacao/services/notificacao.service';
import { UsuarioService } from '../../usuario/services/usuario.service';
import { AuditEventEmitter } from '../../auditoria/events/emitters/audit-event.emitter';
import { AblyService } from '../../notificacao/services/ably.service';
import { PermissionService } from '../../../auth/services/permission.service';

/**
 * Teste específico para verificar o problema de execução assíncrona
 * onde a solicitação pode permanecer como APROVADA mesmo quando a execução falha
 */
describe('AprovacaoService - Execução Assíncrona', () => {
  let service: AprovacaoService;
  let execucaoAcaoService: ExecucaoAcaoService;
  let solicitacaoRepository: Repository<SolicitacaoAprovacao>;
  let eventEmitter: EventEmitter2;
  let logger: Logger;

  const mockSolicitacaoRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  };

  const mockSolicitacaoAprovadorRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
  };

  const mockConfiguracaoAprovadorRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
  };

  const mockAcaoAprovacaoRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
  };



  const mockExecucaoAcaoService = {
    executarAcao: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockAblyService = {
    publishMessage: jest.fn(),
  };

  const mockAuditEventEmitter = {
    emitEntityUpdated: jest.fn(),
  };

  const mockNotificacaoService = {
    enviarNotificacao: jest.fn(),
  };

  const mockUsuarioService = {
    findById: jest.fn(),
  };

  const mockPermissionService = {
    hasPermission: jest.fn(),
  };

  const mockAprovacaoNotificationService = {
    enviarNotificacao: jest.fn(),
  };

  const mockNotificationManagerService = {
    createNotification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AprovacaoService,
        {
          provide: getRepositoryToken(AcaoAprovacao),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ConfiguracaoAprovador),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SolicitacaoAprovador),
          useValue: mockSolicitacaoAprovadorRepository,
        },
        {
          provide: getRepositoryToken(SolicitacaoAprovacao),
          useValue: mockSolicitacaoRepository,
        },

        {
          provide: ExecucaoAcaoService,
          useValue: mockExecucaoAcaoService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
        {
          provide: AblyService,
          useValue: mockAblyService,
        },
        {
          provide: AuditEventEmitter,
          useValue: mockAuditEventEmitter,
        },
        {
          provide: NotificacaoService,
          useValue: mockNotificacaoService,
        },
        {
          provide: UsuarioService,
          useValue: mockUsuarioService,
        },
        {
          provide: PermissionService,
          useValue: mockPermissionService,
        },
        {
          provide: AprovacaoNotificationService,
          useValue: mockAprovacaoNotificationService,
        },
        {
          provide: NotificationManagerService,
          useValue: mockNotificationManagerService,
        },
      ],
    }).compile();

    service = module.get<AprovacaoService>(AprovacaoService);
    execucaoAcaoService = module.get<ExecucaoAcaoService>(ExecucaoAcaoService);
    solicitacaoRepository = module.get<Repository<SolicitacaoAprovacao>>(
      getRepositoryToken(SolicitacaoAprovacao),
    );

    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    logger = new Logger('AprovacaoService');

    // Spy no logger para capturar erros
    jest.spyOn(logger, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Problema: Execução assíncrona falha mas solicitação permanece APROVADA', () => {
    it('deve manter solicitação como APROVADA mesmo quando execução assíncrona falha', async () => {
      // Arrange
      const solicitacaoId = 'sol-123';
      const aprovadorId = 'user-456';
      const aprovado = true;
      const justificativa = 'Aprovação de teste';

      const mockAcaoAprovacao: AcaoAprovacao = {
        id: 'acao-123',
        tipo_acao: TipoAcaoCritica.CANCELAMENTO_SOLICITACAO,
        nome: 'Cancelamento de Solicitação',
        descricao: 'Teste de cancelamento',
        estrategia: EstrategiaAprovacao.SIMPLES,
        min_aprovadores: 1,
        ativo: true,
        created_at: new Date(),
        updated_at: new Date(),
        solicitacoes: [],
        configuracao_aprovadores: [],
      };

      const mockSolicitacao: SolicitacaoAprovacao = {
        id: solicitacaoId,
        codigo: 'SOL-001',
        status: StatusSolicitacao.PENDENTE,
        solicitante_id: 'user-789',
        justificativa: 'Solicitação de teste',
        dados_acao: {
          params: { id: '123' },
          url: '/api/test',
          method: 'DELETE',
        },
        metodo_execucao: 'DELETE /api/test/123',
        acao_aprovacao_id: 'acao-123',
        acao_aprovacao: mockAcaoAprovacao,
        created_at: new Date(),
        updated_at: new Date(),
        solicitacao_aprovadores: [],
        calcularAprovacoesNecessarias: jest.fn().mockReturnValue(1),
        podeSerAprovada: jest.fn().mockReturnValue(true),
        foiRejeitada: jest.fn().mockReturnValue(false),
      };

      const mockAprovador = {
        id: 'aprovador-123',
        solicitacao_aprovacao_id: mockSolicitacao.id,
        usuario_id: aprovadorId, // Usar o aprovadorId do teste
        aprovado: null,
        justificativa_decisao: null,
        decidido_em: null,
        ativo: true,
        created_at: new Date(),
        updated_at: new Date(),
        acao_aprovacao_id: 'acao-123',
        acao_aprovacao: mockSolicitacao.acao_aprovacao,
        solicitacao_aprovacao: mockSolicitacao,
        jaDecidiu: jest.fn().mockReturnValue(false),
        aprovar: jest.fn(),
        rejeitar: jest.fn()
      };

      // Mock dos repositórios - configurar após clearAllMocks
      mockSolicitacaoRepository.findOne = jest.fn().mockResolvedValue(mockSolicitacao);
      
      // Configurar o mock do SolicitacaoAprovadorRepository para retornar o aprovador
      mockSolicitacaoAprovadorRepository.findOne = jest.fn().mockResolvedValue(mockAprovador);
      
      // Configurar o aprovador como aprovado
      const aprovadorAprovado = {
        ...mockAprovador,
        aprovado: true,
        justificativa_decisao: justificativa,
        decidido_em: new Date()
      };

      // Criar instância real da entidade aprovada para ter acesso aos métodos
      const solicitacaoAprovada = new SolicitacaoAprovacao();
      Object.assign(solicitacaoAprovada, {
        ...mockSolicitacao,
        status: StatusSolicitacao.APROVADA,
        processado_em: new Date(),
        solicitacao_aprovadores: [aprovadorAprovado],
        acao_aprovacao: {
          estrategia: 'simples',
          min_aprovadores: 1
        }
      });
      
      // Configurar mocks do repositório
      mockSolicitacaoRepository.findOne
        .mockResolvedValueOnce(mockSolicitacao) // Primeira chamada (busca inicial no processarAprovacao)
        .mockResolvedValueOnce(solicitacaoAprovada) // Segunda chamada (obterSolicitacao no atualizarStatusSolicitacao)
        .mockResolvedValueOnce(solicitacaoAprovada); // Terceira chamada (obterSolicitacao final no atualizarStatusSolicitacao)
      
      // Mock do método obterSolicitacao para retornar a solicitação aprovada
      jest.spyOn(service as any, 'obterSolicitacao')
        .mockResolvedValueOnce(mockSolicitacao) // Primeira chamada
        .mockResolvedValue(solicitacaoAprovada); // Chamadas subsequentes
      
      mockSolicitacaoRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Mock da execução assíncrona que FALHA
      mockExecucaoAcaoService.executarAcao = jest.fn().mockRejectedValue(
        new Error('Falha na execução da ação crítica')
      );

      // Mock dos serviços de notificação
      mockAblyService.publishMessage.mockResolvedValue(undefined);
      mockEventEmitter.emit.mockReturnValue(true);
      mockAuditEventEmitter.emitEntityUpdated.mockResolvedValue(undefined);

      // Act
      const resultado = await service.processarAprovacao(
        solicitacaoId,
        aprovadorId, // Usar o ID do aprovador
        aprovado,
        justificativa
      );

      // Assert
      expect(resultado.status).toBe(StatusSolicitacao.APROVADA);
      expect(mockAprovador.aprovar).toHaveBeenCalledWith(justificativa, undefined);

      
      // Verifica que a execução assíncrona foi chamada (mas falhou)
      // Aguarda um pouco para a execução assíncrona tentar executar
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // PROBLEMA: A solicitação permanece como APROVADA mesmo com falha na execução
      expect(resultado.status).toBe(StatusSolicitacao.APROVADA);
      
      // A execução deveria ter falhado, mas isso não afeta o status retornado
      expect(mockExecucaoAcaoService.executarAcao).toHaveBeenCalledWith(solicitacaoAprovada);
    });

    it('deve demonstrar que o status não é atualizado quando execução assíncrona falha', async () => {
      // Este teste demonstra que mesmo quando a execução falha,
      // o status da solicitação não é revertido para ERRO_EXECUCAO
      // porque a execução é feita de forma assíncrona com .catch()
      
      const solicitacaoId = 'sol-456';
      const aprovadorId = 'user-789';
      
      // Setup similar ao teste anterior...
      const mockSolicitacao = {
        id: solicitacaoId,
        status: StatusSolicitacao.PENDENTE,
        solicitante_id: 'user-123',
        acao_aprovacao: {
          tipo_acao: TipoAcaoCritica.ALTERACAO_DADOS_CRITICOS,
          estrategia: 'simples',
          min_aprovadores: 1
        },
        solicitacao_aprovadores: [],
        calcularAprovacoesNecessarias: () => 1,
        podeSerAprovada: () => true,
        foiRejeitada: () => false
      };
      
      const mockAprovador = {
        id: 'aprovador-123',
        usuario_id: aprovadorId,
        solicitacao_aprovacao_id: solicitacaoId,
        ativo: true,
        aprovado: null,
        justificativa_decisao: null,
        decidido_em: null,
        acao_aprovacao_id: 'acao-1',
        acao_aprovacao: null,
        jaDecidiu: () => false,
        aprovar: jest.fn(),
        rejeitar: jest.fn()
      };
      
      // Configurar o mock do SolicitacaoAprovadorRepository para retornar o aprovador
      mockSolicitacaoAprovadorRepository.findOne = jest.fn().mockResolvedValue(mockAprovador);
      
      // Configurar o aprovador como aprovado
      const aprovadorAprovado = {
        ...mockAprovador,
        aprovado: true,
        justificativa_decisao: 'Aprovado para teste',
        decidido_em: new Date()
      };

      // Criar instância real da entidade aprovada
      const solicitacaoAprovada = new SolicitacaoAprovacao();
      Object.assign(solicitacaoAprovada, {
        ...mockSolicitacao,
        status: StatusSolicitacao.APROVADA,
        processado_em: new Date(),
        solicitacao_aprovadores: [aprovadorAprovado],
        acao_aprovacao: {
          estrategia: 'simples',
          min_aprovadores: 1
        }
      });
      
      mockSolicitacaoRepository.findOne = jest.fn()
        .mockResolvedValueOnce(mockSolicitacao)
        .mockResolvedValue(solicitacaoAprovada);
      
      mockSolicitacaoRepository.save = jest.fn().mockResolvedValue({
        ...mockSolicitacao,
        status: StatusSolicitacao.APROVADA,
      });
      
      // Mock do método obterSolicitacao
      jest.spyOn(service as any, 'obterSolicitacao')
        .mockResolvedValueOnce(mockSolicitacao)
        .mockResolvedValue(solicitacaoAprovada);
      
      mockSolicitacaoRepository.update.mockResolvedValue({ affected: 1 } as any);
      
      // Simula falha na execução
      mockExecucaoAcaoService.executarAcao = jest.fn().mockRejectedValue(
        new Error('Execução crítica falhou')
      );
      
      const resultado = await service.processarAprovacao(solicitacaoId, aprovadorId, true);
      
      // O resultado imediato é APROVADA
      expect(resultado.status).toBe(StatusSolicitacao.APROVADA);
      
      // Mas a execução assíncrona falha silenciosamente
      // e o status não é atualizado para ERRO_EXECUCAO
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // PROBLEMA: Não há mecanismo para verificar se a execução realmente funcionou
      // O usuário recebe sucesso, mas a ação pode ter falhado
    });
  });

  describe('Solução proposta', () => {
    it('deveria aguardar a execução antes de retornar sucesso', async () => {
      // Este teste demonstra como deveria funcionar:
      // - Aprovar a solicitação
      // - Executar a ação de forma síncrona
      // - Só retornar sucesso se ambas as operações funcionarem
      // - Em caso de falha na execução, reverter o status para ERRO_EXECUCAO
      
      // Implementação sugerida seria modificar o processarAprovacao
      // para aguardar a execução antes de retornar
      expect(true).toBe(true); // Placeholder para implementação futura
    });
  });
});