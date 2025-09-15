import { Test, TestingModule } from '@nestjs/testing';
import { RelatoriosController } from '../controllers/relatorios.controller';
import { RelatoriosService } from '../services/relatorios.service';
import { RelatorioBeneficiosDto } from '../dto/relatorio-beneficios.dto';
import { RelatorioSolicitacoesDto } from '../dto/relatorio-solicitacoes.dto';
import { RelatorioAtendimentosDto } from '../dto/relatorio-atendimentos.dto';
import { Request, Response } from 'express';

/**
 * Testes unitários para o controlador de relatórios
 *
 * Este arquivo contém testes que validam a funcionalidade do controlador
 * responsável por receber requisições e coordenar a geração de relatórios
 */
describe('RelatoriosController', () => {
  let controller: RelatoriosController;
  let relatoriosService: RelatoriosService;

  // Mock para o serviço de relatórios
  const mockRelatoriosService = {
    gerarRelatorioBeneficiosConcedidos: jest.fn().mockResolvedValue({
      buffer: Buffer.from('mock content'),
      contentType: 'application/pdf',
      filename: 'relatorio-beneficios.pdf',
    }),
    gerarRelatorioSolicitacoesPorStatus: jest.fn().mockResolvedValue({
      buffer: Buffer.from('mock content'),
      contentType: 'application/pdf',
      filename: 'relatorio-solicitacoes.pdf',
    }),
    gerarRelatorioAtendimentosPorUnidade: jest.fn().mockResolvedValue({
      buffer: Buffer.from('mock content'),
      contentType: 'application/pdf',
      filename: 'relatorio-atendimentos.pdf',
    }),
  };

  // Mock para o objeto de resposta
  const mockResponse = {
    set: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
  } as unknown as Response;

  // Mock para o objeto de requisição
  const createMockRequest = (user: any) => {
    return {
      user,
      get: jest.fn(),
      header: jest.fn(),
      accepts: jest.fn(),
      acceptsCharsets: jest.fn(),
      acceptsEncodings: jest.fn(),
      acceptsLanguages: jest.fn(),
      range: jest.fn(),
    } as unknown as Request;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RelatoriosController],
      providers: [
        {
          provide: RelatoriosService,
          useValue: mockRelatoriosService,
        },
      ],
    }).compile();

    controller = module.get<RelatoriosController>(RelatoriosController);
    relatoriosService = module.get<RelatoriosService>(RelatoriosService);

    // Reset mocks antes de cada teste
    jest.clearAllMocks();
  });

  it('deve ser definido', () => {
    expect(controller).toBeDefined();
  });

  describe('beneficiosConcedidos', () => {
    it('deve chamar o serviço e retornar o relatório de benefícios', async () => {
      const dto: RelatorioBeneficiosDto = {
        data_inicio: '2025-01-01',
        data_fim: '2025-01-31',
        formato: 'pdf',
        unidade_id: '1',
        tipo_beneficio_id: '2',
      };

      const mockUser = { id: 1, nome: 'Usuário Teste' };
      const mockRequest = createMockRequest(mockUser);

      await controller.beneficiosConcedidos(mockRequest, mockResponse, dto);

      expect(
        relatoriosService.gerarRelatorioBeneficiosConcedidos,
      ).toHaveBeenCalledWith({
        ...dto,
        user: mockUser,
      });

      expect(mockResponse.set).toHaveBeenCalledWith({
        'Content-Type': 'application/pdf',
        'Content-Disposition': expect.stringContaining(
          'relatorio-beneficios.pdf',
        ),
      });

      expect(mockResponse.send).toHaveBeenCalledWith(expect.any(Buffer));
    });

    it('deve lidar com diferentes formatos de relatório', async () => {
      // Teste para formato Excel
      const dtoExcel: RelatorioBeneficiosDto = {
        data_inicio: '2025-01-01',
        data_fim: '2025-01-31',
        formato: 'excel',
      };

      mockRelatoriosService.gerarRelatorioBeneficiosConcedidos.mockResolvedValueOnce(
        {
          buffer: Buffer.from('mock excel content'),
          contentType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          filename: 'relatorio-beneficios.xlsx',
        },
      );

      const mockUser = { id: 1, nome: 'Usuário Teste' };
      const mockRequest = createMockRequest(mockUser);

      await controller.beneficiosConcedidos(
        mockRequest,
        mockResponse,
        dtoExcel,
      );

      expect(mockResponse.set).toHaveBeenCalledWith({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': expect.stringContaining(
          'relatorio-beneficios.xlsx',
        ),
      });
    });
  });

  describe('solicitacoesPorStatus', () => {
    it('deve chamar o serviço e retornar o relatório de solicitações', async () => {
      const dto: RelatorioSolicitacoesDto = {
        data_inicio: '2025-01-01',
        data_fim: '2025-01-31',
        formato: 'pdf',
        unidade_id: '1',
      };

      const mockUser = { id: 1, nome: 'Usuário Teste' };
      const mockRequest = createMockRequest(mockUser);

      await controller.solicitacoesPorStatus(mockRequest, mockResponse, dto);

      expect(
        relatoriosService.gerarRelatorioSolicitacoesPorStatus,
      ).toHaveBeenCalledWith({
        ...dto,
        user: mockUser,
      });

      expect(mockResponse.set).toHaveBeenCalledWith({
        'Content-Type': 'application/pdf',
        'Content-Disposition': expect.stringContaining(
          'relatorio-solicitacoes.pdf',
        ),
      });

      expect(mockResponse.send).toHaveBeenCalledWith(expect.any(Buffer));
    });
  });

  describe('atendimentosPorUnidade', () => {
    it('deve chamar o serviço e retornar o relatório de atendimentos', async () => {
      const dto: RelatorioAtendimentosDto = {
        data_inicio: '2025-01-01',
        data_fim: '2025-01-31',
        formato: 'pdf',
      };

      const mockUser = { id: 1, nome: 'Usuário Teste' };
      const mockRequest = createMockRequest(mockUser);

      await controller.atendimentosPorUnidade(mockRequest, mockResponse, dto);

      expect(
        relatoriosService.gerarRelatorioAtendimentosPorUnidade,
      ).toHaveBeenCalledWith({
        ...dto,
        user: mockUser,
      });

      expect(mockResponse.set).toHaveBeenCalledWith({
        'Content-Type': 'application/pdf',
        'Content-Disposition': expect.stringContaining(
          'relatorio-atendimentos.pdf',
        ),
      });

      expect(mockResponse.send).toHaveBeenCalledWith(expect.any(Buffer));
    });
  });
});
