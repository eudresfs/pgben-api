import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

/**
 * DTO para configuração de limites de upload de arquivos no sistema.
 */
export class LimitesUploadDto {
  @ApiProperty({
    description: 'Tamanho máximo de upload em bytes',
    example: 5242880, // 5MB
    minimum: 1024,
  })
  @IsNotEmpty({ message: 'O tamanho máximo é obrigatório' })
  @IsInt({ message: 'O tamanho máximo deve ser um número inteiro' })
  @Min(1024, { message: 'O tamanho máximo deve ser no mínimo 1024 bytes' })
  tamanho_maximo: number;

  @ApiProperty({
    description:
      'Lista de formatos permitidos para upload (extensões ou MIME types)',
    example: ['pdf', 'jpg', 'jpeg', 'png', 'docx'],
    type: [String],
  })
  @IsNotEmpty({ message: 'Os formatos permitidos são obrigatórios' })
  @IsArray({ message: 'Os formatos permitidos devem estar em um array' })
  @IsString({ each: true, message: 'Cada formato deve ser uma string' })
  formatos_permitidos: string[];

  @ApiProperty({
    description: 'Quantidade máxima de arquivos por operação de upload',
    example: 10,
    minimum: 1,
  })
  @IsNotEmpty({ message: 'A quantidade máxima de arquivos é obrigatória' })
  @IsInt({
    message: 'A quantidade máxima de arquivos deve ser um número inteiro',
  })
  @Min(1, { message: 'A quantidade máxima de arquivos deve ser no mínimo 1' })
  quantidade_maxima_arquivos: number;

  // Aliases para compatibilidade com o serviço

  /**
   * Alias para quantidade_maxima_arquivos - quantidade total de arquivos permitidos
   */
  get arquivos_maximo(): number {
    return this.quantidade_maxima_arquivos;
  }

  set arquivos_maximo(value: number) {
    this.quantidade_maxima_arquivos = value;
  }

  /**
   * Alias para formatos_permitidos - tipos de arquivos permitidos
   */
  get tipos_permitidos(): string[] {
    return this.formatos_permitidos;
  }

  set tipos_permitidos(value: string[]) {
    this.formatos_permitidos = value;
  }

  /**
   * Alias para quantidade_maxima_arquivos - máximo de arquivos por requisição
   */
  get max_por_requisicao(): number {
    return this.quantidade_maxima_arquivos;
  }

  set max_por_requisicao(value: number) {
    this.quantidade_maxima_arquivos = value;
  }
}
