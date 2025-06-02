import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { StatusSolicitacao } from '../../../entities/solicitacao.entity';

/**
 * DTO para atualização de status de solicitação
 * 
 * Este DTO é utilizado para atualizar o status de uma solicitação,
 * permitindo a inclusão de informações adicionais como observações,
 * justificativas e referências a processos judiciais.
 */
export class UpdateStatusSolicitacaoDto {
  @ApiProperty({
    description: 'Novo status da solicitação',
    enum: StatusSolicitacao,
    example: StatusSolicitacao.APROVADA,
  })
  @IsEnum(StatusSolicitacao, {
    message: 'Status inválido. Os valores permitidos são: $constraint1',
  })
  novo_status: StatusSolicitacao;

  @ApiProperty({
    description: 'Observação sobre a alteração de status',
    example: 'Solicitação aprovada após análise da documentação',
    required: false,
  })
  @IsString({ message: 'Observação deve ser uma string' })
  @IsOptional()
  observacao?: string;

  @ApiProperty({
    description: 'Justificativa para a alteração de status',
    example: 'Documentação completa e conforme requisitos',
    required: false,
  })
  @IsString({ message: 'Justificativa deve ser uma string' })
  @IsOptional()
  justificativa?: string;

  @ApiProperty({
    description: 'ID do processo judicial relacionado',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsUUID('4', { message: 'ID de processo judicial inválido' })
  @IsOptional()
  processo_judicial_id?: string;

  @ApiProperty({
    description: 'ID da determinação judicial relacionada',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsUUID('4', { message: 'ID de determinação judicial inválido' })
  @IsOptional()
  determinacao_judicial_id?: string;
}
