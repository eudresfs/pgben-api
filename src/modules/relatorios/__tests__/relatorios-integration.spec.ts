import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RelatoriosUnificadoModule } from '../relatorios-unificado.module';
import { RelatoriosService } from '../services/relatorios.service';
import { RelatoriosController } from '../controllers/relatorios.controller';
import { PdfStrategy } from '../strategies/pdf.strategy';
import { ExcelStrategy } from '../strategies/excel.strategy';
import { CsvStrategy } from '../strategies/csv.strategy';
import { TempFilesService } from '../services/temp-files.service';
import { Solicitacao } from '../../solicitacao/entities/solicitacao.entity';
import { Unidade } from '../../unidade/entities/unidade.entity';
import { TipoBeneficio } from '../../beneficio/entities/tipo-beneficio.entity';
import { RELATORIOS_CONFIG } from '../config';
import { Request, Response } from 'express';

/**
 * Testes de integração para o módulo de relatórios unificado
 *
 * Este arquivo contém testes que validam a integração entre os componentes
 * do módulo de relatórios, garantindo que funcionem corretamente em conjunto
 */
describe('Relatórios - Testes de Integração', () => {
  let module: TestingModule;
  let relatoriosService: RelatoriosService;
  let relatoriosController: RelatoriosController;
  let pdfStrategy: PdfStrategy;
  let excelStrategy: ExcelStrategy;
  let csvStrategy: CsvStrategy;
  let tempFilesService: TempFilesService;

  // Mock para repositórios
  const mockSolicitacaoRepository = {
    createQueryBuilder: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
    getCount: jest.fn().mockResolvedValue(0),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
  };

  const mockUnidadeRepository = {
    findOne: jest.fn().mockResolvedValue(null),
    find: jest.fn().mockResolvedValue([]),
  };

  const mockTipoBeneficioRepository = {
    findOne: jest.fn().mockResolvedValue(null),
  };

  // Mock para cache
  const mockCacheManager = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
  };

  // Função para criar um mock de Request
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

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [RelatoriosUnificadoModule],
    })
      .overrideProvider(getRepositoryToken(Solicitacao))
      .useValue(mockSolicitacaoRepository)
      .overrideProvider(getRepositoryToken(Unidade))
      .useValue(mockUnidadeRepository)
      .overrideProvider(getRepositoryToken(TipoBeneficio))
      .useValue(mockTipoBeneficioRepository)
      .overrideProvider(CACHE_MANAGER)
      .useValue(mockCacheManager)
      .compile();

    relatoriosService = module.get<RelatoriosService>(RelatoriosService);
    relatoriosController =
      module.get<RelatoriosController>(RelatoriosController);
    pdfStrategy = module.get<PdfStrategy>(PdfStrategy);
    excelStrategy = module.get<ExcelStrategy>(ExcelStrategy);
    csvStrategy = module.get<CsvStrategy>(CsvStrategy);
    tempFilesService = module.get<TempFilesService>(TempFilesService);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(() => {
    // Reset mocks antes de cada teste
    jest.clearAllMocks();
  });

  it('deve ter todos os componentes definidos', () => {
    expect(relatoriosService).toBeDefined();
    expect(relatoriosController).toBeDefined();
    expect(pdfStrategy).toBeDefined();
    expect(excelStrategy).toBeDefined();
    expect(csvStrategy).toBeDefined();
    expect(tempFilesService).toBeDefined();
  });

  describe('Fluxo completo de geração de relatórios', () => {
    it('deve processar corretamente um relatório de benefícios', async () => {
      // Mock para dados de benefícios
      mockSolicitacaoRepository.getMany.mockResolvedValueOnce([
        {
          id: 1,
          cidadao: { nome: 'Cidadão 1' },
          tipoBeneficio: { nome: 'Auxílio Moradia' },
          dataConcessao: new Date('2025-01-15'),
          valor: 100,
        },
      ]);

      // Mock para resposta HTTP
      const mockResponse = {
        set: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        setHeader: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      // Parâmetros da requisição
      const dto = {
        data_inicio: '2025-01-01',
        data_fim: '2025-01-31',
        formato: 'pdf' as 'pdf' | 'excel' | 'csv',
        unidade_id: '1',
        tipo_beneficio_id: '2',
      };

      const mockUser = {
        id: 1,
        nome: 'Usuário Teste',
        cargo: 'COORDENADOR',
        permissoes: [
          RELATORIOS_CONFIG.SECURITY.REQUIRED_PERMISSIONS.BENEFICIOS,
        ],
      };

      const mockRequest = createMockRequest(mockUser);

      // Executa o fluxo completo através do controlador
      await relatoriosController.beneficiosConcedidos(
        mockRequest,
        mockResponse,
        dto,
      );

      // Verifica se o serviço foi chamado corretamente
      expect(mockSolicitacaoRepository.leftJoinAndSelect).toHaveBeenCalledWith(
        expect.stringContaining('cidadao'),
        expect.any(String),
      );

      expect(mockSolicitacaoRepository.leftJoinAndSelect).toHaveBeenCalledWith(
        expect.stringContaining('tipoBeneficio'),
        expect.any(String),
      );

      // Verifica se a resposta foi configurada corretamente
      expect(mockResponse.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Type': expect.any(String),
          'Content-Disposition': expect.stringContaining('attachment'),
        }),
      );

      expect(mockResponse.send).toHaveBeenCalled();
    });

    it('deve processar corretamente um relatório de solicitações', async () => {
      // Mock para dados de solicitações por status
      mockSolicitacaoRepository.getRawMany.mockResolvedValueOnce([
        { status: 'PENDENTE', quantidade: 10 },
        { status: 'APROVADO', quantidade: 20 },
        { status: 'REPROVADO', quantidade: 5 },
      ]);

      // Mock para resposta HTTP
      const mockResponse = {
        set: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        setHeader: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      // Parâmetros da requisição
      const dto = {
        data_inicio: '2025-01-01',
        data_fim: '2025-01-31',
        formato: 'excel' as 'pdf' | 'excel' | 'csv',
        unidade_id: '1',
      };

      const mockUser = {
        id: 1,
        nome: 'Usuário Teste',
        cargo: 'COORDENADOR',
        permissoes: [
          RELATORIOS_CONFIG.SECURITY.REQUIRED_PERMISSIONS.SOLICITACOES,
        ],
      };

      const mockRequest = createMockRequest(mockUser);

      // Executa o fluxo completo através do controlador
      await relatoriosController.solicitacoesPorStatus(
        mockRequest,
        mockResponse,
        dto,
      );

      // Verifica se o serviço foi chamado corretamente
      expect(mockSolicitacaoRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockSolicitacaoRepository.select).toHaveBeenCalled();
      expect(mockSolicitacaoRepository.addSelect).toHaveBeenCalled();

      // Verifica se a resposta foi configurada corretamente
      expect(mockResponse.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Type': expect.any(String),
          'Content-Disposition': expect.stringContaining('attachment'),
        }),
      );

      expect(mockResponse.send).toHaveBeenCalled();
    });

    it('deve processar corretamente um relatório de atendimentos', async () => {
      // Mock para unidades
      mockUnidadeRepository.find.mockResolvedValueOnce([
        { id: 1, nome: 'Unidade A' },
        { id: 2, nome: 'Unidade B' },
      ]);

      // Mock para dados de atendimentos por unidade
      mockSolicitacaoRepository.getRawMany.mockResolvedValueOnce([
        { unidadeId: 1, total: 15, liberadas: 10, pendentes: 5 },
        { unidadeId: 2, total: 20, liberadas: 15, pendentes: 5 },
      ]);

      // Mock para resposta HTTP
      const mockResponse = {
        set: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        setHeader: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      // Parâmetros da requisição
      const dto = {
        data_inicio: '2025-01-01',
        data_fim: '2025-01-31',
        formato: 'csv' as 'pdf' | 'excel' | 'csv',
      };

      const mockUser = {
        id: 1,
        nome: 'Usuário Teste',
        cargo: 'COORDENADOR',
        permissoes: [
          RELATORIOS_CONFIG.SECURITY.REQUIRED_PERMISSIONS.ATENDIMENTOS,
        ],
      };

      const mockRequest = createMockRequest(mockUser);

      // Executa o fluxo completo através do controlador
      await relatoriosController.atendimentosPorUnidade(
        mockRequest,
        mockResponse,
        dto,
      );

      // Verifica se o serviço foi chamado corretamente
      expect(mockUnidadeRepository.find).toHaveBeenCalled();
      expect(mockSolicitacaoRepository.createQueryBuilder).toHaveBeenCalled();

      // Verifica se a resposta foi configurada corretamente
      expect(mockResponse.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Type': expect.any(String),
          'Content-Disposition': expect.stringContaining('attachment'),
        }),
      );

      expect(mockResponse.send).toHaveBeenCalled();
    });
  });

  describe('Integração com cache', () => {
    it('deve usar o cache quando disponível', async () => {
      // Mock para dados em cache
      const mockCacheData = {
        buffer: Buffer.from('cached content'),
        contentType: 'application/pdf',
        filename: 'relatorio-beneficios.pdf',
      };

      mockCacheManager.get.mockResolvedValueOnce(mockCacheData);

      // Parâmetros da requisição
      const options = {
        dataInicio: '2025-01-01',
        dataFim: '2025-01-31',
        formato: 'pdf' as const,
        user: {
          id: 1,
          nome: 'Usuário Teste',
          cargo: 'COORDENADOR',
          permissoes: [
            RELATORIOS_CONFIG.SECURITY.REQUIRED_PERMISSIONS.BENEFICIOS,
          ],
        },
      };

      // Executa o serviço diretamente
      const result =
        await relatoriosService.gerarRelatorioBeneficiosConcedidos(options);

      // Verifica se o cache foi consultado
      expect(mockCacheManager.get).toHaveBeenCalled();

      // Verifica se o resultado veio do cache
      expect(result).toEqual(mockCacheData);

      // Verifica que não houve consulta ao banco de dados
      expect(mockSolicitacaoRepository.getMany).not.toHaveBeenCalled();
    });
  });
});
