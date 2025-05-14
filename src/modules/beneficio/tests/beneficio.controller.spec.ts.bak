import { Test, TestingModule } from '@nestjs/testing';
import { BeneficioController } from '../controllers/beneficio.controller';
import { BeneficioService } from '../services/beneficio.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

/**
 * Testes unitários para o controlador de benefícios
 * 
 * Verifica o funcionamento dos endpoints relacionados aos tipos de benefícios
 * disponíveis no sistema
 */
describe('BeneficioController', () => {
  let controller: BeneficioController;
  
  // Mock do serviço de benefícios
  const mockBeneficioService = {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    toggleStatus: jest.fn(),
    remove: jest.fn(),
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
  });

  it('deve ser definido', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('deve retornar uma lista paginada de benefícios', async () => {
      const mockResult = {
        items: [
          {
            id: '1',
            nome: 'Cesta Básica',
            descricao: 'Benefício de cesta básica para famílias em vulnerabilidade',
            valor: 150.00,
            ativo: true,
          },
          {
            id: '2',
            nome: 'Auxílio Moradia',
            descricao: 'Benefício para auxílio de aluguel',
            valor: 300.00,
            ativo: true,
          },
        ],
        meta: {
          total: 2,
          page: 1,
          limit: 10,
          pages: 1,
        },
      };
      
      mockBeneficioService.findAll.mockResolvedValue(mockResult);
      
      const query = { page: 1, limit: 10 };
      const result = await controller.findAll(query);
      
      expect(result).toEqual(mockResult);
      expect(mockBeneficioService.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findById', () => {
    it('deve retornar um benefício quando encontrado pelo ID', async () => {
      const mockBeneficio = {
        id: '1',
        nome: 'Cesta Básica',
        descricao: 'Benefício de cesta básica para famílias em vulnerabilidade',
        valor: 150.00,
        ativo: true,
      };
      
      mockBeneficioService.findById.mockResolvedValue(mockBeneficio);
      
      const result = await controller.findById('1');
      
      expect(result).toEqual(mockBeneficio);
      expect(mockBeneficioService.findById).toHaveBeenCalledWith('1');
    });

    it('deve propagar NotFoundException quando o benefício não é encontrado', async () => {
      mockBeneficioService.findById.mockRejectedValue(new NotFoundException('Benefício não encontrado'));
      
      await expect(controller.findById('999')).rejects.toThrow(NotFoundException);
      expect(mockBeneficioService.findById).toHaveBeenCalledWith('999');
    });
  });

  describe('create', () => {
    it('deve criar um novo benefício quando os dados são válidos', async () => {
      const createBeneficioDto = {
        nome: 'Cesta Básica',
        descricao: 'Benefício de cesta básica para famílias em vulnerabilidade',
        valor: 150.00,
        criterios_concessao: 'Famílias com renda per capita inferior a meio salário mínimo',
        documentos_necessarios: ['CPF', 'Comprovante de residência', 'Comprovante de renda'],
        validade_meses: 6,
      };
      
      const mockBeneficio = {
        id: '1',
        ...createBeneficioDto,
        ativo: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      
      mockBeneficioService.create.mockResolvedValue(mockBeneficio);
      
      const mockRequest = {
        user: {
          id: 'admin-id',
          role: 'admin',
        },
      };
      
      const result = await controller.create(createBeneficioDto, mockRequest);
      
      expect(result).toEqual(mockBeneficio);
      expect(mockBeneficioService.create).toHaveBeenCalledWith(createBeneficioDto, mockRequest.user);
    });

    it('deve propagar ConflictException quando já existe um benefício com o mesmo nome', async () => {
      const createBeneficioDto = {
        nome: 'Cesta Básica',
        descricao: 'Benefício de cesta básica para famílias em vulnerabilidade',
        valor: 150.00,
      };
      
      mockBeneficioService.create.mockRejectedValue(new ConflictException('Já existe um benefício com este nome'));
      
      const mockRequest = {
        user: {
          id: 'admin-id',
          role: 'admin',
        },
      };
      
      await expect(controller.create(createBeneficioDto, mockRequest)).rejects.toThrow(ConflictException);
      expect(mockBeneficioService.create).toHaveBeenCalledWith(createBeneficioDto, mockRequest.user);
    });
  });

  describe('update', () => {
    it('deve atualizar um benefício existente', async () => {
      const updateBeneficioDto = {
        nome: 'Cesta Básica Atualizada',
        valor: 200.00,
      };
      
      const mockUpdatedBeneficio = {
        id: '1',
        nome: 'Cesta Básica Atualizada',
        descricao: 'Benefício de cesta básica para famílias em vulnerabilidade',
        valor: 200.00,
        ativo: true,
      };
      
      mockBeneficioService.update.mockResolvedValue(mockUpdatedBeneficio);
      
      const mockRequest = {
        user: {
          id: 'admin-id',
          role: 'admin',
        },
      };
      
      const result = await controller.update('1', updateBeneficioDto, mockRequest);
      
      expect(result).toEqual(mockUpdatedBeneficio);
      expect(mockBeneficioService.update).toHaveBeenCalledWith('1', updateBeneficioDto, mockRequest.user);
    });

    it('deve propagar NotFoundException quando o benefício não existe', async () => {
      const updateBeneficioDto = {
        nome: 'Cesta Básica Atualizada',
      };
      
      mockBeneficioService.update.mockRejectedValue(new NotFoundException('Benefício não encontrado'));
      
      const mockRequest = {
        user: {
          id: 'admin-id',
          role: 'admin',
        },
      };
      
      await expect(controller.update('999', updateBeneficioDto, mockRequest)).rejects.toThrow(NotFoundException);
      expect(mockBeneficioService.update).toHaveBeenCalledWith('999', updateBeneficioDto, mockRequest.user);
    });
  });

  describe('toggleStatus', () => {
    it('deve alternar o status de um benefício', async () => {
      const mockUpdatedBeneficio = {
        id: '1',
        nome: 'Cesta Básica',
        ativo: false,
      };
      
      mockBeneficioService.toggleStatus.mockResolvedValue(mockUpdatedBeneficio);
      
      const mockRequest = {
        user: {
          id: 'admin-id',
          role: 'admin',
        },
      };
      
      const result = await controller.toggleStatus('1', mockRequest);
      
      expect(result).toEqual(mockUpdatedBeneficio);
      expect(mockBeneficioService.toggleStatus).toHaveBeenCalledWith('1', mockRequest.user);
    });

    it('deve propagar NotFoundException quando o benefício não existe', async () => {
      mockBeneficioService.toggleStatus.mockRejectedValue(new NotFoundException('Benefício não encontrado'));
      
      const mockRequest = {
        user: {
          id: 'admin-id',
          role: 'admin',
        },
      };
      
      await expect(controller.toggleStatus('999', mockRequest)).rejects.toThrow(NotFoundException);
      expect(mockBeneficioService.toggleStatus).toHaveBeenCalledWith('999', mockRequest.user);
    });
  });

  describe('remove', () => {
    it('deve remover um benefício existente', async () => {
      mockBeneficioService.remove.mockResolvedValue(undefined);
      
      const mockRequest = {
        user: {
          id: 'admin-id',
          role: 'admin',
        },
      };
      
      await controller.remove('1', mockRequest);
      
      expect(mockBeneficioService.remove).toHaveBeenCalledWith('1', mockRequest.user);
    });

    it('deve propagar NotFoundException quando o benefício não existe', async () => {
      mockBeneficioService.remove.mockRejectedValue(new NotFoundException('Benefício não encontrado'));
      
      const mockRequest = {
        user: {
          id: 'admin-id',
          role: 'admin',
        },
      };
      
      await expect(controller.remove('999', mockRequest)).rejects.toThrow(NotFoundException);
      expect(mockBeneficioService.remove).toHaveBeenCalledWith('999', mockRequest.user);
    });
  });
});
