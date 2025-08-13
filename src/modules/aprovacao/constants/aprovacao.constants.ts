/**
 * Constantes para o sistema de aprovação de ações críticas
 *
 * Define valores fixos utilizados em todo o módulo de aprovação
 */

// Queue names
export const APROVACAO_QUEUE = 'aprovacao-queue';
export const NOTIFICACAO_QUEUE = 'notificacao-queue';
export const ESCALACAO_QUEUE = 'escalacao-queue';
export const LEMBRETE_QUEUE = 'lembrete-queue';

// Job names
export const PROCESSAR_APROVACAO_JOB = 'processar-aprovacao';
export const ESCALAR_APROVACAO_JOB = 'escalar-aprovacao';
export const ENVIAR_LEMBRETE_JOB = 'enviar-lembrete';
export const VERIFICAR_EXPIRACAO_JOB = 'verificar-expiracao';
export const NOTIFICAR_APROVADORES_JOB = 'notificar-aprovadores';

// Cache keys
export const CACHE_CONFIGURACAO_APROVACAO = 'config:aprovacao';
export const CACHE_APROVADORES_ATIVOS = 'aprovadores:ativos';
export const CACHE_SOLICITACOES_PENDENTES = 'solicitacoes:pendentes';

// Timeouts (em milissegundos)
export const TIMEOUT_APROVACAO_PADRAO = 24 * 60 * 60 * 1000; // 24 horas
export const TIMEOUT_ESCALACAO_PADRAO = 2 * 60 * 60 * 1000; // 2 horas
export const TIMEOUT_LEMBRETE_PADRAO = 4 * 60 * 60 * 1000; // 4 horas

// Limites
export const MAX_APROVADORES_POR_ACAO = 10;
export const MAX_TENTATIVAS_NOTIFICACAO = 3;
export const MAX_ESCALACOES_PERMITIDAS = 5;
export const MAX_SOLICITACOES_SIMULTANEAS = 100;

// Prioridades de job
export const PRIORIDADE_JOB_CRITICA = 1;
export const PRIORIDADE_JOB_ALTA = 2;
export const PRIORIDADE_JOB_NORMAL = 3;
export const PRIORIDADE_JOB_BAIXA = 4;

// Eventos do sistema
export const EVENTOS_APROVACAO = {
  SOLICITACAO_CRIADA: 'aprovacao.solicitacao.criada',
  SOLICITACAO_APROVADA: 'aprovacao.solicitacao.aprovada',
  SOLICITACAO_REJEITADA: 'aprovacao.solicitacao.rejeitada',
  SOLICITACAO_CANCELADA: 'aprovacao.solicitacao.cancelada',
  SOLICITACAO_EXPIRADA: 'aprovacao.solicitacao.expirada',
  SOLICITACAO_ESCALADA: 'aprovacao.solicitacao.escalada',
  APROVADOR_NOTIFICADO: 'aprovacao.aprovador.notificado',
  LEMBRETE_ENVIADO: 'aprovacao.lembrete.enviado',
  CONFIGURACAO_ALTERADA: 'aprovacao.configuracao.alterada',
} as const;

// Templates de notificação
export const TEMPLATES_NOTIFICACAO = {
  NOVA_SOLICITACAO: 'aprovacao-nova-solicitacao',
  LEMBRETE_APROVACAO: 'aprovacao-lembrete',
  ESCALACAO_APROVACAO: 'aprovacao-escalacao',
  APROVACAO_CONCLUIDA: 'aprovacao-concluida',
  APROVACAO_REJEITADA: 'aprovacao-rejeitada',
  APROVACAO_CANCELADA: 'aprovacao-cancelada',
  APROVACAO_EXPIRADA: 'aprovacao-expirada',
} as const;

// Códigos de erro específicos
export const CODIGOS_ERRO_APROVACAO = {
  CONFIGURACAO_NAO_ENCONTRADA: 'APROVACAO_001',
  APROVADOR_NAO_AUTORIZADO: 'APROVACAO_002',
  SOLICITACAO_JA_PROCESSADA: 'APROVACAO_003',
  SOLICITACAO_EXPIRADA: 'APROVACAO_004',
  LIMITE_APROVADORES_EXCEDIDO: 'APROVACAO_005',
  ESTRATEGIA_INVALIDA: 'APROVACAO_006',
  DADOS_INSUFICIENTES: 'APROVACAO_007',
  PERMISSAO_NEGADA: 'APROVACAO_008',
  TIMEOUT_PROCESSAMENTO: 'APROVACAO_009',
  ERRO_NOTIFICACAO: 'APROVACAO_010',
} as const;

// Métricas e monitoramento
export const METRICAS_APROVACAO = {
  SOLICITACOES_CRIADAS: 'aprovacao_solicitacoes_criadas_total',
  SOLICITACOES_APROVADAS: 'aprovacao_solicitacoes_aprovadas_total',
  SOLICITACOES_REJEITADAS: 'aprovacao_solicitacoes_rejeitadas_total',
  SOLICITACOES_EXPIRADAS: 'aprovacao_solicitacoes_expiradas_total',
  TEMPO_MEDIO_APROVACAO: 'aprovacao_tempo_medio_segundos',
  ESCALACOES_REALIZADAS: 'aprovacao_escalacoes_total',
  NOTIFICACOES_ENVIADAS: 'aprovacao_notificacoes_enviadas_total',
  ERROS_PROCESSAMENTO: 'aprovacao_erros_processamento_total',
} as const;

// Configurações de retry
export const RETRY_CONFIG = {
  attempts: 3,
  delay: 2000,
  backoff: 'exponential' as const,
  maxDelay: 30000,
};

// Configurações de rate limiting
export const RATE_LIMIT_CONFIG = {
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 solicitações por janela
  message:
    'Muitas solicitações de aprovação. Tente novamente em alguns minutos.',
};

// Configurações de validação
export const VALIDACAO_CONFIG = {
  MIN_CARACTERES_JUSTIFICATIVA: 10,
  MAX_CARACTERES_JUSTIFICATIVA: 1000,
  MIN_CARACTERES_OBSERVACAO: 5,
  MAX_CARACTERES_OBSERVACAO: 500,
  FORMATOS_ANEXO_PERMITIDOS: ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'],
  TAMANHO_MAX_ANEXO: 5 * 1024 * 1024, // 5MB
};

// Configurações de auditoria
export const AUDITORIA_CONFIG = {
  INCLUIR_DADOS_SENSIVEIS: false,
  NIVEL_DETALHAMENTO: 'completo' as const,
  RETENCAO_LOGS_DIAS: 2555, // 7 anos
  CAMPOS_OBRIGATORIOS: [
    'usuario_solicitante',
    'acao_critica',
    'justificativa',
    'timestamp',
  ],
};

// Configurações de notificação
export const NOTIFICACAO_CONFIG = {
  CANAIS_PADRAO: ['email', 'sistema'],
  TENTATIVAS_MAXIMAS: 3,
  INTERVALO_RETRY_MS: 5000,
  TIMEOUT_ENVIO_MS: 30000,
  INCLUIR_ANEXOS: true,
};

// Perfis com permissões especiais
export const PERFIS_ESPECIAIS = {
  SUPER_APROVADOR: 'super_aprovador',
  APROVADOR_EMERGENCIAL: 'aprovador_emergencial',
  AUDITOR_APROVACAO: 'auditor_aprovacao',
  ADMINISTRADOR_SISTEMA: 'administrador_sistema',
} as const;

// Configurações de escalação
export const ESCALACAO_CONFIG = {
  NIVEIS_MAXIMOS: 5,
  INTERVALO_PADRAO_HORAS: 2,
  MULTIPLICADOR_URGENCIA: 0.5, // Reduz o tempo pela metade para casos urgentes
  INCLUIR_GESTOR_DIRETO: true,
  NOTIFICAR_ESCALACAO: true,
};
