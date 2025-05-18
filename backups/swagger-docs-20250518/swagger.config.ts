import { DocumentBuilder, SwaggerCustomOptions } from '@nestjs/swagger';

/**
 * Configuração do Swagger para a documentação da API
 *
 * Este arquivo centraliza todas as configurações do Swagger para a aplicação
 * 
 * A documentação está organizada em módulos:
 * - schemas: Define os DTOs e modelos de dados
 * - examples: Exemplos de requisições e respostas
 * - responses: Respostas HTTP padronizadas
 */

// Importa os exemplos para documentação
import {
  loginRequestExample,
  loginResponseExample,
  refreshTokenRequestExample,
  alterarSenhaRequestExample,
  recuperarSenhaRequestExample,
  redefinirSenhaRequestExample,
  errorResponseExample,
  validationErrorExample,
} from './examples/auth';

export const swaggerConfig = new DocumentBuilder()
  .setTitle('API de Gestão de Benefícios Eventuais')
  .setDescription(
    `# API para o Sistema de Gestão de Benefícios Eventuais da SEMTAS

## Visão Geral
Esta API fornece endpoints para gerenciar o processo completo de solicitação, análise e concessão de benefícios eventuais.

## Autenticação
A API utiliza autenticação JWT (JSON Web Token). Para acessar endpoints protegidos, é necessário obter um token através do endpoint de login e incluí-lo no cabeçalho das requisições.

### Exemplo de Uso
\`\`\`typescript
// 1. Faça login para obter o token
const response = await fetch('/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(${JSON.stringify(loginRequestExample, null, 2)})
});

// 2. Use o token nas requisições seguintes
const token = response.data.accessToken;
const data = await fetch('/api/protegido', {
  headers: { 'Authorization': \`Bearer \${token}\` }
});
\`\`\`

## Estrutura da API
A API está organizada nos seguintes módulos:

- **Autenticação**: Login, refresh token e gerenciamento de senhas
- **Usuários**: Gerenciamento de usuários do sistema
- **Cidadãos**: Cadastro e gerenciamento de cidadãos/beneficiários
- **Unidades**: Gerenciamento de unidades e setores
- **Benefícios**: Configuração de tipos de benefícios e requisitos
- **Solicitações**: Gerenciamento do fluxo de solicitações de benefícios
- **Documentos**: Upload e gerenciamento de documentos
- **Ocorrências**: Registro de ocorrências relacionadas às solicitações
- **Notificações**: Sistema de notificações para usuários

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
| 500 | Erro interno do servidor |

## Tratamento de Erros

Os erros seguem o formato padrão:

\`\`\`json
${JSON.stringify(errorResponseExample, null, 2)}
\`\`\`

### Erros de Validação

Para erros de validação, a resposta inclui detalhes sobre os campos inválidos:

\`\`\`json
${JSON.stringify(validationErrorExample, null, 2)}
\`\`\`
`
  )
  .setVersion('1.0')
  .setContact(
    'Equipe SEMTAS',
    'https://www.natal.rn.gov.br/semtas',
    'suporte@semtas.natal.rn.gov.br',
  )
  .setLicense('Uso Interno', 'https://www.natal.rn.gov.br/semtas/licenca')
  .addTag('Autenticação', 'Autenticação e autorização')
  .addTag('Usuários', 'Usuários do sistema')
  .addTag('Cidadãos', 'Cidadãos e beneficiários')
  .addTag('Unidades', 'Unidades e setores')
  .addTag('Benefícios', 'Tipos de benefícios')
  .addTag('Solicitações', 'Solicitações de benefícios')
  .addTag('Documentos', 'Documentos')
  .addTag('Ocorrências', 'Ocorrências')
  .addTag('Notificações', 'Notificações')
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
  extraModels: [],
};

/**
 * Opções de configuração da UI do Swagger
 */
export const swaggerSetupOptions: SwaggerCustomOptions = {
  explorer: true,
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
    requestSnippetsEnabled: true,
    syntaxHighlight: {
      theme: 'agate',
    },
    validatorUrl: null,
  },
  customSiteTitle: 'API PGBEN - Documentação',
  customCss: `
    .swagger-ui .topbar { 
      display: none 
    }
    .swagger-ui .info { 
      margin: 30px 0 
    }
    .swagger-ui .scheme-container { 
      margin: 30px 0;
      box-shadow: none;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
    }
    .swagger-ui .info .title { 
      font-size: 36px;
      color: #3b4151;
    }
    .swagger-ui .info .description { 
      font-size: 16px; 
      line-height: 1.6;
      color: #3b4151;
    }
    .swagger-ui .info .description h2 { 
      font-size: 24px; 
      margin: 30px 0 15px 0;
      padding-bottom: 10px;
      border-bottom: 1px solid #e0e0e0;
    }
    .swagger-ui .info .description h3 { 
      font-size: 18px; 
      margin: 25px 0 12px 0;
    }
    .swagger-ui .info .description p { 
      margin: 12px 0;
    }
    .swagger-ui .info .description ul { 
      margin: 12px 0; 
      padding-left: 25px;
    }
    .swagger-ui .info .description li { 
      margin: 8px 0;
    }
    .swagger-ui .opblock .opblock-summary-description { 
      text-align: right; 
      padding-right: 10px;
      color: #3b4151;
    }
    .swagger-ui .opblock-tag { 
      font-size: 18px; 
      margin: 15px 0 10px 0; 
      padding: 12px 15px;
      background: #f8f8f8;
      border-radius: 4px;
      border-left: 4px solid #4990e2;
    }
    .swagger-ui .opblock-tag small { 
      font-size: 13px;
      color: #666;
    }
    .swagger-ui table tbody tr td { 
      vertical-align: top;
      padding: 8px 10px;
    }
    .swagger-ui .response-col_description__inner p { 
      margin-bottom: 10px;
    }
    .swagger-ui .prop-type { 
      font-size: 13px;
      font-family: monospace;
    }
    .swagger-ui .parameter__name { 
      font-weight: 600;
      color: #3b4151;
    }
    .swagger-ui .parameter__in { 
      font-style: italic; 
      color: #888;
      font-size: 12px;
    }
    .swagger-ui .opblock {
      margin-bottom: 15px;
      border-radius: 4px;
      border: 1px solid #e0e0e0;
    }
    .swagger-ui .opblock .opblock-section-header {
      box-shadow: none;
      background: #f8f8f8;
    }
    .swagger-ui .opblock .opblock-section-header h4 {
      color: #3b4151;
    }
    .swagger-ui .opblock .opblock-section-header .opblock-summary-method {
      font-weight: 600;
      min-width: 80px;
      text-align: center;
      border-radius: 3px;
      padding: 5px 0;
    }
    .swagger-ui .opblock .opblock-section-header .opblock-summary-path {
      font-family: monospace;
      font-size: 14px;
    }
  `,
};
