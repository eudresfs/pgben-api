import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateAprovadorDto } from './create-aprovador.dto';

/**
 * DTO para atualização de um aprovador existente
 * Herda de CreateAprovadorDto mas torna todos os campos opcionais
 * Remove o campo 'configuracao_aprovacao_id' pois não deve ser alterado após criação
 */
export class UpdateAprovadorDto extends PartialType(
  OmitType(CreateAprovadorDto, ['configuracao_aprovacao_id'] as const),
) {}
