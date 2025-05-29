import { PartialType, OmitType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateInfoBancariaDto } from './create-info-bancaria.dto';
import { IsOptional, IsBoolean } from 'class-validator';

/**
 * DTO para atualização de informações bancárias
 * Remove o campo cidadao_id pois não deve ser alterado após criação
 */
export class UpdateInfoBancariaDto extends PartialType(
  OmitType(CreateInfoBancariaDto, ['cidadao_id'] as const)
) {
  @ApiPropertyOptional({
    description: 'Status ativo da conta bancária',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Ativo deve ser um valor booleano' })
  ativo?: boolean;
}