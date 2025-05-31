import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsISO8601,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsNotFutureDate } from '../validators/is-not-future-date.validator';
import { DadosAdicionaisVisita } from './registrar-visita-monitoramento.dto';

/**
 * DTO para atualização parcial de visita de monitoramento
 */
export class AtualizarVisitaMonitoramentoDto {
  @ApiPropertyOptional({
    description: 'Data da visita no formato ISO 8601 (YYYY-MM-DD)',
    example: '2025-05-28',
  })
  @IsOptional()
  @IsISO8601()
  @IsNotFutureDate({ message: 'A data da visita não pode ser futura' })
  @Type(() => Date)
  data_visita?: Date;

  @ApiPropertyOptional({
    description: 'Observações sobre a visita de monitoramento',
    example: 'Beneficiário em situação regular. Imóvel em boas condições.',
  })
  @IsOptional()
  @IsString({ message: 'Observações devem ser um texto' })
  observacoes?: string;

  @ApiPropertyOptional({
    description: 'Informações adicionais sobre a visita',
    example: {
      situacao_imovel: 'regular',
      necessidade_reparos: false,
      presenca_beneficiario: true,
    },
  })
  @IsOptional()
  @IsObject({ message: 'Dados adicionais devem ser um objeto válido' })
  @ValidateNested()
  @Type(() => DadosAdicionaisVisita)
  dados_adicionais?: DadosAdicionaisVisita;
}
