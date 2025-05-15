import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MinioService } from '../../../../src/modules/minio/services/minio.service';
import { CriptografiaService } from '../../../../src/modules/criptografia/services/criptografia.service';

describe('MinioService', () => {
  let service: MinioService;
  let criptografiaService: CriptografiaService;
  let mockMinioClient: any;

  beforeEach(async () => {
    mockMinioClient = {
      bucketExists: jest.fn().mockResolvedValue(true),
      makeBucket: jest.fn().mockResolvedValue(undefined),
      putObject: jest.fn().mockResolvedValue({ etag: 'mock-etag' }),
      getObject: jest.fn().mockImplementation(() => {
        const stream = require('stream');
        const readable = new stream.Readable();
        readable._read = () => {};
        readable.push(Buffer.from('conteúdo do arquivo'));
        readable.push(null);
        return readable;
      }),
      statObject: jest.fn().mockResolvedValue({
        size: 100,
        etag: 'mock-etag',
        lastModified: new Date(),
        metaData: { 'content-type': 'application/pdf' }
      }),
      removeObject: jest.fn().mockResolvedValue(undefined),
      listObjects: jest.fn().mockImplementation(() => {
        const stream = require('stream');
        const readable = new stream.Readable({ objectMode: true });
        readable._read = () => {};
        readable.push({ name: 'arquivo1.pdf', size: 100, lastModified: new Date() });
        readable.push({ name: 'arquivo2.pdf', size: 200, lastModified: new Date() });
        readable.push(null);
        return readable;
      }),
      presignedGetObject: jest.fn().mockResolvedValue('https://minio.exemplo.com/bucket/arquivo.pdf'),
      presignedPutObject: jest.fn().mockResolvedValue('https://minio.exemplo.com/bucket/upload-arquivo.pdf')
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
      ],
      providers: [
        MinioService,
        {
          provide: CriptografiaService,
          useValue: {
            criptografarArquivo: jest.fn().mockImplementation(buffer => Buffer.from(`criptografado:${buffer.toString()}`)),
            descriptografarArquivo: jest.fn().mockImplementation(buffer => {
              const str = buffer.toString();
              return Buffer.from(str.replace('criptografado:', ''));
            }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'MINIO_ENDPOINT') return 'localhost';
              if (key === 'MINIO_PORT') return 9000;
              if (key === 'MINIO_ACCESS_KEY') return 'minioadmin';
              if (key === 'MINIO_SECRET_KEY') return 'minioadmin';
              if (key === 'MINIO_DEFAULT_BUCKET') return 'pgben-documentos';
              if (key === 'MINIO_USE_SSL') return false;
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<MinioService>(MinioService);
    criptografiaService = module.get<CriptografiaService>(CriptografiaService);
    
    // Substitui o cliente Minio real pelo mock
    service['minioClient'] = mockMinioClient;
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  describe('inicializarBucket', () => {
    it('deve verificar se o bucket existe e não criar se já existir', async () => {
      await service.inicializarBucket();
      
      expect(mockMinioClient.bucketExists).toHaveBeenCalledWith('pgben-documentos');
      expect(mockMinioClient.makeBucket).not.toHaveBeenCalled();
    });

    it('deve criar o bucket se não existir', async () => {
      mockMinioClient.bucketExists.mockResolvedValueOnce(false);
      
      await service.inicializarBucket();
      
      expect(mockMinioClient.bucketExists).toHaveBeenCalledWith('pgben-documentos');
      expect(mockMinioClient.makeBucket).toHaveBeenCalledWith('pgben-documentos', 'us-east-1');
    });
  });

  describe('uploadArquivo', () => {
    it('deve fazer upload de um arquivo com criptografia', async () => {
      const buffer = Buffer.from('conteúdo do arquivo');
      const nomeArquivo = 'documento.pdf';
      const bucket = 'pgben-documentos';
      const contentType = 'application/pdf';
      const metadados = { usuario_id: '123', entidade_id: '456' };
      const criptografar = true;
      
      await service.uploadArquivo(buffer, nomeArquivo, bucket, contentType, metadados, criptografar);
      
      expect(criptografiaService.criptografarArquivo).toHaveBeenCalledWith(buffer);
      expect(mockMinioClient.putObject).toHaveBeenCalledWith(
        bucket,
        nomeArquivo,
        expect.any(Buffer),
        expect.any(Number),
        expect.objectContaining({
          'Content-Type': contentType,
          'usuario_id': '123',
          'entidade_id': '456',
          'criptografado': 'true'
        })
      );
    });

    it('deve fazer upload de um arquivo sem criptografia quando solicitado', async () => {
      const buffer = Buffer.from('conteúdo do arquivo');
      const nomeArquivo = 'documento.pdf';
      const bucket = 'pgben-documentos';
      const contentType = 'application/pdf';
      const metadados = { usuario_id: '123', entidade_id: '456' };
      const criptografar = false;
      
      await service.uploadArquivo(buffer, nomeArquivo, bucket, contentType, metadados, criptografar);
      
      expect(criptografiaService.criptografarArquivo).not.toHaveBeenCalled();
      expect(mockMinioClient.putObject).toHaveBeenCalledWith(
        bucket,
        nomeArquivo,
        buffer,
        buffer.length,
        expect.objectContaining({
          'Content-Type': contentType,
          'usuario_id': '123',
          'entidade_id': '456',
          'criptografado': 'false'
        })
      );
    });

    it('deve usar o bucket padrão quando não especificado', async () => {
      const buffer = Buffer.from('conteúdo do arquivo');
      const nomeArquivo = 'documento.pdf';
      const contentType = 'application/pdf';
      
      await service.uploadArquivo(buffer, nomeArquivo, null, contentType);
      
      expect(mockMinioClient.putObject).toHaveBeenCalledWith(
        'pgben-documentos',
        nomeArquivo,
        expect.any(Buffer),
        expect.any(Number),
        expect.any(Object)
      );
    });
  });

  describe('downloadArquivo', () => {
    it('deve baixar e descriptografar um arquivo criptografado', async () => {
      mockMinioClient.statObject.mockResolvedValueOnce({
        metaData: { 'content-type': 'application/pdf', 'criptografado': 'true' }
      });
      
      const nomeArquivo = 'documento.pdf';
      const bucket = 'pgben-documentos';
      
      const resultado = await service.downloadArquivo(nomeArquivo, bucket);
      
      expect(mockMinioClient.getObject).toHaveBeenCalledWith(bucket, nomeArquivo);
      expect(criptografiaService.descriptografarArquivo).toHaveBeenCalled();
      expect(resultado.buffer).toBeDefined();
      expect(resultado.contentType).toBe('application/pdf');
    });

    it('deve baixar sem descriptografar um arquivo não criptografado', async () => {
      mockMinioClient.statObject.mockResolvedValueOnce({
        metaData: { 'content-type': 'application/pdf', 'criptografado': 'false' }
      });
      
      const nomeArquivo = 'documento.pdf';
      const bucket = 'pgben-documentos';
      
      const resultado = await service.downloadArquivo(nomeArquivo, bucket);
      
      expect(mockMinioClient.getObject).toHaveBeenCalledWith(bucket, nomeArquivo);
      expect(criptografiaService.descriptografarArquivo).not.toHaveBeenCalled();
      expect(resultado.buffer).toBeDefined();
      expect(resultado.contentType).toBe('application/pdf');
    });

    it('deve usar o bucket padrão quando não especificado', async () => {
      mockMinioClient.statObject.mockResolvedValueOnce({
        metaData: { 'content-type': 'application/pdf', 'criptografado': 'false' }
      });
      
      const nomeArquivo = 'documento.pdf';
      
      await service.downloadArquivo(nomeArquivo);
      
      expect(mockMinioClient.getObject).toHaveBeenCalledWith('pgben-documentos', nomeArquivo);
    });
  });

  describe('removerArquivo', () => {
    it('deve remover um arquivo do bucket', async () => {
      const nomeArquivo = 'documento.pdf';
      const bucket = 'pgben-documentos';
      
      await service.removerArquivo(nomeArquivo, bucket);
      
      expect(mockMinioClient.removeObject).toHaveBeenCalledWith(bucket, nomeArquivo);
    });

    it('deve usar o bucket padrão quando não especificado', async () => {
      const nomeArquivo = 'documento.pdf';
      
      await service.removerArquivo(nomeArquivo);
      
      expect(mockMinioClient.removeObject).toHaveBeenCalledWith('pgben-documentos', nomeArquivo);
    });
  });

  describe('listarArquivos', () => {
    it('deve listar arquivos de um bucket', async () => {
      const bucket = 'pgben-documentos';
      const prefix = 'usuario/123/';
      
      const resultado = await service.listarArquivos(bucket, prefix);
      
      expect(mockMinioClient.listObjects).toHaveBeenCalledWith(bucket, prefix, true);
      expect(resultado).toHaveLength(2);
      expect(resultado[0].nome).toBe('arquivo1.pdf');
      expect(resultado[1].nome).toBe('arquivo2.pdf');
    });

    it('deve usar o bucket padrão quando não especificado', async () => {
      const prefix = 'usuario/123/';
      
      await service.listarArquivos(null, prefix);
      
      expect(mockMinioClient.listObjects).toHaveBeenCalledWith('pgben-documentos', prefix, true);
    });
  });

  describe('gerarUrlDownload', () => {
    it('deve gerar uma URL de download temporária', async () => {
      const nomeArquivo = 'documento.pdf';
      const bucket = 'pgben-documentos';
      const expiracaoSegundos = 300;
      
      const url = await service.gerarUrlDownload(nomeArquivo, bucket, expiracaoSegundos);
      
      expect(mockMinioClient.presignedGetObject).toHaveBeenCalledWith(bucket, nomeArquivo, expiracaoSegundos);
      expect(url).toBe('https://minio.exemplo.com/bucket/arquivo.pdf');
    });

    it('deve usar o bucket padrão quando não especificado', async () => {
      const nomeArquivo = 'documento.pdf';
      
      await service.gerarUrlDownload(nomeArquivo);
      
      expect(mockMinioClient.presignedGetObject).toHaveBeenCalledWith('pgben-documentos', nomeArquivo, 60);
    });
  });

  describe('gerarUrlUpload', () => {
    it('deve gerar uma URL de upload temporária', async () => {
      const nomeArquivo = 'documento.pdf';
      const bucket = 'pgben-documentos';
      const expiracaoSegundos = 300;
      
      const url = await service.gerarUrlUpload(nomeArquivo, bucket, expiracaoSegundos);
      
      expect(mockMinioClient.presignedPutObject).toHaveBeenCalledWith(bucket, nomeArquivo, expiracaoSegundos);
      expect(url).toBe('https://minio.exemplo.com/bucket/upload-arquivo.pdf');
    });

    it('deve usar o bucket padrão quando não especificado', async () => {
      const nomeArquivo = 'documento.pdf';
      
      await service.gerarUrlUpload(nomeArquivo);
      
      expect(mockMinioClient.presignedPutObject).toHaveBeenCalledWith('pgben-documentos', nomeArquivo, 60);
    });
  });
});
