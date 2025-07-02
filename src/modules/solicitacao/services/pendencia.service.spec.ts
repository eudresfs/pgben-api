import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { PendenciaService } from './pendencia.service';
import { Pendencia } from '../../../entities/pendencia.entity';
import { Solicitacao } from '../../../entities/solicitacao.entity';
import { Usuario } from '../../../entities/usuario.entity';
import { StatusPendencia } from '../../../entities/pendencia.entity';
import { AuditEventEmitter } from '../../auditoria/events/emitters/audit-event.emitter';
import { EventosService } from './eventos.service';
import { NotificacaoService } from '../../notificacao/services/notificacao.service';
import { PermissionService } from '../../../auth/services/permission.service';
import { CreatePendenciaDto } from '../dto/pendencia/create-pendencia.dto';
import { ResolverPendenciaDto } from '../dto/pendencia/resolver-pendencia.dto';
import { CancelarPendenciaDto } from '../dto/pendencia/cancelar-pendencia.dto';

describe('PendenciaService', () => {
  let service: PendenciaService;
  let pendenciaRepository: Repository<Pendencia>;
  let solicitacaoRepository: Repository<Solicitacao>;
  let usuarioRepository: Repository<Usuario>;
  let auditEventEmitter: AuditEventEmitter;
  let eventosService: EventosService;
  let notificacaoService: NotificacaoService;
  let permissionService: PermissionService;

  const mockPendenciaRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockSolicitacaoRepository = {
    findOne: jest.fn(),
  };

  const mockUsuarioRepository = {
    findOne: jest.fn(),
  };

  const mockAuditEventEmitter = {
    emitEntityCreated: jest.fn(),
    emitEntityUpdated: jest.fn(),
    emitEntityDeleted: jest.fn(),
  };

  const mockEventosService = {
    emitirEvento: jest.fn(),
  };

  const mockNotificacaoService = {
    enviarNotificacao: jest.fn(),
  };

  const mockPermissionService = {
    verificarPermissaoSolicitacao: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PendenciaService,
        {
          provide: getRepositoryToken(Pendencia),
          useValue: mockPendenciaRepository,
        },
        {
          provide: getRepositoryToken(Solicitacao),
          useValue: mockSolicitacaoRepository,
        },
        {
          provide: getRepositoryToken(Usuario),
          useValue: mockUsuarioRepository,
        },
        {
          provide: AuditEventEmitter,
          useValue: mockAuditEventEmitter,
        },
        {
          provide: EventosService,
          useValue: mockEventosService,
        },
        {
          provide: NotificacaoService,
          useValue: mockNotificacaoService,
        },
        {
          provide: PermissionService,
          useValue: mockPermissionService,
        },
      ],
    }).compile();

    service = module.get<PendenciaService>(PendenciaService);
    pendenciaRepository = module.get<Repository<Pendencia>>(
      getRepositoryToken(Pendencia),
    );
    solicitacaoRepository = module.get<Repository<Solicitacao>>(
      getRepositoryToken(Solicitacao),
    );
    usuarioRepository = module.get<Repository<Usuario>>(
      getRepositoryToken(Usuario),
    );
    auditEventEmitter = module.get<AuditEventEmitter>(AuditEventEmitter);
    eventosService = module.get<EventosService>(EventosService);
    notificacaoService = module.get<NotificacaoService>(NotificacaoService);
    permissionService = module.get<PermissionService>(PermissionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('criarPendencia', () => {
    it('deve criar uma pendência com sucesso', async () => {
      const criarPendenciaDto: CreatePendenciaDto = {
        solicitacao_id: 'solicitacao-id',
        descricao: 'Pendência de teste',
        prazo_resolucao: new Date('2024-12-31'),
      };
      const usuarioId = 'usuario-id';

      const solicitacao = { id: 'solicitacao-id' };
      const pendenciaCriada = {
        id: 'pendencia-id',
        ...criarPendenciaDto,
        registrado_por_id: usuarioId,
        status: StatusPendencia.ABERTA,
        created_at: new Date(),
      };

      mockSolicitacaoRepository.findOne.mockResolvedValue(solicitacao);
      mockPendenciaRepository.create.mockReturnValue(pendenciaCriada);
      mockPendenciaRepository.save.mockResolvedValue(pendenciaCriada);
      mockPendenciaRepository.findOne.mockResolvedValue({
        ...pendenciaCriada,
        registrado_por: { id: usuarioId, nome: 'Usuário Teste' },
        resolvido_por: null,
      });

      const resultado = await service.criarPendencia(
        criarPendenciaDto,
        usuarioId,
      );

      expect(mockSolicitacaoRepository.findOne).toHaveBeenCalledWith({
        where: { id: criarPendenciaDto.solicitacao_id },
      });
      expect(mockPendenciaRepository.create).toHaveBeenCalledWith({
        ...criarPendenciaDto,
        registrado_por_id: usuarioId,
        status: StatusPendencia.ABERTA,
      });
      expect(mockPendenciaRepository.save).toHaveBeenCalledWith(
        pendenciaCriada,
      );
      expect(mockAuditEventEmitter.emitEntityCreated).toHaveBeenCalled();
      expect(mockEventosService.emitirEvento).toHaveBeenCalled();
      expect(resultado).toBeDefined();
    });

    it('deve lançar NotFoundException quando solicitação não existir', async () => {
      const criarPendenciaDto: CreatePendenciaDto = {
        solicitacao_id: 'solicitacao-inexistente',
        descricao: 'Pendência de teste',
      };
      const usuarioId = 'usuario-id';

      mockSolicitacaoRepository.findOne.mockResolvedValue(null);

      await expect(
        service.criarPendencia(criarPendenciaDto, usuarioId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('resolverPendencia', () => {
    it('deve resolver uma pendência com sucesso', async () => {
      const pendenciaId = 'pendencia-id';
      const resolverDto: ResolverPendenciaDto = {
        resolucao: 'Pendência resolvida',
        observacao_resolucao: 'Observação da resolução',
      };
      const usuarioId = 'usuario-id';

      const pendencia = {
        id: pendenciaId,
        status: StatusPendencia.ABERTA,
        solicitacao_id: 'solicitacao-id',
      };

      const pendenciaAtualizada = {
        ...pendencia,
        status: StatusPendencia.RESOLVIDA,
        resolvido_por_id: usuarioId,
        data_resolucao: expect.any(Date),
        observacao_resolucao: resolverDto.observacao_resolucao,
      };

      mockPendenciaRepository.findOne.mockResolvedValue(pendencia);
      mockPendenciaRepository.save.mockResolvedValue(pendenciaAtualizada);

      const resultado = await service.resolverPendencia(
        pendenciaId,
        resolverDto,
        usuarioId,
      );

      expect(mockPendenciaRepository.findOne).toHaveBeenCalledWith({
        where: { id: pendenciaId },
      });
      expect(mockPendenciaRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: StatusPendencia.RESOLVIDA,
          resolvido_por_id: usuarioId,
          data_resolucao: expect.any(Date),
        }),
      );
      expect(mockAuditEventEmitter.emitEntityUpdated).toHaveBeenCalled();
      expect(mockEventosService.emitirEvento).toHaveBeenCalled();
      expect(resultado).toBeDefined();
    });

    it('deve lançar NotFoundException quando pendência não existir', async () => {
      const pendenciaId = 'pendencia-inexistente';
      const resolverDto: ResolverPendenciaDto = {
        resolucao: 'Pendência resolvida',
      };
      const usuarioId = 'usuario-id';

      mockPendenciaRepository.findOne.mockResolvedValue(null);

      await expect(
        service.resolverPendencia(pendenciaId, resolverDto, usuarioId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('buscarPorId', () => {
    it('deve buscar uma pendência por ID com sucesso', async () => {
      const pendenciaId = 'pendencia-id';
      const pendencia = {
        id: pendenciaId,
        descricao: 'Pendência de teste',
        status: StatusPendencia.ABERTA,
        registrado_por: { id: 'usuario-id', nome: 'Usuário Teste' },
        resolvido_por: null,
      };

      mockPendenciaRepository.findOne.mockResolvedValue(pendencia);

      const resultado = await service.buscarPorId(pendenciaId);

      expect(mockPendenciaRepository.findOne).toHaveBeenCalledWith({
        where: { id: pendenciaId },
        relations: ['registrado_por', 'resolvido_por'],
      });
      expect(resultado).toBeDefined();
    });

    it('deve lançar NotFoundException quando pendência não existir', async () => {
      const pendenciaId = 'pendencia-inexistente';

      mockPendenciaRepository.findOne.mockResolvedValue(null);

      await expect(service.buscarPorId(pendenciaId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('listarPendenciasPorSolicitacao', () => {
    it('deve listar pendências de uma solicitação com permissão', async () => {
      const solicitacaoId = 'solicitacao-id';
      const usuarioId = 'usuario-id';
      const pendencias = [
        {
          id: 'pendencia-1',
          descricao: 'Pendência 1',
          status: StatusPendencia.ABERTA,
        },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(pendencias),
      };

      mockPermissionService.verificarPermissaoSolicitacao.mockResolvedValue(
        true,
      );
      mockPendenciaRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      const resultado = await service.listarPendenciasPorSolicitacao(
        solicitacaoId,
        usuarioId,
      );

      expect(
        mockPermissionService.verificarPermissaoSolicitacao,
      ).toHaveBeenCalledWith(usuarioId, solicitacaoId, 'pendencia.ler');
      expect(resultado).toHaveLength(1);
    });

    it('deve lançar ForbiddenException quando usuário não tem permissão', async () => {
      const solicitacaoId = 'solicitacao-id';
      const usuarioId = 'usuario-id';

      mockPermissionService.verificarPermissaoSolicitacao.mockResolvedValue(
        false,
      );

      await expect(
        service.listarPendenciasPorSolicitacao(solicitacaoId, usuarioId),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
