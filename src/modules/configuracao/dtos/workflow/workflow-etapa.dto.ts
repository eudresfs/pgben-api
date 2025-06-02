import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, Min, MaxLength, IsArray, IsBoolean } from 'class-validator';
import { WorkflowAcaoEnum } from '../../../../enums';

/**
 * DTO para uma etapa de workflow de benefício.
 * Representa um passo específico no fluxo de aprovação.
 */
export class WorkflowEtapaDto {
  @ApiProperty({
    description: 'ID único da etapa',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @IsNotEmpty({ message: 'O ID é obrigatório' })
  @IsString({ message: 'O ID deve ser uma string' })
  id: string;
  
  @ApiProperty({
    description: 'Indica se esta é a etapa inicial do workflow',
    example: true
  })
  @IsOptional()
  @IsBoolean({ message: 'O indicador de etapa inicial deve ser um booleano' })
  inicial?: boolean;
  @ApiProperty({
    description: 'Ordem da etapa no fluxo de trabalho',
    example: 1,
    minimum: 1
  })
  @IsNotEmpty({ message: 'A ordem é obrigatória' })
  @IsInt({ message: 'A ordem deve ser um número inteiro' })
  @Min(1, { message: 'A ordem deve ser no mínimo 1' })
  ordem: number;

  @ApiProperty({
    description: 'Descrição da etapa',
    example: 'Análise inicial da solicitação',
    maxLength: 200
  })
  @IsNotEmpty({ message: 'A descrição é obrigatória' })
  @IsString({ message: 'A descrição deve ser uma string' })
  @MaxLength(200, { message: 'A descrição deve ter no máximo 200 caracteres' })
  descricao: string;

  @ApiProperty({
    description: 'ID do setor responsável pela etapa',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @IsNotEmpty({ message: 'O setor é obrigatório' })
  @IsUUID('4', { message: 'O ID do setor deve ser um UUID válido' })
  setor_id: string;

  @ApiProperty({
    description: 'Tipo de ação a ser realizada nesta etapa',
    enum: WorkflowAcaoEnum,
    example: WorkflowAcaoEnum.ANALISE
  })
  @IsNotEmpty({ message: 'A ação é obrigatória' })
  @IsEnum(WorkflowAcaoEnum, { message: 'Tipo de ação inválido' })
  acao: WorkflowAcaoEnum;

  @ApiProperty({
    description: 'Prazo em horas para cumprimento da etapa (SLA)',
    example: 48,
    minimum: 1
  })
  @IsNotEmpty({ message: 'O prazo SLA é obrigatório' })
  @IsInt({ message: 'O prazo SLA deve ser um número inteiro' })
  @Min(1, { message: 'O prazo SLA deve ser no mínimo 1 hora' })
  @Max(720, { message: 'O prazo SLA deve ser no máximo 720 horas (30 dias)' })
  prazo_sla: number;

  @ApiProperty({
    description: 'ID do template de notificação associado à etapa',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false
  })
  @IsOptional()
  @IsUUID('4', { message: 'O ID do template deve ser um UUID válido' })
  template_notificacao_id?: string;
  
  @ApiProperty({
    description: 'Lista de IDs das próximas etapas possíveis',
    example: ['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002'],
    required: false
  })
  @IsOptional()
  @IsArray({ message: 'A lista de próximas etapas deve ser um array' })
  proximas_etapas?: string[];
  
  @ApiProperty({
    description: 'SLA em horas para esta etapa',
    example: 48,
    required: false
  })
  @IsOptional()
  @IsInt({ message: 'O SLA em horas deve ser um número inteiro' })
  sla_horas?: number;
}
