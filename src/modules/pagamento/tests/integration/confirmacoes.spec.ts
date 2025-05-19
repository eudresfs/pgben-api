import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { HttpModule } from '@nestjs/axios';

import { PagamentoModule } from '../../pagamento.module';
import { Pagamento } from '../../entities/pagamento.entity';
import { ComprovantePagamento } from '../../entities/comprovante-pagamento.entity';
import { ConfirmacaoRecebimento } from '../../entities/confirmacao-recebimento.entity';
import { StatusPagamentoEnum } from '../../enums/status-pagamento.enum';
import { MetodoPagamentoEnum } from '../../enums/metodo-pagamento.enum';
import { PagamentoService } from '../../services/pagamento.service';
import { AuditoriaPagamentoService } from '../../services/auditoria-pagamento.service';

/**
 * Testes de integração para confirmações de recebimento de pagamento
 * 
 * Verifica o funcionamento correto das operações de registro, consulta
 * e listagem de confirmações de recebimento de pagamentos.
 * 
 * @author Equipe PGBen
 */
describe('Confirmações de Recebimento (Integration)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let pagamentoService: PagamentoService;
  let auditoriaPagamentoService: AuditoriaPagamentoService;
  
  let pagamentoRepository: Repository<Pagamento>;
  let confirmacaoRepository: Repository<ConfirmacaoRecebimento>;
  
  // Dados de teste
  const usuarioId = 'usuario-teste-id';
  const gestorId = 'gestor-teste-id';
  const unidadeId = 'unidade-teste-id';
  const pagamentoId = 'pagamento-teste-id';
  const confirmacaoId = 'confirmacao-teste-id';
  const beneficiarioId = 'beneficiario-teste-id';
  
  // Mock dos repositórios
  const mockPagamentoRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn()
  };

  const mockConfirmacaoRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn()
  };

  // Mock do serviço de auditoria
  const mockAuditoriaPagamentoService = {
    logConfirmacaoRecebimento: jest.fn(),
    logErroProcessamento: jest.fn(),
    logTentativaAcessoNaoAutorizado: jest.fn()
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        PagamentoModule,
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test'
        }),
        JwtModule.registerAsync({
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) => ({
            secret: configService.get('JWT_SECRET') || 'teste-secret',
            signOptions: { expiresIn: '1h' },
          }),
          inject: [ConfigService]
        }),
        HttpModule
      ],
      providers: [
        {
          provide: getRepositoryToken(Pagamento),
          useValue: mockPagamentoRepository
        },
        {
          provide: getRepositoryToken(ConfirmacaoRecebimento),
          useValue: mockConfirmacaoRepository
        },
        {
          provide: getRepositoryToken(ComprovantePagamento),
          useValue: {}
        },
        {
          provide: AuditoriaPagamentoService,
          useValue: mockAuditoriaPagamentoService
        }
      ]
    }).compile();

    app = moduleFixture.createNestApplication();
    jwtService = moduleFixture.get<JwtService>(JwtService);
    pagamentoService = moduleFixture.get<PagamentoService>(PagamentoService);
    auditoriaPagamentoService = moduleFixture.get<AuditoriaPagamentoService>(AuditoriaPagamentoService);
    
    pagamentoRepository = moduleFixture.get<Repository<Pagamento>>(getRepositoryToken(Pagamento));
    confirmacaoRepository = moduleFixture.get<Repository<ConfirmacaoRecebimento>>(getRepositoryToken(ConfirmacaoRecebimento));
    
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Configurar mocks padrão
    mockPagamentoRepository.findOne.mockImplementation((options) => {
      if (options.where?.id === pagamentoId) {
        return Promise.resolve({
          id: pagamentoId,
          status: StatusPagamentoEnum.PAGO,
          unidadeId,
          beneficiarioId,
          valor: 500.00,
          metodoPagamento: MetodoPagamentoEnum.PIX
        });
      }
      return Promise.resolve(null);
    });
    
    mockConfirmacaoRepository.findOne.mockImplementation((options) => {
      if (options.where?.id === confirmacaoId) {
        return Promise.resolve({
          id: confirmacaoId,
          pagamentoId,
          dataConfirmacao: new Date(),
          observacoes: 'Pagamento recebido via PIX',
          numeroProtocolo: '123456789',
          confirmadoPor: beneficiarioId,
          createdAt: new Date()
        });
      } else if (options.where?.pagamentoId === pagamentoId) {
        return Promise.resolve({
          id: confirmacaoId,
          pagamentoId,
          dataConfirmacao: new Date(),
          observacoes: 'Pagamento recebido via PIX',
          numeroProtocolo: '123456789',
          confirmadoPor: beneficiarioId,
          createdAt: new Date()
        });
      }
      return Promise.resolve(null);
    });
    
    mockConfirmacaoRepository.create.mockImplementation((dto) => ({
      id: confirmacaoId,
      pagamentoId: dto.pagamentoId,
      dataConfirmacao: dto.dataConfirmacao || new Date(),
      observacoes: dto.observacoes,
      numeroProtocolo: dto.numeroProtocolo || '123456789',
      confirmadoPor: dto.confirmadoPor || beneficiarioId,
      createdAt: new Date()
    }));
    
    mockConfirmacaoRepository.save.mockImplementation((dto) => Promise.resolve(dto));
  });

  // Função auxiliar para gerar tokens JWT
  const gerarToken = (userId: string, perfis: string[] = ['usuario'], unidadeId: string = 'unidade-teste-id') => {
    return jwtService.sign({
      sub: userId,
      perfis,
      unidade: unidadeId
    });
  };

  describe('Registro de Confirmações', () => {
    it('deve registrar confirmação de recebimento com sucesso', async () => {
      const token = gerarToken(beneficiarioId);
      
      const response = await request(app.getHttpServer())
        .post(`/pagamentos/${pagamentoId}/confirmar`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          observacoes: 'Pagamento recebido via PIX',
          dataConfirmacao: new Date().toISOString()
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.pagamentoId).toBe(pagamentoId);
      
      expect(mockConfirmacaoRepository.create).toHaveBeenCalled();
      expect(mockConfirmacaoRepository.save).toHaveBeenCalled();
      expect(auditoriaPagamentoService.logConfirmacaoRecebimento).toHaveBeenCalled();
    });

    it('deve rejeitar confirmação para pagamento não encontrado', async () => {
      // Sobrescrever mock para este teste
      mockPagamentoRepository.findOne.mockResolvedValueOnce(null);
      
      const token = gerarToken(beneficiarioId);
      
      const response = await request(app.getHttpServer())
        .post(`/pagamentos/pagamento-inexistente/confirmar`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          observacoes: 'Pagamento recebido via PIX',
          dataConfirmacao: new Date().toISOString()
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('não encontrado');
    });

    it('deve rejeitar confirmação sem dados obrigatórios', async () => {
      const token = gerarToken(beneficiarioId);
      
      const response = await request(app.getHttpServer())
        .post(`/pagamentos/${pagamentoId}/confirmar`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          // Faltando observacoes
          dataConfirmacao: new Date().toISOString()
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('observacoes');
    });

    it('deve rejeitar confirmação duplicada', async () => {
      // Mock para simular que já existe confirmação para o pagamento
      mockConfirmacaoRepository.findOne.mockImplementation((options) => {
        if (options.where?.pagamentoId === pagamentoId) {
          return Promise.resolve({
            id: confirmacaoId,
            pagamentoId,
            dataConfirmacao: new Date(),
            observacoes: 'Confirmação anterior',
            confirmadoPor: beneficiarioId
          });
        }
        return Promise.resolve(null);
      });
      
      const token = gerarToken(beneficiarioId);
      
      const response = await request(app.getHttpServer())
        .post(`/pagamentos/${pagamentoId}/confirmar`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          observacoes: 'Segunda confirmação',
          dataConfirmacao: new Date().toISOString()
        });

      expect(response.status).toBe(409); // Conflict
      expect(response.body.message).toContain('já possui uma confirmação');
    });
  });

  describe('Consulta de Confirmações', () => {
    it('deve buscar confirmação por ID com sucesso', async () => {
      const token = gerarToken(gestorId, ['gestor'], unidadeId);
      
      const response = await request(app.getHttpServer())
        .get(`/confirmacoes/${confirmacaoId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', confirmacaoId);
      expect(response.body).toHaveProperty('pagamentoId', pagamentoId);
    });

    it('deve buscar confirmação por pagamentoId com sucesso', async () => {
      const token = gerarToken(gestorId, ['gestor'], unidadeId);
      
      const response = await request(app.getHttpServer())
        .get(`/pagamentos/${pagamentoId}/confirmacao`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', confirmacaoId);
      expect(response.body).toHaveProperty('pagamentoId', pagamentoId);
    });

    it('deve retornar 404 ao buscar confirmação inexistente', async () => {
      // Sobrescrever mock para este teste
      mockConfirmacaoRepository.findOne.mockResolvedValueOnce(null);
      
      const token = gerarToken(gestorId, ['gestor'], unidadeId);
      
      const response = await request(app.getHttpServer())
        .get(`/confirmacoes/confirmacao-inexistente`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('não encontrada');
    });

    it('deve listar confirmações com paginação', async () => {
      // Mock para listar confirmações
      mockConfirmacaoRepository.findAndCount.mockResolvedValueOnce([
        [
          {
            id: confirmacaoId,
            pagamentoId,
            dataConfirmacao: new Date(),
            observacoes: 'Pagamento recebido via PIX',
            numeroProtocolo: '123456789',
            confirmadoPor: beneficiarioId,
            createdAt: new Date()
          },
          {
            id: 'confirmacao-id-2',
            pagamentoId: 'outro-pagamento-id',
            dataConfirmacao: new Date(),
            observacoes: 'Outro pagamento recebido',
            numeroProtocolo: '987654321',
            confirmadoPor: 'outro-beneficiario-id',
            createdAt: new Date()
          }
        ],
        2 // Total count
      ]);
      
      const token = gerarToken(gestorId, ['gestor'], unidadeId);
      
      const response = await request(app.getHttpServer())
        .get(`/confirmacoes`)
        .query({ page: 1, limit: 10 })
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.items).toBeInstanceOf(Array);
      expect(response.body.items).toHaveLength(2);
      expect(response.body.meta.totalItems).toBe(2);
    });
  });

  describe('Segurança e Autorização', () => {
    it('deve permitir beneficiário confirmar próprio pagamento', async () => {
      // Sobrescrever mock para este teste
      mockPagamentoRepository.findOne.mockResolvedValueOnce({
        id: pagamentoId,
        status: StatusPagamentoEnum.PAGO,
        unidadeId,
        beneficiarioId,
        valor: 500.00
      });
      
      const token = gerarToken(beneficiarioId);
      
      const response = await request(app.getHttpServer())
        .post(`/pagamentos/${pagamentoId}/confirmar`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          observacoes: 'Confirmação pelo beneficiário',
          dataConfirmacao: new Date().toISOString()
        });

      expect(response.status).toBe(201);
    });

    it('deve permitir gestor registrar confirmação', async () => {
      const token = gerarToken(gestorId, ['gestor'], unidadeId);
      
      const response = await request(app.getHttpServer())
        .post(`/pagamentos/${pagamentoId}/confirmar`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          observacoes: 'Confirmação pelo gestor',
          dataConfirmacao: new Date().toISOString(),
          confirmadoPor: beneficiarioId
        });

      expect(response.status).toBe(201);
    });

    it('deve rejeitar acesso de usuário sem permissão às confirmações', async () => {
      const token = gerarToken('outro-usuario', ['usuario_basico'], 'outra-unidade');
      
      const response = await request(app.getHttpServer())
        .get(`/confirmacoes`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(mockAuditoriaPagamentoService.logTentativaAcessoNaoAutorizado).toHaveBeenCalled();
    });

    it('deve rejeitar confirmação de pagamento de outra unidade', async () => {
      // Sobrescrever mock para este teste
      mockPagamentoRepository.findOne.mockResolvedValueOnce({
        id: pagamentoId,
        status: StatusPagamentoEnum.PAGO,
        unidadeId: 'outra-unidade-id',
        beneficiarioId: 'outro-beneficiario-id',
        valor: 500.00
      });
      
      const token = gerarToken(usuarioId, ['usuario'], unidadeId);
      
      const response = await request(app.getHttpServer())
        .post(`/pagamentos/${pagamentoId}/confirmar`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          observacoes: 'Tentativa de confirmação',
          dataConfirmacao: new Date().toISOString()
        });

      expect(response.status).toBe(403);
      expect(mockAuditoriaPagamentoService.logTentativaAcessoNaoAutorizado).toHaveBeenCalled();
    });
  });
});
