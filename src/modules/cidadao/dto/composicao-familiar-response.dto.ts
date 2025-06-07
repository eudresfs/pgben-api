import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import {
  IsUUID,
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsDate,
} from 'class-validator';
import { EscolaridadeEnum } from '../../../enums/escolaridade.enum';
import { ParentescoEnum } from '../../../enums/parentesco.enum';

/**
 * DTO de resposta para membro da composição familiar
 *
 * Define a estrutura de dados retornada nas consultas de membros da composição familiar,
 * incluindo campos calculados e formatação adequada para o frontend.
 */
export class ComposicaoFamiliarResponseDto {
  @ApiProperty({
    description: 'ID único do membro da composição familiar',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  @IsUUID()
  id: string;

  @ApiProperty({
    description: 'ID do cidadão responsável',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  @IsUUID()
  cidadao_id: string;

  @ApiProperty({
    description: 'Nome completo do membro familiar',
    example: 'João da Silva',
  })
  @Expose()
  @IsString()
  nome: string;

  @ApiProperty({
    description: 'CPF do membro familiar (apenas números)',
    example: '12345678901',
  })
  @Expose()
  @IsString()
  @Transform(({ value }) => value?.replace(/\D/g, '') || '')
  cpf: string;

  @ApiProperty({
    description: 'CPF formatado para exibição',
    example: '123.456.789-01',
  })
  @Expose()
  @Transform(({ obj }) => {
    const cpf = obj.cpf?.replace(/\D/g, '') || '';
    if (cpf.length === 11) {
      return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return cpf;
  })
  cpf_formatado: string;

  @ApiProperty({
    description: 'NIS do membro familiar',
    example: '12345678901',
    required: false,
  })
  @Expose()
  @IsOptional()
  @IsString()
  nis?: string;

  @ApiProperty({
    description: 'Idade do membro familiar',
    example: 25,
  })
  @Expose()
  @IsNumber()
  idade: number;

  @ApiProperty({
    description: 'Ocupação do membro familiar',
    example: 'Estudante',
  })
  @Expose()
  @IsString()
  ocupacao: string;

  @ApiProperty({
    description: 'Nível de escolaridade',
    enum: EscolaridadeEnum,
    example: EscolaridadeEnum.MEDIO_COMPLETO,
  })
  @Expose()
  @IsEnum(EscolaridadeEnum)
  escolaridade: EscolaridadeEnum;

  @ApiProperty({
    description: 'Descrição da escolaridade',
    example: 'Ensino Médio Completo',
  })
  @Expose()
  @Transform(({ value }) => {
    const escolaridadeMap = {
      [EscolaridadeEnum.ANALFABETO]: 'Analfabeto',
      [EscolaridadeEnum.FUNDAMENTAL_INCOMPLETO]:
        'Ensino Fundamental Incompleto',
      [EscolaridadeEnum.FUNDAMENTAL_COMPLETO]: 'Ensino Fundamental Completo',
      [EscolaridadeEnum.MEDIO_INCOMPLETO]: 'Ensino Médio Incompleto',
      [EscolaridadeEnum.MEDIO_COMPLETO]: 'Ensino Médio Completo',
      [EscolaridadeEnum.SUPERIOR_INCOMPLETO]: 'Ensino Superior Incompleto',
      [EscolaridadeEnum.SUPERIOR_COMPLETO]: 'Ensino Superior Completo',
      [EscolaridadeEnum.POS_GRADUACAO]: 'Pós-graduação',
    };
    return escolaridadeMap[value] || value;
  })
  escolaridade_descricao: string;

  @ApiProperty({
    description: 'Grau de parentesco',
    enum: ParentescoEnum,
    example: ParentescoEnum.FILHO,
  })
  @Expose()
  @IsEnum(ParentescoEnum)
  parentesco: ParentescoEnum;

  @ApiProperty({
    description: 'Descrição do parentesco',
    example: 'Filho(a)',
  })
  @Expose()
  @Transform(({ value }) => {
    const parentescoMap = {
      [ParentescoEnum.CONJUGE]: 'Cônjuge',
      [ParentescoEnum.FILHO]: 'Filho(a)',
      [ParentescoEnum.PAI]: 'Pai',
      [ParentescoEnum.MAE]: 'Mãe',
      [ParentescoEnum.IRMAO]: 'Irmão/Irmã',
      [ParentescoEnum.AVO]: 'Avô/Avó',
      [ParentescoEnum.NETO]: 'Neto(a)',
      [ParentescoEnum.TIO]: 'Tio(a)',
      [ParentescoEnum.SOBRINHO]: 'Sobrinho(a)',
      [ParentescoEnum.OUTRO]: 'Outro',
    };
    return parentescoMap[value] || value;
  })
  parentesco_descricao: string;

  @ApiProperty({
    description: 'Renda mensal do membro familiar',
    example: 1500.0,
    required: false,
  })
  @Expose()
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value ? parseFloat(value) : null))
  renda?: number;

  @ApiProperty({
    description: 'Renda formatada para exibição',
    example: 'R$ 1.500,00',
    required: false,
  })
  @Expose()
  @Transform(({ obj }) => {
    if (!obj.renda) {return null;}
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(obj.renda);
  })
  renda_formatada?: string;

  @ApiProperty({
    description: 'Observações sobre o membro familiar',
    example: 'Estudante universitário',
    required: false,
  })
  @Expose()
  @IsOptional()
  @IsString()
  observacoes?: string;

  @ApiProperty({
    description: 'Data de criação do registro',
    example: '2024-01-15T10:30:00Z',
  })
  @Expose()
  @IsDate()
  @Type(() => Date)
  created_at: Date;

  @ApiProperty({
    description: 'Data da última atualização',
    example: '2024-01-15T10:30:00Z',
  })
  @Expose()
  @IsDate()
  @Type(() => Date)
  updated_at: Date;

  @ApiProperty({
    description: 'Indica se o membro está ativo (não removido)',
    example: true,
  })
  @Expose()
  @Transform(({ obj }) => !obj.removed_at)
  ativo: boolean;
}

/**
 * DTO de resposta paginada para composição familiar
 *
 * Estrutura padrão para retorno de listas paginadas de membros da composição familiar.
 */
export class ComposicaoFamiliarPaginatedResponseDto {
  @ApiProperty({
    description: 'Lista de membros da composição familiar',
    type: [ComposicaoFamiliarResponseDto],
  })
  @Expose()
  @Type(() => ComposicaoFamiliarResponseDto)
  data: ComposicaoFamiliarResponseDto[];

  @ApiProperty({
    description: 'Metadados de paginação',
    example: {
      total: 50,
      page: 1,
      limit: 10,
      totalPages: 5,
      hasNext: true,
      hasPrev: false,
    },
  })
  @Expose()
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };

  @ApiProperty({
    description: 'Estatísticas da composição familiar',
    example: {
      totalMembros: 4,
      rendaTotal: 3500.0,
      rendaMedia: 875.0,
      idadeMedia: 28.5,
      membrosComRenda: 2,
    },
    required: false,
  })
  @Expose()
  @IsOptional()
  estatisticas?: {
    totalMembros: number;
    rendaTotal: number;
    rendaMedia: number;
    idadeMedia: number;
    membrosComRenda: number;
  };
}
