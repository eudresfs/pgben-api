import { Test, TestingModule } from '@nestjs/testing';
import { PdfCommonService } from '../services/pdf-common.service';
import {
  IPdfDados,
  IPdfConteudo,
  IPdfAssinatura,
  IPdfMetadados,
  IPdfConfiguracao
} from '../interfaces';
import {
  PdfTipoConteudo,
  PdfTipoAssinatura,
  PdfOrientacao,
  PdfTamanhoPapel
} from '../enums';

describe('PdfCommonService', () => {
  let service: PdfCommonService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PdfCommonService],
    }).compile();

    service = module.get<PdfCommonService>(PdfCommonService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('gerarPdf', () => {
    it('should generate PDF with valid data', async () => {
      const dados: IPdfDados = {
        titulo: 'Documento de Teste',
        conteudo: [
          {
            tipo: PdfTipoConteudo.TEXTO,
            dados: 'Este é um texto de teste',
            estilo: 'texto'
          }
        ],
        metadados: {
          autor: 'Teste',
          assunto: 'Teste de PDF',
          palavrasChave: ['teste', 'pdf'],
          criador: 'Sistema de Teste'
        }
      };

      const configuracao: IPdfConfiguracao = {
        tamanho: PdfTamanhoPapel.A4,
        orientacao: PdfOrientacao.RETRATO,
        margens: [40, 60, 40, 60],
        incluirCabecalho: false,
        incluirRodape: false
      };

      const resultado = await service.gerarPdf(dados, configuracao);
      
      expect(Buffer.isBuffer(resultado)).toBe(true);
      expect(resultado.length).toBeGreaterThan(0);
    });

    it('should throw error for invalid data', async () => {
      const dados = null as any;
      const configuracao: IPdfConfiguracao = {
        orientacao: PdfOrientacao.RETRATO,
        tamanho: PdfTamanhoPapel.A4,
        margens: [20, 15, 20, 15],
        incluirCabecalho: true,
        incluirRodape: true
      };

      await expect(service.gerarPdf(dados, configuracao))
        .rejects
        .toThrow();
    });
  });

  describe('validarDados', () => {
    it('should validate data correctly', () => {
      const dados: IPdfDados = {
        titulo: 'Documento Teste',
        conteudo: [
          {
            tipo: PdfTipoConteudo.TEXTO,
            dados: 'Conteúdo de teste',
            estilo: 'texto-padrao'
          }
        ],
        metadados: {
          titulo: 'Documento de Teste',
          autor: 'Sistema'
        }
      };

      // Teste que não deve lançar erro
      expect(() => (service as any).validarDados(dados)).not.toThrow();
    });

    it('should throw error for invalid data without title', () => {
      const dados = {
        conteudo: [
          {
            tipo: PdfTipoConteudo.TEXTO,
            dados: 'Conteúdo de teste',
            estilo: 'texto-padrao'
          }
        ]
      } as IPdfDados;

      expect(() => (service as any).validarDados(dados)).toThrow();
    });

    it('should throw error for data without content', () => {
      const dados = {
        titulo: 'Documento Teste',
        conteudo: []
      } as IPdfDados;

      expect(() => (service as any).validarDados(dados)).toThrow();
    });
  });
});