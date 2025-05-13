import { PartialType, OmitType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateSolicitacaoDto } from './create-solicitacao.dto';
import { IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { DocumentoSolicitacaoDto } from './create-solicitacao.dto';

/**
 * DTO para atualização de solicitação
 * 
 * Estende o DTO de criação, tornando todos os campos opcionais
 * e omitindo o ID do beneficiário, que não pode ser alterado após a criação
 */
export class UpdateSolicitacaoDto extends PartialType(
  OmitType(CreateSolicitacaoDto, ['beneficiario_id'] as const)
) {
  @ApiPropertyOptional({ 
    description: 'Documentos a serem adicionados à solicitação',
    type: [DocumentoSolicitacaoDto]
  })
  @IsOptional()
  @IsArray({ message: 'Documentos deve ser um array' })
  @ValidateNested({ each: true })
  @Type(() => DocumentoSolicitacaoDto)
  documentos?: DocumentoSolicitacaoDto[];
}
