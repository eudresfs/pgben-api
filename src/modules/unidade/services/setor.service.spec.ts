import { Test, TestingModule } from '@nestjs/testing';
import { SetorService } from './setor.service';
import { SetorRepository } from '../repositories/setor.repository';
import { UnidadeRepository } from '../repositories/unidade.repository';
import { DataSource } from 'typeorm';
import { Status } from '../../../enums/status.enum';
import { TipoUnidade, StatusUnidade } from '../../../entities/unidade.entity';
import { CreateSetorDto } from '../dto/create-setor.dto';
import { UpdateSetorDto } from '../dto/update-setor.dto';
import { Setor } from '../../../entities/setor.entity';
import { Unidade } from '../../../entities/unidade.entity';
// Comentando as importações de funções de erro por enquanto
// import {
//   throwSetorNotFound,
//   throwSetorAlreadyExists,
//   throwSetorOperationFailed,
//   throwUnidadeNotFound,
// } from '../../../shared/exceptions/error-catalog/domains/unidade.errors';

/**
 * Testes unitários para o SetorService
 *
 * Cobertura de testes:
 * - Criação de setores
 * - Busca de setores
 * - Atualização de dados
 * - Listagem com filtros
 * - Validações de negócio
 * - Relacionamento com unidades
 * - Tratamento de erros
 */
describe('SetorService', () => {
  let service: SetorService;
  let setorRepository: jest.Mocked<SetorRepository>;
  let unidadeRepository: jest.Mocked<UnidadeRepository>;
  let dataSource: jest.Mocked<DataSource>;

  const mockUnidade: Unidade = {
    id: 'unidade-123',
    nome: 'CRAS Centro',
    codigo: 'CRAS001',
    sigla: 'CC',
    tipo: TipoUnidade.CRAS,
    endereco: 'Rua das Flores, 123',
    telefone: '(84) 3232-1234',
    email: 'cras.centro@semtas.natal.gov.br',
    responsavel_matricula: 'SEMTAS001',
    status: StatusUnidade.ATIVO,
    usuarios: [],
    setores: [],
    created_at: new Date('2024-01-01T10:00:00Z'),
    updated_at: new Date('2024-01-01T10:00:00Z'),
    removed_at: null,
  };

  const mockSetor: Setor = {
    id: 'setor-123',
    nome: 'Atendimento Social',
    sigla: 'AS',
    descricao: 'Setor responsável pelo atendimento social',
    unidade_id: 'unidade-123',
    unidade: mockUnidade,
    status: true,
    usuarios: [],
    created_at: new Date('2024-01-01T10:00:00Z'),
    updated_at: new Date('2024-01-01T10:00:00Z'),
    removed_at: null,
  };

  const mockCreateSetorDto: CreateSetorDto = {
    nome: 'Psicologia',
    descricao: 'Setor de atendimento psicológico',
    unidade_id: 'unidade-123',
  };

  const mockUpdateSetorDto: UpdateSetorDto = {
    nome: 'Psicologia Clínica',
    descricao: 'Setor de atendimento psicológico clínico',
  };

  beforeEach(async () => {
    const mockSetorRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByUnidadeId: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      count: jest.fn(),
    };

    const mockUnidadeRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findByCodigo: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
      remove: jest.fn(),
      count: jest.fn(),
    };

    const mockDataSource = {
      transaction: jest
        .fn()
        .mockImplementation(async (callback: any) => {
          const mockManager = {
            getRepository: jest.fn().mockImplementation((entity) => {
              if (entity === 'setor' || entity.name === 'Setor') {
                return mockSetorRepository;
              }
              if (entity === 'unidade' || entity.name === 'Unidade') {
                return mockUnidadeRepository;
              }
              return mockSetorRepository;
            }),
          } as any;
          return callback(mockManager);
        }),
      getRepository: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SetorService,
        {
          provide: SetorRepository,
          useValue: mockSetorRepository,
        },
        {
          provide: UnidadeRepository,
          useValue: mockUnidadeRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<SetorService>(SetorService);
    setorRepository = module.get(SetorRepository);
    unidadeRepository = module.get(UnidadeRepository);
    dataSource = module.get(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByUnidadeId', () => {
    it('deve retornar lista de setores com paginação', async () => {
      const mockSetores = [mockSetor];
      const mockUnidade = {
        id: 'unidade-id-1',
        nome: 'Unidade Teste',
        codigo: 'UT001',
        sigla: 'UT',
        tipo: TipoUnidade.CRAS,
        endereco: 'Endereço Teste',
        telefone: '(11) 1234-5678',
        email: 'teste@unidade.gov.br',
        responsavel_matricula: 'RESP001',
        status: StatusUnidade.ATIVO,
        usuarios: [],
        setores: [],
        created_at: new Date(),
        updated_at: new Date(),
        removed_at: null,
      };

      unidadeRepository.findById.mockResolvedValue(mockUnidade);
      setorRepository.findByUnidadeId.mockResolvedValue(mockSetores);

      const result = await service.findByUnidadeId('unidade-id-1');

      expect(result).toEqual({
        items: mockSetores,
        meta: {
          total: mockSetores.length,
          unidadeId: 'unidade-id-1',
        },
      });
      expect(setorRepository.findByUnidadeId).toHaveBeenCalledWith(
        'unidade-id-1',
      );
      expect(unidadeRepository.findById).toHaveBeenCalledWith('unidade-id-1');
    });

    it('deve aplicar filtros por unidade', async () => {
      const filtros = {
        skip: 0,
        take: 10,
        where: { unidade_id: 'unidade-123' },
      };

      setorRepository.findAll.mockResolvedValue([[mockSetor], 1]);

      await service.findAll(filtros);

      expect(setorRepository.findAll).toHaveBeenCalledWith(filtros);
    });

    it('deve aplicar filtros por nome', async () => {
      const filtros = {
        skip: 0,
        take: 10,
        where: { nome: 'Atendimento' },
      };

      setorRepository.findAll.mockResolvedValue([[mockSetor], 1]);

      await service.findAll(filtros);

      expect(setorRepository.findAll).toHaveBeenCalledWith(filtros);
    });
  });

  describe('findById', () => {
    it('deve retornar um setor quando encontrado', async () => {
        setorRepository.findById.mockResolvedValue(mockSetor);

        const result = await service.findById('setor-123');

        expect(result).toEqual(mockSetor);
        expect(setorRepository.findById).toHaveBeenCalledWith('setor-123');
      });

    it('deve lançar erro quando setor não encontrado', async () => {
      setorRepository.findById.mockResolvedValue(null);

      await expect(service.findById('invalid-id')).rejects.toThrow();
    });
  });

  describe('findByUnidade', () => {
    it('deve retornar setores de uma unidade específica', async () => {
      unidadeRepository.findById.mockResolvedValue(mockUnidade);
      setorRepository.findByUnidadeId.mockResolvedValue([mockSetor]);

      const result = await service.findByUnidadeId('unidade-123');

      expect(result).toEqual({
        items: [mockSetor],
        meta: {
          total: 1,
          unidadeId: 'unidade-123',
        },
      });
      expect(setorRepository.findByUnidadeId).toHaveBeenCalledWith(
        'unidade-123',
      );
    });
  });

  describe('create', () => {
    it('deve criar um setor com sucesso', async () => {
      const novoSetor = {
        ...mockSetor,
        id: 'novo-setor-id',
        nome: mockCreateSetorDto.nome,
        descricao: mockCreateSetorDto.descricao,
        unidade_id: mockCreateSetorDto.unidade_id,
      };

      // Mock da transação para simular criação bem-sucedida
      dataSource.transaction.mockImplementation(async (callback: any) => {
        const mockManager = {
          getRepository: jest.fn().mockImplementation((entity) => {
            if (entity === 'unidade') {
              return {
                findOne: jest.fn().mockResolvedValue(mockUnidade),
              };
            }
            if (entity === 'setor') {
              return {
                findOne: jest.fn().mockResolvedValue(null), // Não existe setor com mesmo nome
                save: jest.fn().mockResolvedValue(novoSetor),
              };
            }
            return {};
          }),
        } as any;
        return callback(mockManager);
      });

      const result = await service.create(mockCreateSetorDto);

      expect(result).toEqual(novoSetor);
      expect(dataSource.transaction).toHaveBeenCalled();
    });

    it('deve lançar erro quando unidade não existe', async () => {
      unidadeRepository.findById.mockResolvedValue(null);

      await expect(service.create(mockCreateSetorDto)).rejects.toThrow();

      expect(setorRepository.create).not.toHaveBeenCalled();
    });

    it('deve lançar erro quando já existe setor com mesmo nome na unidade', async () => {
      unidadeRepository.findById.mockResolvedValue(mockUnidade);
      // Mock da transação para simular setor existente
      dataSource.transaction.mockImplementation(async (callback: any) => {
        const mockManager = {
          getRepository: jest.fn().mockReturnValue({
            findOne: jest.fn().mockResolvedValue(mockSetor),
          }),
        } as any;
        return callback(mockManager);
      });

      await expect(service.create(mockCreateSetorDto)).rejects.toThrow();

      expect(setorRepository.create).not.toHaveBeenCalled();
    });

    it('deve validar dados obrigatórios', async () => {
      const createDtoIncompleto = {
        nome: 'Setor Teste',
        // faltando unidade_id
      } as CreateSetorDto;

      await expect(service.create(createDtoIncompleto)).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('deve atualizar um setor com sucesso', async () => {
      const setorAtualizado = {
        ...mockSetor,
        ...mockUpdateSetorDto,
        updated_at: new Date(),
      };

      // Mock da transação para simular atualização bem-sucedida
        dataSource.transaction.mockImplementation(async (callback: any) => {
          const mockManager = {
            getRepository: jest.fn().mockImplementation((entity) => {
              if (entity === 'setor') {
                return {
                  findOne: jest.fn().mockImplementation((options) => {
                    if (options.where.id && !options.where.nome && !options.where.sigla) {
                      // Busca final após update - retorna setor atualizado
                      return Promise.resolve(setorAtualizado);
                    }
                    if (options.where.id) {
                      // Busca inicial para verificar existência
                      return Promise.resolve(mockSetor);
                    }
                    // Para busca por nome/sigla, não retorna nada (não encontra duplicata)
                    return Promise.resolve(null);
                  }),
                  update: jest.fn().mockResolvedValue(undefined),
                };
              }
              if (entity === 'unidade') {
                return {
                  findOne: jest.fn().mockResolvedValue(mockUnidade),
                };
              }
              return {};
            }),
          } as any;
          return callback(mockManager);
        });

      const result = await service.update(mockSetor.id, mockUpdateSetorDto);

      expect(result).toEqual(setorAtualizado);
      expect(dataSource.transaction).toHaveBeenCalled();
    });

    it('deve lançar erro quando setor não encontrado', async () => {
      setorRepository.findById.mockResolvedValue(null);

      await expect(
        service.update('invalid-id', mockUpdateSetorDto),
      ).rejects.toThrow();

      expect(setorRepository.update).not.toHaveBeenCalled();
    });

    it('deve validar nome único na unidade ao atualizar', async () => {
      const updateComNomeExistente = {
        ...mockUpdateSetorDto,
        nome: 'Nome Existente',
      };

      setorRepository.findById.mockResolvedValue(mockSetor);
      // Mock da transação para simular setor existente com mesmo nome
      dataSource.transaction.mockImplementation(async (callback: any) => {
        const mockManager = {
          getRepository: jest.fn().mockImplementation((entity) => {
            if (entity === 'setor') {
              return {
                findOne: jest.fn().mockImplementation((options) => {
                  if (options.where.id) {
                    return Promise.resolve(mockSetor);
                  }
                  // Simula encontrar outro setor com mesmo nome
                  if (options.where.nome || options.where.sigla) {
                    return Promise.resolve({
                      ...mockSetor,
                      id: 'outro-setor-id',
                      nome: 'Nome Existente',
                    });
                  }
                  return Promise.resolve(null);
                }),
              };
            }
            if (entity === 'unidade') {
              return {
                findOne: jest.fn().mockResolvedValue(mockUnidade),
              };
            }
            return {};
          }),
        } as any;
        return callback(mockManager);
      });

      await expect(
        service.update(mockSetor.id, updateComNomeExistente),
      ).rejects.toThrow();

      expect(setorRepository.update).not.toHaveBeenCalled();
    });

    it('deve permitir atualizar com o mesmo nome do próprio setor', async () => {
      const updateComMesmoNome = {
        ...mockUpdateSetorDto,
        nome: mockSetor.nome,
      };

      const setorAtualizado = {
        ...mockSetor,
        ...updateComMesmoNome,
        updated_at: new Date(),
      };

      // Mock da transação para permitir atualização com mesmo nome
      dataSource.transaction.mockImplementation(async (callback: any) => {
        const mockManager = {
          getRepository: jest.fn().mockImplementation((entity) => {
            if (entity === 'setor') {
              return {
                findOne: jest.fn().mockImplementation((options) => {
                  if (options.where.id && !options.where.nome && !options.where.sigla) {
                    // Busca final após update - retorna setor atualizado
                    return Promise.resolve(setorAtualizado);
                  }
                  if (options.where.id) {
                    // Busca inicial para verificar existência
                    return Promise.resolve(mockSetor);
                  }
                  // Se for busca por nome com Not(id), não encontra outro setor
                  return Promise.resolve(null);
                }),
                update: jest.fn().mockResolvedValue(undefined),
              };
            }
            if (entity === 'unidade') {
              return {
                findOne: jest.fn().mockResolvedValue(mockUnidade),
              };
            }
            return {};
          }),
        } as any;
        return callback(mockManager);
      });

      const result = await service.update(mockSetor.id, updateComMesmoNome);

      expect(result).toEqual(setorAtualizado);
      expect(dataSource.transaction).toHaveBeenCalled();
    });
  });

  // Método remove não implementado no SetorService
  // describe('remove', () => {
  //   it('deve remover um setor com sucesso', async () => {
  //     setorRepository.findById.mockResolvedValue(mockSetor);
  //     setorRepository.remove.mockResolvedValue(undefined);

  //     await service.remove(mockSetor.id);

  //     expect(setorRepository.findById).toHaveBeenCalledWith(mockSetor.id);
  //     expect(setorRepository.remove).toHaveBeenCalledWith(mockSetor.id);
  //   });

  //   it('deve lançar erro quando setor não encontrado', async () => {
  //     setorRepository.findById.mockResolvedValue(null);

  //     await expect(service.remove('invalid-id')).rejects.toThrow();

  //     expect(setorRepository.remove).not.toHaveBeenCalled();
  //   });

  //   it('deve verificar se setor tem usuários antes de remover', async () => {
  //     const setorComUsuarios = {
  //       ...mockSetor,
  //       usuarios: [{ id: 'usuario-1' }],
  //     };

  //     setorRepository.findById.mockResolvedValue(setorComUsuarios as any);

  //     await expect(service.remove(mockSetor.id)).rejects.toThrow();

  //     expect(setorRepository.remove).not.toHaveBeenCalled();
  //   });
  // });}}}

  describe('validações de negócio', () => {
    it('deve validar comprimento mínimo do nome', async () => {
      const createDtoComNomeCurto = {
        ...mockCreateSetorDto,
        nome: 'AB',
      };

      unidadeRepository.findById.mockResolvedValue(mockUnidade);

      await expect(service.create(createDtoComNomeCurto)).rejects.toThrow();
    });

    it('deve validar comprimento máximo do nome', async () => {
      const createDtoComNomeLongo = {
        ...mockCreateSetorDto,
        nome: 'A'.repeat(256),
      };

      unidadeRepository.findById.mockResolvedValue(mockUnidade);

      await expect(service.create(createDtoComNomeLongo)).rejects.toThrow();
    });

    it('deve validar formato UUID da unidade', async () => {
      const createDtoComUnidadeInvalida = {
        ...mockCreateSetorDto,
        unidade_id: 'invalid-uuid',
      };

      await expect(
        service.create(createDtoComUnidadeInvalida),
      ).rejects.toThrow();
    });
  });

  describe('tratamento de erros', () => {
    it('deve tratar erro de transação no banco', async () => {
      // Mock da transação que falha
      dataSource.transaction.mockRejectedValue(new Error('Database error'));

      await expect(service.create(mockCreateSetorDto)).rejects.toThrow();
    });

    it('deve tratar erro de conexão com banco', async () => {
      setorRepository.findByUnidadeId.mockRejectedValue(
        new Error('Connection error'),
      );

      await expect(service.findByUnidadeId('unidade-123')).rejects.toThrow();
    });

    it('deve tratar erro de violação de constraint', async () => {
      unidadeRepository.findById.mockResolvedValue(mockUnidade);
      // Validação será feita na transação

      const constraintError = new Error('Constraint violation');
      (constraintError as any).code = '23505';
      setorRepository.create.mockRejectedValue(constraintError);

      await expect(service.create(mockCreateSetorDto)).rejects.toThrow();
    });
  });

  describe('integração com unidades', () => {
    it('deve carregar dados da unidade ao buscar setor', async () => {
      const setorComUnidade = {
        ...mockSetor,
        unidade: mockUnidade,
      };

      setorRepository.findById.mockResolvedValue(setorComUnidade);

      const result = await service.findById('setor-123');

      expect(result.unidade).toBeDefined();
      expect(result.unidade.nome).toBe(mockUnidade.nome);
    });

    it('deve validar se unidade está ativa ao criar setor', async () => {
      const unidadeInativa = {
        ...mockUnidade,
        status: StatusUnidade.INATIVO,
      };

      unidadeRepository.findById.mockResolvedValue(unidadeInativa);

      await expect(service.create(mockCreateSetorDto)).rejects.toThrow();
    });
  });
});
