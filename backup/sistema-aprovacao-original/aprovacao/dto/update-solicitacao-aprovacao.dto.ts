import { PartialType } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  IsObject,
  IsDateString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateSolicitacaoAprovacaoDto } from './create-solicitacao-aprovacao.dto';
import {
  StatusSolicitacaoAprovacao,
  PrioridadeAprovacao,
} from '../enums/aprovacao.enums';
import { UPDATE } from '../../../shared/validators/validation-groups';

/**
 * DTO para atualização de solicitação de aprovação
 *
 * Estende o DTO de criação tornando todos os campos opcionais
 * e adiciona campos específicos para atualização.
 */
export class UpdateSolicitacaoAprovacaoDto extends PartialType(
  CreateSolicitacaoAprovacaoDto,
) {
  @ApiPropertyOptional({
    description: 'Status da solicitação',
    enum: StatusSolicitacaoAprovacao,
    example: StatusSolicitacaoAprovacao.EM_ANALISE,
  })
  @IsOptional({ groups: [UPDATE] })
  @IsEnum(StatusSolicitacaoAprovacao, {
    message: 'Status inválido',
    groups: [UPDATE],
  })
  status?: StatusSolicitacaoAprovacao;

  @ApiPropertyOptional({
    description: 'Motivo da última atualização',
    example: 'Solicitação aprovada pelo gestor',
  })
  @IsOptional({ groups: [UPDATE] })
  @IsString({
    message: 'O motivo deve ser uma string',
    groups: [UPDATE],
  })
  @MaxLength(500, {
    message: 'O motivo deve ter no máximo 500 caracteres',
    groups: [UPDATE],
  })
  motivo_atualizacao?: string;

  @ApiPropertyOptional({
    description: 'Dados da decisão (aprovação/rejeição)',
    example: {
      aprovador_id: '123e4567-e89b-12d3-a456-426614174000',
      data_decisao: '2023-01-01T12:00:00Z',
      observacoes: 'Aprovado conforme política',
    },
  })
  @IsOptional({ groups: [UPDATE] })
  @IsObject({
    message: 'Os dados da decisão devem ser um objeto',
    groups: [UPDATE],
  })
  dados_decisao?: Record<string, any>;
}