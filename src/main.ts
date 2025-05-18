import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { ResponseInterceptor } from './shared/interceptors/response.interceptor';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';
import {
  swaggerConfig,
  swaggerDocumentOptions,
  swaggerSetupOptions,
} from './shared/configs/swagger/swagger-pt';
import { HealthCheckService } from './shared/services/health-check.service';
import * as http from 'http';

/**
 * Bootstrap da aplicação PGBen
 * Implementação que garante o funcionamento correto do servidor
 */
async function bootstrap() {
  const logger = new Logger('Bootstrap');
  logger.log('Iniciando aplicação PGBen...');

  try {
    // Configuração da porta
    const port = parseInt(process.env.PORT || '3000', 10);
    
    // Verificar se a porta está disponível antes de tentar usar
    const isPortAvailable = await checkPortAvailability(port, logger);
    if (!isPortAvailable) {
      logger.warn(`Porta ${port} já está em uso. Tentando porta alternativa ${port + 1}...`);
      const isAltPortAvailable = await checkPortAvailability(port + 1, logger);
      if (!isAltPortAvailable) {
        logger.error(`Portas ${port} e ${port + 1} estão em uso. Verifique os processos em execução.`);
      }
    }

    // Criar a aplicação NestJS
    logger.log('Criando instância da aplicação NestJS...');
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug'],
      abortOnError: false,
    });

    // Configurar a aplicação
    app.setGlobalPrefix('api/');
    
    // Configuração do CORS otimizada
    app.enableCors({
      origin: ['http://localhost:4200', 'http://localhost:3000', 'http://127.0.0.1:3000'],
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true,
      allowedHeaders: 'Origin,X-Requested-With,Content-Type,Accept,Authorization',
    });

    // Configuração do Swagger
    const document = SwaggerModule.createDocument(
      app,
      swaggerConfig,
      swaggerDocumentOptions,
    );
    SwaggerModule.setup('api-docs', app, document, swaggerSetupOptions);

    // Configuração do pipe de validação global
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
        exceptionFactory: (errors) => {
          const messages = errors.map((error) => ({
            property: error.property,
            constraints: error.constraints || {},
          }));
          return new HttpException(
            {
              statusCode: 400,
              message: 'Erro de validação',
              errors: messages,
            },
            HttpStatus.BAD_REQUEST,
          );
        },
      }),
    );

    // Configuração do interceptor de resposta global
    app.useGlobalInterceptors(new ResponseInterceptor());

    // Configuração do filtro de exceção global
    app.useGlobalFilters(new HttpExceptionFilter());

    // Verificar saúde dos serviços externos
    try {
      const healthCheckService = app.get(HealthCheckService);
      const redisAvailable = await healthCheckService.isRedisAvailable();
      healthCheckService.logServicesStatus(redisAvailable);
    } catch (error) {
      logger.error(`Erro ao verificar saúde dos serviços: ${error.message}`);
      logger.error('Continuando inicialização apesar do erro...');
    }

    // Iniciar o servidor HTTP com método alternativo que funcionou anteriormente
    logger.log('Iniciando servidor HTTP...');
    
    // Método que funcionou: usar o httpAdapter diretamente
    const httpAdapter = app.getHttpAdapter();
    const server = httpAdapter.getHttpServer();
    
    // Iniciar com binding explícito para localhost
    await new Promise<void>((resolve, reject) => {
      server.once('error', (err: any) => {
        logger.error(`Erro ao iniciar servidor: ${err.message}`);
        reject(err);
      });
      
      // Usar 'localhost' em vez de '0.0.0.0' - essa foi a solução que funcionou
      server.listen(port, 'localhost', () => {
        logger.log(`Servidor iniciado com sucesso em localhost:${port}`);
        resolve();
      });
    });
    
    logger.log('============================================');
    logger.log(`✅ Servidor iniciado com sucesso em http://localhost:${port}`);
    logger.log(`✅ Swagger disponível em http://localhost:${port}/api-docs`);
    logger.log(`✅ Prometheus disponível em http://localhost:${port}/api/prometheus`);
    logger.log(`✅ Ambiente: ${process.env.NODE_ENV || 'development'}`);
    logger.log('============================================');

  } catch (error) {
    logger.error(`ERRO AO INICIAR SERVIDOR: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  }
}

/**
 * Função auxiliar para verificar se uma porta está disponível
 */
async function checkPortAvailability(port: number, logger: Logger): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const server = http.createServer();
    
    server.once('error', (err: any) => {
      server.close();
      if (err.code === 'EADDRINUSE') {
        logger.warn(`Porta ${port} já está em uso por outro processo`);
        resolve(false);
      } else {
        logger.warn(`Erro ao verificar porta ${port}: ${err.message}`);
        resolve(true); // Em caso de outro erro, assumir que a porta está disponível
      }
    });
    
    server.once('listening', () => {
      server.close();
      logger.log(`Porta ${port} está disponível`);
      resolve(true);
    });
    
    server.listen(port, 'localhost');
  });
}

bootstrap().catch(error => {
  const logger = new Logger('Bootstrap');
  logger.error(`Erro não capturado: ${error.message}`);
  logger.error(error.stack);
  process.exit(1);
});
