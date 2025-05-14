import { DocumentBuilder, SwaggerCustomOptions } from '@nestjs/swagger';
import { respostasPadrao, respostasEspecificas } from './swagger-respostas-padrao';
import { respostasExemplo } from './swagger-respostas';

/**
 * Configuração do Swagger em português
 * 
 * Este arquivo centraliza todas as configurações do Swagger para a aplicação,
 * garantindo consistência na documentação em português.
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
    '<p>A API está organizada nos seguintes módulos:</p>' +
    '<ul>' +
    '  <li><strong>Autenticação</strong>: Login, refresh token e gerenciamento de senhas</li>' +
    '  <li><strong>Cidadãos</strong>: Cadastro e gestão de cidadãos beneficiários</li>' +
    '  <li><strong>Benefícios</strong>: Configuração e gestão dos tipos de benefícios disponíveis</li>' +
    '  <li><strong>Solicitações</strong>: Gestão das solicitações de benefícios (criação, avaliação, acompanhamento)</li>' +
    '  <li><strong>Documentos</strong>: Upload e gestão de documentos anexados às solicitações</li>' +
    '  <li><strong>Usuários</strong>: Administração de usuários do sistema (funcionários)</li>' +
    '  <li><strong>Unidades</strong>: Gestão das unidades de atendimento da Secretaria</li>' +
    '  <li><strong>Notificações</strong>: Envio e controle de notificações aos cidadãos e usuários</li>' +
    '  <li><strong>Ocorrências</strong>: Registro de ocorrências, atividades e alterações nas solicitações</li>' +
    '  <li><strong>Health</strong>: Verificação de saúde e status do sistema</li>' +
    '  <li><strong>Metrics</strong>: Métricas e estatísticas de uso do sistema</li>' +
    '</ul>'
  )
  .setVersion('1.0')
  .setContact('Equipe SEMTAS', 'https://www.natal.rn.gov.br/semtas', 'suporte@semtas.natal.rn.gov.br')
  .setLicense('Uso Interno', 'https://www.natal.rn.gov.br/semtas/licenca')
  .addTag('auth', 'Autenticação e controle de acesso ao sistema')
  .addTag('cidadaos', 'Cadastro e gestão de cidadãos beneficiários')
  .addTag('beneficios', 'Configuração e gestão dos tipos de benefícios disponíveis')
  .addTag('solicitacoes', 'Gestão das solicitações de benefícios (criação, avaliação, acompanhamento)')
  .addTag('documentos', 'Upload e gestão de documentos anexados às solicitações')
  .addTag('usuarios', 'Administração de usuários do sistema (funcionários)')
  .addTag('unidades', 'Gestão das unidades de atendimento da Secretaria')
  .addTag('notificacoes', 'Envio e controle de notificações aos cidadãos e usuários')
  .addTag('ocorrencias', 'Registro de ocorrências, atividades e alterações nas solicitações')
  .addTag('health', 'Verificação de saúde e status do sistema')
  .addTag('metrics', 'Métricas e estatísticas de uso do sistema')
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'JWT',
      description: 'Informe o token JWT de autenticação',
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
    defaultModelsExpandDepth: 3,
    defaultModelExpandDepth: 3,
    displayRequestDuration: true,
    tryItOutEnabled: true,
  },
  customSiteTitle: 'API PGBEN - Documentação',
  customCss: `
    /* Animações */
    @keyframes fadeInDown {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes pulse {
      0% {
        box-shadow: 0 0 0 0 rgba(10, 77, 104, 0.4);
      }
      70% {
        box-shadow: 0 0 0 10px rgba(10, 77, 104, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(10, 77, 104, 0);
      }
    }
    
    @keyframes rotate {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }
    
    .swagger-ui .info {
      animation: fadeInDown 0.8s ease-out;
    }
    
    .swagger-ui .opblock-tag {
      animation: fadeInUp 0.6s ease-out;
      animation-fill-mode: both;
    }
    
    .swagger-ui .opblock:nth-child(1) { animation-delay: 0.1s; }
    .swagger-ui .opblock:nth-child(2) { animation-delay: 0.2s; }
    .swagger-ui .opblock:nth-child(3) { animation-delay: 0.3s; }
    .swagger-ui .opblock:nth-child(4) { animation-delay: 0.4s; }
    .swagger-ui .opblock:nth-child(5) { animation-delay: 0.5s; }
    
    .swagger-ui .btn.execute:hover {
      animation: pulse 1.5s infinite;
    }
    
    .swagger-ui .loading-container .loading:after {
      animation: rotate 1s linear infinite;
    }
    
    .swagger-ui .opblock:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
    }
    
    .swagger-ui .highlight-code:hover {
      transform: scale(1.01);
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
    }
    
    .swagger-ui input[type=text]:focus,
    .swagger-ui textarea:focus {
      border-color: #0a4d68;
      box-shadow: 0 0 0 3px rgba(10, 77, 104, 0.2);
      outline: none;
    }
    
    /* Estilos globais */
    body {
      font-family: 'Segoe UI', 'Roboto', sans-serif;
      background-color: #f8f9fa;
      margin: 0;
      padding: 0;
    }
    
    /* Cabeçalho e informações gerais */
    .swagger-ui .topbar { display: none }
    
    .swagger-ui .info {
      margin: 30px 0;
      padding: 20px 30px;
      background: white;
      color: #333;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
    }
    
    .swagger-ui .info .title {
      font-size: 36px;
      font-weight: 600;
      color: #0a4d68;
      margin-bottom: 20px;
    }
    
    .swagger-ui .info .description {
      font-size: 16px;
      line-height: 1.6;
      max-width: 900px;
    }
    
    .swagger-ui .info .description h2 {
      font-size: 28px;
      margin: 30px 0 15px 0;
      font-weight: 600;
      border-bottom: 2px solid rgba(255, 255, 255, 0.3);
      padding-bottom: 8px;
    }
    
    .swagger-ui .info .description h3 {
      font-size: 22px;
      margin: 25px 0 10px 0;
      font-weight: 500;
    }
    
    .swagger-ui .info .description p {
      margin: 15px 0;
    }
    
    .swagger-ui .info .description ul {
      margin: 15px 0;
      padding-left: 25px;
    }
    
    .swagger-ui .info .description li {
      margin: 8px 0;
      list-style-type: square;
    }
    
    .swagger-ui .info a {
      color: #0a4d68;
      text-decoration: none;
      transition: all 0.2s ease;
    }
    
    .swagger-ui .info a:hover {
      color: #088395;
      text-decoration: underline;
    }
    
    /* Container de esquemas */
    .swagger-ui .scheme-container {
      margin: 20px 0;
      padding: 20px;
      background-color: white;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
      border-radius: 8px;
    }
    
    /* Tags e seções */
    .swagger-ui .opblock-tag {
      font-size: 24px;
      margin: 25px 0 15px 0;
      padding: 15px;
      background-color: #f0f8ff;
      border-radius: 8px;
      border-left: 5px solid #0a4d68;
      transition: all 0.3s ease;
    }
    
    .swagger-ui .opblock-tag:hover {
      background-color: #e6f3ff;
      transform: translateX(5px);
    }
    
    .swagger-ui .opblock-tag small {
      font-size: 15px;
      color: #555;
      margin-left: 10px;
    }
    
    /* Blocos de operações */
    .swagger-ui .opblock {
      margin: 0 0 15px 0;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      overflow: hidden;
      transition: all 0.3s ease;
    }
    
    .swagger-ui .opblock:hover {
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
      transform: translateY(-2px);
    }
    
    /* Cores dos métodos HTTP */
    .swagger-ui .opblock-get {
      background-color: rgba(97, 175, 254, 0.1);
      border-color: #61affe;
    }
    
    .swagger-ui .opblock-post {
      background-color: rgba(73, 204, 144, 0.1);
      border-color: #49cc90;
    }
    
    .swagger-ui .opblock-put {
      background-color: rgba(252, 161, 48, 0.1);
      border-color: #fca130;
    }
    
    .swagger-ui .opblock-delete {
      background-color: rgba(249, 62, 62, 0.1);
      border-color: #f93e3e;
    }
    
    .swagger-ui .opblock-patch {
      background-color: rgba(80, 227, 194, 0.1);
      border-color: #50e3c2;
    }
    
    /* Resumo da operação */
    .swagger-ui .opblock .opblock-summary {
      padding: 10px 20px;
      display: flex;
      align-items: center;
    }
    
    .swagger-ui .opblock .opblock-summary-method {
      font-weight: 700;
      border-radius: 4px;
      text-shadow: 0 1px 0 rgba(0, 0, 0, 0.1);
    }
    
    .swagger-ui .opblock .opblock-summary-path {
      font-family: 'Roboto Mono', monospace;
      font-size: 16px;
      display: flex;
      align-items: center;
      padding: 0 10px;
    }
    
    .swagger-ui .opblock .opblock-summary-description {
      font-size: 14px;
      font-weight: 500;
      color: #555;
      text-align: right;
      padding-right: 10px;
      margin-left: auto;
    }
    
    /* Conteúdo da operação */
    .swagger-ui .opblock .opblock-body {
      padding: 20px;
    }
    
    .swagger-ui .opblock .opblock-section-header {
      padding: 12px 0;
      background-color: transparent;
      border-bottom: 1px solid #eee;
    }
    
    .swagger-ui .opblock .opblock-section-header h4 {
      font-size: 18px;
      color: #333;
    }
    
    /* Parâmetros */
    .swagger-ui .parameters-container {
      margin: 15px 0;
    }
    
    .swagger-ui .parameters-container .parameters-col_description {
      width: 70%;
    }
    
    .swagger-ui table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      border: 1px solid #eee;
      border-radius: 6px;
      overflow: hidden;
    }
    
    .swagger-ui table thead tr {
      background-color: #f5f5f5;
    }
    
    .swagger-ui table thead tr th {
      padding: 12px 15px;
      font-size: 14px;
      color: #333;
      font-weight: 600;
      text-align: left;
      border-bottom: 2px solid #ddd;
    }
    
    .swagger-ui table tbody tr {
      border-bottom: 1px solid #eee;
      transition: background-color 0.2s ease;
    }
    
    .swagger-ui table tbody tr:hover {
      background-color: #f9f9f9;
    }
    
    .swagger-ui table tbody tr td {
      padding: 12px 15px;
      vertical-align: top;
      font-size: 14px;
    }
    
    .swagger-ui .parameter__name {
      font-weight: 600;
      font-family: 'Roboto Mono', monospace;
      color: #0a4d68;
    }
    
    .swagger-ui .parameter__in {
      font-style: italic;
      color: #888;
      font-size: 12px;
    }
    
    .swagger-ui .parameter__type {
      color: #666;
      font-size: 13px;
    }
    
    /* Respostas */
    .swagger-ui .responses-wrapper {
      margin: 20px 0;
    }
    
    .swagger-ui .responses-inner h4 {
      font-size: 18px;
      margin-bottom: 15px;
    }
    
    .swagger-ui table.responses-table tbody tr.response {
      border-left: 5px solid transparent;
    }
    
    .swagger-ui table.responses-table tbody tr.response.response-success {
      border-left-color: #49cc90;
    }
    
    .swagger-ui table.responses-table tbody tr.response.response-error {
      border-left-color: #f93e3e;
    }
    
    .swagger-ui .response-col_status {
      font-size: 14px;
      font-weight: 600;
    }
    
    .swagger-ui .response-col_description__inner p {
      margin-bottom: 10px;
      font-size: 14px;
    }
    
    /* Exemplos de código */
    .swagger-ui .highlight-code {
      background-color: #1e1e1e;
      border-radius: 6px;
      margin: 15px 0;
    }
    
    .swagger-ui .highlight-code pre {
      padding: 15px;
      font-family: 'Roboto Mono', monospace;
      font-size: 13px;
      line-height: 1.5;
      color: #f8f8f2;
    }
    
    /* Padronização de todos os exemplos de código */
    .swagger-ui .microlight {
      background-color: #1e1e1e !important;
      color: #f8f8f2 !important;
      font-family: 'Roboto Mono', monospace;
      padding: 10px;
      border-radius: 4px;
    }
    
    /* Botões */
    .swagger-ui .btn {
      border-radius: 4px;
      font-weight: 500;
      text-transform: uppercase;
      font-size: 13px;
      padding: 8px 15px;
      transition: all 0.2s ease;
    }
    
    .swagger-ui .btn:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }
    
    .swagger-ui .btn.try-out__btn {
      background-color: #0a4d68;
      color: white;
      border: none;
    }
    
    .swagger-ui .btn.execute {
      background-color: #49cc90;
      color: white;
      border: none;
    }
    
    .swagger-ui .btn.cancel {
      background-color: #f93e3e;
      color: white;
      border: none;
    }
    
    /* Modelos */
    .swagger-ui section.models {
      margin: 30px 0;
      border: 1px solid #eee;
      border-radius: 8px;
      overflow: hidden;
    }
    
    .swagger-ui section.models .model-container {
      margin: 0;
      padding: 15px;
      border-bottom: 1px solid #eee;
    }
    
    .swagger-ui section.models .model-container:last-child {
      border-bottom: none;
    }
    
    .swagger-ui section.models h4 {
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }
    
    .swagger-ui .model-box {
      padding: 10px;
      background-color: #f8f9fa;
      border-radius: 4px;
    }
    
    .swagger-ui .model {
      font-size: 13px;
      font-family: 'Roboto Mono', monospace;
    }
    
    .swagger-ui .model-title {
      font-size: 16px;
      font-weight: 600;
      color: #0a4d68;
    }
    
    .swagger-ui .prop-type {
      font-size: 13px;
      color: #666;
    }
    
    .swagger-ui .prop-enum {
      font-size: 12px;
      color: #888;
    }
    
    /* Responsividade */
    @media (max-width: 768px) {
      .swagger-ui .info .title {
        font-size: 32px;
      }
      
      .swagger-ui .opblock-tag {
        font-size: 20px;
      }
      
      .swagger-ui .opblock .opblock-summary-path {
        font-size: 14px;
      }
    }
  `,
};

// Exemplos de payloads para requisições
export const exemplosPayload = {
  login: {
    email: 'usuario@semtas.gov.br',
    senha: 'senha123'
  },
  
  criarCidadao: {
    nome: 'Maria da Silva',
    cpf: '123.456.789-00',
    rg: '1234567',
    data_nascimento: '1985-05-10',
    sexo: 'feminino',
    endereco: {
      logradouro: 'Rua das Flores',
      numero: '123',
      complemento: 'Apto 101',
      bairro: 'Centro',
      cidade: 'Natal',
      estado: 'RN',
      cep: '59000-000'
    },
    telefone: '(84) 98765-4321',
    email: 'maria.silva@email.com',
    nis: '12345678901',
    escolaridade: 'Medio_Completo',
    renda: 1200.50
  },
  
  criarSolicitacao: {
    beneficiario_id: '550e8400-e29b-41d4-a716-446655440000',
    solicitante_id: '550e8400-e29b-41d4-a716-446655440000',
    tipo_beneficio_id: '550e8400-e29b-41d4-a716-446655440000',
    dados_beneficio: {
      valor_solicitado: 1500.00,
      justificativa: 'Falecimento de familiar próximo, sem condições financeiras para arcar com as despesas funerárias.',
      observacoes: 'Família em situação de vulnerabilidade social.'
    }
  },
  
  avaliarSolicitacao: {
    parecer: 'Aprovado',
    observacoes: 'Documentação completa e situação de vulnerabilidade confirmada.',
    valor_aprovado: 1500.00
  },
  
  criarPendencia: {
    tipo: 'documento',
    descricao: 'Apresentar documento de identidade legível',
    data_limite: '2023-01-28T14:30:00Z'
  }
};

// Exemplos de respostas para endpoints
export const exemplosResponse = {
  login: {
    accessToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
    refreshToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
    expiresIn: 3600,
    usuario: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      nome: 'João Silva',
      email: 'joao.silva@semtas.gov.br',
      cargo: 'tecnico_semtas',
      unidade: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        nome: 'CRAS Centro'
      }
    }
  },
  
  cidadao: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    nome: 'Maria da Silva',
    cpf: '123.456.789-00',
    rg: '1234567',
    data_nascimento: '1985-05-10',
    sexo: 'feminino',
    nome_social: null,
    endereco: {
      logradouro: 'Rua das Flores',
      numero: '123',
      complemento: 'Apto 101',
      bairro: 'Centro',
      cidade: 'Natal',
      estado: 'RN',
      cep: '59000-000'
    },
    telefone: '(84) 98765-4321',
    email: 'maria.silva@email.com',
    nis: '12345678901',
    escolaridade: 'Medio_Completo',
    renda: 1200.50,
    unidade: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      nome: 'CRAS Centro'
    },
    data_cadastro: '2023-01-15T14:30:00Z',
    ultima_atualizacao: '2023-01-15T14:30:00Z'
  },
  
  solicitacao: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    numero_protocolo: 'SOL-2023-00001',
    status: 'aberta',
    data_solicitacao: '2023-01-20T09:15:00Z',
    data_atualizacao: '2023-01-20T09:15:00Z',
    beneficiario: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      nome: 'Maria da Silva',
      cpf: '123.456.789-00'
    },
    solicitante: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      nome: 'Maria da Silva',
      cpf: '123.456.789-00'
    },
    tipo_beneficio: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      nome: 'Auxílio Funeral'
    },
    unidade: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      nome: 'CRAS Centro'
    },
    tecnico_responsavel: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      nome: 'João Oliveira'
    },
    dados_beneficio: {
      valor_solicitado: 1500.00,
      valor_aprovado: null,
      justificativa: 'Falecimento de familiar próximo, sem condições financeiras para arcar com as despesas funerárias.',
      observacoes: 'Família em situação de vulnerabilidade social.'
    },
    etapa_atual: {
      ordem: 1,
      nome: 'Análise Técnica',
      responsavel: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        nome: 'João Oliveira'
      },
      data_inicio: '2023-01-20T09:15:00Z',
      prazo: '2023-01-22T09:15:00Z'
    }
  },
  
  solicitacaoAvaliada: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    numero_protocolo: 'SOL-2023-00001',
    status: 'aprovada',
    data_solicitacao: '2023-01-20T09:15:00Z',
    data_atualizacao: '2023-01-21T14:30:00Z',
    beneficiario: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      nome: 'Maria da Silva',
      cpf: '123.456.789-00'
    },
    tipo_beneficio: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      nome: 'Auxílio Funeral'
    },
    dados_beneficio: {
      valor_solicitado: 1500.00,
      valor_aprovado: 1500.00,
      justificativa: 'Falecimento de familiar próximo, sem condições financeiras para arcar com as despesas funerárias.',
      observacoes: 'Família em situação de vulnerabilidade social.'
    },
    etapa_atual: {
      ordem: 2,
      nome: 'Aprovação da Coordenação',
      responsavel: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        nome: 'Ana Souza'
      },
      data_inicio: '2023-01-21T14:30:00Z',
      prazo: '2023-01-22T14:30:00Z'
    },
    parecer: 'Aprovado',
    observacoes_avaliacao: 'Documentação completa e situação de vulnerabilidade confirmada.'
  },
  
  pendencia: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    solicitacao_id: '550e8400-e29b-41d4-a716-446655440000',
    tipo: 'documento',
    descricao: 'Apresentar documento de identidade legível',
    status: 'aberta',
    data_criacao: '2023-01-21T14:30:00Z',
    data_limite: '2023-01-28T14:30:00Z',
    data_resolucao: null,
    usuario_criacao: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      nome: 'João Oliveira'
    },
    usuario_resolucao: null
  }
};
