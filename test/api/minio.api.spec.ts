import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { JwtService } from '@nestjs/jwt';
import { MinioService } from '../../src/shared/services/minio.service';
import * as fs from 'fs';
import * as path from 'path';

describe('MinIO API', () => {
  let app: INestApplication;
  let minioService: MinioService;
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

    minioService = moduleFixture.get<MinioService>(MinioService);
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
    fs.writeFileSync(
      testFilePath,
      'Conteúdo de teste para upload direto no MinIO',
    );
  });

  beforeEach(async () => {
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

    jest
      .spyOn(minioService, 'listarArquivos')
      .mockImplementation(async (prefix, recursive) => {
        return [
          {
            name: 'documentos/arquivo1.pdf',
            size: 1024,
            lastModified: new Date(),
          },
          {
            name: 'documentos/arquivo2.pdf',
            size: 2048,
            lastModified: new Date(),
          },
          {
            name: 'documentos/arquivo3.pdf',
            size: 3072,
            lastModified: new Date(),
          },
        ];
      });

    jest
      .spyOn(minioService, 'verificarArquivoExiste')
      .mockImplementation(async (nomeArquivo) => {
        return nomeArquivo.includes('existe');
      });
  });

  afterAll(async () => {
    // Remover arquivo temporário
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
    await app.close();
  });

  describe('POST /api/storage/upload', () => {
    it('deve fazer upload direto para o MinIO', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/api/storage/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('arquivo', testFilePath)
        .field('caminho', 'testes/arquivo-teste.txt')
        .field('metadados', JSON.stringify({ tipo: 'teste', sensivel: false }))
        .expect(201);

      // Assert
      expect(response.body).toHaveProperty('etag');
      expect(response.body).toHaveProperty('versionId');
      expect(minioService.uploadArquivo).toHaveBeenCalled();
    });

    it('deve validar os campos obrigatórios', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .post('/api/storage/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('arquivo', testFilePath)
        // Faltando campo caminho, que é obrigatório
        .expect(400);
    });

    it('deve requerer autenticação', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .post('/api/storage/upload')
        .attach('arquivo', testFilePath)
        .field('caminho', 'testes/arquivo-teste.txt')
        .expect(401);
    });
  });

  describe('GET /api/storage/download/:caminho', () => {
    it('deve baixar um arquivo do MinIO', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/api/storage/download/testes/arquivo-existe.txt')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body).toBeInstanceOf(Buffer);
      expect(minioService.downloadArquivo).toHaveBeenCalledWith(
        'testes/arquivo-existe.txt',
      );
    });

    it('deve retornar 404 para arquivo inexistente', async () => {
      // Configurar o mock para retornar false para verificação de existência
      jest
        .spyOn(minioService, 'verificarArquivoExiste')
        .mockResolvedValueOnce(false);

      // Act & Assert
      await request(app.getHttpServer())
        .get('/api/storage/download/testes/arquivo-nao-existe.txt')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('deve requerer autenticação para download', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .get('/api/storage/download/testes/arquivo-existe.txt')
        .expect(401);
    });
  });

  describe('GET /api/storage/list', () => {
    it('deve listar arquivos do MinIO', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/api/storage/list')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ prefix: 'documentos/', recursive: 'true' })
        .expect(200);

      // Assert
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body).toHaveLength(3);
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('size');
      expect(response.body[0]).toHaveProperty('lastModified');
      expect(minioService.listarArquivos).toHaveBeenCalledWith(
        'documentos/',
        true,
      );
    });

    it('deve requerer autenticação para listar arquivos', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .get('/api/storage/list')
        .query({ prefix: 'documentos/', recursive: 'true' })
        .expect(401);
    });
  });

  describe('DELETE /api/storage/:caminho', () => {
    it('deve remover um arquivo do MinIO', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .delete('/api/storage/testes/arquivo-existe.txt')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(minioService.removerArquivo).toHaveBeenCalledWith(
        'testes/arquivo-existe.txt',
      );
    });

    it('deve retornar 404 para arquivo inexistente', async () => {
      // Configurar o mock para retornar false para verificação de existência
      jest
        .spyOn(minioService, 'verificarArquivoExiste')
        .mockResolvedValueOnce(false);

      // Act & Assert
      await request(app.getHttpServer())
        .delete('/api/storage/testes/arquivo-nao-existe.txt')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('deve requerer autenticação para remoção', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .delete('/api/storage/testes/arquivo-existe.txt')
        .expect(401);
    });
  });

  describe('HEAD /api/storage/:caminho', () => {
    it('deve verificar se um arquivo existe no MinIO', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .head('/api/storage/testes/arquivo-existe.txt')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(minioService.verificarArquivoExiste).toHaveBeenCalledWith(
        'testes/arquivo-existe.txt',
      );
    });

    it('deve retornar 404 para arquivo inexistente', async () => {
      // Configurar o mock para retornar false para verificação de existência
      jest
        .spyOn(minioService, 'verificarArquivoExiste')
        .mockResolvedValueOnce(false);

      // Act & Assert
      await request(app.getHttpServer())
        .head('/api/storage/testes/arquivo-nao-existe.txt')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('deve requerer autenticação para verificação', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .head('/api/storage/testes/arquivo-existe.txt')
        .expect(401);
    });
  });
});
