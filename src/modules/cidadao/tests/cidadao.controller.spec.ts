import { Test, TestingModule } from '@nestjs/testing';
import { CidadaoController } from '../controllers/cidadao.controller';
import { CidadaoService } from '../services/cidadao.service';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { Sexo } from '../entities/cidadao.entity';

/**
 * Testes unitários para o controlador de cidadão
 *
 * Verifica o funcionamento dos endpoints relacionados aos cidadãos
 */
describe('CidadaoController', () => {
  let controller: CidadaoController;

  // Mock do serviço de cidadão
  const mockCidadaoService = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByCpf: jest.fn(),
    findByNis: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findSolicitacoesByCidadaoId: jest.fn(),
    addComposicaoFamiliar: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CidadaoController],
      providers: [
        {
          provide: CidadaoService,
          useValue: mockCidadaoService,
        },
      ],
    }).compile();

    controller = module.get<CidadaoController>(CidadaoController);
  });

  it('deve ser definido', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('deve retornar uma lista paginada de cidadãos', async () => {
      const mockResult = {
        items: [
          {
            id: '1',
            nome: 'João Silva',
            cpf: '123.456.789-00',
          },
          {
            id: '2',
            nome: 'Maria Souza',
            cpf: '987.654.321-00',
          },
        ],
        meta: {
          total: 2,
          page: 1,
          limit: 10,
          pages: 1,
        },
      };

      mockCidadaoService.findAll.mockResolvedValue(mockResult);

      // Mock do objeto request com o usuário logado
      const mockRequest = {
        user: {
          unidadeId: 'unidade-id-1',
        },
      };

      const result = await controller.findAll(
        mockRequest,
        1,
        10,
        undefined,
        undefined,
      );

      expect(result).toEqual(mockResult);
      expect(mockCidadaoService.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: undefined,
        bairro: undefined,
        unidadeId: 'unidade-id-1',
      });
    });
  });

  describe('findOne', () => {
    it('deve retornar um cidadão quando encontrado pelo ID', async () => {
      const mockCidadao = {
        id: '1',
        nome: 'João Silva',
        cpf: '123.456.789-00',
      };

      mockCidadaoService.findById.mockResolvedValue(mockCidadao);

      const result = await controller.findOne('1');

      expect(result).toEqual(mockCidadao);
      expect(mockCidadaoService.findById).toHaveBeenCalledWith('1');
    });

    it('deve propagar NotFoundException quando o cidadão não é encontrado', async () => {
      mockCidadaoService.findById.mockRejectedValue(
        new NotFoundException('Cidadão não encontrado'),
      );

      await expect(controller.findOne('999')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockCidadaoService.findById).toHaveBeenCalledWith('999');
    });
  });

  describe('findByCpf', () => {
    it('deve retornar um cidadão quando encontrado pelo CPF', async () => {
      const mockCidadao = {
        id: '1',
        nome: 'João Silva',
        cpf: '123.456.789-00',
      };

      mockCidadaoService.findByCpf.mockResolvedValue(mockCidadao);

      const result = await controller.findByCpf('123.456.789-00');

      expect(result).toEqual(mockCidadao);
      expect(mockCidadaoService.findByCpf).toHaveBeenCalledWith(
        '123.456.789-00',
      );
    });

    it('deve propagar NotFoundException quando o cidadão não é encontrado pelo CPF', async () => {
      mockCidadaoService.findByCpf.mockRejectedValue(
        new NotFoundException('Cidadão não encontrado'),
      );

      await expect(controller.findByCpf('999.999.999-99')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockCidadaoService.findByCpf).toHaveBeenCalledWith(
        '999.999.999-99',
      );
    });
  });

  describe('create', () => {
    it('deve criar um novo cidadão quando os dados são válidos', async () => {
      const createCidadaoDto = {
        nome: 'João Silva',
        cpf: '123.456.789-00',
        rg: '1234567',
        data_nascimento: new Date('1990-01-01'),
        sexo: Sexo.MASCULINO,
        renda: 1500,
        telefone: '(84) 99999-9999',
        email: 'joao@example.com',
        endereco: {
          cep: '59000-000',
          logradouro: 'Rua Principal',
          numero: '123',
          bairro: 'Centro',
          cidade: 'Natal',
          estado: 'RN',
        },
      };

      const mockCidadao = {
        id: '1',
        ...createCidadaoDto,
      };

      mockCidadaoService.create.mockResolvedValue(mockCidadao);

      // Mock do objeto request com o usuário logado
      const mockRequest = {
        user: {
          unidadeId: 'unidade-id-1',
        },
      };

      const result = await controller.create(createCidadaoDto, mockRequest);

      expect(result).toEqual(mockCidadao);
      expect(mockCidadaoService.create).toHaveBeenCalledWith(
        createCidadaoDto,
        'unidade-id-1',
      );
    });

    it('deve propagar ConflictException quando já existe um cidadão com o mesmo CPF', async () => {
      const createCidadaoDto = {
        nome: 'João Silva',
        cpf: '123.456.789-00',
        rg: '1234567',
        data_nascimento: new Date('1990-01-01'),
        sexo: Sexo.MASCULINO,
        endereco: {
          cep: '59000-000',
          logradouro: 'Rua Principal',
          numero: '123',
          bairro: 'Centro',
          cidade: 'Natal',
          estado: 'RN',
        },
      };

      mockCidadaoService.create.mockRejectedValue(
        new ConflictException('CPF já cadastrado'),
      );

      // Mock do objeto request com o usuário logado
      const mockRequest = {
        user: {
          unidadeId: 'unidade-id-1',
        },
      };

      await expect(
        controller.create(createCidadaoDto, mockRequest),
      ).rejects.toThrow(ConflictException);
      expect(mockCidadaoService.create).toHaveBeenCalledWith(
        createCidadaoDto,
        'unidade-id-1',
      );
    });
  });

  describe('update', () => {
    it('deve atualizar um cidadão existente', async () => {
      const updateCidadaoDto = {
        nome: 'João Silva Atualizado',
        telefone: '(84) 88888-8888',
      };

      const mockUpdatedCidadao = {
        id: '1',
        nome: 'João Silva Atualizado',
        cpf: '123.456.789-00',
        telefone: '(84) 88888-8888',
      };

      mockCidadaoService.update.mockResolvedValue(mockUpdatedCidadao);

      const result = await controller.update('1', updateCidadaoDto);

      expect(result).toEqual(mockUpdatedCidadao);
      expect(mockCidadaoService.update).toHaveBeenCalledWith(
        '1',
        updateCidadaoDto,
      );
    });

    it('deve propagar NotFoundException quando o cidadão não existe', async () => {
      const updateCidadaoDto = {
        nome: 'João Silva Atualizado',
      };

      mockCidadaoService.update.mockRejectedValue(
        new NotFoundException('Cidadão não encontrado'),
      );

      await expect(controller.update('999', updateCidadaoDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockCidadaoService.update).toHaveBeenCalledWith(
        '999',
        updateCidadaoDto,
      );
    });
  });

  describe('findByNis', () => {
    it('deve retornar um cidadão quando encontrado pelo NIS', async () => {
      const mockCidadao = {
        id: '1',
        nome: 'João Silva',
        nis: '12345678901',
      };

      mockCidadaoService.findByNis.mockResolvedValue(mockCidadao);

      const result = await controller.findByNis('12345678901');

      expect(result).toEqual(mockCidadao);
      expect(mockCidadaoService.findByNis).toHaveBeenCalledWith('12345678901');
    });

    it('deve propagar NotFoundException quando o cidadão não é encontrado pelo NIS', async () => {
      mockCidadaoService.findByNis.mockRejectedValue(
        new NotFoundException('Cidadão não encontrado'),
      );

      await expect(controller.findByNis('99999999999')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockCidadaoService.findByNis).toHaveBeenCalledWith('99999999999');
    });
  });
});
