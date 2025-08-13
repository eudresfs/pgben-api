import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateSolicitacaoAprovacaoDto } from './create-solicitacao-aprovacao.dto';

/**
 * DTO para atualização de uma solicitação de aprovação existente
 * Herda de CreateSolicitacaoAprovacaoDto mas torna todos os campos opcionais
 * Remove campos que não devem ser alterados após criação
 */
export class UpdateSolicitacaoAprovacaoDto extends PartialType(
  OmitType(CreateSolicitacaoAprovacaoDto, [
    'acao_critica_id',
    'configuracao_aprovacao_id',
    'usuario_solicitante_id',
    'codigo',
  ] as const),
) {}
