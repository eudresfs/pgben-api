import { Test, TestingModule } from '@nestjs/testing';
import { PagamentoController } from '../../../controllers/pagamento.controller';
import { PagamentoService } from '../../../services/pagamento.service';
import { IntegracaoCidadaoService } from '../../../services/integracao-cidadao.service';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { PagamentoCreateDto } from '../../../dtos/pagamento-create.dto';
import { AtualizarStatusDto } from '../../../dtos/atualizar-status.dto';
import { CancelarPagamentoDto } from '../../../dtos/cancelar-pagamento.dto';
import { FilterPagamentoDto } from '../../../dtos/filter-pagamento.dto';

/**
 * Testes unitários para PagamentoController
 * 
 * Valida o comportamento dos endpoints de pagamento, garantindo que os controladores
 * interagem corretamente com os serviços subjacentes e retornam as respostas esperadas.
 */
describe('PagamentoController', () => {
  let controller: PagamentoController;
  let pagamentoService: PagamentoService;
  let integracaoCidadaoService: IntegracaoCidadaoService;

  // Mock de um pagamento para ser utilizado nos testes
  const pagamentoMock = {
    id: 'pagamento-id-1',
    solicitacaoId: 'solicitacao-id-1',
    valor: 500,
    status: StatusPagamentoEnum.LIBERADO,
    metodoPagamento: 'pix',
    infoBancariaId: 'info-bancaria-id-1',
    dataLiberacao: new Date(),
    dataCriacao: new Date(),
    dataAtualizacao: new Date(),
    liberadoPor: 'usuario-id-1',
    observacoes: 'Pagamento de benefício eventual'
  };

  // Mock da lista de pagamentos
  const pagamentosListMock = [
    pagamentoMock,
    {
      ...pagamentoMock,
      id: 'pagamento-id-2',
      solicitacaoId: 'solicitacao-id-2',
      valor: 300
    }
  ];

  // Mock de resposta paginada
  const paginatedResponseMock = {
    items: pagamentosListMock,
    total: pagamentosListMock.length,
    page: 1,
    limit: 10
  };

  // Mock das informações bancárias
  const infoBancariasMock = [
    {
      id: 'info-bancaria-id-1',
      banco: '001',
      nomeBanco: 'Banco do Brasil',
      agencia: '1234',
      conta: '12345-6',
      tipoConta: 'Corrente',
      principal: true
    },
    {
      id: 'info-bancaria-id-2',
      pixTipo: 'email',
      pixChave: 'u***@e***.com',
      principal: false
    }
  ];

  // Mock do request para simular o usuário autenticado
  const mockRequest = {
    user: {
      id: 'usuario-id-1',
      nome: 'Usuário Teste',
      perfil: 'operador'
    }
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PagamentoController],
      providers: [
        {
          provide: PagamentoService,
          useValue: {
            createPagamento: jest.fn().mockResolvedValue(pagamentoMock),
            findOne: jest.fn().mockResolvedValue(pagamentoMock),
            findOneWithRelations: jest.fn().mockResolvedValue(pagamentoMock),
            findAll: jest.fn().mockResolvedValue(paginatedResponseMock),
            findPendentes: jest.fn().mockResolvedValue(paginatedResponseMock),
            atualizarStatus: jest.fn().mockResolvedValue({
              ...pagamentoMock,
              status: StatusPagamentoEnum.CONFIRMADO
            }),
            cancelarPagamento: jest.fn().mockResolvedValue({
              ...pagamentoMock,
              status: StatusPagamentoEnum.CANCELADO,
              motivoCancelamento: 'Cancelado a pedido do beneficiário',
              dataCancelamento: new Date()
            })
          }
        },
        {
          provide: IntegracaoCidadaoService,
          useValue: {
            obterInformacoesBancarias: jest.fn().mockResolvedValue(infoBancariasMock)
          }
        }
      ],
    }).compile();

    controller = module.get<PagamentoController>(PagamentoController);
    pagamentoService = module.get<PagamentoService>(PagamentoService);
    integracaoCidadaoService = module.get<IntegracaoCidadaoService>(IntegracaoCidadaoService);
  });

  it('deve estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('createPagamento', () => {
    it('deve criar um pagamento com sucesso', async () => {
      // Arrange
      const solicitacaoId = 'solicitacao-id-1';
      const createDto: PagamentoCreateDto = {
        infoBancariaId: 'info-bancaria-id-1',
        valor: 500,
        dataLiberacao: new Date(),
        metodoPagamento: 'pix',
        observacoes: 'Pagamento teste'
      };

      // Act
      const resultado = await controller.createPagamento(
        solicitacaoId,
        createDto,
        mockRequest as any
      );

      // Assert
      expect(resultado).toEqual(pagamentoMock);
      expect(pagamentoService.createPagamento).toHaveBeenCalledWith(
        solicitacaoId,
        createDto,
        mockRequest.user.id
      );
    });

    it('deve lançar erro quando o serviço falha na criação', async () => {
      // Arrange
      const solicitacaoId = 'solicitacao-id-1';
      const createDto: PagamentoCreateDto = {
        infoBancariaId: 'info-bancaria-id-1',
        valor: 500,
        dataLiberacao: new Date(),
        metodoPagamento: 'pix',
        observacoes: 'Pagamento teste'
      };
      
      jest.spyOn(pagamentoService, 'createPagamento').mockRejectedValue(
        new ConflictException('Erro ao criar pagamento')
      );

      // Act & Assert
      await expect(
        controller.createPagamento(solicitacaoId, createDto, mockRequest as any)
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getPagamento', () => {
    it('deve retornar um pagamento pelo ID', async () => {
      // Arrange
      const pagamentoId = 'pagamento-id-1';

      // Act
      const resultado = await controller.getPagamento(pagamentoId);

      // Assert
      expect(resultado).toEqual(pagamentoMock);
      expect(pagamentoService.findOneWithRelations).toHaveBeenCalledWith(pagamentoId);
    });

    it('deve lançar erro quando o pagamento não existe', async () => {
      // Arrange
      const pagamentoId = 'pagamento-inexistente';
      
      jest.spyOn(pagamentoService, 'findOneWithRelations').mockResolvedValue(null);

      // Act & Assert
      await expect(
        controller.getPagamento(pagamentoId)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listarPagamentos', () => {
    it('deve retornar lista paginada de pagamentos', async () => {
      // Arrange
      const filterDto: FilterPagamentoDto = {
        status: StatusPagamentoEnum.LIBERADO,
        page: 1,
        limit: 10
      };

      // Act
      const resultado = await controller.listarPagamentos(filterDto);

      // Assert
      expect(resultado).toEqual(paginatedResponseMock);
      expect(pagamentoService.findAll).toHaveBeenCalledWith(filterDto);
    });
  });

  describe('listarPagamentosPendentes', () => {
    it('deve retornar lista paginada de pagamentos pendentes', async () => {
      // Arrange
      const query = {
        unidadeId: 'unidade-id-1',
        tipoBeneficioId: 'tipo-beneficio-id-1',
        page: 1,
        limit: 10
      };

      // Act
      const resultado = await controller.listarPagamentosPendentes(query);

      // Assert
      expect(resultado).toEqual(paginatedResponseMock);
      expect(pagamentoService.findPendentes).toHaveBeenCalledWith(query);
    });
  });

  describe('atualizarStatus', () => {
    it('deve atualizar o status de um pagamento', async () => {
      // Arrange
      const pagamentoId = 'pagamento-id-1';
      const updateDto: AtualizarStatusDto = {
        status: StatusPagamentoEnum.CONFIRMADO
      };
      
      const pagamentoAtualizado = {
        ...pagamentoMock,
        status: StatusPagamentoEnum.CONFIRMADO
      };

      // Act
      const resultado = await controller.atualizarStatus(
        pagamentoId,
        updateDto,
        mockRequest as any
      );

      // Assert
      expect(resultado).toEqual(pagamentoAtualizado);
      expect(pagamentoService.atualizarStatus).toHaveBeenCalledWith(
        pagamentoId,
        updateDto.status,
        mockRequest.user.id
      );
    });

    it('deve lançar erro quando o pagamento não existe', async () => {
      // Arrange
      const pagamentoId = 'pagamento-inexistente';
      const updateDto: AtualizarStatusDto = {
        status: StatusPagamentoEnum.CONFIRMADO
      };
      
      jest.spyOn(pagamentoService, 'atualizarStatus').mockRejectedValue(
        new NotFoundException('Pagamento não encontrado')
      );

      // Act & Assert
      await expect(
        controller.atualizarStatus(pagamentoId, updateDto, mockRequest as any)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancelarPagamento', () => {
    it('deve cancelar um pagamento com sucesso', async () => {
      // Arrange
      const pagamentoId = 'pagamento-id-1';
      const cancelarDto: CancelarPagamentoDto = {
        motivoCancelamento: 'Cancelado a pedido do beneficiário'
      };
      
      const pagamentoCancelado = {
        ...pagamentoMock,
        status: StatusPagamentoEnum.CANCELADO,
        motivoCancelamento: 'Cancelado a pedido do beneficiário',
        dataCancelamento: expect.any(Date)
      };

      // Act
      const resultado = await controller.cancelarPagamento(
        pagamentoId,
        cancelarDto,
        mockRequest as any
      );

      // Assert
      expect(resultado).toEqual(pagamentoCancelado);
      expect(pagamentoService.cancelarPagamento).toHaveBeenCalledWith(
        pagamentoId,
        mockRequest.user.id,
        cancelarDto.motivoCancelamento
      );
    });
  });

  describe('getInfoBancarias', () => {
    it('deve retornar informações bancárias de um beneficiário', async () => {
      // Arrange
      const beneficiarioId = 'beneficiario-id-1';

      // Act
      const resultado = await controller.getInfoBancarias(beneficiarioId);

      // Assert
      expect(resultado).toEqual(infoBancariasMock);
      expect(integracaoCidadaoService.obterInformacoesBancarias).toHaveBeenCalledWith(
        beneficiarioId
      );
    });

    it('deve lançar erro quando o beneficiário não existe', async () => {
      // Arrange
      const beneficiarioId = 'beneficiario-inexistente';
      
      jest.spyOn(integracaoCidadaoService, 'obterInformacoesBancarias').mockRejectedValue(
        new NotFoundException('Beneficiário não encontrado')
      );

      // Act & Assert
      await expect(
        controller.getInfoBancarias(beneficiarioId)
      ).rejects.toThrow(NotFoundException);
    });
  });
});
