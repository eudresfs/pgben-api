import { IsString, IsEnum, IsOptional, IsInt, Min, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoAcaoCritica, EstrategiaAprovacao } from '../enums';
import { Status } from '../../../enums/status.enum';

/**
 * DTO para criação de configuração de ação de aprovação
 */
export class CriarAcaoAprovacaoDto {
  @ApiProperty({
    description: 'Tipo da ação crítica',
    enum: TipoAcaoCritica
  })
  @IsEnum(TipoAcaoCritica)
  tipo_acao: TipoAcaoCritica;

  @ApiProperty({
    description: 'Nome descritivo da ação'
  })
  @IsString()
  nome: string;

  @ApiPropertyOptional({
    description: 'Descrição detalhada da ação'
  })
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiProperty({
    description: 'Estratégia de aprovação',
    enum: EstrategiaAprovacao,
    default: EstrategiaAprovacao.SIMPLES
  })
  @IsEnum(EstrategiaAprovacao)
  estrategia: EstrategiaAprovacao;

  @ApiProperty({
    description: 'Número mínimo de aprovadores necessários',
    minimum: 1,
    default: 1
  })
  @IsInt()
  @Min(1)
  min_aprovadores: number;

  @ApiPropertyOptional({
    description: 'Status da configuração de aprovação',
    enum: Status,
    default: Status.ATIVO
  })
  @IsOptional()
  @IsEnum(Status)
  status?: Status;

  @ApiPropertyOptional({
    description: 'Lista de perfis que podem se autoaprovar',
    type: [String],
    example: ['GESTOR', 'ADMIN', 'COORDENADOR']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  perfil_auto_aprovacao?: string[];
}