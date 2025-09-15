import { Test, TestingModule } from '@nestjs/testing';
import { CsvStrategy } from '../strategies/csv.strategy';
import { TempFilesService } from '../services/temp-files.service';
import * as fs from 'fs';

/**
 * Testes unitários para a estratégia de relatórios em CSV
 *
 * Este arquivo contém testes que validam a funcionalidade da estratégia
 * responsável por gerar relatórios em formato CSV
 */
describe('CsvStrategy', () => {
  let strategy: CsvStrategy;
  let tempFilesService: TempFilesService;

  // Mock para fs e csv-writer
  const mockCreateObjectCsvWriter = jest.fn().mockReturnValue({
    writeRecords: jest.fn().mockResolvedValue(undefined),
  });

  jest.mock('csv-writer', () => ({
    createObjectCsvWriter: mockCreateObjectCsvWriter,
  }));

  jest.mock('fs', () => ({
    readFileSync: jest.fn().mockReturnValue(Buffer.from('mock csv content')),
    promises: {
      unlink: jest.fn(),
    },
  }));

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CsvStrategy,
        {
          provide: TempFilesService,
          useValue: {
            getTempFilePath: jest
              .fn()
              .mockReturnValue('temp/relatorios/test-123.csv'),
            cleanupTempFile: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    strategy = module.get<CsvStrategy>(CsvStrategy);
    tempFilesService = module.get<TempFilesService>(TempFilesService);

    // Reset mocks antes de cada teste
    jest.clearAllMocks();
  });

  it('deve ser definido', () => {
    expect(strategy).toBeDefined();
  });

  describe('gerar', () => {
    it('deve gerar um relatório CSV e retornar um buffer', async () => {
      const tipo = 'beneficios';
      const dados = {
        titulo: 'Relatório de Benefícios',
        cabecalho: { data: '01/01/2025' },
        itens: [{ id: 1, nome: 'Benefício Teste', valor: 100 }],
      };
      const opcoes = {};

      const result = await strategy.gerar(tipo, dados, opcoes);

      expect(result).toBeInstanceOf(Buffer);
      expect(tempFilesService.getTempFilePath).toHaveBeenCalledWith(
        expect.stringContaining('relatorio'),
        'csv',
      );
      expect(tempFilesService.cleanupTempFile).toHaveBeenCalledWith(
        expect.stringContaining('temp/relatorios/test-123.csv'),
      );
      expect(mockCreateObjectCsvWriter).toHaveBeenCalled();
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

      expect(mockCreateObjectCsvWriter).toHaveBeenCalledWith({
        path: expect.stringContaining('temp/relatorios/test-123.csv'),
        header: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            title: expect.any(String),
          }),
        ]),
      });
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

      expect(mockCreateObjectCsvWriter).toHaveBeenCalledWith({
        path: expect.stringContaining('temp/relatorios/test-123.csv'),
        header: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            title: expect.any(String),
          }),
        ]),
      });
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

      expect(mockCreateObjectCsvWriter).toHaveBeenCalledWith({
        path: expect.stringContaining('temp/relatorios/test-123.csv'),
        header: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            title: expect.any(String),
          }),
        ]),
      });
    });

    it('deve lidar com erros corretamente', async () => {
      const mockError = new Error('Erro ao gerar CSV');
      mockCreateObjectCsvWriter.mockReturnValueOnce({
        writeRecords: jest.fn().mockRejectedValueOnce(mockError),
      });

      const tipo = 'beneficios';
      const dados = { titulo: 'Teste', itens: [] };
      const opcoes = {};

      await expect(strategy.gerar(tipo, dados, opcoes)).rejects.toThrow(
        'Erro ao gerar CSV',
      );

      expect(tempFilesService.cleanupTempFile).toHaveBeenCalledWith(
        expect.stringContaining('temp/relatorios/test-123.csv'),
      );
    });
  });
});
