import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para dados dinâmicos de solicitação de benefício
 *
 * Este objeto será validado dinamicamente conforme o schema definido
 * para o tipo de benefício específico.
 */
export class DadosDinamicosDto {
  [key: string]: any;
}

/**
 * DTO para criação de solicitação de benefício
 *
 * Inclui suporte para campos dinâmicos específicos de cada tipo de benefício.
 */
export class CreateSolicitacaoBeneficioDto {
  @ApiProperty({
    description: 'ID do cidadão solicitante',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty({ message: 'ID do cidadão é obrigatório' })
  @IsUUID('4', { message: 'ID do cidadão deve ser um UUID válido' })
  cidadao_id: string;

  @ApiProperty({
    description: 'ID do tipo de benefício solicitado',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsNotEmpty({ message: 'ID do tipo de benefício é obrigatório' })
  @IsUUID('4', { message: 'ID do tipo de benefício deve ser um UUID válido' })
  tipo_beneficio_id: string;

  @ApiPropertyOptional({
    description: 'Observações sobre a solicitação',
  })
  @IsOptional()
  @IsString({ message: 'Observações deve ser um texto' })
  observacoes?: string;

  @ApiProperty({
    description: 'Dados dinâmicos específicos do tipo de benefício',
    type: 'object',
    additionalProperties: true,
    example: {
      renda_familiar: 1500,
      tempo_residencia: 24,
      possui_dependentes: true,
      numero_dependentes: 2,
    },
  })
  @IsObject({ message: 'Dados dinâmicos deve ser um objeto' })
  @ValidateNested()
  @Type(() => DadosDinamicosDto)
  dados_dinamicos: DadosDinamicosDto;
}
