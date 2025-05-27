import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para resposta de verificação de renovação automática
 * 
 * Este DTO é utilizado para retornar o resultado da verificação de renovação automática
 * de uma solicitação de benefício, garantindo a padronização das respostas da API.
 */
export class VerificacaoRenovacaoResponseDto {
  @ApiProperty({
    description: 'Indica se a renovação automática está ativada para a solicitação',
    example: true,
  })
  renovacao_automatica: boolean;

  @ApiProperty({
    description: 'Contador de renovações já realizadas',
    example: 2,
  })
  contador_renovacoes: number;

  @ApiProperty({
    description: 'Data da próxima renovação programada',
    example: '2025-06-24T00:00:00.000Z',
    nullable: true,
  })
  data_proxima_renovacao: Date | null;

  @ApiProperty({
    description: 'ID da solicitação original (caso seja uma renovação)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  solicitacao_original_id: string | null;

  @ApiProperty({
    description: 'Indica se o tipo de benefício tem configuração de renovação automática ativada',
    example: true,
  })
  configuracao_tipo_beneficio: boolean;

  @ApiProperty({
    description: 'Dias de antecedência para a renovação automática',
    example: 30,
    nullable: true,
  })
  dias_antecedencia: number | null;

  @ApiProperty({
    description: 'Número máximo de renovações permitidas',
    example: 3,
    nullable: true,
  })
  numero_maximo_renovacoes: number | null;

  @ApiProperty({
    description: 'Indica se a renovação requer aprovação manual',
    example: false,
    nullable: true,
  })
  requer_aprovacao: boolean | null;
}
