/**
 * Constantes centralizadas do módulo de benefícios
 *
 * RACIOCÍNIO: Centralizar valores evita "números mágicos" espalhados
 * e facilita manutenção. Se precisar mudar um valor, muda em um só lugar.
 */
export const BENEFICIO_CONSTANTS = {
  // Configurações de Cache
  CACHE: {
    TTL_SECONDS: 300, // 5 minutos - tempo seguro para dados que mudam pouco
    KEY_PREFIX: 'beneficio:',

    // Funções para gerar chaves consistentes
    KEYS: {
      byId: (entity: string, id: string) => `beneficio:${entity}:${id}`,
      bySolicitacao: (entity: string, id: string) =>
        `beneficio:${entity}:sol:${id}`,
      list: (entity: string) => `beneficio:${entity}:list`,
    },
  },

  // Validações de Tamanho
  VALIDATION: {
    MIN_DESCRICAO: 10, // Mínimo para descrições detalhadas
    MAX_OBSERVACOES: 500, // Máximo para campos de observação
    MIN_NOME: 3, // Mínimo para nomes
    MAX_NOME: 255, // Máximo para nomes
  },

  // Regras de Negócio - Aluguel Social
  ALUGUEL_SOCIAL: {
    MAX_ESPECIFICACOES: 2, // Limite de especificações adicionais
    ORIGENS_REQUEREM_UNIDADE: ['CRAS', 'CREAS', 'UBS', 'HOSPITAL'],
  },

  // Regras de Negócio - Cesta Básica
  CESTA_BASICA: {
    MIN_CESTAS: 1,
    MAX_CESTAS: 12,
    PESSOAS_POR_CESTA: 3, // 1 cesta para cada 3 pessoas
    TOLERANCIA_EXTRA: 1, // Pode pedir +1 sem justificativa
  },

  // Regras de Negócio - Funeral
  FUNERAL: {
    PRAZO_SOLICITACAO_DIAS: 30, // Prazo após óbito
    DIAS_URGENCIA: 3, // Considera urgente se < 3 dias
    TIPOS_URNA_ESPECIAL: ['INFANTIL', 'ESPECIAL', 'OBESO'],
  },

  // Regras de Negócio - Natalidade
  NATALIDADE: {
    PRAZO_GESTACAO_SEMANAS: 40, // Máximo de semanas
    PRAZO_GESTACAO_DIAS: 280, // 40 semanas em dias
    MAX_FILHOS: 20, // Limite razoável
  },

  // Regras de Negócio Consolidadas
  BUSINESS_RULES: {
    ALUGUEL_SOCIAL: {
      MAX_ESPECIFICACOES: 2,
      MIN_SITUACAO_MORADIA: 10,
      ORIGENS_REQUEREM_UNIDADE: ['CRAS', 'CREAS', 'UBS', 'HOSPITAL'],
    },
    CESTA_BASICA: {
      MIN_CESTAS: 1,
      MAX_CESTAS: 12,
      MAX_QUANTIDADE_ABSOLUTA: 20,
      PESSOAS_POR_CESTA: 3,
      TOLERANCIA_EXTRA: 1,
      MIN_JUSTIFICATIVA_LENGTH: 10,
      MIN_JUSTIFICATIVA: 10,
      MAX_PESSOAS_FAMILIA: 50,
    },
    FUNERAL: {
      PRAZO_SOLICITACAO_DIAS: 30,
      DIAS_URGENCIA: 3,
      TIPOS_URNA_ESPECIAL: ['infantil', 'especial', 'obeso', 'padrao'],
      MIN_NOME_LENGTH: 3,
      MAX_DIAS_APOS_OBITO: 30,
    },
    NATALIDADE: {
      PRAZO_GESTACAO_SEMANAS: 40,
      PRAZO_GESTACAO_DIAS: 280,
      MAX_DIAS_GESTACAO: 280,
      MAX_FILHOS: 20,
    },
  },

  // Mapeamento de Tipos (para Factory)
  TIPO_BENEFICIO_MAP: new Map([
    // Aluguel Social
    ['ALUGUEL_SOCIAL', 'ALUGUEL_SOCIAL'],
    ['AUXILIO_ALUGUEL', 'ALUGUEL_SOCIAL'],
    ['BENEFICIO_ALUGUEL', 'ALUGUEL_SOCIAL'],

    // Cesta Básica
    ['CESTA_BASICA', 'CESTA_BASICA'],
    ['AUXILIO_ALIMENTACAO', 'CESTA_BASICA'],
    ['BENEFICIO_ALIMENTACAO', 'CESTA_BASICA'],

    // Funeral
    ['FUNERAL', 'FUNERAL'],
    ['AUXILIO_FUNERAL', 'FUNERAL'],
    ['BENEFICIO_FUNERAL', 'FUNERAL'],

    // Natalidade
    ['NATALIDADE', 'NATALIDADE'],
    ['AUXILIO_NATALIDADE', 'NATALIDADE'],
    ['BENEFICIO_NATALIDADE', 'NATALIDADE'],
  ]),
} as const;

// Type helper para as chaves do mapa
export type TipoBeneficioMapeado =
  | 'aluguel-social'
  | 'cesta-basica'
  | 'funeral'
  | 'natalidade';
