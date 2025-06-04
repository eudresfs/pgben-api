import { Test, TestingModule } from '@nestjs/testing';
import { ExcelStrategy } from '../strategies/excel.strategy';
import { TempFilesService } from '../services/temp-files.service';
import * as fs from 'fs';

/**
 * Testes unitários para a estratégia de relatórios em Excel
 *
 * Este arquivo contém testes que validam a funcionalidade da estratégia
 * responsável por gerar relatórios em formato Excel
 */
describe('ExcelStrategy', () => {
  let strategy: ExcelStrategy;
  let tempFilesService: TempFilesService;

  // Mock para fs e Excel
  const mockWorkbook = {
    addWorksheet: jest.fn().mockImplementation(() => mockWorksheet),
    xlsx: {
      writeFile: jest.fn().mockImplementation((path, callback) => {
        if (callback) {
          callback();
        }
        return Promise.resolve();
      }),
    },
  };

  const mockWorksheet = {
    columns: [],
    addRow: jest.fn(),
    addRows: jest.fn(),
    mergeCells: jest.fn(),
    getCell: jest.fn().mockReturnValue({
      style: {},
      value: null,
      alignment: { vertical: null, horizontal: null },
    }),
    getRow: jest.fn().mockReturnValue({
      font: { bold: false },
      alignment: { vertical: null, horizontal: null },
      eachCell: jest.fn().mockImplementation((options, callback) => {
        callback(
          {
            style: {},
            value: null,
            alignment: { vertical: null, horizontal: null },
          },
          1,
        );
      }),
    }),
    eachRow: jest.fn().mockImplementation((options, callback) => {
      callback(
        {
          eachCell: jest.fn().mockImplementation((options, callback) => {
            callback(
              {
                style: {},
                value: null,
                alignment: { vertical: null, horizontal: null },
              },
              1,
            );
          }),
          number: 1,
        },
        1,
      );
    }),
  };

  // Mock para ExcelJS
  jest.mock('exceljs', () => {
    return {
      Workbook: jest.fn().mockImplementation(() => mockWorkbook),
    };
  });

  jest.mock('fs', () => ({
    readFileSync: jest.fn().mockReturnValue(Buffer.from('mock excel content')),
    promises: {
      unlink: jest.fn(),
    },
  }));

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExcelStrategy,
        {
          provide: TempFilesService,
          useValue: {
            getTempFilePath: jest
              .fn()
              .mockReturnValue('temp/relatorios/test-123.xlsx'),
            cleanupTempFile: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    strategy = module.get<ExcelStrategy>(ExcelStrategy);
    tempFilesService = module.get<TempFilesService>(TempFilesService);

    // Reset mocks antes de cada teste
    jest.clearAllMocks();
  });

  it('deve ser definido', () => {
    expect(strategy).toBeDefined();
  });

  describe('gerar', () => {
    it('deve gerar um relatório Excel e retornar um buffer', async () => {
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
        'xlsx',
      );
      expect(tempFilesService.cleanupTempFile).toHaveBeenCalledWith(
        expect.stringContaining('temp/relatorios/test-123.xlsx'),
      );
      expect(mockWorkbook.addWorksheet).toHaveBeenCalled();
      expect(mockWorkbook.xlsx.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('temp/relatorios/test-123.xlsx'),
        expect.anything(),
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

      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith(
        'Benefícios Concedidos',
      );
      expect(mockWorksheet.addRow).toHaveBeenCalled();
      expect(mockWorksheet.addRows).toHaveBeenCalled();
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

      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith(
        'Solicitações por Status',
      );
      expect(mockWorksheet.addRow).toHaveBeenCalled();
      expect(mockWorksheet.addRows).toHaveBeenCalled();
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

      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith(
        'Atendimentos por Unidade',
      );
      expect(mockWorksheet.addRow).toHaveBeenCalled();
      expect(mockWorksheet.addRows).toHaveBeenCalled();
    });

    it('deve lidar com erros corretamente', async () => {
      const mockError = new Error('Erro ao gerar Excel');
      mockWorkbook.xlsx.writeFile.mockRejectedValueOnce(mockError);

      const tipo = 'beneficios';
      const dados = { titulo: 'Teste', itens: [] };
      const opcoes = {};

      await expect(strategy.gerar(tipo, dados, opcoes)).rejects.toThrow(
        'Erro ao gerar Excel',
      );

      expect(tempFilesService.cleanupTempFile).toHaveBeenCalledWith(
        expect.stringContaining('temp/relatorios/test-123.xlsx'),
      );
    });
  });
});
