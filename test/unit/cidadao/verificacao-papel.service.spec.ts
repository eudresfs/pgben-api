import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { VerificacaoPapelService } from '@modules/cidadao/services/verificacao-papel.service';
import { CidadaoService } from '@modules/cidadao/services/cidadao.service';
import { HistoricoConversaoPapelService } from '@modules/cidadao/services/historico-conversao-papel.service';
import { PapelCidadaoService } from '@modules/cidadao/services/papel-cidadao.service';
import { PapelCidadao } from '@modules/cidadao/entities/papel-cidadao.entity';
import { TipoPapel } from '@modules/cidadao/enums/tipo-papel.enum';
import { RegraConflitoPapel } from '@modules/cidadao/entities/regra-conflito-papel.entity';
import { ComposicaoFamiliar } from '@modules/cidadao/entities/composicao-familiar.entity';
import { Cidadao } from '@modules/cidadao/entities/cidadao.entity';
import { CidadaoResponseDto } from '@modules/cidadao/dto/cidadao-response.dto';

describe('VerificacaoPapelService', () => {
  let service: VerificacaoPapelService;
  let papelRepository: Repository<PapelCidadao>;
  let historicoService: HistoricoConversaoPapelService;
  let dataSource: DataSource;

  const mockCidadaoRepository = {
    findOne: jest.fn(),
  };

  const mockPapelRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };



  const mockComposicaoFamiliarRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockCidadaoService = {
    findById: jest.fn(),
  };

  const mockHistoricoService = {
    criarHistorico: jest.fn(),
  };

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    transaction: jest.fn(),
  };

  const mockCidadao: Cidadao = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    nome: 'João da Silva',
    cpf: '12345678901',
    email: 'joao@example.com',
  } as Cidadao;

  const mockCidadaoResponse: CidadaoResponseDto = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    nome: 'João da Silva',
    cpf: '12345678901',
    email: 'joao@example.com',
  } as CidadaoResponseDto;

  const mockPapelCidadao: PapelCidadao = {
    id: '660e8400-e29b-41d4-a716-446655440000',
    cidadao_id: '550e8400-e29b-41d4-a716-446655440000',
    tipo_papel: TipoPapel.MEMBRO_COMPOSICAO,
    ativo: true,
    metadados: {},
    created_at: new Date(),
    updated_at: new Date(),
  } as PapelCidadao;



  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerificacaoPapelService,
        {
          provide: getRepositoryToken(Cidadao),
          useValue: mockCidadaoRepository,
        },
        {
          provide: getRepositoryToken(PapelCidadao),
          useValue: mockPapelRepository,
        },

        {
          provide: getRepositoryToken(ComposicaoFamiliar),
          useValue: mockComposicaoFamiliarRepository,
        },
        {
          provide: CidadaoService,
          useValue: mockCidadaoService,
        },
        {
          provide: HistoricoConversaoPapelService,
          useValue: mockHistoricoService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: PapelCidadaoService,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<VerificacaoPapelService>(VerificacaoPapelService);
    papelRepository = module.get<Repository<PapelCidadao>>(getRepositoryToken(PapelCidadao));

    historicoService = module.get<HistoricoConversaoPapelService>(
      HistoricoConversaoPapelService,
    );
    dataSource = module.get<DataSource>(DataSource);

    jest.clearAllMocks();
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('verificarConflitoPapeis', () => {
    const cpf = '12345678901';
    const novoPapel = TipoPapel.BENEFICIARIO;

    it('deve retornar sem conflito quando não há papéis ativos', async () => {
      mockCidadaoRepository.findOne.mockResolvedValue({
        ...mockCidadao,
        papeis: [],
      });

      const result = await service.verificarConflitoPapeis(cpf);

      expect(result.temConflito).toBe(false);
      expect(result.detalhes).toBe('Nenhum papel ativo encontrado');
    });

    it('deve retornar sem conflito quando não há regras de conflito', async () => {
      mockCidadaoRepository.findOne.mockResolvedValue({
        ...mockCidadao,
        papeis: [],
      });

      const result = await service.verificarConflitoPapeis(cpf);

      expect(result.temConflito).toBe(false);
      expect(result.detalhes).toBe('Nenhum papel ativo encontrado');
    });

    it('deve detectar conflito quando há regra de conflito ativa', async () => {
      const cidadaoComPapeis = {
        ...mockCidadao,
        papeis: [
          {
            ...mockPapelCidadao,
            tipo_papel: 'beneficiario',
            ativo: true,
          },
          {
            id: '2',
            cidadao_id: mockCidadao.id,
            tipo_papel: 'requerente',
            ativo: true,
          },
        ],
      };

      mockCidadaoRepository.findOne.mockResolvedValue(cidadaoComPapeis);

      const result = await service.verificarConflitoPapeis(cpf);

      expect(result.temConflito).toBe(true);
      expect(result.detalhes).toContain('beneficiário e requerente simultaneamente');
    });

    it('deve buscar cidadão com papéis', async () => {
      mockCidadaoRepository.findOne.mockResolvedValue({
        ...mockCidadao,
        papeis: [],
      });

      await service.verificarConflitoPapeis(cpf);

      expect(mockCidadaoRepository.findOne).toHaveBeenCalledWith({
        where: { cpf },
        relations: ['papeis'],
      });
    });

    it('deve retornar resultado válido quando cidadão não existe', async () => {
      mockCidadaoRepository.findOne.mockResolvedValue(null);

      const result = await service.verificarConflitoPapeis(cpf);

      expect(result.temConflito).toBe(false);
      expect(result.detalhes).toBe('Cidadão não encontrado');
    });
  });

  describe('converterParaBeneficiario', () => {
    const cidadaoId = '550e8400-e29b-41d4-a716-446655440000';
    const motivo = 'Conversão para beneficiário';

    it('deve converter um membro da composição para beneficiário', async () => {
      const novoPapel = {
        id: '880e8400-e29b-41d4-a716-446655440000',
        cidadao_id: cidadaoId,
        tipo_papel: 'beneficiario',
        ativo: true,
        metadados: {},
        created_at: new Date(),
        updated_at: new Date(),
      } as PapelCidadao;

      const papelMembroComposicao = {
        ...mockPapelCidadao,
        tipo_papel: 'membro_composicao',
        ativo: true,
      };

      const cidadaoComPapeis = {
        ...mockCidadao,
        papeis: [papelMembroComposicao],
      };

      mockDataSource.transaction.mockImplementation(async (callback) => {
        const manager = {
          findOne: jest.fn()
            .mockResolvedValueOnce(cidadaoComPapeis), // busca do cidadão com papéis
          find: jest.fn(),
          update: jest.fn().mockResolvedValue({ affected: 1 }),
          create: jest.fn().mockReturnValue(novoPapel),
          save: jest.fn().mockResolvedValue(novoPapel),
        };
        return callback(manager);
      });

      mockHistoricoService.criarHistorico.mockResolvedValue({ id: 'historico-id' });

      const result = await service.converterParaBeneficiario(cidadaoId, motivo);

      expect(result.sucesso).toBe(true);
      expect(result.mensagem).toBe('Conversão para beneficiário realizada com sucesso');
      expect(result.historicoId).toBeDefined();
      expect(mockHistoricoService.criarHistorico).toHaveBeenCalled();
    });

    it('deve lançar NotFoundException quando cidadão não existir', async () => {
      mockDataSource.transaction.mockImplementation(async (callback) => {
        const manager = {
          findOne: jest.fn().mockResolvedValue(null),
          find: jest.fn(),
          update: jest.fn(),
          create: jest.fn(),
          save: jest.fn(),
        };
        return callback(manager);
      });

      await expect(service.converterParaBeneficiario(cidadaoId, motivo)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar ConflictException quando cidadão já for beneficiário', async () => {
      const papelBeneficiario = {
        ...mockPapelCidadao,
        tipo_papel: 'beneficiario',
        ativo: true,
      };

      const cidadaoComBeneficiario = {
        ...mockCidadao,
        papeis: [papelBeneficiario],
      };

      mockDataSource.transaction.mockImplementation(async (callback) => {
        const manager = {
          findOne: jest.fn()
            .mockResolvedValueOnce(cidadaoComBeneficiario), // busca do cidadão com papel beneficiário
          find: jest.fn(),
          update: jest.fn(),
          create: jest.fn(),
          save: jest.fn(),
        };
        return callback(manager);
      });

      await expect(service.converterParaBeneficiario(cidadaoId, motivo))
        .rejects.toThrow('Cidadão já é beneficiário');
    });

    it('deve desativar papéis conflitantes durante a conversão', async () => {
      const novoPapel = {
        id: '880e8400-e29b-41d4-a716-446655440000',
        cidadao_id: cidadaoId,
        tipo_papel: 'beneficiario',
        ativo: true,
        metadados: {},
        created_at: new Date(),
        updated_at: new Date(),
      } as PapelCidadao;

      const papelMembroComposicao = {
        ...mockPapelCidadao,
        tipo_papel: 'membro_composicao',
        ativo: true,
      };

      const cidadaoComPapeis = {
        ...mockCidadao,
        papeis: [papelMembroComposicao],
      };

      const mockManager = {
        findOne: jest.fn()
          .mockResolvedValueOnce(cidadaoComPapeis), // busca do cidadão com papéis
        find: jest.fn(),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
        create: jest.fn().mockReturnValue(novoPapel),
        save: jest.fn().mockResolvedValue(novoPapel),
      };

      mockDataSource.transaction.mockImplementation(async (callback) => {
        return callback(mockManager);
      });

      mockHistoricoService.criarHistorico.mockResolvedValue({ id: 'historico-id' });

      await service.converterParaBeneficiario(cidadaoId, motivo);

      // Verifica se o save foi chamado duas vezes (desativar papel antigo + criar novo papel)
      expect(mockManager.save).toHaveBeenCalledTimes(2);
      
      // Verifica se o papel antigo foi desativado (primeira chamada)
      expect(mockManager.save).toHaveBeenNthCalledWith(1, 
        expect.objectContaining({
          id: papelMembroComposicao.id,
          ativo: false,
        })
      );
      
      // Verifica se o novo papel foi criado (segunda chamada)
      expect(mockManager.save).toHaveBeenNthCalledWith(2, novoPapel);
    });

    it('deve criar histórico de conversão', async () => {
      const novoPapel = {
        id: '880e8400-e29b-41d4-a716-446655440000',
        cidadao_id: cidadaoId,
        tipo_papel: 'beneficiario',
        ativo: true,
        metadados: {},
        created_at: new Date(),
        updated_at: new Date(),
      } as PapelCidadao;

      mockDataSource.transaction.mockImplementation(async (callback) => {
        const manager = {
          findOne: jest.fn()
            .mockResolvedValueOnce(mockCidadao) // busca do cidadão
            .mockResolvedValueOnce(null), // verificação de papel existente
          find: jest.fn()
            .mockResolvedValueOnce([mockPapelCidadao]), // papéis ativos
          update: jest.fn().mockResolvedValue({ affected: 1 }),
          create: jest.fn().mockReturnValue(novoPapel),
          save: jest.fn().mockResolvedValue(novoPapel),
        };
        return callback(manager);
      });

      mockHistoricoService.criarHistorico.mockResolvedValue({});

      await service.converterParaBeneficiario(cidadaoId, motivo);

      expect(mockHistoricoService.criarHistorico).toHaveBeenCalledWith({
        cidadao_id: cidadaoId,
        papel_anterior: 'membro_composicao',
        papel_novo: 'beneficiario',
        justificativa: motivo,
      }, 'sistema');
    });
  });
});