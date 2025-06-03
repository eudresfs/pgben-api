import { Test, TestingModule } from '@nestjs/testing';
import { BeneficioController } from '../controllers/beneficio.controller';
import { BeneficioService } from '../services/beneficio.service';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { Periodicidade } from '../entities/tipo-beneficio.entity';
import { TipoAprovador } from '../dto/configurar-fluxo.dto';
import { TipoDocumentoEnum } from '@/enums';

describe('BeneficioController', () => {
  let controller: BeneficioController;
  let service: BeneficioService;

  // Mock do serviço de benefícios
  const mockBeneficioService = {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findRequisitosByBeneficioId: jest.fn(),
    addRequisito: jest.fn(),
    configurarFluxo: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BeneficioController],
      providers: [
        {
          provide: BeneficioService,
          useValue: mockBeneficioService,
        },
      ],
    }).compile();

    controller = module.get<BeneficioController>(BeneficioController);
    service = module.get<BeneficioService>(BeneficioService);
  });

  it('deve ser definido', () => {
    expect(controller).toBeDefined();
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

      const mockResult = {
        items: mockBeneficios,
        meta: {
          total: 2,
          page: 1,
          limit: 10,
          pages: 1,
        },
      };

      mockBeneficioService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(1, 10, undefined, undefined);

      expect(result).toEqual(mockResult);
      expect(mockBeneficioService.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: undefined,
        ativo: undefined,
      });
    });
  });

  describe('findOne', () => {
    it('deve retornar um benefício quando encontrado', async () => {
      const mockBeneficio = {
        id: '1',
        nome: 'Cesta Básica',
        descricao: 'Benefício de cesta básica para famílias em vulnerabilidade',
        valor: 150.0,
        ativo: true,
      };

      mockBeneficioService.findById.mockResolvedValue(mockBeneficio);

      const result = await controller.findOne('1');

      expect(result).toEqual(mockBeneficio);
      expect(mockBeneficioService.findById).toHaveBeenCalledWith('1');
    });

    it('deve lançar NotFoundException quando o benefício não é encontrado', async () => {
      mockBeneficioService.findById.mockRejectedValue(new NotFoundException());

      await expect(controller.findOne('999')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockBeneficioService.findById).toHaveBeenCalledWith('999');
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

      mockBeneficioService.create.mockResolvedValue(mockBeneficio);

      const result = await controller.create(createBeneficioDto);

      expect(result).toEqual(mockBeneficio);
      expect(mockBeneficioService.create).toHaveBeenCalledWith(
        createBeneficioDto,
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

      mockBeneficioService.create.mockRejectedValue(new ConflictException());

      await expect(controller.create(createBeneficioDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockBeneficioService.create).toHaveBeenCalledWith(
        createBeneficioDto,
      );
    });
  });

  describe('update', () => {
    it('deve atualizar um benefício existente', async () => {
      const updateBeneficioDto = {
        nome: 'Cesta Básica Atualizada',
        valor: 200.0,
      };

      const mockUpdatedBeneficio = {
        id: '1',
        nome: 'Cesta Básica Atualizada',
        descricao: 'Benefício de cesta básica para famílias em vulnerabilidade',
        valor: 200.0,
        ativo: true,
      };

      mockBeneficioService.update.mockResolvedValue(mockUpdatedBeneficio);

      const result = await controller.update('1', updateBeneficioDto);

      expect(result).toEqual(mockUpdatedBeneficio);
      expect(mockBeneficioService.update).toHaveBeenCalledWith(
        '1',
        updateBeneficioDto,
      );
    });

    it('deve lançar NotFoundException quando o benefício não existe', async () => {
      const updateBeneficioDto = {
        nome: 'Cesta Básica Atualizada',
      };

      mockBeneficioService.update.mockRejectedValue(new NotFoundException());

      await expect(
        controller.update('999', updateBeneficioDto),
      ).rejects.toThrow(NotFoundException);
      expect(mockBeneficioService.update).toHaveBeenCalledWith(
        '999',
        updateBeneficioDto,
      );
    });
  });

  describe('findRequisitos', () => {
    it('deve retornar os requisitos documentais de um benefício', async () => {
      const mockRequisitos = [
        {
          id: '1',
          nome: 'CPF',
          obrigatorio: true,
        },
        {
          id: '2',
          nome: 'Comprovante de Residência',
          obrigatorio: true,
        },
      ];

      mockBeneficioService.findRequisitosByBeneficioId.mockResolvedValue(
        mockRequisitos,
      );

      const result = await controller.findRequisitos('1');

      expect(result).toEqual(mockRequisitos);
      expect(
        mockBeneficioService.findRequisitosByBeneficioId,
      ).toHaveBeenCalledWith('1');
    });
  });

  describe('addRequisito', () => {
    it('deve adicionar um requisito documental a um benefício', async () => {
      const createRequisitoDto = {
        tipo_documento: TipoDocumentoEnum.CPF,
        nome: 'CPF do Solicitante',
        descricao: 'Documento de identificação',
        obrigatorio: true,
      };

      const mockRequisito = {
        id: '1',
        ...createRequisitoDto,
        tipo_beneficio: {
          id: '1',
          nome: 'Cesta Básica',
        },
      };

      mockBeneficioService.addRequisito.mockResolvedValue(mockRequisito);

      const result = await controller.addRequisito('1', createRequisitoDto);

      expect(result).toEqual(mockRequisito);
      expect(mockBeneficioService.addRequisito).toHaveBeenCalledWith(
        '1',
        createRequisitoDto,
      );
    });
  });

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

      const mockFluxo = {
        id: '1',
        ...configurarFluxoDto,
        tipo_beneficio: {
          id: '1',
          nome: 'Cesta Básica',
        },
      };

      mockBeneficioService.configurarFluxo.mockResolvedValue(mockFluxo);

      const result = await controller.configurarFluxo('1', configurarFluxoDto);

      expect(result).toEqual(mockFluxo);
      expect(mockBeneficioService.configurarFluxo).toHaveBeenCalledWith(
        '1',
        configurarFluxoDto,
      );
    });
  });
});
