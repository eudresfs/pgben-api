import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AgendamentoService } from './agendamento.service';
import { AgendamentoVisita } from '../entities/agendamento-visita.entity';
import { Usuario } from '../../usuario/entities/usuario.entity';
import { Cidadao } from '../../cidadao/entities/cidadao.entity';
import { Unidade } from '../../unidade/entities/unidade.entity';
import { CriarAgendamentoDto } from '../dto/criar-agendamento.dto';
import { AtualizarAgendamentoDto } from '../dto/atualizar-agendamento.dto';
import { StatusAgendamento, TipoVisita, PrioridadeVisita } from '../enums';

/**
 * Testes unitários para o AgendamentoService
 *
 * Cobertura de testes:
 * - Criação de agendamentos
 * - Busca de agendamentos (todos, por ID, por técnico, por beneficiário, em atraso)
 * - Confirmação de agendamentos
 * - Reagendamento
 * - Cancelamento
 * - Validações de negócio
 * - Tratamento de erros
 */
describe('AgendamentoService', () => {
  let service: AgendamentoService;
  let agendamentoRepository: jest.Mocked<Repository<AgendamentoVisita>>;
  let usuarioRepository: jest.Mocked<Repository<Usuario>>;
  let cidadaoRepository: jest.Mocked<Repository<Cidadao>>;
  let unidadeRepository: jest.Mocked<Repository<Unidade>>;
  let dataSource: jest.Mocked<DataSource>;

  const mockAgendamento: AgendamentoVisita = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    beneficiarioId: 'beneficiario-123',
    concessaoId: 'concessao-123',
    tecnicoResponsavelId: 'tecnico-123',
    unidadeId: 'unidade-123',
    dataHoraAgendada: new Date('2025-01-25T10:00:00Z'),
    tipoVisita: TipoVisita.INICIAL,
    prioridade: PrioridadeVisita.NORMAL,
    status: StatusAgendamento.AGENDADO,
    observacoes: 'Primeira visita domiciliar',
    enderecoVisita: 'Rua das Flores, 123 - Centro',
    telefoneContato: '(84) 99999-9999',
    notificarBeneficiario: true,
    motivoVisita: 'Avaliação inicial do beneficiário',
    prazoLimite: new Date('2025-01-30'),
    dadosComplementares: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user-123',
    updatedBy: 'user-123',
    beneficiario: null,
    concessao: null,
    tecnicoResponsavel: null,
    unidade: null,
    visita: null,
  };

  const mockUsuario: Usuario = {
    id: 'tecnico-123',
    nome: 'João Silva',
    email: 'joao.silva@semtas.natal.gov.br',
    cpf: '12345678901',
    telefone: '(84) 99999-9999',
    matricula: 'SEMTAS001',
    senhaHash: 'hashedPassword',
    roleId: 'role-id',
    role: null,
    unidadeId: 'unidade-123',
    unidade: null,
    setorId: 'setor-id',
    setor: null,
    status: 'ativo',
    primeiroAcesso: true,
    ultimoLogin: null,
    tentativasLogin: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCidadao: Cidadao = {
    id: 'beneficiario-123',
    nome: 'Maria Santos',
    cpf: '98765432100',
    dataNascimento: new Date('1980-05-15'),
    telefone: '(84) 88888-8888',
    email: 'maria.santos@email.com',
    endereco: 'Rua das Flores, 123 - Centro',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUnidade: Unidade = {
    id: 'unidade-123',
    nome: 'CRAS Centro',
    codigo: 'CRAS001',
    sigla: 'CC',
    tipo: 'CRAS',
    endereco: 'Rua das Flores, 123 - Centro',
    telefone: '(84) 3232-1234',
    email: 'cras.centro@semtas.natal.gov.br',
    status: 'ativo',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAgendamentoRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
    getMany: jest.fn(),
  };

  const mockUsuarioRepository = {
    findOneBy: jest.fn(),
  };

  const mockCidadaoRepository = {
    findOneBy: jest.fn(),
  };

  const mockUnidadeRepository = {
    findOneBy: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn(),
    getRepository: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgendamentoService,
        {
          provide: getRepositoryToken(AgendamentoVisita),
          useValue: mockAgendamentoRepository,
        },
        {
          provide: getRepositoryToken(Usuario),
          useValue: mockUsuarioRepository,
        },
        {
          provide: getRepositoryToken(Cidadao),
          useValue: mockCidadaoRepository,
        },
        {
          provide: getRepositoryToken(Unidade),
          useValue: mockUnidadeRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<AgendamentoService>(AgendamentoService);
    agendamentoRepository = module.get(getRepositoryToken(AgendamentoVisita));
    usuarioRepository = module.get(getRepositoryToken(Usuario));
    cidadaoRepository = module.get(getRepositoryToken(Cidadao));
    unidadeRepository = module.get(getRepositoryToken(Unidade));
    dataSource = module.get(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('criar', () => {
    const criarAgendamentoDto: CriarAgendamentoDto = {
      beneficiarioId: 'beneficiario-123',
      concessaoId: 'concessao-123',
      tecnicoResponsavelId: 'tecnico-123',
      unidadeId: 'unidade-123',
      dataHoraAgendada: new Date('2025-01-25T10:00:00Z'),
      tipoVisita: TipoVisita.INICIAL,
      prioridade: PrioridadeVisita.NORMAL,
      observacoes: 'Primeira visita domiciliar',
      enderecoVisita: 'Rua das Flores, 123 - Centro',
      telefoneContato: '(84) 99999-9999',
      notificarBeneficiario: true,
      motivoVisita: 'Avaliação inicial do beneficiário',
      prazoLimite: new Date('2025-01-30'),
    };

    it('deve criar um agendamento com sucesso', async () => {
      // Arrange
      usuarioRepository.findOneBy.mockResolvedValue(mockUsuario);
      cidadaoRepository.findOneBy.mockResolvedValue(mockCidadao);
      unidadeRepository.findOneBy.mockResolvedValue(mockUnidade);
      agendamentoRepository.create.mockReturnValue(mockAgendamento);
      agendamentoRepository.save.mockResolvedValue(mockAgendamento);

      // Act
      const result = await service.criar(criarAgendamentoDto, 'user-123');

      // Assert
      expect(usuarioRepository.findOneBy).toHaveBeenCalledWith({
        id: criarAgendamentoDto.tecnicoResponsavelId,
      });
      expect(cidadaoRepository.findOneBy).toHaveBeenCalledWith({
        id: criarAgendamentoDto.beneficiarioId,
      });
      expect(unidadeRepository.findOneBy).toHaveBeenCalledWith({
        id: criarAgendamentoDto.unidadeId,
      });
      expect(agendamentoRepository.create).toHaveBeenCalled();
      expect(agendamentoRepository.save).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({
        id: mockAgendamento.id,
        status: StatusAgendamento.AGENDADO,
      }));
    });

    it('deve lançar erro se técnico não for encontrado', async () => {
      // Arrange
      usuarioRepository.findOneBy.mockResolvedValue(null);

      // Act & Assert
      await expect(service.criar(criarAgendamentoDto, 'user-123'))
        .rejects
        .toThrow(NotFoundException);
    });

    it('deve lançar erro se beneficiário não for encontrado', async () => {
      // Arrange
      usuarioRepository.findOneBy.mockResolvedValue(mockUsuario);
      cidadaoRepository.findOneBy.mockResolvedValue(null);

      // Act & Assert
      await expect(service.criar(criarAgendamentoDto, 'user-123'))
        .rejects
        .toThrow(NotFoundException);
    });

    it('deve lançar erro se unidade não for encontrada', async () => {
      // Arrange
      usuarioRepository.findOneBy.mockResolvedValue(mockUsuario);
      cidadaoRepository.findOneBy.mockResolvedValue(mockCidadao);
      unidadeRepository.findOneBy.mockResolvedValue(null);

      // Act & Assert
      await expect(service.criar(criarAgendamentoDto, 'user-123'))
        .rejects
        .toThrow(NotFoundException);
    });

    it('deve lançar erro se data de agendamento for no passado', async () => {
      // Arrange
      const dtoComDataPassada = {
        ...criarAgendamentoDto,
        dataHoraAgendada: new Date('2020-01-01T10:00:00Z'),
      };
      usuarioRepository.findOneBy.mockResolvedValue(mockUsuario);
      cidadaoRepository.findOneBy.mockResolvedValue(mockCidadao);
      unidadeRepository.findOneBy.mockResolvedValue(mockUnidade);

      // Act & Assert
      await expect(service.criar(dtoComDataPassada, 'user-123'))
        .rejects
        .toThrow(BadRequestException);
    });
  });

  describe('buscarTodos', () => {
    it('deve retornar lista paginada de agendamentos', async () => {
      // Arrange
      const mockAgendamentos = [mockAgendamento];
      const mockTotal = 1;
      agendamentoRepository.getManyAndCount.mockResolvedValue([mockAgendamentos, mockTotal]);

      // Act
      const result = await service.buscarTodos({ page: 1, limit: 10 });

      // Assert
      expect(agendamentoRepository.createQueryBuilder).toHaveBeenCalled();
      expect(result).toEqual({
        data: expect.any(Array),
        total: mockTotal,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });
  });

  describe('buscarPorId', () => {
    it('deve retornar agendamento por ID', async () => {
      // Arrange
      agendamentoRepository.findOne.mockResolvedValue(mockAgendamento);

      // Act
      const result = await service.buscarPorId('123e4567-e89b-12d3-a456-426614174000');

      // Assert
      expect(agendamentoRepository.findOne).toHaveBeenCalledWith({
        where: { id: '123e4567-e89b-12d3-a456-426614174000' },
        relations: ['beneficiario', 'tecnicoResponsavel', 'unidade', 'visita'],
      });
      expect(result).toEqual(expect.objectContaining({
        id: mockAgendamento.id,
      }));
    });

    it('deve lançar erro se agendamento não for encontrado', async () => {
      // Arrange
      agendamentoRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.buscarPorId('id-inexistente'))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('confirmar', () => {
    it('deve confirmar agendamento com sucesso', async () => {
      // Arrange
      const agendamentoConfirmado = {
        ...mockAgendamento,
        status: StatusAgendamento.CONFIRMADO,
      };
      agendamentoRepository.findOneBy.mockResolvedValue(mockAgendamento);
      agendamentoRepository.save.mockResolvedValue(agendamentoConfirmado);

      // Act
      const result = await service.confirmar('123e4567-e89b-12d3-a456-426614174000', 'user-123');

      // Assert
      expect(agendamentoRepository.findOneBy).toHaveBeenCalledWith({
        id: '123e4567-e89b-12d3-a456-426614174000',
      });
      expect(agendamentoRepository.save).toHaveBeenCalled();
      expect(result.status).toBe(StatusAgendamento.CONFIRMADO);
    });

    it('deve lançar erro se agendamento não for encontrado', async () => {
      // Arrange
      agendamentoRepository.findOneBy.mockResolvedValue(null);

      // Act & Assert
      await expect(service.confirmar('id-inexistente', 'user-123'))
        .rejects
        .toThrow(NotFoundException);
    });

    it('deve lançar erro se agendamento já foi realizado', async () => {
      // Arrange
      const agendamentoRealizado = {
        ...mockAgendamento,
        status: StatusAgendamento.REALIZADO,
      };
      agendamentoRepository.findOneBy.mockResolvedValue(agendamentoRealizado);

      // Act & Assert
      await expect(service.confirmar('123e4567-e89b-12d3-a456-426614174000', 'user-123'))
        .rejects
        .toThrow(BadRequestException);
    });
  });

  describe('reagendar', () => {
    const atualizarDto: AtualizarAgendamentoDto = {
      dataHoraAgendada: new Date('2025-01-26T14:00:00Z'),
      observacoes: 'Reagendado a pedido do beneficiário',
    };

    it('deve reagendar com sucesso', async () => {
      // Arrange
      const agendamentoReagendado = {
        ...mockAgendamento,
        ...atualizarDto,
        status: StatusAgendamento.REAGENDADO,
      };
      agendamentoRepository.findOneBy.mockResolvedValue(mockAgendamento);
      agendamentoRepository.save.mockResolvedValue(agendamentoReagendado);

      // Act
      const result = await service.reagendar('123e4567-e89b-12d3-a456-426614174000', atualizarDto, 'user-123');

      // Assert
      expect(agendamentoRepository.findOneBy).toHaveBeenCalledWith({
        id: '123e4567-e89b-12d3-a456-426614174000',
      });
      expect(agendamentoRepository.save).toHaveBeenCalled();
      expect(result.status).toBe(StatusAgendamento.REAGENDADO);
    });

    it('deve lançar erro se nova data for no passado', async () => {
      // Arrange
      const dtoComDataPassada = {
        ...atualizarDto,
        dataHoraAgendada: new Date('2020-01-01T10:00:00Z'),
      };
      agendamentoRepository.findOneBy.mockResolvedValue(mockAgendamento);

      // Act & Assert
      await expect(service.reagendar('123e4567-e89b-12d3-a456-426614174000', dtoComDataPassada, 'user-123'))
        .rejects
        .toThrow(BadRequestException);
    });
  });

  describe('cancelar', () => {
    it('deve cancelar agendamento com sucesso', async () => {
      // Arrange
      const agendamentoCancelado = {
        ...mockAgendamento,
        status: StatusAgendamento.CANCELADO,
      };
      agendamentoRepository.findOneBy.mockResolvedValue(mockAgendamento);
      agendamentoRepository.save.mockResolvedValue(agendamentoCancelado);

      // Act
      const result = await service.cancelar('123e4567-e89b-12d3-a456-426614174000', 'Cancelado pelo beneficiário', 'user-123');

      // Assert
      expect(agendamentoRepository.findOneBy).toHaveBeenCalledWith({
        id: '123e4567-e89b-12d3-a456-426614174000',
      });
      expect(agendamentoRepository.save).toHaveBeenCalled();
      expect(result.status).toBe(StatusAgendamento.CANCELADO);
    });

    it('deve lançar erro se agendamento não for encontrado', async () => {
      // Arrange
      agendamentoRepository.findOneBy.mockResolvedValue(null);

      // Act & Assert
      await expect(service.cancelar('id-inexistente', 'Motivo', 'user-123'))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('buscarEmAtraso', () => {
    it('deve retornar agendamentos em atraso', async () => {
      // Arrange
      const mockAgendamentosAtraso = [mockAgendamento];
      agendamentoRepository.getMany.mockResolvedValue(mockAgendamentosAtraso);

      // Act
      const result = await service.buscarEmAtraso();

      // Assert
      expect(agendamentoRepository.createQueryBuilder).toHaveBeenCalled();
      expect(result).toEqual(expect.any(Array));
    });
  });

  describe('buscarPorTecnico', () => {
    it('deve retornar agendamentos por técnico', async () => {
      // Arrange
      const mockAgendamentos = [mockAgendamento];
      const mockTotal = 1;
      agendamentoRepository.getManyAndCount.mockResolvedValue([mockAgendamentos, mockTotal]);

      // Act
      const result = await service.buscarPorTecnico('tecnico-123', { page: 1, limit: 10 });

      // Assert
      expect(agendamentoRepository.createQueryBuilder).toHaveBeenCalled();
      expect(result).toEqual({
        data: expect.any(Array),
        total: mockTotal,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });
  });

  describe('buscarPorBeneficiario', () => {
    it('deve retornar agendamentos por beneficiário', async () => {
      // Arrange
      const mockAgendamentos = [mockAgendamento];
      const mockTotal = 1;
      agendamentoRepository.getManyAndCount.mockResolvedValue([mockAgendamentos, mockTotal]);

      // Act
      const result = await service.buscarPorBeneficiario('beneficiario-123', { page: 1, limit: 10 });

      // Assert
      expect(agendamentoRepository.createQueryBuilder).toHaveBeenCalled();
      expect(result).toEqual({
        data: expect.any(Array),
        total: mockTotal,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });
  });
});