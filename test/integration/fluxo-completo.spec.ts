import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { TipoOperacao } from '../../src/modules/auditoria/enums/tipo-operacao.enum';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LogAuditoria } from '../../src/modules/auditoria/entities/log-auditoria.entity';
import { ConfigModule } from '@nestjs/config';

// Importações corretas para os serviços
class CriptografiaService {
  criptografar: jest.Mock;
  descriptografar: jest.Mock;
  criptografarArquivo: jest.Mock;
  descriptografarArquivo: jest.Mock;
}

class MinioService {
  inicializarBucket: jest.Mock;
  uploadArquivo: jest.Mock;
  downloadArquivo: jest.Mock;
  listarArquivos: jest.Mock;
}

describe('Fluxo Completo (e2e)', () => {
  let app: INestApplication;
  let criptografiaService: CriptografiaService;
  let minioService: MinioService;
  let logAuditoriaRepository: any;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        AppModule,
      ],
    })
      .overrideProvider(getRepositoryToken(LogAuditoria))
      .useValue({
        create: jest.fn().mockImplementation(dto => dto),
        save: jest.fn().mockResolvedValue({ id: 'mock-log-id' }),
        find: jest.fn().mockResolvedValue([]),
        findOne: jest.fn().mockResolvedValue(null),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }));
    
    criptografiaService = moduleFixture.get<CriptografiaService>(CriptografiaService);
    minioService = moduleFixture.get<MinioService>(MinioService);
    logAuditoriaRepository = moduleFixture.get(getRepositoryToken(LogAuditoria));
    
    // Mock das funções do MinioService
    jest.spyOn(minioService, 'inicializarBucket').mockResolvedValue(undefined);
    jest.spyOn(minioService, 'uploadArquivo').mockResolvedValue({
      etag: 'mock-etag',
      versionId: 'mock-version'
    });
    jest.spyOn(minioService, 'downloadArquivo').mockResolvedValue({
      buffer: Buffer.from('conteúdo do arquivo'),
      contentType: 'application/pdf'
    });
    
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Fluxo de Auditoria', () => {
    it('deve registrar log de auditoria ao criar um novo recurso', async () => {
      // Simula a criação de um novo usuário
      const novoUsuario = {
        nome: 'João Silva',
        cpf: '529.982.247-25',
        email: 'joao@exemplo.com',
        telefone: '(84) 99999-8888',
        endereco: {
          cep: '59000-000',
          logradouro: 'Rua das Flores',
          numero: 123,
          bairro: 'Centro',
          cidade: 'Natal',
          uf: 'RN'
        }
      };
      
      // Faz a requisição para criar o usuário
      await request(app.getHttpServer())
        .post('/api/v1/usuarios')
        .send(novoUsuario)
        .expect(201);
      
      // Verifica se o log de auditoria foi criado
      expect(logAuditoriaRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo_operacao: TipoOperacao.CREATE,
          entidade_afetada: 'Usuario',
          dados_sensiveis_acessados: expect.arrayContaining(['cpf', 'endereco']),
        })
      );
    });

    it('deve registrar log de auditoria ao consultar dados sensíveis', async () => {
      // Simula a consulta de um usuário com dados sensíveis
      await request(app.getHttpServer())
        .get('/api/v1/usuarios/123e4567-e89b-12d3-a456-426614174000')
        .expect(200);
      
      // Verifica se o log de auditoria foi criado
      expect(logAuditoriaRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo_operacao: TipoOperacao.READ,
          entidade_afetada: 'Usuario',
          entidade_id: '123e4567-e89b-12d3-a456-426614174000',
        })
      );
    });
  });

  describe('Fluxo de Criptografia', () => {
    it('deve criptografar dados sensíveis antes de armazenar', async () => {
      // Espia o método de criptografia
      const spyCriptografar = jest.spyOn(criptografiaService, 'criptografar');
      
      // Simula a criação de um documento com dados sensíveis
      const novoDocumento = {
        titulo: 'Contrato de Trabalho',
        tipo: 'PDF',
        conteudo: 'Dados sensíveis do contrato',
        usuario_id: '123e4567-e89b-12d3-a456-426614174000'
      };
      
      // Faz a requisição para criar o documento
      await request(app.getHttpServer())
        .post('/api/v1/documentos')
        .send(novoDocumento)
        .expect(201);
      
      // Verifica se o método de criptografia foi chamado
      expect(spyCriptografar).toHaveBeenCalled();
    });

    it('deve descriptografar dados sensíveis ao consultar', async () => {
      // Espia o método de descriptografia
      const spyDescriptografar = jest.spyOn(criptografiaService, 'descriptografar');
      
      // Simula a consulta de um documento com dados sensíveis
      await request(app.getHttpServer())
        .get('/api/v1/documentos/123e4567-e89b-12d3-a456-426614174000')
        .expect(200);
      
      // Verifica se o método de descriptografia foi chamado
      expect(spyDescriptografar).toHaveBeenCalled();
    });
  });

  describe('Fluxo de Armazenamento no MinIO', () => {
    it('deve armazenar documentos no MinIO com criptografia', async () => {
      // Cria um buffer simulando um arquivo
      const arquivoBuffer = Buffer.from('Conteúdo do arquivo PDF');
      
      // Simula o upload de um documento
      await request(app.getHttpServer())
        .post('/api/v1/documentos/upload')
        .attach('arquivo', arquivoBuffer, {
          filename: 'documento.pdf',
          contentType: 'application/pdf'
        })
        .field('metadados', JSON.stringify({
          titulo: 'Contrato de Trabalho',
          tipo: 'PDF',
          usuario_id: '123e4567-e89b-12d3-a456-426614174000'
        }))
        .expect(201);
      
      // Verifica se o método de upload do MinIO foi chamado com criptografia
      expect(minioService.uploadArquivo).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.stringContaining('documento.pdf'),
        'pgben-documentos',
        'application/pdf',
        expect.objectContaining({
          titulo: 'Contrato de Trabalho',
          tipo: 'PDF',
          usuario_id: '123e4567-e89b-12d3-a456-426614174000'
        }),
        true // Criptografar = true
      );
    });

    it('deve recuperar documentos do MinIO e descriptografar', async () => {
      // Simula o download de um documento
      await request(app.getHttpServer())
        .get('/api/v1/documentos/123e4567-e89b-12d3-a456-426614174000/download')
        .expect(200);
      
      // Verifica se o método de download do MinIO foi chamado
      expect(minioService.downloadArquivo).toHaveBeenCalledWith(
        expect.stringContaining('123e4567-e89b-12d3-a456-426614174000'),
        'pgben-documentos'
      );
    });
  });

  describe('Validação de DTOs', () => {
    it('deve rejeitar dados inválidos com mensagens apropriadas', async () => {
      // Simula a criação de um usuário com CPF inválido
      const usuarioInvalido = {
        nome: 'João Silva',
        cpf: '111.111.111-11', // CPF inválido (dígitos repetidos)
        email: 'joao@exemplo.com',
        telefone: '(84) 99999-8888',
        endereco: {
          cep: '59000-000',
          logradouro: 'Rua das Flores',
          numero: 123,
          bairro: 'Centro',
          cidade: 'Natal',
          uf: 'RN'
        }
      };
      
      // Faz a requisição para criar o usuário
      const response = await request(app.getHttpServer())
        .post('/api/v1/usuarios')
        .send(usuarioInvalido)
        .expect(400);
      
      // Verifica se a resposta contém a mensagem de erro apropriada
      expect(response.body.message).toContain('CPF inválido');
    });

    it('deve rejeitar dados incompletos com mensagens apropriadas', async () => {
      // Simula a criação de um usuário sem campos obrigatórios
      const usuarioIncompleto = {
        nome: 'João Silva',
        // CPF ausente (obrigatório)
        email: 'joao@exemplo.com'
        // Outros campos obrigatórios ausentes
      };
      
      // Faz a requisição para criar o usuário
      const response = await request(app.getHttpServer())
        .post('/api/v1/usuarios')
        .send(usuarioIncompleto)
        .expect(400);
      
      // Verifica se a resposta contém as mensagens de erro apropriadas
      expect(response.body.message).toContain('cpf');
    });
  });

  describe('Fluxo Completo', () => {
    it('deve executar o fluxo completo de criação, auditoria, criptografia e armazenamento', async () => {
      // Espia os métodos relevantes
      const spyCriptografar = jest.spyOn(criptografiaService, 'criptografar');
      
      // Simula a criação de um documento com dados sensíveis e upload de arquivo
      const arquivoBuffer = Buffer.from('Conteúdo do arquivo PDF');
      
      await request(app.getHttpServer())
        .post('/api/v1/documentos/upload')
        .attach('arquivo', arquivoBuffer, {
          filename: 'documento.pdf',
          contentType: 'application/pdf'
        })
        .field('metadados', JSON.stringify({
          titulo: 'Contrato de Trabalho',
          tipo: 'PDF',
          conteudo: 'Dados sensíveis do contrato',
          usuario_id: '123e4567-e89b-12d3-a456-426614174000'
        }))
        .expect(201);
      
      // Verifica se os métodos de criptografia foram chamados
      expect(spyCriptografar).toHaveBeenCalled();
      
      // Verifica se o método de upload do MinIO foi chamado
      expect(minioService.uploadArquivo).toHaveBeenCalled();
      
      // Verifica se o log de auditoria foi criado
      expect(logAuditoriaRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo_operacao: TipoOperacao.CREATE,
          entidade_afetada: 'Documento',
        })
      );
    });
  });
});
