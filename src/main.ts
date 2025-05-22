import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, RequestMethod, ValidationPipe } from '@nestjs/common';
import { ResponseInterceptor } from './shared/interceptors/response.interceptor';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';
import { setupSwagger } from './shared/configs/swagger/index';
import helmet from 'helmet';
import compression from 'compression';

async function bootstrap() {
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
    
    // Helmet para proteção de cabeçalhos HTTP
    app.use(helmet());
    
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
    
    // Filtro de exceções HTTP para padronizar o tratamento de erros
    app.useGlobalFilters(new HttpExceptionFilter());
    
    logger.log('✅ Interceptors e filtros globais configurados com sucesso');
    
    // Configuração do prefixo global
    logger.log('🚀 Configurando prefixo global "api"...');
    
    app.setGlobalPrefix('api', {
      exclude: [
        { path: '', method: RequestMethod.ALL },  // Rota raiz
        { path: 'health', method: RequestMethod.ALL },
        { path: 'health/ping', method: RequestMethod.ALL },
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
    logger.log(`   - GET  /health/ping`);
    logger.log(`   - GET  /api/test`);
    logger.log(`   - GET  /api-docs (Swagger UI)`);
    
  } catch (error) {
    logger.error('❌ Erro ao iniciar o servidor:', error);
    process.exit(1);
  }
}

// Iniciar a aplicação
bootstrap().catch(err => {
  console.error('Falha ao iniciar a aplicação:', err);
  process.exit(1);
});