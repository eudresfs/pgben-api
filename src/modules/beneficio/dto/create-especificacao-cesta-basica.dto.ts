import {
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsUUID,
  IsEnum,
  IsString,
  IsArray,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { TipoEntregaCestaBasica, PeriodicidadeCestaBasica, PeriodicidadeEntrega } from '../entities/especificacao-cesta-basica.entity';

/**
 * DTO para criação de especificações da Cesta Básica
 */
export class CreateEspecificacaoCestaBasicaDto {
  @ApiProperty({
    description: 'ID do tipo de benefício',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsNotEmpty({ message: 'O ID do tipo de benefício é obrigatório' })
  @IsUUID('4', { message: 'O ID do tipo de benefício deve ser um UUID válido' })
  tipo_beneficio_id: string;

  @ApiProperty({
    description: 'Tipo de entrega da cesta básica',
    enum: TipoEntregaCestaBasica,
    example: TipoEntregaCestaBasica.PRESENCIAL,
    default: TipoEntregaCestaBasica.PRESENCIAL,
  })
  @IsEnum(TipoEntregaCestaBasica, { message: 'O tipo de entrega deve ser válido' })
  tipo_entrega: TipoEntregaCestaBasica;

  @ApiProperty({
    description: 'Periodicidade da entrega da cesta básica (legado)',
    enum: PeriodicidadeCestaBasica,
    example: PeriodicidadeCestaBasica.UNICA,
    default: PeriodicidadeCestaBasica.UNICA,
  })
  @IsEnum(PeriodicidadeCestaBasica, { message: 'A periodicidade deve ser válida' })
  periodicidade_cesta: PeriodicidadeCestaBasica;
  
  @ApiProperty({
    description: 'Periodicidade da entrega',
    enum: PeriodicidadeEntrega,
    example: PeriodicidadeEntrega.UNICA,
    default: PeriodicidadeEntrega.UNICA,
  })
  @IsEnum(PeriodicidadeEntrega, { message: 'A periodicidade de entrega deve ser válida' })
  periodicidade: PeriodicidadeEntrega;

  @ApiProperty({
    description: 'Quantidade total de entregas',
    example: 3,
    default: 1,
  })
  @IsNumber({}, { message: 'A quantidade de entregas deve ser um número' })
  @Min(1, { message: 'A quantidade de entregas deve ser maior que zero' })
  @Transform(({ value }) => Number(value))
  quantidade_entregas: number;

  @ApiProperty({
    description: 'Indica se o benefício exige comprovante de residência',
    example: true,
    default: false,
  })
  @IsBoolean({ message: 'O campo exige comprovante de residência deve ser um booleano' })
  @Transform(({ value }) => value === 'true' || value === true || value === 1)
  exige_comprovante_residencia: boolean;

  @ApiProperty({
    description: 'Indica se o benefício requer comprovante de renda',
    example: true,
    default: true,
  })
  @IsBoolean({ message: 'O campo requer comprovante de renda deve ser um booleano' })
  @Transform(({ value }) => value === 'true' || value === true || value === 1)
  requer_comprovante_renda: boolean;

  @ApiProperty({
    description: 'Renda máxima per capita permitida',
    example: 500.00,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'A renda máxima per capita deve ser um número' })
  @Min(0, { message: 'A renda máxima per capita deve ser maior ou igual a zero' })
  @Transform(({ value }) => value ? Number(value) : null)
  renda_maxima_per_capita?: number;

  @ApiProperty({
    description: 'Quantidade mínima de dependentes',
    example: 2,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'A quantidade mínima de dependentes deve ser um número' })
  @Min(0, { message: 'A quantidade mínima de dependentes deve ser maior ou igual a zero' })
  @Transform(({ value }) => value ? Number(value) : null)
  quantidade_minima_dependentes?: number;

  @ApiProperty({
    description: 'Indica se o benefício prioriza famílias com crianças',
    example: true,
    default: false,
  })
  @IsBoolean({ message: 'O campo prioriza famílias com crianças deve ser um booleano' })
  @Transform(({ value }) => value === 'true' || value === true || value === 1)
  prioriza_familias_com_criancas: boolean;

  @ApiProperty({
    description: 'Indica se o benefício prioriza idosos',
    example: true,
    default: false,
  })
  @IsBoolean({ message: 'O campo prioriza idosos deve ser um booleano' })
  @Transform(({ value }) => value === 'true' || value === true || value === 1)
  prioriza_idosos: boolean;

  @ApiProperty({
    description: 'Indica se o benefício prioriza pessoas com deficiência',
    example: true,
    default: false,
  })
  @IsBoolean({ message: 'O campo prioriza pessoas com deficiência deve ser um booleano' })
  @Transform(({ value }) => value === 'true' || value === true || value === 1)
  prioriza_pcd: boolean;

  @ApiProperty({
    description: 'Valor da cesta básica',
    example: 150.00,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'O valor da cesta deve ser um número' })
  @Min(0, { message: 'O valor da cesta deve ser maior ou igual a zero' })
  @Transform(({ value }) => value ? Number(value) : null)
  valor_cesta?: number;

  @ApiProperty({
    description: 'Lista de itens obrigatórios na cesta básica',
    example: ['Arroz', 'feijão', 'açúcar', 'sal', 'óleo', 'macarrão'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'Os itens obrigatórios devem ser um array de strings' })
  itens_obrigatorios?: string[];
  
  @ApiProperty({
    description: 'Lista de itens opcionais na cesta básica',
    example: ['Café', 'Biscoito', 'Leite em pó'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'Os itens opcionais devem ser um array de strings' })
  itens_opcionais?: string[];

  @ApiProperty({
    description: 'Indica se o benefício permite substituição de itens',
    example: false,
    default: false,
  })
  @IsBoolean({ message: 'O campo permite substituição de itens deve ser um booleano' })
  @Transform(({ value }) => value === 'true' || value === true || value === 1)
  permite_substituicao_itens: boolean;
  
  @ApiProperty({
    description: 'Local de entrega da cesta básica',
    example: 'Centro de Assistência Social - Rua Principal, 123',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'O local de entrega deve ser uma string' })
  local_entrega?: string;
  
  @ApiProperty({
    description: 'Horário de entrega da cesta básica',
    example: 'Segunda a sexta, das 8h às 17h',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'O horário de entrega deve ser uma string' })
  horario_entrega?: string;
  
  @ApiProperty({
    description: 'Indica se o benefício exige agendamento prévio',
    example: false,
    default: false,
  })
  @IsBoolean({ message: 'O campo exige agendamento deve ser um booleano' })
  @Transform(({ value }) => value === 'true' || value === true || value === 1)
  exige_agendamento: boolean;
  
  @ApiProperty({
    description: 'Indica se o benefício exige comprovação de vulnerabilidade',
    example: false,
    default: false,
  })
  @IsBoolean({ message: 'O campo exige comprovação de vulnerabilidade deve ser um booleano' })
  @Transform(({ value }) => value === 'true' || value === true || value === 1)
  exige_comprovacao_vulnerabilidade: boolean;
}
