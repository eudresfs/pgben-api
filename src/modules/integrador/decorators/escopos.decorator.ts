import { SetMetadata } from '@nestjs/common';

/**
 * Chave de metadados usada para armazenar os escopos requeridos.
 */
export const ESCOPOS_KEY = 'escopos_requeridos';

/**
 * Decorator para definir quais escopos são necessários para acessar um endpoint.
 * @param escopos Lista de escopos requeridos no formato 'acao:recurso'
 * @returns Decorator para controllers ou métodos
 *
 * @example
 * // Requer permissão de leitura para o recurso 'usuarios'
 * @Escopos('read:usuarios')
 *
 * @example
 * // Requer múltiplas permissões
 * @Escopos('read:beneficios', 'write:solicitacoes')
 */
export const Escopos = (...escopos: string[]) =>
  SetMetadata(ESCOPOS_KEY, escopos);
