import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { MetodoPagamentoEnum } from '../enums/metodo-pagamento.enum';

/**
 * DTO para criação de um novo pagamento
 * 
 * Este DTO é utilizado para validar os dados de entrada ao criar
 * um novo registro de pagamento no sistema.
 * 
 * @author Equipe PGBen
 */
export class PagamentoCreateDto {
  /**
   * Referência à informação bancária utilizada para o pagamento
   * Se não informado, assume-se pagamento presencial
   */
  @ApiProperty({
    description: 'ID da informação bancária utilizada para o pagamento',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false
  })
  @IsOptional()
  @IsUUID('4')
  infoBancariaId?: string;

  /**
   * Valor liberado do benefício
   */
  @ApiProperty({
    description: 'Valor do pagamento (em reais)',
    example: 250.00,
    minimum: 0.01,
    maximum: 50000.00
  })
  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(50000.00) // Limite superior para validação
  valor: number;

  /**
   * Data efetiva da liberação do pagamento
   */
  @ApiProperty({
    description: 'Data de liberação do pagamento',
    example: '2025-05-18T10:00:00.000Z',
    type: Date
  })
  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  dataLiberacao: Date;

  /**
   * Método utilizado para realizar o pagamento
   */
  @ApiProperty({
    description: 'Método de pagamento',
    enum: MetodoPagamentoEnum,
    example: MetodoPagamentoEnum.PIX
  })
  @IsNotEmpty()
  @IsEnum(MetodoPagamentoEnum)
  metodoPagamento: MetodoPagamentoEnum;

  /**
   * Observações adicionais sobre o pagamento
   */
  @ApiProperty({
    description: 'Observações sobre o pagamento',
    example: 'Pagamento referente ao benefício eventual de auxílio moradia.',
    required: false
  })
  @IsOptional()
  @IsString()
  observacoes?: string;
}
