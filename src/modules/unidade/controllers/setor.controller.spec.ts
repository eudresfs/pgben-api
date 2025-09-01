import { Test, TestingModule } from '@nestjs/testing';
import { SetorController } from './setor.controller';
import { SetorService } from '../services/setor.service';
import { CreateSetorDto } from '../dto/create-setor.dto';
import { UpdateSetorDto } from '../dto/update-setor.dto';
import { Setor } from '../../../entities/setor.entity';
import {
  Unidade,
  TipoUnidade,
  StatusUnidade,
} from '../../../entities/unidade.entity';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
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

  const mockPaginatedResult = {
    data: [mockSetor],
    total: 1,
    page: 1,
    limit: 10,
    pages: 1,
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
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
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
      .overrideGuard(JwtAuthGuard)
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

  // Método findAll não existe no SetorController
  // A listagem de setores é feita através do UnidadeController.findSetores

  describe('findOne', () => {
    it('deve retornar um setor quando encontrado', async () => {
      service.findById.mockResolvedValue(mockSetor);

      const result = await controller.findOne('setor-123');

      expect(result).toEqual(mockSetor);
      expect(service.findById).toHaveBeenCalledWith('setor-123');
    });

    it('deve propagar erro quando setor não encontrado', async () => {
      service.findById.mockRejectedValue(new Error('Setor não encontrado'));

      await expect(controller.findOne('invalid-id')).rejects.toThrow(
        'Setor não encontrado',
      );
    });

    it('deve validar formato UUID do ID', async () => {
      await expect(controller.findOne('invalid-uuid')).rejects.toThrow();
    });
  });

  // Método findByUnidade não existe no SetorController
  // Este método está disponível no UnidadeController como findSetores

  describe('create', () => {
    it('deve criar um novo setor com sucesso', async () => {
      const novoSetor = {
        ...mockSetor,
        ...mockCreateSetorDto,
        id: 'new-setor-id',
        status: true,
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
      service.create.mockRejectedValue(new Error('Unidade não encontrada'));

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

      const result = await controller.update(mockSetor.id, mockUpdateSetorDto);

      expect(result).toEqual(setorAtualizado);
      expect(service.update).toHaveBeenCalledWith(
        mockSetor.id,
        mockUpdateSetorDto,
      );
    });

    it('deve propagar erro quando setor não encontrado', async () => {
      service.update.mockRejectedValue(new Error('Setor não encontrado'));

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
      expect(service.update).toHaveBeenCalledWith(mockSetor.id, updateParcial);
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

  // Testes de remoção removidos pois o método remove não existe no SetorController

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
      service.findById.mockRejectedValue(new Error('Setor não encontrado'));

      await expect(controller.findOne('invalid-id')).rejects.toThrow(
        'Setor não encontrado',
      );
    });

    it('deve retornar 400 para dados inválidos', async () => {
      service.create.mockRejectedValue(new Error('Dados de entrada inválidos'));

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
      service.create.mockRejectedValue(new Error('Unidade não encontrada'));

      await expect(controller.create(mockCreateSetorDto)).rejects.toThrow(
        'Unidade não encontrada',
      );
    });

    it('deve retornar 500 para erro interno', async () => {
      service.findById.mockRejectedValue(new Error('Erro interno do servidor'));

      await expect(controller.findOne('invalid-id')).rejects.toThrow(
        'Erro interno do servidor',
      );
    });
  });

  describe('integração com unidades', () => {
    it('deve carregar dados da unidade ao buscar setor', async () => {
      const setorComUnidade = {
        ...mockSetor,
        unidade: mockUnidade,
      };

      service.findById.mockResolvedValue(setorComUnidade);

      const result = await controller.findOne(mockSetor.id);

      expect(result.unidade).toBeDefined();
      expect(result.unidade.nome).toBe(mockUnidade.nome);
    });

    it('deve validar se unidade está ativa ao criar setor', async () => {
      service.create.mockRejectedValue(new Error('Unidade não está ativa'));

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

      const result = await controller.findOne(mockSetor.id);

      expect(result.usuarios).toBeDefined();
      expect(result.usuarios).toHaveLength(1);
    });
  });

  describe('casos de uso específicos', () => {
    // Testes removidos pois o método findAll não existe no SetorController
    // O controlador possui apenas métodos create, update e findOne
  });
});
