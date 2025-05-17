import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Documento } from '../../src/modules/documento/entities/documento.entity';
import { MinioService } from '../../src/shared/services/minio.service';
import { CriptografiaService } from '../../src/shared/services/criptografia.service';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

describe('Documento API', () => {
  let app: INestApplication;
  let documentoRepository: Repository<Documento>;
  let minioService: MinioService;
  let criptografiaService: CriptografiaService;
  let jwtService: JwtService;
  let authToken: string;
  let testFilePath: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    documentoRepository = moduleFixture.get<Repository<Documento>>(
      getRepositoryToken(Documento),
    );
    minioService = moduleFixture.get<MinioService>(MinioService);
    criptografiaService =
      moduleFixture.get<CriptografiaService>(CriptografiaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    // Gerar token de autenticação para testes
    authToken = jwtService.sign({
      id: 'test-user-id',
      nome: 'Usuário de Teste',
      email: 'teste@exemplo.com',
      roles: ['admin'],
    });

    // Criar arquivo temporário para testes
    testFilePath = path.join(__dirname, '..', 'temp-test-file.txt');
    fs.writeFileSync(testFilePath, 'Conteúdo de teste para upload de arquivo');
  });

  beforeEach(async () => {
    // Limpar documentos antes de cada teste
    await documentoRepository.clear();

    // Espiar o MinioService para evitar chamadas reais ao MinIO durante os testes
    jest
      .spyOn(minioService, 'uploadArquivo')
      .mockImplementation(async (arquivo, nomeArquivo, metadados) => {
        return {
          etag: 'mock-etag',
          versionId: 'mock-version-id',
        };
      });

    jest
      .spyOn(minioService, 'downloadArquivo')
      .mockImplementation(async (nomeArquivo) => {
        return Buffer.from('Conteúdo mockado do arquivo');
      });

    jest
      .spyOn(minioService, 'removerArquivo')
      .mockImplementation(async (nomeArquivo) => {
        return true;
      });
  });

  afterAll(async () => {
    // Remover arquivo temporário
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
    await app.close();
  });

  describe('POST /api/documentos/upload', () => {
    it('deve fazer upload de um documento não sensível', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/api/documentos/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('arquivo', testFilePath)
        .field('nome', 'Documento de Teste')
        .field('tipo', 'contrato')
        .field('sensivel', 'false')
        .expect(201);

      // Assert
      expect(response.body).toHaveProperty('id');
      expect(response.body.nome).toBe('Documento de Teste');
      expect(response.body.tipo).toBe('contrato');
      expect(response.body.sensivel).toBe(false);
      expect(response.body.hash).toBeDefined();
      expect(response.body.tamanho).toBeGreaterThan(0);
      expect(response.body.usuario_id).toBe('test-user-id');

      // Verificar se o documento foi salvo no repositório
      const savedDoc = await documentoRepository.findOne({
        where: { id: response.body.id },
      });
      expect(savedDoc).toBeDefined();
    });

    it('deve fazer upload de um documento sensível com criptografia', async () => {
      // Espiar o CriptografiaService para verificar se a criptografia é chamada
      const spyCriptografar = jest.spyOn(
        criptografiaService,
        'cryptografarBuffer',
      );

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/documentos/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('arquivo', testFilePath)
        .field('nome', 'Documento Sensível')
        .field('tipo', 'pessoal')
        .field('sensivel', 'true')
        .expect(201);

      // Assert
      expect(response.body).toHaveProperty('id');
      expect(response.body.nome).toBe('Documento Sensível');
      expect(response.body.tipo).toBe('pessoal');
      expect(response.body.sensivel).toBe(true);
      expect(response.body.criptografado).toBe(true);
      expect(response.body.iv).toBeDefined();
      expect(response.body.auth_tag).toBeDefined();

      // Verificar se a criptografia foi chamada
      expect(spyCriptografar).toHaveBeenCalled();
    });

    it('deve validar os campos obrigatórios', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .post('/api/documentos/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('arquivo', testFilePath)
        // Faltando campo nome, que é obrigatório
        .field('tipo', 'contrato')
        .expect(400);
    });

    it('deve requerer autenticação', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .post('/api/documentos/upload')
        .attach('arquivo', testFilePath)
        .field('nome', 'Documento de Teste')
        .field('tipo', 'contrato')
        .expect(401);
    });
  });

  describe('GET /api/documentos', () => {
    it('deve listar documentos paginados', async () => {
      // Arrange
      const documentos = [];
      for (let i = 0; i < 5; i++) {
        documentos.push(
          documentoRepository.create({
            nome: `Documento ${i}`,
            tipo: 'contrato',
            caminho: `documentos/doc-${i}.pdf`,
            mime_type: 'application/pdf',
            tamanho: 1024,
            hash: crypto.randomBytes(32).toString('hex'),
            sensivel: false,
            criptografado: false,
            usuario_id: 'test-user-id',
          }),
        );
      }
      await documentoRepository.save(documentos);

      // Act
      const response = await request(app.getHttpServer())
        .get('/api/documentos')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 3 })
        .expect(200);

      // Assert
      expect(response.body.data).toHaveLength(3);
      expect(response.body.total).toBe(5);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(3);
      expect(response.body.totalPages).toBe(2);
    });

    it('deve filtrar documentos por tipo', async () => {
      // Arrange
      const documentos = [
        documentoRepository.create({
          nome: 'Documento Contrato',
          tipo: 'contrato',
          caminho: 'documentos/contrato.pdf',
          mime_type: 'application/pdf',
          tamanho: 1024,
          hash: crypto.randomBytes(32).toString('hex'),
          sensivel: false,
          criptografado: false,
          usuario_id: 'test-user-id',
        }),
        documentoRepository.create({
          nome: 'Documento Pessoal',
          tipo: 'pessoal',
          caminho: 'documentos/pessoal.pdf',
          mime_type: 'application/pdf',
          tamanho: 1024,
          hash: crypto.randomBytes(32).toString('hex'),
          sensivel: true,
          criptografado: true,
          iv: Buffer.from('iv-mock').toString('base64'),
          auth_tag: Buffer.from('auth-tag-mock').toString('base64'),
          usuario_id: 'test-user-id',
        }),
      ];
      await documentoRepository.save(documentos);

      // Act
      const response = await request(app.getHttpServer())
        .get('/api/documentos')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ tipo: 'pessoal' })
        .expect(200);

      // Assert
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].tipo).toBe('pessoal');
    });

    it('deve filtrar documentos por sensibilidade', async () => {
      // Arrange
      const documentos = [
        documentoRepository.create({
          nome: 'Documento Não Sensível',
          tipo: 'contrato',
          caminho: 'documentos/contrato.pdf',
          mime_type: 'application/pdf',
          tamanho: 1024,
          hash: crypto.randomBytes(32).toString('hex'),
          sensivel: false,
          criptografado: false,
          usuario_id: 'test-user-id',
        }),
        documentoRepository.create({
          nome: 'Documento Sensível',
          tipo: 'pessoal',
          caminho: 'documentos/pessoal.pdf',
          mime_type: 'application/pdf',
          tamanho: 1024,
          hash: crypto.randomBytes(32).toString('hex'),
          sensivel: true,
          criptografado: true,
          iv: Buffer.from('iv-mock').toString('base64'),
          auth_tag: Buffer.from('auth-tag-mock').toString('base64'),
          usuario_id: 'test-user-id',
        }),
      ];
      await documentoRepository.save(documentos);

      // Act
      const response = await request(app.getHttpServer())
        .get('/api/documentos')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ sensivel: 'true' })
        .expect(200);

      // Assert
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].sensivel).toBe(true);
    });
  });

  describe('GET /api/documentos/:id', () => {
    it('deve retornar um documento específico pelo ID', async () => {
      // Arrange
      const documento = documentoRepository.create({
        nome: 'Documento para Busca',
        tipo: 'contrato',
        caminho: 'documentos/busca.pdf',
        mime_type: 'application/pdf',
        tamanho: 1024,
        hash: crypto.randomBytes(32).toString('hex'),
        sensivel: false,
        criptografado: false,
        usuario_id: 'test-user-id',
      });
      await documentoRepository.save(documento);

      // Act
      const response = await request(app.getHttpServer())
        .get(`/api/documentos/${documento.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body.id).toBe(documento.id);
      expect(response.body.nome).toBe('Documento para Busca');
    });

    it('deve retornar 404 para ID inexistente', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .get('/api/documentos/id-inexistente')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('GET /api/documentos/:id/download', () => {
    it('deve baixar um documento não sensível', async () => {
      // Arrange
      const documento = documentoRepository.create({
        nome: 'Documento para Download',
        tipo: 'contrato',
        caminho: 'documentos/download.pdf',
        mime_type: 'application/pdf',
        tamanho: 1024,
        hash: crypto.randomBytes(32).toString('hex'),
        sensivel: false,
        criptografado: false,
        usuario_id: 'test-user-id',
      });
      await documentoRepository.save(documento);

      // Act
      const response = await request(app.getHttpServer())
        .get(`/api/documentos/${documento.id}/download`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.header['content-type']).toBe('application/pdf');
      expect(response.header['content-disposition']).toContain('attachment');
      expect(response.header['content-disposition']).toContain('download.pdf');
      expect(response.body).toBeInstanceOf(Buffer);
    });

    it('deve baixar e descriptografar um documento sensível', async () => {
      // Arrange
      const documento = documentoRepository.create({
        nome: 'Documento Sensível para Download',
        tipo: 'pessoal',
        caminho: 'documentos/sensivel.pdf',
        mime_type: 'application/pdf',
        tamanho: 1024,
        hash: crypto.randomBytes(32).toString('hex'),
        sensivel: true,
        criptografado: true,
        iv: Buffer.from('iv-mock').toString('base64'),
        auth_tag: Buffer.from('auth-tag-mock').toString('base64'),
        usuario_id: 'test-user-id',
      });
      await documentoRepository.save(documento);

      // Espiar o CriptografiaService para verificar se a descriptografia é chamada
      const spyDescriptografar = jest
        .spyOn(criptografiaService, 'descriptografarBuffer')
        .mockImplementation((dados, iv, authTag) => {
          return Buffer.from('Conteúdo descriptografado mockado');
        });

      // Act
      const response = await request(app.getHttpServer())
        .get(`/api/documentos/${documento.id}/download`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.header['content-type']).toBe('application/pdf');
      expect(response.body).toBeInstanceOf(Buffer);
      expect(spyDescriptografar).toHaveBeenCalled();
    });

    it('deve requerer autenticação para download', async () => {
      // Arrange
      const documento = documentoRepository.create({
        nome: 'Documento para Download',
        tipo: 'contrato',
        caminho: 'documentos/download.pdf',
        mime_type: 'application/pdf',
        tamanho: 1024,
        hash: crypto.randomBytes(32).toString('hex'),
        sensivel: false,
        criptografado: false,
        usuario_id: 'test-user-id',
      });
      await documentoRepository.save(documento);

      // Act & Assert
      await request(app.getHttpServer())
        .get(`/api/documentos/${documento.id}/download`)
        .expect(401);
    });
  });

  describe('DELETE /api/documentos/:id', () => {
    it('deve excluir um documento', async () => {
      // Arrange
      const documento = documentoRepository.create({
        nome: 'Documento para Exclusão',
        tipo: 'contrato',
        caminho: 'documentos/exclusao.pdf',
        mime_type: 'application/pdf',
        tamanho: 1024,
        hash: crypto.randomBytes(32).toString('hex'),
        sensivel: false,
        criptografado: false,
        usuario_id: 'test-user-id',
      });
      await documentoRepository.save(documento);

      // Act
      await request(app.getHttpServer())
        .delete(`/api/documentos/${documento.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      const deletedDoc = await documentoRepository.findOne({
        where: { id: documento.id },
      });
      expect(deletedDoc).toBeNull();
      expect(minioService.removerArquivo).toHaveBeenCalledWith(
        'documentos/exclusao.pdf',
      );
    });

    it('deve retornar 404 ao tentar excluir documento inexistente', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .delete('/api/documentos/id-inexistente')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('deve requerer autenticação para exclusão', async () => {
      // Arrange
      const documento = documentoRepository.create({
        nome: 'Documento para Exclusão',
        tipo: 'contrato',
        caminho: 'documentos/exclusao.pdf',
        mime_type: 'application/pdf',
        tamanho: 1024,
        hash: crypto.randomBytes(32).toString('hex'),
        sensivel: false,
        criptografado: false,
        usuario_id: 'test-user-id',
      });
      await documentoRepository.save(documento);

      // Act & Assert
      await request(app.getHttpServer())
        .delete(`/api/documentos/${documento.id}`)
        .expect(401);
    });
  });
});
