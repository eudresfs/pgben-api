import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { INestApplication, Logger, RequestMethod, ValidationPipe } from '@nestjs/common';
import { ResponseInterceptor } from './shared/interceptors/response.interceptor';
import { AllExceptionsFilter } from './shared/filters/all-exceptions.filter';
import { setupSwagger } from './shared/configs/swagger/index';
import { applySecurity } from './config/security.config';
import { ConfigService } from '@nestjs/config';
import compression from 'compression';

async function bootstrap(): Promise<INestApplication> {
  const logger = new Logger('Bootstrap');
  
  try {
    logger.log('🚀 Iniciando aplicação com debug detalhado...');
    
    // Criar a aplicação NestJS
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug'],
      abortOnError: false,
    });
    
    // Configuração básica do servidor
    const port = process.env.PORT || 3000;
    
    // Configurando middlewares de segurança
    logger.log('🚀 Configurando middlewares de segurança...');
    
    // Obter ConfigService para configurações de segurança
    const configService = app.get(ConfigService);
    
    // Aplicar todas as configurações de segurança
    applySecurity(app, configService);
    
    // Compressão de resposta para melhorar performance
    app.use(compression());
    
    logger.log('✅ Middlewares de segurança configurados com sucesso');
    
    // Adicionar pipes básicos
    logger.log('🚀 Configurando ValidationPipe global...');
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));
    logger.log('✅ ValidationPipe global configurado com sucesso');
    
    // Configurando interceptors e filtros globais
    logger.log('🚀 Configurando interceptors e filtros globais...');
    
    // Interceptor de resposta para padronizar a estrutura de resposta da API
    app.useGlobalInterceptors(new ResponseInterceptor());
    
    // Filtro de exceções unificado para padronizar o tratamento de erros
    const allExceptionsFilter = app.get(AllExceptionsFilter);
    app.useGlobalFilters(allExceptionsFilter);
    
    logger.log('✅ Interceptors e filtros globais configurados com sucesso');
    
    // Configuração do prefixo global
    logger.log('🚀 Configurando prefixo global "api"...');
    
    app.setGlobalPrefix('api', {
      exclude: [
        { path: '', method: RequestMethod.ALL },  // Rota raiz
        { path: 'health', method: RequestMethod.ALL },
        { path: 'health/ping', method: RequestMethod.ALL },
        { path: 'openapi.json', method: RequestMethod.GET },  // Rota pública para ApiDog
        { path: 'v2/swagger.json', method: RequestMethod.GET },  // Rota pública para ApiDog (compatibilidade)
      ],
    });
    
    logger.log('✅ Prefixo global configurado com sucesso');
    
    // Configurando Swagger para documentação da API
    logger.log('🚀 Configurando Swagger...');
    setupSwagger(app);
    logger.log('✅ Swagger configurado com sucesso');
    
    // Iniciar o servidor
    await app.listen(port);
    
    // Log de rotas disponíveis
    logger.log(`✅ Servidor rodando em: http://localhost:${port}`);
    logger.log('🔍 Rotas disponíveis:');
    logger.log(`   - GET  / (raiz)`);
    logger.log(`   - GET  /health`);
    logger.log(`   - GET  /api-docs (Swagger UI)`);
    logger.log(`   - GET  /openapi.json (OpenAPI 3.0 para ApiDog)`);
    logger.log(`   - GET  /v2/swagger.json (Swagger 2.0 para ApiDog)`);
    
    // Retornar a instância da aplicação para uso no graceful shutdown
    return app;
    
  } catch (error) {
    logger.error('❌ Erro ao iniciar o servidor:', error);
    process.exit(1);
  }
}

// Graceful shutdown handler
function setupGracefulShutdown(app: INestApplication) {
  const logger = new Logger('GracefulShutdown');
  
  const shutdown = async (signal: string) => {
    logger.log(`Recebido sinal ${signal}. Iniciando graceful shutdown...`);
    
    try {
      // Para de aceitar novas conexões
      await app.close();
      logger.log('Aplicação fechada com sucesso');
      process.exit(0);
    } catch (error) {
      logger.error('Erro durante o shutdown:', error);
      process.exit(1);
    }
  };
  
  // Captura sinais de shutdown
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  
  // Captura exceções não tratadas
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    shutdown('uncaughtException');
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    shutdown('unhandledRejection');
  });
}

// Iniciar a aplicação
bootstrap()
  .then(app => {
    setupGracefulShutdown(app);
  })
  .catch(err => {
    console.error('Falha ao iniciar a aplicação:', err);
    process.exit(1);
  });