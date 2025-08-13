import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateConfiguracaoAprovacaoDto } from './create-configuracao-aprovacao.dto';

/**
 * DTO para atualização de uma configuração de aprovação existente
 * Herda de CreateConfiguracaoAprovacaoDto mas torna todos os campos opcionais
 * Remove o campo 'acao_critica_id' pois não deve ser alterado após criação
 */
export class UpdateConfiguracaoAprovacaoDto extends PartialType(
  OmitType(CreateConfiguracaoAprovacaoDto, ['acao_critica_id'] as const),
) {}