import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import { IntegracaoDocumentoService } from '../../services/integracao-documento.service';
import { NotFoundException } from '@nestjs/common';

/**
 * Testes unitários para o serviço de integração com o módulo de documentos
 *
 * Verifica o funcionamento correto das operações de armazenamento e
 * recuperação de comprovantes de pagamento.
 *
 * @author Equipe PGBen
 */
describe('IntegracaoDocumentoService', () => {
  let service: IntegracaoDocumentoService;
  let httpService: HttpService;
  let configService: ConfigService;

  // Mock do HttpService
  const mockHttpService = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  };

  // Mock do ConfigService
  const mockConfigService = {
    get: jest.fn().mockImplementation((key) => {
      if (key === 'documento.apiUrl') {
        return 'http://api-documento.pgben.local';
      }
      if (key === 'documento.apiKey') {
        return 'api-key-mock';
      }
      if (key === 'documento.categoriaComprovante') {
        return 'COMPROVANTE_PAGAMENTO';
      }
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegracaoDocumentoService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<IntegracaoDocumentoService>(
      IntegracaoDocumentoService,
    );
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);

    // Limpar mocks antes de cada teste
    jest.clearAllMocks();
  });

  describe('uploadComprovante', () => {
    const pagamentoId = 'pagamento-id';
    const usuarioId = 'usuario-id';
    const arquivo = {
      originalname: 'comprovante.pdf',
      mimetype: 'application/pdf',
      buffer: Buffer.from('conteúdo do arquivo'),
      size: 1024,
    } as any;

    const mockResposta = {
      id: 'documento-id',
      nome: 'comprovante.pdf',
      tamanho: 1024,
      tipo: 'application/pdf',
      categoria: 'COMPROVANTE_PAGAMENTO',
      referencia: pagamentoId,
      url: 'http://api-documento.pgben.local/documentos/documento-id',
      createdAt: '2023-01-01T00:00:00Z',
    };

    it('deve fazer upload de comprovante com sucesso', async () => {
      // Configurar mock da resposta HTTP
      const axiosResponse: AxiosResponse = {
        data: mockResposta,
        status: 201,
        statusText: 'Created',
        headers: {},
        config: { headers: {} } as any,
      };

      mockHttpService.post.mockReturnValue(of(axiosResponse));

      // Executar método
      const result = await service.uploadComprovante(
        pagamentoId,
        arquivo,
        usuarioId,
      );

      // Verificar resultado
      expect(result).toEqual(mockResposta);
      expect(mockHttpService.post).toHaveBeenCalledWith(
        'http://api-documento.pgben.local/documentos',
        expect.any(FormData),
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-api-key': 'api-key-mock',
            'Content-Type': expect.stringContaining('multipart/form-data'),
          }),
        }),
      );
    });

    it('deve propagar erros HTTP durante o upload', async () => {
      // Configurar mock do erro HTTP
      mockHttpService.post.mockReturnValue(
        throwError(() => ({
          response: {
            status: 500,
            data: { message: 'Erro interno do servidor' },
          },
        })),
      );

      // Executar e verificar exceção
      await expect(
        service.uploadComprovante(pagamentoId, arquivo, usuarioId),
      ).rejects.toThrow();
    });
  });

  describe('obterComprovante', () => {
    const documentoId = 'documento-id';

    const mockDocumento = {
      id: documentoId,
      nome: 'comprovante.pdf',
      tamanho: 1024,
      tipo: 'application/pdf',
      categoria: 'COMPROVANTE_PAGAMENTO',
      referencia: 'pagamento-id',
      url: 'http://api-documento.pgben.local/documentos/documento-id',
      createdAt: '2023-01-01T00:00:00Z',
    };

    it('deve obter documento quando encontrado', async () => {
      // Configurar mock da resposta HTTP
      const axiosResponse: AxiosResponse = {
        data: mockDocumento,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} } as any,
      };

      mockHttpService.get.mockReturnValue(of(axiosResponse));

      // Executar método
      const result = await service.obterComprovante(documentoId);

      // Verificar resultado
      expect(result).toEqual(mockDocumento);
      expect(mockHttpService.get).toHaveBeenCalledWith(
        `http://api-documento.pgben.local/documentos/${documentoId}`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-api-key': 'api-key-mock',
          }),
        }),
      );
    });

    it('deve lançar NotFoundException quando documento não encontrado', async () => {
      // Configurar mock do erro HTTP
      mockHttpService.get.mockReturnValue(
        throwError(() => ({
          response: {
            status: 404,
            data: { message: 'Documento não encontrado' },
          },
        })),
      );

      // Executar e verificar exceção
      await expect(service.obterComprovante(documentoId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('listarComprovantes', () => {
    const pagamentoId = 'pagamento-id';

    const mockComprovantes = [
      {
        id: 'documento-1',
        nome: 'comprovante1.pdf',
        tamanho: 1024,
        tipo: 'application/pdf',
        categoria: 'COMPROVANTE_PAGAMENTO',
        referencia: pagamentoId,
        url: 'http://api-documento.pgben.local/documentos/documento-1',
        createdAt: '2023-01-01T00:00:00Z',
      },
      {
        id: 'documento-2',
        nome: 'comprovante2.pdf',
        tamanho: 2048,
        tipo: 'application/pdf',
        categoria: 'COMPROVANTE_PAGAMENTO',
        referencia: pagamentoId,
        url: 'http://api-documento.pgben.local/documentos/documento-2',
        createdAt: '2023-01-02T00:00:00Z',
      },
    ];

    it('deve listar comprovantes quando encontrados', async () => {
      // Configurar mock da resposta HTTP
      const axiosResponse: AxiosResponse = {
        data: mockComprovantes,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} } as any,
      };

      mockHttpService.get.mockReturnValue(of(axiosResponse));

      // Executar método
      const result = await service.listarComprovantes(pagamentoId);

      // Verificar resultado
      expect(result).toEqual(mockComprovantes);
      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.stringContaining(`referencia=${pagamentoId}`),
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-api-key': 'api-key-mock',
          }),
        }),
      );
    });

    it('deve retornar array vazio quando não há comprovantes', async () => {
      // Configurar mock da resposta HTTP com array vazio
      const axiosResponse: AxiosResponse = {
        data: [],
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} } as any,
      };

      mockHttpService.get.mockReturnValue(of(axiosResponse));

      // Executar método
      const result = await service.listarComprovantes(pagamentoId);

      // Verificar resultado
      expect(result).toEqual([]);
    });
  });

  describe('removerComprovante', () => {
    const documentoId = 'documento-id';
    const usuarioId = 'usuario-id';

    it('deve remover comprovante com sucesso', async () => {
      // Configurar mock da resposta HTTP
      const axiosResponse: AxiosResponse = {
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} } as any,
      };

      mockHttpService.delete.mockReturnValue(of(axiosResponse));

      // Executar método
      await service.removerComprovante(documentoId, usuarioId);

      // Verificar resultado
      expect(mockHttpService.delete).toHaveBeenCalledWith(
        `http://api-documento.pgben.local/documentos/${documentoId}`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-api-key': 'api-key-mock',
            'x-user-id': usuarioId,
          }),
        }),
      );
    });

    it('deve lançar NotFoundException quando documento não encontrado', async () => {
      // Configurar mock do erro HTTP
      mockHttpService.delete.mockReturnValue(
        throwError(() => ({
          response: {
            status: 404,
            data: { message: 'Documento não encontrado' },
          },
        })),
      );

      // Executar e verificar exceção
      await expect(
        service.removerComprovante(documentoId, usuarioId),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve propagar outros erros HTTP', async () => {
      // Configurar mock do erro HTTP
      mockHttpService.delete.mockReturnValue(
        throwError(() => ({
          response: {
            status: 500,
            data: { message: 'Erro interno do servidor' },
          },
        })),
      );

      // Executar e verificar exceção
      await expect(
        service.removerComprovante(documentoId, usuarioId),
      ).rejects.toThrow();
    });
  });
});
