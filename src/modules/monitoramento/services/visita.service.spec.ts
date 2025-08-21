import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { VisitaService } from './visita.service';
import { VisitaDomiciliar } from '../entities/visita-domiciliar.entity';
import { AgendamentoVisita } from '../entities/agendamento-visita.entity';
import { RegistrarVisitaDto } from '../dto/registrar-visita.dto';
import { AtualizarVisitaDto } from '../dto/atualizar-visita.dto';
import { StatusAgendamento, ResultadoVisita } from '../enums';

/**
 * Testes unitários para o VisitaService
 *
 * Cobertura de testes:
 * - Registro de visitas
 * - Busca de visitas (todos, por ID, por beneficiário, por técnico)
 * - Busca de visitas que recomendam renovação
 * - Busca de visitas que necessitam nova visita
 * - Busca de visitas com problemas de elegibilidade
 * - Atualização de visitas
 * - Validações de negócio
 * - Tratamento de erros
 */
describe('VisitaService', () => {
  let service: VisitaService;
  let visitaRepository: jest.Mocked<Repository<VisitaDomiciliar>>;
  let agendamentoRepository: jest.Mocked<Repository<AgendamentoVisita>>;
  let dataSource: jest.Mocked<DataSource>;

  const mockAgendamento: AgendamentoVisita = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    beneficiarioId: 'beneficiario-123',
    concessaoId: 'concessao-123',
    tecnicoResponsavelId: 'tecnico-123',
    unidadeId: 'unidade-123',
    dataHoraAgendada: new Date('2025-01-25T10:00:00Z'),
    tipoVisita: 'inicial',
    prioridade: 'normal',
    status: StatusAgendamento.CONFIRMADO,
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

  const mockVisita: VisitaDomiciliar = {
    id: '456e7890-e89b-12d3-a456-426614174000',
    agendamentoId: '123e4567-e89b-12d3-a456-426614174000',
    dataHoraInicio: new Date('2025-01-25T10:00:00Z'),
    dataHoraFim: new Date('2025-01-25T11:30:00Z'),
    resultado: ResultadoVisita.BENEFICIARIO_LOCALIZADO,
    foiRealizada: true,
    motivoNaoRealizacao: null,
    quemAtendeu: 'Maria Santos',
    relacaoBeneficiario: 'Próprio beneficiário',
    condicoesMoradia: 'Casa própria, boa estrutura',
    situacaoSocioeconomica: 'Família em situação de vulnerabilidade',
    observacoesTecnico: 'Beneficiário atende aos critérios',
    recomendaRenovacao: true,
    justificativaNaoRenovacao: null,
    necessitaNovaVisita: false,
    prazoNovaVisita: null,
    motivoNovaVisita: null,
    problemasElegibilidade: false,
    descricaoProblemas: null,
    notaAvaliacao: 8,
    coordenadasGps: null,
    fotosEvidencia: [],
    dadosComplementares: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user-123',
    updatedBy: 'user-123',
    agendamento: mockAgendamento,
  };

  const mockVisitaRepository = {
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

  const mockAgendamentoRepository = {
    findOneBy: jest.fn(),
    save: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn(),
    getRepository: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisitaService,
        {
          provide: getRepositoryToken(VisitaDomiciliar),
          useValue: mockVisitaRepository,
        },
        {
          provide: getRepositoryToken(AgendamentoVisita),
          useValue: mockAgendamentoRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<VisitaService>(VisitaService);
    visitaRepository = module.get(getRepositoryToken(VisitaDomiciliar));
    agendamentoRepository = module.get(getRepositoryToken(AgendamentoVisita));
    dataSource = module.get(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registrar', () => {
    const registrarVisitaDto: RegistrarVisitaDto = {
      agendamentoId: '123e4567-e89b-12d3-a456-426614174000',
      dataHoraInicio: new Date('2025-01-25T10:00:00Z'),
      dataHoraFim: new Date('2025-01-25T11:30:00Z'),
      resultado: ResultadoVisita.BENEFICIARIO_LOCALIZADO,
      foiRealizada: true,
      quemAtendeu: 'Maria Santos',
      relacaoBeneficiario: 'Próprio beneficiário',
      condicoesMoradia: 'Casa própria, boa estrutura',
      situacaoSocioeconomica: 'Família em situação de vulnerabilidade',
      observacoesTecnico: 'Beneficiário atende aos critérios',
      recomendaRenovacao: true,
      necessitaNovaVisita: false,
      problemasElegibilidade: false,
      notaAvaliacao: 8,
    };

    it('deve registrar uma visita com sucesso', async () => {
      // Arrange
      agendamentoRepository.findOneBy.mockResolvedValue(mockAgendamento);
      visitaRepository.create.mockReturnValue(mockVisita);
      visitaRepository.save.mockResolvedValue(mockVisita);
      agendamentoRepository.save.mockResolvedValue({
        ...mockAgendamento,
        status: StatusAgendamento.REALIZADO,
      });

      // Act
      const result = await service.registrar(registrarVisitaDto, 'user-123');

      // Assert
      expect(agendamentoRepository.findOneBy).toHaveBeenCalledWith({
        id: registrarVisitaDto.agendamentoId,
      });
      expect(visitaRepository.create).toHaveBeenCalled();
      expect(visitaRepository.save).toHaveBeenCalled();
      expect(agendamentoRepository.save).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({
        id: mockVisita.id,
        foiRealizada: true,
      }));
    });

    it('deve lançar erro se agendamento não for encontrado', async () => {
      // Arrange
      agendamentoRepository.findOneBy.mockResolvedValue(null);

      // Act & Assert
      await expect(service.registrar(registrarVisitaDto, 'user-123'))
        .rejects
        .toThrow(NotFoundException);
    });

    it('deve lançar erro se agendamento não estiver confirmado', async () => {
      // Arrange
      const agendamentoNaoConfirmado = {
        ...mockAgendamento,
        status: StatusAgendamento.AGENDADO,
      };
      agendamentoRepository.findOneBy.mockResolvedValue(agendamentoNaoConfirmado);

      // Act & Assert
      await expect(service.registrar(registrarVisitaDto, 'user-123'))
        .rejects
        .toThrow(BadRequestException);
    });

    it('deve lançar erro se agendamento já possui visita registrada', async () => {
      // Arrange
      const agendamentoComVisita = {
        ...mockAgendamento,
        visita: mockVisita,
      };
      agendamentoRepository.findOneBy.mockResolvedValue(agendamentoComVisita);

      // Act & Assert
      await expect(service.registrar(registrarVisitaDto, 'user-123'))
        .rejects
        .toThrow(BadRequestException);
    });

    it('deve validar campos obrigatórios quando visita foi realizada', async () => {
      // Arrange
      const dtoSemCamposObrigatorios = {
        ...registrarVisitaDto,
        quemAtendeu: undefined,
        notaAvaliacao: undefined,
      };
      agendamentoRepository.findOneBy.mockResolvedValue(mockAgendamento);

      // Act & Assert
      await expect(service.registrar(dtoSemCamposObrigatorios, 'user-123'))
        .rejects
        .toThrow(BadRequestException);
    });

    it('deve validar motivo quando visita não foi realizada', async () => {
      // Arrange
      const dtoVisitaNaoRealizada = {
        ...registrarVisitaDto,
        foiRealizada: false,
        motivoNaoRealizacao: undefined,
      };
      agendamentoRepository.findOneBy.mockResolvedValue(mockAgendamento);

      // Act & Assert
      await expect(service.registrar(dtoVisitaNaoRealizada, 'user-123'))
        .rejects
        .toThrow(BadRequestException);
    });

    it('deve validar justificativa quando não recomenda renovação', async () => {
      // Arrange
      const dtoSemJustificativa = {
        ...registrarVisitaDto,
        recomendaRenovacao: false,
        justificativaNaoRenovacao: undefined,
      };
      agendamentoRepository.findOneBy.mockResolvedValue(mockAgendamento);

      // Act & Assert
      await expect(service.registrar(dtoSemJustificativa, 'user-123'))
        .rejects
        .toThrow(BadRequestException);
    });

    it('deve validar prazo quando necessita nova visita', async () => {
      // Arrange
      const dtoSemPrazo = {
        ...registrarVisitaDto,
        necessitaNovaVisita: true,
        prazoNovaVisita: undefined,
      };
      agendamentoRepository.findOneBy.mockResolvedValue(mockAgendamento);

      // Act & Assert
      await expect(service.registrar(dtoSemPrazo, 'user-123'))
        .rejects
        .toThrow(BadRequestException);
    });
  });

  describe('buscarTodas', () => {
    it('deve retornar lista paginada de visitas', async () => {
      // Arrange
      const mockVisitas = [mockVisita];
      const mockTotal = 1;
      visitaRepository.getManyAndCount.mockResolvedValue([mockVisitas, mockTotal]);

      // Act
      const result = await service.buscarTodas({ page: 1, limit: 10 });

      // Assert
      expect(visitaRepository.createQueryBuilder).toHaveBeenCalled();
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
    it('deve retornar visita por ID', async () => {
      // Arrange
      visitaRepository.findOne.mockResolvedValue(mockVisita);

      // Act
      const result = await service.buscarPorId('456e7890-e89b-12d3-a456-426614174000');

      // Assert
      expect(visitaRepository.findOne).toHaveBeenCalledWith({
        where: { id: '456e7890-e89b-12d3-a456-426614174000' },
        relations: [
          'agendamento',
          'agendamento.beneficiario',
          'agendamento.tecnicoResponsavel',
          'agendamento.unidade',
        ],
      });
      expect(result).toEqual(expect.objectContaining({
        id: mockVisita.id,
      }));
    });

    it('deve lançar erro se visita não for encontrada', async () => {
      // Arrange
      visitaRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.buscarPorId('id-inexistente'))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('buscarPorBeneficiario', () => {
    it('deve retornar visitas por beneficiário', async () => {
      // Arrange
      const mockVisitas = [mockVisita];
      const mockTotal = 1;
      visitaRepository.getManyAndCount.mockResolvedValue([mockVisitas, mockTotal]);

      // Act
      const result = await service.buscarPorBeneficiario('beneficiario-123', { page: 1, limit: 10 });

      // Assert
      expect(visitaRepository.createQueryBuilder).toHaveBeenCalled();
      expect(result).toEqual({
        data: expect.any(Array),
        total: mockTotal,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });
  });

  describe('buscarPorTecnico', () => {
    it('deve retornar visitas por técnico', async () => {
      // Arrange
      const mockVisitas = [mockVisita];
      const mockTotal = 1;
      visitaRepository.getManyAndCount.mockResolvedValue([mockVisitas, mockTotal]);

      // Act
      const result = await service.buscarPorTecnico('tecnico-123', { page: 1, limit: 10 });

      // Assert
      expect(visitaRepository.createQueryBuilder).toHaveBeenCalled();
      expect(result).toEqual({
        data: expect.any(Array),
        total: mockTotal,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });
  });

  describe('buscarQueRecomendamRenovacao', () => {
    it('deve retornar visitas que recomendam renovação', async () => {
      // Arrange
      const mockVisitas = [mockVisita];
      const mockTotal = 1;
      visitaRepository.getManyAndCount.mockResolvedValue([mockVisitas, mockTotal]);

      // Act
      const result = await service.buscarQueRecomendamRenovacao({ page: 1, limit: 10 });

      // Assert
      expect(visitaRepository.createQueryBuilder).toHaveBeenCalled();
      expect(result).toEqual({
        data: expect.any(Array),
        total: mockTotal,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });
  });

  describe('buscarQueNecessitamNovaVisita', () => {
    it('deve retornar visitas que necessitam nova visita', async () => {
      // Arrange
      const visitaComNovaVisita = {
        ...mockVisita,
        necessitaNovaVisita: true,
        prazoNovaVisita: new Date('2025-02-15'),
      };
      const mockVisitas = [visitaComNovaVisita];
      const mockTotal = 1;
      visitaRepository.getManyAndCount.mockResolvedValue([mockVisitas, mockTotal]);

      // Act
      const result = await service.buscarQueNecessitamNovaVisita({ page: 1, limit: 10 });

      // Assert
      expect(visitaRepository.createQueryBuilder).toHaveBeenCalled();
      expect(result).toEqual({
        data: expect.any(Array),
        total: mockTotal,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });
  });

  describe('buscarComProblemasElegibilidade', () => {
    it('deve retornar visitas com problemas de elegibilidade', async () => {
      // Arrange
      const visitaComProblemas = {
        ...mockVisita,
        problemasElegibilidade: true,
        descricaoProblemas: 'Renda familiar acima do limite',
      };
      const mockVisitas = [visitaComProblemas];
      const mockTotal = 1;
      visitaRepository.getManyAndCount.mockResolvedValue([mockVisitas, mockTotal]);

      // Act
      const result = await service.buscarComProblemasElegibilidade({ page: 1, limit: 10 });

      // Assert
      expect(visitaRepository.createQueryBuilder).toHaveBeenCalled();
      expect(result).toEqual({
        data: expect.any(Array),
        total: mockTotal,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });
  });

  describe('atualizar', () => {
    const atualizarVisitaDto: AtualizarVisitaDto = {
      observacoesTecnico: 'Observações atualizadas',
      notaAvaliacao: 9,
    };

    it('deve atualizar visita com sucesso', async () => {
      // Arrange
      const visitaAtualizada = {
        ...mockVisita,
        ...atualizarVisitaDto,
      };
      visitaRepository.findOneBy.mockResolvedValue(mockVisita);
      visitaRepository.save.mockResolvedValue(visitaAtualizada);

      // Act
      const result = await service.atualizar('456e7890-e89b-12d3-a456-426614174000', atualizarVisitaDto, 'user-123');

      // Assert
      expect(visitaRepository.findOneBy).toHaveBeenCalledWith({
        id: '456e7890-e89b-12d3-a456-426614174000',
      });
      expect(visitaRepository.save).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({
        id: mockVisita.id,
        observacoesTecnico: atualizarVisitaDto.observacoesTecnico,
        notaAvaliacao: atualizarVisitaDto.notaAvaliacao,
      }));
    });

    it('deve lançar erro se visita não for encontrada', async () => {
      // Arrange
      visitaRepository.findOneBy.mockResolvedValue(null);

      // Act & Assert
      await expect(service.atualizar('id-inexistente', atualizarVisitaDto, 'user-123'))
        .rejects
        .toThrow(NotFoundException);
    });

    it('deve validar justificativa quando altera recomendação para false', async () => {
      // Arrange
      const dtoSemJustificativa = {
        recomendaRenovacao: false,
        justificativaNaoRenovacao: undefined,
      };
      visitaRepository.findOneBy.mockResolvedValue(mockVisita);

      // Act & Assert
      await expect(service.atualizar('456e7890-e89b-12d3-a456-426614174000', dtoSemJustificativa, 'user-123'))
        .rejects
        .toThrow(BadRequestException);
    });

    it('deve validar prazo quando altera necessita nova visita para true', async () => {
      // Arrange
      const dtoSemPrazo = {
        necessitaNovaVisita: true,
        prazoNovaVisita: undefined,
      };
      visitaRepository.findOneBy.mockResolvedValue(mockVisita);

      // Act & Assert
      await expect(service.atualizar('456e7890-e89b-12d3-a456-426614174000', dtoSemPrazo, 'user-123'))
        .rejects
        .toThrow(BadRequestException);
    });
  });
});