import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para resposta de verificação de renovações pendentes
 *
 * Este DTO é utilizado para retornar o resultado da verificação e processamento
 * manual de renovações pendentes, garantindo a padronização das respostas da API.
 */
export class VerificacaoRenovacoesPendentesResponseDto {
  @ApiProperty({
    description: 'Número de renovações processadas',
    example: 5,
  })
  renovacoes_processadas: number;
}
