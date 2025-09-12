import { Test, TestingModule } from '@nestjs/testing';
import { PdfConfigService } from '../../../src/common/pdf/services/pdf-config.service';
import { IPdfConfiguracao } from '../../../src/common/pdf/interfaces';
import { PdfOrientacao, PdfTamanhoPapel } from '../../../src/common/pdf/enums';

describe('PdfConfigService', () => {
  let service: PdfConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PdfConfigService],
    }).compile();

    service = module.get<PdfConfigService>(PdfConfigService);
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('obterConfiguracaoPadrao', () => {
    it('deve retornar configuração padrão válida', () => {
      const config = service.obterConfiguracaoPadrao();
      
      expect(config).toBeDefined();
      expect(config.orientacao).toBe('portrait');
      expect(config.tamanho).toBe('A4');
      expect(config.margens).toBeDefined();
      expect(config.margens.top).toBe(40);
      expect(config.margens.bottom).toBe(40);
      expect(config.margens.left).toBe(40);
      expect(config.margens.right).toBe(40);
      expect(config.fontes).toBeDefined();
    });

    it('deve retornar nova instância a cada chamada', () => {
      const config1 = service.obterConfiguracaoPadrao();
      const config2 = service.obterConfiguracaoPadrao();
      
      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });
  });

  describe('criarConfiguracao', () => {
    it('deve criar configuração com valores customizados', () => {
      const opcoes = {
        orientacao: PdfOrientacao.PAISAGEM,
        tamanho: PdfTamanhoPapel.A3,
        margens: {
          top: 50,
          bottom: 50,
          left: 60,
          right: 60
        }
      };

      const config = service.criarConfiguracao(opcoes);
      
      expect(config.orientacao).toBe('landscape');
      expect(config.tamanho).toBe('A3');
      expect(config.margens.top).toBe(50);
      expect(config.margens.bottom).toBe(50);
      expect(config.margens.left).toBe(60);
      expect(config.margens.right).toBe(60);
    });

    it('deve usar valores padrão para propriedades não especificadas', () => {
      const opcoes = {
        orientacao: PdfOrientacao.PAISAGEM
      };

      const config = service.criarConfiguracao(opcoes);
      
      expect(config.orientacao).toBe('landscape');
      expect(config.tamanho).toBe('A4'); // valor padrão
      expect(config.margens.top).toBe(40); // valor padrão
    });

    it('deve criar configuração vazia quando nenhuma opção é fornecida', () => {
      const config = service.criarConfiguracao({});
      
      expect(config.orientacao).toBe('portrait');
      expect(config.tamanho).toBe('A4');
      expect(config.margens.top).toBe(40);
    });
  });

  describe('validarConfiguracao', () => {
    it('deve validar configuração correta', () => {
      const config: IPdfConfiguracao = {
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

      const resultado = service.validarConfiguracao(config);
      expect(resultado.valido).toBe(true);
      expect(resultado.erros).toHaveLength(0);
    });

    it('deve detectar orientação inválida', () => {
      const config: IPdfConfiguracao = {
        orientacao: 'invalid' as any,
        tamanho: 'A4',
        margens: { top: 40, bottom: 40, left: 40, right: 40 },
        fontes: {}
      };

      const resultado = service.validarConfiguracao(config);
      expect(resultado.valido).toBe(false);
      expect(resultado.erros).toContain('Orientação deve ser portrait ou landscape');
    });

    it('deve detectar tamanho inválido', () => {
      const config: IPdfConfiguracao = {
        orientacao: 'portrait',
        tamanho: 'INVALID' as any,
        margens: { top: 40, bottom: 40, left: 40, right: 40 },
        fontes: {}
      };

      const resultado = service.validarConfiguracao(config);
      expect(resultado.valido).toBe(false);
      expect(resultado.erros).toContain('Tamanho deve ser A4, A3 ou LETTER');
    });

    it('deve detectar margens negativas', () => {
      const config: IPdfConfiguracao = {
        orientacao: 'portrait',
        tamanho: 'A4',
        margens: { top: -10, bottom: 40, left: 40, right: 40 },
        fontes: {}
      };

      const resultado = service.validarConfiguracao(config);
      expect(resultado.valido).toBe(false);
      expect(resultado.erros).toContain('Margens devem ser valores positivos');
    });

    it('deve detectar múltiplos erros', () => {
      const config: IPdfConfiguracao = {
        orientacao: 'invalid' as any,
        tamanho: 'INVALID' as any,
        margens: { top: -10, bottom: -20, left: 40, right: 40 },
        fontes: {}
      };

      const resultado = service.validarConfiguracao(config);
      expect(resultado.valido).toBe(false);
      expect(resultado.erros.length).toBeGreaterThan(1);
    });
  });

  describe('mesclarConfiguracoes', () => {
    it('deve mesclar configurações corretamente', () => {
      const configBase: IPdfConfiguracao = {
        orientacao: 'portrait',
        tamanho: 'A4',
        margens: { top: 40, bottom: 40, left: 40, right: 40 },
        fontes: {
          Roboto: {
            normal: 'fonts/Roboto-Regular.ttf',
            bold: 'fonts/Roboto-Medium.ttf',
            italics: 'fonts/Roboto-Italic.ttf',
            bolditalics: 'fonts/Roboto-MediumItalic.ttf'
          }
        }
      };

      const configCustomizada: Partial<IPdfConfiguracao> = {
        orientacao: 'landscape',
        margens: { top: 50, bottom: 50, left: 60, right: 60 }
      };

      const resultado = service.mesclarConfiguracoes(configBase, configCustomizada);
      
      expect(resultado.orientacao).toBe('landscape');
      expect(resultado.tamanho).toBe('A4'); // mantém valor da base
      expect(resultado.margens.top).toBe(50);
      expect(resultado.margens.left).toBe(60);
      expect(resultado.fontes).toEqual(configBase.fontes);
    });

    it('deve preservar configuração base quando customizada é vazia', () => {
      const configBase: IPdfConfiguracao = {
        orientacao: 'portrait',
        tamanho: 'A4',
        margens: { top: 40, bottom: 40, left: 40, right: 40 },
        fontes: {}
      };

      const resultado = service.mesclarConfiguracoes(configBase, {});
      
      expect(resultado).toEqual(configBase);
      expect(resultado).not.toBe(configBase); // deve ser nova instância
    });

    it('deve mesclar margens parcialmente', () => {
      const configBase: IPdfConfiguracao = {
        orientacao: 'portrait',
        tamanho: 'A4',
        margens: { top: 40, bottom: 40, left: 40, right: 40 },
        fontes: {}
      };

      const configCustomizada: Partial<IPdfConfiguracao> = {
        margens: { top: 60, left: 50 } as any
      };

      const resultado = service.mesclarConfiguracoes(configBase, configCustomizada);
      
      expect(resultado.margens.top).toBe(60);
      expect(resultado.margens.left).toBe(50);
      expect(resultado.margens.bottom).toBe(40); // mantém valor original
      expect(resultado.margens.right).toBe(40); // mantém valor original
    });
  });

  describe('obterEstilosPadrao', () => {
    it('deve retornar estilos padrão', () => {
      const estilos = service.obterEstilosPadrao();
      
      expect(estilos).toBeDefined();
      expect(estilos.titulo).toBeDefined();
      expect(estilos.subtitulo).toBeDefined();
      expect(estilos.texto).toBeDefined();
      expect(estilos.rodape).toBeDefined();
    });

    it('deve retornar estilos com propriedades corretas', () => {
      const estilos = service.obterEstilosPadrao();
      
      expect(estilos.titulo.fontSize).toBe(18);
      expect(estilos.titulo.bold).toBe(true);
      expect(estilos.subtitulo.fontSize).toBe(14);
      expect(estilos.texto.fontSize).toBe(12);
      expect(estilos.rodape.fontSize).toBe(10);
    });
  });

  describe('aplicarEstilosCustomizados', () => {
    it('deve aplicar estilos customizados', () => {
      const estilosPadrao = service.obterEstilosPadrao();
      const estilosCustomizados = {
        titulo: { fontSize: 20, color: 'blue' },
        texto: { fontSize: 14 }
      };

      const resultado = service.aplicarEstilosCustomizados(estilosPadrao, estilosCustomizados);
      
      expect(resultado.titulo.fontSize).toBe(20);
      expect(resultado.titulo.color).toBe('blue');
      expect(resultado.titulo.bold).toBe(true); // mantém propriedade original
      expect(resultado.texto.fontSize).toBe(14);
      expect(resultado.subtitulo).toEqual(estilosPadrao.subtitulo); // não modificado
    });

    it('deve preservar estilos originais quando customizados são vazios', () => {
      const estilosPadrao = service.obterEstilosPadrao();
      const resultado = service.aplicarEstilosCustomizados(estilosPadrao, {});
      
      expect(resultado).toEqual(estilosPadrao);
      expect(resultado).not.toBe(estilosPadrao); // deve ser nova instância
    });
  });
});