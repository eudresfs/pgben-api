import {
  IsNotEmpty,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { EnderecoBodyDto } from './endereco-body.dto';

/**
 * DTO para transferência de cidadão para outra unidade
 * Permite alterar a unidade do cidadão e opcionalmente registrar novo endereço
 */
export class TransferirUnidadeDto {
  @ApiProperty({
    description: 'ID da nova unidade para onde o cidadão será transferido',
    required: true,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsNotEmpty({ message: 'ID da unidade é obrigatório' })
  @IsUUID('4', { message: 'ID da unidade deve ser um UUID válido' })
  unidade_id: string;

  @ApiPropertyOptional({
    description: 'Novo endereço do cidadão (opcional)',
    type: EnderecoBodyDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => EnderecoBodyDto)
  endereco?: EnderecoBodyDto;

  @ApiPropertyOptional({
    description: 'Motivo da transferência',
    example: 'Mudança de residência',
  })
  @IsOptional()
  motivo?: string;
}
