import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PagamentoService } from '../../services/pagamento.service';
import { Pagamento } from '../../entities/pagamento.entity';
import { StatusPagamentoEnum } from '../../enums/status-pagamento.enum';
import { MetodoPagamentoEnum } from '../../enums/metodo-pagamento.enum';
import { StatusTransitionValidator } from '../../validators/status-transition-validator';
import { PixValidator } from '../../validators/pix-validator';
import { ConflictException, NotFoundException } from '@nestjs/common';

/**
 * Testes unitários para o serviço de pagamento
 * 
 * Verifica o funcionamento correto das operações de criação, consulta,
 * atualização e gerenciamento de status de pagamentos.
 * 
 * @author Equipe PGBen
 */
describe('PagamentoService', () => {
  let service: PagamentoService;
  let pagamentoRepository: Repository<Pagamento>;
  let statusValidator: StatusTransitionValidator;
  let pixValidator: PixValidator;

  // Mock do repositório
  const mockPagamentoRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    update: jest.fn(),
  };

  // Mock do validador de status
  const mockStatusValidator = {
    validarTransicao: jest.fn(),
    getProximosStatusPossiveis: jest.fn(),
    getStatusInicial: jest.fn().mockReturnValue(StatusPagamentoEnum.AGENDADO),
    isStatusFinal: jest.fn(),
  };

  // Mock do validador de PIX
  const mockPixValidator = {
    validarChavePix: jest.fn(),
    mascaraChavePix: jest.fn(),
    obterTipoChavePix: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PagamentoService,
        {
          provide: getRepositoryToken(Pagamento),
          useValue: mockPagamentoRepository,
        },
        {
          provide: StatusTransitionValidator,
          useValue: mockStatusValidator,
        },
        {
          provide: PixValidator,
          useValue: mockPixValidator,
        },
      ],
    }).compile();

    service = module.get<PagamentoService>(PagamentoService);
    pagamentoRepository = module.get<Repository<Pagamento>>(getRepositoryToken(Pagamento));
    statusValidator = module.get<StatusTransitionValidator>(StatusTransitionValidator);
    pixValidator = module.get<PixValidator>(PixValidator);

    // Limpar mocks antes de cada teste
    jest.clearAllMocks();
  });

  describe('createPagamento', () => {
    const createDto = {
      valor: 500.00,
      dataLiberacao: new Date(),
      metodoPagamento: MetodoPagamentoEnum.PIX,
      infoBancariaId: 'info-bancaria-id',
      dadosBancarios: {
        pixTipo: 'cpf',
        pixChave: '12345678909'
      },
      observacoes: 'Pagamento de benefício'
    };

    const usuarioId = 'usuario-id';
    const solicitacaoId = 'solicitacao-id';

    it('deve criar um novo pagamento com sucesso', async () => {
      // Configurar mocks
      mockPixValidator.validarChavePix.mockReturnValue(true);
      mockPixValidator.mascaraChavePix.mockReturnValue('***.456.789-**');
      
      const pagamentoMock = {
        id: 'pagamento-id',
        solicitacaoId,
        ...createDto,
        status: StatusPagamentoEnum.AGENDADO,
        responsavelLiberacao: usuarioId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      mockPagamentoRepository.create.mockReturnValue(pagamentoMock);
      mockPagamentoRepository.save.mockResolvedValue(pagamentoMock);

      // Executar método
      const result = await service.createPagamento(solicitacaoId, createDto, usuarioId);

      // Verificar resultado
      expect(result).toEqual(pagamentoMock);
      expect(mockPagamentoRepository.create).toHaveBeenCalledWith({
        solicitacaoId,
        ...createDto,
        status: StatusPagamentoEnum.AGENDADO,
        responsavelLiberacao: usuarioId
      });
      expect(mockPagamentoRepository.save).toHaveBeenCalledWith(pagamentoMock);
      expect(mockPixValidator.validarChavePix).toHaveBeenCalledWith(
        createDto.dadosBancarios.pixChave,
        createDto.dadosBancarios.pixTipo
      );
    });

    it('deve rejeitar pagamento com chave PIX inválida', async () => {
      // Configurar mocks
      mockPixValidator.validarChavePix.mockReturnValue(false);
      
      // Executar e verificar exceção
      await expect(
        service.createPagamento(solicitacaoId, createDto, usuarioId)
      ).rejects.toThrow('Chave PIX inválida');
      
      expect(mockPagamentoRepository.create).not.toHaveBeenCalled();
      expect(mockPagamentoRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('deve retornar um pagamento quando encontrado', async () => {
      const pagamentoMock = {
        id: 'pagamento-id',
        solicitacaoId: 'solicitacao-id',
        status: StatusPagamentoEnum.AGENDADO
      };
      
      mockPagamentoRepository.findOne.mockResolvedValue(pagamentoMock);
      
      const result = await service.findOne('pagamento-id');
      
      expect(result).toEqual(pagamentoMock);
      expect(mockPagamentoRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'pagamento-id' }
      });
    });

    it('deve retornar null quando pagamento não for encontrado', async () => {
      mockPagamentoRepository.findOne.mockResolvedValue(null);
      
      const result = await service.findOne('pagamento-inexistente');
      
      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('deve retornar lista paginada de pagamentos', async () => {
      const pagamentosMock = [
        { id: 'pagamento-1', status: StatusPagamentoEnum.AGENDADO },
        { id: 'pagamento-2', status: StatusPagamentoEnum.LIBERADO }
      ];
      
      mockPagamentoRepository.findAndCount.mockResolvedValue([pagamentosMock, 2]);
      
      const result = await service.findAll({ page: 1, limit: 10 });
      
      expect(result).toEqual({
        items: pagamentosMock,
        total: 2,
        page: 1,
        limit: 10
      });
    });

    it('deve aplicar filtros corretamente', async () => {
      mockPagamentoRepository.findAndCount.mockResolvedValue([[], 0]);
      
      await service.findAll({
        status: StatusPagamentoEnum.LIBERADO,
        unidadeId: 'unidade-id',
        metodoPagamento: MetodoPagamentoEnum.PIX,
        page: 1,
        limit: 10
      });
      
      // Verificar se o filtro foi aplicado na query
      expect(mockPagamentoRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: StatusPagamentoEnum.LIBERADO,
            metodoPagamento: MetodoPagamentoEnum.PIX
          })
        })
      );
    });
  });

  describe('atualizarStatus', () => {
    const pagamentoId = 'pagamento-id';
    const usuarioId = 'usuario-id';
    
    it('deve atualizar status com sucesso quando transição é válida', async () => {
      // Configurar mocks
      const pagamentoMock = {
        id: pagamentoId,
        status: StatusPagamentoEnum.AGENDADO
      };
      
      mockPagamentoRepository.findOne.mockResolvedValue(pagamentoMock);
      mockStatusValidator.validarTransicao.mockReturnValue(true);
      mockPagamentoRepository.save.mockResolvedValue({
        ...pagamentoMock,
        status: StatusPagamentoEnum.LIBERADO
      });
      
      // Executar método
      const result = await service.atualizarStatus(
        pagamentoId,
        StatusPagamentoEnum.LIBERADO,
        usuarioId
      );
      
      // Verificar resultado
      expect(result.status).toBe(StatusPagamentoEnum.LIBERADO);
      expect(mockStatusValidator.validarTransicao).toHaveBeenCalledWith(
        StatusPagamentoEnum.AGENDADO,
        StatusPagamentoEnum.LIBERADO
      );
    });

    it('deve rejeitar atualização quando pagamento não existe', async () => {
      mockPagamentoRepository.findOne.mockResolvedValue(null);
      
      await expect(
        service.atualizarStatus(
          pagamentoId,
          StatusPagamentoEnum.LIBERADO,
          usuarioId
        )
      ).rejects.toThrow(NotFoundException);
    });

    it('deve rejeitar atualização quando transição é inválida', async () => {
      // Configurar mocks
      const pagamentoMock = {
        id: pagamentoId,
        status: StatusPagamentoEnum.AGENDADO
      };
      
      mockPagamentoRepository.findOne.mockResolvedValue(pagamentoMock);
      mockStatusValidator.validarTransicao.mockReturnValue(false);
      
      // Executar e verificar exceção
      await expect(
        service.atualizarStatus(
          pagamentoId,
          StatusPagamentoEnum.CONFIRMADO,
          usuarioId
        )
      ).rejects.toThrow(ConflictException);
      
      expect(mockPagamentoRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('cancelarPagamento', () => {
    const pagamentoId = 'pagamento-id';
    const usuarioId = 'usuario-id';
    const motivoCancelamento = 'Motivo de cancelamento';
    
    it('deve cancelar pagamento com sucesso quando status permite', async () => {
      // Configurar mocks
      const pagamentoMock = {
        id: pagamentoId,
        status: StatusPagamentoEnum.AGENDADO,
        solicitacaoId: 'solicitacao-id'
      };
      
      mockPagamentoRepository.findOne.mockResolvedValue(pagamentoMock);
      mockStatusValidator.validarTransicao.mockReturnValue(true);
      mockPagamentoRepository.save.mockResolvedValue({
        ...pagamentoMock,
        status: StatusPagamentoEnum.CANCELADO,
        observacoes: `CANCELADO: ${motivoCancelamento}`
      });
      
      // Executar método
      const result = await service.cancelarPagamento(
        pagamentoId,
        usuarioId,
        motivoCancelamento
      );
      
      // Verificar resultado
      expect(result.status).toBe(StatusPagamentoEnum.CANCELADO);
      expect(result.observacoes).toContain(motivoCancelamento);
    });

    it('deve rejeitar cancelamento quando pagamento não existe', async () => {
      mockPagamentoRepository.findOne.mockResolvedValue(null);
      
      await expect(
        service.cancelarPagamento(
          pagamentoId,
          usuarioId,
          motivoCancelamento
        )
      ).rejects.toThrow(NotFoundException);
    });

    it('deve rejeitar cancelamento quando transição é inválida', async () => {
      // Configurar mocks
      const pagamentoMock = {
        id: pagamentoId,
        status: StatusPagamentoEnum.CONFIRMADO
      };
      
      mockPagamentoRepository.findOne.mockResolvedValue(pagamentoMock);
      mockStatusValidator.validarTransicao.mockReturnValue(false);
      
      // Executar e verificar exceção
      await expect(
        service.cancelarPagamento(
          pagamentoId,
          usuarioId,
          motivoCancelamento
        )
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findPendentes', () => {
    it('deve retornar pagamentos com status LIBERADO', async () => {
      const pagamentosMock = [
        { id: 'pagamento-1', status: StatusPagamentoEnum.LIBERADO }
      ];
      
      mockPagamentoRepository.findAndCount.mockResolvedValue([pagamentosMock, 1]);
      
      const result = await service.findPendentes({ page: 1, limit: 10 });
      
      expect(result.items).toEqual(pagamentosMock);
      expect(mockPagamentoRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: StatusPagamentoEnum.LIBERADO
          })
        })
      );
    });
  });
});
