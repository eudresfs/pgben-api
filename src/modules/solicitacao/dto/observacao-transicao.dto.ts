import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNotEmpty } from 'class-validator';

/**
 * DTO para transições de workflow que podem incluir observações
 * Usado em operações como rejeição, cancelamento, etc.
 */
export class ObservacaoTransicaoDto {
  /**
   * Observação opcional sobre a transição
   * Pode ser usada para justificar a decisão ou adicionar comentários
   */
  @ApiProperty({
    description: 'Observação opcional sobre a transição do workflow',
    example: 'Documentação rejeitada devido a inconsistências',
    required: false,
    type: String,
  })
  @IsOptional()
  @IsString({ message: 'A observação deve ser uma string válida' })
  observacao?: string;
}

/**
 * DTO específico para aprovação de solicitações
 * Inclui o parecer SEMTAS obrigatório
 */
export class AprovacaoSolicitacaoDto {
  /**
   * Parecer técnico da SEMTAS sobre a solicitação
   * Campo obrigatório para aprovação
   */
  @ApiProperty({
    description: 'Parecer técnico da SEMTAS sobre a solicitação',
    example: 'Solicitação aprovada conforme análise da documentação e verificação dos critérios de elegibilidade.',
    required: true,
    type: String,
  })
  @IsNotEmpty({ message: 'O parecer da SEMTAS é obrigatório para aprovação' })
  @IsString({ message: 'O parecer deve ser uma string válida' })
  parecer_semtas: string;

  /**
   * Observação adicional opcional sobre a aprovação
   */
  @ApiProperty({
    description: 'Observação adicional opcional sobre a aprovação',
    example: 'Aprovação realizada em caráter de urgência',
    required: false,
    type: String,
  })
  @IsOptional()
  @IsString({ message: 'A observação deve ser uma string válida' })
  observacao?: string;
}