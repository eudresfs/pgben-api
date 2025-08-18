import { IsBoolean, IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AnexoDto } from './criar-solicitacao.dto';

/**
 * DTO para processar aprovação ou rejeição de solicitação
 */
export class ProcessarAprovacaoDto {
  @ApiProperty({
    description: 'Decisão: true para aprovar, false para rejeitar',
    example: true,
    type: 'boolean'
  })
  @IsBoolean({ message: 'aprovado deve ser true ou false' })
  aprovado: boolean;

  @ApiPropertyOptional({
    description: 'Justificativa da decisão'
  })
  @IsOptional()
  @IsString()
  justificativa?: string;

  @ApiPropertyOptional({
    description: 'Lista de anexos/documentos da decisão',
    type: [AnexoDto]
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnexoDto)
  anexos?: AnexoDto[];
}