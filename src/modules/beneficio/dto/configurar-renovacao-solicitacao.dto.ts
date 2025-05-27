import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

/**
 * DTO para configuração de renovação automática de uma solicitação
 */
export class ConfigurarRenovacaoSolicitacaoDto {
  @ApiProperty({
    description: 'Flag que indica se a renovação automática está ativada',
    example: true,
  })
  @IsNotEmpty({ message: 'O campo renovacao_automatica é obrigatório' })
  @IsBoolean({ message: 'O campo renovacao_automatica deve ser um booleano' })
  renovacao_automatica: boolean;
}
