import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para resposta de configuração de renovação automática
 */
export class ConfiguracaoRenovacaoResponseDto {
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
    example: 'Auxílio Aluguel',
  })
  nome_tipo_beneficio: string;

  @ApiProperty({
    description: 'Indica se a renovação automática está ativa para este tipo de benefício',
    example: true,
  })
  renovacao_automatica: boolean;

  @ApiProperty({
    description: 'Dias de antecedência para renovação',
    example: 30,
  })
  dias_antecedencia_renovacao: number;

  @ApiProperty({
    description: 'Número máximo de renovações permitidas',
    example: 3,
    nullable: true,
  })
  numero_maximo_renovacoes: number | null;

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
    description: 'Observações sobre a configuração',
    example: 'Configuração padrão para auxílio aluguel',
    nullable: true,
  })
  observacoes: string | null;

  @ApiProperty({
    description: 'Data de criação da configuração',
    example: '2025-05-24T14:09:39-03:00',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Data da última atualização da configuração',
    example: '2025-05-24T14:09:39-03:00',
  })
  updated_at: Date;
}
