import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsIn, IsOptional } from 'class-validator';

/**
 * DTO para atualização de status de solicitação de benefício
 */
export class UpdateStatusSolicitacaoDto {
  @ApiProperty({ 
    description: 'Novo status da solicitação', 
    example: 'APROVADO',
    enum: ['PENDENTE', 'EM_ANALISE', 'APROVADO', 'REJEITADO', 'CANCELADO']
  })
  @IsNotEmpty({ message: 'Status é obrigatório' })
  @IsString({ message: 'Status deve ser um texto' })
  @IsIn(['PENDENTE', 'EM_ANALISE', 'APROVADO', 'REJEITADO', 'CANCELADO'], { 
    message: 'Status deve ser um dos valores: PENDENTE, EM_ANALISE, APROVADO, REJEITADO, CANCELADO' 
  })
  status: string;

  @ApiProperty({ 
    description: 'Justificativa para a mudança de status', 
    example: 'Documentação completa e requisitos atendidos',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'Justificativa deve ser um texto' })
  justificativa?: string;
}
