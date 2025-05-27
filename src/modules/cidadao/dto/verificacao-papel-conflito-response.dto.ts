import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para representar um papel conflitante na resposta
 */
export class PapelConflitoDto {
  @ApiProperty({
    description: 'ID do papel conflitante',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  papel_id: string;

  @ApiProperty({
    description: 'Nome do papel conflitante',
    example: 'Beneficiário',
  })
  nome_papel: string;

  @ApiProperty({
    description: 'Descrição da regra de conflito',
    example: 'Um cidadão não pode ser beneficiário e membro de composição familiar ao mesmo tempo',
  })
  regra_conflito: string;
}

/**
 * DTO para resposta de verificação de papéis conflitantes
 * 
 * Este DTO é utilizado para retornar o resultado da verificação de conflitos
 * entre papéis de um cidadão, garantindo a padronização das respostas da API.
 */
export class VerificacaoPapelConflitoResponseDto {
  @ApiProperty({
    description: 'Indica se existe conflito entre os papéis',
    example: true,
  })
  possui_conflito: boolean;

  @ApiProperty({
    description: 'Lista de papéis conflitantes',
    type: [PapelConflitoDto],
  })
  papeis_conflitantes: PapelConflitoDto[];
}

/**
 * DTO para resposta da listagem de regras de conflito
 */
export class RegraConflitoDto {
  @ApiProperty({
    description: 'ID da regra de conflito',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'ID do papel de origem',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  papel_origem_id: string;

  @ApiProperty({
    description: 'Nome do papel de origem',
    example: 'Beneficiário',
  })
  papel_origem_nome: string;

  @ApiProperty({
    description: 'ID do papel de destino',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  papel_destino_id: string;

  @ApiProperty({
    description: 'Nome do papel de destino',
    example: 'Membro de Composição Familiar',
  })
  papel_destino_nome: string;

  @ApiProperty({
    description: 'Descrição da regra de conflito',
    example: 'Um cidadão não pode ser beneficiário e membro de composição familiar ao mesmo tempo',
  })
  descricao: string;

  @ApiProperty({
    description: 'Indica se a regra está ativa',
    example: true,
  })
  ativo: boolean;
}
