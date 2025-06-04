import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para resposta de verificação de configuração de renovação automática
 *
 * Este DTO é utilizado para retornar o resultado da verificação de configuração
 * de renovação automática de um tipo de benefício, garantindo a padronização das respostas da API.
 */
export class VerificacaoConfiguracaoRenovacaoResponseDto {
  @ApiProperty({
    description: 'ID da configuração de renovação',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'ID do tipo de benefício',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  tipo_beneficio_id: string;

  @ApiProperty({
    description: 'Nome do tipo de benefício',
    example: 'Aluguel Social',
  })
  tipo_beneficio_nome: string;

  @ApiProperty({
    description:
      'Indica se a renovação automática está ativada para o tipo de benefício',
    example: true,
  })
  renovacao_automatica: boolean;

  @ApiProperty({
    description: 'Dias de antecedência para a renovação automática',
    example: 30,
  })
  dias_antecedencia_renovacao: number;

  @ApiProperty({
    description: 'Número máximo de renovações permitidas',
    example: 3,
  })
  numero_maximo_renovacoes: number;

  @ApiProperty({
    description: 'Indica se a renovação requer aprovação manual',
    example: false,
  })
  requer_aprovacao_renovacao: boolean;

  @ApiProperty({
    description: 'Indica se a configuração está ativa',
    example: true,
  })
  ativo: boolean;

  @ApiProperty({
    description: 'Data de criação da configuração',
    example: '2025-05-24T14:30:00.000Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Data de atualização da configuração',
    example: '2025-05-24T14:30:00.000Z',
  })
  updated_at: Date;
}
