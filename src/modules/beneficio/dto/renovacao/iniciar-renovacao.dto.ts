import { IsUUID, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para iniciar o processo de renovação de um benefício
 * Contém os dados necessários para criar uma nova solicitação baseada em uma concessão cessada
 */
export class IniciarRenovacaoDto {
  @ApiProperty({
    description: 'ID da concessão que será renovada',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid'
  })
  @IsUUID('4', { message: 'ID da concessão inválido' })
  @IsNotEmpty({ message: 'ID da concessão é obrigatório' })
  concessaoId: string;

  @ApiPropertyOptional({
    description: 'Observação adicional sobre a renovação',
    example: 'Renovação solicitada devido à continuidade da necessidade do benefício',
    maxLength: 500
  })
  @IsOptional()
  @IsString({ message: 'Observação deve ser uma string' })
  observacao?: string;
}