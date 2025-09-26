import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PagamentoEventListener } from './pagamento-event.listener';
import { NotificacaoService } from '../../notificacao/services/notificacao.service';
import { ConcessaoAutoUpdateService } from '../services/concessao-auto-update.service';
import { HistoricoPagamentoService } from '../services/historico-pagamento.service';
import { Pagamento } from '../../../entities/pagamento.entity';
import { Concessao } from '../../../entities/concessao.entity';
import {
  PagamentoEvent,
  PagamentoCreatedEventData,
  PagamentoProcessedEventData,
  PagamentoFailedEventData,
  PagamentoStatusChangedEventData,
  PagamentoApprovedEventData,
  ComprovanteUploadedEventData,
  PagamentoEventType,
} from '../events/pagamento-events';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';
import { SYSTEM_USER_UUID } from '../../../shared/constants/system.constants';

describe('PagamentoEventListener', () => {
  let listener: PagamentoEventListener;
  let notificacaoService: jest.Mocked<NotificacaoService>;
  let eventEmitter: EventEmitter2;
  let pagamentoRepository: any;
  let concessaoRepository: any;
  let historicoPagamentoService: any;
  let concessaoAutoUpdateService: any;

  beforeEach(async () => {
    const mockNotificacaoService = {
      criarNotificacaoSistema: jest.fn(),
      criarNotificacaoAlerta: jest.fn(),
    };

    const mockPagamentoRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    const mockConcessaoRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    const mockConcessaoAutoUpdateService = {
      verificarEAtualizarConcessao: jest.fn(),
    };

    const mockHistoricoPagamentoService = {
      registrarHistorico: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PagamentoEventListener,
        {
          provide: NotificacaoService,
          useValue: mockNotificacaoService,
        },
        {
          provide: getRepositoryToken(Pagamento),
          useValue: mockPagamentoRepository,
        },
        {
          provide: getRepositoryToken(Concessao),
          useValue: mockConcessaoRepository,
        },
        {
          provide: ConcessaoAutoUpdateService,
          useValue: mockConcessaoAutoUpdateService,
        },
        {
          provide: HistoricoPagamentoService,
          useValue: mockHistoricoPagamentoService,
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
    pagamentoRepository = module.get(getRepositoryToken(Pagamento));
    concessaoRepository = module.get(getRepositoryToken(Concessao));
    historicoPagamentoService = module.get(HistoricoPagamentoService);
    concessaoAutoUpdateService = module.get(ConcessaoAutoUpdateService);
  });

  it('should be defined', () => {
    expect(listener).toBeDefined();
  });

  describe('handlePagamentoCreatedEvent', () => {
    it('should create system notification when pagamento is created', async () => {
      const mockPagamento = {
        id: '123',
        valor: 1000,
        status: StatusPagamentoEnum.PENDENTE,
        metodo_pagamento: 'PIX',
        concessao: {
          id: '456',
          solicitacao: {
            tecnico_id: '789',
            beneficiario: { id: 'ben123' },
            solicitante: { id: 'sol123' },
            tipo_beneficio: { id: 'tipo123' },
          },
        },
      };

      pagamentoRepository.findOne.mockResolvedValue(mockPagamento);
      historicoPagamentoService.registrarHistorico.mockResolvedValue(undefined);

      const event: PagamentoEvent & { data: PagamentoCreatedEventData } = {
        pagamentoId: '123',
        type: PagamentoEventType.PAGAMENTO_CREATED,
        timestamp: new Date(),
        data: {
          concessaoId: '456',
          valor: 1000,
          dataVencimento: new Date(),
          usuarioCriadorId: 'user123',
          observacao: 'Pagamento criado',
        },
      };

      await listener.handlePagamentoCreatedEvent(event);

      expect(notificacaoService.criarNotificacaoSistema).toHaveBeenCalledWith({
        destinatario_id: '789',
        titulo: 'Pagamento Criado',
        conteudo:
          'Um novo pagamento foi criado para sua concessão no valor de R$ 1000.00.',
        link: '/pagamentos/detalhes/123',
        dados_contexto: {
          destinatario_id: '789',
          titulo: 'Pagamento Criado',
          conteudo:
            'Um novo pagamento foi criado para sua concessão no valor de R$ 1000.00.',
          link: '/pagamentos/detalhes/123',
          pagamentoId: '123',
        },
      });
    });
  });

  describe('handlePagamentoProcessedEvent', () => {
    it('should create system notification when pagamento is processed', async () => {
      const mockPagamento = {
        id: '123',
        valor: 1000,
        status: StatusPagamentoEnum.PAGO, // Corrigido de PROCESSADO para PAGO
        concessao: {
          id: 'concessao-123',
          solicitacao: {
            id: 'solicitacao-123',
            tecnico_id: '789',
            beneficiario: { id: 'beneficiario-123' },
            solicitante: { id: 'solicitante-123' },
          },
        },
      };

      pagamentoRepository.findOne.mockResolvedValue(mockPagamento);
      historicoPagamentoService.registrarHistorico.mockResolvedValue(undefined);

      const event: PagamentoEvent & { data: PagamentoProcessedEventData } = {
        pagamentoId: '123',
        type: PagamentoEventType.PAGAMENTO_PROCESSED,
        timestamp: new Date(),
        data: {
          valorProcessado: 1000,
          dataProcessamento: new Date(),
          loteId: 'lote-123',
          usuarioProcessadorId: '456',
        },
      };

      await listener.handlePagamentoProcessedEvent(event);

      expect(notificacaoService.criarNotificacaoSistema).toHaveBeenCalledWith({
        destinatario_id: '789',
        titulo: 'Pagamento Processado',
        conteudo:
          'Seu pagamento no valor de R$ 1000.00 foi processado com sucesso.',
        link: '/pagamentos/detalhes/123',
        dados_contexto: {
          destinatario_id: '789',
          titulo: 'Pagamento Processado',
          conteudo:
            'Seu pagamento no valor de R$ 1000.00 foi processado com sucesso.',
          link: '/pagamentos/detalhes/123',
          pagamentoId: '123',
        },
      });
    });
  });

  describe('handlePagamentoFailedEvent', () => {
    it('should create alert notification when pagamento fails', async () => {
      const mockPagamento = {
        id: '123',
        valor: 1000,
        status: StatusPagamentoEnum.CANCELADO,
        concessao: {
          id: 'concessao-123',
          solicitacao: {
            id: 'solicitacao-123',
            tecnico_id: '789',
            beneficiario: { id: 'beneficiario-123' },
            solicitante: { id: 'solicitante-123' },
          },
        },
      };

      pagamentoRepository.findOne.mockResolvedValue(mockPagamento);

      const event: PagamentoEvent & { data: PagamentoFailedEventData } = {
        pagamentoId: '123',
        type: PagamentoEventType.PAGAMENTO_FAILED,
        timestamp: new Date(),
        data: {
          motivoFalha: 'Saldo insuficiente',
          dataFalha: new Date(),
          codigoErro: 'ERR001',
          tentativaReprocessamento: 1,
          usuarioId: '456',
        },
      };

      await listener.handlePagamentoFailedEvent(event);

      expect(notificacaoService.criarNotificacaoAlerta).toHaveBeenCalledWith({
        destinatario_id: '789',
        titulo: 'Falha no Pagamento',
        conteudo:
          'Houve uma falha no processamento do seu pagamento. Motivo: Saldo insuficiente',
        entidade_relacionada_id: '123',
        entidade_tipo: 'pagamento',
        link: '/pagamentos/detalhes/123',
        dados_contexto: {
          destinatario_id: '789',
          titulo: 'Falha no Pagamento',
          conteudo:
            'Houve uma falha no processamento do seu pagamento. Motivo: Saldo insuficiente',
          entidade_relacionada_id: '123',
          entidade_tipo: 'pagamento',
          link: '/pagamentos/detalhes/123',
          pagamentoId: '123',
        },
      });
    });
  });

  describe('handlePagamentoStatusChangedEvent', () => {
    it('should create system notification when pagamento status changes', async () => {
      const mockPagamento = {
        id: '123',
        valor: 1000,
        status: StatusPagamentoEnum.PAGO,
        concessao: {
          id: 'concessao-123',
          solicitacao: {
            id: 'solicitacao-123',
            tecnico_id: '789',
            beneficiario: { id: 'beneficiario-123' },
            solicitante: { id: 'solicitante-123' },
          },
        },
      };

      pagamentoRepository.findOne.mockResolvedValue(mockPagamento);
      historicoPagamentoService.registrarHistorico.mockResolvedValue(undefined);
      concessaoAutoUpdateService.verificarEAtualizarConcessao.mockResolvedValue(
        undefined,
      );

      const event: PagamentoEvent & { data: PagamentoStatusChangedEventData } =
        {
          pagamentoId: '123',
          type: PagamentoEventType.PAGAMENTO_STATUS_CHANGED,
          timestamp: new Date(),
          data: {
            statusAnterior: StatusPagamentoEnum.PENDENTE,
            statusAtual: StatusPagamentoEnum.PAGO,
            observacao: 'Processamento automático',
            usuarioId: '456',
          },
        };

      await listener.handlePagamentoStatusChangedEvent(event);

      expect(notificacaoService.criarNotificacaoSistema).toHaveBeenCalledWith({
        destinatario_id: '789',
        titulo: 'Status do Pagamento Alterado',
        conteudo:
          'O status do seu pagamento foi alterado de pendente para pago. Processamento automático',
        link: '/pagamentos/detalhes/123',
        dados_contexto: {
          destinatario_id: '789',
          titulo: 'Status do Pagamento Alterado',
          conteudo:
            'O status do seu pagamento foi alterado de pendente para pago. Processamento automático',
          link: '/pagamentos/detalhes/123',
          pagamentoId: '123',
        },
      });
    });
  });

  describe('handlePagamentoApprovedEvent', () => {
    it('should create system notification when pagamento is approved', async () => {
      const mockPagamento = {
        id: '123',
        valor: 1000,
        status: StatusPagamentoEnum.LIBERADO,
        concessao: {
          id: 'concessao-123',
          solicitacao: {
            id: 'solicitacao-123',
            tecnico_id: '789',
            beneficiario: { id: 'beneficiario-123' },
            solicitante: { id: 'solicitante-123' },
          },
        },
      };

      pagamentoRepository.findOne.mockResolvedValue(mockPagamento);
      historicoPagamentoService.registrarHistorico.mockResolvedValue(undefined);

      const event: PagamentoEvent & { data: PagamentoApprovedEventData } = {
        pagamentoId: '123',
        type: PagamentoEventType.PAGAMENTO_APPROVED,
        timestamp: new Date(),
        data: {
          valorAprovado: 1000,
          dataAprovacao: new Date(),
          aprovadorId: '456',
          observacaoAprovacao: 'Aprovado conforme documentação',
        },
      };

      await listener.handlePagamentoApprovedEvent(event);

      expect(notificacaoService.criarNotificacaoSistema).toHaveBeenCalledWith({
        destinatario_id: '789',
        titulo: 'Pagamento Aprovado',
        conteudo: 'Seu pagamento no valor de R$ 1000.00 foi aprovado.',
        link: '/pagamentos/detalhes/123',
        dados_contexto: {
          destinatario_id: '789',
          titulo: 'Pagamento Aprovado',
          conteudo: 'Seu pagamento no valor de R$ 1000.00 foi aprovado.',
          link: '/pagamentos/detalhes/123',
          pagamentoId: '123',
        },
      });
    });
  });

  describe('handleComprovanteUploadedEvent', () => {
    it('should create system notification when comprovante is uploaded', async () => {
      const mockPagamento = {
        id: '123',
        valor: 1000,
        status: StatusPagamentoEnum.CONFIRMADO, // Corrigido de COMPROVANTE_ENVIADO para CONFIRMADO
        concessao: {
          id: 'concessao-123',
          solicitacao: {
            id: 'solicitacao-123',
            tecnico_id: '789',
            beneficiario: { id: 'beneficiario-123' },
            solicitante: { id: 'solicitante-123' },
          },
        },
      };

      pagamentoRepository.findOne.mockResolvedValue(mockPagamento);
      historicoPagamentoService.registrarHistorico.mockResolvedValue(undefined);

      const event: PagamentoEvent & { data: ComprovanteUploadedEventData } = {
        pagamentoId: '123',
        type: PagamentoEventType.COMPROVANTE_UPLOADED,
        timestamp: new Date(),
        data: {
          nomeArquivo: 'comprovante.pdf',
          tamanhoArquivo: 1024,
          tipoArquivo: 'application/pdf',
          usuarioUploadId: '456',
          dataUpload: new Date(),
        },
      };

      await listener.handleComprovanteUploadedEvent(event);

      expect(notificacaoService.criarNotificacaoSistema).toHaveBeenCalledWith({
        destinatario_id: '789',
        titulo: 'Comprovante Enviado',
        conteudo:
          'Comprovante de pagamento comprovante.pdf foi enviado com sucesso.',
        link: '/pagamentos/detalhes/123/comprovantes',
        dados_contexto: {
          destinatario_id: '789',
          titulo: 'Comprovante Enviado',
          conteudo:
            'Comprovante de pagamento comprovante.pdf foi enviado com sucesso.',
          link: '/pagamentos/detalhes/123/comprovantes',
          pagamentoId: '123',
        },
      });
    });
  });
});
