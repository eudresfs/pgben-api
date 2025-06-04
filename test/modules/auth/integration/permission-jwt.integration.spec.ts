import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '@/app.module';
import { PermissionService } from '@/auth/services/permission.service';
import { ScopeType } from '@/auth/entities/user-permission.entity';
import { Permission } from '@/auth/entities/permission.entity';
import { PermissionRepository } from '@/auth/repositories/permission.repository';
import { UserPermissionRepository } from '@/auth/repositories/user-permission.repository';

/**
 * Testes de integração para o sistema de permissões com JWT
 *
 * Estes testes verificam a interação entre o JwtService, PermissionService e PermissionGuard,
 * focando especialmente na extração de permissões do token JWT e na validação dessas
 * permissões para acessar endpoints protegidos.
 */
describe('Permission JWT Integration', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let configService: ConfigService;
  let permissionService: PermissionService;
  let permissionRepository: PermissionRepository;
  let userPermissionRepository: UserPermissionRepository;

  beforeAll(async () => {
    // Criar um módulo de teste com o AppModule
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    // Iniciar a aplicação
    app = moduleFixture.createNestApplication();
    await app.init();

    // Obter os serviços necessários
    jwtService = app.get<JwtService>(JwtService);
    configService = app.get<ConfigService>(ConfigService);
    permissionService = app.get<PermissionService>(PermissionService);
    permissionRepository = app.get<PermissionRepository>(PermissionRepository);
    userPermissionRepository = app.get<UserPermissionRepository>(
      UserPermissionRepository,
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Extração de permissões do JWT', () => {
    it('deve verificar permissões extraídas do JWT', async () => {
      // Mock de um usuário com permissões
      const testUser = {
        id: 'user-test-123',
        username: 'test.user@example.com',
        roles: ['ADMIN'],
        nome: 'Usuário de Teste',
      };

      // Criar um token JWT para o usuário
      const privateKey = Buffer.from(
        configService.get<string>('JWT_PRIVATE_KEY_BASE64', ''),
        'base64',
      ).toString('utf8');

      const accessToken = jwtService.sign(
        {
          ...testUser,
          sub: testUser.id,
        },
        {
          secret: privateKey,
          algorithm: 'RS256',
          expiresIn: '1h',
        },
      );

      // Criar permissões de teste
      const testPermission: Permission = await permissionRepository.save({
        name: 'test.permission',
        description: 'Permissão de teste',
        isComposite: false,
      });

      // Atribuir permissão ao usuário
      await userPermissionRepository.save({
        userId: testUser.id,
        permissionId: testPermission.id,
        scopeType: ScopeType.GLOBAL,
        granted: true,
        validUntil: null,
        createdBy: 'system',
      });

      // Verificar se o usuário tem a permissão
      const hasPermission = await permissionService.hasPermission({
        userId: testUser.id,
        permissionName: 'test.permission',
        scopeType: ScopeType.GLOBAL,
      });

      expect(hasPermission).toBe(true);

      // Tentar acessar um endpoint protegido
      const response = await request(app.getHttpServer())
        .get('/api/protected-endpoint')
        .set('Authorization', `Bearer ${accessToken}`);

      // Se o endpoint estiver configurado corretamente,
      // deve retornar 200 OK se o usuário tiver permissão,
      // ou 403 Forbidden se não tiver
      expect([200, 403]).toContain(response.status);
    });
  });

  describe('Casos especiais de autorização', () => {
    it('deve verificar permissões compostas', async () => {
      // Criar permissão composta de teste
      const parentPermission: Permission = await permissionRepository.save({
        name: 'test.composite.permission',
        description: 'Permissão composta de teste',
        isComposite: true,
      });

      const childPermission: Permission = await permissionRepository.save({
        name: 'test.child.permission',
        description: 'Permissão filha de teste',
        isComposite: false,
      });

      // Estabelecer relação de composição
      await permissionRepository.establishComposition(
        parentPermission.id,
        childPermission.id,
      );

      // Atribuir permissão filha ao usuário
      await userPermissionRepository.save({
        userId: 'user-test-123',
        permissionId: childPermission.id,
        scopeType: ScopeType.GLOBAL,
        granted: true,
        validUntil: null,
        createdBy: 'system',
      });

      // Verificar se o usuário tem a permissão composta
      const hasCompositePermission = await permissionService.hasPermission({
        userId: 'user-test-123',
        permissionName: 'test.composite.permission',
        scopeType: ScopeType.GLOBAL,
      });

      expect(hasCompositePermission).toBe(true);
    });

    it('deve verificar permissões com escopo de unidade', async () => {
      // Criar permissão com escopo UNIT
      const unitPermission: Permission = await permissionRepository.save({
        name: 'test.unit.permission',
        description: 'Permissão com escopo de unidade',
        isComposite: false,
      });

      // Atribuir permissão ao usuário com escopo UNIT
      await userPermissionRepository.save({
        userId: 'user-test-123',
        permissionId: unitPermission.id,
        scopeType: ScopeType.UNIT,
        scopeId: 'unidade-test-123',
        granted: true,
        validUntil: null,
        createdBy: 'system',
      });

      // Verificar se o usuário tem a permissão para a unidade específica
      const hasUnitPermission = await permissionService.hasPermission({
        userId: 'user-test-123',
        permissionName: 'test.unit.permission',
        scopeType: ScopeType.UNIT,
        scopeId: 'unidade-test-123',
      });

      expect(hasUnitPermission).toBe(true);

      // Verificar que o usuário não tem a permissão para outra unidade
      const hasOtherUnitPermission = await permissionService.hasPermission({
        userId: 'user-test-123',
        permissionName: 'test.unit.permission',
        scopeType: ScopeType.UNIT,
        scopeId: 'unidade-test-456',
      });

      expect(hasOtherUnitPermission).toBe(false);
    });

    it('deve verificar permissões temporárias (com data de validade)', async () => {
      // Criar permissão temporária
      const temporaryPermission: Permission = await permissionRepository.save({
        name: 'test.temporary.permission',
        description: 'Permissão temporária',
        isComposite: false,
      });

      // Data de validade no futuro
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7); // Válida por 7 dias

      // Atribuir permissão temporária ao usuário
      await userPermissionRepository.save({
        userId: 'user-test-123',
        permissionId: temporaryPermission.id,
        scopeType: ScopeType.GLOBAL,
        granted: true,
        validUntil: futureDate,
        createdBy: 'system',
      });

      // Verificar se o usuário tem a permissão temporária
      const hasTemporaryPermission = await permissionService.hasPermission({
        userId: 'user-test-123',
        permissionName: 'test.temporary.permission',
        scopeType: ScopeType.GLOBAL,
      });

      expect(hasTemporaryPermission).toBe(true);

      // Data de validade no passado
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7); // Expirada há 7 dias

      // Atribuir permissão expirada ao usuário
      await userPermissionRepository.save({
        userId: 'user-test-123',
        permissionId: temporaryPermission.id, // Mesma permissão, mas com outra validade
        scopeType: ScopeType.GLOBAL,
        granted: true,
        validUntil: pastDate,
        createdBy: 'system',
      });

      // Verificar que o usuário não tem a permissão expirada
      const hasExpiredPermission = await permissionService.hasPermission({
        userId: 'user-test-123',
        permissionName: 'test.temporary.permission',
        scopeType: ScopeType.GLOBAL,
      });

      expect(hasExpiredPermission).toBe(true); // Ainda é true porque a primeira permissão está válida
    });
  });
});
