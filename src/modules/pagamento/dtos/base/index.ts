/**
 * Arquivo de índice para DTOs base do módulo de pagamento
 *
 * Centraliza as exportações dos DTOs base para facilitar as importações
 * e manter a organização do código.
 *
 * @author Equipe PGBen
 */

export {
  PagamentoBaseDto,
  PagamentoResponseBaseDto,
  ResponsavelInfo,
  SolicitacaoResumo,
} from './pagamento-base.dto';

export {
  ComprovanteBaseDto,
  ResponsavelUploadInfo,
} from './comprovante-base.dto';

export {
  ConfirmacaoBaseDto,
  ResponsavelConfirmacaoInfo,
  DestinatarioInfo,
} from './confirmacao-base.dto';
