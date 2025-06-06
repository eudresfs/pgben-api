import { INestApplication } from '@nestjs/common';
import {
  DocumentBuilder,
  SwaggerCustomOptions,
  SwaggerModule,
} from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';
import { SWAGGER_TAGS_CONFIG, SWAGGER_TAG_ORDER } from './tags.config';

/**
 * Configuração do Swagger para a documentação da API
 */
function createSwaggerConfig() {
  const config = new DocumentBuilder()
    .setTitle('Sistema SEMTAS - API de Gestão de Benefícios Eventuais')
    .setDescription(
      `## Visão Geral
Esta API fornece endpoints para gerenciar o processo completo de solicitação, análise e concessão de benefícios eventuais da SEMTAS (Secretaria Municipal do Trabalho e Assistência Social).

## Funcionalidades Principais
- **Gestão de Cidadãos**: Cadastro e manutenção de dados dos beneficiários
- **Tipos de Benefícios**: Configuração de auxílios disponíveis (Natalidade, Aluguel Social, etc.)
- **Solicitações**: Fluxo completo de requisição, análise e aprovação
- **Documentos**: Upload, validação e gestão de documentação
- **Relatórios**: Dashboards e relatórios gerenciais
- **Auditoria**: Rastreabilidade e logs de todas as operações

## Autenticação
A API utiliza autenticação JWT (JSON Web Token). Para acessar endpoints protegidos, é necessário obter um token através do endpoint de login e incluí-lo no cabeçalho das requisições.

## Segurança e Compliance
- Autenticação JWT com refresh tokens
- Controle de acesso baseado em perfis (RBAC)
- Conformidade com LGPD para proteção de dados pessoais
- Criptografia de documentos sensíveis
- Logs de auditoria para todas as operações

## Estrutura da API
A API está organizada nos seguintes módulos:

- **Autenticação**: Login, refresh token e gerenciamento de senhas
- **Cidadãos**: Cadastro e gerenciamento de cidadãos/beneficiários
- **Tipos de Benefício**: Configuração de tipos de benefícios e requisitos
- **Solicitações**: Gerenciamento do fluxo de solicitações de benefícios
- **Documentos**: Upload, validação e gerenciamento de documentos
- **Usuários**: Gerenciamento de usuários do sistema
- **Relatórios**: Geração de relatórios gerenciais e dashboards
- **Configurações**: Configurações gerais do sistema
- **Auditoria**: Registro de ações e logs do sistema
- **Notificações**: Sistema de notificações para usuários
- **Integrações**: APIs para integração com sistemas externos
- **Monitoramento**: Endpoints para verificação de saúde do sistema

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
| 422 | Entidade não processável (erro de validação) |
| 500 | Erro interno do servidor |

## Versionamento
Esta API segue versionamento semântico. Versão atual: v1.0.0
Para mudanças breaking, uma nova versão será criada (v2, v3, etc.)

## Suporte
Para dúvidas técnicas ou reportar problemas, entre em contato com a equipe de desenvolvimento.`,
    )
    .setVersion('1.0.0')
    .setContact(
      'Equipe SEMTAS',
      'https://www.natal.rn.gov.br/semtas',
      'suporte@semtas.natal.rn.gov.br',
    )
    .setLicense('Proprietary', 'https://semtas.gov.br/licenca')
    .setTermsOfService('https://semtas.gov.br/termos-uso')
    .setExternalDoc(
      'Documentação Técnica Completa',
      'https://docs.semtas.gov.br',
    )
    // Configuração de autenticação JWT
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Token JWT obtido através do endpoint de login',
        in: 'header',
      },
      'JWT-auth',
    )
    // Configuração de API Key para integrações
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-API-Key',
        in: 'header',
        description: 'Chave de API para integrações externas autorizadas',
      },
      'ApiKey',
    )
    // Servidores de ambiente
    .addServer('http://localhost:3000', 'Desenvolvimento Local')
    .addServer('https://api-dev.semtas.gov.br', 'Ambiente de Desenvolvimento')
    .addServer('https://api-staging.semtas.gov.br', 'Ambiente de Homologação')
    .addServer('https://api.semtas.gov.br', 'Ambiente de Produção');

  // Adicionar todas as tags configuradas
  SWAGGER_TAGS_CONFIG.forEach((tag) => {
    config.addTag(tag.name, tag.description);
  });

  return config.build();
}

export const swaggerConfig = createSwaggerConfig();

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
    docExpansion: 'list',
    filter: true,
    displayRequestDuration: true,
    tryItOutEnabled: true,
    // Ordenação das tags conforme configurado
    tagsSorter: (a: string, b: string) => {
      const indexA = SWAGGER_TAG_ORDER.indexOf(a as any);
      const indexB = SWAGGER_TAG_ORDER.indexOf(b as any);

      if (indexA === -1 && indexB === -1) {return a.localeCompare(b);}
      if (indexA === -1) {return 1;}
      if (indexB === -1) {return -1;}

      return indexA - indexB;
    },
    operationsSorter: 'method',
    deepLinking: true,
    displayOperationId: false,
    defaultModelsExpandDepth: 1,
    defaultModelExpandDepth: 1,
    defaultModelRendering: 'example',
    supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
    validatorUrl: null,
  },
  customSiteTitle: 'PGBen API - Documentação',
};

/**
 * Lista de endpoints que devem ser omitidos da documentação pública
 * por questões de segurança e abstração
 */
const INTERNAL_ENDPOINTS_TO_REMOVE = [
  // Endpoints administrativos e de configuração
  '/api/v1/permissoes',
  '/api/v1/auditoria',
  '/api/v1/auditoria/monitoramento',
  '/api/v1/auditoria/exportacao',
  '/api/configuracao/parametros',
  '/api/configuracao/workflows',
  '/api/configuracao/integracoes',
  '/api/configuracao/templates',
  '/api/configuracao/limites',

  // Endpoints de métricas e monitoramento interno
  '/api/v1/metricas',
  '/api/v1/metricas/valores',
  '/api/v1/metricas/analise',
  '/api/v1/metricas/exportacao',
  '/api/v1/dashboard',
  '/api/monitoramento/metricas',
  '/api/prometheus',
  '/api/metrics',
  '/api/resilience',
  '/v1/metrics',
  '/metrics',
  '/v1/health',
  '/health',
  '/health/check',
  '/health/ready',
  '/health/live',

  // Endpoints de logs e debug
  '/api/v1/logs',
  '/api/audit',
  '/debug',
  '/dev',
  '/test',

  // Endpoints de integração interna
  '/api/integradores',
  '/api/api/exemplo',
  '/api/exemplo',

  // Endpoints judiciais (acesso restrito)
  '/api/v1/judicial/processos',
  '/api/v1/judicial/determinacoes',
  '/api/v1/solicitacao/determinacao-judicial',

  // Endpoints de verificação e conflitos internos
  '/api/cidadao/verificacao-papel',
  '/api/v1/cidadao/regra-conflito',
  '/api/v1/cidadao/papel-conflito',

  // Endpoints de dados específicos de benefícios (internos)
  '/api/dados-funeral',
  '/api/dados-aluguel-social',
  '/api/dados-beneficio',
  '/api/dados-cesta-basica',
  '/api/dados-natalidade',
  '/api/monitoramento-aluguel-social',

  // Endpoints de pagamento interno
  '/api/pagamentos',

  // Endpoints de recursos internos
  '/api/v1/recursos',

  // Blacklist de autenticação
  '/api/auth/blacklist',
  '/auth/blacklist',
  '/auth/internal',
  '/auth/system',

  // Endpoints administrativos internos
  '/admin/internal',
  '/internal',

  // Endpoints de sistema
  '/system',
  '/status',

  // Endpoints de cache
  '/cache/clear',
  '/cache/stats',

  // Endpoints de logs internos
  '/logs/internal',

  // Endpoints de backup/restore
  '/backup',
  '/restore',

  // Endpoints de migração
  '/migrate',
  '/migration',

  // Endpoints de configuração interna
  '/config/reload',
  '/config/internal',

  // Endpoints de sessão interna
  '/session/cleanup',
  '/session/internal',

  // Endpoints de queue/job internos
  '/queue/stats',
  '/queue/internal',
  '/jobs/internal',

  // Endpoints de webhook internos
  '/webhook/internal',

  // Endpoints de sincronização
  '/sync/internal',

  // Endpoints de validação interna
  '/validate/internal',

  // Endpoints de cleanup
  '/cleanup',
  '/purge',

  // Endpoints de estatísticas internas
  '/stats/internal',

  // Endpoints de profiling
  '/profile',
  '/profiler',

  // Endpoints de trace
  '/trace',
  '/tracing',

  // Endpoints específicos que não devem aparecer na documentação
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',

  // Endpoints de upload interno
  '/upload/internal',

  // Endpoints de download interno
  '/download/internal',

  // Endpoints de notificação interna
  '/notification/internal',

  // Endpoints de relatório interno
  '/report/internal',

  // Endpoints de auditoria interna
  '/audit/internal',

  // Endpoints de integração interna
  '/integration/internal',

  // Endpoints de workflow interno
  '/workflow/internal',

  // Endpoints de template interno
  '/template/internal',

  // Endpoints de configuração de sistema
  '/system-config',

  // Endpoints de manutenção
  '/maintenance',

  // Endpoints de monitoramento de performance
  '/perf',
  '/performance',

  // Endpoints de análise
  '/analytics/internal',

  // Endpoints de exportação interna
  '/export/internal',

  // Endpoints de importação interna
  '/import/internal',

  // Root API
  '/api',
];

/**
 * Função para filtrar endpoints internos da documentação
 * @param document - Documento OpenAPI gerado
 */
function filterInternalEndpoints(document: any): void {
  if (!document.paths) {return;}

  // Remove endpoints específicos da lista
  INTERNAL_ENDPOINTS_TO_REMOVE.forEach((path) => {
    if (document.paths[path]) {
      delete document.paths[path];
    }
  });

  // Remove endpoints que correspondem a padrões internos
  const pathsToCheck = Object.keys(document.paths);
  pathsToCheck.forEach((path) => {
    // Remove endpoints que contêm padrões de administração
    if (
      path.includes('/admin/') ||
      path.includes('/internal/') ||
      path.includes('/debug/') ||
      path.includes('/dev/') ||
      path.includes('/test/') ||
      path.includes('/config/') ||
      path.includes('/settings/admin') ||
      path.includes('/logs/') ||
      path.includes('/stats/internal') ||
      path.includes('/backup/') ||
      path.includes('/maintenance/')
    ) {
      delete document.paths[path];
    }
  });
}

/**
 * Configura o Swagger na aplicação NestJS com filtros de segurança aprimorados
 */
export function setupSwagger(app: INestApplication) {
  const document = SwaggerModule.createDocument(
    app,
    swaggerConfig,
    swaggerDocumentOptions,
  );

  // Aplicar filtros de segurança para remover endpoints internos
  filterInternalEndpoints(document);

  // Adicionar informações de segurança ao documento
  if (document.info) {
    document.info['x-api-classification'] = 'public';
    document.info['x-security-level'] = 'standard';
    document.info['x-last-updated'] = new Date().toISOString();
  }

  // Configurar rota padrão para a documentação
  SwaggerModule.setup('api-docs', app, document, swaggerSetupOptions);

  // Adicionar rotas públicas para sincronização com ferramentas externas
  const httpAdapter = app.getHttpAdapter();

  // Rota para openapi.json (formato OpenAPI 3.0)
  httpAdapter.get('/openapi.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache por 1 hora
    res.send(JSON.stringify(document, null, 2));
  });

  // Rota para v2/swagger.json (compatibilidade com Swagger 2.0/OpenAPI 2.0)
  httpAdapter.get('/v2/swagger.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache por 1 hora
    res.send(JSON.stringify(document, null, 2));
  });
}
