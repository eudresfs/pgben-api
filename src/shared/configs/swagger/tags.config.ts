import { ApiTags } from '@nestjs/swagger';

/**
 * Configuração de tags para organização da documentação Swagger
 * Define grupos lógicos de endpoints com descrições detalhadas
 */
export const SWAGGER_TAGS = {
  // Autenticação e Autorização
  AUTH: {
    name: 'Autenticação',
    description:
      'Endpoints para autenticação de usuários, geração e renovação de tokens JWT, alteração de senhas e logout.',
  },

  // Recuperação de Senha
  PASSWORD_RESET: {
    name: 'Recuperação de Senha',
    description:
      'Endpoints para recuperação e redefinição de senhas de usuários.',
  },

  // Gestão de Cidadãos (consolidado)
  CIDADAOS: {
    name: 'Cidadão',
    description:
      'Gestão completa de dados dos cidadãos, incluindo informações pessoais, composição familiar, dados sociais, informações bancárias e documentação.',
  },

  // Composição Familiar
  COMPOSICAO_FAMILIAR: {
    name: 'Cidadão',
    description: 'Gestão da composição familiar dos cidadãos.',
  },

  // Dados Sociais
  DADOS_SOCIAIS: {
    name: 'Cidadão',
    description: 'Gestão de dados sociais dos cidadãos.',
  },

  // Informações Bancárias
  INFO_BANCARIA: {
    name: 'Cidadão',
    description: 'Gestão de informações bancárias dos cidadãos.',
  },

  // Tipos de Benefícios
  TIPOS_BENEFICIO: {
    name: 'Benefícios',
    description:
      'Configuração e gestão dos tipos de benefícios eventuais disponíveis no sistema, incluindo critérios de elegibilidade e valores.',
  },

  // Dados específicos de benefícios (consolidados)
  DADOS_BENEFICIO: {
    name: 'Benefícios',
    description:
      'Gestão de dados gerais e específicos dos benefícios, incluindo auxílio natalidade, aluguel social, cesta básica e auxílio funeral.',
  },

  // Dados de Natalidade
  DADOS_NATALIDADE: {
    name: 'Benefícios',
    description: 'Gestão específica de dados do auxílio natalidade.',
  },

  // Dados de Aluguel Social
  DADOS_ALUGUEL_SOCIAL: {
    name: 'Benefícios',
    description: 'Gestão específica de dados do aluguel social.',
  },

  // Dados de Cesta Básica
  DADOS_CESTA_BASICA: {
    name: 'Benefícios',
    description: 'Gestão específica de dados da cesta básica.',
  },

  // Dados de Funeral
  DADOS_FUNERAL: {
    name: 'Benefícios',
    description: 'Gestão específica de dados do auxílio funeral.',
  },

  // Solicitações de Benefícios
  SOLICITACOES: {
    name: 'Solicitação',
    description:
      'Gestão completa do ciclo de vida das solicitações de benefícios, desde a criação até a aprovação ou rejeição.',
  },

  // Monitoramento de Aluguel Social
  MONITORAMENTO_ALUGUEL: {
    name: 'Monitoramento de Aluguel Social',
    description: 'Monitoramento específico para benefícios de aluguel social.',
  },

  // Gestão de Documentos
  DOCUMENTOS: {
    name: 'Documentos',
    description:
      'Upload, validação, download e gestão de documentos anexados às solicitações de benefícios.',
  },

  // Relatórios e Analytics
  RELATORIOS: {
    name: 'Relatórios',
    description:
      'Geração de relatórios gerenciais, dashboards e métricas para acompanhamento e análise do sistema.',
  },

  // Usuários e Perfis
  USUARIOS: {
    name: 'Usuários',
    description:
      'Gestão de usuários do sistema, perfis de acesso e permissões para analistas e administradores.',
  },

  // Configurações do Sistema
  CONFIGURACOES: {
    name: 'Configuração',
    description:
      'Configurações gerais do sistema, parâmetros operacionais e customizações administrativas.',
  },

  // Auditoria e Logs
  AUDITORIA: {
    name: 'Auditoria',
    description:
      'Registro de ações, logs de sistema e trilhas de auditoria para compliance e rastreabilidade.',
  },

  // Logs do Sistema
  LOGS: {
    name: 'Logs',
    description:
      'Gestão e consulta de logs do sistema para debugging e monitoramento.',
  },

  // Notificações
  NOTIFICACOES: {
    name: 'Notificações',
    description:
      'Sistema de notificações por email, SMS e push para usuários e beneficiários.',
  },

  // Integrações Externas
  INTEGRACOES: {
    name: 'Integradores',
    description:
      'APIs para integração com sistemas externos, órgãos governamentais e serviços de terceiros.',
  },

  // Métricas e Monitoramento (consolidado)
  METRICAS: {
    name: 'Métricas e Dashboard',
    description:
      'Coleta, análise e visualização de métricas do sistema, dashboards, indicadores de performance e monitoramento operacional.',
  },

  // Dashboard
  DASHBOARD: {
    name: 'Métricas e Dashboard',
    description: 'Dashboards e visualizações de dados do sistema.',
  },

  // Monitoramento
  MONITORAMENTO: {
    name: 'Métricas e Dashboard',
    description: 'Monitoramento geral do sistema e operações.',
  },

  // Monitoramento de Resiliência
  MONITORAMENTO_RESILIENCIA: {
    name: 'Métricas e Dashboard',
    description: 'Monitoramento de resiliência e saúde do sistema.',
  },

  // Pagamentos (consolidado)
  PAGAMENTOS: {
    name: 'Pagamentos',
    description:
      'Gestão completa de pagamentos de benefícios, incluindo controle financeiro, integração bancária, comprovantes e confirmações de recebimento.',
  },

  // Comprovantes
  COMPROVANTES: {
    name: 'Pagamentos',
    description: 'Gestão de comprovantes de pagamento.',
  },

  // Confirmações
  CONFIRMACOES: {
    name: 'Pagamentos',
    description: 'Gestão de confirmações de recebimento de pagamentos.',
  },

  // Recursos
  RECURSOS: {
    name: 'Recursos',
    description:
      'Gestão de recursos administrativos contra decisões de benefícios.',
  },

  // Unidades
  UNIDADES: {
    name: 'Unidades',
    description: 'Gestão de unidades administrativas e setores da SEMTAS.',
  },

  // API de Exemplo
  API_EXEMPLO: {
    name: 'api-exemplo',
    description:
      'Endpoints de exemplo para demonstração de integração com sistemas externos.',
  },

  // Health Checks
  HEALTH_CHECKS: {
    name: 'Health Checks',
    description:
      'Endpoints para verificação de saúde do sistema, monitoramento de componentes e status operacional para Kubernetes e ferramentas de monitoramento.',
  },
} as const;

/**
 * Decorator helper para aplicar tags de forma consistente
 */
export function SwaggerTag(tagKey: keyof typeof SWAGGER_TAGS) {
  const tag = SWAGGER_TAGS[tagKey];
  return ApiTags(tag.name);
}

/**
 * Configuração completa de tags para o Swagger
 * Utilizada na configuração principal do DocumentBuilder
 */
export const SWAGGER_TAGS_CONFIG = Object.values(SWAGGER_TAGS).map((tag) => ({
  name: tag.name,
  description: tag.description,
}));

/**
 * Grupos de tags para organização hierárquica na documentação
 */
export const SWAGGER_TAG_GROUPS = {
  'Autenticação e Segurança': [
    SWAGGER_TAGS.AUTH.name,
    SWAGGER_TAGS.PASSWORD_RESET.name,
  ],
  'Gestão de Cidadãos': [
    SWAGGER_TAGS.CIDADAOS.name,
    SWAGGER_TAGS.COMPOSICAO_FAMILIAR.name,
    SWAGGER_TAGS.DADOS_SOCIAIS.name,
    SWAGGER_TAGS.INFO_BANCARIA.name,
  ],
  'Benefícios e Solicitações': [
    SWAGGER_TAGS.TIPOS_BENEFICIO.name,
    SWAGGER_TAGS.DADOS_NATALIDADE.name,
    SWAGGER_TAGS.DADOS_ALUGUEL_SOCIAL.name,
    SWAGGER_TAGS.DADOS_CESTA_BASICA.name,
    SWAGGER_TAGS.DADOS_FUNERAL.name,
    SWAGGER_TAGS.DADOS_BENEFICIO.name,
    SWAGGER_TAGS.SOLICITACOES.name,
    SWAGGER_TAGS.MONITORAMENTO_ALUGUEL.name,
  ],
  'Pagamentos e Financeiro': [
    SWAGGER_TAGS.PAGAMENTOS.name,
    SWAGGER_TAGS.COMPROVANTES.name,
    SWAGGER_TAGS.CONFIRMACOES.name,
  ],
  'Gestão de Conteúdo': [
    SWAGGER_TAGS.DOCUMENTOS.name,
    SWAGGER_TAGS.USUARIOS.name,
    SWAGGER_TAGS.RECURSOS.name,
    SWAGGER_TAGS.UNIDADES.name,
  ],
  'Analytics e Relatórios': [
    SWAGGER_TAGS.RELATORIOS.name,
    SWAGGER_TAGS.METRICAS.name,
    SWAGGER_TAGS.DASHBOARD.name,
    SWAGGER_TAGS.AUDITORIA.name,
    SWAGGER_TAGS.LOGS.name,
  ],
  'Monitoramento e Integrações': [
    SWAGGER_TAGS.HEALTH_CHECKS.name,
    SWAGGER_TAGS.MONITORAMENTO.name,
    SWAGGER_TAGS.MONITORAMENTO_RESILIENCIA.name,
    SWAGGER_TAGS.INTEGRACOES.name,
    SWAGGER_TAGS.API_EXEMPLO.name,
    SWAGGER_TAGS.NOTIFICACOES.name,
  ],
  Configurações: [SWAGGER_TAGS.CONFIGURACOES.name],
};

/**
 * Metadados adicionais para cada tag
 */
export const SWAGGER_TAG_METADATA = {
  [SWAGGER_TAGS.AUTH.name]: {
    externalDocs: {
      description: 'Documentação sobre autenticação JWT',
      url: 'https://jwt.io/introduction',
    },
    security: ['JWT'],
    examples: {
      loginSuccess: {
        summary: 'Login bem-sucedido',
        description: 'Exemplo de resposta de login com token JWT válido',
      },
    },
  },
  [SWAGGER_TAGS.CIDADAOS.name]: {
    dataProtection: {
      description: 'Dados pessoais protegidos pela LGPD',
      compliance: 'Lei Geral de Proteção de Dados (LGPD)',
    },
    validation: {
      cpf: 'Validação de CPF obrigatória',
      endereco: 'Validação de CEP via API externa',
    },
  },
  [SWAGGER_TAGS.SOLICITACOES.name]: {
    workflow: {
      description: 'Fluxo de aprovação configurável',
      states: ['PENDENTE', 'EM_ANALISE', 'APROVADA', 'REJEITADA', 'CANCELADA'],
    },
    sla: {
      description: 'Tempo máximo de análise: 5 dias úteis',
      escalation: 'Escalação automática após prazo',
    },
  },
  [SWAGGER_TAGS.DOCUMENTOS.name]: {
    fileTypes: {
      allowed: ['PDF', 'JPG', 'PNG'],
      maxSize: '10MB por arquivo',
      security: 'Armazenamento criptografado',
    },
    retention: {
      description: 'Política de retenção de documentos',
      period: '7 anos após conclusão do benefício',
    },
  },
  [SWAGGER_TAGS.RELATORIOS.name]: {
    formats: {
      supported: ['PDF', 'Excel', 'CSV', 'JSON'],
      recommendation: 'PDF para relatórios oficiais',
    },
    scheduling: {
      description: 'Geração automática de relatórios mensais',
      frequency: 'Primeiro dia útil de cada mês',
    },
  },
  [SWAGGER_TAGS.HEALTH_CHECKS.name]: {
    kubernetes: {
      description: 'Endpoints utilizados pelos probes do Kubernetes',
      probes: {
        liveness: '/health - Verifica se a aplicação está viva',
        readiness:
          '/health/ready - Verifica se a aplicação está pronta para receber tráfego',
        startup: '/health - Verifica se a aplicação iniciou corretamente',
      },
    },
    monitoring: {
      description: 'Monitoramento de componentes críticos',
      components: ['Database', 'Redis', 'Storage', 'Memory', 'Disk'],
      alerting: 'Integração com sistemas de alertas externos',
    },
    security: {
      description: 'Endpoints públicos sem autenticação',
      rateLimiting: 'Rate limiting aplicado para prevenir abuso',
    },
  },
};

/**
 * Configuração de ordenação das tags na documentação
 */
export const SWAGGER_TAG_ORDER = [
  // Autenticação e Segurança
  SWAGGER_TAGS.AUTH.name,
  SWAGGER_TAGS.PASSWORD_RESET.name,

  // Gestão de Cidadãos
  SWAGGER_TAGS.CIDADAOS.name,
  SWAGGER_TAGS.COMPOSICAO_FAMILIAR.name,
  SWAGGER_TAGS.DADOS_SOCIAIS.name,
  SWAGGER_TAGS.INFO_BANCARIA.name,

  // Benefícios e Solicitações
  SWAGGER_TAGS.TIPOS_BENEFICIO.name,
  SWAGGER_TAGS.DADOS_NATALIDADE.name,
  SWAGGER_TAGS.DADOS_ALUGUEL_SOCIAL.name,
  SWAGGER_TAGS.DADOS_CESTA_BASICA.name,
  SWAGGER_TAGS.DADOS_FUNERAL.name,
  SWAGGER_TAGS.DADOS_BENEFICIO.name,
  SWAGGER_TAGS.SOLICITACOES.name,
  SWAGGER_TAGS.MONITORAMENTO_ALUGUEL.name,

  // Pagamentos e Financeiro
  SWAGGER_TAGS.PAGAMENTOS.name,
  SWAGGER_TAGS.COMPROVANTES.name,
  SWAGGER_TAGS.CONFIRMACOES.name,

  // Gestão de Conteúdo
  SWAGGER_TAGS.DOCUMENTOS.name,
  SWAGGER_TAGS.USUARIOS.name,
  SWAGGER_TAGS.RECURSOS.name,
  SWAGGER_TAGS.UNIDADES.name,

  // Analytics e Relatórios
  SWAGGER_TAGS.RELATORIOS.name,
  SWAGGER_TAGS.METRICAS.name,
  SWAGGER_TAGS.DASHBOARD.name,
  SWAGGER_TAGS.AUDITORIA.name,
  SWAGGER_TAGS.LOGS.name,

  // Monitoramento e Integrações
  SWAGGER_TAGS.HEALTH_CHECKS.name,
  SWAGGER_TAGS.MONITORAMENTO.name,
  SWAGGER_TAGS.MONITORAMENTO_RESILIENCIA.name,
  SWAGGER_TAGS.INTEGRACOES.name,
  SWAGGER_TAGS.API_EXEMPLO.name,
  SWAGGER_TAGS.NOTIFICACOES.name,

  // Configurações
  SWAGGER_TAGS.CONFIGURACOES.name,
];

/**
 * Função para obter configuração completa de uma tag
 */
export function getTagConfig(tagKey: keyof typeof SWAGGER_TAGS) {
  const tag = SWAGGER_TAGS[tagKey];
  const metadata = SWAGGER_TAG_METADATA[tag.name];

  return {
    ...tag,
    metadata,
    order: SWAGGER_TAG_ORDER.indexOf(tag.name),
  };
}

/**
 * Função para validar se uma tag existe
 */
export function isValidTag(tagName: string): boolean {
  return Object.values(SWAGGER_TAGS).some((tag) => tag.name === tagName);
}

/**
 * Função para obter tags por grupo
 */
export function getTagsByGroup(
  groupName: keyof typeof SWAGGER_TAG_GROUPS,
): string[] {
  return SWAGGER_TAG_GROUPS[groupName] || [];
}
