import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  IsObject,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseDto } from '../../../shared/dtos/base.dto';
import {
  StatusSolicitacaoAprovacao,
  PrioridadeAprovacao,
  TipoAcaoCritica,
} from '../enums/aprovacao.enums';
import {
  CREATE,
  UPDATE,
} from '../../../shared/validators/validation-groups';

/**
 * DTO para criação de solicitação de aprovação
 *
 * Define a estrutura de dados necessária para criar uma nova
 * solicitação de aprovação no sistema.
 */
export class CreateSolicitacaoAprovacaoDto extends BaseDto {
  @ApiProperty({
    description: 'ID da ação crítica que requer aprovação',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty({
    message: 'O ID da ação crítica é obrigatório',
    groups: [CREATE],
  })
  @IsUUID('4', {
    message: 'O ID da ação crítica deve ser um UUID válido',
    groups: [CREATE, UPDATE],
  })
  acao_critica_id: string;

  @ApiProperty({
    description: 'ID do usuário solicitante',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty({
    message: 'O ID do usuário solicitante é obrigatório',
    groups: [CREATE],
  })
  @IsUUID('4', {
    message: 'O ID do usuário solicitante deve ser um UUID válido',
    groups: [CREATE, UPDATE],
  })
  usuario_solicitante_id: string;

  @ApiProperty({
    description: 'ID da entidade alvo da ação',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty({
    message: 'O ID da entidade alvo é obrigatório',
    groups: [CREATE],
  })
  @IsUUID('4', {
    message: 'O ID da entidade alvo deve ser um UUID válido',
    groups: [CREATE, UPDATE],
  })
  entidade_alvo_id: string;

  @ApiProperty({
    description: 'Justificativa para a solicitação',
    example: 'Necessário para correção de dados incorretos',
  })
  @IsNotEmpty({
    message: 'A justificativa é obrigatória',
    groups: [CREATE],
  })
  @IsString({
    message: 'A justificativa deve ser uma string',
    groups: [CREATE, UPDATE],
  })
  @MaxLength(1000, {
    message: 'A justificativa deve ter no máximo 1000 caracteres',
    groups: [CREATE, UPDATE],
  })
  justificativa: string;

  @ApiPropertyOptional({
    description: 'Prioridade da solicitação',
    enum: PrioridadeAprovacao,
    example: PrioridadeAprovacao.NORMAL,
  })
  @IsOptional({ groups: [CREATE, UPDATE] })
  @IsEnum(PrioridadeAprovacao, {
    message: 'Prioridade inválida',
    groups: [CREATE, UPDATE],
  })
  prioridade?: PrioridadeAprovacao;

  @ApiPropertyOptional({
    description: 'Contexto adicional da solicitação',
    example: { modulo: 'beneficios', operacao: 'alteracao_dados' },
  })
  @IsOptional({ groups: [CREATE, UPDATE] })
  @IsObject({
    message: 'O contexto deve ser um objeto',
    groups: [CREATE, UPDATE],
  })
  contexto?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Data de expiração da solicitação',
    example: '2023-12-31T23:59:59Z',
  })
  @IsOptional({ groups: [CREATE, UPDATE] })
  @IsDateString(
    {},
    {
      message: 'A data de expiração deve estar em formato ISO',
      groups: [CREATE, UPDATE],
    },
  )
  data_expiracao?: Date;

  @ApiPropertyOptional({
    description: 'Observações adicionais',
    example: 'Solicitação urgente devido a prazo judicial',
  })
  @IsOptional({ groups: [CREATE, UPDATE] })
  @IsString({
    message: 'As observações devem ser uma string',
    groups: [CREATE, UPDATE],
  })
  @MaxLength(500, {
    message: 'As observações devem ter no máximo 500 caracteres',
    groups: [CREATE, UPDATE],
  })
  observacoes?: string;
}