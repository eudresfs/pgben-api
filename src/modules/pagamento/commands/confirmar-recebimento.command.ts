import { ConfirmacaoRecebimentoDto } from '../dtos/confirmacao-recebimento.dto';

/**
 * Command para confirmação de recebimento
 */
export class ConfirmarRecebimentoCommand {
  constructor(
    public readonly pagamentoId: string,
    public readonly confirmacaoData: ConfirmacaoRecebimentoDto,
    public readonly usuarioId: string,
    public readonly async: boolean = false,
  ) {}
}
