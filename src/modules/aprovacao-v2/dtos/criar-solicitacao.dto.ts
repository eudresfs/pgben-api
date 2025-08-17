import { IsString, IsUUID, IsOptional, IsObject, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoAcaoCritica } from '../enums';

/**
 * DTO para anexos de documentos
 */
export class AnexoDto {
  @ApiProperty({
    description: 'Nome do arquivo'
  })
  @IsString()
  nome: string;

  @ApiProperty({
    description: 'URL do arquivo'
  })
  @IsString()
  url: string;

  @ApiProperty({
    description: 'Tipo MIME do arquivo'
  })
  @IsString()
  tipo: string;

  @ApiProperty({
    description: 'Tamanho do arquivo em bytes'
  })
  tamanho: number;

  @ApiProperty({
    description: 'Data de upload do arquivo'
  })
  uploadedAt: Date;
}

/**
 * DTO para criação de solicitação de aprovação
 * Versão simplificada com apenas campos essenciais
 */
export class CriarSolicitacaoDto {
  @ApiProperty({
    description: 'Tipo da ação crítica',
    enum: TipoAcaoCritica
  })
  @IsString()
  tipo_acao: TipoAcaoCritica;

  @ApiProperty({
    description: 'Justificativa para a solicitação'
  })
  @IsString()
  justificativa: string;

  @ApiProperty({
    description: 'Dados da ação a ser executada',
    type: 'object',
    additionalProperties: true
  })
  @IsObject()
  dados_acao: Record<string, any>;

  @ApiProperty({
    description: 'Método/endpoint que será executado após aprovação'
  })
  @IsString()
  metodo_execucao: string;

  @ApiPropertyOptional({
    description: 'Data limite para aprovação',
    type: 'string',
    format: 'date-time'
  })
  @IsOptional()
  @IsDateString()
  prazo_aprovacao?: string;

  @ApiPropertyOptional({
    description: 'Lista de anexos/documentos da solicitação',
    type: [AnexoDto]
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnexoDto)
  anexos?: AnexoDto[];
}