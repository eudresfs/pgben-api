import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsDate,
  IsISO8601,
  IsObject,
  ValidateNested,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsNotFutureDate } from '../validators/is-not-future-date.validator';

/**
 * Interface para dados adicionais da visita de monitoramento
 */
export class DadosAdicionaisVisita {
  @ApiPropertyOptional({
    description: 'Situação do imóvel visitado',
    enum: ['regular', 'irregular', 'precario'],
    example: 'regular',
  })
  @IsOptional()
  @IsEnum(['regular', 'irregular', 'precario'], {
    message: 'Situação do imóvel deve ser "regular", "irregular" ou "precario"',
  })
  situacao_imovel?: 'regular' | 'irregular' | 'precario';

  @ApiPropertyOptional({
    description: 'Indica se o imóvel necessita de reparos',
    example: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Necessidade de reparos deve ser um valor booleano' })
  necessidade_reparos?: boolean;

  @ApiPropertyOptional({
    description: 'Indica se o beneficiário estava presente durante a visita',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Presença do beneficiário deve ser um valor booleano' })
  presenca_beneficiario?: boolean;

  @ApiPropertyOptional({
    description: 'Observações adicionais sobre a situação do imóvel',
    example:
      'Imóvel em boas condições gerais, mas com pequenas infiltrações no banheiro.',
  })
  @IsOptional()
  @IsString({ message: 'Observações sobre o imóvel devem ser um texto' })
  observacoes_imovel?: string;

  // Campos adicionais podem ser adicionados conforme necessidade
}

/**
 * DTO para registrar visita de monitoramento em solicitações de Aluguel Social
 */
export class RegistrarVisitaMonitoramentoDto {
  @ApiProperty({ description: 'ID da solicitação de Aluguel Social' })
  @IsNotEmpty({ message: 'ID da solicitação é obrigatório' })
  @IsUUID('4', { message: 'ID da solicitação inválido' })
  solicitacao_id: string;

  @ApiProperty({
    description: 'Data da visita no formato ISO 8601 (YYYY-MM-DD)',
    example: '2025-05-30',
  })
  @IsNotEmpty({ message: 'Data da visita é obrigatória' })
  @IsISO8601()
  @IsNotFutureDate({ message: 'A data da visita não pode ser futura' })
  @Type(() => Date)
  data_visita: Date;

  @ApiProperty({
    description: 'Observações sobre a visita de monitoramento',
    example: 'Beneficiário em situação regular. Imóvel em boas condições.',
  })
  @IsNotEmpty({ message: 'Observações são obrigatórias' })
  @IsString({ message: 'Observações devem ser um texto' })
  observacoes: string;

  @ApiPropertyOptional({
    description: 'Informações adicionais sobre a visita (opcional)',
    example: {
      situacao_imovel: 'regular',
      necessidade_reparos: false,
      presenca_beneficiario: true,
    },
  })
  @IsOptional()
  @IsObject({ message: 'Dados adicionais devem ser um objeto válido' })
  dados_adicionais?: DadosAdicionaisVisita;
}
