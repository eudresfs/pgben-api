/**
 * Configuração do módulo de relatórios unificado
 *
 * Este arquivo contém configurações específicas para o módulo de relatórios,
 * incluindo constantes, configurações de cache e opções de segurança.
 */

/**
 * Configuração de relatórios para ser utilizada em todo o módulo
 */
export const RELATORIOS_CONFIG = {
  /**
   * Categorias de logs para auditoria
   */
  AUDIT_CATEGORIES: {
    /** Geração de relatórios */
    REPORT_GENERATION: 'report_generation',
    /** Acesso a dados sensíveis */
    SENSITIVE_DATA_ACCESS: 'sensitive_data_access',
    /** Falhas de autorização */
    AUTHORIZATION_FAILURE: 'authorization_failure',
  },

  /**
   * Definições de cache
   */
  CACHE: {
    /** Prefixo para chaves de cache de relatórios */
    KEY_PREFIX: 'relatorios:',
    /** TTL para cache de relatórios (1 hora) */
    TTL: 60 * 60 * 1000,
    /** Máximo de itens no cache */
    MAX_ITEMS: 100,
  },

  /**
   * Configurações de segurança
   */
  SECURITY: {
    /** Nível mínimo de cargo para acesso aos relatórios */
    MIN_ROLE_LEVEL: 2, // Coordenador ou superior
    /** Permissões requeridas para tipos específicos de relatórios */
    REQUIRED_PERMISSIONS: {
      BENEFICIOS: 'relatorios:beneficios',
      SOLICITACOES: 'relatorios:solicitacoes',
      ATENDIMENTOS: 'relatorios:atendimentos',
    },
  },

  /**
   * Configurações de arquivos temporários
   */
  TEMP_FILES: {
    /** Diretório para armazenamento temporário */
    DIR: 'temp/relatorios',
    /** Tempo de expiração em milissegundos (15 minutos) */
    EXPIRY: 15 * 60 * 1000,
  },

  /**
   * Configurações de formatação para relatórios
   */
  FORMATS: {
    /** Formatos suportados */
    SUPPORTED: ['pdf', 'excel', 'csv'] as const,
    /** Mimetypes correspondentes */
    MIME_TYPES: {
      pdf: 'application/pdf',
      excel:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      csv: 'text/csv',
    },
    /** Extensões de arquivo */
    FILE_EXTENSIONS: {
      pdf: 'pdf',
      excel: 'xlsx',
      csv: 'csv',
    },
  },
};
