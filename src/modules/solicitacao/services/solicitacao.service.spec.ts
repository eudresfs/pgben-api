import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, Connection, DataSource } from 'typeorm';
import { SolicitacaoService } from './solicitacao.service';
import { SolicitacaoRepository } from '../repositories/solicitacao.repository';
import {
  Solicitacao,
  HistoricoSolicitacao,
  StatusSolicitacao,
  Pendencia,
  ProcessoJudicial,
  DeterminacaoJudicial,
  TipoBeneficio,
} from '../../../entities';
import { CreateSolicitacaoDto } from '../dto/create-solicitacao.dto';
import { ValidacaoExclusividadeService } from './validacao-exclusividade.service';
import { CidadaoService } from '../../cidadao/services/cidadao.service';
import { AuditEventEmitter } from '../../auditoria/events/emitters/audit-event.emitter';
import { FiltrosAvancadosService } from '../../../common/services';
import { EventosService } from './eventos.service';
import { ProcessoJudicialRepository } from '../../judicial/repositories/processo-judicial.repository';
import { HistoricoSolicitacaoRepository } from '../repositories/historico-solicitacao.repository';
import { PendenciaRepository } from '../repositories/pendencia.repository';

/**
 * Testes unitários para o SolicitacaoService
 * Foca especificamente na emissão de eventos durante a criação de solicitações
 */
describe('SolicitacaoService', () => {
  let service: SolicitacaoService;
  let solicitacaoRepository: SolicitacaoRepository;
  let historicoRepository: Repository<HistoricoSolicitacao>;
  let eventosService: EventosService;
  let dataSource: DataSource;
  let module: TestingModule;

  // Mock do SolicitacaoRepository
  const mockSolicitacaoRepository = {
    findOne: jest.fn(),
    buscarPorIdCompleto: jest.fn(),
    buscarPorProtocolo: jest.fn(),
    buscarComFiltros: jest.fn(),
    createScopedQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      getMany: jest.fn(),
    })),
  };

  // Mock do HistoricoSolicitacaoRepository
  const mockHistoricoRepository = {
    criar: jest.fn(),
    buscarPorSolicitacao: jest.fn(),
    buscarPorId: jest.fn(),
  };

  // Mock do EventosService
  const mockEventosService = {
    emitirEventoCriacao: jest.fn(),
    emitirEventoMudancaStatus: jest.fn(),
    emitirEventoAprovacao: jest.fn(),
    emitirEventoRejeicao: jest.fn(),
  };

  // Mock do DataSource para transações
  const mockDataSource = {
    transaction: jest.fn().mockImplementation(async (callback) => {
      const mockEntityManager = {
        save: jest.fn().mockImplementation((entity) => {
          if (entity instanceof Solicitacao) {
            return { ...entity, id: 'mock-solicitacao-id' };
          }
          return entity;
        }),
        create: jest.fn().mockImplementation((EntityClass, data) => data),
      };
      return await callback(mockEntityManager);
    }),
  };

  // Mocks dos serviços de dependência
  const mockValidacaoSolicitacaoService = {
    validarCriacaoSolicitacao: jest.fn(),
  };

  const mockValidacaoExclusividadeService = {
    validarExclusividade: jest.fn(),
  };

  // const mockBeneficiarioService = {
  //   buscarPorId: jest.fn(),
  // };

  // const mockTipoBeneficioService = {
  //   buscarPorId: jest.fn(),
  // };

  const mockUnidadeService = {
    buscarPorId: jest.fn(),
  };

  const mockUsuarioService = {
    buscarPorId: jest.fn(),
  };

  // const mockProtocoloService = {
  //   gerarProximoProtocolo: jest.fn().mockResolvedValue('SOL202400001'),
  // };

  const mockDadosBeneficioFactoryService = {
    criarDadosComplementares: jest.fn(),
    normalizarDadosComplementares: jest.fn().mockReturnValue({}),
  };

  const mockAuditEventEmitter = {
    emitEntityCreated: jest.fn(),
    emitEntityUpdated: jest.fn(),
  };

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        SolicitacaoService,
        {
          provide: SolicitacaoRepository,
          useValue: {
            createScopedQueryBuilder: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
            salvar: jest.fn(),
            buscarComFiltros: jest.fn(),
            buscarPorIdCompleto: jest.fn(),
            buscarPorProtocolo: jest.fn(),
            buscarComPrazosVencidos: jest.fn(),
            buscarProximasDoVencimento: jest.fn(),
          },
        },
        {
          provide: HistoricoSolicitacaoRepository,
          useValue: {
            save: jest.fn(),
            create: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            criar: jest.fn(),
            buscarPorSolicitacao: jest.fn(),
            buscarPorId: jest.fn(),
          },
        },
        {
          provide: PendenciaRepository,
          useValue: {
            save: jest.fn(),
            create: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(HistoricoSolicitacao),
          useValue: {
            save: jest.fn(),
            create: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Pendencia),
          useValue: {
            save: jest.fn(),
            create: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: ProcessoJudicialRepository,
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(DeterminacaoJudicial),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TipoBeneficio),
          useValue: {
            findOne: jest.fn().mockResolvedValue({ id: 'tipo-beneficio-id', status: 'ativo', nome: 'Auxílio Emergencial', codigo: 'AUX', valor: 100 }),
            save: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: Connection,
          useValue: {
            transaction: jest.fn(),
            createQueryRunner: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(),
            createQueryRunner: jest.fn(),
            getRepository: jest.fn().mockReturnValue({
              findOne: jest.fn(),
              save: jest.fn(),
              create: jest.fn(),
            }),
          },
        },
        {
          provide: ValidacaoExclusividadeService,
          useValue: {
            validarExclusividade: jest.fn(),
          },
        },
        {
          provide: CidadaoService,
          useValue: {
            findOne: jest.fn(),
            findById: jest.fn(),
            buscarPorCpf: jest.fn(),
          },
        },
        {
          provide: AuditEventEmitter,
          useValue: mockAuditEventEmitter,
        },
        {
          provide: FiltrosAvancadosService,
          useValue: {
            aplicarFiltros: jest.fn(),
          },
        },
        {
          provide: EventosService,
          useValue: {
            emitirEventoCriacao: jest.fn(),
          },
        },
        {
          provide: 'RenovacaoService',
          useValue: {
            listarSolicitacoesComElegibilidade: jest.fn(),
            validarElegibilidadeRenovacao: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SolicitacaoService>(SolicitacaoService);
    solicitacaoRepository = module.get<SolicitacaoRepository>(SolicitacaoRepository);
    historicoRepository = module.get<Repository<HistoricoSolicitacao>>(getRepositoryToken(HistoricoSolicitacao));
    eventosService = module.get<EventosService>(EventosService);
    dataSource = module.get<DataSource>(DataSource);

    // Reset dos mocks antes de cada teste
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('deve emitir evento CREATED após criar solicitação com sucesso', async () => {
       // Arrange
       const createSolicitacaoDto = {
         beneficiario_id: 'beneficiario-id',
         tipo_beneficio_id: 'tipo-beneficio-id',
         unidade_id: 'unidade-id',
         observacoes: 'Observações de teste',
         dados_complementares: {},
       };
 
       const user = {
         id: 'tecnico-id',
         unidade_id: 'unidade-id',
         escopo: 'GLOBAL',
       };

      const mockSolicitacaoSalva = {
        id: 'mock-solicitacao-id',
        protocolo: 'SOL202400001',
        status: StatusSolicitacao.RASCUNHO,
        ...createSolicitacaoDto,
        data_abertura: new Date(),
      };

      const mockSolicitacaoCompleta = {
        ...mockSolicitacaoSalva,
        beneficiario: { id: 'beneficiario-id', nome: 'João Silva' },
        tipo_beneficio: { id: 'tipo-beneficio-id', nome: 'Auxílio Emergencial' },
        unidade: { id: 'unidade-id', nome: 'Unidade Central' },
        tecnico: { id: 'tecnico-id', nome: 'Maria Santos' },
      };

      // Mock do CidadaoService
      const cidadaoService = module.get<CidadaoService>(CidadaoService);
      const mockBeneficiario = { id: 'beneficiario-id', nome: 'João Silva', unidade_id: 'unidade-id' };
       jest.spyOn(cidadaoService, 'findById').mockResolvedValue(mockBeneficiario as any);

      // Mock do TipoBeneficioRepository
      const tipoBeneficioRepository = module.get<Repository<TipoBeneficio>>(getRepositoryToken(TipoBeneficio));
      const mockTipoBeneficio = { id: 'tipo-beneficio-id', status: 'ativo', nome: 'Auxílio Emergencial', codigo: 'AUX', valor: 100 };
      jest.spyOn(tipoBeneficioRepository, 'findOne').mockResolvedValue(mockTipoBeneficio as any);
      
      // Mock do DataSource para TipoBeneficio e transação
      const mockSolicitacaoRepo = {
        findOne: jest.fn().mockResolvedValue(mockTipoBeneficio),
        create: jest.fn().mockReturnValue(mockSolicitacaoSalva),
        save: jest.fn().mockResolvedValue(mockSolicitacaoSalva),
      };
      const mockHistoricoRepo = {
        save: jest.fn().mockResolvedValue({}),
      };
      
      const mockTipoBeneficioRepo = {
        findOne: jest.fn().mockResolvedValue(mockTipoBeneficio)
      };
      
      jest.spyOn(dataSource, 'getRepository').mockImplementation((entity: any) => {
        const entityName = typeof entity === 'string' ? entity : entity.name;
        if (entityName === 'TipoBeneficio') {
          return mockTipoBeneficioRepo as any;
        }
        if (entityName === 'Solicitacao') {
          return mockSolicitacaoRepo as any;
        }
        if (entityName === 'HistoricoSolicitacao') {
          return mockHistoricoRepo as any;
        }
        return {} as any;
      });
      
      // Mock da transação
       jest.spyOn(dataSource, 'transaction').mockImplementation(async (callback: any) => {
          const mockManager = {
            getRepository: jest.fn().mockImplementation((entity: any) => {
              const entityName = typeof entity === 'string' ? entity : entity.name;
              if (entityName === 'Solicitacao') {
                return mockSolicitacaoRepo;
              }
              if (entityName === 'HistoricoSolicitacao') {
                return mockHistoricoRepo;
              }
              if (entityName === 'TipoBeneficio') {
                return mockTipoBeneficioRepo;
              }
              return {};
            }),
          };
          return await callback(mockManager);
        });

      // Mock do repository para buscar solicitação completa
      jest.spyOn(solicitacaoRepository, 'createScopedQueryBuilder').mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockSolicitacaoCompleta),
      } as any);

      // Mock do EventosService
       (eventosService.emitirEventoCriacao as jest.Mock).mockResolvedValue(undefined);

      // Act
      const resultado = await service.create(createSolicitacaoDto, user);

      // Assert
      expect(resultado).toBeDefined();
      expect(eventosService.emitirEventoCriacao).toHaveBeenCalledTimes(1);
      expect(eventosService.emitirEventoCriacao).toHaveBeenCalledWith(mockSolicitacaoCompleta);
    });

    it('deve registrar erro se falhar ao emitir evento CREATED', async () => {
       // Arrange
       const createSolicitacaoDto = {
         beneficiario_id: 'beneficiario-id',
         tipo_beneficio_id: 'tipo-beneficio-id',
         unidade_id: 'unidade-id',
         observacoes: 'Observações de teste',
         dados_complementares: {},
       };
 
       const user = {
         id: 'tecnico-id',
         unidade_id: 'unidade-id',
         escopo: 'GLOBAL',
       };

      const mockSolicitacaoCompleta = {
        id: 'mock-solicitacao-id',
        protocolo: 'SOL202400001',
        status: StatusSolicitacao.RASCUNHO,
        ...createSolicitacaoDto,
      };

      // Mock do CidadaoService
      const cidadaoService = module.get<CidadaoService>(CidadaoService);
      const mockBeneficiario = { id: 'beneficiario-id', nome: 'João Silva', unidade_id: 'unidade-id' };
       jest.spyOn(cidadaoService, 'findById').mockResolvedValue(mockBeneficiario as any);

      // Mock do TipoBeneficioRepository
      const tipoBeneficioRepository = module.get<Repository<TipoBeneficio>>(getRepositoryToken(TipoBeneficio));
      const mockTipoBeneficio = { id: 'tipo-beneficio-id', status: 'ativo', nome: 'Auxílio Emergencial', codigo: 'AUX', valor: 100 };
      jest.spyOn(tipoBeneficioRepository, 'findOne').mockResolvedValue(mockTipoBeneficio as any);
      
      // Mock do DataSource para TipoBeneficio e transação
      const mockSolicitacaoRepo = {
        findOne: jest.fn().mockResolvedValue(mockTipoBeneficio),
        create: jest.fn().mockReturnValue(mockSolicitacaoCompleta),
        save: jest.fn().mockResolvedValue(mockSolicitacaoCompleta),
      };
      const mockHistoricoRepo = {
        save: jest.fn().mockResolvedValue({}),
      };
      
      const mockTipoBeneficioRepo = {
        findOne: jest.fn().mockResolvedValue(mockTipoBeneficio)
      };
      
      jest.spyOn(dataSource, 'getRepository').mockImplementation((entity: any) => {
         const entityName = typeof entity === 'string' ? entity : entity.name;
         if (entityName === 'TipoBeneficio') {
           return mockTipoBeneficioRepo as any;
         }
         if (entityName === 'Solicitacao') {
           return mockSolicitacaoRepo as any;
         }
         if (entityName === 'HistoricoSolicitacao') {
           return mockHistoricoRepo as any;
         }
         return {} as any;
       });
       
       // Mock da transação
        jest.spyOn(dataSource, 'transaction').mockImplementation(async (callback: any) => {
          const mockManager = {
            getRepository: jest.fn().mockImplementation((entity: any) => {
              const entityName = typeof entity === 'string' ? entity : entity.name;
              if (entityName === 'Solicitacao') {
                return mockSolicitacaoRepo;
              }
              if (entityName === 'HistoricoSolicitacao') {
                return mockHistoricoRepo;
              }
              if (entityName === 'TipoBeneficio') {
                 return mockTipoBeneficioRepo;
               }
              return {};
            }),
          };
          return await callback(mockManager);
        });

      // Mock do repository para buscar solicitação completa
      jest.spyOn(solicitacaoRepository, 'createScopedQueryBuilder').mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockSolicitacaoCompleta),
      } as any);

      // Mock do EventosService para simular que foi chamado (fire-and-forget)
       (eventosService.emitirEventoCriacao as jest.Mock).mockImplementation(() => {
         // Simula chamada fire-and-forget - não deve afetar o resultado
       });

      // Act
      const resultado = await service.create(createSolicitacaoDto, user);

      // Assert
      expect(resultado).toBeDefined();
      expect(eventosService.emitirEventoCriacao).toHaveBeenCalledTimes(1);
      expect(resultado.id).toBe('mock-solicitacao-id');
      expect(resultado.protocolo).toBeDefined();
      expect(resultado.status).toBe(StatusSolicitacao.RASCUNHO);
      expect(eventosService.emitirEventoCriacao).toHaveBeenCalledWith(resultado);
    });

    it('não deve emitir evento se a criação da solicitação falhar', async () => {
      // Arrange
      const createSolicitacaoDto = {
        beneficiario_id: 'beneficiario-id',
        tipo_beneficio_id: 'tipo-beneficio-inexistente',
        unidade_id: 'unidade-id',
        observacoes: 'Observações de teste',
        dados_complementares: {},
      };

      const user = {
        id: 'tecnico-id',
        unidade_id: 'unidade-id',
        escopo: 'GLOBAL',
      };

      // Mock do CidadaoService
      const cidadaoService = module.get<CidadaoService>(CidadaoService);
      jest.spyOn(cidadaoService, 'findById').mockResolvedValue({ id: 'beneficiario-id', nome: 'João Silva' } as any);

      // Mock do DataSource para TipoBeneficio retornar null (não encontrado)
      jest.spyOn(dataSource, 'getRepository').mockReturnValue({
        findOne: jest.fn().mockResolvedValue(null),
      } as any);

      // Mock do EventosService
       (eventosService.emitirEventoCriacao as jest.Mock).mockResolvedValue(undefined);

      // Act & Assert
      await expect(service.create(createSolicitacaoDto, user)).rejects.toThrow('Tipo de beneficio nao encontrado');
      expect(eventosService.emitirEventoCriacao).not.toHaveBeenCalled();
    });
  });
});