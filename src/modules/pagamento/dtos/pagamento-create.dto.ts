import { Type } from 'class-transformer';
import {
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PagamentoBaseDto } from './base/pagamento-base.dto';

/**
 * DTO para criação de um novo pagamento
 *
 * Este DTO é utilizado para validar os dados de entrada ao criar
 * um novo registro de pagamento no sistema. Estende PagamentoBaseDto
 * para reutilizar validações comuns.
 *
 * @author Equipe PGBen
 */
export class PagamentoCreateDto extends PagamentoBaseDto {
  /**
   * Referência à solicitação que originou este pagamento
   */
  @ApiProperty({
    description: 'ID da solicitação que originou o pagamento',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID('4')
  solicitacaoId?: string;

  /**
   * Referência à concessão que originou este pagamento
   */
  @ApiProperty({
    description: 'ID da concessão que originou o pagamento',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID('4')
  concessaoId?: string;

  /**
   * Referência à informação bancária utilizada para o pagamento
   * Se não informado, assume-se pagamento presencial
   */
  @ApiProperty({
    description: 'ID da informação bancária utilizada para o pagamento',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID('4')
  infoBancariaId?: string;

  /**
   * Data efetiva da liberação do pagamento
   */
  @ApiProperty({
    description: 'Data de liberação do pagamento',
    example: '2025-05-18T10:00:00.000Z',
    type: Date,
  })
  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  dataLiberacao: Date;

  /**
   * Número da parcela atual (para pagamentos parcelados)
   */
  @ApiProperty({
    description: 'Número da parcela atual',
    example: 1,
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Número da parcela deve ser um valor numérico' })
  @Min(1, { message: 'Número da parcela deve ser maior ou igual a 1' })
  numeroParcela?: number;

  /**
   * Total de parcelas previstas para o benefício
   */
  @ApiProperty({
    description: 'Total de parcelas previstas',
    example: 6,
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Total de parcelas deve ser um valor numérico' })
  @Min(1, { message: 'Total de parcelas deve ser maior ou igual a 1' })
  totalParcelas?: number;
}
