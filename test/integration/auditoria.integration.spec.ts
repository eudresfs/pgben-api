import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LogAuditoria } from '../../src/modules/auditoria/entities/log-auditoria.entity';
import { TipoOperacao } from '../../src/modules/auditoria/enums/tipo-operacao.enum';
import { JwtService } from '@nestjs/jwt';

describe('Auditoria (Integração)', () => {
  let app: INestApplication;
  let logAuditoriaRepository: Repository<LogAuditoria>;
  let jwtService: JwtService;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    logAuditoriaRepository = moduleFixture.get<Repository<LogAuditoria>>(
      getRepositoryToken(LogAuditoria),
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
    // Limpar logs de auditoria antes de cada teste
    await logAuditoriaRepository.clear();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Auditoria de operações CRUD', () => {
    it('deve registrar log ao criar um documento', async () => {
      // Arrange
      const documentoDto = {
        nome: 'Documento de Teste',
        tipo: 'PDF',
        solicitacao_id: 'solicitacao-123',
      };

      // Act
      await request(app.getHttpServer())
        .post('/api/documentos')
        .set('Authorization', `Bearer ${authToken}`)
        .send(documentoDto)
        .expect(201);

      // Assert
      const logs = await logAuditoriaRepository.find();
      expect(logs).toHaveLength(1);
      expect(logs[0].tipo_operacao).toBe(TipoOperacao.CREATE);
      expect(logs[0].entidade_afetada).toBe('documentos');
      expect(logs[0].usuario_id).toBe('test-user-id');
      expect(logs[0].dados_novos).toEqual(
        expect.objectContaining(documentoDto),
      );
    });

    it('deve registrar log ao consultar um documento', async () => {
      // Act
      await request(app.getHttpServer())
        .get('/api/documentos/documento-123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      const logs = await logAuditoriaRepository.find();
      expect(logs).toHaveLength(1);
      expect(logs[0].tipo_operacao).toBe(TipoOperacao.READ);
      expect(logs[0].entidade_afetada).toBe('documentos');
      expect(logs[0].entidade_id).toBe('documento-123');
      expect(logs[0].usuario_id).toBe('test-user-id');
    });

    it('deve registrar log ao atualizar um documento', async () => {
      // Arrange
      const documentoDto = {
        nome: 'Documento Atualizado',
        tipo: 'DOCX',
      };

      // Act
      await request(app.getHttpServer())
        .put('/api/documentos/documento-123')
        .set('Authorization', `Bearer ${authToken}`)
        .send(documentoDto)
        .expect(200);

      // Assert
      const logs = await logAuditoriaRepository.find();
      expect(logs).toHaveLength(1);
      expect(logs[0].tipo_operacao).toBe(TipoOperacao.UPDATE);
      expect(logs[0].entidade_afetada).toBe('documentos');
      expect(logs[0].entidade_id).toBe('documento-123');
      expect(logs[0].usuario_id).toBe('test-user-id');
      expect(logs[0].dados_novos).toEqual(
        expect.objectContaining(documentoDto),
      );
    });

    it('deve registrar log ao excluir um documento', async () => {
      // Act
      await request(app.getHttpServer())
        .delete('/api/documentos/documento-123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      const logs = await logAuditoriaRepository.find();
      expect(logs).toHaveLength(1);
      expect(logs[0].tipo_operacao).toBe(TipoOperacao.DELETE);
      expect(logs[0].entidade_afetada).toBe('documentos');
      expect(logs[0].entidade_id).toBe('documento-123');
      expect(logs[0].usuario_id).toBe('test-user-id');
    });
  });

  describe('API de Auditoria', () => {
    it('deve permitir consulta de logs de auditoria', async () => {
      // Arrange
      const log1 = logAuditoriaRepository.create({
        tipo_operacao: TipoOperacao.CREATE,
        entidade_afetada: 'documentos',
        entidade_id: 'doc-1',
        descricao: 'Criação de documento',
        usuario_id: 'test-user-id',
        ip_origem: '127.0.0.1',
      });

      const log2 = logAuditoriaRepository.create({
        tipo_operacao: TipoOperacao.UPDATE,
        entidade_afetada: 'documentos',
        entidade_id: 'doc-1',
        descricao: 'Atualização de documento',
        usuario_id: 'test-user-id',
        ip_origem: '127.0.0.1',
      });

      await logAuditoriaRepository.save([log1, log2]);

      // Act
      const response = await request(app.getHttpServer())
        .get('/api/auditoria')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ entidade_afetada: 'documentos' })
        .expect(200);

      // Assert
      expect(response.body.data).toHaveLength(2);
      expect(response.body.total).toBe(2);
    });

    it('deve permitir consulta de logs por tipo de operação', async () => {
      // Arrange
      const log1 = logAuditoriaRepository.create({
        tipo_operacao: TipoOperacao.CREATE,
        entidade_afetada: 'documentos',
        entidade_id: 'doc-1',
        descricao: 'Criação de documento',
        usuario_id: 'test-user-id',
        ip_origem: '127.0.0.1',
      });

      const log2 = logAuditoriaRepository.create({
        tipo_operacao: TipoOperacao.UPDATE,
        entidade_afetada: 'documentos',
        entidade_id: 'doc-1',
        descricao: 'Atualização de documento',
        usuario_id: 'test-user-id',
        ip_origem: '127.0.0.1',
      });

      await logAuditoriaRepository.save([log1, log2]);

      // Act
      const response = await request(app.getHttpServer())
        .get('/api/auditoria')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ tipo_operacao: TipoOperacao.CREATE })
        .expect(200);

      // Assert
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].tipo_operacao).toBe(TipoOperacao.CREATE);
    });

    it('deve permitir geração de relatório de auditoria', async () => {
      // Arrange
      const log1 = logAuditoriaRepository.create({
        tipo_operacao: TipoOperacao.CREATE,
        entidade_afetada: 'documentos',
        entidade_id: 'doc-1',
        descricao: 'Criação de documento',
        usuario_id: 'test-user-id',
        ip_origem: '127.0.0.1',
      });

      const log2 = logAuditoriaRepository.create({
        tipo_operacao: TipoOperacao.UPDATE,
        entidade_afetada: 'documentos',
        entidade_id: 'doc-1',
        descricao: 'Atualização de documento',
        usuario_id: 'test-user-id',
        ip_origem: '127.0.0.1',
      });

      await logAuditoriaRepository.save([log1, log2]);

      // Act
      const response = await request(app.getHttpServer())
        .get('/api/auditoria/relatorio')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ formato: 'json' })
        .expect(200);

      // Assert
      expect(response.body).toHaveLength(2);
    });
  });
});
