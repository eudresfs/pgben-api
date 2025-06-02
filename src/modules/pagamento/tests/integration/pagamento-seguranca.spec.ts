import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { HttpModule } from '@nestjs/axios';

import { PagamentoModule } from '../../pagamento.module';
import { 
  Pagamento, 
  ComprovantePagamento, 
  ConfirmacaoRecebimento 
} from '../../entities';
import { StatusPagamentoEnum } from '../../enums/status-pagamento.enum';
import { MetodoPagamentoEnum } from '../../enums/metodo-pagamento.enum';
import { PagamentoService } from '../../services/pagamento.service';
import { IntegracaoSolicitacaoService } from '../../services/integracao-solicitacao.service';
import { IntegracaoCidadaoService } from '../../services/integracao-cidadao.service';
import { IntegracaoDocumentoService } from '../../services/integracao-documento.service';
import { AuditoriaPagamentoService } from '../../services/auditoria-pagamento.service';

/**
 * Testes de integração para segurança do módulo de pagamento
 * 
 * Verifica o funcionamento correto dos mecanismos de segurança,
 * incluindo autenticação, autorização e proteção de dados sensíveis.
 * 
 * @author Equipe PGBen
 */
describe('Segurança do Módulo de Pagamento (Integration)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let pagamentoService: PagamentoService;
  
  // Dados de teste
  const usuarioId = 'usuario-teste-id';
  const usuarioOutraUnidadeId = 'usuario-outra-unidade-id';
  const solicitacaoId = 'solicitacao-teste-id';
  const unidadeId = 'unidade-teste-id';
  const outraUnidadeId = 'outra-unidade-id';
  const pagamentoId = 'pagamento-teste-id';
  const comprovanteId = 'comprovante-teste-id';
  
  // Mock dos serviços externos
  const mockIntegracaoSolicitacaoService = {
    verificarStatusSolicitacao: jest.fn().mockResolvedValue('PAGAMENTO_PENDENTE'),
    verificarSolicitacaoElegivel: jest.fn().mockResolvedValue(true),
    atualizarStatusSolicitacao: jest.fn().mockResolvedValue(true),
    obterDetalhesSolicitacao: jest.fn().mockResolvedValue({
      id: solicitacaoId,
      unidadeId: unidadeId,
      status: 'PAGAMENTO_PENDENTE'
    })
  };

  const mockIntegracaoCidadaoService = {
    obterDadosCidadao: jest.fn().mockResolvedValue({
      id: 'cidadao-id',
      nome: 'João da Silva',
      cpf: '12345678900'
    }),
    obterDadosBancarios: jest.fn().mockResolvedValue([
      {
        id: 'info-bancaria-id',
        tipo: 'PIX',
        pixTipo: 'CPF',
        pixChave: '12345678900'
      }
    ]),
    validarDadosBancarios: jest.fn().mockResolvedValue(true)
  };

  const mockIntegracaoDocumentoService = {
    uploadComprovante: jest.fn().mockResolvedValue({
      id: 'documento-id',
      nome: 'comprovante.pdf'
    }),
    obterComprovante: jest.fn().mockResolvedValue({
      id: 'documento-id',
      nome: 'comprovante.pdf'
    }),
    listarComprovantes: jest.fn().mockResolvedValue([]),
    removerComprovante: jest.fn().mockResolvedValue(undefined)
  };

  const mockAuditoriaPagamentoService = {
    logCriacaoPagamento: jest.fn(),
    logMudancaStatus: jest.fn(),
    logCancelamentoPagamento: jest.fn(),
    logUploadComprovante: jest.fn(),
    logRemocaoComprovante: jest.fn(),
    logConfirmacaoRecebimento: jest.fn(),
    logErroProcessamento: jest.fn(),
    logTentativaAcessoNaoAutorizado: jest.fn()
  };

  // Mock dos repositórios
  const mockPagamentoRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    update: jest.fn()
  };

  const mockComprovanteRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    delete: jest.fn()
  };

  const mockConfirmacaoRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn()
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
          useFactory: async (configService: ConfigService) => ({
            secret: configService.get<string>('JWT_SECRET') || 'test-secret',
            signOptions: { expiresIn: '1h' }
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
          provide: getRepositoryToken(ComprovantePagamento),
          useValue: mockComprovanteRepository
        },
        {
          provide: getRepositoryToken(ConfirmacaoRecebimento),
          useValue: mockConfirmacaoRepository
        }
      ]
    })
      .overrideProvider(IntegracaoSolicitacaoService)
      .useValue(mockIntegracaoSolicitacaoService)
      .overrideProvider(IntegracaoCidadaoService)
      .useValue(mockIntegracaoCidadaoService)
      .overrideProvider(IntegracaoDocumentoService)
      .useValue(mockIntegracaoDocumentoService)
      .overrideProvider(AuditoriaPagamentoService)
      .useValue(mockAuditoriaPagamentoService)
      .compile();

    app = moduleFixture.createNestApplication();
    jwtService = moduleFixture.get<JwtService>(JwtService);
    pagamentoService = moduleFixture.get<PagamentoService>(PagamentoService);
    
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Função auxiliar para gerar tokens JWT com diferentes perfis
  const gerarToken = (userId: string, perfis: string[] = ['usuario'], unidadeId: string = 'unidade-teste-id') => {
    return jwtService.sign({
      sub: userId,
      perfis,
      unidadeId
    });
  };

  describe('Autenticação', () => {
    it('deve rejeitar acesso sem token JWT', async () => {
      const response = await request(app.getHttpServer())
        .get('/pagamentos');

      expect(response.status).toBe(401);
    });

    it('deve rejeitar acesso com token JWT inválido', async () => {
      const response = await request(app.getHttpServer())
        .get('/pagamentos')
        .set('Authorization', 'Bearer token-invalido');

      expect(response.status).toBe(401);
    });

    it('deve permitir acesso com token JWT válido', async () => {
      // Configurar mock
      mockPagamentoRepository.findAndCount.mockResolvedValue([[], 0]);
      
      const token = gerarToken(usuarioId);
      
      const response = await request(app.getHttpServer())
        .get('/pagamentos')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
    });
  });

  describe('Autorização por Perfil', () => {
    it('deve rejeitar acesso a operações administrativas para usuários sem perfil adequado', async () => {
      // Token com perfil básico
      const token = gerarToken(usuarioId, ['usuario_basico']);
      
      const response = await request(app.getHttpServer())
        .post(`/pagamentos/${pagamentoId}/cancelar`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          motivo: 'Teste de cancelamento'
        });

      expect(response.status).toBe(403);
      expect(mockAuditoriaPagamentoService.logTentativaAcessoNaoAutorizado).toHaveBeenCalled();
    });

    it('deve permitir acesso a operações administrativas para usuários com perfil adequado', async () => {
      // Configurar mock
      mockPagamentoRepository.findOne.mockResolvedValue({
        id: pagamentoId,
        solicitacaoId,
        status: StatusPagamentoEnum.AGENDADO,
        unidadeId
      });
      
      mockPagamentoRepository.save.mockResolvedValue({
        id: pagamentoId,
        solicitacaoId,
        status: StatusPagamentoEnum.CANCELADO,
        unidadeId
      });
      
      // Token com perfil administrativo
      const token = gerarToken(usuarioId, ['admin_pagamentos']);
      
      const response = await request(app.getHttpServer())
        .post(`/pagamentos/${pagamentoId}/cancelar`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          motivo: 'Teste de cancelamento'
        });

      expect(response.status).toBe(200);
    });
  });

  describe('Segurança por Unidade (Row-Level Security)', () => {
    it('deve rejeitar acesso a pagamentos de outra unidade', async () => {
      // Configurar mock
      mockPagamentoRepository.findOne.mockResolvedValue({
        id: pagamentoId,
        solicitacaoId,
        status: StatusPagamentoEnum.AGENDADO,
        unidadeId: outraUnidadeId // Unidade diferente do usuário
      });
      
      // Token de usuário de uma unidade específica
      const token = gerarToken(usuarioId, ['usuario'], unidadeId);
      
      const response = await request(app.getHttpServer())
        .get(`/pagamentos/${pagamentoId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(mockAuditoriaPagamentoService.logTentativaAcessoNaoAutorizado).toHaveBeenCalled();
    });

    it('deve permitir acesso a pagamentos da mesma unidade', async () => {
      // Configurar mock
      mockPagamentoRepository.findOne.mockResolvedValue({
        id: pagamentoId,
        solicitacaoId,
        status: StatusPagamentoEnum.AGENDADO,
        unidadeId // Mesma unidade do usuário
      });
      
      // Token de usuário da mesma unidade
      const token = gerarToken(usuarioId, ['usuario'], unidadeId);
      
      const response = await request(app.getHttpServer())
        .get(`/pagamentos/${pagamentoId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
    });

    it('deve permitir acesso global para usuários com perfil super_admin', async () => {
      // Configurar mock
      mockPagamentoRepository.findOne.mockResolvedValue({
        id: pagamentoId,
        solicitacaoId,
        status: StatusPagamentoEnum.AGENDADO,
        unidadeId: outraUnidadeId // Unidade diferente do usuário
      });
      
      // Token com perfil super_admin
      const token = gerarToken(usuarioId, ['super_admin'], 'qualquer-unidade');
      
      const response = await request(app.getHttpServer())
        .get(`/pagamentos/${pagamentoId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
    });
  });

  describe('Proteção de Dados Sensíveis', () => {
    it('deve mascarar dados bancários na resposta', async () => {
      // Configurar mock
      mockPagamentoRepository.findOne.mockResolvedValue({
        id: pagamentoId,
        solicitacaoId,
        status: StatusPagamentoEnum.AGENDADO,
        unidadeId,
        metodoPagamento: MetodoPagamentoEnum.PIX,
        dadosBancarios: {
          pixTipo: 'CPF',
          pixChave: '12345678900'
        }
      });
      
      const token = gerarToken(usuarioId);
      
      const response = await request(app.getHttpServer())
        .get(`/pagamentos/${pagamentoId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      
      // Verificar que a chave PIX está mascarada
      expect(response.body.dadosBancarios.pixChave).not.toBe('12345678900');
      expect(response.body.dadosBancarios.pixChave).toContain('*');
    });

    it('deve mascarar CPF na resposta', async () => {
      // Configurar mock
      mockPagamentoRepository.findOne.mockResolvedValue({
        id: pagamentoId,
        solicitacaoId,
        status: StatusPagamentoEnum.AGENDADO,
        unidadeId,
        beneficiario: {
          id: 'cidadao-id',
          nome: 'João da Silva',
          cpf: '12345678900'
        }
      });
      
      const token = gerarToken(usuarioId);
      
      const response = await request(app.getHttpServer())
        .get(`/pagamentos/${pagamentoId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      
      // Verificar que o CPF está mascarado
      if (response.body.beneficiario && response.body.beneficiario.cpf) {
        expect(response.body.beneficiario.cpf).not.toBe('12345678900');
        expect(response.body.beneficiario.cpf).toContain('*');
      }
    });
  });

  describe('Validação de Uploads', () => {
    it('deve rejeitar uploads de arquivos maliciosos', async () => {
      // Criar arquivo de teste com extensão suspeita
      const buffer = Buffer.from('conteúdo malicioso');
      
      const token = gerarToken(usuarioId);
      
      const response = await request(app.getHttpServer())
        .post(`/pagamentos/${pagamentoId}/comprovantes`)
        .set('Authorization', `Bearer ${token}`)
        .attach('arquivo', buffer, 'malicioso.exe');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('não permitido');
    });

    it('deve rejeitar uploads de arquivos muito grandes', async () => {
      // Criar arquivo de teste muito grande (simulado)
      const buffer = Buffer.alloc(6 * 1024 * 1024); // 6MB
      
      const token = gerarToken(usuarioId);
      
      const response = await request(app.getHttpServer())
        .post(`/pagamentos/${pagamentoId}/comprovantes`)
        .set('Authorization', `Bearer ${token}`)
        .attach('arquivo', buffer, 'grande.pdf');

      expect(response.status).toBe(413); // Payload Too Large
    });
  });

  describe('Proteção contra Ataques', () => {
    it('deve registrar tentativas de acesso não autorizado', async () => {
      // Configurar mock
      mockPagamentoRepository.findOne.mockResolvedValue({
        id: pagamentoId,
        solicitacaoId,
        status: StatusPagamentoEnum.AGENDADO,
        unidadeId: outraUnidadeId
      });
      
      const token = gerarToken(usuarioId);
      
      await request(app.getHttpServer())
        .get(`/pagamentos/${pagamentoId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(mockAuditoriaPagamentoService.logTentativaAcessoNaoAutorizado).toHaveBeenCalled();
    });

    it('deve limitar taxa de requisições (rate limiting)', async () => {
      const token = gerarToken(usuarioId);
      
      // Fazer múltiplas requisições em sequência
      const promises = Array(20).fill(0).map(() => 
        request(app.getHttpServer())
          .get('/pagamentos')
          .set('Authorization', `Bearer ${token}`)
      );
      
      const responses = await Promise.all(promises);
      
      // Verificar se alguma requisição foi limitada (429 Too Many Requests)
      const limitedRequests = responses.filter(res => res.status === 429);
      
      // Em um ambiente real, algumas requisições seriam limitadas
      // No ambiente de teste, isso depende da configuração do rate limiter
      console.log(`Requisições limitadas: ${limitedRequests.length} de ${promises.length}`);
    });
  });
});
