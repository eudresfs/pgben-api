import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { Role } from '../src/shared/enums/role.enum';

/**
 * Testes de integração para o módulo de benefícios
 *
 * Estes testes verificam o funcionamento completo das rotas de benefícios,
 * incluindo a criação, atualização, consulta e remoção de benefícios.
 */
describe('BeneficioController (e2e)', () => {
  let app: INestApplication;
  let beneficioRepository: Repository<any>;
  let usuarioRepository: Repository<any>;
  let jwtService: JwtService;

  // Tokens de acesso para diferentes perfis
  let adminToken: string;
  let gestorToken: string;
  let tecnicoToken: string;

  // IDs de benefícios criados durante os testes
  let beneficioId: string;

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
    beneficioRepository = app.get(getRepositoryToken('Beneficio'));
    usuarioRepository = app.get(getRepositoryToken('Usuario'));
    jwtService = app.get(JwtService);

    // Limpar e preparar o banco de dados para os testes
    await beneficioRepository.clear();

    // Criar usuários de teste para diferentes perfis
    const adminUser = await usuarioRepository.findOne({
      where: { role: Role.ADMIN },
    });
    const gestorUser = await usuarioRepository.findOne({
      where: { role: Role.GESTOR },
    });
    const tecnicoUser = await usuarioRepository.findOne({
      where: { role: Role.TECNICO },
    });

    // Gerar tokens de acesso para os usuários
    adminToken = jwtService.sign(
      { sub: adminUser.id, email: adminUser.email, role: adminUser.role },
      { secret: process.env.JWT_SECRET || 'secret_test', expiresIn: '1h' },
    );

    gestorToken = jwtService.sign(
      { sub: gestorUser.id, email: gestorUser.email, role: gestorUser.role },
      { secret: process.env.JWT_SECRET || 'secret_test', expiresIn: '1h' },
    );

    tecnicoToken = jwtService.sign(
      { sub: tecnicoUser.id, email: tecnicoUser.email, role: tecnicoUser.role },
      { secret: process.env.JWT_SECRET || 'secret_test', expiresIn: '1h' },
    );
  });

  afterAll(async () => {
    // Limpar o banco de dados após os testes
    await beneficioRepository.clear();
    await app.close();
  });

  describe('/beneficios (GET)', () => {
    it('deve retornar uma lista vazia de benefícios quando não há registros', () => {
      return request(app.getHttpServer())
        .get('/beneficios')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.items).toHaveLength(0);
          expect(res.body.meta.total).toBe(0);
        });
    });

    it('deve permitir acesso sem autenticação para listagem de benefícios', () => {
      return request(app.getHttpServer())
        .get('/beneficios')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('items');
          expect(res.body).toHaveProperty('meta');
        });
    });
  });

  describe('/beneficios (POST)', () => {
    it('deve criar um novo benefício quando o usuário é admin', async () => {
      const createBeneficioDto = {
        nome: 'Cesta Básica',
        descricao: 'Benefício de cesta básica para famílias em vulnerabilidade',
        valor: 150.0,
        criterios_concessao:
          'Famílias com renda per capita inferior a meio salário mínimo',
        documentos_necessarios: [
          'CPF',
          'Comprovante de residência',
          'Comprovante de renda',
        ],
        validade_meses: 6,
      };

      const response = await request(app.getHttpServer())
        .post('/beneficios')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createBeneficioDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.nome).toBe(createBeneficioDto.nome);
      expect(response.body.valor).toBe(createBeneficioDto.valor);
      expect(response.body.ativo).toBe(true);

      // Salvar o ID para uso em testes posteriores
      beneficioId = response.body.id;
    });

    it('deve criar um novo benefício quando o usuário é gestor', async () => {
      const createBeneficioDto = {
        nome: 'Auxílio Moradia',
        descricao: 'Benefício para auxílio de aluguel',
        valor: 300.0,
        criterios_concessao:
          'Famílias em situação de vulnerabilidade habitacional',
        documentos_necessarios: [
          'CPF',
          'Comprovante de residência',
          'Laudo social',
        ],
        validade_meses: 12,
      };

      const response = await request(app.getHttpServer())
        .post('/beneficios')
        .set('Authorization', `Bearer ${gestorToken}`)
        .send(createBeneficioDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.nome).toBe(createBeneficioDto.nome);
      expect(response.body.valor).toBe(createBeneficioDto.valor);
      expect(response.body.ativo).toBe(true);
    });

    it('deve retornar 403 quando o usuário é técnico', () => {
      const createBeneficioDto = {
        nome: 'Auxílio Funeral',
        descricao: 'Benefício para auxílio funeral',
        valor: 500.0,
      };

      return request(app.getHttpServer())
        .post('/beneficios')
        .set('Authorization', `Bearer ${tecnicoToken}`)
        .send(createBeneficioDto)
        .expect(403);
    });

    it('deve retornar 401 quando não há autenticação', () => {
      const createBeneficioDto = {
        nome: 'Auxílio Funeral',
        descricao: 'Benefício para auxílio funeral',
        valor: 500.0,
      };

      return request(app.getHttpServer())
        .post('/beneficios')
        .send(createBeneficioDto)
        .expect(401);
    });

    it('deve retornar 400 quando os dados são inválidos', () => {
      const invalidDto = {
        // Sem nome, que é obrigatório
        descricao: 'Benefício inválido',
        valor: -100, // Valor negativo, que deve ser inválido
      };

      return request(app.getHttpServer())
        .post('/beneficios')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidDto)
        .expect(400);
    });

    it('deve retornar 409 quando tenta criar um benefício com nome duplicado', () => {
      const duplicateDto = {
        nome: 'Cesta Básica', // Nome já existente
        descricao: 'Outro benefício com mesmo nome',
        valor: 200.0,
      };

      return request(app.getHttpServer())
        .post('/beneficios')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(duplicateDto)
        .expect(409);
    });
  });

  describe('/beneficios (GET) após criação', () => {
    it('deve retornar uma lista com os benefícios criados', () => {
      return request(app.getHttpServer())
        .get('/beneficios')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.items).toHaveLength(2);
          expect(res.body.meta.total).toBe(2);
          expect(res.body.items[0]).toHaveProperty('id');
          expect(res.body.items[0]).toHaveProperty('nome');
          expect(res.body.items[0]).toHaveProperty('valor');
        });
    });

    it('deve filtrar benefícios por nome', () => {
      return request(app.getHttpServer())
        .get('/beneficios?nome=Cesta')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.items).toHaveLength(1);
          expect(res.body.items[0].nome).toBe('Cesta Básica');
        });
    });

    it('deve filtrar benefícios por status ativo', () => {
      return request(app.getHttpServer())
        .get('/beneficios?ativo=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.items.every((item) => item.ativo === true)).toBe(
            true,
          );
        });
    });
  });

  describe('/beneficios/:id (GET)', () => {
    it('deve retornar um benefício específico pelo ID', () => {
      return request(app.getHttpServer())
        .get(`/beneficios/${beneficioId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(beneficioId);
          expect(res.body.nome).toBe('Cesta Básica');
        });
    });

    it('deve retornar 404 quando o benefício não existe', () => {
      return request(app.getHttpServer())
        .get('/beneficios/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('deve permitir acesso sem autenticação para detalhes de um benefício', () => {
      return request(app.getHttpServer())
        .get(`/beneficios/${beneficioId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(beneficioId);
        });
    });
  });

  describe('/beneficios/:id (PATCH)', () => {
    it('deve atualizar um benefício quando o usuário é admin', () => {
      const updateDto = {
        descricao: 'Descrição atualizada da cesta básica',
        valor: 180.0,
      };

      return request(app.getHttpServer())
        .patch(`/beneficios/${beneficioId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateDto)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(beneficioId);
          expect(res.body.descricao).toBe(updateDto.descricao);
          expect(res.body.valor).toBe(updateDto.valor);
          expect(res.body.nome).toBe('Cesta Básica'); // Nome não deve mudar
        });
    });

    it('deve atualizar um benefício quando o usuário é gestor', () => {
      const updateDto = {
        criterios_concessao:
          'Critérios atualizados para concessão da cesta básica',
      };

      return request(app.getHttpServer())
        .patch(`/beneficios/${beneficioId}`)
        .set('Authorization', `Bearer ${gestorToken}`)
        .send(updateDto)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(beneficioId);
          expect(res.body.criterios_concessao).toBe(
            updateDto.criterios_concessao,
          );
        });
    });

    it('deve retornar 403 quando o usuário é técnico', () => {
      const updateDto = {
        descricao: 'Tentativa de atualização por técnico',
      };

      return request(app.getHttpServer())
        .patch(`/beneficios/${beneficioId}`)
        .set('Authorization', `Bearer ${tecnicoToken}`)
        .send(updateDto)
        .expect(403);
    });

    it('deve retornar 401 quando não há autenticação', () => {
      const updateDto = {
        descricao: 'Tentativa de atualização sem autenticação',
      };

      return request(app.getHttpServer())
        .patch(`/beneficios/${beneficioId}`)
        .send(updateDto)
        .expect(401);
    });

    it('deve retornar 404 quando o benefício não existe', () => {
      const updateDto = {
        descricao: 'Tentativa de atualização de benefício inexistente',
      };

      return request(app.getHttpServer())
        .patch('/beneficios/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateDto)
        .expect(404);
    });
  });

  describe('/beneficios/:id/toggle-status (PATCH)', () => {
    it('deve alternar o status de um benefício quando o usuário é admin', () => {
      return request(app.getHttpServer())
        .patch(`/beneficios/${beneficioId}/toggle-status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(beneficioId);
          expect(res.body.ativo).toBe(false); // Deve alternar de true para false
        });
    });

    it('deve alternar novamente o status do benefício', () => {
      return request(app.getHttpServer())
        .patch(`/beneficios/${beneficioId}/toggle-status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(beneficioId);
          expect(res.body.ativo).toBe(true); // Deve alternar de false para true
        });
    });

    it('deve retornar 403 quando o usuário é técnico', () => {
      return request(app.getHttpServer())
        .patch(`/beneficios/${beneficioId}/toggle-status`)
        .set('Authorization', `Bearer ${tecnicoToken}`)
        .expect(403);
    });

    it('deve retornar 401 quando não há autenticação', () => {
      return request(app.getHttpServer())
        .patch(`/beneficios/${beneficioId}/toggle-status`)
        .expect(401);
    });

    it('deve retornar 404 quando o benefício não existe', () => {
      return request(app.getHttpServer())
        .patch('/beneficios/00000000-0000-0000-0000-000000000000/toggle-status')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('/beneficios/:id (DELETE)', () => {
    it('deve retornar 403 quando o usuário é gestor', () => {
      return request(app.getHttpServer())
        .delete(`/beneficios/${beneficioId}`)
        .set('Authorization', `Bearer ${gestorToken}`)
        .expect(403);
    });

    it('deve retornar 403 quando o usuário é técnico', () => {
      return request(app.getHttpServer())
        .delete(`/beneficios/${beneficioId}`)
        .set('Authorization', `Bearer ${tecnicoToken}`)
        .expect(403);
    });

    it('deve retornar 401 quando não há autenticação', () => {
      return request(app.getHttpServer())
        .delete(`/beneficios/${beneficioId}`)
        .expect(401);
    });

    it('deve remover um benefício quando o usuário é admin', () => {
      return request(app.getHttpServer())
        .delete(`/beneficios/${beneficioId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('deve retornar 404 ao tentar buscar o benefício removido', () => {
      return request(app.getHttpServer())
        .get(`/beneficios/${beneficioId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('deve retornar 404 quando tenta remover um benefício inexistente', () => {
      return request(app.getHttpServer())
        .delete('/beneficios/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
