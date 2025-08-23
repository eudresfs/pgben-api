import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Logger } from '@nestjs/common';
import { AprovacaoService } from './aprovacao.service';
import {
  AcaoAprovacao,
  SolicitacaoAprovacao,
} from '../entities';
import { ConfiguracaoAprovador } from '../entities/configuracao-aprovador.entity';
import { SolicitacaoAprovador } from '../entities/solicitacao-aprovador.entity';
import {
  CriarSolicitacaoDto,
  ProcessarAprovacaoDto,
  CriarAcaoAprovacaoDto,
} from '../dtos';
import {
  StatusSolicitacao,
  EstrategiaAprovacao,
  TipoAcaoCritica,
} from '../enums';
import { Status } from '../../../enums/status.enum';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { NotificacaoService } from '../../notificacao/services/notificacao.service';
import { AprovacaoNotificationService } from './aprovacao-notification.service';
import { NotificationManagerService } from '../../notificacao/services/notification-manager.service';
import { UsuarioService } from '../../usuario/services/usuario.service';
import { AuditEventEmitter } from '../../auditoria/events/emitters/audit-event.emitter';
import { AblyService } from '../../notificacao/services/ably.service';
import { ExecucaoAcaoService } from './execucao-acao.service';
import { PermissionService } from '../../../auth/services/permission.service';

/**
 * Testes unitários para o AprovacaoService
 * Cobre as principais funcionalidades do sistema de aprovação simplificado
 */
describe('AprovacaoService', () => {
  let service: AprovacaoService;
  let acaoAprovacaoRepository: Repository<AcaoAprovacao>;
  let solicitacaoAprovacaoRepository: Repository<SolicitacaoAprovacao>;
  let configuracaoAprovadorRepository: Repository<ConfiguracaoAprovador>;
  let solicitacaoAprovadorRepository: Repository<SolicitacaoAprovador>;

  // Mocks dos repositórios
  const mockAcaoAprovacaoRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  const mockSolicitacaoAprovacaoRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      innerJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
      getMany: jest.fn().mockResolvedValue([]),
      select: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
    })),
  };

  const mockConfiguracaoAprovadorRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      delete: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 0 })
    }))
  };

  const mockSolicitacaoAprovadorRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue({
      innerJoin: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
      getMany: jest.fn().mockResolvedValue([]),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
    }),
  };

  // Mocks para as dependências do AprovacaoService
  const mockNotificacaoService = {
    enviarNotificacao: jest.fn(),
    criarNotificacaoAprovacao: jest.fn(),
    criarNotificacaoSolicitacao: jest.fn(),
  };

  const mockAprovacaoNotificationService = {
    enviarNotificacaoAprovacao: jest.fn(),
    criarNotificacaoContexto: jest.fn(),
  };

  const mockNotificationManagerService = {
    createNotification: jest.fn(),
    processNotification: jest.fn(),
  };

  const mockUsuarioService = {
    buscarPorId: jest.fn(),
    buscarPorIds: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockAuditEventEmitter = {
    emitEntityCreated: jest.fn(),
    emitEntityUpdated: jest.fn(),
  };

  const mockAblyService = {
    publishMessage: jest.fn(),
  };

  const mockExecucaoAcaoService = {
    executarAcao: jest.fn(),
  };

  const mockPermissionService = {
    hasPermission: jest.fn(),
    createPermissionIfNotExists: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AprovacaoService,
        {
          provide: getRepositoryToken(AcaoAprovacao),
          useValue: mockAcaoAprovacaoRepository,
        },
        {
          provide: getRepositoryToken(SolicitacaoAprovacao),
          useValue: mockSolicitacaoAprovacaoRepository,
        },
        {
          provide: getRepositoryToken(ConfiguracaoAprovador),
          useValue: mockConfiguracaoAprovadorRepository,
        },
        {
          provide: getRepositoryToken(SolicitacaoAprovador),
          useValue: mockSolicitacaoAprovadorRepository,
        },
        {
          provide: NotificacaoService,
          useValue: mockNotificacaoService,
        },
        {
          provide: AprovacaoNotificationService,
          useValue: mockAprovacaoNotificationService,
        },
        {
          provide: NotificationManagerService,
          useValue: mockNotificationManagerService,
        },
        {
          provide: UsuarioService,
          useValue: mockUsuarioService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
        {
          provide: AuditEventEmitter,
          useValue: mockAuditEventEmitter,
        },
        {
          provide: AblyService,
          useValue: mockAblyService,
        },
        {
          provide: ExecucaoAcaoService,
          useValue: mockExecucaoAcaoService,
        },
        {
          provide: PermissionService,
          useValue: mockPermissionService,
        },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            verbose: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AprovacaoService>(AprovacaoService);
    acaoAprovacaoRepository = module.get<Repository<AcaoAprovacao>>(
      getRepositoryToken(AcaoAprovacao),
    );
    solicitacaoAprovacaoRepository = module.get<Repository<SolicitacaoAprovacao>>(
      getRepositoryToken(SolicitacaoAprovacao),
    );
    configuracaoAprovadorRepository = module.get<Repository<ConfiguracaoAprovador>>(
      getRepositoryToken(ConfiguracaoAprovador),
    );
    solicitacaoAprovadorRepository = module.get<Repository<SolicitacaoAprovador>>(
      getRepositoryToken(SolicitacaoAprovador),
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('requerAprovacao', () => {
    it('deve retornar true quando ação requer aprovação', async () => {
      // Arrange
      const tipoAcao = TipoAcaoCritica.CANCELAMENTO_SOLICITACAO;
      const mockAcaoAprovacao = {
        id: 1,
        tipo_acao: tipoAcao,
        status: Status.ATIVO,
      };

      mockAcaoAprovacaoRepository.findOne.mockResolvedValue(mockAcaoAprovacao);

      // Act
      const resultado = await service.requerAprovacao(tipoAcao);

      // Assert
      expect(resultado).toBe(true);
      expect(mockAcaoAprovacaoRepository.findOne).toHaveBeenCalledWith({
        where: { tipo_acao: tipoAcao, status: Status.ATIVO },
      });
    });

    it('deve retornar false quando ação não requer aprovação', async () => {
      // Arrange
      const tipoAcao = TipoAcaoCritica.CANCELAMENTO_SOLICITACAO;
      // Mock para simular que não existe configuração prévia
      mockAcaoAprovacaoRepository.findOne.mockResolvedValue(null);

      // Act
      const resultado = await service.requerAprovacao(tipoAcao);

      // Assert
      expect(resultado).toBe(false);
    });
  });

  describe('obterConfiguracaoAprovacao', () => {
    it('deve retornar configuração quando encontrada', async () => {
      // Arrange
      const tipoAcao = TipoAcaoCritica.CANCELAMENTO_SOLICITACAO;
      const mockConfiguracao = {
        id: 1,
        tipo_acao: tipoAcao,
        estrategia: EstrategiaAprovacao.MAIORIA,
        min_aprovadores: 2,
        status: Status.ATIVO,
        configuracao_aprovadores: [
          { id: 1, usuario_id: '1', perfil: 'admin' },
          { id: 2, usuario_id: '2', perfil: 'supervisor' }
        ],
      };

      mockAcaoAprovacaoRepository.findOne.mockResolvedValue(mockConfiguracao);

      // Act
      const resultado = await service.obterConfiguracaoAprovacao(tipoAcao);

      // Assert
      expect(resultado).toEqual(mockConfiguracao);
    });

    it('deve lançar erro quando configuração não encontrada', async () => {
      // Arrange
      const tipoAcao = TipoAcaoCritica.CANCELAMENTO_SOLICITACAO;
      mockAcaoAprovacaoRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.obterConfiguracaoAprovacao(tipoAcao))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('criarSolicitacao', () => {
    it('deve criar solicitação com sucesso', async () => {
      // Arrange
      const dto: CriarSolicitacaoDto = {
        tipo_acao: TipoAcaoCritica.CANCELAMENTO_SOLICITACAO,
        justificativa: 'Teste de criação',
        dados_acao: { nome: 'João' },
        metodo_execucao: 'POST',
        prazo_aprovacao: new Date('2024-12-31').toISOString(),
      };
      const solicitanteId = '1';

      const mockConfiguracao = {
        id: 1,
        tipo_acao: dto.tipo_acao,
        estrategia: EstrategiaAprovacao.MAIORIA,
        min_aprovadores: 2,
        configuracao_aprovadores: [{ usuario_id: 2 }, { usuario_id: 3 }],
      };

      const mockSolicitacao = {
        id: 1,
        codigo: 'SOL-001',
        ...dto,
        solicitante_id: solicitanteId,
        status: StatusSolicitacao.PENDENTE,
        solicitacao_aprovadores: [],
      };

      mockAcaoAprovacaoRepository.findOne.mockResolvedValueOnce(mockConfiguracao);
      mockSolicitacaoAprovacaoRepository.create.mockReturnValue(mockSolicitacao);
      mockSolicitacaoAprovacaoRepository.save.mockResolvedValue(mockSolicitacao);
      
      // Mock do createQueryBuilder para validação (não deve encontrar solicitação pendente)
       const mockQueryBuilderValidacao = {
         innerJoin: jest.fn().mockReturnThis(),
         leftJoinAndSelect: jest.fn().mockReturnThis(),
         where: jest.fn().mockReturnThis(),
         andWhere: jest.fn().mockReturnThis(),
         getOne: jest.fn().mockResolvedValue(null), // Não há solicitação pendente
         getMany: jest.fn().mockResolvedValue([]),
         select: jest.fn().mockReturnThis(),
         orderBy: jest.fn().mockReturnThis(),
         limit: jest.fn().mockReturnThis(),
         offset: jest.fn().mockReturnThis(),
       };
       
       // Mock do createQueryBuilder para obterSolicitacao (após criação)
       const mockQueryBuilderObter = {
         innerJoin: jest.fn().mockReturnThis(),
         leftJoinAndSelect: jest.fn().mockReturnThis(),
         where: jest.fn().mockReturnThis(),
         andWhere: jest.fn().mockReturnThis(),
         getOne: jest.fn().mockResolvedValue(mockSolicitacao),
         getMany: jest.fn().mockResolvedValue([]),
         select: jest.fn().mockReturnThis(),
         orderBy: jest.fn().mockReturnThis(),
         limit: jest.fn().mockReturnThis(),
         offset: jest.fn().mockReturnThis(),
       };
       
       // Primeira chamada para validação, segunda para obter
       mockSolicitacaoAprovacaoRepository.createQueryBuilder
         .mockReturnValueOnce(mockQueryBuilderValidacao)
         .mockReturnValueOnce(mockQueryBuilderObter);
      
      mockSolicitacaoAprovadorRepository.create.mockImplementation((data) => data);
      mockSolicitacaoAprovadorRepository.save.mockImplementation((data) => Promise.resolve(data));

      // Mock do método privado gerarCodigoSolicitacao
      jest.spyOn(service as any, 'gerarCodigoSolicitacao').mockResolvedValue('SOL-001');

      // Act
      const resultado = await service.criarSolicitacao(dto, solicitanteId);

      // Assert
      expect(resultado).toEqual(mockSolicitacao);
      expect(mockSolicitacaoAprovacaoRepository.save).toHaveBeenCalled();
    });

    it('deve lançar NotFoundException quando configuração não encontrada', async () => {
      // Arrange
      const dto: CriarSolicitacaoDto = {
        tipo_acao: TipoAcaoCritica.ALTERACAO_DADOS_CRITICOS,
        justificativa: 'Teste',
        dados_acao: {},
        metodo_execucao: 'POST',
        prazo_aprovacao: new Date().toISOString(),
      };
      const solicitanteId = '1';

      mockAcaoAprovacaoRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.criarSolicitacao(dto, solicitanteId))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('processarAprovacao', () => {
    it('deve processar aprovação com sucesso', async () => {
      // Arrange
      const solicitacaoId = '1';
      const aprovadorId = '2';
      const aprovado = true;
      const justificativa = 'Aprovado conforme política';

      const mockSolicitacao = {
        id: solicitacaoId,
        codigo: 'SOL-001',
        status: StatusSolicitacao.PENDENTE,
        acao_aprovacao: {
          estrategia: EstrategiaAprovacao.MAIORIA,
          min_aprovadores: 2,
        },
        solicitacao_aprovadores: [
          { id: 1, usuario_id: aprovadorId, aprovado: null },
          { id: 2, usuario_id: 3, aprovado: null },
        ],
        foiRejeitada: jest.fn().mockReturnValue(false),
        podeSerAprovada: jest.fn().mockReturnValue(true),
        calcularAprovacoesNecessarias: jest.fn().mockReturnValue(1)
      };

      const mockAprovador = {
        ...mockSolicitacao.solicitacao_aprovadores[0],
        jaDecidiu: jest.fn().mockReturnValue(false),
        aprovar: jest.fn(),
        rejeitar: jest.fn()
      };

      // Mock do createQueryBuilder para retornar a solicitação
      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockSolicitacao),
        getMany: jest.fn().mockResolvedValue([]),
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
      };
      mockSolicitacaoAprovacaoRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      
      // Mock do createQueryBuilder para buscar aprovador
       const mockAprovadorQueryBuilder = {
         innerJoin: jest.fn().mockReturnThis(),
         leftJoin: jest.fn().mockReturnThis(),
         leftJoinAndSelect: jest.fn().mockReturnThis(),
         where: jest.fn().mockReturnThis(),
         andWhere: jest.fn().mockReturnThis(),
         getOne: jest.fn().mockResolvedValue(mockAprovador),
         getMany: jest.fn().mockResolvedValue([]),
         select: jest.fn().mockReturnThis(),
         addSelect: jest.fn().mockReturnThis(),
         orderBy: jest.fn().mockReturnThis(),
         limit: jest.fn().mockReturnThis(),
         offset: jest.fn().mockReturnThis(),
       };
       mockSolicitacaoAprovadorRepository.createQueryBuilder.mockReturnValue(mockAprovadorQueryBuilder);
      mockSolicitacaoAprovadorRepository.findOne.mockResolvedValue(mockAprovador);
      mockSolicitacaoAprovadorRepository.save.mockResolvedValue({
        ...mockAprovador,
        aprovado: true,
        justificativa_decisao: justificativa,
        decidido_em: new Date(),
      });
      mockSolicitacaoAprovacaoRepository.save.mockResolvedValue(mockSolicitacao);

      // Act
      const resultado = await service.processarAprovacao(solicitacaoId, aprovadorId, aprovado, justificativa);

      // Assert
      expect(resultado).toBeDefined();
      expect(mockSolicitacaoAprovadorRepository.save).toHaveBeenCalled();
    });

    it('deve lançar erro quando solicitação não encontrada', async () => {
      // Arrange
      const solicitacaoId = '999';
      const aprovadorId = '1';
      const aprovado = true;

      // Mock do createQueryBuilder para retornar null (solicitação não encontrada)
      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
        getMany: jest.fn().mockResolvedValue([]),
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
      };
      mockSolicitacaoAprovacaoRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act & Assert
      await expect(service.processarAprovacao(solicitacaoId, aprovadorId, aprovado))
        .rejects.toThrow(NotFoundException);
    });

    it('deve lançar erro quando solicitação já foi processada', async () => {
      // Arrange
      const solicitacaoId = '1';
      const aprovadorId = '1';
      const aprovado = true;

      const mockSolicitacao = {
        id: solicitacaoId,
        status: StatusSolicitacao.APROVADA,
      };

      // Mock do createQueryBuilder para retornar a solicitação processada
      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockSolicitacao),
        getMany: jest.fn().mockResolvedValue([]),
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
      };
      mockSolicitacaoAprovacaoRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act & Assert
      await expect(service.processarAprovacao(solicitacaoId, aprovadorId, aprovado))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('criarAcaoAprovacao', () => {
    it('deve criar nova ação de aprovação', async () => {
      // Arrange
      const dto: CriarAcaoAprovacaoDto = {
        tipo_acao: TipoAcaoCritica.EXCLUSAO_REGISTRO,
        nome: 'Criação de Usuário',
        descricao: 'Aprovação para criação de novos usuários',
        estrategia: EstrategiaAprovacao.MAIORIA,
        min_aprovadores: 2,
        status: Status.ATIVO,
      };

      const mockAcaoAprovacao = { id: 1, ...dto };

      // Reset completo do mock
      mockAcaoAprovacaoRepository.findOne.mockReset();
      mockAcaoAprovacaoRepository.create.mockReset();
      mockAcaoAprovacaoRepository.save.mockReset();
      
      // Configurar mocks para este teste específico
      mockAcaoAprovacaoRepository.findOne.mockResolvedValue(null);
      mockAcaoAprovacaoRepository.create.mockReturnValue(mockAcaoAprovacao);
      mockAcaoAprovacaoRepository.save.mockResolvedValue(mockAcaoAprovacao);

      // Act
      const resultado = await service.criarAcaoAprovacao(dto);

      // Assert
      expect(resultado).toEqual(mockAcaoAprovacao);
      expect(mockAcaoAprovacaoRepository.save).toHaveBeenCalled();
    });

    it('deve criar nova ação quando não existe', async () => {
      // Arrange
      const dto: CriarAcaoAprovacaoDto = {
        tipo_acao: TipoAcaoCritica.APROVACAO_EMERGENCIAL,
        nome: 'Alteração de Dados Críticos',
        descricao: 'Aprovação para alteração de dados críticos',
        estrategia: EstrategiaAprovacao.MAIORIA,
        min_aprovadores: 2
      };

      const mockNovaAcao = {
        id: 1,
        ...dto,
        status: Status.ATIVO
      };

      mockAcaoAprovacaoRepository.findOne.mockResolvedValue(null);
      mockAcaoAprovacaoRepository.create.mockReturnValue(mockNovaAcao);
      mockAcaoAprovacaoRepository.save.mockResolvedValue(mockNovaAcao);
      // Não precisa mockar criarAprovadores pois não existe

      // Act
      const resultado = await service.criarAcaoAprovacao(dto);

      // Assert
      expect(resultado).toEqual(mockNovaAcao);
      expect(mockAcaoAprovacaoRepository.create).toHaveBeenCalledWith({
        tipo_acao: dto.tipo_acao,
        nome: dto.nome,
        descricao: dto.descricao,
        estrategia: dto.estrategia,
        min_aprovadores: dto.min_aprovadores,
        status: Status.ATIVO
      });
    });
  });

  describe('adicionarAprovador', () => {
    it('deve adicionar aprovador com sucesso', async () => {
      // Arrange
      const acaoId = '1';
      const usuarioId = '2';

      const mockAcao = {
        id: acaoId,
        tipo_acao: TipoAcaoCritica.CANCELAMENTO_SOLICITACAO,
        aprovadores: [],
      };

      const mockAprovador = {
        id: 1,
        acao_aprovacao_id: acaoId,
        usuario_id: usuarioId,
        status: Status.ATIVO,
      };

      mockAcaoAprovacaoRepository.findOne.mockResolvedValue(mockAcao);
      mockConfiguracaoAprovadorRepository.findOne.mockResolvedValue(null);
      mockConfiguracaoAprovadorRepository.create.mockReturnValue(mockAprovador);
      mockConfiguracaoAprovadorRepository.save.mockResolvedValue(mockAprovador);

      // Act
      const resultado = await service.adicionarAprovador(acaoId, usuarioId);

      // Assert
      expect(resultado).toEqual(mockAprovador);
      expect(mockConfiguracaoAprovadorRepository.save).toHaveBeenCalled();
    });

    it('deve lançar erro quando ação não encontrada', async () => {
      // Arrange
      const acaoId = '999';
      const usuarioId = '1';

      mockAcaoAprovacaoRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.adicionarAprovador(acaoId, usuarioId))
        .rejects.toThrow(NotFoundException);
    });

    it('deve lançar erro quando aprovador já existe', async () => {
      // Arrange
      const acaoId = '1';
      const usuarioId = '2';

      const mockAcao = { id: acaoId };
      const mockAprovadorExistente = {
        id: 1,
        acao_aprovacao_id: acaoId,
        usuario_id: usuarioId,
        status: Status.ATIVO,
      };

      mockAcaoAprovacaoRepository.findOne.mockResolvedValue(mockAcao);
      mockConfiguracaoAprovadorRepository.findOne.mockResolvedValue(mockAprovadorExistente);

      // Act & Assert
      await expect(service.adicionarAprovador(acaoId, usuarioId))
        .rejects.toThrow(BadRequestException);
    });
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });
});