import { Test, TestingModule } from '@nestjs/testing';
import { PdfUtilsService, IValidationResult } from '../services/pdf-utils.service';
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

describe('PdfUtilsService', () => {
  let service: PdfUtilsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PdfUtilsService],
    }).compile();

    service = module.get<PdfUtilsService>(PdfUtilsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validarDadosPdf', () => {
    it('should return invalid for null data', async () => {
      const result = await service.validarDadosPdf(null as any);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Dados fornecidos são inválidos para geração do PDF');
    });

    it('should return invalid for empty content', async () => {
      const dados: IPdfDados = {
        titulo: 'Test Document',
        conteudo: [],
        assinaturas: [],
        metadados: {
          titulo: 'Test',
          autor: 'Test Author'
        }
      };

      const result = await service.validarDadosPdf(dados);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Conteúdo é obrigatório');
    });

    it('should return valid for correct data', async () => {
      const dados: IPdfDados = {
        titulo: 'Documento Teste',
        conteudo: [
          {
            tipo: PdfTipoConteudo.TEXTO,
            dados: 'Texto de exemplo',
            estilo: 'texto-padrao'
          }
        ],
        assinaturas: [
          {
            tipo: 'tecnico',
            nome: 'João Silva',
            cargo: 'Técnico'
          }
        ],
        metadados: {
          titulo: 'Documento Teste',
          autor: 'Sistema'
        }
      };

      const result = await service.validarDadosPdf(dados);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validarConfiguracao', () => {
    it('should return valid for correct configuration', async () => {
      const config: IPdfConfiguracao = {
        orientacao: PdfOrientacao.RETRATO,
        tamanho: PdfTamanhoPapel.A4,
        margens: [20, 15, 20, 15], // [top, right, bottom, left]
        incluirCabecalho: true,
        incluirRodape: true
      };

      const result = await service.validarConfiguracao(config);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid for wrong orientation', async () => {
      const config: IPdfConfiguracao = {
        orientacao: 'INVALID' as any,
        tamanho: PdfTamanhoPapel.A4,
        margens: [20, 15, 20, 15], // [top, right, bottom, left]
        incluirCabecalho: true,
        incluirRodape: true
      };

      const result = await service.validarConfiguracao(config);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return invalid for negative margins', async () => {
      const config: IPdfConfiguracao = {
        orientacao: PdfOrientacao.RETRATO,
        tamanho: PdfTamanhoPapel.A4,
        margens: [-10, 15, 20, 15], // [top, right, bottom, left] - top margin negative
        incluirCabecalho: true,
        incluirRodape: true
      };

      const result = await service.validarConfiguracao(config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Margens inválidas. Deve ser um array com 4 números positivos [esquerda, superior, direita, inferior]');
    });
  });

  describe('sanitizarTexto', () => {
    it('should remove HTML tags by default', () => {
      const texto = '<p>Texto com <strong>HTML</strong></p>';
      const resultado = service.sanitizarTexto(texto);
      expect(resultado).toBe('Texto com HTML');
    });

    it('should preserve HTML when allowed', () => {
      const texto = '<p>Texto com <strong>HTML</strong></p>';
      const resultado = service.sanitizarTexto(texto, { allowHtml: true });
      expect(resultado).toBe('<p>Texto com <strong>HTML</strong></p>');
    });

    it('should limit text length', () => {
      const texto = 'Este é um texto muito longo que deve ser truncado';
      const resultado = service.sanitizarTexto(texto, { maxLength: 10 });
      expect(resultado).toBe('Este é um ...');
    });

    it('should remove special characters when removeSpecialChars is true', () => {
      const texto = 'Texto com @#$%^&*() caracteres especiais!';
      const resultado = service.sanitizarTexto(texto, { removeSpecialChars: true });
      expect(resultado).toBe('Texto com () caracteres especiais!');
    });
  });

  describe('formatarMoeda', () => {
    it('should format currency in BRL by default', () => {
      const valor = 1234.56;
      const resultado = service.formatarMoeda(valor);
      expect(resultado).toMatch(/R\$\s*1\.234,56/);
    });

    it('should format currency in USD when specified', () => {
      const valor = 1234.56;
      const resultado = service.formatarMoeda(valor, { 
        locale: 'en-US', 
        currency: 'USD' 
      });
      expect(resultado).toMatch(/\$1,234\.56/);
    });
  });

  describe('formatarData', () => {
    it('should format date in Brazilian format', () => {
      const data = new Date('2024-01-15T12:00:00.000Z');
      const resultado = service.formatarData(data);
      expect(resultado).toBe('15/01/2024');
    });

    it('should handle string dates', () => {
      const data = '2024-01-15T12:00:00.000Z';
      const resultado = service.formatarData(data);
      expect(resultado).toBe('15/01/2024');
    });

    it('should return empty string for invalid dates', () => {
      const data = 'invalid-date';
      const resultado = service.formatarData(data);
      expect(resultado).toBe('');
    });
  });

  describe('gerarSlug', () => {
    it('should convert text to slug', () => {
      const texto = 'Relatório de Atividades 2024';
      const resultado = service.gerarSlug(texto);
      expect(resultado).toBe('relatorio-de-atividades-2024');
    });

    it('should remove accents', () => {
      const texto = 'Relatório com acentuação';
      const resultado = service.gerarSlug(texto);
      expect(resultado).toBe('relatorio-com-acentuacao');
    });

    it('should remove special characters', () => {
      const texto = 'Texto com @#$% caracteres!';
      const resultado = service.gerarSlug(texto);
      expect(resultado).toBe('texto-com-caracteres');
    });
  });

  describe('gerarNomeArquivo', () => {
    it('should generate unique filename with default values', () => {
      const nome = service.gerarNomeArquivo();
      expect(nome).toMatch(/^documento-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[a-z0-9]{6}\.pdf$/);
    });

    it('should generate filename with custom prefix and extension', () => {
      const nome = service.gerarNomeArquivo('relatorio', 'txt');
      expect(nome).toMatch(/^relatorio-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[a-z0-9]{6}\.txt$/);
    });
  });

  describe('calcularDimensoesPagina', () => {
    it('should return A4 portrait dimensions', () => {
      const dimensoes = service.calcularDimensoesPagina(
        PdfTamanhoPapel.A4, 
        PdfOrientacao.RETRATO
      );
      expect(dimensoes.width).toBe(595.28);
      expect(dimensoes.height).toBe(841.89);
    });

    it('should return A4 landscape dimensions', () => {
      const dimensoes = service.calcularDimensoesPagina(
        PdfTamanhoPapel.A4, 
        PdfOrientacao.PAISAGEM
      );
      expect(dimensoes.width).toBe(841.89);
      expect(dimensoes.height).toBe(595.28);
    });
  });

  describe('hexParaRgb', () => {
    it('should convert hex to RGB', () => {
      const rgb = service.hexParaRgb('#FF0000');
      expect(rgb).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('should handle hex without #', () => {
      const rgb = service.hexParaRgb('00FF00');
      expect(rgb).toEqual({ r: 0, g: 255, b: 0 });
    });

    it('should return null for invalid hex', () => {
      const rgb = service.hexParaRgb('invalid');
      expect(rgb).toBeNull();
    });
  });
});