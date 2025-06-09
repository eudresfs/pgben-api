import { Injectable } from '@nestjs/common';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';

/**
 * Interface que define uma transição de status
 */
interface StatusTransition {
  from: StatusPagamentoEnum;
  to: StatusPagamentoEnum;
  allowed: boolean;
  reasonIfBlocked?: string;
}

/**
 * Serviço para validação de transições de status de pagamento
 *
 * Implementa a lógica de máquina de estados para controlar
 * as transições válidas entre os diferentes status de pagamento.
 *
 * @author Equipe PGBen
 */
@Injectable()
export class StatusTransitionValidator {
  // Matriz de transições permitidas
  // Fluxo: PENDENTE -> AGENDADO -> LIBERADO -> PAGO -> CONFIRMADO
  private readonly transitions: StatusTransition[] = [
    // De PENDENTE para...
    {
      from: StatusPagamentoEnum.PENDENTE,
      to: StatusPagamentoEnum.AGENDADO,
      allowed: true,
    },
    {
      from: StatusPagamentoEnum.PENDENTE,
      to: StatusPagamentoEnum.CANCELADO,
      allowed: true,
    },
    {
      from: StatusPagamentoEnum.PENDENTE,
      to: StatusPagamentoEnum.LIBERADO,
      allowed: false,
      reasonIfBlocked: 'Pagamento deve ser agendado antes de ser liberado',
    },

    // De AGENDADO para...
    {
      from: StatusPagamentoEnum.AGENDADO,
      to: StatusPagamentoEnum.LIBERADO,
      allowed: true,
    },
    {
      from: StatusPagamentoEnum.AGENDADO,
      to: StatusPagamentoEnum.CANCELADO,
      allowed: true,
    },
    {
      from: StatusPagamentoEnum.AGENDADO,
      to: StatusPagamentoEnum.PENDENTE,
      allowed: true,
    },
    {
      from: StatusPagamentoEnum.AGENDADO,
      to: StatusPagamentoEnum.CONFIRMADO,
      allowed: false,
      reasonIfBlocked: 'Não é possível confirmar um pagamento que ainda não foi liberado',
    },

    // De LIBERADO para...
    {
      from: StatusPagamentoEnum.LIBERADO,
      to: StatusPagamentoEnum.PAGO,
      allowed: true,
    },
    {
      from: StatusPagamentoEnum.LIBERADO,
      to: StatusPagamentoEnum.CANCELADO,
      allowed: true,
    },
    {
      from: StatusPagamentoEnum.LIBERADO,
      to: StatusPagamentoEnum.CONFIRMADO,
      allowed: true, // Mantido para compatibilidade
    },
    {
      from: StatusPagamentoEnum.LIBERADO,
      to: StatusPagamentoEnum.AGENDADO,
      allowed: false,
      reasonIfBlocked: 'Não é possível retornar um pagamento liberado para o status agendado',
    },

    // De PAGO para...
    {
      from: StatusPagamentoEnum.PAGO,
      to: StatusPagamentoEnum.CONFIRMADO,
      allowed: true,
    },
    {
      from: StatusPagamentoEnum.PAGO,
      to: StatusPagamentoEnum.CANCELADO,
      allowed: false,
      reasonIfBlocked: 'Não é possível cancelar um pagamento que já foi pago',
    },
    {
      from: StatusPagamentoEnum.PAGO,
      to: StatusPagamentoEnum.LIBERADO,
      allowed: false,
      reasonIfBlocked: 'Não é possível retornar um pagamento pago para o status liberado',
    },

    // De CONFIRMADO para...
    {
      from: StatusPagamentoEnum.CONFIRMADO,
      to: StatusPagamentoEnum.CANCELADO,
      allowed: false,
      reasonIfBlocked: 'Não é possível cancelar um pagamento concluído',
    },
    {
      from: StatusPagamentoEnum.CONFIRMADO,
      to: StatusPagamentoEnum.PAGO,
      allowed: false,
      reasonIfBlocked: 'Não é possível retornar um pagamento concluído para o status pago',
    },

    // De CONFIRMADO para... (mantido para compatibilidade)
    {
      from: StatusPagamentoEnum.CONFIRMADO,
      to: StatusPagamentoEnum.CONFIRMADO,
      allowed: true,
    },
    {
      from: StatusPagamentoEnum.CONFIRMADO,
      to: StatusPagamentoEnum.AGENDADO,
      allowed: false,
      reasonIfBlocked: 'Não é possível retornar um pagamento confirmado para o status agendado',
    },
    {
      from: StatusPagamentoEnum.CONFIRMADO,
      to: StatusPagamentoEnum.LIBERADO,
      allowed: false,
      reasonIfBlocked: 'Não é possível retornar um pagamento confirmado para o status liberado',
    },
    {
      from: StatusPagamentoEnum.CONFIRMADO,
      to: StatusPagamentoEnum.CANCELADO,
      allowed: false,
      reasonIfBlocked: 'Não é possível cancelar um pagamento que já foi confirmado',
    },

    // De CANCELADO para...
    {
      from: StatusPagamentoEnum.CANCELADO,
      to: StatusPagamentoEnum.PENDENTE,
      allowed: false,
      reasonIfBlocked: 'Não é possível reativar um pagamento cancelado',
    },
    {
      from: StatusPagamentoEnum.CANCELADO,
      to: StatusPagamentoEnum.AGENDADO,
      allowed: false,
      reasonIfBlocked: 'Não é possível reativar um pagamento cancelado',
    },
    {
      from: StatusPagamentoEnum.CANCELADO,
      to: StatusPagamentoEnum.LIBERADO,
      allowed: false,
      reasonIfBlocked: 'Não é possível liberar um pagamento cancelado',
    },
    {
      from: StatusPagamentoEnum.CANCELADO,
      to: StatusPagamentoEnum.PAGO,
      allowed: false,
      reasonIfBlocked: 'Não é possível pagar um pagamento cancelado',
    },
    {
      from: StatusPagamentoEnum.CANCELADO,
      to: StatusPagamentoEnum.CONFIRMADO,
      allowed: false,
      reasonIfBlocked: 'Não é possível concluir um pagamento cancelado',
    },
    {
      from: StatusPagamentoEnum.CANCELADO,
      to: StatusPagamentoEnum.CONFIRMADO,
      allowed: false,
      reasonIfBlocked: 'Não é possível confirmar um pagamento cancelado',
    },
  ];

  /**
   * Verifica se uma transição de status é permitida
   *
   * @param fromStatus Status atual do pagamento
   * @param toStatus Status desejado
   * @returns Um objeto contendo o resultado da validação e a razão se bloqueado
   */
  canTransition(
    fromStatus: StatusPagamentoEnum,
    toStatus: StatusPagamentoEnum,
  ): {
    allowed: boolean;
    reason?: string;
  } {
    // Se não há mudança de status, é permitido
    if (fromStatus === toStatus) {
      return { allowed: true };
    }

    // Busca a transição correspondente
    const transition = this.transitions.find(
      (t) => t.from === fromStatus && t.to === toStatus,
    );

    // Se a transição não está definida, não é permitida
    if (!transition) {
      return {
        allowed: false,
        reason: `Transição de ${fromStatus} para ${toStatus} não está definida`,
      };
    }

    // Retorna o resultado da validação
    return {
      allowed: transition.allowed,
      reason: transition.allowed ? undefined : transition.reasonIfBlocked,
    };
  }

  /**
   * Obtém todas as transições possíveis a partir de um status
   *
   * @param fromStatus Status atual
   * @returns Lista de status para os quais é possível transicionar
   */
  getPossibleTransitions(
    fromStatus: StatusPagamentoEnum,
  ): StatusPagamentoEnum[] {
    return this.transitions
      .filter((t) => t.from === fromStatus && t.allowed)
      .map((t) => t.to);
  }

  /**
   * Verifica se um pagamento pode ser cancelado
   *
   * @param currentStatus Status atual do pagamento
   * @returns true se o pagamento pode ser cancelado, false caso contrário
   */
  canBeCanceled(currentStatus: StatusPagamentoEnum): boolean {
    return this.canTransition(currentStatus, StatusPagamentoEnum.CANCELADO)
      .allowed;
  }

  /**
   * Verifica se um pagamento pode ser confirmado
   *
   * @param currentStatus Status atual do pagamento
   * @returns true se o pagamento pode ser confirmado, false caso contrário
   */
  canBeConfirmed(currentStatus: StatusPagamentoEnum): boolean {
    return this.canTransition(currentStatus, StatusPagamentoEnum.CONFIRMADO)
      .allowed;
  }

  /**
   * Verifica se um pagamento pode ser pago
   *
   * @param currentStatus Status atual do pagamento
   * @returns true se o pagamento pode ser pago, false caso contrário
   */
  canBePaid(currentStatus: StatusPagamentoEnum): boolean {
    return this.canTransition(currentStatus, StatusPagamentoEnum.PAGO)
      .allowed;
  }

  /**
   * Verifica se um pagamento pode ser concluído
   *
   * @param currentStatus Status atual do pagamento
   * @returns true se o pagamento pode ser concluído, false caso contrário
   */
  canBeCompleted(currentStatus: StatusPagamentoEnum): boolean {
    return this.canTransition(currentStatus, StatusPagamentoEnum.CONFIRMADO)
      .allowed;
  }

  /**
   * Verifica se um pagamento pode ser agendado
   *
   * @param currentStatus Status atual do pagamento
   * @returns true se o pagamento pode ser agendado, false caso contrário
   */
  canBeScheduled(currentStatus: StatusPagamentoEnum): boolean {
    return this.canTransition(currentStatus, StatusPagamentoEnum.AGENDADO)
      .allowed;
  }
}
