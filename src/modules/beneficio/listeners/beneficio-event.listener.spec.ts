import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BeneficioEventListener } from './beneficio-event.listener';
import { NotificacaoService } from '../../notificacao/services/notificacao.service';
import { Concessao } from '../../../entities/concessao.entity';
import { 
  BeneficioEvent, 
  BeneficioEventType,
  ConcessaoCreatedEventData,
  ConcessaoStatusChangedEventData,
  ConcessaoSuspendedEventData,
  ConcessaoBlockedEventData,
  ConcessaoReactivatedEventData
} from '../events/beneficio-events';
import { StatusConcessao } from '../../../enums/status-concessao.enum';

describe('BeneficioEventListener', () => {
  let listener: BeneficioEventListener;
  let notificacaoService: jest.Mocked<NotificacaoService>;
  let concessaoRepository: jest.Mocked<Repository<Concessao>>;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const mockNotificacaoService = {
      criarNotificacaoSistema: jest.fn(),
      criarNotificacaoAlerta: jest.fn(),
    };

    const mockConcessaoRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BeneficioEventListener,
        {
          provide: NotificacaoService,
          useValue: mockNotificacaoService,
        },
        {
          provide: getRepositoryToken(Concessao),
          useValue: mockConcessaoRepository,
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    listener = module.get<BeneficioEventListener>(BeneficioEventListener);
    notificacaoService = module.get(NotificacaoService);
    concessaoRepository = module.get(getRepositoryToken(Concessao));
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    // Mock da concessão com relacionamentos
    const mockConcessao = {
      id: '123',
      solicitacao: {
        tecnico_id: '789',
        tipo_beneficio: {
          nome: 'Auxílio Natalidade'
        }
      },
      requerente: {
        id: '789',
        nome: 'João Silva'
      },
      tipo_beneficio: {
        nome: 'Auxílio Natalidade'
      }
    };

    concessaoRepository.findOne.mockResolvedValue(mockConcessao as any);
  });

  it('should be defined', () => {
    expect(listener).toBeDefined();
  });

  describe('handleConcessaoCreatedEvent', () => {
    it('should create system notification when concessao is created', async () => {
      const event: BeneficioEvent & { data: ConcessaoCreatedEventData } = {
        type: BeneficioEventType.CONCESSAO_CREATED,
        concessaoId: '123',
        timestamp: new Date(),
        data: {
          solicitacaoId: '456',
          requerenteId: '789',
          tipoBeneficioId: 'auxilio-natalidade',
          dataInicio: new Date(),
          valor: 1000,
          usuarioCriadorId: 'user123',
        },
      };

      await listener.handleConcessaoCreatedEvent(event);

      expect(notificacaoService.criarNotificacaoSistema).toHaveBeenCalledWith({
        destinatario_id: '789',
        titulo: 'Concessão Criada',
        conteudo: 'Sua concessão para o benefício Auxílio Natalidade foi criada com sucesso.',
        link: '/concessoes/123',
      });
    });
  });

  describe('handleConcessaoStatusChangedEvent', () => {
    it('should create system notification when status is changed', async () => {
      const event: BeneficioEvent & { data: ConcessaoStatusChangedEventData } = {
        type: BeneficioEventType.CONCESSAO_STATUS_CHANGED,
        concessaoId: '123',
        timestamp: new Date(),
        data: {
          statusAnterior: StatusConcessao.ATIVO,
          statusAtual: StatusConcessao.SUSPENSO,
          usuarioId: 'user123',
          observacao: 'Documentação pendente',
          dataAlteracao: new Date(),
        },
      };

      await listener.handleConcessaoStatusChangedEvent(event);

      expect(notificacaoService.criarNotificacaoSistema).toHaveBeenCalledWith({
        destinatario_id: '789',
        titulo: 'Status da Concessão Alterado',
        conteudo: 'O status da sua concessão foi alterado de ativo para suspenso. Documentação pendente',
        link: '/concessoes/123',
      });
    });
  });

  describe('handleConcessaoSuspendedEvent', () => {
    it('should create alert notification when concessao is suspended', async () => {
      const event: BeneficioEvent & { data: ConcessaoSuspendedEventData } = {
        type: BeneficioEventType.CONCESSAO_SUSPENDED,
        concessaoId: '123',
        timestamp: new Date(),
        data: {
          motivoSuspensao: 'Documentação pendente',
          dataSuspensao: new Date(),
          usuarioId: 'user123',
          observacao: 'Documentação pendente',
        },
      };

      await listener.handleConcessaoSuspendedEvent(event);

      expect(notificacaoService.criarNotificacaoAlerta).toHaveBeenCalledWith({
        destinatario_id: '789',
        titulo: 'Concessão Suspensa',
        conteudo: 'Sua concessão foi suspensa. Motivo: Documentação pendente. ',
        entidade_relacionada_id: '123',
        entidade_tipo: 'concessao',
        link: '/concessoes/123',
      });
    });
  });

  describe('handleConcessaoBlockedEvent', () => {
    it('should create alert notification when concessao is blocked', async () => {
      const event: BeneficioEvent & { data: ConcessaoBlockedEventData } = {
        type: BeneficioEventType.CONCESSAO_BLOCKED,
        concessaoId: '123',
        timestamp: new Date(),
        data: {
          motivoBloqueio: 'Descumprimento de regra',
          dataBloqueio: new Date(),
          usuarioId: 'user123',
          observacao: 'Descumprimento de regra',
        },
      };

      await listener.handleConcessaoBlockedEvent(event);

      expect(notificacaoService.criarNotificacaoAlerta).toHaveBeenCalledWith({
        destinatario_id: '789',
        titulo: 'Concessão Bloqueada',
        conteudo: 'Sua concessão foi bloqueada. Motivo: Descumprimento de regra',
        entidade_relacionada_id: '123',
        entidade_tipo: 'concessao',
        link: '/concessoes/detalhes/123',
      });
    });
  });

  describe('handleConcessaoReactivatedEvent', () => {
    it('should create system notification when concessao is reactivated', async () => {
      const event: BeneficioEvent & { data: ConcessaoReactivatedEventData } = {
        type: BeneficioEventType.CONCESSAO_REACTIVATED,
        concessaoId: '123',
        timestamp: new Date(),
        data: {
          dataReativacao: new Date(),
          usuarioId: 'user123',
          observacao: 'Benefício reativado',
          statusAnterior: 'suspenso',
        },
      };

      await listener.handleConcessaoReactivatedEvent(event);

      expect(notificacaoService.criarNotificacaoSistema).toHaveBeenCalledWith({
        destinatario_id: '789',
        titulo: 'Concessão Reativada',
        conteudo: 'Sua concessão foi reativada do status suspenso',
        link: '/concessoes/detalhes/123',
      });
    });
  });
});