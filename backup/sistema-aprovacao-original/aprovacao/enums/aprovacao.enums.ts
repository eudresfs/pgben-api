/**
 * Enums para o sistema de aprovação de ações críticas
 *
 * Define os tipos, status e estratégias utilizados no workflow de aprovação
 */

/**
 * Tipos de ações críticas que podem ser configuradas para aprovação
 */
export enum TipoAcaoCritica {
  CANCELAR_SOLICITACAO = 'cancelar_solicitacao',
  CANCELAR_CONCESSAO = 'cancelar_concessao',
  SUSPENDER_BENEFICIO = 'suspender_beneficio',
  BLOQUEAR_BENEFICIO = 'bloquear_beneficio',
  DESBLOQUEAR_BENEFICIO = 'desbloquear_beneficio',
  REATIVAR_BENEFICIO = 'reativar_beneficio',
  ALTERACAO_DADOS_BANCARIOS = 'alteracao_dados_bancarios',
  EXCLUSAO_BENEFICIARIO = 'exclusao_beneficiario',
  REATIVACAO_BENEFICIO = 'reativacao_beneficio',
  ALTERACAO_VALOR_BENEFICIO = 'alteracao_valor_beneficio',
  TRANSFERENCIA_BENEFICIO = 'transferencia_beneficio',
  BLOQUEIO_USUARIO = 'bloqueio_usuario',
  DESBLOQUEIO_USUARIO = 'desbloqueio_usuario',
  EXCLUSAO_USUARIO = 'exclusao_usuario',
  ALTERACAO_PERFIL_USUARIO = 'alteracao_perfil_usuario',
  ALTERACAO_PERMISSAO = 'alteracao_permissao',
  EXCLUSAO_DOCUMENTO = 'exclusao_documento',
  APROVACAO_RECURSO = 'aprovacao_recurso',
  REJEICAO_RECURSO = 'rejeicao_recurso',
  ALTERACAO_STATUS_PAGAMENTO = 'alteracao_status_pagamento',
  ESTORNO_PAGAMENTO = 'estorno_pagamento',
  CONFIGURACAO_SISTEMA = 'configuracao_sistema',
  CRIAR_SOLICITACAO_APROVACAO = 'criar_solicitacao_aprovacao',
  ATUALIZAR_SOLICITACAO_APROVACAO = 'atualizar_solicitacao_aprovacao',
  CANCELAR_SOLICITACAO_APROVACAO = 'cancelar_solicitacao_aprovacao',
  APROVAR_SOLICITACAO = 'aprovar_solicitacao',
  REJEITAR_SOLICITACAO = 'rejeitar_solicitacao',
  CRIAR_APROVADOR = 'criar_aprovador',
  ATUALIZAR_APROVADOR = 'atualizar_aprovador',
  DESATIVAR_APROVADOR = 'desativar_aprovador',
  REMOVER_APROVADOR = 'remover_aprovador',
  ALTERAR_CONFIGURACAO_APROVACAO = 'alterar_configuracao_aprovacao',
  ESCALAR_APROVACAO = 'escalar_aprovacao',
  DELEGAR_APROVACAO = 'delegar_aprovacao',
  PROCESSAMENTO_LOTE = 'processamento_lote',
  APROVACAO_PAGAMENTO = 'aprovacao_pagamento',
  EXECUTAR_LIMPEZA_DADOS = 'executar_limpeza_dados',
  REPROCESSAR_SOLICITACOES = 'reprocessar_solicitacoes',
  CONFIGURAR_ESCALACAO_AUTOMATICA = 'configurar_escalacao_automatica',
  CRIAR_ACAO_CRITICA = 'criar_acao_critica',
  ATUALIZAR_ACAO_CRITICA = 'atualizar_acao_critica',
  REMOVER_ACAO_CRITICA = 'remover_acao_critica',
  DESATIVAR_CONFIGURACAO_APROVACAO = 'desativar_configuracao_aprovacao',
  CLONAR_CONFIGURACAO_APROVACAO = 'clonar_configuracao_aprovacao',
  ESCALAR_SOLICITACAO_APROVACAO = 'escalar_solicitacao_aprovacao',
  REMOVER_CONFIGURACAO_APROVACAO = 'remover_configuracao_aprovacao',
}

/**
 * Status possíveis de uma solicitação de aprovação
 */
export enum StatusSolicitacaoAprovacao {
  PENDENTE = 'pendente',
  EM_ANALISE = 'em_analise',
  APROVADA = 'aprovada',
  REJEITADA = 'rejeitada',
  CANCELADA = 'cancelada',
  EXPIRADA = 'expirada',
  ESCALADA = 'escalada',
}

/**
 * Estratégias de aprovação disponíveis
 */
export enum EstrategiaAprovacao {
  UNANIME = 'unanime', // Todos os aprovadores devem aprovar
  MAIORIA = 'maioria', // Maioria simples dos aprovadores
  QUALQUER_UM = 'qualquer_um', // Qualquer aprovador pode aprovar
  HIERARQUICA = 'hierarquica', // Aprovação em ordem hierárquica
  PERSONALIZADA = 'personalizada', // Lógica customizada por ação
}

/**
 * Tipos de aprovadores no sistema
 */
export enum TipoAprovador {
  USUARIO = 'usuario', // Usuário específico
  PERFIL = 'perfil', // Qualquer usuário com o perfil
  UNIDADE = 'unidade', // Qualquer usuário da unidade
  HIERARQUIA = 'hierarquia', // Baseado na hierarquia organizacional
}

/**
 * Tipos de escopo para aprovação
 */
export enum TipoEscopo {
  GLOBAL = 'global',
  NACIONAL = 'nacional',
  REGIONAL = 'regional',
  UNIDADE = 'unidade',
  DEPARTAMENTO = 'departamento',
}

/**
 * Ações possíveis em uma aprovação
 */
export enum AcaoAprovacao {
  APROVAR = 'aprovar',
  REJEITAR = 'rejeitar',
  SOLICITAR_INFORMACOES = 'solicitar_informacoes',
  DELEGAR = 'delegar',
  ESCALAR = 'escalar',
}

/**
 * Prioridades de solicitação de aprovação
 */
export enum PrioridadeAprovacao {
  BAIXA = 'baixa',
  NORMAL = 'normal',
  ALTA = 'alta',
  CRITICA = 'critica',
  EMERGENCIAL = 'emergencial',
}

/**
 * Tipos de notificação para aprovação
 */
export enum TipoNotificacaoAprovacao {
  NOVA_SOLICITACAO = 'nova_solicitacao',
  LEMBRETE = 'lembrete',
  ESCALACAO = 'escalacao',
  APROVADA = 'aprovada',
  REJEITADA = 'rejeitada',
  CANCELADA = 'cancelada',
  EXPIRADA = 'expirada',
  INFORMACOES_SOLICITADAS = 'informacoes_solicitadas',
}

/**
 * Motivos de rejeição padronizados
 */
export enum MotivoRejeicao {
  DOCUMENTACAO_INSUFICIENTE = 'documentacao_insuficiente',
  DADOS_INCORRETOS = 'dados_incorretos',
  NAO_ATENDE_CRITERIOS = 'nao_atende_criterios',
  FALTA_AUTORIZACAO = 'falta_autorizacao',
  PRAZO_EXPIRADO = 'prazo_expirado',
  DUPLICIDADE = 'duplicidade',
  OUTROS = 'outros',
}

/**
 * Tipos de escalação automática
 */
export enum TipoEscalacao {
  POR_TEMPO = 'por_tempo', // Escalação por prazo
  POR_PRIORIDADE = 'por_prioridade', // Escalação por prioridade
  POR_VALOR = 'por_valor', // Escalação por valor envolvido
  MANUAL = 'manual', // Escalação manual
}

/**
 * Status de configuração de aprovação
 */
export enum StatusConfiguracaoAprovacao {
  ATIVA = 'ativa',
  INATIVA = 'inativa',
  RASCUNHO = 'rascunho',
  ARQUIVADA = 'arquivada',
}

/**
 * Períodos para lembretes e escalação
 */
export enum PeriodoLembrete {
  UMA_HORA = '1h',
  DUAS_HORAS = '2h',
  QUATRO_HORAS = '4h',
  OITO_HORAS = '8h',
  UM_DIA = '1d',
  DOIS_DIAS = '2d',
  UMA_SEMANA = '1w',
}

/**
 * Canais de notificação para aprovação
 */
export enum CanalNotificacaoAprovacao {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  SISTEMA = 'sistema',
  WHATSAPP = 'whatsapp',
}

/**
 * Status de aprovação (alias para StatusSolicitacaoAprovacao)
 */
export enum StatusAprovacao {
  PENDENTE = 'pendente',
  EM_ANALISE = 'em_analise',
  APROVADO = 'aprovado',
  REJEITADO = 'rejeitado',
  CANCELADO = 'cancelado',
  EXPIRADO = 'expirado',
  ESCALADO = 'escalado',
}

/**
 * Alias para StatusSolicitacaoAprovacao (compatibilidade)
 */
export const StatusSolicitacao = StatusSolicitacaoAprovacao;

/**
 * Tipos de ações registradas no histórico
 */
export enum TipoAcaoHistorico {
  SOLICITACAO_CRIADA = 'solicitacao_criada',
  APROVACAO = 'aprovacao',
  REJEICAO = 'rejeicao',
  CANCELAMENTO = 'cancelamento',
  ESCALACAO = 'escalacao',
  DELEGACAO = 'delegacao',
  SOLICITACAO_INFORMACOES = 'solicitacao_informacoes',
  INFORMACOES_FORNECIDAS = 'informacoes_fornecidas',
  EXPIRACAO = 'expiracao',
  REATIVACAO = 'reativacao',
  ALTERACAO_PRAZO = 'alteracao_prazo',
  ALTERACAO_APROVADORES = 'alteracao_aprovadores',
  NOTIFICACAO_ENVIADA = 'notificacao_enviada',
  LEMBRETE_ENVIADO = 'lembrete_enviado',
  AUTO_APROVACAO = 'auto_aprovacao',
}
