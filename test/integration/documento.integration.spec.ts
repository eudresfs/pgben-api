import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Documento } from '../../src/modules/documento/entities/documento.entity';
import { JwtService } from '@nestjs/jwt';
import { MinioService } from '../../src/shared/services/minio.service';

describe('Documento (Integração)', () => {
  let app: INestApplication;
  let documentoRepository: Repository<Documento>;
  let jwtService: JwtService;
  let minioService: MinioService;
  let authToken: string;

  // Mock do MinioService para evitar chamadas reais ao MinIO
  const mockMinioService = {
    uploadArquivo: jest.fn(),
    downloadArquivo: jest.fn(),
    removerArquivo: jest.fn(),
    gerarUrlPresigned: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MinioService)
      .useValue(mockMinioService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    documentoRepository = moduleFixture.get<Repository<Documento>>(
      getRepositoryToken(Documento),
    );
    jwtService = moduleFixture.get<JwtService>(JwtService);

    // Gerar token de autenticação para testes
    authToken = jwtService.sign({
      id: 'test-user-id',
      nome: 'Usuário de Teste',
      email: 'teste@exemplo.com',
      roles: ['admin'],
    });
  });

  beforeEach(async () => {
    // Limpar documentos antes de cada teste
    await documentoRepository.clear();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Upload de documentos', () => {
    it('deve permitir upload de documento não sensível', async () => {
      // Arrange
      const mockFile = Buffer.from('conteúdo do arquivo de teste');
      const mockUploadResult = {
        nomeArquivo: 'solicitacao-123/comprovante/documento-123.pdf',
        tamanho: mockFile.length,
        hash: 'hash-do-arquivo',
        criptografado: false,
        etag: 'etag-do-arquivo',
      };

      mockMinioService.uploadArquivo.mockResolvedValue(mockUploadResult);

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/documentos/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('solicitacao_id', 'solicitacao-123')
        .field('tipo_documento', 'comprovante')
        .field('descricao', 'Comprovante de residência')
        .field('sensivel', 'false')
        .attach('arquivo', mockFile, 'documento.pdf')
        .expect(201);

      // Assert
      expect(mockMinioService.uploadArquivo).toHaveBeenCalledWith(
        expect.any(Buffer),
        'documento.pdf',
        'solicitacao-123',
        'comprovante',
        false,
      );

      expect(response.body).toEqual(
        expect.objectContaining({
          nome_arquivo: mockUploadResult.nomeArquivo,
          tamanho: mockUploadResult.tamanho,
          hash: mockUploadResult.hash,
          criptografado: false,
        }),
      );

      const savedDocumento = await documentoRepository.findOne({
        where: { nome_arquivo: mockUploadResult.nomeArquivo },
      });
      expect(savedDocumento).toBeDefined();
      expect(savedDocumento.criptografado).toBe(false);
    });

    it('deve permitir upload de documento sensível com criptografia', async () => {
      // Arrange
      const mockFile = Buffer.from('conteúdo do arquivo sensível');
      const mockUploadResult = {
        nomeArquivo: 'solicitacao-123/laudo/documento-123.pdf',
        tamanho: mockFile.length,
        hash: 'hash-do-arquivo-sensivel',
        criptografado: true,
        etag: 'etag-do-arquivo-sensivel',
        iv: 'iv-base64',
        authTag: 'auth-tag-base64',
      };

      mockMinioService.uploadArquivo.mockResolvedValue(mockUploadResult);

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/documentos/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('solicitacao_id', 'solicitacao-123')
        .field('tipo_documento', 'laudo')
        .field('descricao', 'Laudo médico')
        .field('sensivel', 'true')
        .attach('arquivo', mockFile, 'laudo.pdf')
        .expect(201);

      // Assert
      expect(mockMinioService.uploadArquivo).toHaveBeenCalledWith(
        expect.any(Buffer),
        'laudo.pdf',
        'solicitacao-123',
        'laudo',
        true,
      );

      expect(response.body).toEqual(
        expect.objectContaining({
          nome_arquivo: mockUploadResult.nomeArquivo,
          tamanho: mockUploadResult.tamanho,
          hash: mockUploadResult.hash,
          criptografado: true,
          iv: mockUploadResult.iv,
          auth_tag: mockUploadResult.authTag,
        }),
      );

      const savedDocumento = await documentoRepository.findOne({
        where: { nome_arquivo: mockUploadResult.nomeArquivo },
      });
      expect(savedDocumento).toBeDefined();
      expect(savedDocumento.criptografado).toBe(true);
      expect(savedDocumento.iv).toBe(mockUploadResult.iv);
      expect(savedDocumento.auth_tag).toBe(mockUploadResult.authTag);
    });
  });

  describe('Download de documentos', () => {
    it('deve permitir download de documento não sensível', async () => {
      // Arrange
      const documento = documentoRepository.create({
        nome_arquivo: 'solicitacao-123/comprovante/documento-123.pdf',
        nome_original: 'comprovante.pdf',
        tipo_documento: 'comprovante',
        descricao: 'Comprovante de residência',
        solicitacao_id: 'solicitacao-123',
        tamanho: 1024,
        hash: 'hash-do-arquivo',
        criptografado: false,
        usuario_id: 'test-user-id',
      });
      await documentoRepository.save(documento);

      const mockDownloadResult = {
        buffer: Buffer.from('conteúdo do arquivo de teste'),
        nomeOriginal: 'comprovante.pdf',
        tamanho: 1024,
        criptografado: false,
      };

      mockMinioService.downloadArquivo.mockResolvedValue(mockDownloadResult);

      // Act
      const response = await request(app.getHttpServer())
        .get(`/api/documentos/download/${documento.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(mockMinioService.downloadArquivo).toHaveBeenCalledWith(
        documento.nome_arquivo,
      );

      expect(response.headers['content-disposition']).toContain(
        'attachment; filename="comprovante.pdf"',
      );
      expect(response.headers['content-type']).toContain('application/pdf');
      expect(response.body).toEqual(expect.any(Buffer));
    });

    it('deve permitir download de documento sensível criptografado', async () => {
      // Arrange
      const documento = documentoRepository.create({
        nome_arquivo: 'solicitacao-123/laudo/documento-123.pdf',
        nome_original: 'laudo.pdf',
        tipo_documento: 'laudo',
        descricao: 'Laudo médico',
        solicitacao_id: 'solicitacao-123',
        tamanho: 1024,
        hash: 'hash-do-arquivo-sensivel',
        criptografado: true,
        iv: 'iv-base64',
        auth_tag: 'auth-tag-base64',
        usuario_id: 'test-user-id',
      });
      await documentoRepository.save(documento);

      const mockDownloadResult = {
        buffer: Buffer.from('conteúdo descriptografado do arquivo sensível'),
        nomeOriginal: 'laudo.pdf',
        tamanho: 1024,
        criptografado: true,
      };

      mockMinioService.downloadArquivo.mockResolvedValue(mockDownloadResult);

      // Act
      const response = await request(app.getHttpServer())
        .get(`/api/documentos/download/${documento.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(mockMinioService.downloadArquivo).toHaveBeenCalledWith(
        documento.nome_arquivo,
      );

      expect(response.headers['content-disposition']).toContain(
        'attachment; filename="laudo.pdf"',
      );
      expect(response.headers['content-type']).toContain('application/pdf');
      expect(response.body).toEqual(expect.any(Buffer));
    });
  });

  describe('Listagem de documentos', () => {
    it('deve listar documentos por solicitação', async () => {
      // Arrange
      const documentos = [
        documentoRepository.create({
          nome_arquivo: 'solicitacao-123/comprovante/documento-1.pdf',
          nome_original: 'comprovante.pdf',
          tipo_documento: 'comprovante',
          descricao: 'Comprovante de residência',
          solicitacao_id: 'solicitacao-123',
          tamanho: 1024,
          hash: 'hash-1',
          criptografado: false,
          usuario_id: 'test-user-id',
        }),
        documentoRepository.create({
          nome_arquivo: 'solicitacao-123/laudo/documento-2.pdf',
          nome_original: 'laudo.pdf',
          tipo_documento: 'laudo',
          descricao: 'Laudo médico',
          solicitacao_id: 'solicitacao-123',
          tamanho: 2048,
          hash: 'hash-2',
          criptografado: true,
          iv: 'iv-base64',
          auth_tag: 'auth-tag-base64',
          usuario_id: 'test-user-id',
        }),
      ];
      await documentoRepository.save(documentos);

      // Act
      const response = await request(app.getHttpServer())
        .get('/api/documentos')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ solicitacao_id: 'solicitacao-123' })
        .expect(200);

      // Assert
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].solicitacao_id).toBe('solicitacao-123');
      expect(response.body.data[1].solicitacao_id).toBe('solicitacao-123');
    });

    it('deve listar documentos por tipo', async () => {
      // Arrange
      const documentos = [
        documentoRepository.create({
          nome_arquivo: 'solicitacao-123/comprovante/documento-1.pdf',
          nome_original: 'comprovante.pdf',
          tipo_documento: 'comprovante',
          descricao: 'Comprovante de residência',
          solicitacao_id: 'solicitacao-123',
          tamanho: 1024,
          hash: 'hash-1',
          criptografado: false,
          usuario_id: 'test-user-id',
        }),
        documentoRepository.create({
          nome_arquivo: 'solicitacao-456/comprovante/documento-3.pdf',
          nome_original: 'comprovante2.pdf',
          tipo_documento: 'comprovante',
          descricao: 'Comprovante de renda',
          solicitacao_id: 'solicitacao-456',
          tamanho: 1536,
          hash: 'hash-3',
          criptografado: false,
          usuario_id: 'test-user-id',
        }),
      ];
      await documentoRepository.save(documentos);

      // Act
      const response = await request(app.getHttpServer())
        .get('/api/documentos')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ tipo_documento: 'comprovante' })
        .expect(200);

      // Assert
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].tipo_documento).toBe('comprovante');
      expect(response.body.data[1].tipo_documento).toBe('comprovante');
    });
  });

  describe('Exclusão de documentos', () => {
    it('deve permitir excluir um documento', async () => {
      // Arrange
      const documento = documentoRepository.create({
        nome_arquivo: 'solicitacao-123/comprovante/documento-1.pdf',
        nome_original: 'comprovante.pdf',
        tipo_documento: 'comprovante',
        descricao: 'Comprovante de residência',
        solicitacao_id: 'solicitacao-123',
        tamanho: 1024,
        hash: 'hash-1',
        criptografado: false,
        usuario_id: 'test-user-id',
      });
      await documentoRepository.save(documento);

      mockMinioService.removerArquivo.mockResolvedValue(undefined);

      // Act
      await request(app.getHttpServer())
        .delete(`/api/documentos/${documento.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(mockMinioService.removerArquivo).toHaveBeenCalledWith(
        documento.nome_arquivo,
      );

      const documentoExcluido = await documentoRepository.findOne({
        where: { id: documento.id },
      });
      expect(documentoExcluido).toBeNull();
    });
  });
});
