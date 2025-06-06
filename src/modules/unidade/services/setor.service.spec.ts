import { Test, TestingModule } from '@nestjs/testing';
import { SetorService } from './setor.service';
import { SetorRepository } from '../repositories/setor.repository';
import { UnidadeRepository } from '../repositories/unidade.repository';
import { DataSource } from 'typeorm';
import { CreateSetorDto } from '../dto/create-setor.dto';
import { UpdateSetorDto } from '../dto/update-setor.dto';
import { Setor } from '../../../entities/setor.entity';
import { Unidade, TipoUnidade, StatusUnidade } from '../../../entities/unidade.entity';
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
    descricao: 'Setor responsável pelo atendimento social',
    unidade_id: 'unidade-123',
    unidade: mockUnidade,
    usuarios: [],
    created_at: new Date('2024-01-01T10:00:00Z'),
    updated_at: new Date('2024-01-01T10:00:00Z'),
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
      findByNomeAndUnidade: jest.fn(),
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
      findBySigla: jest.fn(),
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
        .mockImplementation((callbackOrIsolation, callback) => {
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
          };
          if (typeof callbackOrIsolation === 'function') {
            return callbackOrIsolation(mockManager);
          }
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
      const mockUnidade = { id: 'unidade-id-1', nome: 'Unidade Teste' };
      
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
      expect(setorRepository.findByUnidadeId).toHaveBeenCalledWith('unidade-id-1');
      expect(unidadeRepository.findById).toHaveBeenCalledWith('unidade-id-1');
    });

    it('deve aplicar filtros por unidade', async () => {
      const filtros = {
        unidade_id: 'unidade-123',
        page: 1,
        limit: 10,
      };

      setorRepository.findAll.mockResolvedValue({
        data: [mockSetor],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      await service.findAll(filtros);

      expect(setorRepository.findAll).toHaveBeenCalledWith(filtros);
    });

    it('deve aplicar filtros por nome', async () => {
      const filtros = {
        nome: 'Atendimento',
        page: 1,
        limit: 10,
      };

      setorRepository.findAll.mockResolvedValue({
        data: [mockSetor],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

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
      const mockSetores = [mockSetor];
      
      setorRepository.findAll.mockResolvedValue({
        data: mockSetores,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      const result = await service.findByUnidade('unidade-123');

      expect(result).toEqual({
        data: mockSetores,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
      expect(setorRepository.findAll).toHaveBeenCalledWith({
        unidade_id: 'unidade-123',
        page: 1,
        limit: 100,
      });
    });
  });

  describe('create', () => {
    it('deve criar um novo setor com sucesso', async () => {
      const novoSetor = {
        ...mockSetor,
        ...mockCreateSetorDto,
        id: 'new-setor-id',
      };

      unidadeRepository.findById.mockResolvedValue(mockUnidade);
      setorRepository.findByNomeAndUnidade.mockResolvedValue(null);
      setorRepository.create.mockResolvedValue(novoSetor);

      const result = await service.create(mockCreateSetorDto);

      expect(result).toEqual(novoSetor);
      expect(unidadeRepository.findById).toHaveBeenCalledWith(
        mockCreateSetorDto.unidade_id,
      );
      expect(setorRepository.findByNomeAndUnidade).toHaveBeenCalledWith(
        mockCreateSetorDto.nome,
        mockCreateSetorDto.unidade_id,
      );
      expect(setorRepository.create).toHaveBeenCalledWith(mockCreateSetorDto);
    });

    it('deve lançar erro quando unidade não existe', async () => {
      unidadeRepository.findById.mockResolvedValue(null);

      await expect(service.create(mockCreateSetorDto)).rejects.toThrow();

      expect(setorRepository.create).not.toHaveBeenCalled();
    });

    it('deve lançar erro quando já existe setor com mesmo nome na unidade', async () => {
      unidadeRepository.findById.mockResolvedValue(mockUnidade);
      setorRepository.findByNomeAndUnidade.mockResolvedValue(mockSetor);

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

      setorRepository.findById.mockResolvedValue(mockSetor);
      setorRepository.update.mockResolvedValue(setorAtualizado);

      const result = await service.update(mockSetor.id, mockUpdateSetorDto);

      expect(result).toEqual(setorAtualizado);
      expect(setorRepository.findById).toHaveBeenCalledWith(mockSetor.id);
      expect(setorRepository.update).toHaveBeenCalledWith(
        mockSetor.id,
        mockUpdateSetorDto,
      );
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
      setorRepository.findByNomeAndUnidade.mockResolvedValue({
        ...mockSetor,
        id: 'outro-setor-id',
        nome: 'Nome Existente',
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

      setorRepository.findById.mockResolvedValue(mockSetor);
      setorRepository.findByNomeAndUnidade.mockResolvedValue(mockSetor);
      setorRepository.update.mockResolvedValue(setorAtualizado);

      const result = await service.update(mockSetor.id, updateComMesmoNome);

      expect(result).toEqual(setorAtualizado);
      expect(setorRepository.update).toHaveBeenCalled();
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

      await expect(
        service.create(createDtoComNomeCurto),
      ).rejects.toThrow();
    });

    it('deve validar comprimento máximo do nome', async () => {
      const createDtoComNomeLongo = {
        ...mockCreateSetorDto,
        nome: 'A'.repeat(256),
      };

      unidadeRepository.findById.mockResolvedValue(mockUnidade);

      await expect(
        service.create(createDtoComNomeLongo),
      ).rejects.toThrow();
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
      unidadeRepository.findById.mockResolvedValue(mockUnidade);
      setorRepository.findByNomeAndUnidade.mockResolvedValue(null);
      setorRepository.create.mockRejectedValue(new Error('Database error'));

      await expect(service.create(mockCreateSetorDto)).rejects.toThrow();
    });

    it('deve tratar erro de conexão com banco', async () => {
      setorRepository.findByUnidadeId.mockRejectedValue(new Error('Connection error'));

      await expect(
        service.findByUnidadeId('unidade-123'),
      ).rejects.toThrow();
    });

    it('deve tratar erro de violação de constraint', async () => {
      unidadeRepository.findById.mockResolvedValue(mockUnidade);
      setorRepository.findByNomeAndUnidade.mockResolvedValue(null);
      
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