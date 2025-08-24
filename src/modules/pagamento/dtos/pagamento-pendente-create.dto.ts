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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PagamentoBaseDto } from './base/pagamento-base.dto';
import { MetodoPagamentoEnum } from '@/enums';

/**
 * DTO para criação de um pagamento pendente
 *
 * Este DTO é utilizado para validar os dados de entrada ao criar
 * um novo pagamento com status pendente no sistema. Estende PagamentoBaseDto
 * para reutilizar validações comuns.
 *
 * @author Equipe PGBen
 */
export class PagamentoPendenteCreateDto extends PagamentoBaseDto {
  /**
   * ID da solicitação de benefício
   */
  @ApiProperty({
    description: 'ID da solicitação de benefício',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID('4')
  solicitacao_id: string;

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
  data_prevista_liberacao?: Date;
}
