import { BadRequestException } from '@nestjs/common';

/**
 * Utilitário para validação de UUIDs
 */
export class UuidValidator {
  /**
   * Regex para validar formato UUID v4
   */
  private static readonly UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  /**
   * Regex mais flexível para qualquer UUID válido
   */
  private static readonly UUID_FLEXIBLE_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  /**
   * Valida se uma string é um UUID válido
   * @param uuid - String a ser validada
   * @param strict - Se true, valida apenas UUID v4. Se false, aceita qualquer formato UUID válido
   * @returns true se válido, false caso contrário
   */
  static isValid(uuid: string, strict: boolean = false): boolean {
    if (!uuid || typeof uuid !== 'string') {
      return false;
    }

    const regex = strict ? this.UUID_REGEX : this.UUID_FLEXIBLE_REGEX;
    return regex.test(uuid.trim());
  }

  /**
   * Valida UUID e lança exceção se inválido
   * @param uuid - UUID a ser validado
   * @param fieldName - Nome do campo para mensagem de erro
   * @param strict - Se true, valida apenas UUID v4
   * @throws BadRequestException se UUID for inválido
   */
  static validateOrThrow(uuid: string, fieldName: string = 'id', strict: boolean = false): void {
    if (!this.isValid(uuid, strict)) {
      throw new BadRequestException({
        statusCode: 400,
        message: `Identificador '${uuid}' possui formato inválido para o campo '${fieldName}'`,
        details: 'UUID deve conter apenas caracteres hexadecimais (0-9, a-f) e hífens no formato correto (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
        timestamp: new Date().toISOString(),
        field: fieldName,
        invalidValue: uuid,
      });
    }
  }

  /**
   * Valida múltiplos UUIDs
   * @param uuids - Array de UUIDs para validar
   * @param fieldName - Nome do campo para mensagem de erro
   * @param strict - Se true, valida apenas UUID v4
   * @throws BadRequestException se algum UUID for inválido
   */
  static validateMultipleOrThrow(uuids: string[], fieldName: string = 'ids', strict: boolean = false): void {
    const invalidUuids = uuids.filter(uuid => !this.isValid(uuid, strict));
    
    if (invalidUuids.length > 0) {
      throw new BadRequestException({
        statusCode: 400,
        message: `Identificadores inválidos encontrados no campo '${fieldName}': ${invalidUuids.join(', ')}`,
        details: 'UUIDs devem conter apenas caracteres hexadecimais (0-9, a-f) e hífens no formato correto',
        timestamp: new Date().toISOString(),
        field: fieldName,
        invalidValues: invalidUuids,
      });
    }
  }

  /**
   * Sanitiza e valida UUID removendo espaços em branco
   * @param uuid - UUID a ser sanitizado
   * @param fieldName - Nome do campo para mensagem de erro
   * @param strict - Se true, valida apenas UUID v4
   * @returns UUID sanitizado
   * @throws BadRequestException se UUID for inválido
   */
  static sanitizeAndValidate(uuid: string, fieldName: string = 'id', strict: boolean = false): string {
    if (!uuid || typeof uuid !== 'string') {
      throw new BadRequestException({
        statusCode: 400,
        message: `Campo '${fieldName}' é obrigatório e deve ser uma string válida`,
        details: 'UUID não pode ser nulo, undefined ou vazio',
        timestamp: new Date().toISOString(),
        field: fieldName,
      });
    }

    const sanitizedUuid = uuid.trim();
    this.validateOrThrow(sanitizedUuid, fieldName, strict);
    return sanitizedUuid;
  }
}