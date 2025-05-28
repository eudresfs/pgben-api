import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsDate,
  IsNumber,
  IsEnum,
  Length,
  Min,
  Validate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EscolaridadeEnum } from '../enums/escolaridade.enum';
import { Column } from 'typeorm';
import { Parentesco } from '../enums/parentesco.enum';
import { CPFValidator } from '../validators/cpf-validator';

/**
 * DTO para adicionar membro à composição familiar
 */
export class CreateComposicaoFamiliarDto {
  @IsString({ message: 'Nome deve ser uma string' })
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @ApiProperty({
    example: 'João da Silva',
    description: 'Nome completo do membro familiar',
  })
  nome: string;

  @Column({ nullable: false })
  @IsNotEmpty({ message: 'CPF é obrigatório' })
  @Length(11, 14, { message: 'CPF deve ter entre 11 e 14 caracteres' })
  @Validate(CPFValidator, { message: 'CPF inválido' })
  cpf: string;

  @Column({ nullable: true })
  @IsNotEmpty({ message: 'NIS do parente é obrigatório' })
  nis: string;

  @Column('integer')
  @IsNotEmpty({ message: 'Idade do parente é obrigatório' })
  @IsNumber({}, { message: 'Idade deve ser um número' })
  @Min(0, { message: 'Idade não pode ser negativa' })
  idade: number;

  @Column()
  @IsString({ message: 'Ocupação deve ser uma string' })
  @IsNotEmpty({ message: 'Ocupação é obrigatória' })
  ocupacao: string;

  @Column({
    type: 'enum',
    enum: EscolaridadeEnum,
    enumName: 'escolaridade_enum',
    nullable: false,
  })
  @IsNotEmpty({ message: 'Escolaridade é obrigatória' })
  @IsEnum(EscolaridadeEnum, { message: 'Escolaridade inválida' })
  escolaridade: EscolaridadeEnum;

  @Column({
    type: 'enum',
    enum: Parentesco,
    enumName: 'parentesco',
    default: Parentesco.OUTRO,
  })
  @IsNotEmpty({ message: 'Parentesco é obrigatório' })
  parentesco: Parentesco;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Renda deve ser um número' })
  @Min(0, { message: 'Renda não pode ser negativa' })
  renda: number;

  @Column({ nullable: true })
  @IsOptional()
  observacoes: string;
}
