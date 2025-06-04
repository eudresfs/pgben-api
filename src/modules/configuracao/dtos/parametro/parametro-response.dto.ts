import { ApiProperty } from '@nestjs/swagger';
import { ParametroTipoEnum } from '../../../../enums';

/**
 * DTO para resposta com informações de um parâmetro de configuração.
 */
export class ParametroResponseDto {
  @ApiProperty({
    description: 'Chave única que identifica o parâmetro',
    example: 'sistema.nome',
  })
  chave: string;

  @ApiProperty({
    description: 'Valor do parâmetro',
    example: 'www.pgben.natal.rn.gov.br',
  })
  valor: string;

  @ApiProperty({
    description: 'Tipo do parâmetro',
    enum: ParametroTipoEnum,
    example: ParametroTipoEnum.STRING,
  })
  tipo: ParametroTipoEnum;

  @ApiProperty({
    description: 'Descrição do parâmetro',
    example: 'Nome do sistema exibido na interface',
  })
  descricao: string;

  @ApiProperty({
    description: 'Categoria do parâmetro',
    example: 'sistema',
  })
  categoria: string;

  @ApiProperty({
    description:
      'Valor tipado do parâmetro, convertido para o tipo especificado',
    example: 'www.pgben.natal.rn.gov.br',
    type: Object,
  })
  valorConvertido: any;

  @ApiProperty({
    description: 'Valor formatado para exibição conforme o tipo do parâmetro',
    example: 'R$ 1.000,00',
  })
  valor_formatado: string;

  @ApiProperty({
    description: 'Data de criação do parâmetro',
    example: '2025-05-18T20:10:30.123Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Data da última atualização do parâmetro',
    example: '2025-05-18T20:15:45.678Z',
  })
  updated_at: Date;

  @ApiProperty({
    description: 'Usuário que realizou a última atualização',
    example: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      nome: 'Administrador',
    },
  })
  updated_by: {
    id: string;
    nome: string;
  };
}
