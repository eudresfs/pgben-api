import { CancelarPagamentoDto } from '../dtos/cancelar-pagamento.dto';

/**
 * Command para liberação de pagamento
 */
export class LiberarPagamentoCommand {
  constructor(
    public readonly pagamentoId: string,
    public readonly dadosLiberacao: CancelarPagamentoDto,
    public readonly usuarioId: string,
    public readonly async: boolean = false,
  ) {}
}
