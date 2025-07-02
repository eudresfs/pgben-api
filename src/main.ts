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
    const app = await NestFactory.create(AppModule, {
      logger:
        process.env.NODE_ENV === 'production'
          ? ['error', 'warn', 'log']
          : ['error', 'warn', 'log', 'debug', 'verbose'],
      abortOnError: false,
      bufferLogs: true, // Melhora performance dos logs
      autoFlushLogs: true,
    });

    // Obter configurações
    const configService = app.get(ConfigService);
    const port = configService.get<number>('PORT', 3000);
    const environment = configService.get<string>('NODE_ENV', 'development');
    const isDevelopment = environment === 'development';

    logger.log(`📦 Ambiente: ${environment}`);

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
        level: 6, // Balanceamento entre velocidade e compressão
        threshold: 1024, // Comprimir apenas arquivos > 1KB
      }),
    );

    logger.log('✅ Middlewares de segurança configurados');

    // === VERSIONAMENTO DA API ===
    app.enableVersioning({
      type: VersioningType.URI,
      prefix: 'v',
      defaultVersion: '1',
    });

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
        disableErrorMessages: environment === 'production', // Ocultar detalhes em produção
        exceptionFactory: (errors) => {
          return createValidationException(errors, isDevelopment);
        },
      }),
    );
    logger.log('✅ ValidationPipe configurado');

    // === INTERCEPTORS E FILTROS GLOBAIS ===
    logger.log('🛡️ Configurando interceptors e filtros...');

    // Interceptor para remover parâmetros vazios das requisições
    app.useGlobalInterceptors(new RemoveEmptyParamsInterceptor());

    // ✅ NOVO: Sistema de logging unificado
    const loggingService = app.get(LoggingService);

    // Interceptor de logging HTTP (substitui o RedactLogsInterceptor)
    app.useGlobalInterceptors(new LoggingInterceptor(loggingService));

    // ✅ NOVO: Interceptor de tratamento de erros avançado
    app.useGlobalInterceptors(new ErrorHandlingInterceptor());

    // Interceptor para aplicar filtro de unidade automaticamente em GET
    const reflector = app.get(Reflector);
    app.useGlobalInterceptors(new ScopedQueryInterceptor(reflector));

    // Interceptor de resposta padronizada
    app.useGlobalInterceptors(new ResponseInterceptor());

    // ✅ NOVO: Filtro de erros com logging estruturado
    app.useGlobalFilters(new ErrorLoggerFilter(loggingService));

    // Filtro de exceções unificado com catálogo de erros
    const catalogAwareExceptionFilter = app.get(CatalogAwareExceptionFilter);
    app.useGlobalFilters(catalogAwareExceptionFilter);

    logger.log('✅ Interceptors e filtros configurados');

    // === CONFIGURAÇÃO DE ROTAS ===
    logger.log('🛣️ Configurando prefixo global e rotas...');

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

    logger.log('✅ Rotas configuradas');

    // === SWAGGER DOCUMENTATION ===
    if (isDevelopment || configService.get<boolean>('SWAGGER_ENABLED', false)) {
      logger.log('📚 Configurando Swagger...');
      setupSwagger(app);
      logger.log('✅ Swagger configurado');
    } else {
      logger.log('📚 Swagger desabilitado em produção');
    }

    // === STARTUP DO SERVIDOR ===
    await app.listen(port, '0.0.0.0');

    // === LOGS DE INICIALIZAÇÃO ===
    logStartupInfo(port, environment, isDevelopment, configService);

    // ✅ NOVO: Configurar logger contextualizado para logs de sistema
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
  // Lista de campos sensíveis que não devem ser incluídos nas respostas de erro
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

  // Função para verificar se um campo é sensível
  const isSensitiveField = (field: string): boolean => {
    return sensitiveFields.some((sensitive) =>
      field.toLowerCase().includes(sensitive.toLowerCase()),
    );
  };

  // Sanitizar valor sensível - transformação recursiva
  const sanitizeValidationError = (error: any): any => {
    if (!error) return error;

    // Cria uma cópia do objeto para não modificar o original
    const sanitizedError = { ...error };

    // Sanitiza o valor se o campo for sensível
    if (sanitizedError.property && isSensitiveField(sanitizedError.property)) {
      sanitizedError.value = '[REDACTED]';
    }

    // Sanitiza filhos recursivamente
    if (sanitizedError.children && Array.isArray(sanitizedError.children)) {
      sanitizedError.children = sanitizedError.children.map((child) =>
        sanitizeValidationError(child),
      );
    }

    return sanitizedError;
  };

  // Sanitiza todos os erros antes de procesá-los
  const sanitizedErrors = errors.map((error) => sanitizeValidationError(error));

  // Formatador de erros para exibição
  const formatError = (error: any, path = ''): any[] => {
    const currentPath = path ? `${path}.${error.property}` : error.property;

    if (error.children && error.children.length > 0) {
      // Process nested errors
      const childErrors: any[] = [];
      error.children.forEach((child: any) => {
        childErrors.push(...formatError(child, currentPath));
      });
      return childErrors;
    } else {
      // Direct error
      return [
        {
          field: currentPath,
          // Somente inclui o valor se o campo não for sensível
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
    message: 'Dados de entrada inválidos',
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
  const baseUrl = `http://localhost:${port}`;

  logger.log('🎉 === SERVIDOR INICIADO COM SUCESSO ===');
  logger.log(`🌐 Servidor rodando em: ${baseUrl}`);
  logger.log(`🏷️ Ambiente: ${environment}`);
  logger.log(`📦 Versão da API: v1`);

  logger.log('📍 Rotas principais disponíveis:');
  logger.log(`   ├─ GET  ${baseUrl}/v1/health (liveness)`);
  logger.log(`   ├─ GET  ${baseUrl}/v1/health/ready (readiness)`);
  logger.log(`   ├─ GET  ${baseUrl}/v1/metrics (métricas do sistema)`);
  logger.log(`   └─ POST ${baseUrl}/api/v1/auth/login (autenticação)`);

  if (isDevelopment || configService.get<boolean>('SWAGGER_ENABLED', false)) {
    logger.log('📚 Documentação disponível:');
    logger.log(`   ├─ GET  ${baseUrl}/api-docs (Swagger UI)`);
    logger.log(`   └─ GET  ${baseUrl}/openapi.json (OpenAPI Spec)`);
  }

  // Informações de configuração (apenas desenvolvimento)
  if (isDevelopment) {
    logger.log('⚙️ Configurações ativas:');
    logger.log(`   ├─ Database: ${configService.get('DB_TYPE', 'N/A')}`);
    logger.log(
      `   ├─ Redis: ${configService.get('REDIS_HOST', 'N/A')}:${configService.get('REDIS_PORT', 'N/A')}`,
    );
    logger.log(
      `   ├─ Email: ${configService.get('EMAIL_ENABLED', false) ? 'Habilitado' : 'Desabilitado'}`,
    );
    logger.log(
      `   └─ SMTP: ${configService.get('SMTP_HOST', 'N/A')}:${configService.get('SMTP_PORT', 'N/A')}`,
    );
  }

  logger.log('🔧 === APLICAÇÃO PRONTA PARA USO ===');
}

/**
 * Configura graceful shutdown
 */
function setupGracefulShutdown(app: INestApplication): void {
  const logger = new Logger('GracefulShutdown');
  let isShuttingDown = false;

  const shutdown = async (signal: string): Promise<void> => {
    if (isShuttingDown) {
      logger.warn(`🔄 Shutdown já em andamento, ignorando sinal ${signal}`);
      return;
    }

    isShuttingDown = true;
    logger.log(`📴 Recebido sinal ${signal}. Iniciando graceful shutdown...`);

    try {
      // Timeout aumentado para 25 segundos para permitir finalização de todos os serviços
      const shutdownTimeout = setTimeout(() => {
        logger.warn(
          '⏰ Timeout do graceful shutdown (25s). Forçando encerramento...',
        );
        process.exit(1);
      }, 25000);

      // Aguardar um pouco para requests em andamento
      logger.log('⏳ Aguardando finalização de requests em andamento...');
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Fechar aplicação
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

  // Capturar sinais de shutdown
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Capturar exceções não tratadas
  process.on('uncaughtException', (error) => {
    logger.error('💥 Uncaught Exception:', {
      message: error.message,
      stack: error.stack,
    });
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('🚫 Unhandled Rejection:', {
      promise,
      reason,
    });
    shutdown('unhandledRejection');
  });

  // Capturar warnings (apenas em desenvolvimento)
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

/**
 * Health check básico para verificar se o processo está rodando
 */
process.on('message', (message) => {
  if (message === 'health-check') {
    process.send?.('healthy');
  }
});

// === INICIALIZAÇÃO PRINCIPAL ===
if (require.main === module) {
  bootstrap()
    .then((app) => {
      setupGracefulShutdown(app);
    })
    .catch((err) => {
      const logger = new Logger('Bootstrap');
      logger.error('💀 Falha crítica na inicialização:', {
        message: err.message,
        stack: err.stack,
      });
      process.exit(1);
    });
}

export { bootstrap };
