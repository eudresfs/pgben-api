import { PartialType } from '@nestjs/swagger';
import { CreateComposicaoFamiliarDto } from './create-composicao-familiar.dto';

/**
 * DTO para atualização de membro da composição familiar
 * 
 * Herda todos os campos do CreateComposicaoFamiliarDto, tornando-os opcionais
 * para permitir atualizações parciais dos dados do membro familiar.
 */
export class UpdateComposicaoFamiliarDto extends PartialType(CreateComposicaoFamiliarDto) {}