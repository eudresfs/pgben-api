import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import {
  AgendamentoVisita,
  VisitaDomiciliar,
  AvaliacaoVisita,
  HistoricoMonitoramento,
  TipoAcaoHistorico,
  CategoriaHistorico,
} from '../../src/modules/monitoramento/entities';
import { StatusAgendamento } from '../../src/enums/status-agendamento.enum';
import { TipoVisita } from '../../src/enums/tipo-visita.enum';
import { ResultadoVisita } from '../../src/enums/resultado-visita.enum';
import { PrioridadeVisita } from '../../src/enums/prioridade-visita.enum';
import { Status } from '../../src/enums/status.enum';
import { Usuario } from '../../src/entities/usuario.entity';
import { Cidadao } from '../../src/entities/cidadao.entity';


/**
 * Testes de integração para o módulo de monitoramento.
 * Testa fluxos completos de agendamento, visitas e avaliações.
 */
describe('Monitoramento (Integração)', () => {
  let app: INestApplication;
  let agendamentoRepository: Repository<AgendamentoVisita>;
  let visitaRepository: Repository<VisitaDomiciliar>;
  let avaliacaoRepository: Repository<AvaliacaoVisita>;
  let historicoRepository: Repository<HistoricoMonitoramento>;
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
    historicoRepository = moduleFixture.get<Repository<HistoricoMonitoramento>>(
      getRepositoryToken(HistoricoMonitoramento),
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
      email: 'joao@teste.com',
      senhaHash: 'hash123',
      cpf: '12345678901',
      telefone: '11999999999',
      matricula: 'MAT001',
      role_id: 'role-id',
      unidade_id: 'unidade-id',
      setor_id: 'setor-id',
      status: Status.ATIVO,
    });
    await usuarioRepository.save(usuario);

    // Criar cidadão de teste
    cidadao = cidadaoRepository.create({
      nome: 'Maria Santos',
      cpf: '98765432100',
      rg: '1234567',
      nis: '12345678901',
      nome_mae: 'Ana Santos',
      naturalidade: 'Natal/RN',
      prontuario_suas: 'SUAS001',
      data_nascimento: '1990-01-01',
      sexo: 'feminino' as any,
      estado_civil: 'solteiro' as any,
      unidade_id: 'unidade-id',
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
    await historicoRepository.clear();
    await avaliacaoRepository.clear();
    await visitaRepository.clear();
    await agendamentoRepository.clear();
  });

  afterAll(async () => {
    // Limpar dados de teste
    await historicoRepository.clear();
    await avaliacaoRepository.clear();
    await visitaRepository.clear();
    await agendamentoRepository.clear();
    await usuarioRepository.remove(usuario);
    await cidadaoRepository.remove(cidadao);
    await app.close();
  });

  describe('Fluxo completo de monitoramento', () => {
    it('deve executar fluxo completo: agendamento → visita → avaliação', async () => {
      // 1. Criar agendamento
      const agendamentoDto = {
        cidadao_id: cidadao.id,
        tecnico_id: usuario.id,
        data_agendada: new Date(Date.now() + 24 * 60 * 60 * 1000), // Amanhã
        tipo_visita: TipoVisita.INICIAL,
        observacoes: 'Visita de teste para integração',
      };

      const agendamentoResponse = await request(app.getHttpServer())
        .post('/api/monitoramento/agendamentos')
        .set('Authorization', `Bearer ${authToken}`)
        .send(agendamentoDto)
        .expect(201);

      const agendamentoId = agendamentoResponse.body.id;
      expect(agendamentoResponse.body.status).toBe(StatusAgendamento.AGENDADO);

      // Verificar se histórico foi criado
      const historicos = await historicoRepository.find({
        where: { agendamento: { id: agendamentoId } },
      });
      expect(historicos).toHaveLength(1);
      expect(historicos[0].tipo_acao).toBe(TipoAcaoHistorico.AGENDAMENTO_CRIADO);

      // 2. Iniciar visita
      const visitaDto = {
        agendamento_id: agendamentoId,
        observacoes_iniciais: 'Iniciando visita domiciliar',
      };

      const visitaResponse = await request(app.getHttpServer())
        .post('/api/monitoramento/visitas')
        .set('Authorization', `Bearer ${authToken}`)
        .send(visitaDto)
        .expect(201);

      const visitaId = visitaResponse.body.id;
      expect(visitaResponse.body.data_inicio).toBeDefined();
      expect(visitaResponse.body.agendamento_id).toBe(agendamentoId);

      // 3. Finalizar visita
      const finalizarVisitaDto = {
        observacoes_finais: 'Visita finalizada com sucesso',
        resultado: ResultadoVisita.CONFORME,
      };

      await request(app.getHttpServer())
        .patch(`/api/monitoramento/visitas/${visitaId}/finalizar`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(finalizarVisitaDto)
        .expect(200);

      // 4. Criar avaliação
      const avaliacaoDto = {
        visita_id: visitaId,
        resultadoAvaliacao: 'positivo',
        nota_geral: 8.5,
        observacoes: 'Avaliação positiva da visita',
        recomendacoes: 'Continuar acompanhamento',
      };

      const avaliacaoResponse = await request(app.getHttpServer())
        .post('/api/monitoramento/avaliacoes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(avaliacaoDto)
        .expect(201);

      expect(avaliacaoResponse.body.resultadoAvaliacao).toBe('positivo');
      expect(avaliacaoResponse.body.nota_geral).toBe(8.5);

      // 5. Verificar histórico completo
      const historicoCompleto = await historicoRepository.find({
        order: { created_at: 'ASC' },
      });

      expect(historicoCompleto.length).toBeGreaterThanOrEqual(3);
      expect(historicoCompleto.some(h => h.tipo_acao === TipoAcaoHistorico.AGENDAMENTO_CRIADO)).toBe(true);
      expect(historicoCompleto.some(h => h.tipo_acao === TipoAcaoHistorico.VISITA_INICIADA)).toBe(true);
      expect(historicoCompleto.some(h => h.tipo_acao === TipoAcaoHistorico.AVALIACAO_CRIADA)).toBe(true);
    });

    it('deve cancelar agendamento e registrar no histórico', async () => {
      // Criar agendamento
      const agendamento = agendamentoRepository.create({
        cidadao: cidadao,
        tecnico: usuario,
        data_agendada: new Date(Date.now() + 24 * 60 * 60 * 1000),
        tipo_visita: TipoVisita.INICIAL,
        status: StatusAgendamento.AGENDADO,
      });
      await agendamentoRepository.save(agendamento);

      // Cancelar agendamento
      const cancelarDto = {
        motivo_cancelamento: 'Cidadão não estará disponível',
      };

      await request(app.getHttpServer())
        .patch(`/api/monitoramento/agendamentos/${agendamento.id}/cancelar`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(cancelarDto)
        .expect(200);

      // Verificar se agendamento foi cancelado
      const agendamentoCancelado = await agendamentoRepository.findOne({
        where: { id: agendamento.id },
      });
      expect(agendamentoCancelado.status).toBe(StatusAgendamento.CANCELADO);

      // Verificar histórico de cancelamento
      const historicos = await historicoRepository.find({
        where: { agendamento: { id: agendamento.id } },
      });
      expect(historicos.some(h => h.tipo_acao === TipoAcaoHistorico.AGENDAMENTO_CANCELADO)).toBe(true);
    });
  });

  describe('Relatórios e métricas', () => {
    beforeEach(async () => {
      // Criar dados de teste para relatórios
      const agendamento1 = agendamentoRepository.create({
        cidadao: cidadao,
        tecnico: usuario,
        data_agendada: new Date(),
        tipo_visita: TipoVisita.INICIAL,
        status: StatusAgendamento.REALIZADO,
      });
      await agendamentoRepository.save(agendamento1);

      const visita1 = visitaRepository.create({
        agendamento: agendamento1,
        data_inicio: new Date(),
        data_fim: new Date(),
        resultado: ResultadoVisita.CONFORME,
      });
      await visitaRepository.save(visita1);

      const avaliacao1 = avaliacaoRepository.create({
        visitaId: visita1.id,
        tipoAvaliacao: 'condicoes_habitacionais',
        criterioAvaliado: 'adequacao_estrutural',
        resultadoAvaliacao: 'adequado',
        notaAvaliacao: 9.0,
      });
      await avaliacaoRepository.save(avaliacao1);
    });

    it('deve obter métricas gerais', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/monitoramento/relatorios/metricas-gerais')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('total_agendamentos');
      expect(response.body).toHaveProperty('total_visitas');
      expect(response.body).toHaveProperty('total_avaliacoes');
      expect(response.body).toHaveProperty('media_notas');
      expect(response.body.total_agendamentos).toBeGreaterThan(0);
    });

    it('deve obter métricas por período', async () => {
      const dataInicio = new Date();
      dataInicio.setDate(dataInicio.getDate() - 7);
      const dataFim = new Date();

      const response = await request(app.getHttpServer())
        .get('/api/monitoramento/relatorios/metricas-periodo')
        .query({
          data_inicio: dataInicio.toISOString(),
          data_fim: dataFim.toISOString(),
          granularidade: 'dia',
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('periodo');
      expect(response.body[0]).toHaveProperty('agendamentos');
    });

    it('deve obter ranking de técnicos', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/monitoramento/relatorios/ranking-tecnicos')
        .query({
          criterio: 'visitas_realizadas',
          limite: 10,
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('tecnico_id');
        expect(response.body[0]).toHaveProperty('nome_tecnico');
        expect(response.body[0]).toHaveProperty('total_visitas');
      }
    });

    it('deve obter histórico de auditoria', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/monitoramento/relatorios/historico-auditoria')
        .query({
          categoria: CategoriaHistorico.AGENDAMENTO,
          limite: 50,
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('dados');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.dados)).toBe(true);
    });
  });

  describe('Validações e tratamento de erros', () => {
    it('deve retornar erro ao criar agendamento com dados inválidos', async () => {
      const agendamentoInvalido = {
        cidadao_id: 'id-inexistente',
        tecnico_id: usuario.id,
        data_agendada: new Date(Date.now() - 24 * 60 * 60 * 1000), // Data no passado
        tipo_visita: 'TIPO_INVALIDO',
      };

      await request(app.getHttpServer())
        .post('/api/monitoramento/agendamentos')
        .set('Authorization', `Bearer ${authToken}`)
        .send(agendamentoInvalido)
        .expect(400);
    });

    it('deve retornar erro ao tentar iniciar visita sem agendamento', async () => {
      const visitaInvalida = {
        agendamento_id: 'id-inexistente',
        observacoes_iniciais: 'Tentativa de visita inválida',
      };

      await request(app.getHttpServer())
        .post('/api/monitoramento/visitas')
        .set('Authorization', `Bearer ${authToken}`)
        .send(visitaInvalida)
        .expect(404);
    });

    it('deve retornar erro ao criar avaliação com nota inválida', async () => {
      // Criar agendamento e visita válidos
      const agendamento = agendamentoRepository.create({
        cidadao: cidadao,
        tecnico: usuario,
        data_agendada: new Date(),
        tipo_visita: TipoVisita.INICIAL,
        status: StatusAgendamento.REALIZADO,
      });
      await agendamentoRepository.save(agendamento);

      const visita = visitaRepository.create({
        agendamento: agendamento,
        data_inicio: new Date(),
        data_fim: new Date(),
        resultado: ResultadoVisita.CONFORME,
      });
      await visitaRepository.save(visita);

      // Tentar criar avaliação com nota inválida
      const avaliacaoInvalida = {
        visita_id: visita.id,
        resultadoAvaliacao: 'positivo',
        nota_geral: 15, // Nota acima do limite (0-10)
        observacoes: 'Avaliação com nota inválida',
      };

      await request(app.getHttpServer())
        .post('/api/monitoramento/avaliacoes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(avaliacaoInvalida)
        .expect(400);
    });
  });

  describe('Controle de acesso', () => {
    it('deve negar acesso sem token de autenticação', async () => {
      await request(app.getHttpServer())
        .get('/api/monitoramento/agendamentos')
        .expect(401);
    });

    it('deve permitir acesso com token válido', async () => {
      await request(app.getHttpServer())
        .get('/api/monitoramento/agendamentos')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
  });
});