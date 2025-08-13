import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateAcaoCriticaDto } from './create-acao-critica.dto';

/**
 * DTO para atualização de uma ação crítica existente
 * Herda de CreateAcaoCriticaDto mas torna todos os campos opcionais
 * Remove o campo 'codigo' pois não deve ser alterado após criação
 */
export class UpdateAcaoCriticaDto extends PartialType(
  OmitType(CreateAcaoCriticaDto, ['codigo'] as const),
) {}