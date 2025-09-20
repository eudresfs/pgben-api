import {
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  IsNumber,
  Min,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoDocumentoComprobatorio } from '../../../enums/tipo-documento-comprobatorio.enum';

/**
 * DTO para criação de documento comprobatório.
 * 
 * Representa as provas sociais como fotos e documentos que comprovem
 * a situação relatada no encerramento do benefício, conforme
 * estabelecido pela Lei de Benefícios Eventuais do SUAS.
 */
export class CreateDocumentoComprobatorioDto {
  @ApiProperty({
    description: 'Tipo do documento comprobatório',
    enum: TipoDocumentoComprobatorio,
    example: TipoDocumentoComprobatorio.FOTOGRAFIA,
  })
  @IsNotEmpty({ message: 'Tipo do documento é obrigatório' })
  @IsEnum(TipoDocumentoComprobatorio, {
    message: 'Tipo de documento deve ser um valor válido',
  })
  tipo: TipoDocumentoComprobatorio;

  @ApiProperty({
    description: 'Nome original do arquivo',
    example: 'comprovante_renda_familia.pdf',
    maxLength: 255,
  })
  @IsNotEmpty({ message: 'Nome do arquivo é obrigatório' })
  @IsString({ message: 'Nome do arquivo deve ser um texto' })
  @MaxLength(255, {
    message: 'Nome do arquivo não pode exceder 255 caracteres',
  })
  nomeArquivo: string;

  @ApiProperty({
    description: 'Caminho ou URL do arquivo no sistema de armazenamento',
    example: '/uploads/documentos/2024/01/comprovante_renda_familia.pdf',
    maxLength: 500,
  })
  @IsNotEmpty({ message: 'Caminho do arquivo é obrigatório' })
  @IsString({ message: 'Caminho do arquivo deve ser um texto' })
  @MaxLength(500, {
    message: 'Caminho do arquivo não pode exceder 500 caracteres',
  })
  caminhoArquivo: string;

  @ApiProperty({
    description: 'Tipo MIME do arquivo',
    example: 'application/pdf',
    maxLength: 100,
  })
  @IsNotEmpty({ message: 'Tipo MIME é obrigatório' })
  @IsString({ message: 'Tipo MIME deve ser um texto' })
  @MaxLength(100, {
    message: 'Tipo MIME não pode exceder 100 caracteres',
  })
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_.]*$/, {
    message: 'Tipo MIME deve ter formato válido (ex: application/pdf)',
  })
  tipoMime: string;

  @ApiProperty({
    description: 'Tamanho do arquivo em bytes',
    example: 1048576,
    minimum: 1,
  })
  @IsNotEmpty({ message: 'Tamanho do arquivo é obrigatório' })
  @IsNumber({}, { message: 'Tamanho do arquivo deve ser um número' })
  @Min(1, { message: 'Tamanho do arquivo deve ser maior que zero' })
  tamanhoArquivo: number;

  @ApiProperty({
    description: 'Descrição do que o documento comprova',
    example: 'Comprovante de renda atual da família, demonstrando autonomia financeira',
    maxLength: 500,
  })
  @IsNotEmpty({ message: 'Descrição do documento é obrigatória' })
  @IsString({ message: 'Descrição deve ser um texto' })
  @MaxLength(500, {
    message: 'Descrição não pode exceder 500 caracteres',
  })
  descricao: string;

  @ApiPropertyOptional({
    description: 'Observações adicionais sobre o documento',
    example: 'Documento fornecido pela própria família durante visita domiciliar',
    maxLength: 300,
  })
  @IsOptional()
  @IsString({ message: 'Observações devem ser um texto' })
  @MaxLength(300, {
    message: 'Observações não podem exceder 300 caracteres',
  })
  observacoes?: string;

  @ApiPropertyOptional({
    description: 'Hash do arquivo para verificação de integridade',
    example: 'sha256:a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
    maxLength: 128,
  })
  @IsOptional()
  @IsString({ message: 'Hash do arquivo deve ser um texto' })
  @MaxLength(128, {
    message: 'Hash do arquivo não pode exceder 128 caracteres',
  })
  @Matches(/^[a-zA-Z0-9]+:[a-fA-F0-9]+$/, {
    message: 'Hash deve ter formato válido (ex: sha256:hash)',
  })
  hashArquivo?: string;
}