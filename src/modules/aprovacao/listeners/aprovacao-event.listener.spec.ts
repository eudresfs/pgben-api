import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AprovacaoEventListener } from './aprovacao-event.listener';
import { NotificacaoService } from '../../notificacao/services/notificacao.service';
import { AprovacaoEventos } from '../events/aprovacao-events';
import { StatusAprovacao } from '../../../enums/status-aprovacao.enum';

describe('AprovacaoEventListener', () => {
  let listener: AprovacaoEventListener;
  let notificacaoService: jest.Mocked<NotificacaoService>;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const mockNotificacaoService = {
      criarNotificacaoSistema: jest.fn(),
      criarNotificacaoAlerta: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AprovacaoEventListener,
        {
          provide: NotificacaoService,
          useValue: mockNotificacaoService,
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    listener = module.get<AprovacaoEventListener>(AprovacaoEventListener);
    notificacaoService = module.get(NotificacaoService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  it('should be defined', () => {
    expect(listener).toBeDefined();
  });

  describe('handleAprovacaoCriada', () => {
    it('deve chamar o NotificacaoService com os parâmetros corretos', async () => {
      const event = {
        aprovacaoId: 1,
        timestamp: new Date(),
        data: {
          solicitacaoId: 1,
          tipoAprovacao: 'BENEFICIO',
          prioridade: 'ALTA',
          usuarioCriadorId: 1,
        },
      };

      await listener.handleAprovacaoCriada(event);

      expect(mockNotificacaoService.criarNotificacaoSistema).toHaveBeenCalledWith({
        destinatario_id: 1,
        titulo: 'Nova Aprovação Criada',
        conteudo: 'Uma nova aprovação foi criada e está aguardando análise.',
        link: '/aprovacoes/1',
      });
    });
  });

  describe('handleAprovacaoAprovada', () => {
    it('deve chamar o NotificacaoService com os parâmetros corretos', async () => {
      const event = {
        aprovacaoId: 1,
        timestamp: new Date(),
        data: {
          aprovadorId: 1,
          observacaoAprovacao: 'Aprovado conforme documentação',
          solicitanteId: 2,
        },
      };

      await listener.handleAprovacaoAprovada(event);

      expect(mockNotificacaoService.criarNotificacaoSistema).toHaveBeenCalledWith({
        destinatario_id: 2,
        titulo: 'Aprovação Aprovada',
        conteudo: 'Sua solicitação de aprovação foi aprovada.',
        link: '/aprovacoes/1',
      });
    });
  });

  describe('handleAprovacaoRejeitada', () => {
    it('deve chamar o NotificacaoService com os parâmetros corretos', async () => {
      const event = {
        aprovacaoId: 1,
        timestamp: new Date(),
        data: {
          solicitanteId: 2,
          rejeitadoPorId: 1,
          motivo: 'Documentação incompleta',
        },
      };

      await listener.handleAprovacaoRejeitada(event);

      expect(mockNotificacaoService.criarNotificacaoAlerta).toHaveBeenCalledWith({
        destinatario_id: 2,
        titulo: 'Aprovação Rejeitada',
        conteudo: 'Sua solicitação de aprovação foi rejeitada. Motivo: Documentação incompleta',
        entidade_relacionada_id: 1,
        entidade_tipo: 'aprovacao',
        link: '/aprovacoes/1',
      });
    });
  });

  describe('handleAprovacaoCancelada', () => {
    it('deve chamar o NotificacaoService com os parâmetros corretos', async () => {
      const event = {
        aprovacaoId: 1,
        timestamp: new Date(),
        data: {
          solicitanteId: 2,
          canceladoPorId: 1,
          motivo: 'Solicitação cancelada pelo usuário',
        },
      };

      await listener.handleAprovacaoCancelada(event);

      expect(mockNotificacaoService.criarNotificacaoSistema).toHaveBeenCalledWith({
        destinatario_id: 2,
        titulo: 'Aprovação Cancelada',
        conteudo: 'Sua solicitação de aprovação foi cancelada.',
        link: '/aprovacoes/1',
      });
    });
  });

  describe('handlePrazoExpirado', () => {
    it('deve chamar o NotificacaoService com os parâmetros corretos', async () => {
      const event = {
        aprovacaoId: 1,
        timestamp: new Date(),
        data: {
          solicitanteId: 2,
          responsavelId: 1,
          prazo: new Date(),
        },
      };

      await listener.handlePrazoExpirado(event);

      expect(mockNotificacaoService.criarNotificacaoAlerta).toHaveBeenCalledWith({
        destinatario_id: 2,
        titulo: 'Prazo Expirado',
        conteudo: 'O prazo para sua aprovação expirou.',
        entidade_relacionada_id: 1,
        entidade_tipo: 'aprovacao',
        link: '/aprovacoes/1',
      });
    });
  });

  describe('handleComentarioAdicionado', () => {
    it('deve chamar o NotificacaoService com os parâmetros corretos', async () => {
      const event = {
        aprovacaoId: 1,
        timestamp: new Date(),
        data: {
          comentario: 'Comentário sobre a aprovação',
          autorId: 1,
          solicitanteId: 2,
        },
      };

      await listener.handleComentarioAdicionado(event);

      expect(mockNotificacaoService.criarNotificacaoSistema).toHaveBeenCalledWith({
        destinatario_id: 2,
        titulo: 'Novo Comentário',
        conteudo: 'Um novo comentário foi adicionado à sua aprovação.',
        link: '/aprovacoes/1',
      });
    });
  });

  describe('handleDocumentoAnexado', () => {
    it('deve chamar o NotificacaoService com os parâmetros corretos', async () => {
      const event = {
        aprovacaoId: 1,
        timestamp: new Date(),
        data: {
          documentoId: 1,
          tipoDocumento: 'RG',
          anexadoPorId: 2,
          solicitanteId: 2,
        },
      };

      await listener.handleDocumentoAnexado(event);

      expect(mockNotificacaoService.criarNotificacaoSistema).toHaveBeenCalledWith({
        destinatario_id: 2,
        titulo: 'Documento Anexado',
        conteudo: 'Um documento foi anexado à sua aprovação.',
        link: '/aprovacoes/1/documentos',
      });
    });
  });
});