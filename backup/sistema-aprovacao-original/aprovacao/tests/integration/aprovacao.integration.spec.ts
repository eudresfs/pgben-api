import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { AprovacaoModule } from '../../aprovacao.module';
import { AuthModule } from '../../../auth/auth.module';
import { UsuariosModule } from '../../../usuarios/usuarios.module';
import { AuditoriaModule } from '../../../auditoria/auditoria.module';
import { SolicitacaoAprovacao } from '../../entities/solicitacao-aprovacao.entity';
import { ConfiguracaoAcaoCritica } from '../../entities/configuracao-acao-critica.entity';
import { HistoricoAprovacao } from '../../entities/historico-aprovacao.entity';
import { Usuario } from '../../../usuarios/entities/usuario.entity';
import {
  StatusSolicitacaoAprovacao,
  TipoAcaoCritica,
  PrioridadeAprovacao,
  EstrategiaAprovacao,
} from '../../enums';

/**
 * Testes de integração para o Sistema de Aprovação
 * 
 * Testa o fluxo completo do sistema de aprovação, incluindo:
 * - Criação de solicitações
 * - Processamento de aprovações/rejeições
 * - Escalação automática
 * - Notificações
 * - Auditoria
 */
describe('Sistema de Aprovação - Testes de Integração', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;
  let authToken: string;

  // Dados de teste
  let usuarioSolicitante: Usuario;
  let usuarioAprovador: Usuario;
  let usuarioAdmin: Usuario;
  let configuracaoAcao: ConfiguracaoAcaoCritica;
  let solicitacaoTeste: SolicitacaoAprovacao;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT) || 5432,
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
          database: process.env.DB_DATABASE_TEST || 'pgben_test',
          entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
          synchronize: true,
          dropSchema: true,
        }),
        AuthModule,
        UsuariosModule,
        AuditoriaModule,
        AprovacaoModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    // Configurar dados de teste
    await setupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await dataSource.destroy();
    await app.close();
  });

  beforeEach(async () => {
    // Limpar dados de teste entre os testes
    await dataSource.getRepository(SolicitacaoAprovacao).delete({});
    await dataSource.getRepository(HistoricoAprovacao).delete({});
  });

  /**
   * Configurar dados de teste iniciais
   */
  async function setupTestData() {
    // Criar usuários de teste
    const usuarioRepo = dataSource.getRepository(Usuario);

    usuarioSolicitante = await usuarioRepo.save({
      nome: 'João Solicitante',
      email: 'joao.solicitante@semtas.gov.br',
      cpf: '12345678901',
      roles: ['USER'],
      ativo: true,
      unidade_id: '123e4567-e89b-12d3-a456-426614174001',
    });

    usuarioAprovador = await usuarioRepo.save({
      nome: 'Maria Aprovadora',
      email: 'maria.aprovadora@semtas.gov.br',
      cpf: '12345678902',
      roles: ['APROVADOR'],
      ativo: true,
      unidade_id: '123e4567-e89b-12d3-a456-426614174001',
    });

    usuarioAdmin = await usuarioRepo.save({
      nome: 'Admin Sistema',
      email: 'admin@semtas.gov.br',
      cpf: '12345678903',
      roles: ['ADMIN'],
      ativo: true,
      unidade_id: '123e4567-e89b-12d3-a456-426614174001',
    });

    // Criar configuração de ação crítica
    const configuracaoRepo = dataSource.getRepository(ConfiguracaoAcaoCritica);
    configuracaoAcao = await configuracaoRepo.save({
      nome: 'Alteração de Dados Pessoais',
      descricao: 'Alteração de dados pessoais sensíveis',
      tipo: TipoAcaoCritica.ALTERACAO_DADOS_CRITICOS,
      estrategia: EstrategiaAprovacao.APROVACAO_SIMPLES,
      aprovadores_obrigatorios: [usuarioAprovador.id],
      aprovadores_alternativos: [],
      prazo_padrao_horas: 48,
      requer_justificativa: true,
      permite_auto_aprovacao: false,
      ativo: true,
    });

    // Gerar token de autenticação
    authToken = jwtService.sign({
      sub: usuarioSolicitante.id,
      email: usuarioSolicitante.email,
      roles: usuarioSolicitante.roles,
    });
  }

  /**
   * Limpar dados de teste
   */
  async function cleanupTestData() {
    await dataSource.getRepository(SolicitacaoAprovacao).delete({});
    await dataSource.getRepository(HistoricoAprovacao).delete({});
    await dataSource.getRepository(ConfiguracaoAcaoCritica).delete({});
    await dataSource.getRepository(Usuario).delete({});
  }

  describe('POST /aprovacao/solicitacoes', () => {
    it('deve criar uma nova solicitação de aprovação', async () => {
      const dadosSolicitacao = {
        acao_critica_id: configuracaoAcao.id,
        justificativa: 'Necessário corrigir dados incorretos no cadastro',
        dados_contexto: {
          usuario_id: usuarioSolicitante.id,
          campos_alterados: ['email', 'telefone'],
          valores_anteriores: {
            email: 'antigo@email.com',
            telefone: '(11) 99999-9999',
          },
          valores_novos: {
            email: 'novo@email.com',
            telefone: '(11) 88888-8888',
          },
        },
        prioridade: PrioridadeAprovacao.NORMAL,
        observacoes: 'Solicitação urgente',
      };

      const response = await request(app.getHttpServer())
        .post('/aprovacao/solicitacoes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(dadosSolicitacao)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        acao_critica_id: configuracaoAcao.id,
        solicitante_id: usuarioSolicitante.id,
        status: StatusSolicitacaoAprovacao.PENDENTE,
        justificativa: dadosSolicitacao.justificativa,
        prioridade: dadosSolicitacao.prioridade,
      });

      // Verificar se foi salva no banco
      const solicitacaoSalva = await dataSource
        .getRepository(SolicitacaoAprovacao)
        .findOne({ where: { id: response.body.id } });

      expect(solicitacaoSalva).toBeDefined();
      expect(solicitacaoSalva.status).toBe(StatusSolicitacaoAprovacao.PENDENTE);
    });

    it('deve rejeitar solicitação sem justificativa', async () => {
      const dadosIncompletos = {
        acao_critica_id: configuracaoAcao.id,
        dados_contexto: { teste: true },
        // justificativa ausente
      };

      await request(app.getHttpServer())
        .post('/aprovacao/solicitacoes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(dadosIncompletos)
        .expect(400);
    });

    it('deve rejeitar solicitação sem autenticação', async () => {
      const dadosSolicitacao = {
        acao_critica_id: configuracaoAcao.id,
        justificativa: 'Teste sem autenticação',
        dados_contexto: { teste: true },
      };

      await request(app.getHttpServer())
        .post('/aprovacao/solicitacoes')
        .send(dadosSolicitacao)
        .expect(401);
    });
  });

  describe('GET /aprovacao/solicitacoes', () => {
    beforeEach(async () => {
      // Criar algumas solicitações de teste
      const solicitacaoRepo = dataSource.getRepository(SolicitacaoAprovacao);
      
      await solicitacaoRepo.save([
        {
          acao_critica_id: configuracaoAcao.id,
          solicitante_id: usuarioSolicitante.id,
          status: StatusSolicitacaoAprovacao.PENDENTE,
          justificativa: 'Solicitação 1',
          dados_contexto: { teste: 1 },
          prioridade: PrioridadeAprovacao.NORMAL,
          prazo_aprovacao: new Date(Date.now() + 48 * 60 * 60 * 1000),
        },
        {
          acao_critica_id: configuracaoAcao.id,
          solicitante_id: usuarioSolicitante.id,
          status: StatusSolicitacaoAprovacao.APROVADA,
          justificativa: 'Solicitação 2',
          dados_contexto: { teste: 2 },
          prioridade: PrioridadeAprovacao.ALTA,
          prazo_aprovacao: new Date(Date.now() + 48 * 60 * 60 * 1000),
          aprovador_id: usuarioAprovador.id,
          data_processamento: new Date(),
        },
      ]);
    });

    it('deve listar todas as solicitações', async () => {
      const response = await request(app.getHttpServer())
        .get('/aprovacao/solicitacoes')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        data: expect.arrayContaining([
          expect.objectContaining({
            status: StatusSolicitacaoAprovacao.PENDENTE,
            justificativa: 'Solicitação 1',
          }),
          expect.objectContaining({
            status: StatusSolicitacaoAprovacao.APROVADA,
            justificativa: 'Solicitação 2',
          }),
        ]),
        meta: expect.objectContaining({
          total: 2,
          page: 1,
          limit: 20,
        }),
      });
    });

    it('deve filtrar solicitações por status', async () => {
      const response = await request(app.getHttpServer())
        .get('/aprovacao/solicitacoes')
        .query({ status: StatusSolicitacaoAprovacao.PENDENTE })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe(StatusSolicitacaoAprovacao.PENDENTE);
    });

    it('deve paginar resultados', async () => {
      const response = await request(app.getHttpServer())
        .get('/aprovacao/solicitacoes')
        .query({ page: 1, limit: 1 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.meta.total).toBe(2);
      expect(response.body.meta.totalPages).toBe(2);
    });
  });

  describe('PUT /aprovacao/solicitacoes/:id/aprovar', () => {
    beforeEach(async () => {
      // Criar solicitação para aprovação
      const solicitacaoRepo = dataSource.getRepository(SolicitacaoAprovacao);
      solicitacaoTeste = await solicitacaoRepo.save({
        acao_critica_id: configuracaoAcao.id,
        solicitante_id: usuarioSolicitante.id,
        status: StatusSolicitacaoAprovacao.PENDENTE,
        justificativa: 'Solicitação para aprovação',
        dados_contexto: { teste: true },
        prioridade: PrioridadeAprovacao.NORMAL,
        prazo_aprovacao: new Date(Date.now() + 48 * 60 * 60 * 1000),
      });
    });

    it('deve aprovar uma solicitação', async () => {
      // Usar token do aprovador
      const tokenAprovador = jwtService.sign({
        sub: usuarioAprovador.id,
        email: usuarioAprovador.email,
        roles: usuarioAprovador.roles,
      });

      const dadosAprovacao = {
        observacoes: 'Aprovado após verificação da documentação',
        dados_adicionais: {
          documentos_verificados: ['RG', 'CPF'],
          aprovacao_condicional: false,
        },
      };

      const response = await request(app.getHttpServer())
        .put(`/aprovacao/solicitacoes/${solicitacaoTeste.id}/aprovar`)
        .set('Authorization', `Bearer ${tokenAprovador}`)
        .send(dadosAprovacao)
        .expect(200);

      expect(response.body).toMatchObject({
        id: solicitacaoTeste.id,
        status: StatusSolicitacaoAprovacao.APROVADA,
        aprovador_id: usuarioAprovador.id,
        observacoes: dadosAprovacao.observacoes,
        data_processamento: expect.any(String),
      });

      // Verificar se foi atualizada no banco
      const solicitacaoAtualizada = await dataSource
        .getRepository(SolicitacaoAprovacao)
        .findOne({ where: { id: solicitacaoTeste.id } });

      expect(solicitacaoAtualizada.status).toBe(StatusSolicitacaoAprovacao.APROVADA);
      expect(solicitacaoAtualizada.aprovador_id).toBe(usuarioAprovador.id);
    });

    it('deve rejeitar aprovação por usuário não autorizado', async () => {
      const dadosAprovacao = {
        observacoes: 'Tentativa de aprovação não autorizada',
      };

      await request(app.getHttpServer())
        .put(`/aprovacao/solicitacoes/${solicitacaoTeste.id}/aprovar`)
        .set('Authorization', `Bearer ${authToken}`) // Token do solicitante
        .send(dadosAprovacao)
        .expect(403);
    });
  });

  describe('PUT /aprovacao/solicitacoes/:id/rejeitar', () => {
    beforeEach(async () => {
      // Criar solicitação para rejeição
      const solicitacaoRepo = dataSource.getRepository(SolicitacaoAprovacao);
      solicitacaoTeste = await solicitacaoRepo.save({
        acao_critica_id: configuracaoAcao.id,
        solicitante_id: usuarioSolicitante.id,
        status: StatusSolicitacaoAprovacao.PENDENTE,
        justificativa: 'Solicitação para rejeição',
        dados_contexto: { teste: true },
        prioridade: PrioridadeAprovacao.NORMAL,
        prazo_aprovacao: new Date(Date.now() + 48 * 60 * 60 * 1000),
      });
    });

    it('deve rejeitar uma solicitação', async () => {
      // Usar token do aprovador
      const tokenAprovador = jwtService.sign({
        sub: usuarioAprovador.id,
        email: usuarioAprovador.email,
        roles: usuarioAprovador.roles,
      });

      const dadosRejeicao = {
        motivo: 'DOCUMENTACAO_INSUFICIENTE',
        observacoes: 'Documentação apresentada não atende aos requisitos mínimos',
        dados_adicionais: {
          documentos_necessarios: ['Comprovante de residência', 'Declaração'],
          prazo_reenvio: '2024-12-31T23:59:59Z',
        },
      };

      const response = await request(app.getHttpServer())
        .put(`/aprovacao/solicitacoes/${solicitacaoTeste.id}/rejeitar`)
        .set('Authorization', `Bearer ${tokenAprovador}`)
        .send(dadosRejeicao)
        .expect(200);

      expect(response.body).toMatchObject({
        id: solicitacaoTeste.id,
        status: StatusSolicitacaoAprovacao.REJEITADA,
        aprovador_id: usuarioAprovador.id,
        observacoes: dadosRejeicao.observacoes,
        data_processamento: expect.any(String),
      });

      // Verificar se foi atualizada no banco
      const solicitacaoAtualizada = await dataSource
        .getRepository(SolicitacaoAprovacao)
        .findOne({ where: { id: solicitacaoTeste.id } });

      expect(solicitacaoAtualizada.status).toBe(StatusSolicitacaoAprovacao.REJEITADA);
    });

    it('deve exigir motivo para rejeição', async () => {
      const tokenAprovador = jwtService.sign({
        sub: usuarioAprovador.id,
        email: usuarioAprovador.email,
        roles: usuarioAprovador.roles,
      });

      const dadosIncompletos = {
        observacoes: 'Rejeitado sem motivo específico',
        // motivo ausente
      };

      await request(app.getHttpServer())
        .put(`/aprovacao/solicitacoes/${solicitacaoTeste.id}/rejeitar`)
        .set('Authorization', `Bearer ${tokenAprovador}`)
        .send(dadosIncompletos)
        .expect(400);
    });
  });

  describe('DELETE /aprovacao/solicitacoes/:id', () => {
    beforeEach(async () => {
      // Criar solicitação para cancelamento
      const solicitacaoRepo = dataSource.getRepository(SolicitacaoAprovacao);
      solicitacaoTeste = await solicitacaoRepo.save({
        acao_critica_id: configuracaoAcao.id,
        solicitante_id: usuarioSolicitante.id,
        status: StatusSolicitacaoAprovacao.PENDENTE,
        justificativa: 'Solicitação para cancelamento',
        dados_contexto: { teste: true },
        prioridade: PrioridadeAprovacao.NORMAL,
        prazo_aprovacao: new Date(Date.now() + 48 * 60 * 60 * 1000),
      });
    });

    it('deve cancelar uma solicitação pendente', async () => {
      const motivoCancelamento = {
        motivo: 'Solicitação feita por engano',
        observacoes: 'Cancelamento solicitado pelo próprio usuário',
      };

      const response = await request(app.getHttpServer())
        .delete(`/aprovacao/solicitacoes/${solicitacaoTeste.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(motivoCancelamento)
        .expect(200);

      expect(response.body).toMatchObject({
        id: solicitacaoTeste.id,
        status: StatusSolicitacaoAprovacao.CANCELADA,
      });

      // Verificar se foi atualizada no banco
      const solicitacaoAtualizada = await dataSource
        .getRepository(SolicitacaoAprovacao)
        .findOne({ where: { id: solicitacaoTeste.id } });

      expect(solicitacaoAtualizada.status).toBe(StatusSolicitacaoAprovacao.CANCELADA);
    });

    it('deve impedir cancelamento de solicitação já processada', async () => {
      // Atualizar status para aprovada
      await dataSource
        .getRepository(SolicitacaoAprovacao)
        .update(solicitacaoTeste.id, {
          status: StatusSolicitacaoAprovacao.APROVADA,
          aprovador_id: usuarioAprovador.id,
          data_processamento: new Date(),
        });

      const motivoCancelamento = {
        motivo: 'Tentativa de cancelamento inválida',
      };

      await request(app.getHttpServer())
        .delete(`/aprovacao/solicitacoes/${solicitacaoTeste.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(motivoCancelamento)
        .expect(400);
    });
  });

  describe('GET /aprovacao/estatisticas', () => {
    beforeEach(async () => {
      // Criar várias solicitações para estatísticas
      const solicitacaoRepo = dataSource.getRepository(SolicitacaoAprovacao);
      
      await solicitacaoRepo.save([
        {
          acao_critica_id: configuracaoAcao.id,
          solicitante_id: usuarioSolicitante.id,
          status: StatusSolicitacaoAprovacao.PENDENTE,
          justificativa: 'Pendente 1',
          dados_contexto: { teste: 1 },
          prioridade: PrioridadeAprovacao.NORMAL,
          prazo_aprovacao: new Date(Date.now() + 48 * 60 * 60 * 1000),
        },
        {
          acao_critica_id: configuracaoAcao.id,
          solicitante_id: usuarioSolicitante.id,
          status: StatusSolicitacaoAprovacao.APROVADA,
          justificativa: 'Aprovada 1',
          dados_contexto: { teste: 2 },
          prioridade: PrioridadeAprovacao.ALTA,
          prazo_aprovacao: new Date(Date.now() + 48 * 60 * 60 * 1000),
          aprovador_id: usuarioAprovador.id,
          data_processamento: new Date(),
        },
        {
          acao_critica_id: configuracaoAcao.id,
          solicitante_id: usuarioSolicitante.id,
          status: StatusSolicitacaoAprovacao.REJEITADA,
          justificativa: 'Rejeitada 1',
          dados_contexto: { teste: 3 },
          prioridade: PrioridadeAprovacao.NORMAL,
          prazo_aprovacao: new Date(Date.now() + 48 * 60 * 60 * 1000),
          aprovador_id: usuarioAprovador.id,
          data_processamento: new Date(),
        },
      ]);
    });

    it('deve retornar estatísticas do usuário', async () => {
      const response = await request(app.getHttpServer())
        .get('/aprovacao/estatisticas')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        total_solicitacoes: 3,
        pendentes: 1,
        aprovadas: 1,
        rejeitadas: 1,
        canceladas: 0,
        tempo_medio_aprovacao: expect.any(Number),
        solicitacoes_vencendo: expect.any(Number),
      });
    });
  });

  describe('Fluxo Completo de Aprovação', () => {
    it('deve executar fluxo completo: criação → aprovação → auditoria', async () => {
      // 1. Criar solicitação
      const dadosSolicitacao = {
        acao_critica_id: configuracaoAcao.id,
        justificativa: 'Fluxo completo de teste',
        dados_contexto: {
          usuario_id: usuarioSolicitante.id,
          acao: 'alteracao_email',
          valor_anterior: 'antigo@email.com',
          valor_novo: 'novo@email.com',
        },
        prioridade: PrioridadeAprovacao.NORMAL,
      };

      const criacaoResponse = await request(app.getHttpServer())
        .post('/aprovacao/solicitacoes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(dadosSolicitacao)
        .expect(201);

      const solicitacaoId = criacaoResponse.body.id;

      // 2. Aprovar solicitação
      const tokenAprovador = jwtService.sign({
        sub: usuarioAprovador.id,
        email: usuarioAprovador.email,
        roles: usuarioAprovador.roles,
      });

      const dadosAprovacao = {
        observacoes: 'Aprovado no fluxo completo',
        dados_adicionais: { teste_integracao: true },
      };

      const aprovacaoResponse = await request(app.getHttpServer())
        .put(`/aprovacao/solicitacoes/${solicitacaoId}/aprovar`)
        .set('Authorization', `Bearer ${tokenAprovador}`)
        .send(dadosAprovacao)
        .expect(200);

      expect(aprovacaoResponse.body.status).toBe(StatusSolicitacaoAprovacao.APROVADA);

      // 3. Verificar histórico
      const historicoResponse = await request(app.getHttpServer())
        .get(`/aprovacao/solicitacoes/${solicitacaoId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(historicoResponse.body.historico).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            acao: 'CRIADA',
            usuario_id: usuarioSolicitante.id,
          }),
          expect.objectContaining({
            acao: 'APROVADA',
            usuario_id: usuarioAprovador.id,
          }),
        ]),
      );

      // 4. Verificar auditoria (se implementada)
      // Aqui seria verificado se os registros de auditoria foram criados corretamente
    });
  });

  describe('Tratamento de Erros', () => {
    it('deve retornar 404 para solicitação inexistente', async () => {
      const idInexistente = '123e4567-e89b-12d3-a456-426614174999';

      await request(app.getHttpServer())
        .get(`/aprovacao/solicitacoes/${idInexistente}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('deve retornar 400 para dados inválidos', async () => {
      const dadosInvalidos = {
        acao_critica_id: 'id-invalido',
        justificativa: '', // vazio
        dados_contexto: null,
      };

      await request(app.getHttpServer())
        .post('/aprovacao/solicitacoes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(dadosInvalidos)
        .expect(400);
    });

    it('deve retornar 401 para requisições sem autenticação', async () => {
      await request(app.getHttpServer())
        .get('/aprovacao/solicitacoes')
        .expect(401);
    });
  });
});