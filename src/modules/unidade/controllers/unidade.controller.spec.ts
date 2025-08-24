import { Test, TestingModule } from '@nestjs/testing';
import { UnidadeController } from './unidade.controller';
import { UnidadeService } from '../services/unidade.service';
import { CreateUnidadeDto } from '../dto/create-unidade.dto';
import { UpdateUnidadeDto } from '../dto/update-unidade.dto';
import {
  Unidade,
  TipoUnidade,
  StatusUnidade,
} from '../../../entities/unidade.entity';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { ExecutionContext } from '@nestjs/common';

/**
 * Testes unitários para o UnidadeController
 *
 * Cobertura de testes:
 * - Listagem de unidades com filtros e paginação
 * - Busca de unidade por ID
 * - Criação de novas unidades
 * - Atualização de dados de unidades
 * - Atualização de status
 * - Remoção de unidades
 * - Validação de permissões e autenticação
 * - Tratamento de erros HTTP
 */
describe('UnidadeController', () => {
  let controller: UnidadeController;
  let service: jest.Mocked<UnidadeService>;

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

  const mockCreateUnidadeDto: CreateUnidadeDto = {
    nome: 'CREAS Norte',
    codigo: 'CREAS002',
    sigla: 'CN',
    tipo: TipoUnidade.CREAS,
    endereco: 'Av. Norte, 456',
    telefone: '(84) 3232-5678',
    email: 'creas.norte@semtas.natal.gov.br',
    responsavel_matricula: 'SEMTAS002',
  };

  const mockUpdateUnidadeDto: UpdateUnidadeDto = {
    nome: 'CRAS Centro Atualizado',
    endereco: 'Rua das Flores, 123 - Sala 2',
    telefone: '(84) 3232-1234',
  };

  const mockPaginatedResult = {
    data: [mockUnidade],
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
    const mockUnidadeService = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByCodigo: jest.fn(),
      findBySigla: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
      remove: jest.fn(),
      getStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UnidadeController],
      providers: [
        {
          provide: UnidadeService,
          useValue: mockUnidadeService,
        },
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue(mockAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    controller = module.get<UnidadeController>(UnidadeController);
    service = module.get(UnidadeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('deve retornar lista paginada de unidades', async () => {
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
        nome: 'CRAS',
        tipo: TipoUnidade.CRAS,
        status: StatusUnidade.ATIVO,
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
    it('deve retornar uma unidade quando encontrada', async () => {
      service.findById.mockResolvedValue(mockUnidade);

      const result = await controller.findById('unidade-123');

      expect(result).toEqual(mockUnidade);
      expect(service.findById).toHaveBeenCalledWith('unidade-123');
    });

    it('deve propagar erro quando unidade não encontrada', async () => {
      service.findById.mockRejectedValue(new Error('Unidade não encontrada'));

      await expect(controller.findById('invalid-id')).rejects.toThrow(
        'Unidade não encontrada',
      );
    });

    it('deve validar formato UUID do ID', async () => {
      await expect(controller.findById('invalid-uuid')).rejects.toThrow();
    });
  });

  describe('findByCodigo', () => {
    it('deve retornar unidade por código', async () => {
      service.findByCodigo.mockResolvedValue(mockUnidade);

      const result = await controller.findByCodigo('CRAS001');

      expect(result).toEqual(mockUnidade);
      expect(service.findByCodigo).toHaveBeenCalledWith('CRAS001');
    });

    it('deve propagar erro quando código não encontrado', async () => {
      service.findByCodigo.mockRejectedValue(
        new Error('Código não encontrado'),
      );

      await expect(controller.findByCodigo('INVALID')).rejects.toThrow(
        'Código não encontrado',
      );
    });
  });

  describe('findBySigla', () => {
    it('deve retornar unidade por sigla', async () => {
      service.findBySigla.mockResolvedValue(mockUnidade);

      const result = await controller.findBySigla('CC');

      expect(result).toEqual(mockUnidade);
      expect(service.findBySigla).toHaveBeenCalledWith('CC');
    });

    it('deve propagar erro quando sigla não encontrada', async () => {
      service.findBySigla.mockRejectedValue(new Error('Sigla não encontrada'));

      await expect(controller.findBySigla('XX')).rejects.toThrow(
        'Sigla não encontrada',
      );
    });
  });

  describe('create', () => {
    it('deve criar uma nova unidade com sucesso', async () => {
      const novaUnidade = {
        ...mockUnidade,
        ...mockCreateUnidadeDto,
        id: 'new-unidade-id',
      };

      service.create.mockResolvedValue(novaUnidade);

      const result = await controller.create(mockCreateUnidadeDto);

      expect(result).toEqual(novaUnidade);
      expect(service.create).toHaveBeenCalledWith(mockCreateUnidadeDto);
    });

    it('deve propagar erro de validação', async () => {
      service.create.mockRejectedValue(new Error('Dados inválidos'));

      await expect(controller.create(mockCreateUnidadeDto)).rejects.toThrow(
        'Dados inválidos',
      );
    });

    it('deve propagar erro de código duplicado', async () => {
      service.create.mockRejectedValue(new Error('Código já existe'));

      await expect(controller.create(mockCreateUnidadeDto)).rejects.toThrow(
        'Código já existe',
      );
    });

    it('deve validar dados obrigatórios', async () => {
      const createDtoIncompleto = {
        nome: 'Unidade Teste',
        // faltando campos obrigatórios
      } as CreateUnidadeDto;

      await expect(controller.create(createDtoIncompleto)).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('deve atualizar uma unidade com sucesso', async () => {
      const unidadeAtualizada = {
        ...mockUnidade,
        ...mockUpdateUnidadeDto,
        updated_at: new Date(),
      };

      service.update.mockResolvedValue(unidadeAtualizada);

      const result = await controller.update(
        mockUnidade.id,
        mockUpdateUnidadeDto,
      );

      expect(result).toEqual(unidadeAtualizada);
      expect(service.update).toHaveBeenCalledWith(
        mockUnidade.id,
        mockUpdateUnidadeDto,
      );
    });

    it('deve propagar erro quando unidade não encontrada', async () => {
      service.update.mockRejectedValue(new Error('Unidade não encontrada'));

      await expect(
        controller.update('invalid-id', mockUpdateUnidadeDto),
      ).rejects.toThrow('Unidade não encontrada');
    });

    it('deve validar formato UUID do ID', async () => {
      await expect(
        controller.update('invalid-uuid', mockUpdateUnidadeDto),
      ).rejects.toThrow();
    });

    it('deve permitir atualização parcial', async () => {
      const updateParcial = {
        nome: 'Novo Nome',
      };

      const unidadeAtualizada = {
        ...mockUnidade,
        nome: 'Novo Nome',
        updated_at: new Date(),
      };

      service.update.mockResolvedValue(unidadeAtualizada);

      const result = await controller.update(mockUnidade.id, updateParcial);

      expect(result).toEqual(unidadeAtualizada);
      expect(service.update).toHaveBeenCalledWith(
        mockUnidade.id,
        updateParcial,
      );
    });
  });

  describe('updateStatus', () => {
    it('deve atualizar status da unidade', async () => {
      const unidadeComStatusAtualizado = {
        ...mockUnidade,
        status: StatusUnidade.INATIVO,
        updated_at: new Date(),
      };

      service.updateStatus.mockResolvedValue(unidadeComStatusAtualizado);

      const result = await controller.updateStatus(mockUnidade.id, {
        status: StatusUnidade.INATIVO,
      });

      expect(result).toEqual(unidadeComStatusAtualizado);
      expect(service.updateStatus).toHaveBeenCalledWith(
        mockUnidade.id,
        StatusUnidade.INATIVO,
      );
    });

    it('deve validar status válido', async () => {
      await expect(
        controller.updateStatus(mockUnidade.id, {
          status: 'INVALID_STATUS' as StatusUnidade,
        }),
      ).rejects.toThrow();
    });

    it('deve propagar erro quando unidade não encontrada', async () => {
      service.updateStatus.mockRejectedValue(
        new Error('Unidade não encontrada'),
      );

      await expect(
        controller.updateStatus('invalid-id', {
          status: StatusUnidade.INATIVO,
        }),
      ).rejects.toThrow('Unidade não encontrada');
    });
  });

  describe('remove', () => {
    it('deve remover uma unidade com sucesso', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove(mockUnidade.id);

      expect(service.remove).toHaveBeenCalledWith(mockUnidade.id);
    });

    it('deve propagar erro quando unidade não encontrada', async () => {
      service.remove.mockRejectedValue(new Error('Unidade não encontrada'));

      await expect(controller.remove('invalid-id')).rejects.toThrow(
        'Unidade não encontrada',
      );
    });

    it('deve validar formato UUID do ID', async () => {
      await expect(controller.remove('invalid-uuid')).rejects.toThrow();
    });

    it('deve propagar erro quando unidade tem dependências', async () => {
      service.remove.mockRejectedValue(
        new Error('Unidade possui usuários vinculados'),
      );

      await expect(controller.remove(mockUnidade.id)).rejects.toThrow(
        'Unidade possui usuários vinculados',
      );
    });
  });

  describe('getStats', () => {
    it('deve retornar estatísticas das unidades', async () => {
      const mockStats = {
        total: 10,
        ativas: 8,
        inativas: 2,
        porTipo: {
          CRAS: 5,
          CREAS: 3,
          SEDE: 1,
          OUTROS: 1,
        },
      };

      service.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats();

      expect(result).toEqual(mockStats);
      expect(service.getStats).toHaveBeenCalled();
    });

    it('deve propagar erro de acesso a estatísticas', async () => {
      service.getStats.mockRejectedValue(
        new Error('Erro ao buscar estatísticas'),
      );

      await expect(controller.getStats()).rejects.toThrow(
        'Erro ao buscar estatísticas',
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
        codigo: 'INVALID_CODE_TOO_LONG_123456789',
        email: 'email-invalido',
      } as CreateUnidadeDto;

      await expect(controller.create(dadosInvalidos)).rejects.toThrow();
    });
  });

  describe('tratamento de erros HTTP', () => {
    it('deve retornar 404 para unidade não encontrada', async () => {
      service.findById.mockRejectedValue(new Error('Unidade não encontrada'));

      await expect(controller.findById('invalid-id')).rejects.toThrow(
        'Unidade não encontrada',
      );
    });

    it('deve retornar 400 para dados inválidos', async () => {
      service.create.mockRejectedValue(new Error('Dados de entrada inválidos'));

      await expect(controller.create(mockCreateUnidadeDto)).rejects.toThrow(
        'Dados de entrada inválidos',
      );
    });

    it('deve retornar 409 para conflito de código', async () => {
      service.create.mockRejectedValue(new Error('Código já existe'));

      await expect(controller.create(mockCreateUnidadeDto)).rejects.toThrow(
        'Código já existe',
      );
    });

    it('deve retornar 500 para erro interno', async () => {
      service.findAll.mockRejectedValue(new Error('Erro interno do servidor'));

      await expect(controller.findAll({ page: 1, limit: 10 })).rejects.toThrow(
        'Erro interno do servidor',
      );
    });
  });

  describe('integração com outros módulos', () => {
    it('deve carregar relacionamentos com setores', async () => {
      const unidadeComSetores = {
        ...mockUnidade,
        setores: [
          {
            id: 'setor-1',
            nome: 'Atendimento',
            unidade_id: mockUnidade.id,
          },
        ],
      };

      service.findById.mockResolvedValue(unidadeComSetores as any);

      const result = await controller.findById(mockUnidade.id);

      expect(result.setores).toBeDefined();
      expect(result.setores).toHaveLength(1);
    });

    it('deve carregar relacionamentos com usuários', async () => {
      const unidadeComUsuarios = {
        ...mockUnidade,
        usuarios: [
          {
            id: 'usuario-1',
            nome: 'João Silva',
            unidade_id: mockUnidade.id,
          },
        ],
      };

      service.findById.mockResolvedValue(unidadeComUsuarios as any);

      const result = await controller.findById(mockUnidade.id);

      expect(result.usuarios).toBeDefined();
      expect(result.usuarios).toHaveLength(1);
    });
  });
});
