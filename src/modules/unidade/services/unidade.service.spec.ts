import { Test, TestingModule } from '@nestjs/testing';
import { UnidadeService } from './unidade.service';
import { UnidadeRepository } from '../repositories/unidade.repository';
import { SetorRepository } from '../repositories/setor.repository';
import { DataSource } from 'typeorm';
import { CreateUnidadeDto } from '../dto/create-unidade.dto';
import { UpdateUnidadeDto } from '../dto/update-unidade.dto';
import { UpdateStatusUnidadeDto } from '../dto/update-status-unidade.dto';
import {
  Unidade,
  TipoUnidade,
  StatusUnidade,
} from '../../../entities/unidade.entity';
import {
  throwUnidadeNotFound,
  throwUnidadeAlreadyExists,
  throwUnidadeOperationFailed,
} from '../../../shared/exceptions/error-catalog/domains/unidade.errors';

/**
 * Testes unitários para o UnidadeService
 *
 * Cobertura de testes:
 * - Criação de unidades
 * - Busca de unidades
 * - Atualização de dados
 * - Atualização de status
 * - Listagem com filtros
 * - Validações de negócio
 * - Tratamento de erros
 */
describe('UnidadeService', () => {
  let service: UnidadeService;
  let repository: jest.Mocked<UnidadeRepository>;
  let dataSource: jest.Mocked<DataSource>;

  const mockUnidade: Unidade = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    nome: 'CRAS Centro',
    codigo: 'CRAS001',
    sigla: 'CC',
    tipo: TipoUnidade.CRAS,
    endereco: 'Rua das Flores, 123 - Centro',
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
    nome: 'CRAS Norte',
    codigo: 'CRAS002',
    sigla: 'CN',
    tipo: TipoUnidade.CRAS,
    endereco: 'Rua do Norte, 456 - Zona Norte',
    telefone: '(84) 3232-5678',
    email: 'cras.norte@semtas.natal.gov.br',
    responsavel_matricula: 'SEMTAS002',
  };

  const mockUpdateUnidadeDto: UpdateUnidadeDto = {
    nome: 'CRAS Centro Atualizado',
    endereco: 'Rua das Flores, 123 - Centro - Atualizado',
    telefone: '(84) 3232-9999',
  };

  beforeEach(async () => {
    const mockUnidadeRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByCodigo: jest.fn(),
      findBySigla: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
      remove: jest.fn(),
      count: jest.fn(),
    };

    const mockSetorRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByNomeAndUnidade: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      count: jest.fn(),
    };

    const mockManager = {
      getRepository: jest.fn().mockReturnValue(mockUnidadeRepository),
    };

    const mockDataSource = {
      transaction: jest
        .fn()
        .mockImplementation((callbackOrIsolation, callback) => {
          // Se apenas um parâmetro for passado, é o callback
          if (typeof callbackOrIsolation === 'function') {
            return callbackOrIsolation(mockManager);
          }
          // Se dois parâmetros, o segundo é o callback
          return callback(mockManager);
        }),
      getRepository: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnidadeService,
        {
          provide: UnidadeRepository,
          useValue: mockUnidadeRepository,
        },
        {
          provide: SetorRepository,
          useValue: mockSetorRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<UnidadeService>(UnidadeService);
    repository = module.get(UnidadeRepository);
    dataSource = module.get(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('deve retornar lista de unidades com paginação', async () => {
      const mockUnidades = [mockUnidade];
      const mockTotal = 1;

      repository.findAll.mockResolvedValue({
        data: mockUnidades,
        total: mockTotal,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      const result = await service.findAll({
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        data: mockUnidades,
        total: mockTotal,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
      expect(repository.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
      });
    });

    it('deve aplicar filtros corretamente', async () => {
      const filtros = {
        nome: 'CRAS',
        tipo: TipoUnidade.CRAS,
        status: StatusUnidade.ATIVO,
        page: 1,
        limit: 10,
      };

      repository.findAll.mockResolvedValue({
        data: [mockUnidade],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      await service.findAll(filtros);

      expect(repository.findAll).toHaveBeenCalledWith(filtros);
    });
  });

  describe('findById', () => {
    it('deve retornar uma unidade quando encontrada', async () => {
      repository.findById.mockResolvedValue(mockUnidade);

      const result = await service.findById(
        '123e4567-e89b-12d3-a456-426614174000',
      );

      expect(result).toEqual(mockUnidade);
      expect(repository.findById).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174000',
      );
    });

    it('deve lançar erro quando unidade não encontrada', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById('invalid-id')).rejects.toThrow();
    });
  });

  describe('create', () => {
    it('deve criar uma nova unidade com sucesso', async () => {
      const novaUnidade = {
        ...mockUnidade,
        ...mockCreateUnidadeDto,
        id: 'new-id',
      };

      repository.findByCodigo.mockResolvedValue(null);
      repository.findBySigla.mockResolvedValue(null);
      repository.create.mockReturnValue({ ...novaUnidade, id: 'new-id' });
      repository.save.mockResolvedValue({ ...novaUnidade, id: 'new-id' });

      const result = await service.create(mockCreateUnidadeDto);

      expect(result).toEqual({ ...novaUnidade, id: 'new-id' });
      expect(repository.findByCodigo).toHaveBeenCalledWith(
        mockCreateUnidadeDto.codigo,
      );
      expect(repository.findBySigla).toHaveBeenCalledWith(
        mockCreateUnidadeDto.sigla,
      );
      expect(repository.create).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalledWith({
        ...novaUnidade,
        id: 'new-id',
      });
    });

    it('deve lançar erro quando código já existe', async () => {
      repository.findByCodigo.mockResolvedValue(mockUnidade);

      await expect(service.create(mockCreateUnidadeDto)).rejects.toThrow();

      expect(repository.create).not.toHaveBeenCalled();
    });

    it('deve lançar erro quando sigla já existe', async () => {
      repository.findByCodigo.mockResolvedValue(null);
      repository.findBySigla.mockResolvedValue(mockUnidade);

      await expect(service.create(mockCreateUnidadeDto)).rejects.toThrow();

      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('deve atualizar uma unidade com sucesso', async () => {
      const unidadeAtualizada = {
        ...mockUnidade,
        ...mockUpdateUnidadeDto,
        updated_at: new Date(),
      };

      repository.findById.mockResolvedValue(mockUnidade);
      repository.update.mockResolvedValue(unidadeAtualizada);

      const result = await service.update(mockUnidade.id, mockUpdateUnidadeDto);

      expect(result).toEqual(unidadeAtualizada);
      expect(repository.findById).toHaveBeenCalledWith(mockUnidade.id);
      expect(repository.update).toHaveBeenCalledWith(
        mockUnidade.id,
        mockUpdateUnidadeDto,
      );
    });

    it('deve lançar erro quando unidade não encontrada', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.update('invalid-id', mockUpdateUnidadeDto),
      ).rejects.toThrow();

      expect(repository.update).not.toHaveBeenCalled();
    });

    it('deve validar código único ao atualizar', async () => {
      const updateComCodigo = {
        ...mockUpdateUnidadeDto,
        codigo: 'NOVO_CODIGO',
      };

      repository.findById.mockResolvedValue(mockUnidade);
      repository.findByCodigo.mockResolvedValue({
        ...mockUnidade,
        id: 'outro-id',
      });

      await expect(
        service.update(mockUnidade.id, updateComCodigo),
      ).rejects.toThrow();

      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('deve atualizar status da unidade com sucesso', async () => {
      const updateStatusDto: UpdateStatusUnidadeDto = {
        status: StatusUnidade.INATIVO,
      };

      const unidadeComStatusAtualizado = {
        ...mockUnidade,
        status: StatusUnidade.INATIVO,
        updated_at: new Date(),
      };

      repository.findById.mockResolvedValue(mockUnidade);
      repository.updateStatus.mockResolvedValue(unidadeComStatusAtualizado);

      const result = await service.updateStatus(
        mockUnidade.id,
        updateStatusDto,
      );

      expect(result).toEqual(unidadeComStatusAtualizado);
      expect(repository.updateStatus).toHaveBeenCalledWith(
        mockUnidade.id,
        updateStatusDto.status,
      );
    });

    it('deve lançar erro quando unidade não encontrada', async () => {
      const updateStatusDto: UpdateStatusUnidadeDto = {
        status: StatusUnidade.INATIVO,
      };

      repository.findById.mockResolvedValue(null);

      await expect(
        service.updateStatus('invalid-id', updateStatusDto),
      ).rejects.toThrow();

      expect(repository.updateStatus).not.toHaveBeenCalled();
    });
  });

  // Método remove não implementado no UnidadeService
  // describe('remove', () => {
  //   it('deve remover uma unidade com sucesso', async () => {
  //     repository.findById.mockResolvedValue(mockUnidade);
  //     repository.remove.mockResolvedValue(undefined);
  //
  //     await service.remove(mockUnidade.id);
  //
  //     expect(repository.findById).toHaveBeenCalledWith(mockUnidade.id);
  //     expect(repository.remove).toHaveBeenCalledWith(mockUnidade.id);
  //   });
  //
  //   it('deve lançar erro quando unidade não encontrada', async () => {
  //     repository.findById.mockResolvedValue(null);
  //
  //     await expect(service.remove('invalid-id')).rejects.toThrow();
  //
  //     expect(repository.remove).not.toHaveBeenCalled();
  //   });
  // });

  describe('validações de negócio', () => {
    it('deve validar formato do email', async () => {
      const createDtoComEmailInvalido = {
        ...mockCreateUnidadeDto,
        email: 'email-invalido',
      };

      repository.findByCodigo.mockResolvedValue(null);
      repository.findBySigla.mockResolvedValue(null);

      // Assumindo que a validação é feita no DTO ou no service
      await expect(service.create(createDtoComEmailInvalido)).rejects.toThrow();
    });

    it('deve validar formato do telefone', async () => {
      const createDtoComTelefoneInvalido = {
        ...mockCreateUnidadeDto,
        telefone: '123',
      };

      repository.findByCodigo.mockResolvedValue(null);
      repository.findBySigla.mockResolvedValue(null);

      // Assumindo que a validação é feita no DTO ou no service
      await expect(
        service.create(createDtoComTelefoneInvalido),
      ).rejects.toThrow();
    });
  });

  describe('tratamento de erros', () => {
    it('deve tratar erro de transação no banco', async () => {
      repository.findByCodigo.mockResolvedValue(null);
      repository.findBySigla.mockResolvedValue(null);
      repository.create.mockRejectedValue(new Error('Database error'));

      await expect(service.create(mockCreateUnidadeDto)).rejects.toThrow();
    });

    it('deve tratar erro de conexão com banco', async () => {
      repository.findAll.mockRejectedValue(new Error('Connection error'));

      await expect(service.findAll({ page: 1, limit: 10 })).rejects.toThrow();
    });
  });
});
