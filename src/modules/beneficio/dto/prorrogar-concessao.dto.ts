import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsString, MaxLength } from 'class-validator';

export class ProrrogarConcessaoDto {
  @ApiProperty({
    description:
      'ID do documento judicial (obrigatório para concessões com determinação judicial)',
    example: 'a1b2c3d4-5e6f-7g8h-9i0j-k1l2m3n4o5p6',
    required: false,
  })
  @IsOptional()
  @IsUUID('4', { message: 'ID do documento judicial deve ser um UUID válido' })
  documentoJudicialId?: string;

  @ApiProperty({
    description: 'Motivo da prorrogação',
    example:
      'Necessidade de continuidade do benefício devido à situação de vulnerabilidade',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Motivo deve ser uma string' })
  @MaxLength(500, { message: 'Motivo deve ter no máximo 500 caracteres' })
  motivo?: string;
}
