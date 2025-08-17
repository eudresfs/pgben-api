import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { validate as uuidValidate } from 'uuid';
import { PreferenciasNotificacao } from '../../../entities/preferencias-notificacao.entity';

/**
 * Tipos de notificação suportados pelo sistema
 */
export enum TipoNotificacao {
  SISTEMA = 'sistema',
  SOLICITACAO = 'solicitacao',
  PENDENCIA = 'pendencia',
  APROVACAO = 'aprovacao',
  LIBERACAO = 'liberacao',
  ALERTA = 'alerta',
  URGENTE = 'urgente',
  ACOMPANHAMENTO = 'acompanhamento',
  APROVACAO_PENDENTE = 'aprovacao_pendente',
  APROVACAO_APROVADA = 'aprovacao_aprovada',
  APROVACAO_REJEITADA = 'aprovacao_rejeitada',
  SISTEMA_MANUTENCAO = 'sistema_manutencao',
  SISTEMA_ATUALIZACAO = 'sistema_atualizacao',
  USUARIO_NOVO = 'usuario_novo',
  USUARIO_BLOQUEADO = 'usuario_bloqueado',
}

/**
 * Canais de notificação disponíveis
 */
export enum CanalNotificacao {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  SISTEMA = 'sistema',
}

/**
 * Frequências de agrupamento de notificações
 */
export enum FrequenciaAgrupamento {
  IMEDIATO = 'imediato',
  CADA_15_MIN = '15min',
  CADA_30_MIN = '30min',
  CADA_HORA = '1hora',
  CADA_2_HORAS = '2horas',
  DIARIO = 'diario',
}

/**
 * Interface para preferências do usuário
 */
export interface PreferenciasUsuario {
  ativo: boolean;
  configuracoes_globais: {
    limite_diario?: number;
    pausar_todas?: boolean;
    pausar_ate?: Date;
    canais_preferidos?: string[];
    horario_silencioso_global?: {
      ativo: boolean;
      inicio: string;
      fim: string;
    };
  };
  tipos?: Array<{
    tipo: string;
    ativo: boolean;
    prioridade_minima: 'low' | 'medium' | 'high';
    canais: string[];
    horario_silencioso: {
      ativo: boolean;
      inicio: string;
      fim: string;
    };
    agrupamento: {
      ativo: boolean;
      frequencia: 'imediato' | '15min' | '30min' | '1hora' | '2horas' | 'diario';
      maximo_por_grupo: number;
    };
    template_personalizado?: string;
  }>;
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
  metadata?: Record<string, any>;
}

/**
 * Serviço para gerenciar preferências de notificação dos usuários
 */
@Injectable()
export class NotificacaoPreferenciasService {
  private readonly logger = new Logger(NotificacaoPreferenciasService.name);

  constructor(
    @InjectRepository(PreferenciasNotificacao)
    private readonly preferenciasRepository: Repository<PreferenciasNotificacao>,
  ) {}

  /**
   * Busca as preferências de notificação de um usuário
   */
  async buscarPreferencias(usuarioId: string): Promise<PreferenciasUsuario> {
    try {
      // Validar UUID do usuário
      if (!uuidValidate(usuarioId)) {
        throw new BadRequestException('ID do usuario invalido');
      }

      // Buscar preferências existentes
      const preferencias = await this.preferenciasRepository.findOne({
        where: { usuario_id: usuarioId },
      });

      if (!preferencias) {
        // Criar preferências padrão se não existirem
        const prefsDefault = PreferenciasNotificacao.criarConfiguracaoDefault();
        const novaPreferencia = this.preferenciasRepository.create({
          usuario_id: usuarioId,
          ...prefsDefault,
        });
        
        const preferenciaSalva = await this.preferenciasRepository.save(novaPreferencia);
        
        return this.mapearParaInterface(preferenciaSalva);
      }

      return this.mapearParaInterface(preferencias);
    } catch (error) {
      this.logger.error(
        `Erro ao buscar preferencias do usuario ${usuarioId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Atualiza as preferências de notificação de um usuário
   */
  async atualizarPreferencias(
    usuarioId: string,
    preferencias: Partial<PreferenciasUsuario>,
  ): Promise<PreferenciasUsuario> {
    try {
      // Validar UUID do usuário
      if (!uuidValidate(usuarioId)) {
        throw new BadRequestException('ID do usuario invalido');
      }

      // Validar horários se fornecidos
      if (preferencias.configuracoes_globais?.horario_silencioso_global) {
        const horario = preferencias.configuracoes_globais.horario_silencioso_global;
        if (horario.ativo) {
          if (!this.validarFormatoHorario(horario.inicio) || !this.validarFormatoHorario(horario.fim)) {
            throw new BadRequestException('Formato de horario invalido. Use HH:MM');
          }
        }
      }

      // Buscar preferências existentes
      const existingPrefs = await this.preferenciasRepository.findOne({
        where: { usuario_id: usuarioId },
      });

      if (!existingPrefs) {
        // Criar nova preferência
        const prefsDefault = PreferenciasNotificacao.criarConfiguracaoDefault();
        const entity = this.preferenciasRepository.create({
          usuario_id: usuarioId,
          ...prefsDefault,
          ...preferencias,
          metadata: {
            criado_por: 'sistema',
            versao: '1.0',
            ...preferencias.metadata,
          },
        });

        const preferenciaSalva = await this.preferenciasRepository.save(entity);
        return this.mapearParaInterface(preferenciaSalva);
      } else {
         // Atualizar preferência existente
         const updateData: any = {
           ...preferencias,
         };
         
         if (preferencias.metadata || existingPrefs.metadata) {
           updateData.metadata = {
             ...existingPrefs.metadata,
             atualizado_por: 'usuario',
             ultima_atualizacao: new Date().toISOString(),
             ...preferencias.metadata,
           };
         }
          
         await this.preferenciasRepository.update(existingPrefs.id, updateData);

        const preferenciaAtualizada = await this.preferenciasRepository.findOne({
          where: { id: existingPrefs.id },
        });

        return this.mapearParaInterface(preferenciaAtualizada);
      }
    } catch (error) {
      this.logger.error(
        `Erro ao atualizar preferencias do usuario ${usuarioId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Remove as preferências de um usuário
   */
  async removerPreferencias(usuarioId: string): Promise<void> {
    try {
      // Validar UUID do usuário
      if (!uuidValidate(usuarioId)) {
        throw new BadRequestException('ID do usuario invalido');
      }

      await this.preferenciasRepository.delete({ usuario_id: usuarioId });
      
      this.logger.log(`Preferencias removidas para usuario ${usuarioId}`);
    } catch (error) {
      this.logger.error(
        `Erro ao remover preferencias do usuario ${usuarioId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Verifica se um usuário deve receber notificação de um tipo específico
   */
  async deveReceberNotificacao(
    usuarioId: string,
    tipo: TipoNotificacao,
    canal: CanalNotificacao,
  ): Promise<boolean> {
    try {
      const preferencias = await this.buscarPreferencias(usuarioId);

      // Verificar se notificações estão ativas globalmente
      if (!preferencias.ativo) {
        return false;
      }

      // Verificar se todas as notificações estão pausadas
      if (preferencias.configuracoes_globais.pausar_todas) {
        return false;
      }

      // Verificar se está no período de pausa
      if (preferencias.configuracoes_globais.pausar_ate) {
        const agora = new Date();
        if (agora < preferencias.configuracoes_globais.pausar_ate) {
          return false;
        }
      }

      // Verificar configurações específicas do tipo
      const configTipo = preferencias.tipos?.find(t => t.tipo === tipo);
      if (configTipo && !configTipo.ativo) {
        return false;
      }

      // Verificar se o canal está ativo
      if (configTipo && !configTipo.canais.includes(canal)) {
        return false;
      }

      // Verificar configurações do canal
      const configCanal = preferencias.configuracoes_canais?.[canal];
      if (configCanal && !configCanal.ativo) {
        return false;
      }

      // Verificar horário silencioso global
      if (this.estaEmHorarioSilencioso(preferencias.configuracoes_globais.horario_silencioso_global)) {
        return false;
      }

      // Verificar horário silencioso do tipo
      if (configTipo && this.estaEmHorarioSilencioso(configTipo.horario_silencioso)) {
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(
        `Erro ao verificar se deve receber notificacao: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Mapeia entidade para interface
   */
  private mapearParaInterface(entidade: PreferenciasNotificacao): PreferenciasUsuario {
    return {
      ativo: entidade.ativo,
      configuracoes_globais: entidade.configuracoes_globais,
      tipos: entidade.tipos,
      configuracoes_canais: entidade.configuracoes_canais,
      metadata: entidade.metadata,
    };
  }

  /**
   * Valida formato de horário HH:MM
   */
  private validarFormatoHorario(horario: string): boolean {
    const regex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return regex.test(horario);
  }

  /**
   * Verifica se está em horário silencioso
   */
  private estaEmHorarioSilencioso(config: { ativo: boolean; inicio: string; fim: string }): boolean {
    if (!config || !config.ativo) {
      return false;
    }

    const agora = new Date();
    const horaAtual = agora.getHours() * 60 + agora.getMinutes();
    
    const [inicioHora, inicioMin] = config.inicio.split(':').map(Number);
    const [fimHora, fimMin] = config.fim.split(':').map(Number);
    
    const inicioMinutos = inicioHora * 60 + inicioMin;
    const fimMinutos = fimHora * 60 + fimMin;

    if (inicioMinutos <= fimMinutos) {
      // Mesmo dia
      return horaAtual >= inicioMinutos && horaAtual <= fimMinutos;
    } else {
      // Atravessa meia-noite
      return horaAtual >= inicioMinutos || horaAtual <= fimMinutos;
    }
  }
}
