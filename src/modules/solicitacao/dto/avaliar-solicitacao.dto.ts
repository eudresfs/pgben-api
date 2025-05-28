import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsBoolean,
  IsOptional,
  IsArray,
} from 'class-validator';

/**
 * DTO para avaliação de solicitação
 *
 * Utilizado para aprovar ou pendenciar solicitações de benefícios
 */
export class AvaliarSolicitacaoDto {
  @ApiProperty({
    description: 'Indica se a solicitação foi aprovada',
    example: true,
  })
  @IsNotEmpty({ message: 'Decisão de aprovação é obrigatória' })
  @IsBoolean({ message: 'Aprovado deve ser um booleano' })
  aprovado: boolean;

  @ApiProperty({
    description: 'Parecer técnico sobre a solicitação',
    example:
      'Solicitação aprovada conforme análise da documentação e verificação dos critérios de elegibilidade.',
  })
  @IsNotEmpty({ message: 'Parecer é obrigatório' })
  @IsString({ message: 'Parecer deve ser um texto' })
  parecer: string;

  @ApiPropertyOptional({
    description: 'Lista de pendências (caso a solicitação não seja aprovada)',
    example: [
      'Comprovante de residência desatualizado',
      'Necessário apresentar declaração de renda',
    ],
  })
  @IsOptional()
  @IsArray({ message: 'Pendências deve ser um array' })
  @IsString({ each: true, message: 'Cada pendência deve ser um texto' })
  pendencias?: string[];
}