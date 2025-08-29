import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LogAuditoria } from '../../src/modules/auditoria/entities/log-auditoria.entity';
import { TipoOperacao } from '../../src/modules/auditoria/enums/tipo-operacao.enum';
import { JwtService } from '@nestjs/jwt';
import { CreateLogAuditoriaDto } from '../../src/modules/auditoria/dto/create-log-auditoria.dto';

describe('Auditoria API', () => {
  let app: INestApplication;
  let logAuditoriaRepository: Repository<LogAuditoria>;
  let jwtService: JwtService;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
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

  describe('POST /api/auditoria', () => {
    it('deve criar um log de auditoria', async () => {
      // Arrange
      const createLogDto: CreateLogAuditoriaDto = {
        tipo_operacao: TipoOperacao.CREATE,
        entidade_afetada: 'documentos',
        entidade_id: 'doc-123',
        descricao: 'Criação manual de log para teste',
        dados_anteriores: null,
        dados_novos: { nome: 'Documento Teste' },
        usuario_id: 'test-user-id',
        ip_origem: '127.0.0.1',
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/auditoria')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createLogDto)
        .expect(201);

      // Assert
      expect(response.body).toHaveProperty('id');
      expect(response.body.tipo_operacao).toBe(TipoOperacao.CREATE);
      expect(response.body.entidade_afetada).toBe('documentos');
      expect(response.body.entidade_id).toBe('doc-123');
      expect(response.body.usuario_id).toBe('test-user-id');

      const savedLog = await logAuditoriaRepository.findOne({
        where: { id: response.body.id },
      });
      expect(savedLog).toBeDefined();
    });

    it('deve validar os campos obrigatórios', async () => {
      // Arrange
      const invalidLogDto = {
        // Faltando tipo_operacao e entidade_afetada, que são obrigatórios
        entidade_id: 'doc-123',
        descricao: 'Log inválido para teste',
        usuario_id: 'test-user-id',
      };

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/api/auditoria')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidLogDto)
        .expect(400);

      expect(response.body.message).toContain('tipo_operacao');
      expect(response.body.message).toContain('entidade_afetada');
    });

    it('deve requerer autenticação', async () => {
      // Arrange
      const createLogDto: CreateLogAuditoriaDto = {
        tipo_operacao: TipoOperacao.CREATE,
        entidade_afetada: 'documentos',
        entidade_id: 'doc-123',
        descricao: 'Teste sem autenticação',
        dados_anteriores: null,
        dados_novos: null,
        usuario_id: 'test-user-id',
        ip_origem: '127.0.0.1',
      };

      // Act & Assert
      await request(app.getHttpServer())
        .post('/api/auditoria')
        .send(createLogDto)
        .expect(401);
    });
  });

  describe('GET /api/auditoria', () => {
    it('deve retornar logs paginados', async () => {
      // Arrange
      const logs = [];
      for (let i = 0; i < 5; i++) {
        logs.push(
          logAuditoriaRepository.create({
            tipo_operacao: TipoOperacao.CREATE,
            entidade_afetada: 'documentos',
            entidade_id: `doc-${i}`,
            descricao: `Log de teste ${i}`,
            usuario_id: 'test-user-id',
            ip_origem: '127.0.0.1',
          }),
        );
      }
      await logAuditoriaRepository.save(logs);

      // Act
      const response = await request(app.getHttpServer())
        .get('/api/auditoria')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 3 })
        .expect(200);

      // Assert
      expect(response.body.data).toHaveLength(3);
      expect(response.body.total).toBe(5);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(3);
      expect(response.body.pages).toBe(2);
    });

    it('deve filtrar logs por tipo de operação', async () => {
      // Arrange
      const logs = [
        logAuditoriaRepository.create({
          tipo_operacao: TipoOperacao.CREATE,
          entidade_afetada: 'documentos',
          entidade_id: 'doc-1',
          descricao: 'Criação de documento',
          usuario_id: 'test-user-id',
          ip_origem: '127.0.0.1',
        }),
        logAuditoriaRepository.create({
          tipo_operacao: TipoOperacao.UPDATE,
          entidade_afetada: 'documentos',
          entidade_id: 'doc-1',
          descricao: 'Atualização de documento',
          usuario_id: 'test-user-id',
          ip_origem: '127.0.0.1',
        }),
        logAuditoriaRepository.create({
          tipo_operacao: TipoOperacao.DELETE,
          entidade_afetada: 'documentos',
          entidade_id: 'doc-2',
          descricao: 'Exclusão de documento',
          usuario_id: 'test-user-id',
          ip_origem: '127.0.0.1',
        }),
      ];
      await logAuditoriaRepository.save(logs);

      // Act
      const response = await request(app.getHttpServer())
        .get('/api/auditoria')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ tipo_operacao: TipoOperacao.UPDATE })
        .expect(200);

      // Assert
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].tipo_operacao).toBe(TipoOperacao.UPDATE);
    });

    it('deve filtrar logs por entidade afetada', async () => {
      // Arrange
      const logs = [
        logAuditoriaRepository.create({
          tipo_operacao: TipoOperacao.CREATE,
          entidade_afetada: 'documentos',
          entidade_id: 'doc-1',
          descricao: 'Criação de documento',
          usuario_id: 'test-user-id',
          ip_origem: '127.0.0.1',
        }),
        logAuditoriaRepository.create({
          tipo_operacao: TipoOperacao.CREATE,
          entidade_afetada: 'usuarios',
          entidade_id: 'user-1',
          descricao: 'Criação de usuário',
          usuario_id: 'test-user-id',
          ip_origem: '127.0.0.1',
        }),
      ];
      await logAuditoriaRepository.save(logs);

      // Act
      const response = await request(app.getHttpServer())
        .get('/api/auditoria')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ entidade_afetada: 'usuarios' })
        .expect(200);

      // Assert
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].entidade_afetada).toBe('usuarios');
    });

    it('deve filtrar logs por período', async () => {
      // Arrange
      const hoje = new Date();
      const ontem = new Date(hoje);
      ontem.setDate(ontem.getDate() - 1);

      const anteontem = new Date(hoje);
      anteontem.setDate(anteontem.getDate() - 2);

      const logs = [
        logAuditoriaRepository.create({
          tipo_operacao: TipoOperacao.CREATE,
          entidade_afetada: 'documentos',
          entidade_id: 'doc-1',
          descricao: 'Log de hoje',
          usuario_id: 'test-user-id',
          ip_origem: '127.0.0.1',
          created_at: hoje,
        }),
        logAuditoriaRepository.create({
          tipo_operacao: TipoOperacao.CREATE,
          entidade_afetada: 'documentos',
          entidade_id: 'doc-2',
          descricao: 'Log de ontem',
          usuario_id: 'test-user-id',
          ip_origem: '127.0.0.1',
          created_at: ontem,
        }),
        logAuditoriaRepository.create({
          tipo_operacao: TipoOperacao.CREATE,
          entidade_afetada: 'documentos',
          entidade_id: 'doc-3',
          descricao: 'Log de anteontem',
          usuario_id: 'test-user-id',
          ip_origem: '127.0.0.1',
          created_at: anteontem,
        }),
      ];
      await logAuditoriaRepository.save(logs);

      // Formatação das datas para a query
      const dataInicio = ontem.toISOString().split('T')[0];
      const dataFim = hoje.toISOString().split('T')[0];

      // Act
      const response = await request(app.getHttpServer())
        .get('/api/auditoria')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ data_inicio: dataInicio, data_fim: dataFim })
        .expect(200);

      // Assert
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
      expect(
        response.body.data.some((log) => log.descricao === 'Log de hoje'),
      ).toBe(true);
      expect(
        response.body.data.some((log) => log.descricao === 'Log de ontem'),
      ).toBe(true);
      expect(
        response.body.data.some((log) => log.descricao === 'Log de anteontem'),
      ).toBe(false);
    });
  });

  describe('GET /api/auditoria/:id', () => {
    it('deve retornar um log específico pelo ID', async () => {
      // Arrange
      const log = logAuditoriaRepository.create({
        tipo_operacao: TipoOperacao.CREATE,
        entidade_afetada: 'documentos',
        entidade_id: 'doc-1',
        descricao: 'Log para busca por ID',
        usuario_id: 'test-user-id',
        ip_origem: '127.0.0.1',
      });
      await logAuditoriaRepository.save(log);

      // Act
      const response = await request(app.getHttpServer())
        .get(`/api/auditoria/${log.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body.id).toBe(log.id);
      expect(response.body.descricao).toBe('Log para busca por ID');
    });

    it('deve retornar 404 para ID inexistente', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .get('/api/auditoria/id-inexistente')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('GET /api/auditoria/relatorio', () => {
    it('deve gerar relatório em formato JSON', async () => {
      // Arrange
      const logs = [];
      for (let i = 0; i < 3; i++) {
        logs.push(
          logAuditoriaRepository.create({
            tipo_operacao: TipoOperacao.CREATE,
            entidade_afetada: 'documentos',
            entidade_id: `doc-${i}`,
            descricao: `Log para relatório ${i}`,
            usuario_id: 'test-user-id',
            ip_origem: '127.0.0.1',
          }),
        );
      }
      await logAuditoriaRepository.save(logs);

      // Act
      const response = await request(app.getHttpServer())
        .get('/api/auditoria/relatorio')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ formato: 'json' })
        .expect(200);

      // Assert
      expect(response.body).toHaveLength(3);
      expect(response.body[0]).toHaveProperty('tipo_operacao');
      expect(response.body[0]).toHaveProperty('entidade_afetada');
      expect(response.body[0]).toHaveProperty('descricao');
    });

    it('deve gerar relatório em formato CSV', async () => {
      // Arrange
      const logs = [];
      for (let i = 0; i < 3; i++) {
        logs.push(
          logAuditoriaRepository.create({
            tipo_operacao: TipoOperacao.CREATE,
            entidade_afetada: 'documentos',
            entidade_id: `doc-${i}`,
            descricao: `Log para relatório ${i}`,
            usuario_id: 'test-user-id',
            ip_origem: '127.0.0.1',
          }),
        );
      }
      await logAuditoriaRepository.save(logs);

      // Act
      const response = await request(app.getHttpServer())
        .get('/api/auditoria/relatorio')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ formato: 'csv' })
        .expect(200);

      // Assert
      expect(response.header['content-type']).toContain('text/csv');
      expect(response.text).toContain(
        'tipo_operacao,entidade_afetada,entidade_id',
      );
      expect(response.text.split('\n').length).toBeGreaterThan(3); // Cabeçalho + 3 registros
    });

    it('deve gerar relatório em formato PDF', async () => {
      // Arrange
      const logs = [];
      for (let i = 0; i < 3; i++) {
        logs.push(
          logAuditoriaRepository.create({
            tipo_operacao: TipoOperacao.CREATE,
            entidade_afetada: 'documentos',
            entidade_id: `doc-${i}`,
            descricao: `Log para relatório ${i}`,
            usuario_id: 'test-user-id',
            ip_origem: '127.0.0.1',
          }),
        );
      }
      await logAuditoriaRepository.save(logs);

      // Act
      const response = await request(app.getHttpServer())
        .get('/api/auditoria/relatorio')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ formato: 'pdf' })
        .expect(200);

      // Assert
      expect(response.header['content-type']).toContain('application/pdf');
      expect(response.body).toBeInstanceOf(Buffer);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });
});
