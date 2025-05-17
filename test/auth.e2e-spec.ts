import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

/**
 * Testes de integração para o módulo de autenticação
 *
 * Estes testes verificam o funcionamento completo das rotas de autenticação,
 * incluindo login, refresh token e recuperação de senha.
 */
describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let usuarioRepository: Repository<any>;
  let jwtService: JwtService;

  // Usuário de teste
  const testUser = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'teste@example.com',
    senha: 'senha_hash',
    nome: 'Usuário Teste',
    role: 'tecnico_unidade',
    ativo: true,
    unidade_id: '550e8400-e29b-41d4-a716-446655440001',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Configurar pipes de validação global
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();

    // Obter repositórios e serviços necessários
    usuarioRepository = app.get(getRepositoryToken('Usuario'));
    jwtService = app.get(JwtService);

    // Limpar e preparar o banco de dados para os testes
    await usuarioRepository.clear();

    // Criar um usuário de teste
    const hashedPassword = await bcrypt.hash('senha123', 10);
    await usuarioRepository.save({
      ...testUser,
      senha: hashedPassword,
    });
  });

  afterAll(async () => {
    // Limpar o banco de dados após os testes
    await usuarioRepository.clear();
    await app.close();
  });

  describe('/auth/login (POST)', () => {
    it('deve retornar tokens quando o login é bem-sucedido', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          senha: 'senha123',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          expect(res.body).toHaveProperty('refresh_token');
        });
    });

    it('deve retornar 401 quando as credenciais são inválidas', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          senha: 'senha_incorreta',
        })
        .expect(401);
    });

    it('deve retornar 400 quando os dados de entrada são inválidos', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'email_invalido',
          senha: 'senha123',
        })
        .expect(400);
    });
  });

  describe('/auth/refresh (POST)', () => {
    it('deve retornar novos tokens quando o refresh token é válido', async () => {
      // Gerar um refresh token válido para o usuário de teste
      const refreshToken = jwtService.sign(
        { sub: testUser.id, email: testUser.email },
        {
          secret: process.env.JWT_REFRESH_SECRET || 'refresh_secret_test',
          expiresIn: '7d',
        },
      );

      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refresh_token: refreshToken,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          expect(res.body).toHaveProperty('refresh_token');
        });
    });

    it('deve retornar 401 quando o refresh token é inválido', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refresh_token: 'token_invalido',
        })
        .expect(401);
    });
  });

  describe('/auth/forgot-password (POST)', () => {
    it('deve retornar 201 quando o email existe', () => {
      return request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({
          email: testUser.email,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
        });
    });

    it('deve retornar 400 quando o email é inválido', () => {
      return request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({
          email: 'email_invalido',
        })
        .expect(400);
    });
  });

  describe('/auth/reset-password (POST)', () => {
    it('deve retornar 201 quando o token é válido e as senhas correspondem', async () => {
      // Gerar um token de redefinição de senha válido
      const resetToken = jwtService.sign(
        { sub: testUser.id, email: testUser.email, type: 'reset_password' },
        { secret: process.env.JWT_SECRET || 'secret_test', expiresIn: '1h' },
      );

      return request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: resetToken,
          senha: 'nova_senha123',
          confirmacao_senha: 'nova_senha123',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
        });
    });

    it('deve retornar 400 quando as senhas não correspondem', async () => {
      // Gerar um token de redefinição de senha válido
      const resetToken = jwtService.sign(
        { sub: testUser.id, email: testUser.email, type: 'reset_password' },
        { secret: process.env.JWT_SECRET || 'secret_test', expiresIn: '1h' },
      );

      return request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: resetToken,
          senha: 'nova_senha123',
          confirmacao_senha: 'senha_diferente',
        })
        .expect(400);
    });

    it('deve retornar 401 quando o token é inválido', () => {
      return request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: 'token_invalido',
          senha: 'nova_senha123',
          confirmacao_senha: 'nova_senha123',
        })
        .expect(401);
    });
  });
});
