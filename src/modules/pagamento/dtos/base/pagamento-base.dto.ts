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
import { MetodoPagamentoEnum } from '../../../../enums/metodo-pagamento.enum';
import { StatusPagamentoEnum } from '../../../../enums/status-pagamento.enum';

/**
 * DTO base para operações de pagamento
 *
 * Centraliza campos comuns utilizados em diferentes DTOs de pagamento,
 * seguindo o princípio DRY (Don't Repeat Yourself).
 *
 * @author Equipe PGBen
 */
export abstract class PagamentoBaseDto {
  /**
   * Valor do pagamento em reais
   */
  @ApiProperty({
    description: 'Valor do pagamento (em reais)',
    example: 250.0,
    minimum: 0.01,
    maximum: 50000.0,
  })
  @IsNotEmpty({ message: 'Valor é obrigatório' })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Valor deve ser um número com até 2 casas decimais' },
  )
  @Min(0.01, { message: 'Valor deve ser maior que zero' })
  @Max(50000.0, { message: 'Valor não pode exceder R$ 50.000,00' })
  valor: number;

  /**
   * Método de pagamento utilizado
   */
  @ApiProperty({
    description: 'Método de pagamento',
    enum: MetodoPagamentoEnum,
    example: MetodoPagamentoEnum.PIX,
  })
  @IsNotEmpty({ message: 'Método de pagamento é obrigatório' })
  @IsEnum(MetodoPagamentoEnum, {
    message: 'Método de pagamento deve ser um valor válido',
  })
  metodoPagamento: MetodoPagamentoEnum;

  /**
   * Observações adicionais sobre o pagamento
   */
  @ApiPropertyOptional({
    description: 'Observações sobre o pagamento',
    example: 'Pagamento referente ao mês de janeiro/2024',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Observações devem ser uma string' })
  observacoes?: string;
}

/**
 * DTO base para respostas de pagamento
 *
 * Define estrutura comum para DTOs de resposta relacionados a pagamentos.
 */
export abstract class PagamentoResponseBaseDto {
  /**
   * Identificador único do pagamento
   */
  @ApiProperty({
    description: 'ID único do pagamento',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  /**
   * Valor do pagamento
   */
  @ApiProperty({
    description: 'Valor do pagamento (em reais)',
    example: 250.0,
  })
  valor: number;

  /**
   * Status atual do pagamento
   */
  @ApiProperty({
    description: 'Status atual do pagamento',
    enum: StatusPagamentoEnum,
    example: StatusPagamentoEnum.PENDENTE,
  })
  status: StatusPagamentoEnum;

  /**
   * Método de pagamento utilizado
   */
  @ApiProperty({
    description: 'Método de pagamento',
    enum: MetodoPagamentoEnum,
    example: MetodoPagamentoEnum.PIX,
  })
  metodoPagamento: MetodoPagamentoEnum;

  /**
   * Data de criação do registro
   */
  @ApiProperty({
    description: 'Data de criação do pagamento',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  /**
   * Data da última atualização
   */
  @ApiProperty({
    description: 'Data da última atualização',
    example: '2024-01-15T14:20:00.000Z',
  })
  updatedAt: Date;

  /**
   * Número da parcela atual
   */
  @ApiProperty({
    description: 'Número da parcela atual (para pagamentos parcelados)',
    example: 1,
    minimum: 1,
  })
  numeroParcela: number;

  /**
   * Total de parcelas previstas para o benefício
   */
  @ApiProperty({
    description: 'Total de parcelas previstas para o benefício',
    example: 1,
    minimum: 1,
  })
  totalParcelas: number;

  /**
   * Data efetiva do pagamento
   */
  @ApiPropertyOptional({
    description: 'Data em que o pagamento foi efetivamente realizado',
    example: '2025-05-18T10:00:00.000Z',
  })
  dataPagamento?: Date;

  /**
   * Observações sobre o pagamento
   */
  @ApiPropertyOptional({
    description: 'Observações sobre o pagamento',
    example: 'Pagamento processado automaticamente',
  })
  observacoes?: string;
}

/**
 * Interface para informações de responsável
 */
export interface ResponsavelInfo {
  id: string;
  nome: string;
  role: string;
}

/**
 * Interface para informações resumidas de solicitação
 */
export interface SolicitacaoResumo {
  id: string;
  beneficiario: string;
  tipoBeneficio: string;
}
