/**
 * Enum que define os tipos de operações disponíveis para concessões.
 * Cada operação possui motivos específicos associados.
 */
export enum OperacaoConcessao {
  /** Operação de bloqueio de concessão */
  BLOQUEIO = 'bloqueio',

  /** Operação de desbloqueio de concessão */
  DESBLOQUEIO = 'desbloqueio',

  /** Operação de suspensão de concessão */
  SUSPENSAO = 'suspensao',

  /** Operação de reativação de concessão */
  REATIVACAO = 'reativacao',

  /** Operação de cancelamento de concessão */
  CANCELAMENTO = 'cancelamento',
}

/**
 * Interface que define a estrutura de um motivo para operações de concessão.
 */
export interface MotivoOperacao {
  /** Código único do motivo */
  codigo: string;

  /** Descrição do motivo */
  descricao: string;

  /** Indica se o motivo está ativo */
  ativo: boolean;
}

/**
 * Mapeamento de motivos por operação.
 * Contém motivos genéricos mockados para cada tipo de operação.
 */
export const MOTIVOS_POR_OPERACAO: Record<OperacaoConcessao, MotivoOperacao[]> =
  {
    [OperacaoConcessao.BLOQUEIO]: [
      {
        codigo: 'BLQ001',
        descricao: 'Descumprimento de condicionalidades',
        ativo: true,
      },
      {
        codigo: 'BLQ002',
        descricao: 'Irregularidade na documentação',
        ativo: true,
      },
      {
        codigo: 'BLQ003',
        descricao: 'Suspeita de fraude',
        ativo: true,
      },
      {
        codigo: 'BLQ004',
        descricao: 'Alteração na situação socioeconômica',
        ativo: true,
      },
      {
        codigo: 'BLQ005',
        descricao: 'Determinação judicial',
        ativo: true,
      },
    ],

    [OperacaoConcessao.DESBLOQUEIO]: [
      {
        codigo: 'DBL001',
        descricao: 'Regularização de condicionalidades',
        ativo: true,
      },
      {
        codigo: 'DBL002',
        descricao: 'Apresentação de documentação correta',
        ativo: true,
      },
      {
        codigo: 'DBL003',
        descricao: 'Esclarecimento de irregularidades',
        ativo: true,
      },
      {
        codigo: 'DBL004',
        descricao: 'Decisão administrativa favorável',
        ativo: true,
      },
      {
        codigo: 'DBL005',
        descricao: 'Ordem judicial',
        ativo: true,
      },
    ],

    [OperacaoConcessao.SUSPENSAO]: [
      {
        codigo: 'SUS001',
        descricao: 'Análise de irregularidades',
        ativo: true,
      },
      {
        codigo: 'SUS002',
        descricao: 'Aguardando documentação complementar',
        ativo: true,
      },
      {
        codigo: 'SUS003',
        descricao: 'Processo administrativo em andamento',
        ativo: true,
      },
      {
        codigo: 'SUS004',
        descricao: 'Revisão de critérios de elegibilidade',
        ativo: true,
      },
      {
        codigo: 'SUS005',
        descricao: 'Determinação judicial temporária',
        ativo: true,
      },
    ],

    [OperacaoConcessao.REATIVACAO]: [
      {
        codigo: 'REA001',
        descricao: 'Conclusão de análise favorável',
        ativo: true,
      },
      {
        codigo: 'REA002',
        descricao: 'Apresentação de documentação exigida',
        ativo: true,
      },
      {
        codigo: 'REA003',
        descricao: 'Finalização de processo administrativo',
        ativo: true,
      },
      {
        codigo: 'REA004',
        descricao: 'Confirmação de critérios de elegibilidade',
        ativo: true,
      },
      {
        codigo: 'REA005',
        descricao: 'Decisão judicial favorável',
        ativo: true,
      },
    ],

    [OperacaoConcessao.CANCELAMENTO]: [
      {
        codigo: 'CAN001',
        descricao: 'Perda de elegibilidade permanente',
        ativo: true,
      },
      {
        codigo: 'CAN002',
        descricao: 'Solicitação do beneficiário',
        ativo: true,
      },
      {
        codigo: 'CAN003',
        descricao: 'Óbito do beneficiário',
        ativo: true,
      },
      {
        codigo: 'CAN004',
        descricao: 'Fraude comprovada',
        ativo: true,
      },
      {
        codigo: 'CAN005',
        descricao: 'Mudança de programa social',
        ativo: true,
      },
      {
        codigo: 'CAN006',
        descricao: 'Determinação judicial definitiva',
        ativo: true,
      },
    ],
  };
