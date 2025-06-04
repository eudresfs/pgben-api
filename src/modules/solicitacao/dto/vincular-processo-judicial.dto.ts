import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para vincular um processo judicial a uma solicitação
 *
 * Este DTO é usado pelo módulo de solicitação para vincular um processo judicial
 * existente a uma solicitação. A responsabilidade de gerenciar este vínculo
 * é do módulo de solicitação, não do módulo judicial.
 */
export class VincularProcessoJudicialDto {
  @ApiProperty({
    description: 'ID do processo judicial a ser vinculado',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsNotEmpty({ message: 'O ID do processo judicial é obrigatório' })
  @IsUUID('4', { message: 'O ID do processo judicial deve ser um UUID válido' })
  processo_judicial_id: string;

  @ApiProperty({
    description: 'Observação sobre o vínculo (opcional)',
    example: 'Vinculado conforme determinação do juiz',
    required: false,
  })
  observacao?: string;
}
