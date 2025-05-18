import { DocumentBuilder, SwaggerCustomOptions } from '@nestjs/swagger';
import { swaggerDocumentOptions, tagsSorterFunction } from './swagger-options';
import { swaggerCustomCss } from './swagger-styles';
import { exemplosPayload, exemplosResponse } from './swagger-examples';

/**
 * Configuração do Swagger em português
 * 
 * Este arquivo centraliza as configurações básicas do Swagger para a aplicação,
 * garantindo consistência na documentação em português.
 * 
 * As configurações avançadas de filtro de rotas e opções de UI estão no arquivo swagger-options.ts
 */

export const swaggerConfig = new DocumentBuilder()
  .setTitle('API de Gestão de Benefícios Eventuais')
  .setDescription(
    '<h2>Visão Geral</h2>' +
    '<p>API para gestão de benefícios eventuais da Secretaria Municipal de Assistência Social.</p>' +
    '<p>Esta API permite o gerenciamento completo do fluxo de solicitação, análise e concessão de benefícios eventuais.</p>' +
    
    '<h2>Autenticação</h2>' +
    '<p>A API utiliza autenticação JWT (JSON Web Token). Para acessar os endpoints protegidos, é necessário obter um token através do endpoint de login e incluí-lo no cabeçalho das requisições.</p>' +
    
    '<h3>Como obter o token</h3>' +
    '<ol>' +
    '  <li>Faça uma requisição POST para <code>/auth/login</code> com suas credenciais</li>' +
    '  <li>O sistema retornará um token JWT</li>' +
    '  <li>Inclua o token no cabeçalho Authorization de suas requisições: <code>Authorization: Bearer {seu_token}</code></li>' +
    '</ol>' +
    
    '<h2>Estrutura da API</h2>' +
    '<p>A API está organizada nos seguintes módulos principais:</p>' +
    '<ul>' +
    '  <li><strong>Autenticação</strong>: Login, refresh token e gerenciamento de senhas</li>' +
    '  <li><strong>Cidadãos</strong>: Cadastro e gestão de cidadãos beneficiários</li>' +
    '  <li><strong>Benefícios</strong>: Configuração e gestão dos tipos de benefícios disponíveis</li>' +
    '  <li><strong>Solicitações</strong>: Gestão das solicitações de benefícios (criação, avaliação, acompanhamento)</li>' +
    '  <li><strong>Documentos</strong>: Upload e gestão de documentos anexados às solicitações</li>' +
    '  <li><strong>Notificações</strong>: Envio e controle de notificações</li>' +
    '</ul>' +
    
    '<h2>Guias de Uso</h2>' +
    '<p>Os guias a seguir demonstram os principais fluxos de uso da API:</p>' +
    '<ul>' +
    '  <li><a href="#guia-solicitacao">Fluxo de Solicitação de Benefício</a></li>' +
    '  <li><a href="#guia-analise">Fluxo de Análise de Solicitação</a></li>' +
    '  <li><a href="#guia-documentos">Gestão de Documentos</a></li>' +
    '</ul>' +
    
    '<div id="guia-solicitacao">' +
    require('./guides').guiaSolicitacaoBeneficio +
    '</div>' +
    
    '<div id="guia-analise">' +
    require('./guides').guiaAnaliseSolicitacao +
    '</div>' +
    
    '<div id="guia-documentos">' +
    require('./guides').guiaGestaoDocumentos +
    '</div>' +
    
    '<h2>Versionamento</h2>' +
    require('./versioning').versioningInfo +
    
    '<h2>Política de Depreciação</h2>' +
    require('./versioning').deprecationInfo,
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
    'JWT-auth', // Nome do esquema de segurança
  )
  .addTag('auth', 'Autenticação e controle de acesso ao sistema')
  .addTag('cidadaos', 'Cadastro e gestão de cidadãos beneficiários')
  .addTag(
    'beneficios',
    'Configuração e gestão dos tipos de benefícios disponíveis',
  )
  .addTag(
    'solicitacoes',
    'Gestão das solicitações de benefícios (criação, avaliação, acompanhamento)',
  )
  .addTag(
    'documentos',
    'Upload e gestão de documentos anexados às solicitações',
  )
  .addTag('usuarios', 'Administração de usuários do sistema (funcionários)')
  .addTag('unidades', 'Gestão das unidades de atendimento da Secretaria')
  .addTag(
    'notificacoes',
    'Envio e controle de notificações aos cidadãos e usuários',
  )
  .addTag(
    'ocorrencias',
    'Registro de ocorrências, atividades e alterações nas solicitações',
  )
  .addTag('health', 'Verificação de saúde e status do sistema')
  .addTag('metrics', 'Métricas e estatísticas de uso do sistema')
  .build();

/**
 * Opções unificadas para configuração do Swagger UI
 */
const swaggerOptions = {
  persistAuthorization: true,
  filter: true,
  displayRequestDuration: true,
  tagsSorter: tagsSorterFunction,
  docExpansion: 'none',
  syntaxHighlight: {
    theme: 'tomorrow-night',
  },
  defaultModelsExpandDepth: 3,
  defaultModelExpandDepth: 3,
  tryItOutEnabled: true,
};

/**
 * Configurações customizadas para a interface do usuário do Swagger
 * Aplica os estilos personalizados e configura comportamentos
 */
export const swaggerSetupOptions: SwaggerCustomOptions = {
  customCss: swaggerCustomCss,
  swaggerOptions: swaggerOptions,
  customSiteTitle: 'API PGBEN - Documentação',
};

/**
 * Mantendo compatibilidade com código existente
 */
export const swaggerCustomOptions = {
  swaggerOptions: {
    tagsSorter: tagsSorterFunction,
    docExpansion: 'list',
    filter: true,
    showRequestDuration: true,
  },
  customCss: swaggerCustomCss,
  customSiteTitle: 'API de Benefícios Eventuais - Documentação',
};

// Exportando opções de documento do Swagger
export { swaggerDocumentOptions };