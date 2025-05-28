import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerCustomOptions, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Configuração do Swagger para a documentação da API
 */
export const swaggerConfig = new DocumentBuilder()
  .setTitle('PGBen - Plataforma de Gestão de Benefícios Eventuais')
  .setDescription(
    `## Visão Geral
Esta API fornece endpoints para gerenciar o processo completo de solicitação, análise e concessão de benefícios eventuais.

## Autenticação
A API utiliza autenticação JWT (JSON Web Token). Para acessar endpoints protegidos, é necessário obter um token através do endpoint de login e incluí-lo no cabeçalho das requisições.

## Estrutura da API
A API está organizada nos seguintes módulos:

- **Autenticação**: Login, refresh token e gerenciamento de senhas
- **Usuários**: Gerenciamento de usuários do sistema
- **Cidadão**: Cadastro e gerenciamento de cidadãos/beneficiários
- **Unidades**: Gerenciamento de unidades e setores
- **Benefícios**: Configuração de tipos de benefícios e requisitos
- **Solicitações**: Gerenciamento do fluxo de solicitações de benefícios
- **Documentos**: Upload e gerenciamento de documentos
- **Notificações**: Sistema de notificações para usuários
- **Relatórios**: Geração de relatórios gerenciais
- **Auditoria**: Registro de ações no sistema

## Códigos de Resposta

| Código | Descrição |
|--------|-----------|
| 200 | Requisição bem-sucedida |
| 201 | Recurso criado com sucesso |
| 204 | Sem conteúdo (operações de exclusão bem-sucedidas) |
| 400 | Requisição inválida |
| 401 | Não autenticado |
| 403 | Acesso negado |
| 404 | Recurso não encontrado |
| 500 | Erro interno do servidor |`
  )
  .setVersion('1.0')
  .setContact(
    'Equipe SEMTAS',
    'https://www.natal.rn.gov.br/semtas',
    'suporte@semtas.natal.rn.gov.br',
  )
  .setLicense('Uso Interno', 'https://www.natal.rn.gov.br/semtas/licenca')
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'JWT',
      description: 'Insira o token JWT',
      in: 'header',
    },
    'JWT-auth',
  )
  .build();

/**
 * Opções para geração da documentação Swagger
 */
export const swaggerDocumentOptions = {
  deepScanRoutes: true,
  operationIdFactory: (controllerKey: string, methodKey: string) => 
    `${controllerKey.replace('Controller', '')}_${methodKey}`,
};

/**
 * Configuração da interface personalizada do Swagger
 */
export const swaggerSetupOptions: SwaggerCustomOptions = {
  explorer: true,
  swaggerOptions: {
    persistAuthorization: true,
    docExpansion: 'none',
    filter: true,
    displayRequestDuration: true,
    tryItOutEnabled: true,
    tagsSorter: 'alpha',
    operationsSorter: 'alpha',
  },
  customSiteTitle: 'PGBen - Documentação da API',
};

/**
 * Configura o Swagger na aplicação NestJS
 */
export function setupSwagger(app: INestApplication) {
  const document = SwaggerModule.createDocument(app, swaggerConfig, swaggerDocumentOptions);
  
  // Filtrar rotas desnecessárias para o frontend
  if (document.paths) {
    const pathsToRemove = [
      '/api/v1/metricas',
      '/api/prometheus',
      '/api/v1/monitoramento/metricas',
      '/api'
    ];
    
    pathsToRemove.forEach(path => {
      if (document.paths[path]) {
        delete document.paths[path];
      }
    });
  }
  
  // Configurar rota padrão para a documentação
  SwaggerModule.setup('api-docs', app, document, swaggerSetupOptions);
  
  // Adicionar rotas públicas para sincronização com ApiDog
  const httpAdapter = app.getHttpAdapter();
  
  // Rota para openapi.json (formato OpenAPI 3.0)
  httpAdapter.get('/openapi.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.send(JSON.stringify(document, null, 2));
  });
  
  // Rota para v2/swagger.json (compatibilidade com Swagger 2.0/OpenAPI 2.0)
  httpAdapter.get('/v2/swagger.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.send(JSON.stringify(document, null, 2));
  });
}
