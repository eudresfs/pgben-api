/**
 * ARQUIVO DE COMPATIBILIDADE
 *
 * Este arquivo serve como um redirecionamento para as novas entidades e enums
 * que foram renomeados para evitar conflitos com outras entidades do sistema.
 *
 * Por favor, use diretamente as entidades e enums de notification.entity.ts
 * em novos desenvolvimentos.
 */

import {
  StatusNotificacaoProcessamento,
  TipoNotificacao,
} from './notification.entity';

// Redirecionamento para compatibilidade com código existente
export { TipoNotificacao } from './notification.entity';

// Mapeamento do enum antigo para o novo
export enum StatusNotificacao {
  NAO_LIDA = StatusNotificacaoProcessamento.NAO_LIDA,
  LIDA = StatusNotificacaoProcessamento.LIDA,
  ARQUIVADA = StatusNotificacaoProcessamento.ARQUIVADA,
}

// Redirecionamento da classe para compatibilidade
// Não podemos usar herança direta pois causa conflitos no TypeORM
export { NotificacaoSistema as Notificacao } from './notification.entity';
