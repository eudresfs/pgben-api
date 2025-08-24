import { ApiProperty } from '@nestjs/swagger';
import {
  MotivoOperacao,
  OperacaoConcessao,
} from '../../../enums/operacao-concessao.enum';

/**
 * DTO para resposta dos motivos disponíveis por operação
 */
export class MotivosOperacaoResponseDto {
  @ApiProperty({
    description: 'Tipo de operação',
    enum: OperacaoConcessao,
    example: OperacaoConcessao.BLOQUEIO,
  })
  operacao: OperacaoConcessao;

  @ApiProperty({
    description: 'Lista de motivos disponíveis para a operação',
    type: [Object],
    example: [
      {
        codigo: 'BLQ001',
        descricao: 'Descumprimento de condicionalidades',
        ativo: true,
      },
    ],
  })
  motivos: MotivoOperacao[];

  @ApiProperty({
    description: 'Total de motivos disponíveis',
    example: 5,
  })
  total: number;
}

/**
 * DTO para validação do parâmetro de operação
 */
export class OperacaoParamDto {
  @ApiProperty({
    description: 'Tipo de operação para filtrar motivos',
    enum: OperacaoConcessao,
    example: OperacaoConcessao.BLOQUEIO,
  })
  operacao: OperacaoConcessao;
}
