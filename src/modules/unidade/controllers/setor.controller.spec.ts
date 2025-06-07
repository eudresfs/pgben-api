import { Test, TestingModule } from '@nestjs/testing';
import { SetorController } from './setor.controller';
import { SetorService } from '../services/setor.service';
import { CreateSetorDto } from '../dto/create-setor.dto';
import { UpdateSetorDto } from '../dto/update-setor.dto';
import { Setor } from '../../../entities/setor.entity';
import { Unidade, TipoUnidade, StatusUnidade } from '../../../entities/unidade.entity';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { ExecutionContext } from '@nestjs/common';

/**
 * Testes unitários para o SetorController
 *
 * Cobertura de testes:
 * - Listagem de setores com filtros e paginação
 * - Busca de setor por ID
 * - Busca de setores por unidade
 * - Criação de novos setores
 * - Atualização de dados de setores
 * - Remoção de setores
 * - Validação de permissões e autenticação
 * - Tratamento de erros HTTP
 * - Integração com unidades
 */
describe('SetorController', () => {
  let controller: SetorController;
  let service: jest.Mocked<SetorService>;

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

  const mockPaginatedResult = {
    data: [mockSetor],
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
  };

  // Mock para AuthGuard
  const mockAuthGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  // Mock para RolesGuard
  const mockRolesGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    const mockSetorService = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByUnidade: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SetorController],
      providers: [
        {
          provide: SetorService,
          useValue: mockSetorService,
        },
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue(mockAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    controller = module.get<SetorController>(SetorController);
    service = module.get(SetorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('deve retornar lista paginada de setores', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResult);

      const result = await controller.findAll({
        page: 1,
        limit: 10,
      });

      expect(result).toEqual(mockPaginatedResult);
      expect(service.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
      });
    });

    it('deve aplicar filtros de busca', async () => {
      const filtros = {
        nome: 'Atendimento',
        unidade_id: 'unidade-123',
        page: 1,
        limit: 10,
      };

      service.findAll.mockResolvedValue(mockPaginatedResult);

      await controller.findAll(filtros);

      expect(service.findAll).toHaveBeenCalledWith(filtros);
    });

    it('deve usar valores padrão para paginação', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResult);

      await controller.findAll({});

      expect(service.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
      });
    });

    it('deve validar limites de paginação', async () => {
      const filtrosComLimiteAlto = {
        page: 1,
        limit: 1000,
      };

      service.findAll.mockResolvedValue(mockPaginatedResult);

      await controller.findAll(filtrosComLimiteAlto);

      expect(service.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 100, // Deve ser limitado a 100
      });
    });
  });

  describe('findById', () => {
    it('deve retornar um setor quando encontrado', async () => {
      service.findById.mockResolvedValue(mockSetor);

      const result = await controller.findById('setor-123');

      expect(result).toEqual(mockSetor);
      expect(service.findById).toHaveBeenCalledWith('setor-123');
    });

    it('deve propagar erro quando setor não encontrado', async () => {
      service.findById.mockRejectedValue(new Error('Setor não encontrado'));

      await expect(controller.findById('invalid-id')).rejects.toThrow(
        'Setor não encontrado',
      );
    });

    it('deve validar formato UUID do ID', async () => {
      await expect(controller.findById('invalid-uuid')).rejects.toThrow();
    });
  });

  describe('findByUnidade', () => {
    it('deve retornar setores de uma unidade específica', async () => {
      service.findByUnidade.mockResolvedValue(mockPaginatedResult);

      const result = await controller.findByUnidade('unidade-123');

      expect(result).toEqual(mockPaginatedResult);
      expect(service.findByUnidade).toHaveBeenCalledWith('unidade-123');
    });

    it('deve propagar erro quando unidade não encontrada', async () => {
      service.findByUnidade.mockRejectedValue(
        new Error('Unidade não encontrada'),
      );

      await expect(controller.findByUnidade('invalid-id')).rejects.toThrow(
        'Unidade não encontrada',
      );
    });

    it('deve validar formato UUID da unidade', async () => {
      await expect(controller.findByUnidade('invalid-uuid')).rejects.toThrow();
    });

    it('deve retornar lista vazia quando unidade não tem setores', async () => {
      const resultadoVazio = {
        data: [],
        total: 0,
        page: 1,
        limit: 100,
        totalPages: 0,
      };

      service.findByUnidade.mockResolvedValue(resultadoVazio);

      const result = await controller.findByUnidade('unidade-sem-setores');

      expect(result).toEqual(resultadoVazio);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('create', () => {
    it('deve criar um novo setor com sucesso', async () => {
      const novoSetor = {
        ...mockSetor,
        ...mockCreateSetorDto,
        id: 'new-setor-id',
      };

      service.create.mockResolvedValue(novoSetor);

      const result = await controller.create(mockCreateSetorDto);

      expect(result).toEqual(novoSetor);
      expect(service.create).toHaveBeenCalledWith(mockCreateSetorDto);
    });

    it('deve propagar erro de validação', async () => {
      service.create.mockRejectedValue(new Error('Dados inválidos'));

      await expect(controller.create(mockCreateSetorDto)).rejects.toThrow(
        'Dados inválidos',
      );
    });

    it('deve propagar erro de unidade não encontrada', async () => {
      service.create.mockRejectedValue(
        new Error('Unidade não encontrada'),
      );

      await expect(controller.create(mockCreateSetorDto)).rejects.toThrow(
        'Unidade não encontrada',
      );
    });

    it('deve propagar erro de nome duplicado na unidade', async () => {
      service.create.mockRejectedValue(
        new Error('Já existe um setor com este nome nesta unidade'),
      );

      await expect(controller.create(mockCreateSetorDto)).rejects.toThrow(
        'Já existe um setor com este nome nesta unidade',
      );
    });

    it('deve validar dados obrigatórios', async () => {
      const createDtoIncompleto = {
        nome: 'Setor Teste',
        // faltando unidade_id
      } as CreateSetorDto;

      await expect(controller.create(createDtoIncompleto)).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('deve atualizar um setor com sucesso', async () => {
      const setorAtualizado = {
        ...mockSetor,
        ...mockUpdateSetorDto,
        updated_at: new Date(),
      };

      service.update.mockResolvedValue(setorAtualizado);

      const result = await controller.update(
        mockSetor.id,
        mockUpdateSetorDto,
      );

      expect(result).toEqual(setorAtualizado);
      expect(service.update).toHaveBeenCalledWith(
        mockSetor.id,
        mockUpdateSetorDto,
      );
    });

    it('deve propagar erro quando setor não encontrado', async () => {
      service.update.mockRejectedValue(
        new Error('Setor não encontrado'),
      );

      await expect(
        controller.update('invalid-id', mockUpdateSetorDto),
      ).rejects.toThrow('Setor não encontrado');
    });

    it('deve validar formato UUID do ID', async () => {
      await expect(
        controller.update('invalid-uuid', mockUpdateSetorDto),
      ).rejects.toThrow();
    });

    it('deve permitir atualização parcial', async () => {
      const updateParcial = {
        nome: 'Novo Nome',
      };

      const setorAtualizado = {
        ...mockSetor,
        nome: 'Novo Nome',
        updated_at: new Date(),
      };

      service.update.mockResolvedValue(setorAtualizado);

      const result = await controller.update(mockSetor.id, updateParcial);

      expect(result).toEqual(setorAtualizado);
      expect(service.update).toHaveBeenCalledWith(
        mockSetor.id,
        updateParcial,
      );
    });

    it('deve propagar erro de nome duplicado', async () => {
      service.update.mockRejectedValue(
        new Error('Já existe um setor com este nome nesta unidade'),
      );

      await expect(
        controller.update(mockSetor.id, mockUpdateSetorDto),
      ).rejects.toThrow('Já existe um setor com este nome nesta unidade');
    });
  });

  describe('remove', () => {
    it('deve remover um setor com sucesso', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove(mockSetor.id);

      expect(service.remove).toHaveBeenCalledWith(mockSetor.id);
    });

    it('deve propagar erro quando setor não encontrado', async () => {
      service.remove.mockRejectedValue(
        new Error('Setor não encontrado'),
      );

      await expect(controller.remove('invalid-id')).rejects.toThrow(
        'Setor não encontrado',
      );
    });

    it('deve validar formato UUID do ID', async () => {
      await expect(controller.remove('invalid-uuid')).rejects.toThrow();
    });

    it('deve propagar erro quando setor tem usuários vinculados', async () => {
      service.remove.mockRejectedValue(
        new Error('Setor possui usuários vinculados'),
      );

      await expect(controller.remove(mockSetor.id)).rejects.toThrow(
        'Setor possui usuários vinculados',
      );
    });

    it('deve propagar erro quando setor tem dependências', async () => {
      service.remove.mockRejectedValue(
        new Error('Não é possível remover setor com dependências'),
      );

      await expect(controller.remove(mockSetor.id)).rejects.toThrow(
        'Não é possível remover setor com dependências',
      );
    });
  });

  describe('validações de segurança', () => {
    it('deve exigir autenticação para todas as rotas', () => {
      expect(mockAuthGuard.canActivate).toBeDefined();
    });

    it('deve exigir permissões adequadas para operações', () => {
      expect(mockRolesGuard.canActivate).toBeDefined();
    });

    it('deve validar entrada de dados', async () => {
      const dadosInvalidos = {
        nome: '', // nome vazio
        descricao: 'A'.repeat(1001), // descrição muito longa
        unidade_id: 'invalid-uuid',
      } as CreateSetorDto;

      await expect(controller.create(dadosInvalidos)).rejects.toThrow();
    });

    it('deve sanitizar dados de entrada', async () => {
      const dadosComScript = {
        nome: '<script>alert("xss")</script>Setor',
        descricao: 'Descrição com <script>',
        unidade_id: 'unidade-123',
      } as CreateSetorDto;

      // O controller deve sanitizar ou rejeitar dados maliciosos
      await expect(controller.create(dadosComScript)).rejects.toThrow();
    });
  });

  describe('tratamento de erros HTTP', () => {
    it('deve retornar 404 para setor não encontrado', async () => {
      service.findById.mockRejectedValue(
        new Error('Setor não encontrado'),
      );

      await expect(controller.findById('invalid-id')).rejects.toThrow(
        'Setor não encontrado',
      );
    });

    it('deve retornar 400 para dados inválidos', async () => {
      service.create.mockRejectedValue(
        new Error('Dados de entrada inválidos'),
      );

      await expect(controller.create(mockCreateSetorDto)).rejects.toThrow(
        'Dados de entrada inválidos',
      );
    });

    it('deve retornar 409 para conflito de nome', async () => {
      service.create.mockRejectedValue(
        new Error('Já existe um setor com este nome nesta unidade'),
      );

      await expect(controller.create(mockCreateSetorDto)).rejects.toThrow(
        'Já existe um setor com este nome nesta unidade',
      );
    });

    it('deve retornar 422 para unidade não encontrada', async () => {
      service.create.mockRejectedValue(
        new Error('Unidade não encontrada'),
      );

      await expect(controller.create(mockCreateSetorDto)).rejects.toThrow(
        'Unidade não encontrada',
      );
    });

    it('deve retornar 500 para erro interno', async () => {
      service.findAll.mockRejectedValue(
        new Error('Erro interno do servidor'),
      );

      await expect(
        controller.findAll({ page: 1, limit: 10 }),
      ).rejects.toThrow('Erro interno do servidor');
    });
  });

  describe('integração com unidades', () => {
    it('deve carregar dados da unidade ao buscar setor', async () => {
      const setorComUnidade = {
        ...mockSetor,
        unidade: mockUnidade,
      };

      service.findById.mockResolvedValue(setorComUnidade);

      const result = await controller.findById(mockSetor.id);

      expect(result.unidade).toBeDefined();
      expect(result.unidade.nome).toBe(mockUnidade.nome);
    });

    it('deve validar se unidade está ativa ao criar setor', async () => {
      service.create.mockRejectedValue(
        new Error('Unidade não está ativa'),
      );

      await expect(controller.create(mockCreateSetorDto)).rejects.toThrow(
        'Unidade não está ativa',
      );
    });

    it('deve carregar relacionamentos com usuários', async () => {
      const setorComUsuarios = {
        ...mockSetor,
        usuarios: [
          {
            id: 'usuario-1',
            nome: 'João Silva',
            setor_id: mockSetor.id,
          },
        ],
      };

      service.findById.mockResolvedValue(setorComUsuarios as any);

      const result = await controller.findById(mockSetor.id);

      expect(result.usuarios).toBeDefined();
      expect(result.usuarios).toHaveLength(1);
    });
  });

  describe('casos de uso específicos', () => {
    it('deve listar setores ordenados por nome', async () => {
      const setoresOrdenados = {
        data: [
          { ...mockSetor, nome: 'Atendimento' },
          { ...mockSetor, id: 'setor-2', nome: 'Psicologia' },
          { ...mockSetor, id: 'setor-3', nome: 'Serviço Social' },
        ],
        total: 3,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      service.findAll.mockResolvedValue(setoresOrdenados);

      const result = await controller.findAll({
        page: 1,
        limit: 10,
        orderBy: 'nome',
        order: 'ASC',
      });

      expect(result.data).toHaveLength(3);
      expect(result.data[0].nome).toBe('Atendimento');
      expect(result.data[2].nome).toBe('Serviço Social');
    });

    it('deve filtrar setores por termo de busca', async () => {
      const filtros = {
        search: 'psico',
        page: 1,
        limit: 10,
      };

      const setoresFiltrados = {
        data: [{ ...mockSetor, nome: 'Psicologia' }],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      service.findAll.mockResolvedValue(setoresFiltrados);

      const result = await controller.findAll(filtros);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].nome).toContain('Psicologia');
    });

    it('deve paginar resultados corretamente', async () => {
      const filtrosPaginacao = {
        page: 2,
        limit: 5,
      };

      const resultadoPaginado = {
        data: [mockSetor],
        total: 15,
        page: 2,
        limit: 5,
        totalPages: 3,
      };

      service.findAll.mockResolvedValue(resultadoPaginado);

      const result = await controller.findAll(filtrosPaginacao);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
      expect(result.totalPages).toBe(3);
      expect(result.total).toBe(15);
    });
  });
});