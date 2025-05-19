/**
 * Configuração de ambiente para testes do módulo de pagamento
 * 
 * Este arquivo configura o ambiente de testes para o módulo de pagamento,
 * incluindo mocks globais para serviços externos, configuração de timeouts
 * e cleanup após cada teste.
 * 
 * @author Equipe PGBen
 */

// Aumentar o timeout global para testes mais complexos
jest.setTimeout(30000);

// Configurar logs durante os testes - mantendo erros visíveis mas suprimindo outros logs
const originalConsole = { ...console };
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // Manter o console.error original para ver erros importantes
  error: originalConsole.error,
};

// Configurar ambiente de teste
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.DATABASE_TYPE = 'sqlite';
process.env.DATABASE_NAME = ':memory:';

// Mock global para serviços externos frequentemente utilizados
jest.mock('@nestjs/jwt', () => {
  const originalModule = jest.requireActual('@nestjs/jwt');
  return {
    ...originalModule,
    JwtService: jest.fn().mockImplementation(() => ({
      sign: jest.fn().mockImplementation((payload) => 'mock-jwt-token'),
      verify: jest.fn().mockImplementation((token) => ({ 
        sub: 'usuario-teste-id',
        perfis: ['usuario'],
        unidade: 'unidade-teste-id'
      })),
    })),
  };
});

// Mock para o serviço MinIO conforme configuração geral de testes
jest.mock('../../../shared/services/minio.service', () => {
  return {
    MinioService: jest.fn().mockImplementation(() => ({
      upload: jest.fn().mockResolvedValue({
        etag: 'mock-etag',
        versionId: 'mock-version'
      }),
      download: jest.fn().mockResolvedValue(Buffer.from('mock-file-content')),
      getPresignedUrl: jest.fn().mockResolvedValue('https://mock-presigned-url.com'),
      delete: jest.fn().mockResolvedValue(true),
      list: jest.fn().mockResolvedValue([{
        name: 'mock-file.pdf',
        size: 1024,
        lastModified: new Date()
      }]),
    })),
  };
});

// Mock para serviços de integração
jest.mock('../../../modules/pagamento/services/integracao-solicitacao.service', () => {
  return {
    IntegracaoSolicitacaoService: jest.fn().mockImplementation(() => ({
      verificarSolicitacaoAprovada: jest.fn().mockResolvedValue(true),
      verificarSolicitacaoElegivel: jest.fn().mockResolvedValue(true),
      atualizarStatusSolicitacao: jest.fn().mockResolvedValue(true),
      obterDetalhesSolicitacao: jest.fn().mockResolvedValue({
        id: 'solicitacao-teste-id',
        cidadaoId: 'cidadao-teste-id',
        valorAprovado: 500.00,
        status: 'PAGAMENTO_PENDENTE',
        beneficio: {
          id: 'beneficio-id',
          nome: 'Auxílio Moradia'
        },
        unidade: {
          id: 'unidade-id',
          nome: 'CRAS Centro'
        }
      }),
    })),
  };
});

jest.mock('../../../modules/pagamento/services/integracao-cidadao.service', () => {
  return {
    IntegracaoCidadaoService: jest.fn().mockImplementation(() => ({
      obterDadosCidadao: jest.fn().mockResolvedValue({
        id: 'cidadao-teste-id',
        nome: 'João da Silva',
        cpf: '12345678900'
      }),
      obterDadosBancarios: jest.fn().mockResolvedValue([
        {
          id: 'info-bancaria-teste-id',
          tipo: 'PIX',
          pixTipo: 'CPF',
          pixChave: '12345678900',
          principal: true
        }
      ]),
      obterDadosBancariosPorId: jest.fn().mockResolvedValue({
        id: 'info-bancaria-teste-id',
        tipo: 'PIX',
        pixTipo: 'CPF',
        pixChave: '12345678900',
        principal: true
      }),
      validarDadosBancarios: jest.fn().mockResolvedValue(true)
    })),
  };
});

jest.mock('../../../modules/pagamento/services/integracao-documento.service', () => {
  return {
    IntegracaoDocumentoService: jest.fn().mockImplementation(() => ({
      uploadComprovante: jest.fn().mockResolvedValue({
        id: 'documento-teste-id',
        nome: 'comprovante.pdf',
        tamanho: 1024,
        tipo: 'application/pdf',
        url: 'http://localhost/documentos/documento-teste-id'
      }),
      obterComprovante: jest.fn().mockResolvedValue({
        id: 'documento-teste-id',
        nome: 'comprovante.pdf',
        tamanho: 1024,
        tipo: 'application/pdf',
        url: 'http://localhost/documentos/documento-teste-id'
      }),
      listarComprovantes: jest.fn().mockResolvedValue([{
        id: 'documento-teste-id',
        nome: 'comprovante.pdf',
        tamanho: 1024,
        tipo: 'application/pdf',
        url: 'http://localhost/documentos/documento-teste-id'
      }]),
      removerComprovante: jest.fn().mockResolvedValue(undefined)
    })),
  };
});

// Configurar mock para TypeORM
jest.mock('typeorm', () => {
  const originalModule = jest.requireActual('typeorm');
  return {
    ...originalModule,
    getRepository: jest.fn(),
    createConnection: jest.fn(),
    getConnection: jest.fn(),
    getConnectionManager: jest.fn(),
    getConnectionOptions: jest.fn(),
    getCustomRepository: jest.fn(),
    getManager: jest.fn(),
    getMongoManager: jest.fn(),
    getMongoRepository: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
      getRawOne: jest.fn().mockResolvedValue({}),
      execute: jest.fn().mockResolvedValue([])
    }),
  };
});

// Limpeza após cada teste
afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

// Limpeza após todos os testes
afterAll(() => {
  // Garantir que todos os timers foram limpos
  jest.useRealTimers();
  
  // Restaurar console original
  global.console = originalConsole;
});
