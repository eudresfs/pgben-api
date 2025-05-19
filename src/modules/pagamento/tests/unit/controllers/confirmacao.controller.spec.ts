import { Test, TestingModule } from '@nestjs/testing';
import { ConfirmacaoController } from '../../../controllers/confirmacao.controller';
import { ConfirmacaoService } from '../../../services/confirmacao.service';
import { PagamentoService } from '../../../services/pagamento.service';
import { NotFoundException } from '@nestjs/common';
import { ConfirmacaoRecebimentoDto } from '../../../dtos/confirmacao-recebimento.dto';

/**
 * Testes unitários para ConfirmacaoController
 * 
 * Valida o comportamento dos endpoints de confirmação de recebimento,
 * garantindo que o processo de confirmação pelo beneficiário funcione corretamente.
 * 
 * @author Equipe PGBen
 */
describe('ConfirmacaoController', () => {
  let controller: ConfirmacaoController;
  let confirmacaoService: ConfirmacaoService;
  let pagamentoService: PagamentoService;

  // Mock de uma confirmação de recebimento para os testes
  const confirmacaoMock = {
    id: 'confirmacao-id-1',
    pagamentoId: 'pagamento-id-1',
    dataConfirmacao: new Date(),
    metodoCaptacao: 'assinatura_digital',
    recebedorNome: 'Maria Silva',
    recebedorDocumento: '123.456.789-09',
    recebedorVinculo: 'beneficiario',
    observacoes: 'Confirmação realizada pelo próprio beneficiário',
    confirmadoPor: 'usuario-id-1'
  };

  // Mock de um pagamento para os testes
  const pagamentoMock = {
    id: 'pagamento-id-1',
    solicitacaoId: 'solicitacao-id-1',
    status: 'LIBERADO',
    valor: 500,
    beneficiarioId: 'beneficiario-id-1'
  };

  // Mock do request com usuário autenticado
  const mockRequest = {
    user: {
      id: 'usuario-id-1',
      nome: 'Usuário Teste',
      perfil: 'operador'
    }
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConfirmacaoController],
      providers: [
        {
          provide: ConfirmacaoService,
          useValue: {
            registrarConfirmacao: jest.fn().mockResolvedValue(confirmacaoMock),
            getConfirmacao: jest.fn().mockResolvedValue(confirmacaoMock)
          }
        },
        {
          provide: PagamentoService,
          useValue: {
            findOne: jest.fn().mockResolvedValue(pagamentoMock),
            findOneWithRelations: jest.fn().mockResolvedValue({
              ...pagamentoMock,
              confirmacao: null // Inicialmente sem confirmação
            })
          }
        }
      ],
    }).compile();

    controller = module.get<ConfirmacaoController>(ConfirmacaoController);
    confirmacaoService = module.get<ConfirmacaoService>(ConfirmacaoService);
    pagamentoService = module.get<PagamentoService>(PagamentoService);
  });

  it('deve estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('registrarConfirmacao', () => {
    it('deve registrar confirmação de recebimento com sucesso', async () => {
      // Arrange
      const pagamentoId = 'pagamento-id-1';
      const confirmacaoDto: ConfirmacaoRecebimentoDto = {
        metodoCaptacao: 'assinatura_digital',
        recebedorNome: 'Maria Silva',
        recebedorDocumento: '123.456.789-09',
        recebedorVinculo: 'beneficiario',
        observacoes: 'Confirmação realizada pelo próprio beneficiário'
      };

      // Act
      const resultado = await controller.registrarConfirmacao(
        pagamentoId,
        confirmacaoDto,
        mockRequest as any
      );

      // Assert
      expect(resultado).toEqual(confirmacaoMock);
      expect(pagamentoService.findOneWithRelations).toHaveBeenCalledWith(pagamentoId);
      expect(confirmacaoService.registrarConfirmacao).toHaveBeenCalledWith(
        pagamentoId,
        confirmacaoDto,
        mockRequest.user.id
      );
    });

    it('deve verificar se o pagamento existe', async () => {
      // Arrange
      const pagamentoId = 'pagamento-inexistente';
      const confirmacaoDto: ConfirmacaoRecebimentoDto = {
        metodoCaptacao: 'assinatura_digital',
        recebedorNome: 'Maria Silva',
        recebedorDocumento: '123.456.789-09',
        recebedorVinculo: 'beneficiario',
        observacoes: 'Confirmação realizada pelo próprio beneficiário'
      };
      
      jest.spyOn(pagamentoService, 'findOneWithRelations').mockResolvedValue(null);

      // Act & Assert
      await expect(
        controller.registrarConfirmacao(pagamentoId, confirmacaoDto, mockRequest as any)
      ).rejects.toThrow(NotFoundException);
    });

    it('deve verificar se o pagamento já possui confirmação', async () => {
      // Arrange
      const pagamentoId = 'pagamento-id-1';
      const confirmacaoDto: ConfirmacaoRecebimentoDto = {
        metodoCaptacao: 'assinatura_digital',
        recebedorNome: 'Maria Silva',
        recebedorDocumento: '123.456.789-09',
        recebedorVinculo: 'beneficiario',
        observacoes: 'Confirmação realizada pelo próprio beneficiário'
      };
      
      // Simular pagamento que já possui confirmação
      jest.spyOn(pagamentoService, 'findOneWithRelations').mockResolvedValue({
        ...pagamentoMock,
        confirmacao: {
          id: 'confirmacao-existente'
        }
      });

      // Act & Assert
      await expect(
        controller.registrarConfirmacao(pagamentoId, confirmacaoDto, mockRequest as any)
      ).rejects.toThrow();
    });
  });

  describe('getConfirmacao', () => {
    it('deve retornar confirmação pelo ID', async () => {
      // Arrange
      const confirmacaoId = 'confirmacao-id-1';

      // Act
      const resultado = await controller.getConfirmacao(confirmacaoId);

      // Assert
      expect(resultado).toEqual(confirmacaoMock);
      expect(confirmacaoService.getConfirmacao).toHaveBeenCalledWith(confirmacaoId);
    });

    it('deve lançar erro quando confirmação não existe', async () => {
      // Arrange
      const confirmacaoId = 'confirmacao-inexistente';
      
      jest.spyOn(confirmacaoService, 'getConfirmacao').mockResolvedValue(null);

      // Act & Assert
      await expect(
        controller.getConfirmacao(confirmacaoId)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getConfirmacaoPorPagamento', () => {
    it('deve retornar confirmação de um pagamento', async () => {
      // Arrange
      const pagamentoId = 'pagamento-id-1';
      
      // Simular pagamento com confirmação
      jest.spyOn(pagamentoService, 'findOneWithRelations').mockResolvedValue({
        ...pagamentoMock,
        confirmacao: confirmacaoMock
      });

      // Act
      const resultado = await controller.getConfirmacaoPorPagamento(pagamentoId);

      // Assert
      expect(resultado).toEqual(confirmacaoMock);
      expect(pagamentoService.findOneWithRelations).toHaveBeenCalledWith(pagamentoId);
    });

    it('deve verificar se o pagamento existe', async () => {
      // Arrange
      const pagamentoId = 'pagamento-inexistente';
      
      jest.spyOn(pagamentoService, 'findOneWithRelations').mockResolvedValue(null);

      // Act & Assert
      await expect(
        controller.getConfirmacaoPorPagamento(pagamentoId)
      ).rejects.toThrow(NotFoundException);
    });

    it('deve lançar erro quando pagamento não possui confirmação', async () => {
      // Arrange
      const pagamentoId = 'pagamento-id-1';
      
      // Simular pagamento sem confirmação
      jest.spyOn(pagamentoService, 'findOneWithRelations').mockResolvedValue({
        ...pagamentoMock,
        confirmacao: null
      });

      // Act & Assert
      await expect(
        controller.getConfirmacaoPorPagamento(pagamentoId)
      ).rejects.toThrow(NotFoundException);
    });
  });
});
