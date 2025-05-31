import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Documento } from '../../src/modules/documento/entities/documento.entity';
import { TipoDocumento } from '../../src/modules/beneficio/entities/requisito-documento.entity';
import { JwtService } from '@nestjs/jwt';
import { MinioService } from '../../src/shared/services/minio.service';
import { Solicitacao, StatusSolicitacao } from '../../src/modules/solicitacao/entities/solicitacao.entity';

describe('Documento (Integração)', () => {
  let app: INestApplication;
  let documentoRepository: Repository<Documento>;
  let solicitacaoRepository: Repository<Solicitacao>;
  let jwtService: JwtService;
  let minioService: MinioService;
  let authToken: string;

  // Mock do MinioService para evitar chamadas reais ao MinIO
  const mockMinioService = {
    uploadArquivo: jest.fn(),
    downloadArquivo: jest.fn(),
    removerArquivo: jest.fn(),
    gerarUrlPresigned: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MinioService)
      .useValue(mockMinioService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    documentoRepository = moduleFixture.get<Repository<Documento>>(
      getRepositoryToken(Documento),
    );
    solicitacaoRepository = moduleFixture.get<Repository<Solicitacao>>(
      getRepositoryToken(Solicitacao),
    );
    jwtService = moduleFixture.get<JwtService>(JwtService);

    // Gerar token de autenticação para testes
    authToken = jwtService.sign({
      id: 'test-user-id',
      nome: 'Usuário de Teste',
      email: 'teste@exemplo.com',
      roles: ['admin'],
    });
  });

  beforeEach(async () => {
    // Limpar documentos antes de cada teste
    const documentos = await documentoRepository.find();
    if (documentos.length > 0) {
      await documentoRepository.remove(documentos);
    }

    // Criar solicitações de teste usando o método create para evitar problemas com campos especiais
    const solicitacao1 = solicitacaoRepository.create({
       id: '550e8400-e29b-41d4-a716-446655440000',
       protocolo: 'SOL202400001',
       status: StatusSolicitacao.PENDENTE,
       beneficiario_id: '550e8400-e29b-41d4-a716-446655440002',
       tipo_beneficio_id: '550e8400-e29b-41d4-a716-446655440003',
       unidade_id: '550e8400-e29b-41d4-a716-446655440004',
       tecnico_id: '550e8400-e29b-41d4-a716-446655440005',
       data_abertura: new Date(),
       observacoes: 'Teste 1'
     });
     await solicitacaoRepository.save(solicitacao1);

     const solicitacao2 = solicitacaoRepository.create({
       id: '550e8400-e29b-41d4-a716-446655440001',
       protocolo: 'SOL202400002',
       status: StatusSolicitacao.EM_ANALISE,
       beneficiario_id: '550e8400-e29b-41d4-a716-446655440002',
       tipo_beneficio_id: '550e8400-e29b-41d4-a716-446655440003',
       unidade_id: '550e8400-e29b-41d4-a716-446655440004',
       tecnico_id: '550e8400-e29b-41d4-a716-446655440005',
       data_abertura: new Date(),
       observacoes: 'Teste 2'
     });
     await solicitacaoRepository.save(solicitacao2);

    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Upload de documentos', () => {
    it('deve permitir upload de documento não sensível', async () => {
      // Arrange
      const mockFile = Buffer.from('conteúdo do arquivo de teste');
      const mockUploadResult = {
        nomeArquivo: '550e8400-e29b-41d4-a716-446655440000/comprovante/documento-123.pdf',
        tamanho: mockFile.length,
        hash: 'hash-do-arquivo',
        metadados: {
          criptografado: false
        },
        etag: 'etag-do-arquivo',
      };

      mockMinioService.uploadArquivo.mockResolvedValue(mockUploadResult);

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/documentos/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('solicitacao_id', '550e8400-e29b-41d4-a716-446655440000')
        .field('tipo_documento', 'comprovante')
        .field('descricao', 'Comprovante de residência')
        .field('sensivel', 'false')
        .attach('arquivo', mockFile, 'documento.pdf')
        .expect(201);

      // Assert
      expect(mockMinioService.uploadArquivo).toHaveBeenCalledWith(
        expect.any(Buffer),
        'documento.pdf',
        '550e8400-e29b-41d4-a716-446655440000',
        'comprovante',
        false,
      );

      expect(response.body).toEqual(
        expect.objectContaining({
          nome_arquivo: mockUploadResult.nomeArquivo,
          tamanho: mockUploadResult.tamanho,
          hash: mockUploadResult.hash,
          metadados: {
          criptografado: false
        },
        }),
      );

      const savedDocumento = await documentoRepository.findOne({
        where: { nome_arquivo: mockUploadResult.nomeArquivo },
      });
      expect(savedDocumento).toBeDefined();
      expect(savedDocumento!.metadados.criptografado).toBe(false);
    });

    it('deve permitir upload de documento sensível com criptografia', async () => {
      // Arrange
      const mockFile = Buffer.from('conteúdo do arquivo sensível');
      const mockUploadResult = {
        nomeArquivo: '550e8400-e29b-41d4-a716-446655440000/laudo/documento-123.pdf',
        tamanho: mockFile.length,
        etag: 'etag-do-arquivo-sensivel',
        metadados: {
          hash: 'hash-do-arquivo-sensivel',
          criptografado: true,
          criptografia: {
            iv: 'iv-base64',
            authTag: 'auth-tag-base64',
            algoritmo: 'aes-256-gcm'
          }
        },
      };

      mockMinioService.uploadArquivo.mockResolvedValue(mockUploadResult);

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/documentos/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('solicitacao_id', '550e8400-e29b-41d4-a716-446655440000')
        .field('tipo_documento', 'laudo')
        .field('descricao', 'Laudo médico')
        .field('sensivel', 'true')
        .attach('arquivo', mockFile, 'laudo.pdf')
        .expect(201);

      // Assert
      expect(mockMinioService.uploadArquivo).toHaveBeenCalledWith(
        expect.any(Buffer),
        'laudo.pdf',
        '550e8400-e29b-41d4-a716-446655440000',
        'laudo',
        true,
      );

      expect(response.body).toEqual(
        expect.objectContaining({
          nome_arquivo: mockUploadResult.nomeArquivo,
          tamanho: mockUploadResult.tamanho,
          metadados: expect.objectContaining({
            hash: mockUploadResult.metadados.hash,
            criptografado: true,
            criptografia: expect.objectContaining({
              iv: mockUploadResult.metadados.criptografia.iv,
              authTag: mockUploadResult.metadados.criptografia.authTag,
            })
          }),
        }),
      );

      const savedDocumento = await documentoRepository.findOne({
        where: { nome_arquivo: mockUploadResult.nomeArquivo },
      });
      expect(savedDocumento).toBeDefined();
      expect(savedDocumento!.metadados.criptografado).toBe(true);
      expect(savedDocumento!.metadados.criptografia?.iv).toBe(mockUploadResult.metadados.criptografia.iv);
      expect(savedDocumento!.metadados.criptografia?.authTag).toBe(mockUploadResult.metadados.criptografia.authTag);
    });
  });

  describe('Download de documentos', () => {
    it('deve permitir download de documento não sensível', async () => {
      // Arrange
      const documento = documentoRepository.create({
        nome_arquivo: '550e8400-e29b-41d4-a716-446655440000/comprovante/documento-123.pdf',
        nome_original: 'comprovante.pdf',
        caminho: '/uploads/550e8400-e29b-41d4-a716-446655440000/comprovante/documento-123.pdf',
        tipo: TipoDocumento.COMPROVANTE_RESIDENCIA,
        descricao: 'Comprovante de residência',
        solicitacao_id: '550e8400-e29b-41d4-a716-446655440000',
        tamanho: 1024,
        mimetype: 'application/pdf',
        data_upload: new Date(),
        metadados: {
          hash: 'hash-do-arquivo',
          criptografado: false
        },
        usuario_upload: 'test-user-id',
      });
      await documentoRepository.save(documento);

      const mockDownloadResult = {
        buffer: Buffer.from('conteúdo do arquivo de teste'),
        nomeOriginal: 'comprovante.pdf',
        tamanho: 1024,
        metadados: {
          criptografado: false
        },
      };

      mockMinioService.downloadArquivo.mockResolvedValue(mockDownloadResult);

      // Act
      const response = await request(app.getHttpServer())
        .get(`/api/documentos/download/${documento.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(mockMinioService.downloadArquivo).toHaveBeenCalledWith(
        documento.nome_arquivo,
      );

      expect(response.headers['content-disposition']).toContain(
        'attachment; filename="comprovante.pdf"',
      );
      expect(response.headers['content-type']).toContain('application/pdf');
      expect(response.body).toEqual(expect.any(Buffer));
    });

    it('deve permitir download de documento sensível criptografado', async () => {
      // Arrange
      const documento = documentoRepository.create({
        nome_arquivo: '550e8400-e29b-41d4-a716-446655440000/laudo/documento-123.pdf',
        nome_original: 'laudo.pdf',
        caminho: '/uploads/550e8400-e29b-41d4-a716-446655440000/laudo/documento-123.pdf',
        tipo: TipoDocumento.DECLARACAO_MEDICA,
        descricao: 'Laudo médico',
        solicitacao_id: '550e8400-e29b-41d4-a716-446655440000',
        tamanho: 1024,
        mimetype: 'application/pdf',
        data_upload: new Date(),
        metadados: {
          hash: 'hash-do-arquivo-sensivel',
          criptografado: true,
          criptografia: {
            iv: 'iv-base64',
            authTag: 'auth-tag-base64',
            algoritmo: 'aes-256-gcm'
          }
        },
        usuario_upload: 'test-user-id',
      });
      await documentoRepository.save(documento);

      const mockDownloadResult = {
        buffer: Buffer.from('conteúdo descriptografado do arquivo sensível'),
        nomeOriginal: 'laudo.pdf',
        tamanho: 1024,
        metadados: {
          criptografado: true
        },
      };

      mockMinioService.downloadArquivo.mockResolvedValue(mockDownloadResult);

      // Act
      const response = await request(app.getHttpServer())
        .get(`/api/documentos/download/${documento.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(mockMinioService.downloadArquivo).toHaveBeenCalledWith(
        documento.nome_arquivo,
      );

      expect(response.headers['content-disposition']).toContain(
        'attachment; filename="laudo.pdf"',
      );
      expect(response.headers['content-type']).toContain('application/pdf');
      expect(response.body).toEqual(expect.any(Buffer));
    });
  });

  describe('Listagem de documentos', () => {
    it('deve listar documentos por solicitação', async () => {
      // Arrange
      const documentos = [
        documentoRepository.create({
          nome_arquivo: '550e8400-e29b-41d4-a716-446655440000/comprovante/documento-1.pdf',
          nome_original: 'comprovante.pdf',
          caminho: '/uploads/550e8400-e29b-41d4-a716-446655440000/comprovante/documento-1.pdf',
          tipo: TipoDocumento.COMPROVANTE_RESIDENCIA,
          descricao: 'Comprovante de residência',
          solicitacao_id: '550e8400-e29b-41d4-a716-446655440000',
          tamanho: 1024,
          mimetype: 'application/pdf',
          data_upload: new Date(),
        metadados: {
          hash: 'hash-1',
          criptografado: false
        },
        usuario_upload: 'test-user-id',
        }),
        documentoRepository.create({
          nome_arquivo: '550e8400-e29b-41d4-a716-446655440000/laudo/documento-2.pdf',
          nome_original: 'laudo.pdf',
          caminho: '/uploads/550e8400-e29b-41d4-a716-446655440000/laudo/documento-2.pdf',
          tipo: TipoDocumento.DECLARACAO_MEDICA,
          descricao: 'Laudo médico',
          solicitacao_id: '550e8400-e29b-41d4-a716-446655440000',
          tamanho: 2048,
          mimetype: 'application/pdf',
          data_upload: new Date(),
        metadados: {
          hash: 'hash-2',
          criptografado: true,
          criptografia: {
            iv: 'iv-base64',
            authTag: 'auth-tag-base64',
            algoritmo: 'aes-256-gcm'
          }
        },
        usuario_upload: 'test-user-id',
        }),
      ];
      await documentoRepository.save(documentos);

      // Act
      const response = await request(app.getHttpServer())
        .get('/api/documentos')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ solicitacao_id: '550e8400-e29b-41d4-a716-446655440000' })
        .expect(200);

      // Assert
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].solicitacao_id).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(response.body.data[1].solicitacao_id).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('deve listar documentos por tipo', async () => {
      // Arrange
      const documentos = [
          documentoRepository.create({
            nome_arquivo: '550e8400-e29b-41d4-a716-446655440000/comprovante/documento-1.pdf',
            nome_original: 'comprovante.pdf',
            caminho: '/uploads/550e8400-e29b-41d4-a716-446655440000/comprovante/documento-1.pdf',
            tipo: TipoDocumento.COMPROVANTE_RESIDENCIA,
            descricao: 'Comprovante de residência',
            solicitacao_id: '550e8400-e29b-41d4-a716-446655440000',
            tamanho: 1024,
            mimetype: 'application/pdf',
            data_upload: new Date(),
          metadados: {
            hash: 'hash-1',
            criptografado: false
          },
          usuario_upload: 'test-user-id',
          }),
          documentoRepository.create({
            nome_arquivo: '550e8400-e29b-41d4-a716-446655440001/comprovante/documento-3.pdf',
             nome_original: 'comprovante2.pdf',
            caminho: '/uploads/550e8400-e29b-41d4-a716-446655440001/comprovante/documento-3.pdf',
             tipo: TipoDocumento.COMPROVANTE_RENDA,
             descricao: 'Comprovante de renda',
           solicitacao_id: '550e8400-e29b-41d4-a716-446655440001',
           tamanho: 1536,
           mimetype: 'application/pdf',
           data_upload: new Date(),
          metadados: {
            hash: 'hash-3',
            criptografado: false
          },
          usuario_upload: 'test-user-id',
          }),
        ];
      await documentoRepository.save(documentos);

      // Act
      const response = await request(app.getHttpServer())
        .get('/api/documentos')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ tipo_documento: 'comprovante' })
        .expect(200);

      // Assert
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].tipo).toBe(TipoDocumento.COMPROVANTE_RESIDENCIA);
      expect(response.body.data[1].tipo).toBe(TipoDocumento.COMPROVANTE_RENDA);
    });
  });

  describe('Exclusão de documentos', () => {
    it('deve permitir excluir um documento', async () => {
      // Arrange
      const documento = documentoRepository.create({
        nome_arquivo: '550e8400-e29b-41d4-a716-446655440000/comprovante/documento-1.pdf',
        nome_original: 'comprovante.pdf',
        caminho: '/uploads/550e8400-e29b-41d4-a716-446655440000/comprovante/documento-1.pdf',
        tipo: TipoDocumento.COMPROVANTE_RESIDENCIA,
        descricao: 'Comprovante de residência',
        solicitacao_id: '550e8400-e29b-41d4-a716-446655440000',
        tamanho: 1024,
        mimetype: 'application/pdf',
        data_upload: new Date(),
        metadados: {
          hash: 'hash-1',
          criptografado: false
        },
        usuario_upload: 'test-user-id',
      });
      await documentoRepository.save(documento);

      mockMinioService.removerArquivo.mockResolvedValue(undefined);

      // Act
      await request(app.getHttpServer())
        .delete(`/api/documentos/${documento.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(mockMinioService.removerArquivo).toHaveBeenCalledWith(
        documento.nome_arquivo,
      );

      const documentoExcluido = await documentoRepository.findOne({
        where: { id: documento.id },
      });
      expect(documentoExcluido).toBeNull();
    });
  });
});
