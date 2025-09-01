import { Test, TestingModule } from '@nestjs/testing';
import { NotificationContextFactory } from '../notification-context.factory';
import {
  NotificationChannel,
  NotificationPriority,
  NotificationType,
  PagamentoEventType
} from '../../interfaces/base-notification.interface';
import { SYSTEM_USER_UUID } from '../../../../shared/constants/system.constants';

describe('NotificationContextFactory', () => {
  let factory: NotificationContextFactory;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationContextFactory]
    }).compile();

    factory = module.get<NotificationContextFactory>(NotificationContextFactory);
  });

  describe('criarContextoSolicitacao', () => {
    it('deve criar contexto para nova solicitação', () => {
      // Arrange
      const dadosSolicitacao = {
        id: 'sol-123',
        numero: 'SOL-2024-001',
        usuario_id: 'user-123',
        tipo_beneficio: 'AUXILIO_ALIMENTACAO',
        valor_solicitado: 1000.50,
        status: 'PENDENTE',
        data_criacao: new Date('2024-01-15T10:00:00Z')
      };

      // Act
      const contexto = factory.criarContextoSolicitacao(
        'NOVA_SOLICITACAO',
        dadosSolicitacao
      );

      // Assert
      expect(contexto.user_id).toBe('user-123');
      expect(contexto.titulo).toBe('Nova Solicitação Criada');
      expect(contexto.conteudo).toContain('SOL-2024-001');
      expect(contexto.conteudo).toContain('AUXILIO_ALIMENTACAO');
      expect(contexto.conteudo).toContain('R$ 1.000,50');
      expect(contexto.tipo).toBe(NotificationType.SOLICITACAO);
      expect(contexto.prioridade).toBe(NotificationPriority.MEDIUM);
      expect(contexto.canais).toEqual([NotificationChannel.EMAIL, NotificationChannel.ABLY]);
      expect(contexto.dados.solicitacao_id).toBe('sol-123');
      expect(contexto.dados.numero_solicitacao).toBe('SOL-2024-001');
      expect(contexto.dados.evento).toBe('NOVA_SOLICITACAO');
      expect(contexto.url).toBe('/solicitacoes/sol-123');
      expect(contexto.templates.email).toBe('solicitacao-nova');
      expect(contexto.templates.ably).toBe('solicitacao-nova-ably');
    });

    it('deve criar contexto para solicitação aprovada', () => {
      // Arrange
      const dadosSolicitacao = {
        id: 'sol-456',
        numero: 'SOL-2024-002',
        usuario_id: 'user-456',
        tipo_beneficio: 'VALE_TRANSPORTE',
        valor_solicitado: 500.00,
        status: 'APROVADA',
        data_aprovacao: new Date('2024-01-16T14:30:00Z')
      };

      // Act
      const contexto = factory.criarContextoSolicitacao(
        'SOLICITACAO_APROVADA',
        dadosSolicitacao
      );

      // Assert
      expect(contexto.titulo).toBe('Solicitação Aprovada');
      expect(contexto.conteudo).toContain('aprovada');
      expect(contexto.prioridade).toBe(NotificationPriority.HIGH);
      expect(contexto.dados.evento).toBe('SOLICITACAO_APROVADA');
      expect(contexto.templates.email).toBe('solicitacao-aprovada');
    });

    it('deve criar contexto para solicitação rejeitada', () => {
      // Arrange
      const dadosSolicitacao = {
        id: 'sol-789',
        numero: 'SOL-2024-003',
        usuario_id: 'user-789',
        tipo_beneficio: 'PLANO_SAUDE',
        valor_solicitado: 2000.00,
        status: 'REJEITADA',
        motivo_rejeicao: 'Documentação incompleta'
      };

      // Act
      const contexto = factory.criarContextoSolicitacao(
        'SOLICITACAO_REJEITADA',
        dadosSolicitacao
      );

      // Assert
      expect(contexto.titulo).toBe('Solicitação Rejeitada');
      expect(contexto.conteudo).toContain('rejeitada');
      expect(contexto.conteudo).toContain('Documentação incompleta');
      expect(contexto.prioridade).toBe(NotificationPriority.HIGH);
      expect(contexto.dados.motivo_rejeicao).toBe('Documentação incompleta');
    });

    it('deve usar evento padrão para evento desconhecido', () => {
      // Arrange
      const dadosSolicitacao = {
        id: 'sol-999',
        numero: 'SOL-2024-999',
        usuario_id: 'user-999',
        tipo_beneficio: 'OUTRO',
        valor_solicitado: 100.00,
        status: 'PENDENTE'
      };

      // Act
      const contexto = factory.criarContextoSolicitacao(
        'EVENTO_DESCONHECIDO' as any,
        dadosSolicitacao
      );

      // Assert
      expect(contexto.titulo).toBe('Atualização de Solicitação');
      expect(contexto.conteudo).toContain('atualizada');
      expect(contexto.prioridade).toBe(NotificationPriority.LOW);
      expect(contexto.templates.email).toBe('solicitacao-atualizacao');
    });
  });

  describe('criarContextoPagamento', () => {
    it('deve criar contexto para pagamento processado', () => {
      // Arrange
      const dadosPagamento = {
        id: 'pag-123',
        solicitacao_id: 'sol-123',
        usuario_id: 'user-123',
        valor: 1000.50,
        status: 'PROCESSADO',
        data_processamento: new Date('2024-01-17T09:00:00Z'),
        metodo_pagamento: 'PIX'
      };

      // Act
      const contexto = factory.criarContextoPagamento(
        PagamentoEventType.PROCESSADO,
        dadosPagamento
      );

      // Assert
      expect(contexto.user_id).toBe('user-123');
      expect(contexto.titulo).toBe('Pagamento Processado');
      expect(contexto.conteudo).toContain('R$ 1.000,50');
      expect(contexto.conteudo).toContain('PIX');
      expect(contexto.tipo).toBe(NotificationType.PAGAMENTO);
      expect(contexto.prioridade).toBe(NotificationPriority.HIGH);
      expect(contexto.canais).toEqual([NotificationChannel.EMAIL, NotificationChannel.ABLY, NotificationChannel.SMS]);
      expect(contexto.dados.pagamento_id).toBe('pag-123');
      expect(contexto.dados.valor).toBe(1000.50);
      expect(contexto.dados.evento).toBe(PagamentoEventType.PROCESSADO);
      expect(contexto.url).toBe('/pagamentos/pag-123');
      expect(contexto.templates.email).toBe('pagamento-processado');
    });

    it('deve criar contexto para pagamento falhado', () => {
      // Arrange
      const dadosPagamento = {
        id: 'pag-456',
        solicitacao_id: 'sol-456',
        usuario_id: 'user-456',
        valor: 500.00,
        status: 'FALHADO',
        erro: 'Saldo insuficiente',
        data_falha: new Date('2024-01-17T10:00:00Z')
      };

      // Act
      const contexto = factory.criarContextoPagamento(
        PagamentoEventType.FALHADO,
        dadosPagamento
      );

      // Assert
      expect(contexto.titulo).toBe('Falha no Pagamento');
      expect(contexto.conteudo).toContain('falhou');
      expect(contexto.conteudo).toContain('Saldo insuficiente');
      expect(contexto.prioridade).toBe(NotificationPriority.HIGH);
      expect(contexto.dados.erro).toBe('Saldo insuficiente');
      expect(contexto.templates.email).toBe('pagamento-falhado');
    });

    it('deve criar contexto para pagamento cancelado', () => {
      // Arrange
      const dadosPagamento = {
        id: 'pag-789',
        solicitacao_id: 'sol-789',
        usuario_id: 'user-789',
        valor: 750.00,
        status: 'CANCELADO',
        motivo_cancelamento: 'Solicitação cancelada pelo usuário'
      };

      // Act
      const contexto = factory.criarContextoPagamento(
        PagamentoEventType.CANCELADO,
        dadosPagamento
      );

      // Assert
      expect(contexto.titulo).toBe('Pagamento Cancelado');
      expect(contexto.conteudo).toContain('cancelado');
      expect(contexto.prioridade).toBe(NotificationPriority.MEDIUM);
      expect(contexto.dados.motivo_cancelamento).toBe('Solicitação cancelada pelo usuário');
    });
  });

  describe('criarContextoConcessao', () => {
    it('deve criar contexto para nova concessão', () => {
      // Arrange
      const dadosConcessao = {
        id: 'con-123',
        usuario_id: 'user-123',
        tipo_beneficio: 'AUXILIO_ALIMENTACAO',
        valor_mensal: 500.00,
        data_inicio: new Date('2024-02-01T00:00:00Z'),
        data_fim: new Date('2024-12-31T23:59:59Z'),
        status: 'ATIVA'
      };

      // Act
      const contexto = factory.criarContextoConcessao(
        'NOVA_CONCESSAO',
        dadosConcessao
      );

      // Assert
      expect(contexto.user_id).toBe('user-123');
      expect(contexto.titulo).toBe('Nova Concessão de Benefício');
      expect(contexto.conteudo).toContain('AUXILIO_ALIMENTACAO');
      expect(contexto.conteudo).toContain('R$ 500,00');
      expect(contexto.tipo).toBe(NotificationType.CONCESSAO);
      expect(contexto.prioridade).toBe(NotificationPriority.HIGH);
      expect(contexto.canais).toEqual([NotificationChannel.EMAIL, NotificationChannel.ABLY]);
      expect(contexto.dados.concessao_id).toBe('con-123');
      expect(contexto.dados.valor_mensal).toBe(500.00);
      expect(contexto.url).toBe('/concessoes/con-123');
      expect(contexto.templates.email).toBe('concessao-nova');
    });

    it('deve criar contexto para concessão suspensa', () => {
      // Arrange
      const dadosConcessao = {
        id: 'con-456',
        usuario_id: 'user-456',
        tipo_beneficio: 'VALE_TRANSPORTE',
        valor_mensal: 200.00,
        status: 'SUSPENSA',
        motivo_suspensao: 'Documentação vencida'
      };

      // Act
      const contexto = factory.criarContextoConcessao(
        'CONCESSAO_SUSPENSA',
        dadosConcessao
      );

      // Assert
      expect(contexto.titulo).toBe('Concessão Suspensa');
      expect(contexto.conteudo).toContain('suspensa');
      expect(contexto.conteudo).toContain('Documentação vencida');
      expect(contexto.prioridade).toBe(NotificationPriority.HIGH);
      expect(contexto.dados.motivo_suspensao).toBe('Documentação vencida');
    });
  });

  describe('criarContextoAprovacao', () => {
    it('deve criar contexto para aprovação pendente', () => {
      // Arrange
      const dadosAprovacao = {
        id: 'apr-123',
        solicitacao_id: 'sol-123',
        aprovador_id: 'admin-123',
        tipo: 'SOLICITACAO',
        status: 'PENDENTE',
        prazo_aprovacao: new Date('2024-01-20T23:59:59Z')
      };

      // Act
      const contexto = factory.criarContextoAprovacao(
        'APROVACAO_PENDENTE',
        dadosAprovacao
      );

      // Assert
      expect(contexto.user_id).toBe('admin-123');
      expect(contexto.titulo).toBe('Aprovação Pendente');
      expect(contexto.conteudo).toContain('aguardando aprovação');
      expect(contexto.tipo).toBe(NotificationType.APROVACAO);
      expect(contexto.prioridade).toBe(NotificationPriority.HIGH);
      expect(contexto.canais).toEqual([NotificationChannel.EMAIL, NotificationChannel.ABLY]);
      expect(contexto.dados.aprovacao_id).toBe('apr-123');
      expect(contexto.dados.solicitacao_id).toBe('sol-123');
      expect(contexto.url).toBe('/aprovacoes/apr-123');
      expect(contexto.templates.email).toBe('aprovacao-pendente');
    });

    it('deve criar contexto para aprovação vencida', () => {
      // Arrange
      const dadosAprovacao = {
        id: 'apr-456',
        solicitacao_id: 'sol-456',
        aprovador_id: 'admin-456',
        tipo: 'PAGAMENTO',
        status: 'VENCIDA',
        prazo_aprovacao: new Date('2024-01-15T23:59:59Z')
      };

      // Act
      const contexto = factory.criarContextoAprovacao(
        'APROVACAO_VENCIDA',
        dadosAprovacao
      );

      // Assert
      expect(contexto.titulo).toBe('Aprovação Vencida');
      expect(contexto.conteudo).toContain('venceu');
      expect(contexto.prioridade).toBe(NotificationPriority.HIGH);
      expect(contexto.dados.prazo_vencido).toBe(true);
    });
  });

  describe('criarContextoMonitoramento', () => {
    it('deve criar contexto para alerta crítico', () => {
      // Arrange
      const dadosMonitoramento = {
        tipo_alerta: 'SISTEMA_INDISPONIVEL',
        severidade: 'CRITICA',
        mensagem: 'Sistema de pagamentos indisponível',
        detalhes: {
          servico: 'payment-service',
          erro: 'Connection timeout',
          timestamp: new Date('2024-01-17T15:30:00Z')
        },
        usuarios_afetados: ['admin-123', 'admin-456']
      };

      // Act
      const contexto = factory.criarContextoMonitoramento(
        'ALERTA_CRITICO',
        dadosMonitoramento
      );

      // Assert
      expect(contexto.user_id).toBe('admin-123'); // Primeiro usuário da lista
      expect(contexto.titulo).toBe('Alerta Crítico do Sistema');
      expect(contexto.conteudo).toContain('SISTEMA_INDISPONIVEL');
      expect(contexto.conteudo).toContain('Sistema de pagamentos indisponível');
      expect(contexto.tipo).toBe(NotificationType.MONITORAMENTO);
      expect(contexto.prioridade).toBe(NotificationPriority.CRITICAL);
      expect(contexto.canais).toEqual([NotificationChannel.EMAIL, NotificationChannel.ABLY, NotificationChannel.SMS]);
      expect(contexto.dados.tipo_alerta).toBe('SISTEMA_INDISPONIVEL');
      expect(contexto.dados.severidade).toBe('CRITICA');
      expect(contexto.dados.usuarios_afetados).toEqual(['admin-123', 'admin-456']);
      expect(contexto.templates.email).toBe('monitoramento-critico');
    });

    it('deve criar contexto para alerta de warning', () => {
      // Arrange
      const dadosMonitoramento = {
        tipo_alerta: 'ALTA_LATENCIA',
        severidade: 'WARNING',
        mensagem: 'Latência acima do normal detectada',
        detalhes: {
          servico: 'api-gateway',
          latencia_media: '2.5s',
          threshold: '1s'
        },
        usuarios_afetados: ['admin-123']
      };

      // Act
      const contexto = factory.criarContextoMonitoramento(
        'ALERTA_WARNING',
        dadosMonitoramento
      );

      // Assert
      expect(contexto.titulo).toBe('Alerta de Warning');
      expect(contexto.prioridade).toBe(NotificationPriority.MEDIUM);
      expect(contexto.canais).toEqual([NotificationChannel.EMAIL, NotificationChannel.ABLY]);
      expect(contexto.templates.email).toBe('monitoramento-warning');
    });

    it('deve criar contexto para alerta informativo', () => {
      // Arrange
      const dadosMonitoramento = {
        tipo_alerta: 'MANUTENCAO_PROGRAMADA',
        severidade: 'INFO',
        mensagem: 'Manutenção programada para hoje às 22h',
        detalhes: {
          inicio: '2024-01-17T22:00:00Z',
          fim: '2024-01-18T02:00:00Z',
          servicos_afetados: ['payment-service', 'notification-service']
        },
        usuarios_afetados: ['admin-123']
      };

      // Act
      const contexto = factory.criarContextoMonitoramento(
        'ALERTA_INFO',
        dadosMonitoramento
      );

      // Assert
      expect(contexto.titulo).toBe('Informação do Sistema');
      expect(contexto.prioridade).toBe(NotificationPriority.LOW);
      expect(contexto.canais).toEqual([NotificationChannel.EMAIL]);
      expect(contexto.templates.email).toBe('monitoramento-info');
    });

    it('deve usar primeiro usuário quando lista está vazia', () => {
      // Arrange
      const dadosMonitoramento = {
        tipo_alerta: 'TESTE',
        severidade: 'INFO',
        mensagem: 'Teste sem usuários',
        detalhes: {},
        usuarios_afetados: []
      };

      // Act
      const contexto = factory.criarContextoMonitoramento(
        'ALERTA_INFO',
        dadosMonitoramento
      );

      // Assert
      expect(contexto.user_id).toBe(SYSTEM_USER_UUID); // Valor padrão
    });
  });

  describe('formatarValor', () => {
    it('deve formatar valores monetários corretamente', () => {
      // Act & Assert
      expect((factory as any).formatarValor(1000.50)).toBe('R$ 1.000,50');
      expect((factory as any).formatarValor(500)).toBe('R$ 500,00');
      expect((factory as any).formatarValor(0)).toBe('R$ 0,00');
      expect((factory as any).formatarValor(1234567.89)).toBe('R$ 1.234.567,89');
    });
  });

  describe('formatarData', () => {
    it('deve formatar datas corretamente', () => {
      // Arrange
      const data = new Date('2024-01-17T15:30:45Z');

      // Act
      const resultado = (factory as any).formatarData(data);

      // Assert
      expect(resultado).toMatch(/\d{2}\/\d{2}\/\d{4} às \d{2}:\d{2}/);
    });
  });

  describe('obterCanaisPorPrioridade', () => {
    it('deve retornar canais corretos para prioridade crítica', () => {
      // Act
      const canais = (factory as any).obterCanaisPorPrioridade(NotificationPriority.CRITICAL);

      // Assert
      expect(canais).toEqual([NotificationChannel.EMAIL, NotificationChannel.ABLY, NotificationChannel.SMS]);
    });

    it('deve retornar canais corretos para prioridade alta', () => {
      // Act
      const canais = (factory as any).obterCanaisPorPrioridade(NotificationPriority.HIGH);

      // Assert
      expect(canais).toEqual([NotificationChannel.EMAIL, NotificationChannel.ABLY]);
    });

    it('deve retornar canais corretos para prioridade média', () => {
      // Act
      const canais = (factory as any).obterCanaisPorPrioridade(NotificationPriority.MEDIUM);

      // Assert
      expect(canais).toEqual([NotificationChannel.EMAIL, NotificationChannel.ABLY]);
    });

    it('deve retornar canais corretos para prioridade baixa', () => {
      // Act
      const canais = (factory as any).obterCanaisPorPrioridade(NotificationPriority.LOW);

      // Assert
      expect(canais).toEqual([NotificationChannel.EMAIL]);
    });
  });
});