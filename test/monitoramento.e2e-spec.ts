import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import {
  AgendamentoVisita,
  VisitaDomiciliar,
  AvaliacaoVisita,
  StatusAgendamento,
  TipoVisita,
  ResultadoVisita,
  TipoResultadoAvaliacao,
} from '../src/modules/monitoramento/entities';
import { Usuario } from '../src/entities';
import { Cidadao } from '../src/entities';

/**
 * Testes End-to-End para o módulo de monitoramento.
 * Testa a API REST completa do módulo.
 */
describe('Monitoramento E2E', () => {
  let app: INestApplication;
  let agendamentoRepository: Repository<AgendamentoVisita>;
  let visitaRepository: Repository<VisitaDomiciliar>;
  let avaliacaoRepository: Repository<AvaliacaoVisita>;
  let usuarioRepository: Repository<Usuario>;
  let cidadaoRepository: Repository<Cidadao>;
  let jwtService: JwtService;
  let authToken: string;
  let usuario: Usuario;
  let cidadao: Cidadao;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Obter repositórios
    agendamentoRepository = moduleFixture.get<Repository<AgendamentoVisita>>(
      getRepositoryToken(AgendamentoVisita),
    );
    visitaRepository = moduleFixture.get<Repository<VisitaDomiciliar>>(
      getRepositoryToken(VisitaDomiciliar),
    );
    avaliacaoRepository = moduleFixture.get<Repository<AvaliacaoVisita>>(
      getRepositoryToken(AvaliacaoVisita),
    );
    usuarioRepository = moduleFixture.get<Repository<Usuario>>(
      getRepositoryToken(Usuario),
    );
    cidadaoRepository = moduleFixture.get<Repository<Cidadao>>(
      getRepositoryToken(Cidadao),
    );
    jwtService = moduleFixture.get<JwtService>(JwtService);

    // Criar usuário de teste
    usuario = usuarioRepository.create({
      id: 'test-user-e2e',
      nome: 'Técnico E2E',
      email: 'tecnico.e2e@teste.com',
      senha: 'senha123',
      ativo: true,
    });
    await usuarioRepository.save(usuario);

    // Criar cidadão de teste
    cidadao = cidadaoRepository.create({
      id: 'test-cidadao-e2e',
      nome: 'Cidadão E2E',
      cpf: '98765432100',
      email: 'cidadao.e2e@teste.com',
      telefone: '11888888888',
    });
    await cidadaoRepository.save(cidadao);

    // Gerar token de autenticação
    authToken = jwtService.sign({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      roles: ['tecnico'],
    });
  });

  beforeEach(async () => {
    // Limpar dados antes de cada teste
    await avaliacaoRepository.clear();
    await visitaRepository.clear();
    await agendamentoRepository.clear();
  });

  afterAll(async () => {
    // Limpar dados de teste
    await avaliacaoRepository.clear();
    await visitaRepository.clear();
    await agendamentoRepository.clear();
    await usuarioRepository.remove(usuario);
    await cidadaoRepository.remove(cidadao);
    await app.close();
  });

  describe('/api/monitoramento/agendamentos (POST)', () => {
    it('deve criar um novo agendamento', async () => {
      const agendamentoDto = {
        cidadao_id: cidadao.id,
        tecnico_id: usuario.id,
        data_agendada: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        tipo_visita: TipoVisita.DOMICILIAR,
        observacoes: 'Agendamento de teste E2E',
      };

      const response = await request(app.getHttpServer())
        .post('/api/monitoramento/agendamentos')
        .set('Authorization', `Bearer ${authToken}`)
        .send(agendamentoDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe(StatusAgendamento.AGENDADO);
      expect(response.body.tipo_visita).toBe(TipoVisita.DOMICILIAR);
      expect(response.body.observacoes).toBe('Agendamento de teste E2E');
    });

    it('deve retornar erro 400 para dados inválidos', async () => {
      const agendamentoInvalido = {
        cidadao_id: '',
        tecnico_id: usuario.id,
        data_agendada: 'data-invalida',
        tipo_visita: 'TIPO_INVALIDO',
      };

      await request(app.getHttpServer())
        .post('/api/monitoramento/agendamentos')
        .set('Authorization', `Bearer ${authToken}`)
        .send(agendamentoInvalido)
        .expect(400);
    });
  });

  describe('/api/monitoramento/agendamentos (GET)', () => {
    beforeEach(async () => {
      // Criar agendamentos de teste
      const agendamentos = [
        {
          cidadao: cidadao,
          tecnico: usuario,
          data_agendada: new Date(Date.now() + 24 * 60 * 60 * 1000),
          tipo_visita: TipoVisita.DOMICILIAR,
          status: StatusAgendamento.AGENDADO,
        },
        {
          cidadao: cidadao,
          tecnico: usuario,
          data_agendada: new Date(Date.now() + 48 * 60 * 60 * 1000),
          tipo_visita: TipoVisita.TELEFONICA,
          status: StatusAgendamento.AGENDADO,
        },
      ];

      for (const agendamento of agendamentos) {
        const entity = agendamentoRepository.create(agendamento);
        await agendamentoRepository.save(entity);
      }
    });

    it('deve listar agendamentos com paginação', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/monitoramento/agendamentos')
        .query({ page: 1, limit: 10 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('dados');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('pagina');
      expect(response.body).toHaveProperty('limite');
      expect(Array.isArray(response.body.dados)).toBe(true);
      expect(response.body.dados.length).toBeGreaterThan(0);
    });

    it('deve filtrar agendamentos por status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/monitoramento/agendamentos')
        .query({ status: StatusAgendamento.AGENDADO })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.dados.every(
        (agendamento: any) => agendamento.status === StatusAgendamento.AGENDADO
      )).toBe(true);
    });
  });

  describe('/api/monitoramento/agendamentos/:id (GET)', () => {
    let agendamentoId: string;

    beforeEach(async () => {
      const agendamento = agendamentoRepository.create({
        cidadao: cidadao,
        tecnico: usuario,
        data_agendada: new Date(Date.now() + 24 * 60 * 60 * 1000),
        tipo_visita: TipoVisita.DOMICILIAR,
        status: StatusAgendamento.AGENDADO,
      });
      const saved = await agendamentoRepository.save(agendamento);
      agendamentoId = saved.id;
    });

    it('deve buscar agendamento por ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/monitoramento/agendamentos/${agendamentoId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(agendamentoId);
      expect(response.body.status).toBe(StatusAgendamento.AGENDADO);
    });

    it('deve retornar 404 para ID inexistente', async () => {
      await request(app.getHttpServer())
        .get('/api/monitoramento/agendamentos/id-inexistente')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('/api/monitoramento/visitas (POST)', () => {
    let agendamentoId: string;

    beforeEach(async () => {
      const agendamento = agendamentoRepository.create({
        cidadao: cidadao,
        tecnico: usuario,
        data_agendada: new Date(),
        tipo_visita: TipoVisita.DOMICILIAR,
        status: StatusAgendamento.AGENDADO,
      });
      const saved = await agendamentoRepository.save(agendamento);
      agendamentoId = saved.id;
    });

    it('deve iniciar uma nova visita', async () => {
      const visitaDto = {
        agendamento_id: agendamentoId,
        observacoes_iniciais: 'Iniciando visita E2E',
      };

      const response = await request(app.getHttpServer())
        .post('/api/monitoramento/visitas')
        .set('Authorization', `Bearer ${authToken}`)
        .send(visitaDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.agendamento_id).toBe(agendamentoId);
      expect(response.body.data_inicio).toBeDefined();
      expect(response.body.observacoes_iniciais).toBe('Iniciando visita E2E');
    });
  });

  describe('/api/monitoramento/visitas/:id/finalizar (PATCH)', () => {
    let visitaId: string;

    beforeEach(async () => {
      const agendamento = agendamentoRepository.create({
        cidadao: cidadao,
        tecnico: usuario,
        data_agendada: new Date(),
        tipo_visita: TipoVisita.DOMICILIAR,
        status: StatusAgendamento.EM_ANDAMENTO,
      });
      await agendamentoRepository.save(agendamento);

      const visita = visitaRepository.create({
        agendamento: agendamento,
        data_inicio: new Date(),
      });
      const saved = await visitaRepository.save(visita);
      visitaId = saved.id;
    });

    it('deve finalizar uma visita', async () => {
      const finalizarDto = {
        observacoes_finais: 'Visita finalizada com sucesso',
        resultado: ResultadoVisita.REALIZADA,
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/monitoramento/visitas/${visitaId}/finalizar`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(finalizarDto)
        .expect(200);

      expect(response.body.data_fim).toBeDefined();
      expect(response.body.resultado).toBe(ResultadoVisita.REALIZADA);
      expect(response.body.observacoes_finais).toBe('Visita finalizada com sucesso');
    });
  });

  describe('/api/monitoramento/avaliacoes (POST)', () => {
    let visitaId: string;

    beforeEach(async () => {
      const agendamento = agendamentoRepository.create({
        cidadao: cidadao,
        tecnico: usuario,
        data_agendada: new Date(),
        tipo_visita: TipoVisita.DOMICILIAR,
        status: StatusAgendamento.REALIZADO,
      });
      await agendamentoRepository.save(agendamento);

      const visita = visitaRepository.create({
        agendamento: agendamento,
        data_inicio: new Date(),
        data_fim: new Date(),
        resultado: ResultadoVisita.REALIZADA,
      });
      const saved = await visitaRepository.save(visita);
      visitaId = saved.id;
    });

    it('deve criar uma avaliação', async () => {
      const avaliacaoDto = {
        visita_id: visitaId,
        tipo_resultado: TipoResultadoAvaliacao.POSITIVO,
        nota_geral: 8.5,
        observacoes: 'Avaliação E2E positiva',
        recomendacoes: 'Continuar acompanhamento',
      };

      const response = await request(app.getHttpServer())
        .post('/api/monitoramento/avaliacoes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(avaliacaoDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.tipo_resultado).toBe(TipoResultadoAvaliacao.POSITIVO);
      expect(response.body.nota_geral).toBe(8.5);
      expect(response.body.observacoes).toBe('Avaliação E2E positiva');
    });

    it('deve retornar erro para nota inválida', async () => {
      const avaliacaoInvalida = {
        visita_id: visitaId,
        tipo_resultado: TipoResultadoAvaliacao.POSITIVO,
        nota_geral: 15, // Nota inválida (acima de 10)
        observacoes: 'Avaliação com nota inválida',
      };

      await request(app.getHttpServer())
        .post('/api/monitoramento/avaliacoes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(avaliacaoInvalida)
        .expect(400);
    });
  });

  describe('/api/monitoramento/relatorios/metricas-gerais (GET)', () => {
    beforeEach(async () => {
      // Criar dados de teste para métricas
      const agendamento = agendamentoRepository.create({
        cidadao: cidadao,
        tecnico: usuario,
        data_agendada: new Date(),
        tipo_visita: TipoVisita.DOMICILIAR,
        status: StatusAgendamento.REALIZADO,
      });
      await agendamentoRepository.save(agendamento);

      const visita = visitaRepository.create({
        agendamento: agendamento,
        data_inicio: new Date(),
        data_fim: new Date(),
        resultado: ResultadoVisita.REALIZADA,
      });
      await visitaRepository.save(visita);

      const avaliacao = avaliacaoRepository.create({
        visita: visita,
        tipo_resultado: TipoResultadoAvaliacao.POSITIVO,
        nota_geral: 9.0,
      });
      await avaliacaoRepository.save(avaliacao);
    });

    it('deve retornar métricas gerais', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/monitoramento/relatorios/metricas-gerais')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('total_agendamentos');
      expect(response.body).toHaveProperty('total_visitas');
      expect(response.body).toHaveProperty('total_avaliacoes');
      expect(response.body).toHaveProperty('media_notas');
      expect(response.body).toHaveProperty('taxa_realizacao');
      expect(typeof response.body.total_agendamentos).toBe('number');
      expect(typeof response.body.media_notas).toBe('number');
    });
  });

  describe('Autenticação e autorização', () => {
    it('deve retornar 401 sem token de autenticação', async () => {
      await request(app.getHttpServer())
        .get('/api/monitoramento/agendamentos')
        .expect(401);
    });

    it('deve retornar 401 com token inválido', async () => {
      await request(app.getHttpServer())
        .get('/api/monitoramento/agendamentos')
        .set('Authorization', 'Bearer token-invalido')
        .expect(401);
    });

    it('deve permitir acesso com token válido', async () => {
      await request(app.getHttpServer())
        .get('/api/monitoramento/agendamentos')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
  });

  describe('Validação de entrada', () => {
    it('deve validar formato de UUID para IDs', async () => {
      await request(app.getHttpServer())
        .get('/api/monitoramento/agendamentos/id-invalido')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('deve validar parâmetros de paginação', async () => {
      await request(app.getHttpServer())
        .get('/api/monitoramento/agendamentos')
        .query({ page: -1, limit: 0 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });
});