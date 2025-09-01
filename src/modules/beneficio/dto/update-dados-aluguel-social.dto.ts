import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsArray,
  IsString,
  IsNumber,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  PublicoPrioritarioAluguel,
  EspecificacaoAluguel,
} from '../../../enums';

/**
 * DTO para atualização de dados específicos do cidadão para Aluguel Social
 */
export class UpdateDadosAluguelSocialDto {
  @ApiPropertyOptional({
    description: 'Público prioritário para o aluguel social',
    enum: PublicoPrioritarioAluguel,
    example: PublicoPrioritarioAluguel.FAMILIAS_GESTANTES_NUTRIZES,
  })
  @IsOptional()
  @IsEnum(PublicoPrioritarioAluguel, {
    message: 'Público prioritário inválido',
  })
  publico_prioritario?: PublicoPrioritarioAluguel;

  @ApiPropertyOptional({
    description: 'Especificações do aluguel social',
    enum: EspecificacaoAluguel,
    isArray: true,
    example: [EspecificacaoAluguel.TRABALHO_INFANTIL],
  })
  @IsOptional()
  @IsArray({ message: 'Especificações devem ser um array' })
  @IsEnum(EspecificacaoAluguel, {
    each: true,
    message: 'Especificação inválida',
  })
  especificacoes?: EspecificacaoAluguel[];

  @ApiPropertyOptional({
    description: 'Situação da moradia atual',
    example: 'Moradia em área de risco',
  })
  @IsOptional()
  @IsString({ message: 'Situação da moradia atual deve ser uma string' })
  situacao_moradia_atual?: string;

  @ApiPropertyOptional({
    description: 'Indica se possui imóvel interditado',
    example: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Possui imóvel interditado deve ser um booleano' })
  possui_imovel_interditado?: boolean;

  @ApiPropertyOptional({
    description: 'Observações adicionais',
    example: 'Família em situação de vulnerabilidade',
  })
  @IsOptional()
  @IsString({ message: 'Observações devem ser uma string' })
  observacoes?: string;

  @ApiPropertyOptional({
    description: 'Valor do aluguel pretendido',
    example: 'R$ 800,00',
  })
  @IsOptional()
  @IsString({ message: 'Valor do aluguel pretendido deve ser uma string' })
  valor_aluguel_pretendido?: string;

  @ApiPropertyOptional({
    description: 'Endereço do imóvel pretendido',
    example: 'Rua das Flores, 123 - Centro',
  })
  @IsOptional()
  @IsString({ message: 'Endereço do imóvel pretendido deve ser uma string' })
  endereco_imovel_pretendido?: string;

  @ApiPropertyOptional({
    description: 'Nome do locador',
    example: 'João Silva',
  })
  @IsOptional()
  @IsString({ message: 'Nome do locador deve ser uma string' })
  nome_locador?: string;

  @ApiPropertyOptional({
    description: 'CPF do locador',
    example: '123.456.789-00',
  })
  @IsOptional()
  @IsString({ message: 'CPF do locador deve ser uma string' })
  @Matches(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, {
    message: 'CPF do locador deve estar no formato XXX.XXX.XXX-XX',
  })
  cpf_locador?: string;

  @ApiPropertyOptional({
    description: 'Telefone do locador',
    example: '(11) 99999-9999',
  })
  @IsOptional()
  @IsString({ message: 'Telefone do locador deve ser uma string' })
  @Matches(/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/, {
    message: 'Telefone do locador deve estar em formato válido',
  })
  telefone_locador?: string;



  @ApiPropertyOptional({
    description: 'Determinação judicial',
    example: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Determinação judicial deve ser um booleano' })
  determinacao_judicial?: boolean;
}