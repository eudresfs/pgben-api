// IMPORTANTE: Carregar as variáveis de ambiente ANTES de qualquer outra importação
import './config/env';

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
import { CatalogAwareExceptionFilter } from './shared/exceptions/error-catalog';
import { setupSwagger } from './shared/configs/swagger/index';
import { applySecurity } from './config/security.config';
import { ConfigService } from '@nestjs/config';
import compression from 'compression';

/**
 * Configura e inicializa a aplicação NestJS
 */
async function bootstrap(): Promise<INestApplication> {
  const logger = new Logger('Bootstrap');

  try {
    logger.log('🚀 Iniciando aplicação SEMTAS...');

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

    // Interceptor de resposta padronizada
    app.useGlobalInterceptors(new ResponseInterceptor());

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
        { path: 'health/ping', method: RequestMethod.ALL },
        { path: 'metrics', method: RequestMethod.GET },
        { path: 'openapi.json', method: RequestMethod.GET },
        { path: 'v2/swagger.json', method: RequestMethod.GET },
        { path: 'api-docs', method: RequestMethod.ALL },
        { path: 'api-docs/*', method: RequestMethod.ALL },
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
  const formatError = (error: any, path = ''): any[] => {
    const currentPath = path ? `${path}.${error.property}` : error.property;

    if (error.children && error.children.length > 0) {
      // Processar erros aninhados
      const childErrors: any[] = [];
      error.children.forEach((child: any) => {
        childErrors.push(...formatError(child, currentPath));
      });
      return childErrors;
    } else {
      // Erro direto
      return [
        {
          field: currentPath,
          value: error.value,
          constraints: error.constraints || {},
          messages: error.constraints
            ? Object.values(error.constraints)
            : ['Erro de validação'],
        },
      ];
    }
  };

  const formattedErrors: any[] = [];
  errors.forEach((error) => {
    formattedErrors.push(...formatError(error));
  });

  return new BadRequestException({
    message: 'Dados de entrada inválidos',
    errors: formattedErrors,
    statusCode: 400,
    timestamp: new Date().toISOString(),
  });
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
  logger.log(`   ├─ GET  ${baseUrl}/ (health check raiz)`);
  logger.log(`   ├─ GET  ${baseUrl}/health (health check detalhado)`);
  logger.log(`   ├─ GET  ${baseUrl}/metrics (métricas do sistema)`);
  logger.log(`   └─ POST ${baseUrl}/api/auth/login (autenticação)`);

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

  const shutdown = async (signal: string): Promise<void> => {
    logger.log(`📴 Recebido sinal ${signal}. Iniciando graceful shutdown...`);

    try {
      // Aguardar requests em andamento (timeout de 10s)
      const shutdownTimeout = setTimeout(() => {
        logger.warn(
          '⏰ Timeout do graceful shutdown. Forçando encerramento...',
        );
        process.exit(1);
      }, 10000);

      // Fechar aplicação
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
