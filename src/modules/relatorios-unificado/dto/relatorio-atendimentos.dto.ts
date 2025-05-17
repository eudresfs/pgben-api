import { IsDateString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para geração de relatório de atendimentos por unidade
 *
 * Define os parâmetros necessários para gerar o relatório de atendimentos por unidade
 */
export class RelatorioAtendimentosDto {
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
    description: 'Formato de saída do relatório',
    enum: ['pdf', 'excel', 'csv'],
    default: 'pdf',
  })
  @IsEnum(['pdf', 'excel', 'csv'])
  formato: 'pdf' | 'excel' | 'csv' = 'pdf';
}
