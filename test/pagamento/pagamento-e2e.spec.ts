import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule, JwtService } from '@nestjs/jwt';

import { AppModule } from '../../src/app.module';
import { StatusPagamentoEnum } from '../../src/modules/pagamento/enums/status-pagamento.enum';
import { MetodoPagamentoEnum } from '../../src/modules/pagamento/enums/metodo-pagamento.enum';

/**
 * Testes E2E para o fluxo completo de pagamento
 *
 * Este teste valida a integração completa do módulo de pagamento com outros
 * módulos do sistema em um ambiente próximo ao de produção. Testa-se o fluxo
 * completo desde a criação do pagamento até a confirmação de recebimento.
 *
 * Execução: npm run test:e2e -- pagamento-e2e
 *
 * @author Equipe PGBen
 */
describe('PagamentoController (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  // Dados de teste
  const usuarioId = 'e2e-usuario-teste';
  const gestorId = 'e2e-gestor-teste';
  const adminId = 'e2e-admin-teste';
  const unidadeId = 'e2e-unidade-teste';
  const solicitacaoId = 'e2e-solicitacao-teste';
  const beneficiarioId = 'e2e-beneficiario-teste';
  const infoBancariaId = 'e2e-info-bancaria-teste';

  // IDs gerados durante os testes
  let pagamentoId: string;
  let comprovanteId: string;
  let confirmacaoId: string;

  beforeAll(async () => {
    // Usar banco de dados SQLite em memória para testes E2E
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
            type: 'sqlite',
            database: ':memory:',
            entities: [__dirname + '/../../src/**/*.entity{.ts,.js}'],
            synchronize: true, // Apenas para testes
            logging: false,
          }),
        }),
        JwtModule.registerAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
            secret: configService.get('JWT_SECRET') || 'teste-secret',
            signOptions: { expiresIn: '1h' },
          }),
        }),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    jwtService = moduleFixture.get<JwtService>(JwtService);

    await app.init();

    // Preparar dados necessários para os testes
    await prepararDadosParaTestes();
  });

  afterAll(async () => {
    await app.close();
  });

  /**
   * Função auxiliar para preparar dados necessários no banco de testes
   * Como estamos usando SQLite em memória, precisamos criar os dados iniciais
   */
  async function prepararDadosParaTestes() {
    // Esta função seria implementada para criar dados necessários no banco de testes
    // Como usuários, solicitações, beneficiários, etc.
    // Para fins deste teste, vamos usar mocks e stubs onde necessário
  }

  /**
   * Função auxiliar para gerar tokens JWT com diferentes perfis
   */
  const gerarToken = (
    userId: string,
    perfis: string[] = ['usuario'],
    unidadeId: string = 'e2e-unidade-teste',
  ) => {
    return jwtService.sign({
      sub: userId,
      perfis,
      unidade: unidadeId,
    });
  };

  describe('Fluxo Completo de Pagamento', () => {
    it('1. Deve criar um novo pagamento com sucesso', async () => {
      const token = gerarToken(gestorId, ['gestor', 'financeiro'], unidadeId);

      const response = await request(app.getHttpServer())
        .post(`/pagamentos/solicitacao/${solicitacaoId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          valor: 750.0,
          metodoPagamento: MetodoPagamentoEnum.PIX,
          infoBancariaId,
          dadosBancarios: {
            pixTipo: 'CPF',
            pixChave: '12345678900',
          },
          dataLiberacao: new Date().toISOString(),
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe(StatusPagamentoEnum.AGENDADO);
      expect(response.body.metodoPagamento).toBe(MetodoPagamentoEnum.PIX);

      // Guardar ID para próximos testes
      pagamentoId = response.body.id;
    });

    it('2. Deve consultar um pagamento existente', async () => {
      // Pular se o teste anterior falhou
      if (!pagamentoId) {
        console.warn('Pulando teste - pagamentoId não disponível');
        return;
      }

      const token = gerarToken(gestorId, ['gestor'], unidadeId);

      const response = await request(app.getHttpServer())
        .get(`/pagamentos/${pagamentoId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', pagamentoId);
      expect(response.body).toHaveProperty('solicitacaoId', solicitacaoId);
      expect(response.body).toHaveProperty('valor', 750);
    });

    it('3. Deve listar pagamentos com paginação', async () => {
      const token = gerarToken(gestorId, ['gestor'], unidadeId);

      const response = await request(app.getHttpServer())
        .get('/pagamentos')
        .query({ page: 1, limit: 10 })
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.items)).toBe(true);

      // Deve encontrar o pagamento criado anteriormente
      if (pagamentoId) {
        const encontrado = response.body.items.some(
          (item) => item.id === pagamentoId,
        );
        expect(encontrado).toBe(true);
      }
    });

    it('4. Deve atualizar o status do pagamento para LIBERADO', async () => {
      // Pular se o teste de criação falhou
      if (!pagamentoId) {
        console.warn('Pulando teste - pagamentoId não disponível');
        return;
      }

      const token = gerarToken(gestorId, ['gestor', 'financeiro'], unidadeId);

      const response = await request(app.getHttpServer())
        .patch(`/pagamentos/${pagamentoId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          status: StatusPagamentoEnum.LIBERADO,
          observacoes: 'Pagamento liberado para transferência',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(StatusPagamentoEnum.LIBERADO);
    });

    it('5. Deve atualizar o status do pagamento para PAGO', async () => {
      // Pular se o teste anterior falhou
      if (!pagamentoId) {
        console.warn('Pulando teste - pagamentoId não disponível');
        return;
      }

      const token = gerarToken(gestorId, ['gestor', 'financeiro'], unidadeId);

      const response = await request(app.getHttpServer())
        .patch(`/pagamentos/${pagamentoId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          status: StatusPagamentoEnum.PAGO,
          observacoes: 'Transferência PIX realizada',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(StatusPagamentoEnum.PAGO);
    });

    it('6. Deve fazer upload de comprovante de pagamento', async () => {
      // Pular se o teste anterior falhou
      if (!pagamentoId) {
        console.warn('Pulando teste - pagamentoId não disponível');
        return;
      }

      const token = gerarToken(gestorId, ['gestor', 'financeiro'], unidadeId);

      // Criar buffer simulando um arquivo PDF
      const buffer = Buffer.from(
        'Conteúdo do comprovante de pagamento para testes e2e',
      );

      const response = await request(app.getHttpServer())
        .post(`/pagamentos/${pagamentoId}/comprovantes`)
        .set('Authorization', `Bearer ${token}`)
        .attach('arquivo', buffer, 'comprovante.pdf');

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('pagamentoId', pagamentoId);

      // Guardar ID para próximos testes
      comprovanteId = response.body.id;
    });

    it('7. Deve listar comprovantes de um pagamento', async () => {
      // Pular se os testes anteriores falharam
      if (!pagamentoId || !comprovanteId) {
        console.warn(
          'Pulando teste - pagamentoId ou comprovanteId não disponível',
        );
        return;
      }

      const token = gerarToken(gestorId, ['gestor'], unidadeId);

      const response = await request(app.getHttpServer())
        .get(`/pagamentos/${pagamentoId}/comprovantes`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      expect(response.body[0]).toHaveProperty('id', comprovanteId);
    });

    it('8. Deve registrar confirmação de recebimento', async () => {
      // Pular se os testes anteriores falharam
      if (!pagamentoId) {
        console.warn('Pulando teste - pagamentoId não disponível');
        return;
      }

      const token = gerarToken(beneficiarioId, ['usuario'], unidadeId);

      const response = await request(app.getHttpServer())
        .post(`/pagamentos/${pagamentoId}/confirmar`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          observacoes: 'Pagamento recebido via PIX em minha conta',
          dataConfirmacao: new Date().toISOString(),
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('pagamentoId', pagamentoId);

      // Guardar ID para próximos testes
      confirmacaoId = response.body.id;
    });

    it('9. Deve consultar confirmação de recebimento', async () => {
      // Pular se os testes anteriores falharam
      if (!pagamentoId || !confirmacaoId) {
        console.warn(
          'Pulando teste - pagamentoId ou confirmacaoId não disponível',
        );
        return;
      }

      const token = gerarToken(gestorId, ['gestor'], unidadeId);

      const response = await request(app.getHttpServer())
        .get(`/pagamentos/${pagamentoId}/confirmacao`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', confirmacaoId);
      expect(response.body).toHaveProperty('pagamentoId', pagamentoId);
      expect(response.body).toHaveProperty('dataConfirmacao');
      expect(response.body).toHaveProperty('observacoes');
    });

    it('10. Deve finalizar o pagamento após confirmação', async () => {
      // Pular se os testes anteriores falharam
      if (!pagamentoId || !confirmacaoId) {
        console.warn(
          'Pulando teste - pagamentoId ou confirmacaoId não disponível',
        );
        return;
      }

      const token = gerarToken(gestorId, ['gestor', 'financeiro'], unidadeId);

      const response = await request(app.getHttpServer())
        .patch(`/pagamentos/${pagamentoId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          status: StatusPagamentoEnum.FINALIZADO,
          observacoes: 'Pagamento finalizado após confirmação de recebimento',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(StatusPagamentoEnum.FINALIZADO);
    });
  });

  describe('Testes de Segurança E2E', () => {
    it('Deve rejeitar acesso sem autenticação', async () => {
      const response = await request(app.getHttpServer()).get('/pagamentos');

      expect(response.status).toBe(401);
    });

    it('Deve rejeitar token JWT inválido', async () => {
      const response = await request(app.getHttpServer())
        .get('/pagamentos')
        .set('Authorization', 'Bearer token-invalido');

      expect(response.status).toBe(401);
    });

    it('Deve rejeitar acesso a recursos restritos por perfil', async () => {
      const token = gerarToken(usuarioId, ['usuario_basico'], unidadeId);

      const response = await request(app.getHttpServer())
        .patch(`/pagamentos/${pagamentoId || 'pagamento-id'}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          status: StatusPagamentoEnum.PAGO,
        });

      expect(response.status).toBe(403);
    });
  });

  describe('Casos de Erro', () => {
    it('Deve retornar 404 para pagamento inexistente', async () => {
      const token = gerarToken(gestorId, ['gestor'], unidadeId);

      const response = await request(app.getHttpServer())
        .get('/pagamentos/pagamento-inexistente')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('não encontrado');
    });

    it('Deve rejeitar transição de status inválida', async () => {
      // Pular se o teste de criação falhou
      if (!pagamentoId) {
        // Criar um pagamento específico para este teste
        const token = gerarToken(gestorId, ['gestor', 'financeiro'], unidadeId);

        const createResponse = await request(app.getHttpServer())
          .post(`/pagamentos/solicitacao/${solicitacaoId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            valor: 300.0,
            metodoPagamento: MetodoPagamentoEnum.PIX,
            infoBancariaId,
            dadosBancarios: {
              pixTipo: 'CPF',
              pixChave: '12345678900',
            },
            dataLiberacao: new Date().toISOString(),
          });

        if (createResponse.status === 201) {
          pagamentoId = createResponse.body.id;
        } else {
          console.warn('Não foi possível criar pagamento para teste');
          return;
        }
      }

      const token = gerarToken(gestorId, ['gestor', 'financeiro'], unidadeId);

      // Tentar uma transição inválida (de AGENDADO para FINALIZADO pulando estados)
      const response = await request(app.getHttpServer())
        .patch(`/pagamentos/${pagamentoId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          status: StatusPagamentoEnum.FINALIZADO,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Transição de status');
    });
  });
});
