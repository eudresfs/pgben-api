import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { PermissionSeeder } from '../../src/database/seeds/core/permission.seed';
import { Permission } from '../../src/auth/entities/permission.entity';
import { UserPermission, ScopeType } from '../../src/auth/entities/user-permission.entity';
import { JwtService } from '@nestjs/jwt';

describe('Fluxo de Autenticação e Autorização (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;
  let configService: ConfigService;
  let accessToken: string;
  let refreshToken: string;
  let testUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    
    dataSource = app.get<DataSource>(DataSource);
    jwtService = app.get<JwtService>(JwtService);
    configService = app.get<ConfigService>(ConfigService);
    
    await app.init();
    
    // Preparar o banco de dados para os testes
    await prepareDatabase();
  });

  afterAll(async () => {
    // Limpar o banco de dados após os testes
    await cleanupDatabase();
    await app.close();
  });

  /**
   * Prepara o banco de dados para os testes
   */
  async function prepareDatabase() {
    // Executar as migrações
    await dataSource.runMigrations();
    
    // Executar o seeder de permissões
    const permissionSeeder = new PermissionSeeder();
    await permissionSeeder.run(dataSource);
    
    // Criar um usuário de teste
    const testUser = await createTestUser();
    testUserId = testUser.id;
    
    // Atribuir permissões ao usuário de teste
    await assignPermissionsToUser(testUserId);
  }

  /**
   * Limpa o banco de dados após os testes
   */
  async function cleanupDatabase() {
    // Reverter as migrações
    await dataSource.undoLastMigration();
  }

  /**
   * Cria um usuário de teste
   */
  async function createTestUser() {
    // Implementação simplificada para criar um usuário de teste
    // Na implementação real, você usaria o repositório de usuários
    
    // Exemplo:
    // const userRepository = dataSource.getRepository(User);
    // return userRepository.save({
    //   email: 'test@example.com',
    //   password: await bcrypt.hash('password123', 10),
    //   role: 'user',
    //   status: 'ativo',
    // });
    
    // Para os testes, retornaremos um usuário fictício
    return {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      role: 'user',
      status: 'ativo',
    };
  }

  /**
   * Atribui permissões ao usuário de teste
   */
  async function assignPermissionsToUser(userId: string) {
    // Obter o repositório de permissões
    const permissionRepository = dataSource.getRepository(Permission);
    const userPermissionRepository = dataSource.getRepository(UserPermission);
    
    // Buscar permissões
    const viewPermission = await permissionRepository.findOne({ where: { name: 'usuario.visualizar' } });
    const editPermission = await permissionRepository.findOne({ where: { name: 'usuario.editar' } });
    
    if (viewPermission && editPermission) {
      // Atribuir permissões ao usuário
      await userPermissionRepository.save([
        {
          userId,
          permissionId: viewPermission.id,
          permission: viewPermission,
          scopeType: ScopeType.GLOBAL,
          createdBy: 'system',
        },
        {
          userId,
          permissionId: editPermission.id,
          permission: editPermission,
          scopeType: ScopeType.UNIT,
          scopeId: userId, // O usuário só pode editar a si mesmo
          createdBy: 'system',
        },
      ]);
    }
  }

  describe('Autenticação', () => {
    it('deve autenticar o usuário e retornar tokens', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          username: 'test@example.com',
          password: 'password123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      
      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
      
      // Verificar se o token contém as permissões
      const decodedToken = jwtService.decode(accessToken);
      expect(decodedToken).toHaveProperty('permissions');
      expect(Array.isArray(decodedToken.permissions)).toBeTruthy();
      expect(decodedToken.permissions).toContain('usuario.visualizar');
    });

    it('deve renovar o token de acesso usando o token de refresh', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .send({
          refreshToken,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      
      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
    });

    it('deve falhar ao tentar acessar um endpoint protegido sem token', async () => {
      await request(app.getHttpServer())
        .get('/v1/users/me')
        .expect(401);
    });

    it('deve acessar um endpoint protegido com token válido', async () => {
      await request(app.getHttpServer())
        .get('/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('Autorização', () => {
    it('deve permitir acesso a um endpoint com permissão global', async () => {
      await request(app.getHttpServer())
        .get('/v1/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('deve permitir acesso a um endpoint com permissão de unidade para o próprio usuário', async () => {
      await request(app.getHttpServer())
        .put(`/v1/users/${testUserId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Usuário Atualizado',
        })
        .expect(200);
    });

    it('deve negar acesso a um endpoint com permissão de unidade para outro usuário', async () => {
      const otherUserId = '123e4567-e89b-12d3-a456-426614174999';
      
      await request(app.getHttpServer())
        .put(`/v1/users/${otherUserId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Outro Usuário',
        })
        .expect(403);
    });

    it('deve negar acesso a um endpoint sem a permissão necessária', async () => {
      await request(app.getHttpServer())
        .delete(`/v1/users/${testUserId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);
    });
  });

  describe('Gerenciamento de Permissões', () => {
    it('deve listar as permissões do usuário atual', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/permissions/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ userId: testUserId })
        .expect(200);

      expect(Array.isArray(response.body)).toBeTruthy();
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body.some(p => p.name === 'usuario.visualizar')).toBeTruthy();
    });

    it('deve testar se o usuário tem uma permissão específica', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/permissions/test')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          userId: testUserId,
          permissionName: 'usuario.visualizar',
          scopeType: ScopeType.GLOBAL,
        })
        .expect(200);

      expect(response.body).toHaveProperty('hasPermission');
      expect(response.body.hasPermission).toBe(true);
    });

    it('deve testar se o usuário não tem uma permissão específica', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/permissions/test')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          userId: testUserId,
          permissionName: 'usuario.excluir',
          scopeType: ScopeType.GLOBAL,
        })
        .expect(200);

      expect(response.body).toHaveProperty('hasPermission');
      expect(response.body.hasPermission).toBe(false);
    });
  });
});
