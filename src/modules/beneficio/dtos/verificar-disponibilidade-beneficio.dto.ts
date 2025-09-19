import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty } from 'class-validator';
import { CategoriaBeneficio } from '../../../enums';

/**
 * DTO para requisição de verificação de disponibilidade de benefícios
 */
export class VerificarDisponibilidadeBeneficioDto {
  @ApiProperty({
    description: 'ID do cidadão para verificar disponibilidade dos benefícios',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
  })
  @IsUUID('4', { message: 'ID do cidadão deve ser um UUID válido' })
  @IsNotEmpty({ message: 'ID do cidadão é obrigatório' })
  cidadaoId: string;
}

/**
 * DTO para resposta de disponibilidade de um benefício específico
 */
export class DisponibilidadeBeneficioDto {
  @ApiProperty({
    description: 'ID do tipo de benefício',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Código único do benefício',
    example: 'AUX_NAT_001',
  })
  codigo: string;

  @ApiProperty({
    description: 'Nome do benefício',
    example: 'Auxílio Natalidade',
  })
  nome: string;

  @ApiProperty({
    description: 'Descrição detalhada do benefício',
    example: 'Benefício destinado a apoiar famílias com recém-nascidos',
  })
  descricao: string;

  @ApiProperty({
    description: 'Valor do benefício',
    example: 500.00,
    type: 'number',
  })
  valor: number;

  @ApiProperty({
    description: 'Categoria do benefício',
    enum: CategoriaBeneficio,
    example: CategoriaBeneficio.NATALIDADE,
  })
  categoria: CategoriaBeneficio;

  @ApiProperty({
    description: 'Label da categoria do benefício',
    example: 'Benefício Natalidade',
  })
  categoriaLabel: string;

  @ApiProperty({
    description: 'Descrição da categoria do benefício',
    example: 'Visa atender necessidades do bebê que vai nascer...',
  })
  categoriaDescricao: string;

  @ApiProperty({
    description: 'Indica se o benefício está disponível para nova solicitação',
    example: true,
    type: 'boolean',
  })
  disponivel: boolean;

  @ApiProperty({
    description: 'Data da última solicitação do benefício pelo cidadão',
    example: '2024-01-15T10:30:00.000Z',
    type: 'string',
    format: 'date-time',
    nullable: true,
  })
  dataUltimaSolicitacao: Date | null;

  @ApiProperty({
    description: 'Motivo da indisponibilidade (quando disponivel = false)',
    example: 'Existe uma solicitação em andamento',
    nullable: true,
  })
  motivoIndisponibilidade: string | null;

  @ApiProperty({
    description: 'Status da última solicitação (se houver)',
    example: 'em_analise',
    nullable: true,
  })
  statusUltimaSolicitacao: string | null;

  @ApiProperty({
    description: 'Status da última concessão (se houver)',
    example: 'ativo',
    nullable: true,
  })
  statusUltimaConcessao: string | null;
}

/**
 * DTO para resposta completa da verificação de disponibilidade
 */
export class VerificarDisponibilidadeBeneficioResponseDto {
  @ApiProperty({
    description: 'ID do cidadão consultado',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  cidadaoId: string;

  @ApiProperty({
    description: 'Data e hora da consulta',
    example: '2024-01-15T10:30:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  dataConsulta: Date;

  @ApiProperty({
    description: 'Total de benefícios disponíveis',
    example: 3,
    type: 'number',
  })
  totalBeneficios: number;

  @ApiProperty({
    description: 'Quantidade de benefícios disponíveis para solicitação',
    example: 2,
    type: 'number',
  })
  beneficiosDisponiveis: number;

  @ApiProperty({
    description: 'Quantidade de benefícios indisponíveis',
    example: 1,
    type: 'number',
  })
  beneficiosIndisponiveis: number;

  @ApiProperty({
    description: 'Lista detalhada de todos os benefícios e sua disponibilidade',
    type: [DisponibilidadeBeneficioDto],
  })
  beneficios: DisponibilidadeBeneficioDto[];

  @ApiProperty({
    description: 'Resumo por categoria',
    example: {
      natalidade: { total: 2, disponiveis: 1, indisponiveis: 1 },
      morte: { total: 1, disponiveis: 1, indisponiveis: 0 },
    },
  })
  resumoPorCategoria: Record<string, {
    total: number;
    disponiveis: number;
    indisponiveis: number;
  }>;
}