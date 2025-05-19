import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * DTO para atualização de configuração de prazos no sistema.
 * Os prazos são utilizados para cálculo de SLA e notificações.
 */
export class PrazoUpdateDto {
  @ApiProperty({
    description: 'Quantidade de dias para o prazo',
    example: 5,
    minimum: 0
  })
  @IsNotEmpty({ message: 'A quantidade de dias é obrigatória' })
  @IsInt({ message: 'A quantidade de dias deve ser um número inteiro' })
  @Min(0, { message: 'A quantidade de dias deve ser no mínimo 0' })
  @Max(365, { message: 'A quantidade de dias deve ser no máximo 365' })
  dias: number;

  @ApiProperty({
    description: 'Quantidade de horas adicionais para o prazo',
    example: 12,
    minimum: 0,
    maximum: 23,
    required: false
  })
  @IsOptional()
  @IsInt({ message: 'A quantidade de horas deve ser um número inteiro' })
  @Min(0, { message: 'A quantidade de horas deve ser no mínimo 0' })
  @Max(23, { message: 'A quantidade de horas deve ser no máximo 23' })
  horas?: number;

  @ApiProperty({
    description: 'Descrição do prazo',
    example: 'Prazo para análise inicial da solicitação',
    maxLength: 200,
    required: false
  })
  @IsOptional()
  @IsString({ message: 'A descrição deve ser uma string' })
  @MaxLength(200, { message: 'A descrição deve ter no máximo 200 caracteres' })
  descricao?: string;
}
