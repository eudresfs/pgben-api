import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ResponseInterceptor } from './shared/interceptors/response.interceptor';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Configuração do prefixo global da API
  app.setGlobalPrefix('api/v1');
  
  // Configuração do CORS
  app.enableCors();
  
  // Configuração do Swagger
  const config = new DocumentBuilder()
    .setTitle('API de Gestão de Benefícios Eventuais')
    .setDescription('API para o Sistema de Gestão de Benefícios Eventuais da SEMTAS')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);
  
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
