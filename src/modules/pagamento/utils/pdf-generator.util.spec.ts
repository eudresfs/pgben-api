import { PdfGeneratorUtil } from './pdf-generator.util';
import { TipoComprovante } from '../dtos/gerar-comprovante.dto';
import { IDadosComprovante } from '../interfaces/comprovante-pdf.interface';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';
import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';

// Mock do pdfMake
jest.mock('pdfmake/build/pdfmake');
jest.mock('pdfmake/build/vfs_fonts');

describe('PdfGeneratorUtil', () => {
  let pdfGenerator: PdfGeneratorUtil;
  let mockPdfMake: jest.Mocked<any>;

  const dadosComprovanteMock: IDadosComprovante = {
    beneficiario: {
      nome: 'João da Silva',
      cpf: '123.456.789-00',
      rg: '12.345.678-9',
      endereco: {
        logradouro: 'Rua das Flores',
        numero: '123',
        complemento: 'Apto 45',
        bairro: 'Centro',
        cidade: 'São Paulo',
        estado: 'SP',
        cep: '01234-567',
      },
      contatos: {
        telefone: '(11) 98765-4321',
        email: 'joao@email.com',
      },
    },
    pagamento: {
      id: 'pagamento-123',
      valor: 150.50,
      dataLiberacao: new Date('2024-01-15'),
      metodoPagamento: 'PIX',
      numeroParcela: 1,
      totalParcelas: 1,
      status: StatusPagamentoEnum.LIBERADO,
      tipoBeneficio: {
        nome: 'Cesta Básica',
        descricao: 'Benefício de segurança alimentar',
      },
    },
    unidade: {
      nome: 'SEMTAS - Secretaria Municipal de Trabalho e Assistência Social',
      endereco: 'Av. Principal, 1000 - Centro',
      telefone: '(11) 3333-4444',
      email: 'semtas@prefeitura.gov.br',
    },
    tecnico: {
      nome: 'Maria Santos',
      matricula: 'T12345',
      cargo: 'Assistente Social',
    },
    dadosBancarios: {
      banco: 'Banco do Brasil',
      agencia: '1234-5',
      conta: '12345-6',
      tipoConta: 'Conta Corrente',
    },
    dataGeracao: new Date('2024-01-15T10:30:00Z'),
    numeroComprovante: 'COMP-202401-ABC12345',
    assinaturas: {
      beneficiario: {
        nome: 'João da Silva',
        data: new Date('2024-01-15'),
      },
      tecnico: {
        nome: 'Maria Santos',
        cargo: 'Assistente Social',
        data: new Date('2024-01-15'),
      },
    },
  };

  beforeEach(() => {
    // Mock do createPdf
    mockPdfMake = {
      createPdf: jest.fn().mockReturnValue({
        getBase64: jest.fn().mockImplementation((callback) => {
          callback('base64MockContent');
        }),
        getBuffer: jest.fn().mockImplementation((callback) => {
          callback(Buffer.from('pdf content'));
        }),
      }),
    };

    (pdfMake as any).mockImplementation(() => mockPdfMake);
    (pdfMake as any).createPdf = mockPdfMake.createPdf;

    pdfGenerator = new PdfGeneratorUtil();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('gerarComprovante', () => {
    it('deve gerar comprovante de cesta básica em formato PDF', async () => {
      // Act
      const resultado = await pdfGenerator.gerarComprovante(
        dadosComprovanteMock,
        TipoComprovante.CESTA_BASICA,
        'pdf',
      );

      // Assert
      expect(resultado).toBeDefined();
      expect(resultado.nomeArquivo).toContain('cesta-basica');
      expect(resultado.nomeArquivo).toContain('.pdf');
      expect(resultado.mimeType).toBe('application/pdf');
      expect(resultado.tamanho).toBeGreaterThan(0);
      expect(resultado.dataGeracao).toBeInstanceOf(Date);
      expect(resultado.tipoComprovante).toBe(TipoComprovante.CESTA_BASICA);
      expect(resultado.conteudoBase64).toBeUndefined();
    });

    it('deve gerar comprovante de aluguel social em formato base64', async () => {
      // Act
      const resultado = await pdfGenerator.gerarComprovante(
        dadosComprovanteMock,
        TipoComprovante.ALUGUEL_SOCIAL,
        'base64',
      );

      // Assert
      expect(resultado).toBeDefined();
      expect(resultado.nomeArquivo).toContain('aluguel-social');
      expect(resultado.conteudoBase64).toBe('base64MockContent');
      expect(resultado.tipoComprovante).toBe(TipoComprovante.ALUGUEL_SOCIAL);
    });

    it('deve usar formato PDF como padrão quando não especificado', async () => {
      // Act
      const resultado = await pdfGenerator.gerarComprovante(
        dadosComprovanteMock,
        TipoComprovante.CESTA_BASICA,
      );

      // Assert
      expect(resultado.conteudoBase64).toBeUndefined();
      expect(resultado.mimeType).toBe('application/pdf');
    });

    it('deve lançar erro para tipo de comprovante inválido', async () => {
      // Act & Assert
      await expect(
        pdfGenerator.gerarComprovante(
          dadosComprovanteMock,
          'tipo_invalido' as TipoComprovante,
          'pdf',
        ),
      ).rejects.toThrow('Tipo de comprovante não suportado');
    });

    it('deve validar dados obrigatórios antes de gerar', async () => {
      // Arrange
      const dadosIncompletos = {
        ...dadosComprovanteMock,
        beneficiario: {
          ...dadosComprovanteMock.beneficiario,
          nome: '', // Nome vazio
        },
      };

      // Act & Assert
      await expect(
        pdfGenerator.gerarComprovante(
          dadosIncompletos,
          TipoComprovante.CESTA_BASICA,
          'pdf',
        ),
      ).rejects.toThrow('Dados obrigatórios ausentes');
    });
  });

  describe('gerarNomeArquivo', () => {
    it('deve gerar nome de arquivo para cesta básica', () => {
      // Act
      const nomeArquivo = pdfGenerator['gerarNomeArquivo'](
        TipoComprovante.CESTA_BASICA,
        dadosComprovanteMock.dataGeracao,
      );

      // Assert
      expect(nomeArquivo).toMatch(/^comprovante-cesta-basica-\d{6}-[A-Z0-9]{8}\.pdf$/);
    });

    it('deve gerar nome de arquivo para aluguel social', () => {
      // Act
      const nomeArquivo = pdfGenerator['gerarNomeArquivo'](
        TipoComprovante.ALUGUEL_SOCIAL,
        dadosComprovanteMock.dataGeracao,
      );

      // Assert
      expect(nomeArquivo).toMatch(/^comprovante-aluguel-social-\d{6}-[A-Z0-9]{8}\.pdf$/);
    });

    it('deve incluir data formatada no nome do arquivo', () => {
      // Arrange
      const dataEspecifica = new Date('2024-03-15');

      // Act
      const nomeArquivo = pdfGenerator['gerarNomeArquivo'](
        TipoComprovante.CESTA_BASICA,
        dataEspecifica,
      );

      // Assert
      expect(nomeArquivo).toContain('202403');
    });
  });

  describe('converterParaBase64', () => {
    it('deve converter PDF para base64', async () => {
      // Arrange
      const mockDocDefinition = { content: 'test' };

      // Act
      const base64 = await pdfGenerator['converterParaBase64'](mockDocDefinition);

      // Assert
      expect(base64).toBe('base64MockContent');
      expect(mockPdfMake.createPdf).toHaveBeenCalledWith(mockDocDefinition);
    });

    it('deve rejeitar quando ocorrer erro na conversão', async () => {
      // Arrange
      const mockDocDefinition = { content: 'test' };
      mockPdfMake.createPdf.mockReturnValue({
        getBase64: jest.fn().mockImplementation((callback) => {
          callback(null, 'Erro na conversão');
        }),
      });

      // Act & Assert
      await expect(
        pdfGenerator['converterParaBase64'](mockDocDefinition),
      ).rejects.toThrow('Erro na conversão');
    });
  });

  describe('validarDadosObrigatorios', () => {
    it('deve validar dados completos sem erro', () => {
      // Act & Assert
      expect(() => {
        pdfGenerator['validarDadosObrigatorios'](dadosComprovanteMock);
      }).not.toThrow();
    });

    it('deve lançar erro quando nome do beneficiário estiver ausente', () => {
      // Arrange
      const dadosInvalidos = {
        ...dadosComprovanteMock,
        beneficiario: {
          ...dadosComprovanteMock.beneficiario,
          nome: '',
        },
      };

      // Act & Assert
      expect(() => {
        pdfGenerator['validarDadosObrigatorios'](dadosInvalidos);
      }).toThrow('Nome do beneficiário é obrigatório');
    });

    it('deve lançar erro quando CPF estiver ausente', () => {
      // Arrange
      const dadosInvalidos = {
        ...dadosComprovanteMock,
        beneficiario: {
          ...dadosComprovanteMock.beneficiario,
          cpf: '',
        },
      };

      // Act & Assert
      expect(() => {
        pdfGenerator['validarDadosObrigatorios'](dadosInvalidos);
      }).toThrow('CPF do beneficiário é obrigatório');
    });

    it('deve lançar erro quando valor do pagamento for inválido', () => {
      // Arrange
      const dadosInvalidos = {
        ...dadosComprovanteMock,
        pagamento: {
          ...dadosComprovanteMock.pagamento,
          valor: 0,
        },
      };

      // Act & Assert
      expect(() => {
        pdfGenerator['validarDadosObrigatorios'](dadosInvalidos);
      }).toThrow('Valor do pagamento deve ser maior que zero');
    });

    it('deve lançar erro quando múltiplos campos estiverem ausentes', () => {
      // Arrange
      const dadosInvalidos = {
        ...dadosComprovanteMock,
        beneficiario: {
          ...dadosComprovanteMock.beneficiario,
          nome: '',
          cpf: '',
        },
      };

      // Act & Assert
      expect(() => {
        pdfGenerator['validarDadosObrigatorios'](dadosInvalidos);
      }).toThrow('Nome do beneficiário é obrigatório, CPF do beneficiário é obrigatório');
    });
  });

  describe('calcularTamanhoEstimado', () => {
    it('deve calcular tamanho estimado baseado no conteúdo', () => {
      // Act
      const tamanho = pdfGenerator['calcularTamanhoEstimado'](dadosComprovanteMock);

      // Assert
      expect(tamanho).toBeGreaterThan(0);
      expect(typeof tamanho).toBe('number');
    });

    it('deve retornar tamanhos diferentes para dados diferentes', () => {
      // Arrange
      const dadosReduzidos = {
        ...dadosComprovanteMock,
        beneficiario: {
          nome: 'João',
          cpf: '123.456.789-00',
          endereco: {
            logradouro: 'Rua A',
            numero: '1',
            bairro: 'Centro',
            cidade: 'SP',
            estado: 'SP',
            cep: '01234-567',
          },
        },
      };

      // Act
      const tamanhoCompleto = pdfGenerator['calcularTamanhoEstimado'](dadosComprovanteMock);
      const tamanhoReduzido = pdfGenerator['calcularTamanhoEstimado'](dadosReduzidos);

      // Assert
      expect(tamanhoCompleto).toBeGreaterThan(tamanhoReduzido);
    });
  });
});