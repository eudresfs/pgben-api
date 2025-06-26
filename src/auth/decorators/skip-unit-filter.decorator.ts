import { SetMetadata } from '@nestjs/common';

/**
 * Chave de metadata usada pelo ScopedQueryInterceptor para identificar endpoints
 * que não devem receber a injeção automática do filtro de unidade.
 */
export const SKIP_UNIT_FILTER_KEY = 'skipUnitFilter';

/**
 * Decorator que marca o método ou classe para pular a injeção automática de
 * unidade. Útil para relatórios globais ou endpoints que devem ignorar o
 * escopo de unidade mesmo para usuários sem role de gestão.
 */
export const SkipUnitFilter = () => SetMetadata(SKIP_UNIT_FILTER_KEY, true);
