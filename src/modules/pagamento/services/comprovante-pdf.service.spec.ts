import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ComprovanteService } from './comprovante.service';
import { PagamentoRepository } from '../repositories/pagamento.repository';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Documento } from '../../../entities/documento.entity';
import { StorageProviderFactory } from '../../documento/factories/storage-provider.factory';
import { DocumentoUrlService } from '../../documento/services/documento-url.service';
import { GerarComprovanteDto, TipoComprovante } from '../dtos/gerar-comprovante.dto';
import { Pagamento } from '../../../entities/pagamento.entity';
import { Solicitacao } from '../../../entities/solicitacao.entity';
import { Cidadao } from '../../../entities/cidadao.entity';
import { Endereco } from '../../../entities/endereco.entity';
import { TipoBeneficio } from '../../../entities/tipo-beneficio.entity';
import { ComprovantePdfAdapter } from '../adapters/comprovante-pdf.adapter';
// import { StatusPagamentoEnum } from '../../../enums';

// Mock do PdfGeneratorUtil
jest.mock('../utils/pdf-generator.util', () => {
  return {
    PdfGeneratorUtil: jest.fn().mockImplementation(() => ({
      criarConfiguracao: jest.fn().mockReturnValue({
        tipo: 'cesta_basica',
        titulo: 'COMPROVANTE DE RECEBIMENTO - CESTA BÁSICA',
        subtitulo: 'Programa de Segurança Alimentar e Nutricional',
        rodape: 'Este documento comprova o recebimento do benefício.',
        camposAssinatura: {
          beneficiario: true,
          tecnico: true,
          testemunha: false,
        },
      }),
      gerarComprovante: jest.fn().mockResolvedValue(Buffer.from('mock-pdf-content')),
      gerarNomeArquivo: jest.fn().mockReturnValue('comprovante-test.pdf'),
      converterParaBase64: jest.fn().mockReturnValue('base64content'),
    })),
  };
});

// Mock do ComprovanteDadosMapper
jest.mock('../mappers/comprovante-dados.mapper', () => {
  return {
    ComprovanteDadosMapper: {
      validarDadosObrigatorios: jest.fn(),
      mapearParaComprovante: jest.fn().mockImplementation((pagamento) => {
        const isAluguelSocial = pagamento?.solicitacao?.tipo_beneficio?.codigo === 'aluguel-social';
        
        const dadosBase = {
          beneficiario: {
            nome: 'João da Silva',
            cpf: '123.456.789-00',
            endereco: {
              logradouro: 'Rua Teste',
              numero: '123',
              bairro: 'Centro',
              cidade: 'São Paulo',
              estado: 'SP',
              cep: '01234-567',
            },
          },
          pagamento: {
            id: 'pagamento-id',
            valor: 150.50,
            dataLiberacao: new Date(),
            status: 'liberado' as any,
            tipoBeneficio: {
              nome: isAluguelSocial ? 'Aluguel Social' : 'Cesta Básica',
            },
          },
          unidade: {
            nome: 'SEMTAS',
          },
          dataGeracao: new Date(),
          numeroComprovante: 'COMP-202401-ABC12345',
        };

        // Adiciona dados de locador se for aluguel social
        if (isAluguelSocial) {
          return {
            ...dadosBase,
            locador: {
              nome: 'Maria dos Santos',
              cpf: '987.654.321-00',
              endereco: {
                logradouro: 'Av. Principal',
                numero: '456',
                bairro: 'Centro',
                cidade: 'São Paulo',
                estado: 'SP',
                cep: '01234-567',
              },
            },
            imovel: {
              endereco: {
                logradouro: 'Rua do Imóvel',
                numero: '789',
                bairro: 'Vila Nova',
                cidade: 'São Paulo',
                estado: 'SP',
                cep: '01234-567',
              },
            },
          };
        }

        return dadosBase;
      }),
    },
  };
});

describe('ComprovanteService - Geração de PDF', () => {
  let service: ComprovanteService;
  let pagamentoRepository: jest.Mocked<PagamentoRepository>;
  let documentoRepository: jest.Mocked<Repository<Documento>>;
  let storageProviderFactory: jest.Mocked<StorageProviderFactory>;
  let documentoUrlService: jest.Mocked<DocumentoUrlService>;
  let mockPagamentoRepository: any;

  const mockPagamento = {
    id: 'pagamento-id',
    valor: 150.50,
    data_liberacao: new Date(),
    status: 'liberado' as any,
    solicitacao: {
      id: 'solicitacao-id',
      beneficiario_id: 'beneficiario-id',
      beneficiario: {
        id: 'beneficiario-id',
        nome: 'João da Silva',
        cpf: '12345678901',
        enderecos: [{
          logradouro: 'Rua das Flores',
          numero: '123',
          bairro: 'Centro',
          cidade: 'São Paulo',
          estado: 'SP',
          cep: '01234567',
        }],
      } as Cidadao,
      tipo_beneficio: {
        codigo: 'cesta-basica',
        nome: 'Cesta Básica',
        descricao: 'Benefício de segurança alimentar',
      } as TipoBeneficio,
    } as Solicitacao,
  } as Pagamento;

  beforeEach(async () => {
    mockPagamentoRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
      createScopedQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockPagamento),
      }),
    };

    const mockDocumentoRepository = {
      createQueryBuilder: jest.fn(),
      save: jest.fn(),
    };

    const mockStorageProviderFactory = {
      getProvider: jest.fn(),
    };

    const mockDocumentoUrlService = {
      generatePublicUrl: jest.fn(),
    };

    const mockComprovantePdfAdapter = {
      gerarComprovante: jest.fn().mockResolvedValue(Buffer.from('mock-pdf-content')),
      gerarComprovantesLote: jest.fn().mockResolvedValue([
        { id: '1', buffer: Buffer.from('mock-pdf-1') },
        { id: '2', buffer: Buffer.from('mock-pdf-2') }
      ]),
      criarConfiguracaoTemplate: jest.fn().mockImplementation((dados) => {
        const tipo = dados.locador ? 'aluguel_social' : 'cesta_basica';
        return {
          orientacao: 'PORTRAIT',
          tamanho: 'A4',
          margens: { superior: 20, inferior: 20, esquerda: 20, direita: 20 },
          tipo,
          titulo: 'COMPROVANTE DE RECEBIMENTO - CESTA BÁSICA',
          subtitulo: 'Programa de Segurança Alimentar e Nutricional',
          rodape: 'Este documento comprova o recebimento do benefício.',
          camposAssinatura: {
            beneficiario: true,
            tecnico: true,
            testemunha: false,
          },
        };
      }),
      determinarTipoComprovante: jest.fn().mockImplementation((dados) => {
        return dados.locador ? 'aluguel_social' : 'cesta_basica';
      }),
      validarDados: jest.fn().mockReturnValue(true),
      gerarNomeArquivo: jest.fn().mockReturnValue('comprovante-test.pdf'),
      calcularTamanhoEstimado: jest.fn().mockReturnValue(16),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComprovanteService,
        {
          provide: PagamentoRepository,
          useValue: mockPagamentoRepository,
        },
        {
          provide: getRepositoryToken(Documento),
          useValue: mockDocumentoRepository,
        },
        {
          provide: StorageProviderFactory,
          useValue: mockStorageProviderFactory,
        },
        {
          provide: DocumentoUrlService,
          useValue: mockDocumentoUrlService,
        },
        {
          provide: ComprovantePdfAdapter,
          useValue: mockComprovantePdfAdapter,
        },
      ],
    }).compile();

    service = module.get<ComprovanteService>(ComprovanteService);
    pagamentoRepository = module.get(PagamentoRepository);
    documentoRepository = module.get(getRepositoryToken(Documento));
    storageProviderFactory = module.get(StorageProviderFactory);
    documentoUrlService = module.get(DocumentoUrlService);
  });

  describe('gerarComprovantePdf', () => {
    const gerarComprovanteDto: GerarComprovanteDto = {
      formato: 'pdf',
    };

    it('deve gerar comprovante PDF com sucesso', async () => {
      // Act
      const resultado = await service.gerarComprovantePdf(
        'pagamento-id',
        gerarComprovanteDto,
      );

      // Assert
      expect(resultado).toBeDefined();
      expect(resultado.nomeArquivo).toContain('comprovante_cesta_basica_');
      expect(resultado.tipoMime).toBe('application/pdf');
      expect(resultado.tamanho).toBe(16);
      expect(resultado.tipoComprovante).toBe(TipoComprovante.CESTA_BASICA);
      expect(resultado.dataGeracao).toBeInstanceOf(Date);
    });

    it('deve gerar comprovante em base64 quando solicitado', async () => {
      // Arrange
      const dtoBase64: GerarComprovanteDto = {
        formato: 'base64',
      };

      // Act
      const resultado = await service.gerarComprovantePdf(
        'pagamento-id',
        dtoBase64,
      );

      // Assert
      expect(resultado.conteudoBase64).toBe('bW9jay1wZGYtY29udGVudA==');
    });

    it('deve gerar comprovante de aluguel social', async () => {
      // Arrange
      const mockPagamentoAluguel = {
        ...mockPagamento,
        solicitacao: {
          ...mockPagamento.solicitacao,
          tipo_beneficio: {
            codigo: 'aluguel-social',
            nome: 'Aluguel Social',
            descricao: 'Benefício de aluguel social',
          },
        },
      };
      
      mockPagamentoRepository.createScopedQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockPagamentoAluguel),
      });
      
      const dtoAluguel: GerarComprovanteDto = {
        formato: 'pdf',
      };

      // Act
      const resultado = await service.gerarComprovantePdf(
        'pagamento-id',
        dtoAluguel,
      );

      // Assert
      expect(resultado).toBeDefined();
      expect(resultado.tipoComprovante).toBe(TipoComprovante.ALUGUEL_SOCIAL);
    });

    it('deve lançar NotFoundException quando pagamento não for encontrado', async () => {
      // Arrange
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };

      mockPagamentoRepository.createScopedQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act & Assert
      await expect(
        service.gerarComprovantePdf('pagamento-inexistente', gerarComprovanteDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve lançar erro quando dados obrigatórios estiverem ausentes', async () => {
      // Arrange
      const { ComprovanteDadosMapper } = require('../mappers/comprovante-dados.mapper');
      ComprovanteDadosMapper.validarDadosObrigatorios.mockImplementationOnce(() => {
        throw new Error('Dados obrigatórios ausentes: Nome do beneficiário é obrigatório');
      });

      // Act & Assert
      await expect(
        service.gerarComprovantePdf('pagamento-id', gerarComprovanteDto),
      ).rejects.toThrow('Dados obrigatórios ausentes');
    });

    it('deve usar formato padrão PDF quando não especificado', async () => {
      // Arrange
      const dtoSemFormato: GerarComprovanteDto = {};

      // Act
      const resultado = await service.gerarComprovantePdf(
        'pagamento-id',
        dtoSemFormato,
      );

      // Assert
      expect(resultado.conteudoBase64).toBeUndefined();
      expect(resultado.tipoMime).toBe('application/pdf');
    });
  });

  describe('buscarPagamentoCompleto', () => {
    it('deve buscar pagamento com todos os relacionamentos', async () => {
      // Act
      const resultado = await service['buscarPagamentoCompleto']('pagamento-id');

      // Assert
      expect(resultado).toBeDefined();
      expect(resultado.id).toBe('pagamento-id');
      expect(resultado.solicitacao).toBeDefined();
      expect(resultado.solicitacao.beneficiario).toBeDefined();
      expect(resultado.solicitacao.beneficiario.enderecos).toBeDefined();
    });

    it('deve lançar NotFoundException quando pagamento não for encontrado', async () => {
      // Arrange
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      mockPagamentoRepository.createScopedQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act & Assert
      await expect(
        service['buscarPagamentoCompleto']('pagamento-inexistente'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});