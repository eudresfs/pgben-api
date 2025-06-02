import { Test, TestingModule } from '@nestjs/testing';
import { BeneficioService } from '../services/beneficio.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  TipoBeneficio,
  Periodicidade,
} from '../entities/tipo-beneficio.entity';
import {
  RequisitoDocumento,
  TipoDocumento,
} from '../entities/requisito-documento.entity';
import { FluxoBeneficio } from '../entities/fluxo-beneficio.entity';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { TipoAprovador } from '../dto/configurar-fluxo.dto';

/**
 * Testes unitários para o serviço de benefícios
 *
 * Verifica o funcionamento das operações CRUD e regras de negócio
 * relacionadas aos tipos de benefícios disponíveis no sistema
 */
describe('BeneficioService', () => {
  let service: BeneficioService;

  // Mock do query builder
  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
    getOne: jest.fn(),
  };

  // Mock do repositório de tipo de benefícios
  const mockTipoBeneficioRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  // Mock do repositório de requisitos de documento
  const mockRequisitoDocumentoRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  // Mock do repositório de fluxo de benefício
  const mockFluxoBeneficioRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BeneficioService,
        {
          provide: getRepositoryToken(TipoBeneficio),
          useValue: mockTipoBeneficioRepository,
        },
        {
          provide: getRepositoryToken(RequisitoDocumento),
          useValue: mockRequisitoDocumentoRepository,
        },
        {
          provide: getRepositoryToken(FluxoBeneficio),
          useValue: mockFluxoBeneficioRepository,
        },
      ],
    }).compile();

    service = module.get<BeneficioService>(BeneficioService);
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('deve retornar uma lista paginada de benefícios', async () => {
      const mockBeneficios = [
        {
          id: '1',
          nome: 'Cesta Básica',
          descricao:
            'Benefício de cesta básica para famílias em vulnerabilidade',
          valor: 150.0,
          ativo: true,
        },
        {
          id: '2',
          nome: 'Auxílio Moradia',
          descricao: 'Benefício para auxílio de aluguel',
          valor: 300.0,
          ativo: true,
        },
      ];

      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockBeneficios, 2]);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toEqual({
        items: mockBeneficios,
        meta: {
          total: 2,
          page: 1,
          limit: 10,
          pages: Math.ceil(2 / 10),
        },
      });
      expect(mockTipoBeneficioRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.getManyAndCount).toHaveBeenCalled();
    });

    it('deve aplicar filtros quando fornecidos', async () => {
      const mockBeneficios = [
        {
          id: '1',
          nome: 'Cesta Básica',
          descricao:
            'Benefício de cesta básica para famílias em vulnerabilidade',
          valor: 150.0,
          ativo: true,
        },
      ];

      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockBeneficios, 1]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        search: 'Cesta',
        ativo: true,
      });

      expect(result).toEqual({
        items: mockBeneficios,
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          pages: Math.ceil(1 / 10),
        },
      });
      expect(mockTipoBeneficioRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalled();
      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
      expect(mockQueryBuilder.getManyAndCount).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('deve retornar um benefício quando encontrado', async () => {
      const mockBeneficio = {
        id: '1',
        nome: 'Cesta Básica',
        descricao: 'Benefício de cesta básica para famílias em vulnerabilidade',
        valor: 150.0,
        ativo: true,
        requisito_documento: [],
      };

      mockTipoBeneficioRepository.findOne.mockResolvedValue(mockBeneficio);

      const result = await service.findById('1');

      expect(result).toEqual(mockBeneficio);
      expect(mockTipoBeneficioRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
        relations: ['requisito_documento'],
      });
    });

    it('deve lançar NotFoundException quando o benefício não é encontrado', async () => {
      mockTipoBeneficioRepository.findOne.mockResolvedValue(null);

      await expect(service.findById('999')).rejects.toThrow(NotFoundException);
      expect(mockTipoBeneficioRepository.findOne).toHaveBeenCalledWith({
        where: { id: '999' },
        relations: ['requisito_documento'],
      });
    });
  });

  describe('create', () => {
    it('deve criar um novo benefício quando os dados são válidos', async () => {
      const createBeneficioDto = {
        nome: 'Cesta Básica',
        descricao: 'Benefício de cesta básica para famílias em vulnerabilidade',
        valor: 150.0,
        periodicidade: Periodicidade.MENSAL,
        base_juridica: 'Lei Municipal 123/2023',
        criterios_elegibilidade: {
          idade_minima: 18,
          renda_maxima: 1500,
          outros: ['Residir no município'],
        },
      };

      const mockBeneficio = {
        id: '1',
        ...createBeneficioDto,
        ativo: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Verificar se já existe um benefício com o mesmo nome
      mockTipoBeneficioRepository.findOne.mockResolvedValue(null);

      // Criar o benefício
      mockTipoBeneficioRepository.create.mockReturnValue(mockBeneficio);
      mockTipoBeneficioRepository.save.mockResolvedValue(mockBeneficio);

      const result = await service.create(createBeneficioDto);

      expect(result).toEqual(mockBeneficio);
      expect(mockTipoBeneficioRepository.findOne).toHaveBeenCalledWith({
        where: { nome: 'Cesta Básica' },
      });
      expect(mockTipoBeneficioRepository.create).toHaveBeenCalledWith(
        createBeneficioDto,
      );
      expect(mockTipoBeneficioRepository.save).toHaveBeenCalledWith(
        mockBeneficio,
      );
    });

    it('deve lançar ConflictException quando já existe um benefício com o mesmo nome', async () => {
      const createBeneficioDto = {
        nome: 'Cesta Básica',
        descricao: 'Benefício de cesta básica para famílias em vulnerabilidade',
        valor: 150.0,
        periodicidade: Periodicidade.MENSAL,
        base_juridica: 'Lei Municipal 123/2023',
        criterios_elegibilidade: {
          idade_minima: 18,
          renda_maxima: 1500,
          outros: ['Residir no município'],
        },
      };

      // Simular que já existe um benefício com o mesmo nome
      mockTipoBeneficioRepository.findOne.mockResolvedValue({
        id: '2',
        nome: 'Cesta Básica',
      });

      await expect(service.create(createBeneficioDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockTipoBeneficioRepository.findOne).toHaveBeenCalledWith({
        where: { nome: 'Cesta Básica' },
      });
      expect(mockTipoBeneficioRepository.create).not.toHaveBeenCalled();
      expect(mockTipoBeneficioRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('deve atualizar um benefício existente', async () => {
      const updateBeneficioDto = {
        nome: 'Cesta Básica Atualizada',
        valor: 200.0,
      };

      const mockBeneficio = {
        id: '1',
        nome: 'Cesta Básica',
        descricao: 'Benefício de cesta básica para famílias em vulnerabilidade',
        valor: 150.0,
        ativo: true,
        requisito_documento: [],
      };

      const mockUpdatedBeneficio = {
        ...mockBeneficio,
        ...updateBeneficioDto,
      };

      // Buscar o benefício existente
      mockTipoBeneficioRepository.findOne.mockImplementation((options) => {
        if (options.where.id === '1') {
          return Promise.resolve(mockBeneficio);
        }
        if (options.where.nome === 'Cesta Básica Atualizada') {
          return Promise.resolve(null);
        }
        return Promise.resolve(null);
      });

      // Salvar as atualizações
      mockTipoBeneficioRepository.save.mockResolvedValue(mockUpdatedBeneficio);

      const result = await service.update('1', updateBeneficioDto);

      expect(result).toEqual(mockUpdatedBeneficio);
      expect(mockTipoBeneficioRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
        relations: ['requisito_documento'],
      });
      expect(mockTipoBeneficioRepository.save).toHaveBeenCalledWith({
        ...mockBeneficio,
        ...updateBeneficioDto,
      });
    });

    it('deve lançar NotFoundException quando o benefício não existe', async () => {
      const updateBeneficioDto = {
        nome: 'Cesta Básica Atualizada',
      };

      // Simular que o benefício não existe
      mockTipoBeneficioRepository.findOne.mockResolvedValue(null);

      await expect(service.update('999', updateBeneficioDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockTipoBeneficioRepository.findOne).toHaveBeenCalledWith({
        where: { id: '999' },
        relations: ['requisito_documento'],
      });
      expect(mockTipoBeneficioRepository.save).not.toHaveBeenCalled();
    });

    it('deve lançar ConflictException quando tenta atualizar para um nome já existente', async () => {
      const updateBeneficioDto = {
        nome: 'Auxílio Moradia',
      };

      const mockBeneficio = {
        id: '1',
        nome: 'Cesta Básica',
        descricao: 'Benefício de cesta básica para famílias em vulnerabilidade',
        valor: 150.0,
        ativo: true,
        requisito_documento: [],
      };

      // Buscar o benefício a ser atualizado
      mockTipoBeneficioRepository.findOne.mockImplementation((options) => {
        if (options.where.id === '1') {
          return Promise.resolve(mockBeneficio);
        }
        if (options.where.nome === 'Auxílio Moradia') {
          return Promise.resolve({
            id: '2',
            nome: 'Auxílio Moradia',
          });
        }
        return Promise.resolve(null);
      });

      await expect(service.update('1', updateBeneficioDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockTipoBeneficioRepository.findOne).toHaveBeenCalledTimes(2);
      expect(mockTipoBeneficioRepository.save).not.toHaveBeenCalled();
    });
  });

  // Testes para findRequisitosByBeneficioId
  describe('findRequisitosByBeneficioId', () => {
    it('deve retornar os requisitos documentais de um benefício', async () => {
      const mockBeneficio = {
        id: '1',
        nome: 'Cesta Básica',
        requisito_documento: [],
      };

      const mockRequisitos = [
        {
          id: '1',
          nome: 'CPF',
          obrigatorio: true,
          tipo_beneficio: mockBeneficio,
        },
        {
          id: '2',
          nome: 'Comprovante de Residência',
          obrigatorio: true,
          tipo_beneficio: mockBeneficio,
        },
      ];

      // Verificar se o benefício existe
      mockTipoBeneficioRepository.findOne.mockResolvedValue(mockBeneficio);

      // Retornar requisitos
      mockRequisitoDocumentoRepository.find.mockResolvedValue(mockRequisitos);

      const result = await service.findRequisitosByBeneficioId('1');

      expect(result).toEqual(mockRequisitos);
      expect(mockTipoBeneficioRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
        relations: ['requisito_documento'],
      });
      expect(mockRequisitoDocumentoRepository.find).toHaveBeenCalledWith({
        where: { tipo_beneficio: { id: '1' } },
        order: { obrigatorio: 'DESC', tipo_documento: 'ASC' },
      });
    });
  });

  // Testes para addRequisito
  describe('addRequisito', () => {
    it('deve adicionar um requisito documental a um benefício', async () => {
      const createRequisitoDto = {
        tipo_documento: TipoDocumento.CPF,
        nome: 'CPF do Solicitante',
        descricao: 'Documento de identificação',
        obrigatorio: true,
      };

      const mockBeneficio = {
        id: '1',
        nome: 'Cesta Básica',
      };

      const mockRequisito = {
        id: '1',
        ...createRequisitoDto,
        tipo_beneficio: mockBeneficio,
      };

      // Verificar se o benefício existe
      mockTipoBeneficioRepository.findOne.mockResolvedValue(mockBeneficio);

      // Verificar se já existe um requisito com o mesmo nome
      mockRequisitoDocumentoRepository.findOne.mockResolvedValue(null);

      // Criar e salvar o requisito
      mockRequisitoDocumentoRepository.create.mockReturnValue(mockRequisito);
      mockRequisitoDocumentoRepository.save.mockResolvedValue(mockRequisito);

      const result = await service.addRequisito('1', createRequisitoDto);

      expect(result).toEqual(mockRequisito);
      expect(mockTipoBeneficioRepository.findOne).toHaveBeenCalled();
      expect(mockRequisitoDocumentoRepository.findOne).toHaveBeenCalled();
      expect(mockRequisitoDocumentoRepository.create).toHaveBeenCalledWith({
        ...createRequisitoDto,
        tipo_beneficio: mockBeneficio,
      });
      expect(mockRequisitoDocumentoRepository.save).toHaveBeenCalledWith(
        mockRequisito,
      );
    });
  });

  // Testes para configurarFluxo
  describe('configurarFluxo', () => {
    it('deve configurar o fluxo de aprovação de um benefício', async () => {
      const configurarFluxoDto = {
        descricao: 'Fluxo de aprovação para cesta básica',
        etapas: [
          {
            ordem: 1,
            nome: 'Análise técnica',
            descricao: 'Verificação inicial dos documentos',
            tipo_aprovador: TipoAprovador.TECNICO,
            prazo_dias: 2,
          },
          {
            ordem: 2,
            nome: 'Aprovação coordenação',
            descricao: 'Aprovação pela coordenação da unidade',
            tipo_aprovador: TipoAprovador.GESTOR_UNIDADE,
            prazo_dias: 3,
          },
        ],
      };

      const mockBeneficio = {
        id: '1',
        nome: 'Cesta Básica',
      };

      const mockFluxo = {
        id: '1',
        ...configurarFluxoDto,
        tipo_beneficio: mockBeneficio,
      };

      // Verificar se o benefício existe
      mockTipoBeneficioRepository.findOne.mockResolvedValue(mockBeneficio);

      // Verificar se já existe um fluxo para este benefício
      mockFluxoBeneficioRepository.find.mockResolvedValue([]);

      // Criar e salvar o fluxo
      const mockEtapa1 = {
        tipo_beneficio: mockBeneficio,
        nome_etapa: configurarFluxoDto.etapas[0].nome,
        ordem: configurarFluxoDto.etapas[0].ordem,
        descricao: configurarFluxoDto.etapas[0].descricao,
        tipo_etapa: configurarFluxoDto.etapas[0].tipo_aprovador,
        perfil_responsavel: configurarFluxoDto.etapas[0].tipo_aprovador,
        obrigatorio: true,
        permite_retorno: false,
        setor_id: '2',
      };

      const mockEtapa2 = {
        tipo_beneficio: mockBeneficio,
        nome_etapa: configurarFluxoDto.etapas[1].nome,
        ordem: configurarFluxoDto.etapas[1].ordem,
        descricao: configurarFluxoDto.etapas[1].descricao,
        tipo_etapa: configurarFluxoDto.etapas[1].tipo_aprovador,
        perfil_responsavel: configurarFluxoDto.etapas[1].tipo_aprovador,
        obrigatorio: true,
        permite_retorno: false,
        setor_id: '3',
      };

      mockFluxoBeneficioRepository.create.mockReturnValueOnce(mockEtapa1);
      mockFluxoBeneficioRepository.create.mockReturnValueOnce(mockEtapa2);
      mockFluxoBeneficioRepository.save.mockResolvedValue([
        mockEtapa1,
        mockEtapa2,
      ]);

      const result = await service.configurarFluxo('1', configurarFluxoDto);

      expect(result).toEqual([mockEtapa1, mockEtapa2]);
      expect(mockTipoBeneficioRepository.findOne).toHaveBeenCalled();
      expect(mockFluxoBeneficioRepository.find).toHaveBeenCalled();
      // Verificar se create foi chamado para cada etapa
      expect(mockFluxoBeneficioRepository.create).toHaveBeenCalledTimes(2);

      // Verificar a primeira chamada (primeira etapa)
      expect(
        mockFluxoBeneficioRepository.create.mock.calls[0][0],
      ).toMatchObject({
        tipo_beneficio: mockBeneficio,
        nome_etapa: configurarFluxoDto.etapas[0].nome,
        ordem: configurarFluxoDto.etapas[0].ordem,
        descricao: configurarFluxoDto.etapas[0].descricao,
      });

      // Verificar a segunda chamada (segunda etapa)
      expect(
        mockFluxoBeneficioRepository.create.mock.calls[1][0],
      ).toMatchObject({
        tipo_beneficio: mockBeneficio,
        nome_etapa: configurarFluxoDto.etapas[1].nome,
        ordem: configurarFluxoDto.etapas[1].ordem,
        descricao: configurarFluxoDto.etapas[1].descricao,
      });
      expect(mockFluxoBeneficioRepository.save).toHaveBeenCalledWith([
        mockEtapa1,
        mockEtapa2,
      ]);
    });

    it('deve lançar BadRequestException quando o fluxo não contém etapas', async () => {
      const configurarFluxoDto = {
        descricao: 'Fluxo de aprovação para cesta básica',
        etapas: [],
      };

      const mockBeneficio = {
        id: '1',
        nome: 'Cesta Básica',
      };

      // Verificar se o benefício existe
      mockTipoBeneficioRepository.findOne.mockResolvedValue(mockBeneficio);

      await expect(
        service.configurarFluxo('1', configurarFluxoDto),
      ).rejects.toThrow(BadRequestException);
      expect(mockTipoBeneficioRepository.findOne).toHaveBeenCalled();
      expect(mockFluxoBeneficioRepository.save).not.toHaveBeenCalled();
    });
  });
});
