import { ForbiddenException, BadRequestException, UnauthorizedException } from '@nestjs/common';

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

/**
 * Exceção para contexto obrigatório ausente
 * 
 * @description
 * Lançada quando uma operação que requer contexto de escopo é executada
 * sem que o contexto esteja definido, prevenindo vazamento de dados
 */
export class ScopeContextRequiredException extends UnauthorizedException {
  constructor(operation?: string) {
    const message = operation 
      ? `Contexto de escopo é obrigatório para a operação: ${operation}`
      : 'Contexto de escopo é obrigatório para esta operação';
    super(message);
  }
}

/**
 * Exceção para violação de integridade de contexto
 * 
 * @description
 * Lançada quando há inconsistência entre userId e unidadeId no contexto,
 * prevenindo escalação de privilégios
 */
export class ScopeIntegrityViolationException extends ForbiddenException {
  constructor(userId: string, unidadeId: string) {
    super(`Violação de integridade: usuário ${userId} não pertence à unidade ${unidadeId}`);
  }
}

/**
 * Exceção para operações em strict mode
 * 
 * @description
 * Lançada quando métodos globais são chamados em strict mode,
 * prevenindo bypass acidental de filtros de escopo
 */
export class StrictModeViolationException extends ForbiddenException {
  constructor(method: string) {
    super(`Operação '${method}' não permitida em strict mode. Use métodos com escopo.`);
  }
}