import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SuspenderConcessaoDto {
  @ApiProperty({
    description: 'Motivo da suspensão',
    example: 'Descumprimento de condicionalidades do programa',
  })
  @IsString({ message: 'Motivo deve ser uma string' })
  @MaxLength(500, { message: 'Motivo deve ter no máximo 500 caracteres' })
  motivo: string;

  @ApiProperty({
    description: 'Data prevista para revisão da suspensão',
    example: '2025-03-01',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Data de revisão deve ser uma string no formato YYYY-MM-DD' })
  data_revisao?: string;
}

export class BloquearConcessaoDto {
  @ApiProperty({
    description: 'Motivo do bloqueio',
    example: 'Suspeita de irregularidade nos documentos apresentados',
  })
  @IsString({ message: 'Motivo deve ser uma string' })
  @MaxLength(500, { message: 'Motivo deve ter no máximo 500 caracteres' })
  motivo: string;
}

export class DesbloquearConcessaoDto {
  @ApiProperty({
    description: 'Motivo do desbloqueio',
    example: 'Documentação regularizada e verificada',
  })
  @IsString({ message: 'Motivo deve ser uma string' })
  @MaxLength(500, { message: 'Motivo deve ter no máximo 500 caracteres' })
  motivo: string;
}

export class CancelarConcessaoDto {
  @ApiProperty({
    description: 'Motivo do cancelamento',
    example: 'Beneficiário não atende mais aos critérios de elegibilidade',
  })
  @IsString({ message: 'Motivo deve ser uma string' })
  @MaxLength(500, { message: 'Motivo deve ter no máximo 500 caracteres' })
  motivo: string;
}