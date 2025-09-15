import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DocumentoPdfService } from '../../src/modules/documento/services/documento-pdf.service';
import { PdfCommonService } from '../../src/common/pdf/services/pdf-common.service';
import { AutorizacaoAtaudeTemplate } from '../../src/common/pdf/templates/comprovantes/autorizacao-ataude.template';
import { DocumentoAdapter } from '../../src/modules/documento/adapters/documento.adapter';
import { IDadosDocumento } from '../../src/modules/documento/interfaces/documento-pdf.interface';
import { TipoDocumentoEnum } from '../../src/enums/tipo-documento.enum';
import { StatusSolicitacao } from '../../src/enums/status-solicitacao.enum';
import { TipoBeneficio } from '../../src/enums/tipo-beneficio.enum';
import { DocumentoModule } from '../../src/modules/documento/documento.module';
import { PdfCommonModule } from '../../src/common/pdf/pdf-common.module';
import { PdfTipoConteudo, PdfOrientacao, PdfTamanhoPapel } from '../../src/common/pdf/enums';
import { GerarDocumentoDto } from '../../src/modules/documento/dtos/gerar-documento.dto';

/**
 * Teste de integração para validar a migração do sistema de geração de PDFs
 * do DocumentoPdfGeneratorUtil para o PdfCommonService padronizado
 */
describe('DocumentoPdf Migration Integration (e2e)', () => {
  let app: INestApplication;
  let documentoPdfService: DocumentoPdfService;
  let pdfCommonService: PdfCommonService;
  let autorizacaoAtaudeTemplate: AutorizacaoAtaudeTemplate;
  let documentoAdapter: DocumentoAdapter;

  // Dados de teste para autorização de ataúde
  const dadosTesteMock: IDadosDocumento = {
    beneficiario: {
      nome: 'João da Silva',
      cpf: '12345678901',
      rg: '1234567',
      data_nascimento: new Date('1980-01-01'),
      endereco: {
        logradouro: 'Rua das Flores',
        numero: '123',
        bairro: 'Centro',
        cidade: 'São Paulo',
        estado: 'SP',
        cep: '01234567'
      },
      contatos: {
        telefone: '(11) 1234-5678'
      }
    },
    solicitacao: {
      id: '1',
      protocolo: 'SOL-2024-001',
      dataAbertura: new Date('2024-01-15'),
      status: 'APROVADA',
      tipoBeneficio: {
        nome: 'Benefício Ataúde',
        descricao: 'Auxílio para despesas funerárias'
      },
      observacoes: 'Solicitação aprovada para benefício ataúde'
    },
    unidade: {
      nome: 'CRAS Centro',
      endereco: 'Av. Principal, 456',
      telefone: '(11) 1234-5678',
      responsavel: 'Maria Santos'
    },
    tecnico: {
      nome: 'Carlos Oliveira',
      matricula: '12345',
      cargo: 'Assistente Social',
      unidade: 'CRAS Centro'
    },
    requerente: {
      nome: 'Ana Silva',
      cpf: '11122233344',
      rg: '9876543',
      parentesco: 'Filha',
      telefone: '(11) 9876-5432',
      endereco: {
        logradouro: 'Rua das Flores',
        numero: '123',
        bairro: 'Centro',
        cidade: 'São Paulo',
        estado: 'SP',
        cep: '01234567'
      }
    },
    dados_ataude: {
      tipo_urna: 'SIMPLES' as any,
      valor_urna: 800.00,
      grau_parentesco: 'Filha',
      valor_autorizado: 1500.00,
      data_autorizacao: '2024-01-16',
      observacoes: 'Benefício aprovado conforme análise técnica',
      funeraria: {
        nome: 'Funerária São José',
        endereco: 'Rua das Palmeiras, 789',
        telefone: '(11) 5555-1234'
      },
      cemiterio: {
        nome: 'Cemitério Municipal',
        endereco: 'Av. dos Ipês, 321'
      },
      data_obito: '2024-01-14',
      declaracao_obito: 'DO-2024-001'
    },
    data_geracao: '2024-01-18',
    numero_documento: 'DOC-2024-001',
    protocolo: 'AUT-2024-001'
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentoPdfService,
        {
          provide: PdfCommonService,
          useValue: {
            gerarPdf: jest.fn().mockResolvedValue(Buffer.from('mock-pdf')),
            configurarFontes: jest.fn(),
            aplicarConfiguracaoPadrao: jest.fn()
          }
        },
        {
          provide: AutorizacaoAtaudeTemplate,
          useValue: {
            criarDefinicaoDocumento: jest.fn().mockReturnValue({
              content: [{ text: 'Mock content' }],
              defaultStyle: { font: 'Roboto' }
            }),
            validarDados: jest.fn().mockReturnValue(true)
          }
        },
        {
          provide: DocumentoAdapter,
          useValue: {
            adaptarParaTemplate: jest.fn().mockReturnValue(dadosTesteMock)
          }
        }
      ]
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Obter instâncias dos serviços
    documentoPdfService = moduleFixture.get<DocumentoPdfService>(DocumentoPdfService);
    pdfCommonService = moduleFixture.get<PdfCommonService>(PdfCommonService);
    autorizacaoAtaudeTemplate = moduleFixture.get<AutorizacaoAtaudeTemplate>(AutorizacaoAtaudeTemplate);
    documentoAdapter = moduleFixture.get<DocumentoAdapter>(DocumentoAdapter);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Validação de Dependências', () => {
    it('deve ter todas as dependências injetadas corretamente', () => {
      expect(documentoPdfService).toBeDefined();
      expect(pdfCommonService).toBeDefined();
      expect(autorizacaoAtaudeTemplate).toBeDefined();
      expect(documentoAdapter).toBeDefined();
    });

    it('deve ter o PdfCommonService configurado corretamente', () => {
      expect(pdfCommonService).toBeInstanceOf(PdfCommonService);
    });

    it('deve ter o AutorizacaoAtaudeTemplate estendendo TemplatePadronizadoBase', () => {
      expect(autorizacaoAtaudeTemplate.config).toBeDefined();
      expect(autorizacaoAtaudeTemplate.criarConteudoEspecifico).toBeDefined();
      expect(autorizacaoAtaudeTemplate.validarDados).toBeDefined();
    });
  });

  describe('Teste de Adapter', () => {
    it('deve converter IDadosDocumento para AutorizacaoAtaudeTemplateDto corretamente', () => {
      const dto = documentoAdapter.converterParaAutorizacaoAtaude(dadosTesteMock);

      expect(dto).toBeDefined();
      expect(dto.beneficiario.nome).toBe(dadosTesteMock.beneficiario.nome);
      expect(dto.beneficiario.cpf).toBe(dadosTesteMock.beneficiario.cpf);
      expect(dto.requerente.nome).toBe(dadosTesteMock.requerente.nome);
      expect(dto.dadosAtaude.tipoUrna).toBe(dadosTesteMock.dados_ataude.tipo_urna);
      expect(dto.tecnico.nome).toBe(dadosTesteMock.tecnico.nome);
      expect(dto.unidade.nome).toBe(dadosTesteMock.unidade.nome);
    });

    it('deve mapear endereços corretamente', () => {
      const dto = documentoAdapter.converterParaAutorizacaoAtaude(dadosTesteMock);

      expect(dto.beneficiario.endereco.logradouro).toBe(dadosTesteMock.beneficiario.endereco.logradouro);
      expect(dto.beneficiario.endereco.cidade).toBe(dadosTesteMock.beneficiario.endereco.cidade);
      expect(dto.beneficiario.endereco.estado).toBe(dadosTesteMock.beneficiario.endereco.estado);
    });
  });

  describe('Teste de Template', () => {
    it('deve validar dados corretamente', () => {
      const dto = documentoAdapter.converterParaAutorizacaoAtaude(dadosTesteMock);
      
      expect(() => {
        autorizacaoAtaudeTemplate.validarDados(dto);
      }).not.toThrow();
    });

    it('deve gerar configuração de documento corretamente', () => {
      const config = autorizacaoAtaudeTemplate.config;

      expect(config).toBeDefined();
      expect(config.nome).toBeDefined();
      expect(config.tipo).toBeDefined();
      expect(config.conteudo).toBeDefined();
      expect(config.assinaturas).toBeDefined();
      expect(config.headerPadronizado).toBe(true);
      expect(config.footerPadronizado).toBe(true);
    });

    it('deve criar conteúdo específico sem erros', () => {
      const dto = documentoAdapter.converterParaAutorizacaoAtaude(dadosTesteMock);
      
      expect(() => {
        const conteudo = autorizacaoAtaudeTemplate.criarConteudoEspecifico(dto);
        expect(conteudo).toBeDefined();
        expect(Array.isArray(conteudo)).toBe(true);
      }).not.toThrow();
    });
  });

  describe('Teste de Integração Completa', () => {
    it('deve gerar PDF usando o novo sistema padronizado', async () => {
      // Arrange
      const gerarDocumentoDto: GerarDocumentoDto = {
        solicitacaoId: '1',
        tipoDocumento: TipoDocumentoEnum.AUTORIZACAO_ATAUDE,
        formato: 'pdf'
      };
      
      // Mock dos repositórios para evitar dependências de banco
      jest.spyOn(documentoPdfService as any, 'buscarDadosSolicitacao')
        .mockResolvedValue(dadosTesteMock);
      jest.spyOn(documentoPdfService as any, 'salvarArquivo')
        .mockResolvedValue('/tmp/test.pdf');
      jest.spyOn(documentoPdfService as any, 'registrarDocumento')
        .mockResolvedValue({ id: '1', created_at: new Date() });
      
      // Act
      const resultado = await documentoPdfService.gerarDocumento(gerarDocumentoDto, 'user-id');
      
      // Assert
      expect(resultado).toBeDefined();
      expect(resultado.id).toBeDefined();
      expect(resultado.nomeArquivo).toContain('documento_');
    }, 30000); // Timeout de 30 segundos para geração de PDF

    it('deve validar template corretamente', () => {
      const dto = documentoAdapter.converterParaAutorizacaoAtaude(dadosTesteMock);
      
      expect(() => {
        autorizacaoAtaudeTemplate.validarDados(dto);
      }).not.toThrow();
    });

    it('deve manter compatibilidade com interface existente', async () => {
      // Testa se o método gerarDocumento ainda funciona
      expect(documentoPdfService.gerarDocumento).toBeDefined();
      expect(typeof documentoPdfService.gerarDocumento).toBe('function');
    });
  });

  describe('Teste de Performance', () => {
    it('deve criar definição de documento válida', () => {
      const dto = documentoAdapter.converterParaAutorizacaoAtaude(dadosTesteMock);
      const documentDefinition = autorizacaoAtaudeTemplate.criarDefinicaoDocumento(dto);
      
      expect(documentDefinition).toBeDefined();
      expect(documentDefinition.content).toBeDefined();
      expect(Array.isArray(documentDefinition.content)).toBe(true);
    });
  });

  describe('Teste de Validação de Dados', () => {
    it('deve falhar com dados inválidos', () => {
      const dadosInvalidos = {
        ...dadosTesteMock,
        beneficiario: {
          ...dadosTesteMock.beneficiario,
          nome: '', // Nome vazio deve falhar
          cpf: '123' // CPF inválido deve falhar
        }
      };

      const dto = documentoAdapter.converterParaAutorizacaoAtaude(dadosInvalidos);
      
      expect(() => {
        autorizacaoAtaudeTemplate.validarDados(dto);
      }).toThrow();
    });

    it('deve validar CPF corretamente', () => {
      const dadosComCpfInvalido = {
        ...dadosTesteMock,
        beneficiario: {
          ...dadosTesteMock.beneficiario,
          cpf: '00000000000' // CPF inválido
        }
      };

      const dto = documentoAdapter.converterParaAutorizacaoAtaude(dadosComCpfInvalido);
      
      expect(() => {
        autorizacaoAtaudeTemplate.validarDados(dto);
      }).toThrow();
    });
  });
});