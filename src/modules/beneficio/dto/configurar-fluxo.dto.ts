import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsArray,
  ValidateNested,
  IsOptional,
  IsEnum,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Enum para definir os tipos de aprovadores de etapas
 */
export enum TipoAprovador {
  TECNICO = 'tecnico',
  COORDENADOR_CRAS = 'coordenador_cras',
  COORDENADOR_CREAS = 'coordenador_creas',
  GESTOR_UNIDADE = 'gestor_unidade',
  GESTOR_SEMTAS = 'gestor_semtas',
  COMISSAO = 'comissao',
}

/**
 * DTO para etapa de fluxo de aprovação
 */
export class EtapaFluxoDto {
  @ApiProperty({
    description: 'Ordem da etapa no fluxo de aprovação',
    example: 1,
  })
  @IsNotEmpty({ message: 'Ordem é obrigatória' })
  ordem: number;

  @ApiProperty({
    description: 'Nome da etapa',
    example: 'Análise Técnica',
  })
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @IsString({ message: 'Nome deve ser um texto' })
  nome: string;

  @ApiProperty({
    description: 'Descrição da etapa',
    example: 'Análise técnica da documentação e critérios de elegibilidade',
  })
  @IsNotEmpty({ message: 'Descrição é obrigatória' })
  @IsString({ message: 'Descrição deve ser um texto' })
  descricao: string;

  @ApiProperty({
    description: 'Tipo de aprovador responsável pela etapa',
    enum: TipoAprovador,
    example: TipoAprovador.TECNICO,
  })
  @IsNotEmpty({ message: 'Tipo de aprovador é obrigatório' })
  @IsEnum(TipoAprovador, { message: 'Tipo de aprovador inválido' })
  tipo_aprovador: TipoAprovador;

  @ApiPropertyOptional({
    description: 'Prazo máximo em dias para conclusão da etapa',
    example: 5,
  })
  @IsOptional()
  prazo_dias?: number;
}

/**
 * DTO para configuração de fluxo de aprovação
 */
export class ConfigurarFluxoDto {
  @ApiProperty({
    description: 'Descrição geral do fluxo de aprovação',
    example: 'Fluxo padrão para aprovação de benefícios eventuais',
  })
  @IsNotEmpty({ message: 'Descrição é obrigatória' })
  @IsString({ message: 'Descrição deve ser um texto' })
  descricao: string;

  @ApiProperty({
    description: 'Etapas do fluxo de aprovação',
    type: [EtapaFluxoDto],
  })
  @IsArray({ message: 'Etapas deve ser um array' })
  @ArrayMinSize(1, { message: 'Deve haver pelo menos uma etapa no fluxo' })
  @ValidateNested({ each: true })
  @Type(() => EtapaFluxoDto)
  etapas: EtapaFluxoDto[];
}
