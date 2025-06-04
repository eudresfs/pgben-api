import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';

import { PagamentoService } from '../../../services/pagamento.service';
import { Pagamento } from '../../../entities/pagamento.entity';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';
import { StatusTransitionValidator } from '../../../validators/status-transition-validator';
import { PagamentoCreateDto } from '../../../dtos/pagamento-create.dto';
import { MetodoPagamentoEnum } from '../../../enums/metodo-pagamento.enum';

/**
 * Testes unitários para PagamentoService
 *
 * Garante que cada método do serviço de pagamentos funciona corretamente
 * em isolamento, com dependências devidamente mockadas.
 */
describe('PagamentoService', () => {
  let service: PagamentoService;
  let pagamentoRepository: Repository<Pagamento>;
  let statusValidator: StatusTransitionValidator;

  // Dados de exemplo para testes
  const pagamentoMock: Pagamento = {
    id: 'pagamento-id-1',
    solicitacaoId: 'solicitacao-id-1',
    valor: 500,
    status: StatusPagamentoEnum.LIBERADO,
    metodoPagamento: MetodoPagamentoEnum.PIX,
    infoBancariaId: 'info-bancaria-id-1',
    dataLiberacao: new Date(),
    dataCriacao: new Date(),
    dataAtualizacao: new Date(),
    liberadoPor: 'usuario-id-1',
    observacoes: 'Pagamento de benefício eventual',
  };

  const pagamentosListMock = [
    pagamentoMock,
    {
      ...pagamentoMock,
      id: 'pagamento-id-2',
      solicitacaoId: 'solicitacao-id-2',
      valor: 300,
    },
  ];

  const pagamentoCreateDtoMock: PagamentoCreateDto = {
    valor: 500,
    metodoPagamento: 'pix',
    infoBancariaId: 'info-bancaria-id-1',
    dataLiberacao: new Date(),
    observacoes: 'Pagamento de benefício eventual',
  };

  beforeEach(async () => {
    // Configuração do módulo de teste com mocks
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PagamentoService,
        {
          provide: getRepositoryToken(Pagamento),
          useValue: {
            create: jest.fn().mockReturnValue(pagamentoMock),
            save: jest.fn().mockResolvedValue(pagamentoMock),
            findOne: jest.fn().mockResolvedValue(pagamentoMock),
            createQueryBuilder: jest.fn(() => ({
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              innerJoin: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              skip: jest.fn().mockReturnThis(),
              take: jest.fn().mockReturnThis(),
              getManyAndCount: jest
                .fn()
                .mockResolvedValue([
                  pagamentosListMock,
                  pagamentosListMock.length,
                ]),
            })),
          },
        },
        {
          provide: StatusTransitionValidator,
          useValue: {
            canTransition: jest
              .fn()
              .mockReturnValue({
                allowed: true,
                message: 'Transição permitida',
              }),
          },
        },
      ],
    }).compile();

    service = module.get<PagamentoService>(PagamentoService);
    pagamentoRepository = module.get<Repository<Pagamento>>(
      getRepositoryToken(Pagamento),
    );
    statusValidator = module.get<StatusTransitionValidator>(
      StatusTransitionValidator,
    );
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('createPagamento', () => {
    it('deve criar um novo pagamento com sucesso', async () => {
      // Arrange
      const solicitacaoId = 'solicitacao-id-1';
      const usuarioId = 'usuario-id-1';

      // Act
      const resultado = await service.createPagamento(
        solicitacaoId,
        pagamentoCreateDtoMock,
        usuarioId,
      );

      // Assert
      expect(resultado).toEqual(pagamentoMock);
      expect(pagamentoRepository.create).toHaveBeenCalled();
      expect(pagamentoRepository.save).toHaveBeenCalled();
    });

    it('deve lançar erro quando método não presencial não inclui infoBancariaId', async () => {
      // Arrange
      const solicitacaoId = 'solicitacao-id-1';
      const usuarioId = 'usuario-id-1';
      const dtoInvalido = {
        ...pagamentoCreateDtoMock,
        metodoPagamento: 'pix',
        infoBancariaId: undefined,
      };

      // Act & Assert
      await expect(
        service.createPagamento(solicitacaoId, dtoInvalido, usuarioId),
      ).rejects.toThrow(ConflictException);
    });

    it('deve aceitar pagamento presencial sem infoBancariaId', async () => {
      // Arrange
      const solicitacaoId = 'solicitacao-id-1';
      const usuarioId = 'usuario-id-1';
      const dtoPresencial = {
        ...pagamentoCreateDtoMock,
        metodoPagamento: 'presencial',
        infoBancariaId: undefined,
      };

      // Mock específico para este teste
      jest.spyOn(pagamentoRepository, 'create').mockReturnValue({
        ...pagamentoMock,
        metodoPagamento: 'presencial',
        infoBancariaId: undefined,
      });

      // Act
      const resultado = await service.createPagamento(
        solicitacaoId,
        dtoPresencial,
        usuarioId,
      );

      // Assert
      expect(resultado.metodoPagamento).toBe('presencial');
      expect(pagamentoRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metodoPagamento: 'presencial',
        }),
      );
      expect(pagamentoRepository.save).toHaveBeenCalled();
    });
  });

  describe('atualizarStatus', () => {
    it('deve atualizar o status do pagamento com sucesso', async () => {
      // Arrange
      const pagamentoId = 'pagamento-id-1';
      const novoStatus = StatusPagamentoEnum.CONFIRMADO;
      const usuarioId = 'usuario-id-1';

      // Mock do resultado da atualização
      const pagamentoAtualizado = {
        ...pagamentoMock,
        status: novoStatus,
        atualizadoPor: usuarioId,
        dataAtualizacao: expect.any(Date),
      };

      jest
        .spyOn(pagamentoRepository, 'save')
        .mockResolvedValue(pagamentoAtualizado);
      jest
        .spyOn(pagamentoRepository, 'findOne')
        .mockResolvedValue(pagamentoMock);

      // Act
      const resultado = await service.atualizarStatus(
        pagamentoId,
        novoStatus,
        usuarioId,
      );

      // Assert
      expect(resultado).toEqual(pagamentoAtualizado);
      expect(statusValidator.canTransition).toHaveBeenCalledWith(
        pagamentoMock.status,
        novoStatus,
      );
      expect(pagamentoRepository.save).toHaveBeenCalled();
    });

    it('deve lançar erro quando pagamento não existe', async () => {
      // Arrange
      const pagamentoId = 'pagamento-inexistente';
      const novoStatus = StatusPagamentoEnum.CONFIRMADO;
      const usuarioId = 'usuario-id-1';

      jest.spyOn(pagamentoRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.atualizarStatus(pagamentoId, novoStatus, usuarioId),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve lançar erro quando transição de status não é permitida', async () => {
      // Arrange
      const pagamentoId = 'pagamento-id-1';
      const novoStatus = StatusPagamentoEnum.AGENDADO; // Transição inválida de LIBERADO para AGENDADO
      const usuarioId = 'usuario-id-1';

      jest.spyOn(statusValidator, 'canTransition').mockReturnValue({
        allowed: false,
        message: 'Transição não permitida',
      });

      // Act & Assert
      await expect(
        service.atualizarStatus(pagamentoId, novoStatus, usuarioId),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('cancelarPagamento', () => {
    it('deve cancelar um pagamento com sucesso', async () => {
      // Arrange
      const pagamentoId = 'pagamento-id-1';
      const usuarioId = 'usuario-id-1';
      const motivoCancelamento = 'Cancelado a pedido do beneficiário';

      const pagamentoCancelado = {
        ...pagamentoMock,
        status: StatusPagamentoEnum.CANCELADO,
        motivoCancelamento,
        canceladoPor: usuarioId,
        dataCancelamento: expect.any(Date),
      };

      jest
        .spyOn(pagamentoRepository, 'save')
        .mockResolvedValue(pagamentoCancelado);

      // Act
      const resultado = await service.cancelarPagamento(
        pagamentoId,
        usuarioId,
        motivoCancelamento,
      );

      // Assert
      expect(resultado).toEqual(pagamentoCancelado);
      expect(statusValidator.canTransition).toHaveBeenCalledWith(
        pagamentoMock.status,
        StatusPagamentoEnum.CANCELADO,
      );
      expect(pagamentoRepository.save).toHaveBeenCalled();
    });

    it('deve lançar erro quando pagamento não existe', async () => {
      // Arrange
      const pagamentoId = 'pagamento-inexistente';
      const usuarioId = 'usuario-id-1';
      const motivoCancelamento = 'Cancelado a pedido do beneficiário';

      jest.spyOn(pagamentoRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.cancelarPagamento(pagamentoId, usuarioId, motivoCancelamento),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve lançar erro quando cancelamento não é permitido', async () => {
      // Arrange
      const pagamentoId = 'pagamento-id-1';
      const usuarioId = 'usuario-id-1';
      const motivoCancelamento = 'Cancelado a pedido do beneficiário';

      // Mock para pagamento já confirmado (não pode ser cancelado)
      jest.spyOn(pagamentoRepository, 'findOne').mockResolvedValue({
        ...pagamentoMock,
        status: StatusPagamentoEnum.CONFIRMADO,
      });

      jest.spyOn(statusValidator, 'canTransition').mockReturnValue({
        allowed: false,
        message: 'Cancelamento não permitido para pagamentos confirmados',
      });

      // Act & Assert
      await expect(
        service.cancelarPagamento(pagamentoId, usuarioId, motivoCancelamento),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('deve retornar um pagamento pelo ID', async () => {
      // Arrange
      const pagamentoId = 'pagamento-id-1';

      // Act
      const resultado = await service.findOne(pagamentoId);

      // Assert
      expect(resultado).toEqual(pagamentoMock);
      expect(pagamentoRepository.findOne).toHaveBeenCalledWith({
        where: { id: pagamentoId },
      });
    });

    it('deve retornar null quando pagamento não existe', async () => {
      // Arrange
      const pagamentoId = 'pagamento-inexistente';

      jest.spyOn(pagamentoRepository, 'findOne').mockResolvedValue(null);

      // Act
      const resultado = await service.findOne(pagamentoId);

      // Assert
      expect(resultado).toBeNull();
    });
  });

  describe('findOneWithRelations', () => {
    it('deve retornar um pagamento com suas relações', async () => {
      // Arrange
      const pagamentoId = 'pagamento-id-1';
      const pagamentoComRelacoes = {
        ...pagamentoMock,
        comprovantes: [],
        confirmacao: null,
      };

      jest
        .spyOn(pagamentoRepository, 'findOne')
        .mockResolvedValue(pagamentoComRelacoes);

      // Act
      const resultado = await service.findOneWithRelations(pagamentoId);

      // Assert
      expect(resultado).toEqual(pagamentoComRelacoes);
      expect(pagamentoRepository.findOne).toHaveBeenCalledWith({
        where: { id: pagamentoId },
        relations: expect.arrayContaining(['comprovantes', 'confirmacao']),
      });
    });
  });

  describe('findAll', () => {
    it('deve retornar lista de pagamentos com paginação', async () => {
      // Arrange
      const options = {
        page: 1,
        limit: 10,
      };

      const expected = {
        items: pagamentosListMock,
        total: pagamentosListMock.length,
        page: options.page,
        limit: options.limit,
      };

      // Act
      const resultado = await service.findAll(options);

      // Assert
      expect(resultado).toEqual(expected);
      expect(pagamentoRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it('deve aplicar filtros na busca', async () => {
      // Arrange
      const options = {
        status: StatusPagamentoEnum.LIBERADO,
        unidadeId: 'unidade-id-1',
        dataInicio: new Date('2025-01-01'),
        dataFim: new Date('2025-12-31'),
        metodoPagamento: 'pix',
        page: 1,
        limit: 10,
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest
          .fn()
          .mockResolvedValue([pagamentosListMock, pagamentosListMock.length]),
      };

      jest
        .spyOn(pagamentoRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      // Act
      const resultado = await service.findAll(options);

      // Assert
      expect(mockQueryBuilder.where).toHaveBeenCalled();
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(4); // 4 filtros
      expect(mockQueryBuilder.innerJoin).toHaveBeenCalled(); // Para unidadeId
      expect(resultado.items).toEqual(pagamentosListMock);
    });
  });

  describe('findPendentes', () => {
    it('deve retornar lista de pagamentos pendentes', async () => {
      // Arrange
      const options = {
        page: 1,
        limit: 10,
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest
          .fn()
          .mockResolvedValue([pagamentosListMock, pagamentosListMock.length]),
      };

      jest
        .spyOn(pagamentoRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      // Act
      const resultado = await service.findPendentes(options);

      // Assert
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'pagamento.status = :status',
        { status: StatusPagamentoEnum.LIBERADO },
      );
      expect(resultado.items).toEqual(pagamentosListMock);
    });

    it('deve aplicar filtros adicionais em pagamentos pendentes', async () => {
      // Arrange
      const options = {
        unidadeId: 'unidade-id-1',
        tipoBeneficioId: 'tipo-beneficio-id-1',
        page: 1,
        limit: 10,
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest
          .fn()
          .mockResolvedValue([pagamentosListMock, pagamentosListMock.length]),
      };

      jest
        .spyOn(pagamentoRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      // Act
      const resultado = await service.findPendentes(options);

      // Assert
      expect(mockQueryBuilder.innerJoin).toHaveBeenCalled();
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(2); // unidadeId e tipoBeneficioId
      expect(resultado.items).toEqual(pagamentosListMock);
    });
  });
});
