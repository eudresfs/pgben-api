import { Test, TestingModule } from '@nestjs/testing';
import { PdfUtilsService } from '../../../src/common/pdf/services/pdf-utils.service';
import { IPdfDados, IPdfConfiguracao } from '../../../src/common/pdf/interfaces';
import { PdfTipoConteudo } from '../../../src/common/pdf/enums';

describe('PdfUtilsService', () => {
  let service: PdfUtilsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PdfUtilsService],
    }).compile();

    service = module.get<PdfUtilsService>(PdfUtilsService);
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
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

      const resultado = service.validarDados(dados);
      expect(resultado.valido).toBe(true);
      expect(resultado.erros).toHaveLength(0);
    });

    it('deve detectar título vazio', () => {
      const dados: IPdfDados = {
        titulo: '',
        conteudo: [
          {
            tipo: PdfTipoConteudo.TEXTO,
            valor: 'Conteúdo',
            estilos: { fontSize: 12 }
          }
        ]
      };

      const resultado = service.validarDados(dados);
      expect(resultado.valido).toBe(false);
      expect(resultado.erros).toContain('Título é obrigatório');
    });

    it('deve detectar conteúdo vazio', () => {
      const dados: IPdfDados = {
        titulo: 'Título',
        conteudo: []
      };

      const resultado = service.validarDados(dados);
      expect(resultado.valido).toBe(false);
      expect(resultado.erros).toContain('Conteúdo é obrigatório');
    });

    it('deve detectar múltiplos erros', () => {
      const dados: IPdfDados = {
        titulo: '',
        conteudo: []
      };

      const resultado = service.validarDados(dados);
      expect(resultado.valido).toBe(false);
      expect(resultado.erros).toHaveLength(2);
      expect(resultado.erros).toContain('Título é obrigatório');
      expect(resultado.erros).toContain('Conteúdo é obrigatório');
    });
  });

  describe('validarConfiguracao', () => {
    it('deve validar configuração correta', () => {
      const configuracao: IPdfConfiguracao = {
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

      const resultado = service.validarConfiguracao(configuracao);
      expect(resultado.valido).toBe(true);
      expect(resultado.erros).toHaveLength(0);
    });

    it('deve detectar orientação inválida', () => {
      const configuracao: IPdfConfiguracao = {
        orientacao: 'invalid' as any,
        tamanho: 'A4',
        margens: {
          top: 40,
          bottom: 40,
          left: 40,
          right: 40
        },
        fontes: {}
      };

      const resultado = service.validarConfiguracao(configuracao);
      expect(resultado.valido).toBe(false);
      expect(resultado.erros).toContain('Orientação deve ser portrait ou landscape');
    });

    it('deve detectar tamanho inválido', () => {
      const configuracao: IPdfConfiguracao = {
        orientacao: 'portrait',
        tamanho: 'INVALID' as any,
        margens: {
          top: 40,
          bottom: 40,
          left: 40,
          right: 40
        },
        fontes: {}
      };

      const resultado = service.validarConfiguracao(configuracao);
      expect(resultado.valido).toBe(false);
      expect(resultado.erros).toContain('Tamanho deve ser A4, A3 ou LETTER');
    });

    it('deve detectar margens inválidas', () => {
      const configuracao: IPdfConfiguracao = {
        orientacao: 'portrait',
        tamanho: 'A4',
        margens: {
          top: -10,
          bottom: 40,
          left: 40,
          right: 40
        },
        fontes: {}
      };

      const resultado = service.validarConfiguracao(configuracao);
      expect(resultado.valido).toBe(false);
      expect(resultado.erros).toContain('Margens devem ser valores positivos');
    });
  });

  describe('formatarTexto', () => {
    it('deve formatar texto simples', () => {
      const texto = 'Texto simples';
      const resultado = service.formatarTexto(texto);
      
      expect(resultado).toBe('Texto simples');
    });

    it('deve remover caracteres especiais', () => {
      const texto = 'Texto com\nquebra\tde\rlinha';
      const resultado = service.formatarTexto(texto);
      
      expect(resultado).toBe('Texto com quebra de linha');
    });

    it('deve limitar o tamanho do texto', () => {
      const texto = 'A'.repeat(1000);
      const resultado = service.formatarTexto(texto, 100);
      
      expect(resultado).toHaveLength(103); // 100 + '...'
      expect(resultado.endsWith('...')).toBe(true);
    });
  });

  describe('converterImagemParaBase64', () => {
    it('deve converter buffer para base64', () => {
      const buffer = Buffer.from('teste');
      const resultado = service.converterImagemParaBase64(buffer, 'image/png');
      
      expect(resultado).toMatch(/^data:image\/png;base64,/);
    });

    it('deve usar tipo padrão quando não especificado', () => {
      const buffer = Buffer.from('teste');
      const resultado = service.converterImagemParaBase64(buffer);
      
      expect(resultado).toMatch(/^data:image\/jpeg;base64,/);
    });
  });

  describe('calcularDimensoesPagina', () => {
    it('deve calcular dimensões para A4 portrait', () => {
      const resultado = service.calcularDimensoesPagina('A4', 'portrait');
      
      expect(resultado.largura).toBe(595.28);
      expect(resultado.altura).toBe(841.89);
    });

    it('deve calcular dimensões para A4 landscape', () => {
      const resultado = service.calcularDimensoesPagina('A4', 'landscape');
      
      expect(resultado.largura).toBe(841.89);
      expect(resultado.altura).toBe(595.28);
    });

    it('deve calcular dimensões para A3 portrait', () => {
      const resultado = service.calcularDimensoesPagina('A3', 'portrait');
      
      expect(resultado.largura).toBe(841.89);
      expect(resultado.altura).toBe(1190.55);
    });

    it('deve calcular dimensões para LETTER portrait', () => {
      const resultado = service.calcularDimensoesPagina('LETTER', 'portrait');
      
      expect(resultado.largura).toBe(612);
      expect(resultado.altura).toBe(792);
    });
  });

  describe('gerarMetadados', () => {
    it('deve gerar metadados básicos', () => {
      const titulo = 'Documento Teste';
      const resultado = service.gerarMetadados(titulo);
      
      expect(resultado.title).toBe(titulo);
      expect(resultado.author).toBe('Sistema PGBEN');
      expect(resultado.creator).toBe('PGBEN PDF Module');
      expect(resultado.producer).toBe('PGBEN PDF Module');
      expect(resultado.creationDate).toBeInstanceOf(Date);
    });

    it('deve aceitar autor customizado', () => {
      const titulo = 'Documento Teste';
      const autor = 'João Silva';
      const resultado = service.gerarMetadados(titulo, autor);
      
      expect(resultado.title).toBe(titulo);
      expect(resultado.author).toBe(autor);
    });
  });
})