import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RenovacaoService } from './renovacao.service';
import { RenovacaoValidationService } from './renovacao-validation.service';
import { DocumentoReutilizacaoService } from './documento-reutilizacao.service';
import { CacheService } from '../../../shared/services/cache.service';
import { DadosBeneficioFactoryService } from './dados-beneficio-factory.service';
import { Solicitacao, Concessao, TipoBeneficio } from '../../../entities';
import { StatusSolicitacao } from '../../../enums/status-solicitacao.enum';
import { TipoSolicitacaoEnum } from '../../../enums/tipo-solicitacao.enum';
import { IniciarRenovacaoDto } from '../dto/renovacao';

/**
 * Testes unitários para o serviço principal de renovação
 * Valida todo o fluxo de criação de solicitações de renovação
 */
describe('RenovacaoService', () => {
  let service: RenovacaoService;
  let solicitacaoRepository: Repository<Solicitacao>;
  let concessaoRepository: Repository<Concessao>;
  let tipoBeneficioRepository: Repository<TipoBeneficio>;
  let renovacaoValidationService: RenovacaoValidationService;
  let documentoReutilizacaoService: DocumentoReutilizacaoService;
  let dataSource: DataSource;

  // Mocks dos repositórios e serviços
  const mockSolicitacaoRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
  };

  const mockConcessaoRepository = {
    findOne: jest.fn(),
  };

  const mockTipoBeneficioRepository = {
    findOne: jest.fn(),
  };

  const mockRenovacaoValidationService = {
    validarElegibilidade: jest.fn(),
  };

  const mockDocumentoReutilizacaoService = {
    reutilizarDocumentos: jest.fn(),
  };

  const mockCacheService = {
    getOrSet: jest.fn(),
    delete: jest.fn(),
    deletePattern: jest.fn(),
    clear: jest.fn(),
    getStats: jest.fn(),
  };

  const mockDadosBeneficioFactoryService = {
    findBySolicitacao: jest.fn(),
    create: jest.fn(),
  };

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      save: jest.fn(),
      findOne: jest.fn(),
      query: jest.fn(),
      getRepository: jest.fn().mockReturnValue({
        update: jest.fn(),
      }),
    },
  };

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RenovacaoService,
        {
          provide: getRepositoryToken(Solicitacao),
          useValue: mockSolicitacaoRepository,
        },
        {
          provide: getRepositoryToken(Concessao),
          useValue: mockConcessaoRepository,
        },
        {
          provide: getRepositoryToken(TipoBeneficio),
          useValue: mockTipoBeneficioRepository,
        },
        {
          provide: RenovacaoValidationService,
          useValue: mockRenovacaoValidationService,
        },
        {
          provide: DocumentoReutilizacaoService,
          useValue: mockDocumentoReutilizacaoService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: DadosBeneficioFactoryService,
          useValue: mockDadosBeneficioFactoryService,
        },
      ],
    }).compile();

    service = module.get<RenovacaoService>(RenovacaoService);
    solicitacaoRepository = module.get<Repository<Solicitacao>>(getRepositoryToken(Solicitacao));
    concessaoRepository = module.get<Repository<Concessao>>(getRepositoryToken(Concessao));
    tipoBeneficioRepository = module.get<Repository<TipoBeneficio>>(getRepositoryToken(TipoBeneficio));
    renovacaoValidationService = module.get<RenovacaoValidationService>(RenovacaoValidationService);
    documentoReutilizacaoService = module.get<DocumentoReutilizacaoService>(DocumentoReutilizacaoService);
    dataSource = module.get<DataSource>(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('iniciarRenovacao', () => {
    const dto: IniciarRenovacaoDto = {
      concessaoId: 'concessao-123',
      observacao: 'Solicitação de renovação do benefício'
    };
    const usuarioId = 'usuario-123';

    it('deve iniciar renovação com sucesso quando elegível', async () => {
      // Arrange
      const mockValidacao = {
        podeRenovar: true,
        motivos: undefined
      };

      const mockSolicitacaoOriginal = {
        id: 'solicitacao-original-123',
        protocolo: 'ORIG2024123456',
        tipo_beneficio_id: 'tipo-123',
        dados_beneficiario: { nome: 'João Silva' },
        dados_socioeconomicos: { renda: 1000 },
        dados_academicos: { escolaridade: 'Superior' },
        concessao: { id: 'concessao-123' }
      };

      const mockNovaSolicitacao = {
        id: 'nova-solicitacao-123',
        protocolo: 'REN2024789012',
        tipo: TipoSolicitacaoEnum.RENOVACAO,
        status: StatusSolicitacao.EM_ANALISE
      };

      // Mock do cache para retornar o resultado da validação
      mockCacheService.getOrSet.mockImplementation(async (key, fn) => {
        return await fn();
      });
      mockRenovacaoValidationService.validarElegibilidade.mockResolvedValue(mockValidacao);
      mockConcessaoRepository.findOne.mockResolvedValue({
        id: 'concessao-123',
        solicitacao: mockSolicitacaoOriginal
      });
      mockSolicitacaoRepository.create.mockReturnValue(mockNovaSolicitacao);
      mockQueryRunner.manager.save.mockResolvedValue(mockNovaSolicitacao);
      mockQueryRunner.manager.findOne.mockResolvedValue({
        id: 'tipo-123',
        codigo: 'AUXILIO_ALIMENTACAO'
      });
      mockDocumentoReutilizacaoService.reutilizarDocumentos.mockResolvedValue(undefined);

      // Act
      const resultado = await service.iniciarRenovacao(dto, usuarioId);

      // Assert
      expect(resultado).toEqual(mockNovaSolicitacao);
      expect(mockRenovacaoValidationService.validarElegibilidade).toHaveBeenCalledWith(dto.concessaoId, usuarioId);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockDocumentoReutilizacaoService.reutilizarDocumentos).toHaveBeenCalled();
    });

    it('deve lançar BadRequestException quando não elegível', async () => {
      // Arrange
      const mockValidacao = {
        podeRenovar: false,
        motivos: ['Concessão deve estar com status CESSADO para ser renovada']
      };

      // Mock do cache para retornar o resultado da validação
      mockCacheService.getOrSet.mockImplementation(async (key, fn) => {
        return await fn();
      });
      mockRenovacaoValidationService.validarElegibilidade.mockResolvedValue(mockValidacao);

      // Act & Assert
      await expect(service.iniciarRenovacao(dto, usuarioId))
        .rejects
        .toThrow(BadRequestException);
      
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('deve lançar NotFoundException quando solicitação original não for encontrada', async () => {
      // Arrange
      const mockValidacao = {
        podeRenovar: true,
        motivos: undefined
      };

      // Mock do cache para retornar o resultado da validação
      mockCacheService.getOrSet.mockImplementation(async (key, fn) => {
        return await fn();
      });
      mockRenovacaoValidationService.validarElegibilidade.mockResolvedValue(mockValidacao);
      mockConcessaoRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.iniciarRenovacao(dto, usuarioId))
        .rejects
        .toThrow(NotFoundException);
      
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('deve fazer rollback em caso de erro durante o processo', async () => {
      // Arrange
      const mockValidacao = {
        podeRenovar: true,
        motivos: undefined
      };

      // Mock do cache para retornar o resultado da validação
      mockCacheService.getOrSet.mockImplementation(async (key, fn) => {
        return await fn();
      });
      mockRenovacaoValidationService.validarElegibilidade.mockResolvedValue(mockValidacao);
      mockConcessaoRepository.findOne.mockRejectedValue(new Error('Erro de banco de dados'));

      // Act & Assert
      await expect(service.iniciarRenovacao(dto, usuarioId))
        .rejects
        .toThrow();
      
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('validarElegibilidadeRenovacao', () => {
    it('deve delegar validação para o serviço de validação com cache', async () => {
      // Arrange
      const concessaoId = 'concessao-123';
      const usuarioId = 'usuario-123';
      const mockResultado = {
        podeRenovar: true,
        motivos: undefined
      };

      // Mock do cache para retornar o resultado da validação
      mockCacheService.getOrSet.mockImplementation(async (key, fn) => {
        return await fn();
      });
      mockRenovacaoValidationService.validarElegibilidade.mockResolvedValue(mockResultado);

      // Act
      const resultado = await service.validarElegibilidadeRenovacao(concessaoId, usuarioId);

      // Assert
      expect(resultado).toEqual(mockResultado);
      expect(mockCacheService.getOrSet).toHaveBeenCalled();
      expect(mockRenovacaoValidationService.validarElegibilidade).toHaveBeenCalledWith(concessaoId, usuarioId);
    });
  });

  describe('criarSolicitacaoRenovacao', () => {
    it('deve criar solicitação de renovação com dados corretos', async () => {
      // Arrange
      const mockSolicitacaoOriginal = {
        id: 'solicitacao-original-123',
        tipo_beneficio_id: 'tipo-123',
        dados_dinamicos: { nome: 'João Silva', renda: 1000, escolaridade: 'Superior' },
        concessao: { id: 'concessao-123' } as any,
        protocolo: 'PROT-123',
        statusAnterior: null,
        usuarioAlteracao: null,
        observacaoAlteracao: null
      } as any;

      const observacao = 'Renovação necessária';
      const usuarioId = 'usuario-123';

      const mockNovaSolicitacao = {
        id: 'nova-solicitacao-123',
        protocolo: 'REN2024789012',
        tipo: TipoSolicitacaoEnum.RENOVACAO
      };

      mockSolicitacaoRepository.create.mockReturnValue(mockNovaSolicitacao);
      mockSolicitacaoRepository.save.mockResolvedValue(mockNovaSolicitacao);
      
      // Mock do entityManager para buscar TipoBeneficio
      const mockEntityManager = {
        findOne: jest.fn().mockResolvedValue({
          id: 'tipo-123',
          codigo: 'AUXILIO_ALIMENTACAO'
        })
      };
      
      // Mock do dataSource para retornar o entityManager
      mockDataSource.manager = mockEntityManager;

      // Act
      const resultado = await service.criarSolicitacaoRenovacao(
        mockSolicitacaoOriginal,
        observacao,
        usuarioId
      );

      // Assert
      expect(resultado).toEqual(mockNovaSolicitacao);
      expect(mockSolicitacaoRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: TipoSolicitacaoEnum.RENOVACAO,
          status: StatusSolicitacao.EM_ANALISE,
          beneficiario_id: mockSolicitacaoOriginal.beneficiario_id,
          tipo_beneficio_id: mockSolicitacaoOriginal.tipo_beneficio_id,
          unidade_id: mockSolicitacaoOriginal.unidade_id,
          tecnico_id: usuarioId,
          solicitacao_original_id: mockSolicitacaoOriginal.id,
          dados_complementares: expect.objectContaining({
            renovacao: expect.objectContaining({
              motivo: observacao,
              usuario_solicitante: usuarioId
            })
          }),
          observacoes: observacao
        })
      );
    });
  });

  describe('buscarSolicitacaoOriginal', () => {
    it('deve retornar solicitação original quando concessão existir', async () => {
      // Arrange
      const concessaoId = 'concessao-123';
      const mockSolicitacao = {
        id: 'solicitacao-123',
        protocolo: 'ORIG2024123456'
      };

      mockConcessaoRepository.findOne.mockResolvedValue({
        id: concessaoId,
        solicitacao: mockSolicitacao
      });

      // Act
      const resultado = await service.buscarSolicitacaoOriginal(concessaoId);

      // Assert
      expect(resultado).toEqual(mockSolicitacao);
    });

    it('deve retornar null quando concessão não existir', async () => {
      // Arrange
      const concessaoId = 'concessao-inexistente';
      
      mockConcessaoRepository.findOne.mockResolvedValue(null);

      // Act
      const resultado = await service.buscarSolicitacaoOriginal(concessaoId);

      // Assert
      expect(resultado).toBeNull();
    });
  });

  describe('listarSolicitacoesComElegibilidade', () => {
    it('deve retornar lista de solicitações com informações de elegibilidade', async () => {
      // Arrange
      const usuarioId = 'usuario-123';
      const mockSolicitacoes = [
        {
          id: 'solicitacao-123',
          protocolo: 'ORIG2024123456',
          status: StatusSolicitacao.APROVADA,
          tipo: TipoSolicitacaoEnum.ORIGINAL,
          concessao: { id: 'concessao-123' }
        }
      ];

      const mockElegibilidade = {
        podeRenovar: true,
        motivos: undefined
      };

      // Mock do cache para retornar o resultado da busca
      mockCacheService.getOrSet.mockImplementation(async (key, fn) => {
        return await fn();
      });
      mockSolicitacaoRepository.find.mockResolvedValue(mockSolicitacoes);
      mockRenovacaoValidationService.validarElegibilidade.mockResolvedValue(mockElegibilidade);

      // Act
      const resultado = await service.listarSolicitacoesComElegibilidade(usuarioId);

      // Assert
      expect(resultado).toHaveLength(1);
      expect(resultado[0]).toEqual(
        expect.objectContaining({
          id: 'solicitacao-123',
          protocolo: 'ORIG2024123456',
          podeRenovar: true,
          labelTipo: 'Original'
        })
      );
      expect(mockCacheService.getOrSet).toHaveBeenCalled();
    });
  });
});