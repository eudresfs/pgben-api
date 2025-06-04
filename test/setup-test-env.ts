// Arquivo de configuração para ambiente de testes
import 'jest-extended';
import { TipoOperacao } from '../src/enums/tipo-operacao.enum';

// Configurações de ambiente para testes
process.env.NODE_ENV = 'test';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_USER = 'pgben_test';
process.env.DB_PASS = 'pgben_test';
process.env.DB_NAME = 'pgben_test';
process.env.JWT_SECRET = 'test_jwt_secret_key';
process.env.MINIO_ENDPOINT = 'localhost';
process.env.MINIO_PORT = '9000';
process.env.MINIO_ACCESS_KEY = 'minioadmin';
process.env.MINIO_SECRET_KEY = 'minioadmin';
process.env.MINIO_DEFAULT_BUCKET = 'pgben-test';
process.env.MINIO_USE_SSL = 'false';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.ENCRYPTION_KEY = 'chave-de-criptografia-de-32-caracteres';
process.env.ENCRYPTION_IV = 'vetor-de-16-chars';

// Mock global para Bull/Redis
jest.mock('bull', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
      process: jest.fn(),
      on: jest.fn(),
    })),
    Queue: jest.fn().mockImplementation(() => ({
      add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
      process: jest.fn(),
      on: jest.fn(),
    })),
  };
});

// Mock global para @nestjs/bull
jest.mock('@nestjs/bull', () => {
  return {
    InjectQueue: () => jest.fn(),
    Processor: () => jest.fn(),
    Process: () => jest.fn(),
    BullModule: {
      registerQueue: jest.fn().mockReturnValue({
        module: jest.fn(),
        providers: [],
        exports: [],
      }),
    },
  };
});

// Mock global para MinIO
jest.mock('../src/modules/minio/services/minio.service', () => {
  return {
    MinioService: jest.fn().mockImplementation(() => ({
      inicializarBucket: jest.fn().mockResolvedValue(undefined),
      uploadArquivo: jest.fn().mockResolvedValue({
        etag: 'mock-etag',
        versionId: 'mock-version-id',
      }),
      downloadArquivo: jest.fn().mockResolvedValue({
        buffer: Buffer.from('Conteúdo mockado do arquivo'),
        contentType: 'application/pdf',
      }),
      removerArquivo: jest.fn().mockResolvedValue(true),
      listarArquivos: jest.fn().mockResolvedValue([
        {
          nome: 'documentos/arquivo1.pdf',
          tamanho: 1024,
          dataModificacao: new Date(),
        },
        {
          nome: 'documentos/arquivo2.pdf',
          tamanho: 2048,
          dataModificacao: new Date(),
        },
      ]),
      verificarArquivoExiste: jest.fn().mockResolvedValue(true),
      gerarUrlDownload: jest
        .fn()
        .mockResolvedValue('https://minio.exemplo.com/pgben-test/arquivo.pdf'),
      gerarUrlUpload: jest
        .fn()
        .mockResolvedValue('https://minio.exemplo.com/pgben-test/upload.pdf'),
    })),
  };
});

// Mock para o LogAuditoria Repository
jest.mock('../src/modules/auditoria/entities/log-auditoria.entity', () => {
  return {
    LogAuditoria: class LogAuditoria {
      id: string = 'mock-log-id';
      tipo_operacao: TipoOperacao;
      entidade_afetada: string;
      entidade_id: string;
      descricao: string;
      dados_anteriores: any;
      dados_novos: any;
      usuario_id: string;
      ip_origem: string;
      user_agent?: string;
      endpoint?: string;
      metodo_http?: string;
      dados_sensiveis_acessados?: string[];
      motivo?: string;
      data_hora: Date = new Date();
    },
  };
});

// Mock para o serviço de fila de auditoria
jest.mock('../src/modules/auditoria/services/auditoria-queue.service', () => {
  return {
    AuditoriaQueueService: jest.fn().mockImplementation(() => ({
      enfileirarLogAuditoria: jest.fn().mockResolvedValue({
        id: 'mock-job-id',
        data: {
          tipo_operacao: TipoOperacao.CREATE,
          entidade_afetada: 'Entidade',
          entidade_id: 'mock-entity-id',
        },
      }),
      enfileirarAcessoDadosSensiveis: jest.fn().mockResolvedValue({
        id: 'mock-sensitive-job-id',
      }),
    })),
  };
});

// Mock para o processador de fila de auditoria
jest.mock('../src/modules/auditoria/services/auditoria-queue.processor', () => {
  return {
    AuditoriaQueueProcessor: jest.fn().mockImplementation(() => ({
      processarLogAuditoria: jest.fn().mockResolvedValue(true),
      processarAcessoDadosSensiveis: jest.fn().mockResolvedValue(true),
    })),
  };
});

// Mock para o serviço de criptografia
jest.mock('../src/modules/criptografia/services/criptografia.service', () => {
  return {
    CriptografiaService: jest.fn().mockImplementation(() => ({
      criptografar: jest.fn().mockImplementation((texto) => {
        if (texto === null || texto === undefined) {
          return '';
        }
        return `CRIPTOGRAFADO:${typeof texto === 'object' ? JSON.stringify(texto) : texto}`;
      }),
      descriptografar: jest.fn().mockImplementation((textoCriptografado) => {
        if (textoCriptografado === null || textoCriptografado === undefined) {
          return '';
        }
        return textoCriptografado.replace('CRIPTOGRAFADO:', '');
      }),
      descriptografarParaObjeto: jest
        .fn()
        .mockImplementation((textoCriptografado) => {
          if (textoCriptografado === null || textoCriptografado === undefined) {
            return {};
          }
          const texto = textoCriptografado.replace('CRIPTOGRAFADO:', '');
          try {
            return JSON.parse(texto);
          } catch (e) {
            return {};
          }
        }),
      criptografarArquivo: jest.fn().mockImplementation((buffer) => {
        if (buffer === null || buffer === undefined) {
          return Buffer.from([]);
        }
        return Buffer.from(`CRIPTOGRAFADO:${buffer.toString()}`);
      }),
      descriptografarArquivo: jest.fn().mockImplementation((buffer) => {
        if (buffer === null || buffer === undefined) {
          return Buffer.from([]);
        }
        return Buffer.from(buffer.toString().replace('CRIPTOGRAFADO:', ''));
      }),
      gerarHash: jest.fn().mockImplementation((texto) => {
        if (texto === null || texto === undefined) {
          return '';
        }
        return `HASH:${texto}`;
      }),
      verificarHash: jest.fn().mockImplementation((texto, hash) => {
        if (texto === null || texto === undefined) {
          return false;
        }
        return hash === `HASH:${texto}`;
      }),
    })),
  };
});

// Mock para supertest
jest.mock('supertest', () => {
  const mockRequest = {
    get: jest.fn().mockReturnThis(),
    post: jest.fn().mockReturnThis(),
    put: jest.fn().mockReturnThis(),
    patch: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    attach: jest.fn().mockReturnThis(),
    field: jest.fn().mockReturnThis(),
    expect: jest.fn().mockResolvedValue({ body: {} }),
  };

  return jest.fn(() => mockRequest);
});
