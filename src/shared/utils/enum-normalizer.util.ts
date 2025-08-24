/**
 * Utilitário para normalização de valores de enums
 *
 * Este utilitário garante que valores de enums sejam normalizados para lowercase
 * antes de serem salvos no banco de dados, mantendo consistência com os valores
 * definidos nas migrations.
 *
 * @author Equipe PGBen
 */

// Lista de campos que devem ser normalizados para uppercase
const ENUM_FIELDS = [
  // Status e tipos básicos
  'status_solicitacao',
  'tipo_beneficio',
  'status_unidade',
  'tipo_unidade',
  'tipo_moradia',

  'tipo_documento',
  'metodo_pagamento',
  'status_pagamento',
  'canal_notificacao',
  'tipo_configuracao',
  'status_usuario',
  'prioridade',
  'status_notificacao',
  'periodicidade',
  'status',
  'tipo',
  'metodoPagamento',

  // Dados pessoais
  'sexo',
  'escolaridade',
  'parentesco',
  'situacao_trabalho',
  'tipo_trabalho',
  'modalidade_bpc',
  'tipo_insercao_beneficiario',
  'tipo_insercao_conjuge',

  // Pendências e confirmações
  'status_pendencia',
  'metodo_confirmacao',

  // Métricas e alertas
  'tipo_metrica',
  'categoria_metrica',
  'nivel_alerta',

  // Integração
  'integracao_tipo',
  'tipo_evento_integracao',

  // Benefícios específicos
  'tipo_urna_funeraria',
  'periodicidade_entrega',
  'motivo_aluguel_social',
  'tipo_entrega_cesta_basica',
  'periodicidade_cesta_basica',

  // Avaliação
  'tipo_avaliacao',
  'resultado_avaliacao',

  // Solicitações
  'origem_solicitacao',
  'tipo_solicitacao',

  // Relatórios
  'formato_relatorio',
  'tipo_relatorio',
  'status_geracao',
  'estrategia_amostragem',

  // Agendamento
  'tipo_agendamento',
  'tipo_escopo',

  // Documentos
  'status_verificacao_documento',
  'resultado_verificacao_malware',
  'tipo_documento_enviado',

  // Configurações
  'visibilidade_configuracao',

  // Requisitos
  'fase_requisito',
  'tipo_campo',

  // Operações
  'tipo_operacao',
  'status_ativo',

  // Informações bancárias
  'tipo_conta',
  'tipo_chave_pix',
  'codigo_banco',

  // Recursos e processos
  'status_recurso',
  'status_processo_judicial',
  'tipo_determinacao_judicial',

  // Ocorrências
  'tipo_ocorrencia',
  'status_ocorrencia',
  'tipo_demanda',

  // Auditoria
  'audit_action',
  'audit_severity',

  // Notificações
  'tipo_notificacao',
  'status_notificacao_processamento',

  // Métricas avançadas
  'tipo_metrica_enum',
  'categoria_metrica_enum',
  'granularidade_temporal',
  'nivel_confianca_anomalia',

  // Configurações avançadas
  'parametro_tipo',
  'workflow_acao',
  'template_tipo',

  // Benefícios específicos
  'tipo_aprovador',
  'tipo_etapa',
  'tipo_dado',

  // Storage e documentos
  'categoria_documento',
  'tipo_storage_provider',

  // Logs
  'criticidade_log',
  'formato_exportacao',

  // Roles e permissões
  'role',
  'tipo_escopo_permission',
];

/**
 * Normaliza um valor de enum para lowercase
 * @param value Valor a ser normalizado
 * @returns Valor normalizado em lowercase ou o valor original se for null/undefined
 */
export function normalizeEnumValue(
  value: string | null | undefined,
): string | null | undefined {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value !== 'string') {
    return value;
  }

  return value.toLowerCase();
}

/**
 * Normaliza todos os campos de enum em um objeto de dados
 * @param data Objeto contendo os dados a serem normalizados
 * @returns Objeto com campos de enum normalizados
 */
export function normalizeEnumFields<T extends Record<string, any>>(data: T): T {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const normalizedData = { ...data };

  // Normalizar campos conhecidos de enum
  ENUM_FIELDS.forEach((field) => {
    if (field in normalizedData) {
      (normalizedData as any)[field] = normalizeEnumValue(
        normalizedData[field],
      );
    }
  });

  return normalizedData;
}

/**
 * Normaliza campos de enum em um array de objetos
 * @param dataArray Array de objetos a serem normalizados
 * @returns Array com objetos normalizados
 */
export function normalizeEnumFieldsArray<T extends Record<string, any>>(
  dataArray: T[],
): T[] {
  if (!Array.isArray(dataArray)) {
    return dataArray;
  }

  return dataArray.map((item) => normalizeEnumFields(item));
}

/**
 * Verifica se um campo é um campo de enum conhecido
 * @param fieldName Nome do campo
 * @returns true se o campo é um enum conhecido
 */
export function isEnumField(fieldName: string): boolean {
  return ENUM_FIELDS.includes(fieldName);
}

/**
 * Adiciona novos campos de enum à lista de campos conhecidos
 * @param newFields Array de novos campos de enum
 */
export function addEnumFields(newFields: string[]): void {
  newFields.forEach((field) => {
    if (!ENUM_FIELDS.includes(field)) {
      ENUM_FIELDS.push(field);
    }
  });
}

/**
 * Obtém a lista completa de campos de enum conhecidos
 * @returns Array com todos os campos de enum
 */
export function getEnumFields(): string[] {
  return [...ENUM_FIELDS];
}
