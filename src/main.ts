import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { ResponseInterceptor } from './shared/interceptors/response.interceptor';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';
import { swaggerConfig, swaggerDocumentOptions, swaggerSetupOptions } from './shared/configs/swagger-pt';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Configuração do prefixo global da API
  app.setGlobalPrefix('api/v1');
  
  // Configuração do CORS
  app.enableCors();
  
  // Configuração do Swagger em português
  const document = SwaggerModule.createDocument(app, swaggerConfig, swaggerDocumentOptions);
  SwaggerModule.setup('api-docs', app, document, swaggerSetupOptions);
  
  // Configuração do pipe de validação global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: (errors) => {
        const messages = errors.map(error => ({
          property: error.property,
          constraints: error.constraints,
        }));
        return {
          statusCode: 400,
          message: 'Erro de validação',
          errors: messages,
        };
      },
    }),
  );
  
  // Configuração do interceptor de resposta global
  app.useGlobalInterceptors(new ResponseInterceptor());
  
  // Configuração do filtro de exceção global
  app.useGlobalFilters(new HttpExceptionFilter());
  
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
