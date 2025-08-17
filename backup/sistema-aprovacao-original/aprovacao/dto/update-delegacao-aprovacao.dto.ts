import { PartialType } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  MaxLength,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateDelegacaoAprovacaoDto } from './create-delegacao-aprovacao.dto';
import { UPDATE } from '../../../shared/validators/validation-groups';

/**
 * DTO para atualização de delegação de aprovação
 *
 * Estende o DTO de criação tornando todos os campos opcionais
 * e adiciona campos específicos para atualização.
 */
export class UpdateDelegacaoAprovacaoDto extends PartialType(
  CreateDelegacaoAprovacaoDto,
) {
  @ApiPropertyOptional({
    description: 'Motivo da atualização',
    example: 'Extensão do período de delegação',
  })
  @IsOptional({ groups: [UPDATE] })
  @IsString({
    message: 'O motivo da atualização deve ser uma string',
    groups: [UPDATE],
  })
  @MaxLength(500, {
    message: 'O motivo da atualização deve ter no máximo 500 caracteres',
    groups: [UPDATE],
  })
  motivo_atualizacao?: string;

  @ApiPropertyOptional({
    description: 'Data da última modificação',
    example: '2023-01-15T10:30:00Z',
  })
  @IsOptional({ groups: [UPDATE] })
  @IsDateString(
    {},
    {
      message: 'A data de modificação deve estar em formato ISO',
      groups: [UPDATE],
    },
  )
  data_modificacao?: Date;

  @ApiPropertyOptional({
    description: 'Se a delegação foi cancelada',
    example: false,
  })
  @IsOptional({ groups: [UPDATE] })
  @IsBoolean({
    message: 'O campo cancelado deve ser um booleano',
    groups: [UPDATE],
  })
  cancelado?: boolean;

  @ApiPropertyOptional({
    description: 'Motivo do cancelamento (se aplicável)',
    example: 'Retorno antecipado do aprovador titular',
  })
  @IsOptional({ groups: [UPDATE] })
  @IsString({
    message: 'O motivo do cancelamento deve ser uma string',
    groups: [UPDATE],
  })
  @MaxLength(500, {
    message: 'O motivo do cancelamento deve ter no máximo 500 caracteres',
    groups: [UPDATE],
  })
  motivo_cancelamento?: string;
}