import { DocumentBuilder, SwaggerCustomOptions } from '@nestjs/swagger';

/**
 * Configuração do Swagger para a documentação da API
 *
 * Este arquivo centraliza todas as configurações do Swagger para a aplicação
 */

export const swaggerConfig = new DocumentBuilder()
  .setTitle('API de Gestão de Benefícios Eventuais')
  .setDescription(
    'API para o Sistema de Gestão de Benefícios Eventuais da SEMTAS<br><br>' +
      '<h2>Visão Geral</h2>' +
      '<p>Esta API fornece endpoints para gerenciar o processo completo de solicitação, análise e concessão de benefícios eventuais.</p>' +
      '<h2>Autenticação</h2>' +
      '<p>A API utiliza autenticação JWT (JSON Web Token). Para acessar endpoints protegidos, é necessário obter um token através do endpoint de login e incluí-lo no cabeçalho das requisições.</p>' +
      '<h2>Estrutura da API</h2>' +
      '<p>A API está organizada nos seguintes módulos:</p>' +
      '<ul>' +
      '  <li><strong>Autenticação</strong>: Login, refresh token e gerenciamento de senhas</li>' +
      '  <li><strong>Usuários</strong>: Gerenciamento de usuários do sistema</li>' +
      '  <li><strong>Cidadãos</strong>: Cadastro e gerenciamento de cidadãos/beneficiários</li>' +
      '  <li><strong>Unidades</strong>: Gerenciamento de unidades e setores</li>' +
      '  <li><strong>Benefícios</strong>: Configuração de tipos de benefícios e requisitos</li>' +
      '  <li><strong>Solicitações</strong>: Gerenciamento do fluxo de solicitações de benefícios</li>' +
      '  <li><strong>Documentos</strong>: Upload e gerenciamento de documentos</li>' +
      '  <li><strong>Ocorrências</strong>: Registro de ocorrências relacionadas às solicitações</li>' +
      '  <li><strong>Notificações</strong>: Sistema de notificações para usuários</li>' +
      '</ul>',
  )
  .setVersion('1.0')
  .setContact(
    'Equipe SEMTAS',
    'https://www.natal.rn.gov.br/semtas',
    'suporte@semtas.natal.rn.gov.br',
  )
  .setLicense('Uso Interno', 'https://www.natal.rn.gov.br/semtas/licenca')
  .addTag('auth', 'Autenticação e autorização')
  .addTag('usuarios', 'Usuários do sistema')
  .addTag('cidadaos', 'Cidadãos e beneficiários')
  .addTag('unidades', 'Unidades e setores')
  .addTag('beneficios', 'Tipos de benefícios')
  .addTag('solicitacoes', 'Solicitações de benefícios')
  .addTag('documentos', 'Documentos')
  .addTag('ocorrencias', 'Ocorrências')
  .addTag('notificacoes', 'Notificações')
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

export const swaggerDocumentOptions = {
  deepScanRoutes: true,
  operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
};

export const swaggerSetupOptions: SwaggerCustomOptions = {
  swaggerOptions: {
    persistAuthorization: true,
    docExpansion: 'none',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    tagsSorter: 'alpha',
    operationsSorter: 'alpha',
    defaultModelsExpandDepth: 3,
    defaultModelExpandDepth: 3,
    displayRequestDuration: true,
    tryItOutEnabled: true,
  },
  customSiteTitle: 'API PGBEN - Documentação',
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 30px 0 }
    .swagger-ui .scheme-container { margin: 30px 0 }
    .swagger-ui .info .title { font-size: 36px }
    .swagger-ui .info .description { font-size: 16px; line-height: 1.5 }
    .swagger-ui .info .description h2 { font-size: 24px; margin: 20px 0 10px 0 }
    .swagger-ui .info .description h3 { font-size: 18px; margin: 15px 0 10px 0 }
    .swagger-ui .info .description p { margin: 10px 0 }
    .swagger-ui .info .description ul { margin: 10px 0; padding-left: 20px }
    .swagger-ui .info .description li { margin: 5px 0 }
    .swagger-ui .opblock .opblock-summary-description { text-align: right; padding-right: 10px; }
    .swagger-ui .opblock-tag { font-size: 20px; margin: 10px 0 5px 0; padding: 10px; }
    .swagger-ui .opblock-tag small { font-size: 14px; }
    .swagger-ui table tbody tr td { vertical-align: top; }
    .swagger-ui .response-col_description__inner p { margin-bottom: 10px; }
    .swagger-ui .prop-type { font-size: 13px; }
    .swagger-ui .parameter__name { font-weight: bold; }
    .swagger-ui .parameter__in { font-style: italic; color: #888; }
  `,
};
