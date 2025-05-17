import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEnum, IsOptional } from 'class-validator';
import { StatusSolicitacaoBeneficio } from '../entities/solicitacao-beneficio.entity';

/**
 * DTO para atualização de status de solicitação de benefício
 */
export class UpdateStatusSolicitacaoDto {
  @ApiProperty({
    description: 'Novo status da solicitação',
    example: StatusSolicitacaoBeneficio.APROVADA,
    enum: StatusSolicitacaoBeneficio,
  })
  @IsNotEmpty({ message: 'Status é obrigatório' })
  @IsEnum(StatusSolicitacaoBeneficio, {
    message: 'Status deve ser um valor válido do enum StatusSolicitacaoBeneficio',
  })
  status: StatusSolicitacaoBeneficio;

  @ApiProperty({
    description: 'Justificativa para a mudança de status',
    example: 'Documentação completa e requisitos atendidos',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Justificativa deve ser um texto' })
  justificativa?: string;
}
