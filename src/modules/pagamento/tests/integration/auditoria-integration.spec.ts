import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { PagamentoController } from '../../controllers/pagamento.controller';
import { PagamentoService } from '../../services/pagamento.service';
import { AuditoriaInterceptor } from '../../interceptors/auditoria.interceptor';
import { LogAuditoria } from '../../../../entities/log-auditoria.entity';
import { TipoOperacao } from '../../../../enums/tipo-operacao.enum';
import { StatusPagamentoEnum } from '../../../../enums/status-pagamento.enum';
import { Role } from '../../../../enums/role.enum';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../auth/guards/roles.guard';
import { APP_INTERCEPTOR } from '@nestjs/core';

describe('Auditoria Integration (e2e)', () => {
  let app: INestApplication;
  let auditoriaRepository: Repository<LogAuditoria>;
  let moduleFixture: TestingModule;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    perfil: Role.ADMIN,
    unidadeId: 'unidade-123',
    nome: 'Test User',
  };

  const mockJwtGuard = {
    canActivate: jest.fn(() => true),
  };

  const mockRolesGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          entities: [LogAuditoria],
          synchronize: true,
          logging: false,
        }),
        TypeOrmModule.forFeature([LogAuditoria]),
      ],
      controllers: [PagamentoController],
      providers: [
          {
            provide: APP_INTERCEPTOR,
            useClass: AuditoriaInterceptor,
          },
          {
            provide: 'PagamentoService',
            useValue: {
              create: jest.fn(),
              findAll: jest.fn(),
              findOne: jest.fn(),
              update: jest.fn(),
              remove: jest.fn(),
            },
          },
        ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    
    // Mock do usuário autenticado
    app.use((req, res, next) => {
      req.user = mockUser;
      next();
    });

    await app.init();

    auditoriaRepository = moduleFixture.get(getRepositoryToken(LogAuditoria));
  });

  afterAll(async () => {
    await app.close();
    await moduleFixture.close();
  });

  beforeEach(async () => {
    // Limpar dados de teste
    await auditoriaRepository.clear();
  });

  describe('POST /pagamentos', () => {
    it('deve registrar auditoria ao criar pagamento', async () => {
      // Arrange
      const createPagamentoDto = {
        solicitacaoId: 'solicitacao-123',
        valor: 1000,
        dadosBancarios: {
          conta: '12345678',
          agencia: '1234',
          chavePix: '12345678901',
          pixTipo: 'CPF',
        },
        observacoes: 'Pagamento de teste',
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/pagamentos')
        .send(createPagamentoDto)
        .expect(201);

      // Assert
      const pagamento = response.body;
      expect(pagamento).toBeDefined();
      expect(pagamento.id).toBeDefined();

      // Aguardar um pouco para a auditoria assíncrona
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verificar se o log de auditoria foi criado
      const logsAuditoria = await auditoriaRepository.find({
        where: { entidade_id: pagamento.id },
      });

      expect(logsAuditoria).toHaveLength(1);
      
      const logAuditoria = logsAuditoria[0];
      expect(logAuditoria.tipo_operacao).toBe(TipoOperacao.CREATE);
      expect(logAuditoria.entidade_afetada).toBe('Pagamento');
      expect(logAuditoria.usuario_id).toBe(mockUser.id);
      expect(logAuditoria.endpoint).toBe('/pagamentos');
      expect(logAuditoria.metodo_http).toBe('POST');
      expect(logAuditoria.sucesso).toBe(true);
      expect(logAuditoria.status_http).toBe(201);
      expect(logAuditoria.dados_novos).toBeDefined();
      
      // Verificar se dados sensíveis foram mascarados
      const dadosNovos = logAuditoria.dados_novos as any;
      if (dadosNovos.dadosBancarios) {
        expect(dadosNovos.dadosBancarios.conta).toMatch(/\*+/);
        expect(dadosNovos.dadosBancarios.chavePix).toMatch(/\*+/);
      }
    });
  });

  it('deve registrar log de auditoria básico', async () => {
    // Criar um log de auditoria diretamente para testar a funcionalidade
    const logData = {
        tipo_operacao: TipoOperacao.CREATE,
        entidade_afetada: 'Pagamento',
        entidade_id: 'test-id',
        usuario_id: 'test-user-id',
        dados_anteriores: null,
        dados_novos: JSON.stringify({ valor: 500.0, status: StatusPagamentoEnum.AGENDADO }),
        ip_address: '127.0.0.1',
        user_agent: 'test-agent',
      };

    const log = auditoriaRepository.create(logData);
    await auditoriaRepository.save(log);

    // Verificar se o log foi salvo corretamente
    const logs = await auditoriaRepository.find();
    expect(logs).toHaveLength(1);

    const savedLog = logs[0];
     expect(savedLog.tipo_operacao).toBe(TipoOperacao.CREATE);
      expect(savedLog.entidade_afetada).toBe('Pagamento');
      expect(savedLog.entidade_id).toBe('test-id');
      expect(savedLog.usuario_id).toBe('test-user-id');
  });





  describe('Mascaramento de Dados Sensíveis', () => {
    it('deve mascarar dados bancários nos logs de auditoria', async () => {
      // Arrange
      const createPagamentoDto = {
        solicitacaoId: 'solicitacao-123',
        valor: 1000,
        dadosBancarios: {
          conta: '12345678',
          agencia: '1234',
          chavePix: '12345678901',
          pixTipo: 'CPF',
        },
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/pagamentos')
        .send(createPagamentoDto)
        .expect(201);

      // Assert
      const pagamento = response.body;
      
      // Aguardar um pouco para a auditoria assíncrona
      await new Promise(resolve => setTimeout(resolve, 100));

      const logsAuditoria = await auditoriaRepository.find({
        where: { entidade_id: pagamento.id },
      });

      expect(logsAuditoria).toHaveLength(1);
      
      const logAuditoria = logsAuditoria[0];
      const dadosNovos = logAuditoria.dados_novos as any;
      
      // Verificar se os dados bancários foram mascarados
      expect(dadosNovos.dadosBancarios).toBeDefined();
      expect(dadosNovos.dadosBancarios.conta).not.toBe('12345678');
      expect(dadosNovos.dadosBancarios.conta).toMatch(/\*+/);
      expect(dadosNovos.dadosBancarios.chavePix).not.toBe('12345678901');
      expect(dadosNovos.dadosBancarios.chavePix).toMatch(/\*+/);
      
      // Verificar se dados não sensíveis não foram mascarados
      expect(dadosNovos.valor).toBe(1000);
      expect(dadosNovos.solicitacaoId).toBe('solicitacao-123');
    });
  });

  describe('Tratamento de Erros', () => {
    it('deve registrar auditoria mesmo quando ocorre erro', async () => {
      // Arrange - Tentar criar pagamento com dados inválidos
      const invalidDto = {
        // Dados inválidos que devem causar erro
        valor: -100, // Valor negativo
      };

      // Act
      await request(app.getHttpServer())
        .post('/pagamentos')
        .send(invalidDto)
        .expect(400); // Bad Request

      // Assert
      // Aguardar um pouco para a auditoria assíncrona
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verificar se o log de auditoria foi criado mesmo com erro
      const logsAuditoria = await auditoriaRepository.find({
        where: { 
          tipo_operacao: TipoOperacao.CREATE,
          entidade_afetada: 'Pagamento',
          sucesso: false,
        },
      });

      expect(logsAuditoria.length).toBeGreaterThan(0);
      
      const logAuditoria = logsAuditoria[0];
      expect(logAuditoria.sucesso).toBe(false);
      expect(logAuditoria.status_http).toBe(400);
      expect(logAuditoria.detalhes_erro).toBeDefined();
    });
  });
});