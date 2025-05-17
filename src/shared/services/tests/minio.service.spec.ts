import { Test, TestingModule } from '@nestjs/testing';
import { MinioService } from '../minio.service';
import { CriptografiaService } from '../criptografia.service';
import { ConfigService } from '@nestjs/config';

// Mocks para os testes
const mockCriptografiaService = {
  criptografarBuffer: jest.fn(),
  descriptografarBuffer: jest.fn(),
  gerarHash: jest.fn(),
  verificarHash: jest.fn(),
};

const mockMinioClient = {
  bucketExists: jest.fn().mockResolvedValue(true),
  makeBucket: jest.fn().mockResolvedValue(true),
};

// Mock do módulo minio
jest.mock('minio', () => ({
  Client: jest.fn().mockImplementation(() => mockMinioClient),
}));

describe('MinioService', () => {
  let service: MinioService;

  beforeEach(async () => {
    // Configura o módulo de teste
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MinioService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(
              (key: string, defaultValue?: any) =>
                ({
                  MINIO_BUCKET: 'documents',
                  MINIO_ENDPOINT: 'localhost',
                  MINIO_PORT: 9000,
                  MINIO_USE_SSL: false,
                  MINIO_ACCESS_KEY: 'minioadmin',
                  MINIO_SECRET_KEY: 'minioadmin',
                })[key] || defaultValue,
            ),
          },
        },
        {
          provide: CriptografiaService,
          useValue: mockCriptografiaService,
        },
      ],
    }).compile();

    // Obtém a instância do serviço
    service = module.get<MinioService>(MinioService);

    // Inicializa o serviço
    await service.onModuleInit();
  });

  afterEach(() => {
    // Limpa todos os mocks após cada teste
    jest.clearAllMocks();
  });

  it('deve ser definido', () => {
    // Verifica apenas se o serviço foi criado corretamente
    expect(service).toBeDefined();
  });

  describe('uploadArquivo', () => {
    beforeEach(() => {
      // Configura os mocks padrão para os testes de upload
      mockCriptografiaService.gerarHash.mockReturnValue('hash-do-arquivo');
      mockCriptografiaService.criptografarBuffer.mockReturnValue({
        dadosCriptografados: Buffer.from('conteúdo criptografado'),
        iv: Buffer.from('iv'),
        authTag: Buffer.from('authTag'),
      });
    });

    it('deve fazer upload de um arquivo não sensível sem criptografia', async () => {
      // Arrange
      const buffer = Buffer.from('conteúdo do arquivo');
      const nomeOriginal = 'documento.pdf';
      const solicitacaoId = '123';
      const tipoDocumento = 'COMPROVANTE';

      const nomeArquivo = `${solicitacaoId}/${tipoDocumento}/timestamp-random.pdf`;
      const hash = 'hash-do-arquivo';

      mockCriptografiaService.gerarHash.mockReturnValue(hash);
      mockMinioClient.putObject.mockResolvedValue({ etag: 'etag-do-arquivo' });

      // Act
      const resultado = await service.uploadArquivo(
        buffer,
        nomeOriginal,
        solicitacaoId,
        tipoDocumento,
      );

      // Assert
      expect(mockCriptografiaService.gerarHash).toHaveBeenCalledWith(buffer);
      expect(mockMinioClient.putObject).toHaveBeenCalledWith(
        'documents',
        expect.stringContaining(`${solicitacaoId}/${tipoDocumento}`),
        buffer,
        buffer.length,
        expect.objectContaining({
          'Content-Type': 'application/pdf',
          'X-Amz-Meta-Original-Name': nomeOriginal,
          'X-Amz-Meta-Hash': hash,
          'X-Amz-Meta-Encrypted': 'false',
        }),
      );

      expect(resultado).toEqual({
        nomeArquivo: expect.stringContaining(
          `${solicitacaoId}/${tipoDocumento}`,
        ),
        tamanho: buffer.length,
        hash,
        criptografado: false,
        metadados: expect.any(Object),
      });
    });

    it('deve fazer upload de um arquivo sensível com criptografia', async () => {
      // Arrange
      const buffer = Buffer.from('conteúdo do arquivo de teste');
      const nomeOriginal = 'documento-sensivel.pdf';
      const solicitacaoId = '123';
      const tipoDocumento = 'LAUDO_MEDICO'; // Usando um tipo de documento da lista de documentos sensíveis

      const hash = 'hash-do-arquivo';
      mockCriptografiaService.gerarHash.mockReturnValue(hash);

      const dadosCriptografados = Buffer.from('dados criptografados');
      const iv = Buffer.from('iv-de-teste');
      const authTag = Buffer.from('auth-tag-de-teste');
      mockCriptografiaService.criptografarBuffer.mockReturnValue({
        dadosCriptografados,
        iv,
        authTag,
      });

      const etag = 'etag-do-arquivo-criptografado';
      mockMinioClient.putObject.mockResolvedValue({ etag });

      // Act
      const resultado = await service.uploadArquivo(
        buffer,
        nomeOriginal,
        solicitacaoId,
        tipoDocumento,
      );

      // Assert
      expect(mockCriptografiaService.gerarHash).toHaveBeenCalledWith(buffer);
      expect(mockCriptografiaService.criptografarBuffer).toHaveBeenCalledWith(
        buffer,
      );
      expect(mockMinioClient.putObject).toHaveBeenCalledWith(
        'documents',
        expect.stringContaining(`${solicitacaoId}/${tipoDocumento}`),
        dadosCriptografados,
        dadosCriptografados.length,
        expect.objectContaining({
          'Content-Type': 'application/pdf',
          'X-Amz-Meta-Original-Name': nomeOriginal,
          'X-Amz-Meta-Hash': hash,
          'X-Amz-Meta-Encrypted': 'true',
          'X-Amz-Meta-IV': iv.toString('base64'),
          'X-Amz-Meta-AuthTag': authTag.toString('base64'),
        }),
      );

      expect(resultado).toEqual({
        nomeArquivo: expect.stringContaining(
          `${solicitacaoId}/${tipoDocumento}`,
        ),
        tamanho: buffer.length, // Tamanho original, não o criptografado
        hash,
        criptografado: true,
        metadados: expect.any(Object),
      });
    });
  });

  describe('downloadArquivo', () => {
    it('deve baixar um arquivo não criptografado', async () => {
      // Arrange
      const nomeArquivo = '123/comprovante/documento.pdf';
      const buffer = Buffer.from('conteúdo do arquivo de teste');
      const hash = 'hash-do-arquivo';

      // Mock do statObject
      mockMinioClient.statObject.mockResolvedValue({
        metaData: {
          'x-amz-meta-hash': hash,
          'x-amz-meta-encrypted': 'false',
          'x-amz-meta-original-name': 'documento.pdf',
          'content-type': 'application/pdf',
          'x-amz-meta-tipodocumento': 'COMPROVANTE',
          'x-amz-meta-solicitacaoid': '123',
        },
        size: buffer.length,
      });

      // Mock do fGetObject para simular o download do arquivo
      mockMinioClient.fGetObject.mockImplementation(
        (bucket, file, filePath) => {
          // Simula a criação do arquivo temporário
          fs.writeFileSync(filePath, buffer);
          return Promise.resolve();
        },
      );

      // Mock do fs.readFileSync para simular a leitura do arquivo baixado
      jest.spyOn(fs, 'readFileSync').mockReturnValue(buffer);

      // Mock do fs.unlinkSync para simular a remoção do arquivo temporário
      jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});

      mockCriptografiaService.gerarHash.mockReturnValue(hash);

      // Act
      const resultado = await service.downloadArquivo(nomeArquivo);

      // Assert
      expect(mockMinioClient.statObject).toHaveBeenCalledWith(
        'documents',
        nomeArquivo,
      );

      expect(mockMinioClient.fGetObject).toHaveBeenCalledWith(
        'documents',
        nomeArquivo,
        expect.stringContaining(
          path.join(require('os').tmpdir(), 'pgben-temp'),
        ),
      );

      expect(mockCriptografiaService.gerarHash).toHaveBeenCalledWith(buffer);

      // Verifica se o arquivo temporário foi removido
      expect(fs.unlinkSync).toHaveBeenCalled();

      expect(resultado).toEqual({
        arquivo: buffer,
        metadados: {
          nomeOriginal: 'documento.pdf',
          contentType: 'application/pdf',
          tipoDocumento: 'COMPROVANTE',
          solicitacaoId: '123',
          tamanho: buffer.length,
          criptografado: false,
        },
      });
    });

    it('deve baixar e descriptografar um arquivo criptografado', async () => {
      // Arrange
      const nomeArquivo = '123/laudo-medico/documento-sensivel.pdf';
      const bufferCriptografado = Buffer.from('conteúdo criptografado');
      const bufferDescriptografado = Buffer.from('conteúdo original');
      const hash = 'hash-do-arquivo';
      const iv = 'aXYtZGUtdGVzdGU=';
      const authTag = 'YXV0aC10YWctZGUtdGVzdGU=';

      // Mock do statObject
      mockMinioClient.statObject.mockResolvedValue({
        metaData: {
          'x-amz-meta-hash': hash,
          'x-amz-meta-encrypted': 'true',
          'x-amz-meta-iv': iv,
          'x-amz-meta-authtag': authTag,
          'x-amz-meta-original-name': 'documento-sensivel.pdf',
          'content-type': 'application/pdf',
        },
        size: bufferCriptografado.length,
      });

      // Mock do fGetObject para simular o download do arquivo
      mockMinioClient.fGetObject.mockImplementation((bucket, file, path) => {
        // Simula a criação do arquivo temporário
        fs.writeFileSync(path, bufferCriptografado);
        return Promise.resolve();
      });

      // Mock do fs.readFileSync para simular a leitura do arquivo baixado
      jest.spyOn(fs, 'readFileSync').mockReturnValue(bufferCriptografado);

      mockCriptografiaService.descriptografarBuffer.mockReturnValue(
        bufferDescriptografado,
      );
      mockCriptografiaService.gerarHash.mockReturnValue(hash);

      // Act
      const resultado = await service.downloadArquivo(nomeArquivo);

      // Assert
      expect(mockMinioClient.statObject).toHaveBeenCalledWith(
        'documents',
        nomeArquivo,
      );

      expect(mockMinioClient.fGetObject).toHaveBeenCalledWith(
        'documents',
        nomeArquivo,
        expect.any(String),
      );

      expect(
        mockCriptografiaService.descriptografarBuffer,
      ).toHaveBeenCalledWith(
        bufferCriptografado,
        Buffer.from(iv, 'base64'),
        Buffer.from(authTag, 'base64'),
      );

      expect(mockCriptografiaService.gerarHash).toHaveBeenCalledWith(
        bufferDescriptografado,
      );

      expect(resultado).toEqual({
        arquivo: bufferDescriptografado,
        metadados: {
          nomeOriginal: 'documento-sensivel.pdf',
          contentType: 'application/pdf',
          tamanho: bufferDescriptografado.length,
          criptografado: true,
        },
      });
    });

    it('deve lançar erro quando a integridade do arquivo é comprometida', async () => {
      // Arrange
      const nomeArquivo = '123/comprovante/documento.pdf';
      const buffer = Buffer.from('conteúdo do arquivo de teste');
      const hashCorreto = 'hash-correto';
      const hashIncorreto = 'hash-incorreto';

      // Mock do statObject
      mockMinioClient.statObject.mockResolvedValue({
        metaData: {
          'x-amz-meta-hash': hashCorreto,
          'x-amz-meta-encrypted': 'false',
          'x-amz-meta-original-name': 'documento.pdf',
          'content-type': 'application/pdf',
        },
        size: buffer.length,
      });

      // Mock do fGetObject para simular o download do arquivo
      mockMinioClient.fGetObject.mockImplementation((bucket, file, path) => {
        // Simula a criação do arquivo temporário
        fs.writeFileSync(path, buffer);
        return Promise.resolve();
      });

      // Mock do fs.readFileSync para simular a leitura do arquivo baixado
      jest.spyOn(fs, 'readFileSync').mockReturnValue(buffer);

      // Configurar o mock para retornar um hash diferente do esperado
      mockCriptografiaService.gerarHash.mockReturnValue(hashIncorreto);

      // Act & Assert
      await expect(service.downloadArquivo(nomeArquivo)).rejects.toThrow(
        /A integridade do documento foi comprometida/,
      );
    });
  });

  describe('removerArquivo', () => {
    it('deve remover um arquivo do MinIO', async () => {
      // Arrange
      const nomeArquivo = '123/comprovante/documento.pdf';
      mockMinioClient.removeObject.mockResolvedValue(true);

      // Act
      await service.removerArquivo(nomeArquivo);

      // Assert
      expect(mockMinioClient.removeObject).toHaveBeenCalledWith(
        'documents',
        nomeArquivo,
      );
    });

    it('deve lançar erro ao tentar remover um arquivo que não existe', async () => {
      // Arrange
      const nomeArquivo = '123/comprovante/inexistente.pdf';
      const error = new Error('Arquivo não encontrado');
      mockMinioClient.removeObject.mockRejectedValue(error);

      // Act & Assert
      await expect(service.removerArquivo(nomeArquivo)).rejects.toThrow(
        `Erro ao remover o arquivo ${nomeArquivo}: ${error.message}`,
      );
    });

    it('deve verificar se o bucket existe antes de remover', async () => {
      // Arrange
      const nomeArquivo = '123/comprovante/documento.pdf';
      mockMinioClient.bucketExists.mockResolvedValue(true);
      mockMinioClient.removeObject.mockResolvedValue(true);

      // Act
      await service.removerArquivo(nomeArquivo);

      // Assert
      expect(mockMinioClient.bucketExists).toHaveBeenCalledWith('documents');
    });

    it('deve criar o bucket se não existir ao tentar remover', async () => {
      // Arrange
      const nomeArquivo = '123/comprovante/documento.pdf';
      mockMinioClient.bucketExists.mockResolvedValue(false);
      mockMinioClient.makeBucket.mockResolvedValue(true);
      mockMinioClient.removeObject.mockResolvedValue(true);

      // Act
      await service.removerArquivo(nomeArquivo);

      // Assert
      expect(mockMinioClient.makeBucket).toHaveBeenCalledWith(
        'documents',
        'us-east-1',
      );
    });
  });

  describe('validação de parâmetros', () => {
    it('deve lançar erro ao tentar fazer upload sem buffer', async () => {
      // Arrange
      const buffer = undefined as unknown as Buffer;
      const nomeOriginal = 'documento.pdf';
      const solicitacaoId = '123';
      const tipoDocumento = 'COMPROVANTE';

      // Act & Assert
      await expect(
        service.uploadArquivo(
          buffer,
          nomeOriginal,
          solicitacaoId,
          tipoDocumento,
        ),
      ).rejects.toThrow(
        "Falha ao armazenar documento: Cannot read properties of undefined (reading 'length')",
      );
    });

    it('deve fazer upload com sucesso mesmo sem nome de arquivo', async () => {
      // Arrange
      const buffer = Buffer.from('conteúdo do arquivo');
      const nomeOriginal = '';
      const solicitacaoId = '123';
      const tipoDocumento = 'COMPROVANTE';

      mockMinioClient.putObject.mockResolvedValue({ etag: 'etag-do-arquivo' });

      // Act
      const resultado = await service.uploadArquivo(
        buffer,
        nomeOriginal,
        solicitacaoId,
        tipoDocumento,
      );

      // Assert
      expect(resultado).toBeDefined();
      expect(resultado.nomeArquivo).toContain(solicitacaoId);
      expect(resultado.nomeArquivo).toContain(tipoDocumento);
      expect(resultado.metadados.nomeOriginal).toBe(nomeOriginal);
    });

    it('deve fazer upload com sucesso mesmo sem ID da solicitação', async () => {
      // Arrange
      const buffer = Buffer.from('conteúdo do arquivo');
      const nomeOriginal = 'documento.pdf';
      const solicitacaoId = '';
      const tipoDocumento = 'COMPROVANTE';

      mockMinioClient.putObject.mockResolvedValue({ etag: 'etag-do-arquivo' });

      // Act
      const resultado = await service.uploadArquivo(
        buffer,
        nomeOriginal,
        solicitacaoId,
        tipoDocumento,
      );

      // Assert
      expect(resultado).toBeDefined();
      expect(resultado.nomeArquivo).toContain(tipoDocumento);
      expect(resultado.metadados.solicitacaoId).toBe(solicitacaoId);
    });

    it('deve fazer upload com sucesso mesmo sem tipo de documento', async () => {
      // Arrange
      const buffer = Buffer.from('conteúdo do arquivo');
      const nomeOriginal = 'documento.pdf';
      const solicitacaoId = '123';
      const tipoDocumento = '';

      mockMinioClient.putObject.mockResolvedValue({ etag: 'etag-do-arquivo' });

      // Act
      const resultado = await service.uploadArquivo(
        buffer,
        nomeOriginal,
        solicitacaoId,
        tipoDocumento,
      );

      // Assert
      expect(resultado).toBeDefined();
      expect(resultado.nomeArquivo).toContain(solicitacaoId);
      expect(resultado.metadados.tipoDocumento).toBe(tipoDocumento);
    });
  });

  describe('tratamentoDeErros', () => {
    it('deve lançar erro quando o upload falhar', async () => {
      // Arrange
      const buffer = Buffer.from('conteúdo do arquivo');
      const nomeOriginal = 'documento.pdf';
      const error = new Error('Falha no upload');
      mockMinioClient.putObject.mockRejectedValue(error);

      // Act & Assert
      await expect(
        service.uploadArquivo(buffer, nomeOriginal, '123', 'COMPROVANTE'),
      ).rejects.toThrow(`Falha ao armazenar documento: ${error.message}`);

      // Verifica se o logger foi chamado corretamente
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        `Erro ao enviar arquivo para o MinIO: ${error.message}`,
      );
    });

    it('deve lançar erro quando o download falhar', async () => {
      // Arrange
      const nomeArquivo = '123/comprovante/inexistente.pdf';
      const error = new Error('Arquivo não encontrado');
      mockMinioClient.getObject.mockImplementation(() => {
        throw error;
      });

      // Act & Assert
      await expect(service.downloadArquivo(nomeArquivo)).rejects.toThrow(
        `Erro ao baixar o arquivo ${nomeArquivo}: ${error.message}`,
      );
    });

    it('deve lançar erro ao gerar URL pré-assinada para arquivo inexistente', async () => {
      // Arrange
      const nomeArquivo = '123/comprovante/inexistente.pdf';
      const error = new Error('Arquivo não encontrado');
      mockMinioClient.statObject.mockRejectedValue(error);

      // Act & Assert
      await expect(service.gerarUrlPreAssinada(nomeArquivo)).rejects.toThrow(
        `Erro ao gerar URL pré-assinada para ${nomeArquivo}: ${error.message}`,
      );
    });
  });

  describe('gerarUrlPreAssinada', () => {
    it('deve gerar uma URL pré-assinada para acesso temporário', async () => {
      // Arrange
      const nomeArquivo = '123/comprovante/documento.pdf';
      const expiracao = 3600; // 1 hora
      const url =
        'https://minio.exemplo.com/pgben-documentos/123/comprovante/documento.pdf?token=xyz';

      mockMinioClient.presignedGetObject.mockResolvedValue(url);

      // Act
      const resultado = await service.gerarUrlPreAssinada(
        nomeArquivo,
        expiracao,
      );

      // Assert
      expect(mockMinioClient.presignedGetObject).toHaveBeenCalledWith(
        'documents',
        nomeArquivo,
        expiracao,
      );

      expect(resultado).toEqual(url);
    });
  });
});
