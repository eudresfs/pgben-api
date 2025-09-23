import { Test, TestingModule } from '@nestjs/testing';
import { StreamableFile } from '@nestjs/common';
import { ResultadoBeneficioCessadoController } from '../controllers/resultado-beneficio-cessado.controller';
import { ResultadoBeneficioCessadoService } from '../services/resultado-beneficio-cessado.service';
import { StorageProviderFactory } from '../../documento/factories/storage-provider.factory';
import { ResultadoUploadedFiles } from '../dto/create-resultado-beneficio-cessado-with-files.dto';

// Mock dos guards e interceptors
jest.mock('../../../auth/guards/jwt-auth.guard', () => ({
  JwtAuthGuard: jest.fn().mockImplementation(() => ({
    canActivate: jest.fn(() => true),
  })),
}));

jest.mock('../../../auth/guards/permission.guard', () => ({
  PermissionGuard: jest.fn().mockImplementation(() => ({
    canActivate: jest.fn(() => true),
  })),
}));

jest.mock('../interceptors/resultado-beneficio-validation.interceptor', () => ({
  ResultadoBeneficioValidationInterceptor: jest.fn().mockImplementation(() => ({
    intercept: jest.fn((context, next) => next.handle()),
  })),
}));

jest.mock('../interceptors/resultado-file-validation.interceptor', () => ({
  ResultadoFileValidationInterceptor: jest.fn().mockImplementation(() => ({
    intercept: jest.fn((context, next) => next.handle()),
  })),
}));

jest.mock('../pipes/resultado-beneficio-validation.pipe', () => ({
  ResultadoBeneficioValidationPipe: jest.fn().mockImplementation(() => ({
    transform: jest.fn((value) => value),
  })),
}));

jest.mock('../pipes/resultado-files-validation.pipe', () => ({
  ResultadoFilesValidationPipe: jest.fn().mockImplementation(() => ({
    transform: jest.fn((value) => value),
  })),
}));

describe('ResultadoBeneficioCessadoController - Gerenciamento de Arquivos', () => {
  let controller: ResultadoBeneficioCessadoController;
  let service: ResultadoBeneficioCessadoService;
  let storageProviderFactory: StorageProviderFactory;

  const mockService = {
    downloadArquivo: jest.fn(),
    excluirArquivo: jest.fn(),
    adicionarArquivos: jest.fn(),
  };

  const mockStorageProviderFactory = {
    getProvider: jest.fn(),
  };

  const mockRequest = {
    user: { id: 'user-123' },
  };

  const mockResponse = {
    set: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultadoBeneficioCessadoController],
      providers: [
        {
          provide: ResultadoBeneficioCessadoService,
          useValue: mockService,
        },
        {
          provide: StorageProviderFactory,
          useValue: mockStorageProviderFactory,
        },
      ],
    })
    .overrideGuard(require('../../../auth/guards/jwt-auth.guard').JwtAuthGuard)
    .useValue({ canActivate: jest.fn(() => true) })
    .overrideGuard(require('../../../auth/guards/permission.guard').PermissionGuard)
    .useValue({ canActivate: jest.fn(() => true) })
    .compile();

    controller = module.get<ResultadoBeneficioCessadoController>(ResultadoBeneficioCessadoController);
    service = module.get<ResultadoBeneficioCessadoService>(ResultadoBeneficioCessadoService);
    storageProviderFactory = module.get<StorageProviderFactory>(StorageProviderFactory);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('downloadArquivo', () => {
    it('deve fazer download de um arquivo com sucesso', async () => {
      const resultadoId = 'resultado-123';
      const arquivoId = 'arquivo-123';
      const mockStream = Buffer.from('conteúdo do arquivo');
      const mockDownloadResult = {
        stream: mockStream,
        filename: 'documento.pdf',
        mimeType: 'application/pdf',
      };

      mockService.downloadArquivo.mockResolvedValue(mockDownloadResult);

      const result = await controller.downloadArquivo(resultadoId, arquivoId, mockResponse);

      expect(service.downloadArquivo).toHaveBeenCalledWith(resultadoId, arquivoId, undefined);
      expect(mockResponse.set).toHaveBeenCalledWith({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="documento.pdf"',
      });
      expect(result).toBeInstanceOf(StreamableFile);
    });

    it('deve lançar erro quando arquivo não for encontrado', async () => {
      const resultadoId = 'resultado-123';
      const arquivoId = 'arquivo-inexistente';

      mockService.downloadArquivo.mockRejectedValue(new Error('Arquivo não encontrado'));

      await expect(
        controller.downloadArquivo(resultadoId, arquivoId, mockResponse)
      ).rejects.toThrow('Arquivo não encontrado');

      expect(service.downloadArquivo).toHaveBeenCalledWith(resultadoId, arquivoId, undefined);
    });
  });

  describe('excluirArquivo', () => {
    it('deve excluir um arquivo com sucesso', async () => {
      const resultadoId = 'resultado-123';
      const arquivoId = 'arquivo-123';

      mockService.excluirArquivo.mockResolvedValue(undefined);

      const result = await controller.excluirArquivo(resultadoId, arquivoId, mockRequest);

      expect(service.excluirArquivo).toHaveBeenCalledWith(resultadoId, arquivoId, 'user-123');
      expect(result).toEqual({
        message: 'Arquivo excluído com sucesso',
        arquivoId: arquivoId,
      });
    });

    it('deve lançar erro quando arquivo não for encontrado para exclusão', async () => {
      const resultadoId = 'resultado-123';
      const arquivoId = 'arquivo-inexistente';

      mockService.excluirArquivo.mockRejectedValue(new Error('Arquivo não encontrado'));

      await expect(
        controller.excluirArquivo(resultadoId, arquivoId, mockRequest)
      ).rejects.toThrow('Arquivo não encontrado');

      expect(service.excluirArquivo).toHaveBeenCalledWith(resultadoId, arquivoId, 'user-123');
    });
  });

  describe('adicionarArquivos', () => {
    it('deve adicionar arquivos com sucesso', async () => {
      const resultadoId = 'resultado-123';
      const mockFiles: ResultadoUploadedFiles = {
        provaSocial: [
          {
            fieldname: 'provaSocial',
            originalname: 'foto.jpg',
            encoding: '7bit',
            mimetype: 'image/jpeg',
            buffer: Buffer.from('conteúdo da foto'),
            size: 1024,
          } as Express.Multer.File,
        ],
        documentacaoTecnica: [
          {
            fieldname: 'documentacaoTecnica',
            originalname: 'laudo.pdf',
            encoding: '7bit',
            mimetype: 'application/pdf',
            buffer: Buffer.from('conteúdo do laudo'),
            size: 2048,
          } as Express.Multer.File,
        ],
      };

      const mockResultado = {
        documentosComprobatorios: [
          {
            id: 'arquivo-1',
            nomeArquivo: 'foto.jpg',
            tipo: 'PROVA_SOCIAL',
            tamanhoArquivo: 1024,
          },
          {
            id: 'arquivo-2',
            nomeArquivo: 'laudo.pdf',
            tipo: 'DOCUMENTACAO_TECNICA',
            tamanhoArquivo: 2048,
          },
        ],
      };

      mockService.adicionarArquivos.mockResolvedValue(mockResultado);

      const result = await controller.adicionarArquivos(resultadoId, mockRequest, mockFiles);

      expect(service.adicionarArquivos).toHaveBeenCalledWith(
        resultadoId, 
        'user-123',
        mockFiles.provaSocial,
        mockFiles.documentacaoTecnica
      );
      expect(result).toEqual({
        message: 'Arquivos adicionados com sucesso',
        arquivosAdicionados: [
          {
            id: 'arquivo-1',
            nomeOriginal: 'foto.jpg',
            categoria: 'PROVA_SOCIAL',
            tamanho: 1024,
          },
          {
            id: 'arquivo-2',
            nomeOriginal: 'laudo.pdf',
            categoria: 'DOCUMENTACAO_TECNICA',
            tamanho: 2048,
          },
        ],
      });
    });

    it('deve lançar erro quando nenhum arquivo for fornecido', async () => {
      const resultadoId = 'resultado-123';
      const mockFiles: ResultadoUploadedFiles = {};

      await expect(
        controller.adicionarArquivos(resultadoId, mockRequest, mockFiles)
      ).rejects.toThrow('Nenhum arquivo foi fornecido');

      expect(service.adicionarArquivos).not.toHaveBeenCalled();
    });

    it('deve lançar erro quando resultado não for encontrado', async () => {
      const resultadoId = 'resultado-inexistente';
      const mockFiles: ResultadoUploadedFiles = {
        provaSocial: [
          {
            fieldname: 'provaSocial',
            originalname: 'foto.jpg',
            encoding: '7bit',
            mimetype: 'image/jpeg',
            buffer: Buffer.from('conteúdo da foto'),
            size: 1024,
          } as Express.Multer.File,
        ],
      };

      mockService.adicionarArquivos.mockRejectedValue(new Error('Resultado não encontrado'));

      await expect(
        controller.adicionarArquivos(resultadoId, mockRequest, mockFiles)
      ).rejects.toThrow('Resultado não encontrado');

      expect(service.adicionarArquivos).toHaveBeenCalledWith(
        resultadoId, 
        'user-123',
        mockFiles.provaSocial,
        undefined
      );
    });
  });
});