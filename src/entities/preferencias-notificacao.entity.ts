import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Entidade para armazenar preferências de notificação dos usuários
 * Implementa configurações personalizáveis por usuário e tipo de notificação
 */
@Entity('preferencias_notificacao')
@Index(['usuario_id'], { unique: true })
export class PreferenciasNotificacao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * ID do usuário proprietário das preferências
   */
  @Column({ type: 'uuid' })
  @Index()
  usuario_id: string;

  /**
   * Indica se as notificações estão ativas para o usuário
   */
  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  /**
   * Configurações globais de notificação
   * Armazenadas como JSON para flexibilidade
   */
  @Column({ type: 'jsonb', default: {} })
  configuracoes_globais: {
    limite_diario?: number;
    pausar_todas?: boolean;
    pausar_ate?: Date;
    canais_preferidos?: string[];
    horario_silencioso_global?: {
      ativo: boolean;
      inicio: string; // HH:MM
      fim: string; // HH:MM
    };
  };

  /**
   * Preferências específicas por tipo de notificação
   * Permite configuração granular por tipo
   */
  @Column({ type: 'jsonb', default: [] })
  tipos?: Array<{
    tipo: string; // TipoNotificacao
    ativo: boolean;
    prioridade_minima: 'low' | 'medium' | 'high';
    canais: string[]; // CanalNotificacao[]
    horario_silencioso: {
      ativo: boolean;
      inicio: string; // HH:MM
      fim: string; // HH:MM
    };
    agrupamento: {
      ativo: boolean;
      frequencia:
        | 'imediato'
        | '15min'
        | '30min'
        | '1hora'
        | '2horas'
        | 'diario';
      maximo_por_grupo: number;
    };
    template_personalizado?: string;
  }>;

  /**
   * Configurações de canais específicos
   * Permite personalização por canal de entrega
   */
  @Column({ type: 'jsonb', default: {} })
  configuracoes_canais?: {
    email?: {
      ativo: boolean;
      endereco_alternativo?: string;
      formato: 'html' | 'texto';
      incluir_anexos: boolean;
    };
    sms?: {
      ativo: boolean;
      numero_alternativo?: string;
      horario_permitido: {
        inicio: string;
        fim: string;
      };
    };
    push?: {
      ativo: boolean;
      som_personalizado?: string;
      vibrar: boolean;
    };
    sistema?: {
      ativo: boolean;
      persistir_historico: boolean;
      auto_marcar_lida: boolean;
    };
  };

  /**
   * Estatísticas de uso das notificações
   * Para análise e otimização
   */
  @Column({ type: 'jsonb', default: {} })
  estatisticas?: {
    total_enviadas?: number;
    total_lidas?: number;
    total_clicadas?: number;
    ultima_interacao?: Date;
    canais_mais_usados?: Record<string, number>;
    tipos_mais_frequentes?: Record<string, number>;
  };

  /**
   * Configurações de privacidade e LGPD
   */
  @Column({ type: 'jsonb', default: {} })
  configuracoes_privacidade?: {
    consentimento_marketing?: boolean;
    consentimento_analytics?: boolean;
    data_consentimento?: Date;
    ip_consentimento?: string;
    permitir_personalizacao?: boolean;
    reter_historico?: boolean;
  };

  /**
   * Versão das preferências para controle de migração
   */
  @Column({ type: 'integer', default: 1 })
  versao_schema: number;

  /**
   * Metadados adicionais
   */
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  /**
   * Método para obter configuração padrão
   */
  static criarConfiguracaoDefault(): Partial<PreferenciasNotificacao> {
    return {
      ativo: true,
      configuracoes_globais: {
        limite_diario: 50,
        pausar_todas: false,
        canais_preferidos: ['sistema', 'email'],
        horario_silencioso_global: {
          ativo: false,
          inicio: '22:00',
          fim: '08:00',
        },
      },
      tipos: [],
      configuracoes_canais: {
        email: {
          ativo: true,
          formato: 'html',
          incluir_anexos: true,
        },
        sistema: {
          ativo: true,
          persistir_historico: true,
          auto_marcar_lida: false,
        },
        push: {
          ativo: true,
          vibrar: true,
        },
        sms: {
          ativo: false,
          horario_permitido: {
            inicio: '08:00',
            fim: '20:00',
          },
        },
      },
      estatisticas: {
        total_enviadas: 0,
        total_lidas: 0,
        total_clicadas: 0,
        canais_mais_usados: {},
        tipos_mais_frequentes: {},
      },
      configuracoes_privacidade: {
        consentimento_marketing: false,
        consentimento_analytics: true,
        permitir_personalizacao: true,
        reter_historico: true,
      },
      versao_schema: 1,
      metadata: {},
    };
  }

  /**
   * Valida se as configurações estão consistentes
   */
  validarConfiguracao(): boolean {
    // Validar limite diário
    if (
      this.configuracoes_globais.limite_diario < 1 ||
      this.configuracoes_globais.limite_diario > 1000
    ) {
      return false;
    }

    // Validar horários
    const horarioRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (this.configuracoes_globais.horario_silencioso_global.ativo) {
      if (
        !horarioRegex.test(
          this.configuracoes_globais.horario_silencioso_global.inicio,
        ) ||
        !horarioRegex.test(
          this.configuracoes_globais.horario_silencioso_global.fim,
        )
      ) {
        return false;
      }
    }

    // Validar tipos
    for (const tipo of this.tipos) {
      if (!['low', 'medium', 'high'].includes(tipo.prioridade_minima)) {
        return false;
      }
      if (tipo.horario_silencioso.ativo) {
        if (
          !horarioRegex.test(tipo.horario_silencioso.inicio) ||
          !horarioRegex.test(tipo.horario_silencioso.fim)
        ) {
          return false;
        }
      }
    }

    return true;
  }
}
