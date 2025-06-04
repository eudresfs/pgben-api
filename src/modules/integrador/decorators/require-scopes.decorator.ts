import { SetMetadata } from '@nestjs/common';

/**
 * Constante que define a chave de metadados para os escopos requeridos.
 * Usada internamente pelo sistema de autenticação de integradores.
 */
export const REQUIRED_SCOPES_KEY = 'requiredScopes';

/**
 * Decorator que especifica quais escopos são necessários para acessar um endpoint.
 * Pode ser aplicado a métodos de controller ou classes inteiras.
 *
 * Os escopos devem seguir o formato padrão `acao:recurso` como:
 * - read:dados_basicos
 * - write:processos
 * - delete:documentos
 *
 * @param scopes - Lista de escopos necessários para o acesso.
 *                Se múltiplos forem especificados, o token deve conter TODOS eles.
 *
 * @example
 * // Aplicado a um método
 * @Get('recursos')
 * @RequireScopes('read:recursos')
 * findAll() {
 *   // ...
 * }
 *
 * @example
 * // Aplicado a um controller inteiro
 * @Controller('dados')
 * @RequireScopes('read:dados')
 * export class DadosController {
 *   // ...
 * }
 */
export const RequireScopes = (...scopes: string[]) =>
  SetMetadata(REQUIRED_SCOPES_KEY, scopes);
