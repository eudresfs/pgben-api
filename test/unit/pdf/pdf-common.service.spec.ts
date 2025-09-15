import { Test, TestingModule } from '@nestjs/testing';
import { PdfCommonService } from '../../../src/common/pdf/services/pdf-common.service';
import { IPdfDados, IPdfConfiguracao } from '../../../src/common/pdf/interfaces';
import { PdfTipoConteudo } from '../../../src/common/pdf/enums';
import * as fs from 'fs';
import * as path from 'path';

// Mock do pdfmake
const mockPdfPrinter = {
  createPdfKitDocument: jest.fn().mockReturnValue({
    pipe: jest.fn(),
    end: jest.fn(),
    on: jest.fn((event, callback) => {
      if (event === 'end') {
        setTimeout(callback, 10);
      }
    })
  })
};

jest.mock('pdfmake', () => mockPdfPrinter);

describe('PdfCommonService', () => {
  let service: PdfCommonService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PdfCommonService],
    }).compile();

    service = module.get<PdfCommonService>(PdfCommonService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('gerarPdf', () => {
    const dadosValidos: IPdfDados = {
      titulo: 'Documento de Teste',
      conteudo: [
        {
          tipo: PdfTipoConteudo.TEXTO,
          valor: 'Conteúdo do documento de teste',
          estilos: { fontSize: 12 }
        }
      ],
      observacoes: ['Observação 1', 'Observação 2']
    };

    const configuracaoValida: IPdfConfiguracao = {
      orientacao: 'portrait',
      tamanho: 'A4',
      margens: {
        top: 40,
        bottom: 40,
        left: 40,
        right: 40
      },
      fontes: {
        Roboto: {
          normal: 'fonts/Roboto-Regular.ttf',
          bold: 'fonts/Roboto-Medium.ttf',
          italics: 'fonts/Roboto-Italic.ttf',
          bolditalics: 'fonts/Roboto-MediumItalic.ttf'
        }
      }
    };

    it('deve gerar PDF com dados válidos', async () => {
      const resultado = await service.gerarPdf(dadosValidos, configuracaoValida);
      
      expect(resultado).toBeDefined();
      expect(resultado).toBeInstanceOf(Buffer);
      expect(mockPdfPrinter.createPdfKitDocument).toHaveBeenCalled();
    });

    it('deve usar configuração padrão quando não fornecida', async () => {
      const resultado = await service.gerarPdf(dadosValidos);
      
      expect(resultado).toBeDefined();
      expect(resultado).toBeInstanceOf(Buffer);
      expect(mockPdfPrinter.createPdfKitDocument).toHaveBeenCalled();
    });

    it('deve lançar erro com dados inválidos', async () => {
      const dadosInvalidos = {
        titulo: '',
        conteudo: []
      } as IPdfDados;

      await expect(service.gerarPdf(dadosInvalidos, configuracaoValida))
        .rejects
        .toThrow('Dados do PDF são obrigatórios');
    });

    it('deve processar diferentes tipos de conteúdo', async () => {
      const dadosComTipos: IPdfDados = {
        titulo: 'Documento Completo',
        conteudo: [
          {
            tipo: PdfTipoConteudo.TEXTO,
            valor: 'Texto simples',
            estilos: { fontSize: 12 }
          },
          {
            tipo: PdfTipoConteudo.TABELA,
            valor: {
              headers: ['Coluna 1', 'Coluna 2'],
              rows: [['Valor 1', 'Valor 2']]
            },
            estilos: { fontSize: 10 }
          },
          {
            tipo: PdfTipoConteudo.IMAGEM,
            valor: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
            estilos: { width: 100, height: 100 }
          }
        ]
      };

      const resultado = await service.gerarPdf(dadosComTipos, configuracaoValida);
      
      expect(resultado).toBeDefined();
      expect(resultado).toBeInstanceOf(Buffer);
    });
  });

  describe('validarDados', () => {
    it('deve validar dados corretos', () => {
      const dados: IPdfDados = {
        titulo: 'Título válido',
        conteudo: [
          {
            tipo: PdfTipoConteudo.TEXTO,
            valor: 'Conteúdo válido',
            estilos: { fontSize: 12 }
          }
        ]
      };

      expect(() => service.validarDados(dados)).not.toThrow();
    });

    it('deve lançar erro para título vazio', () => {
      const dados: IPdfDados = {