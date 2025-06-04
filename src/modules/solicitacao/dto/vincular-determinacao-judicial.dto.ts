import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para vincular uma determinação judicial a uma solicitação
 *
 * Este DTO é usado pelo módulo de solicitação para vincular uma determinação judicial
 * existente a uma solicitação. A responsabilidade de gerenciar este vínculo
 * é do módulo de solicitação, não do módulo judicial.
 */
export class VincularDeterminacaoJudicialDto {
  @ApiProperty({
    description: 'ID da determinação judicial a ser vinculada',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsNotEmpty({ message: 'O ID da determinação judicial é obrigatório' })
  @IsUUID('4', {
    message: 'O ID da determinação judicial deve ser um UUID válido',
  })
  determinacao_judicial_id: string;

  @ApiProperty({
    description: 'Observação sobre o vínculo (opcional)',
    example: 'Vinculado conforme determinação judicial',
    required: false,
  })
  observacao?: string;
}
