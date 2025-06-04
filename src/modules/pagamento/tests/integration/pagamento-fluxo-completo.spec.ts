import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { HttpModule } from '@nestjs/axios';

import { PagamentoModule } from '../../pagamento.module';
import {
  Pagamento,
  ComprovantePagamento,
  ConfirmacaoRecebimento,
} from '../../../entities';
import { StatusPagamentoEnum } from '../../enums/status-pagamento.enum';
import { MetodoPagamentoEnum } from '../../enums/metodo-pagamento.enum';
import { PagamentoService } from '../../services/pagamento.service';
import { IntegracaoSolicitacaoService } from '../../services/integracao-solicitacao.service';
import { IntegracaoCidadaoService } from '../../services/integracao-cidadao.service';
import { IntegracaoDocumentoService } from '../../services/integracao-documento.service';
import { AuditoriaPagamentoService } from '../../services/auditoria-pagamento.service';

/**
 * Testes de integração para o fluxo completo de pagamento
 *
 * Verifica o funcionamento correto do fluxo completo de pagamento,
 * desde a criação até a confirmação de recebimento.
 *
 * @author Equipe PGBen
 */
describe('Fluxo Completo de Pagamento (Integration)', () => {
  let app: INestApplication;
  let pagamentoService: PagamentoService;
  let integracaoSolicitacaoService: IntegracaoSolicitacaoService;
  let integracaoCidadaoService: IntegracaoCidadaoService;
  let integracaoDocumentoService: IntegracaoDocumentoService;
  let auditoriaPagamentoService: AuditoriaPagamentoService;
  let pagamentoRepository: Repository<Pagamento>;
  let comprovanteRepository: Repository<ComprovantePagamento>;
  let confirmacaoRepository: Repository<ConfirmacaoRecebimento>;

  // Dados de teste
  const usuarioId = 'usuario-teste-id';
  const solicitacaoId = 'solicitacao-teste-id';
  const cidadaoId = 'cidadao-teste-id';
  const infoBancariaId = 'info-bancaria-teste-id';

  // Mock do token JWT para autenticação
  const mockJwtToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3VhcmlvLXRlc3RlLWlkIiwibmFtZSI6IlVzdcOhcmlvIFRlc3RlIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

  // Mock dos serviços externos
  const mockIntegracaoSolicitacaoService = {
    verificarStatusSolicitacao: jest
      .fn()
      .mockResolvedValue('PAGAMENTO_PENDENTE'),
    verificarSolicitacaoElegivel: jest.fn().mockResolvedValue(true),
    atualizarStatusSolicitacao: jest.fn().mockResolvedValue(true),
    obterDetalhesSolicitacao: jest.fn().mockResolvedValue({
      id: solicitacaoId,
      cidadaoId: cidadaoId,
      valorAprovado: 500.0,
      status: 'PAGAMENTO_PENDENTE',
      beneficio: {
        id: 'beneficio-id',
        nome: 'Auxílio Moradia',
      },
      unidade: {
        id: 'unidade-id',
        nome: 'CRAS Centro',
      },
    }),
  };

  const mockIntegracaoCidadaoService = {
    obterDadosCidadao: jest.fn().mockResolvedValue({
      id: cidadaoId,
      nome: 'João da Silva',
      cpf: '12345678900',
    }),
    obterDadosBancarios: jest.fn().mockResolvedValue([
      {
        id: infoBancariaId,
        tipo: 'PIX',
        pixTipo: 'CPF',
        pixChave: '12345678900',
        principal: true,
      },
    ]),
    obterDadosBancariosPorId: jest.fn().mockResolvedValue({
      id: infoBancariaId,
      tipo: 'PIX',
      pixTipo: 'CPF',
      pixChave: '12345678900',
      principal: true,
    }),
    validarDadosBancarios: jest.fn().mockResolvedValue(true),
  };

  const mockIntegracaoDocumentoService = {
    uploadComprovante: jest.fn().mockResolvedValue({
      id: 'documento-id',
      nome: 'comprovante.pdf',
      tamanho: 1024,
      tipo: 'application/pdf',
      url: 'http://localhost/documentos/documento-id',
    }),
    obterComprovante: jest.fn().mockResolvedValue({
      id: 'documento-id',
      nome: 'comprovante.pdf',
      tamanho: 1024,
      tipo: 'application/pdf',
      url: 'http://localhost/documentos/documento-id',
    }),
    listarComprovantes: jest.fn().mockResolvedValue([
      {
        id: 'documento-id',
        nome: 'comprovante.pdf',
        tamanho: 1024,
        tipo: 'application/pdf',
        url: 'http://localhost/documentos/documento-id',
      },
    ]),
    removerComprovante: jest.fn().mockResolvedValue(undefined),
  };

  const mockAuditoriaPagamentoService = {
    logCriacaoPagamento: jest.fn(),
    logMudancaStatus: jest.fn(),
    logCancelamentoPagamento: jest.fn(),
    logUploadComprovante: jest.fn(),
    logRemocaoComprovante: jest.fn(),
    logConfirmacaoRecebimento: jest.fn(),
    logErroProcessamento: jest.fn(),
  };

  // Mock dos repositórios
  const mockPagamentoRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockComprovanteRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    delete: jest.fn(),
  };

  const mockConfirmacaoRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        PagamentoModule,
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        JwtModule.registerAsync({
          imports: [ConfigModule],
          useFactory: async (configService: ConfigService) => ({
            secret: configService.get<string>('JWT_SECRET') || 'test-secret',
            signOptions: { expiresIn: '1h' },
          }),
          inject: [ConfigService],
        }),
        HttpModule,
      ],
      providers: [
        {
          provide: getRepositoryToken(Pagamento),
          useValue: mockPagamentoRepository,
        },
        {
          provide: getRepositoryToken(ComprovantePagamento),
          useValue: mockComprovanteRepository,
        },
        {
          provide: getRepositoryToken(ConfirmacaoRecebimento),
          useValue: mockConfirmacaoRepository,
        },
      ],
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

    pagamentoService = moduleFixture.get<PagamentoService>(PagamentoService);
    integracaoSolicitacaoService =
      moduleFixture.get<IntegracaoSolicitacaoService>(
        IntegracaoSolicitacaoService,
      );
    integracaoCidadaoService = moduleFixture.get<IntegracaoCidadaoService>(
      IntegracaoCidadaoService,
    );
    integracaoDocumentoService = moduleFixture.get<IntegracaoDocumentoService>(
      IntegracaoDocumentoService,
    );
    auditoriaPagamentoService = moduleFixture.get<AuditoriaPagamentoService>(
      AuditoriaPagamentoService,
    );

    pagamentoRepository = moduleFixture.get<Repository<Pagamento>>(
      getRepositoryToken(Pagamento),
    );
    comprovanteRepository = moduleFixture.get<Repository<ComprovantePagamento>>(
      getRepositoryToken(ComprovantePagamento),
    );
    confirmacaoRepository = moduleFixture.get<
      Repository<ConfirmacaoRecebimento>
    >(getRepositoryToken(ConfirmacaoRecebimento));

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Fluxo Completo: Criar → Liberar → Enviar Comprovante → Confirmar', () => {
    let pagamentoId: string;
    let comprovanteId: string;
    let confirmacaoId: string;

    it('1. Deve criar um novo pagamento com sucesso', async () => {
      // Configurar mocks
      const pagamentoMock = {
        id: 'pagamento-teste-id',
        solicitacaoId,
        valor: 500.0,
        status: StatusPagamentoEnum.AGENDADO,
        metodoPagamento: MetodoPagamentoEnum.PIX,
        dataLiberacao: new Date(),
        infoBancariaId,
        dadosBancarios: {
          pixTipo: 'CPF',
          pixChave: '12345678900',
        },
        responsavelLiberacao: usuarioId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPagamentoRepository.create.mockReturnValue(pagamentoMock);
      mockPagamentoRepository.save.mockResolvedValue(pagamentoMock);

      // Executar requisição
      const response = await request(app.getHttpServer())
        .post(`/pagamentos/solicitacao/${solicitacaoId}`)
        .set('Authorization', `Bearer ${mockJwtToken}`)
        .send({
          valor: 500.0,
          dataLiberacao: new Date(),
          metodoPagamento: MetodoPagamentoEnum.PIX,
          infoBancariaId,
          dadosBancarios: {
            pixTipo: 'CPF',
            pixChave: '12345678900',
          },
        });

      // Verificar resposta
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe(StatusPagamentoEnum.AGENDADO);

      // Guardar ID para próximos testes
      pagamentoId = response.body.id;

      // Verificar chamadas de serviços
      expect(
        integracaoSolicitacaoService.verificarSolicitacaoElegivel,
      ).toHaveBeenCalledWith(solicitacaoId);
      expect(integracaoCidadaoService.validarDadosBancarios).toHaveBeenCalled();
      expect(auditoriaPagamentoService.logCriacaoPagamento).toHaveBeenCalled();
    });

    it('2. Deve atualizar o status para LIBERADO com sucesso', async () => {
      // Configurar mocks
      const pagamentoMock = {
        id: pagamentoId,
        solicitacaoId,
        valor: 500.0,
        status: StatusPagamentoEnum.AGENDADO,
        metodoPagamento: MetodoPagamentoEnum.PIX,
        dataLiberacao: new Date(),
        infoBancariaId,
        dadosBancarios: {
          pixTipo: 'CPF',
          pixChave: '12345678900',
        },
        responsavelLiberacao: usuarioId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const pagamentoAtualizadoMock = {
        ...pagamentoMock,
        status: StatusPagamentoEnum.LIBERADO,
        updatedAt: new Date(),
      };

      mockPagamentoRepository.findOne.mockResolvedValue(pagamentoMock);
      mockPagamentoRepository.save.mockResolvedValue(pagamentoAtualizadoMock);

      // Executar requisição
      const response = await request(app.getHttpServer())
        .patch(`/pagamentos/${pagamentoId}/status`)
        .set('Authorization', `Bearer ${mockJwtToken}`)
        .send({
          status: StatusPagamentoEnum.LIBERADO,
          observacoes: 'Pagamento liberado após verificação',
        });

      // Verificar resposta
      expect(response.status).toBe(200);
      expect(response.body.status).toBe(StatusPagamentoEnum.LIBERADO);

      // Verificar chamadas de serviços
      expect(auditoriaPagamentoService.logMudancaStatus).toHaveBeenCalled();
      expect(
        integracaoSolicitacaoService.atualizarStatusSolicitacao,
      ).toHaveBeenCalledWith(
        solicitacaoId,
        StatusPagamentoEnum.LIBERADO,
        usuarioId,
      );
    });

    it('3. Deve enviar comprovante com sucesso', async () => {
      // Configurar mocks
      const pagamentoMock = {
        id: pagamentoId,
        solicitacaoId,
        status: StatusPagamentoEnum.LIBERADO,
      };

      const comprovanteMock = {
        id: 'comprovante-teste-id',
        pagamentoId,
        documentoId: 'documento-id',
        nomeArquivo: 'comprovante.pdf',
        tipoArquivo: 'application/pdf',
        tamanhoArquivo: 1024,
        urlDownload: 'http://localhost/documentos/documento-id',
        uploadedBy: usuarioId,
        createdAt: new Date(),
      };

      mockPagamentoRepository.findOne.mockResolvedValue(pagamentoMock);
      mockComprovanteRepository.create.mockReturnValue(comprovanteMock);
      mockComprovanteRepository.save.mockResolvedValue(comprovanteMock);

      // Criar arquivo de teste
      const buffer = Buffer.from('conteúdo de teste do arquivo');

      // Executar requisição
      const response = await request(app.getHttpServer())
        .post(`/pagamentos/${pagamentoId}/comprovantes`)
        .set('Authorization', `Bearer ${mockJwtToken}`)
        .attach('arquivo', buffer, 'comprovante.pdf')
        .field('descricao', 'Comprovante de pagamento');

      // Verificar resposta
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.nomeArquivo).toBe('comprovante.pdf');

      // Guardar ID para próximos testes
      comprovanteId = response.body.id;

      // Verificar chamadas de serviços
      expect(integracaoDocumentoService.uploadComprovante).toHaveBeenCalled();
      expect(auditoriaPagamentoService.logUploadComprovante).toHaveBeenCalled();
    });

    it('4. Deve confirmar recebimento com sucesso', async () => {
      // Configurar mocks
      const pagamentoMock = {
        id: pagamentoId,
        solicitacaoId,
        status: StatusPagamentoEnum.LIBERADO,
        valor: 500.0,
        metodoPagamento: MetodoPagamentoEnum.PIX,
        dataLiberacao: new Date(),
        responsavelLiberacao: usuarioId,
      };

      const pagamentoAtualizadoMock = {
        ...pagamentoMock,
        status: StatusPagamentoEnum.CONFIRMADO,
        responsavelConfirmacao: usuarioId,
        dataConfirmacao: new Date(),
        updatedAt: new Date(),
      };

      const confirmacaoMock = {
        id: 'confirmacao-teste-id',
        pagamentoId,
        dataConfirmacao: new Date(),
        metodoConfirmacao: 'PRESENCIAL',
        registradoPor: usuarioId,
        observacoes: 'Confirmação realizada pelo beneficiário',
        createdAt: new Date(),
      };

      mockPagamentoRepository.findOne.mockResolvedValue(pagamentoMock);
      mockPagamentoRepository.save.mockResolvedValue(pagamentoAtualizadoMock);
      mockConfirmacaoRepository.create.mockReturnValue(confirmacaoMock);
      mockConfirmacaoRepository.save.mockResolvedValue(confirmacaoMock);

      // Executar requisição
      const response = await request(app.getHttpServer())
        .post('/pagamentos/confirmar-recebimento')
        .set('Authorization', `Bearer ${mockJwtToken}`)
        .send({
          pagamentoId,
          dataConfirmacao: new Date(),
          metodoConfirmacao: 'PRESENCIAL',
          observacoes: 'Confirmação realizada pelo beneficiário',
        });

      // Verificar resposta
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.metodoConfirmacao).toBe('PRESENCIAL');

      // Guardar ID para próximos testes
      confirmacaoId = response.body.id;

      // Verificar chamadas de serviços
      expect(
        auditoriaPagamentoService.logConfirmacaoRecebimento,
      ).toHaveBeenCalled();
    });

    it('5. Deve verificar que o pagamento está com status CONFIRMADO', async () => {
      // Configurar mocks
      const pagamentoMock = {
        id: pagamentoId,
        solicitacaoId,
        status: StatusPagamentoEnum.CONFIRMADO,
        valor: 500.0,
        metodoPagamento: MetodoPagamentoEnum.PIX,
        dataLiberacao: new Date(),
        responsavelLiberacao: usuarioId,
        responsavelConfirmacao: usuarioId,
        dataConfirmacao: new Date(),
      };

      mockPagamentoRepository.findOne.mockResolvedValue(pagamentoMock);

      // Executar requisição
      const response = await request(app.getHttpServer())
        .get(`/pagamentos/${pagamentoId}`)
        .set('Authorization', `Bearer ${mockJwtToken}`);

      // Verificar resposta
      expect(response.status).toBe(200);
      expect(response.body.status).toBe(StatusPagamentoEnum.CONFIRMADO);
      expect(response.body).toHaveProperty('responsavelConfirmacao');
      expect(response.body).toHaveProperty('dataConfirmacao');
    });
  });

  describe('Fluxo de Cancelamento', () => {
    let pagamentoId: string;

    it('1. Deve criar um novo pagamento para cancelamento', async () => {
      // Configurar mocks
      const pagamentoMock = {
        id: 'pagamento-cancelamento-id',
        solicitacaoId,
        valor: 300.0,
        status: StatusPagamentoEnum.AGENDADO,
        metodoPagamento: MetodoPagamentoEnum.PIX,
        dataLiberacao: new Date(),
        infoBancariaId,
        dadosBancarios: {
          pixTipo: 'CPF',
          pixChave: '12345678900',
        },
        responsavelLiberacao: usuarioId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPagamentoRepository.create.mockReturnValue(pagamentoMock);
      mockPagamentoRepository.save.mockResolvedValue(pagamentoMock);

      // Executar requisição
      const response = await request(app.getHttpServer())
        .post(`/pagamentos/solicitacao/${solicitacaoId}`)
        .set('Authorization', `Bearer ${mockJwtToken}`)
        .send({
          valor: 300.0,
          dataLiberacao: new Date(),
          metodoPagamento: MetodoPagamentoEnum.PIX,
          infoBancariaId,
          dadosBancarios: {
            pixTipo: 'CPF',
            pixChave: '12345678900',
          },
        });

      // Verificar resposta
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');

      // Guardar ID para próximos testes
      pagamentoId = response.body.id;
    });

    it('2. Deve cancelar o pagamento com sucesso', async () => {
      // Configurar mocks
      const pagamentoMock = {
        id: pagamentoId,
        solicitacaoId,
        valor: 300.0,
        status: StatusPagamentoEnum.AGENDADO,
        metodoPagamento: MetodoPagamentoEnum.PIX,
        dataLiberacao: new Date(),
        infoBancariaId,
        dadosBancarios: {
          pixTipo: 'CPF',
          pixChave: '12345678900',
        },
        responsavelLiberacao: usuarioId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const pagamentoAtualizadoMock = {
        ...pagamentoMock,
        status: StatusPagamentoEnum.CANCELADO,
        observacoes: 'CANCELADO: Dados bancários incorretos',
        updatedAt: new Date(),
      };

      mockPagamentoRepository.findOne.mockResolvedValue(pagamentoMock);
      mockPagamentoRepository.save.mockResolvedValue(pagamentoAtualizadoMock);

      // Executar requisição
      const response = await request(app.getHttpServer())
        .post(`/pagamentos/${pagamentoId}/cancelar`)
        .set('Authorization', `Bearer ${mockJwtToken}`)
        .send({
          motivo: 'Dados bancários incorretos',
        });

      // Verificar resposta
      expect(response.status).toBe(200);
      expect(response.body.status).toBe(StatusPagamentoEnum.CANCELADO);
      expect(response.body.observacoes).toContain('CANCELADO');

      // Verificar chamadas de serviços
      expect(
        auditoriaPagamentoService.logCancelamentoPagamento,
      ).toHaveBeenCalled();
      expect(
        integracaoSolicitacaoService.atualizarStatusSolicitacao,
      ).toHaveBeenCalledWith(
        solicitacaoId,
        StatusPagamentoEnum.CANCELADO,
        usuarioId,
      );
    });

    it('3. Não deve permitir atualizar status de um pagamento cancelado', async () => {
      // Configurar mocks
      const pagamentoMock = {
        id: pagamentoId,
        solicitacaoId,
        status: StatusPagamentoEnum.CANCELADO,
        observacoes: 'CANCELADO: Dados bancários incorretos',
      };

      mockPagamentoRepository.findOne.mockResolvedValue(pagamentoMock);

      // Executar requisição
      const response = await request(app.getHttpServer())
        .patch(`/pagamentos/${pagamentoId}/status`)
        .set('Authorization', `Bearer ${mockJwtToken}`)
        .send({
          status: StatusPagamentoEnum.LIBERADO,
        });

      // Verificar resposta
      expect(response.status).toBe(409); // Conflict
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('não é possível');
    });
  });
});
