import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para representar uma regra de conflito na resposta
 */
export class RegraConflitoResponseDto {
  @ApiProperty({
    description: 'ID da regra de conflito',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Descrição da regra de conflito',
    example:
      'Um cidadão não pode ser beneficiário e membro de composição familiar ao mesmo tempo',
  })
  descricao: string;
}

/**
 * DTO para resposta de verificação de regras de conflito
 *
 * Este DTO é utilizado para retornar o resultado da verificação de conflitos
 * entre papéis, garantindo a padronização das respostas da API.
 */
export class VerificacaoRegraConflitoResponseDto {
  @ApiProperty({
    description: 'Indica se existe conflito entre os papéis',
    example: true,
  })
  possui_conflito: boolean;

  @ApiProperty({
    description: 'Regra de conflito encontrada, se houver',
    type: RegraConflitoResponseDto,
    nullable: true,
  })
  regra: RegraConflitoResponseDto | null;
}
