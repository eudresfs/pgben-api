import { ResultadoBeneficioCessadoController } from './resultado-beneficio-cessado.controller';
import { ResultadoBeneficioCessadoService } from '../services/resultado-beneficio-cessado.service';
import { StorageProviderFactory } from '../../documento/factories/storage-provider.factory';
import { MotivoEncerramentoBeneficio } from '../../../enums/motivo-encerramento-beneficio.enum';
import { StatusVulnerabilidade } from '../../../enums/status-vulnerabilidade.enum';
import { TipoDocumentoComprobatorio } from '../../../enums/tipo-documento-comprobatorio.enum';
import { StatusConcessao } from '../../../enums/status-concessao.enum';
import { StreamableFile } from '@nestjs/common';

describe('ResultadoBeneficioCessadoController', () => {
  let controller: ResultadoBeneficioCessadoController;
  let service: jest.Mocked<ResultadoBeneficioCessadoService>;
  let storageFactory: jest.Mocked<StorageProviderFactory>;

  // Mock de dados para testes
  const mockUsuario = {
    id: 'user-123',
    nome: 'João Silva',
    email: 'joao@teste.com',
    perfil: 'TECNICO_SOCIAL',
  };

  const mockConcessao = {
    id: 'concessao-123',
    status: StatusConcessao.CESSADO,
    beneficiario: { id: 'beneficiario-123', nome: 'Maria Silva' },
  };

  const mockResultado = {
    id: 'resultado-123',
    concessaoId: 'concessao-123',
    motivoEncerramento: MotivoEncerramentoBeneficio.SUPERACAO_VULNERABILIDADE,
    statusVulnerabilidade: StatusVulnerabilidade.SUPERADA,
    observacoesTecnicas: 'Família conseguiu emprego formal e superou situação de vulnerabilidade',
    tecnicoResponsavelId: 'user-123',
    dataRegistro: new Date(),
    concessao: mockConcessao,
    tecnicoResponsavel: mockUsuario,
    documentosComprobatorios: [
      {
        id: 'doc-123',
        tipo: TipoDocumentoComprobatorio.COMPROVANTE_RENDA,
        descricao: 'Carteira de trabalho assinada',
        nomeArquivo: 'carteira_trabalho.pdf', caminhoArquivo: '/uploads/carteira_trabalho.pdf', tipoMime: 'application/pdf', tamanhoArquivo: 1024,
      },
    ],
  };

  const validCreateDto = {
    concessaoId: '123e4567-e89b-12d3-a456-426614174000',
    motivoEncerramento: MotivoEncerramentoBeneficio.SUPERACAO_VULNERABILIDADE,
    descricaoMotivo: 'Família conseguiu emprego estável e renda suficiente',
    statusVulnerabilidade: StatusVulnerabilidade.SUPERADA,
    avaliacaoVulnerabilidade: StatusVulnerabilidade.SUPERADA,
    observacoes: 'Família demonstrou capacidade de sustentabilidade financeira após acompanhamento de 6 meses',
    acompanhamentoPosterior: true,
    documentosComprobatorios: [
      {
        tipo: TipoDocumentoComprobatorio.COMPROVANTE_RENDA,
        nomeArquivo: 'carteira_trabalho.pdf',
        caminhoArquivo: '/uploads/documentos/carteira_trabalho.pdf',
        tipoMime: 'application/pdf',
        tamanhoArquivo: 1048576,
        descricao: 'Carteira de trabalho assinada',
      },
    ],
  };

  beforeEach(() => {
    service = {
      registrarResultado: jest.fn(),
      buscarPorId: jest.fn(),
      listar: jest.fn(),
      downloadArquivo: jest.fn(),
      excluirArquivo: jest.fn(),
      adicionarArquivos: jest.fn(),
    } as any;

    storageFactory = {
      getProvider: jest.fn(),
    } as any;

    controller = new ResultadoBeneficioCessadoController(service, storageFactory);
  });

  describe('registrarResultado', () => {
    it('deve registrar resultado com sucesso', async () => {
      // Arrange
      jest.spyOn(service, 'registrarResultado').mockResolvedValue(mockResultado as any);
      const req = { user: { id: 'user-123' } };

      // Act
      const result = await controller.registrarResultado(validCreateDto, req);

      // Assert
      expect(result).toEqual(mockResultado);
      expect(service.registrarResultado).toHaveBeenCalledWith(validCreateDto, 'user-123', undefined, undefined);
    });
  });

  describe('buscarPorId', () => {
    it('deve buscar resultado por ID com sucesso', async () => {
      // Arrange
      jest.spyOn(service, 'buscarPorId').mockResolvedValue(mockResultado as any);

      // Act
      const result = await controller.buscarPorId('resultado-123');

      // Assert
      expect(result).toEqual(mockResultado);
      expect(service.buscarPorId).toHaveBeenCalledWith('resultado-123');
    });
  });

  describe('listar', () => {
    it('deve listar resultados com paginação', async () => {
      // Arrange
      const mockListagem = {
        resultados: [mockResultado],
        total: 1,
        page: 1,
        limit: 10,
      };
      jest.spyOn(service, 'listar').mockResolvedValue(mockListagem as any);

      // Act
      const result = await controller.listar(
        undefined, // concessaoId
        undefined, // tecnicoId
        undefined, // motivoEncerramento
        undefined, // statusVulnerabilidade
        undefined, // dataInicio
        undefined, // dataFim
        1, // page
        10 // limit
      );

      // Assert
      expect(result).toEqual(mockListagem);
      expect(result.resultados).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(service.listar).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
      });
    });
  });

  describe('buscarPorConcessao', () => {
    it('deve buscar resultado por concessão com sucesso', async () => {
      // Arrange
      const mockListagem = {
        resultados: [mockResultado],
        total: 1,
        page: 1,
        limit: 10,
      };
      jest.spyOn(service, 'listar').mockResolvedValue(mockListagem as any);

      // Act
      const result = await controller.buscarPorConcessao('concessao-123');

      // Assert
      expect(result).toEqual(mockResultado);
      expect(service.listar).toHaveBeenCalledWith({ concessaoId: 'concessao-123', limit: 1 });
    });
  });

  describe('downloadArquivo', () => {
    it('deve fazer download de um arquivo', async () => {
      const resultadoId = 'resultado-id';
      const arquivoId = 'arquivo-id';
      const mockStream = {
        pipe: jest.fn(),
      };
      const mockResponse = {
        set: jest.fn(),
      };

      service.downloadArquivo.mockResolvedValue({
        stream: mockStream,
        filename: 'test.pdf',
        mimeType: 'application/pdf',
      });

      await controller.downloadArquivo(resultadoId, arquivoId, mockResponse);

      expect(service.downloadArquivo).toHaveBeenCalledWith(
        resultadoId,
        arquivoId,
        'user-id'
      );
      expect(mockResponse.set).toHaveBeenCalledWith({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="test.pdf"',
      });
      expect(mockStream.pipe).toHaveBeenCalledWith(mockResponse);
    });

    it('deve tratar erros no download', async () => {
      const resultadoId = 'resultado-id';
      const arquivoId = 'arquivo-id';
      const mockResponse = {
        status: jest.fn().mockReturnValue({ json: jest.fn() }),
      };

      service.downloadArquivo.mockRejectedValue(new Error('Erro no download'));

      await controller.downloadArquivo(resultadoId, arquivoId, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.status().json).toHaveBeenCalledWith({
        statusCode: 500,
        message: 'Erro interno do servidor',
        error: 'Internal Server Error',
      });
    });
  });

  describe('excluirArquivo', () => {
    it('deve excluir um arquivo', async () => {
      const resultadoId = 'resultado-id';
      const arquivoId = 'arquivo-id';
      const mockRequest = { user: { id: 'user-id' } };

      service.excluirArquivo.mockResolvedValue(undefined);

      const result = await controller.excluirArquivo(resultadoId, arquivoId, mockRequest);

      expect(service.excluirArquivo).toHaveBeenCalledWith(
        resultadoId,
        arquivoId,
        'user-id'
      );
      expect(result).toEqual({
        message: 'Arquivo excluído com sucesso',
        arquivoId,
      });
    });
  });

  describe('adicionarArquivos', () => {
    it('deve adicionar arquivos ao resultado', async () => {
      const resultadoId = 'resultado-id';
      const mockRequest = { user: { id: 'user-id' } };
      const mockFiles = {
        provaSocial: [{ originalname: 'prova.jpg' } as Express.Multer.File],
        documentacaoTecnica: [{ originalname: 'doc.pdf' } as Express.Multer.File],
      };

      const mockResultadoCompleto = {
        ...mockResultado,
        documentosComprobatorios: [
          {
            id: 'doc-id-1',
            nomeArquivo: 'prova.jpg',
            tipo: 'PROVA_SOCIAL',
            tamanhoArquivo: 1024,
          },
          {
            id: 'doc-id-2',
            nomeArquivo: 'doc.pdf',
            tipo: 'DOCUMENTACAO_TECNICA',
            tamanhoArquivo: 2048,
          },
        ],
      };

      service.adicionarArquivos.mockResolvedValue(mockResultadoCompleto as any);

      const result = await controller.adicionarArquivos(resultadoId, mockRequest, mockFiles);

      expect(service.adicionarArquivos).toHaveBeenCalledWith(
        resultadoId,
        'user-id',
        mockFiles.provaSocial,
        mockFiles.documentacaoTecnica
      );
      expect(result).toEqual({
        message: 'Arquivos adicionados com sucesso',
        arquivosAdicionados: [
          {
            id: 'doc-id-1',
            nomeOriginal: 'prova.jpg',
            categoria: 'PROVA_SOCIAL',
            tamanho: 1024,
          },
          {
            id: 'doc-id-2',
            nomeOriginal: 'doc.pdf',
            categoria: 'DOCUMENTACAO_TECNICA',
            tamanho: 2048,
          },
        ],
      });
    });

    it('deve lançar erro quando nenhum arquivo é fornecido', async () => {
      const resultadoId = 'resultado-id';
      const mockRequest = { user: { id: 'user-id' } };
      const mockFiles = undefined;

      await expect(
        controller.adicionarArquivos(resultadoId, mockRequest, mockFiles)
      ).rejects.toThrow('Nenhum arquivo foi fornecido');
    });

    it('deve lançar erro quando arquivos estão vazios', async () => {
      const resultadoId = 'resultado-id';
      const mockRequest = { user: { id: 'user-id' } };
      const mockFiles = {
        provaSocial: [],
        documentacaoTecnica: [],
      };

      await expect(
        controller.adicionarArquivos(resultadoId, mockRequest, mockFiles)
      ).rejects.toThrow('Nenhum arquivo foi fornecido');
    });
  });

  describe('Validações específicas do SUAS', () => {

  });
});