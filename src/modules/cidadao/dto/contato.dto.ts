import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  ValidateIf,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para criação e atualização de contato
 */
export class ContatoDto {
  @ApiProperty({
    description: 'ID do contato (apenas para atualização)',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({
    description: 'ID do cidadão',
    required: true,
  })
  @IsUUID()
  @IsNotEmpty({ message: 'ID do cidadão é obrigatório' })
  cidadao_id: string;

  @ApiProperty({
    description: 'Telefone no formato nacional (apenas dígitos)',
    required: false,
    example: '11999998888',
  })
  @IsOptional()
  @Length(10, 15, { message: 'Telefone deve ter entre 10 e 15 dígitos' })
  telefone?: string;

  @ApiProperty({
    description: 'Indica se o telefone é WhatsApp',
    required: false,
    default: false,
  })
  @IsBoolean()
  @ValidateIf((o) => o.telefone)
  is_whatsapp?: boolean;

  @ApiProperty({
    description: 'Indica se o proprietário do telefone possui smartphone',
    required: false,
    default: false,
  })
  @IsBoolean()
  @ValidateIf((o) => o.telefone)
  possui_smartphone?: boolean;

  @ApiProperty({
    description: 'Email de contato',
    required: false,
    example: 'email@exemplo.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Email inválido' })
  email?: string;

  @ApiProperty({
    description: 'Username/handle do Instagram',
    required: false,
  })
  @IsOptional()
  instagram?: string;

  @ApiProperty({
    description: 'Username/handle do Facebook',
    required: false,
  })
  @IsOptional()
  facebook?: string;

  @ApiProperty({
    description: 'Se o contato pertence ao próprio beneficiário',
    required: false,
    default: true,
  })
  @IsBoolean()
  proprietario?: boolean;

  @ApiProperty({
    description: 'Nome do contato quando não é o próprio beneficiário',
    required: false,
  })
  @ValidateIf((o) => o.proprietario === false)
  @IsNotEmpty({ message: 'Nome do contato é obrigatório se não for o proprietário' })
  @IsString()
  nome_contato?: string;

  @ApiProperty({
    description: 'Grau de parentesco do contato com o beneficiário',
    required: false,
  })
  @IsOptional()
  grau_parentesco?: string;
}
