import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { MetodoConfirmacaoEnum } from '../enums/metodo-confirmacao.enum';

/**
 * DTO para registro de confirmação de recebimento de pagamento
 * 
 * Este DTO é utilizado para validar os dados de entrada ao registrar
 * a confirmação de recebimento de um pagamento pelo beneficiário.
 * 
 * @author Equipe PGBen
 */
export class ConfirmacaoRecebimentoDto {
  /**
   * Data em que a confirmação foi registrada
   */
  @ApiProperty({
    description: 'Data da confirmação de recebimento',
    example: '2025-05-18T14:30:00.000Z',
    type: Date
  })
  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  dataConfirmacao: Date;

  /**
   * Método utilizado para confirmar o recebimento
   */
  @ApiProperty({
    description: 'Método de confirmação utilizado',
    enum: MetodoConfirmacaoEnum,
    example: MetodoConfirmacaoEnum.ASSINATURA
  })
  @IsNotEmpty()
  @IsEnum(MetodoConfirmacaoEnum)
  metodoConfirmacao: MetodoConfirmacaoEnum;

  /**
   * Referência ao cidadão que recebeu o benefício, se diferente do beneficiário original
   */
  @ApiProperty({
    description: 'ID do destinatário que recebeu o pagamento (se diferente do beneficiário)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false
  })
  @IsOptional()
  @IsUUID('4')
  destinatarioId?: string;

  /**
   * Observações adicionais sobre a confirmação
   */
  @ApiProperty({
    description: 'Observações sobre a confirmação de recebimento',
    example: 'Beneficiário confirmou recebimento com assinatura no formulário padrão.',
    required: false
  })
  @IsOptional()
  @IsString()
  observacoes?: string;
}
