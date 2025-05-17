import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipoPapel } from '../entities/papel-cidadao.entity';

/**
 * DTO para criação de papel de cidadão
 *
 * Contém os dados necessários para atribuir um papel específico a um cidadão
 */
export class CreatePapelCidadaoDto {
  @IsEnum(TipoPapel, { message: 'Tipo de papel inválido' })
  @IsNotEmpty({ message: 'Tipo de papel é obrigatório' })
  @ApiProperty({
    enum: TipoPapel,
    example: TipoPapel.BENEFICIARIO,
    description: 'Tipo de papel que o cidadão irá assumir',
  })
  tipo_papel: TipoPapel;

  @IsUUID('4', { message: 'ID do cidadão deve ser um UUID válido' })
  @IsNotEmpty({ message: 'ID do cidadão é obrigatório' })
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID do cidadão que receberá o papel',
  })
  cidadao_id: string;

  @IsOptional()
  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    example: {
      grau_parentesco: 'Mãe',
      documento_representacao: '12345',
      data_validade_representacao: '2026-01-01',
    },
    description:
      'Metadados específicos do papel (varia conforme o tipo de papel)',
  })
  metadados?: {
    grau_parentesco?: string;
    documento_representacao?: string;
    data_validade_representacao?: Date;
    [key: string]: any;
  };

  @ValidateIf((o) => o.tipo_papel === TipoPapel.REPRESENTANTE_LEGAL)
  @IsString({
    message:
      'Documento de representação é obrigatório para representantes legais',
  })
  @IsNotEmpty({
    message:
      'Documento de representação é obrigatório para representantes legais',
  })
  'metadados.documento_representacao'?: string;

  @ValidateIf((o) => o.tipo_papel === TipoPapel.REPRESENTANTE_LEGAL)
  @IsDate({
    message: 'Data de validade da representação deve ser uma data válida',
  })
  @Type(() => Date)
  @IsNotEmpty({
    message:
      'Data de validade da representação é obrigatória para representantes legais',
  })
  'metadados.data_validade_representacao'?: Date;

  @ValidateIf((o) => o.tipo_papel === TipoPapel.REQUERENTE)
  @IsString({ message: 'Grau de parentesco deve ser uma string' })
  @IsNotEmpty({ message: 'Grau de parentesco é obrigatório para requerentes' })
  'metadados.grau_parentesco'?: string;
}
