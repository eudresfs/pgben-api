// IMPORTANTE: Carregar as variáveis de ambiente ANTES de qualquer outra importação
import './config/env';

// Inicializar contexto transacional ANTES de qualquer outra importação do TypeORM
import {
  initializeTransactionalContext,
  StorageDriver,
} from 'typeorm-transactional';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  BadRequestException,
  INestApplication,
  Logger,
  RequestMethod,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { ResponseInterceptor } from './shared/interceptors/response.interceptor';
import { RemoveEmptyParamsInterceptor } from './shared/interceptors/remove-empty-params.interceptor';
import { ErrorHandlingInterceptor } from './shared/interceptors/error-handling.interceptor';
import { CatalogAwareExceptionFilter } from './shared/exceptions/error-catalog';
import { setupSwagger } from './shared/configs/swagger/index';
import { applySecurity } from './config/security.config';
import { ConfigService } from '@nestjs/config';
import compression from 'compression';
import { LoggingService } from './shared/logging/logging.service';
import { LoggingInterceptor } from './shared/logging/logging.interceptor';
import { ErrorLoggerFilter } from './shared/logging/filters/error-logger.filter';
import { ScopedQueryInterceptor } from './auth/interceptors/scoped-query.interceptor';
import { TextNormalizationInterceptor } from './interceptors/text-normalization.interceptor';
import { Reflector } from '@nestjs/core';

/**
 * Configura e inicializa a aplicação NestJS
 */
async function bootstrap(): Promise<INestApplication> {
  const logger = new Logger('Bootstrap');

  try {
    // Inicializar contexto transacional
    initializeTransactionalContext({ storageDriver: StorageDriver.AUTO });

    logger.log('🚀 Iniciando aplicação PGBEN...');

    // Criar a aplicação NestJS com configurações otimizadas
    logger.log('📦 Criando instância NestJS...');
    const app = await NestFactory.create(AppModule, {
      logger:
        process.env.NODE_ENV === 'production'
          ? ['error', 'warn', 'log']
          : ['error', 'warn', 'log', 'debug', 'verbose'],
      abortOnError: false,
      bufferLogs: true,
      autoFlushLogs: true,
    });
    logger.log('✅ Instância NestJS criada');

    // Obter configurações
    logger.log('⚙️ Obtendo configurações...');
    const configService = app.get(ConfigService);
    const port = configService.get<number>('PORT', 3000);
    const environment = configService.get<string>('NODE_ENV', 'development');
    const isDevelopment = environment === 'development';
    logger.log(`✅ Configurações obtidas - Port: ${port}, Env: ${environment}`);

    // === CONFIGURAÇÕES DE SEGURANÇA ===
    logger.log('🔐 Configurando middlewares de segurança...');
    applySecurity(app, configService);

    // Compressão de resposta
    app.use(
      compression({
        filter: (req, res) => {
          if (req.headers['x-no-compression']) {
            return false;
          }
          return compression.filter(req, res);
        },
        level: 6,
        threshold: 1024,
      }),
    );

    logger.log('✅ Middlewares de segurança configurados');

    // === VERSIONAMENTO DA API ===
    logger.log('🔢 Habilitando versionamento...');
    app.enableVersioning({
      type: VersioningType.URI,
      prefix: 'v',
      defaultVersion: '1',
    });
    logger.log('✅ Versionamento habilitado');

    // === PIPES GLOBAIS ===
    logger.log('⚙️ Configurando ValidationPipe global...');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
        errorHttpStatusCode: 400,
        disableErrorMessages: environment === 'production',
        exceptionFactory: (errors) => {
          return createValidationException(errors, isDevelopment);
        },
      }),
    );
    logger.log('✅ ValidationPipe configurado');

    // === INTERCEPTORS E FILTROS GLOBAIS ===
    logger.log('🛡️ Configurando interceptors...');

    app.useGlobalInterceptors(new RemoveEmptyParamsInterceptor());
    logger.log('✅ RemoveEmptyParamsInterceptor registrado');

    app.useGlobalInterceptors(new TextNormalizationInterceptor());
    logger.log('✅ TextNormalizationInterceptor registrado');

    const loggingService = app.get(LoggingService);
    app.useGlobalInterceptors(new LoggingInterceptor(loggingService));
    logger.log('✅ LoggingInterceptor registrado');

    app.useGlobalInterceptors(new ErrorHandlingInterceptor());
    logger.log('✅ ErrorHandlingInterceptor registrado');

    const reflector = app.get(Reflector);
    app.useGlobalInterceptors(new ScopedQueryInterceptor(reflector));
    logger.log('✅ ScopedQueryInterceptor registrado');

    app.useGlobalInterceptors(new ResponseInterceptor(reflector));
    logger.log('✅ ResponseInterceptor registrado');

    logger.log('🛡️ Configurando filtros...');
    app.useGlobalFilters(new ErrorLoggerFilter(loggingService));
    logger.log('✅ ErrorLoggerFilter registrado');

    const catalogAwareExceptionFilter = app.get(CatalogAwareExceptionFilter);
    app.useGlobalFilters(catalogAwareExceptionFilter);
    logger.log('✅ CatalogAwareExceptionFilter registrado');

    // === CONFIGURAÇÃO DE ROTAS ===
    logger.log('🛣️ Configurando prefixo global...');
    app.setGlobalPrefix('api', {
      exclude: [
        { path: '', method: RequestMethod.ALL },
        { path: 'health', method: RequestMethod.ALL },
        { path: 'health/ready', method: RequestMethod.ALL },
        { path: 'health/ping', method: RequestMethod.ALL },
        { path: 'health/db', method: RequestMethod.ALL },
        { path: 'health/system', method: RequestMethod.ALL },
        { path: 'health/redis', method: RequestMethod.ALL },
        { path: 'health/storage', method: RequestMethod.ALL },
        { path: 'metrics', method: RequestMethod.GET },
        { path: 'openapi.json', method: RequestMethod.GET },
        { path: 'v2/swagger.json', method: RequestMethod.GET },
        { path: 'api-docs', method: RequestMethod.ALL },
        { path: 'api-docs/*path', method: RequestMethod.ALL },
      ],
    });
    logger.log('✅ Prefixo global configurado');

    // === SWAGGER DOCUMENTATION ===
    if (isDevelopment || configService.get<boolean>('SWAGGER_ENABLED', false)) {
      logger.log('📚 Iniciando configuração do Swagger...');
      try {
        setupSwagger(app);
        logger.log('✅ Swagger configurado com sucesso');
      } catch (swaggerError) {
        logger.error('❌ Erro ao configurar Swagger (não crítico):', swaggerError.message);
        logger.log('⚠️ Continuando sem Swagger...');
      }
    } else {
      logger.log('📚 Swagger desabilitado');
    }

    // === CRÍTICO: STARTUP DO SERVIDOR ===
    logger.log('🚀 INICIANDO SERVIDOR HTTP...');
    logger.log(`🔌 Tentando escutar na porta ${port} em 0.0.0.0...`);
    
    await app.listen(port, '0.0.0.0');
    
    logger.log('✅✅✅ SERVIDOR HTTP INICIADO COM SUCESSO! ✅✅✅');

    // === LOGS DE INICIALIZAÇÃO ===
    logStartupInfo(port, environment, isDevelopment, configService);

    loggingService.setContext('Application');
    loggingService.info('🎉 Aplicação PGBEN iniciada com sucesso', undefined, {
      port,
      environment,
      pid: process.pid,
      nodeVersion: process.version,
      memoryUsage: process.memoryUsage(),
    });

    return app;
  } catch (error) {
    logger.error('❌ Erro crítico ao iniciar aplicação:', {
      message: error.message,
      stack: error.stack,
    });
    logger.error('❌ DETALHES DO ERRO:', error);
    process.exit(1);
  }
}

/**
 * Cria exceção de validação formatada
 */
function createValidationException(
  errors: any[],
  isDevelopment: boolean,
): BadRequestException {
  const sensitiveFields = [
    'senha',
    'password',
    'token',
    'secret',
    'authorization',
    'key',
    'confirmPassword',
    'confirmSenha',
    'currentPassword',
    'senhaAtual',
    'newPassword',
    'novaSenha',
    'cpf',
    'rg',
    'cnpj',
    'cardNumber',
    'cartao',
    'cvv',
    'passaporte',
    'biometria',
  ];

  const isSensitiveField = (field: string): boolean => {
    return sensitiveFields.some((sensitive) =>
      field.toLowerCase().includes(sensitive.toLowerCase()),
    );
  };

  const sanitizeValidationError = (error: any): any => {
    if (!error) return error;

    const sanitizedError = { ...error };

    if (sanitizedError.property && isSensitiveField(sanitizedError.property)) {
      sanitizedError.value = '[REDACTED]';
    }

    if (sanitizedError.children && Array.isArray(sanitizedError.children)) {
      sanitizedError.children = sanitizedError.children.map((child) =>
        sanitizeValidationError(child),
      );
    }

    return sanitizedError;
  };

  const sanitizedErrors = errors.map((error) => sanitizeValidationError(error));

  const formatError = (error: any, path = ''): any[] => {
    const currentPath = path ? `${path}.${error.property}` : error.property;

    if (error.children && error.children.length > 0) {
      const childErrors: any[] = [];
      error.children.forEach((child: any) => {
        childErrors.push(...formatError(child, currentPath));
      });
      return childErrors;
    } else {
      return [
        {
          field: currentPath,
          ...(isSensitiveField(currentPath) ? {} : { value: error.value }),
          constraints: error.constraints || {},
          messages: error.constraints
            ? Object.values(error.constraints)
            : ['Erro de validação'],
        },
      ];
    }
  };

  const formattedErrors: any[] = [];
  sanitizedErrors.forEach((error) => {
    formattedErrors.push(...formatError(error));
  });

  const response = {
    message: `Dados de entrada inválidos: ${formattedErrors.map((error) => error.messages.join(', ')).join('; ')}`,
    errors: formattedErrors,
    statusCode: 400,
    timestamp: new Date().toISOString(),
  };

  return new BadRequestException(response);
}

/**
 * Exibe informações de inicialização
 */
function logStartupInfo(
  port: number,
  environment: string,
  isDevelopment: boolean,
  configService: ConfigService,
): void {
  const logger = new Logger('Bootstrap');
  const baseUrl = `http://0.0.0.0:${port}`;

  logger.log('');
  logger.log('🎉 ========================================');
  logger.log('🎉 === SERVIDOR INICIADO COM SUCESSO ===');
  logger.log('🎉 ========================================');
  logger.log('');
  logger.log(`🌐 Servidor rodando em: ${baseUrl}`);
  logger.log(`🏷️ Ambiente: ${environment}`);
  logger.log(`📦 Versão da API: v1`);
  logger.log(`🔌 Porta: ${port}`);
  logger.log(`📍 Host: 0.0.0.0 (aceita conexões externas)`);
  logger.log('');

  logger.log('📍 Rotas principais disponíveis:');
  logger.log(`   ├─ GET  ${baseUrl}/health`);
  logger.log(`   ├─ GET  ${baseUrl}/health/ready`);
  logger.log(`   ├─ GET  ${baseUrl}/metrics`);
  logger.log(`   └─ POST ${baseUrl}/api/v1/auth/login`);
  logger.log('');

  if (isDevelopment || configService.get<boolean>('SWAGGER_ENABLED', false)) {
    logger.log('📚 Documentação disponível:');
    logger.log(`   ├─ GET  ${baseUrl}/api-docs`);
    logger.log(`   └─ GET  ${baseUrl}/openapi.json`);
    logger.log('');
  }

  if (isDevelopment) {
    logger.log('⚙️ Configurações ativas:');
    logger.log(`   ├─ Database: ${configService.get('DB_HOST', 'N/A')}`);
    logger.log(
      `   ├─ Redis: ${configService.get('REDIS_HOST', 'N/A')}:${configService.get('REDIS_PORT', 'N/A')}`,
    );
    logger.log(
      `   └─ MinIO: ${configService.get('MINIO_ENDPOINT', 'N/A')}`,
    );
    logger.log('');
  }

  logger.log('🔧 ========================================');
  logger.log('🔧 === APLICAÇÃO PRONTA PARA USO ===');
  logger.log('🔧 ========================================');
  logger.log('');
}

/**
 * Configura graceful shutdown
 */
function setupGracefulShutdown(app: INestApplication): void {
  const logger = new Logger('GracefulShutdown');
  let isShuttingDown = false;

  const shutdown = async (signal: string): Promise<void> => {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;
    logger.log(`📴 Recebido sinal ${signal}. Iniciando graceful shutdown...`);

    try {
      const shutdownTimeout = setTimeout(() => {
        logger.warn(
          '⏰ Timeout do graceful shutdown (25s). Forçando encerramento...',
        );
        process.exit(1);
      }, 25000);

      logger.log('⏳ Aguardando finalização de requests em andamento...');
      await new Promise((resolve) => setTimeout(resolve, 2000));

      logger.log('🔄 Finalizando aplicação NestJS...');
      await app.close();
      clearTimeout(shutdownTimeout);

      logger.log('✅ Aplicação encerrada com sucesso');
      process.exit(0);
    } catch (error) {
      logger.error('❌ Erro durante o shutdown:', {
        message: error.message,
        stack: error.stack,
      });
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('uncaughtException', (error) => {
    logger.error('💥 Uncaught Exception:', {
      message: error.message,
      stack: error.stack,
    });

    const redisErrors = [
      'ECONNREFUSED',
      'ENOTFOUND',
      'ETIMEDOUT',
      'Redis connection',
      'Bull queue',
      'ioredis',
    ];

    const isRedisError = redisErrors.some(
      (errorType) =>
        error.message?.includes(errorType) || error.stack?.includes(errorType),
    );

    if (isRedisError) {
      logger.warn(
        'Erro do Redis detectado, mas aplicação continuará funcionando.',
      );
      return;
    }

    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('🚫 Unhandled Rejection:', {
      promise,
      reason,
    });

    const reasonStr = String(reason);
    const redisErrors = [
      'ECONNREFUSED',
      'ENOTFOUND',
      'ETIMEDOUT',
      'Redis connection',
      'Bull queue',
      'ioredis',
    ];

    const isRedisError = redisErrors.some((errorType) =>
      reasonStr.includes(errorType),
    );

    if (isRedisError) {
      logger.warn(
        'Promise rejeitada relacionada ao Redis, aplicação continuará funcionando.',
      );
      return;
    }

    shutdown('unhandledRejection');
  });

  if (process.env.NODE_ENV === 'development') {
    process.on('warning', (warning) => {
      logger.warn('⚠️ Node.js Warning:', {
        name: warning.name,
        message: warning.message,
        stack: warning.stack,
      });
    });
  }
}

process.on('message', (message) => {
  if (message === 'health-check') {
    process.send?.('healthy');
  }
});

// === TIMEOUT DE INICIALIZAÇÃO ===
const STARTUP_TIMEOUT = 60000; // 60 segundos
const startupTimer = setTimeout(() => {
  const logger = new Logger('Bootstrap');
  logger.error('❌ TIMEOUT: Aplicação não inicializou em 60 segundos!');
  logger.error('❌ A aplicação travou durante a inicialização.');
  logger.error('❌ Verifique serviços assíncronos (Ably, Swagger, etc.)');
  process.exit(1);
}, STARTUP_TIMEOUT);

// === INICIALIZAÇÃO PRINCIPAL ===
if (require.main === module) {
  bootstrap()
    .then((app) => {
      clearTimeout(startupTimer);
      setupGracefulShutdown(app);
    })
    .catch((err) => {
      clearTimeout(startupTimer);
      const logger = new Logger('Bootstrap');
      logger.error('💀 Falha crítica na inicialização:', {
        message: err.message,
        stack: err.stack,
      });
      process.exit(1);
    });
}

export { bootstrap };
