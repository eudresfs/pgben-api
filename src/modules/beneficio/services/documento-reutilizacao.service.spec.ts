import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DocumentoReutilizacaoService } from './documento-reutilizacao.service';
import { Solicitacao, DocumentoSolicitacao } from '../../../entities';
import { TipoDocumentoEnum } from '../../../enums/tipo-documento.enum';
import { StatusDocumentoEnum } from '../../../enums/status-documento.enum';

/**
 * Testes unitários para o serviço de reutilização de documentos
 * Valida a lógica de reutilização de documentos entre solicitações
 */
describe('DocumentoReutilizacaoService', () => {
  let service: DocumentoReutilizacaoService;
  let documentoSolicitacaoRepository: Repository<DocumentoSolicitacao>;

  // Mock do repositório de documentos
  const mockDocumentoSolicitacaoRepository = {
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentoReutilizacaoService,
        {
          provide: getRepositoryToken(DocumentoSolicitacao),
          useValue: mockDocumentoSolicitacaoRepository,
        },
      ],
    }).compile();

    service = module.get<DocumentoReutilizacaoService>(DocumentoReutilizacaoService);
    documentoSolicitacaoRepository = module.get<Repository<DocumentoSolicitacao>>(
      getRepositoryToken(DocumentoSolicitacao)
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('reutilizarDocumentos', () => {
    const mockSolicitacaoOriginal = {
      id: 'solicitacao-original-123',
      protocolo: 'ORIG2024123456'
    } as Solicitacao;

    const mockNovaSolicitacao = {
      id: 'nova-solicitacao-123',
      protocolo: 'REN2024789012'
    } as Solicitacao;

    it('deve reutilizar documentos válidos com sucesso', async () => {
      // Arrange
      const mockDocumentosOriginais = [
        {
          id: 'doc-1',
          tipo: TipoDocumentoEnum.RG,
          status: StatusDocumentoEnum.APROVADO,
          arquivo_path: '/uploads/rg.pdf',
          data_upload: new Date('2024-01-01'),
          solicitacao_id: 'solicitacao-original-123'
        },
        {
          id: 'doc-2',
          tipo: TipoDocumentoEnum.CPF,
          status: StatusDocumentoEnum.APROVADO,
          arquivo_path: '/uploads/cpf.pdf',
          data_upload: new Date('2024-01-01'),
          solicitacao_id: 'solicitacao-original-123'
        }
      ];

      const mockNovasReferencias = [
        {
          id: 'nova-ref-1',
          tipo: TipoDocumentoEnum.RG,
          solicitacao_id: 'nova-solicitacao-123',
          documento_original_id: 'doc-1'
        },
        {
          id: 'nova-ref-2',
          tipo: TipoDocumentoEnum.CPF,
          solicitacao_id: 'nova-solicitacao-123',
          documento_original_id: 'doc-2'
        }
      ];

      mockDocumentoSolicitacaoRepository.find.mockResolvedValue(mockDocumentosOriginais);
      mockDocumentoSolicitacaoRepository.create.mockImplementation((data) => data);
      mockDocumentoSolicitacaoRepository.save.mockImplementation((data) => Promise.resolve(data));

      // Act
      await service.reutilizarDocumentos(mockSolicitacaoOriginal, mockNovaSolicitacao);

      // Assert
      expect(mockDocumentoSolicitacaoRepository.find).toHaveBeenCalledWith({
        where: { solicitacao_id: mockSolicitacaoOriginal.id },
        order: { data_upload: 'DESC' }
      });
      expect(mockDocumentoSolicitacaoRepository.save).toHaveBeenCalledTimes(2);
    });

    it('deve filtrar documentos não aprovados', async () => {
      // Arrange
      const mockDocumentosOriginais = [
        {
          id: 'doc-1',
          tipo: TipoDocumentoEnum.RG,
          status: StatusDocumentoEnum.APROVADO,
          arquivo_path: '/uploads/rg.pdf',
          data_upload: new Date('2024-01-01'),
          solicitacao_id: 'solicitacao-original-123'
        },
        {
          id: 'doc-2',
          tipo: TipoDocumentoEnum.CPF,
          status: StatusDocumentoEnum.REJEITADO,
          arquivo_path: '/uploads/cpf.pdf',
          data_upload: new Date('2024-01-01'),
          solicitacao_id: 'solicitacao-original-123'
        }
      ];

      mockDocumentoSolicitacaoRepository.find.mockResolvedValue(mockDocumentosOriginais);
      mockDocumentoSolicitacaoRepository.create.mockImplementation((data) => data);
      mockDocumentoSolicitacaoRepository.save.mockImplementation((data) => Promise.resolve(data));

      // Act
      await service.reutilizarDocumentos(mockSolicitacaoOriginal, mockNovaSolicitacao);

      // Assert
      // Deve salvar apenas 1 documento (o aprovado)
      expect(mockDocumentoSolicitacaoRepository.save).toHaveBeenCalledTimes(1);
      expect(mockDocumentoSolicitacaoRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: TipoDocumentoEnum.RG,
          documento_original_id: 'doc-1'
        })
      );
    });

    it('deve filtrar documentos expirados', async () => {
      // Arrange
      const dataExpirada = new Date();
      dataExpirada.setFullYear(dataExpirada.getFullYear() - 3); // 3 anos atrás

      const mockDocumentosOriginais = [
        {
          id: 'doc-1',
          tipo: TipoDocumentoEnum.RG,
          status: StatusDocumentoEnum.APROVADO,
          arquivo_path: '/uploads/rg.pdf',
          data_upload: dataExpirada,
          solicitacao_id: 'solicitacao-original-123'
        }
      ];

      mockDocumentoSolicitacaoRepository.find.mockResolvedValue(mockDocumentosOriginais);

      // Act
      await service.reutilizarDocumentos(mockSolicitacaoOriginal, mockNovaSolicitacao);

      // Assert
      // Não deve salvar nenhum documento (expirado)
      expect(mockDocumentoSolicitacaoRepository.save).not.toHaveBeenCalled();
    });

    it('deve não fazer nada quando não há documentos', async () => {
      // Arrange
      mockDocumentoSolicitacaoRepository.find.mockResolvedValue([]);

      // Act
      await service.reutilizarDocumentos(mockSolicitacaoOriginal, mockNovaSolicitacao);

      // Assert
      expect(mockDocumentoSolicitacaoRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('buscarDocumentosSolicitacao', () => {
    it('deve retornar documentos da solicitação ordenados por data', async () => {
      // Arrange
      const solicitacaoId = 'solicitacao-123';
      const mockDocumentos = [
        {
          id: 'doc-1',
          tipo: TipoDocumentoEnum.RG,
          data_upload: new Date('2024-01-02')
        },
        {
          id: 'doc-2',
          tipo: TipoDocumentoEnum.CPF,
          data_upload: new Date('2024-01-01')
        }
      ];

      mockDocumentoSolicitacaoRepository.find.mockResolvedValue(mockDocumentos);

      // Act
      const resultado = await service.buscarDocumentosSolicitacao(solicitacaoId);

      // Assert
      expect(resultado).toEqual(mockDocumentos);
      expect(mockDocumentoSolicitacaoRepository.find).toHaveBeenCalledWith({
        where: { solicitacao_id: solicitacaoId },
        order: { data_upload: 'DESC' }
      });
    });
  });

  describe('criarReferenciaDocumento', () => {
    it('deve criar referência de documento com dados corretos', async () => {
      // Arrange
      const mockDocumentoOriginal = {
        id: 'doc-original-123',
        tipo: TipoDocumentoEnum.RG,
        arquivo_path: '/uploads/rg.pdf',
        nome_arquivo: 'rg.pdf'
      } as DocumentoSolicitacao;

      const novaSolicitacao = {
        id: 'nova-solicitacao-123'
      } as Solicitacao;

      const mockNovaReferencia = {
        id: 'nova-ref-123',
        tipo: TipoDocumentoEnum.RG,
        solicitacao_id: 'nova-solicitacao-123',
        documento_original_id: 'doc-original-123'
      };

      mockDocumentoSolicitacaoRepository.create.mockReturnValue(mockNovaReferencia);
      mockDocumentoSolicitacaoRepository.save.mockResolvedValue(mockNovaReferencia);

      // Act
      const resultado = await service.criarReferenciaDocumento(mockDocumentoOriginal, novaSolicitacao);

      // Assert
      expect(resultado).toEqual(mockNovaReferencia);
      expect(mockDocumentoSolicitacaoRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: mockDocumentoOriginal.tipo,
          solicitacao_id: novaSolicitacao.id,
          documento_original_id: mockDocumentoOriginal.id,
          arquivo_path: mockDocumentoOriginal.arquivo_path,
          nome_arquivo: mockDocumentoOriginal.nome_arquivo,
          status: StatusDocumentoEnum.APROVADO,
          eh_reutilizado: true
        })
      );
    });
  });

  describe('verificarDocumentoPodeSerReutilizado', () => {
    it('deve retornar true para documento aprovado e não expirado', () => {
      // Arrange
      const mockDocumento = {
        id: 'doc-123',
        status: StatusDocumentoEnum.APROVADO,
        data_upload: new Date() // Data atual
      } as DocumentoSolicitacao;

      // Act
      const resultado = service.verificarDocumentoPodeSerReutilizado(mockDocumento);

      // Assert
      expect(resultado).toBe(true);
    });

    it('deve retornar false para documento não aprovado', () => {
      // Arrange
      const mockDocumento = {
        id: 'doc-123',
        status: StatusDocumentoEnum.REJEITADO,
        data_upload: new Date()
      } as DocumentoSolicitacao;

      // Act
      const resultado = service.verificarDocumentoPodeSerReutilizado(mockDocumento);

      // Assert
      expect(resultado).toBe(false);
    });

    it('deve retornar false para documento expirado', () => {
      // Arrange
      const dataExpirada = new Date();
      dataExpirada.setFullYear(dataExpirada.getFullYear() - 3);

      const mockDocumento = {
        id: 'doc-123',
        status: StatusDocumentoEnum.APROVADO,
        data_upload: dataExpirada
      } as DocumentoSolicitacao;

      // Act
      const resultado = service.verificarDocumentoPodeSerReutilizado(mockDocumento);

      // Assert
      expect(resultado).toBe(false);
    });
  });

  describe('verificarDocumentoExpirado', () => {
    it('deve retornar false para documento recente', () => {
      // Arrange
      const dataRecente = new Date();
      dataRecente.setMonth(dataRecente.getMonth() - 6); // 6 meses atrás

      // Act
      const resultado = service.verificarDocumentoExpirado(dataRecente);

      // Assert
      expect(resultado).toBe(false);
    });

    it('deve retornar true para documento com mais de 2 anos', () => {
      // Arrange
      const dataAntiga = new Date();
      dataAntiga.setFullYear(dataAntiga.getFullYear() - 3); // 3 anos atrás

      // Act
      const resultado = service.verificarDocumentoExpirado(dataAntiga);

      // Assert
      expect(resultado).toBe(true);
    });

    it('deve retornar false para documento com exatamente 2 anos', () => {
      // Arrange
      const dataLimite = new Date();
      dataLimite.setFullYear(dataLimite.getFullYear() - 2); // Exatamente 2 anos

      // Act
      const resultado = service.verificarDocumentoExpirado(dataLimite);

      // Assert
      expect(resultado).toBe(false);
    });
  });

  describe('obterDocumentosUnicos', () => {
    it('deve retornar apenas o documento mais recente de cada tipo', () => {
      // Arrange
      const mockDocumentos = [
        {
          id: 'doc-1',
          tipo: TipoDocumentoEnum.RG,
          data_upload: new Date('2024-01-01')
        },
        {
          id: 'doc-2',
          tipo: TipoDocumentoEnum.RG,
          data_upload: new Date('2024-01-02') // Mais recente
        },
        {
          id: 'doc-3',
          tipo: TipoDocumentoEnum.CPF,
          data_upload: new Date('2024-01-01')
        }
      ] as DocumentoSolicitacao[];

      // Act
      const resultado = service.obterDocumentosUnicos(mockDocumentos);

      // Assert
      expect(resultado).toHaveLength(2);
      expect(resultado.find(doc => doc.tipo === TipoDocumentoEnum.RG)?.id).toBe('doc-2');
      expect(resultado.find(doc => doc.tipo === TipoDocumentoEnum.CPF)?.id).toBe('doc-3');
    });

    it('deve retornar array vazio quando não há documentos', () => {
      // Arrange
      const mockDocumentos: DocumentoSolicitacao[] = [];

      // Act
      const resultado = service.obterDocumentosUnicos(mockDocumentos);

      // Assert
      expect(resultado).toEqual([]);
    });
  });
});