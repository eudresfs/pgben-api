import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { MetodoPagamentoEnum } from '../../../enums/metodo-pagamento.enum';

/**
 * DTO para criação de um pagamento pendente
 *
 * Este DTO é utilizado para validar os dados de entrada ao criar
 * um novo pagamento com status pendente no sistema.
 *
 * @author Equipe PGBen
 */
export class PagamentoPendenteCreateDto {
  /**
   * ID da solicitação de benefício
   */
  @ApiProperty({
    description: 'ID da solicitação de benefício',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID('4')
  solicitacaoId: string;

  /**
   * Valor do pagamento
   */
  @ApiProperty({
    description: 'Valor do pagamento (em reais)',
    example: 250.0,
    minimum: 0.01,
    maximum: 50000.0,
  })
  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(50000.0)
  valor: number;

  /**
   * Método de pagamento
   */
  @ApiProperty({
    description: 'Método de pagamento',
    enum: MetodoPagamentoEnum,
    example: MetodoPagamentoEnum.PIX,
  })
  @IsNotEmpty()
  @IsEnum(MetodoPagamentoEnum)
  metodoPagamento: MetodoPagamentoEnum;

  /**
   * Referência à informação bancária utilizada para o pagamento
   * Opcional para pagamentos presenciais
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
   * Observações sobre o pagamento
   */
  @ApiProperty({
    description: 'Observações sobre o pagamento',
    example: 'Pagamento de auxílio natalidade',
    required: false,
  })
  @IsOptional()
  @IsString()
  observacoes?: string;

  /**
   * Data prevista para liberação do pagamento
   */
  @ApiProperty({
    description: 'Data prevista para liberação do pagamento',
    example: '2024-01-15T10:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dataPrevistaLiberacao?: Date;
}