import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

/**
 * Configuração da documentação Swagger para o módulo de aprovação
 * 
 * Este arquivo define a configuração específica do Swagger para o sistema de aprovação,
 * incluindo tags, schemas, exemplos e documentação detalhada dos endpoints.
 */

/**
 * Configurar documentação Swagger para o módulo de aprovação
 */
export function setupAprovacaoSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Sistema de Aprovação - API')
    .setDescription(`
      API completa para o Sistema de Aprovação de Ações Críticas
      
      ## Funcionalidades Principais
      
      ### 🔐 Aprovações
      - Criação e gerenciamento de solicitações de aprovação
      - Processamento de aprovações e rejeições
      - Sistema de delegação de aprovações
      - Escalação automática por prazo
      
      ### ⚙️ Configurações
      - Definição de ações críticas
      - Configuração de estratégias de aprovação
      - Gerenciamento de aprovadores
      - Regras de escalação automática
      
      ### 📊 Workflows e Métricas
      - Monitoramento em tempo real
      - Relatórios e dashboards
      - Métricas de performance
      - Auditoria completa
      
      ### 🔔 Notificações
      - Notificações multi-canal (email, SMS, push, in-app)
      - Templates personalizáveis
      - Escalação de notificações
      - Integração com Slack e Teams
      
      ## Segurança
      
      - Autenticação JWT obrigatória
      - Controle de acesso baseado em roles (RBAC)
      - Auditoria completa de todas as ações
      - Validação rigorosa de dados
      
      ## Padrões da API
      
      - RESTful design
      - Paginação padronizada
      - Filtros avançados
      - Códigos de status HTTP consistentes
      - Tratamento de erros padronizado
    `)
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Token JWT para autenticação',
        in: 'header',
      },
      'JWT-auth'
    )
    .addTag('Aprovação', 'Endpoints principais para gerenciamento de aprovações')
    .addTag('Configuração de Aprovação', 'Configuração de ações críticas e estratégias')
    .addTag('Solicitação de Aprovação', 'Gerenciamento de solicitações individuais')
    .addTag('Workflow de Aprovação', 'Workflows, métricas e administração do sistema')
    .addServer('http://localhost:3000', 'Servidor de Desenvolvimento')
    .addServer('https://api.semtas.gov.br', 'Servidor de Produção')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    include: [
      // Incluir apenas módulos relacionados à aprovação
    ],
    deepScanRoutes: true,
  });

  // Adicionar schemas customizados
  document.components = {
    ...document.components,
    schemas: {
      ...document.components?.schemas,
      ...getAprovacaoSchemas(),
    },
    examples: {
      ...document.components?.examples,
      ...getAprovacaoExamples(),
    },
  };

  SwaggerModule.setup('api/aprovacao/docs', app, document, {
    customSiteTitle: 'Sistema de Aprovação - API Docs',
    customfavIcon: '/favicon.ico',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #1976d2 }
    `,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      docExpansion: 'none',
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 2,
    },
  });
}

/**
 * Schemas customizados para o sistema de aprovação
 */
function getAprovacaoSchemas() {
  return {
    // Schema para resposta de erro padronizada
    ErrorResponse: {
      type: 'object',
      properties: {
        statusCode: {
          type: 'number',
          description: 'Código de status HTTP',
          example: 400,
        },
        message: {
          oneOf: [
            { type: 'string' },
            { type: 'array', items: { type: 'string' } },
          ],
          description: 'Mensagem de erro',
          example: 'Dados inválidos fornecidos',
        },
        error: {
          type: 'string',
          description: 'Tipo do erro',
          example: 'Bad Request',
        },
        timestamp: {
          type: 'string',
          format: 'date-time',
          description: 'Timestamp do erro',
        },
        path: {
          type: 'string',
          description: 'Endpoint que gerou o erro',
          example: '/api/aprovacao/solicitacoes',
        },
      },
    },

    // Schema para resposta paginada
    PaginatedResponse: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { type: 'object' },
          description: 'Dados da página atual',
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number', description: 'Total de registros' },
            page: { type: 'number', description: 'Página atual' },
            limit: { type: 'number', description: 'Itens por página' },
            totalPages: { type: 'number', description: 'Total de páginas' },
            hasNextPage: { type: 'boolean', description: 'Tem próxima página' },
            hasPrevPage: { type: 'boolean', description: 'Tem página anterior' },
          },
        },
        links: {
          type: 'object',
          properties: {
            first: { type: 'string', description: 'Link para primeira página' },
            previous: { type: 'string', description: 'Link para página anterior' },
            next: { type: 'string', description: 'Link para próxima página' },
            last: { type: 'string', description: 'Link para última página' },
          },
        },
      },
    },

    // Schema para solicitação de aprovação
    SolicitacaoAprovacao: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          format: 'uuid',
          description: 'ID único da solicitação',
        },
        acao_critica_id: {
          type: 'string',
          format: 'uuid',
          description: 'ID da ação crítica',
        },
        solicitante_id: {
          type: 'string',
          format: 'uuid',
          description: 'ID do usuário solicitante',
        },
        aprovador_id: {
          type: 'string',
          format: 'uuid',
          description: 'ID do aprovador atual',
          nullable: true,
        },
        status: {
          type: 'string',
          enum: ['PENDENTE', 'APROVADA', 'REJEITADA', 'CANCELADA', 'EXPIRADA'],
          description: 'Status atual da solicitação',
        },
        prioridade: {
          type: 'string',
          enum: ['BAIXA', 'NORMAL', 'ALTA', 'CRITICA'],
          description: 'Prioridade da solicitação',
        },
        dados_contexto: {
          type: 'object',
          description: 'Dados contextuais da ação',
        },
        justificativa: {
          type: 'string',
          description: 'Justificativa da solicitação',
        },
        observacoes: {
          type: 'string',
          description: 'Observações adicionais',
          nullable: true,
        },
        prazo_aprovacao: {
          type: 'string',
          format: 'date-time',
          description: 'Prazo limite para aprovação',
        },
        data_criacao: {
          type: 'string',
          format: 'date-time',
          description: 'Data de criação',
        },
        data_processamento: {
          type: 'string',
          format: 'date-time',
          description: 'Data de processamento',
          nullable: true,
        },
        historico: {
          type: 'array',
          items: { $ref: '#/components/schemas/HistoricoAprovacao' },
          description: 'Histórico de ações',
        },
      },
    },

    // Schema para histórico de aprovação
    HistoricoAprovacao: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          format: 'uuid',
          description: 'ID do registro de histórico',
        },
        acao: {
          type: 'string',
          enum: ['CRIADA', 'APROVADA', 'REJEITADA', 'DELEGADA', 'CANCELADA', 'ESCALADA'],
          description: 'Ação realizada',
        },
        usuario_id: {
          type: 'string',
          format: 'uuid',
          description: 'ID do usuário que realizou a ação',
        },
        observacoes: {
          type: 'string',
          description: 'Observações da ação',
          nullable: true,
        },
        dados_adicionais: {
          type: 'object',
          description: 'Dados adicionais da ação',
        },
        data_acao: {
          type: 'string',
          format: 'date-time',
          description: 'Data da ação',
        },
      },
    },

    // Schema para configuração de ação crítica
    ConfiguracaoAcaoCritica: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          format: 'uuid',
          description: 'ID da configuração',
        },
        nome: {
          type: 'string',
          description: 'Nome da ação crítica',
        },
        descricao: {
          type: 'string',
          description: 'Descrição detalhada',
        },
        tipo: {
          type: 'string',
          enum: [
            'ALTERACAO_DADOS_CRITICOS',
            'EXCLUSAO_REGISTRO',
            'APROVACAO_FINANCEIRA',
            'MUDANCA_STATUS_IMPORTANTE',
            'CONFIGURACAO_SISTEMA',
            'ACESSO_DADOS_SENSIVEIS',
          ],
          description: 'Tipo da ação crítica',
        },
        estrategia: {
          type: 'string',
          enum: ['APROVACAO_SIMPLES', 'APROVACAO_DUPLA', 'APROVACAO_COMITE', 'APROVACAO_HIERARQUICA'],
          description: 'Estratégia de aprovação',
        },
        aprovadores_obrigatorios: {
          type: 'array',
          items: { type: 'string', format: 'uuid' },
          description: 'IDs dos aprovadores obrigatórios',
        },
        aprovadores_alternativos: {
          type: 'array',
          items: { type: 'string', format: 'uuid' },
          description: 'IDs dos aprovadores alternativos',
        },
        prazo_padrao_horas: {
          type: 'number',
          description: 'Prazo padrão em horas',
        },
        requer_justificativa: {
          type: 'boolean',
          description: 'Se requer justificativa',
        },
        permite_auto_aprovacao: {
          type: 'boolean',
          description: 'Se permite auto-aprovação',
        },
        ativo: {
          type: 'boolean',
          description: 'Se a configuração está ativa',
        },
        data_criacao: {
          type: 'string',
          format: 'date-time',
          description: 'Data de criação',
        },
        data_atualizacao: {
          type: 'string',
          format: 'date-time',
          description: 'Data da última atualização',
        },
      },
    },
  };
}

/**
 * Exemplos para a documentação Swagger
 */
function getAprovacaoExamples() {
  return {
    // Exemplo de criação de solicitação
    CriarSolicitacaoExample: {
      summary: 'Criar nova solicitação de aprovação',
      description: 'Exemplo de payload para criar uma nova solicitação de aprovação',
      value: {
        acao_critica_id: '123e4567-e89b-12d3-a456-426614174000',
        justificativa: 'Necessário alterar dados do usuário para correção de informações incorretas',
        dados_contexto: {
          usuario_id: '987fcdeb-51a2-43d1-9c4f-123456789abc',
          campos_alterados: ['email', 'telefone'],
          valores_anteriores: {
            email: 'antigo@email.com',
            telefone: '(11) 99999-9999',
          },
          valores_novos: {
            email: 'novo@email.com',
            telefone: '(11) 88888-8888',
          },
        },
        prioridade: 'NORMAL',
        observacoes: 'Solicitação urgente devido a erro no cadastro',
      },
    },

    // Exemplo de aprovação
    AprovarSolicitacaoExample: {
      summary: 'Aprovar solicitação',
      description: 'Exemplo de payload para aprovar uma solicitação',
      value: {
        observacoes: 'Aprovado após verificação dos documentos. Alteração justificada.',
        dados_adicionais: {
          documentos_verificados: ['RG', 'CPF'],
          aprovador_substituto: false,
        },
      },
    },

    // Exemplo de rejeição
    RejeitarSolicitacaoExample: {
      summary: 'Rejeitar solicitação',
      description: 'Exemplo de payload para rejeitar uma solicitação',
      value: {
        motivo: 'DOCUMENTACAO_INSUFICIENTE',
        observacoes: 'Documentação apresentada não comprova a necessidade da alteração. Favor apresentar comprovante de residência atualizado.',
        dados_adicionais: {
          documentos_necessarios: ['Comprovante de residência', 'Declaração de próprio punho'],
          prazo_reenvio: '2024-12-31T23:59:59Z',
        },
      },
    },

    // Exemplo de configuração de ação crítica
    ConfiguracaoAcaoCriticaExample: {
      summary: 'Configurar ação crítica',
      description: 'Exemplo de configuração de uma nova ação crítica',
      value: {
        nome: 'Alteração de Dados Pessoais',
        descricao: 'Alteração de dados pessoais sensíveis como CPF, RG, nome completo',
        tipo: 'ALTERACAO_DADOS_CRITICOS',
        estrategia: 'APROVACAO_DUPLA',
        aprovadores_obrigatorios: [
          '123e4567-e89b-12d3-a456-426614174001',
          '123e4567-e89b-12d3-a456-426614174002',
        ],
        aprovadores_alternativos: [
          '123e4567-e89b-12d3-a456-426614174003',
        ],
        prazo_padrao_horas: 48,
        requer_justificativa: true,
        permite_auto_aprovacao: false,
        condicoes_auto_aprovacao: null,
        campos_obrigatorios: ['justificativa', 'dados_contexto'],
        validacoes_customizadas: {
          verificar_documentos: true,
          limite_alteracoes_mes: 3,
        },
        ativo: true,
      },
    },

    // Exemplo de filtros de busca
    FiltrosBuscaExample: {
      summary: 'Filtros de busca avançada',
      description: 'Exemplo de filtros para busca de solicitações',
      value: {
        status: ['PENDENTE', 'APROVADA'],
        data_inicio: '2024-01-01',
        data_fim: '2024-12-31',
        solicitante_id: '123e4567-e89b-12d3-a456-426614174000',
        aprovador_id: '123e4567-e89b-12d3-a456-426614174001',
        tipo_acao: 'ALTERACAO_DADOS_CRITICOS',
        prioridade: 'ALTA',
        vencendo_em_horas: 24,
        page: 1,
        limit: 20,
        sort: 'data_criacao',
        order: 'DESC',
      },
    },
  };
}

/**
 * Configuração adicional para documentação específica de desenvolvimento
 */
export function setupAprovacaoDevDocs(app: INestApplication) {
  const devConfig = new DocumentBuilder()
    .setTitle('Sistema de Aprovação - Documentação para Desenvolvedores')
    .setDescription(`
      Documentação técnica detalhada para desenvolvedores
      
      ## Arquitetura do Sistema
      
      ### Componentes Principais
      - **Controllers**: Endpoints REST para interação com o sistema
      - **Services**: Lógica de negócio e orquestração
      - **Guards**: Controle de acesso e autorização
      - **Interceptors**: Processamento de requisições e respostas
      - **Pipes**: Validação e transformação de dados
      - **Decorators**: Marcação de ações críticas
      
      ### Fluxo de Aprovação
      1. Ação crítica é interceptada pelo decorator @RequerAprovacao
      2. Solicitação é criada automaticamente
      3. Aprovadores são notificados
      4. Processo de aprovação/rejeição
      5. Escalação automática se necessário
      6. Execução da ação após aprovação
      
      ### Padrões de Desenvolvimento
      - Domain-Driven Design (DDD)
      - CQRS para separação de comandos e consultas
      - Event-Driven Architecture para notificações
      - Repository Pattern para acesso a dados
    `)
    .setVersion('1.0.0-dev')
    .addBearerAuth()
    .build();

  const devDocument = SwaggerModule.createDocument(app, devConfig);
  
  SwaggerModule.setup('api/aprovacao/dev-docs', app, devDocument, {
    customSiteTitle: 'Sistema de Aprovação - Dev Docs',
    swaggerOptions: {
      defaultModelsExpandDepth: 3,
      defaultModelExpandDepth: 3,
      docExpansion: 'full',
    },
  });
}