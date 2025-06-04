import { NotFoundException } from '@nestjs/common';

/**
 * Exceção lançada quando uma entidade não é encontrada no banco de dados.
 *
 * Esta exceção padroniza as respostas para casos onde recursos específicos
 * não são localizados, fornecendo informações detalhadas sobre a entidade.
 */
export class EntityNotFoundException extends NotFoundException {
  constructor(
    entityName: string,
    identifier: string | number,
    field: string = 'id',
  ) {
    const message = `${entityName} não encontrada`;
    const details = {
      entity: entityName,
      [field]: identifier,
      message: `${entityName} com ${field} '${identifier}' não foi encontrada`,
    };

    super({
      message,
      code: 'ENTITY_NOT_FOUND',
      details,
    });
  }
}
