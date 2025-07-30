import { ForbiddenException, BadRequestException } from '@nestjs/common';

/**
 * Exceção lançada quando há violação de escopo
 * 
 * @description
 * Utilizada quando um usuário tenta acessar dados fora do seu escopo permitido
 */
export class ScopeViolationException extends ForbiddenException {
  constructor(message = 'Acesso negado: fora do escopo permitido') {
    super(message);
  }
}

/**
 * Exceção lançada quando o contexto de escopo é inválido
 * 
 * @description
 * Utilizada quando o contexto de escopo não está configurado corretamente
 * ou contém dados inconsistentes
 */
export class InvalidScopeContextException extends BadRequestException {
  constructor(message = 'Contexto de escopo inválido') {
    super(message);
  }
}

/**
 * Exceção lançada quando um tipo de escopo não é reconhecido
 * 
 * @description
 * Utilizada quando um escopo não está definido no enum ScopeType
 */
export class InvalidScopeTypeException extends BadRequestException {
  constructor(scope: string) {
    super(`Tipo de escopo inválido: ${scope}`);
  }
}