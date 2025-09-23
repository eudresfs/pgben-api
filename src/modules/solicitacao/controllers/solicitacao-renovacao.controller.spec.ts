import { SolicitacaoController } from './solicitacao.controller';
import { SolicitacaoService } from '../services/solicitacao.service';
import { LoggingService } from '../../../shared/logging/logging.service';
import { Request } from 'express';

describe('SolicitacaoController - Renovação (Unit Tests)', () => {
  let controller: SolicitacaoController;
  let solicitacaoService: SolicitacaoService;
  let loggingService: LoggingService;

  // Mock dos serviços
  const mockSolicitacaoService = {
    findById: jest.fn(),
    listarComElegibilidadeRenovacao: jest.fn(),
    verificarElegibilidadeRenovacao: jest.fn(),
  };

  const mockLoggingService = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    // Criação direta do controller sem módulo de teste
    solicitacaoService = mockSolicitacaoService as any;
    loggingService = mockLoggingService as any;
    controller = new SolicitacaoController(solicitacaoService, loggingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listarComElegibilidadeRenovacao', () => {
    it('deve chamar o método do serviço com os parâmetros corretos', async () => {
      // Arrange
      const mockRequest = {
        user: { id: 'user-123', nome: 'Test User' },
      } as Request;
      const mockResult = [{ id: 'sol-1', protocolo: 'SOL-001' }];
      mockSolicitacaoService.listarComElegibilidadeRenovacao.mockResolvedValue(mockResult);

      // Act
      const result = await controller.listarComElegibilidadeRenovacao(mockRequest);

      // Assert
      expect(mockSolicitacaoService.listarComElegibilidadeRenovacao).toHaveBeenCalledWith(mockRequest.user.id);
      expect(result).toEqual(mockResult);
    });
  });

  describe('verificarElegibilidadeRenovacao', () => {
    it('deve verificar elegibilidade para renovação', async () => {
      // Arrange
      const concessaoId = 'concessao-123';
      const mockRequest = {
        user: { id: 'user-123', nome: 'Test User' },
      } as Request;
      const mockSolicitacao = {
        id: 'sol-123',
        concessao: { id: concessaoId },
      };
      const mockElegibilidade = {
        podeRenovar: true,
        motivos: undefined,
      };

      mockSolicitacaoService.findById.mockResolvedValue(mockSolicitacao);
      mockSolicitacaoService.verificarElegibilidadeRenovacao.mockResolvedValue(mockElegibilidade);

      // Act
      const result = await controller.verificarElegibilidadeRenovacao(concessaoId, mockRequest);

      // Assert
      expect(mockSolicitacaoService.findById).toHaveBeenCalledWith(concessaoId);
      expect(result).toEqual(mockElegibilidade);
    });
  });
});