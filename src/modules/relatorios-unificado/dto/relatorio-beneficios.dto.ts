import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para geração de relatório de benefícios concedidos
 *
 * Define os parâmetros necessários para gerar o relatório de benefícios concedidos
 */
export class RelatorioBeneficiosDto {
  @ApiProperty({
    description: 'Data inicial (formato: YYYY-MM-DD)',
    example: '2023-01-01',
    required: true,
  })
  @IsDateString()
  data_inicio: string;

  @ApiProperty({
    description: 'Data final (formato: YYYY-MM-DD)',
    example: '2023-12-31',
    required: true,
  })
  @IsDateString()
  data_fim: string;

  @ApiProperty({
    description: 'ID da unidade (opcional)',
    required: false,
    type: String,
  })
  @IsOptional()
  @IsUUID(4)
  unidade_id?: string;

  @ApiProperty({
    description: 'ID do tipo de benefício (opcional)',
    required: false,
    type: String,
  })
  @IsOptional()
  @IsUUID(4)
  tipo_beneficio_id?: string;

  @ApiProperty({
    description: 'Formato de saída do relatório',
    enum: ['pdf', 'excel', 'csv'],
    default: 'pdf',
  })
  @IsEnum(['pdf', 'excel', 'csv'])
  formato: 'pdf' | 'excel' | 'csv' = 'pdf';
}
