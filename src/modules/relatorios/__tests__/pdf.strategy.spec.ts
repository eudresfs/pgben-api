import { Test, TestingModule } from '@nestjs/testing';
import { PdfStrategy } from '../strategies/pdf.strategy';
import { TempFilesService } from '../services/temp-files.service';
import * as fs from 'fs';

/**
 * Testes unitários para a estratégia de relatórios em PDF
 *
 * Este arquivo contém testes que validam a funcionalidade da estratégia
 * responsável por gerar relatórios em formato PDF
 */
describe('PdfStrategy', () => {
  let strategy: PdfStrategy;
  let tempFilesService: TempFilesService;

  // Mock para fs e PDFDocument
  const mockCreateWriteStream = jest.fn();
  const mockPipeToResponse = jest.fn();
  const mockPdfDocument = {
    pipe: jest.fn().mockReturnThis(),
    fontSize: jest.fn().mockReturnThis(),
    font: jest.fn().mockReturnThis(),
    text: jest.fn().mockReturnThis(),
    moveDown: jest.fn().mockReturnThis(),
    table: jest.fn().mockReturnThis(),
    addPage: jest.fn().mockReturnThis(),
    end: jest.fn(),
    on: jest.fn((event, callback) => {
      if (event === 'end') {
        callback();
      }
      return mockPdfDocument;
    }),
  };

  jest.mock('pdfkit', () => {
    return jest.fn().mockImplementation(() => mockPdfDocument);
  });

  jest.mock('fs', () => ({
    createWriteStream: mockCreateWriteStream,
    readFileSync: jest.fn().mockReturnValue(Buffer.from('mock pdf content')),
    promises: {
      unlink: jest.fn(),
    },
  }));

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PdfStrategy,
        {
          provide: TempFilesService,
          useValue: {
            getTempFilePath: jest
              .fn()
              .mockReturnValue('temp/relatorios/test-123.pdf'),
            cleanupTempFile: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    strategy = module.get<PdfStrategy>(PdfStrategy);
    tempFilesService = module.get<TempFilesService>(TempFilesService);

    // Reset mocks antes de cada teste
    jest.clearAllMocks();
    mockCreateWriteStream.mockReturnValue({
      on: jest.fn((event, callback) => {
        if (event === 'finish') {
          callback();
        }
      }),
    });
  });

  it('deve ser definido', () => {
    expect(strategy).toBeDefined();
  });

  describe('gerar', () => {
    it('deve gerar um relatório PDF e retornar um buffer', async () => {
      const tipo = 'beneficios';
      const dados = {
        titulo: 'Relatório de Benefícios',
        cabecalho: { data: '01/01/2025' },
        itens: [{ id: 1, nome: 'Benefício Teste', valor: 100 }],
      };
      const opcoes = { orientacao: 'retrato', tamanho: 'A4' };

      const result = await strategy.gerar(tipo, dados, opcoes);

      expect(result).toBeInstanceOf(Buffer);
      expect(tempFilesService.getTempFilePath).toHaveBeenCalledWith(
        expect.stringContaining('relatorio'),
        'pdf',
      );
      expect(tempFilesService.cleanupTempFile).toHaveBeenCalledWith(
        expect.stringContaining('temp/relatorios/test-123.pdf'),
      );
    });

    it('deve gerar relatório de benefícios corretamente', async () => {
      const tipo = 'beneficios';
      const dados = {
        titulo: 'Relatório de Benefícios Concedidos',
        periodo: '01/01/2025 a 31/01/2025',
        unidade: 'Unidade Teste',
        tipoBeneficio: 'Auxílio Moradia',
        itens: [
          { id: 1, nome: 'Benefício 1', data: '01/01/2025', valor: 100 },
          { id: 2, nome: 'Benefício 2', data: '15/01/2025', valor: 200 },
        ],
        total: 300,
      };
      const opcoes = {};

      await strategy.gerar(tipo, dados, opcoes);

      // Verificar se os métodos do PDFKit foram chamados corretamente
      expect(mockPdfDocument.fontSize).toHaveBeenCalled();
      expect(mockPdfDocument.text).toHaveBeenCalledWith(
        expect.stringContaining('Relatório de Benefícios'),
        expect.anything(),
        expect.anything(),
      );
      expect(mockPdfDocument.end).toHaveBeenCalled();
    });

    it('deve gerar relatório de solicitações corretamente', async () => {
      const tipo = 'solicitacoes';
      const dados = {
        titulo: 'Relatório de Solicitações por Status',
        periodo: '01/01/2025 a 31/01/2025',
        unidade: 'Unidade Teste',
        itens: [
          { status: 'Pendente', quantidade: 10 },
          { status: 'Aprovado', quantidade: 20 },
          { status: 'Reprovado', quantidade: 5 },
        ],
        total: 35,
      };
      const opcoes = {};

      await strategy.gerar(tipo, dados, opcoes);

      // Verificar se os métodos do PDFKit foram chamados corretamente
      expect(mockPdfDocument.fontSize).toHaveBeenCalled();
      expect(mockPdfDocument.text).toHaveBeenCalledWith(
        expect.stringContaining('Relatório de Solicitações'),
        expect.anything(),
        expect.anything(),
      );
      expect(mockPdfDocument.end).toHaveBeenCalled();
    });

    it('deve gerar relatório de atendimentos corretamente', async () => {
      const tipo = 'atendimentos';
      const dados = {
        titulo: 'Relatório de Atendimentos por Unidade',
        periodo: '01/01/2025 a 31/01/2025',
        itens: [
          {
            unidade: 'Unidade A',
            totalSolicitacoes: 15,
            solicitacoesLiberadas: 10,
            solicitacoesPendentes: 5,
          },
          {
            unidade: 'Unidade B',
            totalSolicitacoes: 20,
            solicitacoesLiberadas: 15,
            solicitacoesPendentes: 5,
          },
        ],
        totais: {
          totalSolicitacoes: 35,
          solicitacoesLiberadas: 25,
          solicitacoesPendentes: 10,
        },
      };
      const opcoes = {};

      await strategy.gerar(tipo, dados, opcoes);

      // Verificar se os métodos do PDFKit foram chamados corretamente
      expect(mockPdfDocument.fontSize).toHaveBeenCalled();
      expect(mockPdfDocument.text).toHaveBeenCalledWith(
        expect.stringContaining('Relatório de Atendimentos'),
        expect.anything(),
        expect.anything(),
      );
      expect(mockPdfDocument.end).toHaveBeenCalled();
    });

    it('deve lidar com erros corretamente', async () => {
      const mockError = new Error('Erro ao gerar PDF');
      mockPdfDocument.on.mockImplementationOnce((event, callback) => {
        if (event === 'error') {
          callback(mockError);
        }
        return mockPdfDocument;
      });

      const tipo = 'beneficios';
      const dados = { titulo: 'Teste', itens: [] };
      const opcoes = {};

      await expect(strategy.gerar(tipo, dados, opcoes)).rejects.toThrow(
        'Erro ao gerar PDF',
      );

      expect(tempFilesService.cleanupTempFile).toHaveBeenCalledWith(
        expect.stringContaining('temp/relatorios/test-123.pdf'),
      );
    });
  });
});
