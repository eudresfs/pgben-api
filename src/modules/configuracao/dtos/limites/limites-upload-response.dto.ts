import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para resposta com informações de limites de upload configurados no sistema.
 * Inclui também as informações formatadas para exibição ao usuário.
 */
export class LimitesUploadResponseDto {
  @ApiProperty({
    description: 'Tamanho máximo de upload em bytes',
    example: 5242880 // 5MB
  })
  tamanho_maximo: number;

  @ApiProperty({
    description: 'Tamanho máximo formatado para exibição',
    example: '5 MB'
  })
  tamanho_maximo_formatado: string;

  @ApiProperty({
    description: 'Lista de formatos permitidos para upload',
    example: ['pdf', 'jpg', 'jpeg', 'png', 'docx'],
    type: [String]
  })
  formatos_permitidos: string[];

  @ApiProperty({
    description: 'Quantidade máxima de arquivos por operação de upload',
    example: 10
  })
  quantidade_maxima_arquivos: number;
  
  // Aliases para compatibilidade com o serviço
  @ApiProperty({
    description: 'Quantidade máxima de arquivos permitidos (alias)',
    example: 100
  })
  arquivos_maximo: number;
  
  @ApiProperty({
    description: 'Tipos de arquivos permitidos (alias)',
    example: ['pdf', 'jpg', 'jpeg', 'png', 'docx'],
    type: [String]
  })
  tipos_permitidos: string[];
  
  @ApiProperty({
    description: 'Máximo de arquivos por requisição (alias)',
    example: 10
  })
  max_por_requisicao: number;
}
