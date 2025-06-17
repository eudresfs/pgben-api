import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { NotificacaoProativaService } from '../services/notificacao-proativa.service';
import { NotificacaoService } from '../services/notificacao.service';
import { NotificacaoSistema } from '../../../entities/notification.entity';
import { Solicitacao } from '../../../entities/solicitacao.entity';
import { StatusSolicitacao } from '../../../enums/status-solicitacao.enum';

describe('NotificacaoProativaService', () => {
  let service: NotificacaoProativaService;
  let notificacaoService: jest.Mocked<NotificacaoService>;
  let notificacaoRepository: jest.Mocked<Repository<NotificacaoSistema>>;
  let solicitacaoRepository: jest.Mocked<Repository<Solicitacao>>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let configService: jest.Mocked<ConfigService>;

  const mockNotificacaoService = {
    criar: jest.fn(),
    criarNotificacaoSistema: jest.fn(),
    criarNotificacaoAlerta: jest.fn(),
  };

  const mockNotificacaoRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockSolicitacaoRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificacaoProativaService,
        {
          provide: NotificacaoService,
          useValue: mockNotificacaoService,
        },
        {
          provide: getRepositoryToken(NotificacaoSistema),
          useValue: mockNotificacaoRepository,
        },
        {
          provide: getRepositoryToken(Solicitacao),
          useValue: mockSolicitacaoRepository,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<NotificacaoProativaService>(NotificacaoProativaService);
    notificacaoService = module.get(NotificacaoService);
    notificacaoRepository = module.get(getRepositoryToken(NotificacaoSistema));
    solicitacaoRepository = module.get(getRepositoryToken(Solicitacao));
    eventEmitter = module.get(EventEmitter2);
    configService = module.get(ConfigService);

    // Configurar valores padrão
    mockConfigService.get.mockImplementation((key: string) => {
      const config = {
        'NOTIFICACAO_PRAZO_ALERTA_HORAS': '24,6,1',
        'NOTIFICACAO_LIMPEZA_DIAS': '30',
        'NOTIFICACAO_MAX_TENTATIVAS': '3',
      };
      return config[key];
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Definição do serviço', () => {
    it('deve estar definido', () => {
      expect(service).toBeDefined();
    });
  });

  describe('agendarAlertaPrazo', () => {
    it('deve agendar alerta de prazo com sucesso', async () => {
      const solicitacaoId = 'test-id';
      const prazoLimite = new Date('2024-12-31T23:59:59Z');
      const usuarioId = 'user-id';

      mockNotificacaoService.criar.mockResolvedValue({
        id: 'notification-id',
        recipientId: usuarioId,
      } as any);

      await service.agendarAlertaPrazo(solicitacaoId, prazoLimite, usuarioId);

      // Deve criar 3 alertas (24h, 6h, 1h antes)
      expect(mockNotificacaoService.criar).toHaveBeenCalledTimes(3);
      
      // Verificar se os alertas foram agendados com os horários corretos
      const calls = mockNotificacaoService.criar.mock.calls;
      expect(calls[0][0]).toMatchObject({
        recipientId: usuarioId,
        tipo: 'ALERTA',
        titulo: 'Prazo se aproximando',
      });
    });

    it('deve lidar com erro ao agendar alerta', async () => {
      const solicitacaoId = 'test-id';
      const prazoLimite = new Date();
      const usuarioId = 'user-id';

      mockNotificacaoService.criar.mockRejectedValue(new Error('Erro de banco'));

      await expect(
        service.agendarAlertaPrazo(solicitacaoId, prazoLimite, usuarioId),
      ).rejects.toThrow('Erro de banco');
    });
  });

  describe('cancelarAlertasPrazo', () => {
    it('deve cancelar alertas de prazo existentes', async () => {
      const solicitacaoId = 'test-id';
      
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          { id: 'alert-1', status: 'PENDENTE' },
          { id: 'alert-2', status: 'PENDENTE' },
        ]),
      };

      mockNotificacaoRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      mockNotificacaoRepository.save.mockResolvedValue({} as any);

      const resultado = await service.cancelarAlertasPrazo(solicitacaoId);

      expect(resultado.alertasCancelados).toBe(2);
      expect(mockNotificacaoRepository.save).toHaveBeenCalledTimes(2);
    });
  });

  describe('executarVerificacaoPrazos', () => {
    it('deve verificar prazos e enviar alertas necessários', async () => {
      const agora = new Date();
      const prazoProximo = new Date(agora.getTime() + 2 * 60 * 60 * 1000); // 2 horas
      
      const solicitacoesPendentes = [
        {
          id: 'sol-1',
          usuarioId: 'user-1',
          prazoLimite: prazoProximo,
          status: StatusSolicitacao.PENDENTE,
        },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(solicitacoesPendentes),
      };

      mockSolicitacaoRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      mockNotificacaoService.criarNotificacaoAlerta.mockResolvedValue({} as any);

      await service.executarVerificacaoPrazos();

      expect(mockNotificacaoService.criarNotificacaoAlerta).toHaveBeenCalled();
    });
  });

  describe('executarMonitoramentoSistema', () => {
    it('deve monitorar métricas do sistema', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          total: 100,
          pendentes: 10,
          processando: 5,
          falhas: 2,
        }),
      };

      mockNotificacaoRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      mockNotificacaoService.criarNotificacaoSistema.mockResolvedValue({} as any);

      await service.executarMonitoramentoSistema();

      // Deve verificar métricas
      expect(mockNotificacaoRepository.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('executarLimpezaAutomatica', () => {
    it('deve executar limpeza de notificações antigas', async () => {
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() - 30);

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          { id: 'old-1' },
          { id: 'old-2' },
        ]),
      };

      mockNotificacaoRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      mockNotificacaoRepository.delete.mockResolvedValue({ affected: 2 } as any);

      const resultado = await service.executarLimpezaAutomatica();

      expect(resultado.notificacoesRemovidas).toBe(2);
      expect(mockNotificacaoRepository.delete).toHaveBeenCalled();
    });
  });

  describe('obterEstatisticas', () => {
    it('deve retornar estatísticas das notificações proativas', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          alertas_prazo: 10,
          alertas_sistema: 5,
          arquivadas: 20,
        }),
      };

      mockNotificacaoRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const estatisticas = await service.obterEstatisticas();

      expect(estatisticas).toHaveProperty('alertasPrazoEnviados');
      expect(estatisticas).toHaveProperty('alertasSistemaEnviados');
      expect(estatisticas).toHaveProperty('notificacoesArquivadas');
      expect(estatisticas).toHaveProperty('proximasVerificacoes');
    });
  });

  describe('agendarNotificacao', () => {
    it('deve agendar notificação para data futura', async () => {
      const usuarioId = 'user-id';
      const dadosNotificacao = {
        tipo: 'SISTEMA' as any,
        titulo: 'Teste',
        mensagem: 'Mensagem de teste',
        prioridade: 'medium' as any,
        contexto: { teste: true },
      };
      const dataAgendamento = new Date(Date.now() + 60000); // 1 minuto no futuro

      mockNotificacaoService.criar.mockResolvedValue({
        id: 'scheduled-notification',
      } as any);

      const resultado = await service.agendarNotificacao(
        usuarioId,
        dadosNotificacao,
        dataAgendamento,
      );

      expect(resultado.notificacaoId).toBe('scheduled-notification');
      expect(mockNotificacaoService.criar).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: usuarioId,
          data_agendamento: dataAgendamento,
        }),
      );
    });

    it('deve rejeitar agendamento para data passada', async () => {
      const usuarioId = 'user-id';
      const dadosNotificacao = {
        tipo: 'SISTEMA' as any,
        titulo: 'Teste',
        mensagem: 'Mensagem de teste',
        prioridade: 'medium' as any,
      };
      const dataPassada = new Date(Date.now() - 60000); // 1 minuto no passado

      await expect(
        service.agendarNotificacao(usuarioId, dadosNotificacao, dataPassada),
      ).rejects.toThrow('Data de agendamento deve ser no futuro');
    });
  });

  describe('verificarSaudeSistema', () => {
    it('deve verificar saúde dos componentes do sistema', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          conexoes_ativas: 50,
          memoria_usada: 75,
          cpu_uso: 60,
        }),
      };

      mockNotificacaoRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const saude = await service.verificarSaudeSistema();

      expect(saude).toHaveProperty('status');
      expect(saude).toHaveProperty('componentes');
      expect(saude).toHaveProperty('timestamp');
    });
  });

  describe('Métodos auxiliares', () => {
    describe('calcularDataAlerta', () => {
      it('deve calcular data de alerta corretamente', () => {
        const prazoLimite = new Date('2024-12-31T12:00:00Z');
        const horasAntes = 24;

        // Usar reflexão para acessar método privado
        const dataAlerta = (service as any).calcularDataAlerta(prazoLimite, horasAntes);

        const esperado = new Date('2024-12-30T12:00:00Z');
        expect(dataAlerta.getTime()).toBe(esperado.getTime());
      });
    });

    describe('formatarTempoRestante', () => {
      it('deve formatar tempo restante em horas', () => {
        const agora = new Date();
        const futuro = new Date(agora.getTime() + 2 * 60 * 60 * 1000); // 2 horas

        const formatado = (service as any).formatarTempoRestante(agora, futuro);

        expect(formatado).toBe('2 horas');
      });

      it('deve formatar tempo restante em dias', () => {
        const agora = new Date();
        const futuro = new Date(agora.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 dias

        const formatado = (service as any).formatarTempoRestante(agora, futuro);

        expect(formatado).toBe('3 dias');
      });
    });

    describe('isHorarioComercial', () => {
      it('deve identificar horário comercial corretamente', () => {
        const horarioComercial = new Date('2024-01-15T14:00:00'); // Segunda, 14h
        const foraDosHorarios = new Date('2024-01-15T22:00:00'); // Segunda, 22h
        const fimDeSemana = new Date('2024-01-13T14:00:00'); // Sábado, 14h

        expect((service as any).isHorarioComercial(horarioComercial)).toBe(true);
        expect((service as any).isHorarioComercial(foraDosHorarios)).toBe(false);
        expect((service as any).isHorarioComercial(fimDeSemana)).toBe(false);
      });
    });
  });

  describe('Tratamento de erros', () => {
    it('deve lidar com erro de conexão com banco', async () => {
      mockSolicitacaoRepository.createQueryBuilder.mockImplementation(() => {
        throw new Error('Conexão perdida');
      });

      await expect(service.executarVerificacaoPrazos()).rejects.toThrow('Conexão perdida');
    });

    it('deve lidar com erro na criação de notificação', async () => {
      const solicitacaoId = 'test-id';
      const prazoLimite = new Date();
      const usuarioId = 'user-id';

      mockNotificacaoService.criar.mockRejectedValue(new Error('Falha na criação'));

      await expect(
        service.agendarAlertaPrazo(solicitacaoId, prazoLimite, usuarioId),
      ).rejects.toThrow('Falha na criação');
    });
  });
});