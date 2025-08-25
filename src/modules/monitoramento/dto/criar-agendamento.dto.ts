import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsDateString,
  IsBoolean,
  MaxLength,
  IsPhoneNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  TipoVisita,
  PrioridadeVisita,
} from '../../../enums';

/**
 * DTO para criação de agendamento de visita domiciliar
 * 
 * @description
 * Define os dados necessários para agendar uma nova visita domiciliar,
 * incluindo validações e documentação para a API.
 * 
 * @author Sistema PGBEN
 * @since 2025-01-15
 */
export class CriarAgendamentoDto {
  /**
   * ID do pagamento relacionado à visita
   */
  @ApiProperty({
    description: 'ID do pagamento que será monitorado através da visita',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsNotEmpty({ message: 'ID do pagamento é obrigatório' })
  @IsUUID('4', { message: 'ID do pagamento deve ser um UUID válido' })
  pagamento_id: string;

  /**
   * Data e hora agendada para a visita
   */
  @ApiProperty({
    description: 'Data e hora agendada para a visita',
    example: '2025-01-20T14:30:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  @IsNotEmpty({ message: 'Data e hora da visita são obrigatórias' })
  @IsDateString({}, { message: 'Data e hora devem estar em formato válido' })
  data_agendamento: Date;

  /**
   * Tipo da visita
   */
  @ApiProperty({
    description: 'Tipo da visita a ser realizada',
    enum: TipoVisita,
    example: TipoVisita.ACOMPANHAMENTO,
    enumName: 'TipoVisita',
  })
  @IsNotEmpty({ message: 'Tipo da visita é obrigatório' })
  @IsEnum(TipoVisita, { message: 'Tipo de visita inválido' })
  tipo_visita: TipoVisita;

  /**
   * Prioridade da visita
   */
  @ApiProperty({
    description: 'Prioridade da visita',
    enum: PrioridadeVisita,
    example: PrioridadeVisita.NORMAL,
    enumName: 'PrioridadeVisita',
    default: PrioridadeVisita.NORMAL,
  })
  @IsEnum(PrioridadeVisita, { message: 'Prioridade da visita inválida' })
  prioridade: PrioridadeVisita = PrioridadeVisita.NORMAL;

  /**
   * Observações sobre o agendamento
   */
  @ApiPropertyOptional({
    description: 'Observações ou instruções especiais para a visita',
    example: 'Beneficiário disponível apenas no período da tarde. Verificar situação de saúde da mãe.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString({ message: 'Observações devem ser um texto' })
  @MaxLength(1000, {
    message: 'Observações devem ter no máximo 1000 caracteres',
  })
  observacoes?: string;

  /**
   * Endereço específico para a visita
   */
  @ApiPropertyOptional({
    description: 'Endereço específico para a visita (se diferente do cadastrado)',
    example: 'Rua das Flores, 123, Apt 45 - Bairro Centro - Natal/RN',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Endereço deve ser um texto' })
  @MaxLength(500, {
    message: 'Endereço deve ter no máximo 500 caracteres',
  })
  endereco_visita?: string;

  /**
   * Telefone de contato para a visita
   */
  @ApiPropertyOptional({
    description: 'Telefone de contato para agendamento da visita',
    example: '(84) 99999-9999',
  })
  @IsOptional()
  @IsString({ message: 'Telefone deve ser um texto' })
  @MaxLength(20, {
    message: 'Telefone deve ter no máximo 20 caracteres',
  })
  telefone_contato?: string;

  /**
   * Indica se o beneficiário deve ser notificado
   */
  @ApiProperty({
    description: 'Indica se o beneficiário deve ser notificado sobre a visita',
    example: true,
    default: true,
  })
  @IsBoolean({ message: 'Campo de notificação deve ser verdadeiro ou falso' })
  notificar_beneficiario: boolean = true;

  /**
   * Motivo ou objetivo da visita
   */
  @ApiPropertyOptional({
    description: 'Motivo ou objetivo específico da visita',
    example: 'Verificação das condições habitacionais para renovação do benefício',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Motivo deve ser um texto' })
  @MaxLength(500, {
    message: 'Motivo deve ter no máximo 500 caracteres',
  })
  motivo_visita?: string;

  /**
   * Dados complementares em formato livre
   */
  @ApiPropertyOptional({
    description: 'Dados complementares específicos para o agendamento',
    example: {
      requer_interprete: false,
      possui_animais: true,
      observacoes_acesso: 'Portão azul, tocar campainha'
    },
  })
  @IsOptional()
  dados_complementares?: Record<string, any>;
}