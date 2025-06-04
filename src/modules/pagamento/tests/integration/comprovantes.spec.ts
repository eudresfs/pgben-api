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
  ConfirmacaoRecebimento,
} from '../../entities';
import { StatusPagamentoEnum } from '../../enums/status-pagamento.enum';
import { IntegracaoDocumentoService } from '../../services/integracao-documento.service';
import { AuditoriaPagamentoService } from '../../services/auditoria-pagamento.service';

/**
 * Testes de integração para gerenciamento de comprovantes
 *
 * Verifica o funcionamento correto das operações de upload, listagem,
 * visualização e remoção de comprovantes de pagamento.
 *
 * @author Equipe PGBen
 */
describe('Gerenciamento de Comprovantes (Integration)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let integracaoDocumentoService: IntegracaoDocumentoService;
  let auditoriaPagamentoService: AuditoriaPagamentoService;

  // Dados de teste
  const usuarioId = 'usuario-teste-id';
  const pagamentoId = 'pagamento-teste-id';
  const unidadeId = 'unidade-teste-id';
  const comprovanteId = 'comprovante-teste-id';
  const documentoId = 'documento-teste-id';

  // Mock dos repositórios
  const mockPagamentoRepository = {
    findOne: jest.fn().mockImplementation((options) => {
      if (options.where.id === pagamentoId) {
        return Promise.resolve({
          id: pagamentoId,
          status: StatusPagamentoEnum.LIBERADO,
          unidadeId,
        });
      }
      return Promise.resolve(null);
    }),
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
    findOne: jest.fn(),
  };

  // Mock do serviço de integração com documentos
  const mockIntegracaoDocumentoService = {
    uploadComprovante: jest
      .fn()
      .mockImplementation((pagamentoId, arquivo, usuarioId) => {
        return Promise.resolve({
          id: documentoId,
          nome: arquivo.originalname,
          tamanho: arquivo.size,
          tipo: arquivo.mimetype,
          categoria: 'COMPROVANTE_PAGAMENTO',
          referencia: pagamentoId,
          url: `http://api-documento.pgben.local/documentos/${documentoId}`,
          createdAt: new Date(),
        });
      }),
    obterComprovante: jest.fn().mockImplementation((documentoId) => {
      return Promise.resolve({
        id: documentoId,
        nome: 'comprovante.pdf',
        tamanho: 1024,
        tipo: 'application/pdf',
        categoria: 'COMPROVANTE_PAGAMENTO',
        url: `http://api-documento.pgben.local/documentos/${documentoId}`,
        createdAt: new Date(),
      });
    }),
    listarComprovantes: jest.fn().mockImplementation((pagamentoId) => {
      return Promise.resolve([
        {
          id: documentoId,
          nome: 'comprovante.pdf',
          tamanho: 1024,
          tipo: 'application/pdf',
          categoria: 'COMPROVANTE_PAGAMENTO',
          referencia: pagamentoId,
          url: `http://api-documento.pgben.local/documentos/${documentoId}`,
          createdAt: new Date(),
        },
      ]);
    }),
    removerComprovante: jest
      .fn()
      .mockImplementation((documentoId, usuarioId) => {
        return Promise.resolve();
      }),
  };

  // Mock do serviço de auditoria
  const mockAuditoriaPagamentoService = {
    logUploadComprovante: jest.fn(),
    logRemocaoComprovante: jest.fn(),
    logErroProcessamento: jest.fn(),
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
      .overrideProvider(IntegracaoDocumentoService)
      .useValue(mockIntegracaoDocumentoService)
      .overrideProvider(AuditoriaPagamentoService)
      .useValue(mockAuditoriaPagamentoService)
      .compile();

    app = moduleFixture.createNestApplication();
    jwtService = moduleFixture.get<JwtService>(JwtService);
    integracaoDocumentoService = moduleFixture.get<IntegracaoDocumentoService>(
      IntegracaoDocumentoService,
    );
    auditoriaPagamentoService = moduleFixture.get<AuditoriaPagamentoService>(
      AuditoriaPagamentoService,
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Configurar mocks padrão para os repositórios
    mockComprovanteRepository.create.mockImplementation((dto) => ({
      id: comprovanteId,
      pagamentoId: dto.pagamentoId,
      documentoId: dto.documentoId,
      nomeArquivo: dto.nomeArquivo,
      tipoArquivo: dto.tipoArquivo,
      tamanhoArquivo: dto.tamanhoArquivo,
      urlDownload: dto.urlDownload,
      uploadedBy: dto.uploadedBy,
      descricao: dto.descricao,
      createdAt: new Date(),
    }));

    mockComprovanteRepository.save.mockImplementation((entity) =>
      Promise.resolve(entity),
    );

    mockComprovanteRepository.findOne.mockImplementation((options) => {
      if (options.where.id === comprovanteId) {
        return Promise.resolve({
          id: comprovanteId,
          pagamentoId,
          documentoId,
          nomeArquivo: 'comprovante.pdf',
          tipoArquivo: 'application/pdf',
          tamanhoArquivo: 1024,
          urlDownload: `http://api-documento.pgben.local/documentos/${documentoId}`,
          uploadedBy: usuarioId,
          createdAt: new Date(),
        });
      }
      return Promise.resolve(null);
    });

    mockComprovanteRepository.find.mockImplementation((options) => {
      if (options.where.pagamentoId === pagamentoId) {
        return Promise.resolve([
          {
            id: comprovanteId,
            pagamentoId,
            documentoId,
            nomeArquivo: 'comprovante.pdf',
            tipoArquivo: 'application/pdf',
            tamanhoArquivo: 1024,
            urlDownload: `http://api-documento.pgben.local/documentos/${documentoId}`,
            uploadedBy: usuarioId,
            createdAt: new Date(),
          },
        ]);
      }
      return Promise.resolve([]);
    });
  });

  // Função auxiliar para gerar tokens JWT
  const gerarToken = (
    userId: string,
    perfis: string[] = ['usuario'],
    unidadeId: string = 'unidade-teste-id',
  ) => {
    return jwtService.sign({
      sub: userId,
      perfis,
      unidadeId,
    });
  };

  describe('Upload de Comprovantes', () => {
    it('deve fazer upload de comprovante PDF com sucesso', async () => {
      // Criar arquivo de teste
      const buffer = Buffer.from('conteúdo de teste do arquivo PDF');
      const token = gerarToken(usuarioId);

      const response = await request(app.getHttpServer())
        .post(`/pagamentos/${pagamentoId}/comprovantes`)
        .set('Authorization', `Bearer ${token}`)
        .attach('arquivo', buffer, 'comprovante.pdf')
        .field('descricao', 'Comprovante de transferência bancária');

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.nomeArquivo).toBe('comprovante.pdf');
      expect(response.body.tipoArquivo).toBe('application/pdf');

      expect(integracaoDocumentoService.uploadComprovante).toHaveBeenCalled();
      expect(auditoriaPagamentoService.logUploadComprovante).toHaveBeenCalled();
    });

    it('deve fazer upload de comprovante JPG com sucesso', async () => {
      // Criar arquivo de teste
      const buffer = Buffer.from('conteúdo de teste do arquivo JPG');
      const token = gerarToken(usuarioId);

      const response = await request(app.getHttpServer())
        .post(`/pagamentos/${pagamentoId}/comprovantes`)
        .set('Authorization', `Bearer ${token}`)
        .attach('arquivo', buffer, 'comprovante.jpg')
        .field('descricao', 'Comprovante de transferência bancária');

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.nomeArquivo).toBe('comprovante.jpg');
      expect(response.body.tipoArquivo).toBe('image/jpeg');
    });

    it('deve rejeitar upload de comprovante com formato não permitido', async () => {
      // Criar arquivo de teste com formato não permitido
      const buffer = Buffer.from('conteúdo de teste do arquivo');
      const token = gerarToken(usuarioId);

      const response = await request(app.getHttpServer())
        .post(`/pagamentos/${pagamentoId}/comprovantes`)
        .set('Authorization', `Bearer ${token}`)
        .attach('arquivo', buffer, 'comprovante.exe')
        .field('descricao', 'Arquivo não permitido');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('não permitido');
    });

    it('deve rejeitar upload quando pagamento não existe', async () => {
      // Sobrescrever mock para este teste
      mockPagamentoRepository.findOne.mockResolvedValueOnce(null);

      // Criar arquivo de teste
      const buffer = Buffer.from('conteúdo de teste do arquivo');
      const token = gerarToken(usuarioId);

      const response = await request(app.getHttpServer())
        .post(`/pagamentos/pagamento-inexistente/comprovantes`)
        .set('Authorization', `Bearer ${token}`)
        .attach('arquivo', buffer, 'comprovante.pdf')
        .field('descricao', 'Comprovante de teste');

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('não encontrado');
    });

    it('deve rejeitar upload quando pagamento está em status CANCELADO', async () => {
      // Sobrescrever mock para este teste
      mockPagamentoRepository.findOne.mockResolvedValueOnce({
        id: pagamentoId,
        status: StatusPagamentoEnum.CANCELADO,
        unidadeId,
      });

      // Criar arquivo de teste
      const buffer = Buffer.from('conteúdo de teste do arquivo');
      const token = gerarToken(usuarioId);

      const response = await request(app.getHttpServer())
        .post(`/pagamentos/${pagamentoId}/comprovantes`)
        .set('Authorization', `Bearer ${token}`)
        .attach('arquivo', buffer, 'comprovante.pdf')
        .field('descricao', 'Comprovante de teste');

      expect(response.status).toBe(409);
      expect(response.body.message).toContain('cancelado');
    });
  });

  describe('Listagem de Comprovantes', () => {
    it('deve listar comprovantes de um pagamento', async () => {
      const token = gerarToken(usuarioId);

      const response = await request(app.getHttpServer())
        .get(`/pagamentos/${pagamentoId}/comprovantes`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('items');
      expect(response.body.items).toBeInstanceOf(Array);
      expect(response.body.items.length).toBeGreaterThan(0);
      expect(response.body.items[0]).toHaveProperty('id');
      expect(response.body.items[0]).toHaveProperty('nomeArquivo');
    });

    it('deve retornar lista vazia quando não há comprovantes', async () => {
      // Sobrescrever mock para este teste
      mockComprovanteRepository.find.mockResolvedValueOnce([]);

      const token = gerarToken(usuarioId);

      const response = await request(app.getHttpServer())
        .get(`/pagamentos/pagamento-sem-comprovantes/comprovantes`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('items');
      expect(response.body.items).toBeInstanceOf(Array);
      expect(response.body.items.length).toBe(0);
    });
  });

  describe('Visualização de Comprovante', () => {
    it('deve obter detalhes de um comprovante específico', async () => {
      const token = gerarToken(usuarioId);

      const response = await request(app.getHttpServer())
        .get(`/comprovantes/${comprovanteId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('nomeArquivo');
      expect(response.body).toHaveProperty('urlDownload');
      expect(response.body.id).toBe(comprovanteId);
    });

    it('deve retornar 404 quando comprovante não existe', async () => {
      // Sobrescrever mock para este teste
      mockComprovanteRepository.findOne.mockResolvedValueOnce(null);

      const token = gerarToken(usuarioId);

      const response = await request(app.getHttpServer())
        .get(`/comprovantes/comprovante-inexistente`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('não encontrado');
    });
  });

  describe('Remoção de Comprovante', () => {
    it('deve remover comprovante com sucesso', async () => {
      const token = gerarToken(usuarioId);

      const response = await request(app.getHttpServer())
        .delete(`/comprovantes/${comprovanteId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          motivo: 'Documento incorreto',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(integracaoDocumentoService.removerComprovante).toHaveBeenCalled();
      expect(
        auditoriaPagamentoService.logRemocaoComprovante,
      ).toHaveBeenCalled();
    });

    it('deve rejeitar remoção sem informar motivo', async () => {
      const token = gerarToken(usuarioId);

      const response = await request(app.getHttpServer())
        .delete(`/comprovantes/${comprovanteId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('motivo');
    });

    it('deve rejeitar remoção quando comprovante não existe', async () => {
      // Sobrescrever mock para este teste
      mockComprovanteRepository.findOne.mockResolvedValueOnce(null);

      const token = gerarToken(usuarioId);

      const response = await request(app.getHttpServer())
        .delete(`/comprovantes/comprovante-inexistente`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          motivo: 'Documento incorreto',
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('não encontrado');
    });

    it('deve rejeitar remoção quando usuário não tem permissão', async () => {
      // Token com perfil insuficiente
      const token = gerarToken(
        'outro-usuario',
        ['usuario_basico'],
        'outra-unidade',
      );

      const response = await request(app.getHttpServer())
        .delete(`/comprovantes/${comprovanteId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          motivo: 'Documento incorreto',
        });

      expect(response.status).toBe(403);
    });
  });

  describe('Validação de Tipos de Arquivo', () => {
    it('deve aceitar arquivos PDF', async () => {
      const buffer = Buffer.from('conteúdo de teste PDF');
      const token = gerarToken(usuarioId);

      const response = await request(app.getHttpServer())
        .post(`/pagamentos/${pagamentoId}/comprovantes`)
        .set('Authorization', `Bearer ${token}`)
        .attach('arquivo', buffer, 'comprovante.pdf');

      expect(response.status).toBe(201);
    });

    it('deve aceitar arquivos de imagem (JPG, PNG)', async () => {
      const buffer = Buffer.from('conteúdo de teste imagem');
      const token = gerarToken(usuarioId);

      const responseJpg = await request(app.getHttpServer())
        .post(`/pagamentos/${pagamentoId}/comprovantes`)
        .set('Authorization', `Bearer ${token}`)
        .attach('arquivo', buffer, 'comprovante.jpg');

      expect(responseJpg.status).toBe(201);

      const responsePng = await request(app.getHttpServer())
        .post(`/pagamentos/${pagamentoId}/comprovantes`)
        .set('Authorization', `Bearer ${token}`)
        .attach('arquivo', buffer, 'comprovante.png');

      expect(responsePng.status).toBe(201);
    });

    it('deve rejeitar outros tipos de arquivo', async () => {
      const buffer = Buffer.from('conteúdo de teste arquivo não permitido');
      const token = gerarToken(usuarioId);

      const responseDoc = await request(app.getHttpServer())
        .post(`/pagamentos/${pagamentoId}/comprovantes`)
        .set('Authorization', `Bearer ${token}`)
        .attach('arquivo', buffer, 'comprovante.doc');

      expect(responseDoc.status).toBe(400);

      const responseExe = await request(app.getHttpServer())
        .post(`/pagamentos/${pagamentoId}/comprovantes`)
        .set('Authorization', `Bearer ${token}`)
        .attach('arquivo', buffer, 'comprovante.exe');

      expect(responseExe.status).toBe(400);
    });
  });
});
