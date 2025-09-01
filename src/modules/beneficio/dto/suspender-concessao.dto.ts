import { IsOptional, IsString, MaxLength, IsNotEmpty } from 'class-validator';
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
  @IsString({
    message: 'Data de revisão deve ser uma string no formato YYYY-MM-DD',
  })
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

export class CessarConcessaoDto {
  @ApiProperty({
    description: 'Motivo do cancelamento',
    example: 'Beneficiário não atende mais aos critérios de elegibilidade',
  })
  @IsString({ message: 'Motivo deve ser uma string' })
  @IsNotEmpty({ message: 'Motivo do cancelamento é obrigatório' })
  @MaxLength(500, { message: 'Motivo deve ter no máximo 500 caracteres' })
  motivo: string;

  @ApiProperty({
    description: 'Observações adicionais sobre o cancelamento',
    example: 'Documentação comprobatória anexada ao processo',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Observações devem ser uma string' })
  @MaxLength(1000, {
    message: 'Observações devem ter no máximo 1000 caracteres',
  })
  observacoes?: string;
}
