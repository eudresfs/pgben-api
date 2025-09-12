import { Test, TestingModule } from '@nestjs/testing';
import { PdfTemplateService } from '../../../src/common/pdf/services/pdf-template.service';
import { IPdfTemplate, IPdfDados } from '../../../src/common/pdf/interfaces';
import { PdfTipoTemplate, PdfTipoConteudo } from '../../../src/common/pdf/enums';

describe('PdfTemplateService', () => {
  let service: PdfTemplateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PdfTemplateService],
    }).compile();

    service = module.get<PdfTemplateService>(PdfTemplateService);
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('obterTemplate', () => {
    it('deve retornar template padrão', () => {
      const template = service.obterTemplate(PdfTipoTemplate.PADRAO);
      
      expect(template).toBeDefined();
      expect(template.tipo).toBe(PdfTipoTemplate.PADRAO);
      expect(template.nome).toBe('Template Padrão');
      expect(template.configuracao).toBeDefined();
    });

    it('deve retornar template de relatório', () => {
      const template = service.obterTemplate(PdfTipoTemplate.RELATORIO);
      
      expect(template).toBeDefined();
      expect(template.tipo).toBe(PdfTipoTemplate.RELATORIO);
      expect(template.nome).toBe('Template Relatório');
      expect(template.configuracao).toBeDefined();
    });

    it('deve retornar template de documento', () => {
      const template = service.obterTemplate(PdfTipoTemplate.DOCUMENTO);
      
      expect(template).toBeDefined();
      expect(template.tipo).toBe(PdfTipoTemplate.DOCUMENTO);
      expect(template.nome).toBe('Template Documento');
      expect(template.configuracao).toBeDefined();
    });

    it('deve retornar template de comprovante', () => {
      const template = service.obterTemplate(PdfTipoTemplate.COMPROVANTE);
      
      expect(template).toBeDefined();
      expect(template.tipo).toBe(PdfTipoTemplate.COMPROVANTE);
      expect(template.nome).toBe('Template Comprovante');
      expect(template.configuracao).toBeDefined();
    });

    it('deve retornar template de cesta básica', () => {
      const template = service.obterTemplate(PdfTipoTemplate.CESTA_BASICA);
      
      expect(template).toBeDefined();
      expect(template.tipo).toBe(PdfTipoTemplate.CESTA_BASICA);
      expect(template.nome).toBe('Template Cesta Básica');
      expect(template.configuracao).toBeDefined();
    });

    it('deve retornar template de aluguel social', () => {
      const template = service.obterTemplate(PdfTipoTemplate.ALUGUEL_SOCIAL);
      
      expect(template).toBeDefined();
      expect(template.tipo).toBe(PdfTipoTemplate.ALUGUEL_SOCIAL);
      expect(template.nome).toBe('Template Aluguel Social');
      expect(template.configuracao).toBeDefined();
    });

    it('deve lançar erro para tipo inválido', () => {
      expect(() => service.obterTemplate('INVALIDO' as any))
        .toThrow('Tipo de template não encontrado: INVALIDO');
    });
  });

  describe('listarTemplates', () => {
    it('deve retornar lista de todos os templates', () => {
      const templates = service.listarTemplates();
      
      expect(templates).toHaveLength(6);
      expect(templates.map(t => t.tipo)).toEqual([
        PdfTipoTemplate.PADRAO,
        PdfTipoTemplate.RELATORIO,
        PdfTipoTemplate.DOCUMENTO,
        PdfTipoTemplate.COMPROVANTE,
        PdfTipoTemplate.CESTA_BASICA,
        PdfTipoTemplate.ALUGUEL_SOCIAL
      ]);
    });

    it('deve retornar templates com todas as propriedades', () => {
      const templates = service.listarTemplates();
      
      templates.forEach(template => {
        expect(template.tipo).toBeDefined();
        expect(template.nome).toBeDefined();
        expect(template.descricao).toBeDefined();
        expect(template.configuracao).toBeDefined();
        expect(template.estilos).toBeDefined();
      });
    });
  });

  describe('aplicarTemplate', () => {
    const dadosBase: IPdfDados = {
      titulo: 'Documento Teste',
      conteudo: [
        {
          tipo: PdfTipoConteudo.TEXTO,
          valor: 'Conteúdo do teste',
          estilos: { fontSize: 12 }
        }
      ]
    };

    it('deve aplicar template padrão aos dados', () => {
      const resultado = service.aplicarTemplate(dadosBase, PdfTipoTemplate.PADRAO);
      
      expect(resultado.dados).toBeDefined();
      expect(resultado.configuracao).toBeDefined();
      expect(resultado.dados.titulo).toBe(dadosBase.titulo);
      expect(resultado.dados.conteudo).toHaveLength(dadosBase.conteudo.length);
    });

    it('deve aplicar template de relatório aos dados', () => {
      const resultado = service.aplicarTemplate(dadosBase, PdfTipoTemplate.RELATORIO);
      
      expect(resultado.dados).toBeDefined();
      expect(resultado.configuracao).toBeDefined();
      expect(resultado.configuracao.orientacao).toBe('portrait');
      expect(resultado.configuracao.tamanho).toBe('A4');
    });

    it('deve aplicar template de comprovante aos dados', () => {
      const resultado = service.aplicarTemplate(dadosBase, PdfTipoTemplate.COMPROVANTE);
      
      expect(resultado.dados).toBeDefined();
      expect(resultado.configuracao).toBeDefined();
      expect(resultado.configuracao.margens.top).toBe(30);
      expect(resultado.configuracao.margens.bottom).toBe(30);
    });

    it('deve preservar dados originais', () => {
      const dadosOriginais = { ...dadosBase };
      const resultado = service.aplicarTemplate(dadosBase, PdfTipoTemplate.DOCUMENTO);
      
      expect(dadosBase).toEqual(dadosOriginais);
      expect(resultado.dados.titulo).toBe(dadosBase.titulo);
    });

    it('deve aplicar estilos do template ao conteúdo', () => {
      const resultado = service.aplicarTemplate(dadosBase, PdfTipoTemplate.RELATORIO);
      
      expect(resultado.dados.conteudo[0].estilos).toBeDefined();
      // Os estilos do template devem ser mesclados com os estilos originais
      expect(resultado.dados.conteudo[0].estilos.fontSize).toBeDefined();
    });
  });

  describe('criarTemplateCustomizado', () => {
    it('deve criar template customizado válido', () => {
      const templateCustomizado: IPdfTemplate = {
        tipo: PdfTipoTemplate.PADRAO,
        nome: 'Template Customizado',
        descricao: 'Template criado para teste',
        configuracao: {
          orientacao: 'landscape',
          tamanho: 'A3',
          margens: {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50
          },
          fontes: {
            Arial: {
              normal: 'fonts/Arial-Regular.ttf',
              bold: 'fonts/Arial-Bold.ttf',
              italics: 'fonts/Arial-Italic.ttf',
              bolditalics: 'fonts/Arial-BoldItalic.ttf'
            }
          }
        },
        estilos: {
          titulo: { fontSize: 18, bold: true },
          subtitulo: { fontSize: 14, bold: true },
          texto: { fontSize: 12 },
          rodape: { fontSize: 10 }
        }
      };

      const resultado = service.criarTemplateCustomizado(templateCustomizado);
      
      expect(resultado).toBeDefined();
      expect(resultado.nome).toBe('Template Customizado');
      expect(resultado.configuracao.orientacao).toBe('landscape');
      expect(resultado.configuracao.tamanho).toBe('A3');
    });

    it('deve validar template customizado', () => {
      const templateInvalido = {
        tipo: PdfTipoTemplate.PADRAO,
        nome: '',
        configuracao: null
      } as any;

      expect(() => service.criarTemplateCustomizado(templateInvalido))
        .toThrow('Template customizado inválido');
    });
  });

  describe('validarTemplate', () => {
    it('deve validar template correto', () => {
      const template: IPdfTemplate = {
        tipo: PdfTipoTemplate.PADRAO,
        nome: 'Template Válido',
        descricao: 'Descrição do template',
        configuracao: {
          orientacao: 'portrait',
          tamanho: 'A4',
          margens: {
            top: 40,
            bottom: 40,
            left: 40,
            right: 40
          },
          fontes: {}
        },
        estilos: {
          titulo: { fontSize: 16, bold: true }
        }
      };

      const resultado = service.validarTemplate(template);
      expect(resultado.valido).toBe(true);
      expect(resultado.erros).toHaveLength(0);
    });

    it('deve detectar nome vazio', () => {
      const template: IPdfTemplate = {
        tipo: PdfTipoTemplate.PADRAO,
        nome: '',
        descricao: 'Descrição',
        configuracao: {
          orientacao: 'portrait',
          tamanho: 'A4',
          margens: { top: 40, bottom: 40, left: 40, right: 40 },
          fontes: {}
        },
        estilos: {}
      };

      const resultado = service.validarTemplate(template);
      expect(resultado.valido).toBe(false);
      expect(resultado.erros).toContain('Nome do template é obrigatório');
    });

    it('deve detectar configuração inválida', () => {
      const template: IPdfTemplate = {
        tipo: PdfTipoTemplate.PADRAO,
        nome: 'Template',
        descricao: 'Descrição',
        configuracao: null as any,
        estilos: {}
      };

      const resultado = service.validarTemplate(template);
      expect(resultado.valido).toBe(false);
      expect(resultado.erros).toContain('Configuração do template é obrigatória');
    });
  });
});