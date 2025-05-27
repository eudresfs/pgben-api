import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID, IsArray, ArrayMinSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para verificação de papéis conflitantes
 */
class PapelVerificacaoDto {
  @ApiProperty({
    description: 'ID do papel a ser verificado',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty({ message: 'ID do papel é obrigatório' })
  @IsUUID('4', { message: 'ID do papel deve ser um UUID válido' })
  papel_id: string;
}

/**
 * DTO para verificação de papéis conflitantes
 * 
 * Este DTO é utilizado para verificar se existe algum conflito entre os papéis
 * que um cidadão possui ou está tentando obter.
 */
export class VerificacaoPapelConflitoDto {
  @ApiProperty({
    description: 'ID do cidadão',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty({ message: 'ID do cidadão é obrigatório' })
  @IsUUID('4', { message: 'ID do cidadão deve ser um UUID válido' })
  cidadao_id: string;

  @ApiProperty({
    description: 'Lista de papéis a serem verificados',
    type: [PapelVerificacaoDto],
  })
  @IsArray({ message: 'Papéis deve ser um array' })
  @ArrayMinSize(1, { message: 'É necessário informar pelo menos um papel' })
  @ValidateNested({ each: true })
  @Type(() => PapelVerificacaoDto)
  papeis: PapelVerificacaoDto[];
}
