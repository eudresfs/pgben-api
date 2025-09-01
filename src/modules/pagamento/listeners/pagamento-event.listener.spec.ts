import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PagamentoEventListener } from './pagamento-event.listener';
import { NotificacaoService } from '../../notificacao/services/notificacao.service';
import { PagamentoEventos } from '../events/pagamento-events';
import { StatusPagamento } from '../../../enums/status-pagamento.enum';
import { SYSTEM_USER_UUID } from '../../../shared/constants/system.constants';

describe('PagamentoEventListener', () => {
  let listener: PagamentoEventListener;
  let notificacaoService: jest.Mocked<NotificacaoService>;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const mockNotificacaoService = {
      criarNotificacaoSistema: jest.fn(),
      criarNotificacaoAlerta: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PagamentoEventListener,
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

    listener = module.get<PagamentoEventListener>(PagamentoEventListener);
    notificacaoService = module.get(NotificacaoService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  it('should be defined', () => {
    expect(listener).toBeDefined();
  });

  describe('handlePagamentoCreatedEvent', () => {
    it('should create system notification when pagamento is created', async () => {
      const event: PagamentoEventos.PagamentoCriado = {
        pagamento_id: '123',
        concessao_id: '456',
        cidadao_id: '789',
        valor: 1000,
        data_vencimento: new Date(),
        status: StatusPagamento.PENDENTE,
        created_by: 'user123',
      };

      await listener.handlePagamentoCreatedEvent(event);

      expect(notificacaoService.criarNotificacaoSistema).toHaveBeenCalledWith({
        destinatario_id: '789',
        titulo: 'Pagamento Criado',
        conteudo: 'Um novo pagamento de R$ 1000 foi criado para seu benefício.',
        link: '/pagamentos/123',
      });
    });
  });

  describe('handlePagamentoProcessedEvent', () => {
    it('should create system notification when pagamento is processed', async () => {
      const event: PagamentoEventos.PagamentoProcessado = {
        pagamento_id: '123',
        concessao_id: '456',
        cidadao_id: '789',
        valor: 1000,
        data_processamento: new Date(),
        numero_lote: 'LOTE001',
        processed_by: 'user123',
      };

      await listener.handlePagamentoProcessedEvent(event);

      expect(notificacaoService.criarNotificacaoSistema).toHaveBeenCalledWith({
        destinatario_id: '789',
        titulo: 'Pagamento Processado',
        conteudo: 'Seu pagamento de R$ 1000 foi processado no lote LOTE001.',
        link: '/pagamentos/123',
      });
    });
  });

  describe('handlePagamentoFailedEvent', () => {
    it('should create alert notification when pagamento fails', async () => {
      const event: PagamentoEventos.PagamentoFalhou = {
        pagamento_id: '123',
        concessao_id: '456',
        cidadao_id: '789',
        motivo: 'Dados bancários inválidos',
        data_falha: new Date(),
        codigo_erro: 'ERR001',
        failed_by: SYSTEM_USER_UUID,
      };

      await listener.handlePagamentoFailedEvent(event);

      expect(notificacaoService.criarNotificacaoAlerta).toHaveBeenCalledWith({
        destinatario_id: '789',
        titulo: 'Falha no Pagamento',
        conteudo: 'Houve uma falha no processamento do seu pagamento. Motivo: Dados bancários inválidos',
        link: '/pagamentos/123',
      });
    });
  });

  describe('handlePagamentoStatusChangedEvent', () => {
    it('should create system notification when status is changed', async () => {
      const event: PagamentoEventos.StatusAlterado = {
        pagamento_id: '123',
        concessao_id: '456',
        cidadao_id: '789',
        status_anterior: StatusPagamento.PENDENTE,
        status_atual: StatusPagamento.PAGO,
        data_alteracao: new Date(),
        motivo: 'Pagamento confirmado',
        altered_by: 'user123',
      };

      await listener.handlePagamentoStatusChangedEvent(event);

      expect(notificacaoService.criarNotificacaoSistema).toHaveBeenCalledWith({
        destinatario_id: '789',
        titulo: 'Status do Pagamento Alterado',
        conteudo: 'O status do seu pagamento foi alterado para PAGO. Motivo: Pagamento confirmado',
        link: '/pagamentos/123',
      });
    });
  });

  describe('handlePagamentoApprovedEvent', () => {
    it('should create system notification when pagamento is approved', async () => {
      const event: PagamentoEventos.PagamentoAprovado = {
        pagamento_id: '123',
        concessao_id: '456',
        cidadao_id: '789',
        valor: 1000,
        data_aprovacao: new Date(),
        aprovado_por: 'user123',
      };

      await listener.handlePagamentoApprovedEvent(event);

      expect(notificacaoService.criarNotificacaoSistema).toHaveBeenCalledWith({
        destinatario_id: '789',
        titulo: 'Pagamento Aprovado',
        conteudo: 'Seu pagamento de R$ 1000 foi aprovado e será processado em breve.',
        link: '/pagamentos/123',
      });
    });
  });

  describe('handleComprovanteUploadedEvent', () => {
    it('should create system notification when comprovante is uploaded', async () => {
      const event: PagamentoEventos.ComprovanteUpload = {
        pagamento_id: '123',
        concessao_id: '456',
        cidadao_id: '789',
        arquivo_path: '/uploads/comprovante.pdf',
        data_upload: new Date(),
        uploaded_by: 'user123',
      };

      await listener.handleComprovanteUploadedEvent(event);

      expect(notificacaoService.criarNotificacaoSistema).toHaveBeenCalledWith({
        destinatario_id: '789',
        titulo: 'Comprovante Anexado',
        conteudo: 'Comprovante de pagamento foi anexado com sucesso.',
        link: '/pagamentos/123',
      });
    });
  });
});