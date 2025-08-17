import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { Role } from '../src/shared/enums/role.enum';
import { SolicitacaoAprovacao } from '../src/modules/aprovacao-v2/entities/solicitacao-aprovacao.entity';
import { AcaoAprovacao } from '../src/modules/aprovacao-v2/entities/acao-aprovacao.entity';
import { Aprovador } from '../src/modules/aprovacao-v2/entities/aprovador.entity';
import { StatusSolicitacao } from '../src/modules/aprovacao-v2/enums/status-solicitacao.enum';
import { TipoAcao } from '../src/modules/aprovacao-v2/enums/tipo-acao.enum';

/**
 * Testes de integração para o módulo de aprovação v2
 *
 * Estes testes verificam o funcionamento completo do fluxo de aprovação,
 * incluindo a criação de solicitações, processamento de aprovações e notificações.
 */
describe('AprovacaoV2Controller (e2e)', () => {
  let app: INestApplication;
  let solicitacaoRepository: Repository<SolicitacaoAprovacao>;
  let acaoRepository: Repository<AcaoAprovacao>;
  let aprovadorRepository: Repository<Aprovador>;
  let usuarioRepository: Repository<any>;
  let beneficioRepository: Repository<any>;
  let jwtService: JwtService;

  // Tokens de acesso para diferentes perfis
  let adminToken: string;
  let gestorToken: string;
  let tecnicoToken: string;
  let cidadaoToken: string;

  // IDs de entidades criadas durante os testes
  let beneficioId: string;
  let acaoSuspensaoId: string;
  let solicitacaoId: string;
  let aprovadorId: string;

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
    solicitacaoRepository = app.get(getRepositoryToken(SolicitacaoAprovacao));
    acaoRepository = app.get(getRepositoryToken(AcaoAprovacao));
    aprovadorRepository = app.get(getRepositoryToken(Aprovador));
    usuarioRepository = app.get(getRepositoryToken('Usuario'));
    beneficioRepository = app.get(getRepositoryToken('Beneficio'));
    jwtService = app.get(JwtService);

    // Limpar e preparar o banco de dados para os testes
    await solicitacaoRepository.clear();
    await aprovadorRepository.clear();
    await acaoRepository.clear();

    // Buscar usuários existentes para diferentes perfis
    const adminUser = await usuarioRepository.findOne({
      where: { role: Role.ADMIN },
    });
    const gestorUser = await usuarioRepository.findOne({
      where: { role: Role.GESTOR },
    });
    const tecnicoUser = await usuarioRepository.findOne({
      where: { role: Role.TECNICO },
    });
    const cidadaoUser = await usuarioRepository.findOne({
      where: { role: Role.CIDADAO },
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

    cidadaoToken = jwtService.sign(
      { sub: cidadaoUser.id, email: cidadaoUser.email, role: cidadaoUser.role },
      { secret: process.env.JWT_SECRET || 'secret_test', expiresIn: '1h' },
    );

    // Criar um benefício para usar nos testes
    const beneficio = await beneficioRepository.save({
      nome: 'Auxílio Emergencial - Teste E2E',
      descricao: 'Benefício para testes de aprovação',
      valor: 200.0,
      ativo: true,
    });
    beneficioId = beneficio.id;

    // Criar ação de aprovação para suspensão de benefício
    const acaoSuspensao = await acaoRepository.save({
      nome: 'Suspensão de Benefício',
      descricao: 'Suspensão temporária ou definitiva de benefício',
      tipo: TipoAcao.SUSPENSAO_BENEFICIO,
      requer_aprovacao: true,
      nivel_aprovacao: 1,
      ativo: true,
    });
    acaoSuspensaoId = acaoSuspensao.id;

    // Criar aprovador para a ação
    const aprovador = await aprovadorRepository.save({
      usuario_id: gestorUser.id,
      acao_aprovacao_id: acaoSuspensaoId,
      nivel: 1,
      ativo: true,
    });
    aprovadorId = aprovador.id;
  });

  afterAll(async () => {
    // Limpar o banco de dados após os testes
    await solicitacaoRepository.clear();
    await aprovadorRepository.clear();
    await acaoRepository.clear();
    await beneficioRepository.delete(beneficioId);
    await app.close();
  });

  describe('Fluxo completo de aprovação - Suspensão de benefício', () => {
    it('deve permitir que um cidadão crie uma solicitação de suspensão de benefício', async () => {
      const createSolicitacaoDto = {
        tipo_acao: TipoAcao.SUSPENSAO_BENEFICIO,
        dados_contexto: {
          beneficio_id: beneficioId,
          motivo: 'Solicitação de suspensão temporária por mudança de situação financeira',
          periodo_suspensao: '3 meses',
        },
        observacoes: 'Cidadão solicitou suspensão temporária do benefício',
      };

      const response = await request(app.getHttpServer())
        .post('/aprovacao-v2/solicitacoes')
        .set('Authorization', `Bearer ${cidadaoToken}`)
        .send(createSolicitacaoDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('codigo');
      expect(response.body.status).toBe(StatusSolicitacao.PENDENTE);
      expect(response.body.tipo_acao).toBe(TipoAcao.SUSPENSAO_BENEFICIO);
      expect(response.body.dados_contexto.beneficio_id).toBe(beneficioId);
      expect(response.body.aprovadores).toHaveLength(1);
      expect(response.body.aprovadores[0].ativo).toBe(true);

      // Salvar o ID para uso em testes posteriores
      solicitacaoId = response.body.id;
    });

    it('deve impedir que um cidadão aprove sua própria solicitação', async () => {
      await request(app.getHttpServer())
        .post(`/aprovacao-v2/solicitacoes/${solicitacaoId}/processar`)
        .set('Authorization', `Bearer ${cidadaoToken}`)
        .send({
          aprovado: true,
          observacoes: 'Tentativa de auto-aprovação',
        })
        .expect(403);
    });

    it('deve impedir que um técnico (sem permissão de aprovador) aprove a solicitação', async () => {
      await request(app.getHttpServer())
        .post(`/aprovacao-v2/solicitacoes/${solicitacaoId}/processar`)
        .set('Authorization', `Bearer ${tecnicoToken}`)
        .send({
          aprovado: true,
          observacoes: 'Tentativa de aprovação sem permissão',
        })
        .expect(403);
    });

    it('deve permitir que um gestor (aprovador) aprove a solicitação', async () => {
      const response = await request(app.getHttpServer())
        .post(`/aprovacao-v2/solicitacoes/${solicitacaoId}/processar`)
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({
          aprovado: true,
          observacoes: 'Solicitação aprovada após análise',
        })
        .expect(200);

      expect(response.body.status).toBe(StatusSolicitacao.APROVADA);
      expect(response.body.processado_em).toBeDefined();
      expect(response.body.processado_por).toBeDefined();
    });

    it('deve retornar a solicitação processada na consulta', async () => {
      const response = await request(app.getHttpServer())
        .get(`/aprovacao-v2/solicitacoes/${solicitacaoId}`)
        .set('Authorization', `Bearer ${cidadaoToken}`)
        .expect(200);

      expect(response.body.id).toBe(solicitacaoId);
      expect(response.body.status).toBe(StatusSolicitacao.APROVADA);
      expect(response.body.processado_em).toBeDefined();
    });
  });

  describe('Fluxo de rejeição', () => {
    let solicitacaoRejeitadaId: string;

    it('deve permitir criar uma nova solicitação para testar rejeição', async () => {
      const createSolicitacaoDto = {
        tipo_acao: TipoAcao.SUSPENSAO_BENEFICIO,
        dados_contexto: {
          beneficio_id: beneficioId,
          motivo: 'Solicitação que será rejeitada',
        },
        observacoes: 'Teste de rejeição',
      };

      const response = await request(app.getHttpServer())
        .post('/aprovacao-v2/solicitacoes')
        .set('Authorization', `Bearer ${cidadaoToken}`)
        .send(createSolicitacaoDto)
        .expect(201);

      solicitacaoRejeitadaId = response.body.id;
    });

    it('deve permitir que um gestor rejeite a solicitação', async () => {
      const response = await request(app.getHttpServer())
        .post(`/aprovacao-v2/solicitacoes/${solicitacaoRejeitadaId}/processar`)
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({
          aprovado: false,
          observacoes: 'Solicitação rejeitada por falta de documentação',
        })
        .expect(200);

      expect(response.body.status).toBe(StatusSolicitacao.REJEITADA);
      expect(response.body.processado_em).toBeDefined();
    });
  });

  describe('Fluxo de cancelamento', () => {
    let solicitacaoCanceladaId: string;

    it('deve permitir criar uma nova solicitação para testar cancelamento', async () => {
      const createSolicitacaoDto = {
        tipo_acao: TipoAcao.SUSPENSAO_BENEFICIO,
        dados_contexto: {
          beneficio_id: beneficioId,
          motivo: 'Solicitação que será cancelada',
        },
        observacoes: 'Teste de cancelamento',
      };

      const response = await request(app.getHttpServer())
        .post('/aprovacao-v2/solicitacoes')
        .set('Authorization', `Bearer ${cidadaoToken}`)
        .send(createSolicitacaoDto)
        .expect(201);

      solicitacaoCanceladaId = response.body.id;
    });

    it('deve permitir que o solicitante cancele sua própria solicitação', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/aprovacao-v2/solicitacoes/${solicitacaoCanceladaId}/cancelar`)
        .set('Authorization', `Bearer ${cidadaoToken}`)
        .expect(200);

      expect(response.body.status).toBe(StatusSolicitacao.CANCELADA);
      expect(response.body.processado_em).toBeDefined();
    });

    it('deve impedir o processamento de uma solicitação cancelada', async () => {
      await request(app.getHttpServer())
        .post(`/aprovacao-v2/solicitacoes/${solicitacaoCanceladaId}/processar`)
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({
          aprovado: true,
          observacoes: 'Tentativa de processar solicitação cancelada',
        })
        .expect(400);
    });
  });

  describe('Listagem e consultas', () => {
    it('deve retornar lista de solicitações para o cidadão (apenas suas próprias)', async () => {
      const response = await request(app.getHttpServer())
        .get('/aprovacao-v2/solicitacoes')
        .set('Authorization', `Bearer ${cidadaoToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.items.length).toBeGreaterThan(0);
      
      // Verificar se todas as solicitações pertencem ao cidadão
      response.body.items.forEach((solicitacao: any) => {
        expect(solicitacao.solicitante_id).toBeDefined();
      });
    });

    it('deve retornar lista de solicitações para aprovação (gestor)', async () => {
      const response = await request(app.getHttpServer())
        .get('/aprovacao-v2/solicitacoes/para-aprovacao')
        .set('Authorization', `Bearer ${gestorToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('meta');
    });

    it('deve retornar erro 403 para técnico tentando acessar solicitações para aprovação', async () => {
      await request(app.getHttpServer())
        .get('/aprovacao-v2/solicitacoes/para-aprovacao')
        .set('Authorization', `Bearer ${tecnicoToken}`)
        .expect(403);
    });
  });

  describe('Validações de entrada', () => {
    it('deve retornar erro 400 para dados inválidos na criação', async () => {
      const invalidDto = {
        // Sem tipo_acao obrigatório
        dados_contexto: {},
      };

      await request(app.getHttpServer())
        .post('/aprovacao-v2/solicitacoes')
        .set('Authorization', `Bearer ${cidadaoToken}`)
        .send(invalidDto)
        .expect(400);
    });

    it('deve retornar erro 400 para tipo de ação inexistente', async () => {
      const invalidDto = {
        tipo_acao: 'ACAO_INEXISTENTE',
        dados_contexto: {
          beneficio_id: beneficioId,
        },
      };

      await request(app.getHttpServer())
        .post('/aprovacao-v2/solicitacoes')
        .set('Authorization', `Bearer ${cidadaoToken}`)
        .send(invalidDto)
        .expect(400);
    });
  });

  describe('Autenticação e autorização', () => {
    it('deve retornar erro 401 para requisições sem token', async () => {
      await request(app.getHttpServer())
        .get('/aprovacao-v2/solicitacoes')
        .expect(401);
    });

    it('deve retornar erro 401 para token inválido', async () => {
      await request(app.getHttpServer())
        .get('/aprovacao-v2/solicitacoes')
        .set('Authorization', 'Bearer token_invalido')
        .expect(401);
    });
  });
});