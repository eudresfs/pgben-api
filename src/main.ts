import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ResponseInterceptor } from './shared/interceptors/response.interceptor';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';
import { setupSwagger } from './shared/configs/swagger';
import { HealthCheckService } from './shared/services/health-check.service';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import timeout from 'connect-timeout';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  logger.log('Iniciando aplicação PGBen...');

  /** 1. Cria a aplicação NestJS com Express */
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
    abortOnError: false,
  });

  /** 2. Carrega configurações centralizadas */
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const env = configService.get<string>('NODE_ENV', 'development');
  const isDev = env === 'development';
  
  /** 3. Prefixo global */
  app.setGlobalPrefix('api');

  /** 4. Middleware de segurança */
  app.use(helmet({
    contentSecurityPolicy: isDev ? false : undefined,
  }));
  app.use(compression()); // Compressão gzip
  app.use(timeout('45s')); // Timeout global para requisições
  
  /** 5. CORS */
  app.enableCors({
    origin: isDev ? true : [
      configService.get<string>('FRONTEND_URL', 'http://localhost:4200'),
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Origin,X-Requested-With,Content-Type,Accept,Authorization',
  });

  /** 6. Swagger */
  if (isDev || configService.get<boolean>('ENABLE_SWAGGER', false)) {
    setupSwagger(app);
  }

  /** 7. Pipes / interceptors / filters globais */
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: (errors) => {
        const messages = errors.map((err) => ({
          property: err.property,
          constraints: err.constraints || {},
        }));
        return new HttpException(
          { statusCode: 400, message: 'Erro de validação', errors: messages },
          HttpStatus.BAD_REQUEST,
        );
      },
    }),
  );
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
  
  // Middleware para garantir que requisições com timeout sejam encerradas
  app.use((req, res, next) => {
    if (!req.timedout) next();
  });

  /** 8. Health-check (ignora falhas para não travar o bootstrap) */
  try {
    const health = app.get(HealthCheckService);
    const redisOK = await health.isRedisAvailable();
    health.logServicesStatus(redisOK);
  } catch (e) {
    logger.warn(`Health-check falhou, mas continuando: ${e.message}`);
  }

  /** 9. Sobe o servidor */
  const server = await app.listen(port, '0.0.0.0');
  logger.log('============================================');
  logger.log(`✅ Servidor online:  http://localhost:${port}`);
  
  if (isDev || configService.get<boolean>('ENABLE_SWAGGER', false)) {
    logger.log(`✅ Swagger:          http://localhost:${port}/api-docs`);
  }
  
  logger.log(`✅ Ambiente:         ${env}`);
  logger.log('============================================');

  /** 10. Configuração para graceful shutdown */
  const signals = ['SIGTERM', 'SIGINT'];
  signals.forEach(signal => {
    process.on(signal, async () => {
      logger.log(`${signal} recebido - iniciando shutdown gracioso...`);
      
      // Fecha conexões com banco de dados e outros recursos
      await app.close();
      
      // Notifica servidores de logs externos
      logger.log('Aplicação encerrada com sucesso');
      
      // Aguarda finalização de logs
      setTimeout(() => {
        process.exit(0);
      }, 1000);
    });
  });
}

bootstrap().catch((err) => {
  const logger = new Logger('Bootstrap');
  logger.error(`Falha crítica ao iniciar: ${err.message}`);
  logger.error(err.stack);
  process.exit(1);
});