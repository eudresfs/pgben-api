import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsNotEmpty, 
  IsString, 
  IsEnum, 
  IsBoolean, 
  IsOptional,
  IsNumber,
  Min,
  ValidateNested,
  IsObject
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipoDado } from '../entities/campo-dinamico-beneficio.entity';

/**
 * DTO para validações de campos dinâmicos
 */
export class ValidacoesCampoDinamicoDto {
  @ApiPropertyOptional({ description: 'Valor mínimo para campos numéricos ou tamanho mínimo para strings e arrays' })
  @IsOptional()
  @IsNumber({}, { message: 'Valor mínimo deve ser um número' })
  minLength?: number;

  @ApiPropertyOptional({ description: 'Valor máximo para campos numéricos ou tamanho máximo para strings e arrays' })
  @IsOptional()
  @IsNumber({}, { message: 'Valor máximo deve ser um número' })
  maxLength?: number;

  @ApiPropertyOptional({ description: 'Valor mínimo para campos numéricos ou data mínima para campos de data' })
  @IsOptional()
  min?: number | string;

  @ApiPropertyOptional({ description: 'Valor máximo para campos numéricos ou data máxima para campos de data' })
  @IsOptional()
  max?: number | string;

  @ApiPropertyOptional({ description: 'Expressão regular para validação de strings' })
  @IsOptional()
  @IsString({ message: 'Padrão deve ser uma string' })
  pattern?: string;

  @ApiPropertyOptional({ description: 'Lista de valores permitidos para o campo' })
  @IsOptional()
  enum?: string[];

  @ApiPropertyOptional({ description: 'Formato específico para validação (ex: email, cpf, cep)' })
  @IsOptional()
  @IsString({ message: 'Formato deve ser uma string' })
  format?: string;
}

/**
 * DTO para criação de campo dinâmico
 */
export class CreateCampoDinamicoDto {
  @ApiProperty({ description: 'Label do campo (texto exibido para o usuário)', example: 'CPF do Beneficiário' })
  @IsNotEmpty({ message: 'Label é obrigatório' })
  @IsString({ message: 'Label deve ser um texto' })
  label: string;

  @ApiProperty({ description: 'Nome do campo (identificador usado no código)', example: 'cpf_beneficiario' })
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @IsString({ message: 'Nome deve ser um texto' })
  nome: string;

  @ApiProperty({ 
    description: 'Tipo de dado do campo', 
    enum: TipoDado,
    example: TipoDado.STRING
  })
  @IsNotEmpty({ message: 'Tipo é obrigatório' })
  @IsEnum(TipoDado, { message: 'Tipo inválido' })
  tipo: TipoDado;

  @ApiProperty({ description: 'Indica se o campo é obrigatório', default: false })
  @IsBoolean({ message: 'Obrigatório deve ser um booleano' })
  obrigatorio: boolean;

  @ApiPropertyOptional({ description: 'Descrição detalhada do campo' })
  @IsOptional()
  @IsString({ message: 'Descrição deve ser um texto' })
  descricao?: string;

  @ApiPropertyOptional({ description: 'Validações específicas para o campo' })
  @IsOptional()
  @IsObject({ message: 'Validações deve ser um objeto' })
  @ValidateNested()
  @Type(() => ValidacoesCampoDinamicoDto)
  validacoes?: ValidacoesCampoDinamicoDto;

  @ApiPropertyOptional({ description: 'Ordem de exibição do campo', default: 1 })
  @IsOptional()
  @IsNumber({}, { message: 'Ordem deve ser um número' })
  @Min(1, { message: 'Ordem deve ser maior que zero' })
  ordem?: number;

  @ApiPropertyOptional({ description: 'Indica se o campo está ativo', default: true })
  @IsOptional()
  @IsBoolean({ message: 'Ativo deve ser um booleano' })
  ativo?: boolean;
}
