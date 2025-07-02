import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateSituacaoMoradiaDto } from './create-situacao-moradia.dto';

/**
 * DTO para atualização de situação de moradia
 * Remove o campo cidadao_id pois não deve ser alterado após criação
 */
export class UpdateSituacaoMoradiaDto extends PartialType(
  OmitType(CreateSituacaoMoradiaDto, ['cidadao_id'] as const),
) {}
